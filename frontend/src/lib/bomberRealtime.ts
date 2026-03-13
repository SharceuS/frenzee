"use client";
// Dedicated realtime transport module for Bomb Arena gameplay.
//
// Owns: WebSocket connection to ws://.../ws/bomb-arena/:code?playerId=...,
// reading { type, data } messages for "bomber_grid" and "bomber_state".
// Also owns the HTTP latency probe and input dispatch.
//
// Design intent: BombermanScreen.tsx has no direct knowledge of which
// transport mechanism is in use. This file is the only thing that changed
// when the transport was upgraded from SSE to WebSocket (RT-02).
//
// Reconciliation hook: pass `onState` in `opts` to inject server-reconciliation
// logic from the screen (e.g. syncing localGridRef) without stale closures.

import { useEffect, useRef, useCallback } from "react";
import { BACKEND } from "./api";
import { apiBombermanInput, apiBombermanPing } from "./api";

// ── Shared state shape (mirrors the server bomber_state event) ────────────────
export interface BomberPlayer {
    id: string;
    fromR: number | null; fromC: number | null;
    toR: number | null;   toC: number | null;
    progress: number; speedMult: number; alive: boolean;
}

export interface BomberRealtimeState {
    players: BomberPlayer[];
    bombs: { r: number; c: number; timer: number; ownerId: string; range: number }[];
    explosions: { tiles: { r: number; c: number }[]; centerR: number; centerC: number; expiresAt: number }[];
    powerups: { r: number; c: number; type: "range" | "speed" }[];
    gameOver: boolean;
    seq?: number;
}

const EMPTY_STATE: BomberRealtimeState = {
    players: [], bombs: [], explosions: [], powerups: [], gameOver: false,
};

// ── WebSocket URL derivation ──────────────────────────────────────────────────
// Convert the HTTP BACKEND base to a WS URL, handling both http:// and https://.
function wsUrl(code: string, playerId: string): string {
    const base = BACKEND.replace(/^http/, "ws");
    return `${base}/ws/bomb-arena/${code}?playerId=${encodeURIComponent(playerId)}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useBomberRealtime — isolated transport hook for Bomb Arena gameplay.
 *
 * Connects via WebSocket to ws://.../ws/bomb-arena/:code?playerId=...
 * and reads { type: "bomber_grid" | "bomber_state", data } messages.
 *
 * Returns refs (not React state) so the 60fps render loop stays detached
 * from React re-renders.
 *
 * @param code      Room code
 * @param playerId  Local player id
 * @param opts.onState  Optional callback fired on every server state snapshot,
 *                      after stateRef is updated. Use this to run
 *                      server-reconciliation logic that lives in the screen
 *                      (e.g. syncing localGridRef).
 */
export function useBomberRealtime(
    code: string,
    playerId: string,
    opts?: { onState?: (state: BomberRealtimeState) => void },
) {
    const gridRef    = useRef<number[][] | null>(null);
    const stateRef   = useRef<BomberRealtimeState>(EMPTY_STATE);
    const latencyRef = useRef<number>(0);

    // Keep opts in a ref so the message handler never captures a stale closure
    const optsRef = useRef(opts);
    useEffect(() => { optsRef.current = opts; });

    // ── WebSocket connection ──────────────────────────────────────────────────
    useEffect(() => {
        const ws = new WebSocket(wsUrl(code, playerId));

        ws.onmessage = (event: MessageEvent) => {
            let msg: { type: string; data: unknown };
            try { msg = JSON.parse(event.data as string); } catch { return; }

            if (msg.type === "bomber_grid") {
                gridRef.current = msg.data as number[][];
            } else if (msg.type === "bomber_state") {
                stateRef.current = msg.data as BomberRealtimeState;
                optsRef.current?.onState?.(stateRef.current);
            }
        };

        // Absorb errors — the WS will close and the screen will transition away
        // via the normal room_update / phase change on the SSE channel.
        ws.onerror = () => {};

        return () => {
            ws.close();
        };
    // code and playerId are stable for the lifetime of a Bomb Arena round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Periodic latency probe ────────────────────────────────────────────────
    useEffect(() => {
        const ping = async () => {
            const t0 = Date.now();
            const res = await apiBombermanPing(code, t0).catch(() => null);
            if (res) latencyRef.current = Date.now() - t0;
        };
        ping();
        const iv = setInterval(ping, 1000);
        return () => clearInterval(iv);
    // code is stable for the lifetime of a Bomb Arena round
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Input dispatch (stays on HTTP POST) ──────────────────────────────────
    const sendInput = useCallback((dx: number, dy: number, bomb: boolean) => {
        apiBombermanInput(code, playerId, dx, dy, bomb);
    }, [code, playerId]);

    return { gridRef, stateRef, latencyRef, sendInput };
}

