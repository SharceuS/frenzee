// ── SSE Stream Endpoint ───────────────────────────────────────────────────────
const { Router } = require("express");
const { getRoom, sanitize } = require("../store");
const { sseAdd, sseSend, schedulePendingDisconnect, cancelPendingDisconnect } = require("../sse");
const { handleDisconnect } = require("../games/rounds");

const router = Router();

// GET /stream/:code?playerId=xxx
router.get("/:code", (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId } = req.query;

  if (!playerId) return res.status(400).json({ error: "playerId required" });
  const room = getRoom(code);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (!room.players.find(p => p.id === playerId)) {
    return res.status(403).json({ error: "Not a member of this room" });
  }

  // ── Cancel any pending grace-window disconnect for this player ────────────
  // This covers mobile reconnects: the old stream closed but the grace timer
  // had not fired yet, so the player is still a room member.
  const wasReconnect = cancelPendingDisconnect(code, playerId);

  // If this is a reconnect and the player was in the voice participant set,
  // notify remaining voice peers so they can re-initiate WebRTC negotiation.
  if (wasReconnect && room.voiceParticipantIds && room.voiceParticipantIds.includes(playerId)) {
    const ts = Date.now();
    for (const peerId of room.voiceParticipantIds) {
      if (peerId !== playerId) sseSend(code, peerId, "voice_peer_joined", { fromPlayerId: playerId, ts, reconnect: true });
    }
  }

  // SSE headers
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",       // disable nginx buffering
    "Access-Control-Allow-Origin": "*",
  });
  res.flushHeaders();

  // Register + get cleanup fn (replaces any stale stream for this player)
  const cleanup = sseAdd(code, playerId, res);

  // Send current state immediately so the client renders right away
  sseSend(code, playerId, "room_update", sanitize(room));

  req.on("close", () => {
    cleanup();
    // ── Grace window: defer real disconnect to allow mobile reconnects ──────
    // Only run handleDisconnect after RECONNECT_GRACE_MS if the player has
    // not opened a new stream in the meantime.
    schedulePendingDisconnect(code, playerId, () => {
      handleDisconnect(code, playerId);
    });
  });
});

module.exports = router;

