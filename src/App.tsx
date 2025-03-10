import { useState } from "react";
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

function App() {
  const [messages, setMessages] = useState<
    Array<{ type: "user" | "ai"; content: string }>
  >([
    {
      type: "ai",
      content:
        "Hello! I'm your MHA Digital Assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpPanelOpen, setHelpPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSend = async () => {
    if (input.trim()) {
      setMessages([...messages, { type: "user", content: input }]);
      const userMessage = input;
      setInput("");
      setIsLoading(true);
      setError(null);

      try {
        const response = await sendMessage(userMessage);

        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content: response,
          },
        ]);
      } catch (error) {
        console.error("Error getting response:", error);
        setError("Failed to get a response. Please try again.");
        setMessages((prev) => [
          ...prev,
          {
            type: "ai",
            content:
              "Sorry, there was an error processing your request. Please try again later.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCommonQuestionClick = (question: string) => {
    setInput(question);
    setTimeout(() => {
      handleSend();
    }, 100);
  };

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
        fixed md:sticky top-0 left-0 h-full bg-mha-pink text-white p-6 md:w-72 flex flex-col
        transform transition-transform duration-300 ease-in-out z-40
        ${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        {/* Logo */}
        <div className="mb-8 mt-12 md:mt-0 -ml-6">
          <MHALogo variant="pink" size="lg" />
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto">
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white hover:bg-mha-pink-dark"
          >
            <Home className="mr-3 h-5 w-5" />
            <span>Dashboard</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white hover:bg-mha-pink-dark"
          >
            <MessageSquare className="mr-3 h-5 w-5" />
            <span>Messages</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white hover:bg-mha-pink-dark"
          >
            <MapPin className="mr-3 h-5 w-5" />
            <span>Find Services</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white hover:bg-mha-pink-dark"
          >
            <Building2 className="mr-3 h-5 w-5" />
            <span>Care Homes</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white hover:bg-mha-pink-dark"
          >
            <Users className="mr-3 h-5 w-5" />
            <span>Community Support</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white hover:bg-mha-pink-dark"
          >
            <Heart className="mr-3 h-5 w-5" />
            <span>Wellbeing Services</span>
          </Button>
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
            <Calendar className="mr-3 h-5 w-5" />
            <span>Appointments</span>
          </Button>
        </nav>

        <div className="pt-4 mt-4 border-t border-[#a30068]">
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:text-white hover:bg-mha-pink-dark"
          >
            <Search className="mr-3 h-5 w-5" />
            <span>Search</span>
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
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
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
                        {message.type === "user" ? (
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        ) : (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <p className="message-markdown-paragraph">
                                    {children}
                                  </p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="message-markdown-list">
                                    {children}
                                  </ul>
                                ),
                                li: ({ children }) => (
                                  <li className="message-markdown-list-item">
                                    {children}
                                  </li>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="message-markdown-blockquote">
                                    {children}
                                  </blockquote>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </Card>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <Card className="max-w-[80%] p-3 bg-white">
                        <div className="flex items-center space-x-2">
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
                      </Card>
                    </div>
                  )}
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
                  onClick={handleSend}
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
              <h3 className="text-lg font-semibold text-mha-blue mb-4">
                Common Questions
              </h3>
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
            </Card>

            <Card className="p-4 bg-mha-blue-10 rounded-lg text-sm text-gray-600">
              <p className="leading-relaxed">
                This AI assistant is designed to provide general information and
                guidance. While we strive for accuracy, please verify critical
                information through official channels. For urgent matters,
                contact your supervisor or HR directly.
              </p>
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
              <h3 className="text-lg font-semibold text-mha-blue mb-4">
                Common Questions
              </h3>
              <div className="space-y-1 mb-4">
                {commonQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto normal-case font-normal hover:bg-mha-blue-10 text-gray-700 px-3 py-2"
                    onClick={() => {
                      setInput(question.text);
                      setHelpPanelOpen(false);
                    }}
                  >
                    {question.icon}
                    <span className="flex-1">{question.text}</span>
                  </Button>
                ))}
              </div>
              <div className="p-4 bg-mha-blue-10 rounded-lg text-sm text-gray-600">
                <p className="leading-relaxed">
                  This AI assistant is designed to provide general information
                  and guidance. While we strive for accuracy, please verify
                  critical information through official channels. For urgent
                  matters, contact your supervisor or HR directly.
                </p>
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
