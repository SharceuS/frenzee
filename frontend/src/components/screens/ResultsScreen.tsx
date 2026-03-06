"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Room, AnswerEntry } from "@/lib/types";
import { sfxWin, sfxReveal } from "@/lib/sounds";

interface Props {
    room: Room;
    myId: string;
    isHost: boolean;
    onNext: () => void;
}

function fireConfetti() {
    import("canvas-confetti").then(m => {
        m.default({ particleCount: 140, spread: 90, origin: { y: 0.55 } });
    });
}

export default function ResultsScreen({ room, myId, isHost, onNext }: Props) {
    const isLastRound = room.round >= room.maxRounds;
    const gt = room.gameType ?? "";
    const rr = room.roundResult as Record<string, unknown> | null;
    const q = room.currentQuestion ?? "";
    const qd = room.questionData as Record<string, string> | null;
    const answers = (room.answers ?? []) as AnswerEntry[];

    useEffect(() => {
        if (!rr) return;
        sfxReveal();
        const shouldCelebrate =
            (gt === "guess_the_liar" && rr.liarCaught) ||
            gt === "roast_room" ||
            gt === "debate_pit" ||
            gt === "most_likely_to";
        if (shouldCelebrate) { fireConfetti(); sfxWin(); }
    }, [gt, rr]);

    if (!rr) return (
        <div className="page-fill items-center justify-center">
            <div className="font-fredoka text-white text-2xl wait-pulse">Tallying…</div>
        </div>
    );

    // ── Shared helpers ────────────────────────────
    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
    const getName = (id: string) => room.players.find(p => p.id === id)?.name ?? id;
    const getAnswer = (id: string) => answers.find(a => a.playerId === id)?.answer as string ?? "";

    // ── Build card data per game ──────────────────
    let headline = ""; let headlineEmoji = "🎉"; let headlineColor = "";
    let headlineGlow = "";

    if (gt === "guess_the_liar") {
        const caught = rr.liarCaught as boolean;
        const liarName = getName(room.liarId ?? "");
        headline = caught ? `${liarName} was caught!` : `${liarName} fooled everyone!`;
        headlineEmoji = caught ? "🎉" : "😈";
        headlineColor = caught ? "border-green-500/40" : "border-red-500/40";
        headlineGlow = caught ? "shadow-[0_0_36px_rgba(16,185,129,0.28)]" : "shadow-[0_0_36px_rgba(239,68,68,0.28)]";
    } else if (gt === "two_truths") {
        const cv = (rr.correctVoters as string[]) ?? [];
        headline = cv.length === 0
            ? `${getName(room.spotlightId ?? "")} fooled everyone! (+200pts)`
            : `${cv.length} player${cv.length > 1 ? "s" : ""} spotted the lie!`;
        headlineEmoji = cv.length === 0 ? "😈" : "🧐";
        headlineColor = cv.length === 0 ? "border-red-500/40" : "border-purple-500/40";
    } else if (gt === "most_likely_to") {
        const winners = (rr.winnerIds as string[]) ?? [];
        headline = winners.map(id => getName(id)).join(" & ") + " won the most votes!";
        headlineEmoji = "👑";
        headlineColor = "border-amber-500/40";
    } else if (gt === "never_have_i_ever") {
        const havers = (rr.havers as { id: string; name: string }[]) ?? [];
        headline = havers.length === 0 ? "Everyone's innocent! 😇" : `${havers.length} player${havers.length > 1 ? "s" : ""} have done it!`;
        headlineEmoji = havers.length === 0 ? "😇" : "😏";
        headlineColor = "border-emerald-500/40";
    } else if (gt === "would_you_rather") {
        const av = (rr.aVoters as { id: string; name: string }[]) ?? [];
        const bv = (rr.bVoters as { id: string; name: string }[]) ?? [];
        headline = av.length === bv.length ? "It's a tie! 🤝" : av.length > bv.length ? `Team A wins the split!` : `Team B wins the split!`;
        headlineEmoji = "⚖️"; headlineColor = "border-blue-500/40";
    } else if (gt === "hot_takes") {
        const ag = (rr.agreers as { id: string; name: string }[]) ?? [];
        const di = (rr.disagreers as { id: string; name: string }[]) ?? [];
        const isTie = ag.length === di.length;
        headline = isTie ? "It's a tie! Everyone gets 30pts!" : ag.length < di.length ? `${ag.length} hot take${ag.length !== 1 ? "s" : ""} — agree minority wins!` : `${di.length} dissenter${di.length !== 1 ? "s" : ""} — disagree minority wins!`;
        headlineEmoji = "🔥"; headlineColor = "border-orange-500/40";
    } else if (gt === "roast_room") {
        const w = (rr.winnerIds as string[]) ?? [];
        headline = w.map(id => getName(id)).join(" & ") + " was funniest!";
        headlineEmoji = "🏆"; headlineColor = "border-orange-500/40";
    } else if (gt === "red_flag_radar") {
        const red = (rr.red as { id: string; name: string }[]) ?? [];
        const green = (rr.green as { id: string; name: string }[]) ?? [];
        headline = `${red.length} 🚩 vs ${green.length} ✅`;
        headlineEmoji = red.length > green.length ? "🚩" : "✅";
        headlineColor = "border-red-500/40";
    } else if (gt === "vibe_check") {
        headline = "Vibes revealed!";
        headlineEmoji = "✨"; headlineColor = "border-purple-500/40";
    } else if (gt === "debate_pit") {
        const w = (rr.winnerIds as string[]) ?? [];
        headline = w.map(id => getName(id)).join(" & ") + " won the debate!";
        headlineEmoji = "⚔️"; headlineColor = "border-cyan-500/40";
    }

    return (
        <div className="page-fill gap-3">
            {/* Round pill */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="round-pill">Round {room.round}/{room.maxRounds}</div>
                <div className="font-nunito text-white/45 text-xs">{isLastRound ? "Last round!" : "Keep going"}</div>
            </div>

            {/* Outcome banner */}
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
                className={`party-card text-center py-5 px-4 flex-shrink-0 ${headlineColor} ${headlineGlow}`}>
                <div className="text-5xl mb-2">{headlineEmoji}</div>
                <h2 className="font-fredoka text-2xl text-white leading-snug">{headline}</h2>
            </motion.div>

            {/* Game-specific details */}
            <div className="flex-1 scroll-y flex flex-col gap-2 pb-1">

                {/* GUESS THE LIAR details */}
                {gt === "guess_the_liar" && (
                    <>
                        <p className="font-nunito text-white/45 text-xs uppercase tracking-widest">📝 Answers revealed</p>
                        {answers.map((a, i) => {
                            const isLiar = a.playerId === room.liarId;
                            return (
                                <motion.div key={a.playerId}
                                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                                    className={`answer-card ${isLiar ? "border-red-500/50 bg-red-500/08" : "border-green-500/25"}`}
                                    style={{ borderColor: isLiar ? "rgba(239,68,68,0.5)" : "rgba(16,185,129,0.25)" }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-nunito font-extrabold text-white text-sm">{a.playerName}</span>
                                        {isLiar && <span className="badge badge-original" style={{ background: "rgba(239,68,68,0.2)", color: "#F87171", borderColor: "rgba(239,68,68,0.35)" }}>🤥 Liar</span>}
                                    </div>
                                    <p className="font-nunito text-white/80 text-sm">{a.answer as string}</p>
                                </motion.div>
                            );
                        })}
                        {room.votes && (
                            <p className="font-nunito text-white/45 text-xs uppercase tracking-widest mt-1">🗳️ Votes</p>
                        )}
                        {room.votes && room.players.map((v, i) => {
                            if (!room.votes![v.id]) return null;
                            const correct = room.votes![v.id] === room.liarId;
                            return (
                                <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i * 0.05 }}
                                    className={`vote-card flex items-center gap-2 ${correct ? "correct" : "wrong"}`}>
                                    <span className="font-nunito font-bold text-white text-sm">{v.name}</span>
                                    <span className="text-white/35 text-xs">→</span>
                                    <span className="font-nunito text-white/80 text-sm">{getName(room.votes![v.id])}</span>
                                    <span className="ml-auto">{correct ? "✅" : "❌"}</span>
                                </motion.div>
                            );
                        })}
                    </>
                )}

                {/* TWO TRUTHS details */}
                {gt === "two_truths" && (() => {
                    const sa = rr.statements as Record<string, unknown> | null;
                    const stmts = sa ? (sa.statements as string[]) : [];
                    const lieIdx = (rr.correctIndex as number);
                    return stmts.map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                            className={`answer-card ${i === lieIdx ? "border-red-500/50" : "border-green-500/25"}`}
                            style={{ borderColor: i === lieIdx ? "rgba(239,68,68,0.5)" : "rgba(16,185,129,0.25)" }}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-nunito font-extrabold text-white/60 text-xs">Statement {i + 1}</span>
                                {i === lieIdx && <span className="badge" style={{ background: "rgba(239,68,68,0.2)", color: "#F87171", border: "1px solid rgba(239,68,68,0.35)" }}>🤥 THE LIE</span>}
                                {i !== lieIdx && <span className="badge" style={{ background: "rgba(16,185,129,0.15)", color: "#34D399", border: "1px solid rgba(16,185,129,0.3)" }}>✅ True</span>}
                            </div>
                            <p className="font-nunito text-white/85 text-sm">{s}</p>
                        </motion.div>
                    ));
                })()}

                {/* MOST LIKELY TO details */}
                {gt === "most_likely_to" && (
                    <>
                        <p className="font-nunito text-white/45 text-xs uppercase tracking-widest">🗳️ Vote counts</p>
                        {[...room.players]
                            .sort((a, b) => ((rr.voteCounts as Record<string, number>)[b.id] ?? 0) - ((rr.voteCounts as Record<string, number>)[a.id] ?? 0))
                            .map((p, i) => {
                                const vc = rr.voteCounts as Record<string, number>;
                                const cnt = vc[p.id] ?? 0;
                                const isWinner = (rr.winnerIds as string[])?.includes(p.id);
                                return (
                                    <motion.div key={p.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                                        className={`vote-card flex items-center gap-3 ${isWinner ? "selected" : ""}`}>
                                        <span className="font-fredoka text-white text-base flex-1">{p.name}</span>
                                        <div className="flex gap-1">
                                            {Array.from({ length: cnt }).map((_, j) => <span key={j} className="text-yellow-400 text-sm">⭐</span>)}
                                        </div>
                                        <span className="font-fredoka text-white/60 text-sm">{cnt}</span>
                                        {isWinner && <span>👑</span>}
                                    </motion.div>
                                );
                            })}
                    </>
                )}

                {/* NEVER HAVE I EVER details */}
                {gt === "never_have_i_ever" && (
                    <>
                        <div className="flex gap-3">
                            <div className="flex-1 glass-card p-3 rounded-2xl">
                                <div className="font-nunito text-green-400 font-extrabold text-xs uppercase mb-2">✋ Have done it</div>
                                {((rr.havers as { id: string; name: string }[]) ?? []).length === 0
                                    ? <p className="font-nunito text-white/40 text-sm">Nobody! 😇</p>
                                    : (rr.havers as { id: string; name: string }[]).map(p => (
                                        <div key={p.id} className="font-nunito text-white text-sm py-1">{p.name} 😏</div>
                                    ))}
                            </div>
                            <div className="flex-1 glass-card p-3 rounded-2xl">
                                <div className="font-nunito text-blue-400 font-extrabold text-xs uppercase mb-2">🤷 Never done it</div>
                                {((rr.nevers as { id: string; name: string }[]) ?? []).map(p => (
                                    <div key={p.id} className="font-nunito text-white text-sm py-1">{p.name}</div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* WOULD YOU RATHER details */}
                {gt === "would_you_rather" && (
                    <>
                        {qd?.optionA && (
                            <div className="flex gap-3">
                                <div className="flex-1 glass-card p-3 rounded-2xl">
                                    <div className="font-nunito text-purple-400 font-extrabold text-xs uppercase mb-1">A</div>
                                    <div className="font-fredoka text-white text-sm mb-2 leading-snug">{qd.optionA}</div>
                                    {(rr.aVoters as { id: string; name: string }[]).map(p => <div key={p.id} className="font-nunito text-white/70 text-xs py-0.5">{p.name}</div>)}
                                    <div className="font-fredoka text-white/50 text-lg mt-1">{(rr.aVoters as unknown[]).length}</div>
                                </div>
                                <div className="flex-1 glass-card p-3 rounded-2xl">
                                    <div className="font-nunito text-pink-400 font-extrabold text-xs uppercase mb-1">B</div>
                                    <div className="font-fredoka text-white text-sm mb-2 leading-snug">{qd.optionB}</div>
                                    {(rr.bVoters as { id: string; name: string }[]).map(p => <div key={p.id} className="font-nunito text-white/70 text-xs py-0.5">{p.name}</div>)}
                                    <div className="font-fredoka text-white/50 text-lg mt-1">{(rr.bVoters as unknown[]).length}</div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* HOT TAKES details */}
                {gt === "hot_takes" && (
                    <div className="flex gap-3">
                        <div className="flex-1 glass-card p-3 rounded-2xl">
                            <div className="font-nunito text-amber-400 font-extrabold text-xs uppercase mb-2">✅ Agree</div>
                            {(rr.agreers as { id: string; name: string }[]).map(p => <div key={p.id} className="font-nunito text-white/80 text-sm py-0.5">{p.name}</div>)}
                            <div className="font-fredoka text-white/50 text-lg mt-1">{(rr.agreers as unknown[]).length}</div>
                        </div>
                        <div className="flex-1 glass-card p-3 rounded-2xl">
                            <div className="font-nunito text-red-400 font-extrabold text-xs uppercase mb-2">❌ Disagree</div>
                            {(rr.disagreers as { id: string; name: string }[]).map(p => <div key={p.id} className="font-nunito text-white/80 text-sm py-0.5">{p.name}</div>)}
                            <div className="font-fredoka text-white/50 text-lg mt-1">{(rr.disagreers as unknown[]).length}</div>
                        </div>
                    </div>
                )}

                {/* ROAST ROOM details */}
                {gt === "roast_room" && (
                    <>
                        <p className="font-nunito text-white/45 text-xs uppercase tracking-widest">🎭 All roasts</p>
                        {answers.map((a, i) => {
                            const vc = rr.voteCounts as Record<string, number>;
                            const cnt = vc?.[a.playerId] ?? 0;
                            const isWinner = (rr.winnerIds as string[])?.includes(a.playerId);
                            return (
                                <motion.div key={a.playerId} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                    className={`answer-card ${isWinner ? "border-amber-500/50" : ""}`}
                                    style={{ borderColor: isWinner ? "rgba(245,158,11,0.5)" : undefined }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-nunito font-extrabold text-white/60 text-xs">{a.playerName}</span>
                                        {isWinner && <span>🏆</span>}
                                        {cnt > 0 && <span className="font-nunito text-amber-400 text-xs ml-auto">{cnt} vote{cnt !== 1 ? "s" : ""}</span>}
                                    </div>
                                    <p className="font-nunito text-white/85 text-sm">{a.answer as string}</p>
                                </motion.div>
                            );
                        })}
                    </>
                )}

                {/* RED FLAG RADAR details */}
                {gt === "red_flag_radar" && (
                    <div className="flex gap-3">
                        <div className="flex-1 glass-card p-3 rounded-2xl">
                            <div className="font-nunito text-red-400 font-extrabold text-xs uppercase mb-2">🚩 Red Flag</div>
                            {(rr.red as { id: string; name: string }[]).map(p => <div key={p.id} className="font-nunito text-white/80 text-sm py-0.5">{p.name}</div>)}
                            <div className="font-fredoka text-white/50 text-lg mt-1">{(rr.red as unknown[]).length}</div>
                        </div>
                        <div className="flex-1 glass-card p-3 rounded-2xl">
                            <div className="font-nunito text-green-400 font-extrabold text-xs uppercase mb-2">✅ Green Flag</div>
                            {(rr.green as { id: string; name: string }[]).map(p => <div key={p.id} className="font-nunito text-white/80 text-sm py-0.5">{p.name}</div>)}
                            <div className="font-fredoka text-white/50 text-lg mt-1">{(rr.green as unknown[]).length}</div>
                        </div>
                    </div>
                )}

                {/* VIBE CHECK details */}
                {gt === "vibe_check" && (
                    <>
                        <p className="font-nunito text-white/45 text-xs uppercase tracking-widest">✨ Vibes revealed</p>
                        {answers.map((a, i) => {
                            const cg = rr.correctGuesses as Record<string, number>;
                            const tg = rr.totalGuesses as Record<string, number>;
                            const correct = cg?.[a.playerId] ?? 0;
                            const total = tg?.[a.playerId] ?? 0;
                            return (
                                <motion.div key={a.playerId} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                    className="answer-card">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-nunito font-extrabold text-white text-sm">{a.playerName}</span>
                                        <span className="font-nunito text-white/45 text-xs ml-auto">{correct}/{total} guessed correctly</span>
                                    </div>
                                    <p className="font-nunito text-white/80 text-sm">&ldquo;{a.answer as string}&rdquo;</p>
                                </motion.div>
                            );
                        })}
                    </>
                )}

                {/* DEBATE PIT details */}
                {gt === "debate_pit" && (
                    <>
                        <p className="font-nunito text-white/45 text-xs uppercase tracking-widest">⚔️ Arguments</p>
                        {room.debaterIds?.map((id, i) => {
                            const isFor = i === 0;
                            const vc = rr.voteCounts as Record<string, number>;
                            const cnt = vc?.[id] ?? 0;
                            const isWinner = (rr.winnerIds as string[])?.includes(id);
                            return (
                                <motion.div key={id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                    className="answer-card">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`badge text-xs font-extrabold px-2 py-1 rounded-lg ${isFor ? "side-for" : "side-against"}`}>
                                            {isFor ? "FOR" : "AGAINST"}
                                        </span>
                                        <span className="font-nunito font-extrabold text-white text-sm">{getName(id)}</span>
                                        {isWinner && <span className="ml-auto">🏆 Winner</span>}
                                        <span className="font-nunito text-white/45 text-xs ml-auto">{cnt} vote{cnt !== 1 ? "s" : ""}</span>
                                    </div>
                                    <p className="font-nunito text-white/80 text-sm">{getAnswer(id)}</p>
                                </motion.div>
                            );
                        })}
                    </>
                )}

                {/* Scores */}
                <div className="party-card p-4 mt-1">
                    <p className="font-nunito text-white/45 text-xs uppercase tracking-widest mb-3">🏆 Leaderboard</p>
                    {sortedPlayers.map((p, i) => (
                        <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.06 }}
                            className={`flex items-center gap-3 py-2.5 px-2 rounded-xl transition-all ${p.id === myId ? "bg-white/06" : ""}`}
                            style={{ background: p.id === myId ? "rgba(255,255,255,0.06)" : undefined }}>
                            <span className="font-nunito text-white/40 text-sm w-4">{i + 1}</span>
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-fredoka text-sm text-white">
                                {p.name[0].toUpperCase()}
                            </div>
                            <span className="font-fredoka text-white text-base flex-1">{p.name}</span>
                            <span className="font-fredoka text-amber-400 text-lg">{p.score}</span>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Bottom CTA */}
            <div className="flex-shrink-0 pb-2">
                {isHost ? (
                    <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="btn-primary w-full" onClick={onNext}>
                        {isLastRound ? "🏆 Final Results!" : "Next Round →"}
                    </motion.button>
                ) : (
                    <p className="font-nunito text-white/35 text-sm text-center wait-pulse">Waiting for host…</p>
                )}
            </div>
        </div>
    );
}

