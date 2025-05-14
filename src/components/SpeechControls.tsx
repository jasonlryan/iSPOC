import React, { useState } from "react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Settings, Volume2, VolumeX } from "lucide-react";
import { useSpeech } from "../lib/useSpeech";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";

interface SpeechControlsProps {
  autoSpeak?: boolean;
}

export const SpeechControls: React.FC<SpeechControlsProps> = ({
  autoSpeak = false,
}) => {
  const { speaking, stop, voices, selectedVoice, setVoice } = useSpeech();
  const [isMuted, setIsMuted] = useState(false);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(autoSpeak);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);

  const toggleMute = () => {
    if (speaking) {
      stop();
    }
    setIsMuted(!isMuted);
  };

  const toggleAutoSpeak = () => {
    setAutoSpeakEnabled(!autoSpeakEnabled);
  };

  const handleVoiceChange = (voiceName: string) => {
    const voice = voices.find((v) => v.name === voiceName);
    if (voice) {
      setVoice(voice);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMute}
        className={`${
          isMuted ? "text-red-500" : "text-gray-500"
        } hover:bg-gray-100`}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:bg-gray-100"
            title="Speech Settings"
          >
            <Settings size={18} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <h4 className="font-medium">Speech Settings</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-speak">Auto-speak responses</Label>
              <Switch
                id="auto-speak"
                checked={autoSpeakEnabled}
                onCheckedChange={toggleAutoSpeak}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voice-select">Voice</Label>
              <Select
                onValueChange={handleVoiceChange}
                value={selectedVoice?.name}
              >
                <SelectTrigger id="voice-select">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="rate-slider">Rate: {rate.toFixed(1)}x</Label>
              </div>
              <Slider
                id="rate-slider"
                min={0.5}
                max={2}
                step={0.1}
                value={[rate]}
                onValueChange={(values) => setRate(values[0])}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pitch-slider">Pitch: {pitch.toFixed(1)}</Label>
              </div>
              <Slider
                id="pitch-slider"
                min={0.5}
                max={2}
                step={0.1}
                value={[pitch]}
                onValueChange={(values) => setPitch(values[0])}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SpeechControls;
