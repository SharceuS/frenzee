// ── SSE Stream Endpoint ───────────────────────────────────────────────────────
const { Router } = require("express");
const { getRoom, sanitize } = require("../store");
const { sseAdd, sseSend } = require("../sse");
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

  // SSE headers
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",       // disable nginx buffering
    "Access-Control-Allow-Origin": "*",
  });
  res.flushHeaders();

  // Register + get cleanup fn
  const cleanup = sseAdd(code, playerId, res);

  // Send current state immediately so the client renders right away
  sseSend(code, playerId, "room_update", sanitize(room));

  req.on("close", () => {
    cleanup();
    handleDisconnect(code, playerId);
  });
});

module.exports = router;
