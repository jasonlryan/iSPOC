import React from "react";
import { Button } from "./ui/button";
import { MHALogo } from "./MHALogo";
import {
  Phone,
  HelpCircle,
  Settings,
  Menu,
  X,
  ChevronUp,
  MessageSquarePlus,
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  helpPanelOpen: boolean;
  setHelpPanelOpen: (open: boolean) => void;
  // Add other props that might be needed by drawer/sidebar from App.tsx if any
  // For now, keeping it minimal
  starterQuestionsPanel: { title: string; content: string[] }; // From App.tsx
  panelOrder: string[]; // From App.tsx
  contentPanels: Record<
    string,
    { id: string; title: string; content: string[]; variant?: string }
  >; // From App.tsx
  starterQuestions: Array<{ title: string; question: string }>; // From App.tsx
  handleSend: (question: string) => void; // From App.tsx
  startFeedback: () => void; // From App.tsx

  // States for mobile panel expand/collapse
  mobileAboutExpanded: boolean;
  setMobileAboutExpanded: (expanded: boolean) => void;
  mobileEvaluationExpanded: boolean;
  setMobileEvaluationExpanded: (expanded: boolean) => void;
  mobileFeedbackExpanded: boolean;
  setMobileFeedbackExpanded: (expanded: boolean) => void;
  mobileDisclaimerExpanded: boolean;
  setMobileDisclaimerExpanded: (expanded: boolean) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  menuOpen,
  setMenuOpen,
  helpPanelOpen,
  setHelpPanelOpen,
  starterQuestionsPanel,
  panelOrder,
  contentPanels,
  starterQuestions,
  handleSend,
  startFeedback,
  mobileAboutExpanded,
  setMobileAboutExpanded,
  mobileEvaluationExpanded,
  setMobileEvaluationExpanded,
  mobileFeedbackExpanded,
  setMobileFeedbackExpanded,
  mobileDisclaimerExpanded,
  setMobileDisclaimerExpanded,
}) => {
  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-gray-200">
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

      {/* Main Content passed as children */}
      {children}

      {/* Mobile Help Panel (StarterDrawer) */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 bg-white border-t border-mha-pink
          transform transition-transform duration-300 ease-in-out
          lg:hidden z-40
          ${helpPanelOpen ? "translate-y-0" : "translate-y-[calc(100%-28px)]"}
        `}
      >
        <Button
          variant="ghost"
          className="w-full h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-t-sm"
          onClick={() => setHelpPanelOpen(!helpPanelOpen)}
        >
          <ChevronUp
            className={`h-4 w-4 transform transition-transform ${
              helpPanelOpen ? "rotate-180" : ""
            }`}
          />
          <span className="ml-1 text-sm font-semibold text-mha-pink">
            Starter questions
          </span>
        </Button>
        <div className="p-4 max-h-[30vh] overflow-y-auto custom-scrollbar">
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
                        <ChevronUp className="h-5 w-5 text-mha-blue rotate-180" /> // ChevronDown equivalent
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
                            className="p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              handleSend(question.question);
                              setHelpPanelOpen(false);
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
                </div>
              );
            } else {
              // Standard panels
              const panel = contentPanels[panelId];
              if (!panel) return null; // Ensure panel exists
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

              const isLastPanel = panelId === panelOrder[panelOrder.length - 1];

              return (
                <div
                  key={panelId}
                  className={`p-4 rounded-lg text-sm text-gray-600 ${
                    !isLastPanel ? "mb-4" : ""
                  } ${
                    panel.variant === "highlight"
                      ? "bg-mha-blue-10" // Ensure this class exists in your Tailwind config or global CSS
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
                        <ChevronUp className="h-5 w-5 text-mha-blue rotate-180" /> // ChevronDown equivalent
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
                            onClick={() => startFeedback()}
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
  );
};
