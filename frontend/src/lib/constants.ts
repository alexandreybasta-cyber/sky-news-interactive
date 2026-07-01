export const AVATAR_STATES = {
  IDLE: "idle",
  LISTEN: "listen",
  THINK: "think",
  PRESENT: "present",
} as const;

export type AvatarState = (typeof AVATAR_STATES)[keyof typeof AVATAR_STATES];

export const MESSAGE_TYPES = {
  // From tablet to server
  TEXT_INPUT: "text_input",
  // From server to clients
  AVATAR_STATE_CHANGE: "avatar_state_change",
  SPEECH_RESULT: "speech_result",
  NEWS_RESULT: "news_result",
  VIDEO_RESULT: "video_result",
  AVATAR_STREAM: "avatar_stream",
  ERROR: "error",
} as const;

export const TIMEOUTS = {
  IDLE_RETURN: 30000, // Return to idle after 30s
  RECONNECT_DELAY: 3000, // WebSocket reconnect delay
  MAX_LISTEN_TIME: 15000, // Max listening time
};

export interface NewsData {
  headline: string;
  summary: string;
  key_facts: string[];
  video_search_term: string;
  sources: string[];
  confidence: number;
}

export interface VideoData {
  video_url: string;
  video_id: string;
  thumbnail: string;
  title: string;
}

export interface AvatarStreamData {
  stream_url: string | null;
  stream_id: string | null;
  audio_url: string | null;
}

export interface WSMessage {
  type: string;
  session_id: string;
  timestamp: number;
  payload: Record<string, unknown>;
}
