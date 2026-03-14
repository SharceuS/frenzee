// ── Game Action Routes ────────────────────────────────────────────────────────
const { Router } = require("express");
const { getRoom } = require("../store");
const { sseSend } = require("../sse");
const { GAME_CATALOGUE } = require("../catalogue");
const {
  broadcast, startRound, resolveRound,
  checkAllAnswered, checkAllVoted, checkAllMatched,
  validateBingoClaim, advanceSpyfallTurn,
  resolveMafiaNight, startMafiaDoctorPhase, startMafiaDetectivePhase, resolveMafiaDay,
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
  // Vote lock: once submitted for the current vote round, a liar-game vote cannot be changed.
  if (room.gameType === "guess_the_liar" && room.votes[playerId] !== undefined) {
    return res.status(400).json({ ok: false, error: "Vote already locked" });
  }
  // Runoff validation: during a runoff only runoff candidates are valid targets.
  if (room.gameType === "guess_the_liar" && room.voteRunoffIds && !room.voteRunoffIds.includes(targetId)) {
    return res.status(400).json({ ok: false, error: "Target is not in the runoff" });
  }
  if (room.gameType === "spyfall" && playerId === targetId) return res.status(400).json({ ok: false, error: "Cannot vote for yourself" });
  if (room.gameType === "mafia") {
    const alive = room.mafiaAliveIds || [];
    if (!alive.includes(playerId)) return res.status(403).json({ ok: false, error: "Dead players cannot vote" });
    if (playerId === targetId) return res.status(400).json({ ok: false, error: "Cannot vote for yourself" });
    if (!alive.includes(targetId)) return res.status(400).json({ ok: false, error: "Target is not alive" });
  }
  if (room.gameType === "two_truths" && playerId === room.spotlightId) return res.status(403).json({ ok: false });
  if (room.gameType === "debate_pit") {
    if (room.debaterIds.includes(playerId)) return res.status(403).json({ ok: false });
    if (!room.debaterIds.includes(targetId)) return res.status(400).json({ ok: false });
  }
  const answerVoteGames = ["roast_room", "finish_the_sentence", "confessions", "whose_line", "emoji_story", "unhinged_advice"];
  if (answerVoteGames.includes(room.gameType) && playerId === targetId) return res.status(400).json({ ok: false });
  room.votes[playerId] = targetId;
  broadcast(room.code);
  if (checkAllVoted(room)) {
    if (room.gameType === "mafia") { resolveMafiaDay(room); return res.json({ ok: true }); }
    resolveRound(room);
  }
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
  // Mafia is a single-match game; only allow next from results screen.
  if (room.gameType === "mafia" && !["results", "scoreboard"].includes(room.phase)) {
    return res.status(400).json({ ok: false, error: "Cannot skip an active Mafia game" });
  }
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

// ── Spyfall ──────────────────────────────────────────────────────────────────

// POST /rooms/:code/spyfall/discuss  — current asker signals their question is done
router.post("/:code/spyfall/discuss", withRoom, (req, res) => {
  const room = req.room;
  const { playerId } = req.body;
  if (room.phase !== "spyfall_discussion") return res.status(400).json({ ok: false, error: "Not in discussion phase" });
  if (!room.players.find(p => p.id === playerId)) return res.status(403).json({ ok: false, error: "Not in room" });
  if (room.spyfallAskerId !== playerId) return res.status(403).json({ ok: false, error: "Not your turn to ask" });
  advanceSpyfallTurn(room);
  res.json({ ok: true });
});

// POST /rooms/:code/spyfall/accuse  — host skips remaining discussion turns and opens voting early
router.post("/:code/spyfall/accuse", withRoom, hostOnly, (req, res) => {
  const room = req.room;
  if (room.phase !== "spyfall_discussion") return res.status(400).json({ ok: false, error: "Not in discussion phase" });
  if (room._spyfallTurnTimer) { clearTimeout(room._spyfallTurnTimer); room._spyfallTurnTimer = null; }
  room.spyfallAskerId = null;
  room.spyfallTargetId = null;
  room.phase = "voting";
  broadcast(room.code);
  res.json({ ok: true });
});

// POST /rooms/:code/spyfall/guess  — spy submits their final location guess
router.post("/:code/spyfall/guess", withRoom, (req, res) => {
  const room = req.room;
  const { playerId, guess } = req.body;
  if (room.phase !== "spyfall_guess") return res.status(400).json({ ok: false, error: "Not in guess phase" });
  if (!room.players.find(p => p.id === playerId)) return res.status(403).json({ ok: false, error: "Not in room" });
  if (playerId !== room.spyfallSpyId) return res.status(403).json({ ok: false, error: "Only the spy can guess" });
  if (!guess || typeof guess !== "string" || !guess.trim()) return res.status(400).json({ ok: false, error: "Guess required" });
  room.spyfallGuess = guess.trim();
  resolveRound(room);
  res.json({ ok: true });
});

// ── Mafia ─────────────────────────────────────────────────────────────────────

// POST /rooms/:code/mafia/night-kill  — Mafia player selects a kill target
router.post("/:code/mafia/night-kill", withRoom, (req, res) => {
  const room = req.room;
  const { playerId, targetId } = req.body;
  if (room.phase !== "mafia_night") return res.status(400).json({ ok: false, error: "Not mafia night" });
  const alive = room.mafiaAliveIds || [];
  if (!alive.includes(playerId)) return res.status(403).json({ ok: false, error: "Not alive" });
  if (room.mafiaRoles[playerId] !== "mafia") return res.status(403).json({ ok: false, error: "Not Mafia" });
  if (!alive.includes(targetId) || room.mafiaRoles[targetId] === "mafia") {
    return res.status(400).json({ ok: false, error: "Invalid target" });
  }
  room.mafiaNightTargetId = targetId;
  startMafiaDoctorPhase(room);
  res.json({ ok: true });
});

// POST /rooms/:code/mafia/doctor-save  — Doctor selects a player to protect
router.post("/:code/mafia/doctor-save", withRoom, (req, res) => {
  const room = req.room;
  const { playerId, targetId } = req.body;
  if (room.phase !== "doctor_night") return res.status(400).json({ ok: false, error: "Not doctor night" });
  const alive = room.mafiaAliveIds || [];
  if (!alive.includes(playerId)) return res.status(403).json({ ok: false, error: "Not alive" });
  if (room.mafiaRoles[playerId] !== "doctor") return res.status(403).json({ ok: false, error: "Not the Doctor" });
  if (!alive.includes(targetId)) return res.status(400).json({ ok: false, error: "Target is not alive" });
  room.mafiaDoctorSaveId = targetId;
  startMafiaDetectivePhase(room);
  res.json({ ok: true });
});

// POST /rooms/:code/mafia/detective-check  — Detective investigates a player
router.post("/:code/mafia/detective-check", withRoom, (req, res) => {
  const room = req.room;
  const { playerId, targetId } = req.body;
  if (room.phase !== "detective_night") return res.status(400).json({ ok: false, error: "Not detective night" });
  const alive = room.mafiaAliveIds || [];
  if (!alive.includes(playerId)) return res.status(403).json({ ok: false, error: "Not alive" });
  if (room.mafiaRoles[playerId] !== "detective") return res.status(403).json({ ok: false, error: "Not the Detective" });
  if (playerId === targetId) return res.status(400).json({ ok: false, error: "Cannot investigate yourself" });
  if (!alive.includes(targetId)) return res.status(400).json({ ok: false, error: "Target is not alive" });
  room.mafiaDetectiveCheckId = targetId;
  resolveMafiaNight(room);
  res.json({ ok: true });
});

// POST /rooms/:code/mafia/day-start  — host ends discussion and opens voting
router.post("/:code/mafia/day-start", withRoom, hostOnly, (req, res) => {
  const room = req.room;
  if (room.phase !== "day_discussion") return res.status(400).json({ ok: false, error: "Not in day discussion" });
  if (room._mafiaDayTimer) { clearTimeout(room._mafiaDayTimer); room._mafiaDayTimer = null; }
  room.votes = {};
  room.phase = "voting";
  broadcast(room.code);
  room._mafiaVoteTimer = setTimeout(() => {
    const r = getRoom(room.code);
    if (!r || r.phase !== "voting" || r.gameType !== "mafia") return;
    resolveMafiaDay(r);
  }, 60000);
  res.json({ ok: true });
});

// ── Bingo ─────────────────────────────────────────────────────────────────────

// POST /rooms/:code/bingo/claim  — player claims bingo
// The server validates the claim deterministically from bingoCards + bingoCalledItems.
// No client-side mark state is trusted.
router.post("/:code/bingo/claim", withRoom, (req, res) => {
  const room = req.room;
  const { playerId, markedSlots } = req.body;
  if (room.phase !== "bingo_live") return res.status(400).json({ ok: false, error: "Not in bingo round" });
  const player = room.players.find(p => p.id === playerId);
  if (!player) return res.status(403).json({ ok: false, error: "Not in room" });
  // Reject duplicate claims from the same player.
  if ((room.bingoWinners || []).some(w => w.id === playerId)) {
    return res.json({ ok: true, alreadyClaimed: true });
  }
  const card = (room.bingoCards || {})[playerId];
  if (!card) return res.status(400).json({ ok: false, error: "No card found" });

  const calledSet = new Set(room.bingoCalledItems || []);
  const safeMarkedSlots = Array.isArray(markedSlots) ? markedSlots : [];
  const { valid, pattern } = validateBingoClaim(card, calledSet, safeMarkedSlots);

  if (!valid) return res.status(400).json({ ok: false, error: "No valid bingo pattern yet" });

  // Record winner.
  if (!room.bingoWinners) room.bingoWinners = [];
  room.bingoWinners.push({ id: playerId, name: player.name, pattern });
  broadcast(room.code);

  // Allow a short tie window (1 s) then resolve.
  // If another player claims in the same window they also get added before resolve.
  if (room.bingoWinners.length === 1) {
    setTimeout(() => {
      const r = require("../store").getRoom(room.code);
      if (!r || r.phase !== "bingo_live") return;
      resolveRound(r);
    }, 1000);
  }

  res.json({ ok: true, pattern });
});

module.exports = router;
