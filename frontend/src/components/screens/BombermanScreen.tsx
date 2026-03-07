"use client";
import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Room } from "@/lib/types";
import { useSocket } from "@/lib/socket";

const BOMBER_COLS = 15;
const BOMBER_ROWS = 13;
const PLAYER_COLORS = ["#7C3AED", "#EF4444", "#10B981", "#F59E0B"];

interface Props { room: Room; myId: string; }

export default function BombermanScreen({ room, myId }: Props) {
    const { socket } = useSocket();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const roomRef = useRef(room);
    const dirsRef = useRef<Set<string>>(new Set());
    const rafRef = useRef<number>(0);

    useEffect(() => { roomRef.current = room; }, [room]);

    const sendInput = useCallback((bomb = false) => {
        const dirs = dirsRef.current;
        let dx = 0, dy = 0;
        if (dirs.has("left")) dx -= 1;
        if (dirs.has("right")) dx += 1;
        if (dirs.has("up")) dy -= 1;
        if (dirs.has("down")) dy += 1;
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        socket?.emit("bomberman_input", { code: room.code, dx, dy, bomb });
    }, [socket, room.code]);

    // Keyboard controls
    useEffect(() => {
        const KEYS: Record<string, string> = {
            ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
            KeyA: "left", KeyD: "right", KeyW: "up", KeyS: "down",
        };
        const down = (e: KeyboardEvent) => {
            if (KEYS[e.code]) { e.preventDefault(); dirsRef.current.add(KEYS[e.code]); sendInput(); }
            if (e.code === "Space") { e.preventDefault(); sendInput(true); }
        };
        const up = (e: KeyboardEvent) => {
            if (KEYS[e.code]) { dirsRef.current.delete(KEYS[e.code]); sendInput(); }
        };
        window.addEventListener("keydown", down);
        window.addEventListener("keyup", up);
        return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
    }, [sendInput]);

    // Canvas render loop
    useEffect(() => {
        const render = () => {
            const canvas = canvasRef.current;
            const container = containerRef.current;
            const r = roomRef.current;
            if (canvas && container && r.bomberGrid) {
                const W = container.clientWidth;
                const T = Math.floor(W / BOMBER_COLS);
                const H = T * BOMBER_ROWS;
                if (canvas.width !== W) canvas.width = W;
                if (canvas.height !== H) canvas.height = H;
                const ctx = canvas.getContext("2d");
                if (ctx) drawBomberman(ctx, T, r, myId);
            }
            rafRef.current = requestAnimationFrame(render);
        };
        rafRef.current = requestAnimationFrame(render);
        return () => cancelAnimationFrame(rafRef.current);
    }, [myId]);

    // D-pad helpers
    const dpad = (dir: string) => ({
        onPointerDown: (e: React.PointerEvent) => {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            dirsRef.current.add(dir); sendInput();
        },
        onPointerUp: () => { dirsRef.current.delete(dir); sendInput(); },
        onPointerLeave: () => { dirsRef.current.delete(dir); sendInput(); },
        onPointerCancel: () => { dirsRef.current.delete(dir); sendInput(); },
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
                    onPointerDown={e => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); sendInput(true); }}
                    className="touch-none flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform"
                    style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #1e1b4b, #2d1b69)", border: "3px solid #7C3AED", boxShadow: "0 0 24px rgba(124,58,237,0.5)" }}>
                    <span style={{ fontSize: 28 }}>💣</span>
                </button>
            </div>
        </div>
    );
}

// ── Canvas drawing ────────────────────────────────────────────────────────────
function drawBomberman(ctx: CanvasRenderingContext2D, T: number, room: Room, myId: string) {
    const grid = room.bomberGrid!;
    const now = Date.now();

    // Background
    ctx.fillStyle = "#12122a";
    ctx.fillRect(0, 0, BOMBER_COLS * T, BOMBER_ROWS * T);

    // Grid tiles
    for (let r = 0; r < BOMBER_ROWS; r++) {
        for (let c = 0; c < BOMBER_COLS; c++) {
            const x = c * T, y = r * T, tile = grid[r][c];
            if (tile === 1) {
                // Hard wall — steel look
                ctx.fillStyle = "#1c2340"; ctx.fillRect(x, y, T, T);
                ctx.fillStyle = "#232d52"; ctx.fillRect(x + 2, y + 2, T - 2, T - 2);
                ctx.fillStyle = "#2e3d6e"; ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
                ctx.fillStyle = "#1c2340";
                ctx.fillRect(x + T / 2 - 1, y + 2, 2, T - 4);
                ctx.fillRect(x + 2, y + T / 2 - 1, T - 4, 2);
            } else if (tile === 2) {
                // Soft wall — wooden crate
                ctx.fillStyle = "#4a2e0a"; ctx.fillRect(x, y, T, T);
                ctx.fillStyle = "#6b4218"; ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
                ctx.fillStyle = "#5a3510";
                ctx.fillRect(x + T / 2 - 1, y + 2, 2, T - 4);
                ctx.fillRect(x + 2, y + T / 2 - 1, T - 4, 2);
                // Corner nails
                ctx.fillStyle = "#352007";
                const ns = Math.max(2, Math.floor(T * 0.12));
                ctx.fillRect(x + 2, y + 2, ns, ns); ctx.fillRect(x + T - 2 - ns, y + 2, ns, ns);
                ctx.fillRect(x + 2, y + T - 2 - ns, ns, ns); ctx.fillRect(x + T - 2 - ns, y + T - 2 - ns, ns, ns);
            }
            // Subtle grid line
            ctx.strokeStyle = "rgba(0,0,0,0.25)";
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x + 0.25, y + 0.25, T - 0.5, T - 0.5);
        }
    }

    // Explosions (under bombs & players)
    for (const exp of room.bomberExplosions ?? []) {
        const remaining = Math.max(0, exp.expiresAt - now);
        const alpha = Math.min(1, remaining / 400);
        for (const tile of exp.tiles) {
            const tx = tile.c * T, ty = tile.r * T;
            ctx.fillStyle = `rgba(220, 38, 38, ${0.78 * alpha})`;
            ctx.fillRect(tx, ty, T, T);
            ctx.fillStyle = `rgba(253, 186, 116, ${0.65 * alpha})`;
            const inset = Math.floor(T * 0.12);
            ctx.fillRect(tx + inset, ty + inset, T - inset * 2, T - inset * 2);
        }
        // Countdown on center tile
        const secsLeft = Math.ceil(remaining / 1000);
        if (secsLeft > 0) {
            const cx = (exp.centerC + 0.5) * T;
            const cy = (exp.centerR + 0.5) * T;
            ctx.font = `bold ${Math.floor(T * 0.72)}px sans-serif`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.strokeStyle = `rgba(0,0,0,${alpha})`; ctx.lineWidth = 4;
            ctx.strokeText(String(secsLeft), cx, cy);
            ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fillText(String(secsLeft), cx, cy);
        }
    }

    // Bombs
    for (const bomb of room.bomberBombs ?? []) {
        const cx = (bomb.c + 0.5) * T;
        const cy = (bomb.r + 0.5) * T;
        const secsLeft = Math.ceil(bomb.timer / 1000);
        const pulse = secsLeft <= 1 ? 0.85 + 0.15 * Math.sin(now / 80) : 1;
        const radius = T * 0.38 * pulse;

        // Shadow
        ctx.beginPath(); ctx.ellipse(cx + 1.5, cy + 2, radius * 0.75, radius * 0.25, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fill();

        // Bomb body
        ctx.beginPath(); ctx.arc(cx, cy - 1, radius, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.4, 0, cx, cy, radius);
        g.addColorStop(0, secsLeft <= 1 ? "#ef4444" : "#3d3d5c");
        g.addColorStop(1, "#0d0d1a");
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1; ctx.stroke();

        // Fuse
        ctx.beginPath();
        ctx.moveTo(cx + radius * 0.1, cy - radius - 1);
        ctx.quadraticCurveTo(cx + radius * 0.55, cy - radius * 1.35, cx + radius * 0.4, cy - radius * 1.2);
        ctx.strokeStyle = "#92400e"; ctx.lineWidth = T < 20 ? 1.5 : 2; ctx.stroke();
        // Spark
        draw_spark(ctx, cx + radius * 0.42, cy - radius * 1.22, now);

        // Timer text
        ctx.font = `bold ${Math.floor(T * 0.48)}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.lineWidth = 3;
        ctx.strokeText(String(secsLeft), cx, cy - 1);
        ctx.fillStyle = secsLeft <= 1 ? "#fca5a5" : "white";
        ctx.fillText(String(secsLeft), cx, cy - 1);
    }

    // Players
    room.players.forEach((p, i) => {
        if (p.bomberX == null || p.bomberY == null) return;
        if (p.bomberAlive === false) return;
        const px = p.bomberX * T;
        const py = p.bomberY * T;
        const R = T * 0.4;
        const col = PLAYER_COLORS[i % 4];
        const isMe = p.id === myId;

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
