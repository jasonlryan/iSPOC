// API service for OpenAI integration

// Access environment variables
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const ASST_API_KEY = import.meta.env.VITE_ASST_API_KEY;

// Check if API keys are available
if (!OPENAI_API_KEY) {
  console.warn('OpenAI API key is not set. Please check your .env file.');
}

if (!ASST_API_KEY) {
  console.warn('Assistant API key is not set. Please check your .env file.');
}

// Store thread ID in memory (in a real app, this would be stored in a database or localStorage)
let currentThreadId: string | null = null;

/**
 * Send a message to the OpenAI Assistant API
 * @param message The user's message
 * @param onChunk Optional callback function that receives delta content items
 * @returns The AI response
 */
export async function sendMessage(
  message: string,
  onChunk?: (contentItem: { index: number; type: string; text?: { value: string } }) => void
): Promise<string> {
  try {
    console.log('[API] sendMessage initiated.');
    console.log('[API] Using API key:', OPENAI_API_KEY?.substring(0, 5) + '...');
    console.log('[API] Using Assistant ID:', ASST_API_KEY);
    
    // Step 1: Create a thread if one doesn't exist
    if (!currentThreadId) {
      console.log('[API] No current thread ID, creating new thread...');
      console.time('Thread creation');
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({})
      });
      
      if (!threadResponse.ok) {
        const errorData = await threadResponse.json().catch(() => ({}));
        console.error('[API] Thread creation error:', errorData);
        throw new Error(`Failed to create thread: ${threadResponse.status} ${threadResponse.statusText}`);
      }
      
      const threadData = await threadResponse.json();
      currentThreadId = threadData.id;
      console.log('[API] Created new thread:', currentThreadId);
      console.timeEnd('Thread creation');
    } else {
      console.log('[API] Using existing thread ID:', currentThreadId);
    }
    
    // Step 2: Add a message to the thread
    console.log('[API] Adding message to thread...');
    console.time('Message creation');
    const messageResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    });
    
    if (!messageResponse.ok) {
      const errorData = await messageResponse.json().catch(() => ({}));
      console.error('[API] Message creation error:', errorData);
      throw new Error(`Failed to add message: ${messageResponse.status} ${messageResponse.statusText}`);
    }
    console.timeEnd('Message creation');
    
    // Step 3: Create the Run
    console.log('[API] Creating run...');
    console.time('Run creation');
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: ASST_API_KEY,
        stream: !!onChunk // Request streaming only if onChunk is provided
      })
    });
    
    if (!runResponse.ok) {
      const errorData = await runResponse.json().catch(() => ({}));
      console.error('[API] Run creation error:', errorData);
      throw new Error(`Failed to run assistant: ${runResponse.status} ${runResponse.statusText}`);
    }
    
    // For streaming runs, the response body is the stream itself.
    // For non-streaming, it's JSON containing the run details.
    
    // Step 4: Handle Response - Streaming or Polling
    if (onChunk && runResponse.body) {
      console.log('[API] Streaming response detected, processing stream...');
      console.time('Manual Streaming');
      let fullResponse = '';
      let chunksReceived = 0;
      const reader = runResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = ''; // Buffer to handle partial SSE messages

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('[API] Stream finished.');
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          console.log(`[API] Raw chunk added to buffer. Buffer size: ${buffer.length}`);

          // Process buffer line by line for SSE messages
          let eolIndex;
          while ((eolIndex = buffer.indexOf('\n\n')) >= 0) {
             const message = buffer.substring(0, eolIndex).trim();
             buffer = buffer.substring(eolIndex + 2);
             
             if (!message) continue; // Skip empty messages
             
             console.log('[API] Processing SSE message:', message);
             let event = '';
             let data = '';
             const lines = message.split('\n');
             
             for (const line of lines) {
               if (line.startsWith('event:')) {
                 event = line.substring(6).trim();
               } else if (line.startsWith('data:')) {
                 data = line.substring(5).trim();
               }
             }

             if (data === '[DONE]') {
                console.log('[API] Received [DONE] signal in stream data.');
                // The stream might send [DONE] before closing, reader.read() will handle final 'done'
                continue;
             }

             if (event === 'thread.message.delta') {
               try {
                  console.log('[API] Raw delta data string:', data);
                  const parsedData = JSON.parse(data);
                  console.log('[API] Parsed delta object:', parsedData.delta);
                  
                  if (parsedData.delta?.content) {
                     for (const contentItem of parsedData.delta.content) {
                       // Check if it's a text item with a value
                       if (contentItem.type === 'text' && contentItem.text?.value !== undefined) { 
                         chunksReceived++;
                         console.log(`[API] Extracted content item at index ${contentItem.index}, chunk ${chunksReceived}:`, contentItem.text.value);
                         // Pass the whole contentItem object to the callback
                         if (onChunk) { 
                            onChunk(contentItem); 
                         }
                         // We still accumulate the full response text locally if needed for the final return value
                         // Note: This simple accumulation might not perfectly match the block structure
                         if (contentItem.index === 0) { // Simple assumption for now
                           fullResponse = contentItem.text.value; 
                         } else {
                           // Needs more complex logic to handle multiple blocks if returning fullResponse
                         }
                       }
                     }
                   }
               } catch (e) {
                  console.error('[API] Error parsing streaming data JSON:', e, 'Raw data:', data);
               }
             } else if (event === 'thread.run.completed') {
                 console.log('[API] Received thread.run.completed event in stream.');
             } else {
                 console.log('[API] Received other event type in stream:', event);
             }
          }
        }
        // Add final part of buffer if stream ends without double newline
        if (buffer.trim()) {
            console.log('[API] Processing remaining buffer after stream end:', buffer);
             // Attempt to process final part - might be incomplete
        }

        console.timeEnd('Manual Streaming');
        console.log(`[API] Stream processing finished. Total chunks: ${chunksReceived}. Full response length: ${fullResponse.length}`);
        return fullResponse || 'Assistant processing complete.'; // Return accumulated response
      } catch (streamError) {
        console.error('[API] Error reading stream:', streamError);
        // Don't fallback here, let the main catch handle it or return partial response?
        // For now, let's throw to indicate failure
        throw new Error('Failed to process stream');
      }
      
    } else if (!onChunk) {
      // Non-streaming path: Run was created, now poll for completion
      const runDetails = await runResponse.json(); // Get run ID from non-streamed response
      console.log('[API] Non-streaming run created, run ID:', runDetails.id, 'Polling...');
      return pollForCompletion(runDetails.id);
    } else {
      // Streaming requested but no response body? Should not happen if API call was ok.
      console.error('[API] Stream requested but no response body received!');
      throw new Error('Streaming failed: No response body');
    }
    
  } catch (error) {
    console.error('[API] Error in sendMessage:', error);
    // Ensure a user-friendly error is returned
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return `Error: ${message}`;
  }
}

/**
 * Helper function to poll for run completion and retrieve messages
 * @param runId The ID of the run to poll
 * @returns The final assistant response
 */
async function pollForCompletion(runId: string): Promise<string> {
  console.log(`[API] Polling for completion of run: ${runId}`);
  console.time('Polling Run completion');
  let runStatus = 'queued';
  let attempts = 0;
  const maxAttempts = 60; // Maximum number of polling attempts (30 seconds)
  
  while (runStatus !== 'completed' && runStatus !== 'failed' && runStatus !== 'cancelled' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 500));
    attempts++;
    
    try {
      const runStatusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      if (!runStatusResponse.ok) {
        let errorData = {};
        try { errorData = await runStatusResponse.json(); } catch { /* ignore json parse error */ }
        console.error('[API] Run status polling error:', runStatusResponse.status, errorData);
        throw new Error(`Polling failed: ${runStatusResponse.status} ${runStatusResponse.statusText}`);
      }
      
      const runStatusData = await runStatusResponse.json();
      runStatus = runStatusData.status;
      console.log(`[API] Polling status (attempt ${attempts}/${maxAttempts}):`, runStatus);
      
      if (runStatus === 'failed' || runStatus === 'cancelled') {
        console.error('[API] Run polling ended with status:', runStatus, 'Details:', runStatusData.last_error);
        throw new Error(`Run ${runStatus}: ${JSON.stringify(runStatusData.last_error)}`);
      }
    } catch (pollError) {
       console.error('[API] Error during polling check:', pollError);
       // Decide if we should retry or throw immediately
       throw pollError; // Re-throw for now
    }
  }
  
  if (attempts >= maxAttempts) {
    console.error('[API] Polling timed out.');
    throw new Error('Timed out waiting for assistant response via polling');
  }
  console.timeEnd('Polling Run completion');
  
  // Get the assistant's messages
  console.log('[API] Polling complete. Retrieving messages...');
  console.time('Polling Message retrieval');
  try {
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    if (!messagesResponse.ok) {
      let errorData = {};
      try { errorData = await messagesResponse.json(); } catch { /* ignore json parse error */ }
      console.error('[API] Messages retrieval error (polling):', messagesResponse.status, errorData);
      throw new Error(`Failed to get messages: ${messagesResponse.status} ${messagesResponse.statusText}`);
    }
    
    const messagesData = await messagesResponse.json();
    const assistantMessages = messagesData.data.filter((msg: any) => msg.role === 'assistant');
    
    if (assistantMessages.length === 0) {
      console.warn('[API] No assistant messages found after polling.');
      return 'No response from assistant.';
    }
    
    const latestMessage = assistantMessages[0];
    let responseText = '';
    if (latestMessage.content && Array.isArray(latestMessage.content)) {
       for (const content of latestMessage.content) {
         if (content.type === 'text') {
           responseText += content.text.value;
         }
       }
    } else {
       console.warn('[API] Assistant message content structure unexpected:', latestMessage.content);
    }
    
    console.timeEnd('Polling Message retrieval');
    console.log('[API] Retrieved response via polling. Length:', responseText.length);
    return responseText || 'Assistant responded but no text was found.';
  } catch (retrievalError) {
     console.error('[API] Error during message retrieval:', retrievalError);
     throw retrievalError; // Re-throw
  }
} 