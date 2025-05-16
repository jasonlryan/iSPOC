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
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(feedback)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Server responded with ${response.status}: ${errorData.error || 'Unknown error'}`);
    }
    
    const result = await response.json();
    debug.log('feedback', `Serverless response: ${JSON.stringify(result)}`);
    return true;
  } catch (error) {
    console.error('Error sending feedback to serverless function:', error);
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
    debug.log('logging', `Logging query: ${query.substring(0, 100)}...`);
    
    const apiUrl = '/api/log';
    
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
    
    if (!logResponse.ok) {
      const errorData = await logResponse.json();
      throw new Error(`Server responded with ${logResponse.status}: ${errorData.error || 'Unknown error'}`);
    }
    
    debug.log('logging', 'Successfully logged query and response');
    return true;
  } catch (error) {
    console.error('Error logging query and response:', error);
    debug.error('logging', 'Failed to log query and response', error);
    return false;
  }
} 