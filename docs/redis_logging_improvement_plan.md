# Redis Logging and Retrieval Improvement Plan

This document outlines a plan to enhance the Redis logging and data retrieval mechanisms for the iSPOC application, focusing on standard queries and survey feedback.

## Phase 1: Critical Bug Fixes (Data Integrity)

- **1.1. Fix Redis Array Handling for CSV Rows:**
  - **Task:** Modify `api/handlers.js` for both `handleQueryLog` and `handleFeedback`.
    - When retrieving `existingRows` for `query_log_csv_rows` and `feedback_csv_rows`:
      - Current: `(await redis.get("..._csv_rows")) || []`
      - **New:** `JSON.parse(await redis.get("..._csv_rows") || "[]")`
    - When setting `..._csv_rows`:
      - Current: `await redis.set("..._csv_rows", existingRows)`
      - **New:** `await redis.set("..._csv_rows", JSON.stringify(existingRows))_`
  - **Reasoning:** Ensures that arrays of CSV strings are correctly stored and retrieved as JSON arrays in Redis, preventing data corruption or errors when appending new rows.
  - **Verification:** After implementing, submit new queries and feedback. Check server logs for any errors during `redis.set` or `redis.get`. Check Redis directly (if possible) to see if `query_log_csv_rows` and `feedback_csv_rows` contain valid JSON array strings.
  - **STATUS: PARTIALLY ADDRESSED/SUPERSEDED for query logs.** Query logs now use `redis.lpush` with JSON strings into the `query_logs` list, which handles the array nature. `query_log_csv_rows` is no longer used for query logs. Feedback logs (`feedback_csv_rows_list`) still store individual CSV strings in a list, which is inherently an array-like structure in Redis.

## Phase 2: Enhancing Query/Response Logging & Retrieval

- **2.1. Review and Adjust `sanitizeForCSV` for Query/Response:**

  - **Task:** In `api/handlers.js` (`handleQueryLog`), critically evaluate the welcome message removal regex:
    `/^(Hello|Hi|Welcome|Thank you for|I'm your|I am your).*?(How can I help you today\?|How can I assist you\?|How may I assist you\?|What can I help you with\?).*/i`
  - Add temporary server-side logging _before_ and _after_ sanitization to see its effect:
    ```javascript
    // Inside handleQueryLog, before sanitizeForCSV is used for response
    console.log(
      "Original Response (for CSV):",
      logEntry.response?.substring(0, 200)
    );
    const sanitizedResponseForCSV = sanitizeForCSV(
      logEntry.response ? logEntry.response.substring(0, 500) : ""
    );
    console.log(
      "Sanitized Response (for CSV):",
      sanitizedResponseForCSV?.substring(0, 200)
    );
    // ... then use sanitizedResponseForCSV in csvRow
    ```
  - **Reasoning:** To ensure that actual content isn't being accidentally stripped, leading to empty "Response" fields in the CSV data.
  - **Verification:** Send various queries, including ones that might get short answers or answers similar to welcome messages. Check server logs to see the original vs. sanitized output. Adjust regex if needed.
  - **STATUS: OBSOLETE for query logs.** Query logs are now stored as full JSON, not CSV, so this specific sanitization for CSV is no longer performed by `handleQueryLog`.

- **2.2. Ensure Full Query/Response in JSON Logs:**

  - **Task:** Confirm in `api/handlers.js` (`handleQueryLog`) that `JSON.stringify(logEntry)` (for `redis.lpush("query_logs", ...)` ) uses the _original, unsanitized, and untruncated_ `query` and `response` values within the `logEntry` object.
  - **Reasoning:** The `"query_logs"` list should be the source of truth for complete, raw interaction data.
  - **Verification:** After submitting queries, inspect the content of the `"query_logs"` list in Redis (if possible) or temporarily log `JSON.stringify(logEntry)` on the server before `lpush` to confirm its structure.
  - **STATUS: DONE.** `handleQueryLog` now exclusively stores full, unsanitized `logEntry` objects as JSON strings in the `query_logs` list.

- **2.3. (Optional but Recommended) Enhance Admin Panel for Query Logs:**
  - **Task:** Modify `AdminPage.tsx` and `api/handlers.js` (`handleAdminLogs`) to retrieve and display data from the `"query_logs"` JSON list instead of, or in addition to, `"query_log_csv_rows"`.
  - This would involve:
    - `handleAdminLogs`: Fetching all JSON strings from the `"query_logs"` list (e.g., using `redis.lrange("query_logs", 0, -1)`), then `JSON.parse()` each string.
    - `AdminPage.tsx`: Adapting the UI to render this array of log objects, allowing display of full `query` and `response` fields. Consider adding a toggle or separate view for "Raw JSON Logs" vs. "CSV Export Preview".
  - **Reasoning:** Provides admins access to the complete, unaltered query and response data, which is crucial for detailed analysis and debugging, while the CSV view remains useful for quick exports.
  - **Verification:** Admin panel should show a new/updated view with full query and response text.
  - **STATUS: DONE.** `handleAdminLogs` fetches from `query_logs` and handles potential pre-parsed objects or strings. `AdminPage.tsx` displays these JSON objects and allows for client-side CSV generation.

## Phase 3: Enhancing Survey Feedback Logging & Retrieval

- **3.1. (Optional but Recommended) Enhance Admin Panel for Feedback Data:**
  - **Task:** Similar to 2.3, modify `AdminPage.tsx` and `api/handlers.js` (`handleAdminFeedback`) to retrieve and display data from the `"feedbacks"` JSON list.
  - `handleAdminFeedback`: Fetch from `redis.lrange("feedbacks", 0, -1)` and parse.
  - `AdminPage.tsx`: Display this richer JSON data.
  - **Reasoning:** Allows admins to see the full feedback objects, not just the CSV-formatted version.
  - **Verification:** Admin panel's feedback section should display more detailed survey data.
  - **STATUS: NOT ADDRESSED.** Focus has been on query logs.

## Phase 4: Frontend & Server-Side Logging Review

- **4.1. Consistent Frontend Logging for API Calls:**

  - **Task:** Ensure both `sendFeedbackToServerless` and `logQueryResponse` in `src/lib/feedback-logger.ts` have clear, distinct console logs indicating:
    - Which API endpoint is being called (`/api/feedback` or `/api/log`).
    - A preview of the data being sent.
    - The response status from the server.
    - Any errors encountered during the fetch or response parsing.
  - **Reasoning:** Helps quickly identify if the frontend is targeting the correct endpoint and sending the expected payload.
  - **Verification:** Browser console should clearly show the lifecycle of each logging attempt.
  - **STATUS: NOT ADDRESSED.**

- **4.2. Consistent and Detailed Server-Side Logging for API Handlers:**
  - **Task:** Ensure `server.js` and `api/handlers.js` have clear logs for:
    - Request received at each API endpoint (e.g., `[timestamp] METHOD /api/path`).
    - Key parts of the incoming `req.body`.
    - Which handler function is being invoked.
    - Steps within the handler (e.g., "Attempting to store in Redis", "Data retrieved from Redis").
    - Confirmation of successful Redis operations (e.g., "Successfully wrote to key X").
    - Any errors from Redis or other operations, along with relevant data.
  - **Reasoning:** Provides a clear trace on the server of what's happening with each request and Redis interaction.
  - **Verification:** Server terminal output should provide a comprehensive log of API activity and Redis operations.
  - **STATUS: PARTIALLY ADDRESSED.** `handleQueryLog` has confirmation. `handleAdminLogs` has improved diagnostic logging for data retrieval and parsing. General API endpoint logging in `server.js` or `local-server.cjs` not explicitly enhanced.

## Phase 5: Testing and Verification

- **5.1. End-to-End Testing for Query Logging:**

  - Submit several unique chat queries.
    - **STATUS: DONE.**
  - Check browser console logs.
    - **STATUS: NOT SPECIFICALLY VERIFIED RECENTLY.**
  - Check server terminal logs for calls to `/api/log` and Redis write confirmations.
    - **STATUS: DONE.** (Confirmed `handleQueryLog` writes valid JSON strings).
  - Check Admin Panel:
    - Verify timestamps, UserID, SessionID.
      - **STATUS: DONE.**
    - Verify Query and Response (considering sanitization/truncation if viewing CSV data, or full data if JSON view is implemented).
      - **STATUS: DONE.** (Full JSON data is displayed).
  - (If possible) Check Redis directly for `"query_logs"` and `"query_log_csv_rows"`.
    - **STATUS: DONE.** (`query_logs` contains valid JSON strings. `query_log_csv_rows` is no longer used for query logs).

- **5.2. End-to-End Testing for Survey Feedback:**

  - Complete and submit the feedback survey.
  - Check browser console logs.
  - Check server terminal logs for calls to `/api/feedback` and Redis write confirmations.
  - Check Admin Panel:
    - Verify feedback data is present and accurate in the feedback section.
  - (If possible) Check Redis directly for `"feedbacks"` and `"feedback_csv_rows"`.
  - **STATUS: NOT ADDRESSED RECENTLY.**

- **5.3. Test Admin Panel CSV Downloads:**
  - Download CSV for query logs.
    - **STATUS: DONE.** (Client-side generation from fetched JSON works).
  - Download CSV for feedback.
    - **STATUS: NOT ADDRESSED RECENTLY.**
