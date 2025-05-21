import { debug } from "./debug";

// Define feedback data interface
export interface FeedbackData {
  q1: string; // Rating
  q2: string; // Liked
  q3: string; // Frustrated
  q4: string; // Feature Request
  q5: string; // Additional comments
}

/**
 * Logs feedback survey results to localStorage and to Vercel serverless function
 * @param feedback The feedback data containing q1-q5 answers
 * @returns True if logging was successful
 */
export function logFeedbackToCSV(feedback: FeedbackData): boolean {
  try {
    debug.log('feedback', `Logging feedback: ${JSON.stringify(feedback)}`);
    
    // Get existing feedback data from localStorage
    const existingData = localStorage.getItem('feedbackData');
    const feedbackArray = existingData ? JSON.parse(existingData) : [];
    
    // Add timestamp to feedback
    const timestampedFeedback = {
      ...feedback,
      timestamp: new Date().toISOString(),
    };
    
    // Add feedback to array and save back to localStorage
    feedbackArray.push(timestampedFeedback);
    localStorage.setItem('feedbackData', JSON.stringify(feedbackArray));
    
    debug.log('feedback', 'Successfully saved feedback to localStorage');
    
    // Create a mock CSV line for debugging
    const csvLine = `${timestampedFeedback.timestamp},${feedback.q1},${feedback.q2},${feedback.q3},${feedback.q4},${feedback.q5}`;
    console.log('CSV line that would be created:', csvLine);
    
    // Send feedback to Vercel serverless function
    sendFeedbackToServerless(feedback)
      .then(success => {
        debug.log('feedback', `Serverless feedback logging ${success ? 'successful' : 'failed'}`);
      })
      .catch(error => {
        debug.error('feedback', 'Error sending feedback to serverless function', error);
      });
    
    return true;
  } catch (error) {
    console.error('Error logging feedback:', error);
    debug.error('feedback', 'Failed to log feedback', error);
    return false;
  }
}

/**
 * Sends feedback data to the Vercel serverless function
 * @param feedback The feedback data to send
 * @returns Promise resolving to true if successful
 */
async function sendFeedbackToServerless(feedback: FeedbackData): Promise<boolean> {
  try {
    // Default to /api/feedback (Vercel serverless path)
    // This will work locally with npm run dev and in production on Vercel
    const apiUrl = '/api/feedback';
    
    console.log(`📤 SENDING FEEDBACK TO API: ${apiUrl}`, feedback);
    debug.log('feedback', `Sending feedback to API: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedback)
    });
    
    // Always log the response status for debugging
    console.log(`📥 FEEDBACK API RESPONSE: ${response.status} ${response.statusText}`);
    debug.log('feedback', `API response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      try {
        const errorData = await response.json();
        const errorMessage = `Server responded with ${response.status}: ${errorData.error || 'Unknown error'}`;
        console.error(`❌ FEEDBACK API ERROR:`, errorMessage, errorData);
        debug.error('feedback', errorMessage, errorData);
        throw new Error(errorMessage);
      } catch (parseError) {
        const errorMessage = `Server responded with ${response.status} and response couldn't be parsed`;
        console.error(`❌ FEEDBACK API ERROR:`, errorMessage);
        debug.error('feedback', errorMessage);
        throw new Error(errorMessage);
      }
    }
    
    try {
      const result = await response.json();
      console.log(`✅ FEEDBACK API SUCCESS:`, result);
      debug.log('feedback', `Serverless response: ${JSON.stringify(result)}`);
      return true;
    } catch (parseError) {
      console.error(`⚠️ FEEDBACK API WARNING: Could not parse successful response`, parseError);
      debug.error('feedback', 'Could not parse successful response', parseError);
      return true; // Still return true since the request was successful
    }
  } catch (error) {
    console.error('❌ ERROR SENDING FEEDBACK:', error);
    debug.error('feedback', 'Failed to send feedback to serverless function', error);
    return false;
  }
}

/**
 * Logs a query and its response to the serverless function
 * @param query The user's query
 * @param response The system's response
 * @param userId Optional user identifier
 * @param sessionId Optional session identifier
 * @returns Promise resolving to true if successful
 */
export async function logQueryResponse(
  query: string, 
  response: string, 
  userId: string = 'anonymous', 
  sessionId: string = 'unknown'
): Promise<boolean> {
  try {
    // Clear debug logging for diagnostics
    console.log('🔵 QUERY LOGGING STARTED:', query.substring(0, 50) + '...');
    debug.log('logging', `Logging query: ${query.substring(0, 100)}...`);
    
    const apiUrl = '/api/log';
    console.log('🔵 Sending to API URL:', apiUrl);
    
    // Log payload (truncated)
    const payload = {
      query,
      response: response.substring(0, 100) + '...',
      userId,
      sessionId,
      timestamp: new Date().toISOString()
    };
    console.log('🔵 Payload preview:', payload);
    
    // Make the actual request with the full data
    const logResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        response,
        userId,
        sessionId,
        timestamp: new Date().toISOString()
      })
    });
    
    // Always log response status
    console.log(`🔵 LOG API RESPONSE: ${logResponse.status} ${logResponse.statusText}`);
    
    if (!logResponse.ok) {
      try {
        const errorData = await logResponse.json();
        const errorMessage = `Server responded with ${logResponse.status}: ${errorData.error || 'Unknown error'}`;
        console.error('🔴 QUERY LOG ERROR:', errorMessage);
        throw new Error(errorMessage);
      } catch (parseError) {
        console.error('🔴 QUERY LOG ERROR: Cannot parse error response');
        throw new Error(`Server responded with ${logResponse.status}`);
      }
    }
    
    try {
      const result = await logResponse.json();
      console.log('✅ QUERY LOG SUCCESS:', result);
      debug.log('logging', 'Successfully logged query and response');
      return true;
    } catch (parseError) {
      console.warn('⚠️ QUERY LOG WARNING: Cannot parse success response');
      return true; // Still return success
    }
  } catch (error) {
    console.error('🔴 ERROR LOGGING QUERY:', error);
    debug.error('logging', 'Failed to log query and response', error);
    return false;
  }
} 