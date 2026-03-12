// ── Arcade-specific Routes ────────────────────────────────────────────────────
const { Router } = require("express");
const { getRoom } = require("../store");
const { sseBroadcast, sseSend } = require("../sse");
const { broadcast, resolveRound, getNextAliveBombPlayer, startBombTimer } = require("../games/rounds");
const { WORD_BOMB_PATTERNS } = require("../data/questions");

const router = Router();

function withRoom(req, res, next) {
  const code = req.params.code.toUpperCase();
  const room = getRoom(code);
  if (!room) return res.status(404).json({ ok: false, error: "Room not found" });
  req.room = room;
  next();
}

// ── Draw It ───────────────────────────────────────────────────────────────────

// POST /rooms/:code/draw/stroke  — relay a stroke to all other players
router.post("/:code/draw/stroke", withRoom, (req, res) => {
  const { playerId, stroke } = req.body;
  if (req.room.phase !== "drawing" || playerId !== req.room.drawItDrawerId) {
    return res.status(403).json({ ok: false });
  }
  sseBroadcast(req.room.code, "draw_stroke", stroke, playerId); // skip sender
  res.json({ ok: true });
});

// POST /rooms/:code/draw/clear  — clear the canvas
router.post("/:code/draw/clear", withRoom, (req, res) => {
  const { playerId } = req.body;
  if (req.room.phase !== "drawing" || playerId !== req.room.drawItDrawerId) {
    return res.status(403).json({ ok: false });
  }
  sseBroadcast(req.room.code, "draw_clear", {});
  res.json({ ok: true });
});

// POST /rooms/:code/draw/word  — drawer re-requests their secret word
router.post("/:code/draw/word", withRoom, (req, res) => {
  const { playerId } = req.body;
  const room = req.room;
  if (room.phase !== "drawing" || playerId !== room.drawItDrawerId) {
    return res.status(403).json({ ok: false });
  }
  sseSend(room.code, playerId, "draw_your_word", { word: room.drawItWord, diff: null });
  res.json({ ok: true });
});

// POST /rooms/:code/draw/guess  — player guesses the word
router.post("/:code/draw/guess", withRoom, (req, res) => {
  const { playerId, word } = req.body;
  const room = req.room;
  if (room.phase !== "drawing") return res.status(400).json({ ok: false });
  if (playerId === room.drawItDrawerId) return res.status(403).json({ ok: false });
  if ((room.drawItGuessedIds || []).includes(playerId)) return res.json({ ok: true, alreadyGuessed: true });

  const guess = String(word).toLowerCase().trim();
  const secret = (room.drawItWord || "").toLowerCase().trim();
  const guesserName = room.players.find(x => x.id === playerId)?.name ?? "?";

  if (guess === secret) {
    room.drawItGuessedIds = room.drawItGuessedIds || [];
    room.drawItGuessedIds.push(playerId);
    const order = room.drawItGuessedIds.length;
    const pts = Math.max(100, 500 - (order - 1) * 100);
    const guesser = room.players.find(x => x.id === playerId);
    if (guesser) guesser.score += pts;
    const drawer = room.players.find(x => x.id === room.drawItDrawerId);
    if (drawer) drawer.score += 50;
    const nonDrawers = room.players.filter(x => x.id !== room.drawItDrawerId);
    sseBroadcast(room.code, "draw_guess_correct", {
      guesserName, pts, guessedCount: room.drawItGuessedIds.length, total: nonDrawers.length,
    });
    broadcast(room.code);
    if (room.drawItGuessedIds.length >= nonDrawers.length) {
      if (room._drawTimer) { clearTimeout(room._drawTimer); room._drawTimer = null; }
      resolveRound(room);
    }
    res.json({ ok: true, correct: true });
  } else {
    sseBroadcast(room.code, "draw_guess_wrong", { guesserName, word: guess });
    res.json({ ok: true, correct: false });
  }
});

// ── Word Bomb ─────────────────────────────────────────────────────────────────

// POST /rooms/:code/wordbomb  — submit a word
router.post("/:code/wordbomb", withRoom, (req, res) => {
  const { playerId, word } = req.body;
  const room = req.room;
  if (room.phase !== "word_bomb") return res.status(400).json({ ok: false });
  if (playerId !== room.wordBombActiveId) return res.status(403).json({ ok: false, reason: "Not your turn" });

  const pattern = (room.wordBombPattern || "").toUpperCase();
  const w = String(word).toUpperCase().trim();
  const usedWords = room.wordBombUsedWords || [];
  const isValid = w.length >= 3 && w.includes(pattern) && !usedWords.includes(w);

  if (!isValid) {
    const reason = w.length < 3 ? "Too short!" : usedWords.includes(w) ? "Already used!" : `Must contain "${pattern}"!`;
    return res.json({ ok: false, reason });
  }

  room.wordBombUsedWords.push(w);
  if (room._bombTimer) { clearTimeout(room._bombTimer); room._bombTimer = null; }
  const p = room.players.find(x => x.id === playerId);
  if (p) p.score += 50;
  room.wordBombMinFuse = Math.max(3, (room.wordBombMinFuse || 8) - 0.4);
  const next = getNextAliveBombPlayer(room, playerId);
  if (!next) { resolveRound(room); return res.json({ ok: true }); }

  room.wordBombActiveId = next.id;
  room._bombPassCount = (room._bombPassCount || 0) + 1;
  if (room._bombPassCount % 6 === 0) {
    room.wordBombPattern = WORD_BOMB_PATTERNS[Math.floor(Math.random() * WORD_BOMB_PATTERNS.length)];
    room.wordBombUsedWords = [];
    sseBroadcast(room.code, "word_bomb_new_pattern", { pattern: room.wordBombPattern });
  }
  broadcast(room.code);
  startBombTimer(room);
  res.json({ ok: true });
});

// ── Reaction Tap ──────────────────────────────────────────────────────────────

// POST /rooms/:code/reaction  — player taps
router.post("/:code/reaction", withRoom, (req, res) => {
  const { playerId, clientMs } = req.body;
  const room = req.room;
  if (room.phase !== "reaction" || !room.reactionFired) return res.status(400).json({ ok: false });
  if (room.reactionTimes[playerId] !== undefined) return res.json({ ok: true, alreadyTapped: true });

  const ms = typeof clientMs === "number" && clientMs >= 0 && clientMs < 30000
    ? Math.round(clientMs)
    : Date.now() - (room.reactionStartTime || Date.now());
  room.reactionTimes[playerId] = ms;
  broadcast(room.code);
  if (Object.keys(room.reactionTimes).length >= room.players.length) {
    if (room._reactionTimer) { clearTimeout(room._reactionTimer); room._reactionTimer = null; }
    resolveRound(room);
  }
  res.json({ ok: true });
});

// ── Bomberman ─────────────────────────────────────────────────────────────────

// POST /rooms/:code/bomberman/input  — movement/bomb input (fire-and-forget)
router.post("/:code/bomberman/input", withRoom, (req, res) => {
  const { playerId, dx, dy, bomb } = req.body;
  const room = req.room;
  if (room.phase !== "bomberman") return res.status(400).json({ ok: false });
  if (!room.bomberInputs) room.bomberInputs = {};
  room.bomberInputs[playerId] = { dx: dx || 0, dy: dy || 0, bomb: !!bomb };
  res.json({ ok: true });
});

// POST /rooms/:code/bomberman/ping  — latency probe (returns ts immediately)
router.post("/:code/bomberman/ping", (req, res) => {
  res.json({ ts: req.body.ts ?? Date.now() });
});

module.exports = router;
