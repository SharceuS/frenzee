"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSse } from "@/lib/sse";
import {
  apiCreateRoom, apiJoinRoom, apiSelectGame, apiStartGame,
  apiSubmitAnswer, apiSubmitVote, apiSubmitMatchGuesses,
  apiNextRound, apiPlayAgain,
  apiSpyfallDiscuss, apiSpyfallAccuse, apiSpyfallGuess,
} from "@/lib/api";
import { Room, Phase, SpyfallRole } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";

import HomeScreen from "./screens/HomeScreen";
import LobbyScreen from "./screens/LobbyScreen";
import QuestionScreen from "./screens/QuestionScreen";
import AnsweringScreen from "./screens/AnsweringScreen";
import BinaryChoiceScreen from "./screens/BinaryChoiceScreen";
import TwoTruthsScreen from "./screens/TwoTruthsScreen";
import MostLikelyToScreen from "./screens/MostLikelyToScreen";
import VotingScreen from "./screens/VotingScreen";
import VibeCheckMatchingScreen from "./screens/VibeCheckMatchingScreen";
import DebatePitScreen from "./screens/DebatePitScreen";
import ResultsScreen from "./screens/ResultsScreen";
import ScoreboardScreen from "./screens/ScoreboardScreen";
import TriviaBlitzScreen from "./screens/TriviaBlitzScreen";
import DrawItScreen from "./screens/DrawItScreen";
import WordBombScreen from "./screens/WordBombScreen";
import ReactionTapScreen from "./screens/ReactionTapScreen";
import BingoScreen from "./screens/BingoScreen";
import SpyfallScreen from "./screens/SpyfallScreen";

const variants = {
    initial: { opacity: 0, y: 40, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
    exit: { opacity: 0, y: -24, scale: 0.97, transition: { duration: 0.18 } },
};

const GAME_MIN_PLAYERS: Record<string, number> = {
    guess_the_liar: 3, two_truths: 3, most_likely_to: 3, never_have_i_ever: 2,
    would_you_rather: 2, hot_takes: 2, pick_your_poison: 2, roast_room: 3,
    red_flag_radar: 2, vibe_check: 3, debate_pit: 4, trivia_blitz: 2,
    draw_it: 2, word_bomb: 2, reaction_tap: 2, bingo: 2,
    spyfall: 4,
    finish_the_sentence: 3, confessions: 3, whose_line: 3, emoji_story: 3, unhinged_advice: 3,
    burn_or_build: 4, speed_round: 2, superlatives: 3, word_association: 2,
};

const ACTIVE_GAME_PHASES = new Set<string>([
    "question", "answering", "voting", "matching", "debate_write", "debate_vote",
    "trivia", "drawing", "word_bomb", "reaction", "bingo_live",
    "spyfall_discussion", "spyfall_guess",
]);

export default function GameApp() {
    const { on, off, connect, disconnect, connected } = useSse();
    const [myId, setMyId] = useState("");
    const [room, setRoom] = useState<Room | null>(null);
    const [myRole, setMyRole] = useState<"liar" | "truth_teller" | null>(null);
    const [myDebateRole, setMyDebateRole] = useState<{ position: string; side: "for" | "against" } | null>(null);
    const [mySpyfallRole, setMySpyfallRole] = useState<SpyfallRole | null>(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [playerLeftMsg, setPlayerLeftMsg] = useState("");
    const [isConnectingRoom, setIsConnectingRoom] = useState(false);
    const prevPlayersRef = useRef<Map<string, string>>(new Map());

    const phase: Phase = room?.phase ?? "home";
    const isHost = room?.host === myId;

    // ── SSE event subscriptions ───────────────────────────────────────────────
    useEffect(() => {
        const onRoom = (r: Room) => setRoom(r);
        const onPlayerLeft = ({ id, name }: { id: string; name: string }) => {
            if (id === myId) return;
            setPlayerLeftMsg(`${name} left the game`);
            setTimeout(() => setPlayerLeftMsg(""), 3000);
        };
        const onRole = ({ role }: { role: "liar" | "truth_teller" }) => setMyRole(role);
        const onDebate = (d: { position: string; side: "for" | "against" }) => setMyDebateRole(d);
        const onSpyfallRole = (d: SpyfallRole) => setMySpyfallRole(d);
        const onError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(""), 3000); };

        on("room_update", onRoom);
        on("player_left", onPlayerLeft);
        on("your_role", onRole);
        on("your_debate_role", onDebate);
        on("your_spyfall_role", onSpyfallRole);
        on("error_msg", onError);
        return () => {
            off("room_update", onRoom);
            off("player_left", onPlayerLeft);
            off("your_role", onRole);
            off("your_debate_role", onDebate);
            off("your_spyfall_role", onSpyfallRole);
            off("error_msg", onError);
        };
    }, [on, off, myId]);

    // ── Track current roster for future room transitions only ─────────────────
    useEffect(() => {
        if (!room) { prevPlayersRef.current = new Map(); return; }
        prevPlayersRef.current = new Map(room.players.map(p => [p.id, p.name]));
    }, [room?.players]);

    useEffect(() => {
        if (connected) setIsConnectingRoom(false);
    }, [connected]);

    // ── Game cancel when not enough players (FE-CS-03) ────────────────────────
    useEffect(() => {
        if (!room || !room.gameType) return;
        const minP = GAME_MIN_PLAYERS[room.gameType] ?? 2;
        if (ACTIVE_GAME_PHASES.has(phase) && room.players.length < minP) {
            setErrorMsg("Not enough players! Returning to home…");
            const t = setTimeout(() => {
                disconnect();
                setRoom(null);
                setMyId("");
                setMyRole(null);
                setMyDebateRole(null);
                setMySpyfallRole(null);
                setErrorMsg("");
            }, 2800);
            return () => clearTimeout(t);
        }
    }, [room?.players.length, phase, disconnect]);

    // ── Disbanded room handler (FE-CS-01 / host-left / server-kicked) ─────────
    useEffect(() => {
        if (phase !== "disbanded") return;
        const reason = room?.disbandReason;
        const msg = reason === "host_left"
            ? "The host left. Returning to home…"
            : reason === "not_enough_players"
                ? "Not enough players. Returning to home…"
                : "Room closed. Returning to home…";
        setErrorMsg(msg);
        const t = setTimeout(() => {
            disconnect();
            setRoom(null);
            setMyId("");
            setMyRole(null);
            setMyDebateRole(null);
            setMySpyfallRole(null);
            setErrorMsg("");
        }, 2800);
        return () => clearTimeout(t);
    }, [phase, room?.disbandReason, disconnect]);

    // ── Actions ───────────────────────────────────────────────────────────────
    const createRoom = useCallback(async (name: string, avatar: import("@/lib/types").AvatarConfig) => {
        // Optimistic: immediately show lobby with a placeholder room so the UI responds instantly
        const tempId = crypto.randomUUID();
        setIsConnectingRoom(true);
        prevPlayersRef.current = new Map();
        setMyId(tempId);
        setRoom({
            code: "····", host: tempId,
            players: [{ id: tempId, name, avatar, score: 0, isHost: true }],
            phase: "lobby", gameType: null, round: 0, maxRounds: 5,
            currentQuestion: null, questionData: null, spotlightId: null, debaterIds: [],
            liarId: null, answers: null, votes: null, matchGuesses: {}, answerCount: 0, voteCount: 0,
            roundResult: null, disbandReason: null,
            triviaStartTime: null, drawItDrawerId: null, drawItGuessedIds: [],
            wordBombActiveId: null, wordBombPattern: null, wordBombLives: {}, wordBombMinFuse: 8,
            wordBombUsedWords: [], reactionFired: false, reactionTimes: {},
            bomberGrid: null, bomberBombs: [], bomberExplosions: [], bomberPowerups: [], bomberGameOver: false,
            bingoCards: null, bingoCalledItems: [], bingoWinners: [],
            spyfallTurns: null, spyfallTurnIndex: null, spyfallAskerId: null, spyfallTargetId: null,
            spyfallAccusedId: null, spyfallSpyId: null, spyfallLocation: null, spyfallGuess: null, spyfallLocationNames: null,
        } as Room);

        const res = await apiCreateRoom(name, avatar);
        if (res.ok) {
            setMyId(res.playerId);
            setRoom(res.room);
            prevPlayersRef.current = new Map(res.room.players.map(p => [p.id, p.name]));
            localStorage.setItem("frenzee_session", JSON.stringify({ code: res.code, playerId: res.playerId }));
            connect(res.code, res.playerId);
        } else {
            // Optimistic rollback
            setIsConnectingRoom(false);
            setRoom(null);
            setMyId("");
            setErrorMsg(res.error ?? "Failed to create room");
            setTimeout(() => setErrorMsg(""), 3000);
        }
    }, [connect]);

    const joinRoom = useCallback(async (code: string, name: string, avatar: import("@/lib/types").AvatarConfig) => {
        setIsConnectingRoom(true);
        prevPlayersRef.current = new Map();
        const res = await apiJoinRoom(code, name, avatar);
        if (res.ok && res.room && res.playerId) {
            setMyId(res.playerId);
            setRoom(res.room);
            prevPlayersRef.current = new Map(res.room.players.map(p => [p.id, p.name]));
            localStorage.setItem("frenzee_session", JSON.stringify({ code: res.room.code, playerId: res.playerId }));
            connect(res.room.code, res.playerId);
        } else {
            setIsConnectingRoom(false);
            setErrorMsg(res.error ?? "Failed to join");
            setTimeout(() => setErrorMsg(""), 3000);
        }
    }, [connect]);

    const selectGame = useCallback((gameType: string) => {
        if (room) apiSelectGame(room.code, myId, gameType);
    }, [room, myId]);

    const startGame = useCallback((maxRounds: number) => {
        if (room) apiStartGame(room.code, myId, maxRounds);
    }, [room, myId]);

    const submitAnswer = useCallback((answer: unknown) => {
        if (room) apiSubmitAnswer(room.code, myId, answer);
    }, [room, myId]);

    const submitVote = useCallback((targetId: string) => {
        if (room) apiSubmitVote(room.code, myId, targetId);
    }, [room, myId]);

    const submitMatchGuesses = useCallback((guesses: Record<string, string>) => {
        if (room) apiSubmitMatchGuesses(room.code, myId, guesses);
    }, [room, myId]);

    const nextRound = useCallback(() => {
        if (room) { setMyRole(null); setMyDebateRole(null); setMySpyfallRole(null); apiNextRound(room.code, myId); }
    }, [room, myId]);

    const playAgain = useCallback(() => {
        if (room) { setMyRole(null); setMyDebateRole(null); setMySpyfallRole(null); apiPlayAgain(room.code, myId); }
    }, [room, myId]);

    // ── Screen router ────────────────────────────────
    // Lobby key must NOT include gameType — selecting a game would remount the whole screen & reset tab state
    const screenKey = phase === "lobby"
        ? "lobby"
        : `${phase}-${room?.gameType ?? ""}-${room?.round ?? 0}`;
    const gt = room?.gameType ?? "";
    const binaryAnswerGames = ["never_have_i_ever", "would_you_rather", "hot_takes", "pick_your_poison"];

    return (
        <div className="relative" style={{ isolation: "isolate" }}>
            <AnimatePresence>
                {errorMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 16 }} exit={{ opacity: 0, y: -60 }}
                        className="fixed top-0 left-1/2 -translate-x-1/2 z-50 
                          bg-red-500 text-white font-fredoka text-lg px-6 py-3 rounded-2xl shadow-2xl pointer-events-none"
                    >⚠️ {errorMsg}</motion.div>
                )}
                {playerLeftMsg && !errorMsg && (
                    <motion.div
                        key="player-left"
                        initial={{ opacity: 0, y: -60 }} animate={{ opacity: 1, y: 16 }} exit={{ opacity: 0, y: -60 }}
                        className="fixed top-0 left-1/2 -translate-x-1/2 z-50 
                          bg-gray-700 text-white font-fredoka text-base px-6 py-3 rounded-2xl shadow-xl pointer-events-none"
                    >👋 {playerLeftMsg}</motion.div>
                )}
            </AnimatePresence>

            {/* Disconnected overlay (FE-CS-01) */}
            {!connected && !isConnectingRoom && phase !== "home" && phase !== "disbanded" && room?.code !== "····" && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4"
                    style={{ background: "rgba(8,4,20,0.92)", backdropFilter: "blur(12px)" }}>
                    <div className="text-5xl">📡</div>
                    <h2 className="font-fredoka text-white text-3xl">Connection Lost</h2>
                    <p className="font-nunito text-white/50 text-sm text-center px-8">
                        Trying to reconnect…
                    </p>
                </div>
            )}


            <AnimatePresence mode="wait">
                <motion.div key={screenKey} variants={variants} initial="initial" animate="animate" exit="exit">

                    {phase === "home" && (
                        <HomeScreen onCreate={createRoom} onJoin={joinRoom} />
                    )}


                    {phase === "lobby" && room && (
                        <LobbyScreen room={room} myId={myId} isHost={isHost}
                            onSelectGame={selectGame} onStart={startGame} />
                    )}

                    {phase === "question" && room && gt !== "spyfall" && (
                        <QuestionScreen room={room} myRole={myRole} myDebateRole={myDebateRole} />
                    )}

                    {/* Spyfall: role reveal (question phase), discussion, and spy guess */}
                    {(phase === "question" && gt === "spyfall" ||
                      phase === "spyfall_discussion" ||
                      phase === "spyfall_guess") && room && (
                        <SpyfallScreen
                            room={room}
                            myId={myId}
                            mySpyfallRole={mySpyfallRole}
                            isHost={isHost}
                            onDiscuss={() => apiSpyfallDiscuss(room.code, myId)}
                            onAccuse={() => apiSpyfallAccuse(room.code, myId)}
                            onGuess={(loc) => apiSpyfallGuess(room.code, myId, loc)}
                        />
                    )}

                    {phase === "answering" && room && binaryAnswerGames.includes(gt) && (
                        <BinaryChoiceScreen room={room} myId={myId} onSubmit={submitAnswer} />
                    )}
                    {phase === "answering" && room && !binaryAnswerGames.includes(gt) && (
                        <AnsweringScreen room={room} myId={myId} myRole={myRole} onSubmit={submitAnswer} />
                    )}

                    {phase === "spotlight_write" && room && (
                        <TwoTruthsScreen room={room} myId={myId} onSubmit={submitAnswer} />
                    )}

                    {phase === "voting" && room && gt === "most_likely_to" && (
                        <MostLikelyToScreen room={room} myId={myId} onVote={submitVote} />
                    )}
                    {phase === "voting" && room && gt !== "most_likely_to" && (
                        <VotingScreen room={room} myId={myId} onVote={submitVote} />
                    )}

                    {phase === "matching" && room && (
                        <VibeCheckMatchingScreen room={room} myId={myId} onSubmit={submitMatchGuesses} />
                    )}

                    {phase === "debate_write" && room && (
                        <DebatePitScreen room={room} myId={myId} myDebateRole={myDebateRole} onSubmit={submitAnswer} />
                    )}

                    {/* Arcade games */}
                    {phase === "trivia" && room && (
                        <TriviaBlitzScreen room={room} myId={myId} onSubmit={submitAnswer} />
                    )}

                    {phase === "drawing" && room && (
                        <DrawItScreen room={room} myId={myId} />
                    )}

                    {phase === "word_bomb" && room && (
                        <WordBombScreen room={room} myId={myId} />
                    )}

                    {phase === "reaction" && room && (
                        <ReactionTapScreen room={room} myId={myId} />
                    )}

                    {phase === "bingo_live" && room && (
                        <BingoScreen room={room} myId={myId} />
                    )}

                    {phase === "results" && room && (
                        <ResultsScreen room={room} myId={myId} isHost={isHost} onNext={nextRound} />
                    )}

                    {phase === "scoreboard" && room && (
                        <ScoreboardScreen room={room} myId={myId} isHost={isHost} onPlayAgain={playAgain} />
                    )}

                </motion.div>
            </AnimatePresence>
        </div>
    );
}
