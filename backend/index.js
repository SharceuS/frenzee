// ── Frenzee Backend — SSE + HTTP + Bomb Arena WebSocket ───────────────────────
const express = require("express");
const http = require("http");
const cors = require("cors");

const { getActiveCatalogue } = require("./catalogue");
const streamRouter = require("./routes/stream");
const roomsRouter  = require("./routes/rooms");
const gameRouter   = require("./routes/game");
const arcadeRouter = require("./routes/arcade");
const voiceRouter  = require("./routes/voice");
const { handleBomberUpgrade } = require("./games/bomberWs");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// ── Health / Catalogue ────────────────────────────────────────────────────────
app.get("/health",    (_, res) => res.json({ ok: true }));
// Returns only active games; retired entries are excluded.
app.get("/catalogue", (_, res) => res.json(getActiveCatalogue()));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/stream", streamRouter);   // GET  /stream/:code?playerId=xxx
app.use("/rooms",  roomsRouter);    // POST /rooms, POST /rooms/:code/join
app.use("/rooms",  gameRouter);     // POST /rooms/:code/game|start|answer|vote|match|round/*
app.use("/rooms",  arcadeRouter);   // POST /rooms/:code/draw/*|wordbomb|reaction|bomberman/*
app.use("/rooms",  voiceRouter);    // POST /rooms/:code/voice/join|leave|offer|answer|ice
app.use("/",       voiceRouter);    // GET  /voice/config

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Bomb Arena WebSocket upgrade — all other routes stay on SSE + HTTP.
handleBomberUpgrade(server);

server.listen(PORT, () => console.log(`🚀 Frenzee backend :${PORT}  (SSE + HTTP + Bomb Arena WS)`));
