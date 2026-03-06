"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Room } from "@/lib/types";

interface Props {
    room: Room;
    myId: string;
    myDebateRole: { position: string; side: "for" | "against" } | null;
    onSubmit: (answer: unknown) => void;
}

export default function DebatePitScreen({ room, myId, myDebateRole, onSubmit }: Props) {
    const [argument, setArgument] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const isDebater = room.debaterIds?.includes(myId);
    const answered = room.players.find(p => p.id === myId)?.hasAnswered ?? submitted;
    const qd = room.questionData as Record<string, string> | null;

    const forDebater = room.players.find(p => p.id === room.debaterIds?.[0]);
    const agaDebater = room.players.find(p => p.id === room.debaterIds?.[1]);

    const answerCount = Object.keys(room.answers ?? {}).length; // not ideal but works
    const debatersDone = room.debaterIds?.filter(id => room.players.find(p => p.id === id)?.hasAnswered).length ?? 0;

    const handleSubmit = () => {
        if (!argument.trim() || answered) return;
        onSubmit(argument.trim());
        setSubmitted(true);
    };

    return (
        <div className="page-fill gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="round-pill">⚔️ Round {room.round}/{room.maxRounds}</div>
                <div className="font-nunito text-white/45 text-xs">Debate Pit</div>
            </div>

            {/* Topic */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="party-card p-4 flex-shrink-0">
                <p className="font-nunito text-white/40 text-xs uppercase tracking-widest mb-2">⚔️ Today&apos;s Topic</p>
                <p className="font-fredoka text-xl text-white leading-snug">{room.currentQuestion}</p>
            </motion.div>

            {/* Debaters */}
            <div className="flex gap-3 flex-shrink-0">
                <div className={`flex-1 rounded-2xl p-3 text-center ${myId === room.debaterIds?.[0] ? "side-for border" : "glass-card"}`}>
                    <div className="font-nunito text-green-400 text-xs font-extrabold uppercase mb-1">FOR</div>
                    <div className="font-fredoka text-white text-base">{forDebater?.name ?? "?"}</div>
                    {qd?.forPosition && <div className="font-nunito text-white/50 text-xs mt-1">&ldquo;{qd.forPosition}&rdquo;</div>}
                    {forDebater && room.players.find(p => p.id === forDebater.id)?.hasAnswered && (
                        <div className="text-green-400 text-xs mt-1 font-nunito font-extrabold">✓ Ready</div>
                    )}
                </div>
                <div className="flex items-center font-fredoka text-white/30 text-xl">vs</div>
                <div className={`flex-1 rounded-2xl p-3 text-center ${myId === room.debaterIds?.[1] ? "side-against border" : "glass-card"}`}>
                    <div className="font-nunito text-red-400 text-xs font-extrabold uppercase mb-1">AGAINST</div>
                    <div className="font-fredoka text-white text-base">{agaDebater?.name ?? "?"}</div>
                    {qd?.againstPosition && <div className="font-nunito text-white/50 text-xs mt-1">&ldquo;{qd.againstPosition}&rdquo;</div>}
                    {agaDebater && room.players.find(p => p.id === agaDebater.id)?.hasAnswered && (
                        <div className="text-green-400 text-xs mt-1 font-nunito font-extrabold">✓ Ready</div>
                    )}
                </div>
            </div>

            {isDebater && !answered ? (
                /* ── Debater writes argument ── */
                <div className="flex-1 flex flex-col gap-3">
                    <div className={`font-nunito font-extrabold text-sm px-3 py-1.5 rounded-xl inline-flex self-start ${myDebateRole?.side === "for" ? "side-for border" : "side-against border"}`}>
                        You argue: {myDebateRole?.position ?? (myId === room.debaterIds?.[0] ? qd?.forPosition : qd?.againstPosition)}
                    </div>
                    <textarea className="party-textarea flex-1" style={{ minHeight: "80px" }}
                        placeholder="Make your case — be persuasive, be bold! 💪"
                        value={argument} onChange={e => setArgument(e.target.value)} maxLength={300} />
                    <div className="flex items-center justify-between">
                        <span className="font-nunito text-white/30 text-xs">{argument.length}/300</span>
                        <button className={`btn-primary ${!argument.trim() ? "opacity-40 pointer-events-none" : ""}`} onClick={handleSubmit}>
                            Submit Argument →
                        </button>
                    </div>
                </div>
            ) : isDebater && answered ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="text-5xl">✅</div>
                    <div className="font-fredoka text-white text-xl">Argument submitted!</div>
                    <p className="font-nunito text-white/40 text-sm wait-pulse">Waiting for the other debater…</p>
                </div>
            ) : (
                /* ── Audience waits ── */
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="text-6xl wait-pulse">⚔️</div>
                    <div className="font-fredoka text-white text-xl text-center">
                        Debaters are writing<br />their arguments…
                    </div>
                    <div className="font-nunito text-white/40 text-sm">{debatersDone}/2 ready</div>
                    <p className="font-nunito text-white/35 text-xs text-center max-w-[240px]">
                        Stay tuned — you&apos;ll vote for the winner!
                    </p>
                </div>
            )}
        </div>
    );
}
