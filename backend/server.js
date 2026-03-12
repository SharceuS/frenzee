const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const {
  GUESS_THE_LIAR,
  TWO_TRUTHS_TOPICS,
  MOST_LIKELY_TO,
  NEVER_HAVE_I_EVER,
  WOULD_YOU_RATHER,
  HOT_TAKES,
  ROAST_ROOM,
  RED_FLAG_RADAR,
  VIBE_CHECK_CATEGORIES,
  DEBATE_PIT_TOPICS,
  WORD_ASSOCIATION,
  EMOJI_STORIES,
  FINISH_THE_SENTENCE,
  THIS_OR_THAT,
  UNHINGED_ADVICE,
  CONFESSIONS_PROMPTS,
  SPEED_ROUND,
  PICK_YOUR_POISON,
  BURN_OR_BUILD,
  RATE_THAT_TAKE,
  SUPERLATIVES,
  WHOSE_LINE_PROMPTS,
  TRIVIA_BLITZ,
  DRAW_IT_WORDS,
  WORD_BOMB_PATTERNS,
} = require("./data/questions");

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ══════════════════════════════════════
// GAME CATALOGUE
// ══════════════════════════════════════
const GAME_CATALOGUE = {
  guess_the_liar: {
    id: "guess_the_liar",
    title: "Guess the Liar",
    emoji: "🕵️",
    description: "One player lies about the question. Catch them!",
    category: "popular",
    minPlayers: 3,
    maxPlayers: 12,
    color: "#7C3AED",
  },
  two_truths: {
    id: "two_truths",
    title: "Two Truths & a Lie",
    emoji: "✌️",
    description: "2 truths + 1 lie per player. Fool your friends.",
    category: "popular",
    minPlayers: 3,
    maxPlayers: 10,
    color: "#EC4899",
  },
  most_likely_to: {
    id: "most_likely_to",
    title: "Most Likely To",
    emoji: "🏆",
    description: "Vote who in the group is most likely to do it.",
    category: "popular",
    minPlayers: 3,
    maxPlayers: 12,
    color: "#F59E0B",
  },
  never_have_i_ever: {
    id: "never_have_i_ever",
    title: "Never Have I Ever",
    emoji: "🙅",
    description: "I HAVE or I NEVER. See who's done what. No filter.",
    category: "popular",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#10B981",
  },
  would_you_rather: {
    id: "would_you_rather",
    title: "Would You Rather",
    emoji: "🤔",
    description: "Pick A or B. See how the group splits.",
    category: "popular",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#3B82F6",
  },
  hot_takes: {
    id: "hot_takes",
    title: "Hot Takes",
    emoji: "🔥",
    description: "Agree or disagree. Minority opinion earns bonus points.",
    category: "popular",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#EF4444",
  },
  roast_room: {
    id: "roast_room",
    title: "Roast Room",
    emoji: "🎭",
    description: "Answer a prompt anonymously. Vote for the funniest.",
    category: "popular",
    minPlayers: 3,
    maxPlayers: 10,
    color: "#F97316",
  },
  finish_the_sentence: {
    id: "finish_the_sentence",
    title: "Finish the Sentence",
    emoji: "✏️",
    description: "Complete the prompt. Everyone votes for the best ending.",
    category: "popular",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#8B5CF6",
  },
  this_or_that: {
    id: "this_or_that",
    title: "This or That",
    emoji: "⚡",
    description: "Rapid fire A vs B. See how much you match the group.",
    category: "popular",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#06B6D4",
  },
  superlatives: {
    id: "superlatives",
    title: "Superlatives",
    emoji: "🏅",
    description: "Vote who in the group fits each wild superlative.",
    category: "popular",
    minPlayers: 3,
    maxPlayers: 12,
    color: "#F59E0B",
  },
  red_flag_radar: {
    id: "red_flag_radar",
    title: "Red Flag Radar",
    emoji: "🚩",
    description: "Red or green flag? Vote on wild dating scenarios.",
    category: "popular",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#EF4444",
  },
  vibe_check: {
    id: "vibe_check",
    title: "Vibe Check",
    emoji: "✨",
    description: "Describe yourself as X. Others guess whose vibe is whose.",
    category: "original",
    minPlayers: 3,
    maxPlayers: 8,
    color: "#8B5CF6",
  },
  debate_pit: {
    id: "debate_pit",
    title: "Debate Pit",
    emoji: "⚔️",
    description: "Two players debate absurd topics. Crowd votes the winner.",
    category: "original",
    minPlayers: 3,
    maxPlayers: 12,
    color: "#06B6D4",
  },
  word_association: {
    id: "word_association",
    title: "Word Association",
    emoji: "🔗",
    description:
      "See one word. Type your instant reaction. Match the majority.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#10B981",
  },
  emoji_story: {
    id: "emoji_story",
    title: "Emoji Story",
    emoji: "📖",
    description: "A string of emojis. Write the funniest story behind them.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#EC4899",
  },
  unhinged_advice: {
    id: "unhinged_advice",
    title: "Unhinged Advice",
    emoji: "🤪",
    description: "Absurd scenarios. Give the most unhinged advice you can.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#F97316",
  },
  confessions: {
    id: "confessions",
    title: "Anonymous Confessions",
    emoji: "🤫",
    description: "Write anonymous confessions. Others guess who wrote what.",
    category: "original",
    minPlayers: 3,
    maxPlayers: 10,
    color: "#7C3AED",
  },
  speed_round: {
    id: "speed_round",
    title: "Speed Round",
    emoji: "⚡",
    description: "Yes or No about yourself. Minority opinion wins each round.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#EF4444",
  },
  pick_your_poison: {
    id: "pick_your_poison",
    title: "Pick Your Poison",
    emoji: "☠️",
    description: "Extreme would-you-rathers. No good options here.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#DC2626",
  },
  burn_or_build: {
    id: "burn_or_build",
    title: "Burn or Build",
    emoji: "🔥",
    description: "Keep it or scrap it? Vote on society's most annoying things.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#F59E0B",
  },
  rate_that_take: {
    id: "rate_that_take",
    title: "Rate That Take",
    emoji: "⭐",
    description: "Wild opinions revealed. Agree or disagree as a group.",
    category: "original",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#A855F7",
  },
  whose_line: {
    id: "whose_line",
    title: "Whose Line Is It?",
    emoji: "💬",
    description: "Everyone writes something. Others guess who wrote what.",
    category: "original",
    minPlayers: 3,
    maxPlayers: 10,
    color: "#3B82F6",
  },
  // ── ARCADE GAMES ──────────────────────────────────────────────────────────
  trivia_blitz: {
    id: "trivia_blitz",
    title: "Trivia Blitz",
    emoji: "🧠",
    description: "Kahoot-style! 4 answers, 20 seconds. Speed = more points.",
    category: "arcade",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#8B5CF6",
  },
  draw_it: {
    id: "draw_it",
    title: "Draw It!",
    emoji: "🎨",
    description: "Draw a secret word. Others race to guess it in real-time.",
    category: "arcade",
    minPlayers: 3,
    maxPlayers: 8,
    color: "#F59E0B",
  },
  word_bomb: {
    id: "word_bomb",
    title: "Word Bomb",
    emoji: "💣",
    description: "Type a word with the pattern before the bomb explodes!",
    category: "arcade",
    minPlayers: 3,
    maxPlayers: 10,
    color: "#EF4444",
  },
  reaction_tap: {
    id: "reaction_tap",
    title: "Reaction Tap",
    emoji: "⚡",
    description: "Screen flashes — tap instantly. Fastest reflexes win!",
    category: "arcade",
    minPlayers: 2,
    maxPlayers: 12,
    color: "#10B981",
  },
  bomberman: {
    id: "bomberman",
    title: "Bomb Arena",
    emoji: "💥",
    description:
      "Free movement arena! Place bombs to blast opponents. Last one standing wins!",
    category: "arcade",
    minPlayers: 1,
    maxPlayers: 4,
    color: "#EF4444",
  },
};

app.get("/catalogue", (_, res) => res.json(GAME_CATALOGUE));
app.get("/health", (_, res) => res.json({ ok: true }));

// ══════════════════════════════════════
// ROOM STORE
// ══════════════════════════════════════
const rooms = {};

function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function createRoom(hostId, hostName, avatar) {
  let code;
  do {
    code = genCode();
  } while (rooms[code]);
  rooms[code] = {
    code,
    host: hostId,
    players: [
      {
        id: hostId,
        name: hostName,
        avatar: avatar || null,
        score: 0,
        isHost: true,
      },
    ],
    phase: "lobby",
    gameType: null,
    round: 0,
    maxRounds: 5,
    currentQuestion: null,
    questionData: null,
    spotlightId: null,
    debaterIds: [],
    liarId: null,
    answers: {},
    votes: {},
    matchGuesses: {},
    usedQuestions: [],
    roundResult: null,
  };
  return rooms[code];
}

function getRoom(c) {
  return rooms[c] || null;
}
function shuffle(a) {
  return [...a].sort(() => Math.random() - 0.5);
}

function pickQ(array, room) {
  const avail = array.filter(
    (q) => !room.usedQuestions.includes(JSON.stringify(q)),
  );
  const pool = avail.length > 0 ? avail : array;
  const q = pool[Math.floor(Math.random() * pool.length)];
  room.usedQuestions.push(JSON.stringify(q));
  return q;
}

// ══════════════════════════════════════
// SANITIZE
// ══════════════════════════════════════
// ══════════════════════════════════════
// BOMBERMAN ENGINE
// ══════════════════════════════════════
const BOMBER_COLS = 15;
const BOMBER_ROWS = 13;
const BOMBER_TICK = 33;          // ~30fps server loop (was 50ms/20fps)
const BOMBER_SPEED = 7.0;
const BOMBER_BOMB_MS = 2000;     // shorter fuse (was 3000ms)
const BOMBER_EXP_MS = 750;
const BOMBER_PLAYER_R = 0.36;
const BOMBER_GRID_SPEED = 7.0; // tiles / second for grid movement
const BOMBER_MAX_TIME = 180000;
const BOMBER_SPAWNS = [
  { r: 1, c: 1 },
  { r: 1, c: 13 },
  { r: 11, c: 1 },
  { r: 11, c: 13 },
];

function generateBomberGrid() {
  const grid = [];
  // Step 1: lay hard walls (borders + interior pillars)
  for (let r = 0; r < BOMBER_ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < BOMBER_COLS; c++) {
      if (
        r === 0 ||
        r === BOMBER_ROWS - 1 ||
        c === 0 ||
        c === BOMBER_COLS - 1
      ) {
        grid[r][c] = 1; // border
      } else if (r % 2 === 0 && c % 2 === 0) {
        grid[r][c] = 1; // interior pillar — never overwrite these
      } else {
        grid[r][c] = 0;
      }
    }
  }
  // Step 2: soft walls on eligible interior tiles (skip pillars — they are already 1)
  for (let r = 1; r < BOMBER_ROWS - 1; r++) {
    for (let c = 1; c < BOMBER_COLS - 1; c++) {
      if (grid[r][c] === 0 && Math.random() < 0.65) grid[r][c] = 2;
    }
  }
  // Step 3: clear spawn zones AFTER soft walls so they can't overwrite them
  // For each spawn, clear the tile itself + 2 tiles in the L toward the arena centre
  // Never touch hard-pillar cells (r%2===0 && c%2===0)
  const safeClear = (r, c) => {
    if (r > 0 && r < BOMBER_ROWS - 1 && c > 0 && c < BOMBER_COLS - 1) {
      if (!(r % 2 === 0 && c % 2 === 0)) grid[r][c] = 0;
    }
  };
  BOMBER_SPAWNS.forEach(({ r, c }) => {
    safeClear(r, c); // spawn tile itself
    safeClear(r - 1, c); // above
    safeClear(r + 1, c); // below
    safeClear(r, c - 1); // left
    safeClear(r, c + 1); // right
  });
  return grid;
}

function bomberIsSolid(grid, r, c) {
  if (r < 0 || r >= BOMBER_ROWS || c < 0 || c >= BOMBER_COLS) return true;
  return grid[r][c] === 1 || grid[r][c] === 2;
}

// Tile-level block check for grid movement (includes bombs)
function bomberTileBlocked(grid, bombs, passBombKey, r, c) {
  if (bomberIsSolid(grid, r, c)) return true;
  return bombs.some(
    (b) => b.r === r && b.c === c && `${b.r},${b.c}` !== passBombKey,
  );
}

function placeBomberBomb(room, player) {
  if (!player.bomberAlive) return;
  const r = player.bomberToR;
  const c = player.bomberToC;
  if (room.bomberBombs.some((b) => b.r === r && b.c === c)) return;
  player.bomberPassBombKey = `${r},${c}`;
  room.bomberBombs.push({
    r,
    c,
    timer: BOMBER_BOMB_MS,
    ownerId: player.id,
    range: player.bomberRange || 1,
  });
}

function detonateBomberBomb(room, bomb) {
  const grid = room.bomberGrid;
  const now = Date.now();
  const exp = {
    tiles: [],
    centerR: bomb.r,
    centerC: bomb.c,
    expiresAt: now + BOMBER_EXP_MS,
  };
  const dirs = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dr, dc] of dirs) {
    const start = dr === 0 && dc === 0 ? 0 : 1;
    const end = dr === 0 && dc === 0 ? 0 : bomb.range;
    for (let i = start; i <= end; i++) {
      const tr = bomb.r + dr * i,
        tc = bomb.c + dc * i;
      if (tr < 0 || tr >= BOMBER_ROWS || tc < 0 || tc >= BOMBER_COLS) break;
      if (grid[tr][tc] === 1) break;
      exp.tiles.push({ r: tr, c: tc });
      if (grid[tr][tc] === 2) {
        grid[tr][tc] = 0;
        room.bomberGridDirty = true; // mark grid as changed for next broadcast
        // 45% chance to drop a power-up on the freed tile
        if (Math.random() < 0.45) {
          if (!room.bomberPowerups) room.bomberPowerups = [];
          const types = ["range", "speed"];
          room.bomberPowerups.push({
            r: tr,
            c: tc,
            type: types[Math.floor(Math.random() * types.length)],
          });
        }
        break;
      }
    }
  }
  room.bomberExplosions.push(exp);
  const chains = room.bomberBombs.filter(
    (b) => b !== bomb && exp.tiles.some((t) => t.r === b.r && t.c === b.c),
  );
  room.bomberBombs = room.bomberBombs.filter((b) => b !== bomb);
  chains.forEach((b) => detonateBomberBomb(room, b));
}

function endBombermanRound(room, winnerId) {
  room.bomberGameOver = true;
  if (room._bomberLoop) {
    clearInterval(room._bomberLoop);
    room._bomberLoop = null;
  }
  if (room._bomberMaxTimer) {
    clearTimeout(room._bomberMaxTimer);
    room._bomberMaxTimer = null;
  }
  const winner = room.players.find((p) => p.id === winnerId);
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

  // Grid-based movement: advance each player's tile transition
  for (const player of room.players.filter((p) => p.bomberAlive)) {
    const inp = inputs[player.id] || { dx: 0, dy: 0, bomb: false };
    const speedMult = player.bomberSpeedMult || 1;
    const progressStep = BOMBER_GRID_SPEED * speedMult * (BOMBER_TICK / 1000);

    // Single direction from input (no diagonal; vertical wins)
    let ndr = Math.sign(Math.round(inp.dy || 0));
    let ndc = Math.sign(Math.round(inp.dx || 0));
    if (ndr !== 0 && ndc !== 0) ndc = 0;

    if (player.bomberMoveProgress < 1.0) {
      player.bomberMoveProgress += progressStep;
      if (player.bomberMoveProgress >= 1.0) {
        const overflow = player.bomberMoveProgress - 1.0;
        player.bomberFromR = player.bomberToR;
        player.bomberFromC = player.bomberToC;
        // Clear pass key once player leaves the bomb tile
        if (player.bomberPassBombKey) {
          const [pr, pc] = player.bomberPassBombKey.split(",").map(Number);
          if (player.bomberFromR !== pr || player.bomberFromC !== pc)
            player.bomberPassBombKey = null;
        }
        // Continue movement if direction still held
        if (
          (ndr !== 0 || ndc !== 0) &&
          !bomberTileBlocked(
            grid,
            room.bomberBombs,
            player.bomberPassBombKey,
            player.bomberFromR + ndr,
            player.bomberFromC + ndc,
          )
        ) {
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
      // Stationary — start move on input
      if (
        (ndr !== 0 || ndc !== 0) &&
        !bomberTileBlocked(
          grid,
          room.bomberBombs,
          player.bomberPassBombKey,
          player.bomberFromR + ndr,
          player.bomberFromC + ndc,
        )
      ) {
        player.bomberToR = player.bomberFromR + ndr;
        player.bomberToC = player.bomberFromC + ndc;
        player.bomberMoveProgress = progressStep;
      }
    }

    // Derive X/Y from grid lerp (used for explosion checks below)
    const t = Math.min(player.bomberMoveProgress, 1.0);
    player.bomberX =
      player.bomberFromC + 0.5 + (player.bomberToC - player.bomberFromC) * t;
    player.bomberY =
      player.bomberFromR + 0.5 + (player.bomberToR - player.bomberFromR) * t;

    if (inp.bomb) {
      placeBomberBomb(room, player);
      inputs[player.id] = { ...inp, bomb: false };
    }
  }
  for (const bomb of [...room.bomberBombs]) {
    bomb.timer -= BOMBER_TICK;
    if (bomb.timer <= 0) detonateBomberBomb(room, bomb);
  }
  room.bomberExplosions = room.bomberExplosions.filter(
    (e) => e.expiresAt > now,
  );
  for (const player of room.players.filter((p) => p.bomberAlive)) {
    const tr = player.bomberToR ?? Math.floor(player.bomberY),
      tc = player.bomberToC ?? Math.floor(player.bomberX);
    if (
      room.bomberExplosions.some((e) =>
        e.tiles.some((t) => t.r === tr && t.c === tc),
      )
    ) {
      player.bomberAlive = false;
    }
    // Power-up pickup — check tile player is standing on
    if (room.bomberPowerups) {
      const pr = player.bomberToR ?? Math.round(player.bomberY - 0.5);
      const pc = player.bomberToC ?? Math.round(player.bomberX - 0.5);
      const puIdx = room.bomberPowerups.findIndex(
        (p) => p.r === pr && p.c === pc,
      );
      if (puIdx !== -1) {
        const pu = room.bomberPowerups[puIdx];
        room.bomberPowerups.splice(puIdx, 1);
        if (pu.type === "range")
          player.bomberRange = Math.min((player.bomberRange || 1) + 1, 7);
        if (pu.type === "speed")
          player.bomberSpeedMult = Math.min(
            (player.bomberSpeedMult || 1) + 0.075,
            1.35,
          );
      }
    }
  }
  const alive = room.players.filter((p) => p.bomberAlive);
  if (room.players.length > 1 && alive.length <= 1 && !room.bomberGameOver) {
    endBombermanRound(room, alive[0]?.id || null);
  } else if (
    room.players.length === 1 &&
    alive.length === 0 &&
    !room.bomberGameOver
  ) {
    endBombermanRound(room, null);
  } else {
    broadcast(room.code);
  }
}

function startBombermanGame(room) {
  const grid = generateBomberGrid();
  room.bomberGrid = grid;
  room.bomberGridDirty = true; // send full grid on first broadcast
  room.bomberBombs = [];
  room.bomberExplosions = [];
  room.bomberPowerups = [];
  room.bomberGameOver = false;
  room.bomberInputs = {};
  room.players.forEach((p, i) => {
    const spawn = BOMBER_SPAWNS[i % BOMBER_SPAWNS.length];
    p.bomberFromR = spawn.r;
    p.bomberFromC = spawn.c;
    p.bomberToR = spawn.r;
    p.bomberToC = spawn.c;
    p.bomberMoveProgress = 1.0; // stationary
    p.bomberX = spawn.c + 0.5;
    p.bomberY = spawn.r + 0.5;
    p.bomberAlive = true;
    p.bomberRange = 1;
    p.bomberSpeedMult = 1;
    p.bomberPassBombKey = null;
  });
  room.phase = "bomberman";
  broadcast(room.code);
  room._bomberLoop = setInterval(() => tickBomberman(room), BOMBER_TICK);
  room._bomberMaxTimer = setTimeout(() => {
    if (!getRoom(room.code) || room.phase !== "bomberman") return;
    const alive = room.players.filter((p) => p.bomberAlive);
    endBombermanRound(room, alive.length === 1 ? alive[0].id : null);
  }, BOMBER_MAX_TIME);
}

function sanitize(room) {
  const showAns = ["voting", "results", "matching"].includes(room.phase);
  let answers = null;
  if (showAns) {
    answers = room.players
      .filter((p) => room.answers[p.id] !== undefined)
      .map((p) => ({
        playerId: p.id,
        playerName: p.name,
        answer: room.answers[p.id],
      }));
    if (room.phase === "voting") answers = shuffle(answers);
  }
  return {
    code: room.code,
    host: room.host,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: p.isHost,
      avatar: p.avatar || null,
      hasAnswered: room.answers[p.id] !== undefined,
      hasVoted: room.votes[p.id] !== undefined,
      bomberX: p.bomberX !== undefined ? p.bomberX : null,
      bomberY: p.bomberY !== undefined ? p.bomberY : null,
      bomberAlive: p.bomberAlive !== undefined ? p.bomberAlive : null,
      bomberFromR: p.bomberFromR ?? null,
      bomberFromC: p.bomberFromC ?? null,
      bomberToR: p.bomberToR ?? null,
      bomberToC: p.bomberToC ?? null,
      bomberMoveProgress: p.bomberMoveProgress ?? null,
      bomberSpeedMult: p.bomberSpeedMult ?? null,
    })),
    phase: room.phase,
    gameType: room.gameType,
    round: room.round,
    maxRounds: room.maxRounds,
    currentQuestion: room.currentQuestion,
    questionData: room.questionData,
    spotlightId: room.spotlightId,
    debaterIds: room.debaterIds,
    liarId: room.phase === "results" ? room.liarId : null,
    answers,
    votes: room.phase === "results" ? room.votes : null,
    matchGuesses: room.matchGuesses,
    answerCount: Object.keys(room.answers).length,
    voteCount: Object.keys(room.votes).length,
    roundResult: room.roundResult,
    // Trivia Blitz
    triviaStartTime: room.triviaStartTime ?? null,
    // Draw It
    drawItDrawerId: room.drawItDrawerId ?? null,
    drawItGuessedIds: room.drawItGuessedIds ?? [],
    // Word Bomb
    wordBombActiveId: room.wordBombActiveId ?? null,
    wordBombPattern: room.wordBombPattern ?? null,
    wordBombLives: room.wordBombLives ?? {},
    wordBombMinFuse: room.wordBombMinFuse ?? 8,
    wordBombUsedWords: room.wordBombUsedWords ?? [],
    // Reaction Tap
    reactionFired: room.reactionFired ?? false,
    reactionTimes: room.reactionTimes ?? {},
    // Bomberman — always send the grid so late-mounting clients (AnimatePresence delay) never miss it
    bomberGrid: room.bomberGrid ?? null,
    bomberBombs: room.bomberBombs ?? [],
    bomberExplosions: room.bomberExplosions ?? [],
    bomberPowerups: room.bomberPowerups ?? [],
    bomberGameOver: room.bomberGameOver ?? false,
  };
}

function broadcast(code) {
  const r = getRoom(code);
  if (r) io.to(code).emit("room_update", sanitize(r));
}
function advanceTo(room, phase) {
  room.phase = phase;
  broadcast(room.code);
}

// ══════════════════════════════════════
// CHECK ALL DONE
// ══════════════════════════════════════
function checkAllAnswered(room) {
  const gt = room.gameType;
  if (gt === "two_truths") return room.answers[room.spotlightId] !== undefined;
  if (gt === "debate_pit")
    return room.debaterIds.every((id) => room.answers[id] !== undefined);
  return room.players.every((p) => room.answers[p.id] !== undefined);
}
function checkAllVoted(room) {
  const gt = room.gameType;
  if (gt === "two_truths") {
    return room.players
      .filter((p) => p.id !== room.spotlightId)
      .every((p) => room.votes[p.id] !== undefined);
  }
  if (gt === "debate_pit") {
    const non = room.players.filter((p) => !room.debaterIds.includes(p.id));
    return non.length === 0
      ? Object.keys(room.votes).length >= 1
      : non.every((p) => room.votes[p.id] !== undefined);
  }
  // confessions / whose_line voting: all-except-nobody (everyone votes on answers)
  if (
    [
      "confessions",
      "whose_line",
      "roast_room",
      "emoji_story",
      "finish_the_sentence",
      "unhinged_advice",
    ].includes(gt)
  ) {
    return room.players.every((p) => room.votes[p.id] !== undefined);
  }
  return room.players.every((p) => room.votes[p.id] !== undefined);
}
function checkAllMatched(room) {
  return room.players.every((p) => room.matchGuesses[p.id] !== undefined);
}

// ══════════════════════════════════════
// WORD BOMB HELPERS
// ══════════════════════════════════════
function getNextAliveBombPlayer(room, currentId) {
  const alive = room.players.filter((p) => (room.wordBombLives[p.id] || 0) > 0);
  if (alive.length <= 1) return null;
  const idx = alive.findIndex((p) => p.id === currentId);
  return alive[(idx + 1) % alive.length];
}

function startBombTimer(room) {
  if (room._bombTimer) clearTimeout(room._bombTimer);
  const fuse = (room.wordBombMinFuse || 8) * 1000;
  room._bombTimer = setTimeout(() => {
    if (!getRoom(room.code) || room.phase !== "word_bomb") return;
    // Bomb exploded! Active player loses a life
    const activeId = room.wordBombActiveId;
    if (activeId && room.wordBombLives[activeId] !== undefined) {
      room.wordBombLives[activeId] = Math.max(
        0,
        room.wordBombLives[activeId] - 1,
      );
      io.to(room.code).emit("bomb_exploded", { playerId: activeId });
    }
    // Check if only one player alive
    const alive = room.players.filter(
      (p) => (room.wordBombLives[p.id] || 0) > 0,
    );
    if (alive.length <= 1) {
      resolveRound(room);
      return;
    }
    // Pass to next alive player, new pattern if round is getting long
    const next = getNextAliveBombPlayer(room, activeId);
    if (!next) {
      resolveRound(room);
      return;
    }
    room.wordBombActiveId = next.id;
    // New pattern every ~5 passes
    room._bombPassCount = (room._bombPassCount || 0) + 1;
    if (room._bombPassCount % 5 === 0) {
      room.wordBombPattern =
        WORD_BOMB_PATTERNS[
          Math.floor(Math.random() * WORD_BOMB_PATTERNS.length)
        ];
      room.wordBombUsedWords = [];
    }
    broadcast(room.code);
    startBombTimer(room);
  }, fuse);
}

// ══════════════════════════════════════
// START ROUND
// ══════════════════════════════════════
function startRound(room) {
  room.round++;
  room.answers = {};
  room.votes = {};
  room.matchGuesses = {};
  room.liarId = null;
  room.spotlightId = null;
  room.debaterIds = [];
  room.roundResult = null;
  const gt = room.gameType;

  if (gt === "guess_the_liar") {
    room.currentQuestion = pickQ(GUESS_THE_LIAR, room);
    room.questionData = null;
    const li = Math.floor(Math.random() * room.players.length);
    room.liarId = room.players[li].id;
    room.phase = "question";
    broadcast(room.code);
    room.players.forEach((p) =>
      io.sockets.sockets.get(p.id)?.emit("your_role", {
        role: p.id === room.liarId ? "liar" : "truth_teller",
        question: room.currentQuestion,
      }),
    );
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 4000);
  } else if (gt === "two_truths") {
    room.currentQuestion = pickQ(TWO_TRUTHS_TOPICS, room);
    room.questionData = null;
    room.spotlightId = room.players[(room.round - 1) % room.players.length].id;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "spotlight_write");
    }, 3500);
  } else if (gt === "most_likely_to") {
    room.currentQuestion = pickQ(MOST_LIKELY_TO, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "voting");
    }, 3000);
  } else if (gt === "never_have_i_ever") {
    room.currentQuestion = pickQ(NEVER_HAVE_I_EVER, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3000);
  } else if (gt === "would_you_rather") {
    const q = pickQ(WOULD_YOU_RATHER, room);
    room.currentQuestion = q.a + " ——OR—— " + q.b;
    room.questionData = { optionA: q.a, optionB: q.b };
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "hot_takes") {
    room.currentQuestion = pickQ(HOT_TAKES, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "roast_room") {
    room.currentQuestion = pickQ(ROAST_ROOM, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "red_flag_radar") {
    room.currentQuestion = pickQ(RED_FLAG_RADAR, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "vibe_check") {
    const q = pickQ(VIBE_CHECK_CATEGORIES, room);
    room.currentQuestion = q.prompt;
    room.questionData = { hint: q.hint };
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "debate_pit") {
    const q = pickQ(DEBATE_PIT_TOPICS, room);
    const sh = shuffle(room.players);
    room.debaterIds = [sh[0].id, sh[1].id];
    room.currentQuestion = q.topic;
    room.questionData = {
      topic: q.topic,
      forDebater: room.debaterIds[0],
      againstDebater: room.debaterIds[1],
      forPosition: q.for,
      againstPosition: q.against,
    };
    room.phase = "question";
    broadcast(room.code);
    io.sockets.sockets
      .get(room.debaterIds[0])
      ?.emit("your_debate_role", { position: q.for, side: "for" });
    io.sockets.sockets
      .get(room.debaterIds[1])
      ?.emit("your_debate_role", { position: q.against, side: "against" });
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "debate_write");
    }, 4000);
  }
  // ── NEW GAMES ──
  else if (gt === "word_association") {
    room.currentQuestion = pickQ(WORD_ASSOCIATION, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 2500);
  } else if (gt === "emoji_story") {
    const q = pickQ(EMOJI_STORIES, room);
    room.currentQuestion = q.emojis;
    room.questionData = { hint: q.hint };
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "finish_the_sentence") {
    room.currentQuestion = pickQ(FINISH_THE_SENTENCE, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "this_or_that") {
    const q = pickQ(THIS_OR_THAT, room);
    room.currentQuestion = q.a + " — OR — " + q.b;
    room.questionData = { optionA: q.a, optionB: q.b };
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3000);
  } else if (gt === "unhinged_advice") {
    const q = pickQ(
      UNHINGED_ADVICE.filter((x) => typeof x === "string"),
      room,
    );
    room.currentQuestion = q;
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 4000);
  } else if (gt === "confessions") {
    room.currentQuestion = pickQ(CONFESSIONS_PROMPTS, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 4000);
  } else if (gt === "speed_round") {
    room.currentQuestion = pickQ(SPEED_ROUND, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3000);
  } else if (gt === "pick_your_poison") {
    const q = pickQ(PICK_YOUR_POISON, room);
    room.currentQuestion = q.a + " — OR — " + q.b;
    room.questionData = { optionA: q.a, optionB: q.b };
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "burn_or_build") {
    room.currentQuestion = pickQ(BURN_OR_BUILD, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3000);
  } else if (gt === "rate_that_take") {
    room.currentQuestion = pickQ(RATE_THAT_TAKE, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 3500);
  } else if (gt === "superlatives") {
    room.currentQuestion = pickQ(SUPERLATIVES, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "voting");
    }, 3000);
  } else if (gt === "whose_line") {
    room.currentQuestion = pickQ(WHOSE_LINE_PROMPTS, room);
    room.questionData = null;
    room.phase = "question";
    broadcast(room.code);
    setTimeout(() => {
      if (getRoom(room.code)) advanceTo(room, "answering");
    }, 4000);
  }
  // ── ARCADE GAMES ──────────────────────────────────────────────────────────
  else if (gt === "trivia_blitz") {
    const q = pickQ(TRIVIA_BLITZ, room);
    room.currentQuestion = q.q;
    room.questionData = {
      options: q.options,
      correctIndex: q.correct,
      category: q.cat,
    };
    room.triviaAnswerTimes = {};
    room.triviaStartTime = Date.now();
    room.phase = "trivia";
    broadcast(room.code);
    // Auto-resolve after 20 seconds
    room._triviaTimer = setTimeout(() => {
      if (getRoom(room.code) && room.phase === "trivia") resolveRound(room);
    }, 20000);
  } else if (gt === "draw_it") {
    const wordObj =
      DRAW_IT_WORDS[Math.floor(Math.random() * DRAW_IT_WORDS.length)];
    const drawerIdx = (room.round - 1) % room.players.length;
    room.drawItDrawerId = room.players[drawerIdx].id;
    room.drawItWord = wordObj.word;
    room.drawItGuessedIds = [];
    room.phase = "drawing";
    broadcast(room.code);
    // Send secret word only to drawer
    io.sockets.sockets
      .get(room.drawItDrawerId)
      ?.emit("draw_your_word", { word: wordObj.word, diff: wordObj.diff });
    // Auto-resolve after 75 seconds
    room._drawTimer = setTimeout(() => {
      if (getRoom(room.code) && room.phase === "drawing") resolveRound(room);
    }, 75000);
  } else if (gt === "word_bomb") {
    const pattern =
      WORD_BOMB_PATTERNS[Math.floor(Math.random() * WORD_BOMB_PATTERNS.length)];
    room.wordBombPattern = pattern;
    room.wordBombMinFuse = 8;
    room.wordBombUsedWords = [];
    // Init lives for all players
    room.wordBombLives = {};
    room.players.forEach((p) => {
      room.wordBombLives[p.id] = 2;
    });
    // Start with first player
    room.wordBombActiveId = room.players[0].id;
    room.phase = "word_bomb";
    broadcast(room.code);
    startBombTimer(room);
  } else if (gt === "reaction_tap") {
    room.reactionFired = false;
    room.reactionTimes = {};
    room.phase = "reaction";
    broadcast(room.code);
    const delay = 3000 + Math.random() * 6000;
    room._reactionDelay = setTimeout(() => {
      if (!getRoom(room.code) || room.phase !== "reaction") return;
      room.reactionFired = true;
      room.reactionStartTime = Date.now();
      broadcast(room.code);
      room._reactionTimer = setTimeout(() => {
        if (getRoom(room.code) && room.phase === "reaction") resolveRound(room);
      }, 10000);
    }, delay);
  } else if (gt === "bomberman") {
    startBombermanGame(room);
  }
}

// ══════════════════════════════════════
// RESOLVE ROUND
// ══════════════════════════════════════
function resolveRound(room) {
  const gt = room.gameType;
  let result = {};

  if (gt === "guess_the_liar") {
    const vc = {};
    room.players.forEach((p) => {
      vc[p.id] = 0;
    });
    Object.values(room.votes).forEach((v) => {
      vc[v] = (vc[v] || 0) + 1;
    });
    const max = Math.max(...Object.values(vc));
    const caught = Object.keys(vc)
      .filter((id) => vc[id] === max)
      .includes(room.liarId);
    room.players.forEach((p) => {
      if (caught && p.id !== room.liarId && room.votes[p.id] === room.liarId)
        p.score += 100;
      if (!caught && p.id === room.liarId) p.score += 200;
    });
    result = { liarCaught: caught, voteCounts: vc };
  } else if (gt === "two_truths") {
    const sa = room.answers[room.spotlightId];
    const correctIndex = sa ? sa.lieIndex : 0;
    const correctVoters = [];
    room.players.forEach((p) => {
      if (p.id === room.spotlightId) return;
      if (room.votes[p.id] == correctIndex) {
        p.score += 100;
        correctVoters.push(p.id);
      }
    });
    if (correctVoters.length === 0) {
      const sp = room.players.find((p) => p.id === room.spotlightId);
      if (sp) sp.score += 200;
    }
    result = { correctIndex, correctVoters, statements: sa };
  } else if (gt === "most_likely_to") {
    const vc = {};
    room.players.forEach((p) => {
      vc[p.id] = 0;
    });
    Object.values(room.votes).forEach((v) => {
      vc[v] = (vc[v] || 0) + 1;
    });
    const max = Math.max(...Object.values(vc), 0);
    const winners = room.players.filter((p) => vc[p.id] === max);
    winners.forEach((p) => {
      p.score += 50;
    });
    result = { voteCounts: vc, winnerIds: winners.map((p) => p.id) };
  } else if (gt === "never_have_i_ever") {
    const havers = room.players.filter((p) => room.answers[p.id] === "have");
    havers.forEach((p) => {
      p.score += 30;
    });
    result = {
      havers: havers.map((p) => ({ id: p.id, name: p.name })),
      nevers: room.players
        .filter((p) => room.answers[p.id] === "never")
        .map((p) => ({ id: p.id, name: p.name })),
    };
  } else if (gt === "would_you_rather") {
    const a = room.players
      .filter((p) => room.answers[p.id] === "a")
      .map((p) => ({ id: p.id, name: p.name }));
    const b = room.players
      .filter((p) => room.answers[p.id] === "b")
      .map((p) => ({ id: p.id, name: p.name }));
    const minority = a.length < b.length ? a : b;
    minority.forEach((pl) => {
      const p = room.players.find((x) => x.id === pl.id);
      if (p) p.score += 50;
    });
    result = { aVoters: a, bVoters: b };
  } else if (gt === "hot_takes") {
    const ag = room.players
      .filter((p) => room.answers[p.id] === "agree")
      .map((p) => ({ id: p.id, name: p.name }));
    const di = room.players
      .filter((p) => room.answers[p.id] === "disagree")
      .map((p) => ({ id: p.id, name: p.name }));
    const isTie = ag.length === di.length;
    const minority = ag.length < di.length ? ag : di;
    if (!isTie)
      minority.forEach((pl) => {
        const p = room.players.find((x) => x.id === pl.id);
        if (p) p.score += 75;
      });
    else
      room.players.forEach((p) => {
        if (room.answers[p.id]) p.score += 30;
      });
    result = { agreers: ag, disagreers: di };
  } else if (gt === "roast_room") {
    const vc = {};
    Object.values(room.votes).forEach((v) => {
      vc[v] = (vc[v] || 0) + 1;
    });
    const max = Math.max(...Object.values(vc), 0);
    const winners = Object.keys(vc).filter((id) => vc[id] === max);
    winners.forEach((id) => {
      const p = room.players.find((x) => x.id === id);
      if (p) p.score += 150;
    });
    result = { voteCounts: vc, winnerIds: winners };
  } else if (gt === "red_flag_radar") {
    const red = room.players
      .filter((p) => room.answers[p.id] === "red")
      .map((p) => ({ id: p.id, name: p.name }));
    const green = room.players
      .filter((p) => room.answers[p.id] === "green")
      .map((p) => ({ id: p.id, name: p.name }));
    (red.length < green.length ? red : green).forEach((pl) => {
      const p = room.players.find((x) => x.id === pl.id);
      if (p) p.score += 50;
    });
    result = { red, green };
  } else if (gt === "vibe_check") {
    const correct = {},
      total = {};
    room.players.forEach((p) => {
      if (!room.matchGuesses[p.id]) return;
      Object.entries(room.matchGuesses[p.id]).forEach(([tid, guess]) => {
        total[tid] = (total[tid] || 0) + 1;
        if (guess === room.answers[tid]) {
          const gp = room.players.find((x) => x.id === p.id);
          if (gp) gp.score += 100;
          correct[tid] = (correct[tid] || 0) + 1;
        }
      });
    });
    room.players.forEach((p) => {
      const t = total[p.id] || 0;
      const c = correct[p.id] || 0;
      if (t > 0 && c / t < 0.3) p.score += 75;
    });
    result = { correctGuesses: correct, totalGuesses: total };
  } else if (gt === "debate_pit") {
    const vc = {};
    room.debaterIds.forEach((id) => {
      vc[id] = 0;
    });
    Object.values(room.votes).forEach((v) => {
      if (vc[v] !== undefined) vc[v]++;
    });
    const max = Math.max(...Object.values(vc));
    const winners = Object.keys(vc).filter((id) => vc[id] === max);
    winners.forEach((id) => {
      const p = room.players.find((x) => x.id === id);
      if (p) p.score += 150;
    });
    result = { voteCounts: vc, winnerIds: winners };
  }
  // ── NEW GAME RESOLVERS ──
  else if (gt === "word_association") {
    const answerCount = {};
    Object.values(room.answers).forEach((a) => {
      const key = String(a).toLowerCase().trim();
      answerCount[key] = (answerCount[key] || 0) + 1;
    });
    const max = Math.max(...Object.values(answerCount), 0);
    const topAnswers = Object.keys(answerCount).filter(
      (k) => answerCount[k] === max,
    );
    room.players.forEach((p) => {
      if (room.answers[p.id] !== undefined) {
        const key = String(room.answers[p.id]).toLowerCase().trim();
        if (topAnswers.includes(key)) p.score += 100;
      }
    });
    result = { answerCount, topAnswers };
  } else if (
    [
      "emoji_story",
      "finish_the_sentence",
      "unhinged_advice",
      "confessions",
      "whose_line",
    ].includes(gt)
  ) {
    // voted funniest/best
    const vc = {};
    Object.values(room.votes).forEach((v) => {
      vc[v] = (vc[v] || 0) + 1;
    });
    const max = Math.max(...Object.values(vc), 0);
    const winners = Object.keys(vc).filter((id) => vc[id] === max);
    winners.forEach((id) => {
      const p = room.players.find((x) => x.id === id);
      if (p) p.score += 150;
    });
    result = { voteCounts: vc, winnerIds: winners };
  } else if (["this_or_that", "pick_your_poison"].includes(gt)) {
    const a = room.players
      .filter((p) => room.answers[p.id] === "a")
      .map((p) => ({ id: p.id, name: p.name }));
    const b = room.players
      .filter((p) => room.answers[p.id] === "b")
      .map((p) => ({ id: p.id, name: p.name }));
    const minority = a.length <= b.length ? a : b;
    minority.forEach((pl) => {
      const p = room.players.find((x) => x.id === pl.id);
      if (p) p.score += 50;
    });
    result = { aVoters: a, bVoters: b };
  } else if (gt === "speed_round") {
    const yes = room.players
      .filter((p) => room.answers[p.id] === "a")
      .map((p) => ({ id: p.id, name: p.name }));
    const no = room.players
      .filter((p) => room.answers[p.id] === "b")
      .map((p) => ({ id: p.id, name: p.name }));
    const minority = yes.length <= no.length ? yes : no;
    minority.forEach((pl) => {
      const p = room.players.find((x) => x.id === pl.id);
      if (p) p.score += 75;
    });
    result = { aVoters: yes, bVoters: no };
  } else if (gt === "burn_or_build") {
    const burns = room.players
      .filter((p) => room.answers[p.id] === "a")
      .map((p) => ({ id: p.id, name: p.name }));
    const builds = room.players
      .filter((p) => room.answers[p.id] === "b")
      .map((p) => ({ id: p.id, name: p.name }));
    const minority = burns.length <= builds.length ? burns : builds;
    minority.forEach((pl) => {
      const p = room.players.find((x) => x.id === pl.id);
      if (p) p.score += 50;
    });
    result = { aVoters: burns, bVoters: builds };
  } else if (gt === "rate_that_take") {
    const ag = room.players
      .filter((p) => room.answers[p.id] === "agree")
      .map((p) => ({ id: p.id, name: p.name }));
    const di = room.players
      .filter((p) => room.answers[p.id] === "disagree")
      .map((p) => ({ id: p.id, name: p.name }));
    const minority = ag.length < di.length ? ag : di;
    if (ag.length !== di.length)
      minority.forEach((pl) => {
        const p = room.players.find((x) => x.id === pl.id);
        if (p) p.score += 75;
      });
    else
      room.players.forEach((p) => {
        if (room.answers[p.id]) p.score += 30;
      });
    result = { agreers: ag, disagreers: di };
  } else if (gt === "superlatives") {
    const vc = {};
    room.players.forEach((p) => {
      vc[p.id] = 0;
    });
    Object.values(room.votes).forEach((v) => {
      vc[v] = (vc[v] || 0) + 1;
    });
    const max = Math.max(...Object.values(vc), 0);
    const winners = room.players.filter((p) => vc[p.id] === max);
    winners.forEach((p) => {
      p.score += 50;
    });
    result = { voteCounts: vc, winnerIds: winners.map((p) => p.id) };
  }
  // ── ARCADE RESOLVERS ──────────────────────────────────────────────────────
  else if (gt === "trivia_blitz") {
    if (room._triviaTimer) {
      clearTimeout(room._triviaTimer);
      room._triviaTimer = null;
    }
    const correctIdx = room.questionData?.correctIndex;
    const elapsed = Date.now() - (room.triviaStartTime || Date.now());
    const answerTimes = room.triviaAnswerTimes || {};
    const breakdown = {};
    room.players.forEach((p) => {
      const ans = room.answers[p.id];
      if (ans !== undefined) {
        const key = String(ans);
        breakdown[key] = breakdown[key] || [];
        breakdown[key].push({ id: p.id, name: p.name });
        if (Number(ans) === Number(correctIdx)) {
          const t = answerTimes[p.id] || elapsed;
          const pts = Math.max(400, Math.round(1000 - (t / 20000) * 600));
          p.score += pts;
        }
      }
    });
    result = { correctIndex: correctIdx, breakdown, answerTimes };
  } else if (gt === "draw_it") {
    if (room._drawTimer) {
      clearTimeout(room._drawTimer);
      room._drawTimer = null;
    }
    const allGuessedIds = room.drawItGuessedIds || [];
    result = {
      word: room.drawItWord,
      drawerId: room.drawItDrawerId,
      guessedIds: allGuessedIds,
    };
  } else if (gt === "word_bomb") {
    if (room._bombTimer) {
      clearTimeout(room._bombTimer);
      room._bombTimer = null;
    }
    const alive = room.players.filter(
      (p) => (room.wordBombLives[p.id] || 0) > 0,
    );
    const winner = alive.length === 1 ? alive[0] : null;
    if (winner) winner.score += 300;
    // Everyone who survived to this point gets bonus
    alive.forEach((p) => {
      p.score += 50;
    });
    result = { winnerIds: alive.map((p) => p.id), lives: room.wordBombLives };
  } else if (gt === "reaction_tap") {
    if (room._reactionTimer) {
      clearTimeout(room._reactionTimer);
      room._reactionTimer = null;
    }
    if (room._reactionDelay) {
      clearTimeout(room._reactionDelay);
      room._reactionDelay = null;
    }
    const times = room.reactionTimes || {};
    const sorted = Object.entries(times).sort(([, a], [, b]) => a - b);
    // Range-based scoring: everyone gets points based on their actual speed
    function reactionPts(ms) {
      if (ms < 150) return 1000;
      if (ms < 250) return 900;
      if (ms < 350) return 750;
      if (ms < 500) return 600;
      if (ms < 750) return 450;
      return 300;
    }
    sorted.forEach(([id, ms]) => {
      const p = room.players.find((x) => x.id === id);
      if (p) p.score += reactionPts(ms);
    });
    result = {
      rankings: sorted.map(([id, ms], rank) => ({
        id,
        ms,
        rank: rank + 1,
        name: room.players.find((x) => x.id === id)?.name ?? id,
      })),
    };
  }

  room.roundResult = result;
  room.phase = "results";
  broadcast(room.code);
}

// ══════════════════════════════════════
// SOCKET.IO
// ══════════════════════════════════════
io.on("connection", (socket) => {
  socket.on("create_room", ({ name, avatar }, cb) => {
    const room = createRoom(socket.id, name, avatar);
    socket.join(room.code);
    cb({ ok: true, code: room.code, room: sanitize(room) });
  });

  socket.on("join_room", ({ code, name, avatar }, cb) => {
    const room = getRoom(code.toUpperCase());
    if (!room) return cb({ ok: false, error: "Room not found" });
    if (room.phase !== "lobby")
      return cb({ ok: false, error: "Game already started" });
    if (room.players.some((p) => p.name.toLowerCase() === name.toLowerCase()))
      return cb({ ok: false, error: "Name taken!" });
    room.players.push({
      id: socket.id,
      name,
      avatar: avatar || null,
      score: 0,
      isHost: false,
    });
    socket.join(code.toUpperCase());
    broadcast(code.toUpperCase());
    cb({ ok: true, room: sanitize(room) });
  });

  socket.on("select_game", ({ code, gameType }) => {
    const room = getRoom(code);
    if (!room || room.host !== socket.id || !GAME_CATALOGUE[gameType]) return;
    room.gameType = gameType;
    broadcast(code);
  });

  socket.on("start_game", ({ code, maxRounds }) => {
    const room = getRoom(code);
    if (!room || room.host !== socket.id) return;
    if (!room.gameType) return socket.emit("error_msg", "Select a game first!");
    const cat = GAME_CATALOGUE[room.gameType];
    if (room.players.length < cat.minPlayers)
      return socket.emit(
        "error_msg",
        `Need ${cat.minPlayers}+ players for ${cat.title}`,
      );
    room.maxRounds = maxRounds || 5;
    startRound(room);
  });

  socket.on("submit_answer", ({ code, answer }) => {
    const room = getRoom(code);
    if (
      !room ||
      !["answering", "spotlight_write", "debate_write", "trivia"].includes(
        room.phase,
      )
    )
      return;
    if (answer === undefined || answer === null) return;
    if (room.gameType === "two_truths" && socket.id !== room.spotlightId)
      return;
    if (room.gameType === "debate_pit" && !room.debaterIds.includes(socket.id))
      return;
    // For trivia blitz, record answer timestamp for speed bonus
    if (room.gameType === "trivia_blitz") {
      room.triviaAnswerTimes = room.triviaAnswerTimes || {};
      room.triviaAnswerTimes[socket.id] =
        Date.now() - (room.triviaStartTime || Date.now());
    }
    room.answers[socket.id] = answer;
    broadcast(code);
    if (checkAllAnswered(room)) {
      if (room.gameType === "trivia_blitz") {
        resolveRound(room);
        return;
      }
      const needVote = [
        "guess_the_liar",
        "two_truths",
        "roast_room",
        "debate_pit",
        "emoji_story",
        "finish_the_sentence",
        "unhinged_advice",
        "confessions",
        "whose_line",
      ].includes(room.gameType);
      needVote ? advanceTo(room, "voting") : resolveRound(room);
    }
  });

  socket.on("submit_vote", ({ code, targetId }) => {
    const room = getRoom(code);
    if (!room || room.phase !== "voting") return;
    if (room.gameType === "guess_the_liar" && socket.id === targetId) return;
    if (room.gameType === "two_truths" && socket.id === room.spotlightId)
      return;
    if (room.gameType === "debate_pit") {
      if (room.debaterIds.includes(socket.id)) return;
      if (!room.debaterIds.includes(targetId)) return;
    }
    // Prevent self-voting in all answer-based games
    const answerVoteGames = [
      "roast_room", "finish_the_sentence", "confessions",
      "whose_line", "emoji_story", "unhinged_advice",
    ];
    if (answerVoteGames.includes(room.gameType) && socket.id === targetId) return;
    room.votes[socket.id] = targetId;
    broadcast(code);
    if (checkAllVoted(room)) resolveRound(room);
  });

  socket.on("submit_match_guesses", ({ code, guesses }) => {
    const room = getRoom(code);
    if (!room || room.phase !== "matching") return;
    room.matchGuesses[socket.id] = guesses;
    broadcast(code);
    if (checkAllMatched(room)) resolveRound(room);
  });

  socket.on("next_round", ({ code }) => {
    const room = getRoom(code);
    if (!room || room.host !== socket.id) return;
    room.round >= room.maxRounds
      ? (() => {
          room.phase = "scoreboard";
          broadcast(code);
        })()
      : startRound(room);
  });

  socket.on("play_again", ({ code }) => {
    const room = getRoom(code);
    if (!room || room.host !== socket.id) return;
    room.players.forEach((p) => {
      p.score = 0;
    });
    room.round = 0;
    room.usedQuestions = [];
    room.gameType = null;
    room.phase = "lobby";
    broadcast(code);
  });

  // ── DRAW IT events ─────────────────────────────────────────────────────────
  socket.on("draw_stroke", ({ code, stroke }) => {
    const room = getRoom(code);
    if (!room || room.phase !== "drawing" || socket.id !== room.drawItDrawerId)
      return;
    socket.to(code).emit("draw_stroke", stroke);
  });

  socket.on("draw_clear", ({ code }) => {
    const room = getRoom(code);
    if (!room || room.phase !== "drawing" || socket.id !== room.drawItDrawerId)
      return;
    io.to(code).emit("draw_clear");
  });

  // Drawer re-requests their word (handles race condition where draw_your_word
  // fires before the DrawItScreen component has mounted its socket listener)
  socket.on("draw_request_word", ({ code }) => {
    const room = getRoom(code);
    if (!room || room.phase !== "drawing") return;
    if (socket.id !== room.drawItDrawerId) return;
    socket.emit("draw_your_word", { word: room.drawItWord, diff: null });
  });

  socket.on("draw_guess", ({ code, word }) => {
    const room = getRoom(code);
    if (!room || room.phase !== "drawing") return;
    if (socket.id === room.drawItDrawerId) return;
    if ((room.drawItGuessedIds || []).includes(socket.id)) return;
    const guess = String(word).toLowerCase().trim();
    const secret = (room.drawItWord || "").toLowerCase().trim();
    const guesserName =
      room.players.find((x) => x.id === socket.id)?.name ?? "?";
    if (guess === secret) {
      room.drawItGuessedIds = room.drawItGuessedIds || [];
      room.drawItGuessedIds.push(socket.id);
      const order = room.drawItGuessedIds.length;
      const pts = Math.max(100, 500 - (order - 1) * 100);
      const guesser = room.players.find((x) => x.id === socket.id);
      if (guesser) guesser.score += pts;
      const drawer = room.players.find((x) => x.id === room.drawItDrawerId);
      if (drawer) drawer.score += 50;
      const nonDrawers = room.players.filter(
        (x) => x.id !== room.drawItDrawerId,
      );
      io.to(code).emit("draw_guess_correct", {
        guesserName,
        pts,
        guessedCount: room.drawItGuessedIds.length,
        total: nonDrawers.length,
      });
      broadcast(code);
      if (room.drawItGuessedIds.length >= nonDrawers.length) {
        if (room._drawTimer) {
          clearTimeout(room._drawTimer);
          room._drawTimer = null;
        }
        resolveRound(room);
      }
    } else {
      io.to(code).emit("draw_guess_wrong", { guesserName, word: guess });
    }
  });

  // ── WORD BOMB events ───────────────────────────────────────────────────────
  socket.on("word_bomb_submit", ({ code, word }) => {
    const room = getRoom(code);
    if (!room || room.phase !== "word_bomb") return;
    if (socket.id !== room.wordBombActiveId) return;
    const pattern = (room.wordBombPattern || "").toUpperCase();
    const w = String(word).toUpperCase().trim();
    const usedWords = room.wordBombUsedWords || [];
    const isValid =
      w.length >= 3 && w.includes(pattern) && !usedWords.includes(w);
    if (!isValid) {
      socket.emit("word_bomb_invalid", {
        reason:
          w.length < 3
            ? "Too short!"
            : usedWords.includes(w)
              ? "Already used!"
              : `Must contain "${pattern}"!`,
      });
      return;
    }
    room.wordBombUsedWords.push(w);
    if (room._bombTimer) {
      clearTimeout(room._bombTimer);
      room._bombTimer = null;
    }
    const p = room.players.find((x) => x.id === socket.id);
    if (p) p.score += 50;
    room.wordBombMinFuse = Math.max(3, (room.wordBombMinFuse || 8) - 0.4);
    const next = getNextAliveBombPlayer(room, socket.id);
    if (!next) {
      resolveRound(room);
      return;
    }
    room.wordBombActiveId = next.id;
    room._bombPassCount = (room._bombPassCount || 0) + 1;
    if (room._bombPassCount % 6 === 0) {
      room.wordBombPattern =
        WORD_BOMB_PATTERNS[
          Math.floor(Math.random() * WORD_BOMB_PATTERNS.length)
        ];
      room.wordBombUsedWords = [];
      io.to(code).emit("word_bomb_new_pattern", {
        pattern: room.wordBombPattern,
      });
    }
    broadcast(code);
    startBombTimer(room);
  });

  // ── REACTION TAP events ────────────────────────────────────────────────────
  socket.on("reaction_tap", ({ code, clientMs }) => {
    const room = getRoom(code);
    if (!room || room.phase !== "reaction" || !room.reactionFired) return;
    if (room.reactionTimes[socket.id] !== undefined) return;
    // Use the client-measured time (from when they saw the flash to when they tapped).
    // This is fairer than server-side calculation which would include network latency.
    const ms = typeof clientMs === "number" && clientMs >= 0 && clientMs < 30000
      ? Math.round(clientMs)
      : Date.now() - (room.reactionStartTime || Date.now());
    room.reactionTimes[socket.id] = ms;
    broadcast(code);
    if (Object.keys(room.reactionTimes).length >= room.players.length) {
      if (room._reactionTimer) {
        clearTimeout(room._reactionTimer);
        room._reactionTimer = null;
      }
      resolveRound(room);
    }
  });

  socket.on("bomberman_input", ({ code, dx, dy, bomb }) => {
    const room = getRoom(code);
    if (!room || room.phase !== "bomberman") return;
    if (!room.bomberInputs) room.bomberInputs = {};
    room.bomberInputs[socket.id] = { dx: dx || 0, dy: dy || 0, bomb: !!bomb };
  });

  socket.on("ping_bomber", ({ ts }) => {
    socket.emit("pong_bomber", { ts });
  });

  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((code) => {
      const room = rooms[code];
      const idx = room.players.findIndex((p) => p.id === socket.id);
      if (idx === -1) return;
      room.players.splice(idx, 1);
      if (room.bomberInputs) delete room.bomberInputs[socket.id];
      if (room.players.length === 0) {
        // Clean up arcade timers
        if (room._triviaTimer) clearTimeout(room._triviaTimer);
        if (room._drawTimer) clearTimeout(room._drawTimer);
        if (room._bombTimer) clearTimeout(room._bombTimer);
        if (room._reactionDelay) clearTimeout(room._reactionDelay);
        if (room._reactionTimer) clearTimeout(room._reactionTimer);
        if (room._bomberLoop) clearInterval(room._bomberLoop);
        if (room._bomberMaxTimer) clearTimeout(room._bomberMaxTimer);
        delete rooms[code];
        return;
      }
      if (room.host === socket.id) {
        room.host = room.players[0].id;
        room.players[0].isHost = true;
      }
      if (
        ["answering", "spotlight_write", "debate_write", "trivia"].includes(
          room.phase,
        ) &&
        checkAllAnswered(room)
      ) {
        if (room.gameType === "trivia_blitz") {
          resolveRound(room);
          return;
        }
        const needVote = [
          "guess_the_liar",
          "two_truths",
          "roast_room",
          "debate_pit",
        ].includes(room.gameType);
        needVote ? advanceTo(room, "voting") : resolveRound(room);
      }
      if (room.phase === "voting" && checkAllVoted(room)) resolveRound(room);
      // Word bomb: if active player left, pass bomb
      if (room.phase === "word_bomb" && room.wordBombActiveId === socket.id) {
        const next = getNextAliveBombPlayer(room, socket.id);
        if (next) {
          if (room._bombTimer) clearTimeout(room._bombTimer);
          room.wordBombActiveId = next.id;
          startBombTimer(room);
        } else {
          resolveRound(room);
        }
      }
      broadcast(code);
    });
  });
});

server.listen(4000, () => console.log("🚀 Pocket Party backend :4000"));
