"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Room, MafiaRole, DetectiveResult } from "@/lib/types";

interface Props {
    room: Room;
    myId: string;
    myMafiaRole: MafiaRole | null;
    detectiveResult: DetectiveResult | null;
    isHost: boolean;
    onNightKill: (targetId: string) => void;
    onDoctorSave: (targetId: string) => void;
    onDetectiveCheck: (targetId: string) => void;
    onDayStart: () => void;
}

const ROLE_CONFIG: Record<string, { emoji: string; label: string; color: string; border: string; bg: string; glow: string }> = {
    mafia:     { emoji: "🔪", label: "MAFIA",     color: "#F87171", border: "rgba(239,68,68,0.55)",    bg: "rgba(239,68,68,0.06)",    glow: "0 0 72px rgba(239,68,68,0.25)" },
    doctor:    { emoji: "💉", label: "DOCTOR",    color: "#34D399", border: "rgba(52,211,153,0.55)",   bg: "rgba(52,211,153,0.06)",   glow: "0 0 72px rgba(52,211,153,0.20)" },
    detective: { emoji: "🔍", label: "DETECTIVE", color: "#60A5FA", border: "rgba(96,165,250,0.55)",   bg: "rgba(96,165,250,0.06)",   glow: "0 0 72px rgba(96,165,250,0.20)" },
    villager:  { emoji: "🏘️", label: "VILLAGER",  color: "#E4E4E7", border: "rgba(228,228,231,0.25)",  bg: "rgba(255,255,255,0.03)",  glow: "0 0 72px rgba(255,255,255,0.05)" },
};

const NIGHT_DESCRIPTION: Record<string, string> = {
    mafia:     "Choose your target wisely. One wrong move and the town is onto you.",
    doctor:    "Pick a player to protect tonight. Your save might change everything.",
    detective: "Investigate one player. You'll get a private result no one else sees.",
    villager:  "You have no night action. Stay alert and pay attention.",
};

const DAY_DISCUSSION_DURATION = 45; // seconds (mirrors backend auto-timer)

export default function MafiaScreen({
    room, myId, myMafiaRole, detectiveResult, isHost,
    onNightKill, onDoctorSave, onDetectiveCheck, onDayStart,
}: Props) {
    const phase = room.phase;
    const role = myMafiaRole?.role ?? "villager";
    const cfg = ROLE_CONFIG[role];
    const alivePlayers = room.players.filter(p => room.mafiaAliveIds.includes(p.id));
    const deadPlayers = room.players.filter(p => room.mafiaDeadIds.includes(p.id));
    const iAmAlive = room.mafiaAliveIds.includes(myId);
    const getPlayerName = (id: string | null) => id ? (room.players.find(p => p.id === id)?.name ?? "?") : "?";

    // ── Role reveal countdown (question phase, 7 s) ──────────────────────────
    const [revealCount, setRevealCount] = useState(7);
    useEffect(() => {
        if (phase !== "question") return;
        setRevealCount(7);
        const id = setInterval(() => setRevealCount(c => Math.max(0, c - 1)), 1000);
        return () => clearInterval(id);
    }, [phase]);

    // ── Night action submission state ─────────────────────────────────────────
    const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
    const [actionSubmitted, setActionSubmitted] = useState(false);
    const prevPhaseRef = useRef<string>("");
    useEffect(() => {
        if (phase !== prevPhaseRef.current) {
            setSelectedTarget(null);
            setActionSubmitted(false);
            prevPhaseRef.current = phase;
        }
    }, [phase]);

    // ── Day discussion countdown ──────────────────────────────────────────────
    const [dayTimeLeft, setDayTimeLeft] = useState(DAY_DISCUSSION_DURATION);
    useEffect(() => {
        if (phase !== "day_discussion") return;
        setDayTimeLeft(DAY_DISCUSSION_DURATION);
        const id = setInterval(() => setDayTimeLeft(t => Math.max(0, t - 1)), 1000);
        return () => clearInterval(id);
    }, [phase]);

    const handleNightAction = (targetId: string) => {
        if (actionSubmitted) return;
        setSelectedTarget(targetId);
        setActionSubmitted(true);
        if (phase === "mafia_night") onNightKill(targetId);
        else if (phase === "doctor_night") onDoctorSave(targetId);
        else if (phase === "detective_night") onDetectiveCheck(targetId);
    };

    // ── ROLE REVEAL (question phase, 7s) ─────────────────────────────────────
    if (phase === "question") {
        return (
            <div className="page-fill items-center justify-center gap-4 px-4">
                <motion.div
                    key="mafia-role-card"
                    initial={{ opacity: 0, scale: 0.7, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 20 }}
                    className="w-full max-w-sm"
                >
                    <div
                        className="party-card text-center py-8 px-6"
                        style={{ borderColor: cfg.border, boxShadow: cfg.glow, background: cfg.bg }}
                    >
                        <motion.div
                            animate={role === "mafia"
                                ? { scale: [1, 1.12, 1], rotate: [0, -10, 10, -6, 0] }
                                : {}}
                            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                            className="text-7xl mb-4"
                        >
                            {cfg.emoji}
                        </motion.div>

                        <div
                            className="inline-flex items-center font-nunito text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
                            style={{ background: `${cfg.color}22`, color: cfg.color }}
                        >
                            YOUR ROLE
                        </div>

                        <h2
                            className="font-fredoka text-4xl mb-3"
                            style={{ color: cfg.color }}
                        >
                            {cfg.label}
                        </h2>

                        <p className="font-nunito text-white/50 text-sm leading-relaxed mb-4">
                            {NIGHT_DESCRIPTION[role]}
                        </p>

                        {/* Mafia sees their team */}
                        {role === "mafia" && myMafiaRole?.mafiaTeam && myMafiaRole.mafiaTeam.length > 1 && (
                            <div
                                className="rounded-2xl px-4 py-3 mt-2"
                                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
                            >
                                <p className="font-nunito text-red-300/70 text-xs uppercase tracking-widest mb-2">
                                    Your team
                                </p>
                                {myMafiaRole.mafiaTeam.map(m => (
                                    <p key={m.id} className="font-fredoka text-red-300 text-lg">
                                        {m.id === myId ? `${m.name} (you)` : m.name}
                                    </p>
                                ))}
                            </div>
                        )}

                        <div
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-fredoka text-xl mt-4"
                            style={{ background: `${cfg.color}18`, color: `${cfg.color}99` }}
                        >
                            {revealCount}s
                        </div>
                    </div>
                </motion.div>

                {/* Roster mini preview */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="w-full max-w-sm party-card py-3 px-4"
                >
                    <p className="font-nunito text-white/35 text-xs uppercase tracking-widest mb-2">
                        👥 Players ({room.players.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {room.players.map(p => (
                            <span
                                key={p.id}
                                className="font-nunito text-sm px-2.5 py-1 rounded-full"
                                style={{
                                    background: p.id === myId ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.06)",
                                    color: p.id === myId ? "#C4B5FD" : "rgba(255,255,255,0.55)",
                                    border: p.id === myId ? "1px solid rgba(167,139,250,0.35)" : "1px solid rgba(255,255,255,0.08)",
                                }}
                            >
                                {p.name}{p.id === myId ? " (you)" : ""}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </div>
        );
    }

    // ── Night phases ──────────────────────────────────────────────────────────
    const isNightPhase = ["mafia_night", "doctor_night", "detective_night"].includes(phase);
    if (isNightPhase) {
        const isMyTurn =
            (phase === "mafia_night" && role === "mafia" && iAmAlive) ||
            (phase === "doctor_night" && role === "doctor" && iAmAlive) ||
            (phase === "detective_night" && role === "detective" && iAmAlive);

        // Targets for each role
        const killTargets = alivePlayers.filter(p => p.id !== myId);
        // Detective can't investigate self; Doctor can save anyone including self
        const actionTargets = phase === "detective_night"
            ? alivePlayers.filter(p => p.id !== myId)
            : alivePlayers; // doctor can save anyone

        const targets = (phase === "mafia_night" ? killTargets : actionTargets).filter(p => {
            if (phase === "mafia_night") {
                // Mafia can't kill other Mafia
                // We don't expose mafiaRoles to the client, but the backend validates
                // Just filter out self
                return p.id !== myId;
            }
            return true;
        });

        return (
            <NightPhaseScreen
                phase={phase}
                room={room}
                myId={myId}
                role={role}
                cfg={cfg}
                isMyTurn={isMyTurn}
                iAmAlive={iAmAlive}
                targets={targets}
                selectedTarget={selectedTarget}
                actionSubmitted={actionSubmitted}
                onPickTarget={handleNightAction}
                detectiveResult={detectiveResult}
                alivePlayers={alivePlayers}
                deadPlayers={deadPlayers}
            />
        );
    }

    // ── DAY DISCUSSION ────────────────────────────────────────────────────────
    if (phase === "day_discussion") {
        const summary = room.mafiaRoundSummary;
        const timerProgress = dayTimeLeft / DAY_DISCUSSION_DURATION;
        const timerDanger = dayTimeLeft <= 10;

        return (
            <div className="page-fill gap-3 px-4">
                {/* Header */}
                <div className="flex items-center justify-between flex-shrink-0">
                    <div className="round-pill">🕵️ Mafia</div>
                    <PlayerRoster alive={alivePlayers.length} dead={deadPlayers.length} />
                </div>

                {/* Night summary */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className="party-card text-center py-5 px-4 flex-shrink-0"
                    style={summary?.killedId
                        ? { borderColor: "rgba(239,68,68,0.45)", boxShadow: "0 0 44px rgba(239,68,68,0.18)", background: "rgba(239,68,68,0.04)" }
                        : { borderColor: "rgba(52,211,153,0.4)", boxShadow: "0 0 44px rgba(52,211,153,0.15)", background: "rgba(52,211,153,0.04)" }
                    }
                >
                    <div className="text-5xl mb-2">
                        {summary?.saved ? "💉" : summary?.killedId ? "💀" : "🌅"}
                    </div>
                    <h2 className="font-fredoka text-2xl text-white mb-1">
                        {summary?.saved
                            ? "Someone was saved last night!"
                            : summary?.killedId
                                ? `${getPlayerName(summary.killedId)} was eliminated!`
                                : "No one was eliminated last night."}
                    </h2>
                    {summary?.killedId && !summary.saved && (
                        <p className="font-nunito text-white/45 text-sm">The town wakes to a dark morning.</p>
                    )}
                    {summary?.saved && (
                        <p className="font-nunito text-white/45 text-sm">The Doctor saved someone from certain death.</p>
                    )}
                </motion.div>

                {/* Alive/dead roster */}
                <AliveRoster room={room} myId={myId} alivePlayers={alivePlayers} deadPlayers={deadPlayers} />

                {/* Discussion timer */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: timerDanger ? "#EF4444" : "#F59E0B" }}
                            animate={{ width: `${timerProgress * 100}%` }}
                            transition={{ duration: 0.9, ease: "linear" }}
                        />
                    </div>
                    <span className={`font-nunito text-xs ${timerDanger ? "text-red-400" : "text-white/35"}`}>
                        {timerDanger && "⏰ "}{dayTimeLeft}s
                    </span>
                </div>

                {/* Bottom actions */}
                <div className="flex flex-col gap-2 mt-auto flex-shrink-0">
                    <p className="font-nunito text-white/40 text-sm text-center">
                        Discuss and decide who the Mafia might be…
                    </p>
                    {isHost && (
                        <motion.button
                            className="btn-primary"
                            whileTap={{ scale: 0.97 }}
                            onClick={onDayStart}
                        >
                            ⚖️ Start Voting
                        </motion.button>
                    )}
                    {!isHost && (
                        <p className="font-nunito text-white/25 text-xs text-center wait-pulse">
                            Waiting for host to open voting…
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return null;
}

// ── Night Phase Screen ────────────────────────────────────────────────────────

interface NightPhaseProps {
    phase: string;
    room: Room;
    myId: string;
    role: string;
    cfg: typeof ROLE_CONFIG[string];
    isMyTurn: boolean;
    iAmAlive: boolean;
    targets: { id: string; name: string }[];
    selectedTarget: string | null;
    actionSubmitted: boolean;
    onPickTarget: (id: string) => void;
    detectiveResult: DetectiveResult | null;
    alivePlayers: { id: string; name: string }[];
    deadPlayers: { id: string; name: string }[];
}

function NightPhaseScreen({
    phase, room, myId, role, cfg, isMyTurn, iAmAlive, targets,
    selectedTarget, actionSubmitted, onPickTarget, detectiveResult,
    alivePlayers, deadPlayers,
}: NightPhaseProps) {
    const phaseLabel = phase === "mafia_night" ? "Mafia Night" : phase === "doctor_night" ? "Doctor's Turn" : "Detective's Turn";
    const phaseEmoji = phase === "mafia_night" ? "🌙" : phase === "doctor_night" ? "💉" : "🔍";
    const actionLabel = phase === "mafia_night" ? "Choose your target" : phase === "doctor_night" ? "Who do you protect?" : "Who do you investigate?";
    const btnLabel = phase === "mafia_night" ? "🔪 Eliminate" : phase === "doctor_night" ? "💉 Protect" : "🔍 Investigate";

    return (
        <div className="page-fill gap-3 px-4" style={{ background: "linear-gradient(180deg, rgba(8,4,20,0.0) 0%, rgba(8,4,20,0.0) 100%)" }}>
            {/* Atmospheric night header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div className="round-pill flex items-center gap-1.5">
                    {phaseEmoji} {phaseLabel}
                </div>
                <PlayerRoster alive={alivePlayers.length} dead={deadPlayers.length} />
            </div>

            {isMyTurn ? (
                <>
                    {/* Spy/Doctor/Detective action card */}
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        className="party-card flex-shrink-0 px-4 py-4 text-center"
                        style={{ borderColor: cfg.border, background: cfg.bg, boxShadow: `0 0 36px ${cfg.border.replace("0.55", "0.18")}` }}
                    >
                        <div className="text-4xl mb-2">{cfg.emoji}</div>
                        <h2 className="font-fredoka text-xl text-white mb-1">{actionLabel}</h2>
                        <p className="font-nunito text-white/40 text-sm">
                            {NIGHT_DESCRIPTION[role]}
                        </p>
                    </motion.div>

                    {/* Previous detective result */}
                    {phase === "detective_night" && detectiveResult && (
                        <motion.div
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex-shrink-0 flex items-center gap-3 rounded-2xl py-2.5 px-4 border"
                            style={{
                                background: detectiveResult.isMafia ? "rgba(239,68,68,0.08)" : "rgba(52,211,153,0.08)",
                                borderColor: detectiveResult.isMafia ? "rgba(239,68,68,0.35)" : "rgba(52,211,153,0.35)",
                            }}
                        >
                            <span className="text-lg">{detectiveResult.isMafia ? "🔪" : "✅"}</span>
                            <p className="font-nunito text-sm">
                                <span className="font-bold text-white">{detectiveResult.targetName}</span>
                                <span className={detectiveResult.isMafia ? " text-red-300" : " text-green-300"}>
                                    {detectiveResult.isMafia ? " is Mafia!" : " is innocent."}
                                </span>
                            </p>
                        </motion.div>
                    )}

                    {/* Target selector */}
                    {!actionSubmitted && (
                        <div className="flex-1 scroll-y">
                            <p className="font-nunito text-white/40 text-xs uppercase tracking-widest mb-2">Alive players</p>
                            <div className="flex flex-col gap-2 pb-2">
                                {targets.map((p, i) => (
                                    <motion.button
                                        key={p.id}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        onClick={() => onPickTarget(p.id)}
                                        className={`vote-card w-full text-left flex items-center gap-3 ${selectedTarget === p.id ? "selected" : ""}`}
                                    >
                                        <span className="font-fredoka text-white text-base flex-1">{p.name}</span>
                                        {p.id === myId && (
                                            <span className="font-nunito text-white/30 text-xs">(you)</span>
                                        )}
                                        {selectedTarget === p.id && (
                                            <span className="font-nunito text-purple-300 text-xs">✓</span>
                                        )}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    )}

                    {actionSubmitted && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3">
                            <div className="text-5xl wait-pulse">{cfg.emoji}</div>
                            <p className="font-fredoka text-white text-xl">Action submitted!</p>
                            <p className="font-nunito text-white/40 text-sm">Waiting for other night actions…</p>
                        </div>
                    )}
                </>
            ) : (
                /* Spectator / waiting night screen */
                <NightWaitingScreen
                    iAmAlive={iAmAlive}
                    phase={phase}
                    role={role}
                    cfg={cfg}
                    alivePlayers={alivePlayers}
                    deadPlayers={deadPlayers}
                    room={room}
                    myId={myId}
                />
            )}
        </div>
    );
}

function NightWaitingScreen({
    iAmAlive, phase, role, cfg, alivePlayers, deadPlayers, room, myId,
}: {
    iAmAlive: boolean; phase: string; role: string;
    cfg: typeof ROLE_CONFIG[string];
    alivePlayers: { id: string; name: string }[];
    deadPlayers: { id: string; name: string }[];
    room: Room; myId: string;
}) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-2">
            <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="text-7xl"
            >
                🌙
            </motion.div>
            <div className="text-center">
                <h2 className="font-fredoka text-2xl text-white mb-2">
                    {iAmAlive ? "The night is long…" : "You are a spectator"}
                </h2>
                <p className="font-nunito text-white/40 text-sm">
                    {!iAmAlive
                        ? "You've been eliminated. Watch what unfolds."
                        : phase === "mafia_night"
                            ? "The Mafia is making their move."
                            : phase === "doctor_night"
                                ? "The Doctor is choosing who to protect."
                                : "The Detective is investigating."}
                </p>
            </div>

            {/* Show your role badge as reminder */}
            <div
                className="flex items-center gap-2 px-4 py-2 rounded-2xl border"
                style={{ background: cfg.bg, borderColor: cfg.border }}
            >
                <span>{cfg.emoji}</span>
                <span className="font-nunito text-sm font-bold" style={{ color: cfg.color }}>
                    You are the {cfg.label}
                </span>
            </div>

            <AliveRoster room={room} myId={myId} alivePlayers={alivePlayers} deadPlayers={deadPlayers} />
        </div>
    );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function PlayerRoster({ alive, dead }: { alive: number; dead: number }) {
    return (
        <div className="flex items-center gap-2">
            <span className="font-nunito text-green-400/70 text-xs">✓ {alive}</span>
            <span className="font-nunito text-white/20 text-xs">|</span>
            <span className="font-nunito text-red-400/60 text-xs">✗ {dead}</span>
        </div>
    );
}

function AliveRoster({ room, myId, alivePlayers, deadPlayers }: {
    room: Room; myId: string;
    alivePlayers: { id: string; name: string }[];
    deadPlayers: { id: string; name: string }[];
}) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="glass-card rounded-2xl overflow-hidden flex-shrink-0">
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between px-3 py-2.5"
            >
                <span className="font-nunito text-white/50 text-xs uppercase tracking-widest">
                    👥 Players
                </span>
                <span className="font-nunito text-white/30 text-xs">
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
                        <div className="flex flex-wrap gap-2">
                            {alivePlayers.map(p => (
                                <span
                                    key={p.id}
                                    className="font-nunito text-xs px-2.5 py-1 rounded-full border"
                                    style={{
                                        background: p.id === myId ? "rgba(52,211,153,0.12)" : "rgba(52,211,153,0.05)",
                                        border: `1px solid rgba(52,211,153,${p.id === myId ? "0.4" : "0.15"})`,
                                        color: p.id === myId ? "#6EE7B7" : "rgba(255,255,255,0.55)",
                                    }}
                                >
                                    ✓ {p.name}
                                </span>
                            ))}
                            {deadPlayers.map(p => (
                                <span
                                    key={p.id}
                                    className="font-nunito text-xs px-2.5 py-1 rounded-full border"
                                    style={{
                                        background: "rgba(239,68,68,0.05)",
                                        border: "1px solid rgba(239,68,68,0.12)",
                                        color: "rgba(255,255,255,0.25)",
                                        textDecoration: "line-through",
                                    }}
                                >
                                    ✗ {p.name}
                                </span>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
