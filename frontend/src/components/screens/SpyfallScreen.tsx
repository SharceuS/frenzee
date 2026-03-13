"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Room, SpyfallRole } from "@/lib/types";

interface Props {
    room: Room;
    myId: string;
    mySpyfallRole: SpyfallRole | null;
    isHost: boolean;
    onDiscuss: () => void;
    onAccuse: () => void;
    onGuess: (location: string) => void;
}

const TURN_DURATION = 30; // seconds per turn (mirrors backend)

export default function SpyfallScreen({ room, myId, mySpyfallRole, isHost, onDiscuss, onAccuse, onGuess }: Props) {
    const phase = room.phase;
    const isSpy = mySpyfallRole?.role === "spy";
    const locationNames = room.spyfallLocationNames ?? mySpyfallRole?.locationNames ?? [];

    // ── Role reveal countdown (question phase, 5 s) ──────────────────────────
    const [revealCount, setRevealCount] = useState(5);
    useEffect(() => {
        if (phase !== "question") return;
        setRevealCount(5);
        const id = setInterval(() => setRevealCount(c => Math.max(0, c - 1)), 1000);
        return () => clearInterval(id);
    }, [phase]);

    // ── Discussion turn timer ─────────────────────────────────────────────────
    const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_DURATION);
    const turnIndexRef = useRef<number>(-1);
    useEffect(() => {
        if (phase !== "spyfall_discussion") return;
        const idx = room.spyfallTurnIndex ?? 0;
        if (idx !== turnIndexRef.current) {
            turnIndexRef.current = idx;
            setTurnTimeLeft(TURN_DURATION);
        }
        const id = setInterval(() => setTurnTimeLeft(t => Math.max(0, t - 1)), 1000);
        return () => clearInterval(id);
    }, [phase, room.spyfallTurnIndex]);

    // ── Spy guess state ───────────────────────────────────────────────────────
    const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
    const [guessSubmitted, setGuessSubmitted] = useState(false);

    const handleGuess = () => {
        if (!selectedLoc || guessSubmitted) return;
        setGuessSubmitted(true);
        onGuess(selectedLoc);
    };

    const totalTurns = room.spyfallTurns?.length ?? 0;
    const turnIndex = room.spyfallTurnIndex ?? 0;
    const askerId = room.spyfallAskerId;
    const targetId = room.spyfallTargetId;
    const getPlayerName = (id: string | null) => id ? (room.players.find(p => p.id === id)?.name ?? "?") : "?";
    const isAsker = askerId === myId;
    const isTarget = targetId === myId;
    const timerProgress = turnTimeLeft / TURN_DURATION;
    const timerDanger = turnTimeLeft <= 10;

    // ── ROLE REVEAL ───────────────────────────────────────────────────────────
    if (phase === "question") {
        return (
            <div className="page-fill items-center justify-center gap-4 px-4">
                <motion.div
                    key="role-card"
                    initial={{ opacity: 0, scale: 0.7, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 20 }}
                    className="w-full max-w-sm"
                >
                    {isSpy ? (
                        <SpyRoleCard revealCount={revealCount} locationNames={locationNames} />
                    ) : (
                        <VillagerRoleCard
                            location={mySpyfallRole?.location ?? "?"}
                            roleCard={mySpyfallRole?.roleCard ?? "?"}
                            revealCount={revealCount}
                        />
                    )}
                </motion.div>

                {/* All locations reference grid */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="w-full max-w-sm"
                >
                    <p className="font-nunito text-white/35 text-xs text-center mb-2 uppercase tracking-widest">
                        📍 All possible locations
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                        {locationNames.map((name) => (
                            <div
                                key={name}
                                className={`rounded-xl py-1.5 px-2 text-center text-xs font-nunito border transition-all
                                    ${!isSpy && mySpyfallRole?.location === name
                                        ? "border-sky-400/60 bg-sky-400/12 text-sky-300 font-bold"
                                        : "border-white/8 bg-white/4 text-white/45"}`}
                            >
                                {name}
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        );
    }

    // ── DISCUSSION ────────────────────────────────────────────────────────────
    if (phase === "spyfall_discussion") {
        return (
            <div className="page-fill gap-3 px-4">
                {/* Header row */}
                <div className="flex items-center justify-between flex-shrink-0">
                    <div className="round-pill">🔍 Round {room.round}/{room.maxRounds}</div>
                    <div className="font-nunito text-white/45 text-xs">
                        Turn {Math.min(turnIndex + 1, totalTurns)}/{totalTurns}
                    </div>
                </div>

                {/* Turn timer bar */}
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex-shrink-0">
                    <motion.div
                        className="h-full rounded-full"
                        style={{ background: timerDanger ? "#EF4444" : "#22D3EE" }}
                        animate={{ width: `${timerProgress * 100}%` }}
                        transition={{ duration: 0.8, ease: "linear" }}
                    />
                </div>

                {/* Current turn banner */}
                <motion.div
                    key={`turn-${turnIndex}`}
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    className={`party-card flex-shrink-0 text-center py-4 px-4
                        ${isAsker ? "border-violet-400/50" : isTarget ? "border-amber-400/50" : "border-white/10"}`}
                    style={{
                        boxShadow: isAsker
                            ? "0 0 32px rgba(167,139,250,0.2)"
                            : isTarget
                                ? "0 0 32px rgba(251,191,36,0.15)"
                                : undefined,
                    }}
                >
                    <div className="text-4xl mb-2">
                        {isAsker ? "🎤" : isTarget ? "🎯" : "👀"}
                    </div>
                    <h2 className="font-fredoka text-xl text-white leading-snug mb-2">
                        {isAsker
                            ? "Your turn to ask!"
                            : isTarget
                                ? "You're being questioned!"
                                : "Watch and listen…"}
                    </h2>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        <span className="font-nunito font-extrabold text-violet-300 text-sm">
                            {getPlayerName(askerId)}
                        </span>
                        <span className="font-nunito text-white/30 text-xs">asks</span>
                        <span className="font-nunito font-extrabold text-amber-300 text-sm">
                            {getPlayerName(targetId)}
                        </span>
                    </div>
                    <p className={`font-nunito text-xs mt-2 ${timerDanger ? "text-red-400" : "text-white/30"}`}>
                        {timerDanger && "⏰ "}
                        {turnTimeLeft}s remaining
                    </p>
                </motion.div>

                {/* Spy indicator badge */}
                {isSpy && (
                    <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex-shrink-0 flex items-center gap-2 rounded-2xl py-2 px-3 border"
                        style={{ background: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.3)" }}
                    >
                        <span className="text-base">🕵️</span>
                        <span className="font-nunito text-red-300 text-sm font-bold">
                            You are the Spy — blend in!
                        </span>
                    </motion.div>
                )}

                {/* Location reference panel */}
                <LocationPanel
                    locationNames={locationNames}
                    myLocation={isSpy ? null : mySpyfallRole?.location ?? null}
                />

                {/* Action buttons */}
                <div className="flex flex-col gap-2 mt-auto flex-shrink-0">
                    {isAsker && (
                        <motion.button
                            className="btn-primary"
                            whileTap={{ scale: 0.97 }}
                            onClick={onDiscuss}
                        >
                            ✓ Done Questioning
                        </motion.button>
                    )}
                    {isHost && !isAsker && (
                        <button
                            onClick={onAccuse}
                            className="font-nunito text-white/40 text-sm py-2 text-center hover:text-white/70 transition-colors"
                        >
                            Skip to Vote →
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── SPY GUESS ─────────────────────────────────────────────────────────────
    if (phase === "spyfall_guess") {
        if (isSpy) {
            return (
                <div className="page-fill gap-3 px-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 18 }}
                        className="party-card text-center py-5 px-4 flex-shrink-0"
                        style={{
                            borderColor: "rgba(239,68,68,0.45)",
                            boxShadow: "0 0 48px rgba(239,68,68,0.2)",
                            background: "rgba(239,68,68,0.05)",
                        }}
                    >
                        <div className="text-5xl mb-2">🕵️</div>
                        <h2 className="font-fredoka text-2xl text-red-300">You've been caught!</h2>
                        <p className="font-nunito text-white/50 text-sm mt-1">
                            Guess the location to steal victory
                        </p>
                    </motion.div>

                    <p className="font-nunito text-white/40 text-xs uppercase tracking-widest flex-shrink-0">
                        📍 Where were you?
                    </p>

                    <div className="flex-1 scroll-y">
                        <div className="grid grid-cols-2 gap-2 pb-2">
                            {locationNames.map((name, i) => (
                                <motion.button
                                    key={name}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    onClick={() => !guessSubmitted && setSelectedLoc(name)}
                                    disabled={guessSubmitted}
                                    className={`vote-card text-center font-fredoka text-base py-3 transition-all
                                        ${selectedLoc === name ? "selected" : ""}
                                        ${guessSubmitted && selectedLoc !== name ? "opacity-35" : ""}`}
                                >
                                    {name}
                                    {selectedLoc === name && (
                                        <span className="ml-2 text-purple-300">✓</span>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <motion.button
                        className="btn-primary flex-shrink-0"
                        disabled={!selectedLoc || guessSubmitted}
                        onClick={handleGuess}
                        whileTap={{ scale: 0.97 }}
                        style={{ opacity: !selectedLoc || guessSubmitted ? 0.45 : 1 }}
                    >
                        {guessSubmitted ? "Guess sent… ⏳" : "Submit Guess →"}
                    </motion.button>
                </div>
            );
        }

        // Non-spy waiting screen
        return (
            <div className="page-fill items-center justify-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className="party-card text-center py-10 px-6 w-full max-w-sm"
                    style={{
                        borderColor: "rgba(239,68,68,0.3)",
                        boxShadow: "0 0 40px rgba(239,68,68,0.12)",
                    }}
                >
                    <div className="text-6xl mb-4 wait-pulse">🕵️</div>
                    <h2 className="font-fredoka text-2xl text-white mb-2">The spy is guessing…</h2>
                    <p className="font-nunito text-white/45 text-sm leading-relaxed">
                        They were caught! Now they&apos;re making their final guess.
                        <br />
                        <span className="text-white/30">Will they figure out the location?</span>
                    </p>
                </motion.div>
            </div>
        );
    }

    return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SpyRoleCard({ revealCount, locationNames }: { revealCount: number; locationNames: string[] }) {
    return (
        <div
            className="party-card text-center py-7 px-5"
            style={{
                borderColor: "rgba(239,68,68,0.55)",
                boxShadow: "0 0 72px rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.06)",
            }}
        >
            <motion.div
                animate={{ rotate: [0, -8, 8, -8, 8, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="text-6xl mb-3"
            >
                🕵️
            </motion.div>
            <div
                className="inline-flex items-center gap-2 font-nunito text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-3"
                style={{ background: "rgba(239,68,68,0.18)", color: "#FCA5A5" }}
            >
                SECRET ROLE
            </div>
            <h2 className="font-fredoka text-4xl text-red-300 mb-2">YOU ARE THE SPY</h2>
            <p className="font-nunito text-white/45 text-sm mb-4">
                You don&apos;t know the location.
                <br />
                Blend in. Ask smart questions. Stay hidden.
            </p>
            <p className="font-nunito text-white/25 text-xs mb-4">
                Hint: use the location list to ask believable questions
            </p>
            <div
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-fredoka text-red-300/70 text-xl"
                style={{ background: "rgba(239,68,68,0.1)" }}
            >
                {revealCount}s
            </div>

            {/* Compact location list for spy to reference */}
            {locationNames.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-1">
                    {locationNames.map(name => (
                        <div
                            key={name}
                            className="rounded-lg py-1 px-1.5 text-center text-xs font-nunito text-red-200/40 border border-red-500/10"
                            style={{ background: "rgba(239,68,68,0.05)" }}
                        >
                            {name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function VillagerRoleCard({ location, roleCard, revealCount }: {
    location: string;
    roleCard: string;
    revealCount: number;
}) {
    return (
        <div
            className="party-card text-center py-7 px-5"
            style={{
                borderColor: "rgba(14,165,233,0.55)",
                boxShadow: "0 0 72px rgba(14,165,233,0.22)",
                background: "rgba(14,165,233,0.05)",
            }}
        >
            <div className="text-6xl mb-3">📍</div>
            <div
                className="inline-flex items-center gap-2 font-nunito text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-3"
                style={{ background: "rgba(14,165,233,0.18)", color: "#7DD3FC" }}
            >
                YOUR LOCATION
            </div>
            <h2 className="font-fredoka text-4xl text-sky-300 mb-3">{location}</h2>
            <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl mb-4"
                style={{ background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.3)" }}
            >
                <span className="font-nunito text-sky-300 text-base font-bold">{roleCard}</span>
            </div>
            <p className="font-nunito text-white/40 text-sm mb-1">
                Keep it secret. Don&apos;t give too much away.
            </p>
            <p className="font-nunito text-white/25 text-xs mb-4">
                Answer questions honestly — but carefully
            </p>
            <div
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-fredoka text-sky-300/60 text-xl"
                style={{ background: "rgba(14,165,233,0.1)" }}
            >
                {revealCount}s
            </div>
        </div>
    );
}

function LocationPanel({ locationNames, myLocation }: {
    locationNames: string[];
    myLocation: string | null;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="glass-card rounded-2xl overflow-hidden flex-shrink-0">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between px-3 py-2.5"
            >
                <span className="font-nunito text-white/50 text-xs uppercase tracking-widest">
                    📍 Possible locations
                </span>
                <span className="font-nunito text-white/35 text-xs">
                    {expanded ? "▲ hide" : "▼ show"}
                </span>
            </button>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="px-3 pb-3"
                    >
                        <div className="grid grid-cols-3 gap-1.5">
                            {locationNames.map((name) => (
                                <div
                                    key={name}
                                    className={`rounded-xl py-1.5 px-2 text-center text-xs font-nunito border
                                        ${myLocation === name
                                            ? "border-sky-400/55 bg-sky-400/12 text-sky-300 font-bold"
                                            : "border-white/8 bg-white/4 text-white/50"}`}
                                >
                                    {name}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
