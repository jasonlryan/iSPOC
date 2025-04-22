# MHA Assistant: Migration Plan from Assistant API to Responses API

## Overview

This document outlines the migration strategy for transitioning the MHA Digital Assistant from OpenAI's Assistant API to the new Responses API. The migration is prompted by OpenAI's announcement to deprecate the Assistant API in favor of the faster and more flexible Responses API.

## Context

- **Current Status**: MHA Assistant uses OpenAI's Assistant API
- **OpenAI Timeline**: OpenAI will deprecate Assistant API in the first half of 2026, with 12 months support after deprecation date

## Benefits of Migration

1. **Improved Performance**: Responses API is reported to be faster than Assistants API
2. **Simplified Architecture**: Combines Chat Completions' simplicity with Assistants' tool capabilities
3. **Enhanced Tools**: Access to built-in tools like web search and file search
4. **Future Compatibility**: Aligns with OpenAI's strategic direction
5. **Architectural Improvements**: Opportunity to refactor and optimize our implementation

## Migration Checklist

### Phase 1: Discovery and Planning

- [ ] **Audit Current Implementation**

  - [ ] Map existing Assistant API usage in codebase
  - [ ] Document current conversation flow patterns
  - [ ] Inventory all custom functions and tool use
  - [ ] Identify index usage patterns

- [ ] **Define Technical Requirements**

  - [ ] Select appropriate models (gpt-4o, gpt-4o-mini)
  - [ ] Determine tool usage requirements
  - [ ] Decide on context management approach
  - [ ] Establish persistence requirements

- [ ] **Create Test Cases**
  - [ ] Define test scenarios to validate equivalent functionality
  - [ ] Establish performance benchmarks

### Phase 2: Core Implementation

- [ ] **Setup Responses API Integration**

  - [ ] Update OpenAI SDK dependencies
  - [ ] Configure environment variables
  - [ ] Implement authentication

- [ ] **Implement Basic Chat Functionality**

  - [ ] Convert Assistant/Thread model to Responses model
  - [ ] Implement conversation history with `previous_response_id`
  - [ ] Handle API response format differences

- [ ] **Port Policy Index Integration**

  - [ ] Implement file search tool
  - [ ] Configure vector store IDs
  - [ ] Update policy document handling

- [ ] **Rebuild Instructions Handling**
  - [ ] Update system prompt delivery
  - [ ] Ensure consistent user context management

### Phase 3: Advanced Features and Testing

- [ ] **Implement Tool Integration**

  - [ ] Port custom functions as needed
  - [ ] Implement new built-in tools (web search, etc.) if beneficial
  - [ ] Update tool call handling

- [ ] **Build Conversation Management**

  - [ ] Handle conversation persistence
  - [ ] Implement history truncation when needed
  - [ ] Optimize token usage

- [ ] **Comprehensive Testing**
  - [ ] Execute test cases defined in Phase 1
  - [ ] Validate functionality across key policy areas
  - [ ] Benchmark performance metrics
  - [ ] Fix identified issues

### Phase 4: Optimization and Rollout

- [ ] **Performance Optimization**

  - [ ] Tune for response time
  - [ ] Optimize token usage
  - [ ] Implement caching if beneficial

- [ ] **Documentation**

  - [ ] Update technical documentation
  - [ ] Document architectural changes
  - [ ] Create troubleshooting guide

- [ ] **Deployment Planning**
  - [ ] Define rollout strategy
  - [ ] Plan for monitoring and rollback if needed
  - [ ] Prepare user communications

## Technical Implementation Details

### Core API Changes

#### From Assistant API to Responses API:

```javascript
// BEFORE - Assistant API
const assistant = await openai.beta.assistants.create({
  model: "gpt-4o",
  instructions: "You are an MHA policy assistant...",
  tools: [{ type: "retrieval" }],
});

const thread = await openai.beta.threads.create();

await openai.beta.threads.messages.create(thread.id, {
  role: "user",
  content: userQuery,
});

const run = await openai.beta.threads.runs.create(thread.id, {
  assistant_id: assistant.id,
});

// Poll for response
// ...

// AFTER - Responses API
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
  store: true, // Enable conversation history management
});

// For subsequent messages
const nextResponse = await openai.responses.create({
  model: "gpt-4o",
  input: nextUserQuery,
  previous_response_id: response.id,
  tools: [
    {
      type: "file_search",
      vector_store_ids: ["vs_abc123"],
    },
  ],
  store: true,
});
```

### Vector Store Changes

File handling will need to be updated to ensure the vector stores are properly configured:

```javascript
// Creating vector stores for policies
const vectorStore = await openai.vectorStores.create({
  name: "MHA Policy Index",
  expires_after: null, // Permanent storage
});

// Uploading files
const file = await openai.files.create({
  file: fs.createReadStream("Policy_Documents_Metadata_Index.json"),
  purpose: "vector_store_file",
});

await openai.vectorStores.files.create(vectorStore.id, {
  file_id: file.id,
});
```

### System Prompt Handling

Instructions management differs between APIs:

```javascript
// Initial conversation with instructions
const initialResponse = await openai.responses.create({
  model: "gpt-4o",
  instructions: mhaSystemPrompt, // First message uses instructions parameter
  input: userQuery,
  tools: [
    /* ... */
  ],
  store: true,
});

// Follow-up messages - instructions must be included each time
const followUpResponse = await openai.responses.create({
  model: "gpt-4o",
  instructions: mhaSystemPrompt, // Re-include instructions
  input: nextUserQuery,
  previous_response_id: initialResponse.id,
  tools: [
    /* ... */
  ],
  store: true,
});
```

## Migration Risks and Mitigations

| Risk                                        | Mitigation                                                       |
| ------------------------------------------- | ---------------------------------------------------------------- |
| Conversation context management differences | Build extensive tests for conversation flow; implement fallbacks |
| Tool usage cost increases                   | Monitor usage metrics; optimize tool calls; set budgets          |
| Response format differences                 | Create adapters to normalize responses across API versions       |
| Performance variations                      | Benchmark and optimize; use caching where appropriate            |
| API reliability                             | Implement robust error handling and retry logic                  |

## Success Criteria

1. **Functional Parity**: All current use cases work correctly
2. **Performance**: Response times are equal or better than current implementation
3. **Reliability**: Error rates remain below 0.1%
4. **Cost Efficiency**: Token usage comparable to current implementation
5. **Maintainability**: Code is well-documented and follows best practices

## Future Enhancements

Once migration is complete, the Responses API enables new capabilities:

1. **Web Search Integration**: Enhance responses with up-to-date information
2. **Multi-turn Tool Usage**: Improve complex query handling
3. **Advanced Context Management**: Better handling of long conversations
4. **Response Streaming**: Improve user experience with partial responses

## Conclusion

Migrating to the Responses API represents a strategic investment in the MHA Digital Assistant's future. By completing this migration ahead of OpenAI's deprecation timeline, we position ourselves to leverage the latest capabilities while ensuring continuous service for users.
