import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useSpeech } from "./useSpeech";

interface SpeechContextType {
  isSpeechEnabled: boolean;
  toggleSpeech: () => void;
  speakMessage: (message: string) => void;
  isSpeaking: boolean;
  stopSpeaking: () => void;
}

const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [isSpeechEnabled, setIsSpeechEnabled] = useState<boolean>(false);
  const { speak, stop, speaking } = useSpeech();

  const toggleSpeech = useCallback(() => {
    setIsSpeechEnabled((prev) => !prev);
    if (speaking) {
      stop();
    }
  }, [speaking, stop]);

  const speakMessage = useCallback(
    (message: string) => {
      if (isSpeechEnabled) {
        speak(message);
      }
    },
    [isSpeechEnabled, speak]
  );

  const stopSpeaking = useCallback(() => {
    stop();
  }, [stop]);

  return (
    <SpeechContext.Provider
      value={{
        isSpeechEnabled,
        toggleSpeech,
        speakMessage,
        isSpeaking: speaking,
        stopSpeaking,
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeechContext() {
  const context = useContext(SpeechContext);
  if (context === undefined) {
    throw new Error("useSpeechContext must be used within a SpeechProvider");
  }
  return context;
}
