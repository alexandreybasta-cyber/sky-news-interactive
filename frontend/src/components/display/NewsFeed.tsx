"use client";
import { useState, useEffect } from "react";

interface Article {
  title: string;
  category: string;
  url: string;
  image_url: string;
  snippet: string;
  timestamp: string;
}

interface NewsFeedProps {
  articles: Article[];
}

export default function NewsFeed({ articles }: NewsFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-rotate every 6 seconds
  useEffect(() => {
    if (articles.length === 0) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % articles.length);
        setIsTransitioning(false);
      }, 500);
    }, 6000);

    return () => clearInterval(interval);
  }, [articles.length]);

  if (articles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-2xl text-gray-400 animate-pulse">
          Loading news feed...
        </div>
      </div>
    );
  }

  const currentArticle = articles[currentIndex];
  const nextArticles = articles.slice(currentIndex + 1, currentIndex + 4);
  const upcomingArticles =
    nextArticles.length < 3
      ? [...nextArticles, ...articles.slice(0, 3 - nextArticles.length)]
      : nextArticles;

  return (
    <div className="h-full w-full flex flex-col">
      {/* Main Featured Article */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className={`absolute inset-0 transition-all duration-500 ${
            isTransitioning
              ? "opacity-0 scale-95"
              : "opacity-100 scale-100"
          }`}
        >
          {/* Background image with overlay */}
          {currentArticle.image_url && (
            <div className="absolute inset-0">
              <img
                src={currentArticle.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </div>
          )}

          {/* If no image, use orange gradient */}
          {!currentArticle.image_url && (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-white" />
          )}

          {/* Content overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-12">
            {/* Category badge */}
            <span className="inline-block px-4 py-1.5 bg-orange-500 text-white text-sm font-bold rounded-full mb-4 uppercase tracking-wide">
              {currentArticle.category}
            </span>

            {/* Headline */}
            <h1
              className={`text-5xl font-bold leading-tight mb-4 ${
                currentArticle.image_url ? "text-white" : "text-gray-900"
              }`}
            >
              {currentArticle.title}
            </h1>

            {/* Snippet */}
            {currentArticle.snippet && (
              <p
                className={`text-xl leading-relaxed max-w-3xl ${
                  currentArticle.image_url
                    ? "text-gray-200"
                    : "text-gray-600"
                }`}
              >
                {currentArticle.snippet}
              </p>
            )}

            {/* Timestamp */}
            {currentArticle.timestamp && (
              <p
                className={`mt-4 text-sm ${
                  currentArticle.image_url
                    ? "text-gray-300"
                    : "text-gray-500"
                }`}
              >
                {currentArticle.timestamp}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom ticker — upcoming articles */}
      <div className="h-[15%] bg-white border-t border-gray-100 flex items-center px-8 gap-6 overflow-hidden">
        {upcomingArticles.map((article, idx) => (
          <div
            key={`${article.title}-${idx}`}
            className="flex-1 flex items-center gap-4 p-4 rounded-xl bg-gray-50 min-w-0"
          >
            {article.image_url && (
              <img
                src={article.image_url}
                alt=""
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <span className="text-xs font-bold text-orange-500 uppercase">
                {article.category}
              </span>
              <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                {article.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div className="h-full bg-orange-500 animate-progress-bar" />
      </div>
    </div>
  );
}
