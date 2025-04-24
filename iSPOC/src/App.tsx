import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  MessageSquare,
  Send,
  Phone,
  HelpCircle,
  Settings,
  Menu,
  X,
  ChevronUp,
  ChevronDown,
  // Commenting out unused icons
  // KeyRound,
  // Train,
  // FileQuestion,
  // ClipboardList,
  MessageSquarePlus,
  Bug,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { ScrollArea } from "./components/ui/scroll-area";
import { createResponse } from "./lib/api";
import { EnvDebug } from "./components/EnvDebug";
import { MHALogo } from "./components/MHALogo";
import { debug, initDebug, toggleDebug, isDebugMode } from "./lib/debug";
import systemPrompt from "./prompts/system_prompt.md?raw";
import feedbackPrompt from "./prompts/feedback_prompt.md?raw";
import {
  contentPanels,
  panelOrder,
  starterQuestionsPanel,
  starterQuestions,
} from "./lib/content-config";

// Initialize debug mode
initDebug();

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
}

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: "ai",
      content: [
        {
          type: "text",
          text: {
            value:
              "Hello! I'm your iSPoC Policy Assistant. How can I help you today?",
          },
        },
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aboutExpanded, setAboutExpanded] = useState(true);
  const [evaluationExpanded, setEvaluationExpanded] = useState(false);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(false);
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);
  const [mobileAboutExpanded, setMobileAboutExpanded] = useState(true);
  const [mobileEvaluationExpanded, setMobileEvaluationExpanded] =
    useState(false);
  const [mobileFeedbackExpanded, setMobileFeedbackExpanded] = useState(false);
  const [mobileDisclaimerExpanded, setMobileDisclaimerExpanded] =
    useState(false);

  // Ref for the scroll area viewport
  const viewportRef = useRef<HTMLDivElement | null>(null);
  // Ref for the input element
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

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

  // Function to pre-process text - ABSOLUTE MINIMUM - Only Citations & Object
  const processTextForMarkdown = (text: string) => {
    debug.group("ui", "Processing markdown");

    if (!text) {
      debug.warn("ui", "Received empty text for markdown processing");
      debug.groupEnd();
      return "";
    }

    let processed = String(text);

    // Debug the incoming text
    debug.log("ui", `Text for markdown, length: ${processed.length}`);
    if (processed.length > 0 && processed.length < 100) {
      debug.log("ui", `Raw text content: "${processed}"`);
    }

    // 1. Remove citation patterns
    const beforeCitationRemoval = processed.length;
    processed = processed.replace(
      /\s*(\[\d+:\d+\*source\]|\u3010\d+:\d+[\u2020†]source\u3011)\s*/g,
      " "
    );
    if (beforeCitationRemoval !== processed.length) {
      debug.log(
        "ui",
        `Removed ${
          beforeCitationRemoval - processed.length
        } characters from citations`
      );
    }

    // 2. Remove ,[object Object],
    const beforeObjectRemoval = processed.length;
    processed = processed.replace(/,\[object Object\],/g, " ");
    if (beforeObjectRemoval !== processed.length) {
      debug.log(
        "ui",
        `Removed ${
          beforeObjectRemoval - processed.length
        } characters from object notation`
      );
    }

    // 3. Trim whitespace from start/end only
    processed = processed.trim();

    // 4. Debug output text
    if (processed.length > 0 && processed.length < 100) {
      debug.log("ui", `Processed markdown text: "${processed}"`);
    } else {
      debug.log("ui", `Processed markdown text length: ${processed.length}`);
    }

    debug.groupEnd();
    return processed;
  };

  const handleSend = async (messageToSend?: string) => {
    const message = messageToSend || input;
    debug.log("ui", `handleSend triggered with message: ${message}`);

    if (message.trim() && !isLoading) {
      debug.log("ui", "Message valid and not loading, proceeding...");

      // First set loading state so the animation appears
      setIsLoading(true);
      debug.log("ui", "Set isLoading to true");

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
      const userMsg: Message = { type: "user", content: message };
      let aiMessageIndex = -1; // Track where we're adding the AI message

      setMessages((prev) => {
        debug.log("ui", "Adding user message to state");

        // Remember the index where the AI message will be
        aiMessageIndex = prev.length;

        // Add both the user message and an empty AI message placeholder at once
        return [
          ...prev,
          userMsg,
          { type: "ai", content: [{ type: "text", text: { value: "" } }] },
        ];
      });

      debug.log("ui", `Added AI placeholder at index ${aiMessageIndex + 1}`);

      try {
        debug.log("ui", "Calling createResponse API with message:", message);

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
                        "q5" in json;

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
                                      value: `✅ **Thank you for your feedback!**

Your responses have been recorded:
- **Rating:** ${json.q1}
- **Liked:** ${json.q2}
- **Frustrated:** ${json.q3}
- **Feature Request:** ${json.q4}
- **Recommendation:** ${json.q5}

This will help us improve the Policy Assistant.`,
                                    },
                                  },
                                ],
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
                const newMessages = [...prevMessages];

                // Find the last AI message
                let lastAIIndex = -1;
                for (let i = newMessages.length - 1; i >= 0; i--) {
                  if (newMessages[i].type === "ai") {
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
                const message = newMessages[lastAIIndex];
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
                  debug.warn(
                    "ui",
                    "Error message received, stopping loading state"
                  );
                  setIsLoading(false);
                }

                // Create new message with updated content
                newMessages[lastAIIndex] = {
                  ...message,
                  content,
                };

                return newMessages;
              });
            },
            mode === "feedback" ? feedbackPrompt : systemPrompt,
            signal
          );

        // Store the response ID for multi-turn conversation
        if (responseResult.id) {
          debug.log("ui", "Setting previousResponseId:", responseResult.id);
          setPreviousResponseId(responseResult.id);
        } else {
          debug.warn(
            "ui",
            "No response ID received, multi-turn conversation may not work"
          );
        }

        debug.log("ui", "createResponse promise resolved");
      } catch (error) {
        // Check if this was aborted on purpose
        if (error instanceof Error && error.name === "AbortError") {
          debug.log("ui", "Request aborted intentionally");
          return;
        }

        debug.error("ui", "Error getting response from createResponse:", error);
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
        debug.log("ui", "Set isLoading to false in finally block");
      }
    } else {
      debug.warn("ui", "handleSend skipped: Input empty or already loading");
    }
  };

  // Effect to scroll to bottom automatically when messages change
  useEffect(() => {
    // Only scroll if user is already at the bottom or it's the first message
    console.log(
      "[UI] Messages updated, checking if scroll needed",
      messages.length
    );
    if (isAtBottom || messages.length <= 1) {
      const scrollTimeout = setTimeout(() => {
        if (viewportRef.current) {
          console.log("[UI] Auto-scrolling on message update");
          viewportRef.current.scrollTo({
            top: viewportRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 50); // Small delay to let content render

      return () => clearTimeout(scrollTimeout);
    } else {
      console.log("[UI] Not scrolling as user has scrolled up", isAtBottom);
    }
  }, [messages, isAtBottom]);

  // Effect to handle scroll events and track if user is at bottom
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      // Consider "at bottom" if within 40px of the bottom
      const isScrollAtBottom = scrollHeight - scrollTop - clientHeight < 40;

      if (isScrollAtBottom !== isAtBottom) {
        console.log(
          "[UI] Scroll position change detected:",
          isScrollAtBottom ? "at bottom" : "scrolled up"
        );
        setIsAtBottom(isScrollAtBottom);
      }
    };

    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [isAtBottom]);

  // Effect to detect when actual viewport is available and attach ref
  useEffect(() => {
    console.log("[UI] Attempting to find viewport element");
    // Find the viewport element inside our ScrollArea after components mount
    const viewportElement = document.querySelector(
      ".chat-scroll-area > [data-radix-scroll-area-viewport]"
    );

    if (viewportElement) {
      console.log("[UI] Found viewport element:", viewportElement);
      // Store reference to the actual viewport element
      viewportRef.current = viewportElement as HTMLDivElement;

      // Initial scroll check
      const element = viewportElement as HTMLDivElement;
      const { scrollHeight, clientHeight } = element;
      console.log(
        `[UI] Initial scroll state: scrollHeight=${scrollHeight}, clientHeight=${clientHeight}`
      );

      // Force initial scroll to bottom
      element.scrollTo({
        top: element.scrollHeight,
        behavior: "auto",
      });

      // Add mutation observer to detect DOM changes within messages
      const messagesContainer = viewportElement.querySelector(".space-y-4");
      if (messagesContainer) {
        console.log("[UI] Setting up mutation observer on messages container");
        const observer = new MutationObserver((mutations) => {
          console.log(
            "[UI] DOM mutation detected in messages container",
            mutations.length
          );
          if (isAtBottom) {
            requestAnimationFrame(() => {
              element.scrollTo({
                top: element.scrollHeight,
                behavior: "smooth",
              });
            });
          }
        });

        observer.observe(messagesContainer, {
          childList: true,
          subtree: true,
          characterData: true,
          characterDataOldValue: true,
        });

        // Cleanup observer on unmount
        return () => observer.disconnect();
      }
    } else {
      console.warn(
        "[UI] Viewport element not found after component mount - will retry"
      );
      // Set up a retry mechanism
      const retryTimeout = setTimeout(() => {
        const retryViewportElement = document.querySelector(
          ".chat-scroll-area > [data-radix-scroll-area-viewport]"
        );
        if (retryViewportElement) {
          console.log(
            "[UI] Found viewport element on retry:",
            retryViewportElement
          );
          viewportRef.current = retryViewportElement as HTMLDivElement;
          retryViewportElement.scrollTo({
            top: retryViewportElement.scrollHeight,
            behavior: "auto",
          });
        }
      }, 500);

      return () => clearTimeout(retryTimeout);
    }
  }, [isAtBottom]);

  // Handle creating a new chat
  const handleNewChat = () => {
    // 1. Abort any ongoing API requests
    if (abortControllerRef.current) {
      debug.log("ui", "Aborting any ongoing requests");
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 1. Stop any current streaming response
    setIsLoading(false);

    // 2. Reset messages to just the welcome message
    setMessages([
      {
        type: "ai",
        content: [
          {
            type: "text",
            text: {
              value:
                "Hello! I'm your iSPoC Policy Assistant. How can I help you today?",
            },
          },
        ],
      },
    ]);

    // 3. Clear input field
    setInput("");

    // 4. Reset error state
    setError(null);

    // Reset to policy mode if we were in feedback mode
    if (mode === "feedback") {
      setMode("policy");
      setFeedbackAnswers(null);
      feedbackThankYouShown.current = false; // Reset the ref
    }

    console.log("[UI] Started new chat");
  };

  // Function to start the feedback survey per original instructions
  const startFeedback = () => {
    // Reset state but don't use handleNewChat to avoid showing welcome message
    setIsLoading(false);
    setInput("");
    setError(null);
    setPreviousResponseId(undefined);
    setFeedbackAnswers(null);

    // Switch to feedback mode
    setMode("feedback");

    // Initialize with a thank you message instead of the standard welcome
    setMessages([
      {
        type: "ai",
        content: [
          {
            type: "text",
            text: {
              value:
                "Thank you for taking this survey. Click the button below to begin.",
            },
          },
        ],
      },
    ]);
  };

  // Update the useEffect hook for feedbackAnswers to avoid duplicating messages
  useEffect(() => {
    if (feedbackAnswers) {
      console.log("📊 Feedback state updated:", feedbackAnswers);

      if (!feedbackThankYouShown.current) {
        console.log("📊 First time seeing feedback, should show thank you");
        // After receiving feedback, show a proper thank you message with return button
        setTimeout(() => {
          // Create a formatted thank you message with the feedback data
          const thankYouMessage = {
            type: "ai" as const,
            content: [
              {
                type: "text" as const,
                text: {
                  value: `✅ **Thank you for your feedback!**

Your responses have been recorded:
- **Rating:** ${feedbackAnswers.q1}
- **Liked:** ${feedbackAnswers.q2}
- **Frustrated:** ${feedbackAnswers.q3}
- **Feature Request:** ${feedbackAnswers.q4}
- **Recommendation:** ${feedbackAnswers.q5}

This will help us improve the Policy Assistant.`,
                },
              },
            ],
          };

          // Create a separate message just for the return button
          const returnButtonMessage = {
            type: "ai" as const,
            content: [
              {
                type: "text" as const,
                text: {
                  value: "returnButton",
                },
              },
            ],
          };

          // Update messages, filter out any JSON response
          setMessages((prev) => {
            // Keep all messages except any potential raw JSON
            const filteredMessages = prev.filter((msg) => {
              // Skip messages that appear to contain JSON
              if (
                msg.type === "ai" &&
                Array.isArray(msg.content) &&
                msg.content.length === 1 &&
                msg.content[0].type === "text" &&
                typeof msg.content[0].text?.value === "string" &&
                msg.content[0].text.value.trim().startsWith("{") &&
                msg.content[0].text.value.trim().endsWith("}")
              ) {
                return false;
              }
              return true;
            });

            // Add thank you message and return button
            return [...filteredMessages, thankYouMessage, returnButtonMessage];
          });
        }, 1000);
      } else {
        console.log("📊 Already showed thank you for feedback");
      }
    }
  }, [feedbackAnswers]);

  // Add effect to focus input when message loading completes
  useEffect(() => {
    // Focus the input field when loading stops
    if (!isLoading && inputRef.current) {
      // Brief timeout to ensure UI is fully updated
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isLoading]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Mobile Menu Toggle */}
      <Button
        variant="ghost"
        className="md:hidden fixed top-4 left-4 z-50 text-white bg-mha-pink hover:bg-mha-pink-dark"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Sidebar */}
      <div
        className={`
        fixed md:static top-0 left-0 h-screen md:h-auto md:min-h-screen bg-mha-pink text-white p-6 md:w-[11.6rem] flex flex-col
        transform transition-transform duration-300 ease-in-out z-40
        ${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        {/* Logo */}
        <div className="mb-8 mt-12 md:mt-0 flex justify-center">
          <MHALogo variant="ispoc" size="lg" />
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto">
          {/* Navigation buttons are commented out */}
        </nav>

        <div className="pt-4 mt-4 border-t border-[#a30068]">
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white hover:bg-mha-pink-dark"
          >
            <Phone className="mr-3 h-5 w-5" />
            <span>Contact</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white hover:bg-mha-pink-dark"
          >
            <HelpCircle className="mr-3 h-5 w-5" />
            <span>Help & Support</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white hover:bg-mha-pink-dark"
          >
            <Settings className="mr-3 h-5 w-5" />
            <span>Settings</span>
          </Button>
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 px-6 pt-6 pb-0 flex flex-col h-screen overflow-hidden">
        {/* Two-column Layout */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 h-full overflow-hidden">
          {/* Chat Area - Left Column */}
          <div className="mt-12 md:mt-0 flex flex-col flex-1 min-h-0 h-full">
            <Card className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden h-full flex-grow">
              {/* Chat Header */}
              <div
                className={`${
                  mode === "feedback" ? "bg-mha-pink" : "bg-mha-blue"
                } text-white p-4 flex-shrink-0`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {mode === "feedback" ? (
                        "Feedback Survey"
                      ) : (
                        <>
                          iSPoC <span className="font-normal">|</span> Policy
                          Assistant
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
                    className="bg-white text-mha-blue hover:bg-gray-100 font-medium px-4 py-2"
                    onClick={handleNewChat}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {mode === "feedback" ? "Cancel Survey" : "New Chat"}
                  </Button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-grow overflow-hidden flex flex-col">
                <ScrollArea className="h-full p-4 chat-scroll-area custom-scrollbar flex-grow">
                  <div className="space-y-4">
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
                          debug.log(
                            "ui",
                            `Showing loading animation for message ${index}`
                          );
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
                                    </ul>
                                    <p>
                                      This will help us improve the Policy
                                      Assistant.
                                    </p>
                                  </div>

                                  <div className="flex justify-center w-full mt-4">
                                    <Button
                                      className="bg-mha-blue hover:bg-mha-blue-dark text-white font-medium px-6 py-3 rounded-md shadow-sm transition-colors mt-2 mb-2 text-base"
                                      onClick={() => {
                                        console.log("😎 RETURN BUTTON CLICKED");
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
                                      Return to Policy Assistant
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
                                <div key={index} className="flex justify-start">
                                  <Card className="max-w-[80%] p-3 bg-white">
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
                                  console.log("😎 RETURN BUTTON CLICKED");
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
                                Return to Policy Assistant
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

                          // Debug: Log AI content on every render
                          debug.log(
                            "ui",
                            `Rendering AI message ${index} with content length: ${combinedText.length}`
                          );

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
                                    handleSend("start");
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
                        <div key={index} className="flex justify-start">
                          <Card className="max-w-[80%] p-3 bg-white">
                            {messageContentElement}
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t flex-shrink-0 mt-auto">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && !e.shiftKey && handleSend()
                    }
                    placeholder="Type your message..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={() => handleSend()}
                    disabled={isLoading}
                    className="bg-mha-pink hover:bg-mha-pink-dark"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block space-y-4 overflow-y-auto max-h-screen pb-6">
            {/* Generate panels in the order specified in the config */}
            {panelOrder.map((panelId: string) => {
              if (panelId === "starterQuestions") {
                // Special handling for starter questions panel
                return (
                  <Card
                    key={panelId}
                    className="p-4 bg-white rounded-lg text-sm text-gray-600"
                  >
                    <div
                      className="flex justify-between items-center mb-4 cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors"
                      onClick={() => setEvaluationExpanded(!evaluationExpanded)}
                    >
                      <h3 className="text-lg font-semibold text-mha-blue">
                        {starterQuestionsPanel.title}
                      </h3>
                      <Button variant="ghost" size="sm" className="p-1 h-auto">
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
                              className="p-2 border border-gray-200 rounded-md hover:bg-gray-50"
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
              } else {
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
                      <Button variant="ghost" size="sm" className="p-1 h-auto">
                        {isPanelExpanded ? (
                          <ChevronUp className="h-5 w-5 text-mha-blue" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-mha-blue" />
                        )}
                      </Button>
                    </div>
                    {isPanelExpanded && (
                      <div className="space-y-2">
                        {panel.content.map((paragraph: string, idx: number) => (
                          <p key={idx} className="leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                        {/* Special case for feedback panel - add the feedback button */}
                        {panelId === "feedback" && (
                          <div className="mt-4">
                            <Button
                              className="w-full bg-mha-pink hover:bg-mha-pink-dark text-white"
                              onClick={startFeedback}
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
              }
            })}
          </div>
        </div>

        {/* Mobile Help Panel */}
        <div
          className={`
            fixed bottom-0 left-0 right-0 bg-white shadow-lg rounded-t-xl 
            transform transition-transform duration-300 ease-in-out
            lg:hidden z-30
            ${
              helpPanelOpen
                ? "translate-y-0"
                : "translate-y-[calc(100%-2.5rem)]"
            }
          `}
        >
          <Button
            variant="ghost"
            className="w-full h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-t-xl"
            onClick={() => setHelpPanelOpen(!helpPanelOpen)}
          >
            <ChevronUp
              className={`h-5 w-5 transform transition-transform ${
                helpPanelOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
          <div className="p-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Mobile panels for About, Evaluation, and Disclaimer sections */}
            {panelOrder.map((panelId: string) => {
              if (panelId === "starterQuestions") {
                // Special handling for starter questions panel
                return (
                  <div
                    key={panelId}
                    className="p-4 bg-white rounded-lg text-sm text-gray-600 mb-4"
                  >
                    <div
                      className="flex justify-between items-center mb-4 cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors"
                      onClick={() =>
                        setMobileEvaluationExpanded(!mobileEvaluationExpanded)
                      }
                    >
                      <h3 className="text-lg font-semibold text-mha-blue">
                        {starterQuestionsPanel.title}
                      </h3>
                      <Button variant="ghost" size="sm" className="p-1 h-auto">
                        {mobileEvaluationExpanded ? (
                          <ChevronUp className="h-5 w-5 text-mha-blue" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-mha-blue" />
                        )}
                      </Button>
                    </div>
                    {mobileEvaluationExpanded && (
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
                              className="p-2 border border-gray-200 rounded-md hover:bg-gray-50"
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
                  </div>
                );
              } else {
                // Standard panels
                const panel = contentPanels[panelId];
                const isPanelExpanded =
                  panelId === "about"
                    ? mobileAboutExpanded
                    : panelId === "feedback"
                    ? mobileFeedbackExpanded
                    : panelId === "disclaimer"
                    ? mobileDisclaimerExpanded
                    : true;

                const togglePanel = () => {
                  if (panelId === "about")
                    setMobileAboutExpanded(!mobileAboutExpanded);
                  else if (panelId === "feedback")
                    setMobileFeedbackExpanded(!mobileFeedbackExpanded);
                  else if (panelId === "disclaimer")
                    setMobileDisclaimerExpanded(!mobileDisclaimerExpanded);
                };

                const isLastPanel =
                  panelId === panelOrder[panelOrder.length - 1];

                return (
                  <div
                    key={panelId}
                    className={`p-4 rounded-lg text-sm text-gray-600 ${
                      !isLastPanel ? "mb-4" : ""
                    } ${
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
                      <Button variant="ghost" size="sm" className="p-1 h-auto">
                        {isPanelExpanded ? (
                          <ChevronUp className="h-5 w-5 text-mha-blue" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-mha-blue" />
                        )}
                      </Button>
                    </div>
                    {isPanelExpanded && (
                      <div className="space-y-2">
                        {panel.content.map((paragraph: string, idx: number) => (
                          <p key={idx} className="leading-relaxed">
                            {paragraph}
                          </p>
                        ))}
                        {/* Special case for feedback panel - add the feedback button */}
                        {panelId === "feedback" && (
                          <div className="mt-4">
                            <Button
                              className="w-full bg-mha-pink hover:bg-mha-pink-dark text-white"
                              onClick={startFeedback}
                            >
                              <MessageSquarePlus className="h-4 w-4 mr-2" />
                              Give Feedback
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>

      {/* Add the debug component */}
      <EnvDebug />

      {/* Add error message display */}
      {error && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* Debug tools */}
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={toggleDebug}
          variant="outline"
          size="sm"
          className="bg-white border-gray-300 hover:bg-gray-100"
        >
          <Bug className="h-4 w-4 mr-1" />
          {isDebugMode() ? "Hide Debug" : "Debug"}
        </Button>
      </div>
    </div>
  );
}

export default App;
