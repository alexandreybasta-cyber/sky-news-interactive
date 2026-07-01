"use client";
import { useState, useEffect, useRef } from "react";

interface Article {
  title: string;
  category: string;
  url: string;
  image_url: string;
  snippet: string;
  timestamp: string;
}

interface NewsTilesProps {
  articles: Article[];
}

export default function NewsTiles({ articles }: NewsTilesProps) {
  const [batchIndex, setBatchIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const TILES_PER_BATCH = 4; // 1 featured + 3 small
  const ROTATION_INTERVAL = 10000; // 10 seconds

  // Auto-rotate every 10 seconds
  useEffect(() => {
    if (articles.length === 0) return;
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setBatchIndex((prev) => {
          const maxBatches = Math.ceil(articles.length / TILES_PER_BATCH);
          return (prev + 1) % maxBatches;
        });
        setIsTransitioning(false);
      }, 600);
    }, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, [articles.length]);

  // Reset progress bar animation on batch change
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.style.animation = "none";
      // Force reflow
      void progressRef.current.offsetHeight;
      progressRef.current.style.animation = "";
    }
  }, [batchIndex]);

  if (articles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-xl text-gray-400 font-medium">
            Loading news...
          </div>
        </div>
      </div>
    );
  }

  const startIdx = (batchIndex * TILES_PER_BATCH) % articles.length;
  const currentBatch: Article[] = [];
  for (let i = 0; i < TILES_PER_BATCH; i++) {
    currentBatch.push(articles[(startIdx + i) % articles.length]);
  }

  const featured = currentBatch[0];
  const sideTiles = currentBatch.slice(1);

  return (
    <div className="h-full w-full flex flex-col bg-gray-950">
      {/* Main grid */}
      <div
        className={`flex-1 grid grid-cols-3 grid-rows-3 gap-1 p-1 transition-all duration-500 ease-in-out ${
          isTransitioning
            ? "opacity-0 scale-[0.97]"
            : "opacity-100 scale-100"
        }`}
      >
        {/* Featured tile — spans 2 cols, 3 rows */}
        <div className="col-span-2 row-span-3 relative overflow-hidden rounded-lg group cursor-pointer">
          {featured.image_url ? (
            <img
              src={featured.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover animate-ken-burns"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-orange-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Play indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <svg
              className="w-7 h-7 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>

          {/* Category */}
          <span className="absolute top-4 left-4 px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded uppercase tracking-wider shadow-lg">
            {featured.category}
          </span>

          {/* Headline */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <h1 className="text-4xl font-bold text-white leading-tight drop-shadow-lg">
              {featured.title}
            </h1>
            {featured.snippet && (
              <p className="text-lg text-gray-200 mt-3 line-clamp-2 drop-shadow-md max-w-2xl">
                {featured.snippet}
              </p>
            )}
          </div>
        </div>

        {/* Side tiles — each takes 1 col, 1 row */}
        {sideTiles.map((article, idx) => (
          <div
            key={`${batchIndex}-${idx}`}
            className="relative overflow-hidden rounded-lg group cursor-pointer"
            style={{
              animationDelay: `${(idx + 1) * 100}ms`,
            }}
          >
            {article.image_url ? (
              <img
                src={article.image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-900" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Play indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <svg
                className="w-4 h-4 text-white ml-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>

            {/* Category */}
            <span className="absolute top-3 left-3 px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-md">
              {article.category}
            </span>

            {/* Headline */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h2 className="text-base font-bold text-white leading-snug line-clamp-3 drop-shadow-lg">
                {article.title}
              </h2>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-900">
        <div
          ref={progressRef}
          className="h-full bg-orange-500 animate-progress-bar-tiles"
        />
      </div>
    </div>
  );
}
