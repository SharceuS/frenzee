"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Room } from "@/lib/types";

interface Props {
    room: Room;
    myId: string;
    isHost: boolean;
    onPlayAgain: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];
const RANK_LABELS = ["1st", "2nd", "3rd"];

export default function ScoreboardScreen({ room, myId, isHost, onPlayAgain }: Props) {
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const isWinner = winner?.id === myId;

    useEffect(() => {
        import("canvas-confetti").then(m => {
            const confetti = m.default;
            confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
            setTimeout(() => confetti({ particleCount: 100, spread: 60, origin: { y: 0.4 }, angle: 60 }), 400);
            setTimeout(() => confetti({ particleCount: 100, spread: 60, origin: { y: 0.4 }, angle: 120 }), 700);
        });
    }, []);

    return (
        <div className="page-fill overflow-y-auto gap-6 px-5 py-8">
            {/* Trophy — overflow-visible so emoji doesn't get cut */}
            <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 12 }}
                className="text-center overflow-visible"
                style={{ overflowClipMargin: "unset" }}
            >
                <div className="text-8xl animate-bounce-slow" style={{ lineHeight: 1.2, display: "inline-block" }}>🏆</div>
                <h1 className="font-fredoka text-5xl text-white mt-2">Game Over!</h1>
                {isWinner ? (
                    <p className="font-nunito text-yellow-400 font-extrabold text-lg mt-1">
                        You won! 🎉
                    </p>
                ) : (
                    <p className="font-nunito text-white/50 text-base mt-1">
                        {winner?.name} wins! 🎉
                    </p>
                )}
            </motion.div>

            {/* Podium */}
            <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="party-card w-full p-4"
            >
                <p className="font-nunito text-white/50 text-xs uppercase tracking-widest mb-4 text-center">
                    Final Rankings
                </p>
                <div className="flex flex-col gap-3">
                    {sorted.map((p, i) => (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.08 }}
                            className={`flex items-center gap-4 px-4 py-3 rounded-2xl
                ${i === 0 ? "bg-yellow-400/15 border border-yellow-400/30" :
                                    i === 1 ? "bg-white/8 border border-white/15" :
                                        i === 2 ? "bg-orange-800/15 border border-orange-800/25" :
                                            "bg-white/4 border border-white/8"
                                }`}
                        >
                            <span className="text-3xl w-9 text-center">
                                {i < 3 ? MEDALS[i] : `${i + 1}.`}
                            </span>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className={`font-fredoka text-xl ${p.id === myId ? "text-purple-300" : "text-white"}`}>
                                        {p.name}
                                    </span>
                                    {p.id === myId && <span className="font-nunito text-xs text-white/30">(you)</span>}
                                </div>
                                {i < 3 && (
                                    <span className="font-nunito text-white/40 text-xs">{RANK_LABELS[i]} place</span>
                                )}
                            </div>
                            <div className="text-right">
                                <div className="font-fredoka text-2xl text-yellow-400">{p.score}</div>
                                <div className="font-nunito text-white/30 text-xs">pts</div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Play again */}
            {isHost ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className="w-full flex flex-col gap-3"
                >
                    <button className="btn-primary w-full" onClick={onPlayAgain}>
                        🔄 Play Again!
                    </button>
                </motion.div>
            ) : (
                <div className="font-nunito text-white/40 text-center animate-pulse text-sm">
                    Waiting for host to play again…
                </div>
            )}
        </div>
    );
}
