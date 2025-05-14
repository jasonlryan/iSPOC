# current_survey_implementation.md

## Overview

The feedback survey in your iSPOC app is currently managed by the main `App.tsx` component, with UI layout handled by `AppLayout.tsx`. The survey is initiated and controlled via a `mode` state variable (`"policy"` or `"feedback"`), and the flow is driven by an LLM (AI) using a markdown prompt.

---

## Flow: Switching to Survey UI and Back

### 1. **Triggering the Survey**

- The feedback survey is started when the user clicks a "Give Feedback" button.
- This button is rendered in the sidebar (desktop) or mobile drawer, and calls the `startFeedback` function from `App.tsx`.

### 2. **startFeedback Function**

- Sets `mode` to `"feedback"`.
- Resets input, error, and previous response state.
- Sets the initial message to:  
  `"Thank you for taking this survey. Click the button below to begin."`
- The UI header and color scheme switch to "Feedback Survey" mode.

### 3. **Survey Flow**

- The user clicks a button to start the survey, which sends a `"start"` message to the AI.
- The AI, using the `feedbackPrompt`, is expected to:
  - Ask one question at a time.
  - Wait for the user's answer before proceeding.
  - Number questions correctly.
- The frontend simply displays whatever the AI sends, with no logic to enforce question order or numbering.

### 4. **Collecting Answers**

- The AI is expected to collect all six answers and, at the end, return a JSON object with the responses.
- The frontend detects this JSON, displays a thank you message, and logs the feedback.

### 5. **Exiting the Survey**

- The user can cancel the survey at any time by clicking "Cancel Survey" (which calls `handleNewChat`).
- After submitting feedback, a "Return to Digital Assistant" button is shown, which also calls `handleNewChat`.

### 6. **Switching Back**

- `handleNewChat` resets the mode to `"policy"`, clears feedback state, and restores the default chat welcome message and UI.

---

## Key Points

- **All survey flow and question logic is handled by the AI, not the frontend.**
- **The frontend only switches UI modes and displays messages.**
- **There is no code-side tracking of which question is being asked or answered.**
- **Survey questions are not stored in a config file; they are only present in the AI prompt.**
