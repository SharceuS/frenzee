"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfxTap } from "@/lib/sounds";
import SvgAvatar, { AVATAR_PALETTES, HEAD_LABELS, EYES_LABELS, MOUTH_LABELS } from "@/components/SvgAvatar";
import type { AvatarConfig } from "@/lib/types";

const FEATURE_ROWS: { key: keyof AvatarConfig; label: string; options: string[] }[] = [
    { key: "head", label: "Hair", options: HEAD_LABELS },
    { key: "eyes", label: "Eyes", options: EYES_LABELS },
    { key: "mouth", label: "Mouth", options: MOUTH_LABELS },
];

const PAGE_SIZE = 4;

interface Props {
    open: boolean;
    onClose: () => void;
    onSave: (avatar: AvatarConfig) => void;
    initialAvatar: AvatarConfig;
    playerName?: string;
}

export default function AvatarEditSheet({ open, onClose, onSave, initialAvatar, playerName }: Props) {
    const [avatar, setAvatar] = useState<AvatarConfig>(initialAvatar);
    const [stripPages, setStripPages] = useState<Record<string, number>>({ head: 0, eyes: 0, mouth: 0 });
    const stripRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        if (!open) return;
        setAvatar(initialAvatar);
        setStripPages({ head: 0, eyes: 0, mouth: 0 });
    }, [open, initialAvatar]);

    const pal = AVATAR_PALETTES[avatar.color % AVATAR_PALETTES.length];

    const setFeature = (key: keyof AvatarConfig, val: number) => {
        sfxTap();
        setAvatar(a => ({ ...a, [key]: val }));
    };

    const handleStripScroll = (key: string, el: HTMLDivElement) => {
        if (!el.clientWidth) return;
        const pg = Math.round(el.scrollLeft / el.clientWidth);
        setStripPages(p => p[key] === pg ? p : { ...p, [key]: pg });
    };

    const scrollToPage = (key: string, pg: number, totalPages: number) => {
        sfxTap();
        const el = stripRefs.current[key];
        if (!el) return;
        const clamped = Math.max(0, Math.min(totalPages - 1, pg));
        el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
        setStripPages(p => ({ ...p, [key]: clamped }));
    };

    const handleSave = () => {
        sfxTap();
        onSave(avatar);
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="eas-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        style={{
                            position: "fixed", inset: 0, zIndex: 50,
                            background: "rgba(0,0,0,0.65)",
                            backdropFilter: "blur(6px)",
                        }}
                    />

                    {/* Sheet */}
                    <motion.div
                        key="eas-sheet"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 380, damping: 38 }}
                        style={{
                            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 51,
                            background: "linear-gradient(180deg, #1A0830 0%, #0C0818 100%)",
                            borderRadius: "28px 28px 0 0",
                            padding: "18px 20px 32px",
                            maxHeight: "86svh",
                            overflowY: "auto",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderBottom: "none",
                        }}
                    >
                        {/* Handle + header */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                            <div style={{ flex: 1 }} />
                            <div style={{
                                width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.18)",
                                position: "absolute", left: "50%", transform: "translateX(-50%) translateY(-12px)",
                                top: 0,
                            }} />
                            <div style={{
                                fontFamily: "'Fredoka One', cursive", fontSize: "1.15rem", color: "white",
                                flex: "none",
                                position: "absolute", left: "50%", transform: "translateX(-50%)",
                            }}>
                                Edit Avatar{playerName ? ` · ${playerName}` : ""}
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    flex: "none", marginLeft: "auto", background: "rgba(255,255,255,0.07)",
                                    border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)",
                                    borderRadius: 12, padding: "6px 12px", fontFamily: "'Nunito', sans-serif",
                                    fontSize: "0.8rem", fontWeight: 700, cursor: "pointer",
                                }}
                            >Cancel</button>
                        </div>

                        {/* Avatar preview */}
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                            <div style={{
                                width: 100, height: 100, borderRadius: 28,
                                overflow: "hidden", flexShrink: 0,
                                border: `3px solid ${pal.bg1}`,
                                boxShadow: `0 0 24px ${pal.bg1}50`,
                            }}>
                                <SvgAvatar config={avatar} size={100} />
                            </div>
                        </div>

                        {/* Palette picker */}
                        <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
                            {AVATAR_PALETTES.map((p, i) => (
                                <button key={i} onClick={() => setFeature("color", i)} style={{
                                    width: 30, height: 30, borderRadius: "50%",
                                    background: `linear-gradient(135deg, ${p.bg1}, ${p.bg2})`,
                                    border: avatar.color === i ? "2.5px solid white" : "2.5px solid rgba(255,255,255,0.12)",
                                    cursor: "pointer",
                                    boxShadow: avatar.color === i ? `0 0 10px ${p.bg1}` : "none",
                                    transition: "all 0.14s",
                                    transform: avatar.color === i ? "scale(1.18)" : "scale(1)",
                                }} />
                            ))}
                        </div>

                        {/* Feature rows */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                            {FEATURE_ROWS.map(({ key, label, options }) => {
                                const totalPages = Math.ceil(options.length / PAGE_SIZE);
                                const currentPage = stripPages[key as string] ?? 0;
                                return (
                                    <div key={key as string}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                            <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: "0.75rem", fontWeight: 800, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
                                            <div style={{ display: "flex", gap: 4 }}>
                                                {Array.from({ length: totalPages }).map((_, pi) => (
                                                    <button key={pi} onClick={() => scrollToPage(key as string, pi, totalPages)} style={{
                                                        width: pi === currentPage ? 16 : 6, height: 6, borderRadius: 99,
                                                        background: pi === currentPage ? pal.bg1 : "rgba(255,255,255,0.2)",
                                                        border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s",
                                                    }} />
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <button onClick={() => scrollToPage(key as string, currentPage - 1, totalPages)}
                                                style={{ width: 28, height: 64, borderRadius: 10, flexShrink: 0, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "white", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: currentPage === 0 ? "default" : "pointer", opacity: currentPage === 0 ? 0.18 : 0.65, transition: "opacity 0.2s", userSelect: "none" }}
                                            >‹</button>
                                            <div
                                                ref={el => { stripRefs.current[key as string] = el; }}
                                                onScroll={e => handleStripScroll(key as string, e.currentTarget)}
                                                className="avatar-strip"
                                                style={{ flex: 1, display: "flex", overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory" }}
                                            >
                                                {Array.from({ length: totalPages }).map((_, pageIdx) => (
                                                    <div key={pageIdx} style={{ display: "flex", gap: 8, flex: "0 0 100%", scrollSnapAlign: "start" }}>
                                                        {options.slice(pageIdx * PAGE_SIZE, (pageIdx + 1) * PAGE_SIZE).map((optLabel, i) => {
                                                            const idx = pageIdx * PAGE_SIZE + i;
                                                            const optAvatar: AvatarConfig = { ...avatar, [key]: idx };
                                                            const isSelected = avatar[key] === idx;
                                                            return (
                                                                <button key={idx} onClick={() => setFeature(key, idx)}
                                                                    style={{
                                                                        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                                                                        padding: "10px 3px 8px", borderRadius: 16,
                                                                        border: isSelected ? `2px solid ${pal.bg1}` : "2px solid rgba(255,255,255,0.08)",
                                                                        background: isSelected ? `${pal.bg1}28` : "rgba(255,255,255,0.04)",
                                                                        cursor: "pointer", transition: "all 0.14s",
                                                                        transform: isSelected ? "scale(1.07)" : "scale(1)",
                                                                        boxShadow: isSelected ? `0 0 16px ${pal.bg1}50` : "none",
                                                                    }}>
                                                                    <div style={{ width: 40, height: 40, borderRadius: 12, overflow: "hidden" }}>
                                                                        <SvgAvatar config={optAvatar} size={40} />
                                                                    </div>
                                                                    <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 9, color: isSelected ? "white" : "rgba(255,255,255,0.34)", fontWeight: 800, lineHeight: 1 }}>
                                                                        {optLabel.split(" ")[0]}
                                                                    </span>
                                                                    {isSelected && (
                                                                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: pal.bg1, boxShadow: `0 0 6px ${pal.bg1}`, marginTop: -2 }} />
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={() => scrollToPage(key as string, currentPage + 1, totalPages)}
                                                style={{ width: 28, height: 64, borderRadius: 10, flexShrink: 0, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "white", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: currentPage === totalPages - 1 ? "default" : "pointer", opacity: currentPage === totalPages - 1 ? 0.18 : 0.65, transition: "opacity 0.2s", userSelect: "none" }}
                                            >›</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Save */}
                        <motion.button
                            onClick={handleSave}
                            whileTap={{ scale: 0.97, y: 2 }}
                            style={{
                                width: "100%", marginTop: 24, padding: "15px 28px", borderRadius: 18, border: "none",
                                fontFamily: "'Fredoka One', cursive", fontSize: "1.2rem", color: "white",
                                cursor: "pointer",
                                background: `linear-gradient(135deg, ${pal.bg1}, ${pal.bg2})`,
                                boxShadow: `0 5px 0 rgba(0,0,0,0.4), 0 8px 24px ${pal.bg1}40`,
                            }}
                        >
                            Save Avatar
                        </motion.button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
