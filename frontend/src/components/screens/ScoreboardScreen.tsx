"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Room } from "@/lib/types";
import SvgAvatar, { defaultAvatarFromId, AVATAR_PALETTES } from "@/components/SvgAvatar";

interface Props {
    room: Room;
    myId: string;
    isHost: boolean;
    onPlayAgain: () => void;
}

const MEDALS = ["🥇", "🥈", "🥉"];

function BossCrown() {
    return (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 28 L11 6 L19 19 L24 2 L29 19 L37 6 L46 28 Z"
                fill="#FBBF24" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
            <rect x="2" y="25" width="44" height="7" rx="3" fill="#F59E0B" />
            <circle cx="24" cy="14" r="3.5" fill="#EC4899" />
            <circle cx="9"  cy="22" r="2.5" fill="#7C3AED" />
            <circle cx="39" cy="22" r="2.5" fill="#7C3AED" />
        </svg>
    );
}

export default function ScoreboardScreen({ room, myId, isHost, onPlayAgain }: Props) {
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    const topScore = sorted[0]?.score ?? 0;
    const winners = sorted.filter(p => p.score === topScore);
    const isWinner = winners.some(w => w.id === myId);
    const isAllTied = winners.length >= room.players.length;
    const isSolo = winners.length === 1;
    // Cap avatars displayed in hero — overflow shown as a pill
    const MAX_HERO_AVATARS = 3;
    const heroWinners = isAllTied ? [] : winners.slice(0, MAX_HERO_AVATARS);
    const heroOverflow = isAllTied ? 0 : Math.max(0, winners.length - MAX_HERO_AVATARS);

    useEffect(() => {
        import("canvas-confetti").then(m => {
            const confetti = m.default;
            confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
            setTimeout(() => confetti({ particleCount: 100, spread: 60, origin: { y: 0.4 }, angle: 60 }), 400);
            setTimeout(() => confetti({ particleCount: 100, spread: 60, origin: { y: 0.4 }, angle: 120 }), 700);
        });
    }, []);

    return (
        <div className="page-fill" style={{ gap: 0 }}>
            {/* Trophy + Hero — fixed above the scrollable list */}
            <div className="flex-shrink-0 px-5 pt-8 pb-4">
            <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 12 }}
                className="text-center overflow-visible"
                style={{ overflowClipMargin: "unset", marginTop: "10px" }}
            >
                <div className="text-8xl animate-bounce-slow" style={{ lineHeight: 1.2, display: "inline-block" }}>🏆</div>
                <h1 className="font-fredoka text-5xl text-white mt-2">Game Over!</h1>

                {/* Winner avatar(s) hero */}
                {isAllTied ? (
                    /* Everyone tied — show a big "draw" emoji instead of all avatars */
                    <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.3 }}
                        className="mt-5 flex flex-col items-center gap-1"
                    >
                        <div className="text-5xl">🤝</div>
                        <p className="font-fredoka text-white/70 text-base mt-1">All tied!</p>
                    </motion.div>
                ) : (
                    <div className="flex justify-center gap-4 mt-5 flex-wrap">
                        {heroWinners.map(w => {
                            const avatarCfg = w.avatar ?? defaultAvatarFromId(w.id);
                            const pal = AVATAR_PALETTES[avatarCfg.color % AVATAR_PALETTES.length];
                            return (
                                <div key={w.id} className="flex flex-col items-center gap-2">
                                    {/* Boss crown — single winner only */}
                                    {isSolo && (
                                        <motion.div
                                            initial={{ y: -28, opacity: 0, scale: 0.5, rotate: -18 }}
                                            animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                                            transition={{ type: "spring", stiffness: 320, damping: 14, delay: 0.55 }}
                                            style={{
                                                display: "flex", justifyContent: "center",
                                                marginBottom: -10,
                                                filter: "drop-shadow(0 0 10px rgba(251,191,36,0.75))",
                                            }}
                                        >
                                            <BossCrown />
                                        </motion.div>
                                    )}
                                    <div style={{
                                        width: 72, height: 72, borderRadius: "50%", overflow: "hidden",
                                        boxShadow: `0 0 0 3px ${pal.bg1}88, 0 6px 24px rgba(0,0,0,0.5)`,
                                    }}>
                                        <SvgAvatar config={avatarCfg} size={72} />
                                    </div>
                                    <span className="font-fredoka text-white text-base leading-none">{w.name}</span>
                                </div>
                            );
                        })}
                        {heroOverflow > 0 && (
                            <div className="flex flex-col items-center gap-2 justify-end pb-1">
                                <div style={{
                                    width: 72, height: 72, borderRadius: 22,
                                    background: "rgba(255,255,255,0.08)",
                                    border: "1.5px solid rgba(255,255,255,0.15)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                    <span className="font-fredoka text-white/70 text-xl">+{heroOverflow}</span>
                                </div>
                                <span className="font-fredoka text-white/50 text-sm leading-none">more</span>
                            </div>
                        )}
                    </div>
                )}

                {isWinner ? (
                    <p className="font-nunito text-yellow-400 font-extrabold text-lg mt-3">
                        {isAllTied ? "Everyone wins! 🎉" : isSolo ? "You won! 🎉" : "You tied for first! 🎉"}
                    </p>
                ) : (
                    !isAllTied && winners.length > 1 && (
                        <p className="font-nunito text-white/50 text-base mt-3">
                            {winners.map(w => w.name).join(" & ")} tied for first!
                        </p>
                    )
                )}
            </motion.div>
            </div>{/* end hero wrapper */}

            {/* Scrollable rankings */}
            <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-24">
            <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="party-card w-full p-4"
            >
                <p className="font-nunito text-white/50 text-xs uppercase tracking-widest mb-4 text-center">
                    Final Rankings
                </p>
                <div className="flex flex-col gap-2">
                    {sorted.map((p, i) => (
                        <motion.div
                            key={p.id}
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.08 }}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl
                ${i === 0 ? "bg-yellow-400/15 border border-yellow-400/30" :
                                    i === 1 ? "bg-white/8 border border-white/15" :
                                        i === 2 ? "bg-orange-800/15 border border-orange-800/25" :
                                            "bg-white/4 border border-white/8"
                                }`}
                        >
                            <span className="text-2xl w-8 text-center">
                                {i < 3 ? MEDALS[i] : `${i + 1}.`}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className={`font-fredoka text-lg leading-tight ${p.id === myId ? "text-purple-300" : "text-white"}`}>
                                        {p.name}
                                    </span>
                                    {p.id === myId && <span className="font-nunito text-[10px] text-white/30">(you)</span>}
                                </div>
                            </div>
                            <span className="font-fredoka text-amber-400 text-xl flex-shrink-0">
                                {p.score}<span className="font-nunito text-white/30 text-xs ml-0.5">pts</span>
                            </span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
            </div>{/* end scrollable rankings */}

            {/* Fixed footer: play again */}
            <motion.div
                initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3"
                style={{ background: "linear-gradient(to top, #0a0a1a 60%, transparent)" }}
            >
                {isHost ? (
                    <button className="btn-primary w-full" onClick={onPlayAgain}>Play Again</button>
                ) : (
                    <p className="font-nunito text-white/40 text-center animate-pulse text-sm">Waiting for host to play again…</p>
                )}
            </motion.div>
        </div>
    );
}
