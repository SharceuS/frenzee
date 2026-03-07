"use client";
import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/lib/socket";
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

const variants = {
    initial: { opacity: 0, y: 40, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
    exit: { opacity: 0, y: -24, scale: 0.97, transition: { duration: 0.18 } },
};

export default function GameApp() {
    const { socket } = useSocket();
    const [myId, setMyId] = useState("");
    const [room, setRoom] = useState<Room | null>(null);
    const [myRole, setMyRole] = useState<"liar" | "truth_teller" | null>(null);
    const [myDebateRole, setMyDebateRole] = useState<{ position: string; side: "for" | "against" } | null>(null);
    const [errorMsg, setErrorMsg] = useState("");

    const phase: Phase = room?.phase ?? "home";
    const isHost = room?.host === myId;

    useEffect(() => {
        if (!socket) return;
        const onConnect = () => setMyId(socket.id ?? "");
        const onRoom = (r: Room) => setRoom(r);
        const onRole = ({ role }: { role: "liar" | "truth_teller" }) => setMyRole(role);
        const onDebate = (d: { position: string; side: "for" | "against" }) => setMyDebateRole(d);
        const onError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(""), 3000); };

        socket.on("connect", onConnect);
        socket.on("room_update", onRoom);
        socket.on("your_role", onRole);
        socket.on("your_debate_role", onDebate);
        socket.on("error_msg", onError);
        return () => {
            socket.off("connect", onConnect);
            socket.off("room_update", onRoom);
            socket.off("your_role", onRole);
            socket.off("your_debate_role", onDebate);
            socket.off("error_msg", onError);
        };
    }, [socket]);

    // ── Actions ──────────────────────────────────────
    const createRoom = useCallback((name: string, avatar: import("@/lib/types").AvatarConfig) => {
        socket?.emit("create_room", { name, avatar }, (res: { ok: boolean; room: Room }) => {
            if (res.ok) { setRoom(res.room); setMyId(socket.id ?? ""); }
        });
    }, [socket]);

    const joinRoom = useCallback((code: string, name: string, avatar: import("@/lib/types").AvatarConfig) => {
        socket?.emit("join_room", { code, name, avatar }, (res: { ok: boolean; room?: Room; error?: string }) => {
            if (res.ok && res.room) { setRoom(res.room); setMyId(socket?.id ?? ""); }
            else setErrorMsg(res.error ?? "Failed to join");
        });
    }, [socket]);

    const selectGame = useCallback((gameType: string) => {
        if (room) socket?.emit("select_game", { code: room.code, gameType });
    }, [socket, room]);

    const startGame = useCallback((maxRounds: number) => {
        if (room) socket?.emit("start_game", { code: room.code, maxRounds });
    }, [socket, room]);

    const submitAnswer = useCallback((answer: unknown) => {
        if (room) socket?.emit("submit_answer", { code: room.code, answer });
    }, [socket, room]);

    const submitVote = useCallback((targetId: string) => {
        if (room) socket?.emit("submit_vote", { code: room.code, targetId });
    }, [socket, room]);

    const submitMatchGuesses = useCallback((guesses: Record<string, string>) => {
        if (room) socket?.emit("submit_match_guesses", { code: room.code, guesses });
    }, [socket, room]);

    const nextRound = useCallback(() => {
        if (room) { setMyRole(null); setMyDebateRole(null); socket?.emit("next_round", { code: room.code }); }
    }, [socket, room]);

    const playAgain = useCallback(() => {
        if (room) { setMyRole(null); setMyDebateRole(null); socket?.emit("play_again", { code: room.code }); }
    }, [socket, room]);

    // ── Screen router ────────────────────────────────
    // Lobby key must NOT include gameType — selecting a game would remount the whole screen & reset tab state
    const screenKey = phase === "lobby"
        ? "lobby"
        : `${phase}-${room?.gameType ?? ""}-${room?.round ?? 0}`;
    const gt = room?.gameType ?? "";
    const binaryAnswerGames = ["never_have_i_ever", "would_you_rather", "hot_takes", "red_flag_radar", "this_or_that", "pick_your_poison", "burn_or_build", "speed_round", "rate_that_take"];

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
