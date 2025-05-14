// Debug utilities for the iSPOC application

// Enable streaming mode for extra verbose logging
export const streamingMode = true;

// Define styles for different log types
const styles = {
  api: 'color: #0077b6; font-weight: bold;',
  ui: 'color: #7209b7; font-weight: bold;',
  event: 'color: #38b000; font-weight: bold;',
  error: 'color: #d00000; font-weight: bold;',
  warning: 'color: #ffaa00; font-weight: bold;',
  info: 'color: #4361ee; font-weight: bold;',
  stream: 'color: #ff006e; font-weight: bold; background: #eaf4f4; padding: 2px; border-radius: 2px;'
};

// Create a debug logger that shows more visible logs
export const debug = {
  log: (module: string, message: string, data?: any) => {
    const style = styles[module as keyof typeof styles] || 'color: #333; font-weight: bold;';
    console.log(`%c[${module.toUpperCase()}]`, style, message, data !== undefined ? data : '');
    
    // Extra logging in streaming mode
    if (streamingMode && (module === 'api' || module === 'event')) {
      console.warn(`🔍 ${module.toUpperCase()} | ${message}`, data !== undefined ? data : '');
    }
  },
  
  error: (module: string, message: string, error?: any) => {
    console.error(`%c[${module.toUpperCase()} ERROR]`, styles.error, message, error || '');
    
    // Always show errors with extra visibility in streaming mode
    if (streamingMode) {
      console.warn(`❌ ${module.toUpperCase()} ERROR | ${message}`, error || '');
    }
  },
  
  warn: (module: string, message: string, data?: any) => {
    console.warn(`%c[${module.toUpperCase()} WARNING]`, styles.warning, message, data || '');
    
    // Extra logging in streaming mode
    if (streamingMode) {
      console.warn(`⚠️ ${module.toUpperCase()} WARNING | ${message}`, data || '');
    }
  },
  
  stream: (message: string, data?: any) => {
    if (streamingMode) {
      console.warn(`%c[STREAM]`, styles.stream, message, data !== undefined ? data : '');
    }
  },
  
  group: (module: string, title: string) => {
    const style = styles[module as keyof typeof styles] || 'color: #333; font-weight: bold;';
    console.group(`%c[${module.toUpperCase()}] ${title}`, style);
  },
  
  groupEnd: () => {
    console.groupEnd();
  }
};

// Add a quick utility to inspect a streamed response in the console
export function inspectStream(streamData: any) {
  debug.group('api', 'Stream Data');
  try {
    if (typeof streamData === 'string') {
      debug.log('api', 'Stream content (string):', streamData.substring(0, 100) + (streamData.length > 100 ? '...' : ''));
    } else if (streamData && typeof streamData === 'object') {
      debug.log('api', 'Stream content (object):', JSON.stringify(streamData).substring(0, 100) + '...');
    } else {
      debug.log('api', 'Stream content (unknown type):', typeof streamData);
    }
  } catch (err) {
    debug.error('api', 'Error inspecting stream data', err);
  }
  debug.groupEnd();
}

// Enable/disable debug mode
export const isDebugMode = () => {
  return localStorage.getItem('debug') === 'true' || 
         window.location.search.includes('debug=true') ||
         streamingMode; // Always return true in streaming mode
};

// Initialize debug mode
export function initDebug() {
  if (isDebugMode()) {
    debug.log('info', 'Debug mode enabled');
    
    if (streamingMode) {
      console.log('%c🔍 STREAMING DEBUG MODE ENABLED', 'font-size: 16px; color: #ff006e; font-weight: bold; background: #eaf4f4; padding: 5px; border-radius: 5px;');
    } else {
      console.log('%c🔍 DEBUG MODE ENABLED', 'font-size: 16px; color: #ff006e; font-weight: bold; background: #eaf4f4; padding: 5px; border-radius: 5px;');
    }
  }
}

// Toggle debug mode on/off
export function toggleDebug() {
  const currentMode = isDebugMode();
  localStorage.setItem('debug', currentMode && !streamingMode ? 'false' : 'true');
  window.location.reload();
} 