import React, { useState, useEffect, useRef, MutableRefObject } from "react";
import ReactMarkdown from "react-markdown";
import {
  MessageSquare,
  Send,
  Home,
  Phone,
  Calendar,
  Users,
  HelpCircle,
  Search,
  MapPin,
  Building2,
  Heart,
  Settings,
  Menu,
  X,
  ChevronUp,
  ChevronDown,
  KeyRound,
  Train,
  FileQuestion,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendMessage } from "@/lib/api";
import { EnvDebug } from "@/components/EnvDebug";
import { MHALogo } from "./components/MHALogo";

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
  const [mobileQuestionsExpanded, setMobileQuestionsExpanded] = useState(true);
  const [mobileAboutExpanded, setMobileAboutExpanded] = useState(true);
  const [mobileEvaluationExpanded, setMobileEvaluationExpanded] =
    useState(true);
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

  // Markdown components mapping (ensure this is defined)
  const markdownComponents = {
    p: ({ children }: any) => (
      <p className="message-markdown-paragraph">{children}</p>
    ),
    ul: ({ children }: any) => (
      <ul className="message-markdown-list">{children}</ul>
    ),
    li: ({ children }: any) => (
      <li className="message-markdown-list-item">{children}</li>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="message-markdown-blockquote">
        {children}
      </blockquote>
    ),
  };

  const handleSend = async (messageToSend?: string) => {
    const message = messageToSend || input;
    console.log(`[UI] handleSend triggered with message: ${message}`);
    if (message.trim() && !isLoading) {
      console.log("[UI] Message valid and not loading, proceeding...");
      // Add user message
      const userMsg: Message = { type: "user", content: message };
      setMessages((prev) => {
        console.log("[UI] Adding user message to state:", userMsg);
        return [...prev, userMsg];
      });

      // Add empty AI message placeholder immediately
      const aiPlaceholder: Message = { type: "ai", content: [] };
      setMessages((prev) => {
        console.log("[UI] Adding AI placeholder to state:", aiPlaceholder);
        return [...prev, aiPlaceholder];
      });

      // Clear input only if the message came from the input field
      if (!messageToSend) {
        setInput("");
      }
      setIsLoading(true); // Set loading to true to show animation
      console.log("[UI] Set isLoading to true");
      setError(null);

      try {
        console.log("[UI] Calling sendMessage API with message:", message);
        // Note: sendMessage now returns the final accumulated string,
        // but the UI updates happen via onChunk
        await sendMessage(
          message, // Use the message variable
          // Updated onChunk to handle the content item object correctly
          (contentItem) => {
            console.log("[UI] onChunk received content item:", contentItem);
            // Ensure we only process text content items AND text object exists
            const textItem = contentItem.text; // Assign to variable first
            if (
              contentItem.type === "text" &&
              textItem &&
              textItem.value !== undefined
            ) {
              setMessages((prev) => {
                const updatedMessages = [...prev];
                const lastIndex = updatedMessages.length - 1;

                if (
                  lastIndex >= 0 &&
                  updatedMessages[lastIndex].type === "ai"
                ) {
                  let aiMessageContent = updatedMessages[lastIndex]
                    .content as TextContentItem[];
                  // Ensure content is an array for AI messages
                  if (!Array.isArray(aiMessageContent)) {
                    console.warn(
                      "[UI] AI message content was not an array, initializing."
                    );
                    aiMessageContent = [];
                  }

                  const targetIndex = contentItem.index;
                  const newTextChunk = textItem.value; // This is the incoming chunk (delta)

                  // Find or create the content item at the target index
                  if (
                    targetIndex >= 0 &&
                    targetIndex < aiMessageContent.length
                  ) {
                    // Item exists, **APPEND** its text value
                    console.log(
                      `[UI] Appending chunk to content at index ${targetIndex}`
                    );
                    // Make sure the existing item is a text item
                    if (aiMessageContent[targetIndex].type === "text") {
                      aiMessageContent[targetIndex].text.value += newTextChunk;
                    } else {
                      console.warn(
                        `[UI] Content item at index ${targetIndex} was not text, replacing with chunk.`
                      );
                      // Replace if it wasn't a text item somehow
                      aiMessageContent[targetIndex] = {
                        type: "text",
                        text: { value: newTextChunk },
                      };
                    }
                  } else if (targetIndex === aiMessageContent.length) {
                    // Append new item if index matches current length
                    console.log(
                      `[UI] Creating new content item at index ${targetIndex} with chunk`
                    );
                    aiMessageContent.push({
                      type: "text",
                      text: { value: newTextChunk },
                    });
                  } else {
                    // Handle potential index gaps or unexpected order
                    console.warn(
                      `[UI] Received content item with unexpected index ${targetIndex}. Current length: ${aiMessageContent.length}. Adding to end.`
                    );
                    // Add to the end as a fallback
                    aiMessageContent.push({
                      type: "text",
                      text: { value: newTextChunk },
                    });
                  }

                  // Create a new array for the state update to ensure React detects the change
                  updatedMessages[lastIndex].content = [...aiMessageContent];
                  // console.log('[UI] Updated message content array:', updatedMessages[lastIndex].content);
                } else {
                  console.warn(
                    "[UI] Could not find AI placeholder message to update."
                  );
                }
                return updatedMessages;
              });
            }
          }
        );
        console.log("[UI] sendMessage promise resolved.");
      } catch (error) {
        console.error("[UI] Error getting response from sendMessage:", error);
        setError("Failed to get a response. Please try again.");

        // Update the placeholder with error message (as a string for simplicity)
        setMessages((prev) => {
          console.log("[UI] Updating placeholder with error message.");
          const updatedMessages = [...prev];
          const lastIndex = updatedMessages.length - 1;

          if (
            lastIndex >= 0 &&
            updatedMessages[lastIndex].type === "ai" &&
            (!Array.isArray(updatedMessages[lastIndex].content) ||
              (updatedMessages[lastIndex].content as Array<any>).length === 0)
          ) {
            // Only update if still empty array
            // Replace content array with a single text item containing the error
            updatedMessages[lastIndex].content = [
              {
                type: "text",
                text: {
                  value:
                    "Sorry, there was an error processing your request. Please try again later.",
                },
              },
            ];
            console.log("[UI] Placeholder updated with error.");
          } else {
            console.log(
              "[UI] Placeholder already had content or was not found, not updating with error."
            );
          }
          return updatedMessages;
        });
      } finally {
        // IMPORTANT: Set loading to false AFTER the sendMessage promise resolves or rejects
        setIsLoading(false);
        console.log("[UI] Set isLoading to false in finally block.");
      }
    } else {
      console.log("[UI] handleSend skipped: Input empty or already loading.");
    }
  };

  const handleCommonQuestionClick = (question: string) => {
    console.log("[UI] Common question clicked:", question);
    handleSend(question); // Call handleSend directly with the question
  };

  // Effect to scroll to bottom on new messages if user is already near the bottom
  useEffect(() => {
    const viewport = viewportRef.current;
    console.log(
      "[UI] Auto-scroll effect triggered. Viewport:",
      viewport,
      "isAtBottom:",
      isAtBottom
    );
    if (viewport && isAtBottom) {
      // Use requestAnimationFrame to ensure DOM has updated before scrolling
      requestAnimationFrame(() => {
        console.log(
          `[UI] Attempting auto-scroll. Current scrollHeight: ${viewport.scrollHeight}`
        );
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      });
    } else {
      console.log(
        "[UI] Auto-scroll skipped (viewport null or user scrolled up)."
      );
    }
    // When message content updates we want to scroll
  }, [messages, isAtBottom]);

  // Separate effect to handle content stream updates - ensure scrolling happens during streaming
  useEffect(() => {
    const viewport = viewportRef.current;
    const lastMessage = messages[messages.length - 1];

    // Only auto-scroll for AI messages that are being streamed
    if (viewport && isAtBottom && lastMessage && lastMessage.type === "ai") {
      console.log("[UI] Stream update detected, triggering scroll");
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      });
    }
  }, [messages, isAtBottom]);

  // Effect to add scroll listener and manage isAtBottom state
  useEffect(() => {
    console.log(
      "[UI] Scroll listener effect attaching. viewportRef.current:",
      viewportRef.current
    );
    const viewport = viewportRef.current;
    if (!viewport) {
      console.warn("[UI] Viewport element not found for scroll listener.");
      return; // Exit if viewport is not yet available
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      // Add logging for scroll values
      console.log(
        `[UI] Scroll event: scrollTop=${scrollTop}, scrollHeight=${scrollHeight}, clientHeight=${clientHeight}`
      );
      // Consider user "at bottom" if they are within 50px of it
      const calculatedAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      console.log(`[UI] Calculated isAtBottom: ${calculatedAtBottom}`);
      // Update state only if it changes to prevent infinite loops
      if (calculatedAtBottom !== isAtBottom) {
        console.log(`[UI] Updating isAtBottom state to: ${calculatedAtBottom}`);
        setIsAtBottom(calculatedAtBottom);
      }
    };

    console.log("[UI] Adding scroll listener to viewport");
    viewport.addEventListener("scroll", handleScroll, { passive: true });

    // Initial check in case content is already scrollable
    handleScroll();

    return () => {
      console.log("[UI] Removing scroll listener from viewport");
      if (viewport) {
        // Check if viewport still exists on cleanup
        viewport.removeEventListener("scroll", handleScroll);
      }
    };
    // Keep dependency array as is, maybe update if ref itself changes, though unlikely for useRef
  }, [isAtBottom]);

  // Effect to detect when actual viewport is available and attach ref
  useEffect(() => {
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

      // Add mutation observer to detect DOM changes within messages
      const messagesContainer = viewportElement.querySelector(".space-y-4");
      if (messagesContainer) {
        console.log("[UI] Setting up mutation observer on messages container");
        const observer = new MutationObserver((mutations) => {
          console.log("[UI] DOM mutation detected in messages container");
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
      console.warn("[UI] Viewport element not found after component mount");
    }
  }, [isAtBottom]);

  return (
    <div className="min-h-screen h-screen bg-gray-50 flex overflow-hidden">
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
        fixed md:sticky top-0 left-0 h-full bg-mha-pink text-white p-6 md:w-[14.5rem] flex flex-col
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

      {/* Main Content */}
      <div className="flex-1 p-6 flex flex-col h-full overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 h-full relative">
          {/* Chat Area */}
          <Card className="flex-1 flex flex-col bg-white rounded-lg shadow-lg overflow-hidden mt-12 md:mt-0">
            {/* Chat Header */}
            <div className="bg-mha-blue text-white p-4">
              <div className="flex items-center">
                <div>
                  <h2 className="text-xl font-semibold">Policy Assistant</h2>
                  <p className="text-sm opacity-80">
                    Available 24/7 to assist you
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4 chat-scroll-area">
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
                      const isLastMessage = index === messages.length - 1;
                      const aiContent = message.content as TextContentItem[]; // Type assertion

                      if (Array.isArray(aiContent) && aiContent.length > 0) {
                        // Render array of text content items
                        messageContentElement = (
                          <div className="prose prose-sm max-w-none">
                            {aiContent.map((item, itemIndex) => (
                              <React.Fragment key={itemIndex}>
                                <ReactMarkdown components={markdownComponents}>
                                  {item.text.value}
                                </ReactMarkdown>
                              </React.Fragment>
                            ))}
                          </div>
                        );
                      } else if (isLoading && isLastMessage) {
                        // Render animation for the last AI message if empty and loading
                        messageContentElement = (
                          <div className="flex items-center space-x-2">
                            {/* Loading animation dots */}
                            <div
                              className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            ></div>
                          </div>
                        );
                      } else {
                        // Fallback for empty AI message (e.g., error state or before loading)
                        messageContentElement = (
                          <p className="text-gray-400">...</p>
                        );
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
            <div className="p-4 border-t">
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

          {/* Desktop Help Panel */}
          <div className="hidden lg:flex lg:w-80 flex-col gap-4">
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
            <div className="p-4 max-h-[70vh] overflow-y-auto">
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
                      The Policy Assistant is a pilot program designed to test
                      the efficiency of information retrieval from non-clinical
                      policies. This AI-powered chatbot helps staff quickly
                      access and understand MHA's policy information without
                      having to search through multiple documents.
                    </p>
                    <p className="leading-relaxed">
                      As part of our digital transformation initiative, this
                      tool aims to streamline administrative processes and
                      improve staff access to important policy guidelines. Your
                      feedback during this pilot phase will help us enhance the
                      system and expand its capabilities.
                    </p>
                  </div>
                )}
              </div>
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
                        What are the key stages in MHA's recruitment process,
                        and how does the organization ensure equality and
                        diversity during hiring?
                      </p>
                    </div>
                    <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                      <p className="font-medium text-mha-blue">
                        2. Leave Policy Question
                      </p>
                      <p>
                        How do the Family Leave and Sickness Absence policies
                        interact when an employee needs to care for a sick
                        family member while also being unwell themselves?
                      </p>
                    </div>
                    <div className="p-2 border border-gray-200 rounded-md hover:bg-gray-50">
                      <p className="font-medium text-mha-blue">
                        3. Complaints Handling Question
                      </p>
                      <p>
                        What is the timeframe for responding to formal
                        complaints from residents, and what are the different
                        stages of the complaints process?
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
      </div>

      {/* Add the debug component */}
      <EnvDebug />

      {/* Add error message display */}
      {error && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
