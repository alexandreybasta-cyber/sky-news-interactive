"use client";
import { useRef, useCallback } from "react";

interface MicButtonProps {
  isListening: boolean;
  onListeningStart: () => void;
  onListeningStop: () => void;
  onTranscript: (text: string) => void;
  onFinalTranscript: (text: string) => void;
  disabled: boolean;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export default function MicButton({
  isListening,
  onListeningStart,
  onListeningStop,
  onTranscript,
  onFinalTranscript,
  disabled,
}: MicButtonProps) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onFinalTranscript(finalTranscript);
      } else if (interimTranscript) {
        onTranscript(interimTranscript);
      }
    };

    recognition.onend = () => {
      onListeningStop();
      recognitionRef.current = null;
    };

    recognition.onerror = (event: { error: string }) => {
      console.error("Speech recognition error:", event.error);
      onListeningStop();
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    onListeningStart();
  }, [onListeningStart, onListeningStop, onTranscript, onFinalTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const handleClick = () => {
    if (disabled) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings when listening */}
      {isListening && (
        <>
          <div className="absolute w-40 h-40 rounded-full bg-orange-200 animate-pulse-ring opacity-60" />
          <div
            className="absolute w-40 h-40 rounded-full bg-orange-100 animate-pulse-ring opacity-40"
            style={{ animationDelay: "0.5s" }}
          />
          <div
            className="absolute w-40 h-40 rounded-full bg-orange-50 animate-pulse-ring opacity-30"
            style={{ animationDelay: "1s" }}
          />
        </>
      )}

      {/* Main button */}
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`relative z-10 w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-lg ${
          disabled
            ? "bg-gray-300 cursor-not-allowed"
            : isListening
              ? "bg-gradient-to-br from-orange-500 to-red-500 scale-110 shadow-orange-300 shadow-xl"
              : "bg-gradient-to-br from-orange-400 to-orange-600 hover:scale-105 hover:shadow-orange-200 hover:shadow-xl active:scale-95"
        }`}
      >
        {/* Microphone icon */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-white"
        >
          <path
            d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"
            fill="currentColor"
          />
          <path
            d="M17 12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12H5C5 15.53 7.61 18.43 11 18.92V22H13V18.92C16.39 18.43 19 15.53 19 12H17Z"
            fill="currentColor"
          />
        </svg>

        {/* Label */}
        <span className="text-white text-xs font-medium mt-1">
          {isListening ? "Listening..." : "Tap to ask"}
        </span>
      </button>
    </div>
  );
}
