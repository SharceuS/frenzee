// ── Bomberman Engine ──────────────────────────────────────────────────────────
const { getRoom } = require("../store");
const { sseBroadcast, sseSend } = require("../sse");
const { bomberWsBroadcast, cleanupBomberWsRoom } = require("./bomberWs");

const BOMBER_COLS = 15;
const BOMBER_ROWS = 13;
const BOMBER_TICK = 50;        // 20 fps
const BOMBER_GRID_SPEED = 7.0; // tiles/s
const BOMBER_BOMB_MS = 2000;
const BOMBER_EXP_MS = 750;
const BOMBER_MAX_TIME = 180000;
const BOMBER_SPAWNS = [
  { r: 1, c: 1 }, { r: 1, c: 13 }, { r: 11, c: 1 }, { r: 11, c: 13 },
];

function generateBomberGrid() {
  const grid = [];
  for (let r = 0; r < BOMBER_ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < BOMBER_COLS; c++) {
      if (r === 0 || r === BOMBER_ROWS - 1 || c === 0 || c === BOMBER_COLS - 1) {
        grid[r][c] = 1;
      } else if (r % 2 === 0 && c % 2 === 0) {
        grid[r][c] = 1;
      } else {
        grid[r][c] = 0;
      }
    }
  }
  for (let r = 1; r < BOMBER_ROWS - 1; r++) {
    for (let c = 1; c < BOMBER_COLS - 1; c++) {
      if (grid[r][c] === 0 && Math.random() < 0.65) grid[r][c] = 2;
    }
  }
  const safeClear = (r, c) => {
    if (r > 0 && r < BOMBER_ROWS - 1 && c > 0 && c < BOMBER_COLS - 1) {
      if (!(r % 2 === 0 && c % 2 === 0)) grid[r][c] = 0;
    }
  };
  BOMBER_SPAWNS.forEach(({ r, c }) => {
    safeClear(r, c); safeClear(r - 1, c); safeClear(r + 1, c);
    safeClear(r, c - 1); safeClear(r, c + 1);
  });
  return grid;
}

function bomberIsSolid(grid, r, c) {
  if (r < 0 || r >= BOMBER_ROWS || c < 0 || c >= BOMBER_COLS) return true;
  return grid[r][c] === 1 || grid[r][c] === 2;
}

function bomberTileBlocked(grid, bombs, passBombKey, r, c) {
  if (bomberIsSolid(grid, r, c)) return true;
  return bombs.some(b => b.r === r && b.c === c && `${b.r},${b.c}` !== passBombKey);
}

function placeBomberBomb(room, player) {
  if (!player.bomberAlive) return;
  const r = player.bomberToR, c = player.bomberToC;
  if (room.bomberBombs.some(b => b.r === r && b.c === c)) return;
  player.bomberPassBombKey = `${r},${c}`;
  room.bomberBombs.push({ r, c, timer: BOMBER_BOMB_MS, ownerId: player.id, range: player.bomberRange || 1 });
}

function detonateBomberBomb(room, bomb) {
  const grid = room.bomberGrid;
  const now = Date.now();
  const exp = { tiles: [], centerR: bomb.r, centerC: bomb.c, expiresAt: now + BOMBER_EXP_MS };
  const dirs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dr, dc] of dirs) {
    const start = (dr === 0 && dc === 0) ? 0 : 1;
    const end = (dr === 0 && dc === 0) ? 0 : bomb.range;
    for (let i = start; i <= end; i++) {
      const tr = bomb.r + dr * i, tc = bomb.c + dc * i;
      if (tr < 0 || tr >= BOMBER_ROWS || tc < 0 || tc >= BOMBER_COLS) break;
      if (grid[tr][tc] === 1) break;
      exp.tiles.push({ r: tr, c: tc });
      if (grid[tr][tc] === 2) {
        grid[tr][tc] = 0;
        room.bomberGridDirty = true;
        if (Math.random() < 0.45) {
          if (!room.bomberPowerups) room.bomberPowerups = [];
          const types = ["range", "speed"];
          room.bomberPowerups.push({ r: tr, c: tc, type: types[Math.floor(Math.random() * types.length)] });
        }
        break;
      }
    }
  }
  room.bomberExplosions.push(exp);
  const chains = room.bomberBombs.filter(b => b !== bomb && exp.tiles.some(t => t.r === b.r && t.c === b.c));
  room.bomberBombs = room.bomberBombs.filter(b => b !== bomb);
  chains.forEach(b => detonateBomberBomb(room, b));
}

function broadcastBomberState(room) {
  // Increment the sequence counter so clients can detect dropped snapshots.
  room.bomberSeq = (room.bomberSeq ?? 0) + 1;
  const payload = {
    seq: room.bomberSeq,
    players: room.players.map(p => ({
      id: p.id,
      fromR: p.bomberFromR ?? null, fromC: p.bomberFromC ?? null,
      toR: p.bomberToR ?? null,     toC: p.bomberToC ?? null,
      progress: p.bomberMoveProgress ?? 1,
      speedMult: p.bomberSpeedMult ?? 1,
      alive: p.bomberAlive ?? true,
    })),
    bombs: room.bomberBombs,
    explosions: room.bomberExplosions,
    powerups: room.bomberPowerups,
    gameOver: room.bomberGameOver,
  };
  // Primary: WebSocket for low-latency delivery.
  bomberWsBroadcast(room.code, "bomber_state", payload);
  // Fallback: SSE for clients that have not yet upgraded to the WS transport.
  sseBroadcast(room.code, "bomber_state", payload);
}

function endBombermanRound(room, winnerId) {
  room.bomberGameOver = true;
  if (room._bomberLoop) { clearInterval(room._bomberLoop); room._bomberLoop = null; }
  if (room._bomberMaxTimer) { clearTimeout(room._bomberMaxTimer); room._bomberMaxTimer = null; }
  // Close all Bomb Arena WS connections after a short delay so clients
  // can receive the final bomber_state (gameOver: true) before teardown.
  setTimeout(() => cleanupBomberWsRoom(room.code), 5000);

  const { broadcast } = require("./rounds");
  const winner = room.players.find(p => p.id === winnerId);
  if (winner) winner.score = (winner.score || 0) + 300;
  room.roundResult = {
    gameType: "bomberman",
    winnerId: winnerId || null,
    winnerName: winner ? winner.name : null,
  };
  broadcast(room.code);
  setTimeout(() => {
    if (!getRoom(room.code)) return;
    room.phase = "results";
    broadcast(room.code);
  }, 2000);
}

function tickBomberman(room) {
  if (!room || room.phase !== "bomberman") return;
  const now = Date.now();
  const grid = room.bomberGrid;
  const inputs = room.bomberInputs || {};
  let dirty = false;

  for (const player of room.players.filter(p => p.bomberAlive)) {
    const inp = inputs[player.id] || { dx: 0, dy: 0, bomb: false };
    const speedMult = player.bomberSpeedMult || 1;
    const progressStep = BOMBER_GRID_SPEED * speedMult * (BOMBER_TICK / 1000);

    let ndr = Math.sign(Math.round(inp.dy || 0));
    let ndc = Math.sign(Math.round(inp.dx || 0));
    if (ndr !== 0 && ndc !== 0) ndc = 0;

    if (player.bomberMoveProgress < 1.0) {
      player.bomberMoveProgress += progressStep;
      if (player.bomberMoveProgress >= 1.0) {
        const overflow = player.bomberMoveProgress - 1.0;
        player.bomberFromR = player.bomberToR;
        player.bomberFromC = player.bomberToC;
        if (player.bomberPassBombKey) {
          const [pr, pc] = player.bomberPassBombKey.split(",").map(Number);
          if (player.bomberFromR !== pr || player.bomberFromC !== pc) player.bomberPassBombKey = null;
        }
        if ((ndr !== 0 || ndc !== 0) && !bomberTileBlocked(grid, room.bomberBombs, player.bomberPassBombKey, player.bomberFromR + ndr, player.bomberFromC + ndc)) {
          player.bomberToR = player.bomberFromR + ndr;
          player.bomberToC = player.bomberFromC + ndc;
          player.bomberMoveProgress = Math.max(0, overflow);
        } else {
          player.bomberMoveProgress = 1.0;
          player.bomberToR = player.bomberFromR;
          player.bomberToC = player.bomberFromC;
        }
      }
    } else {
      if ((ndr !== 0 || ndc !== 0) && !bomberTileBlocked(grid, room.bomberBombs, player.bomberPassBombKey, player.bomberFromR + ndr, player.bomberFromC + ndc)) {
        player.bomberToR = player.bomberFromR + ndr;
        player.bomberToC = player.bomberFromC + ndc;
        player.bomberMoveProgress = progressStep;
      }
    }

    const t = Math.min(player.bomberMoveProgress, 1.0);
    player.bomberX = player.bomberFromC + 0.5 + (player.bomberToC - player.bomberFromC) * t;
    player.bomberY = player.bomberFromR + 0.5 + (player.bomberToR - player.bomberFromR) * t;

    if (inp.bomb) {
      const before = room.bomberBombs.length;
      placeBomberBomb(room, player);
      if (room.bomberBombs.length !== before) dirty = true;
      inputs[player.id] = { ...inp, bomb: false };
    }
    dirty = true;
  }

  for (const bomb of [...room.bomberBombs]) {
    bomb.timer -= BOMBER_TICK;
    if (bomb.timer <= 0) { detonateBomberBomb(room, bomb); dirty = true; }
  }

  const expBefore = room.bomberExplosions.length;
  room.bomberExplosions = room.bomberExplosions.filter(e => e.expiresAt > now);
  if (room.bomberExplosions.length !== expBefore) dirty = true;

  for (const player of room.players.filter(p => p.bomberAlive)) {
    const tr = player.bomberToR ?? Math.floor(player.bomberY);
    const tc = player.bomberToC ?? Math.floor(player.bomberX);
    if (room.bomberExplosions.some(e => e.tiles.some(t => t.r === tr && t.c === tc))) {
      player.bomberAlive = false;
    }
    if (room.bomberPowerups) {
      const pr = player.bomberToR ?? Math.round(player.bomberY - 0.5);
      const pc = player.bomberToC ?? Math.round(player.bomberX - 0.5);
      const puIdx = room.bomberPowerups.findIndex(p => p.r === pr && p.c === pc);
      if (puIdx !== -1) {
        const pu = room.bomberPowerups[puIdx];
        room.bomberPowerups.splice(puIdx, 1);
        if (pu.type === "range") player.bomberRange = Math.min((player.bomberRange || 1) + 1, 7);
        if (pu.type === "speed") player.bomberSpeedMult = Math.min((player.bomberSpeedMult || 1) + 0.075, 1.35);
        dirty = true;
      }
    }
  }

  const alive = room.players.filter(p => p.bomberAlive);
  if (room.players.length > 1 && alive.length <= 1 && !room.bomberGameOver) {
    endBombermanRound(room, alive[0]?.id || null);
  } else if (room.players.length === 1 && alive.length === 0 && !room.bomberGameOver) {
    endBombermanRound(room, null);
  } else {
    if (room.bomberGridDirty) {
      room.bomberGridDirty = false;
      bomberWsBroadcast(room.code, "bomber_grid", room.bomberGrid);
      sseBroadcast(room.code, "bomber_grid", room.bomberGrid);
    }
    if (dirty) broadcastBomberState(room);
  }
}

function startBombermanGame(room, broadcastFn) {
  const grid = generateBomberGrid();
  room.bomberGrid = grid;
  room.bomberGridDirty = false;
  room.bomberBombs = [];
  room.bomberExplosions = [];
  room.bomberPowerups = [];
  room.bomberGameOver = false;
  room.bomberInputs = {};
  room.players.forEach((p, i) => {
    const spawn = BOMBER_SPAWNS[i % BOMBER_SPAWNS.length];
    p.bomberFromR = spawn.r; p.bomberFromC = spawn.c;
    p.bomberToR = spawn.r;   p.bomberToC = spawn.c;
    p.bomberMoveProgress = 1.0;
    p.bomberX = spawn.c + 0.5; p.bomberY = spawn.r + 0.5;
    p.bomberAlive = true; p.bomberRange = 1; p.bomberSpeedMult = 1;
    p.bomberPassBombKey = null;
  });
  room.phase = "bomberman";
  broadcastFn(room.code); // phase change so clients mount BombermanScreen
  bomberWsBroadcast(room.code, "bomber_grid", room.bomberGrid);
  sseBroadcast(room.code, "bomber_grid", room.bomberGrid);
  broadcastBomberState(room);
  room._bomberLoop = setInterval(() => tickBomberman(room), BOMBER_TICK);
  room._bomberMaxTimer = setTimeout(() => {
    if (!getRoom(room.code) || room.phase !== "bomberman") return;
    const alive = room.players.filter(p => p.bomberAlive);
    endBombermanRound(room, alive.length === 1 ? alive[0].id : null);
  }, BOMBER_MAX_TIME);
}

module.exports = { startBombermanGame, broadcastBomberState };
