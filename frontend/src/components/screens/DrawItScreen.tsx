"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Room } from "@/lib/types";
import { useSocket } from "@/lib/socket";
import { sfxSubmit, sfxWin, sfxRoundStart } from "@/lib/sounds";

interface Props { room: Room; myId: string; }

interface ChatMsg { id: number; type: "correct" | "wrong" | "system"; name: string; text: string; pts?: number; }
interface Stroke { x1: number; y1: number; x2: number; y2: number; color: string; width: number; }

const PALETTE = ["#FFFFFF", "#EF4444", "#F97316", "#EAB308", "#22C55E",
    "#3B82F6", "#8B5CF6", "#EC4899", "#000000", "#6B7280"];
const SIZES = [3, 6, 12, 20];

export default function DrawItScreen({ room, myId }: Props) {
    const { socket } = useSocket();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    const [myWord, setMyWord] = useState<string | null>(null);
    const [color, setColor] = useState("#FFFFFF");
    const [size, setSize] = useState(6);
    const [guess, setGuess] = useState("");
    const [guessed, setGuessed] = useState(false);
    const [chat, setChat] = useState<ChatMsg[]>([]);
    const chatRef = useRef<HTMLDivElement>(null);
    const msgId = useRef(0);

    const isDrawer = room.drawItDrawerId === myId;
    const drawerName = room.players.find((p) => p.id === room.drawItDrawerId)?.name ?? "?";
    const myHasGuessed = (room.drawItGuessedIds ?? []).includes(myId);

    const addChat = (msg: Omit<ChatMsg, "id">) => {
        setChat((prev) => [...prev.slice(-30), { ...msg, id: msgId.current++ }]);
        setTimeout(() => { chatRef.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, 50);
    };

    // Listen for server events
    useEffect(() => {
        if (!socket) return;
        const onWord = ({ word }: { word: string }) => { setMyWord(word); sfxRoundStart(); }; // eslint-disable-line @typescript-eslint/no-unused-vars
        const onStroke = (stroke: Stroke) => drawStroke(stroke);
        const onClear = () => clearCanvas();
        const onCorrect = ({ guesserName, pts }: { guesserName: string; pts: number }) => {
            sfxWin(); addChat({ type: "correct", name: guesserName, text: "guessed it! 🎉", pts });
            if (guesserName === room.players.find((p) => p.id === myId)?.name) setGuessed(true);
        };
        const onWrong = ({ guesserName, word }: { guesserName: string; word: string }) => {
            addChat({ type: "wrong", name: guesserName, text: word });
        };
        socket.on("draw_your_word", onWord);
        socket.on("draw_stroke", onStroke);
        socket.on("draw_clear", onClear);
        socket.on("draw_guess_correct", onCorrect);
        socket.on("draw_guess_wrong", onWrong);
        return () => {
            socket.off("draw_your_word", onWord);
            socket.off("draw_stroke", onStroke);
            socket.off("draw_clear", onClear);
            socket.off("draw_guess_correct", onCorrect);
            socket.off("draw_guess_wrong", onWrong);
        };
    }, [socket, myId, room.players]);

    // Canvas helpers
    const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

    const drawStroke = useCallback(({ x1, y1, x2, y2, color: c, width: w }: Stroke) => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!ctx || !canvas) return;
        const cw = canvas.width, ch = canvas.height;
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(x1 * cw, y1 * ch);
        ctx.lineTo(x2 * cw, y2 * ch);
        ctx.stroke();
    }, []);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = getCtx();
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height,
        };
    };

    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawer) return;
        isDrawing.current = true;
        lastPos.current = getPos(e);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawer || !isDrawing.current || !lastPos.current) return;
        const pos = getPos(e);
        const stroke: Stroke = { x1: lastPos.current.x, y1: lastPos.current.y, x2: pos.x, y2: pos.y, color, width: size };
        drawStroke(stroke);
        socket?.emit("draw_stroke", { code: room.code, stroke });
        lastPos.current = pos;
    };

    const onPointerUp = () => { isDrawing.current = false; lastPos.current = null; };

    const handleClear = () => {
        clearCanvas();
        socket?.emit("draw_clear", { code: room.code });
    };

    const handleGuess = () => {
        const g = guess.trim();
        if (!g || guessed || myHasGuessed) return;
        sfxSubmit();
        socket?.emit("draw_guess", { code: room.code, word: g });
        setGuess("");
    };

    return (
        <div className="page-fill gap-3">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="round-pill">🎨 Round {room.round}/{room.maxRounds}</div>
                <div className="font-nunito text-white/50 text-xs">
                    {room.drawItGuessedIds?.length ?? 0}/{room.players.filter((p) => p.id !== room.drawItDrawerId).length} guessed
                </div>
            </div>

            {/* Role banner */}
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex-shrink-0 px-4 py-2 rounded-2xl text-center ${isDrawer ? "bg-amber-500/20 border border-amber-500/40" : "bg-white/5 border border-white/10"}`}>
                {isDrawer ? (
                    <div>
                        <span className="font-nunito text-white/50 text-xs block mb-0.5">Your secret word:</span>
                        {myWord
                            ? <span className="font-fredoka text-2xl text-amber-300">{myWord}</span>
                            : <span className="font-fredoka text-lg text-white/40 animate-pulse">Getting your word… ✏️</span>
                        }
                    </div>
                ) : (
                    <div className="font-fredoka text-white text-base">
                        {drawerName} is drawing
                        <span className="text-white/40 text-sm font-nunito ml-1">· Type your guess below!</span>
                    </div>
                )}
            </motion.div>

            {/* Canvas */}
            <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10 bg-[#1a1a2e]"
                style={{ minHeight: "200px" }}>
                <canvas ref={canvasRef} width={800} height={500}
                    className="w-full h-full touch-none"
                    style={{ imageRendering: "pixelated" }}
                    onPointerDown={onPointerDown} onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp} onPointerLeave={onPointerUp} />
                {!isDrawer && myHasGuessed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm rounded-2xl">
                        <div className="text-center">
                            <div className="text-5xl mb-2">🎉</div>
                            <div className="font-fredoka text-2xl text-green-400">You guessed it!</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Drawer tools */}
            {isDrawer && (
                <div className="flex-shrink-0 flex flex-col gap-2">
                    {/* Colors */}
                    <div className="flex gap-2 flex-wrap justify-center">
                        {PALETTE.map((c) => (
                            <button key={c} onClick={() => setColor(c)}
                                className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-95 ${color === c ? "border-white scale-125" : "border-white/20"}`}
                                style={{ background: c }} />
                        ))}
                    </div>
                    {/* Size + Clear */}
                    <div className="flex items-center gap-2 justify-center">
                        {SIZES.map((s) => (
                            <button key={s} onClick={() => setSize(s)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border ${size === s ? "border-white bg-white/20" : "border-white/20"}`}>
                                <div className="rounded-full bg-white" style={{ width: s * 1.5, height: s * 1.5 }} />
                            </button>
                        ))}
                        <button onClick={handleClear}
                            className="ml-2 px-3 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 font-nunito text-red-300 text-xs">
                            🗑️ Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Guesser input + chat */}
            {!isDrawer && (
                <div className="flex-shrink-0 flex flex-col gap-2">
                    {/* Chat log */}
                    {chat.length > 0 && (
                        <div ref={chatRef} className="max-h-20 overflow-y-auto flex flex-col gap-1 px-1">
                            {chat.map((m) => (
                                <div key={m.id} className={`font-nunito text-xs ${m.type === "correct" ? "text-green-400" : "text-white/40"}`}>
                                    <span className="font-bold">{m.name}</span>
                                    {m.type === "correct" ? (
                                        <span> 🎉 {m.text} <span className="text-amber-400">+{m.pts}pts</span></span>
                                    ) : (
                                        <span className="line-through"> {m.text}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Input */}
                    {!myHasGuessed && (
                        <div className="flex gap-2">
                            <input className="party-input flex-1 text-sm" placeholder="Type your guess…"
                                value={guess} onChange={(e) => setGuess(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleGuess()} maxLength={60} />
                            <button className="btn-sm" onClick={handleGuess} disabled={!guess.trim()}>→</button>
                        </div>
                    )}
                    {myHasGuessed && (
                        <div className="text-center py-1">
                            <span className="font-nunito text-green-400 text-sm wait-pulse">✅ Guessed! Waiting for others…</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
