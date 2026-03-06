"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Room, AnswerEntry } from "@/lib/types";

interface Props {
    room: Room;
    myId: string;
    onSubmit: (guesses: Record<string, string>) => void;
}

const AVATAR_COLORS = [
    "from-violet-500 to-purple-600", "from-pink-500 to-rose-600", "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500", "from-sky-400 to-blue-500", "from-fuchsia-400 to-pink-500",
    "from-cyan-400 to-blue-400", "from-lime-400 to-green-500",
];

export default function VibeCheckMatchingScreen({ room, myId, onSubmit }: Props) {
    // guesses: { answerId → playerId }
    const [guesses, setGuesses] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const hasSubmitted = submitted;
    const answers = (room.answers ?? []) as AnswerEntry[];

    const totalNeeded = answers.length;
    const canSubmit = Object.keys(guesses).length === totalNeeded;

    const toggle = (answerId: string, playerId: string) => {
        if (hasSubmitted) return;
        setGuesses(prev => {
            const next = { ...prev };
            // remove any other answer mapped to this playerId
            Object.keys(next).forEach(k => { if (next[k] === playerId) delete next[k]; });
            if (prev[answerId] === playerId) delete next[answerId];
            else next[answerId] = playerId;
            return next;
        });
    };

    const handleSubmit = () => {
        if (!canSubmit || hasSubmitted) return;
        onSubmit(guesses);
        setSubmitted(true);
    };

    return (
        <div className="page-fill gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="round-pill">✨ Round {room.round}/{room.maxRounds}</div>
                <div className="font-nunito text-white/45 text-xs">Vibe Check</div>
            </div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="party-card p-4 flex-shrink-0 text-center">
                <p className="font-nunito text-white/40 text-xs uppercase tracking-widest mb-1">Prompt</p>
                <p className="font-fredoka text-xl text-white">{room.currentQuestion}</p>
            </motion.div>

            <p className="font-nunito text-white/50 text-sm text-center flex-shrink-0">
                Match each vibe to its player! ({Object.keys(guesses).length}/{totalNeeded} matched)
            </p>

            {!hasSubmitted ? (
                <div className="flex-1 flex gap-3 scroll-y overflow-hidden">
                    {/* Answers column */}
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="font-nunito text-white/40 text-xs uppercase tracking-widest">Vibes</div>
                        {answers.map((a, i) => (
                            <motion.div key={a.playerId} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                                className={`answer-card transition-all ${guesses[a.playerId] ? "border-purple-500/50" : ""}`}
                                style={{ borderColor: guesses[a.playerId] ? "rgba(168,85,247,0.5)" : undefined }}>
                                <div className="font-nunito text-white text-sm">{a.answer as string}</div>
                                {guesses[a.playerId] && (
                                    <div className="font-nunito text-purple-400 text-xs mt-1">
                                        → {room.players.find(p => p.id === guesses[a.playerId])?.name}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                    {/* Players column */}
                    <div className="flex flex-col gap-2 w-[110px]">
                        <div className="font-nunito text-white/40 text-xs uppercase tracking-widest">Players</div>
                        {room.players.map((p, i) => {
                            const isUsed = Object.values(guesses).includes(p.id);
                            const linkedAnswer = Object.keys(guesses).find(k => guesses[k] === p.id);
                            return (
                                <motion.button key={p.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                                    onClick={() => linkedAnswer && toggle(linkedAnswer, p.id)}
                                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all active:scale-95
                                      ${isUsed ? "border-purple-500/50 bg-purple-500/15" : "border-white/10 bg-white/5"}`}>
                                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center font-fredoka text-base text-white`}>
                                        {p.name[0].toUpperCase()}
                                    </div>
                                    <span className="font-nunito text-white/70 text-xs text-center leading-tight max-w-full truncate">
                                        {p.id === myId ? "you" : p.name.split(" ")[0]}
                                    </span>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="text-6xl">✨</div>
                    <div className="font-fredoka text-white text-2xl">Guesses locked!</div>
                    <p className="font-nunito text-white/40 text-sm wait-pulse">Waiting for others…</p>
                </div>
            )}

            {!hasSubmitted && (
                <div className="text-center flex-shrink-0 pb-2">
                    <p className="font-nunito text-white/40 text-xs mb-3">Tap a vibe, then tap a player to match them</p>
                    <button className={`btn-primary w-full ${!canSubmit ? "opacity-40 pointer-events-none" : ""}`}
                        onClick={handleSubmit}>Submit Matches →</button>
                </div>
            )}
        </div>
    );
}
