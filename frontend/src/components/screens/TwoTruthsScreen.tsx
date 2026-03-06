"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Room } from "@/lib/types";

interface Props {
    room: Room;
    myId: string;
    onSubmit: (answer: unknown) => void;
}

export default function TwoTruthsScreen({ room, myId, onSubmit }: Props) {
    const isSpotlight = room.spotlightId === myId;
    const spotlightPlayer = room.players.find(p => p.id === room.spotlightId);
    const [statements, setStatements] = useState(["", "", ""]);
    const [lieIndex, setLieIndex] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const answered = room.players.find(p => p.id === myId)?.hasAnswered ?? submitted;

    const updateStatement = (i: number, val: string) => {
        const next = [...statements]; next[i] = val; setStatements(next);
    };
    const canSubmit = statements.every(s => s.trim().length > 0) && lieIndex !== null;

    const handleSubmit = () => {
        if (!canSubmit || answered) return;
        onSubmit({ statements, lieIndex });
        setSubmitted(true);
    };

    return (
        <div className="page-fill gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="round-pill">✌️ Round {room.round}/{room.maxRounds}</div>
                <div className="font-nunito text-white/45 text-xs">Two Truths & a Lie</div>
            </div>

            {/* Spotlight banner */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="party-card p-4 flex items-center gap-3 flex-shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center font-fredoka text-xl text-white flex-shrink-0">
                    {spotlightPlayer?.name[0].toUpperCase() ?? "?"}
                </div>
                <div>
                    <div className="font-fredoka text-white text-lg leading-tight">{spotlightPlayer?.name ?? "Spotlight"}</div>
                    <div className="font-nunito text-white/45 text-xs">is in the spotlight</div>
                </div>
                <div className="ml-auto text-3xl">✌️</div>
            </motion.div>

            {isSpotlight ? (
                /* ── Spotlight player writes ── */
                <div className="flex flex-col gap-3 flex-1 scroll-y">
                    <p className="font-nunito text-white/55 text-sm flex-shrink-0">Write 3 statements — 2 true, 1 lie. Then mark which is the lie.</p>
                    {[0, 1, 2].map(i => (
                        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className={`party-card p-4 flex flex-col gap-2 ${lieIndex === i ? "border-red-500/50" : ""}`}
                            style={{ borderColor: lieIndex === i ? "rgba(239,68,68,0.5)" : undefined }}>
                            <div className="flex items-center justify-between">
                                <span className="font-fredoka text-white text-base">Statement {i + 1}</span>
                                <button
                                    onClick={() => setLieIndex(lieIndex === i ? null : i)}
                                    className={`font-nunito font-extrabold text-xs px-3 py-1.5 rounded-xl transition-all active:scale-95 ${lieIndex === i ? "bg-red-500/30 text-red-400 border border-red-500/50" : "bg-white/10 text-white/50 border border-white/15"}`}>
                                    {lieIndex === i ? "🤥 This is the LIE" : "Mark as LIE"}
                                </button>
                            </div>
                            <input className="party-input" placeholder={i === 0 ? "e.g. I've been to 3 countries" : i === 1 ? "e.g. I can speak French" : "e.g. I once met a celebrity"}
                                value={statements[i]} onChange={e => updateStatement(i, e.target.value)} maxLength={120} />
                        </motion.div>
                    ))}
                    <button className={`btn-primary w-full flex-shrink-0 mt-1 ${!canSubmit ? "opacity-40 pointer-events-none" : ""}`}
                        onClick={handleSubmit}>
                        {!answered ? "Submit Statements →" : "✅ Submitted!"}
                    </button>
                </div>
            ) : (
                /* ── Other players wait ── */
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="text-6xl wait-pulse">✌️</div>
                    <div className="font-fredoka text-white text-xl text-center">
                        {spotlightPlayer?.name} is writing<br />their statements…
                    </div>
                    <p className="font-nunito text-white/40 text-sm text-center max-w-[240px]">
                        Get ready — you&apos;ll soon need to spot the lie!
                    </p>
                </div>
            )}
        </div>
    );
}
