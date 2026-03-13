// ── Game Catalogue ────────────────────────────────────────────────────────────
// active: false  → soft-retired; excluded from the /catalogue response.
// Do not delete retired entries until QA and frontend cleanup pass (Phase B).
const GAME_CATALOGUE = {
  // ── Social deduction (keep 3) ─────────────────────────────────────────────
  guess_the_liar: {
    id: "guess_the_liar", title: "Find the Liar", emoji: "🕵️",
    description: "One player lies about the question. Catch them!",
    category: "popular", minPlayers: 3, maxPlayers: 12, color: "#7C3AED",
    active: true,
  },
  two_truths: {
    id: "two_truths", title: "Two Truths & a Lie", emoji: "✌️",
    description: "2 truths + 1 lie per player. Fool your friends.",
    category: "popular", minPlayers: 3, maxPlayers: 10, color: "#EC4899",
    active: true,
  },
  most_likely_to: {
    id: "most_likely_to", title: "Most Likely To", emoji: "🏆",
    description: "Vote who in the group is most likely to do it.",
    category: "popular", minPlayers: 3, maxPlayers: 12, color: "#F59E0B",
    active: true,
  },
  // ── Binary / opinion (keep 3) ─────────────────────────────────────────────
  never_have_i_ever: {
    id: "never_have_i_ever", title: "Never Have I Ever", emoji: "🙅",
    description: "I HAVE or I NEVER. See who's done what. No filter.",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#10B981",
    active: true,
  },
  would_you_rather: {
    id: "would_you_rather", title: "Would You Rather?", emoji: "🤔",
    description: "Pick A or B. See how the group splits.",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#3B82F6",
    active: true,
  },
  hot_takes: {
    id: "hot_takes", title: "Hot Takes", emoji: "🔥",
    description: "Agree or disagree. Minority opinion earns bonus points.",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#EF4444",
    active: true,
  },
  roast_room: {
    id: "roast_room", title: "Roast Battle", emoji: "🎭",
    description: "Answer a prompt anonymously. Vote for the funniest.",
    category: "popular", minPlayers: 3, maxPlayers: 10, color: "#F97316",
    active: true,
  },
  finish_the_sentence: {
    id: "finish_the_sentence", title: "Finish the Sentence", emoji: "✏️",
    description: "Complete the prompt. Everyone votes for the best ending.",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#8B5CF6",
    active: true,
  },
  // ── Retired: binary-opinion overlap ──────────────────────────────────────
  this_or_that: {
    id: "this_or_that", title: "This or That", emoji: "⚡",
    description: "Rapid fire A vs B. See how much you match the group.",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#06B6D4",
    active: false,
  },
  superlatives: {
    id: "superlatives", title: "Superlatives", emoji: "🏅",
    description: "Vote who in the group fits each wild superlative.",
    category: "popular", minPlayers: 3, maxPlayers: 12, color: "#F59E0B",
    active: false,
  },
  red_flag_radar: {
    id: "red_flag_radar", title: "Red Flag Radar", emoji: "🚩",
    description: "Red or green flag? Vote on wild dating scenarios.",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#EF4444",
    active: false,
  },
  // ── Matching / identity / association ─────────────────────────────────────
  vibe_check: {
    id: "vibe_check", title: "Vibe Check", emoji: "✨",
    description: "Describe yourself as X. Others guess whose vibe is whose.",
    category: "original", minPlayers: 3, maxPlayers: 8, color: "#8B5CF6",
    active: true,
  },
  debate_pit: {
    id: "debate_pit", title: "Debate Battle", emoji: "⚔️",
    description: "Two players debate absurd topics. Crowd votes the winner.",
    category: "original", minPlayers: 3, maxPlayers: 12, color: "#06B6D4",
    active: true,
  },
  word_association: {
    id: "word_association", title: "Word Association", emoji: "🔗",
    description: "See one word. Type your instant reaction. Match the majority.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#10B981",
    active: true,
  },
  // ── Retired: creative write-then-vote overlap ─────────────────────────────
  emoji_story: {
    id: "emoji_story", title: "Emoji Story", emoji: "📖",
    description: "A string of emojis. Write the funniest story behind them.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#EC4899",
    active: false,
  },
  unhinged_advice: {
    id: "unhinged_advice", title: "Unhinged Advice", emoji: "🤪",
    description: "Absurd scenarios. Give the most unhinged advice you can.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#F97316",
    active: false,
  },
  confessions: {
    id: "confessions", title: "Anonymous Confessions", emoji: "🤫",
    description: "Write anonymous confessions. Others guess who wrote what.",
    category: "original", minPlayers: 3, maxPlayers: 10, color: "#7C3AED",
    active: true,
  },
  // ── Retired: binary-opinion overlap ──────────────────────────────────────
  speed_round: {
    id: "speed_round", title: "Speed Round", emoji: "⚡",
    description: "Yes or No about yourself. Minority opinion wins each round.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#EF4444",
    active: false,
  },
  pick_your_poison: {
    id: "pick_your_poison", title: "Pick Your Poison", emoji: "☠️",
    description: "Extreme would-you-rathers. No good options here.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#DC2626",
    active: true,
  },
  burn_or_build: {
    id: "burn_or_build", title: "Burn or Build", emoji: "🔥",
    description: "Keep it or scrap it? Vote on society's most annoying things.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#F59E0B",
    active: false,
  },
  // ── Retired: Hot Takes overlap ────────────────────────────────────────────
  rate_that_take: {
    id: "rate_that_take", title: "Rate That Take", emoji: "⭐",
    description: "Wild opinions revealed. Agree or disagree as a group.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#A855F7",
    active: false,
  },
  // ── Retired: creative write-then-vote overlap ─────────────────────────────
  whose_line: {
    id: "whose_line", title: "Whose Line Is It?", emoji: "💬",
    description: "Everyone writes something. Others guess who wrote what.",
    category: "original", minPlayers: 3, maxPlayers: 10, color: "#3B82F6",
    active: false,
  },
  // ── Arcade ────────────────────────────────────────────────────────────────
  trivia_blitz: {
    id: "trivia_blitz", title: "Trivia Battle", emoji: "🧠",
    description: "Kahoot-style! 4 answers, 20 seconds. Speed = more points.",
    category: "arcade", minPlayers: 2, maxPlayers: 12, color: "#8B5CF6",
    active: true,
  },
  draw_it: {
    id: "draw_it", title: "Draw & Guess", emoji: "🎨",
    description: "Draw a secret word. Others race to guess it in real-time.",
    category: "arcade", minPlayers: 3, maxPlayers: 8, color: "#F59E0B",
    active: true,
  },
  word_bomb: {
    id: "word_bomb", title: "Word Bomb", emoji: "💣",
    description: "Type a word with the pattern before the bomb explodes!",
    category: "arcade", minPlayers: 3, maxPlayers: 10, color: "#EF4444",
    active: true,
  },
  reaction_tap: {
    id: "reaction_tap", title: "Reaction Tap", emoji: "⚡",
    description: "Screen flashes — tap instantly. Fastest reflexes win!",
    category: "arcade", minPlayers: 2, maxPlayers: 12, color: "#10B981",
    active: true,
  },
  bomberman: {
    id: "bomberman", title: "Bomb Arena", emoji: "💥",
    description: "Free movement arena! Place bombs to blast opponents. Last one standing wins!",
    category: "arcade", minPlayers: 1, maxPlayers: 4, color: "#EF4444",
    active: true,
  },
  bingo: {
    id: "bingo", title: "Bingo", emoji: "🎱",
    description: "Everyone gets a personal 5x5 board. Mark off called items and shout Bingo first!",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#6366F1",
    active: true,
  },
};

// Returns only active games — use this for the /catalogue endpoint.
function getActiveCatalogue() {
  return Object.fromEntries(
    Object.entries(GAME_CATALOGUE).filter(([, g]) => g.active)
  );
}

module.exports = { GAME_CATALOGUE, getActiveCatalogue };
