"use client";
// ── SSE Context — replaces socket.tsx ────────────────────────────────────────
import {
  createContext, useContext, useEffect, useRef,
  useState, useMemo, useCallback, ReactNode,
} from "react";
import { BACKEND } from "./api";

// All named SSE events the server can emit
const SSE_EVENTS = [
  "room_update",
  "your_role",
  "your_debate_role",
  "draw_your_word",
  "draw_stroke",
  "draw_clear",
  "draw_guess_correct",
  "draw_guess_wrong",
  "bomb_exploded",
  "word_bomb_new_pattern",
  "bomber_grid",
  "bomber_state",
  "error_msg",
] as const;

type SseEventName = typeof SSE_EVENTS[number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (data: any) => void;

interface SseCtx {
  /** Subscribe to a named SSE event */
  on: (event: SseEventName, handler: Handler) => void;
  /** Unsubscribe from a named SSE event */
  off: (event: SseEventName, handler: Handler) => void;
  /** Open the SSE stream for a room+player */
  connect: (code: string, playerId: string) => void;
  /** Close the SSE stream */
  disconnect: () => void;
  connected: boolean;
}

const Ctx = createContext<SseCtx>({
  on: () => {}, off: () => {}, connect: () => {}, disconnect: () => {}, connected: false,
});

export function SseProvider({ children }: Readonly<{ children: ReactNode }>) {
  const listeners = useRef<Map<string, Set<Handler>>>(new Map());
  const esRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);

  // Dispatch an event to all registered handlers
  const emit = useCallback((event: string, data: unknown) => {
    listeners.current.get(event)?.forEach(h => h(data));
  }, []);

  const connect = useCallback((code: string, playerId: string) => {
    esRef.current?.close();
    const url = `${BACKEND}/stream/${code}?playerId=${encodeURIComponent(playerId)}`;
    const es = new EventSource(url);
    esRef.current = es;

    SSE_EVENTS.forEach(evt => {
      es.addEventListener(evt, (e: Event) => {
        try { emit(evt, JSON.parse((e as MessageEvent).data)); } catch { /* malformed */ }
      });
    });

    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
  }, [emit]);

  const disconnect = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setConnected(false);
  }, []);

  const on = useCallback((event: SseEventName, handler: Handler) => {
    if (!listeners.current.has(event)) listeners.current.set(event, new Set());
    listeners.current.get(event)!.add(handler);
  }, []);

  const off = useCallback((event: SseEventName, handler: Handler) => {
    listeners.current.get(event)?.delete(handler);
  }, []);

  // Clean up on unmount
  useEffect(() => () => { esRef.current?.close(); }, []);

  const value = useMemo(
    () => ({ on, off, connect, disconnect, connected }),
    [on, off, connect, disconnect, connected]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSse = () => useContext(Ctx);
