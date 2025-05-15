// API service for OpenAI integration

import rawUnifiedSystemPrompt from "../prompts/unified_system_prompt.md?raw";
import { debug } from "./debug";

// Access environment variables
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const VECTOR_STORE_ID = import.meta.env.VITE_OPENAI_VECTOR_STORE_ID;

// Check if API key is available
if (!OPENAI_API_KEY) {
  debug.warn('api', 'OpenAI API key is not set. Please check your .env file.');
}

// Check if vector store ID is available
if (!VECTOR_STORE_ID) {
  debug.warn('api', 'Vector Store ID is not set. Please check your .env file.');
}

// Add this to help debug by seeing console logs
debug.log('api', `API module initialized with Vector Store ID: ${VECTOR_STORE_ID ? "✅ Set" : "❌ Missing"}`);
debug.log('api', `API Key: ${OPENAI_API_KEY ? "✅ Present (hidden)" : "❌ Missing"}`);

// Define response type for createResponse
export interface ResponseResult {
  text: string;
  id?: string;
}

// Add this helper function at the top of the file
/**
 * Helper to ensure consistent format when calling onChunk
 */
function callChunkCallback(
  onChunk: (contentItem: { type: "text"; index: number; text: { value: string } }) => void,
  textValue: string,
  index: number = 0
) {
  try {
    // Skip empty chunks
    if (!textValue || textValue.length === 0) {
      debug.warn('api', `Skipping empty chunk at index ${index}`);
      return;
    }
    
    // Create a properly formatted content item
    const contentItem = {
      type: "text" as const,
      index,
      text: { value: textValue }
    };
    
    // Log what we're sending with extra visibility
    const preview = textValue.substring(0, Math.min(30, textValue.length));
    console.warn(`🔴 CHUNK TO UI [index=${index}]: "${preview}${textValue.length > 30 ? '...' : ''}" (${textValue.length} chars)`);
    
    // Call the chunk handler
    onChunk(contentItem);
    
    // Confirm the callback was called
    debug.log('api', `Chunk callback called successfully for index ${index}`);
  } catch (err) {
    console.error("❌ ERROR IN CHUNK CALLBACK:", err);
    debug.error('api', "Error in chunk callback", err);
  }
}

/**
 * Helper to verify document search functionality
 */
async function verifyDocumentIndex() {
  try {
    // Try to fetch a sample of the MHA_Documents_Metadata_Index
    // We're checking if the index is accessible and contains both guides and policies
    
    console.warn("🔎 VERIFYING DOCUMENT INDEX");
    
    const response = await fetch("https://api.openai.com/v1/vector_stores", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    });
    
    if (!response.ok) {
      console.error("❌ Failed to verify vector stores:", response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    console.warn("🔎 Vector stores found:", data.data?.length || 0);
    
    // Check if our store exists
    const ourStore = data.data?.find((store: any) => store.id === VECTOR_STORE_ID);
    if (!ourStore) {
      console.error(`❌ Vector store with ID ${VECTOR_STORE_ID} not found!`);
      return;
    }
    
    console.warn(`✅ Vector store "${ourStore.name}" (${VECTOR_STORE_ID}) found`);
    
    // Now try to get sample document counts if possible
    try {
      const fileResponse = await fetch(`https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json", 
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      });
      
      if (!fileResponse.ok) {
        console.error("❌ Failed to check files in vector store");
        return;
      }
      
      const fileData = await fileResponse.json();
      console.warn(`✅ Vector store contains ${fileData.data?.length || 0} files`);
      
      // Look at some of the files to see if we can spot guides vs policies
      if (fileData.data?.length > 0) {
        const fileNames = fileData.data.map((file: any) => file.filename).slice(0, 10);
        console.warn("📄 Sample files:", fileNames);
      }
    } catch (err) {
      console.error("❌ Error checking files in vector store:", err);
    }
  } catch (err) {
    console.error("❌ Failed to verify document index:", err);
  }
}

// Export unifiedSystemPrompt
export const unifiedSystemPrompt = rawUnifiedSystemPrompt;

/**
 * Send a message using the OpenAI Responses API
 * @param userQuery The user's message
 * @param previousResponseId The previous response ID for conversation continuity
 * @param onChunk Optional callback for streaming partial responses
 * @param instructions Optional system instructions/prompt (defaults to unified assistant)
 * @param signal Optional abort signal
 * @returns The AI response text and response ID for continuity
 */
export async function createResponse(
  userQuery: string,
  previousResponseId?: string,
  onChunk?: (contentItem: { type: "text"; index: number; text: { value: string } }) => void,
  instructions: string = rawUnifiedSystemPrompt,
  signal?: AbortSignal
): Promise<ResponseResult> {
  debug.group('api', 'Creating new response');
  debug.log('api', `Query: "${userQuery}"`);
  debug.log('api', `Previous Response ID: ${previousResponseId || "None (new conversation)"}`);
  debug.log('api', `Streaming mode: ${onChunk ? "✅ Enabled" : "❌ Disabled"}`);
  debug.log('api', `Using custom instructions: ${instructions !== rawUnifiedSystemPrompt ? "✅ Yes" : "❌ No (default)"}`);
  debug.log('api', `Abort signal provided: ${signal ? "✅ Yes" : "❌ No"}`);
  
  // Add debug log to verify the prompt is seeking both guides and policies
  debug.log('api', 'IMPORTANT: Verifying system prompt contains correct combined index reference');
  if (instructions.includes('MHA_Documents_Metadata_Index.json')) {
    debug.log('api', '✅ System prompt references the combined index correctly');
    console.warn('✅ System prompt references the combined index correctly');
  } else {
    debug.error('api', '❌ ERROR: System prompt does not reference combined index!');
    console.error('❌ ERROR: System prompt does not reference combined index!');
  }
  
  // Add debug log to check for guide and policy citation formats
  if (instructions.includes('【n:Name:Type】')) {
    debug.log('api', '✅ System prompt uses correct citation format 【n:Name:Type】');
    console.warn('✅ System prompt uses correct citation format 【n:Name:Type】');
  } else {
    debug.error('api', '❌ ERROR: System prompt does not use correct citation format!');
    console.error('❌ ERROR: System prompt does not use correct citation format!');
  }
  
  // Log instructions verification
  console.warn('📝 PROMPT LENGTH:', instructions.length);
  console.warn('📝 FIRST 100 CHARS:', instructions.substring(0, 100));
  console.warn('📝 LAST 100 CHARS:', instructions.substring(instructions.length - 100));

  // Verify document index on first query
  if (!previousResponseId && userQuery.toLowerCase().includes('password')) {
    // Only run this for new conversations with certain queries
    verifyDocumentIndex();
  }

  // Cap query length to 2000 chars to prevent potential context length issues
  const cappedQuery = userQuery.length > 2000 
    ? userQuery.substring(0, 2000) + "..." 
    : userQuery;
  
  if (userQuery.length > 2000) {
    debug.warn('api', `Query truncated from ${userQuery.length} to 2000 chars`);
  }

  try {
    // Verify vector store ID is available
    if (!VECTOR_STORE_ID) {
      throw new Error("Vector Store ID is not configured. Please check your environment variables.");
    }

    const requestBody: any = {
      model: "gpt-4.1-mini",
      instructions,
      input: cappedQuery,
      store: true
    };

    // Add tools with the vector store ID
    requestBody.tools = [
      {
        type: "file_search",
        vector_store_ids: [VECTOR_STORE_ID]
      }
    ];

    if (previousResponseId) {
      requestBody.previous_response_id = previousResponseId;
    }

    // Enable streaming if we have a chunk handler
    if (onChunk) {
      requestBody.stream = true;
    }

    // Debug: Log the full request body
    debug.log('api', "Request body prepared", { 
      model: requestBody.model,
      tools: requestBody.tools ? `✅ Included (vector store: ${VECTOR_STORE_ID})` : "❌ Not included",
      stream: requestBody.stream ? "✅ Enabled" : "❌ Disabled" 
    });
    
    // Add additional logging for debugging
    console.warn("🔍 SENDING QUERY WITH SYSTEM PROMPT:", {
      query: cappedQuery,
      systemPromptLength: instructions.length,
      systemPromptFirstLine: instructions.split('\n')[0],
      vectorStoreId: VECTOR_STORE_ID
    });

    debug.log('api', "Sending request to OpenAI Responses API...");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal
    });

    debug.log('api', `Response received with status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: "Could not parse error response" };
      }
      
      debug.error('api', "Responses API error:", errorData);
      debug.error('api', `Status: ${response.status} ${response.statusText}`);
      
      throw new Error(
        `Failed to create response: ${response.status} ${response.statusText}. ${
          errorData.error?.message || JSON.stringify(errorData)
        }`
      );
    }

    // Extract response ID from headers (preferred way)
    let responseId: string | undefined = response.headers.get('openai-response-id') || 
                     response.headers.get('x-response-id') || undefined;
    
    if (responseId) {
      debug.log('api', `Response ID from headers: ${responseId}`);
    }

    // Streaming mode
    if (onChunk && response.body) {
      console.warn("🚀 STARTING STREAM PROCESSING");
      let fullText = "";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let chunkCounter = 0;

      try {
        while (true) {
          console.warn("📚 Reading next chunk from stream...");
          const { done, value } = await reader.read();
          
          if (done) {
            console.warn("📚 Stream reading complete - done=true");
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          chunkCounter++;
          
          console.warn(`📚 Got chunk #${chunkCounter}, buffer length = ${buffer.length}`);

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

            console.warn(`📦 SSE EVENT: ${event}`);

            if (data === "[DONE]") {
              console.warn("📦 Received [DONE] message");
              continue;
            }

            try {
              const parsedData = JSON.parse(data);
              
              // Extract response ID from different event types
              if (!responseId) {
                if (event === "response.created" || event === "response.in_progress" || event === "response.completed") {
                  if (parsedData.response?.id) {
                    responseId = parsedData.response.id;
                    console.warn(`📦 Response ID extracted: ${responseId}`);
                  }
                } else if (parsedData.response_id) {
                  responseId = parsedData.response_id;
                  console.warn(`📦 Response ID extracted: ${responseId}`);
                }
              }
              
              // Skip response.created event - we already have a placeholder
              if (event === "response.created") {
                console.warn("📦 Skipping response.created event");
                continue;
              }
              
              // Handle error events per user's instructions
              if (event === "error" || event === "response.failed") {
                const msg = parsedData.message || parsedData.error?.message || "Unknown tool error";
                const code = parsedData.code || parsedData.error?.code;
                console.error("Tool call failed:", code, msg);

                // Bubble a synthetic chunk to the UI so users see something
                callChunkCallback(onChunk, `⚠️ Internal error (${code}): ${msg}`, 0);

                // Stop reading any further
                break;
              }
              
              // Handle streaming chunks - process ONLY response.output_text.delta events
              if (event === "response.output_text.delta") {
                const textValue =
                  typeof parsedData.delta === "string"
                    ? parsedData.delta
                    : parsedData.delta?.value ?? "";
                if (textValue) {
                  const partIndex = parsedData.content_index ?? 0;
                  
                  // Add citation format validation on chunks
                  if (textValue.includes("Sources") && fullText.length > 100) {
                    console.warn("🧐 SOURCES SECTION DETECTED, checking citation format");
                    
                    // Extract a context snippet around the Sources section
                    const sourcesIndex = textValue.indexOf("Sources");
                    const start = Math.max(0, sourcesIndex - 20);
                    const end = Math.min(textValue.length, sourcesIndex + 40);
                    const contextSnippet = textValue.substring(start, end);
                    console.warn("📋 Sources context:", contextSnippet);
                    
                    // Check for proper citation format in the entire text so far
                    const hasCitations = /【\d+:[^:]+:[^】]+】/.test(fullText);
                    if (!hasCitations) {
                      console.error("⚠️ NO PROPER CITATIONS FOUND IN RESPONSE!");
                      
                      // Log a detailed warning but don't modify response
                      debug.error('api', "Response doesn't contain proper citations in format 【n:Name:Type】");
                    } else {
                      console.warn("✅ CITATIONS FOUND IN PROPER FORMAT");
                    }
                    
                    // Check for icons in Sources section
                    if (!(textValue.includes("📘") || textValue.includes("📜"))) {
                      console.warn("⚠️ SOURCES SECTION MIGHT LACK PROPER ICONS");
                    }
                  }
                  
                  callChunkCallback(onChunk, textValue, partIndex);
                  fullText += textValue;
                }
              }
              // Only break the loop on completed events
              else if (event === "response.completed") {
                console.warn("🛑 Got completed event, breaking loop");
                break;
              }

              // Useful debug checks for response content
              if (event === "response.delta") {
                try {
                  const parsedData = JSON.parse(data);
                  // Check for tool usage info that would show document access
                  if (parsedData.delta?.tool_calls) {
                    console.warn("🔎 DETECTED TOOL USAGE:", parsedData.delta.tool_calls);
                    
                    // Look for file_search tool usage to detect document access
                    const fileSearchCalls = parsedData.delta.tool_calls.filter(
                      (call: any) => call.type === "file_search"
                    );
                    
                    if (fileSearchCalls.length > 0) {
                      console.warn("📚 FILE SEARCH TOOL USED:", fileSearchCalls);
                    }
                  }
                  
                  // Check if we can find guide-like or policy-like citation patterns
                  if (parsedData.delta?.content) {
                    const contentText = parsedData.delta.content
                      .filter((item: any) => item.type === "text")
                      .map((item: any) => item.text?.value || "")
                      .join("");
                    
                    // Look for citation patterns
                    if (contentText.includes("【")) {
                      console.warn("🔖 CITATION DETECTED:", contentText);
                      
                      // Check if it's using proper format with document type
                      const hasProperFormat = /【\d+:[^:]+:(Guide|Policy)】/.test(contentText);
                      if (hasProperFormat) {
                        console.warn("✅ PROPER CITATION FORMAT DETECTED");
                      } else {
                        console.warn("❌ IMPROPER CITATION FORMAT DETECTED");
                      }
                      
                      // Check for guide vs policy references
                      if (contentText.includes(":Guide】")) {
                        console.warn("📘 GUIDE DOCUMENT CITATION FOUND");
                      }
                      if (contentText.includes(":Policy】")) {
                        console.warn("📜 POLICY DOCUMENT CITATION FOUND");
                      }
                    }
                    
                    // Look for "Sources" section
                    if (contentText.includes("Sources") || contentText.includes("Sources:")) {
                      console.warn("📋 SOURCES SECTION DETECTED:", contentText);
                    }
                  }
                  
                  // Continue with normal delta processing
                  if (
                    parsedData.delta?.content &&
                    Array.isArray(parsedData.delta.content)
                  ) {
                  }
                } catch (err) {
                  console.error("📦 ERROR PARSING SSE:", err);
                }
              }
            } catch (err) {
              console.error("📦 ERROR PARSING SSE:", err);
            }
          }
        }
      } catch (err) {
        console.error("📦 STREAM ERROR:", err);
      }
      
      console.warn(`🏁 STREAMING COMPLETED, total length: ${fullText.length}`);
      return {
        text: fullText,
        id: responseId
      };
    } else {
      // Non-stream scenario
      debug.log('api', "Processing non-streaming response...");
      let jsonData;
      try {
        jsonData = await response.json();
        debug.log('api', "Non-streaming response data received");
        
        // Extract response ID from payload if not in headers
        if (!responseId && jsonData.id) {
          responseId = jsonData.id;
          debug.log('api', `Response ID from payload: ${responseId}`);
        }
        
        const contentArr = jsonData.content || [];
        if (contentArr.length === 0) {
          debug.warn('api', "Response contained no content:", jsonData);
        }
        
        const text = contentArr
          .filter((c: any) => c.type === "text")
          .map((c: any) => c.text.value)
          .join("\n");

        debug.log('api', `Extracted text length: ${text.length}`);
        debug.groupEnd();
        return {
          text,
          id: responseId
        };
      } catch (err) {
        debug.error('api', "Error parsing response JSON:", err);
        throw new Error("Failed to parse response from OpenAI");
      }
    }
  } catch (err) {
    debug.error('api', "createResponse error:", err);
    debug.groupEnd();
    throw err;
  }
}
