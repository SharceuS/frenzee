"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfxTap, sfxSubmit } from "@/lib/sounds";

interface Props {
    onCreate: (name: string) => void;
    onJoin: (code: string, name: string) => void;
}

const GAME_PREVIEWS = [
    { emoji: "🕵️", title: "Guess the Liar", color: "#7C3AED", desc: "Catch the liar" },
    { emoji: "🔥", title: "Hot Takes", color: "#EF4444", desc: "Minority wins" },
    { emoji: "🤔", title: "Would You Rather", color: "#3B82F6", desc: "A or B?" },
    { emoji: "🎭", title: "Roast Room", color: "#F97316", desc: "Funniest answer" },
    { emoji: "✌️", title: "Two Truths", color: "#EC4899", desc: "Spot the lie" },
    { emoji: "🏆", title: "Most Likely To", color: "#F59E0B", desc: "Vote the group" },
    { emoji: "✏️", title: "Finish the Sentence", color: "#8B5CF6", desc: "Get creative" },
    { emoji: "☠️", title: "Pick Your Poison", color: "#DC2626", desc: "No good options" },
    { emoji: "🤫", title: "Confessions", color: "#7C3AED", desc: "Anonymous secrets" },
    { emoji: "💬", title: "Whose Line?", color: "#3B82F6", desc: "Guess the author" },
    { emoji: "⭐", title: "Rate That Take", color: "#A855F7", desc: "Wild opinions" },
    { emoji: "🔗", title: "Word Association", color: "#10B981", desc: "Match the group" },
    { emoji: "📖", title: "Emoji Story", color: "#EC4899", desc: "Emojis → story" },
    { emoji: "🤪", title: "Unhinged Advice", color: "#F97316", desc: "Absurd scenarios" },
    { emoji: "🏅", title: "Superlatives", color: "#F59E0B", desc: "Vote who fits" },
    { emoji: "⚡", title: "This or That", color: "#06B6D4", desc: "Rapid fire" },
    { emoji: "🙅", title: "Never Have I Ever", color: "#10B981", desc: "Confess it" },
    { emoji: "🚩", title: "Red Flag Radar", color: "#DC2626", desc: "Red or green?" },
    { emoji: "⚔️", title: "Debate Pit", color: "#06B6D4", desc: "Crowd votes" },
    { emoji: "✨", title: "Vibe Check", color: "#8B5CF6", desc: "Match vibes" },
    { emoji: "🔥", title: "Burn or Build", color: "#F59E0B", desc: "Scrap or keep" },
    { emoji: "⚡", title: "Speed Round", color: "#EF4444", desc: "Yes or No?" },
];

const STATS = [
    { value: "22", label: "Games" },
    { value: "∞", label: "Questions" },
    { value: "2-12", label: "Players" },
];

export default function HomeScreen({ onCreate, onJoin }: Props) {
    const [tab, setTab] = useState<"create" | "join">("create");
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [shake, setShake] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleCreate = () => {
        if (name.trim()) { sfxSubmit(); onCreate(name.trim()); }
        else { triggerShake(); nameRef.current?.focus(); }
    };
    const handleJoin = () => {
        if (name.trim() && code.trim().length === 4) { sfxSubmit(); onJoin(code.trim(), name.trim()); }
        else { triggerShake(); nameRef.current?.focus(); }
    };

    return (
        <div className="page-wrap gap-5">
            {/* ── Hero ─────────────────────── */}
            <motion.div
                initial={{ scale: 0.7, opacity: 0, y: -20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="text-center pt-4"
            >
                {/* Glowing logo */}
                <div className="relative inline-block mb-3">
                    <div className="absolute inset-0 blur-2xl opacity-60 rounded-full"
                        style={{ background: "radial-gradient(circle, #9333EA, #EC4899)" }} />
                    <div className="relative text-7xl select-none" style={{ filter: "drop-shadow(0 0 24px rgba(236,72,153,0.7))" }}>
                        🎉
                    </div>
                </div>
                <h1 className="font-fredoka leading-none mb-1" style={{ fontSize: "clamp(2.8rem, 10vw, 3.6rem)" }}>
                    <span className="text-white">Pocket</span>
                    <br />
                    <span style={{
                        background: "linear-gradient(135deg, #FBBF24, #F472B6, #A78BFA)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}>
                        Party!
                    </span>
                </h1>
                <p className="font-nunito text-white/50 text-sm font-600">
                    The ultimate party game for your phone 🕹️
                </p>

                {/* Stats row */}
                <div className="flex justify-center gap-5 mt-4">
                    {STATS.map(s => (
                        <div key={s.label} className="text-center">
                            <div className="font-fredoka text-2xl text-white leading-none">{s.value}</div>
                            <div className="font-nunito text-white/35 text-xs mt-0.5">{s.label}</div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* ── Game Carousel Preview ──── */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="w-full overflow-hidden"
                style={{ maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)" }}
            >
                <div className="home-ticker flex gap-2">
                    {[...GAME_PREVIEWS, ...GAME_PREVIEWS].map((g, i) => (
                        <div key={i} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10"
                            style={{ background: g.color + "18" }}>
                            <span className="text-xl">{g.emoji}</span>
                            <div>
                                <div className="font-fredoka text-white text-sm leading-none">{g.title}</div>
                                <div className="font-nunito text-white/40 text-xs">{g.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* ── Create / Join Card ───────── */}
            <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="party-card w-full p-5 flex flex-col gap-4"
            >
                {/* Tab switcher */}
                <div className="home-tab-row flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                    {(["create", "join"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => { sfxTap(); setTab(t); }}
                            className="flex-1 py-2.5 rounded-xl font-fredoka text-lg transition-all duration-200"
                            style={tab === t ? {
                                background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                                color: "white",
                                boxShadow: "0 4px 16px rgba(124,58,237,0.5)"
                            } : { color: "rgba(255,255,255,0.4)" }}
                        >
                            {t === "create" ? "🏠 Host" : "🔑 Join"}
                        </button>
                    ))}
                </div>

                {/* Name input */}
                <div>
                    <label className="font-nunito font-800 text-white/60 text-xs uppercase tracking-widest mb-1.5 block">
                        Your Name
                    </label>
                    <motion.input
                        ref={nameRef}
                        className="party-input"
                        placeholder="Enter your name…"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        maxLength={20}
                        onKeyDown={e => e.key === "Enter" && (tab === "create" ? handleCreate() : handleJoin())}
                        animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                        transition={{ duration: 0.4 }}
                        autoComplete="off"
                        autoCapitalize="words"
                    />
                </div>

                {/* Room code (join only) */}
                <AnimatePresence>
                    {tab === "join" && (
                        <motion.div
                            key="code-input"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <label className="font-nunito font-800 text-white/60 text-xs uppercase tracking-widest mb-1.5 block">
                                Room Code
                            </label>
                            <input
                                className="party-input tracking-[0.5em] uppercase text-center font-fredoka text-3xl"
                                placeholder="XXXX"
                                value={code}
                                onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
                                maxLength={4}
                                inputMode="text"
                                autoCapitalize="characters"
                                autoComplete="off"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* CTA button */}
                <motion.button
                    className="btn-primary w-full text-xl"
                    onClick={tab === "create" ? handleCreate : handleJoin}
                    whileTap={{ scale: 0.96 }}
                >
                    {tab === "create" ? "🚀 Create Room" : "🎮 Join Game"}
                </motion.button>

                <p className="font-nunito text-white/25 text-xs text-center -mt-1">
                    {tab === "create" ? "Your friends can join with a 4-letter code" : "Ask your host for the room code"}
                </p>
            </motion.div>

            {/* ── Game count badge ─────────── */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="w-full flex flex-wrap gap-2 justify-center pb-4"
            >
                {[
                    { label: "🏆 Popular", count: 10 },
                    { label: "✨ Original", count: 12 },
                ].map(cat => (
                    <div key={cat.label} className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-card">
                        <span className="font-fredoka text-white text-base">{cat.label}</span>
                        <span className="font-nunito font-800 text-white/40 text-xs">{cat.count} games</span>
                    </div>
                ))}
            </motion.div>
        </div>
    );
}

