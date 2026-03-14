"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Room, AnswerEntry } from "@/lib/types";

interface Props {
    room: Room;
    myId: string;
    onVote: (targetId: string) => void;
}

const VOTE_CONFIGS: Record<string, { emoji: string; title: string; subtitle: string; btnLabel: string }> = {
    guess_the_liar: { emoji: "🕵️", title: "Spot the Liar!", subtitle: "Who wrote the fake answer?", btnLabel: "Vote" },
    spyfall: { emoji: "🔍", title: "Who is the Spy?", subtitle: "Vote for the most suspicious player", btnLabel: "Vote" },
    mafia:   { emoji: "⚖️", title: "Who is Mafia?",   subtitle: "Vote to eliminate the most suspicious player", btnLabel: "Eliminate" },
    two_truths: { emoji: "✌️", title: "Which is the Lie?", subtitle: "Spot the fake statement", btnLabel: "That's the Lie" },
    roast_room: { emoji: "🎭", title: "Vote the Funniest!", subtitle: "Which roast cracked you up?", btnLabel: "Vote Funniest" },
    debate_pit: { emoji: "⚔️", title: "Vote the Winner!", subtitle: "Who argued better?", btnLabel: "Vote" },
    finish_the_sentence: { emoji: "✏️", title: "Best Finish!", subtitle: "Pick the most creative ending", btnLabel: "Vote" },
    confessions: { emoji: "🤫", title: "Guess Who!", subtitle: "Whose confession is it?", btnLabel: "Vote" },
    whose_line: { emoji: "💬", title: "Guess the Author!", subtitle: "Who do you think wrote this?", btnLabel: "Vote" },
    emoji_story: { emoji: "📖", title: "Best Story!", subtitle: "Pick your favourite emoji story", btnLabel: "Vote" },
    unhinged_advice: { emoji: "🤪", title: "Most Unhinged!", subtitle: "Pick the wildest advice", btnLabel: "Vote" },
};

// All answer-based voting games are anonymous to prevent bias
const ANONYMOUS_VOTE_GAMES = ["roast_room", "finish_the_sentence", "confessions", "whose_line", "emoji_story", "unhinged_advice"];

export default function VotingScreen({ room, myId, onVote }: Props) {
    const [voted, setVoted] = useState<string | null>(null);
    const [localSelected, setLocalSelected] = useState<string | null>(null);
    const hasVoted = room.players.find(p => p.id === myId)?.hasVoted ?? !!voted;
    const gt = room.gameType ?? "guess_the_liar";
    const cfg = VOTE_CONFIGS[gt] ?? VOTE_CONFIGS["guess_the_liar"];
    const answers = (room.answers ?? []) as AnswerEntry[];
    const qd = room.questionData as Record<string, string> | null;
    const runoffIds = room.voteRunoffIds ?? null;

    // For two_truths: statements are in answers[spotlightId].answer = {statements, lieIndex}
    const spotlightAnswer = gt === "two_truths"
        ? answers.find(a => a.playerId === room.spotlightId)
        : null;
    const statements: string[] = spotlightAnswer
        ? ((spotlightAnswer.answer as Record<string, unknown>).statements as string[] ?? [])
        : [];

    // For debate_pit: answers = debater arguments
    const debateAnswers = gt === "debate_pit"
        ? answers.filter(a => room.debaterIds?.includes(a.playerId))
        : [];

    // Voting eligibility rules
    const canVote = (targetId: string) => {
        if (gt === "guess_the_liar") return targetId !== myId;
        if (gt === "two_truths") return myId !== room.spotlightId;
        if (gt === "debate_pit") return !room.debaterIds?.includes(myId);
        if (gt === "mafia") return (room.mafiaAliveIds ?? []).includes(myId) && targetId !== myId;
        // Prevent self-voting in all answer-based games
        if (ANONYMOUS_VOTE_GAMES.includes(gt)) return targetId !== myId;
        return targetId !== myId;
    };

    // Single-tap selects locally; lock-in button sends to backend
    const handle = (targetId: string) => {
        if (hasVoted || !canVote(targetId)) return;
        setLocalSelected(targetId);
    };

    const handleLockIn = () => {
        if (!localSelected || hasVoted) return;
        setVoted(localSelected);
        onVote(localSelected);
    };

    // Combined selection for display: locked vote > local selection
    const displaySelected = (id: string) => (voted ?? localSelected) === id;

    const isSpectator = (gt === "two_truths" && myId === room.spotlightId)
        || (gt === "debate_pit" && room.debaterIds?.includes(myId))
        || (gt === "mafia" && !(room.mafiaAliveIds ?? []).includes(myId));

    const total = gt === "two_truths"
        ? room.players.filter(p => p.id !== room.spotlightId).length
        : gt === "debate_pit"
            ? room.players.filter(p => !room.debaterIds?.includes(p.id)).length
            : gt === "mafia"
                ? (room.mafiaAliveIds ?? []).length
                : room.players.length;

    return (
        <div className="page-fill gap-3">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="round-pill">{cfg.emoji} Round {room.round}/{room.maxRounds}</div>
                <div className="flex items-center gap-1.5">
                    {Array.from({ length: total }).map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < room.voteCount ? "bg-purple-400" : "bg-white/20"}`} />
                    ))}
                    <span className="font-nunito text-white/45 text-xs ml-1">{room.voteCount}/{total}</span>
                </div>
            </div>

            {/* Progress */}
            <div className="progress-track flex-shrink-0">
                <motion.div className="progress-fill" initial={{ width: 0 }}
                    animate={{ width: `${total > 0 ? (room.voteCount / total) * 100 : 0}%` }} transition={{ duration: 0.5 }} />
            </div>

            {/* Title */}
            <div className="text-center flex-shrink-0">
                <div className="text-4xl mb-1">{cfg.emoji}</div>
                <h2 className="font-fredoka text-2xl text-white">{cfg.title}</h2>
                <p className="font-nunito text-white/45 text-sm">{cfg.subtitle}</p>
            </div>

            {isSpectator ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <div className="text-5xl wait-pulse">⏳</div>
                    <div className="font-fredoka text-white text-xl">Others are voting…</div>
                    <p className="font-nunito text-white/40 text-sm">{room.voteCount}/{total} votes in</p>
                </div>
            ) : (
                <div className="flex-1 scroll-y flex flex-col gap-2 pb-2">

                    {/* TWO TRUTHS: vote on which statement index is the lie */}
                    {gt === "two_truths" && statements.length > 0 && (
                        <>
                            <p className="font-nunito text-white/50 text-xs uppercase tracking-widest">Which is the lie?</p>
                            {statements.map((s, i) => (
                                <motion.button key={i}
                                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.07 }}
                                    onClick={() => handle(String(i))}
                                    disabled={hasVoted}
                                    className={`vote-card w-full text-left ${displaySelected(String(i)) ? "selected" : ""} ${hasVoted && !displaySelected(String(i)) ? "opacity-40" : ""}`}>
                                    <div className="flex items-start gap-3">
                                        <span className="font-fredoka text-purple-400 text-lg w-5 flex-shrink-0">{i + 1}</span>
                                        <p className="font-nunito font-bold text-white text-base leading-snug">{s}</p>
                                        {displaySelected(String(i)) && <span className="ml-auto text-purple-300 font-nunito text-xs flex-shrink-0">{voted === String(i) ? "Locked ✓" : "Your pick"}</span>}
                                    </div>
                                </motion.button>
                            ))}
                        </>
                    )}

                    {/* MAFIA: vote to eliminate an alive player */}
                    {gt === "mafia" && (
                        <>
                            <p className="font-nunito text-white/50 text-xs uppercase tracking-widest mb-1">⚖️ Alive players — vote to eliminate</p>
                            {room.players
                                .filter(p => (room.mafiaAliveIds ?? []).includes(p.id) && p.id !== myId)
                                .map((p, i) => (
                                    <motion.button key={p.id}
                                        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.07 }}
                                        onClick={() => handle(p.id)}
                                        disabled={hasVoted}
                                        className={`vote-card w-full text-left ${
                                            displaySelected(p.id) ? "selected" : ""
                                        } ${hasVoted && !displaySelected(p.id) ? "opacity-40" : ""}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="font-fredoka text-white text-base flex-1">{p.name}</span>
                                            {displaySelected(p.id) && <span className="font-nunito text-purple-300 text-xs">{voted === p.id ? "Locked ✓" : "Your pick"}</span>}
                                        </div>
                                    </motion.button>
                                ))}
                        </>
                    )}

                    {/* SPYFALL: vote for a player by name */}
                    {gt === "spyfall" && (
                        <>
                            <p className="font-nunito text-white/50 text-xs uppercase tracking-widest mb-1">🔍 Pick your suspect</p>
                            {room.players
                                .filter(p => p.id !== myId)
                                .map((p, i) => (
                                    <motion.button key={p.id}
                                        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.07 }}
                                        onClick={() => handle(p.id)}
                                        disabled={hasVoted}
                                        className={`vote-card w-full text-left ${
                                            displaySelected(p.id) ? "selected" : ""
                                        } ${hasVoted && !displaySelected(p.id) ? "opacity-40" : ""}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="font-fredoka text-white text-base flex-1">{p.name}</span>
                                            {displaySelected(p.id) && <span className="font-nunito text-purple-300 text-xs">{voted === p.id ? "Locked ✓" : "Your pick"}</span>}
                                        </div>
                                    </motion.button>
                                ))}
                        </>
                    )}

                    {/* GUESS THE LIAR: show answer + player name, with runoff support */}
                    {gt === "guess_the_liar" && answers.length > 0 && (
                        <>
                            {runoffIds && (
                                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                                    className="flex-shrink-0 px-4 py-2.5 rounded-2xl text-center font-nunito text-sm font-bold text-amber-300"
                                    style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", marginBottom: 4 }}>
                                    ⚠️ No majority — vote again!
                                </motion.div>
                            )}
                            <p className="font-nunito text-white/50 text-xs uppercase tracking-widest mb-1">📝 All answers</p>
                            {[...answers]
                                .sort((a, b) => a.playerId.localeCompare(b.playerId))
                                .filter(a => {
                                    if (a.playerId === myId) return false;
                                    if (runoffIds) return runoffIds.includes(a.playerId);
                                    return true;
                                })
                                .map((a, i) => (
                                    <motion.button key={a.playerId}
                                        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.07 }}
                                        onClick={() => handle(a.playerId)}
                                        disabled={hasVoted || !canVote(a.playerId)}
                                        className={`vote-card w-full text-left ${displaySelected(a.playerId) ? "selected" : ""} ${(hasVoted && !displaySelected(a.playerId)) || !canVote(a.playerId) ? "opacity-40" : ""}`}>
                                        <p className="font-nunito text-white/40 text-xs mb-1">{a.playerName}</p>
                                        <p className="font-nunito font-bold text-white text-base leading-snug break-words">{a.answer as string}</p>
                                        {displaySelected(a.playerId) && <p className="font-nunito text-purple-300 text-xs mt-1">{voted === a.playerId ? "Locked ✓" : "Your pick"}</p>}
                                    </motion.button>
                                ))}
                        </>
                    )}

                    {/* CREATIVE ANSWER GAMES: anonymous answers */}
                    {ANONYMOUS_VOTE_GAMES.includes(gt) && answers.length > 0 && (
                        <>
                            <p className="font-nunito text-white/50 text-xs uppercase tracking-widest mb-1">✏️ Pick your favourite</p>
                            {[...answers]
                                .sort((a, b) => a.playerId.localeCompare(b.playerId))
                                .filter(a => a.playerId !== myId)
                                .map((a, i) => (
                                    <motion.button key={a.playerId}
                                        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.07 }}
                                        onClick={() => handle(a.playerId)}
                                        disabled={hasVoted}
                                        className={`vote-card w-full text-left ${displaySelected(a.playerId) ? "selected" : ""} ${hasVoted && !displaySelected(a.playerId) ? "opacity-40" : ""}`}>
                                        <p className="font-nunito font-bold text-white text-base leading-snug break-words">{a.answer as string}</p>
                                        {displaySelected(a.playerId) && <p className="font-nunito text-purple-300 text-xs mt-1">{voted === a.playerId ? "Locked ✓" : "Your pick"}</p>}
                                    </motion.button>
                                ))}
                        </>
                    )}

                    {/* DEBATE PIT: vote on debater */}
                    {gt === "debate_pit" && debateAnswers.length > 0 && (
                        <>
                            <p className="font-nunito text-white/50 text-xs uppercase tracking-widest mb-1">Who argued better?</p>
                            {debateAnswers.map((a, i) => {
                                const isFor = a.playerId === room.debaterIds?.[0];
                                return (
                                    <motion.button key={a.playerId}
                                        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.07 }}
                                        onClick={() => handle(a.playerId)}
                                        disabled={hasVoted}
                                        className={`vote-card w-full text-left ${displaySelected(a.playerId) ? "selected" : ""} ${hasVoted && !displaySelected(a.playerId) ? "opacity-40" : ""}`}>
                                        <div className={`inline-flex text-xs font-extrabold font-nunito px-2 py-0.5 rounded-lg mb-2 ${isFor ? "side-for" : "side-against"}`}>
                                            {isFor ? "FOR" : "AGAINST"} — {a.playerName}
                                        </div>
                                        <p className="font-nunito text-white text-sm leading-snug">{a.answer as string}</p>
                                        {displaySelected(a.playerId) && <p className="font-nunito text-purple-300 text-xs mt-1.5">{voted === a.playerId ? "Locked ✓" : "Your pick"}</p>}
                                    </motion.button>
                                );
                            })}
                        </>
                    )}
                </div>
            )}

            {/* Sticky lock-in confirm button */}
            <AnimatePresence>
                {localSelected && !hasVoted && !isSpectator && (
                    <motion.div
                        key="lock-in-btn"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ type: "spring", stiffness: 340, damping: 28 }}
                        className="flex-shrink-0 pt-2 pb-2">
                        <button
                            onClick={handleLockIn}
                            className="btn-primary w-full"
                            style={{ fontSize: "1.05rem" }}>
                            🔒 Lock In Vote
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {hasVoted && !isSpectator && (
                <p className="font-nunito text-white/40 text-sm text-center wait-pulse flex-shrink-0 pb-2">
                    Vote locked in! Waiting for everyone…
                </p>
            )}
        </div>
    );
}
