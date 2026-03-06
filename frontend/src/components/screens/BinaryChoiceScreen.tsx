"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Room } from "@/lib/types";
import { sfxTap, sfxSubmit } from "@/lib/sounds";

interface Props {
    room: Room;
    myId: string;
    onSubmit: (answer: unknown) => void;
}

interface GameConfig {
    emoji: string;
    question: string;
    optA: { label: string; sublabel?: string; emoji: string; cls: string };
    optB: { label: string; sublabel?: string; emoji: string; cls: string };
}

function getConfig(room: Room): GameConfig {
    const q = room.currentQuestion ?? "";
    const qd = room.questionData as Record<string, string> | null;
    switch (room.gameType) {
        case "never_have_i_ever":
            return {
                emoji: "🙅", question: q,
                optA: { label: "I HAVE", emoji: "😏", cls: "choice-btn choice-btn-have" },
                optB: { label: "I NEVER", emoji: "🤷", cls: "choice-btn choice-btn-never" }
            };
        case "would_you_rather":
            return {
                emoji: "🤔", question: "Would you rather…",
                optA: { label: qd?.optionA ?? "Option A", emoji: "🅰️", cls: "choice-btn choice-btn-a" },
                optB: { label: qd?.optionB ?? "Option B", emoji: "🅱️", cls: "choice-btn choice-btn-b" }
            };
        case "hot_takes":
            return {
                emoji: "🔥", question: q,
                optA: { label: "AGREE", emoji: "✅", sublabel: "I think so too", cls: "choice-btn choice-btn-agree" },
                optB: { label: "DISAGREE", emoji: "❌", sublabel: "Nah, that's wrong", cls: "choice-btn choice-btn-disagree" }
            };
        case "red_flag_radar":
            return {
                emoji: "🚩", question: q,
                optA: { label: "RED FLAG", emoji: "🚩", sublabel: "That's a no from me", cls: "choice-btn choice-btn-red" },
                optB: { label: "GREEN FLAG", emoji: "✅", sublabel: "Totally fine!", cls: "choice-btn choice-btn-green" }
            };
        case "this_or_that":
            return {
                emoji: "⚡", question: q,
                optA: { label: qd?.optionA ?? "This", emoji: "👈", cls: "choice-btn choice-btn-a" },
                optB: { label: qd?.optionB ?? "That", emoji: "👉", cls: "choice-btn choice-btn-b" }
            };
        case "pick_your_poison":
            return {
                emoji: "☠️", question: "Pick your poison…",
                optA: { label: qd?.optionA ?? "Option A", emoji: "💀", sublabel: "Suffer choice A", cls: "choice-btn choice-btn-red" },
                optB: { label: qd?.optionB ?? "Option B", emoji: "☠️", sublabel: "Suffer choice B", cls: "choice-btn choice-btn-never" }
            };
        case "burn_or_build":
            return {
                emoji: "🔥", question: q,
                optA: { label: "BURN IT", emoji: "🔥", sublabel: "Scrap it entirely", cls: "choice-btn choice-btn-red" },
                optB: { label: "BUILD IT", emoji: "🏗️", sublabel: "Keep & improve", cls: "choice-btn choice-btn-agree" }
            };
        case "speed_round":
            return {
                emoji: "⚡", question: q,
                optA: { label: "YES", emoji: "✅", sublabel: "Absolutely!", cls: "choice-btn choice-btn-agree" },
                optB: { label: "NO", emoji: "❌", sublabel: "No way!", cls: "choice-btn choice-btn-disagree" }
            };
        case "rate_that_take":
            return {
                emoji: "⭐", question: q,
                optA: { label: "AGREE", emoji: "💯", sublabel: "Spitting facts", cls: "choice-btn choice-btn-agree" },
                optB: { label: "DISAGREE", emoji: "🗑️", sublabel: "Absolute trash take", cls: "choice-btn choice-btn-disagree" }
            };
        default:
            return {
                emoji: "🎮", question: q,
                optA: { label: "Option A", emoji: "A", cls: "choice-btn choice-btn-a" },
                optB: { label: "Option B", emoji: "B", cls: "choice-btn choice-btn-b" }
            };
    }
}

export default function BinaryChoiceScreen({ room, myId, onSubmit }: Props) {
    const [picked, setPicked] = useState<string | null>(null);
    const player = room.players.find(p => p.id === myId);
    const hasAnswered = player?.hasAnswered ?? !!picked;
    const cfg = getConfig(room);

    const handle = (val: string) => {
        if (hasAnswered) return;
        sfxTap();
        setPicked(val);
        sfxSubmit();
        onSubmit(val);
    };

    const gameValMap: Record<string, [string, string]> = {
        never_have_i_ever: ["have", "never"],
        would_you_rather: ["a", "b"],
        hot_takes: ["agree", "disagree"],
        red_flag_radar: ["red", "green"],
        this_or_that: ["a", "b"],
        pick_your_poison: ["a", "b"],
        burn_or_build: ["burn", "build"],
        speed_round: ["yes", "no"],
        rate_that_take: ["agree", "disagree"],
    };
    const [aVal, bVal] = gameValMap[room.gameType ?? ""] ?? ["a", "b"];

    return (
        <div className="page-fill gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="round-pill">{cfg.emoji} Round {room.round}/{room.maxRounds}</div>
                <div className="flex items-center gap-1.5">
                    {room.players.map(p => (
                        <div key={p.id} className={`w-2 h-2 rounded-full transition-all ${p.hasAnswered ? "bg-green-400" : "bg-white/20"}`} />
                    ))}
                    <span className="font-nunito text-white/45 text-xs ml-1">{room.answerCount}/{room.players.length}</span>
                </div>
            </div>

            {/* Question */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="party-card p-5 flex-shrink-0">
                <p className="font-nunito text-white/40 text-xs uppercase tracking-widest mb-2">{cfg.emoji} {cfg.question !== room.currentQuestion ? cfg.question : "This round"}</p>
                <p className="font-fredoka text-2xl text-white leading-snug">{room.currentQuestion}</p>
            </motion.div>

            {/* Big choice buttons */}
            {!hasAnswered ? (
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="flex gap-3 flex-1">
                    <button className={`${cfg.optA.cls} ${picked ? "opacity-50" : ""}`} onClick={() => handle(aVal)}>
                        <div className="text-4xl mb-2">{cfg.optA.emoji}</div>
                        <div className="font-fredoka">{cfg.optA.label}</div>
                        {cfg.optA.sublabel && <div className="font-nunito text-xs opacity-80 mt-1">{cfg.optA.sublabel}</div>}
                    </button>
                    <button className={`${cfg.optB.cls} ${picked ? "opacity-50" : ""}`} onClick={() => handle(bVal)}>
                        <div className="text-4xl mb-2">{cfg.optB.emoji}</div>
                        <div className="font-fredoka">{cfg.optB.label}</div>
                        {cfg.optB.sublabel && <div className="font-nunito text-xs opacity-80 mt-1">{cfg.optB.sublabel}</div>}
                    </button>
                </motion.div>
            ) : (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="text-6xl">{picked === aVal ? cfg.optA.emoji : cfg.optB.emoji}</div>
                    <div className="font-fredoka text-white text-2xl">{picked === aVal ? cfg.optA.label : cfg.optB.label}</div>
                    <p className="font-nunito text-white/40 text-sm wait-pulse">Waiting for others…</p>
                </motion.div>
            )}

            {/* Player dots */}
            {hasAnswered && (
                <div className="flex-shrink-0 flex flex-wrap gap-2 justify-center pb-2">
                    {room.players.map(p => (
                        <div key={p.id} className={`font-nunito text-xs px-2.5 py-1 rounded-full transition-all
                          ${p.hasAnswered ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-white/5 text-white/30 border border-white/10"}`}>
                            {p.hasAnswered ? "✓" : "⏳"} {p.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
