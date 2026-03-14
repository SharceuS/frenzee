// ── WebRTC Voice Signaling Routes ─────────────────────────────────────────────
// All signaling travels via HTTP POST (client → server) and SSE targeted send
// (server → specific peer). No audio is relayed through this server.
const { Router } = require("express");
const { getRoom, sanitize } = require("../store");
const { sseBroadcast, sseSend } = require("../sse");
const { broadcast } = require("../games/rounds");

const router = Router();

// ── Shared helpers ────────────────────────────────────────────────────────────

function resolveRoom(req, res) {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.body;
  if (!playerId) return res.status(400).json({ ok: false, error: "playerId required" });
  const room = getRoom(code);
  if (!room) return res.status(404).json({ ok: false, error: "Room not found" });
  if (!room.players.find(p => p.id === playerId)) {
    return res.status(403).json({ ok: false, error: "Not in room" });
  }
  return { code, room, playerId };
}

// ── POST /rooms/:code/voice/join ──────────────────────────────────────────────
// Adds the caller to the voice participant set and notifies current participants.
router.post("/:code/voice/join", (req, res) => {
  const ctx = resolveRoom(req, res);
  if (!ctx) return;
  const { code, room, playerId } = ctx;

  if (!room.voiceParticipantIds) room.voiceParticipantIds = [];
  if (room.voiceParticipantIds.includes(playerId)) {
    return res.json({ ok: true, voiceParticipantIds: room.voiceParticipantIds });
  }

  room.voiceParticipantIds.push(playerId);

  // Notify each existing participant so they can initiate offer/answer exchange.
  const others = room.voiceParticipantIds.filter(id => id !== playerId);
  for (const peerId of others) {
    sseSend(code, peerId, "voice_peer_joined", { fromPlayerId: playerId });
  }

  // Broadcast updated room state (voiceParticipantIds changed).
  broadcast(code);
  res.json({ ok: true, voiceParticipantIds: room.voiceParticipantIds });
});

// ── POST /rooms/:code/voice/leave ─────────────────────────────────────────────
// Removes the caller from the voice participant set and notifies remaining peers.
router.post("/:code/voice/leave", (req, res) => {
  const ctx = resolveRoom(req, res);
  if (!ctx) return;
  const { code, room, playerId } = ctx;

  if (!room.voiceParticipantIds) room.voiceParticipantIds = [];
  room.voiceParticipantIds = room.voiceParticipantIds.filter(id => id !== playerId);

  // Notify remaining participants.
  for (const peerId of room.voiceParticipantIds) {
    sseSend(code, peerId, "voice_peer_left", { fromPlayerId: playerId });
  }

  broadcast(code);
  res.json({ ok: true });
});

// ── POST /rooms/:code/voice/offer ─────────────────────────────────────────────
// Forwards an SDP offer to a specific peer. Body: { playerId, toPlayerId, sdp }
router.post("/:code/voice/offer", (req, res) => {
  const ctx = resolveRoom(req, res);
  if (!ctx) return;
  const { code, room, playerId } = ctx;

  const { toPlayerId, sdp } = req.body;
  if (!toPlayerId || !sdp) {
    return res.status(400).json({ ok: false, error: "toPlayerId and sdp required" });
  }
  if (toPlayerId === playerId) {
    return res.status(400).json({ ok: false, error: "Cannot signal to self" });
  }
  if (!room.players.find(p => p.id === toPlayerId)) {
    return res.status(404).json({ ok: false, error: "Target player not in room" });
  }

  sseSend(code, toPlayerId, "voice_offer", { fromPlayerId: playerId, toPlayerId, sdp });
  res.json({ ok: true });
});

// ── POST /rooms/:code/voice/answer ────────────────────────────────────────────
// Forwards an SDP answer to a specific peer. Body: { playerId, toPlayerId, sdp }
router.post("/:code/voice/answer", (req, res) => {
  const ctx = resolveRoom(req, res);
  if (!ctx) return;
  const { code, room, playerId } = ctx;

  const { toPlayerId, sdp } = req.body;
  if (!toPlayerId || !sdp) {
    return res.status(400).json({ ok: false, error: "toPlayerId and sdp required" });
  }
  if (toPlayerId === playerId) {
    return res.status(400).json({ ok: false, error: "Cannot signal to self" });
  }
  if (!room.players.find(p => p.id === toPlayerId)) {
    return res.status(404).json({ ok: false, error: "Target player not in room" });
  }

  sseSend(code, toPlayerId, "voice_answer", { fromPlayerId: playerId, toPlayerId, sdp });
  res.json({ ok: true });
});

// ── POST /rooms/:code/voice/ice ───────────────────────────────────────────────
// Forwards an ICE candidate to a specific peer. Body: { playerId, toPlayerId, candidate }
router.post("/:code/voice/ice", (req, res) => {
  const ctx = resolveRoom(req, res);
  if (!ctx) return;
  const { code, room, playerId } = ctx;

  const { toPlayerId, candidate } = req.body;
  if (!toPlayerId || candidate === undefined) {
    return res.status(400).json({ ok: false, error: "toPlayerId and candidate required" });
  }
  if (toPlayerId === playerId) {
    return res.status(400).json({ ok: false, error: "Cannot signal to self" });
  }
  if (!room.players.find(p => p.id === toPlayerId)) {
    return res.status(404).json({ ok: false, error: "Target player not in room" });
  }

  sseSend(code, toPlayerId, "voice_ice_candidate", { fromPlayerId: playerId, toPlayerId, candidate });
  res.json({ ok: true });
});

module.exports = router;
