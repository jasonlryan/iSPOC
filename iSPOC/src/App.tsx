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
  KeyRound,
  Train,
  FileQuestion,
  ClipboardList,
  MessageSquarePlus,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createResponse } from "./lib/api";
import { EnvDebug } from "./components/EnvDebug";
import { MHALogo } from "./components/MHALogo";
import { debug, initDebug, toggleDebug, isDebugMode } from "./lib/debug";

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
              "Hello! I'm your MHA Digital Assistant. How can I help you today?",
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
  const [questionsExpanded, setQuestionsExpanded] = useState(true);
  const [aboutExpanded, setAboutExpanded] = useState(true);
  const [evaluationExpanded, setEvaluationExpanded] = useState(true);
  const [disclaimerExpanded, setDisclaimerExpanded] = useState(true);
  const [feedbackExpanded, setFeedbackExpanded] = useState(true);
  const [mobileQuestionsExpanded, setMobileQuestionsExpanded] = useState(true);
  const [mobileAboutExpanded, setMobileAboutExpanded] = useState(true);
  const [mobileEvaluationExpanded, setMobileEvaluationExpanded] =
    useState(true);
  const [mobileFeedbackExpanded, setMobileFeedbackExpanded] = useState(true);
  const [mobileDisclaimerExpanded, setMobileDisclaimerExpanded] =
    useState(true);

  // Ref for the scroll area viewport
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const commonQuestions = [
    {
      icon: <KeyRound className="h-5 w-5 mr-2 flex-shrink-0 text-mha-blue" />,
      text: "How do I reset my password?",
    },
    {
      icon: <Train className="h-5 w-5 mr-2 flex-shrink-0 text-mha-blue" />,
      text: "What is the travel expenses policy?",
    },
    {
      icon: (
        <FileQuestion className="h-5 w-5 mr-2 flex-shrink-0 text-mha-blue" />
      ),
      text: "How do I submit a support ticket?",
    },
    {
      icon: (
        <ClipboardList className="h-5 w-5 mr-2 flex-shrink-0 text-mha-blue" />
      ),
      text: "Where can I find the latest HR policies?",
    },
  ];

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
          await createResponse(message, previousResponseId, (contentItem) => {
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
              `🟢 CHUNK TEXT [${index}]: "${textValue.substring(0, 20)}..." (${
                textValue.length
              } chars)`
            );

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
              let content = [...((message.content as TextContentItem[]) || [])];

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
          });

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

  const handleCommonQuestionClick = (question: string) => {
    console.log("[UI] Common question clicked:", question);
    handleSend(question); // Call handleSend directly with the question
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
                "Hello! I'm your MHA Digital Assistant. How can I help you today?",
            },
          },
        ],
      },
    ]);

    // 3. Clear input field
    setInput("");

    // 4. Reset error state
    setError(null);

    console.log("[UI] Started new chat");
  };

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
        fixed md:static top-0 left-0 h-screen md:h-auto md:min-h-screen bg-mha-pink text-white p-6 md:w-[14.5rem] flex flex-col
        transform transition-transform duration-300 ease-in-out z-40
        ${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        {/* Logo */}
        <div className="mb-8 mt-12 md:mt-0 -ml-6 flex justify-center">
          <MHALogo variant="pink" size="lg" />
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
      <div className="flex-1 p-6 h-full">
        {/* Two-column Layout */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 h-full">
          {/* Chat Area - Left Column */}
          <div className="mt-12 md:mt-0 flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-100px)]">
            <Card className="flex flex-col bg-white rounded-lg shadow-lg overflow-hidden h-full">
              {/* Chat Header */}
              <div className="bg-mha-blue text-white p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Policy Assistant</h2>
                    <p className="text-sm opacity-80">
                      Available 24/7 to assist you
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    className="bg-white text-mha-blue hover:bg-gray-100 font-medium px-4 py-2"
                    onClick={handleNewChat}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    New Chat
                  </Button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="h-full p-4 chat-scroll-area custom-scrollbar flex-grow">
                  <div className="space-y-4">
                    {messages.map((message, index) => {
                      let messageContentElement: React.ReactNode = null;

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
                        // Third case: We have content to display
                        else {
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
                      }

                      return (
                        <div
                          key={index}
                          className={`flex ${
                            message.type === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <Card
                            className={`max-w-[80%] p-3 ${
                              message.type === "user"
                                ? "bg-mha-pink text-white"
                                : "bg-white"
                            }`}
                          >
                            {messageContentElement}
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t flex-shrink-0">
                <div className="flex gap-2">
                  <Input
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
          <div className="hidden lg:block space-y-4">
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-mha-blue">
                  Common Questions
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => setQuestionsExpanded(!questionsExpanded)}
                >
                  {questionsExpanded ? (
                    <ChevronUp className="h-5 w-5 text-mha-blue" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-mha-blue" />
                  )}
                </Button>
              </div>
              {questionsExpanded && (
                <div className="space-y-1">
                  {commonQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2 px-3"
                      onClick={() => handleCommonQuestionClick(question.text)}
                      disabled={isLoading}
                    >
                      <div className="flex items-center">
                        {question.icon}
                        <span className="text-sm">{question.text}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4 bg-white rounded-lg text-sm text-gray-600">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-mha-blue">
                  About this Chatbot
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => setAboutExpanded(!aboutExpanded)}
                >
                  {aboutExpanded ? (
                    <ChevronUp className="h-5 w-5 text-mha-blue" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-mha-blue" />
                  )}
                </Button>
              </div>
              {aboutExpanded && (
                <div className="space-y-2">
                  <p className="leading-relaxed">
                    The Policy Assistant is a pilot program designed to test the
                    efficiency of information retrieval from non-clinical
                    policies. This AI-powered chatbot helps staff quickly access
                    and understand MHA's policy information without having to
                    search through multiple documents.
                  </p>
                  <p className="leading-relaxed">
                    As part of our digital transformation initiative, this tool
                    aims to streamline administrative processes and improve
                    staff access to important policy guidelines. Your feedback
                    during this pilot phase will help us enhance the system and
                    expand its capabilities.
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-4 bg-white rounded-lg text-sm text-gray-600">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-mha-blue">
                  Evaluation Questions
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => setEvaluationExpanded(!evaluationExpanded)}
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
                    Try asking the chatbot these questions to evaluate its
                    performance:
                  </p>
                  <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <p className="font-medium text-mha-blue">
                      1. Recruitment Process Question
                    </p>
                    <p>
                      What are the key stages in MHA's recruitment process, and
                      how does the organization ensure equality and diversity
                      during hiring?
                    </p>
                  </div>
                  <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <p className="font-medium text-mha-blue">
                      2. Leave Policy Question
                    </p>
                    <p>
                      How do the Family Leave and Sickness Absence policies
                      interact when an employee needs to care for a sick family
                      member while also being unwell themselves?
                    </p>
                  </div>
                  <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <p className="font-medium text-mha-blue">
                      3. Complaints Handling Question
                    </p>
                    <p>
                      What is the timeframe for responding to formal complaints
                      from residents, and what are the different stages of the
                      complaints process?
                    </p>
                  </div>
                  <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <p className="font-medium text-mha-blue">
                      4. Whistleblowing Process Question
                    </p>
                    <p>
                      If I need to report a serious concern about misconduct,
                      what protections does the Whistleblowing Policy provide
                      and what steps should I follow?
                    </p>
                  </div>
                  <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <p className="font-medium text-mha-blue">
                      5. Business Expenses Question
                    </p>
                    <p>
                      What expenses can staff claim for when traveling between
                      MHA locations, and what documentation is required for
                      reimbursement?
                    </p>
                  </div>
                  <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <p className="font-medium text-mha-blue">
                      6. Resident Valuables Question
                    </p>
                    <p>
                      What procedures should staff follow when handling
                      residents' money and valuables, and what are the
                      record-keeping requirements?
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Pilot Feedback Panel */}
            <Card className="p-4 bg-white rounded-lg text-sm text-gray-600">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-mha-blue">
                  Pilot Feedback
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => setFeedbackExpanded(!feedbackExpanded)}
                >
                  {feedbackExpanded ? (
                    <ChevronUp className="h-5 w-5 text-mha-blue" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-mha-blue" />
                  )}
                </Button>
              </div>
              {feedbackExpanded && (
                <div className="space-y-2">
                  <p className="leading-relaxed">
                    Your feedback is essential to improving this Policy
                    Assistant. By sharing your experiences, you help us refine
                    the tool to better serve everyone at MHA.
                  </p>
                  <p className="leading-relaxed">
                    We want to hear about your experience - what works well,
                    what could be improved, and any suggestions you have for
                    making this tool more useful in your daily work.
                  </p>
                  <div className="mt-4">
                    <Button
                      className="w-full bg-mha-pink hover:bg-mha-pink-dark text-white"
                      onClick={() => window.open("/feedback", "_blank")}
                    >
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      Give Feedback
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-4 bg-mha-blue-10 rounded-lg text-sm text-gray-600">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-mha-blue">
                  Disclaimer
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => setDisclaimerExpanded(!disclaimerExpanded)}
                >
                  {disclaimerExpanded ? (
                    <ChevronUp className="h-5 w-5 text-mha-blue" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-mha-blue" />
                  )}
                </Button>
              </div>
              {disclaimerExpanded && (
                <p className="leading-relaxed">
                  This AI assistant is designed to provide general information
                  and guidance. While we strive for accuracy, please verify
                  critical information through official channels. For urgent
                  matters, contact your supervisor or HR directly.
                </p>
              )}
            </Card>
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-mha-blue">
                Common Questions
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
                onClick={() =>
                  setMobileQuestionsExpanded(!mobileQuestionsExpanded)
                }
              >
                {mobileQuestionsExpanded ? (
                  <ChevronUp className="h-5 w-5 text-mha-blue" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-mha-blue" />
                )}
              </Button>
            </div>
            {mobileQuestionsExpanded && (
              <div className="space-y-1 mb-4">
                {commonQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto normal-case font-normal hover:bg-mha-blue-10 text-gray-700 px-3 py-2"
                    onClick={() => {
                      handleSend(question.text);
                      setHelpPanelOpen(false);
                    }}
                    disabled={isLoading}
                  >
                    {question.icon}
                    <span className="flex-1">{question.text}</span>
                  </Button>
                ))}
              </div>
            )}
            {/* Mobile panels for About, Evaluation, and Disclaimer sections */}
            {/* About section */}
            <div className="p-4 bg-white rounded-lg text-sm text-gray-600 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-mha-blue">
                  About this Chatbot
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() => setMobileAboutExpanded(!mobileAboutExpanded)}
                >
                  {mobileAboutExpanded ? (
                    <ChevronUp className="h-5 w-5 text-mha-blue" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-mha-blue" />
                  )}
                </Button>
              </div>
              {mobileAboutExpanded && (
                <div className="space-y-2">
                  <p className="leading-relaxed">
                    The Policy Assistant is a pilot program designed to test the
                    efficiency of information retrieval from non-clinical
                    policies. This AI-powered chatbot helps staff quickly access
                    and understand MHA's policy information without having to
                    search through multiple documents.
                  </p>
                  <p className="leading-relaxed">
                    As part of our digital transformation initiative, this tool
                    aims to streamline administrative processes and improve
                    staff access to important policy guidelines. Your feedback
                    during this pilot phase will help us enhance the system and
                    expand its capabilities.
                  </p>
                </div>
              )}
            </div>

            {/* Evaluation section */}
            <div className="p-4 bg-white rounded-lg text-sm text-gray-600 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-mha-blue">
                  Evaluation Questions
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() =>
                    setMobileEvaluationExpanded(!mobileEvaluationExpanded)
                  }
                >
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
                    Try asking the chatbot these questions to evaluate its
                    performance:
                  </p>
                  <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <p className="font-medium text-mha-blue">
                      1. Recruitment Process Question
                    </p>
                    <p>
                      What are the key stages in MHA's recruitment process, and
                      how does the organization ensure equality and diversity
                      during hiring?
                    </p>
                  </div>
                  <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <p className="font-medium text-mha-blue">
                      2. Leave Policy Question
                    </p>
                    <p>
                      How do the Family Leave and Sickness Absence policies
                      interact when an employee needs to care for a sick family
                      member while also being unwell themselves?
                    </p>
                  </div>
                  <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <p className="font-medium text-mha-blue">
                      3. Complaints Handling Question
                    </p>
                    <p>
                      What is the timeframe for responding to formal complaints
                      from residents, and what are the different stages of the
                      complaints process?
                    </p>
                  </div>
                  <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <p className="font-medium text-mha-blue">
                      4. Whistleblowing Process Question
                    </p>
                    <p>
                      If I need to report a serious concern about misconduct,
                      what protections does the Whistleblowing Policy provide
                      and what steps should I follow?
                    </p>
                  </div>
                  <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <p className="font-medium text-mha-blue">
                      5. Business Expenses Question
                    </p>
                    <p>
                      What expenses can staff claim for when traveling between
                      MHA locations, and what documentation is required for
                      reimbursement?
                    </p>
                  </div>
                  <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                    <p className="font-medium text-mha-blue">
                      6. Resident Valuables Question
                    </p>
                    <p>
                      What procedures should staff follow when handling
                      residents' money and valuables, and what are the
                      record-keeping requirements?
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Pilot Feedback Panel */}
            <div className="p-4 bg-white rounded-lg text-sm text-gray-600">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-mha-blue">
                  Pilot Feedback
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() =>
                    setMobileFeedbackExpanded(!mobileFeedbackExpanded)
                  }
                >
                  {mobileFeedbackExpanded ? (
                    <ChevronUp className="h-5 w-5 text-mha-blue" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-mha-blue" />
                  )}
                </Button>
              </div>
              {mobileFeedbackExpanded && (
                <div className="space-y-2">
                  <p className="leading-relaxed">
                    Your feedback is essential to improving this Policy
                    Assistant. By sharing your experiences, you help us refine
                    the tool to better serve everyone at MHA.
                  </p>
                  <p className="leading-relaxed">
                    We want to hear about your experience - what works well,
                    what could be improved, and any suggestions you have for
                    making this tool more useful in your daily work.
                  </p>
                  <div className="mt-4">
                    <Button
                      className="w-full bg-mha-pink hover:bg-mha-pink-dark text-white"
                      onClick={() => window.open("/feedback", "_blank")}
                    >
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      Give Feedback
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Disclaimer section */}
            <div className="p-4 bg-mha-blue-10 rounded-lg text-sm text-gray-600">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-mha-blue">
                  Disclaimer
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto"
                  onClick={() =>
                    setMobileDisclaimerExpanded(!mobileDisclaimerExpanded)
                  }
                >
                  {mobileDisclaimerExpanded ? (
                    <ChevronUp className="h-5 w-5 text-mha-blue" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-mha-blue" />
                  )}
                </Button>
              </div>
              {mobileDisclaimerExpanded && (
                <p className="leading-relaxed">
                  This AI assistant is designed to provide general information
                  and guidance. While we strive for accuracy, please verify
                  critical information through official channels. For urgent
                  matters, contact your supervisor or HR directly.
                </p>
              )}
            </div>
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
