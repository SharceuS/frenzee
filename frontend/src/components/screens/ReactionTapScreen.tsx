"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Room } from "@/lib/types";
import { useSocket } from "@/lib/socket";
import { sfxTap, sfxError, sfxWin, sfxRoundStart } from "@/lib/sounds";

interface Props { room: Room; myId: string; }

export default function ReactionTapScreen({ room, myId }: Props) {
    const { socket } = useSocket();
    const [tapped, setTapped] = useState(false);
    const [myTime, setMyTime] = useState<number | null>(null);
    const [earlyTap, setEarlyTap] = useState(false);
    const tapStartRef = useRef<number | null>(null);
    const hasTapped = useRef(false);

    const fired = room.reactionFired;
    // Use server-recorded time once available (eliminates client/server clock drift)
    const serverTime = room.reactionTimes?.[myId];
    const displayTime = serverTime ?? myTime;
    const tapCount = Object.keys(room.reactionTimes ?? {}).length;
    const totalPlayers = room.players.length;

    // When fired becomes true, record the client-side start time for local display
    useEffect(() => {
        if (fired && !tapStartRef.current) {
            tapStartRef.current = Date.now();
            sfxWin(); // Flash sound
        }
    }, [fired]);

    useEffect(() => {
        sfxRoundStart();
    }, []);

    const handleTap = () => {
        if (hasTapped.current) return;
        if (!fired) {
            // Early tap!
            sfxError();
            setEarlyTap(true);
            setTimeout(() => setEarlyTap(false), 1500);
            return;
        }
        hasTapped.current = true;
        sfxTap();
        const localTime = tapStartRef.current ? Date.now() - tapStartRef.current : 0;
        setMyTime(localTime);
        setTapped(true);
        socket?.emit("reaction_tap", { code: room.code });
    };

    const getRankEmoji = (ms: number) => {
        if (ms < 200) return "⚡ Superhuman!";
        if (ms < 300) return "🔥 Lightning!";
        if (ms < 500) return "😏 Quick!";
        if (ms < 800) return "😐 Okay...";
        return "🐢 Slow...";
    };

    return (
        <motion.div
            className="page-fill items-center justify-center cursor-pointer select-none overflow-hidden"
            onClick={handleTap}
            style={{
                background: fired
                    ? "radial-gradient(circle at center, #16a34a 0%, #15803d 40%, #14532d 100%)"
                    : "radial-gradient(circle at center, #7f1d1d 0%, #450a0a 50%, #1a0000 100%)",
                transition: "background 0.15s ease",
            }}
        >
            {/* Round pill */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                <div className="round-pill">⚡ Round {room.round}/{room.maxRounds}</div>
                <div className="font-nunito text-white/40 text-xs">{tapCount}/{totalPlayers} tapped</div>
            </div>

            {/* Main content */}
            <AnimatePresence mode="wait">
                {/* WAITING STATE */}
                {!fired && !tapped && (
                    <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-6 text-center px-8">
                        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                            <div className="text-7xl">👀</div>
                        </motion.div>
                        <div>
                            <p className="font-fredoka text-3xl text-white mb-2">Get ready…</p>
                            <p className="font-nunito text-white/50 text-sm">Wait for the flash. <strong>Don't tap early!</strong></p>
                        </div>
                        {/* Pulsing dots */}
                        <div className="flex gap-2">
                            {[0, 1, 2].map((i) => (
                                <motion.div key={i} className="w-3 h-3 rounded-full bg-red-500"
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.33 }} />
                            ))}
                        </div>
                        {/* Early tap warning */}
                        <AnimatePresence>
                            {earlyTap && (
                                <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                                    className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="bg-red-900/80 px-8 py-4 rounded-3xl border border-red-500">
                                        <p className="font-fredoka text-3xl text-red-300">TOO EARLY! 😵</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* FIRED — NOT TAPPED YET */}
                {fired && !tapped && (
                    <motion.div key="fired" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="flex flex-col items-center gap-4 text-center">
                        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.2, repeat: Infinity }}>
                            <div className="w-52 h-52 rounded-full bg-green-400 flex items-center justify-center shadow-[0_0_80px_rgba(74,222,128,0.8)]">
                                <span className="font-fredoka text-4xl text-green-900 leading-none text-center">TAP<br />NOW!</span>
                            </div>
                        </motion.div>
                        <p className="font-fredoka text-xl text-green-300 animate-pulse">⚡ TAP! TAP! TAP!</p>
                    </motion.div>
                )}

                {/* TAPPED */}
                {tapped && (
                    <motion.div key="tapped" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="flex flex-col items-center gap-6 text-center px-8">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
                            transition={{ type: "spring", stiffness: 300, damping: 10 }}>
                            <div className="text-7xl">⚡</div>
                        </motion.div>
                        {displayTime !== null && (
                            <>
                                <div className="font-fredoka text-6xl text-white">{displayTime}ms</div>
                                <div className="font-nunito text-green-300 text-lg">{getRankEmoji(displayTime)}</div>
                            </>
                        )}
                        <p className="font-nunito text-white/50 text-sm wait-pulse">
                            Waiting for others… {tapCount}/{totalPlayers} done
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Player tap dots at bottom */}
            {(fired || tapped) && (
                <div className="absolute bottom-6 left-0 right-0 flex flex-wrap gap-2 justify-center px-4">
                    {room.players.map((p) => {
                        const ms = room.reactionTimes?.[p.id];
                        return (
                            <div key={p.id}
                                className={`font-nunito text-xs px-2.5 py-1 rounded-full transition-all ${ms !== undefined
                                    ? "bg-green-500/30 text-green-300 border border-green-500/50"
                                    : "bg-white/5 text-white/30 border border-white/10"}`}>
                                {ms !== undefined ? `⚡ ${p.name} ${ms}ms` : `⏳ ${p.name}`}
                            </div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
}
