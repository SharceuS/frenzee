// ── Room Management Routes ────────────────────────────────────────────────────
const { Router } = require("express");
const { randomUUID } = require("crypto");
const { createRoom, getRoom, sanitize } = require("../store");
const { broadcast } = require("../games/rounds");

const router = Router();

// POST /rooms  — create a new room (host)
router.post("/", (req, res) => {
  const { name, avatar } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ ok: false, error: "Name is required" });
  }
  const { playerId, room } = createRoom(name.trim(), avatar || null);
  res.json({ ok: true, code: room.code, playerId, room: sanitize(room) });
});

// POST /rooms/:code/join  — join an existing room
router.post("/:code/join", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { name, avatar } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ ok: false, error: "Name is required" });
  }
  const room = getRoom(code);
  if (!room) return res.status(404).json({ ok: false, error: "Room not found" });
  if (room.phase !== "lobby") return res.status(400).json({ ok: false, error: "Game already started" });
  if (room.players.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
    return res.status(400).json({ ok: false, error: "Name already taken!" });
  }
  const playerId = randomUUID();
  room.players.push({ id: playerId, name: name.trim(), avatar: avatar || null, score: 0, isHost: false });
  broadcast(code);
  res.json({ ok: true, playerId, room: sanitize(room) });
});

module.exports = router;
