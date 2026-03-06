"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfxTap, sfxSubmit } from "@/lib/sounds";
import SvgAvatar, { AVATAR_PALETTES, HEAD_LABELS, EYES_LABELS, MOUTH_LABELS } from "@/components/SvgAvatar";
import type { AvatarConfig } from "@/lib/types";

interface Props {
    onCreate: (name: string, avatar: AvatarConfig) => void;
    onJoin: (code: string, name: string, avatar: AvatarConfig) => void;
}

const STATS = [
    { value: "26", label: "Games" },
    { value: "∞", label: "Questions" },
    { value: "2-12", label: "Players" },
];

const FEATURE_ROWS: { key: keyof AvatarConfig; label: string; options: string[] }[] = [
    { key: "head", label: "Hair", options: HEAD_LABELS },
    { key: "eyes", label: "Eyes", options: EYES_LABELS },
    { key: "mouth", label: "Mouth", options: MOUTH_LABELS },
];

const LS_KEY = "frenzee_avatar";
const LS_NAME_KEY = "frenzee_name";

export default function HomeScreen({ onCreate, onJoin }: Props) {
    const [tab, setTab] = useState<"create" | "join">("create");
    const [name, setName] = useState(() => {
        try { return localStorage.getItem(LS_NAME_KEY) ?? ""; } catch { return ""; }
    });
    const [code, setCode] = useState("");
    const [shake, setShake] = useState(false);
    const [pages, setPages] = useState<Record<string, number>>({ head: 0, eyes: 0, mouth: 0 });
    const [avatar, setAvatar] = useState<AvatarConfig>(() => {
        try {
            const saved = localStorage.getItem(LS_KEY);
            return saved ? (JSON.parse(saved) as AvatarConfig) : { head: 0, eyes: 0, mouth: 0, color: 0 };
        } catch { return { head: 0, eyes: 0, mouth: 0, color: 0 }; }
    });
    const nameRef = useRef<HTMLInputElement>(null);

    // Persist avatar to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem(LS_KEY, JSON.stringify(avatar));
    }, [avatar]);

    // Persist name
    useEffect(() => {
        localStorage.setItem(LS_NAME_KEY, name);
    }, [name]);

    const setFeature = (key: keyof AvatarConfig, val: number) => {
        sfxTap();
        setAvatar(a => ({ ...a, [key]: val }));
    };

    const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

    const handleCreate = () => {
        if (name.trim()) { sfxSubmit(); onCreate(name.trim(), avatar); }
        else { triggerShake(); nameRef.current?.focus(); }
    };
    const handleJoin = () => {
        if (name.trim() && code.trim().length === 4) { sfxSubmit(); onJoin(code.trim(), name.trim(), avatar); }
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
                <h1 className="font-fredoka leading-none mb-1 whitespace-nowrap" style={{ fontSize: "clamp(2.6rem, 9vw, 3.4rem)" }}>
                    <span style={{
                        background: "linear-gradient(135deg, #FBBF24, #F472B6, #A78BFA)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                    }}>Frenzee</span>
                    <span className="text-white"> 🎉</span>
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

            {/* ── Create / Join Card ───────── */}
            <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="party-card w-full p-5 flex flex-col gap-4"
            >
                {/* Tab switcher */}
                <div className="home-tab-row flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                    {(["create", "join"] as const).map(t => (
                        <button key={t} onClick={() => { sfxTap(); setTab(t); }}
                            className="flex-1 py-2.5 rounded-xl font-fredoka text-lg transition-all duration-200"
                            style={tab === t ? {
                                background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                                color: "white", boxShadow: "0 4px 16px rgba(124,58,237,0.5)"
                            } : { color: "rgba(255,255,255,0.4)" }}>
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

                {/* ── Avatar Picker ───────────────────── */}
                <div>
                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                        <span className="font-nunito font-800 text-white/40 text-xs uppercase tracking-widest">Your Look</span>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                    </div>

                    {/* Live preview */}
                    <div className="flex justify-center mb-4">
                        <motion.div
                            className="relative"
                            key={`${avatar.color}-${avatar.head}-${avatar.eyes}-${avatar.mouth}`}
                            initial={{ scale: 0.85, opacity: 0.7 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        >
                            <div className="w-20 h-20 rounded-[28px] overflow-hidden ring-4 ring-white/20 shadow-2xl">
                                <SvgAvatar config={avatar} size={80} />
                            </div>
                            {name.trim() && (
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap
                                    font-fredoka text-white text-xs px-2.5 py-0.5 rounded-full"
                                    style={{ background: AVATAR_PALETTES[avatar.color % 8].bg1 }}>
                                    {name.trim()}
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Color swatches */}
                    <div className="flex justify-center gap-2 mb-4 flex-wrap">
                        {AVATAR_PALETTES.map((p, i) => (
                            <button key={i}
                                onClick={() => setFeature("color", i)}
                                className="w-8 h-8 rounded-full transition-all duration-150 active:scale-90"
                                style={{
                                    background: `linear-gradient(135deg, ${p.bg1}, ${p.bg2})`,
                                    boxShadow: avatar.color === i
                                        ? `0 0 0 3px white, 0 0 0 5px ${p.bg1}`
                                        : "none",
                                    transform: avatar.color === i ? "scale(1.15)" : "scale(1)",
                                }}
                            />
                        ))}
                    </div>

                    {/* Feature rows: hair / eyes / mouth */}
                    <div className="flex flex-col gap-3">
                        {FEATURE_ROWS.map(({ key, label, options }) => {
                            const page = pages[key] ?? 0;
                            const start = page * 4;
                            return (
                                <div key={key}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="font-nunito text-white/45 text-[10px] uppercase tracking-widest">{label}</div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => { sfxTap(); setPages(p => ({ ...p, [key]: 0 })); }}
                                                className="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
                                                style={{
                                                    opacity: page > 0 ? 1 : 0.2, pointerEvents: page > 0 ? "auto" : "none",
                                                    background: "rgba(255,255,255,0.08)"
                                                }}>
                                                <span className="text-white text-xs">‹</span>
                                            </button>
                                            <span className="font-nunito text-white/25 text-[10px]">{page + 1}/2</span>
                                            <button
                                                onClick={() => { sfxTap(); setPages(p => ({ ...p, [key]: 1 })); }}
                                                className="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
                                                style={{
                                                    opacity: page < 1 ? 1 : 0.2, pointerEvents: page < 1 ? "auto" : "none",
                                                    background: "rgba(255,255,255,0.08)"
                                                }}>
                                                <span className="text-white text-xs">›</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {options.slice(start, start + 4).map((optLabel, i) => {
                                            const idx = start + i;
                                            const optAvatar: AvatarConfig = { ...avatar, [key]: idx };
                                            const isSelected = avatar[key] === idx;
                                            return (
                                                <button key={idx}
                                                    onClick={() => setFeature(key, idx)}
                                                    className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-all duration-150 active:scale-95"
                                                    style={{
                                                        background: isSelected
                                                            ? `linear-gradient(135deg, ${AVATAR_PALETTES[avatar.color % 8].bg1}44, ${AVATAR_PALETTES[avatar.color % 8].bg2}33)`
                                                            : "rgba(255,255,255,0.05)",
                                                        border: isSelected
                                                            ? `1.5px solid ${AVATAR_PALETTES[avatar.color % 8].bg1}88`
                                                            : "1.5px solid rgba(255,255,255,0.08)",
                                                    }}>
                                                    <div className="w-8 h-8 rounded-xl overflow-hidden">
                                                        <SvgAvatar config={optAvatar} size={32} />
                                                    </div>
                                                    <span className="font-nunito text-[9px] leading-none"
                                                        style={{ color: isSelected ? "white" : "rgba(255,255,255,0.35)" }}>
                                                        {optLabel.split(" ")[0]}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Room code (join only) */}
                <AnimatePresence>
                    {tab === "join" && (
                        <motion.div key="code-input"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden">
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
                    whileTap={{ scale: 0.96 }}>
                    {tab === "create" ? "🚀 Create Room" : "🎮 Join Game"}
                </motion.button>

                <p className="font-nunito text-white/25 text-xs text-center -mt-1">
                    {tab === "create" ? "Your friends can join with a 4-letter code" : "Ask your host for the room code"}
                </p>
            </motion.div>

            {/* ── Game count badges (1 compact row) ───────────── */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="w-full flex items-center justify-center gap-2 pb-4"
            >
                {[
                    { icon: "⭐", label: "Popular", count: 10, color: "#7C3AED" },
                    { icon: "✨", label: "Original", count: 12, color: "#EC4899" },
                    { icon: "🎮", label: "Arcade", count: 4, color: "#10B981" },
                ].map(cat => (
                    <div key={cat.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
                        style={{ background: cat.color + "22", border: `1px solid ${cat.color}44` }}>
                        <span className="text-sm">{cat.icon}</span>
                        <span className="font-fredoka text-white text-sm leading-none">{cat.label}</span>
                        <span className="font-nunito text-white/40 text-[10px] leading-none">{cat.count}</span>
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
