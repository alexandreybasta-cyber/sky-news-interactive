"use client";
import { NewsData } from "@/lib/constants";

interface NewsCardProps {
  data: NewsData;
}

export default function NewsCard({ data }: NewsCardProps) {
  return (
    <div className="animate-slide-in">
      {/* Headline */}
      <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
        {data.headline}
      </h1>

      {/* Summary */}
      <p className="text-2xl text-gray-700 mb-8 leading-relaxed">
        {data.summary}
      </p>

      {/* Key Facts */}
      <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-xl p-6 mb-6">
        <h3 className="font-bold text-orange-900 text-lg mb-3">Key Facts</h3>
        <ul className="space-y-3">
          {data.key_facts.map((fact, idx) => (
            <li key={idx} className="text-gray-800 text-lg flex items-start">
              <span className="text-orange-500 mr-3 mt-1">●</span>
              {fact}
            </li>
          ))}
        </ul>
      </div>

      {/* Sources & Confidence */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>Sources: {data.sources.join(" • ")}</span>
        <span className="flex items-center gap-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full"
              style={{ width: `${data.confidence * 100}%` }}
            />
          </div>
          {Math.round(data.confidence * 100)}% confidence
        </span>
      </div>
    </div>
  );
}
