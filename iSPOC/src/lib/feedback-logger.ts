import { debug } from "./debug";

// Define feedback data interface
export interface FeedbackData {
  q1: string; // Rating
  q2: string; // Liked
  q3: string; // Frustrated
  q4: string; // Feature Request
  q5: string; // Recommendation
  q6: string; // Additional comments
}

/**
 * Logs feedback survey results to localStorage
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
    const csvLine = `${timestampedFeedback.timestamp},${feedback.q1},${feedback.q2},${feedback.q3},${feedback.q4},${feedback.q5},${feedback.q6}`;
    console.log('CSV line that would be created:', csvLine);
    
    return true;
  } catch (error) {
    console.error('Error logging feedback:', error);
    debug.error('feedback', 'Failed to log feedback', error);
    return false;
  }
} 