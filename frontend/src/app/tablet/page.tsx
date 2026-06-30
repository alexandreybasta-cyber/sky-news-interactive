"use client";
import { useState, useCallback } from "react";
import { useSession } from "@/lib/useSession";
import {
  AvatarState,
  AVATAR_STATES,
  MESSAGE_TYPES,
  WSMessage,
} from "@/lib/constants";
import MicButton from "@/components/tablet/MicButton";
import TranscriptBox from "@/components/tablet/TranscriptBox";
import StatusIndicator from "@/components/tablet/StatusIndicator";

export default function TabletPage() {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [currentState, setCurrentState] = useState<AvatarState>(
    AVATAR_STATES.IDLE
  );

  const handleMessage = useCallback((msg: WSMessage) => {
    if (msg.type === MESSAGE_TYPES.AVATAR_STATE_CHANGE) {
      setCurrentState(msg.payload.state as AvatarState);
      if (msg.payload.state === AVATAR_STATES.IDLE) {
        setTimeout(() => setTranscript(""), 2000);
      }
    }
  }, []);

  const { isConnected, sendMessage } = useSession(handleMessage);

  const handleTranscriptComplete = useCallback(
    (text: string) => {
      setTranscript(text);
      setIsListening(false);
      sendMessage(MESSAGE_TYPES.TEXT_INPUT, { text });
    },
    [sendMessage]
  );

  const handleInterimTranscript = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  return (
    <div className="relative flex flex-col h-screen w-screen bg-white items-center justify-center p-8">
      {/* Header */}
      <div className="absolute top-12 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Ask a Question
        </h1>
        <p className="text-lg text-gray-500">
          Tap the microphone and ask about the latest news
        </p>
      </div>

      {/* Mic Button */}
      <MicButton
        isListening={isListening}
        onListeningStart={() => setIsListening(true)}
        onListeningStop={() => setIsListening(false)}
        onTranscript={handleInterimTranscript}
        onFinalTranscript={handleTranscriptComplete}
        disabled={!isConnected || currentState === AVATAR_STATES.THINK}
      />

      {/* Transcript */}
      <TranscriptBox text={transcript} isListening={isListening} />

      {/* Status */}
      <StatusIndicator isConnected={isConnected} currentState={currentState} />
    </div>
  );
}
