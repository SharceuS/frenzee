"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Room } from "@/lib/types";
import { useSse } from "@/lib/sse";
import { apiWordBombSubmit } from "@/lib/api";
import { sfxTap, sfxSubmit, sfxError } from "@/lib/sounds";

interface Props { room: Room; myId: string; }

export default function WordBombScreen({ room, myId }: Props) {
    const { on, off } = useSse();
    const [word, setWord] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [bombShake, setBombShake] = useState(false);
    const [lastExploded, setLastExploded] = useState<string | null>(null);
    const [newPattern, setNewPattern] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const pattern = room.wordBombPattern ?? "???";
    const activeId = room.wordBombActiveId;
    const lives = room.wordBombLives ?? {};
    const fuse = room.wordBombMinFuse ?? 8;
    const isMyTurn = activeId === myId;
    const alivePlayers = room.players.filter((p: { id: string }) => (lives[p.id] ?? 0) > 0);

    // Focus input when it's my turn
    useEffect(() => {
        if (isMyTurn) { inputRef.current?.focus(); sfxTap(); }
    }, [isMyTurn, activeId]);

    // Listen for bomb events via SSE
    useEffect(() => {
        const onExplode = ({ playerId }: { playerId: string }) => {
            const name = room.players.find((p) => p.id === playerId)?.name ?? "?";
            setLastExploded(name);
            setBombShake(true);
            sfxError();
            setTimeout(() => { setBombShake(false); setLastExploded(null); }, 2000);
        };
        const onNewPattern = ({ pattern: p }: { pattern: string }) => {
            setNewPattern(p);
            setTimeout(() => setNewPattern(null), 1500);
        };
        on("bomb_exploded", onExplode);
        on("word_bomb_new_pattern", onNewPattern);
        return () => {
            off("bomb_exploded", onExplode);
            off("word_bomb_new_pattern", onNewPattern);
        };
    }, [on, off, room.players]);

    const handleSubmit = async () => {
        if (!word.trim() || !isMyTurn) return;
        sfxSubmit();
        const w = word.trim();
        setWord("");
        const res = await apiWordBombSubmit(room.code, myId, w);
        if (!res.ok && res.reason) {
            sfxError();
            setErrorMsg(res.reason);
            setTimeout(() => setErrorMsg(""), 2000);
        }
    };

    // Bomb tick speed based on fuse (faster = more ticking)
    const tickDuration = Math.max(0.3, fuse / 8);

    return (
        <div className="page-fill gap-4 items-center">
            {/* Round pill */}
            <div className="flex-shrink-0 self-stretch flex justify-between items-center">
                <div className="round-pill">💣 Round {room.round}/{room.maxRounds}</div>
                <div className="font-nunito text-white/40 text-xs">Fuse: {fuse.toFixed(1)}s</div>
            </div>

            {/* New pattern toast */}
            <AnimatePresence>
                {newPattern && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex-shrink-0 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/40">
                        <span className="font-fredoka text-amber-300 text-sm">New pattern: <strong>{newPattern}</strong></span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pattern display */}
            <motion.div animate={{ scale: bombShake ? [1, 1.15, 0.9, 1.1, 1] : 1 }}
                transition={{ duration: 0.4 }}
                className="flex-shrink-0 flex flex-col items-center gap-3">
                <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: tickDuration, repeat: Infinity, ease: "easeInOut" }}
                    className="text-7xl select-none">💣</motion.div>
                <div className="font-fredoka text-5xl text-white tracking-widest"
                    style={{ textShadow: "0 0 30px rgba(239,68,68,0.7)" }}>
                    {pattern}
                </div>
                <p className="font-nunito text-white/40 text-sm text-center max-w-[240px]">
                    Type a word that contains <strong className="text-white">"{pattern}"</strong>
                </p>
            </motion.div>

            {/* Explosion toast */}
            <AnimatePresence>
                {lastExploded && (
                    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex-shrink-0 px-5 py-2 rounded-full bg-red-500/30 border border-red-500/50">
                        <span className="font-fredoka text-red-300 text-base">💥 {lastExploded} lost a life!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* My turn input */}
            <AnimatePresence>
                {isMyTurn && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex-shrink-0 w-full flex flex-col gap-2">
                        <div className="text-center">
                            <span className="font-fredoka text-white text-lg">🎯 Your turn!</span>
                        </div>
                        <div className="flex gap-2">
                            <input ref={inputRef} className="party-input flex-1 text-lg uppercase tracking-widest"
                                placeholder={`e.g. "T${pattern.toLowerCase()}LE"`}
                                value={word} onChange={(e) => setWord(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === "Enter" && handleSubmit()} maxLength={30} />
                            <button className="btn-sm" onClick={handleSubmit} disabled={!word.trim()}>💥</button>
                        </div>
                        {errorMsg && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="font-nunito text-red-400 text-xs text-center">{errorMsg}</motion.p>
                        )}
                    </motion.div>
                )}
                {!isMyTurn && activeId && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex-shrink-0 text-center">
                        <p className="font-nunito text-white/50 text-sm wait-pulse">
                            ⏳ {room.players.find((p) => p.id === activeId)?.name ?? "?"} is thinking…
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Player lives */}
            <div className="flex-shrink-0 w-full flex flex-col gap-1.5">
                <p className="font-nunito text-white/30 text-xs uppercase tracking-widest text-center">Players</p>
                <div className="flex flex-wrap gap-2 justify-center">
                    {room.players.map((p) => {
                        const l = lives[p.id] ?? 0;
                        const isActive = p.id === activeId;
                        const isDead = l === 0;
                        return (
                            <div key={p.id}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${isDead ? "bg-white/5 border-white/5 opacity-30" :
                                    isActive ? "bg-red-500/20 border-red-500/50 shadow-lg shadow-red-500/20" :
                                        "bg-white/5 border-white/10"}`}>
                                <span className="font-nunito text-sm text-white">{p.name}</span>
                                <span className="text-xs">{Array.from({ length: l }).map((_, i) => <span key={i}>💣</span>)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
