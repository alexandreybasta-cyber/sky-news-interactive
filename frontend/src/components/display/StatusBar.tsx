"use client";

interface StatusBarProps {
  isConnected: boolean;
  sessionId: string;
}

export default function StatusBar({ isConnected, sessionId }: StatusBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 px-8 py-4 flex justify-between items-center text-sm text-gray-400 bg-gradient-to-t from-white to-transparent">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span>{isConnected ? "Connected" : "Reconnecting..."}</span>
      </div>
      <span className="font-mono text-xs">
        Session: {sessionId.slice(0, 12)}...
      </span>
      <span>{new Date().toLocaleTimeString()}</span>
    </div>
  );
}
