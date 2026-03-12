"use client";
import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Room } from "@/lib/types";
import { useSocket } from "@/lib/socket";

// ── Constants (must mirror server) ───────────────────────────────────────────
const BOMBER_COLS = 15;
const BOMBER_ROWS = 13;
const BOMBER_GRID_SPEED = 7.0; // tiles / second (must match server)
const PLAYER_COLORS = ["#7C3AED", "#EF4444", "#10B981", "#F59E0B"];
const BOMBER_BOMB_MS = 2000; // must match server BOMBER_BOMB_MS

interface Props { room: Room; myId: string; }

// ── Tile-level collision (mirrors server bomberTileBlocked) ───────────────────
function isTileBlocked(
    grid: number[][],
    bombs: { r: number; c: number }[],
    passBombKey: string | null,
    r: number, c: number
): boolean {
    if (r < 0 || r >= BOMBER_ROWS || c < 0 || c >= BOMBER_COLS) return true;
    if (grid[r][c] === 1 || grid[r][c] === 2) return true;
    return bombs.some(b => b.r === r && b.c === c && `${b.r},${b.c}` !== passBombKey);
}

// ── Direction from held keys (priority: up > down > left > right) ─────────────
function getDir(dirs: Set<string>): [number, number] {
    if (dirs.has("up")) return [-1, 0];
    if (dirs.has("down")) return [1, 0];
    if (dirs.has("left")) return [0, -1];
    if (dirs.has("right")) return [0, 1];
    return [0, 0];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BombermanScreen({ room, myId }: Props) {
    const { socket } = useSocket();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const roomRef = useRef(room);
    const dirsRef = useRef<Set<string>>(new Set());
    const rafRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const sendTsRef = useRef<number>(0);   // throttle socket sends to ~30 Hz
    const bombQueueRef = useRef(false);
    const latencyRef = useRef<number>(0); // round-trip time in ms    
    const localPassBombRef = useRef<string | null>(null); // bomb tile key player can still walk through
    // Cached grid — only updated when server sends a new one (null means no change)
    const gridCacheRef = useRef<number[][] | null>(null);
    // My predicted grid state (60fps); null until server gives us first position
    const localGridRef = useRef<{ fromR: number; fromC: number; toR: number; toC: number; progress: number } | null>(null);

    // Keep roomRef up-to-date, cache grid when server sends it, reconcile prediction
    useEffect(() => {
        roomRef.current = room;
        // Cache grid whenever server sends it (only sent on init + wall changes)
        if (room.bomberGrid) {
            gridCacheRef.current = room.bomberGrid;
        }
        const me = room.players.find(p => p.id === myId);
        if (me?.bomberFromR != null && me.bomberToR != null) {
            if (localGridRef.current === null) {
                // First time: hard snap
                localGridRef.current = {
                    fromR: me.bomberFromR!, fromC: me.bomberFromC!,
                    toR: me.bomberToR!, toC: me.bomberToC!,
                    progress: me.bomberMoveProgress ?? 1.0,
                };
            } else {
                const lg = localGridRef.current;
                // If server tile trajectory differs: snap (means we went out of sync)
                if (
                    me.bomberFromR !== lg.fromR || me.bomberFromC !== lg.fromC ||
                    me.bomberToR !== lg.toR || me.bomberToC !== lg.toC
                ) {
                    localGridRef.current = {
                        fromR: me.bomberFromR!, fromC: me.bomberFromC!,
                        toR: me.bomberToR!, toC: me.bomberToC!,
                        progress: me.bomberMoveProgress ?? 1.0,
                    };
                }
                // Otherwise keep our client-predicted progress (smoother)
            }
        }
    }, [room, myId]);

    // ── Latency ping/pong ─────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const ping = () => socket.emit("ping_bomber", { ts: Date.now() });
        const onPong = ({ ts }: { ts: number }) => { latencyRef.current = Date.now() - ts; };
        socket.on("pong_bomber", onPong);
        ping(); // immediate first ping
        const iv = setInterval(ping, 1000);
        return () => { clearInterval(iv); socket.off("pong_bomber", onPong); };
    }, [socket]);

    // ── Flush current input to server (called at ~30fps from RAF loop) ────────
    const flushInput = useCallback((bomb = false) => {
        const [ndr, ndc] = getDir(dirsRef.current);
        socket?.emit("bomberman_input", { code: room.code, dx: ndc, dy: ndr, bomb });
        bombQueueRef.current = false;
    }, [socket, room.code]);

    // ── Keyboard ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const KEYS: Record<string, string> = {
            ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
            KeyA: "left", KeyD: "right", KeyW: "up", KeyS: "down",
        };
        const down = (e: KeyboardEvent) => {
            if (KEYS[e.code]) {
                e.preventDefault();
                dirsRef.current.add(KEYS[e.code]);
                flushInput(); // send immediately so server reacts at once
            }
            if (e.code === "Space") { e.preventDefault(); bombQueueRef.current = true; flushInput(true); }
        };
        const up = (e: KeyboardEvent) => {
            if (KEYS[e.code]) {
                dirsRef.current.delete(KEYS[e.code]);
                flushInput(); // ← send stop immediately so server doesn't skid
            }
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
    }, []);

    // ── RAF game loop: predict at 60fps, send input at ~30fps ────────────────
    useEffect(() => {
        const loop = (ts: number) => {
            const dt = Math.min((ts - (lastTimeRef.current || ts)) / 1000, 0.05);
            lastTimeRef.current = ts;

            const r = roomRef.current;
            const grid = gridCacheRef.current ?? r.bomberGrid; // use cached grid
            const me = r.players.find(p => p.id === myId);
            const bombs = r.bomberBombs ?? [];

            // Grid-based bomb grace-period tracking
            if (localPassBombRef.current) {
                const [pr, pc] = localPassBombRef.current.split(',').map(Number);
                if (!bombs.some(b => b.r === pr && b.c === pc)) {
                    localPassBombRef.current = null; // bomb exploded
                } else if (localGridRef.current) {
                    // Clear once player's SOURCE tile is no longer the bomb tile
                    const lg = localGridRef.current;
                    if (lg.fromR !== pr || lg.fromC !== pc) {
                        localPassBombRef.current = null;
                    }
                }
            }
            // Detect new bomb placed on our current tile
            if (!localPassBombRef.current && localGridRef.current) {
                const lg = localGridRef.current;
                const mine = bombs.find(b => b.r === lg.toR && b.c === lg.toC && b.ownerId === myId);
                if (mine) localPassBombRef.current = `${mine.r},${mine.c}`;
            }

            // Grid-based client-side prediction (my player only)
            if (grid && localGridRef.current && me?.bomberAlive !== false) {
                const lg = localGridRef.current;
                const speedMult = me?.bomberSpeedMult ?? 1;
                const step = BOMBER_GRID_SPEED * speedMult * dt;

                if (lg.progress < 1.0) {
                    lg.progress += step;
                    if (lg.progress >= 1.0) {
                        const overflow = lg.progress - 1.0;
                        lg.fromR = lg.toR; lg.fromC = lg.toC;
                        // Clear pass key once we've left the bomb tile
                        if (localPassBombRef.current) {
                            const [pr, pc] = localPassBombRef.current.split(',').map(Number);
                            if (lg.fromR !== pr || lg.fromC !== pc) localPassBombRef.current = null;
                        }
                        const [ndr, ndc] = getDir(dirsRef.current);
                        if (
                            (ndr !== 0 || ndc !== 0) &&
                            !isTileBlocked(grid, bombs, localPassBombRef.current, lg.fromR + ndr, lg.fromC + ndc)
                        ) {
                            lg.toR = lg.fromR + ndr; lg.toC = lg.fromC + ndc;
                            lg.progress = Math.max(0, overflow);
                        } else {
                            lg.toR = lg.fromR; lg.toC = lg.fromC;
                            lg.progress = 1.0;
                        }
                    }
                } else {
                    const [ndr, ndc] = getDir(dirsRef.current);
                    if (
                        (ndr !== 0 || ndc !== 0) &&
                        !isTileBlocked(grid, bombs, localPassBombRef.current, lg.fromR + ndr, lg.fromC + ndc)
                    ) {
                        lg.toR = lg.fromR + ndr; lg.toC = lg.fromC + ndc;
                        lg.progress = BOMBER_GRID_SPEED * (me?.bomberSpeedMult ?? 1) * dt;
                    }
                }
            }

            // Send input to server at ~30fps
            if (ts - sendTsRef.current >= 33) {
                sendTsRef.current = ts;
                const bomb = bombQueueRef.current;
                const anyDir = dirsRef.current.size > 0;
                if (anyDir || bomb) flushInput(bomb);
            }

            // Draw
            const canvas = canvasRef.current;
            const container = containerRef.current;
            if (canvas && container && grid) {
                const W = container.clientWidth;
                const T = Math.floor(W / BOMBER_COLS);
                const H = T * BOMBER_ROWS;
                if (canvas.width !== W) canvas.width = W;
                if (canvas.height !== H) canvas.height = H;
                const ctx = canvas.getContext("2d");
                if (ctx) drawBomberman(ctx, T, r, myId, localGridRef.current, latencyRef.current, gridCacheRef.current);
            }

            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(rafRef.current);
    }, [myId, flushInput]);

    // ── D-pad helpers ─────────────────────────────────────────────────────────
    const dpad = (dir: string) => ({
        onPointerDown: (e: React.PointerEvent) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            dirsRef.current.add(dir);
            flushInput(); // immediate send on touch — critical for mobile responsiveness
        },
        onPointerUp: () => { dirsRef.current.delete(dir); flushInput(); },
        onPointerLeave: () => { dirsRef.current.delete(dir); flushInput(); },
        onPointerCancel: () => { dirsRef.current.delete(dir); flushInput(); },
    });

    const myPlayer = room.players.find(p => p.id === myId);
    const isAlive = myPlayer?.bomberAlive !== false;
    const gameOver = room.bomberGameOver;

    return (
        <div className="page-fill gap-0" style={{ background: "#0a0a1a" }}>
            {/* HUD */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2">
                <div className="round-pill">💥 Round {room.round}/{room.maxRounds}</div>
                <div className="flex gap-3">
                    {room.players.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full flex-shrink-0 transition-all"
                                style={{ background: PLAYER_COLORS[i % 4], opacity: p.bomberAlive === false ? 0.25 : 1 }} />
                            <span className="font-nunito text-xs" style={{ color: p.bomberAlive === false ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)" }}>
                                {p.name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Canvas */}
            <div ref={containerRef} className="flex-shrink-0 w-full">
                <canvas ref={canvasRef} style={{ display: "block", width: "100%", imageRendering: "pixelated" }} />
            </div>

            {/* Dead overlay */}
            {!isAlive && !gameOver && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                    style={{ background: "rgba(0,0,0,0.55)" }}>
                    <div className="text-center">
                        <div className="text-7xl mb-2">💀</div>
                        <p className="font-fredoka text-3xl text-red-400">You&apos;re out!</p>
                        <p className="font-nunito text-white/40 text-sm mt-1">Waiting for round to end…</p>
                    </div>
                </motion.div>
            )}

            {/* Game over overlay */}
            {gameOver && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                    style={{ background: "rgba(0,0,0,0.65)" }}>
                    <div className="text-center">
                        <div className="text-7xl mb-3">🏆</div>
                        <p className="font-fredoka text-3xl text-yellow-300">Round Over!</p>
                    </div>
                </motion.div>
            )}

            {/* Controls */}
            <div className="flex-1 flex items-center justify-between px-6 py-3 select-none" style={{ minHeight: "140px" }}>
                {/* D-pad */}
                <div className="relative" style={{ width: 148, height: 148 }}>
                    {/* Up */}
                    <button {...dpad("up")} className="absolute touch-none"
                        style={{ top: 0, left: "50%", transform: "translateX(-50%)", width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "white", fontSize: 22 }}>↑</span>
                    </button>
                    {/* Down */}
                    <button {...dpad("down")} className="absolute touch-none"
                        style={{ bottom: 0, left: "50%", transform: "translateX(-50%)", width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "white", fontSize: 22 }}>↓</span>
                    </button>
                    {/* Left */}
                    <button {...dpad("left")} className="absolute touch-none"
                        style={{ left: 0, top: "50%", transform: "translateY(-50%)", width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "white", fontSize: 22 }}>←</span>
                    </button>
                    {/* Right */}
                    <button {...dpad("right")} className="absolute touch-none"
                        style={{ right: 0, top: "50%", transform: "translateY(-50%)", width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "white", fontSize: 22 }}>→</span>
                    </button>
                    {/* Center circle */}
                    <div className="absolute" style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)" }} />
                </div>

                {/* Bomb button */}
                <button
                    onPointerDown={e => {
                        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                        bombQueueRef.current = true;
                        flushInput(true);
                    }}
                    className="touch-none flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform"
                    style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #1e1b4b, #2d1b69)", border: "3px solid #7C3AED", boxShadow: "0 0 24px rgba(124,58,237,0.5)" }}>
                    <span style={{ fontSize: 28 }}>💣</span>
                </button>
            </div>
        </div>
    );
}

// ── Canvas drawing ────────────────────────────────────────────────────────────
function drawBomberman(
    ctx: CanvasRenderingContext2D,
    T: number,
    room: Room,
    myId: string,
    localGrid: { fromR: number; fromC: number; toR: number; toC: number; progress: number } | null,
    latencyMs: number,
    gridCache: number[][] | null
) {
    // Use the cached grid (server only sends it when it changes)
    const grid = gridCache ?? room.bomberGrid;
    if (!grid) return; // grid not received yet
    const now = Date.now();

    // Background (floor colour — visible in the 1-px gap around every wall tile)
    ctx.fillStyle = "#0d0d1e";
    ctx.fillRect(0, 0, BOMBER_COLS * T, BOMBER_ROWS * T);

    // Floor checker (very subtle, only on passable tiles)
    for (let r = 0; r < BOMBER_ROWS; r++) {
        for (let c = 0; c < BOMBER_COLS; c++) {
            if (grid[r][c] !== 0) continue;
            const x = c * T, y = r * T;
            ctx.fillStyle = (r + c) % 2 === 0 ? "#131325" : "#12122a";
            ctx.fillRect(x, y, T, T);
        }
    }

    // Wall tiles — all inset by 1 px so the face NEVER touches the tile boundary.
    // This guarantees the player circle (drawn last) is always visually in front.
    for (let r = 0; r < BOMBER_ROWS; r++) {
        for (let c = 0; c < BOMBER_COLS; c++) {
            const x = c * T, y = r * T, tile = grid[r][c];
            const M = 1; // 1-px gap on every side — players will always show over this
            if (tile === 1) {
                // Hard wall — steel bevel
                ctx.fillStyle = "#1c2340"; ctx.fillRect(x + M, y + M, T - M * 2, T - M * 2);
                ctx.fillStyle = "#2e3d6e"; ctx.fillRect(x + M + 2, y + M + 2, T - M * 2 - 4, T - M * 2 - 4);
                ctx.fillStyle = "#1c2340";
                ctx.fillRect(x + T / 2 - 1, y + M + 2, 2, T - M * 2 - 4);
                ctx.fillRect(x + M + 2, y + T / 2 - 1, T - M * 2 - 4, 2);
                // Top-left highlight edge
                ctx.fillStyle = "#3a4f80";
                ctx.fillRect(x + M, y + M, T - M * 2, 2);
                ctx.fillRect(x + M, y + M, 2, T - M * 2);
            } else if (tile === 2) {
                // Soft wall — wooden crate
                ctx.fillStyle = "#4a2e0a"; ctx.fillRect(x + M, y + M, T - M * 2, T - M * 2);
                ctx.fillStyle = "#6b4218"; ctx.fillRect(x + M + 2, y + M + 2, T - M * 2 - 4, T - M * 2 - 4);
                ctx.fillStyle = "#5a3510";
                ctx.fillRect(x + T / 2 - 1, y + M + 2, 2, T - M * 2 - 4);
                ctx.fillRect(x + M + 2, y + T / 2 - 1, T - M * 2 - 4, 2);
                // Corner nails
                const ns = Math.max(2, Math.floor(T * 0.1));
                ctx.fillStyle = "#2a1505";
                ctx.fillRect(x + M + 2, y + M + 2, ns, ns);
                ctx.fillRect(x + T - M - 2 - ns, y + M + 2, ns, ns);
                ctx.fillRect(x + M + 2, y + T - M - 2 - ns, ns, ns);
                ctx.fillRect(x + T - M - 2 - ns, y + T - M - 2 - ns, ns, ns);
            }
        }
    }

    // Explosions
    for (const exp of room.bomberExplosions ?? []) {
        const totalMs = 750;
        const remaining = Math.max(0, exp.expiresAt - now);
        const progress = 1 - remaining / totalMs; // 0=just exploded, 1=about to vanish
        const alpha = Math.min(1, remaining / 200); // fade out last 200ms

        // Colour ramp: light yellow → orange → red
        const r0 = Math.round(progress < 0.5 ? 254 + (220 - 254) * (progress / 0.5) : 220);
        const g0 = Math.round(progress < 0.5 ? 240 + (38 - 240) * (progress / 0.5) : Math.max(38, 38 + (38 - 38) * 1));
        const b0 = Math.round(progress < 0.5 ? 138 + (38 - 138) * (progress / 0.5) : 38);
        const ri = Math.round(progress < 0.5 ? 253 + (253 - 253) * 0 : 253 + (220 - 253) * ((progress - 0.5) / 0.5));
        const gi = Math.round(progress < 0.5 ? 224 + (130 - 224) * (progress / 0.5) : Math.max(60, 130 - 70 * ((progress - 0.5) / 0.5)));
        const bi = Math.round(progress < 0.5 ? 100 + (20 - 100) * (progress / 0.5) : 20);

        for (const tile of exp.tiles) {
            const tx = tile.c * T, ty = tile.r * T;
            ctx.fillStyle = `rgba(${r0},${g0},${b0},${0.82 * alpha})`;
            ctx.fillRect(tx, ty, T, T);
            const inset = Math.floor(T * 0.12);
            ctx.fillStyle = `rgba(${ri},${gi},${bi},${0.68 * alpha})`;
            ctx.fillRect(tx + inset, ty + inset, T - inset * 2, T - inset * 2);
        }
    }

    // Bombs
    for (const bomb of room.bomberBombs ?? []) {
        const cx = (bomb.c + 0.5) * T;
        const cy = (bomb.r + 0.5) * T;
        // progress: 0=just placed, 1=about to explode
        const progress = Math.max(0, Math.min(1, 1 - bomb.timer / BOMBER_BOMB_MS));
        const pulse = progress > 0.67 ? 0.88 + 0.12 * Math.sin(now / (progress > 0.9 ? 55 : 90)) : 1;
        const radius = T * 0.38 * pulse;

        // Body colour: dark grey → amber → orange-red → red
        let bodyR: number, bodyG: number, bodyB: number;
        if (progress < 0.5) {
            bodyR = Math.round(61 + (180 - 61) * (progress / 0.5));
            bodyG = Math.round(61 + (60 - 61) * (progress / 0.5));
            bodyB = Math.round(92 + (10 - 92) * (progress / 0.5));
        } else {
            bodyR = Math.round(180 + (239 - 180) * ((progress - 0.5) / 0.5));
            bodyG = Math.round(60 + (68 - 60) * ((progress - 0.5) / 0.5));
            bodyB = Math.round(10 + (68 - 10) * ((progress - 0.5) / 0.5));
        }
        const bodyTop = `rgb(${bodyR},${bodyG},${bodyB})`;

        // Shadow
        ctx.beginPath(); ctx.ellipse(cx + 1.5, cy + 2, radius * 0.75, radius * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();

        // Bomb body
        ctx.beginPath(); ctx.arc(cx, cy - 1, radius, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.4, 0, cx, cy, radius);
        g.addColorStop(0, bodyTop);
        g.addColorStop(1, "#0d0d1a");
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1; ctx.stroke();

        // Fuse
        ctx.beginPath();
        ctx.moveTo(cx + radius * 0.1, cy - radius - 1);
        ctx.quadraticCurveTo(cx + radius * 0.55, cy - radius * 1.35, cx + radius * 0.4, cy - radius * 1.2);
        ctx.strokeStyle = "#92400e"; ctx.lineWidth = T < 20 ? 1.5 : 2; ctx.stroke();
        draw_spark(ctx, cx + radius * 0.42, cy - radius * 1.22, now);

        // Timer text
        const secsLeft = Math.ceil(bomb.timer / 1000);
        ctx.font = `bold ${Math.floor(T * 0.48)}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.lineWidth = 3;
        ctx.strokeText(String(secsLeft), cx, cy - 1);
        ctx.fillStyle = progress > 0.67 ? "#fca5a5" : "white";
        ctx.fillText(String(secsLeft), cx, cy - 1);
    }

    // Power-ups
    for (const pu of room.bomberPowerups ?? []) {
        const px = (pu.c + 0.5) * T;
        const py = (pu.r + 0.5) * T;
        const r2 = T * 0.28;
        // Glowing backdrop
        ctx.beginPath(); ctx.arc(px, py, r2 + 2, 0, Math.PI * 2);
        ctx.fillStyle = pu.type === 'range' ? 'rgba(251,191,36,0.25)' : 'rgba(56,189,248,0.25)';
        ctx.fill();
        // Icon circle
        ctx.beginPath(); ctx.arc(px, py, r2, 0, Math.PI * 2);
        ctx.fillStyle = pu.type === 'range' ? '#f59e0b' : '#0ea5e9';
        ctx.fill();
        ctx.font = `bold ${Math.floor(T * 0.42)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText(pu.type === 'range' ? '🔥' : '⚡', px, py);
    }

    // Latency counter (top-right corner of canvas)
    if (latencyMs > 0) {
        const label = `${latencyMs}ms`;
        const col = latencyMs < 80 ? '#4ade80' : latencyMs < 180 ? '#facc15' : '#f87171';
        ctx.font = `bold ${Math.max(10, Math.floor(T * 0.45))}px monospace`;
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(label, BOMBER_COLS * T - 4, 4);
        ctx.fillStyle = col;
        ctx.fillText(label, BOMBER_COLS * T - 5, 3);
    }

    // Players — use client-predicted pos for myId, server pos for everyone else
    room.players.forEach((p, i) => {
        if (p.bomberAlive === false) return;

        const isMe = p.id === myId;
        let px: number, py: number;

        if (isMe) {
            // Use client-predicted grid lerp; fall back to server fields
            if (localGrid) {
                const t = Math.min(localGrid.progress, 1.0);
                px = (localGrid.fromC + (localGrid.toC - localGrid.fromC) * t + 0.5) * T;
                py = (localGrid.fromR + (localGrid.toR - localGrid.fromR) * t + 0.5) * T;
            } else if (p.bomberFromR != null && p.bomberToR != null) {
                const t = Math.min(p.bomberMoveProgress ?? 1.0, 1.0);
                px = (p.bomberFromC! + (p.bomberToC! - p.bomberFromC!) * t + 0.5) * T;
                py = (p.bomberFromR! + (p.bomberToR! - p.bomberFromR!) * t + 0.5) * T;
            } else if (p.bomberX != null) {
                px = p.bomberX * T; py = p.bomberY! * T;
            } else { return; }
        } else {
            // Other players: interpolate from server grid fields
            if (p.bomberFromR != null && p.bomberToR != null) {
                const t = Math.min(p.bomberMoveProgress ?? 1.0, 1.0);
                px = (p.bomberFromC! + (p.bomberToC! - p.bomberFromC!) * t + 0.5) * T;
                py = (p.bomberFromR! + (p.bomberToR! - p.bomberFromR!) * t + 0.5) * T;
            } else if (p.bomberX != null) {
                px = p.bomberX * T; py = p.bomberY! * T;
            } else { return; }
        }

        const R = T * 0.4;
        const col = PLAYER_COLORS[i % 4];

        // Shadow
        ctx.beginPath();
        ctx.ellipse(px + 1, py + R * 0.6, R * 0.65, R * 0.22, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill();

        // Body
        ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2);
        const pg = ctx.createRadialGradient(px - R * 0.3, py - R * 0.35, 0, px, py, R);
        pg.addColorStop(0, col + "ff");
        pg.addColorStop(1, col + "77");
        ctx.fillStyle = pg; ctx.fill();

        // Outline — thicker for "me"
        ctx.strokeStyle = isMe ? "white" : "rgba(255,255,255,0.5)";
        ctx.lineWidth = isMe ? 2.5 : 1.5; ctx.stroke();

        // Initial
        ctx.font = `bold ${Math.floor(R * 1.15)}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 3;
        ctx.strokeText(p.name[0].toUpperCase(), px, py + 0.5);
        ctx.fillStyle = "white"; ctx.fillText(p.name[0].toUpperCase(), px, py + 0.5);

        // "YOU" marker
        if (isMe) {
            ctx.font = `bold ${Math.floor(R * 0.6)}px sans-serif`;
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 2;
            ctx.strokeText("YOU", px, py - R - Math.floor(R * 0.5));
            ctx.fillText("YOU", px, py - R - Math.floor(R * 0.5));
        }
    });
}

function draw_spark(ctx: CanvasRenderingContext2D, x: number, y: number, now: number) {
    const phase = (now % 300) / 300;
    const sparkColors = ["#FCD34D", "#F97316", "#FCD34D"];
    ctx.beginPath();
    ctx.arc(x, y, 2.5 + Math.sin(phase * Math.PI * 2) * 1, 0, Math.PI * 2);
    ctx.fillStyle = sparkColors[Math.floor(phase * 3)];
    ctx.fill();
}
