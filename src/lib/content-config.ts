// Configuration for all content panels in the application
// This centralizes all the content to make it easier to update

// Define types for the content panels
interface ContentPanel {
  id: string;
  title: string;
  content: string[];
  variant?: 'default' | 'highlight'; // For styling variations
}

// Interface for starter questions
interface StarterQuestion {
  title: string;
  question: string;
}

// Hardcoded content to ensure all panels are available
export const contentPanels: Record<string, ContentPanel> = {
  about: {
    id: 'about',
    title: 'About iSPoC',
    content: [
      'The iSPoC Digital Assistant is a pilot program designed to test the efficiency of information retrieval from non-clinical policies. This is an AI-powered chatbot helps staff quickly access and understand MHA\'s policy information without having to search through multiple documents.',
      'As part of our digital transformation initiative, this tool aims to streamline administrative processes and improve staff access to important policy guidelines.',
      'Your feedback during this pilot phase will help us enhance the system and expand its capabilities.'
    ]
  },
  feedback: {
    id: 'feedback',
    title: 'Give Feedback',
    content: [
      'Your feedback is essential to improving this Digital Assistant.',
      'We want to hear about your experience - what works well, what could be improved, and any suggestions you have for making this tool more useful in your daily work.'
    ]
  },
  disclaimer: {
    id: 'disclaimer',
    title: 'Disclaimer',
    content: [
      'This AI assistant is designed to provide general information and guidance. While we strive for accuracy, please verify critical information through official channels.',
      'Policies and associated documents will not be updated for the pilot, please continue to refer to policy updates on MHA Connect.'
    ],
    variant: 'highlight'
  }
};

// Starter Questions panel
export const starterQuestionsPanel: ContentPanel = {
  id: 'starterQuestions',
  title: 'Starter Questions',
  content: [
    'Try asking the chatbot these questions to evaluate its performance:'
  ]
};

// Starter Questions
export const starterQuestions: StarterQuestion[] = [
  {
    title: '1. Recruitment Process Question',
    question: 'What are the key stages in MHA\'s recruitment process, and how does the organisation ensure equality and diversity during hiring?'
  },
  {
    title: '2. Leave Policy Question',
    question: 'How do the Family Leave and Sickness Absence policies interact when an employee needs to care for a sick family member while also being unwell themselves?'
  },
  {
    title: '3. Complaints Handling Question',
    question: 'What is the timeframe for responding to formal complaints from residents, and what are the different stages of the complaints process?'
  },
  {
    title: '4. Onboarding a New Staff Member',
    question: 'What are the steps required to fully onboard a new staff member at MHA, including adding them to the system, verifying their right to work, setting up their IT accounts, and ensuring they complete all required training and policy acknowledgements?'
  },
  {
    title: '5. Business Expenses Question',
    question: 'What expenses can staff claim for when traveling between MHA locations, and what documentation is required for reimbursement?'
  },
  {
    title: '6. Resident Valuables Question',
    question: 'What procedures should staff follow when handling residents\' money and valuables, and what are the record-keeping requirements?'
  }
];

// Common questions (currently commented out in the UI)
export interface CommonQuestion {
  icon: string; // We'll use string identifiers for icons
  text: string;
}

export const commonQuestions: CommonQuestion[] = [
  {
    icon: 'KeyRound',
    text: 'How do I reset my password?'
  },
  {
    icon: 'Train',
    text: 'What is the travel expenses policy?'
  },
  {
    icon: 'FileQuestion',
    text: 'How do I submit a support ticket?'
  },
  {
    icon: 'ClipboardList',
    text: 'Where can I find the latest HR policies?'
  }
];

// Ensure all panels are included in the order
export const panelOrder = ['about', 'feedback', 'starterQuestions', 'disclaimer']; 