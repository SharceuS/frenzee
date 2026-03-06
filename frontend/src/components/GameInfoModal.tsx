"use client";
import { motion, AnimatePresence } from "framer-motion";
import { sfxTap } from "@/lib/sounds";

interface GameInfo {
    id: string;
    emoji: string;
    title: string;
    color: string;
    desc: string;
    rules: string[];
    scoring: string;
    minPlayers: number;
    maxPlayers: number;
    duration: string;
}

interface Props {
    game: GameInfo | null;
    onClose: () => void;
}

export default function GameInfoModal({ game, onClose }: Props) {
    return (
        <AnimatePresence>
            {game && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
                        onClick={() => { sfxTap(); onClose(); }}
                    />
                    {/* Sheet */}
                    <motion.div
                        key="sheet"
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 340, damping: 32 }}
                        className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto"
                    >
                        <div className="party-card rounded-t-[32px] rounded-b-none p-6 flex flex-col gap-5"
                            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>

                            {/* Drag handle */}
                            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-2" />

                            {/* Header */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
                                    style={{ background: game.color + "22", border: `2px solid ${game.color}44` }}>
                                    {game.emoji}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-fredoka text-2xl text-white leading-tight">{game.title}</div>
                                    <div className="font-nunito text-white/50 text-sm mt-0.5">{game.desc}</div>
                                </div>
                                <button onClick={() => { sfxTap(); onClose(); }}
                                    className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/60 flex-shrink-0 active:scale-90 transition-transform">
                                    ✕
                                </button>
                            </div>

                            {/* Quick stats */}
                            <div className="flex gap-2">
                                {[
                                    { label: "👥 Players", value: `${game.minPlayers}–${game.maxPlayers}` },
                                    { label: "⏱ Time", value: game.duration },
                                ].map(s => (
                                    <div key={s.label} className="flex-1 rounded-2xl px-3 py-2.5 text-center"
                                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                        <div className="font-fredoka text-lg text-white leading-none">{s.value}</div>
                                        <div className="font-nunito text-white/40 text-xs mt-0.5">{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* How to play */}
                            <div>
                                <p className="font-nunito font-800 text-white/50 text-xs uppercase tracking-widest mb-3">
                                    How to Play
                                </p>
                                <div className="flex flex-col gap-2">
                                    {game.rules.map((rule, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="w-6 h-6 rounded-lg flex items-center justify-center font-fredoka text-sm flex-shrink-0"
                                                style={{ background: game.color + "33", color: game.color }}>
                                                {i + 1}
                                            </div>
                                            <p className="font-nunito text-white/75 text-sm leading-snug flex-1">{rule}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Scoring */}
                            <div className="rounded-2xl px-4 py-3"
                                style={{ background: game.color + "15", border: `1px solid ${game.color}30` }}>
                                <p className="font-nunito font-800 text-xs uppercase tracking-widest mb-1"
                                    style={{ color: game.color }}>
                                    🏆 Scoring
                                </p>
                                <p className="font-nunito text-white/70 text-sm">{game.scoring}</p>
                            </div>

                            {/* Safe area spacer */}
                            <div style={{ height: "env(safe-area-inset-bottom, 12px)" }} />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
