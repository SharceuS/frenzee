"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Room } from "@/lib/types";
import { sfxSubmit } from "@/lib/sounds";

interface Props {
    room: Room;
    myId: string;
    myRole: "liar" | "truth_teller" | null;
    onSubmit: (answer: unknown) => void;
}

const META: Record<string, { label: string; placeholder: string; hint?: string }> = {
    guess_the_liar: { label: "Your answer:", placeholder: "" },
    roast_room: { label: "Your roast:", placeholder: "Be creative, be brutal 😈" },
    vibe_check: { label: "Your vibe:", placeholder: "Describe yourself as this…" },
};

export default function AnsweringScreen({ room, myId, myRole, onSubmit }: Props) {
    const [answer, setAnswer] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const gt = room.gameType ?? "";
    const isLiar = myRole === "liar";
    const answered = room.players.find(p => p.id === myId)?.hasAnswered ?? submitted;
    const meta = META[gt] ?? { label: "Your answer:", placeholder: "Type here…" };
    const q = room.currentQuestion ?? "";
    const qd = room.questionData as Record<string, string> | null;

    const liarLabel = isLiar ? "🤫 Make up a fake answer:" : "✍️ Your honest answer:";
    const liarPlaceholder = isLiar ? "Make it believable…" : "Be honest!";
    const displayLabel = gt === "guess_the_liar" ? liarLabel : meta.label;
    const displayPlaceholder = gt === "guess_the_liar" ? liarPlaceholder : (meta.placeholder || "Type your answer…");

    const handleSubmit = () => {
        if (!answer.trim() || answered) return;
        sfxSubmit();
        onSubmit(answer.trim());
        setSubmitted(true);
    };

    const total = room.players.length;

    return (
        <div className="page-fill gap-3">
            {/* Header row */}
            <div className="flex items-center justify-between flex-shrink-0 pt-1">
                <div className="round-pill">{room.round}/{room.maxRounds}</div>
                <div className="flex items-center gap-1.5">
                    {room.players.map(p => (
                        <div key={p.id} className={`w-2 h-2 rounded-full transition-all duration-300 ${p.hasAnswered ? "bg-green-400" : "bg-white/20"}`} />
                    ))}
                    <span className="font-nunito text-white/50 text-xs ml-1">{room.answerCount}/{total}</span>
                </div>
            </div>

            {/* Progress bar */}
            <div className="progress-track flex-shrink-0">
                <motion.div className="progress-fill" initial={{ width: 0 }}
                    animate={{ width: `${(room.answerCount / total) * 100}%` }} transition={{ duration: 0.5 }} />
            </div>

            {/* Role badge (GTL only) */}
            {gt === "guess_the_liar" && myRole && (
                <div className={`self-center font-fredoka text-base text-white px-5 py-2 rounded-full flex-shrink-0 ${isLiar ? "role-liar" : "role-truth"}`}>
                    {isLiar ? "🤥 You're the LIAR" : "🧐 Truth Teller"}
                </div>
            )}

            {/* Question card */}
            <div className="party-card p-4 flex-shrink-0">
                {gt === "would_you_rather" && qd ? (
                    <div className="flex flex-col gap-1.5">
                        <div className="glass-card p-2.5 rounded-xl"><span className="font-nunito text-purple-400 text-xs font-extrabold">A</span> <span className="font-fredoka text-white text-base ml-1">{qd.optionA}</span></div>
                        <div className="text-center font-fredoka text-white/30 text-xs">— or —</div>
                        <div className="glass-card p-2.5 rounded-xl"><span className="font-nunito text-pink-400 text-xs font-extrabold">B</span> <span className="font-fredoka text-white text-base ml-1">{qd.optionB}</span></div>
                    </div>
                ) : (
                    <>
                        <p className="font-nunito text-white/40 text-xs uppercase tracking-widest mb-1.5">🎯 {gt === "vibe_check" ? "Your prompt" : "Question"}</p>
                        <p className="font-fredoka text-xl text-white leading-snug">{q}</p>
                        {qd?.hint && <p className="font-nunito text-white/40 text-xs mt-1.5">💡 {qd.hint as string}</p>}
                    </>
                )}
            </div>

            {/* Input area */}
            <div className="party-card p-4 flex flex-col gap-3 flex-1">
                {!answered ? (
                    <>
                        <label className="font-nunito font-extrabold text-white text-sm">{displayLabel}</label>
                        <textarea className="party-textarea flex-1" style={{ minHeight: "80px", maxHeight: "140px" }}
                            placeholder={displayPlaceholder} value={answer}
                            onChange={e => setAnswer(e.target.value)} maxLength={250} />
                        <div className="flex items-center justify-between">
                            <span className="font-nunito text-white/30 text-xs">{answer.length}/250</span>
                            <button className={`btn-sm ${!answer.trim() ? "opacity-40 pointer-events-none" : ""}`} onClick={handleSubmit}>
                                Submit →
                            </button>
                        </div>
                    </>
                ) : (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center gap-2 py-4 flex-1">
                        <div className="text-5xl">✅</div>
                        <div className="font-fredoka text-2xl text-white">Submitted!</div>
                        <p className="font-nunito text-white/45 text-sm wait-pulse">Waiting for others…</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
