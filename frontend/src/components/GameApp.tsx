"use client";
import { useEffect, useState, useCallback } from "react";
import { useSse } from "@/lib/sse";
import {
  apiCreateRoom, apiJoinRoom, apiSelectGame, apiStartGame,
  apiSubmitAnswer, apiSubmitVote, apiSubmitMatchGuesses,
  apiNextRound, apiPlayAgain,
} from "@/lib/api";
import { Room, Phase } from "@/lib/types";
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
import BombermanScreen from "./screens/BombermanScreen";
import BingoScreen from "./screens/BingoScreen";

const variants = {
    initial: { opacity: 0, y: 40, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
    exit: { opacity: 0, y: -24, scale: 0.97, transition: { duration: 0.18 } },
};

export default function GameApp() {
    const { on, off, connect, disconnect } = useSse();
    const [myId, setMyId] = useState("");
    const [room, setRoom] = useState<Room | null>(null);
    const [myRole, setMyRole] = useState<"liar" | "truth_teller" | null>(null);
    const [myDebateRole, setMyDebateRole] = useState<{ position: string; side: "for" | "against" } | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    const phase: Phase = room?.phase ?? "home";
    const isHost = room?.host === myId;

    // ── SSE event subscriptions ───────────────────────────────────────────────
    useEffect(() => {
        const onRoom = (r: Room) => setRoom(r);
        const onRole = ({ role }: { role: "liar" | "truth_teller" }) => setMyRole(role);
        const onDebate = (d: { position: string; side: "for" | "against" }) => setMyDebateRole(d);
        const onError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(""), 3000); };

        on("room_update", onRoom);
        on("your_role", onRole);
        on("your_debate_role", onDebate);
        on("error_msg", onError);
        return () => {
            off("room_update", onRoom);
            off("your_role", onRole);
            off("your_debate_role", onDebate);
            off("error_msg", onError);
        };
    }, [on, off]);

    // ── Actions ───────────────────────────────────────────────────────────────
    const createRoom = useCallback(async (name: string, avatar: import("@/lib/types").AvatarConfig) => {
        // Optimistic: immediately show lobby with a placeholder room so the UI responds instantly
        const tempId = crypto.randomUUID();
        setMyId(tempId);
        setRoom({
            code: "····", host: tempId,
            players: [{ id: tempId, name, avatar, score: 0, isHost: true }],
            phase: "lobby", gameType: null, round: 0, maxRounds: 5,
            currentQuestion: null, questionData: null, spotlightId: null, debaterIds: [],
            liarId: null, answers: null, votes: null, matchGuesses: {}, answerCount: 0, voteCount: 0,
            roundResult: null, triviaStartTime: null, drawItDrawerId: null, drawItGuessedIds: [],
            wordBombActiveId: null, wordBombPattern: null, wordBombLives: {}, wordBombMinFuse: 8,
            wordBombUsedWords: [], reactionFired: false, reactionTimes: {},
            bomberGrid: null, bomberBombs: [], bomberExplosions: [], bomberPowerups: [], bomberGameOver: false,
            bingoCards: null, bingoCalledItems: [], bingoWinners: [],
        } as Room);

        const res = await apiCreateRoom(name, avatar);
        if (res.ok) {
            setMyId(res.playerId);
            setRoom(res.room);
            localStorage.setItem("frenzee_session", JSON.stringify({ code: res.code, playerId: res.playerId }));
            connect(res.code, res.playerId);
        } else {
            // Optimistic rollback
            setRoom(null);
            setMyId("");
            setErrorMsg(res.error ?? "Failed to create room");
            setTimeout(() => setErrorMsg(""), 3000);
        }
    }, [connect]);

    const joinRoom = useCallback(async (code: string, name: string, avatar: import("@/lib/types").AvatarConfig) => {
        const res = await apiJoinRoom(code, name, avatar);
        if (res.ok && res.room && res.playerId) {
            setMyId(res.playerId);
            setRoom(res.room);
            localStorage.setItem("frenzee_session", JSON.stringify({ code: res.room.code, playerId: res.playerId }));
            connect(res.room.code, res.playerId);
        } else {
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
        if (room) { setMyRole(null); setMyDebateRole(null); apiNextRound(room.code, myId); }
    }, [room, myId]);

    const playAgain = useCallback(() => {
        if (room) { setMyRole(null); setMyDebateRole(null); apiPlayAgain(room.code, myId); }
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
            </AnimatePresence>

            <AnimatePresence mode="wait">
                <motion.div key={screenKey} variants={variants} initial="initial" animate="animate" exit="exit">

                    {phase === "home" && (
                        <HomeScreen onCreate={createRoom} onJoin={joinRoom} />
                    )}


                    {phase === "lobby" && room && (
                        <LobbyScreen room={room} myId={myId} isHost={isHost}
                            onSelectGame={selectGame} onStart={startGame} />
                    )}

                    {phase === "question" && room && (
                        <QuestionScreen room={room} myRole={myRole} myDebateRole={myDebateRole} />
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

                    {phase === "bomberman" && room && (
                        <BombermanScreen room={room} myId={myId} />
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
