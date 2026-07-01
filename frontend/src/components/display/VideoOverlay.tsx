"use client";
import { NewsData, VideoData } from "@/lib/constants";

interface VideoOverlayProps {
  newsData: NewsData;
  videoData: VideoData;
  onClose?: () => void;
}

export default function VideoOverlay({
  newsData,
  videoData,
}: VideoOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 bg-black animate-fade-in">
      {/* Full-screen video */}
      <iframe
        width="100%"
        height="100%"
        src={`${videoData.video_url}?autoplay=1&mute=1&playsinline=1&controls=0&showinfo=0&rel=0&enablejsapi=1`}
        title={videoData.title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />

      {/* News info bar at bottom-left */}
      <div className="absolute bottom-0 left-0 p-8 max-w-[60%]">
        <span className="inline-block px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full mb-3 uppercase">
          Breaking
        </span>
        <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
          {newsData.headline}
        </h2>
        <p className="text-lg text-gray-200 drop-shadow-md">{newsData.summary}</p>
      </div>
    </div>
  );
}
