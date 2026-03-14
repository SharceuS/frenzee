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
  room.players.push({ id: playerId, name: name.trim(), avatar: avatar || null, score: 0, isHost: false, micEnabled: false, micMuted: true, micPermission: "unknown" });
  broadcast(code);
  res.json({ ok: true, playerId, room: sanitize(room) });
});

// POST /rooms/:code/profile  — update avatar (and optionally name) while in the room
router.post("/:code/profile", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, avatar, name } = req.body;
  const room = getRoom(code);
  if (!room) return res.status(404).json({ ok: false, error: "Room not found" });
  const player = room.players.find(p => p.id === playerId);
  if (!player) return res.status(403).json({ ok: false, error: "Not in room" });
  if (avatar !== undefined) player.avatar = avatar || null;
  if (name && typeof name === "string" && name.trim()) {
    const trimmed = name.trim();
    const taken = room.players.some(p => p.id !== playerId && p.name.toLowerCase() === trimmed.toLowerCase());
    if (taken) return res.status(400).json({ ok: false, error: "Name already taken" });
    player.name = trimmed;
  }
  broadcast(code);
  res.json({ ok: true });
});

// POST /rooms/:code/mic  — update mic preference state for a player
router.post("/:code/mic", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, micEnabled, micMuted, micPermission } = req.body;
  const room = getRoom(code);
  if (!room) return res.status(404).json({ ok: false, error: "Room not found" });
  const player = room.players.find(p => p.id === playerId);
  if (!player) return res.status(403).json({ ok: false, error: "Not in room" });
  if (micEnabled !== undefined) player.micEnabled = Boolean(micEnabled);
  if (micMuted   !== undefined) player.micMuted   = Boolean(micMuted);
  if (micPermission !== undefined && ["unknown", "granted", "denied"].includes(micPermission)) {
    player.micPermission = micPermission;
  }
  broadcast(code);
  res.json({ ok: true });
});

module.exports = router;
