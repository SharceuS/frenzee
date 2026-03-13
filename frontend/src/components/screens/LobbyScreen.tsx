"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Room } from "@/lib/types";
import GameInfoModal from "@/components/GameInfoModal";
import SvgAvatar, { defaultAvatarFromId } from "@/components/SvgAvatar";
import { sfxTap, sfxSelect } from "@/lib/sounds";

interface Props {
    room: Room;
    myId: string;
    isHost: boolean;
    onSelectGame: (gameType: string) => void;
    onStart: (maxRounds: number) => void;
}

const CAT_PILLS: Record<string, { label: string; color: string }> = {
    social:   { label: "Social",   color: "#7C3AED" },
    opinion:  { label: "Opinion",  color: "#EF4444" },
    creative: { label: "Creative", color: "#F97316" },
    wordplay: { label: "Wordplay", color: "#10B981" },
    arcade:   { label: "Arcade",   color: "#3B82F6" },
};

const ALL_GAMES = [
    // ─── Social & Bluffing ───
    {
        id: "guess_the_liar", emoji: "🕵️", title: "Find the Liar", desc: "Catch the liar!",
        color: "#7C3AED", cat: "social",
        rules: [
            "Everyone gets a question. One player secretly becomes the Liar.",
            "The Liar must answer without knowing the question — they make it up!",
            "Everyone reads their answers aloud, then votes for who they think is the liar.",
            "Truth-tellers earn points for correctly identifying the liar.",
        ],
        scoring: "Catch the liar → +100 pts. If no one catches the liar → liar gets +200 pts.",
        minPlayers: 3, maxPlayers: 12, duration: "2–4 min",
    },
    {
        id: "two_truths", emoji: "✌️", title: "Two Truths & a Lie", desc: "Spot the lie",
        color: "#EC4899", cat: "social",
        rules: [
            "One player (spotlight) writes 2 truths and 1 lie about themselves.",
            "Mark which statement is the lie — others won't know.",
            "Everyone else reads all 3 and votes on which one is the lie.",
            "Can you fool your friends?",
        ],
        scoring: "Correct guess → +100 pts. If nobody guesses correctly → spotlight gets +200 pts.",
        minPlayers: 3, maxPlayers: 10, duration: "3–5 min",
    },
    {
        id: "most_likely_to", emoji: "🏆", title: "Most Likely To", desc: "Vote the group",
        color: "#F59E0B", cat: "social",
        rules: [
            "A wild scenario is shown to the whole group.",
            "Everyone votes for who in the group is most likely to do it.",
            "Player(s) with the most votes win the round!",
            "Find out what your friends really think of you.",
        ],
        scoring: "Getting the most votes → +50 pts each round.",
        minPlayers: 3, maxPlayers: 12, duration: "1–2 min",
    },
    {
        id: "never_have_i_ever", emoji: "🙅", title: "Never Have I Ever", desc: "Have or never?",
        color: "#10B981", cat: "opinion",
        rules: [
            "A statement appears — Never have I ever…",
            "Tap HAVE if you've done it, NEVER if you haven't.",
            "Results are revealed — see who's been up to what!",
            "No judgment zone. Be honest.",
        ],
        scoring: "+30 pts if you've DONE IT. See who's the wildest in the group.",
        minPlayers: 2, maxPlayers: 12, duration: "1 min",
    },
    {
        id: "would_you_rather", emoji: "🤔", title: "Would You Rather?", desc: "A or B?",
        color: "#3B82F6", cat: "opinion",
        rules: [
            "Two options appear — both equally terrible (or great).",
            "Tap A or B. No overthinking!",
            "See how the group splits on every dilemma.",
            "Minority opinion earns bonus points.",
        ],
        scoring: "Pick the minority option → +50 pts. Shared opinions reveal group dynamics!",
        minPlayers: 2, maxPlayers: 12, duration: "1 min",
    },
    {
        id: "hot_takes", emoji: "🔥", title: "Hot Takes", desc: "Minority wins",
        color: "#EF4444", cat: "opinion",
        rules: [
            "A spicy opinion is shown. Agree or disagree — simple.",
            "The group sees how everyone voted after.",
            "If you're in the MINORITY — you earn bonus points!",
            "Be contrarian? Or be honest? Your choice.",
        ],
        scoring: "Minority vote (hot take) → +75 pts. Tie → everyone gets +30 pts.",
        minPlayers: 2, maxPlayers: 12, duration: "1 min",
    },
    {
        id: "roast_room", emoji: "🎭", title: "Roast Battle", desc: "Funniest answer wins",
        color: "#F97316", cat: "creative",
        rules: [
            "A prompt appears — write the funniest answer you can.",
            "All answers shown anonymously — vote for the best one.",
            "No names attached until voting ends.",
            "Charisma and comedic timing win here.",
        ],
        scoring: "Most votes for your answer → +150 pts.",
        minPlayers: 3, maxPlayers: 10, duration: "3–5 min",
    },
    {
        id: "finish_the_sentence", emoji: "✏️", title: "Finish the Sentence", desc: "Get creative",
        color: "#8B5CF6", cat: "creative",
        rules: [
            "A sentence starter appears — you finish it.",
            "Be funny, creative, or brutally honest.",
            "Everyone reads all responses, then votes for their favourite.",
            "The wittiest ending wins.",
        ],
        scoring: "Most votes for your ending → +150 pts.",
        minPlayers: 2, maxPlayers: 12, duration: "3–4 min",
    },
    // ─── Creative (continued) ───
    {
        id: "vibe_check", emoji: "✨", title: "Vibe Check", desc: "Match the vibes",
        color: "#8B5CF6", cat: "creative",
        rules: [
            "Everyone describes themselves using a theme (e.g. 'as a pizza topping').",
            "Answers are shown anonymously.",
            "Drag each answer to match it to the right player.",
            "Score points for every correct match!",
        ],
        scoring: "+100 pts per correct match. Extra bonus if nobody matches you correctly.",
        minPlayers: 3, maxPlayers: 8, duration: "3–5 min",
    },
    {
        id: "debate_pit", emoji: "⚔️", title: "Debate Battle", desc: "Crowd votes winner",
        color: "#06B6D4", cat: "creative",
        rules: [
            "Two players are randomly chosen as debaters.",
            "Each gets a side of an absurd topic to argue.",
            "They write their argument — best one wins the audience!",
            "The rest of the group votes for the most convincing debater.",
        ],
        scoring: "Winning debater → +150 pts. Non-debaters don't vote against their side.",
        minPlayers: 3, maxPlayers: 12, duration: "3–5 min",
    },
    {
        id: "word_association", emoji: "🔗", title: "Word Association", desc: "Match the group",
        color: "#10B981", cat: "wordplay",
        rules: [
            "A single word appears. Type the FIRST word that comes to mind.",
            "No second-guessing — what did your brain jump to?",
            "Answers are revealed. Same answer as others = points!",
            "The more you think like the group, the more you score.",
        ],
        scoring: "Matching the most popular answer → +100 pts.",
        minPlayers: 2, maxPlayers: 12, duration: "1–2 min",
    },
    {
        id: "confessions", emoji: "🤫", title: "Anonymous Confessions", desc: "Guess who confessed",
        color: "#7C3AED", cat: "social",
        rules: [
            "Everyone writes an anonymous confession based on the prompt.",
            "Confessions revealed — vote for who you think wrote each.",
            "The better you hide your writing style, the more points you get.",
            "Honesty optional. Chaos encouraged.",
        ],
        scoring: "Correctly identifying who confessed → +100 pts each. Stumping everyone → +150 pts.",
        minPlayers: 3, maxPlayers: 10, duration: "3–5 min",
    },
    {
        id: "pick_your_poison", emoji: "☠️", title: "Pick Your Poison", desc: "No good options",
        color: "#DC2626", cat: "opinion",
        rules: [
            "Two TERRIBLE options. Pick the one you'd choose.",
            "There is no good answer here. Just survival.",
            "See how your suffering compares to the group.",
            "Minority opinion earns bonus points.",
        ],
        scoring: "Being in the minority → +50 pts. Solidarity with the group earns bragging rights.",
        minPlayers: 2, maxPlayers: 12, duration: "1 min",
    },
    // ─── Matching & Wordplay (continued) ───
    {
        id: "word_bomb", emoji: "💣", title: "Word Bomb", desc: "Type before boom!",
        color: "#EF4444", cat: "wordplay",
        rules: [
            "A letter pattern appears — e.g. 'ANG'.",
            "Hot-seat: one player must type a valid word containing that pattern.",
            "You have a ticking fuse to answer — fail and the bomb explodes!",
            "Fuse gets shorter each successful pass.",
            "Lose 2 lives and you're out. Last one standing wins.",
        ],
        scoring: "+50 pts per successful word. +300 pts for the survivor. +50 pts per life remaining.",
        minPlayers: 3, maxPlayers: 10, duration: "3–6 min",
    },
    // ─── Arcade ───
    {
        id: "trivia_blitz", emoji: "🧠", title: "Trivia Battle", desc: "Speed trivia!",
        color: "#8B5CF6", cat: "arcade",
        rules: [
            "A question appears with 4 coloured options (A/B/C/D).",
            "A 20-second countdown starts — answer before it hits zero!",
            "Faster correct answers earn more points (up to 1000).",
            "Wrong answers or no answer = 0 points for that round.",
        ],
        scoring: "Speed bonus: 400–1000 pts per correct answer. Instant answers = max score!",
        minPlayers: 2, maxPlayers: 12, duration: "~30 sec/round",
    },
    {
        id: "draw_it", emoji: "🎨", title: "Draw & Guess", desc: "Draw it, others guess!",
        color: "#F59E0B", cat: "arcade",
        rules: [
            "One player draws a secret word on the canvas.",
            "Others type in guesses in real-time as they figure it out.",
            "First to guess correctly gets the most points.",
            "The drawer earns points for every correct guess.",
            "Next round, a different player draws.",
        ],
        scoring: "Guesser: 500–100 pts (by order). Drawer: +50 pts per correct guess.",
        minPlayers: 3, maxPlayers: 8, duration: "~75 sec/round",
    },
    {
        id: "reaction_tap", emoji: "⚡", title: "Reaction Tap", desc: "Fastest wins!",
        color: "#10B981", cat: "arcade",
        rules: [
            "Everyone stares at the screen. Don't touch it yet.",
            "After a random delay, the screen flashes GREEN.",
            "TAP as fast as humanly possible the instant you see it!",
            "Tapping before the flash = shame and no points.",
            "Ranked by reaction time — fastest gets 1000 pts.",
        ],
        scoring: "1st: 1000 pts · 2nd: 800 pts · 3rd: 600 pts · Others: 300 pts.",
        minPlayers: 2, maxPlayers: 12, duration: "~15 sec/round",
    },
    // ─── Coming Soon ───
    {
        id: "mafia", emoji: "🎭", title: "Mafia", desc: "Find the traitors",
        color: "#1D4ED8", cat: "social",
        rules: [
            "The village is split — most are innocent townspeople, some are hidden mafia.",
            "Each night, the mafia secretly eliminates a villager.",
            "Each day, the town debates and votes to eliminate a suspect.",
            "Mafia wins if they equal the town. Town wins if all mafia are found.",
        ],
        scoring: "Mafia wins → +300 pts each. Town eliminates all mafia → +200 pts each.",
        minPlayers: 5, maxPlayers: 16, duration: "10–20 min",
    },
    {
        id: "spyfall", emoji: "🕶️", title: "Spyfall", desc: "Who's the spy?",
        color: "#059669", cat: "social",
        rules: [
            "Everyone gets a secret location card — except one player who gets SPY.",
            "Players ask each other questions to figure out who doesn't know the location.",
            "The spy tries to blend in without revealing they don't know where they are.",
            "Vote to expose the spy, or let the spy guess the location to win!",
        ],
        scoring: "Spy guesses location → +400 pts. Group exposes spy → +200 pts each.",
        minPlayers: 4, maxPlayers: 12, duration: "5–10 min",
    },
    {
        id: "codenames", emoji: "🔑", title: "Codenames", desc: "One clue, many words",
        color: "#D97706", cat: "wordplay", soon: true,
        rules: [
            "Split into two teams. Each has a Spymaster who sees which words belong to which team.",
            "Spymasters give one-word clues to help their team pick the right code words.",
            "Avoid the words belonging to the other team — and never hit the Assassin!",
            "First team to uncover all their words wins.",
        ],
        scoring: "Winning team → +300 pts each. Bonus for extra correct guesses.",
        minPlayers: 4, maxPlayers: 8, duration: "10–15 min",
    },
    {
        id: "liars_dice", emoji: "🎲", title: "Liar's Dice", desc: "Bluff your roll",
        color: "#B91C1C", cat: "social", soon: true,
        rules: [
            "Each player secretly rolls their dice under a cup.",
            "Players take turns bidding on how many of a certain face value exist across ALL dice.",
            "Call LIAR on any bid you think is impossible.",
            "If you're wrong, you lose a die. If you're right, the bidder loses one. Last dice standing wins!",
        ],
        scoring: "Winning the round → +250 pts. Catching a liar → +100 pts.",
        minPlayers: 2, maxPlayers: 8, duration: "5–15 min",
    },
    {
        id: "bingo", emoji: "\uD83C\uDFB1", title: "Bingo", desc: "Dab before they do!",
        color: "#6366F1", cat: "arcade",
        rules: [
            "Everyone gets a unique 5\u00d75 party bingo card.",
            "The server calls one item every 8 seconds.",
            "Mark cells as items are called (or tap to mark manually).",
            "First to complete a row, column, or diagonal \u2014 tap BINGO!",
            "The server validates your claim \u2014 no cheating!",
        ],
        scoring: "First valid BINGO \u2192 +250 pts. Tied winner (within 1 s) \u2192 +150 pts.",
        minPlayers: 2, maxPlayers: 12, duration: "5\u201310 min",
    },
];

function playerRange(min: number, max: number) {
    return max >= 10 ? `${min}+` : `${min}–${max}`;
}

export default function LobbyScreen({ room, myId, isHost, onSelectGame, onStart }: Props) {
    const [rounds, setRounds] = useState(5);
    const [infoGame, setInfoGame] = useState<typeof ALL_GAMES[0] | null>(null);
    const [optimisticGame, setOptimisticGame] = useState<string | null>(null);
    const [lobbyError, setLobbyError] = useState("");
    const lobbyErrTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (room.gameType) setOptimisticGame(null);
    }, [room.gameType]);

    useEffect(() => () => { if (lobbyErrTimer.current) clearTimeout(lobbyErrTimer.current); }, []);

    const selected = optimisticGame ?? room.gameType;
    const selectedGame = ALL_GAMES.find(g => g.id === selected);
    const minNeeded = selectedGame?.minPlayers ?? 2;
    // Button is clickable whenever a game is picked; under-player check happens in onClick
    const canStart = !!selected;
    const activeGames = ALL_GAMES.filter(g => !(g as { soon?: boolean }).soon);
    const soonGames = ALL_GAMES.filter(g => !!(g as { soon?: boolean }).soon);

    return (
        <>
            <div className="page-fill" style={{ gap: 0 }}>
                {/* ─── Top bar ─── */}
                <div className="flex items-center justify-between py-3 px-1 flex-shrink-0">
                    <div>
                        <div className="font-fredoka text-xl text-white leading-none">Game Lobby</div>
                        <div className="font-nunito text-white/40 text-xs mt-0.5">
                            {room.players.length} / 12 players
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-nunito text-white/35 text-xs uppercase tracking-widest">Room</div>
                        <div className="font-fredoka text-2xl text-white tracking-wider leading-none"
                            style={{ textShadow: "0 0 20px rgba(168,85,247,0.8)" }}>
                            {room.code}
                        </div>
                    </div>
                </div>

                {/* ─── Players row ─── */}
                <div className="flex gap-2 overflow-x-auto pb-2 flex-shrink-0" style={{ scrollbarWidth: "none", padding: "5px" }}>
                    <AnimatePresence mode="popLayout">
                        {room.players.map((p, i) => (
                            <motion.div key={p.id}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ delay: i * 0.04, type: "spring", stiffness: 300 }}
                                className="flex flex-col items-center gap-1.5 flex-shrink-0">
                                {/* Outer div handles the ring (animated for host); inner div handles overflow clipping */}
                                <motion.div
                                    className={`rounded-2xl flex-shrink-0 ${p.isHost ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#0C0818]" : ""}`}
                                    animate={p.isHost ? { boxShadow: ["0 0 0px rgba(234,179,8,0.2)", "0 0 10px rgba(234,179,8,0.9)", "0 0 0px rgba(234,179,8,0.2)"] } : {}}
                                    transition={p.isHost ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" } : {}}
                                >
                                    <div className="w-12 h-12 rounded-2xl overflow-hidden">
                                        <SvgAvatar
                                            config={p.avatar ?? defaultAvatarFromId(p.id)}
                                            size={48}
                                        />
                                    </div>
                                </motion.div>
                                <span className="font-nunito text-xs text-white/55 leading-none max-w-[48px] truncate text-center">
                                    {p.id === myId ? "you" : p.name.split(" ")[0]}
                                </span>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* ─── Section header ─── */}
                <div className="flex items-center justify-between mt-2 mb-3 flex-shrink-0">
                    <span className="font-fredoka text-white text-base">
                        {isHost ? "Pick a Game" : "Game Selection"}
                    </span>
                    <span className="font-nunito text-white/30 text-xs">{activeGames.length} games</span>
                </div>

                {/* ─── Game grid — all games, flat scrollable ─── */}
                <div className="flex-1 scroll-y pb-2 min-h-0 -mx-1">
                    <div className="px-1 pt-1">

                        {/* Active games */}
                        <div className="grid grid-cols-2 gap-2.5">
                            {activeGames.map(g => {
                                const isSelected = selected === g.id;
                                const pill = CAT_PILLS[g.cat];
                                return (
                                    <div key={g.id}
                                        className="relative flex flex-col rounded-2xl overflow-hidden"
                                        style={{
                                            background: isSelected ? g.color + "1e" : "rgba(255,255,255,0.06)",
                                            border: `1.5px solid ${isSelected ? g.color + "90" : "rgba(255,255,255,0.09)"}`,
                                            boxShadow: isSelected ? `0 0 24px ${g.color}48` : "none",
                                            transition: "background 0.18s, border-color 0.18s, box-shadow 0.18s",
                                        }}>
                                        <button
                                            className="flex flex-col items-center pt-4 pb-2.5 px-2 text-center w-full active:scale-95 transition-transform"
                                            onClick={() => {
                                                if (!isHost) return;
                                                sfxSelect();
                                                setOptimisticGame(g.id);
                                                onSelectGame(g.id);
                                            }}>
                                            <div className="text-3xl mb-1.5"
                                                style={{ filter: isSelected ? `drop-shadow(0 2px 14px ${g.color})` : "none" }}>
                                                {g.emoji}
                                            </div>
                                            <div className="font-fredoka text-white text-sm leading-tight">{g.title}</div>
                                            <div className="mt-1.5 px-2 py-0.5 rounded-full font-nunito text-[9px] font-bold"
                                                style={{ background: pill.color + "22", color: pill.color }}>
                                                {pill.label}
                                            </div>
                                        </button>
                                        <div className="h-[2px] w-full flex-shrink-0"
                                            style={{ background: g.color + (isSelected ? "cc" : "55") }} />
                                        <button
                                            onClick={e => { e.stopPropagation(); sfxTap(); setInfoGame(g); }}
                                            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-[10px]"
                                            style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                                            ℹ
                                        </button>
                                        {isSelected && (
                                            <div className="absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                                                style={{ background: g.color }}>
                                                ✓
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Coming soon section */}
                        <div className="flex items-center gap-2.5 mt-5 mb-3">
                            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                            <span className="font-nunito text-[10px] uppercase tracking-widest text-white/30 font-bold">Coming Soon</span>
                            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            {soonGames.map(g => {
                                const pill = CAT_PILLS[g.cat];
                                return (
                                    <div key={g.id}
                                        className="relative flex flex-col rounded-2xl overflow-hidden"
                                        style={{
                                            background: "rgba(255,255,255,0.03)",
                                            border: "1.5px solid rgba(255,255,255,0.06)",
                                        }}>
                                        {/* Overlay */}
                                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl pointer-events-none"
                                            style={{ background: "rgba(0,0,0,0.42)" }}>
                                            <span className="font-nunito text-[9px] uppercase tracking-widest text-white/40 font-bold">Coming Soon</span>
                                        </div>
                                        <button
                                            className="flex flex-col items-center pt-4 pb-2.5 px-2 text-center w-full"
                                            style={{ opacity: 0.32 }}
                                            onClick={e => { e.stopPropagation(); sfxTap(); setInfoGame(g); }}>
                                            <div className="text-3xl mb-1.5">{g.emoji}</div>
                                            <div className="font-fredoka text-white text-sm leading-tight">{g.title}</div>
                                            <div className="mt-1.5 px-2 py-0.5 rounded-full font-nunito text-[9px] font-bold"
                                                style={{ background: pill.color + "22", color: pill.color }}>
                                                {pill.label}
                                            </div>
                                        </button>
                                        <div className="h-[2px] w-full flex-shrink-0"
                                            style={{ background: g.color + "44" }} />
                                    </div>
                                );
                            })}
                        </div>

                    </div>
                </div>

                {/* ─── Bottom controls ─── */}
                <div className="flex-shrink-0 pt-3 pb-2">
                    {isHost ? (
                        <div className="flex gap-3 items-center">
                            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl flex-shrink-0"
                                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                                <button onClick={() => { sfxTap(); setRounds(r => Math.max(2, r - 1)); }}
                                    className="w-7 h-7 rounded-xl flex items-center justify-center font-fredoka text-white text-lg active:scale-90 transition-transform"
                                    style={{ background: "rgba(255,255,255,0.1)" }}>−</button>
                                <div className="text-center w-12">
                                    <div className="font-fredoka text-white text-xl leading-none">{rounds}</div>
                                    <div className="font-nunito text-white/35 text-[10px]">rounds</div>
                                </div>
                                <button onClick={() => { sfxTap(); setRounds(r => Math.min(10, r + 1)); }}
                                    className="w-7 h-7 rounded-xl flex items-center justify-center font-fredoka text-white text-lg active:scale-90 transition-transform"
                                    style={{ background: "rgba(255,255,255,0.1)" }}>+</button>
                            </div>
                            <button
                                className={`btn-primary flex-1 ${canStart ? "" : "opacity-40 pointer-events-none"}`}
                                onClick={() => {
                                    sfxTap();
                                    if (!selected) return;
                                    if (room.players.length < minNeeded) {
                                        if (lobbyErrTimer.current) clearTimeout(lobbyErrTimer.current);
                                        setLobbyError(`Need at least ${minNeeded} players to start ${selectedGame?.title ?? "this game"}!`);
                                        lobbyErrTimer.current = setTimeout(() => setLobbyError(""), 5000);
                                        return;
                                    }
                                    onStart(rounds);
                                }}>
                                {selected ? (room.players.length < minNeeded ? `Need ${minNeeded}+ players` : "🎮 Start!") : "Pick a game"}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center font-nunito text-white/40 text-sm wait-pulse">
                            Waiting for host to start…
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {lobbyError && (
                    <motion.div
                        key="lobby-err"
                        initial={{ opacity: 0, y: -30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -30, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                        className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                        style={{ width: "calc(100% - 40px)", maxWidth: 380 }}
                    >
                        <div className="w-full px-4 py-3 rounded-2xl font-nunito text-sm text-white text-center shadow-2xl"
                            style={{ background: "linear-gradient(135deg,#7c3aed,#dc2626)", boxShadow: "0 8px 32px rgba(220,38,38,0.45)" }}>
                            ⚠️ {lobbyError}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <GameInfoModal game={infoGame} onClose={() => setInfoGame(null)} />
        </>
    );
}
