// ── In-memory room store ──────────────────────────────────────────────────────
const { randomUUID } = require("crypto");

const rooms = {};

function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

function createRoom(hostName, avatar) {
  let code;
  do { code = genCode(); } while (rooms[code]);
  const playerId = randomUUID();
  rooms[code] = {
    code,
    host: playerId,
    players: [{ id: playerId, name: hostName, avatar: avatar || null, score: 0, isHost: true, micEnabled: false, micMuted: true, micPermission: "unknown" }],
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
    triviaCorrectIndex: null,
    voteRunoffIds: null,
    voteRound: 0,
    voteNeedsMajority: false,
    mafiaAliveIds: [],
    mafiaDeadIds: [],
    mafiaEliminatedId: null,
    mafiaRoundSummary: null,
    mafiaRoles: null,
    mafiaWinner: null,
  };
  return { playerId, room: rooms[code] };
}

function getRoom(code) {
  return rooms[code] || null;
}

function deleteRoom(code) {
  delete rooms[code];
}

function shuffle(a) {
  return [...a].sort(() => Math.random() - 0.5);
}

function pickQ(array, room) {
  const avail = array.filter(q => !room.usedQuestions.includes(JSON.stringify(q)));
  const pool = avail.length > 0 ? avail : array;
  const q = pool[Math.floor(Math.random() * pool.length)];
  room.usedQuestions.push(JSON.stringify(q));
  return q;
}

function sanitize(room) {
  const showAns = ["voting", "results", "matching"].includes(room.phase);
  let answers = null;
  if (showAns) {
    answers = room.players
      .filter(p => room.answers[p.id] !== undefined)
      .map(p => ({ playerId: p.id, playerName: p.name, answer: room.answers[p.id] }));
    if (room.phase === "voting") answers = shuffle(answers);
  }
  return {
    code: room.code,
    host: room.host,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: p.isHost,
      avatar: p.avatar || null,
      hasAnswered: room.answers[p.id] !== undefined,
      hasVoted: room.votes[p.id] !== undefined,
      isAlive: room.mafiaAliveIds ? room.mafiaAliveIds.includes(p.id) : true,
      micEnabled: p.micEnabled ?? false,
      micMuted: p.micMuted ?? true,
      micPermission: p.micPermission ?? "unknown",
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
    voteRunoffIds: room.voteRunoffIds ?? null,
    voteRound: room.voteRound ?? 0,
    voteNeedsMajority: room.voteNeedsMajority ?? false,
    roundResult: room.roundResult,
    // Trivia
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
    // Bomberman (game-over flag only; state sent via bomber_state / bomber_grid events)
    bomberGameOver: room.bomberGameOver ?? false,
    // Bingo
    bingoCards: room.bingoCards ?? null,          // { [playerId]: number[] } — 25 item-indices, index 12 is FREE
    bingoCalledItems: room.bingoCalledItems ?? [], // ordered list of called item indices
    bingoWinners: room.bingoWinners ?? [],         // [{ id, name, pattern }]
    // Spyfall — secret fields (spyfallSpyId, spyfallLocation) are revealed only in results
    spyfallTurns: room.spyfallTurns ?? [],         // [{ askerId, targetId }] — full ordered turn list
    spyfallTurnIndex: room.spyfallTurnIndex ?? 0,
    spyfallAskerId: room.spyfallAskerId ?? null,
    spyfallTargetId: room.spyfallTargetId ?? null,
    spyfallAccusedId: room.spyfallAccusedId ?? null,
    // Location + spy identity only revealed once the round is over
    spyfallSpyId: ["spyfall_guess", "results"].includes(room.phase) ? (room.spyfallSpyId ?? null) : null,
    spyfallLocation: room.phase === "results" ? (room.spyfallLocation ?? null) : null,
    spyfallGuess: room.phase === "results" ? (room.spyfallGuess ?? null) : null,
    // All possible location names — public; shown to all players during discussion
    spyfallLocationNames: room.spyfallLocationNames ?? null,
    // Mafia — only safe public fields; roles never exposed except at results
    mafiaAliveIds: room.mafiaAliveIds ?? [],
    mafiaDeadIds: room.mafiaDeadIds ?? [],
    mafiaEliminatedId: room.mafiaEliminatedId ?? null,
    mafiaRoundSummary: ["day_discussion", "voting", "results"].includes(room.phase)
      ? (room.mafiaRoundSummary ?? null) : null,
    mafiaRoleReveal: room.phase === "results" ? (room.mafiaRoles ?? null) : null,
    mafiaWinner: room.mafiaWinner ?? null,
    // Room lifecycle
    // phase "disbanded" means the room is gone and every client should return home.
    disbandReason: room.disbandReason ?? null,     // null | "host_left" | "not_enough_players"
  };
}

module.exports = { rooms, createRoom, getRoom, deleteRoom, shuffle, pickQ, sanitize };
