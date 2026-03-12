"use client";
import { useState, useEffect } from "react";
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

const CAT_META = {
    popular: { icon: "⭐", label: "Popular" },
    original: { icon: "✨", label: "Original" },
    arcade: { icon: "🎮", label: "Arcade" },
} as const;

const ALL_GAMES = [
    // ─── Popular ───
    {
        id: "guess_the_liar", emoji: "🕵️", title: "Guess the Liar", desc: "Catch the liar!",
        color: "#7C3AED", cat: "popular",
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
        color: "#EC4899", cat: "popular",
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
        color: "#F59E0B", cat: "popular",
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
        color: "#10B981", cat: "popular",
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
        id: "would_you_rather", emoji: "🤔", title: "Would You Rather", desc: "A or B?",
        color: "#3B82F6", cat: "popular",
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
        color: "#EF4444", cat: "popular",
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
        id: "roast_room", emoji: "🎭", title: "Roast Room", desc: "Funniest answer",
        color: "#F97316", cat: "popular",
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
        color: "#8B5CF6", cat: "popular",
        rules: [
            "A sentence starter appears — you finish it.",
            "Be funny, creative, or brutally honest.",
            "Everyone reads all responses, then votes for their favourite.",
            "The wittiest ending wins.",
        ],
        scoring: "Most votes for your ending → +150 pts.",
        minPlayers: 2, maxPlayers: 12, duration: "3–4 min",
    },
    {
        id: "this_or_that", emoji: "⚡", title: "This or That", desc: "Rapid fire A vs B",
        color: "#06B6D4", cat: "popular",
        rules: [
            "Two options flash on screen — pick instantly!",
            "No thinking. Go with your gut.",
            "See how you compare to the rest of the group.",
            "The more you match the minority, the more you score.",
        ],
        scoring: "Being in the minority option → +50 pts per round.",
        minPlayers: 2, maxPlayers: 12, duration: "1 min",
    },
    {
        id: "superlatives", emoji: "🏅", title: "Superlatives", desc: "Vote who fits",
        color: "#F59E0B", cat: "popular",
        rules: [
            "A superlative appears — like 'Most likely to accidentally start a cult'.",
            "Everyone votes for who in the group fits best.",
            "Player with the most votes wins the superlative (and points)!",
            "Find out what your friends think of you.",
        ],
        scoring: "Most votes for a superlative → +50 pts.",
        minPlayers: 3, maxPlayers: 12, duration: "1–2 min",
    },
    // ─── Original ───
    {
        id: "red_flag_radar", emoji: "🚩", title: "Red Flag Radar", desc: "Red or green?",
        color: "#DC2626", cat: "original",
        rules: [
            "A dating/life scenario pops up.",
            "Vote RED FLAG 🚩 or GREEN FLAG 🟢 — no middle ground.",
            "Results revealed — see who in the group has standards.",
            "Minority flag-pickers earn bonus points.",
        ],
        scoring: "Minority flag vote → +50 pts. Groups can debate after each result!",
        minPlayers: 2, maxPlayers: 12, duration: "1 min",
    },
    {
        id: "vibe_check", emoji: "✨", title: "Vibe Check", desc: "Match the vibes",
        color: "#8B5CF6", cat: "original",
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
        id: "debate_pit", emoji: "⚔️", title: "Debate Pit", desc: "Crowd votes winner",
        color: "#06B6D4", cat: "original",
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
        color: "#10B981", cat: "original",
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
        id: "emoji_story", emoji: "📖", title: "Emoji Story", desc: "Emojis → story",
        color: "#EC4899", cat: "original",
        rules: [
            "A sequence of emojis is shown.",
            "Write the funniest, most creative story behind them.",
            "All stories shown anonymously — group votes for the best.",
            "The more absurd, the better.",
        ],
        scoring: "Most votes for your story → +150 pts.",
        minPlayers: 2, maxPlayers: 12, duration: "3–4 min",
    },
    {
        id: "unhinged_advice", emoji: "🤪", title: "Unhinged Advice", desc: "Absurd scenarios",
        color: "#F97316", cat: "original",
        rules: [
            "A completely unhinged scenario is presented.",
            "Give the most creative/unhinged advice you can.",
            "Answers revealed anonymously — vote for best advice.",
            "This is not a therapy session.",
        ],
        scoring: "Most votes for your advice → +150 pts.",
        minPlayers: 2, maxPlayers: 12, duration: "3–4 min",
    },
    {
        id: "confessions", emoji: "🤫", title: "Anonymous Confessions", desc: "Guess who confessed",
        color: "#7C3AED", cat: "original",
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
        id: "speed_round", emoji: "⚡", title: "Speed Round", desc: "Yes or No about yourself",
        color: "#EF4444", cat: "original",
        rules: [
            "A statement about things you've done / habits you have.",
            "Tap YES or NO — as fast as you can!",
            "Minority answer earns bonus points.",
            "Pure chaos. No judging.",
        ],
        scoring: "Minority vote → +75 pts. Are you the wild one in the group?",
        minPlayers: 2, maxPlayers: 12, duration: "1 min",
    },
    {
        id: "pick_your_poison", emoji: "☠️", title: "Pick Your Poison", desc: "No good options",
        color: "#DC2626", cat: "original",
        rules: [
            "Two TERRIBLE options. Pick the one you'd choose.",
            "There is no good answer here. Just survival.",
            "See how your suffering compares to the group.",
            "Minority opinion earns bonus points.",
        ],
        scoring: "Being in the minority → +50 pts. Solidarity with the group earns bragging rights.",
        minPlayers: 2, maxPlayers: 12, duration: "1 min",
    },
    {
        id: "burn_or_build", emoji: "🔥", title: "Burn or Build", desc: "Scrap or keep?",
        color: "#F59E0B", cat: "original",
        rules: [
            "Something from modern life is presented.",
            "BURN it (scrap it forever) or BUILD it (keep/improve it)?",
            "See how your group feels about the world's most annoying things.",
            "Minority vote earns points.",
        ],
        scoring: "Minority vote → +50 pts per round.",
        minPlayers: 2, maxPlayers: 12, duration: "1 min",
    },
    {
        id: "rate_that_take", emoji: "⭐", title: "Rate That Take", desc: "Wild opinions revealed",
        color: "#A855F7", cat: "original",
        rules: [
            "A wild opinion is revealed to everyone.",
            "Vote: do you AGREE or DISAGREE?",
            "Results shown — see who has controversial taste.",
            "Minority opinion earns bonus points.",
        ],
        scoring: "Minority vote → +75 pts. Tie → +30 pts everyone.",
        minPlayers: 2, maxPlayers: 12, duration: "1 min",
    },
    {
        id: "whose_line", emoji: "💬", title: "Whose Line Is It?", desc: "Guess the author",
        color: "#3B82F6", cat: "original",
        rules: [
            "Everyone writes something based on the prompt.",
            "All answers revealed anonymously — guess who wrote what.",
            "Vote for which answer belongs to which player.",
            "The better you know your friends, the more you score.",
        ],
        scoring: "+100 pts for each correct attribution. +150 pts if nobody guesses yours.",
        minPlayers: 3, maxPlayers: 10, duration: "3–5 min",
    },
    // ─── Arcade ───
    {
        id: "trivia_blitz", emoji: "🧠", title: "Trivia Blitz", desc: "Kahoot vibes!",
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
        id: "draw_it", emoji: "🎨", title: "Sketch & Guess", desc: "Draw it, others guess!",
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
        id: "word_bomb", emoji: "💣", title: "Word Bomb", desc: "Type before boom!",
        color: "#EF4444", cat: "arcade",
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
    {
        id: "bomberman", emoji: "💥", title: "Bomb Arena", desc: "Last one standing wins!",
        color: "#EF4444", cat: "arcade",
        rules: [
            "You move freely around a grid arena. Use WASD/arrows or the D-pad.",
            "Press SPACE or the 💣 button to drop a bomb.",
            "Bombs explode after 3 seconds in a cross pattern.",
            "Explosion lasts 2 seconds — don't stand in it!",
            "Soft walls (crates) can be destroyed by bombs.",
            "Last player alive wins the round!",
        ],
        scoring: "Winner gets +300 pts. Solo run: survive as long as possible.",
        minPlayers: 1, maxPlayers: 4, duration: "1–3 min",
    },
];

export default function LobbyScreen({ room, myId, isHost, onSelectGame, onStart }: Props) {
    const [rounds, setRounds] = useState(5);
    const [tab, setTab] = useState<"popular" | "original" | "arcade">("popular");
    const [infoGame, setInfoGame] = useState<typeof ALL_GAMES[0] | null>(null);
    // Optimistic selection: host sees instant feedback without waiting for server round-trip
    const [optimisticGame, setOptimisticGame] = useState<string | null>(null);

    // Sync optimistic state when server confirms
    useEffect(() => {
        if (room.gameType) setOptimisticGame(null);
    }, [room.gameType]);

    const selected = optimisticGame ?? room.gameType;
    const canStart = room.players.length >= 2 && !!selected;
    const filtered = ALL_GAMES.filter(g => g.cat === tab);
    const meta = CAT_META[tab];

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

                {/* ─── Category tabs ─── */}
                <div className="flex items-center justify-between mt-2 mb-3 flex-shrink-0">
                    <span className="font-fredoka text-white text-base">
                        {isHost ? "Pick a Game" : "Game Selection"}
                    </span>
                    <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.07)" }}>
                        {(["popular", "original", "arcade"] as const).map(t => (
                            <button key={t}
                                onClick={() => { sfxTap(); setTab(t); }}
                                className="font-nunito font-800 text-xs px-2.5 py-1.5 rounded-xl transition-all duration-200"
                                style={tab === t
                                    ? { background: "rgba(255,255,255,0.15)", color: "white" }
                                    : { color: "rgba(255,255,255,0.35)" }}>
                                {CAT_META[t].icon} {CAT_META[t].label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── Game grid (2-col) — AnimatePresence only on TAB change, not on game select ─── */}
                <div className="flex-1 scroll-y pb-2 min-h-0 -mx-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={tab}
                            initial={{ opacity: 0, x: 14 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -14 }}
                            transition={{ duration: 0.15 }}
                            className="px-1 pt-1"
                        >
                            {/* Category header */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">{meta.icon}</span>
                                <span className="font-fredoka text-white/70 text-base">{meta.label}</span>
                                <span className="font-nunito text-white/30 text-xs ml-1">{filtered.length} games</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {filtered.map(g => {
                                    const isSelected = selected === g.id;
                                    return (
                                        <div key={g.id}
                                            className="relative flex flex-col rounded-2xl overflow-hidden"
                                            style={{
                                                background: isSelected ? g.color + "26" : "rgba(255,255,255,0.05)",
                                                border: `1.5px solid ${isSelected ? g.color + "88" : "rgba(255,255,255,0.08)"}`,
                                                boxShadow: isSelected ? `0 0 22px ${g.color}44` : "none",
                                                transition: "background 0.18s, border-color 0.18s, box-shadow 0.18s",
                                            }}>
                                            {/* Tap zone */}
                                            <button
                                                className="flex flex-col items-center pt-5 pb-3 px-2 text-center w-full active:scale-95 transition-transform"
                                                onClick={() => {
                                                    if (!isHost) return;
                                                    sfxSelect();
                                                    setOptimisticGame(g.id); // instant local feedback
                                                    onSelectGame(g.id);
                                                }}>
                                                <div className="text-4xl mb-2"
                                                    style={{ filter: isSelected ? `drop-shadow(0 2px 12px ${g.color})` : "none" }}>
                                                    {g.emoji}
                                                </div>
                                                <div className="font-fredoka text-white text-sm leading-tight">{g.title}</div>
                                                <div className="font-nunito text-white/40 text-[10px] mt-0.5 leading-snug">{g.desc}</div>
                                            </button>

                                            {/* Bottom color bar */}
                                            <div className="h-1 w-full flex-shrink-0"
                                                style={{ background: g.color + (isSelected ? "cc" : "55") }} />

                                            {/* Info button */}
                                            <button
                                                onClick={e => { e.stopPropagation(); sfxTap(); setInfoGame(g); }}
                                                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-[10px]"
                                                style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                                                ℹ
                                            </button>

                                            {/* Selected check */}
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
                        </motion.div>
                    </AnimatePresence>
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
                                onClick={() => { sfxTap(); onStart(rounds); }}>
                                {selected ? (room.players.length < 2 ? "Need 2+ players" : "🎮 Start!") : "Pick a game"}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center font-nunito text-white/40 text-sm wait-pulse">
                            Waiting for host to start…
                        </div>
                    )}
                </div>
            </div>

            <GameInfoModal game={infoGame} onClose={() => setInfoGame(null)} />
        </>
    );
}
