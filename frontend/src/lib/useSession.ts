"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { WebSocketClient } from "./websocket";
import { WSMessage } from "./constants";

function generateSessionId(): string {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("session");
    if (id) return id;
  }
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useSession(onMessage?: (msg: WSMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const clientRef = useRef<WebSocketClient | null>(null);
  const onMessageRef = useRef(onMessage);

  onMessageRef.current = onMessage;

  useEffect(() => {
    const id = generateSessionId();
    setSessionId(id);

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const client = new WebSocketClient(`${wsUrl}/ws/session/${id}`);

    client.onopen = () => setIsConnected(true);
    client.onclose = () => setIsConnected(false);
    client.onmessage = (msg) => onMessageRef.current?.(msg as WSMessage);

    clientRef.current = client;

    return () => {
      client.close();
    };
  }, []);

  const sendMessage = useCallback(
    (type: string, payload: Record<string, unknown>) => {
      clientRef.current?.send({
        type,
        session_id: sessionId,
        timestamp: Date.now() / 1000,
        payload,
      });
    },
    [sessionId]
  );

  return { isConnected, sessionId, sendMessage };
}
