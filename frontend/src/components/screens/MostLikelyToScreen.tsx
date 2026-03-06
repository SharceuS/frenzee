"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Room } from "@/lib/types";

const AVATAR_COLORS = [
    "from-violet-500 to-purple-600", "from-pink-500 to-rose-600", "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500", "from-sky-400 to-blue-500", "from-fuchsia-400 to-pink-500",
    "from-cyan-400 to-blue-400", "from-lime-400 to-green-500",
];

interface Props { room: Room; myId: string; onVote: (targetId: string) => void; }

export default function MostLikelyToScreen({ room, myId, onVote }: Props) {
    const [voted, setVoted] = useState<string | null>(null);
    const hasVoted = room.players.find(p => p.id === myId)?.hasVoted ?? !!voted;

    const handle = (id: string) => {
        if (hasVoted) return;
        setVoted(id);
        onVote(id);
    };

    return (
        <div className="page-fill gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="round-pill">🏆 Round {room.round}/{room.maxRounds}</div>
                <div className="flex items-center gap-1.5">
                    {room.players.map(p => (
                        <div key={p.id} className={`w-2 h-2 rounded-full transition-all ${p.hasVoted ? "bg-amber-400" : "bg-white/20"}`} />
                    ))}
                    <span className="font-nunito text-white/45 text-xs ml-1">{room.voteCount}/{room.players.length}</span>
                </div>
            </div>

            {/* Question */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="party-card p-5 flex-shrink-0 text-center">
                <p className="font-nunito text-white/40 text-xs uppercase tracking-widest mb-2">🏆 Most likely to…</p>
                <p className="font-fredoka text-2xl text-white leading-snug">{room.currentQuestion}</p>
            </motion.div>

            {/* Player grid */}
            <div className="font-nunito text-white/50 text-xs uppercase tracking-widest flex-shrink-0">
                {hasVoted ? "You voted ✓" : "Tap to vote"}
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1 scroll-y content-start">
                {room.players.map((p, i) => (
                    <motion.button key={p.id}
                        initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06, type: "spring", stiffness: 280 }}
                        onClick={() => handle(p.id)}
                        disabled={hasVoted}
                        className={`player-vote-btn flex flex-col items-center gap-2 py-5
                          ${voted === p.id ? "voted" : ""}
                          ${hasVoted && voted !== p.id ? "opacity-40" : ""}`}>
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]}
                          flex items-center justify-center font-fredoka text-xl text-white`}>
                            {p.name[0].toUpperCase()}
                        </div>
                        <span className="leading-tight">{p.name}</span>
                        {p.id === myId && <span className="text-xs opacity-60">(you)</span>}
                        {voted === p.id && <span className="text-yellow-400 text-lg">⭐</span>}
                    </motion.button>
                ))}
            </div>

            {hasVoted && (
                <p className="font-nunito text-white/40 text-sm text-center wait-pulse flex-shrink-0 pb-2">
                    Vote locked in! Waiting for everyone…
                </p>
            )}
        </div>
    );
}
