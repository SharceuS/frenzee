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
            gt === "most_likely_to" ||
            (gt === "spyfall" && rr.outcome === "spy_caught_failed") ||
            (gt === "mafia" && rr.winner === "town");
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
        const mltWinners = (rr.winnerIds as string[]) ?? [];
        const allTied = mltWinners.length >= room.players.length;
        headline = allTied
            ? "Everyone is equally likely! 😂"
            : mltWinners.length > 3
                ? `${mltWinners.length} players tied for most votes!`
                : mltWinners.map(id => getName(id)).join(" & ") + " won the most votes!";
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
    } else if (gt === "trivia_blitz") {
        const breakdown = rr.breakdown as Record<string, { id: string; name: string }[]> ?? {};
        const correctIdx = rr.correctIndex as number;
        const correcters = breakdown[String(correctIdx)] ?? [];
        headline = correcters.length === 0 ? "No one got it right! 😱" : `${correcters.length} player${correcters.length !== 1 ? "s" : ""} got it right!`;
        headlineEmoji = correcters.length === 0 ? "❌" : "🧠";
        headlineColor = correcters.length > 0 ? "border-violet-500/40" : "border-red-500/40";
    } else if (gt === "draw_it") {
        const guessedIds = (rr.guessedIds as string[]) ?? [];
        headline = guessedIds.length === 0 ? `Nobody guessed "${rr.word as string}"!` : `${guessedIds.length} player${guessedIds.length !== 1 ? "s" : ""} guessed "${rr.word as string}"!`;
        headlineEmoji = "🎨"; headlineColor = "border-amber-500/40";
    } else if (gt === "word_bomb") {
        const winnerIds = (rr.winnerIds as string[]) ?? [];
        headline = winnerIds.length > 0 ? winnerIds.map(id => getName(id)).join(" & ") + " survived!" : "Everyone got bombed!";
        headlineEmoji = "💣"; headlineColor = "border-red-500/40";
    } else if (gt === "reaction_tap") {
        const rankings = (rr.rankings as { id: string; name: string; ms: number; rank: number }[]) ?? [];
        headline = rankings.length > 0 ? `${rankings[0]?.name ?? "?"} was fastest at ${rankings[0]?.ms ?? 0}ms!` : "No one tapped!";
        headlineEmoji = "⚡"; headlineColor = "border-green-500/40";
    } else if (["finish_the_sentence", "confessions", "whose_line", "emoji_story", "unhinged_advice"].includes(gt)) {
        const w = (rr.winnerIds as string[]) ?? [];
        const emojis: Record<string, string> = { finish_the_sentence: "✏️", confessions: "🤫", whose_line: "💬", emoji_story: "📖", unhinged_advice: "🤪" };
        headline = w.length > 0 ? w.map(id => getName(id)).join(" & ") + " got the most votes!" : "Everyone tied!";
        headlineEmoji = emojis[gt] ?? "✨"; headlineColor = "border-purple-500/40";
    } else if (gt === "mafia") {
        const winner = rr.winner as "town" | "mafia";
        headline = winner === "town"
            ? "Town wins! All Mafia eliminated! 🎉"
            : "Mafia wins! They took over the town! 😈";
        headlineEmoji = winner === "town" ? "🏘️" : "😈";
        headlineColor = winner === "town" ? "border-green-500/40" : "border-red-500/40";
        headlineGlow = winner === "town"
            ? "shadow-[0_0_36px_rgba(16,185,129,0.28)]"
            : "shadow-[0_0_36px_rgba(239,68,68,0.28)]";
    } else if (gt === "spyfall") {        const outcome = rr.outcome as string;
        const spyName = getName(rr.spyId as string);
        if (outcome === "spy_escaped") {
            headline = `${spyName} escaped undetected! 😈`;
            headlineEmoji = "😈"; headlineColor = "border-red-500/40";
            headlineGlow = "shadow-[0_0_36px_rgba(239,68,68,0.28)]";
        } else if (outcome === "spy_caught_guessed") {
            headline = `${spyName} guessed the location! 🤯`;
            headlineEmoji = "📍"; headlineColor = "border-amber-500/40";
        } else {
            headline = `${spyName} was caught! 🎉`;
            headlineEmoji = "🎉"; headlineColor = "border-green-500/40";
            headlineGlow = "shadow-[0_0_36px_rgba(16,185,129,0.28)]";
        }
    }

    return (
        <div className="page-fill gap-3">
            {/* Round pill */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="round-pill">Round {room.round}/{room.maxRounds}</div>
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
                        {room.votes && (
                            <div className="grid grid-cols-2 gap-1.5">
                                {room.players.map((v, i) => {
                                    if (!room.votes![v.id]) return null;
                                    const correct = room.votes![v.id] === room.liarId;
                                    return (
                                        <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i * 0.05 }}
                                            className={`vote-card flex items-center gap-2 ${correct ? "correct" : "wrong"}`}
                                            style={{ padding: "10px 12px", minHeight: 0 }}>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="font-nunito font-bold text-white text-sm truncate">{v.name}</span>
                                                <span className="font-nunito text-white/50 text-xs truncate">→ {getName(room.votes![v.id])}</span>
                                            </div>
                                            <span className="flex-shrink-0">{correct ? "✅" : "❌"}</span>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                        {/* Points this round */}
                        <p className="font-nunito text-white/45 text-xs uppercase tracking-widest mt-1">⭐ Points this round</p>
                        <div className="grid grid-cols-2 gap-1.5">
                            {room.players.map((v, i) => {
                                const isLiar = v.id === room.liarId;
                                const caught = rr.liarCaught as boolean;
                                let pts = 0;
                                if (isLiar && !caught) pts = 200;
                                else if (!isLiar && room.votes?.[v.id] === room.liarId) pts = 100;
                                if (pts === 0) return null;
                                return (
                                    <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
                                        className="vote-card flex items-center gap-2"
                                        style={{ padding: "10px 12px", minHeight: 0 }}>
                                        <span className="font-nunito font-bold text-white text-sm truncate flex-1">{v.name}</span>
                                        <span className="font-fredoka text-amber-400 flex-shrink-0">+{pts}</span>
                                        <span className="flex-shrink-0">{isLiar ? "😈" : "🔍"}</span>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* TWO TRUTHS details */}
                {gt === "two_truths" && (() => {
                    const sa = rr.statements as Record<string, unknown> | null;
                    const stmts = sa ? (sa.statements as string[]) : [];
                    const lieIdx = (rr.correctIndex as number);
                    return stmts.map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                            className={`answer-card ${i === lieIdx ? "border-red-500/50" : ""}`}
                            style={{ borderColor: i === lieIdx ? "rgba(239,68,68,0.5)" : undefined }}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-nunito font-extrabold text-white/60 text-xs">Statement {i + 1}</span>
                                {i === lieIdx && <span className="badge" style={{ background: "rgba(239,68,68,0.2)", color: "#F87171", border: "1px solid rgba(239,68,68,0.35)" }}>🤥 THE LIE</span>}
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

                {/* TRIVIA BLITZ details */}
                {gt === "trivia_blitz" && (() => {
                    const opts = room.questionData?.options as string[] ?? [];
                    const correctIdx = rr.correctIndex as number;
                    const breakdown = rr.breakdown as Record<string, { id: string; name: string }[]> ?? {};
                    const times = rr.answerTimes as Record<string, number> ?? {};
                    return (
                        <>
                            <p className="font-nunito text-white/45 text-xs uppercase tracking-widest">🧠 Results</p>
                            {opts.map((opt, i) => {
                                const isCorrect = i === correctIdx;
                                const pickers = breakdown[String(i)] ?? [];
                                return (
                                    <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                        className={`answer-card flex items-center gap-3 ${isCorrect ? "border-green-500/50" : "border-red-500/20"}`}
                                        style={{ borderColor: isCorrect ? "rgba(16,185,129,0.5)" : "rgba(239,68,68,0.2)" }}>
                                        <span className="font-fredoka text-lg w-6">{["🟣", "🔵", "🟡", "🔴"][i]}</span>
                                        <div className="flex-1">
                                            <p className="font-fredoka text-white text-base leading-snug">{opt}</p>
                                            {pickers.length > 0 && (
                                                <p className="font-nunito text-white/50 text-xs mt-0.5">{pickers.map(p => p.name).join(", ")}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-nunito text-white/40 text-xs">{pickers.length} pick{pickers.length !== 1 ? "s" : ""}</span>
                                            {isCorrect && <span className="text-green-400">✓</span>}
                                        </div>
                                    </motion.div>
                                );
                            })}
                            {/* Speed times */}
                            {Object.keys(times).length > 0 && (
                                <>
                                    <p className="font-nunito text-white/45 text-xs uppercase tracking-widest mt-1">⚡ Speed (correct only)</p>
                                    {(breakdown[String(correctIdx)] ?? [])
                                        .sort((a, b) => (times[a.id] ?? 99999) - (times[b.id] ?? 99999))
                                        .map((p, i) => (
                                            <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.06 }}
                                                className="vote-card flex items-center gap-3">
                                                <span className="font-nunito text-white/40 text-sm w-5">{i + 1}</span>
                                                <span className="font-fredoka text-white flex-1">{p.name}</span>
                                                <span className="font-nunito text-amber-400 text-sm">{((times[p.id] ?? 0) / 1000).toFixed(2)}s</span>
                                            </motion.div>
                                        ))}
                                </>
                            )}
                        </>
                    );
                })()}

                {/* DRAW IT details */}
                {gt === "draw_it" && (
                    <>
                        <p className="font-nunito text-white/45 text-xs uppercase tracking-widest">🎨 The word was:</p>
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                            className="answer-card text-center py-4">
                            <p className="font-fredoka text-4xl text-amber-300">{rr.word as string}</p>
                            <p className="font-nunito text-white/40 text-sm mt-1">
                                drawn by <span className="text-white/70">{getName(rr.drawerId as string)}</span>
                            </p>
                        </motion.div>
                        <p className="font-nunito text-white/45 text-xs uppercase tracking-widest mt-1">🏅 Guessed correctly</p>
                        {room.players.filter((p) => p.id !== rr.drawerId).map((p, i) => {
                            const guessed = (rr.guessedIds as string[])?.includes(p.id);
                            return (
                                <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }}
                                    className="vote-card flex items-center gap-3">
                                    <span className="font-fredoka text-white flex-1">{p.name}</span>
                                    <span>{guessed ? "✅ Guessed" : "❌ Didn't guess"}</span>
                                </motion.div>
                            );
                        })}
                    </>
                )}

                {/* WORD BOMB details */}
                {gt === "word_bomb" && (
                    <>
                        <p className="font-nunito text-white/45 text-xs uppercase tracking-widest">💣 Survival results</p>
                        {[...room.players].sort((a, b) => ((rr.lives as Record<string, number>)[b.id] ?? 0) - ((rr.lives as Record<string, number>)[a.id] ?? 0))
                            .map((p, i) => {
                                const l = (rr.lives as Record<string, number>)?.[p.id] ?? 0;
                                const survived = l > 0;
                                return (
                                    <motion.div key={p.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                        className={`vote-card flex items-center gap-3 ${survived ? "selected" : ""}`}>
                                        <span className="font-fredoka text-white flex-1">{p.name}</span>
                                        <span>{Array.from({ length: l }).map((_, j) => <span key={j}>💣</span>)}</span>
                                        <span className="font-nunito text-xs">{survived ? "💪 Survived" : "💀 Bombed"}</span>
                                    </motion.div>
                                );
                            })}
                    </>
                )}

                {/* REACTION TAP details */}
                {gt === "reaction_tap" && (
                    <>
                        <p className="font-nunito text-white/45 text-xs uppercase tracking-widest">⚡ Tap rankings</p>
                        {(rr.rankings as { id: string; name: string; ms: number; rank: number }[] ?? []).map((r, i) => (
                            <motion.div key={r.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                className={`vote-card flex items-center gap-3 ${i === 0 ? "selected" : ""}`}>
                                <span className="font-nunito text-white/40 text-sm w-5">{r.rank}</span>
                                <span className="font-fredoka text-white flex-1">{r.name}</span>
                                <span className="font-nunito text-amber-400 text-sm font-bold">{r.ms}ms</span>
                                {i === 0 && <span>🏆</span>}
                            </motion.div>
                        ))}
                    </>
                )}

                {/* SPYFALL details */}
                {gt === "spyfall" && (() => {
                    const outcome = rr.outcome as string;
                    const spyId = rr.spyId as string;
                    const location = rr.location as string;
                    const guess = rr.guess as string | null;
                    const guessCorrect = rr.guessCorrect as boolean | undefined;
                    const voteCounts = rr.voteCounts as Record<string, number> ?? {};
                    const accusedId = rr.accusedId as string | null;
                    return (
                        <>
                            {/* Location reveal */}
                            <motion.div
                                initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                                className="answer-card text-center py-5"
                                style={{ borderColor: "rgba(14,165,233,0.45)", boxShadow: "0 0 36px rgba(14,165,233,0.15)" }}
                            >
                                <p className="font-nunito text-sky-300/60 text-xs uppercase tracking-widest mb-1">📍 The location was</p>
                                <p className="font-fredoka text-3xl text-sky-300 mb-1">{location}</p>
                                <p className="font-nunito text-white/40 text-xs">
                                    🕵️ Spy: <span className="text-white/70 font-bold">{getName(spyId)}</span>
                                </p>
                            </motion.div>

                            {/* Spy guess result (if there was a guess phase) */}
                            {guess != null && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                    className={`answer-card flex items-center gap-3 ${
                                        guessCorrect
                                            ? "border-amber-500/50"
                                            : "border-green-500/40"
                                    }`}
                                    style={{ borderColor: guessCorrect ? "rgba(245,158,11,0.5)" : "rgba(16,185,129,0.4)" }}
                                >
                                    <div className="flex-1">
                                        <p className="font-nunito text-white/45 text-xs mb-0.5">Spy&apos;s guess</p>
                                        <p className="font-fredoka text-white text-lg">{guess}</p>
                                    </div>
                                    <span className="text-2xl">{guessCorrect ? "🎯" : "❌"}</span>
                                </motion.div>
                            )}

                            {/* Vote counts */}
                            <p className="font-nunito text-white/45 text-xs uppercase tracking-widest mt-1">🗳️ Votes</p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {room.players.map((p, i) => {
                                    const cnt = voteCounts[p.id] ?? 0;
                                    const isAccused = p.id === accusedId;
                                    const isTheSpy = p.id === spyId;
                                    return (
                                        <motion.div key={p.id}
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.05 }}
                                            className={`vote-card flex items-center gap-2 ${
                                                isAccused ? "selected" : ""
                                            }`}
                                            style={{ padding: "10px 12px", minHeight: 0 }}
                                        >
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="font-nunito font-bold text-white text-sm truncate">{p.name}</span>
                                                <span className="font-nunito text-white/40 text-xs">
                                                    {cnt} vote{cnt !== 1 ? "s" : ""}
                                                    {isTheSpy ? " 🕵️" : ""}
                                                </span>
                                            </div>
                                            {isAccused && <span className="flex-shrink-0 text-sm">{isTheSpy ? "✅" : "❌"}</span>}
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Points this round */}
                            {rr.pointDeltas && (
                                <>
                                    <p className="font-nunito text-white/45 text-xs uppercase tracking-widest mt-1">⭐ Points this round</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {room.players.map((p, i) => {
                                            const delta = (rr.pointDeltas as Record<string, number>)[p.id] ?? 0;
                                            if (delta === 0) return null;
                                            return (
                                                <motion.div key={p.id}
                                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 + i * 0.05 }}
                                                    className="vote-card flex items-center gap-2"
                                                    style={{ padding: "10px 12px", minHeight: 0 }}
                                                >
                                                    <span className="font-nunito font-bold text-white text-sm truncate flex-1">{p.name}</span>
                                                    <span className="font-fredoka text-amber-400 flex-shrink-0">+{delta}</span>
                                                    {p.id === spyId && <span className="flex-shrink-0">🕵️</span>}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    );
                })()}

                {/* MAFIA details */}
                {gt === "mafia" && (() => {
                    const mafiaWinner = rr.winner as "town" | "mafia";
                    const roles = rr.roles as Record<string, string> ?? {};
                    const survivors = rr.survivors as string[] ?? [];
                    const eliminated = rr.eliminated as string[] ?? [];
                    const pointDeltas = rr.pointDeltas as Record<string, number> ?? {};
                    const ROLE_EMOJI: Record<string, string> = { mafia: "🔪", doctor: "💉", detective: "🔍", villager: "🏘️" };
                    const ROLE_COLOR: Record<string, string> = { mafia: "#F87171", doctor: "#34D399", detective: "#60A5FA", villager: "#A1A1AA" };
                    return (
                        <>
                            {/* Role reveal */}
                            <p className="font-nunito text-white/45 text-xs uppercase tracking-widest">🎭 Roles revealed</p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {room.players.map((p, i) => {
                                    const role = roles[p.id] ?? "villager";
                                    const alive = survivors.includes(p.id);
                                    return (
                                        <motion.div key={p.id}
                                            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
                                            className="answer-card flex items-center gap-2"
                                            style={{
                                                padding: "10px 12px", minHeight: 0,
                                                borderColor: `${ROLE_COLOR[role]}44`,
                                                opacity: alive ? 1 : 0.5,
                                            }}
                                        >
                                            <span className="text-base">{ROLE_EMOJI[role]}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-fredoka text-white text-sm truncate">{p.name}</p>
                                                <p className="font-nunito text-xs truncate" style={{ color: ROLE_COLOR[role] }}>{role}</p>
                                            </div>
                                            {!alive && <span className="text-xs">💀</span>}
                                        </motion.div>
                                    );
                                })}
                            </div>

                            {/* Survivors */}
                            {survivors.length > 0 && (
                                <>
                                    <p className="font-nunito text-white/45 text-xs uppercase tracking-widest mt-1">✅ Survivors ({survivors.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                        {survivors.map(id => (
                                            <span key={id} className="font-nunito text-xs px-2.5 py-1 rounded-full"
                                                style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)", color: "#6EE7B7" }}>
                                                ✓ {room.players.find(p => p.id === id)?.name ?? id}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Eliminated */}
                            {eliminated.length > 0 && (
                                <>
                                    <p className="font-nunito text-white/45 text-xs uppercase tracking-widest mt-1">💀 Eliminated ({eliminated.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                        {eliminated.map(id => (
                                            <span key={id} className="font-nunito text-xs px-2.5 py-1 rounded-full"
                                                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "rgba(255,255,255,0.35)", textDecoration: "line-through" }}>
                                                {room.players.find(p => p.id === id)?.name ?? id}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Points */}
                            {Object.values(pointDeltas).some(d => d > 0) && (
                                <>
                                    <p className="font-nunito text-white/45 text-xs uppercase tracking-widest mt-1">⭐ Points this match</p>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {room.players.filter(p => (pointDeltas[p.id] ?? 0) > 0).map((p, i) => (
                                            <motion.div key={p.id}
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.05 }}
                                                className="vote-card flex items-center gap-2"
                                                style={{ padding: "10px 12px", minHeight: 0 }}
                                            >
                                                <span className="font-nunito font-bold text-white text-sm truncate flex-1">{p.name}</span>
                                                <span className="font-fredoka text-amber-400 flex-shrink-0">+{pointDeltas[p.id]}</span>
                                                <span className="flex-shrink-0">{ROLE_EMOJI[roles[p.id] ?? "villager"]}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    );
                })()}

                {/* CREATIVE ANSWER GAMES: reveal who wrote what + vote counts */}
                {["finish_the_sentence", "confessions", "whose_line", "emoji_story", "unhinged_advice"].includes(gt) && answers.length > 0 && (
                    <>
                        <p className="font-nunito text-white/45 text-xs uppercase tracking-widest">🏆 Answers revealed</p>
                        {[...answers]
                            .sort((a, b) => a.playerId.localeCompare(b.playerId))
                            .map((a, i) => {
                                const vc = rr.voteCounts as Record<string, number>;
                                const cnt = vc?.[a.playerId] ?? 0;
                                const isWinner = (rr.winnerIds as string[])?.includes(a.playerId);
                                return (
                                    <motion.div key={a.playerId} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                                        className={`answer-card ${isWinner ? "border-purple-500/50" : ""}`}
                                        style={{ borderColor: isWinner ? "rgba(168,85,247,0.5)" : undefined }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-nunito font-extrabold text-white/60 text-xs">{a.playerName}</span>
                                            {isWinner && <span>🏆</span>}
                                            {cnt > 0 && <span className="font-nunito text-purple-400 text-xs ml-auto">{cnt} vote{cnt !== 1 ? "s" : ""}</span>}
                                        </div>
                                        <p className="font-nunito text-white/85 text-sm leading-snug break-words">{a.answer as string}</p>
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
                        {isLastRound ? "Final Results" : "Next Round"}
                    </motion.button>
                ) : (
                    <p className="font-nunito text-white/35 text-sm text-center wait-pulse">Waiting for host…</p>
                )}
            </div>
        </div>
    );
}

