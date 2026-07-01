"use client";
import { useState, useCallback } from "react";
import { useSession } from "@/lib/useSession";
import {
  AvatarState,
  AVATAR_STATES,
  MESSAGE_TYPES,
  NewsData,
  VideoData,
  WSMessage,
} from "@/lib/constants";
import AvatarVideo from "@/components/display/AvatarVideo";
import AvatarFallback from "@/components/display/AvatarFallback";
import NewsCard from "@/components/display/NewsCard";
import VideoPlayer from "@/components/display/VideoPlayer";
import StatusBar from "@/components/display/StatusBar";

export default function DisplayPage() {
  const [avatarState, setAvatarState] = useState<AvatarState>(
    AVATAR_STATES.IDLE
  );
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [useVideoAvatar, setUseVideoAvatar] = useState(true);

  const handleMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case MESSAGE_TYPES.AVATAR_STATE_CHANGE:
        setAvatarState(msg.payload.state as AvatarState);
        if (msg.payload.state === AVATAR_STATES.IDLE) {
          setNewsData(null);
          setVideoData(null);
          setTranscript("");
          setStreamUrl(null);
          setAudioUrl(null);
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
      case MESSAGE_TYPES.AVATAR_STREAM:
        setStreamUrl(msg.payload.stream_url as string | null);
        setAudioUrl(msg.payload.audio_url as string | null);
        break;
    }
  }, []);

  const { isConnected, sessionId } = useSession(handleMessage);

  const showContent = avatarState === AVATAR_STATES.PRESENT && newsData;

  return (
    <div className="relative h-screen w-screen bg-white flex overflow-hidden">
      {/* Left Panel - Avatar */}
      <div
        className={`flex items-center justify-center transition-all duration-700 ease-in-out ${showContent ? "w-1/3" : "w-full"}`}
      >
        <div className="flex flex-col items-center">
          {useVideoAvatar ? (
            <AvatarVideo
              state={avatarState}
              streamUrl={streamUrl}
              audioUrl={audioUrl}
              onError={() => setUseVideoAvatar(false)}
            />
          ) : (
            <AvatarFallback state={avatarState} />
          )}

          {/* Status text below avatar */}
          <div className="mt-8 text-center">
            {avatarState === AVATAR_STATES.IDLE && (
              <p className="text-2xl text-gray-400 animate-breathe">
                Ask me anything...
              </p>
            )}
            {avatarState === AVATAR_STATES.LISTEN && (
              <p className="text-2xl text-orange-500 font-medium">
                Listening...
              </p>
            )}
            {avatarState === AVATAR_STATES.THINK && (
              <div className="flex flex-col items-center">
                <p className="text-2xl text-orange-600 font-medium mb-2">
                  Thinking...
                </p>
                {transcript && (
                  <p className="text-lg text-gray-500 italic">
                    &ldquo;{transcript}&rdquo;
                  </p>
                )}
              </div>
            )}
            {avatarState === AVATAR_STATES.PRESENT && transcript && (
              <p className="text-lg text-gray-400 italic">
                &ldquo;{transcript}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - News + Video (slides in when presenting) */}
      {showContent && (
        <div className="w-2/3 p-12 flex flex-col justify-center overflow-y-auto">
          <NewsCard data={newsData} />
          {videoData && (
            <VideoPlayer videoUrl={videoData.video_url} title={videoData.title} />
          )}
        </div>
      )}

      {/* Status Bar */}
      <StatusBar isConnected={isConnected} sessionId={sessionId} />
    </div>
  );
}
