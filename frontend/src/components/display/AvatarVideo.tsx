"use client";
import { useRef, useEffect, useState } from "react";
import { AvatarState, AVATAR_STATES } from "@/lib/constants";

interface AvatarVideoProps {
  state: AvatarState;
  streamUrl: string | null;
  audioUrl: string | null;
  onError?: () => void;
}

export default function AvatarVideo({ state, streamUrl, audioUrl, onError }: AvatarVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [videoError, setVideoError] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Handle HLS stream when streamUrl changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (streamUrl && state === AVATAR_STATES.PRESENT) {
      // Switch to HLS stream
      setVideoError(false);
      setIsStreaming(true);

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = streamUrl;
        video.muted = false;
        video.play().catch(console.error);
      } else if (typeof window !== "undefined") {
        // Other browsers via hls.js (dynamic import for SSR safety)
        import("hls.js").then(({ default: Hls }) => {
          if (!Hls.isSupported()) return;
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });
          hls.loadSource(streamUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.muted = false;
            video.play().catch(console.error);
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              console.error("HLS fatal error:", data);
              setVideoError(true);
              setIsStreaming(false);
              hls.destroy();
            }
          });
          hlsRef.current = hls;
        });
      }
    } else {
      // Back to idle - destroy HLS and play idle loop
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setIsStreaming(false);
      video.src = "/videos/presenter-idle.mp4";
      video.muted = true;
      video.loop = true;
      video.play().catch(() => {}); // May fail if no video file yet
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, state]);

  // Handle audio fallback
  useEffect(() => {
    if (audioUrl && state === AVATAR_STATES.PRESENT && !streamUrl) {
      const audio = audioRef.current;
      if (audio) {
        audio.src = `http://localhost:8000${audioUrl}`;
        audio.play().catch(console.error);
      }
    }
  }, [audioUrl, state, streamUrl]);

  // Determine CSS classes based on state
  const getVideoClasses = () => {
    const base = "w-full h-full object-cover transition-all duration-700 ease-in-out";
    switch (state) {
      case AVATAR_STATES.IDLE:
        return `${base} scale-100 animate-breathe`;
      case AVATAR_STATES.LISTEN:
        return `${base} scale-105`;
      case AVATAR_STATES.THINK:
        return `${base} scale-100 opacity-90`;
      case AVATAR_STATES.PRESENT:
        return `${base} scale-100`;
      default:
        return base;
    }
  };

  // If video completely fails, notify parent to show SVG fallback
  useEffect(() => {
    if (videoError && !streamUrl && onError) {
      onError();
    }
  }, [videoError, streamUrl, onError]);

  if (videoError && !streamUrl) {
    return null;
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-gray-900">
      {/* Main video element */}
      <video
        ref={videoRef}
        className={getVideoClasses()}
        playsInline
        autoPlay
        muted={!isStreaming}
        loop={!isStreaming}
        onError={() => setVideoError(true)}
      >
        <source src="/videos/presenter-idle.mp4" type="video/mp4" />
      </video>

      {/* Hidden audio element for TTS fallback */}
      <audio ref={audioRef} className="hidden" />

      {/* Overlay animations per state */}
      {state === AVATAR_STATES.LISTEN && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-40 h-40 rounded-full border-4 border-orange-400 animate-pulse-ring" />
          <div className="absolute w-52 h-52 rounded-full border-4 border-orange-300 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
          <div className="absolute w-64 h-64 rounded-full border-4 border-orange-200 animate-pulse-ring" style={{ animationDelay: "1s" }} />
        </div>
      )}

      {state === AVATAR_STATES.THINK && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex gap-3">
            <div className="w-4 h-4 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
            <div className="w-4 h-4 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
            <div className="w-4 h-4 bg-orange-300 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>
      )}

      {/* Caption bar when presenting */}
      {state === AVATAR_STATES.PRESENT && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-lg px-6 py-3 text-center backdrop-blur-sm">
          {isStreaming ? "Live Avatar" : audioUrl ? "Audio Narration" : ""}
        </div>
      )}
    </div>
  );
}
