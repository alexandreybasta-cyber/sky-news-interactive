"use client";
import { AvatarState, AVATAR_STATES } from "@/lib/constants";

interface StatusIndicatorProps {
  isConnected: boolean;
  currentState: AvatarState;
}

export default function StatusIndicator({
  isConnected,
  currentState,
}: StatusIndicatorProps) {
  const stateLabels: Record<AvatarState, string> = {
    [AVATAR_STATES.IDLE]: "Ready",
    [AVATAR_STATES.LISTEN]: "Listening...",
    [AVATAR_STATES.THINK]: "Processing your question...",
    [AVATAR_STATES.PRESENT]: "Showing on display!",
  };

  return (
    <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2">
      <div
        className={`px-4 py-2 rounded-full text-sm font-medium ${
          currentState === AVATAR_STATES.PRESENT
            ? "bg-green-100 text-green-700"
            : currentState === AVATAR_STATES.THINK
              ? "bg-orange-100 text-orange-700"
              : "bg-gray-100 text-gray-600"
        }`}
      >
        {stateLabels[currentState]}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div
          className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
        />
        {isConnected ? "Connected to display" : "Disconnected"}
      </div>
    </div>
  );
}
