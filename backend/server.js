const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const {
  GUESS_THE_LIAR,
  TWO_TRUTHS_TOPICS,
  MOST_LIKELY_TO,
  NEVER_HAVE_I_EVER,
  WOULD_YOU_RATHER,
  HOT_TAKES,
  ROAST_ROOM,
  RED_FLAG_RADAR,
  VIBE_CHECK_CATEGORIES,
  DEBATE_PIT_TOPICS,
  WORD_ASSOCIATION,
  EMOJI_STORIES,
  FINISH_THE_SENTENCE,
  THIS_OR_THAT,
  UNHINGED_ADVICE,
  CONFESSIONS_PROMPTS,
  SPEED_ROUND,
  PICK_YOUR_POISON,
  BURN_OR_BUILD,
  RATE_THAT_TAKE,
  SUPERLATIVES,
  WHOSE_LINE_PROMPTS,
} = require("./data/questions");

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ══════════════════════════════════════
// GAME CATALOGUE
// ══════════════════════════════════════
const GAME_CATALOGUE = {
  guess_the_liar: {
    id: "guess_the_liar",
    title: "Guess the Liar",
    emoji: "🕵️",
    description: "One player lies about the question. Catch them!",
    category: "popular",
    minPlayers: 3,
    maxPlayers: 12,
    color: "#7C3AED",
  },
  two_truths: {
    id: "two_truths",
    title: "Two Truths & a Lie",
    emoji: "✌️",
    description: "2 truths + 1 lie per player. Fool your friends.",
    category: "popular",
    minPlayers: 3,
    maxPlayers: 10,
    color: "#EC4899",
  },
  most_likely_to: {
    id: "most_likely_to",
    title: "Most Likely To",
    emoji: "🏆",
    description: "Vote who in the group is most likely to do it.",
    category: "popular",
    minPlayers: 3,
    maxPlayers: 12,
    color: "#F59E0B",
  },
  never_have_i_ever: {
    id: "never_have_i_ever",
    title: "Never Have I Ever",
    emoji: "🙅",
    description: "I HAVE or I NEVER. See who's done what. No filter.",
    category: "popular",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#10B981",
  },
  would_you_rather: {
    id: "would_you_rather",
    title: "Would You Rather",
    emoji: "🤔",
    description: "Pick A or B. See how the group splits.",
    category: "popular",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#3B82F6",
  },
  hot_takes: {
    id: "hot_takes",
    title: "Hot Takes",
    emoji: "🔥",
    description: "Agree or disagree. Minority opinion earns bonus points.",
    category: "popular",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#EF4444",
  },
  roast_room: {
    id: "roast_room",
    title: "Roast Room",
    emoji: "🎭",
    description: "Answer a prompt anonymously. Vote for the funniest.",
    category: "popular",
    minPlayers: 3,
    maxPlayers: 10,
    color: "#F97316",
  },
  finish_the_sentence: {
    id: "finish_the_sentence",
    title: "Finish the Sentence",
    emoji: "✏️",
    description: "Complete the prompt. Everyone votes for the best ending.",
    category: "popular",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#8B5CF6",
  },
  this_or_that: {
    id: "this_or_that",
    title: "This or That",
    emoji: "⚡",
    description: "Rapid fire A vs B. See how much you match the group.",
    category: "popular",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#06B6D4",
  },
  superlatives: {
    id: "superlatives",
    title: "Superlatives",
    emoji: "🏅",
    description: "Vote who in the group fits each wild superlative.",
    category: "popular",
    minPlayers: 3,
    maxPlayers: 12,
    color: "#F59E0B",
  },
  red_flag_radar: {
    id: "red_flag_radar",
    title: "Red Flag Radar",
    emoji: "🚩",
    description: "Red or green flag? Vote on wild dating scenarios.",
    category: "popular",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#EF4444",
  },
  vibe_check: {
    id: "vibe_check",
    title: "Vibe Check",
    emoji: "✨",
    description: "Describe yourself as X. Others guess whose vibe is whose.",
    category: "original",
    minPlayers: 3,
    maxPlayers: 8,
    color: "#8B5CF6",
  },
  debate_pit: {
    id: "debate_pit",
    title: "Debate Pit",
    emoji: "⚔️",
    description: "Two players debate absurd topics. Crowd votes the winner.",
    category: "original",
    minPlayers: 3,
    maxPlayers: 12,
    color: "#06B6D4",
  },
  word_association: {
    id: "word_association",
    title: "Word Association",
    emoji: "🔗",
    description:
      "See one word. Type your instant reaction. Match the majority.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#10B981",
  },
  emoji_story: {
    id: "emoji_story",
    title: "Emoji Story",
    emoji: "📖",
    description: "A string of emojis. Write the funniest story behind them.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#EC4899",
  },
  unhinged_advice: {
    id: "unhinged_advice",
    title: "Unhinged Advice",
    emoji: "🤪",
    description: "Absurd scenarios. Give the most unhinged advice you can.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#F97316",
  },
  confessions: {
    id: "confessions",
    title: "Anonymous Confessions",
    emoji: "🤫",
    description: "Write anonymous confessions. Others guess who wrote what.",
    category: "original",
    minPlayers: 3,
    maxPlayers: 10,
    color: "#7C3AED",
  },
  speed_round: {
    id: "speed_round",
    title: "Speed Round",
    emoji: "⚡",
    description: "Yes or No about yourself. Minority opinion wins each round.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#EF4444",
  },
  pick_your_poison: {
    id: "pick_your_poison",
    title: "Pick Your Poison",
    emoji: "☠️",
    description: "Extreme would-you-rathers. No good options here.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#DC2626",
  },
  burn_or_build: {
    id: "burn_or_build",
    title: "Burn or Build",
    emoji: "🔥",
    description: "Keep it or scrap it? Vote on society's most annoying things.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#F59E0B",
  },
  rate_that_take: {
    id: "rate_that_take",
    title: "Rate That Take",
    emoji: "⭐",
    description: "Wild opinions revealed. Agree or disagree as a group.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#A855F7",
  },
  whose_line: {
    id: "whose_line",
    title: "Whose Line Is It?",
    emoji: "💬",
    description: "Everyone writes something. Others guess who wrote what.",
    category: "original",
    minPlayers: 3,
    maxPlayers: 10,
    color: "#3B82F6",
  },
};

app.get("/catalogue", (_, res) => res.json(GAME_CATALOGUE));
app.get("/health", (_, res) => res.json({ ok: true }));

// ══════════════════════════════════════
// ROOM STORE
// ══════════════════════════════════════
const rooms = {};

function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function createRoom(hostId, hostName) {
  let code;
  do {
    code = genCode();
  } while (rooms[code]);
  rooms[code] = {
    code,
    host: hostId,
    players: [{ id: hostId, name: hostName, score: 0, isHost: true }],
    phase: "lobby",
    gameType: null,
    round: 0,
    maxRounds: 5,
    currentQuestion: null,
    questionData: null,
    spotlightId: null,
    debaterIds: [],
    liarId: null,
    answers: {},
    votes: {},
    matchGuesses: {},
    usedQuestions: [],
    roundResult: null,
  };
  return rooms[code];
}

function getRoom(c) {
  return rooms[c] || null;
}
function shuffle(a) {
  return [...a].sort(() => Math.random() - 0.5);
}

function pickQ(array, room) {
  const avail = array.filter(
    (q) => !room.usedQuestions.includes(JSON.stringify(q)),
  );
  const pool = avail.length > 0 ? avail : array;
  const q = pool[Math.floor(Math.random() * pool.length)];
  room.usedQuestions.push(JSON.stringify(q));
  return q;
}

// ══════════════════════════════════════
// SANITIZE
// ══════════════════════════════════════
function sanitize(room) {
  const showAns = ["voting", "results", "matching"].includes(room.phase);
  let answers = null;
  if (showAns) {
    answers = room.players
      .filter((p) => room.answers[p.id] !== undefined)
      .map((p) => ({
        playerId: p.id,
        playerName: p.name,
        answer: room.answers[p.id],
      }));
    if (room.phase === "voting") answers = shuffle(answers);
  }
  return {
    code: room.code,
    host: room.host,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: p.isHost,
      hasAnswered: room.answers[p.id] !== undefined,
      hasVoted: room.votes[p.id] !== undefined,
    })),
    phase: room.phase,
    gameType: room.gameType,
    round: room.round,
    maxRounds: room.maxRounds,
    currentQuestion: room.currentQuestion,
    questionData: room.questionData,
    spotlightId: room.spotlightId,
    debaterIds: room.debaterIds,
    liarId: room.phase === "results" ? room.liarId : null,
    answers,
    votes: room.phase === "results" ? room.votes : null,
    matchGuesses: room.matchGuesses,
    answerCount: Object.keys(room.answers).length,
    voteCount: Object.keys(room.votes).length,
    roundResult: room.roundResult,
  };
}

function broadcast(code) {
  const r = getRoom(code);
  if (r) io.to(code).emit("room_update", sanitize(r));
}
function advanceTo(room, phase) {
  room.phase = phase;
  broadcast(room.code);
}

// ══════════════════════════════════════
// CHECK ALL DONE
// ══════════════════════════════════════
function checkAllAnswered(room) {
  const gt = room.gameType;
  if (gt === "two_truths") return room.answers[room.spotlightId] !== undefined;
  if (gt === "debate_pit")
    return room.debaterIds.every((id) => room.answers[id] !== undefined);
  return room.players.every((p) => room.answers[p.id] !== undefined);
}
function checkAllVoted(room) {
  const gt = room.gameType;
  if (gt === "two_truths") {
    return room.players
      .filter((p) => p.id !== room.spotlightId)
      .every((p) => room.votes[p.id] !== undefined);
  }
  if (gt === "debate_pit") {
    const non = room.players.filter((p) => !room.debaterIds.includes(p.id));
    return non.length === 0
      ? Object.keys(room.votes).length >= 1
      : non.every((p) => room.votes[p.id] !== undefined);
  }
  // confessions / whose_line voting: all-except-nobody (everyone votes on answers)
  if (
    [
      "confessions",
      "whose_line",
      "roast_room",
      "emoji_story",
      "finish_the_sentence",
      "unhinged_advice",
    ].includes(gt)
  ) {
    return room.players.every((p) => room.votes[p.id] !== undefined);
  }
  return room.players.every((p) => room.votes[p.id] !== undefined);
}
function checkAllMatched(room) {
  return room.players.every((p) => room.matchGuesses[p.id] !== undefined);
}

// ══════════════════════════════════════
// START ROUND
// ══════════════════════════════════════
function startRound(room) {
  room.round++;
  room.answers = {};
  room.votes = {};
  room.matchGuesses = {};
  room.liarId = null;
  room.spotlightId = null;
  room.debaterIds = [];
  room.roundResult = null;
  const gt = room.gameType;

  if (gt === "guess_the_liar") {
    room.currentQuestion = pickQ(GUESS_THE_LIAR, room);
    room.questionData = null;
    const li = Math.floor(Math.random() * room.players.length);
    room.liarId = room.players[li].id;
    room.phase = "question";
    broadcast(room.code);
    room.players.forEach((p) =>
      io.sockets.sockets.get(p.id)?.emit("your_role", {
        role: p.id === room.liarId ? "liar" : "truth_teller",
        question: room.currentQuestion,
      }),
    );
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 4000);
  } else if (gt === "two_truths") {
    room.currentQuestion = pickQ(TWO_TRUTHS_TOPICS, room);
    room.questionData = null;
    room.spotlightId = room.players[(room.round - 1) % room.players.length].id;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "spotlight_write");
    }, 3500);
  } else if (gt === "most_likely_to") {
    room.currentQuestion = pickQ(MOST_LIKELY_TO, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "voting");
    }, 3000);
  } else if (gt === "never_have_i_ever") {
    room.currentQuestion = pickQ(NEVER_HAVE_I_EVER, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3000);
  } else if (gt === "would_you_rather") {
    const q = pickQ(WOULD_YOU_RATHER, room);
    room.currentQuestion = q.a + " ——OR—— " + q.b;
    room.questionData = { optionA: q.a, optionB: q.b };
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "hot_takes") {
    room.currentQuestion = pickQ(HOT_TAKES, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "roast_room") {
    room.currentQuestion = pickQ(ROAST_ROOM, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "red_flag_radar") {
    room.currentQuestion = pickQ(RED_FLAG_RADAR, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "vibe_check") {
    const q = pickQ(VIBE_CHECK_CATEGORIES, room);
    room.currentQuestion = q.prompt;
    room.questionData = { hint: q.hint };
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "debate_pit") {
    const q = pickQ(DEBATE_PIT_TOPICS, room);
    const sh = shuffle(room.players);
    room.debaterIds = [sh[0].id, sh[1].id];
    room.currentQuestion = q.topic;
    room.questionData = {
      topic: q.topic,
      forDebater: room.debaterIds[0],
      againstDebater: room.debaterIds[1],
      forPosition: q.for,
      againstPosition: q.against,
    };
    room.phase = "question";
    broadcast(room.code);
    io.sockets.sockets
      .get(room.debaterIds[0])
      ?.emit("your_debate_role", { position: q.for, side: "for" });
    io.sockets.sockets
      .get(room.debaterIds[1])
      ?.emit("your_debate_role", { position: q.against, side: "against" });
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "debate_write");
    }, 4000);
  }
  // ── NEW GAMES ──
  else if (gt === "word_association") {
    room.currentQuestion = pickQ(WORD_ASSOCIATION, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 2500);
  } else if (gt === "emoji_story") {
    const q = pickQ(EMOJI_STORIES, room);
    room.currentQuestion = q.emojis;
    room.questionData = { hint: q.hint };
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "finish_the_sentence") {
    room.currentQuestion = pickQ(FINISH_THE_SENTENCE, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "this_or_that") {
    const q = pickQ(THIS_OR_THAT, room);
    room.currentQuestion = q.a + " — OR — " + q.b;
    room.questionData = { optionA: q.a, optionB: q.b };
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3000);
  } else if (gt === "unhinged_advice") {
    const q = pickQ(
      UNHINGED_ADVICE.filter((x) => typeof x === "string"),
      room,
    );
    room.currentQuestion = q;
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 4000);
  } else if (gt === "confessions") {
    room.currentQuestion = pickQ(CONFESSIONS_PROMPTS, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 4000);
  } else if (gt === "speed_round") {
    room.currentQuestion = pickQ(SPEED_ROUND, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3000);
  } else if (gt === "pick_your_poison") {
    const q = pickQ(PICK_YOUR_POISON, room);
    room.currentQuestion = q.a + " — OR — " + q.b;
    room.questionData = { optionA: q.a, optionB: q.b };
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "burn_or_build") {
    room.currentQuestion = pickQ(BURN_OR_BUILD, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3000);
  } else if (gt === "rate_that_take") {
    room.currentQuestion = pickQ(RATE_THAT_TAKE, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "superlatives") {
    room.currentQuestion = pickQ(SUPERLATIVES, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "voting");
    }, 3000);
  } else if (gt === "whose_line") {
    room.currentQuestion = pickQ(WHOSE_LINE_PROMPTS, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 4000);
  }
}

// ══════════════════════════════════════
// RESOLVE ROUND
// ══════════════════════════════════════
function resolveRound(room) {
  const gt = room.gameType;
  let result = {};

  if (gt === "guess_the_liar") {
    const vc = {};
    room.players.forEach((p) => {
      vc[p.id] = 0;
    });
    Object.values(room.votes).forEach((v) => {
      vc[v] = (vc[v] || 0) + 1;
    });
    const max = Math.max(...Object.values(vc));
    const caught = Object.keys(vc)
      .filter((id) => vc[id] === max)
      .includes(room.liarId);
    room.players.forEach((p) => {
      if (caught && p.id !== room.liarId && room.votes[p.id] === room.liarId)
        p.score += 100;
      if (!caught && p.id === room.liarId) p.score += 200;
    });
    result = { liarCaught: caught, voteCounts: vc };
  } else if (gt === "two_truths") {
    const sa = room.answers[room.spotlightId];
    const correctIndex = sa ? sa.lieIndex : 0;
    const correctVoters = [];
    room.players.forEach((p) => {
      if (p.id === room.spotlightId) return;
      if (room.votes[p.id] == correctIndex) {
        p.score += 100;
        correctVoters.push(p.id);
      }
    });
    if (correctVoters.length === 0) {
      const sp = room.players.find((p) => p.id === room.spotlightId);
      if (sp) sp.score += 200;
    }
    result = { correctIndex, correctVoters, statements: sa };
  } else if (gt === "most_likely_to") {
    const vc = {};
    room.players.forEach((p) => {
      vc[p.id] = 0;
    });
    Object.values(room.votes).forEach((v) => {
      vc[v] = (vc[v] || 0) + 1;
    });
    const max = Math.max(...Object.values(vc), 0);
    const winners = room.players.filter((p) => vc[p.id] === max);
    winners.forEach((p) => {
      p.score += 50;
    });
    result = { voteCounts: vc, winnerIds: winners.map((p) => p.id) };
  } else if (gt === "never_have_i_ever") {
    const havers = room.players.filter((p) => room.answers[p.id] === "have");
    havers.forEach((p) => {
      p.score += 30;
    });
    result = {
      havers: havers.map((p) => ({ id: p.id, name: p.name })),
      nevers: room.players
        .filter((p) => room.answers[p.id] === "never")
        .map((p) => ({ id: p.id, name: p.name })),
    };
  } else if (gt === "would_you_rather") {
    const a = room.players
      .filter((p) => room.answers[p.id] === "a")
      .map((p) => ({ id: p.id, name: p.name }));
    const b = room.players
      .filter((p) => room.answers[p.id] === "b")
      .map((p) => ({ id: p.id, name: p.name }));
    const minority = a.length < b.length ? a : b;
    minority.forEach((pl) => {
      const p = room.players.find((x) => x.id === pl.id);
      if (p) p.score += 50;
    });
    result = { aVoters: a, bVoters: b };
  } else if (gt === "hot_takes") {
    const ag = room.players
      .filter((p) => room.answers[p.id] === "agree")
      .map((p) => ({ id: p.id, name: p.name }));
    const di = room.players
      .filter((p) => room.answers[p.id] === "disagree")
      .map((p) => ({ id: p.id, name: p.name }));
    const isTie = ag.length === di.length;
    const minority = ag.length < di.length ? ag : di;
    if (!isTie)
      minority.forEach((pl) => {
        const p = room.players.find((x) => x.id === pl.id);
        if (p) p.score += 75;
      });
    else
      room.players.forEach((p) => {
        if (room.answers[p.id]) p.score += 30;
      });
    result = { agreers: ag, disagreers: di };
  } else if (gt === "roast_room") {
    const vc = {};
    Object.values(room.votes).forEach((v) => {
      vc[v] = (vc[v] || 0) + 1;
    });
    const max = Math.max(...Object.values(vc), 0);
    const winners = Object.keys(vc).filter((id) => vc[id] === max);
    winners.forEach((id) => {
      const p = room.players.find((x) => x.id === id);
      if (p) p.score += 150;
    });
    result = { voteCounts: vc, winnerIds: winners };
  } else if (gt === "red_flag_radar") {
    const red = room.players
      .filter((p) => room.answers[p.id] === "red")
      .map((p) => ({ id: p.id, name: p.name }));
    const green = room.players
      .filter((p) => room.answers[p.id] === "green")
      .map((p) => ({ id: p.id, name: p.name }));
    (red.length < green.length ? red : green).forEach((pl) => {
      const p = room.players.find((x) => x.id === pl.id);
      if (p) p.score += 50;
    });
    result = { red, green };
  } else if (gt === "vibe_check") {
    const correct = {},
      total = {};
    room.players.forEach((p) => {
      if (!room.matchGuesses[p.id]) return;
      Object.entries(room.matchGuesses[p.id]).forEach(([tid, guess]) => {
        total[tid] = (total[tid] || 0) + 1;
        if (guess === room.answers[tid]) {
          const gp = room.players.find((x) => x.id === p.id);
          if (gp) gp.score += 100;
          correct[tid] = (correct[tid] || 0) + 1;
        }
      });
    });
    room.players.forEach((p) => {
      const t = total[p.id] || 0;
      const c = correct[p.id] || 0;
      if (t > 0 && c / t < 0.3) p.score += 75;
    });
    result = { correctGuesses: correct, totalGuesses: total };
  } else if (gt === "debate_pit") {
    const vc = {};
    room.debaterIds.forEach((id) => {
      vc[id] = 0;
    });
    Object.values(room.votes).forEach((v) => {
      if (vc[v] !== undefined) vc[v]++;
    });
    const max = Math.max(...Object.values(vc));
    const winners = Object.keys(vc).filter((id) => vc[id] === max);
    winners.forEach((id) => {
      const p = room.players.find((x) => x.id === id);
      if (p) p.score += 150;
    });
    result = { voteCounts: vc, winnerIds: winners };
  }
  // ── NEW GAME RESOLVERS ──
  else if (gt === "word_association") {
    const answerCount = {};
    Object.values(room.answers).forEach((a) => {
      const key = String(a).toLowerCase().trim();
      answerCount[key] = (answerCount[key] || 0) + 1;
    });
    const max = Math.max(...Object.values(answerCount), 0);
    const topAnswers = Object.keys(answerCount).filter(
      (k) => answerCount[k] === max,
    );
    room.players.forEach((p) => {
      if (room.answers[p.id] !== undefined) {
        const key = String(room.answers[p.id]).toLowerCase().trim();
        if (topAnswers.includes(key)) p.score += 100;
      }
    });
    result = { answerCount, topAnswers };
  } else if (
    [
      "emoji_story",
      "finish_the_sentence",
      "unhinged_advice",
      "confessions",
      "whose_line",
    ].includes(gt)
  ) {
    // voted funniest/best
    const vc = {};
    Object.values(room.votes).forEach((v) => {
      vc[v] = (vc[v] || 0) + 1;
    });
    const max = Math.max(...Object.values(vc), 0);
    const winners = Object.keys(vc).filter((id) => vc[id] === max);
    winners.forEach((id) => {
      const p = room.players.find((x) => x.id === id);
      if (p) p.score += 150;
    });
    result = { voteCounts: vc, winnerIds: winners };
  } else if (["this_or_that", "pick_your_poison"].includes(gt)) {
    const a = room.players
      .filter((p) => room.answers[p.id] === "a")
      .map((p) => ({ id: p.id, name: p.name }));
    const b = room.players
      .filter((p) => room.answers[p.id] === "b")
      .map((p) => ({ id: p.id, name: p.name }));
    const minority = a.length <= b.length ? a : b;
    minority.forEach((pl) => {
      const p = room.players.find((x) => x.id === pl.id);
      if (p) p.score += 50;
    });
    result = { aVoters: a, bVoters: b };
  } else if (gt === "speed_round") {
    const yes = room.players
      .filter((p) => room.answers[p.id] === "a")
      .map((p) => ({ id: p.id, name: p.name }));
    const no = room.players
      .filter((p) => room.answers[p.id] === "b")
      .map((p) => ({ id: p.id, name: p.name }));
    const minority = yes.length <= no.length ? yes : no;
    minority.forEach((pl) => {
      const p = room.players.find((x) => x.id === pl.id);
      if (p) p.score += 75;
    });
    result = { aVoters: yes, bVoters: no };
  } else if (gt === "burn_or_build") {
    const burns = room.players
      .filter((p) => room.answers[p.id] === "a")
      .map((p) => ({ id: p.id, name: p.name }));
    const builds = room.players
      .filter((p) => room.answers[p.id] === "b")
      .map((p) => ({ id: p.id, name: p.name }));
    const minority = burns.length <= builds.length ? burns : builds;
    minority.forEach((pl) => {
      const p = room.players.find((x) => x.id === pl.id);
      if (p) p.score += 50;
    });
    result = { aVoters: burns, bVoters: builds };
  } else if (gt === "rate_that_take") {
    const ag = room.players
      .filter((p) => room.answers[p.id] === "agree")
      .map((p) => ({ id: p.id, name: p.name }));
    const di = room.players
      .filter((p) => room.answers[p.id] === "disagree")
      .map((p) => ({ id: p.id, name: p.name }));
    const minority = ag.length < di.length ? ag : di;
    if (ag.length !== di.length)
      minority.forEach((pl) => {
        const p = room.players.find((x) => x.id === pl.id);
        if (p) p.score += 75;
      });
    else
      room.players.forEach((p) => {
        if (room.answers[p.id]) p.score += 30;
      });
    result = { agreers: ag, disagreers: di };
  } else if (gt === "superlatives") {
    const vc = {};
    room.players.forEach((p) => {
      vc[p.id] = 0;
    });
    Object.values(room.votes).forEach((v) => {
      vc[v] = (vc[v] || 0) + 1;
    });
    const max = Math.max(...Object.values(vc), 0);
    const winners = room.players.filter((p) => vc[p.id] === max);
    winners.forEach((p) => {
      p.score += 50;
    });
    result = { voteCounts: vc, winnerIds: winners.map((p) => p.id) };
  }

  room.roundResult = result;
  room.phase = "results";
  broadcast(room.code);
}

// ══════════════════════════════════════
// SOCKET.IO
// ══════════════════════════════════════
io.on("connection", (socket) => {
  socket.on("create_room", ({ name }, cb) => {
    const room = createRoom(socket.id, name);
    socket.join(room.code);
    cb({ ok: true, code: room.code, room: sanitize(room) });
  });

  socket.on("join_room", ({ code, name }, cb) => {
    const room = getRoom(code.toUpperCase());
    if (!room) return cb({ ok: false, error: "Room not found" });
    if (room.phase !== "lobby")
      return cb({ ok: false, error: "Game already started" });
    if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase()))
      return cb({ ok: false, error: "Name taken!" });
    room.players.push({ id: socket.id, name, score: 0, isHost: false });
    socket.join(code.toUpperCase());
    broadcast(code.toUpperCase());
    cb({ ok: true, room: sanitize(room) });
  });

  socket.on("select_game", ({ code, gameType }) => {
    const room = getRoom(code);
    if (!room || room.host !== socket.id || !GAME_CATALOGUE[gameType]) return;
    room.gameType = gameType;
    broadcast(code);
  });

  socket.on("start_game", ({ code, maxRounds }) => {
    const room = getRoom(code);
    if (!room || room.host !== socket.id) return;
    if (!room.gameType) return socket.emit("error_msg", "Select a game first!");
    const cat = GAME_CATALOGUE[room.gameType];
    if (room.players.length < cat.minPlayers)
      return socket.emit(
        "error_msg",
        `Need ${cat.minPlayers}+ players for ${cat.title}`,
      );
    room.maxRounds = maxRounds || 5;
    startRound(room);
  });

  socket.on("submit_answer", ({ code, answer }) => {
    const room = getRoom(code);
    if (
      !room ||
      !["answering", "spotlight_write", "debate_write"].includes(room.phase)
    )
      return;
    if (answer === undefined || answer === null) return;
    if (room.gameType === "two_truths" && socket.id !== room.spotlightId)
      return;
    if (room.gameType === "debate_pit" && !room.debaterIds.includes(socket.id))
      return;
    room.answers[socket.id] = answer;
    broadcast(code);
    if (checkAllAnswered(room)) {
      const needVote = [
        "guess_the_liar",
        "two_truths",
        "roast_room",
        "debate_pit",
        "emoji_story",
        "finish_the_sentence",
        "unhinged_advice",
        "confessions",
        "whose_line",
      ].includes(room.gameType);
      needVote ? advanceTo(room, "voting") : resolveRound(room);
    }
  });

  socket.on("submit_vote", ({ code, targetId }) => {
    const room = getRoom(code);
    if (!room || room.phase !== "voting") return;
    if (room.gameType === "guess_the_liar" && socket.id === targetId) return;
    if (room.gameType === "two_truths" && socket.id === room.spotlightId)
      return;
    if (room.gameType === "debate_pit") {
      if (room.debaterIds.includes(socket.id)) return;
      if (!room.debaterIds.includes(targetId)) return;
    }
    room.votes[socket.id] = targetId;
    broadcast(code);
    if (checkAllVoted(room)) resolveRound(room);
  });

  socket.on("submit_match_guesses", ({ code, guesses }) => {
    const room = getRoom(code);
    if (!room || room.phase !== "matching") return;
    room.matchGuesses[socket.id] = guesses;
    broadcast(code);
    if (checkAllMatched(room)) resolveRound(room);
  });

  socket.on("next_round", ({ code }) => {
    const room = getRoom(code);
    if (!room || room.host !== socket.id) return;
    room.round >= room.maxRounds
      ? (() => {
          room.phase = "scoreboard";
          broadcast(code);
        })()
      : startRound(room);
  });

  socket.on("play_again", ({ code }) => {
    const room = getRoom(code);
    if (!room || room.host !== socket.id) return;
    room.players.forEach((p) => {
      p.score = 0;
    });
    room.round = 0;
    room.usedQuestions = [];
    room.gameType = null;
    room.phase = "lobby";
    broadcast(code);
  });

  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((code) => {
      const room = rooms[code];
      const idx = room.players.findIndex((p) => p.id === socket.id);
      if (idx === -1) return;
      room.players.splice(idx, 1);
      if (room.players.length === 0) {
        delete rooms[code];
        return;
      }
      if (room.host === socket.id) {
        room.host = room.players[0].id;
        room.players[0].isHost = true;
      }
      if (
        ["answering", "spotlight_write", "debate_write"].includes(room.phase) &&
        checkAllAnswered(room)
      ) {
        const needVote = [
          "guess_the_liar",
          "two_truths",
          "roast_room",
          "debate_pit",
        ].includes(room.gameType);
        needVote ? advanceTo(room, "voting") : resolveRound(room);
      }
      if (room.phase === "voting" && checkAllVoted(room)) resolveRound(room);
      broadcast(code);
    });
  });
});

server.listen(4000, () => console.log("🚀 Pocket Party backend :4000"));
