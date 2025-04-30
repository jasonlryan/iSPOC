# Technical Implementation Plan: Migrating to Responses API

Below is a more detailed technical implementation plan for migrating from the OpenAI Assistant API to the Responses API. It adds specificity to each major step, including references to existing code files and patterns for retaining multi-turn conversation history.

## Overview

**Scope**: Replace all OpenAI Assistant API calls (threads, runs, messages) with new responses.create() calls.

**Goals**:

- Preserve multi-turn conversation flows.
- Maintain advanced capabilities, such as streaming partial responses.
- Continue usage of the same environment variables (or new ones) for authentication.
- Ensure that policy retrieval (e.g., file_search / vector_store calls) still functions in the new environment.

## Step-by-Step Migration

### 1. Inventory Existing Assistant API Usage

Search for references to the following old endpoints in the codebase:

- POST /v1/assistants.create
- POST /v1/threads.create
- POST /v1/threads/messages.create
- POST /v1/threads/runs.create

Likely location: `iSPOC/src/lib/api.ts` contains the function `sendMessage()` that uses these endpoints.

Identify all references to `sendMessage()` in the React components—most likely in `App.tsx`.

Relevant code file:

- `iSPOC/src/lib/api.ts` has the main usage of the Assistant API.
- `iSPOC/src/App.tsx` calls `sendMessage()` to handle user queries.

### 2. Update Environment / Auth

**Environment Variables**:

- Continue using `VITE_OPENAI_API_KEY` for auth, or rename to something like `VITE_OPENAI_RESPONSES_API_KEY` if you prefer clarity.
- Confirm you have read/write scope for "Beta: responses" or "Beta: tool usage" in your OpenAI account.

**Remove Assistant Key**:

- The old `ASST_API_KEY` might no longer be necessary, unless you still need it for a transitional period.
- Alternatively, you could keep it if your new code references a distinct key for the Responses Beta. In many cases, you only need your standard `OPENAI_API_KEY`.

### 3. Create a New responses.create() Flow

This step is the core of the migration: replacing threads and runs logic with direct calls to responses.create().

**Single endpoint**: Instead of calling threads → messages → runs, you simply call:

```typescript
const response = await openai.responses.create({
  model: "gpt-4o",
  instructions: "You are an MHA policy assistant...",
  input: userQuery,
  tools: [
    {
      type: "file_search",
      vector_store_ids: ["vs_abc123"],
    },
  ],
  store: true, // This ensures conversation context is stored
});
```

**Conversation continuity**:

- Use `previous_response_id: <some-id>` to chain messages.
- On the first message, there is no previous_response_id.
- On subsequent messages, pass in the ID from the last response.

```typescript
const nextResponse = await openai.responses.create({
  model: "gpt-4o",
  instructions: "You are an MHA policy assistant...",
  input: nextUserQuery,
  previous_response_id: response.id,
  store: true,
});
```

**Instructions**:

- The new `instructions` parameter effectively replaces the old "system prompt" or "assistant instructions" usage.
- Keep re-sending them if you want them pinned for every call.

**Streaming**:

If you want streaming, you can specify:

```typescript
const response = await openai.responses.create({
  // ...
  stream: true,
});
```

Then you handle the SSE (Server-Sent Events) stream or chunked response in your front-end.

**Implementation Detail**:

Within `iSPOC/src/lib/api.ts`, create a new function—for example, `createResponse()`—that uses the new endpoint. You might temporarily keep `sendMessage()` side-by-side with it, or you can replace `sendMessage()` entirely.

```typescript
export async function createResponse(
  userQuery: string,
  previousResponseId?: string,
  onChunk?: (textDelta: string) => void
): Promise<string> {
  // Make a POST request to openai.responses.create
  // See new logic below
}
```

If you want to preserve streaming behavior, adapt your SSE reading logic (in the portion reading from `reader.read()`) to the new SSE events from responses streaming. The logic is conceptually the same.

### 4. Modify App.tsx to Use responses.create()

Replace or rename `sendMessage()` calls with new function calls to the responses.create logic.

**Conversation state**: Instead of storing a `threadId`, you will store the last `response.id`. For instance, if your state used to have `currentThreadId`, it should become something like `lastResponseId`.

**Migration in detail**:

Before (simplified):

```typescript
// In sendMessage()
// 1. create thread if not exist
// 2. add user message
// 3. create run with assistant_id
// 4. poll or stream
```

After:

```typescript
// In createResponse()
const result = await openai.responses.create({
  model: "gpt-4o",
  instructions: SYSTEM_PROMPT,
  input: message,
  previous_response_id: lastResponseId, // If we have it
  tools: [
    {
      type: "file_search",
      vector_store_ids: ["vs_abc123"],
    },
  ],
  store: true,
  stream: !!onChunk,
});
// handle streaming or handle final JSON
// Return the text
```

Store the new `response.id` in your application state so that subsequent user messages reference that ID in `previous_response_id`.

### 5. Rebuild Tool Calls (File/Vector Search, etc.)

In the old system, you might have used:

```javascript
tools: [{ type: "retrieval" }];
```

or a custom approach.

In the new system, you can specify:

```javascript
tools: [
  {
    type: "file_search",
    vector_store_ids: ["vs_abc123"],
  },
  // Possibly web_search, other built-in tools, etc.
];
```

**Confirm your vector store usage remains valid**:

The code snippet in the migration plan for vector stores:

```javascript
// create vectorStore
const vectorStore = await openai.vectorStores.create({
  name: "MHA Policy Index",
  expires_after: null,
});

// upload file
// ...
```

Update references in your code that previously used any old tool types. Usually, you'll only need to replace `type: "retrieval"` with `type: "file_search"` (and define `vector_store_ids`).

### 6. Update Streaming Logic

If your project uses real-time chunk updates for partial answers:

**SSE Event Names**:

- The old SSE events for threads might differ from the new ones. The new responses.create streaming events generally come as "response.delta" or "response.completed."
- Adjust your code in `sendMessage()` or the new function `createResponse()` to parse the SSE data accordingly.

**onChunk callback**:

In `App.tsx` you have a chunk callback that updates your UI with partial text.

Ensure that it's triggered correctly by the new SSE events. The logic in your code that does something like:

```javascript
while (true) {
  const { done, value } = await reader.read();
  // ...
  // handle SSE lines
  if (event === "response.delta") {
    onChunk(parsedDelta);
  }
}
```

will need to reference the new event name / structure from the Responses API.

### 7. Conversation Persistence & State Management

- **store: true**: The new parameter ensures each call is "remembered" by the API. This means OpenAI persists the conversation context behind the scenes—no need to manually store `threadId`.
- **Local Redux or React state**: If you want to store transcripts locally for your own uses (like re-rendering the chat), you still keep them in your React state.
- **Truncation**: For extremely long conversations, you may eventually want to implement logic to avoid hitting token limits. The Responses API can handle some of this, but you might add your own logic to prune older messages from your UI or to start a new conversation.

### 8. Testing & Validation

**Unit tests**:

- Update or create new tests for your new `createResponse()` function. Mock the fetch call to the responses.create endpoint, verifying correct payload is sent.

**Integration tests**:

- Run your existing tests in `scripts/test_openai_connection.py` (you may rename or adapt it) to confirm the new API calls succeed.

**Performance / Load**:

- The plan states the new Responses API is faster. Confirm with a few load tests or a local performance test scenario.

### 9. Deprecate or Remove Old Code

Once everything is verified, remove:

- All references to the old Assistant Beta endpoints.
- The environment variable `ASST_API_KEY` unless still needed.
- Any leftover "thread" or "run" references in UI code.

### 10. Deployment & Rollback

**Deployment**:

- Deploy to staging or an environment where you can confirm that the new calls are functioning.

**Monitoring**:

- Watch logs for any 4xx or 5xx errors from responses.create.
- Test multi-turn flows with and without streaming.

**Rollback**:

- If something fails, revert to the old `sendMessage()` approach (keep a branch or git revert script handy).

## Example Snippet: New createResponse() in api.ts

Below is a simplified example of how your new function might look, based on your current streaming approach. Adjust event names as needed if the SSE event shapes differ from the old Assistant Beta.

```typescript
// iSPOC/src/lib/api.ts
export async function createResponse(
  userQuery: string,
  previousResponseId?: string,
  onChunk?: (contentItem: {
    type: "text";
    index: number;
    text: { value: string };
  }) => void
): Promise<string> {
  try {
    const requestBody = {
      model: "gpt-4o",
      instructions:
        "You are an MHA policy assistant. Only provide policy answers, etc...",
      input: userQuery,
      store: true,
      tools: [
        {
          type: "file_search",
          vector_store_ids: ["vs_abc123"],
        },
      ],
      stream: !!onChunk,
      ...(previousResponseId
        ? { previous_response_id: previousResponseId }
        : {}),
    };

    // Fetch call to the new endpoint
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Responses API error:", errorData);
      throw new Error(
        `Failed to create response: ${response.status} ${response.statusText}`
      );
    }

    // If streaming:
    if (onChunk && response.body) {
      let fullText = "";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by "\n\n"
        let eolIndex;
        while ((eolIndex = buffer.indexOf("\n\n")) >= 0) {
          const rawMessage = buffer.substring(0, eolIndex).trim();
          buffer = buffer.substring(eolIndex + 2);

          if (!rawMessage) continue;

          // Parse SSE lines
          let event = "";
          let data = "";
          for (const line of rawMessage.split("\n")) {
            if (line.startsWith("event:")) {
              event = line.substring(6).trim();
            } else if (line.startsWith("data:")) {
              data = line.substring(5).trim();
            }
          }

          // Check for [DONE] or end
          if (data === "[DONE]") continue;

          if (event === "response.delta") {
            try {
              const parsed = JSON.parse(data);
              // The new shape might be different. Suppose the chunk is in: parsed.delta.content
              if (parsed.delta?.content) {
                parsed.delta.content.forEach((contentItem: any) => {
                  if (onChunk) onChunk(contentItem);
                  // Optionally build up full text if you want final return
                  if (contentItem.type === "text") {
                    fullText += contentItem.text.value;
                  }
                });
              }
            } catch (err) {
              console.error("Error parsing SSE chunk:", err, data);
            }
          } else if (event === "response.completed") {
            // End of SSE
            break;
          }
        }
      }
      return fullText;
    } else {
      // Non-stream scenario
      const jsonData = await response.json();
      // The final text is likely in jsonData.content
      // or jsonData might be shaped as { content: [ { type: 'text', text: { value: '...' } } ] }
      const contentArr = jsonData.content || [];
      return contentArr
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text.value)
        .join("\n");
    }
  } catch (err) {
    console.error("createResponse error:", err);
    throw err;
  }
}
```

## Summary of Important Points

- **No more threads or runs**: Everything is consolidated into the responses.create() endpoint.
- **Use previous_response_id for multi-turn**: This replaces the "thread ID" concept.
- **instructions param**: Replaces the old "assistant instructions" or system prompt usage.
- **tools must be declared up-front** in each call if you want to enable file search, etc.
- **Streaming works similarly** but with new SSE event labels (response.delta, response.completed).
- Keep your UI logic mostly the same, except references to "thread/runs" become references to "response IDs."

With these changes, you should have a fully functioning Responses API integration, preserving your chat-based flow, continuing to access vector stores (file search), and supporting streaming partial responses.

## Final Check

- [ ] Confirm environment keys are updated or that your existing OPENAI_API_KEY is valid for the new API.
- [ ] Replace sendMessage() references in App.tsx with the new function (e.g., createResponse()).
- [ ] Keep or remove ASST_API_KEY if no longer needed.
- [ ] Test single-turn and multi-turn chats, including streaming partial responses.
- [ ] Remove leftover "thread" or "run" code.

Once all steps pass in your local environment and tests, deploy to your chosen environment. Your MHA policy assistant will now be driven by OpenAI's faster Responses API and remain aligned with future API changes.
