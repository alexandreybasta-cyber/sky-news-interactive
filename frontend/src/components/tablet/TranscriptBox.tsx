"use client";

interface TranscriptBoxProps {
  text: string;
  isListening: boolean;
}

export default function TranscriptBox({ text, isListening }: TranscriptBoxProps) {
  return (
    <div className="w-full max-w-lg mt-8">
      <div
        className={`bg-orange-50 border-2 ${isListening ? "border-orange-400" : "border-orange-200"} rounded-2xl p-6 min-h-[100px] transition-colors`}
      >
        {text ? (
          <p className="text-xl text-gray-800 leading-relaxed">{text}</p>
        ) : (
          <p className="text-xl text-gray-400 italic">
            {isListening ? "Speak now..." : "Your question will appear here"}
          </p>
        )}
      </div>
    </div>
  );
}
