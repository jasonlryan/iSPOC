import { useState, useEffect } from 'react';

// Define interface for window size object
interface WindowSize {
  width: number;
  height: number;
}

/**
 * A hook that returns the current window dimensions
 * @returns An object containing width and height of the window
 */
export function useWindowSize(): WindowSize {
  // Initialize state with undefined to avoid server-client mismatch
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty array ensures that effect is only run on mount and unmount

  return windowSize;
}

export default useWindowSize; 