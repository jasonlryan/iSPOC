# survey_upgrade.md

## Goal

Refactor the feedback survey so that:

- The frontend (not the AI) controls the question flow, numbering, and answer collection.
- Survey questions are stored in a config file for easy editing and reuse.
- The UI is cleanly separated from the main chat logic.
- The code is robust, accessible, and easy to maintain.

---

## Plan

### 1. **Create a Config File for Survey Questions**

- Add `src/feedback-questions.ts`:
  ```ts
  export interface FeedbackQuestion {
    id: string;
    text: string;
    // Optionally: type, options, branching, etc.
  }
  export const feedbackQuestions: FeedbackQuestion[] = [
    {
      id: "q1",
      text: "On a scale of 1-6, how helpful was the Digital Assistant?",
    },
    { id: "q2", text: "What did you like most?" },
    { id: "q3", text: "What frustrated you?" },
    { id: "q4", text: "One feature you'd love to see?" },
    {
      id: "q5",
      text: "Would you recommend this tool to a colleague (yes/no)?",
    },
    { id: "q6", text: "Do you have anything else to add?" },
  ];
  ```
- **Why:** Easy to update, localize, or add branching logic in the future.

### 2. **Type Safety for Answers**

- Use a TypeScript interface for answers:
  ```ts
  export interface FeedbackAnswers {
    q1: string;
    q2: string;
    q3: string;
    q4: string;
    q5: string;
    q6: string;
  }
  ```
- **Why:** Prevents off-by-one errors and makes logging/validation easier.

### 3. **Create a Dedicated FeedbackSurvey Component**

- Add `src/components/FeedbackSurvey.tsx`.
- This component:
  - Imports the questions from the config file.
  - Tracks the current question index and user answers in state.
  - Displays one question at a time, with an input for the answer.
  - On submit, advances to the next question.
  - On completion, shows a thank you message and calls a callback to log/send the feedback.
  - **Show progress:** e.g., "Question 2 of 6".
  - **Keyboard accessibility:** Ensure users can tab through and submit with Enter.
  - **ARIA labels:** Add ARIA labels to buttons and inputs for accessibility.
  - **Mobile responsive:** Use responsive design for all screen sizes.
  - **Cancel option:** Allow user to exit the survey at any time.

### 4. **Integrate with App.tsx**

- In `App.tsx`, render `<FeedbackSurvey />` when `mode === "feedback"`.
- Pass a callback to handle survey completion (e.g., to log feedback and switch back to chat mode).

### 5. **Logging & Analytics**

- Log survey completions and cancellations for analytics (not just feedback content).
- Add error handling for feedback submission (show user-friendly error and allow retry).
- Send feedback to your backend as soon as the survey is complete.

### 6. **UI/UX Improvements**

- Ensure the survey UI is visually distinct from the chat.
- Provide clear navigation (cancel, return to chat, etc.).
- Use your design system for all buttons, cards, etc.

### 7. **Extensibility**

- Structure questions as objects for future branching/logic (e.g., skip questions based on previous answers).

---

## Best Practices Summary Table

| Area              | Recommendation                         |
| ----------------- | -------------------------------------- |
| Question storage  | Use config file/array of objects       |
| Type safety       | Use interface for answers              |
| UX/progress       | Show progress, disable next if empty   |
| Logging           | Log completions/cancels, handle errors |
| Code organization | Keep survey in own component           |
| Accessibility     | Add ARIA, test keyboard nav            |
| Extensibility     | Use objects for questions              |
| Mobile/Responsive | Ensure survey works on all screens     |

---

**This plan will give you a robust, maintainable, and user-friendly feedback survey that is easy to update and extend.**
