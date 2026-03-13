"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfxTap, sfxSubmit } from "@/lib/sounds";
import SvgAvatar, { AVATAR_PALETTES, HEAD_LABELS, EYES_LABELS, MOUTH_LABELS } from "@/components/SvgAvatar";
import FrenezeeLogo from "@/components/FrenezeeLogo";
import ThreeBackground from "@/components/ThreeBackground";
import type { AvatarConfig } from "@/lib/types";

interface Props {
    onCreate: (name: string, avatar: AvatarConfig) => void;
    onJoin: (code: string, name: string, avatar: AvatarConfig) => void;
}

type Step = "landing" | "avatar";
type Flow = "create" | "join";

const STATS = [
    { value: "26", label: "Games", icon: "🎮" },
    { value: "∞", label: "Questions", icon: "❓" },
    { value: "2-12", label: "Players", icon: "👥" },
];

const FEATURE_ROWS: { key: keyof AvatarConfig; label: string; options: string[] }[] = [
    { key: "head", label: "Hair", options: HEAD_LABELS },
    { key: "eyes", label: "Eyes", options: EYES_LABELS },
    { key: "mouth", label: "Mouth", options: MOUTH_LABELS },
];

const LS_KEY = "frenzee_avatar";
const LS_NAME_KEY = "frenzee_name";

export default function HomeScreen({ onCreate, onJoin }: Props) {
    const [step, setStep] = useState<Step>("landing");
    const [flow, setFlow] = useState<Flow>("create");
    const [name, setName] = useState(() => {
        try { return localStorage.getItem(LS_NAME_KEY) ?? ""; } catch { return ""; }
    });
    const [code, setCode] = useState("");
    const [shake, setShake] = useState(false);
    const [stripPages, setStripPages] = useState<Record<string, number>>({ head: 0, eyes: 0, mouth: 0 });
    const stripRefs = useRef<Record<string, HTMLDivElement | null>>({});
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

    const goAvatar = (f: Flow) => { sfxTap(); setFlow(f); setStep("avatar"); };

    const handleCTA = () => {
        if (!name.trim()) { triggerShake(); nameRef.current?.focus(); return; }
        if (flow === "join" && code.trim().length !== 4) { triggerShake(); return; }
        sfxSubmit();
        if (flow === "create") onCreate(name.trim(), avatar);
        else onJoin(code.trim(), name.trim(), avatar);
    };

    const pal = AVATAR_PALETTES[avatar.color % AVATAR_PALETTES.length];
    const PAGE_SIZE = 4;

    const scrollToPage = (key: string, pg: number, totalPages: number) => {
        sfxTap();
        const el = stripRefs.current[key];
        if (!el) return;
        const clamped = Math.max(0, Math.min(totalPages - 1, pg));
        el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
        setStripPages(p => ({ ...p, [key]: clamped }));
    };

    const handleStripScroll = (key: string, el: HTMLDivElement) => {
        if (!el.clientWidth) return;
        const pg = Math.round(el.scrollLeft / el.clientWidth);
        setStripPages(p => p[key] === pg ? p : { ...p, [key]: pg });
    };

    return (
        <div style={{ position: "relative", width: "100%", minHeight: "100svh" }}>
            {/* ── Background image ──────────────────────────────────── */}
            <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
                <div className="home-bg-mobile" />
                <div className="home-bg-desk" />
                <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to bottom, rgba(8,4,20,0.45) 0%, rgba(8,4,20,0.72) 60%, rgba(8,4,20,0.88) 100%)",
                }} />
            </div>

            {/* ── Three.js 3D background ────────────────────────────── */}
            <ThreeBackground />

            {/* ── Screens ──────────────────────────────────────────── */}
            <AnimatePresence mode="wait">

                {/* ─────────────── STEP 1: LANDING ────────────────── */}
                {step === "landing" && (
                    <motion.div
                        key="landing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -30, transition: { duration: 0.2 } }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: "relative", zIndex: 2,
                            minHeight: "100svh",
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            padding: "24px 20px 36px",
                        }}
                    >
                        {/* Logo */}
                        <motion.div
                            initial={{ y: -40, opacity: 0, scale: 0.82 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{ type: "spring", stiffness: 230, damping: 18, delay: 0.08 }}
                            style={{ width: "100%", maxWidth: 330, marginBottom: 10 }}
                        >
                            <FrenezeeLogo />
                        </motion.div>

                        {/* Tagline */}
                        <motion.p
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.32 }}
                            style={{
                                fontFamily: "'Nunito', sans-serif", fontWeight: 800,
                                fontSize: "clamp(0.78rem, 3.2vw, 0.92rem)",
                                color: "rgba(255,255,255,0.48)",
                                letterSpacing: "0.2em", textTransform: "uppercase",
                                marginBottom: 38, textAlign: "center",
                            }}
                        >
                            Games&nbsp;&nbsp;·&nbsp;&nbsp;Friends&nbsp;&nbsp;·&nbsp;&nbsp;Chaos
                        </motion.p>

                        {/* Button box */}
                        <motion.div
                            initial={{ opacity: 0, y: 28, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.42 }}
                            style={{
                                width: "100%", maxWidth: 340,
                                background: "rgba(10,5,28,0.75)",
                                border: "1px solid rgba(124,58,237,0.32)",
                                borderRadius: 24,
                                backdropFilter: "blur(20px)",
                                WebkitBackdropFilter: "blur(20px)",
                                padding: "22px 18px",
                                display: "flex", flexDirection: "column", gap: 13,
                                boxShadow: "0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
                                marginBottom: 30,
                            }}
                        >
                            <GameButton
                                label="Create Room"
                                icon="🎮"
                                gradient="linear-gradient(135deg, #FF416C 0%, #E91E8C 100%)"
                                shadow="0 6px 0 #7a0a38, 0 10px 28px rgba(255,65,108,0.45)"
                                activeShadow="0 2px 0 #7a0a38, 0 4px 12px rgba(255,65,108,0.3)"
                                onClick={() => goAvatar("create")}
                            />
                            <GameButton
                                label="Join Room"
                                icon="🔑"
                                gradient="linear-gradient(135deg, #00B4DB 0%, #0056B3 100%)"
                                shadow="0 6px 0 #003570, 0 10px 28px rgba(0,180,219,0.45)"
                                activeShadow="0 2px 0 #003570, 0 4px 12px rgba(0,180,219,0.3)"
                                onClick={() => goAvatar("join")}
                            />
                        </motion.div>

                        {/* Stats row */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.62 }}
                            style={{ display: "flex", gap: 28, justifyContent: "center" }}
                        >
                            {STATS.map(s => (
                                <div key={s.label} style={{ textAlign: "center" }}>
                                    <div style={{
                                        fontFamily: "'Fredoka One', cursive",
                                        fontSize: "1.5rem", color: "white", lineHeight: 1, marginBottom: 3,
                                    }}>{s.icon} {s.value}</div>
                                    <div style={{
                                        fontFamily: "'Nunito', sans-serif", fontSize: "0.7rem",
                                        color: "rgba(255,255,255,0.36)", textTransform: "uppercase", letterSpacing: "0.1em",
                                    }}>{s.label}</div>
                                </div>
                            ))}
                        </motion.div>
                    </motion.div>
                )}

                {/* ─────────────── STEP 2: AVATAR BUILDER ──────────── */}
                {step === "avatar" && (
                    <motion.div
                        key="avatar"
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0, transition: { duration: 0.22 } }}
                        transition={{ type: "spring", stiffness: 260, damping: 28 }}
                        style={{ position: "relative", zIndex: 2, minHeight: "100svh", display: "flex", flexDirection: "column" }}
                    >
                        <div style={{
                            flex: 1,
                            background: "rgba(10,5,28,0.96)",
                            backdropFilter: "blur(24px)",
                            WebkitBackdropFilter: "blur(24px)",
                            borderTop: "1px solid rgba(124,58,237,0.28)",
                            overflowY: "auto",
                            paddingBottom: "env(safe-area-inset-bottom, 20px)",
                        }}>
                            {/* Sticky header */}
                            <div style={{
                                display: "flex", alignItems: "center", gap: 13,
                                padding: "16px 18px 12px",
                                borderBottom: "1px solid rgba(255,255,255,0.05)",
                                position: "sticky", top: 0,
                                background: "rgba(10,5,28,0.97)",
                                backdropFilter: "blur(20px)",
                                zIndex: 10,
                            }}>
                                <button
                                    onClick={() => { sfxTap(); setStep("landing"); }}
                                    style={{
                                        width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                                        border: "1px solid rgba(255,255,255,0.12)",
                                        background: "rgba(255,255,255,0.06)", color: "white",
                                        fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
                                        cursor: "pointer",
                                    }}
                                >‹</button>
                                <div>
                                    <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: "1.2rem", color: "white", lineHeight: 1 }}>
                                        {flow === "create" ? "Create Room" : "Join Room"}
                                    </div>
                                    <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.72rem", color: "rgba(255,255,255,0.38)" }}>
                                        Build your character
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 20 }}>

                                {/* Room code — join only */}
                                {flow === "join" && (
                                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
                                        <FieldLabel>Room Code</FieldLabel>
                                        <input
                                            className="party-input"
                                            placeholder="XXXX"
                                            value={code}
                                            onChange={e => setCode(e.target.value.toUpperCase().slice(0, 4))}
                                            maxLength={4}
                                            inputMode="text"
                                            autoCapitalize="characters"
                                            autoComplete="off"
                                            style={{ letterSpacing: "0.55em", textAlign: "center", fontFamily: "'Fredoka One', cursive", fontSize: "1.8rem" }}
                                        />
                                    </motion.div>
                                )}

                                {/* Name */}
                                <div>
                                    <FieldLabel>Your Name</FieldLabel>
                                    <motion.input
                                        ref={nameRef}
                                        className="party-input"
                                        placeholder="Enter your name…"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        maxLength={20}
                                        onKeyDown={e => e.key === "Enter" && handleCTA()}
                                        animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
                                        transition={{ duration: 0.4 }}
                                        autoComplete="off"
                                        autoCapitalize="words"
                                    />
                                </div>

                                {/* Avatar preview */}
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                                    <motion.div
                                        key={`${avatar.color}-${avatar.head}-${avatar.eyes}-${avatar.mouth}`}
                                        initial={{ scale: 0.85, opacity: 0.6 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                        style={{ position: "relative" }}
                                    >
                                        <div style={{
                                            position: "absolute", inset: -14, borderRadius: "50%",
                                            background: `radial-gradient(circle, ${pal.bg1}44, transparent 70%)`,
                                            filter: "blur(8px)",
                                        }} />
                                        <div style={{
                                            width: 96, height: 96, borderRadius: 30,
                                            overflow: "hidden", position: "relative",
                                            boxShadow: `0 0 0 4px ${pal.bg1}66, 0 8px 32px rgba(0,0,0,0.5)`,
                                        }}>
                                            <SvgAvatar config={avatar} size={96} />
                                        </div>
                                        {name.trim() && (
                                            <div style={{
                                                position: "absolute", bottom: -12,
                                                left: "50%", transform: "translateX(-50%)",
                                                whiteSpace: "nowrap", fontFamily: "'Fredoka One', cursive",
                                                color: "white", fontSize: "0.72rem",
                                                padding: "2px 10px", borderRadius: 100,
                                                background: pal.bg1, boxShadow: `0 2px 8px ${pal.bg1}88`,
                                            }}>{name.trim()}</div>
                                        )}
                                    </motion.div>

                                    {/* Colour palette */}
                                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
                                        {AVATAR_PALETTES.map((p, i) => (
                                            <button key={i} onClick={() => setFeature("color", i)} style={{
                                                width: 32, height: 32, borderRadius: "50%",
                                                background: `linear-gradient(135deg, ${p.bg1}, ${p.bg2})`,
                                                border: avatar.color === i ? "3px solid white" : "2px solid transparent",
                                                outline: avatar.color === i ? `2px solid ${p.bg1}` : "none",
                                                transform: avatar.color === i ? "scale(1.18)" : "scale(1)",
                                                transition: "all 0.14s", cursor: "pointer",
                                            }} />
                                        ))}
                                    </div>
                                </div>

                                {/* Feature rows */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                    {FEATURE_ROWS.map(({ key, label, options }) => {
                                        const totalPages = Math.ceil(options.length / PAGE_SIZE);
                                        const currentPage = stripPages[key as string] ?? 0;
                                        return (
                                            <div key={key}>
                                                {/* Label + pill-dot indicators */}
                                                <div style={{
                                                    display: "flex", alignItems: "center",
                                                    justifyContent: "space-between", marginBottom: 10,
                                                }}>
                                                    <span style={{
                                                        fontFamily: "'Nunito', sans-serif", fontWeight: 800,
                                                        fontSize: "0.7rem", textTransform: "uppercase",
                                                        letterSpacing: "0.12em", color: "rgba(255,255,255,0.42)",
                                                    }}>{label}</span>
                                                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                                        {Array.from({ length: totalPages }).map((_, i) => (
                                                            <button key={i}
                                                                onClick={() => scrollToPage(key as string, i, totalPages)}
                                                                style={{
                                                                    width: i === currentPage ? 18 : 6,
                                                                    height: 6, borderRadius: 3, padding: 0,
                                                                    background: i === currentPage ? pal.bg1 : "rgba(255,255,255,0.18)",
                                                                    border: "none", cursor: "pointer",
                                                                    transition: "all 0.22s",
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                {/* Desktop arrows + scrollable strip */}
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    {/* Left arrow */}
                                                    <button
                                                        onClick={() => scrollToPage(key as string, currentPage - 1, totalPages)}
                                                        style={{
                                                            width: 28, height: 64, borderRadius: 10, flexShrink: 0,
                                                            border: "1px solid rgba(255,255,255,0.10)",
                                                            background: "rgba(255,255,255,0.04)", color: "white",
                                                            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                                                            cursor: currentPage === 0 ? "default" : "pointer",
                                                            opacity: currentPage === 0 ? 0.18 : 0.65,
                                                            transition: "opacity 0.2s", userSelect: "none",
                                                        }}
                                                    >‹</button>
                                                    {/* Scroll-snap strip (swipe on mobile, arrow on desktop) */}
                                                    <div
                                                        ref={el => { stripRefs.current[key as string] = el; }}
                                                        onScroll={e => handleStripScroll(key as string, e.currentTarget)}
                                                        className="avatar-strip"
                                                        style={{
                                                            flex: 1, display: "flex",
                                                            overflowX: "auto", overflowY: "hidden",
                                                            scrollSnapType: "x mandatory",
                                                        }}
                                                    >
                                                        {Array.from({ length: totalPages }).map((_, pageIdx) => (
                                                            <div key={pageIdx} style={{
                                                                display: "flex", gap: 8,
                                                                flex: "0 0 100%", scrollSnapAlign: "start",
                                                            }}>
                                                                {options.slice(pageIdx * PAGE_SIZE, (pageIdx + 1) * PAGE_SIZE).map((optLabel, i) => {
                                                                    const idx = pageIdx * PAGE_SIZE + i;
                                                                    const optAvatar: AvatarConfig = { ...avatar, [key]: idx };
                                                                    const isSelected = avatar[key] === idx;
                                                                    return (
                                                                        <button key={idx}
                                                                            onClick={() => setFeature(key, idx)}
                                                                            style={{
                                                                                flex: 1,
                                                                                display: "flex", flexDirection: "column",
                                                                                alignItems: "center", gap: 5,
                                                                                padding: "10px 3px 8px", borderRadius: 16,
                                                                                border: isSelected
                                                                                    ? `2px solid ${pal.bg1}`
                                                                                    : "2px solid rgba(255,255,255,0.08)",
                                                                                background: isSelected
                                                                                    ? `${pal.bg1}28`
                                                                                    : "rgba(255,255,255,0.04)",
                                                                                cursor: "pointer",
                                                                                transition: "all 0.14s",
                                                                                transform: isSelected ? "scale(1.07)" : "scale(1)",
                                                                                boxShadow: isSelected ? `0 0 16px ${pal.bg1}50` : "none",
                                                                            }}>
                                                                            <div style={{ width: 40, height: 40, borderRadius: 12, overflow: "hidden" }}>
                                                                                <SvgAvatar config={optAvatar} size={40} />
                                                                            </div>
                                                                            <span style={{
                                                                                fontFamily: "'Nunito', sans-serif", fontSize: 9,
                                                                                color: isSelected ? "white" : "rgba(255,255,255,0.34)",
                                                                                fontWeight: 800, lineHeight: 1,
                                                                            }}>{optLabel.split(" ")[0]}</span>
                                                                            {isSelected && (
                                                                                <div style={{
                                                                                    width: 5, height: 5, borderRadius: "50%",
                                                                                    background: pal.bg1,
                                                                                    boxShadow: `0 0 6px ${pal.bg1}`,
                                                                                    marginTop: -2,
                                                                                }} />
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Right arrow */}
                                                    <button
                                                        onClick={() => scrollToPage(key as string, currentPage + 1, totalPages)}
                                                        style={{
                                                            width: 28, height: 64, borderRadius: 10, flexShrink: 0,
                                                            border: "1px solid rgba(255,255,255,0.10)",
                                                            background: "rgba(255,255,255,0.04)", color: "white",
                                                            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                                                            cursor: currentPage === totalPages - 1 ? "default" : "pointer",
                                                            opacity: currentPage === totalPages - 1 ? 0.18 : 0.65,
                                                            transition: "opacity 0.2s", userSelect: "none",
                                                        }}
                                                    >›</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* CTA */}
                                <motion.button
                                    onClick={handleCTA}
                                    whileTap={{ scale: 0.97, y: 3 }}
                                    style={{
                                        width: "100%", padding: "16px 28px", borderRadius: 18, border: "none",
                                        fontFamily: "'Fredoka One', cursive", fontSize: "1.35rem", color: "white",
                                        cursor: "pointer",
                                        background: flow === "create"
                                            ? "linear-gradient(135deg, #FF416C 0%, #E91E8C 100%)"
                                            : "linear-gradient(135deg, #00B4DB 0%, #0056B3 100%)",
                                        boxShadow: flow === "create"
                                            ? "0 5px 0 #7a0a38, 0 8px 24px rgba(255,65,108,0.4)"
                                            : "0 5px 0 #003570, 0 8px 24px rgba(0,180,219,0.4)",
                                        marginTop: 4, marginBottom: 12,
                                        textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                                    }}
                                >
                                    {flow === "create" ? "🚀 Let's Go!" : "🎮 Join Game"}
                                </motion.button>

                            </div>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}

/* ── Small helper components ─────────────────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontFamily: "'Nunito', sans-serif", fontWeight: 800,
            fontSize: "0.7rem", textTransform: "uppercase",
            letterSpacing: "0.13em", color: "rgba(255,255,255,0.48)", marginBottom: 7,
        }}>{children}</div>
    );
}

interface GameButtonProps {
    label: string; icon: string; gradient: string; shadow: string; activeShadow: string; onClick: () => void;
}
function GameButton({ label, icon, gradient, shadow, activeShadow, onClick }: GameButtonProps) {
    const [pressed, setPressed] = useState(false);
    return (
        <button
            onPointerDown={() => setPressed(true)}
            onPointerUp={() => { setPressed(false); onClick(); }}
            onPointerLeave={() => setPressed(false)}
            onPointerCancel={() => setPressed(false)}
            style={{
                width: "100%", padding: "17px 24px", borderRadius: 16, border: "none",
                fontFamily: "'Fredoka One', cursive", fontSize: "1.4rem", color: "white", cursor: "pointer",
                background: gradient,
                boxShadow: pressed ? activeShadow : shadow,
                transform: pressed ? "translateY(4px)" : "translateY(0)",
                transition: "transform 0.07s, box-shadow 0.07s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                letterSpacing: "0.02em", userSelect: "none", outline: "none",
                textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                WebkitTapHighlightColor: "transparent",
            }}
        >
            <span style={{ fontSize: "1.55rem" }}>{icon}</span>{label}
        </button>
    );
}
