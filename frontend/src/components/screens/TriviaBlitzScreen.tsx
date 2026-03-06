"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Room } from "@/lib/types";
import { sfxTap, sfxSubmit, sfxRoundStart } from "@/lib/sounds";

interface Props {
    room: Room;
    myId: string;
    onSubmit: (answer: unknown) => void;
}

const OPTION_CONFIGS = [
    { letter: "A", color: "#7C3AED", bg: "from-violet-600 to-purple-800", border: "border-violet-500", emoji: "🟣" },
    { letter: "B", color: "#2563EB", bg: "from-blue-600 to-blue-800", border: "border-blue-500", emoji: "🔵" },
    { letter: "C", color: "#D97706", bg: "from-amber-500 to-yellow-700", border: "border-amber-400", emoji: "🟡" },
    { letter: "D", color: "#DC2626", bg: "from-red-600 to-red-800", border: "border-red-500", emoji: "🔴" },
];

export default function TriviaBlitzScreen({ room, myId, onSubmit }: Props) {
    const [picked, setPicked] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(20);
    const [shakeIdx, setShakeIdx] = useState<number | null>(null);

    const options = (room.questionData?.options as string[]) ?? [];
    const triviaStartTime = room.triviaStartTime ?? Date.now();
    const hasAnswered = room.players.find((p) => p.id === myId)?.hasAnswered ?? picked !== null;

    // Countdown timer synced to server start time
    useEffect(() => {
        sfxRoundStart();
        const update = () => {
            const elapsed = (Date.now() - triviaStartTime) / 1000;
            setTimeLeft(Math.max(0, 20 - elapsed));
        };
        update();
        const iv = setInterval(update, 100);
        return () => clearInterval(iv);
    }, [triviaStartTime]);

    const handlePick = useCallback((idx: number) => {
        if (hasAnswered) return;
        sfxTap();
        setShakeIdx(idx);
        setTimeout(() => setShakeIdx(null), 400);
        setPicked(idx);
        sfxSubmit();
        onSubmit(idx);
    }, [hasAnswered, onSubmit]);

    const pct = timeLeft / 20;
    const timerColor = pct > 0.5 ? "#10B981" : pct > 0.25 ? "#F59E0B" : "#EF4444";
    const radius = 28;
    const circ = 2 * Math.PI * radius;

    return (
        <div className="page-fill gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="round-pill">🧠 Round {room.round}/{room.maxRounds}</div>
                <div className="flex items-center gap-2">
                    {/* Circular countdown */}
                    <div className="relative w-16 h-16 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                            <circle cx="32" cy="32" r={radius} fill="none" stroke={timerColor} strokeWidth="5"
                                strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
                                style={{ transition: "stroke-dashoffset 0.1s linear, stroke 0.5s" }} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-fredoka text-lg text-white">{Math.ceil(timeLeft)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {room.players.map((p) => (
                            <div key={p.id} className={`w-2 h-2 rounded-full ${p.hasAnswered ? "bg-green-400" : "bg-white/20"}`} />
                        ))}
                        <span className="font-nunito text-white/40 text-xs ml-1">{room.answerCount}/{room.players.length}</span>
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="progress-track flex-shrink-0 h-1.5">
                <motion.div className="progress-fill h-full" style={{ background: timerColor }}
                    animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.1 }} />
            </div>

            {/* Category badge */}
            {room.questionData?.category ? (
                <div className="flex-shrink-0 self-start">
                    <span className="font-nunito text-[10px] uppercase tracking-widest text-white/40 border border-white/10 px-2 py-0.5 rounded-full">
                        {String(room.questionData.category)}
                    </span>
                </div>
            ) : null}

            {/* Question */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="party-card p-5 flex-shrink-0">
                <p className="font-nunito text-white/40 text-xs uppercase tracking-widest mb-2">❓ Question</p>
                <p className="font-fredoka text-2xl text-white leading-snug">{room.currentQuestion}</p>
            </motion.div>

            {/* Options grid — 2×2 like Kahoot */}
            <div className="grid grid-cols-2 gap-3 flex-1">
                {options.map((opt, idx) => {
                    const cfg = OPTION_CONFIGS[idx];
                    const isPicked = picked === idx;
                    const isOther = picked !== null && picked !== idx;
                    return (
                        <motion.button key={idx}
                            initial={{ opacity: 0, scale: 0.9 }} animate={{
                                opacity: isOther ? 0.45 : 1,
                                scale: shakeIdx === idx ? [1, 1.06, 0.97, 1.03, 1] : 1,
                            }}
                            transition={{ delay: idx * 0.06 }}
                            disabled={hasAnswered}
                            onClick={() => handlePick(idx)}
                            className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border-2 
                bg-gradient-to-br ${cfg.bg} ${cfg.border}
                ${isPicked ? "ring-4 ring-white/60 ring-offset-2 ring-offset-transparent" : ""}
                ${hasAnswered ? "pointer-events-none" : "active:scale-95 transition-transform"}`}
                            style={{ minHeight: "90px" }}
                        >
                            <span className="font-fredoka text-base font-bold text-white/70 absolute top-2 left-3">{cfg.letter}</span>
                            {isPicked && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                    <span className="text-xs">✓</span>
                                </motion.div>
                            )}
                            <p className="font-fredoka text-base text-white text-center leading-snug mt-3">{opt}</p>
                        </motion.button>
                    );
                })}
            </div>

            {/* Submitted state */}
            <AnimatePresence>
                {hasAnswered && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex-shrink-0 text-center py-2">
                        <p className="font-nunito text-white/50 text-sm wait-pulse">
                            ✅ Locked in! Waiting for others…
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
