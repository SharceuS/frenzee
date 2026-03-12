// ── Frenzee Backend — SSE + HTTP architecture ─────────────────────────────────
const express = require("express");
const http = require("http");
const cors = require("cors");

const { GAME_CATALOGUE } = require("./catalogue");
const streamRouter = require("./routes/stream");
const roomsRouter  = require("./routes/rooms");
const gameRouter   = require("./routes/game");
const arcadeRouter = require("./routes/arcade");

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// ── Health / Catalogue ────────────────────────────────────────────────────────
app.get("/health",    (_, res) => res.json({ ok: true }));
app.get("/catalogue", (_, res) => res.json(GAME_CATALOGUE));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/stream", streamRouter);   // GET  /stream/:code?playerId=xxx
app.use("/rooms",  roomsRouter);    // POST /rooms, POST /rooms/:code/join
app.use("/rooms",  gameRouter);     // POST /rooms/:code/game|start|answer|vote|match|round/*
app.use("/rooms",  arcadeRouter);   // POST /rooms/:code/draw/*|wordbomb|reaction|bomberman/*

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
server.listen(PORT, () => console.log(`🚀 Frenzee backend :${PORT}  (SSE + HTTP)`));
