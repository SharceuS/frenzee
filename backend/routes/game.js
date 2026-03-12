// ── Game Action Routes ────────────────────────────────────────────────────────
const { Router } = require("express");
const { getRoom } = require("../store");
const { sseSend } = require("../sse");
const { GAME_CATALOGUE } = require("../catalogue");
const {
  broadcast, startRound, resolveRound,
  checkAllAnswered, checkAllVoted, checkAllMatched,
} = require("../games/rounds");

const router = Router();

/** Middleware: resolve room + validate playerId membership */
function withRoom(req, res, next) {
  const code = req.params.code.toUpperCase();
  const room = getRoom(code);
  if (!room) return res.status(404).json({ ok: false, error: "Room not found" });
  req.room = room;
  next();
}

/** Middleware: also verify the caller is the host */
function hostOnly(req, res, next) {
  const { playerId } = req.body;
  if (req.room.host !== playerId) return res.status(403).json({ ok: false, error: "Host only" });
  next();
}

// POST /rooms/:code/game  — host selects a game
router.post("/:code/game", withRoom, hostOnly, (req, res) => {
  const { gameType } = req.body;
  if (!GAME_CATALOGUE[gameType]) return res.status(400).json({ ok: false, error: "Unknown game" });
  req.room.gameType = gameType;
  broadcast(req.room.code);
  res.json({ ok: true });
});

// POST /rooms/:code/start  — host starts the game
router.post("/:code/start", withRoom, hostOnly, (req, res) => {
  const room = req.room;
  if (!room.gameType) return res.status(400).json({ ok: false, error: "Select a game first!" });
  const cat = GAME_CATALOGUE[room.gameType];
  if (room.players.length < cat.minPlayers) {
    return res.status(400).json({ ok: false, error: `Need ${cat.minPlayers}+ players for ${cat.title}` });
  }
  const { maxRounds } = req.body;
  room.maxRounds = maxRounds || 5;
  startRound(room);
  res.json({ ok: true });
});

// POST /rooms/:code/answer  — player submits an answer
router.post("/:code/answer", withRoom, (req, res) => {
  const room = req.room;
  const { playerId, answer } = req.body;
  if (!["answering", "spotlight_write", "debate_write", "trivia"].includes(room.phase)) {
    return res.status(400).json({ ok: false, error: "Not the answering phase" });
  }
  if (answer === undefined || answer === null) return res.status(400).json({ ok: false, error: "Answer required" });
  if (room.gameType === "two_truths" && playerId !== room.spotlightId) return res.status(403).json({ ok: false });
  if (room.gameType === "debate_pit" && !room.debaterIds.includes(playerId)) return res.status(403).json({ ok: false });
  if (room.gameType === "trivia_blitz") {
    room.triviaAnswerTimes = room.triviaAnswerTimes || {};
    room.triviaAnswerTimes[playerId] = Date.now() - (room.triviaStartTime || Date.now());
  }
  room.answers[playerId] = answer;
  broadcast(room.code);
  if (checkAllAnswered(room)) {
    if (room.gameType === "trivia_blitz") { resolveRound(room); return res.json({ ok: true }); }
    const needVote = [
      "guess_the_liar", "two_truths", "roast_room", "debate_pit",
      "emoji_story", "finish_the_sentence", "unhinged_advice", "confessions", "whose_line",
    ].includes(room.gameType);
    needVote ? (() => { room.phase = "voting"; broadcast(room.code); })() : resolveRound(room);
  }
  res.json({ ok: true });
});

// POST /rooms/:code/vote  — player submits a vote
router.post("/:code/vote", withRoom, (req, res) => {
  const room = req.room;
  const { playerId, targetId } = req.body;
  if (room.phase !== "voting") return res.status(400).json({ ok: false, error: "Not voting phase" });
  if (room.gameType === "guess_the_liar" && playerId === targetId) return res.status(400).json({ ok: false });
  if (room.gameType === "two_truths" && playerId === room.spotlightId) return res.status(403).json({ ok: false });
  if (room.gameType === "debate_pit") {
    if (room.debaterIds.includes(playerId)) return res.status(403).json({ ok: false });
    if (!room.debaterIds.includes(targetId)) return res.status(400).json({ ok: false });
  }
  const answerVoteGames = ["roast_room", "finish_the_sentence", "confessions", "whose_line", "emoji_story", "unhinged_advice"];
  if (answerVoteGames.includes(room.gameType) && playerId === targetId) return res.status(400).json({ ok: false });
  room.votes[playerId] = targetId;
  broadcast(room.code);
  if (checkAllVoted(room)) resolveRound(room);
  res.json({ ok: true });
});

// POST /rooms/:code/match  — player submits vibe-check guesses
router.post("/:code/match", withRoom, (req, res) => {
  const room = req.room;
  const { playerId, guesses } = req.body;
  if (room.phase !== "matching") return res.status(400).json({ ok: false, error: "Not matching phase" });
  room.matchGuesses[playerId] = guesses;
  broadcast(room.code);
  if (checkAllMatched(room)) resolveRound(room);
  res.json({ ok: true });
});

// POST /rooms/:code/round/next  — host advances to next round
router.post("/:code/round/next", withRoom, hostOnly, (req, res) => {
  const room = req.room;
  if (room.round >= room.maxRounds) {
    room.phase = "scoreboard";
    broadcast(room.code);
  } else {
    startRound(room);
  }
  res.json({ ok: true });
});

// POST /rooms/:code/round/again  — host resets for another game
router.post("/:code/round/again", withRoom, hostOnly, (req, res) => {
  const room = req.room;
  room.players.forEach(p => { p.score = 0; });
  room.round = 0; room.usedQuestions = []; room.gameType = null; room.phase = "lobby";
  broadcast(room.code);
  res.json({ ok: true });
});

module.exports = router;
