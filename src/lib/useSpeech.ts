import { useCallback, useState, useEffect } from 'react';

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  // Load available voices
  useEffect(() => {
    function loadVoices() {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Select a good default voice (prefer female English voices)
      if (availableVoices.length > 0) {
        const preferredVoice = availableVoices.find(
          voice => voice.name.includes('Female') && voice.lang.startsWith('en')
        ) || availableVoices.find(
          voice => voice.lang.startsWith('en')
        ) || availableVoices[0];
        
        setSelectedVoice(preferredVoice);
      }
    }

    // Chrome needs this event to load voices
    if (typeof speechSynthesis !== 'undefined') {
      loadVoices();
      
      // Chrome loads voices asynchronously
      speechSynthesis.onvoiceschanged = loadVoices;
      
      // Cleanup
      return () => {
        speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      if (typeof speechSynthesis !== 'undefined') {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported in this browser');
      return;
    }
    
    // Skip empty text or just spaces
    if (!text || !text.trim()) return;
    
    // Prepare clean text (remove markdown and citations)
    const cleanText = text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1')     // Italic
      .replace(/\[\d+\]/g, '')           // Citations
      .replace(/#+\s([^\n]+)/g, '$1')    // Headers
      .replace(/```[^`]*```/g, '')       // Code blocks
      .replace(/`([^`]+)`/g, '$1')       // Inline code
      .replace(/\d+\.\s+/g, ', ')        // Replace numbered lists with commas for better speech flow
      .replace(/[-*•]\s+/g, ', ')        // Replace bullet points with commas for better speech flow
      .replace(/\n\n+/g, '. ')           // Newlines to period+space
      .replace(/\n/g, ' ')               // Single newlines to space
      .replace(/\s+/g, ' ')              // Multiple spaces to single
      .trim();
      
    // Don't try to speak if we don't have anything after cleanup
    if (!cleanText) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Set voice if available
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Medium speed and pitch
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Track speaking state
    setSpeaking(true);
    
    utterance.onend = () => {
      setSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice]);

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setSelectedVoice(voice);
  }, []);

  return { 
    speak, 
    stop, 
    speaking, 
    voices, 
    selectedVoice, 
    setVoice 
  };
} 