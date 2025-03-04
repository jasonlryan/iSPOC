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
 * @returns The AI response
 */
export async function sendMessage(message: string): Promise<string> {
  try {
    console.log('Using API key:', OPENAI_API_KEY?.substring(0, 5) + '...');
    console.log('Using Assistant ID:', ASST_API_KEY);
    
    // Step 1: Create a thread if one doesn't exist
    if (!currentThreadId) {
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
        console.error('Thread creation error:', errorData);
        throw new Error(`Failed to create thread: ${threadResponse.status} ${threadResponse.statusText}`);
      }
      
      const threadData = await threadResponse.json();
      currentThreadId = threadData.id;
      console.log('Created new thread:', currentThreadId);
      console.timeEnd('Thread creation');
    }
    
    // Step 2: Add a message to the thread
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
      console.error('Message creation error:', errorData);
      throw new Error(`Failed to add message: ${messageResponse.status} ${messageResponse.statusText}`);
    }
    console.timeEnd('Message creation');
    
    // Step 3: Run the assistant
    console.time('Run creation');
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: ASST_API_KEY
      })
    });
    
    if (!runResponse.ok) {
      const errorData = await runResponse.json().catch(() => ({}));
      console.error('Run creation error:', errorData);
      throw new Error(`Failed to run assistant: ${runResponse.status} ${runResponse.statusText}`);
    }
    
    const runData = await runResponse.json();
    const runId = runData.id;
    console.timeEnd('Run creation');
    
    // Step 4: Poll for the run to complete
    console.time('Run completion');
    let runStatus = 'queued';
    let attempts = 0;
    const maxAttempts = 60; // Maximum number of polling attempts (30 seconds)
    
    while (runStatus !== 'completed' && runStatus !== 'failed' && runStatus !== 'cancelled' && attempts < maxAttempts) {
      // Wait for 500ms before polling again (reduced from 1000ms)
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
      
      const runStatusResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs/${runId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      if (!runStatusResponse.ok) {
        const errorData = await runStatusResponse.json().catch(() => ({}));
        console.error('Run status error:', errorData);
        throw new Error(`Failed to get run status: ${runStatusResponse.status} ${runStatusResponse.statusText}`);
      }
      
      const runStatusData = await runStatusResponse.json();
      runStatus = runStatusData.status;
      console.log(`Run status (attempt ${attempts}/${maxAttempts}):`, runStatus);
      
      if (runStatus === 'failed' || runStatus === 'cancelled') {
        console.error('Run error details:', runStatusData.last_error);
        throw new Error(`Run ${runStatus}: ${JSON.stringify(runStatusData.last_error)}`);
      }
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Timed out waiting for assistant response');
    }
    console.timeEnd('Run completion');
    
    // Step 5: Get the assistant's messages
    console.time('Message retrieval');
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    if (!messagesResponse.ok) {
      const errorData = await messagesResponse.json().catch(() => ({}));
      console.error('Messages retrieval error:', errorData);
      throw new Error(`Failed to get messages: ${messagesResponse.status} ${messagesResponse.statusText}`);
    }
    
    const messagesData = await messagesResponse.json();
    
    // Get the latest assistant message
    const assistantMessages = messagesData.data.filter((msg: any) => msg.role === 'assistant');
    if (assistantMessages.length === 0) {
      return 'No response from assistant.';
    }
    
    // Get the most recent message (first in the array)
    const latestMessage = assistantMessages[0];
    
    // Extract the text content
    let responseText = '';
    for (const content of latestMessage.content) {
      if (content.type === 'text') {
        responseText += content.text.value;
      }
    }
    console.timeEnd('Message retrieval');
    
    return responseText || 'Assistant responded but no text was found.';
    
  } catch (error) {
    console.error('Error sending message to OpenAI:', error);
    return `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`;
  }
} 