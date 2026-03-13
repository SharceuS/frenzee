// ── Bomb Arena WebSocket registry ─────────────────────────────────────────────
//
// Provides a dedicated low-latency WebSocket channel exclusively for Bomb
// Arena rooms.  All other Frenzee rooms continue to use SSE + HTTP.
//
// Upgrade endpoint: ws://host/ws/bomb-arena/:code?playerId=XXX
//
// Server → client messages: JSON  { type, data }
//   "bomber_grid"   — full grid snapshot when terrain changes
//   "bomber_state"  — player positions, bombs, explosions, powerups, gameOver, seq
//
// Input dispatch stays on HTTP POST /rooms/:code/bomberman/input so the
// server-side input queue is simpler and the round engine does not need to
// own a WebSocket read path.
//
// Teardown:
//   - cleanupBomberWsRoom(code) — called by endBombermanRound / room deletion
//   - client disconnect auto-removes the socket from the room set

const { WebSocketServer } = require("ws");
const { getRoom } = require("../store");

// roomCode → Set<WebSocket>
const wsByRoom = new Map();

let wss = null;  // single WebSocketServer instance shared across all rooms

// ── Upgrade handler ───────────────────────────────────────────────────────────

/**
 * handleBomberUpgrade — attach to the raw http.Server so WebSocket upgrades
 * to /ws/bomb-arena/:code are handled here without touching any Express routes.
 *
 * All non-Bomb-Arena upgrade requests are rejected immediately.
 */
function handleBomberUpgrade(server) {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    let url;
    try {
      // Use a placeholder base so URL parsing never throws on relative paths.
      url = new URL(req.url, "http://localhost");
    } catch {
      socket.destroy();
      return;
    }

    // Only handle /ws/bomb-arena/:code  — destroy anything else.
    const parts = url.pathname.split("/");
    // parts: ["", "ws", "bomb-arena", code]
    if (parts[1] !== "ws" || parts[2] !== "bomb-arena" || !parts[3]) {
      socket.destroy();
      return;
    }

    const code     = parts[3].toUpperCase();
    const playerId = url.searchParams.get("playerId");

    if (!playerId) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, { code, playerId });
    });
  });

  wss.on("connection", (ws, _req, { code, playerId }) => {
    // Validate room membership before accepting.
    const room = getRoom(code);
    if (!room || !room.players.some(p => p.id === playerId)) {
      ws.close(4001, "Not a member of room");
      return;
    }

    if (!wsByRoom.has(code)) wsByRoom.set(code, new Set());
    wsByRoom.get(code).add(ws);

    ws.on("close", () => {
      const set = wsByRoom.get(code);
      if (!set) return;
      set.delete(ws);
      if (set.size === 0) wsByRoom.delete(code);
    });

    // Absorb errors silently; the "close" event will fire and clean up.
    ws.on("error", () => {});

    // Immediately send the current grid and state so a late joiner or
    // reconnecting client does not wait for the next tick.
    const currentRoom = getRoom(code);
    if (currentRoom?.bomberGrid) {
      _sendToOne(ws, "bomber_grid", currentRoom.bomberGrid);
    }
  });
}

// ── Broadcast helpers ─────────────────────────────────────────────────────────

function _sendToOne(ws, type, data) {
  if (ws.readyState !== ws.OPEN) return;
  try {
    ws.send(JSON.stringify({ type, data }));
  } catch {
    // Socket closed mid-send; ignore.
  }
}

/**
 * bomberWsBroadcast — send a typed message to every WS client in the room.
 * Called from bomberman.js in place of (or alongside) sseBroadcast for the
 * bomber_grid and bomber_state events.
 */
function bomberWsBroadcast(roomCode, type, data) {
  const set = wsByRoom.get(roomCode);
  if (!set || set.size === 0) return;
  const msg = JSON.stringify({ type, data });
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(msg); } catch { /* ignore closed socket */ }
    }
  }
}

/**
 * cleanupBomberWsRoom — close all WS connections for a room and remove the
 * room entry.  Call this from endBombermanRound and from handleDisconnect
 * when the room is deleted.
 */
function cleanupBomberWsRoom(roomCode) {
  const set = wsByRoom.get(roomCode);
  if (!set) return;
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.close(1000, "Room ended");
  }
  wsByRoom.delete(roomCode);
}

module.exports = { handleBomberUpgrade, bomberWsBroadcast, cleanupBomberWsRoom };
