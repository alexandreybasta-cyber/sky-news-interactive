"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/useSession";
import {
  AvatarState,
  AVATAR_STATES,
  MESSAGE_TYPES,
  NewsData,
  VideoData,
  WSMessage,
} from "@/lib/constants";
import NewsFeed from "@/components/display/NewsFeed";
import VideoOverlay from "@/components/display/VideoOverlay";

interface Article {
  title: string;
  category: string;
  url: string;
  image_url: string;
  snippet: string;
  timestamp: string;
}

export default function DisplayPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [avatarState, setAvatarState] = useState<AvatarState>(
    AVATAR_STATES.IDLE
  );
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [transcript, setTranscript] = useState("");

  // Fetch news feed on mount and every 5 minutes
  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
        const resp = await fetch(`${apiUrl}/news/feed`);
        if (resp.ok) {
          const data = await resp.json();
          setArticles(data.articles || []);
        }
      } catch (e) {
        console.error("Failed to fetch news feed:", e);
      }
    };

    fetchFeed();
    const interval = setInterval(fetchFeed, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket message handler
  const handleMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case MESSAGE_TYPES.AVATAR_STATE_CHANGE:
        setAvatarState(msg.payload.state as AvatarState);
        if (msg.payload.state === AVATAR_STATES.IDLE) {
          setNewsData(null);
          setVideoData(null);
          setTranscript("");
        }
        break;
      case MESSAGE_TYPES.SPEECH_RESULT:
        setTranscript(msg.payload.text as string);
        break;
      case MESSAGE_TYPES.NEWS_RESULT:
        setNewsData(msg.payload as unknown as NewsData);
        break;
      case MESSAGE_TYPES.VIDEO_RESULT:
        setVideoData(msg.payload as unknown as VideoData);
        break;
    }
  }, []);

  const { isConnected } = useSession(handleMessage);

  const showVideo =
    avatarState === AVATAR_STATES.PRESENT && newsData && videoData;

  return (
    <div className="relative h-screen w-screen bg-white overflow-hidden">
      {/* Main News Feed (always renders, gets covered by video overlay) */}
      <NewsFeed articles={articles} />

      {/* Listening indicator - subtle corner notification */}
      {avatarState === AVATAR_STATES.LISTEN && (
        <div className="absolute top-6 right-6 z-20 flex items-center gap-3 bg-orange-500 text-white px-5 py-3 rounded-full shadow-lg animate-fade-in">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          <span className="font-medium">Listening...</span>
        </div>
      )}

      {/* Thinking overlay - top bar */}
      {avatarState === AVATAR_STATES.THINK && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-orange-500/90 text-white px-8 py-4 flex items-center justify-center gap-3 animate-slide-down backdrop-blur-sm">
          <div className="flex gap-2">
            <div
              className="w-2.5 h-2.5 bg-white rounded-full animate-bounce"
              style={{ animationDelay: "0s" }}
            />
            <div
              className="w-2.5 h-2.5 bg-white rounded-full animate-bounce"
              style={{ animationDelay: "0.15s" }}
            />
            <div
              className="w-2.5 h-2.5 bg-white rounded-full animate-bounce"
              style={{ animationDelay: "0.3s" }}
            />
          </div>
          <span className="text-lg font-medium">
            Finding relevant news for: &ldquo;{transcript}&rdquo;
          </span>
        </div>
      )}

      {/* Video Overlay - covers everything when presenting */}
      {showVideo && <VideoOverlay newsData={newsData} videoData={videoData} />}

      {/* Connection status */}
      <div className="absolute bottom-3 left-4 z-40 flex items-center gap-2 text-xs text-gray-400">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? "bg-green-500" : "bg-red-500"
          }`}
        />
        <span>{isConnected ? "Live" : "Reconnecting..."}</span>
      </div>
    </div>
  );
}
