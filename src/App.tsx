import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  Send,
  ChevronDown,
  MessageSquarePlus,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { ScrollArea } from "./components/ui/scroll-area";
import { createResponse, unifiedSystemPrompt } from "./lib/api";
import feedbackPrompt from "./prompts/feedback_prompt.md?raw";
import {
  contentPanels,
  panelOrder,
  starterQuestionsPanel,
  starterQuestions,
} from "./lib/content-config";
import { logFeedbackToCSV, logQueryResponse } from "./lib/feedback-logger";
import { AppLayout } from "./components/AppLayout";

// Define message content structure for AI messages
interface TextContentItem {
  type: "text";
  text: {
    value: string;
  };
}

// Define the structure for a message in the chat
interface Message {
  type: "user" | "ai";
  // For AI messages, content is an array of content items
  // For user messages, it's just a string
  content: string | TextContentItem[];
  streaming: boolean;
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mobile panel states - passed to AppLayout
  const [mobileAboutExpanded, setMobileAboutExpanded] = useState(true);
  const [mobileEvaluationExpanded, setMobileEvaluationExpanded] =
    useState(false);
  const [mobileFeedbackExpanded, setMobileFeedbackExpanded] = useState(false);
  const [mobileDisclaimerExpanded, setMobileDisclaimerExpanded] =
    useState(false);

  // Desktop panel states - these remain in App.tsx for the right-hand sidebar
  const [aboutExpanded, setAboutExpanded] = useState(true);
  const [evaluationExpanded, setEvaluationExpanded] = useState(false);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);

  // Ref for the scroll area viewport
  const viewportRef = useRef<HTMLDivElement | null>(null);
  // Ref for the input element
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // Ref to track if scrolling is from a user action vs browser/programmatic
  const isUserScrollingRef = useRef(false);
  // Ref for the scroll timeout to reset isUserScrolling flag
  const scrollTimeoutRef = useRef<number | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [autoHeight, setAutoHeight] = useState("5rem");

  // Markdown components: ABSOLUTELY BASIC - No cleaning, just render children
  const markdownComponents = {
    p: ({ children }: any) => {
      return <p className="message-markdown-paragraph mb-3">{children}</p>;
    },
    strong: ({ children }: any) => {
      // Basic styling via className ONLY
      return (
        <strong className="text-mha-blue font-semibold">{children}</strong>
      );
    },
    li: ({ children }: any) => {
      return <li className="message-markdown-list-item mb-1">{children}</li>;
    },
    ul: ({ children }: any) => (
      <ul className="message-markdown-list list-disc pl-5 mb-3">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="message-markdown-list list-decimal pl-5 mb-3">
        {children}
      </ol>
    ),
    blockquote: ({ children }: any) => {
      return (
        <blockquote className="message-markdown-blockquote border-l-4 border-gray-300 pl-3 italic my-3">
          {children}
        </blockquote>
      );
    },
    a: ({ children, href }: any) => (
      <a
        href={href}
        className="text-mha-blue underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    h1: ({ children }: any) => (
      <h1 className="text-xl font-bold text-mha-blue mb-3 mt-4">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-lg font-bold text-mha-blue mb-2 mt-3">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-md font-bold text-mha-blue mb-2 mt-3">{children}</h3>
    ),
  };

  // Track the previous response ID for multi-turn continuity
  const [previousResponseId, setPreviousResponseId] = useState<
    string | undefined
  >(undefined);

  // Add two pieces of React state as specified in the instructions
  const [mode, setMode] = useState<"policy" | "feedback">("policy");
  const [feedbackAnswers, setFeedbackAnswers] = useState<any>(null);

  // Add an AbortController ref for cancelling ongoing requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create a ref to track whether we've already shown the thank you message
  const feedbackThankYouShown = useRef(false);

  // Fix the vector store state to use a constant since we no longer need to change it
  // Replace the useState with a constant
  // const [vectorStoreId, setVectorStoreId] = useState<string>(
  //  import.meta.env.VITE_OPENAI_VECTOR_STORE_ID || "vs_S49gTBhlXwOSZFht2AqbPIsf"
  // );
  const vectorStoreId =
    import.meta.env.VITE_OPENAI_VECTOR_STORE_ID ||
    "vs_S49gTBhlXwOSZFht2AqbPIsf";

  const [messages, setMessages] = useState<Message[]>([
    {
      type: "ai",
      content: [
        {
          type: "text",
          text: {
            value:
              "Hello! I'm your iSPoC Digital Assistant. How can I help you today?",
          },
        },
      ],
      streaming: true,
    },
  ]);

  const [input, setInput] = useState("");

  // Fix the policySourcePattern usage in processTextForMarkdown
  // Function to pre-process text - ABSOLUTE MINIMUM - Only Citations & Object
  const processTextForMarkdown = (text: string) => {
    if (!text) {
      return "";
    }

    let processed = String(text);

    // 1. Extract guide sources to format properly
    let guideSources: string[] = [];
    const guideSourcePattern = /【\d+:([^】]+)】/g;
    let match;

    // Find all guide source references
    while ((match = guideSourcePattern.exec(processed)) !== null) {
      // Extract source name without the .json extension
      const sourceName = match[1].replace(/\.(json|md|txt)$/i, "");
      if (!guideSources.includes(sourceName)) {
        guideSources.push(sourceName);
      }
    }

    // Also extract sources from the policy pattern [number:number*source]
    const policySourcePattern = /\[(\d+):(\d+)[*†]([^\]]+)\]/g;
    const sourcesSet = new Set<string>(); // Use a Set to deduplicate sources

    while ((match = policySourcePattern.exec(processed)) !== null) {
      if (match[3]) {
        const sourceName = match[3].trim().replace(/\.(json|md|txt)$/i, "");
        sourcesSet.add(sourceName);
      }
    }

    // Make an array from the sourcesSet
    const policySources = Array.from(sourcesSet);

    // 2. Remove raw citation patterns from the text
    processed = processed.replace(/【\d+:[^】]+】/g, "");

    // 3. Old citation pattern clean-up
    processed = processed.replace(
      /\s*(\[\d+:\d+\*source\]|\u3010\d+:\d+[\u2020†]source\u3011)\s*/g,
      " "
    );

    // 4. Remove ,[object Object],
    processed = processed.replace(/,\[object Object\],/g, " ");

    // 5. Remove "References are from search results" text
    processed = processed.replace(
      /\(References are from search results\s*\)/gi,
      ""
    );

    // 6. Add formatted sources section if sources were found
    // Combine both types of sources and deduplicate them
    const allSources = [...new Set([...guideSources, ...policySources])];

    // More robust check for existing Sources section
    // Check for common patterns like **Sources:**, ## Sources, Sources:, "Sources", or numbered list patterns
    const sourcesRegex =
      /(\*\*\s*sources\s*:?\s*\*\*|#{1,3}\s*sources\s*:?|\bsources\s*:|\n\s*sources\s*:|\"\s*sources\s*:?\"|sources\s+section:?|\d+\.\s*(📘|📜))/i;

    const hasExistingSourcesSection = sourcesRegex.test(processed);

    // Diagnostic logs for sources section detection
    if (allSources.length > 0) {
      console.log("📋 Sources found:", allSources);
      console.log(
        "🔍 Has existing Sources section:",
        hasExistingSourcesSection
      );
      if (hasExistingSourcesSection) {
        console.log("📝 Found existing Sources section in text");
        // Log the matched section for debugging
        const sourcesMatch = processed.match(
          new RegExp(sourcesRegex.source + ".*?(?=\\n\\n|\\n$|$)", "is")
        );
        if (sourcesMatch) {
          console.log(
            "📝 Matched Sources section:",
            sourcesMatch[0].substring(0, 100)
          );
        }
      }
    }

    if (allSources.length > 0 && !hasExistingSourcesSection) {
      processed = processed.trim();
      processed += "\n\n**Sources:**\n";
      allSources.forEach((source, index) => {
        // Use proper emoji based on whether it was found in guideSources or policySources
        const emoji = guideSources.includes(source) ? "📘" : "📜";
        processed += `${index + 1}. ${emoji} ${source}\n`;
      });
    }

    // 7. Trim whitespace from start/end only
    processed = processed.trim();

    return processed;
  };

  const [autoscrollEnabled, setAutoscrollEnabled] = useState(true);

  // After mount, set viewportRef to the Radix viewport
  useEffect(() => {
    const el = document.querySelector(
      ".chat-scroll-area [data-radix-scroll-area-viewport]"
    );
    if (el) viewportRef.current = el as HTMLDivElement;
  }, []);

  // 1. Detect user scrolls
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    // Track whether user has moved away from the bottom once
    const leftBottomRef = { current: false } as { current: boolean };

    // Handler for any user interaction
    const disableAutoscroll = () => {
      // Set flag that user is scrolling - this distinguishes user actions from browser adjustments
      isUserScrollingRef.current = true;

      // Reset the flag after a delay
      if (scrollTimeoutRef.current)
        window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = window.setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 1500);

      setAutoscrollEnabled(false);
    };

    // Handler for scroll (to show/hide button)
    const onScroll = () => {
      // Only process scroll events triggered by actual user interaction
      // This prevents browser scroll adjustments from disabling autoscroll
      if (!isUserScrollingRef.current) return;

      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
      if (!atBottom && autoscrollEnabled) {
        // User left bottom → pause autoscroll until they return
        setAutoscrollEnabled(false);
        leftBottomRef.current = true;
      }

      // User has returned to bottom after leaving once → resume autoscroll automatically
      if (atBottom && !autoscrollEnabled && leftBottomRef.current) {
        setAutoscrollEnabled(true);
        leftBottomRef.current = false;
      }
    };

    el.addEventListener("pointerdown", disableAutoscroll, { passive: true });
    el.addEventListener("touchstart", disableAutoscroll, { passive: true });
    el.addEventListener("wheel", disableAutoscroll, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", disableAutoscroll);
      el.removeEventListener("touchstart", disableAutoscroll);
      el.removeEventListener("wheel", disableAutoscroll);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  // 2. Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!autoscrollEnabled) return;
    const el = viewportRef.current;
    if (!el) return;
    setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 30);
  }, [messages, autoscrollEnabled]);

  // 3. Scroll to bottom button handler
  const handleScrollToBottom = () => {
    setAutoscrollEnabled(true);
    const el = viewportRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  };

  // Generate / retrieve a stable session ID for logging
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem("sessionId");
    if (stored) return stored;
    const id = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
    localStorage.setItem("sessionId", id);
    return id;
  });

  const handleNewChat = async (messageToSend?: string) => {
    const message = messageToSend || input;

    if (message.trim() && !isLoading) {
      // Reset autoscroll when explicitly starting a new chat with a specific message
      // This handles starter questions and ensures we autoscroll for each new question
      if (messageToSend) {
        setAutoscrollEnabled(true);
      }

      // First set loading state so the animation appears
      setIsLoading(true);

      // Clear input field if using the input box
      if (!messageToSend) {
        setInput("");
      }

      // Clear any previous errors
      setError(null);

      // Create a new AbortController for this request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Add user message to the chat
      const userMsg: Message = {
        type: "user",
        content: message,
        streaming: false,
      };

      setMessages((prev) => {
        // Add both the user message and an empty AI message placeholder at once
        return [
          ...prev,
          userMsg,
          {
            type: "ai",
            content: [{ type: "text", text: { value: "" } }],
            streaming: true,
          },
        ];
      });

      try {
        // Use createResponse for the Responses API with streaming enabled
        const responseResult: { text: string; id?: string } =
          await createResponse(
            message,
            previousResponseId,
            (contentItem) => {
              // CRITICAL: First log at the very top to confirm we received the chunk
              console.log("UI chunk received:", contentItem);

              // Basic validation
              if (
                !contentItem ||
                contentItem.type !== "text" ||
                !contentItem.text?.value
              ) {
                console.error("🔴 INVALID CHUNK:", contentItem);
                return;
              }

              const textValue = contentItem.text.value;
              const index = contentItem.index || 0;

              console.warn(
                `🟢 CHUNK TEXT [${index}]: "${textValue.substring(
                  0,
                  20
                )}..." (${textValue.length} chars)`
              );

              // Special handling for JSON in feedback mode
              if (mode === "feedback" && textValue.includes("}")) {
                try {
                  // Look for complete JSON object
                  console.log("⚙️ Looking for JSON in:", textValue);

                  // Try to find any JSON object in the text
                  const match = textValue.match(/\{[\s\S]*\}/);
                  if (match) {
                    const jsonText = match[0];
                    console.log("⚙️ Found JSON text:", jsonText);

                    try {
                      const json = JSON.parse(jsonText);
                      console.log("⚙️ Parsed JSON:", json);

                      // More thorough validation
                      const hasAllRequiredFields =
                        typeof json === "object" &&
                        json !== null &&
                        "q1" in json &&
                        "q2" in json &&
                        "q3" in json &&
                        "q4" in json &&
                        "q5" in json &&
                        "q6" in json;

                      // Check if values are non-empty
                      const hasValidValues =
                        hasAllRequiredFields &&
                        json.q1 &&
                        json.q2 &&
                        json.q3 &&
                        json.q4 &&
                        json.q5;

                      console.log("⚙️ JSON validation:", {
                        hasAllRequiredFields,
                        hasValidValues,
                        feedbackThankYouAlreadyShown:
                          feedbackThankYouShown.current,
                      });

                      // Check if we have all 5 answers with valid values and haven't shown the thank you yet
                      if (hasValidValues && !feedbackThankYouShown.current) {
                        console.log("⚙️ Feedback answers complete:", json);

                        // Store the feedback answers and set shown flag immediately to prevent duplicates
                        setFeedbackAnswers(json);
                        feedbackThankYouShown.current = true;

                        // Create a direct replace of all messages to ensure proper rendering
                        setTimeout(() => {
                          console.log(
                            "⚙️ Adding feedback summary and return button"
                          );

                          // Get messages without the JSON result and add two new messages
                          setMessages((prev) => {
                            // Keep all messages except the JSON message
                            const messagesWithoutJson = prev.filter(
                              (_, i) => i !== prev.length - 1
                            );

                            // Clear the previous response ID to avoid continuing the conversation
                            setPreviousResponseId(undefined);

                            return [
                              ...messagesWithoutJson,
                              {
                                type: "ai",
                                content: [
                                  {
                                    type: "text",
                                    text: {
                                      value: `✅ **Thank you for your feedback!**\n\nYour responses have been recorded:\n- **Rating:** ${json.q1}\n- **Liked:** ${json.q2}\n- **Frustrated:** ${json.q3}\n- **Feature Request:** ${json.q4}\n- **Recommendation:** ${json.q5}\n- **Additional Comments:** ${json.q6}\n\nThis will help us improve the Digital Assistant.`,
                                    },
                                  },
                                ],
                                streaming: false,
                              },
                              {
                                type: "ai",
                                content: [
                                  {
                                    type: "text",
                                    text: {
                                      value: "returnButton",
                                    },
                                  },
                                ],
                                streaming: false,
                              },
                            ];
                          });
                        }, 1000);
                      }
                    } catch (err) {
                      // Not valid JSON yet
                      console.log("JSON not yet complete", err);
                    }
                  }
                } catch (err) {
                  // Not valid JSON yet
                  console.log("JSON not yet complete", err);
                }
              }

              // Update message state - simplified
              setMessages((prevMessages) => {
                // Clone all messages
                const updatedMessages1 = [...prevMessages];

                // Find the last AI message
                let lastAIIndex = -1;
                for (let i = updatedMessages1.length - 1; i >= 0; i--) {
                  if (updatedMessages1[i].type === "ai") {
                    lastAIIndex = i;
                    break;
                  }
                }

                // If no AI message found, something is wrong
                if (lastAIIndex === -1) {
                  console.error("No AI message found to update");
                  return prevMessages;
                }

                // Get current content array
                const message = updatedMessages1[lastAIIndex];
                let content = [
                  ...((message.content as TextContentItem[]) || []),
                ];

                // Initialize content if needed
                if (content.length === 0) {
                  content = [{ type: "text", text: { value: "" } }];
                }

                // Make sure index exists in array
                while (content.length <= index) {
                  content.push({ type: "text", text: { value: "" } });
                }

                // Update the content at index
                const currentText = content[index].text?.value || "";
                content[index] = {
                  ...content[index],
                  text: { value: currentText + textValue },
                };

                console.log(
                  `UI updated message: ${currentText.length} => ${
                    currentText.length + textValue.length
                  }`
                );

                // If this is an error message (starts with ⚠️), stop the loading state
                if (textValue.startsWith("⚠️")) {
                  setIsLoading(false);
                }

                // Create new message with updated content
                const updatedMessage = {
                  ...message,
                  content,
                };

                // When updating the last AI message, always preserve or set streaming property
                const updatedContent =
                  updatedMessage.content as TextContentItem[];
                const updatedContent1 = updatedContent.map((item, i) => {
                  if (i === updatedContent.length - 1) {
                    return { ...item, streaming: updatedMessage.streaming };
                  }
                  return item;
                });

                const updatedMessages2 = updatedMessages1.map((msg, i) => {
                  if (i === updatedMessages1.length - 1 && msg.type === "ai") {
                    return {
                      ...msg,
                      content: updatedContent1,
                      streaming: updatedMessage.streaming,
                    };
                  }
                  return msg;
                });

                return updatedMessages2;
              });
            },
            mode === "feedback" ? feedbackPrompt : unifiedSystemPrompt,
            signal
          );

        // Store the response ID for multi-turn conversation
        if (responseResult.id) {
          setPreviousResponseId(responseResult.id);
        }

        // Mark streaming complete on the final AI message
        setMessages((prev) => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].type === "ai") {
              updated[i] = { ...updated[i], streaming: false } as Message;
              break;
            }
          }
          return updated;
        });

        // Log the full query/response pair now that streaming is finished
        await logQueryResponse(
          message,
          responseResult.text,
          "anonymous",
          sessionId
        );
      } catch (error) {
        // Check if this was aborted on purpose
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Error getting response from createResponse:", error);
        setError("Failed to get a response. Please try again.");

        // Update the AI message with an error
        setMessages((prev) => {
          const updatedMessages = [...prev];

          // Find the last AI message
          let lastAIIndex = -1;
          for (let i = updatedMessages.length - 1; i >= 0; i--) {
            if (updatedMessages[i].type === "ai") {
              lastAIIndex = i;
              break;
            }
          }

          if (lastAIIndex >= 0) {
            updatedMessages[lastAIIndex].content = [
              {
                type: "text",
                text: {
                  value:
                    "Sorry, there was an error processing your request. Please try again later.",
                },
              },
            ];
          }
          return updatedMessages;
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      console.warn("handleNewChat skipped: Input empty or already loading");
    }
  };

  const startFeedback = async (messageToSend?: string) => {
    const message = messageToSend || input;

    if (message.trim() && !isLoading) {
      // First set loading state so the animation appears
      setIsLoading(true);

      // Clear input field if using the input box
      if (!messageToSend) {
        setInput("");
      }

      // Clear any previous errors
      setError(null);

      // Create a new AbortController for this request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Add user message to the chat
      const userMsg: Message = {
        type: "user",
        content: message,
        streaming: false,
      };

      setMessages((prev) => {
        // Add both the user message and an empty AI message placeholder at once
        return [
          ...prev,
          userMsg,
          {
            type: "ai",
            content: [{ type: "text", text: { value: "" } }],
            streaming: true,
          },
        ];
      });

      try {
        // Use createResponse for the Responses API with streaming enabled
        const responseResult: { text: string; id?: string } =
          await createResponse(
            message,
            previousResponseId,
            (contentItem) => {
              // CRITICAL: First log at the very top to confirm we received the chunk
              console.log("UI chunk received:", contentItem);

              // Basic validation
              if (
                !contentItem ||
                contentItem.type !== "text" ||
                !contentItem.text?.value
              ) {
                console.error("🔴 INVALID CHUNK:", contentItem);
                return;
              }

              const textValue = contentItem.text.value;
              const index = contentItem.index || 0;

              console.warn(
                `🟢 CHUNK TEXT [${index}]: "${textValue.substring(
                  0,
                  20
                )}..." (${textValue.length} chars)`
              );

              // Special handling for JSON in feedback mode
              if (mode === "feedback" && textValue.includes("}")) {
                try {
                  // Look for complete JSON object
                  console.log("⚙️ Looking for JSON in:", textValue);

                  // Try to find any JSON object in the text
                  const match = textValue.match(/\{[\s\S]*\}/);
                  if (match) {
                    const jsonText = match[0];
                    console.log("⚙️ Found JSON text:", jsonText);

                    try {
                      const json = JSON.parse(jsonText);
                      console.log("⚙️ Parsed JSON:", json);

                      // More thorough validation
                      const hasAllRequiredFields =
                        typeof json === "object" &&
                        json !== null &&
                        "q1" in json &&
                        "q2" in json &&
                        "q3" in json &&
                        "q4" in json &&
                        "q5" in json &&
                        "q6" in json;

                      // Check if values are non-empty
                      const hasValidValues =
                        hasAllRequiredFields &&
                        json.q1 &&
                        json.q2 &&
                        json.q3 &&
                        json.q4 &&
                        json.q5;

                      console.log("⚙️ JSON validation:", {
                        hasAllRequiredFields,
                        hasValidValues,
                        feedbackThankYouAlreadyShown:
                          feedbackThankYouShown.current,
                      });

                      // Check if we have all 5 answers with valid values and haven't shown the thank you yet
                      if (hasValidValues && !feedbackThankYouShown.current) {
                        console.log("⚙️ Feedback answers complete:", json);

                        // Store the feedback answers and set shown flag immediately to prevent duplicates
                        setFeedbackAnswers(json);
                        feedbackThankYouShown.current = true;

                        // Create a direct replace of all messages to ensure proper rendering
                        setTimeout(() => {
                          console.log(
                            "⚙️ Adding feedback summary and return button"
                          );

                          // Get messages without the JSON result and add two new messages
                          setMessages((prev) => {
                            // Keep all messages except the JSON message
                            const messagesWithoutJson = prev.filter(
                              (_, i) => i !== prev.length - 1
                            );

                            // Clear the previous response ID to avoid continuing the conversation
                            setPreviousResponseId(undefined);

                            return [
                              ...messagesWithoutJson,
                              {
                                type: "ai",
                                content: [
                                  {
                                    type: "text",
                                    text: {
                                      value: `✅ **Thank you for your feedback!**\n\nYour responses have been recorded:\n- **Rating:** ${json.q1}\n- **Liked:** ${json.q2}\n- **Frustrated:** ${json.q3}\n- **Feature Request:** ${json.q4}\n- **Recommendation:** ${json.q5}\n- **Additional Comments:** ${json.q6}\n\nThis will help us improve the Digital Assistant.`,
                                    },
                                  },
                                ],
                                streaming: false,
                              },
                              {
                                type: "ai",
                                content: [
                                  {
                                    type: "text",
                                    text: {
                                      value: "returnButton",
                                    },
                                  },
                                ],
                                streaming: false,
                              },
                            ];
                          });
                        }, 1000);
                      }
                    } catch (err) {
                      // Not valid JSON yet
                      console.log("JSON not yet complete", err);
                    }
                  }
                } catch (err) {
                  // Not valid JSON yet
                  console.log("JSON not yet complete", err);
                }
              }

              // Update message state - simplified
              setMessages((prevMessages) => {
                // Clone all messages
                const updatedMessages1 = [...prevMessages];

                // Find the last AI message
                let lastAIIndex = -1;
                for (let i = updatedMessages1.length - 1; i >= 0; i--) {
                  if (updatedMessages1[i].type === "ai") {
                    lastAIIndex = i;
                    break;
                  }
                }

                // If no AI message found, something is wrong
                if (lastAIIndex === -1) {
                  console.error("No AI message found to update");
                  return prevMessages;
                }

                // Get current content array
                const message = updatedMessages1[lastAIIndex];
                let content = [
                  ...((message.content as TextContentItem[]) || []),
                ];

                // Initialize content if needed
                if (content.length === 0) {
                  content = [{ type: "text", text: { value: "" } }];
                }

                // Make sure index exists in array
                while (content.length <= index) {
                  content.push({ type: "text", text: { value: "" } });
                }

                // Update the content at index
                const currentText = content[index].text?.value || "";
                content[index] = {
                  ...content[index],
                  text: { value: currentText + textValue },
                };

                console.log(
                  `UI updated message: ${currentText.length} => ${
                    currentText.length + textValue.length
                  }`
                );

                // If this is an error message (starts with ⚠️), stop the loading state
                if (textValue.startsWith("⚠️")) {
                  setIsLoading(false);
                }

                // Create new message with updated content
                const updatedMessage = {
                  ...message,
                  content,
                };

                // When updating the last AI message, always preserve or set streaming property
                const updatedContent =
                  updatedMessage.content as TextContentItem[];
                const updatedContent1 = updatedContent.map((item, i) => {
                  if (i === updatedContent.length - 1) {
                    return { ...item, streaming: updatedMessage.streaming };
                  }
                  return item;
                });

                const updatedMessages2 = updatedMessages1.map((msg, i) => {
                  if (i === updatedMessages1.length - 1 && msg.type === "ai") {
                    return {
                      ...msg,
                      content: updatedContent1,
                      streaming: updatedMessage.streaming,
                    };
                  }
                  return msg;
                });

                return updatedMessages2;
              });
            },
            mode === "feedback" ? feedbackPrompt : unifiedSystemPrompt,
            signal
          );

        // Store the response ID for multi-turn conversation
        if (responseResult.id) {
          setPreviousResponseId(responseResult.id);
        }

        // Mark streaming complete on the final AI message
        setMessages((prev) => {
          const updated = [...prev];
          for (let i = updated.length - 1; i >= 0; i--) {
            if (updated[i].type === "ai") {
              updated[i] = { ...updated[i], streaming: false } as Message;
              break;
            }
          }
          return updated;
        });

        // Log the full query/response pair now that streaming is finished
        await logQueryResponse(
          message,
          responseResult.text,
          "anonymous",
          sessionId
        );
      } catch (error) {
        // Check if this was aborted on purpose
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        console.error("Error getting response from createResponse:", error);
        setError("Failed to get a response. Please try again.");

        // Update the AI message with an error
        setMessages((prev) => {
          const updatedMessages = [...prev];

          // Find the last AI message
          let lastAIIndex = -1;
          for (let i = updatedMessages.length - 1; i >= 0; i--) {
            if (updatedMessages[i].type === "ai") {
              lastAIIndex = i;
              break;
            }
          }

          if (lastAIIndex >= 0) {
            updatedMessages[lastAIIndex].content = [
              {
                type: "text",
                text: {
                  value:
                    "Sorry, there was an error processing your request. Please try again later.",
                },
              },
            ];
          }
          return updatedMessages;
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      console.warn("startFeedback skipped: Input empty or already loading");
    }
  };

  // Add console log to check panel order and content at the beginning of the render function
  // Just before the return statement in the App component
  console.log("Panel Order:", panelOrder);
  console.log("Content Panels:", contentPanels);
  console.log("Starter Questions Panel:", starterQuestionsPanel);

  return (
    // App.tsx now returns AppLayout directly, or a Fragment if error message needs to be a sibling
    <>
      <AppLayout
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        helpPanelOpen={helpPanelOpen}
        setHelpPanelOpen={setHelpPanelOpen}
        starterQuestionsPanel={starterQuestionsPanel}
        panelOrder={panelOrder}
        contentPanels={contentPanels}
        starterQuestions={starterQuestions}
        handleSend={handleNewChat}
        startFeedback={startFeedback}
        mobileAboutExpanded={mobileAboutExpanded}
        setMobileAboutExpanded={setMobileAboutExpanded}
        mobileEvaluationExpanded={mobileEvaluationExpanded}
        setMobileEvaluationExpanded={setMobileEvaluationExpanded}
        mobileFeedbackExpanded={mobileFeedbackExpanded}
        setMobileFeedbackExpanded={setMobileFeedbackExpanded}
        mobileDisclaimerExpanded={mobileDisclaimerExpanded}
        setMobileDisclaimerExpanded={setMobileDisclaimerExpanded}
      >
        {/* Main Content Wrapper - this is the child for AppLayout */}
        {/* It has flex-1 and will take available space */}
        <div className="flex-1 px-6 pt-6 flex flex-col h-full pb-[3.75rem] lg:pb-0">
          {/* Two-column Layout for chat and right desktop sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 h-full">
            {/* Chat Area - Left Column */}
            <div className="mt-12 lg:mt-0 flex flex-col flex-1 min-h-0 h-full">
              <Card className="flex flex-col bg-white rounded-lg shadow-lg h-full flex-grow overflow-hidden relative">
                {/* Chat Header */}
                <div
                  className={`${
                    mode === "feedback"
                      ? "bg-mha-pink"
                      : vectorStoreId === "vs_68121a5f918c81919040f9caa54ff5ce"
                      ? "bg-[#6bbbae]" // Use teal color for guides
                      : "bg-mha-blue" // Keep blue for policies
                  } text-white p-4 flex-shrink-0`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {mode === "feedback" ? (
                          "Feedback Survey"
                        ) : (
                          <>
                            iSPoC <span className="font-normal">|</span>{" "}
                            {vectorStoreId ===
                            "vs_68121a5f918c81919040f9caa54ff5ce"
                              ? "How To Assistant"
                              : "Digital Assistant"}
                          </>
                        )}
                      </h2>
                      <p className="text-sm opacity-80">
                        {mode === "feedback"
                          ? "Please answer 5 quick questions"
                          : "Available 24/7 to assist you"}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      className={
                        mode === "feedback"
                          ? "bg-white text-mha-pink hover:bg-gray-100 font-medium px-4 py-2"
                          : `bg-white ${
                              vectorStoreId ===
                              "vs_68121a5f918c81919040f9caa54ff5ce"
                                ? "text-[#6bbbae]" // Teal text for guides
                                : "text-mha-blue" // Blue text for policies
                            } hover:bg-gray-100 font-medium px-4 py-2`
                      }
                      onClick={() => handleNewChat()}
                    >
                      <MessageSquare
                        className={`h-4 w-4 mr-2 ${
                          mode === "feedback" ? "text-mha-pink" : ""
                        }`}
                      />
                      {mode === "feedback" ? "Cancel Survey" : "New Chat"}
                    </Button>
                  </div>
                </div>

                {/* Chat Messages */}
                {/* ScrollArea now owns full flex height */}
                <ScrollArea className="h-full flex-grow p-4 chat-scroll-area custom-scrollbar">
                  <div className="space-y-4 pb-2 mb-2">
                    {messages.map((message, index) => {
                      let messageContentElement: React.ReactNode = null;

                      // Check if this is the first message in feedback mode and add a special button
                      const isFirstFeedbackMessage =
                        mode === "feedback" &&
                        index === 0 &&
                        message.type === "ai" &&
                        !isLoading;

                      if (message.type === "user") {
                        // User message content is always a string
                        messageContentElement = (
                          <p className="whitespace-pre-wrap">
                            {message.content as string}
                          </p>
                        );
                      } else {
                        // AI message content is TextContentItem[]
                        const aiContent = message.content as TextContentItem[]; // Type assertion

                        // Helper function to check if content is empty
                        const isEmptyContent = () => {
                          if (
                            !Array.isArray(aiContent) ||
                            aiContent.length === 0
                          )
                            return true;
                          if (
                            aiContent.length === 1 &&
                            aiContent[0].type === "text"
                          ) {
                            return (
                              !aiContent[0].text?.value ||
                              aiContent[0].text.value.trim() === ""
                            );
                          }
                          return false;
                        };

                        // Check if this is a loading message (last AI message while loading)
                        const isLoadingMessage =
                          isLoading &&
                          index === messages.length - 1 &&
                          message.type === "ai";

                        // First check: Is this a loading message?
                        if (isLoadingMessage && isEmptyContent()) {
                          // Show loading animation
                          messageContentElement = (
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              ></div>
                            </div>
                          );
                        }
                        // Second check: Is this an empty message?
                        else if (isEmptyContent()) {
                          // Empty message but not loading - show placeholder
                          messageContentElement = (
                            <p className="text-gray-400">...</p>
                          );
                        }
                        // Special case: Check for JSON feedback results
                        else if (
                          mode === "feedback" &&
                          aiContent.length === 1 &&
                          aiContent[0].type === "text" &&
                          typeof aiContent[0].text?.value === "string" &&
                          aiContent[0].text.value.trim().startsWith("{") &&
                          aiContent[0].text.value.trim().endsWith("}")
                        ) {
                          console.log(
                            "🟢 DETECTED JSON FEEDBACK:",
                            aiContent[0].text.value
                          );

                          try {
                            // Parse the JSON
                            const json = JSON.parse(
                              aiContent[0].text.value.trim()
                            );

                            // Check if this is a complete feedback response
                            if (
                              json.q1 &&
                              json.q2 &&
                              json.q3 &&
                              json.q4 &&
                              json.q5
                            ) {
                              console.log(
                                "✅ Valid feedback JSON detected, showing thank you message"
                              );

                              // Show a nice thank you message instead of raw JSON
                              messageContentElement = (
                                <div>
                                  <div className="prose prose-sm max-w-none">
                                    <h4 className="text-mha-blue font-semibold mb-2">
                                      Thank you for your feedback!
                                    </h4>
                                    <p className="mb-2">
                                      Your responses have been recorded:
                                    </p>
                                    <ul className="list-disc pl-5 mb-3">
                                      <li>
                                        <strong>Rating:</strong> {json.q1}
                                      </li>
                                      <li>
                                        <strong>Liked:</strong> {json.q2}
                                      </li>
                                      <li>
                                        <strong>Frustrated:</strong> {json.q3}
                                      </li>
                                      <li>
                                        <strong>Feature Request:</strong>{" "}
                                        {json.q4}
                                      </li>
                                      <li>
                                        <strong>Recommendation:</strong>{" "}
                                        {json.q5}
                                      </li>
                                      <li>
                                        <strong>Additional Comments:</strong>{" "}
                                        {json.q6}
                                      </li>
                                    </ul>
                                    <p>
                                      This will help us improve the Digital
                                      Assistant.
                                    </p>
                                  </div>

                                  <div className="flex justify-center w-full mt-4">
                                    <Button
                                      className="bg-mha-blue hover:bg-mha-blue-dark text-white font-medium px-6 py-3 rounded-md shadow-sm transition-colors mt-2 mb-2 text-base"
                                      onClick={() => {
                                        // Reset to policy mode
                                        setMode("policy");
                                        // Clear feedback answers
                                        setFeedbackAnswers(null);
                                        // Reset feedback thank you shown flag
                                        feedbackThankYouShown.current = false;
                                        // Clear messages and start a new chat
                                        handleNewChat();
                                      }}
                                    >
                                      Return to Digital Assistant
                                    </Button>
                                  </div>
                                </div>
                              );

                              // Store the feedback answers if not already stored
                              if (!feedbackAnswers) {
                                setFeedbackAnswers(json);
                                feedbackThankYouShown.current = true;
                              }

                              // Return early since we've handled this message
                              return (
                                <div
                                  key={index}
                                  className={
                                    String(message.type) === "user"
                                      ? "flex justify-end"
                                      : "flex justify-start"
                                  }
                                >
                                  <Card
                                    className={`max-w-[80%] p-3 ${
                                      String(message.type) === "user"
                                        ? mode === "feedback"
                                          ? "bg-mha-pink text-white" // Pink for feedback
                                          : vectorStoreId ===
                                            "vs_68121a5f918c81919040f9caa54ff5ce"
                                          ? "bg-[#6bbbae] text-white" // Teal for Guides
                                          : "bg-mha-blue text-white" // Blue for Policies
                                        : "bg-white"
                                    }`}
                                  >
                                    {messageContentElement}
                                  </Card>
                                </div>
                              );
                            }
                          } catch (err) {
                            console.error("Error parsing feedback JSON:", err);
                          }
                        }
                        // Third case: Check for returnButton contents
                        else if (
                          aiContent.length === 1 &&
                          aiContent[0].type === "text" &&
                          typeof aiContent[0].text?.value === "string" &&
                          aiContent[0].text?.value === "returnButton"
                        ) {
                          console.log(
                            "😎 RETURN BUTTON DETECTED - EXACT MATCH"
                          );

                          messageContentElement = (
                            <div className="flex justify-center w-full">
                              <Button
                                className="bg-mha-blue hover:bg-mha-blue-dark text-white font-medium px-6 py-3 rounded-md shadow-sm transition-colors mt-4 mb-2 text-base"
                                onClick={() => {
                                  // Reset to policy mode
                                  setMode("policy");
                                  // Clear feedback answers
                                  setFeedbackAnswers(null);
                                  // Reset feedback thank you shown flag
                                  feedbackThankYouShown.current = false;
                                  // Clear messages and start a new chat
                                  handleNewChat();
                                }}
                              >
                                Return to Digital Assistant
                              </Button>
                            </div>
                          );
                        } else {
                          // Combine all text items into a single string
                          const combinedText = aiContent
                            .map((item) => {
                              // Make sure item is a TextContentItem before accessing text
                              if (
                                item.type === "text" &&
                                item.text &&
                                typeof item.text.value === "string"
                              ) {
                                return item.text.value;
                              }
                              return "";
                            })
                            .join("\n"); // Join with single newline

                          // Pre-process the combined text before passing to Markdown parser
                          const processedText =
                            processTextForMarkdown(combinedText);

                          // Check if this is an error message from the API
                          if (processedText.startsWith("⚠️")) {
                            messageContentElement = (
                              <div className="bg-red-100 border-l-4 border-red-500 p-3 text-red-700">
                                {processedText}
                              </div>
                            );
                          } else {
                            messageContentElement = (
                              <div className="prose prose-sm max-w-none ai-message-content">
                                {/* Pass PRE-PROCESSED text to ReactMarkdown */}
                                <ReactMarkdown components={markdownComponents}>
                                  {processedText}
                                </ReactMarkdown>
                              </div>
                            );
                          }
                        }

                        // Add survey start button if this is the first message in feedback mode
                        if (isFirstFeedbackMessage && messages.length === 1) {
                          const content = aiContent
                            .filter((item) => item.type === "text")
                            .map((item) => item.text.value)
                            .join("\n");

                          messageContentElement = (
                            <div>
                              <p className="whitespace-pre-wrap">{content}</p>
                              <div className="mt-4">
                                <Button
                                  className="bg-mha-pink hover:bg-mha-pink-dark text-white"
                                  onClick={() => {
                                    // Send message to start the survey
                                    handleNewChat("start");
                                  }}
                                >
                                  Let's start the survey!
                                </Button>
                              </div>
                            </div>
                          );
                        }
                      }

                      return (
                        <div
                          key={index}
                          className={
                            String(message.type) === "user"
                              ? "flex justify-end"
                              : "flex justify-start"
                          }
                        >
                          <Card
                            className={`max-w-[80%] p-3 ${
                              String(message.type) === "user"
                                ? mode === "feedback"
                                  ? "bg-mha-pink text-white" // Pink for feedback
                                  : vectorStoreId ===
                                    "vs_68121a5f918c81919040f9caa54ff5ce"
                                  ? "bg-[#6bbbae] text-white" // Teal for Guides
                                  : "bg-mha-blue text-white" // Blue for Policies
                                : "bg-white"
                            }`}
                          >
                            {messageContentElement}
                          </Card>
                          {/* Only show sources at the end of the last AI message and only if not loading */}
                          {message.type === "ai" &&
                            index === messages.length - 1 &&
                            !isLoading &&
                            message.streaming === false &&
                            (() => {
                              // Extract sources as before
                              const aiContent =
                                message.content as TextContentItem[];
                              const combinedText = aiContent
                                .map((item) =>
                                  item.type === "text" &&
                                  item.text &&
                                  typeof item.text.value === "string"
                                    ? item.text.value
                                    : ""
                                )
                                .join("\n");
                              let guideSources: string[] = [];
                              const guideSourcePattern = /【\d+:([^】]+)】/g;
                              let match;
                              while (
                                (match =
                                  guideSourcePattern.exec(combinedText)) !==
                                null
                              ) {
                                const sourceName = match[1].replace(
                                  /\.(json|md|txt)$/i,
                                  ""
                                );
                                if (!guideSources.includes(sourceName)) {
                                  guideSources.push(sourceName);
                                }
                              }
                              const policySourcePattern =
                                /\[(\d+):(\d+)[*†]([^\]]+)\]/g;
                              const sourcesSet = new Set<string>();
                              while (
                                (match =
                                  policySourcePattern.exec(combinedText)) !==
                                null
                              ) {
                                if (match[3]) {
                                  const sourceName = match[3]
                                    .trim()
                                    .replace(/\.(json|md|txt)$/i, "");
                                  sourcesSet.add(sourceName);
                                }
                              }
                              const policySources = Array.from(sourcesSet);
                              const allSources = [
                                ...new Set([...guideSources, ...policySources]),
                              ];
                              if (allSources.length > 0) {
                                return (
                                  <div className="mt-4 text-xs text-gray-500 border-t pt-2">
                                    <div className="font-semibold mb-1">
                                      Sources
                                    </div>
                                    <ol className="list-decimal pl-4">
                                      {allSources.map((source, i) => (
                                        <li key={i}>{source}</li>
                                      ))}
                                    </ol>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>

                {/* Re-add scroll to bottom button, adjusted position */}
                {!autoscrollEnabled && (
                  <div
                    className="absolute left-1/2 transform -translate-x-1/2"
                    style={{ bottom: "7.5rem", zIndex: 50 }}
                  >
                    <Button
                      onClick={handleScrollToBottom}
                      className="rounded-full shadow-lg bg-mha-blue hover:bg-mha-blue-dark p-2 opacity-80 hover:opacity-100 transition-opacity"
                      aria-label="Scroll to bottom"
                    >
                      <ChevronDown className="h-5 w-5 text-white" />
                    </Button>
                  </div>
                )}

                {/* Input bar */}
                <div className="sticky bottom-0 left-0 right-0 bg-white p-4 border-t flex gap-2 items-end z-30 shadow-md">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      // Auto-resize logic
                      const el = e.target;
                      el.style.height = "auto";
                      const newHeight = Math.min(
                        el.scrollHeight,
                        window.innerHeight * 0.3
                      );
                      el.style.height = `${newHeight}px`;
                      setAutoHeight(`${newHeight}px`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleNewChat();
                      }
                    }}
                    placeholder="Type your message... (Shift+Enter for new line)"
                    className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mha-pink focus:border-transparent resize-none overflow-y-auto"
                    disabled={isLoading}
                    style={{ height: autoHeight, maxHeight: "30vh" }}
                  />
                  <Button
                    onClick={() => handleNewChat()}
                    disabled={isLoading}
                    className="bg-mha-pink hover:bg-mha-pink-dark"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right Sidebar (Desktop) */}
            <div className="hidden lg:block space-y-4 overflow-y-auto max-h-screen pb-6">
              {panelOrder.map((panelId: string) => {
                console.log(`Rendering panel: ${panelId}`);

                if (panelId === "starterQuestions") {
                  // Special handling for starter questions panel
                  return (
                    <Card
                      key={panelId}
                      className="p-4 bg-white rounded-lg text-sm text-gray-600"
                    >
                      <div
                        className="flex justify-between items-center mb-4 cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors"
                        onClick={() =>
                          setEvaluationExpanded(!evaluationExpanded)
                        }
                      >
                        <h3 className="text-lg font-semibold text-mha-blue">
                          {starterQuestionsPanel.title}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto"
                        >
                          {evaluationExpanded ? (
                            <ChevronUp className="h-5 w-5 text-mha-blue" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-mha-blue" />
                          )}
                        </Button>
                      </div>
                      {evaluationExpanded && (
                        <div className="space-y-3">
                          <p className="italic text-gray-500 text-xs mb-2">
                            {starterQuestionsPanel.content[0]}
                          </p>
                          {starterQuestions.map(
                            (
                              question: { title: string; question: string },
                              index: number
                            ) => (
                              <div
                                key={index}
                                className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  handleNewChat(question.question);
                                }}
                              >
                                <p className="font-medium text-mha-blue">
                                  {question.title}
                                </p>
                                <p>{question.question}</p>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </Card>
                  );
                } else if (panelId in contentPanels) {
                  // Standard panels
                  const panel = contentPanels[panelId];
                  const isPanelExpanded =
                    panelId === "about"
                      ? aboutExpanded
                      : panelId === "feedback"
                      ? feedbackExpanded
                      : panelId === "disclaimer"
                      ? disclaimerExpanded
                      : true;

                  const togglePanel = () => {
                    if (panelId === "about") setAboutExpanded(!aboutExpanded);
                    else if (panelId === "feedback")
                      setFeedbackExpanded(!feedbackExpanded);
                    else if (panelId === "disclaimer")
                      setDisclaimerExpanded(!disclaimerExpanded);
                  };

                  return (
                    <Card
                      key={panelId}
                      className={`p-4 rounded-lg text-sm text-gray-600 ${
                        panel.variant === "highlight"
                          ? "bg-mha-blue-10"
                          : "bg-white"
                      }`}
                    >
                      <div
                        className={`flex justify-between items-center mb-4 cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors ${
                          !isPanelExpanded ? "hover:shadow-sm" : ""
                        }`}
                        onClick={togglePanel}
                      >
                        <h3 className="text-lg font-semibold text-mha-blue">
                          {panel.title}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-auto"
                        >
                          {isPanelExpanded ? (
                            <ChevronUp className="h-5 w-5 text-mha-blue" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-mha-blue" />
                          )}
                        </Button>
                      </div>
                      {isPanelExpanded && (
                        <div className="space-y-2">
                          {panel.content.map(
                            (paragraph: string, idx: number) => (
                              <p key={idx} className="leading-relaxed">
                                {paragraph}
                              </p>
                            )
                          )}
                          {/* Special case for feedback panel - add the feedback button */}
                          {panelId === "feedback" && (
                            <div className="mt-4">
                              <Button
                                className="w-full bg-mha-pink hover:bg-mha-pink-dark text-white"
                                onClick={() => startFeedback()}
                              >
                                <MessageSquarePlus className="h-4 w-4 mr-2" />
                                Give Feedback
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                } else {
                  console.warn(`Panel ${panelId} not found in contentPanels`);
                  return null;
                }
              })}
            </div>
          </div>
        </div>
      </AppLayout>

      {/* Error message display - positioned fixed, so it's fine as a sibling to AppLayout */}
      {error && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md">
          {error}
        </div>
      )}
    </>
  );
}

export default App;
