// ── SSE Connection Manager ────────────────────────────────────────────────────
// streams: Map<roomCode, Map<playerId, Response>>
const streams = new Map();

const SSE_HEARTBEAT_MS = 25000;

// ── Reconnect grace window ────────────────────────────────────────────────────
// How long (ms) to wait before treating an SSE close as a real disconnect.
// Covers background/tab-switch/phone-lock on mobile.
const RECONNECT_GRACE_MS = 60_000; // 60 seconds

// pendingDisconnects: Map<roomCode, Map<playerId, TimeoutId>>
const pendingDisconnects = new Map();

/**
 * Schedule a pending disconnect for a player.
 * onExpire is called when the timer fires (= real disconnect).
 * If a pending entry already exists for this player it is replaced.
 */
function schedulePendingDisconnect(code, playerId, onExpire) {
  if (!pendingDisconnects.has(code)) pendingDisconnects.set(code, new Map());
  const map = pendingDisconnects.get(code);
  // Clear any existing timer before replacing.
  if (map.has(playerId)) clearTimeout(map.get(playerId));
  const timer = setTimeout(() => {
    const m = pendingDisconnects.get(code);
    if (m) { m.delete(playerId); if (m.size === 0) pendingDisconnects.delete(code); }
    onExpire();
  }, RECONNECT_GRACE_MS);
  map.set(playerId, timer);
}

/**
 * Cancel a pending disconnect (called when player reconnects in time).
 * Returns true if a pending timer was found and cancelled.
 */
function cancelPendingDisconnect(code, playerId) {
  const map = pendingDisconnects.get(code);
  if (!map || !map.has(playerId)) return false;
  clearTimeout(map.get(playerId));
  map.delete(playerId);
  if (map.size === 0) pendingDisconnects.delete(code);
  return true;
}

/**
 * Register an SSE response for a player in a room and start heartbeat.
 * Returns cleanup fn (called on disconnect).
 */
function sseAdd(code, playerId, res) {
  if (!streams.has(code)) streams.set(code, new Map());
  streams.get(code).set(playerId, res);

  const hb = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { /* connection closed */ }
  }, SSE_HEARTBEAT_MS);

  return () => {
    clearInterval(hb);
    const room = streams.get(code);
    if (room) {
      room.delete(playerId);
      if (room.size === 0) streams.delete(code);
    }
  };
}

/**
 * Broadcast a named SSE event to every client subscribed to a room.
 * @param {string} except  Optional playerId to skip (e.g. skip the sender of a draw stroke)
 */
function sseBroadcast(code, event, data, except) {
  const room = streams.get(code);
  if (!room) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [pid, res] of room) {
    if (pid === except) continue;
    try { res.write(payload); } catch { /* dead connection */ }
  }
}

/**
 * Send a named SSE event to one specific player.
 */
function sseSend(code, playerId, event, data) {
  const room = streams.get(code);
  if (!room) return;
  const res = room.get(playerId);
  if (!res) return;
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch { /* dead connection */ }
}

/** Number of active SSE connections for a room */
function sseCount(code) {
  return streams.get(code)?.size ?? 0;
}

module.exports = {
  sseAdd, sseBroadcast, sseSend, sseCount,
  schedulePendingDisconnect, cancelPendingDisconnect,
};

