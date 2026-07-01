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
        src={`${videoData.video_url}?autoplay=1&mute=0&controls=1`}
        title={videoData.title}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      />

      {/* News info bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-8">
        <span className="inline-block px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full mb-3 uppercase">
          Breaking
        </span>
        <h2 className="text-3xl font-bold text-white mb-2">
          {newsData.headline}
        </h2>
        <p className="text-lg text-gray-300 max-w-2xl">{newsData.summary}</p>
      </div>
    </div>
  );
}
