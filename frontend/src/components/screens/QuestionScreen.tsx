"use client";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Room } from "@/lib/types";
import { sfxRoundStart } from "@/lib/sounds";

interface Props {
    room: Room;
    myRole: "liar" | "truth_teller" | null;
    myDebateRole: { position: string; side: "for" | "against" } | null;
}

const GAME_META: Record<string, { emoji: string; label: string; nextLabel: string }> = {
    guess_the_liar: { emoji: "🕵️", label: "Guess the Liar", nextLabel: "Write your answer" },
    two_truths: { emoji: "✌️", label: "Two Truths & a Lie", nextLabel: "Spotlight player writes" },
    most_likely_to: { emoji: "🏆", label: "Most Likely To", nextLabel: "Vote for someone" },
    never_have_i_ever: { emoji: "🙅", label: "Never Have I Ever", nextLabel: "Tap your answer" },
    would_you_rather: { emoji: "🤔", label: "Would You Rather", nextLabel: "Pick your option" },
    hot_takes: { emoji: "🔥", label: "Hot Takes", nextLabel: "Agree or disagree?" },
    roast_room: { emoji: "🎭", label: "Roast Room", nextLabel: "Write your roast" },
    red_flag_radar: { emoji: "🚩", label: "Red Flag Radar", nextLabel: "Red or green flag?" },
    vibe_check: { emoji: "✨", label: "Vibe Check", nextLabel: "Describe your vibe" },
    debate_pit: { emoji: "⚔️", label: "Debate Pit", nextLabel: "Debaters write arguments" },
    finish_the_sentence: { emoji: "✏️", label: "Finish the Sentence", nextLabel: "Write your ending" },
    this_or_that: { emoji: "⚡", label: "This or That", nextLabel: "Pick your side" },
    superlatives: { emoji: "🏅", label: "Superlatives", nextLabel: "Vote for someone" },
    word_association: { emoji: "🔗", label: "Word Association", nextLabel: "Type first reaction" },
    emoji_story: { emoji: "📖", label: "Emoji Story", nextLabel: "Write the story" },
    unhinged_advice: { emoji: "🤪", label: "Unhinged Advice", nextLabel: "Give your advice" },
    confessions: { emoji: "🤫", label: "Confessions", nextLabel: "Write your confession" },
    speed_round: { emoji: "⚡", label: "Speed Round", nextLabel: "Yes or No?" },
    pick_your_poison: { emoji: "☠️", label: "Pick Your Poison", nextLabel: "Choose your suffering" },
    burn_or_build: { emoji: "🔥", label: "Burn or Build", nextLabel: "Scrap it or keep it?" },
    rate_that_take: { emoji: "⭐", label: "Rate That Take", nextLabel: "Agree or disagree?" },
    whose_line: { emoji: "💬", label: "Whose Line Is It?", nextLabel: "Write something" },
};

export default function QuestionScreen({ room, myRole, myDebateRole }: Props) {
    const gt = room.gameType ?? "";

    useEffect(() => {
        sfxRoundStart();
    }, []);
    const meta = GAME_META[gt] ?? { emoji: "🎮", label: "Game", nextLabel: "Get ready" };
    const isLiar = myRole === "liar";
    const q = room.currentQuestion ?? "";
    const qd = room.questionData as Record<string, string> | null;

    // Determine spotlight player name
    const spotlightPlayer = room.players.find(p => p.id === room.spotlightId);

    // Determine if I'm a debater
    const myDebateId = room.debaterIds?.[0];

    return (
        <div className="page-fill justify-center items-center gap-5 text-center">
            {/* Round pill */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
                <div className="round-pill">
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                    <span>·</span>
                    <span>Round {room.round}/{room.maxRounds}</span>
                </div>
            </motion.div>

            {/* Role reveal (Guess the Liar) */}
            {gt === "guess_the_liar" && myRole && (
                <motion.div
                    initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
                    className="flex flex-col items-center gap-3"
                >
                    <div className="text-7xl">{isLiar ? "🤥" : "🧐"}</div>
                    <div className={`font-fredoka text-xl text-white px-7 py-3 rounded-full ${isLiar ? "role-liar" : "role-truth"}`}>
                        {isLiar ? "YOU ARE THE LIAR" : "TRUTH TELLER"}
                    </div>
                    <p className="font-nunito text-white/55 text-sm max-w-[280px]">
                        {isLiar ? "Make up a convincing fake answer 😈" : "Answer honestly — catch the liar! 🔍"}
                    </p>
                </motion.div>
            )}

            {/* Spotlight reveal (Two Truths) */}
            {gt === "two_truths" && (
                <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 280, delay: 0.1 }}
                    className="flex flex-col items-center gap-3">
                    <div className="text-6xl">✌️</div>
                    <div className="font-fredoka text-xl text-white px-7 py-3 rounded-full"
                        style={{ background: "linear-gradient(135deg,#EC4899,#7C3AED)", boxShadow: "0 0 24px rgba(236,72,153,0.5)" }}>
                        {spotlightPlayer?.name ?? "Someone"} is in the spotlight!
                    </div>
                    <p className="font-nunito text-white/55 text-sm max-w-[280px]">
                        They&apos;ll write 2 truths + 1 lie. Can you spot it? 🤔
                    </p>
                </motion.div>
            )}

            {/* Debate roles */}
            {gt === "debate_pit" && myDebateRole && (
                <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 280, delay: 0.1 }}
                    className="flex flex-col items-center gap-3">
                    <div className="text-6xl">⚔️</div>
                    <div className={`font-fredoka text-lg text-white px-7 py-3 rounded-full ${myDebateRole.side === "for" ? "side-for" : "side-against"}`}>
                        You argue: {myDebateRole.position}
                    </div>
                    <p className="font-nunito text-white/55 text-sm">Prepare your best argument!</p>
                </motion.div>
            )}

            {/* The question card */}
            <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="party-card w-full p-5 mx-0">
                <p className="font-nunito text-white/45 text-xs uppercase tracking-widest mb-2">
                    {gt === "would_you_rather" ? "Would you rather…" : gt === "most_likely_to" ? "Who is most likely to…" : "🎯 This round"}
                </p>
                {gt === "would_you_rather" && qd ? (
                    <div className="flex flex-col gap-2">
                        <div className="glass-card p-3 rounded-2xl">
                            <span className="font-nunito font-extrabold text-purple-400 text-xs uppercase tracking-widest">A</span>
                            <p className="font-fredoka text-lg text-white mt-0.5 leading-snug">{qd.optionA}</p>
                        </div>
                        <div className="font-fredoka text-white/30 text-sm">— or —</div>
                        <div className="glass-card p-3 rounded-2xl">
                            <span className="font-nunito font-extrabold text-pink-400 text-xs uppercase tracking-widest">B</span>
                            <p className="font-fredoka text-lg text-white mt-0.5 leading-snug">{qd.optionB}</p>
                        </div>
                    </div>
                ) : (
                    <p className="font-fredoka text-2xl text-white leading-snug">{q}</p>
                )}
                {qd?.hint && gt === "vibe_check" && (
                    <p className="font-nunito text-white/40 text-sm mt-2">💡 Hint: {qd.hint as string}</p>
                )}
            </motion.div>

            {/* Next hint */}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
                className="font-nunito text-white/35 text-sm wait-pulse">
                {meta.nextLabel}…
            </motion.p>
        </div>
    );
}
