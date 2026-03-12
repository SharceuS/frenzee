// ── Game Catalogue ────────────────────────────────────────────────────────────
const GAME_CATALOGUE = {
  guess_the_liar: {
    id: "guess_the_liar", title: "Guess the Liar", emoji: "🕵️",
    description: "One player lies about the question. Catch them!",
    category: "popular", minPlayers: 3, maxPlayers: 12, color: "#7C3AED",
  },
  two_truths: {
    id: "two_truths", title: "Two Truths & a Lie", emoji: "✌️",
    description: "2 truths + 1 lie per player. Fool your friends.",
    category: "popular", minPlayers: 3, maxPlayers: 10, color: "#EC4899",
  },
  most_likely_to: {
    id: "most_likely_to", title: "Most Likely To", emoji: "🏆",
    description: "Vote who in the group is most likely to do it.",
    category: "popular", minPlayers: 3, maxPlayers: 12, color: "#F59E0B",
  },
  never_have_i_ever: {
    id: "never_have_i_ever", title: "Never Have I Ever", emoji: "🙅",
    description: "I HAVE or I NEVER. See who's done what. No filter.",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#10B981",
  },
  would_you_rather: {
    id: "would_you_rather", title: "Would You Rather", emoji: "🤔",
    description: "Pick A or B. See how the group splits.",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#3B82F6",
  },
  hot_takes: {
    id: "hot_takes", title: "Hot Takes", emoji: "🔥",
    description: "Agree or disagree. Minority opinion earns bonus points.",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#EF4444",
  },
  roast_room: {
    id: "roast_room", title: "Roast Room", emoji: "🎭",
    description: "Answer a prompt anonymously. Vote for the funniest.",
    category: "popular", minPlayers: 3, maxPlayers: 10, color: "#F97316",
  },
  finish_the_sentence: {
    id: "finish_the_sentence", title: "Finish the Sentence", emoji: "✏️",
    description: "Complete the prompt. Everyone votes for the best ending.",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#8B5CF6",
  },
  this_or_that: {
    id: "this_or_that", title: "This or That", emoji: "⚡",
    description: "Rapid fire A vs B. See how much you match the group.",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#06B6D4",
  },
  superlatives: {
    id: "superlatives", title: "Superlatives", emoji: "🏅",
    description: "Vote who in the group fits each wild superlative.",
    category: "popular", minPlayers: 3, maxPlayers: 12, color: "#F59E0B",
  },
  red_flag_radar: {
    id: "red_flag_radar", title: "Red Flag Radar", emoji: "🚩",
    description: "Red or green flag? Vote on wild dating scenarios.",
    category: "popular", minPlayers: 2, maxPlayers: 12, color: "#EF4444",
  },
  vibe_check: {
    id: "vibe_check", title: "Vibe Check", emoji: "✨",
    description: "Describe yourself as X. Others guess whose vibe is whose.",
    category: "original", minPlayers: 3, maxPlayers: 8, color: "#8B5CF6",
  },
  debate_pit: {
    id: "debate_pit", title: "Debate Pit", emoji: "⚔️",
    description: "Two players debate absurd topics. Crowd votes the winner.",
    category: "original", minPlayers: 3, maxPlayers: 12, color: "#06B6D4",
  },
  word_association: {
    id: "word_association", title: "Word Association", emoji: "🔗",
    description: "See one word. Type your instant reaction. Match the majority.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#10B981",
  },
  emoji_story: {
    id: "emoji_story", title: "Emoji Story", emoji: "📖",
    description: "A string of emojis. Write the funniest story behind them.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#EC4899",
  },
  unhinged_advice: {
    id: "unhinged_advice", title: "Unhinged Advice", emoji: "🤪",
    description: "Absurd scenarios. Give the most unhinged advice you can.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#F97316",
  },
  confessions: {
    id: "confessions", title: "Anonymous Confessions", emoji: "🤫",
    description: "Write anonymous confessions. Others guess who wrote what.",
    category: "original", minPlayers: 3, maxPlayers: 10, color: "#7C3AED",
  },
  speed_round: {
    id: "speed_round", title: "Speed Round", emoji: "⚡",
    description: "Yes or No about yourself. Minority opinion wins each round.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#EF4444",
  },
  pick_your_poison: {
    id: "pick_your_poison", title: "Pick Your Poison", emoji: "☠️",
    description: "Extreme would-you-rathers. No good options here.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#DC2626",
  },
  burn_or_build: {
    id: "burn_or_build", title: "Burn or Build", emoji: "🔥",
    description: "Keep it or scrap it? Vote on society's most annoying things.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#F59E0B",
  },
  rate_that_take: {
    id: "rate_that_take", title: "Rate That Take", emoji: "⭐",
    description: "Wild opinions revealed. Agree or disagree as a group.",
    category: "original", minPlayers: 2, maxPlayers: 12, color: "#A855F7",
  },
  whose_line: {
    id: "whose_line", title: "Whose Line Is It?", emoji: "💬",
    description: "Everyone writes something. Others guess who wrote what.",
    category: "original", minPlayers: 3, maxPlayers: 10, color: "#3B82F6",
  },
  trivia_blitz: {
    id: "trivia_blitz", title: "Trivia Blitz", emoji: "🧠",
    description: "Kahoot-style! 4 answers, 20 seconds. Speed = more points.",
    category: "arcade", minPlayers: 2, maxPlayers: 12, color: "#8B5CF6",
  },
  draw_it: {
    id: "draw_it", title: "Draw It!", emoji: "🎨",
    description: "Draw a secret word. Others race to guess it in real-time.",
    category: "arcade", minPlayers: 3, maxPlayers: 8, color: "#F59E0B",
  },
  word_bomb: {
    id: "word_bomb", title: "Word Bomb", emoji: "💣",
    description: "Type a word with the pattern before the bomb explodes!",
    category: "arcade", minPlayers: 3, maxPlayers: 10, color: "#EF4444",
  },
  reaction_tap: {
    id: "reaction_tap", title: "Reaction Tap", emoji: "⚡",
    description: "Screen flashes — tap instantly. Fastest reflexes win!",
    category: "arcade", minPlayers: 2, maxPlayers: 12, color: "#10B981",
  },
  bomberman: {
    id: "bomberman", title: "Bomb Arena", emoji: "💥",
    description: "Free movement arena! Place bombs to blast opponents. Last one standing wins!",
    category: "arcade", minPlayers: 1, maxPlayers: 4, color: "#EF4444",
  },
};

module.exports = { GAME_CATALOGUE };
