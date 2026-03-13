// ── Game Round Logic ──────────────────────────────────────────────────────────
const { getRoom, shuffle, pickQ, sanitize } = require("../store");
const { sseBroadcast, sseSend } = require("../sse");
const { GAME_CATALOGUE } = require("../catalogue");
const {
  GUESS_THE_LIAR, TWO_TRUTHS_TOPICS, MOST_LIKELY_TO, NEVER_HAVE_I_EVER,
  WOULD_YOU_RATHER, HOT_TAKES, ROAST_ROOM, RED_FLAG_RADAR, VIBE_CHECK_CATEGORIES,
  DEBATE_PIT_TOPICS, WORD_ASSOCIATION, EMOJI_STORIES, FINISH_THE_SENTENCE,
  THIS_OR_THAT, UNHINGED_ADVICE, CONFESSIONS_PROMPTS, SPEED_ROUND,
  PICK_YOUR_POISON, BURN_OR_BUILD, RATE_THAT_TAKE, SUPERLATIVES, WHOSE_LINE_PROMPTS,
  TRIVIA_BLITZ, DRAW_IT_WORDS, WORD_BOMB_PATTERNS, BINGO_ITEMS, SPYFALL_LOCATIONS,
} = require("../data/questions");
const { startBombermanGame } = require("./bomberman");

function broadcast(code) {
  const r = getRoom(code);
  if (r) sseBroadcast(code, "room_update", sanitize(r));
}

function advanceTo(room, phase) {
  room.phase = phase;
  broadcast(room.code);
}

// ── Completion checks ─────────────────────────────────────────────────────────
function checkAllAnswered(room) {
  const gt = room.gameType;
  if (gt === "two_truths") return room.answers[room.spotlightId] !== undefined;
  if (gt === "debate_pit") return room.debaterIds.every(id => room.answers[id] !== undefined);
  return room.players.every(p => room.answers[p.id] !== undefined);
}

function checkAllVoted(room) {
  const gt = room.gameType;
  if (gt === "mafia") {
    const alive = room.mafiaAliveIds || [];
    return alive.length > 0 && alive.every(id => room.votes[id] !== undefined);
  }
  if (gt === "two_truths") {
    return room.players.filter(p => p.id !== room.spotlightId).every(p => room.votes[p.id] !== undefined);
  }
  if (gt === "debate_pit") {
    const non = room.players.filter(p => !room.debaterIds.includes(p.id));
    return non.length === 0 ? Object.keys(room.votes).length >= 1 : non.every(p => room.votes[p.id] !== undefined);
  }
  return room.players.every(p => room.votes[p.id] !== undefined);
}

function checkAllMatched(room) {
  return room.players.every(p => room.matchGuesses[p.id] !== undefined);
}

// ── Word Bomb helpers ─────────────────────────────────────────────────────────
function getNextAliveBombPlayer(room, currentId) {
  const alive = room.players.filter(p => (room.wordBombLives[p.id] || 0) > 0);
  if (alive.length <= 1) return null;
  const idx = alive.findIndex(p => p.id === currentId);
  return alive[(idx + 1) % alive.length];
}

function startBombTimer(room) {
  if (room._bombTimer) clearTimeout(room._bombTimer);
  const fuse = (room.wordBombMinFuse || 8) * 1000;
  room._bombTimer = setTimeout(() => {
    if (!getRoom(room.code) || room.phase !== "word_bomb") return;
    const activeId = room.wordBombActiveId;
    if (activeId && room.wordBombLives[activeId] !== undefined) {
      room.wordBombLives[activeId] = Math.max(0, room.wordBombLives[activeId] - 1);
      sseBroadcast(room.code, "bomb_exploded", { playerId: activeId });
    }
    const alive = room.players.filter(p => (room.wordBombLives[p.id] || 0) > 0);
    if (alive.length <= 1) { resolveRound(room); return; }
    const next = getNextAliveBombPlayer(room, activeId);
    if (!next) { resolveRound(room); return; }
    room.wordBombActiveId = next.id;
    room._bombPassCount = (room._bombPassCount || 0) + 1;
    if (room._bombPassCount % 5 === 0) {
      room.wordBombPattern = WORD_BOMB_PATTERNS[Math.floor(Math.random() * WORD_BOMB_PATTERNS.length)];
      room.wordBombUsedWords = [];
    }
    broadcast(room.code);
    startBombTimer(room);
  }, fuse);
}

// ── Start Round ───────────────────────────────────────────────────────────────
function startRound(room) {
  room.round++;
  room.answers = {}; room.votes = {}; room.matchGuesses = {};
  room.liarId = null; room.spotlightId = null; room.debaterIds = [];
  room.roundResult = null;
  room.triviaCorrectIndex = null;
  const gt = room.gameType;

  if (gt === "guess_the_liar") {
    room.currentQuestion = pickQ(GUESS_THE_LIAR, room);
    room.questionData = null;
    room.liarId = room.players[Math.floor(Math.random() * room.players.length)].id;
    room.phase = "question"; broadcast(room.code);
    room.players.forEach(p => sseSend(room.code, p.id, "your_role", {
      role: p.id === room.liarId ? "liar" : "truth_teller",
      question: room.currentQuestion,
    }));
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 4000);
  } else if (gt === "two_truths") {
    room.currentQuestion = pickQ(TWO_TRUTHS_TOPICS, room);
    room.questionData = null;
    room.spotlightId = room.players[(room.round - 1) % room.players.length].id;
    room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "spotlight_write"); }, 3500);
  } else if (gt === "most_likely_to") {
    room.currentQuestion = pickQ(MOST_LIKELY_TO, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "voting"); }, 3000);
  } else if (gt === "never_have_i_ever") {
    room.currentQuestion = pickQ(NEVER_HAVE_I_EVER, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3000);
  } else if (gt === "would_you_rather") {
    const q = pickQ(WOULD_YOU_RATHER, room);
    room.currentQuestion = q.a + " ——OR—— " + q.b;
    room.questionData = { optionA: q.a, optionB: q.b };
    room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3500);
  } else if (gt === "hot_takes") {
    room.currentQuestion = pickQ(HOT_TAKES, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3500);
  } else if (gt === "roast_room") {
    room.currentQuestion = pickQ(ROAST_ROOM, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3500);
  } else if (gt === "red_flag_radar") {
    room.currentQuestion = pickQ(RED_FLAG_RADAR, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3500);
  } else if (gt === "vibe_check") {
    const q = pickQ(VIBE_CHECK_CATEGORIES, room);
    room.currentQuestion = q.prompt; room.questionData = { hint: q.hint };
    room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3500);
  } else if (gt === "debate_pit") {
    const q = pickQ(DEBATE_PIT_TOPICS, room);
    const sh = shuffle(room.players);
    room.debaterIds = [sh[0].id, sh[1].id];
    room.currentQuestion = q.topic;
    room.questionData = { topic: q.topic, forDebater: room.debaterIds[0], againstDebater: room.debaterIds[1], forPosition: q.for, againstPosition: q.against };
    room.phase = "question"; broadcast(room.code);
    sseSend(room.code, room.debaterIds[0], "your_debate_role", { position: q.for, side: "for" });
    sseSend(room.code, room.debaterIds[1], "your_debate_role", { position: q.against, side: "against" });
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "debate_write"); }, 4000);
  } else if (gt === "word_association") {
    room.currentQuestion = pickQ(WORD_ASSOCIATION, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 2500);
  } else if (gt === "emoji_story") {
    const q = pickQ(EMOJI_STORIES, room);
    room.currentQuestion = q.emojis; room.questionData = { hint: q.hint };
    room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3500);
  } else if (gt === "finish_the_sentence") {
    room.currentQuestion = pickQ(FINISH_THE_SENTENCE, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3500);
  } else if (gt === "this_or_that") {
    const q = pickQ(THIS_OR_THAT, room);
    room.currentQuestion = q.a + " — OR — " + q.b;
    room.questionData = { optionA: q.a, optionB: q.b };
    room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3000);
  } else if (gt === "unhinged_advice") {
    const q = pickQ(UNHINGED_ADVICE.filter(x => typeof x === "string"), room);
    room.currentQuestion = q; room.questionData = null;
    room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 4000);
  } else if (gt === "confessions") {
    room.currentQuestion = pickQ(CONFESSIONS_PROMPTS, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 4000);
  } else if (gt === "speed_round") {
    room.currentQuestion = pickQ(SPEED_ROUND, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3000);
  } else if (gt === "pick_your_poison") {
    const q = pickQ(PICK_YOUR_POISON, room);
    room.currentQuestion = q.a + " — OR — " + q.b;
    room.questionData = { optionA: q.a, optionB: q.b };
    room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3500);
  } else if (gt === "burn_or_build") {
    room.currentQuestion = pickQ(BURN_OR_BUILD, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3000);
  } else if (gt === "rate_that_take") {
    room.currentQuestion = pickQ(RATE_THAT_TAKE, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 3500);
  } else if (gt === "superlatives") {
    room.currentQuestion = pickQ(SUPERLATIVES, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "voting"); }, 3000);
  } else if (gt === "whose_line") {
    room.currentQuestion = pickQ(WHOSE_LINE_PROMPTS, room);
    room.questionData = null; room.phase = "question"; broadcast(room.code);
    setTimeout(() => { if (getRoom(room.code)) advanceTo(room, "answering"); }, 4000);
  }
  // ── ARCADE ──────────────────────────────────────────────────────────────────
  else if (gt === "trivia_blitz") {
    const q = pickQ(TRIVIA_BLITZ, room);
    const shuffledOptions = shuffle(
      q.options.map((option, index) => ({ option, isCorrect: index === q.correct }))
    );
    room.currentQuestion = q.q;
    room.triviaCorrectIndex = shuffledOptions.findIndex((entry) => entry.isCorrect);
    room.questionData = {
      options: shuffledOptions.map((entry) => entry.option),
      category: q.cat,
    };
    room.triviaAnswerTimes = {}; room.triviaStartTime = Date.now();
    room.phase = "trivia"; broadcast(room.code);
    room._triviaTimer = setTimeout(() => {
      if (getRoom(room.code) && room.phase === "trivia") resolveRound(room);
    }, 20000);
  } else if (gt === "draw_it") {
    const wordObj = DRAW_IT_WORDS[Math.floor(Math.random() * DRAW_IT_WORDS.length)];
    const drawerIdx = (room.round - 1) % room.players.length;
    room.drawItDrawerId = room.players[drawerIdx].id;
    room.drawItWord = wordObj.word; room.drawItGuessedIds = [];
    room.phase = "drawing"; broadcast(room.code);
    sseSend(room.code, room.drawItDrawerId, "draw_your_word", { word: wordObj.word, diff: wordObj.diff });
    room._drawTimer = setTimeout(() => {
      if (getRoom(room.code) && room.phase === "drawing") resolveRound(room);
    }, 75000);
  } else if (gt === "word_bomb") {
    room.wordBombPattern = WORD_BOMB_PATTERNS[Math.floor(Math.random() * WORD_BOMB_PATTERNS.length)];
    room.wordBombMinFuse = 8; room.wordBombUsedWords = [];
    room.wordBombLives = {};
    room.players.forEach(p => { room.wordBombLives[p.id] = 2; });
    room.wordBombActiveId = room.players[0].id;
    room.phase = "word_bomb"; broadcast(room.code);
    startBombTimer(room);
  } else if (gt === "reaction_tap") {
    room.reactionFired = false; room.reactionTimes = {};
    room.phase = "reaction"; broadcast(room.code);
    const delay = 3000 + Math.random() * 6000;
    room._reactionDelay = setTimeout(() => {
      if (!getRoom(room.code) || room.phase !== "reaction") return;
      room.reactionFired = true; room.reactionStartTime = Date.now();
      broadcast(room.code);
      room._reactionTimer = setTimeout(() => {
        if (getRoom(room.code) && room.phase === "reaction") resolveRound(room);
      }, 10000);
    }, delay);
  } else if (gt === "bomberman") {
    startBombermanGame(room, broadcast);
  } else if (gt === "spyfall") {
    if (room._spyfallTurnTimer) { clearTimeout(room._spyfallTurnTimer); room._spyfallTurnTimer = null; }
    // Pick a random location and a random spy.
    const locEntry = SPYFALL_LOCATIONS[Math.floor(Math.random() * SPYFALL_LOCATIONS.length)];
    room.spyfallLocation = locEntry.name;
    room.spyfallSpyId = room.players[Math.floor(Math.random() * room.players.length)].id;
    room.spyfallAccusedId = null;
    room.spyfallGuess = null;
    // Build ordered ask/answer turn pairs by shuffling players and pairing each with the next.
    const shuffledPlayers = shuffle(room.players);
    const turns = shuffledPlayers.map((p, i) => ({
      askerId: p.id,
      targetId: shuffledPlayers[(i + 1) % shuffledPlayers.length].id,
    }));
    room.spyfallTurns = turns;
    room.spyfallTurnIndex = 0;
    room.spyfallAskerId = turns[0].askerId;
    room.spyfallTargetId = turns[0].targetId;
    // Public list of all possible locations — every player sees this (spy uses it to bluff).
    room.spyfallLocationNames = SPYFALL_LOCATIONS.map(l => l.name);
    room.currentQuestion = null; // actual location only revealed in results
    room.questionData = { locationNames: room.spyfallLocationNames };
    room.phase = "question"; broadcast(room.code);
    // Private role delivery: spy gets role-only; villagers get role + location.
    room.players.forEach(p => {
      if (p.id === room.spyfallSpyId) {
        sseSend(room.code, p.id, "your_spyfall_role", {
          role: "spy",
          locationNames: room.spyfallLocationNames,
        });
      } else {
        const roleCard = locEntry.roles[Math.floor(Math.random() * locEntry.roles.length)];
        sseSend(room.code, p.id, "your_spyfall_role", {
          role: "villager",
          location: locEntry.name,
          roleCard,
        });
      }
    });
    // Brief roles reveal, then start guided discussion.
    setTimeout(() => {
      if (!getRoom(room.code)) return;
      room.phase = "spyfall_discussion"; broadcast(room.code);
      startSpyfallTurnTimer(room);
    }, 5000);
  } else if (gt === "mafia") {
    // ── Mafia: assign hidden roles and deliver them privately ─────────────────
    const n = room.players.length;
    const mafiaCount = n >= 7 ? 2 : 1;
    const shuffled = shuffle(room.players);
    room.mafiaRoles = {};
    room.mafiaAliveIds = room.players.map(p => p.id);
    room.mafiaDeadIds = [];
    room.mafiaNightTargetId = null;
    room.mafiaDoctorSaveId = null;
    room.mafiaDetectiveCheckId = null;
    room.mafiaEliminatedId = null;
    room.mafiaRoundSummary = null;
    room.mafiaWinner = null;
    room._mafiaDayTimer = null;
    room._mafiaVoteTimer = null;
    // First mafiaCount → Mafia, next → Doctor, next → Detective, rest → Villager
    shuffled.forEach((p, i) => {
      if (i < mafiaCount) room.mafiaRoles[p.id] = "mafia";
      else if (i === mafiaCount) room.mafiaRoles[p.id] = "doctor";
      else if (i === mafiaCount + 1) room.mafiaRoles[p.id] = "detective";
      else room.mafiaRoles[p.id] = "villager";
    });
    const mafiaTeam = room.players.filter(p => room.mafiaRoles[p.id] === "mafia").map(p => ({ id: p.id, name: p.name }));
    room.players.forEach(p => {
      const role = room.mafiaRoles[p.id];
      sseSend(room.code, p.id, "your_mafia_role", {
        role,
        mafiaTeam: role === "mafia" ? mafiaTeam : null,
      });
    });
    room.currentQuestion = null;
    room.questionData = { mafiaCount, playerCount: n };
    room.phase = "question"; broadcast(room.code);
    // Auto-advance to first night after 7 s.
    setTimeout(() => {
      const r = getRoom(room.code);
      if (!r || r.phase !== "question" || r.gameType !== "mafia") return;
      r.phase = "mafia_night"; broadcast(r.code);
    }, 7000);
  } else if (gt === "bingo") {
    // Assign a unique shuffled 5×5 card to every player.
    // Card is stored as 25 item-indices from BINGO_ITEMS.
    // Position 12 is always FREE (index -1 sentinel).
    room.bingoCards = {};
    room.bingoCalledItems = [];
    room.bingoWinners = [];
    room._bingoCallTimer = null;
    const BINGO_SIZE = 25;
    const FREE_SLOT = 12; // center of 5×5
    room.players.forEach(p => {
      const pool = Array.from({ length: BINGO_ITEMS.length }, (_, i) => i);
      const picked = shuffle(pool).slice(0, BINGO_SIZE - 1); // 24 unique items
      const card = [];
      for (let i = 0; i < BINGO_SIZE; i++) {
        card.push(i === FREE_SLOT ? -1 : picked[i < FREE_SLOT ? i : i - 1]);
      }
      room.bingoCards[p.id] = card;
    });
    room.phase = "question"; broadcast(room.code);
    // Brief rules intro, then start calling items.
    setTimeout(() => {
      if (!getRoom(room.code)) return;
      room.phase = "bingo_live"; broadcast(room.code);
      scheduleBingoCall(room);
    }, 5000);
  }
}

// ── Spyfall helpers ───────────────────────────────────────────────────────────

/**
 * Start (or restart) the per-turn 30-second timer for spyfall discussion.
 * Auto-advances when the asker runs out of time.
 */
function startSpyfallTurnTimer(room) {
  if (room._spyfallTurnTimer) clearTimeout(room._spyfallTurnTimer);
  room._spyfallTurnTimer = setTimeout(() => {
    const r = getRoom(room.code);
    if (!r || r.phase !== "spyfall_discussion") return;
    advanceSpyfallTurn(r);
  }, 30000);
}

/**
 * Move to the next discussion turn or open voting when all turns are done.
 * Safe to call from both the route (manual advance) and the turn timer.
 */
function advanceSpyfallTurn(room) {
  if (room._spyfallTurnTimer) { clearTimeout(room._spyfallTurnTimer); room._spyfallTurnTimer = null; }
  room.spyfallTurnIndex++;
  if (room.spyfallTurnIndex >= room.spyfallTurns.length) {
    // All discussion turns complete — move to voting.
    room.spyfallAskerId = null;
    room.spyfallTargetId = null;
    room.phase = "voting";
    broadcast(room.code);
    return;
  }
  const turn = room.spyfallTurns[room.spyfallTurnIndex];
  room.spyfallAskerId = turn.askerId;
  room.spyfallTargetId = turn.targetId;
  broadcast(room.code);
  startSpyfallTurnTimer(room);
}

// ── Bingo helpers ─────────────────────────────────────────────────────────────

const BINGO_CALL_INTERVAL = 8000; // ms between called items
const BINGO_SIZE = 5;
const FREE_SLOT = 12;

/**
 * Schedule the next item call for the active Bingo round.
 * Stops if the room is gone, phase changed, or all items have been called.
 */
function scheduleBingoCall(room) {
  if (room._bingoCallTimer) clearTimeout(room._bingoCallTimer);
  room._bingoCallTimer = setTimeout(() => {
    const r = getRoom(room.code);
    if (!r || r.phase !== "bingo_live") return;
    const called = new Set(r.bingoCalledItems);
    // Build pool of uncalled item indices that appear on at least one card.
    const onACard = new Set();
    Object.values(r.bingoCards).forEach(card => card.forEach(idx => { if (idx !== -1) onACard.add(idx); }));
    const remaining = [...onACard].filter(i => !called.has(i));
    if (remaining.length === 0) {
      // All items called — resolve with whoever has bingo, or no winner.
      resolveRound(r);
      return;
    }
    const next = remaining[Math.floor(Math.random() * remaining.length)];
    r.bingoCalledItems.push(next);
    broadcast(r.code);
    // If nobody has bingo yet keep calling.
    if (r.bingoWinners.length === 0) scheduleBingoCall(r);
  }, BINGO_CALL_INTERVAL);
}

/**
 * Validate a bingo claim for a player.
 * Returns { valid: boolean, pattern: string|null }.
 * pattern is one of: 'row0'–'row4', 'col0'–'col4', 'diag_main', 'diag_anti'.
 */
function validateBingoClaim(card, calledSet) {
  // card[i] is -1 for FREE, otherwise an item index.
  function marked(pos) {
    return card[pos] === -1 || calledSet.has(card[pos]);
  }
  // Rows
  for (let r = 0; r < BINGO_SIZE; r++) {
    if ([0,1,2,3,4].every(c => marked(r * BINGO_SIZE + c))) return { valid: true, pattern: `row${r}` };
  }
  // Columns
  for (let c = 0; c < BINGO_SIZE; c++) {
    if ([0,1,2,3,4].every(r => marked(r * BINGO_SIZE + c))) return { valid: true, pattern: `col${c}` };
  }
  // Main diagonal (top-left → bottom-right)
  if ([0,6,12,18,24].every(pos => marked(pos))) return { valid: true, pattern: "diag_main" };
  // Anti-diagonal (top-right → bottom-left)
  if ([4,8,12,16,20].every(pos => marked(pos))) return { valid: true, pattern: "diag_anti" };
  return { valid: false, pattern: null };
}

// ── Resolve Round ─────────────────────────────────────────────────────────────
function resolveRound(room) {
  const gt = room.gameType;
  let result = {};

  // Snapshot scores before any mutations so we can compute deltas after.
  const scoreBefore = {};
  room.players.forEach(p => { scoreBefore[p.id] = p.score; });

  if (gt === "guess_the_liar") {
    const vc = {};
    room.players.forEach(p => { vc[p.id] = 0; });
    Object.values(room.votes).forEach(v => { vc[v] = (vc[v] || 0) + 1; });
    const max = Math.max(...Object.values(vc));
    const topVotedIds = Object.keys(vc).filter(id => vc[id] === max);
    // Liar is caught only when they have the UNIQUE highest vote count.
    // A tie at the top (every player gets one vote, for example) means no clear
    // accusation — the liar escapes.
    const caught = topVotedIds.length === 1 && topVotedIds[0] === room.liarId;
    room.players.forEach(p => {
      if (caught && p.id !== room.liarId && room.votes[p.id] === room.liarId) p.score += 100;
      if (!caught && p.id === room.liarId) p.score += 200;
    });
    const liarWinnerIds = caught
      ? room.players.filter(p => p.id !== room.liarId && room.votes[p.id] === room.liarId).map(p => p.id)
      : [room.liarId];
    result = { liarCaught: caught, voteCounts: vc, topVotedIds, winnerIds: liarWinnerIds };
  } else if (gt === "two_truths") {
    const sa = room.answers[room.spotlightId];
    // lieIndex is the 0-based index into the three statements that was the lie.
    const lieIndex = sa ? sa.lieIndex : 0;
    const correctVoters = [];
    room.players.forEach(p => {
      if (p.id === room.spotlightId) return;
      if (room.votes[p.id] == lieIndex) { p.score += 100; correctVoters.push(p.id); }
    });
    if (correctVoters.length === 0) {
      const sp = room.players.find(p => p.id === room.spotlightId);
      if (sp) sp.score += 200;
    }
    result = {
      lieIndex,
      correctVoters,
      statements: sa?.statements ?? null, // array of 3 strings; null before reveal
      fooledAll: correctVoters.length === 0,
      winnerIds: correctVoters.length === 0 ? [room.spotlightId] : correctVoters,
    };
  } else if (gt === "most_likely_to") {
    const vc = {};
    room.players.forEach(p => { vc[p.id] = 0; });
    Object.values(room.votes).forEach(v => { vc[v] = (vc[v] || 0) + 1; });
    const max = Math.max(...Object.values(vc), 0);
    const winners = room.players.filter(p => vc[p.id] === max);
    winners.forEach(p => { p.score += 50; });
    const isAllTie = winners.length === room.players.length;
    const isTie = winners.length > 1;
    result = { voteCounts: vc, winnerIds: winners.map(p => p.id), isTie, isAllTie };
  } else if (gt === "never_have_i_ever") {
    const havers = room.players.filter(p => room.answers[p.id] === "have");
    havers.forEach(p => { p.score += 30; });
    result = {
      havers: havers.map(p => ({ id: p.id, name: p.name })),
      nevers: room.players.filter(p => room.answers[p.id] === "never").map(p => ({ id: p.id, name: p.name })),
    };
  } else if (gt === "would_you_rather") {
    const a = room.players.filter(p => room.answers[p.id] === "a").map(p => ({ id: p.id, name: p.name }));
    const b = room.players.filter(p => room.answers[p.id] === "b").map(p => ({ id: p.id, name: p.name }));
    const minority = a.length < b.length ? a : b;
    minority.forEach(pl => { const p = room.players.find(x => x.id === pl.id); if (p) p.score += 50; });
    result = { aVoters: a, bVoters: b };
  } else if (gt === "hot_takes") {
    const ag = room.players.filter(p => room.answers[p.id] === "agree").map(p => ({ id: p.id, name: p.name }));
    const di = room.players.filter(p => room.answers[p.id] === "disagree").map(p => ({ id: p.id, name: p.name }));
    const isTie = ag.length === di.length;
    const minority = ag.length < di.length ? ag : di;
    if (!isTie) minority.forEach(pl => { const p = room.players.find(x => x.id === pl.id); if (p) p.score += 75; });
    else room.players.forEach(p => { if (room.answers[p.id]) p.score += 30; });
    result = { agreers: ag, disagreers: di };
  } else if (gt === "roast_room") {
    const vc = {};
    Object.values(room.votes).forEach(v => { vc[v] = (vc[v] || 0) + 1; });
    const max = Math.max(...Object.values(vc), 0);
    const winners = Object.keys(vc).filter(id => vc[id] === max);
    winners.forEach(id => { const p = room.players.find(x => x.id === id); if (p) p.score += 150; });
    result = { voteCounts: vc, winnerIds: winners };
  } else if (gt === "red_flag_radar") {
    const red = room.players.filter(p => room.answers[p.id] === "red").map(p => ({ id: p.id, name: p.name }));
    const green = room.players.filter(p => room.answers[p.id] === "green").map(p => ({ id: p.id, name: p.name }));
    (red.length < green.length ? red : green).forEach(pl => { const p = room.players.find(x => x.id === pl.id); if (p) p.score += 50; });
    result = { red, green };
  } else if (gt === "vibe_check") {
    const correct = {}, total = {};
    room.players.forEach(p => {
      if (!room.matchGuesses[p.id]) return;
      Object.entries(room.matchGuesses[p.id]).forEach(([tid, guess]) => {
        total[tid] = (total[tid] || 0) + 1;
        if (guess === room.answers[tid]) { const gp = room.players.find(x => x.id === p.id); if (gp) gp.score += 100; correct[tid] = (correct[tid] || 0) + 1; }
      });
    });
    room.players.forEach(p => { const t = total[p.id] || 0; const c = correct[p.id] || 0; if (t > 0 && c / t < 0.3) p.score += 75; });
    result = { correctGuesses: correct, totalGuesses: total };
  } else if (gt === "debate_pit") {
    const vc = {};
    room.debaterIds.forEach(id => { vc[id] = 0; });
    Object.values(room.votes).forEach(v => { if (vc[v] !== undefined) vc[v]++; });
    const max = Math.max(...Object.values(vc));
    const winners = Object.keys(vc).filter(id => vc[id] === max);
    winners.forEach(id => { const p = room.players.find(x => x.id === id); if (p) p.score += 150; });
    result = { voteCounts: vc, winnerIds: winners };
  } else if (gt === "word_association") {
    const answerCount = {};
    Object.values(room.answers).forEach(a => { const key = String(a).toLowerCase().trim(); answerCount[key] = (answerCount[key] || 0) + 1; });
    const max = Math.max(...Object.values(answerCount), 0);
    const topAnswers = Object.keys(answerCount).filter(k => answerCount[k] === max);
    room.players.forEach(p => {
      if (room.answers[p.id] !== undefined) { const key = String(room.answers[p.id]).toLowerCase().trim(); if (topAnswers.includes(key)) p.score += 100; }
    });
    const wordMatchIds = room.players
      .filter(p => p.id in room.answers && topAnswers.includes(String(room.answers[p.id]).toLowerCase().trim()))
      .map(p => p.id);
    result = { answerCount, topAnswers, winnerIds: wordMatchIds };
  } else if (["emoji_story", "finish_the_sentence", "unhinged_advice", "confessions", "whose_line"].includes(gt)) {
    const vc = {};
    Object.values(room.votes).forEach(v => { vc[v] = (vc[v] || 0) + 1; });
    const max = Math.max(...Object.values(vc), 0);
    const winners = Object.keys(vc).filter(id => vc[id] === max);
    winners.forEach(id => { const p = room.players.find(x => x.id === id); if (p) p.score += 150; });
    result = { voteCounts: vc, winnerIds: winners };
  } else if (["this_or_that", "pick_your_poison"].includes(gt)) {
    const a = room.players.filter(p => room.answers[p.id] === "a").map(p => ({ id: p.id, name: p.name }));
    const b = room.players.filter(p => room.answers[p.id] === "b").map(p => ({ id: p.id, name: p.name }));
    const minority = a.length <= b.length ? a : b;
    minority.forEach(pl => { const p = room.players.find(x => x.id === pl.id); if (p) p.score += 50; });
    result = { aVoters: a, bVoters: b };
  } else if (gt === "speed_round") {
    const yes = room.players.filter(p => room.answers[p.id] === "a").map(p => ({ id: p.id, name: p.name }));
    const no = room.players.filter(p => room.answers[p.id] === "b").map(p => ({ id: p.id, name: p.name }));
    const minority = yes.length <= no.length ? yes : no;
    minority.forEach(pl => { const p = room.players.find(x => x.id === pl.id); if (p) p.score += 75; });
    result = { aVoters: yes, bVoters: no };
  } else if (gt === "burn_or_build") {
    const burns = room.players.filter(p => room.answers[p.id] === "a").map(p => ({ id: p.id, name: p.name }));
    const builds = room.players.filter(p => room.answers[p.id] === "b").map(p => ({ id: p.id, name: p.name }));
    const minority = burns.length <= builds.length ? burns : builds;
    minority.forEach(pl => { const p = room.players.find(x => x.id === pl.id); if (p) p.score += 50; });
    result = { aVoters: burns, bVoters: builds };
  } else if (gt === "rate_that_take") {
    const ag = room.players.filter(p => room.answers[p.id] === "agree").map(p => ({ id: p.id, name: p.name }));
    const di = room.players.filter(p => room.answers[p.id] === "disagree").map(p => ({ id: p.id, name: p.name }));
    const minority = ag.length < di.length ? ag : di;
    if (ag.length !== di.length) minority.forEach(pl => { const p = room.players.find(x => x.id === pl.id); if (p) p.score += 75; });
    else room.players.forEach(p => { if (room.answers[p.id]) p.score += 30; });
    result = { agreers: ag, disagreers: di };
  } else if (gt === "superlatives") {
    const vc = {};
    room.players.forEach(p => { vc[p.id] = 0; });
    Object.values(room.votes).forEach(v => { vc[v] = (vc[v] || 0) + 1; });
    const max = Math.max(...Object.values(vc), 0);
    const winners = room.players.filter(p => vc[p.id] === max);
    winners.forEach(p => { p.score += 50; });
    result = { voteCounts: vc, winnerIds: winners.map(p => p.id) };
  } else if (gt === "trivia_blitz") {
    if (room._triviaTimer) { clearTimeout(room._triviaTimer); room._triviaTimer = null; }
    const correctIdx = room.triviaCorrectIndex;
    const elapsed = Date.now() - (room.triviaStartTime || Date.now());
    const answerTimes = room.triviaAnswerTimes || {};
    const breakdown = {};
    room.players.forEach(p => {
      const ans = room.answers[p.id];
      if (ans !== undefined) {
        const key = String(ans);
        breakdown[key] = breakdown[key] || [];
        breakdown[key].push({ id: p.id, name: p.name });
        if (Number(ans) === Number(correctIdx)) {
          const t = answerTimes[p.id] || elapsed;
          p.score += Math.max(400, Math.round(1000 - (t / 20000) * 600));
        }
      }
    });
    const triviaWinnerIds = room.players
      .filter(p => p.id in room.answers && Number(room.answers[p.id]) === Number(correctIdx))
      .map(p => p.id);
    result = { correctIndex: correctIdx, breakdown, answerTimes, winnerIds: triviaWinnerIds };
  } else if (gt === "draw_it") {
    if (room._drawTimer) { clearTimeout(room._drawTimer); room._drawTimer = null; }
    result = { word: room.drawItWord, drawerId: room.drawItDrawerId, guessedIds: room.drawItGuessedIds || [], winnerIds: room.drawItGuessedIds || [] };
  } else if (gt === "word_bomb") {
    if (room._bombTimer) { clearTimeout(room._bombTimer); room._bombTimer = null; }
    const alive = room.players.filter(p => (room.wordBombLives[p.id] || 0) > 0);
    const winner = alive.length === 1 ? alive[0] : null;
    if (winner) winner.score += 300;
    alive.forEach(p => { p.score += 50; });
    result = { winnerIds: alive.map(p => p.id), lives: room.wordBombLives };
  } else if (gt === "reaction_tap") {
    if (room._reactionTimer) { clearTimeout(room._reactionTimer); room._reactionTimer = null; }
    if (room._reactionDelay) { clearTimeout(room._reactionDelay); room._reactionDelay = null; }
    const times = room.reactionTimes || {};
    const sorted = Object.entries(times).sort(([, a], [, b]) => a - b);
    function reactionPts(ms) {
      if (ms < 150) return 1000; if (ms < 250) return 900; if (ms < 350) return 750;
      if (ms < 500) return 600; if (ms < 750) return 450; return 300;
    }
    sorted.forEach(([id, ms]) => { const p = room.players.find(x => x.id === id); if (p) p.score += reactionPts(ms); });
    result = { rankings: sorted.map(([id, ms], rank) => ({ id, ms, rank: rank + 1, name: room.players.find(x => x.id === id)?.name ?? id })), winnerIds: sorted.length > 0 ? [sorted[0][0]] : [] };
  } else if (gt === "bingo") {
    if (room._bingoCallTimer) { clearTimeout(room._bingoCallTimer); room._bingoCallTimer = null; }
    const winners = room.bingoWinners || [];
    // Award points: first winner 250, tied winners (same resolution window) 150.
    winners.forEach((w, i) => {
      const p = room.players.find(x => x.id === w.id);
      if (p) p.score += i === 0 ? 250 : 150;
    });
    result = {
      winnerIds: winners.map(w => w.id),
      winners,
      calledItems: room.bingoCalledItems,
      calledLabels: (room.bingoCalledItems || []).map(i => BINGO_ITEMS[i]),
    };
  } else if (gt === "spyfall") {
    if (room.phase === "voting") {
      // ── Voting resolution: did players correctly identify the spy? ───────────
      const vc = {};
      room.players.forEach(p => { vc[p.id] = 0; });
      Object.values(room.votes).forEach(v => { vc[v] = (vc[v] || 0) + 1; });
      const max = Math.max(...Object.values(vc), 0);
      const topIds = Object.keys(vc).filter(id => vc[id] === max);
      // Unique plurality required to accuse (tie = spy escapes, same rule as Find the Liar).
      const accusedId = topIds.length === 1 ? topIds[0] : null;
      room.spyfallAccusedId = accusedId;

      if (!accusedId || accusedId !== room.spyfallSpyId) {
        // Spy not caught — spy wins 200 pts; resolve now.
        const spy = room.players.find(p => p.id === room.spyfallSpyId);
        if (spy) spy.score += 200;
        result = {
          outcome: "spy_escaped",
          spyId: room.spyfallSpyId,
          location: room.spyfallLocation,
          voteCounts: vc,
          accusedId,
          winnerIds: [room.spyfallSpyId],
        };
        // Falls through to shared post-processing → results.
      } else {
        // Spy correctly accused — give them a final location guess.
        room.phase = "spyfall_guess";
        broadcast(room.code);
        return; // Skip post-processing; resume when spy submits guess.
      }
    } else if (room.phase === "spyfall_guess") {
      // ── Guess resolution: did the cornered spy identify the location? ────────
      const guessedCorrectly = room.spyfallGuess != null &&
        room.spyfallGuess.toLowerCase().trim() === room.spyfallLocation.toLowerCase().trim();

      const spy = room.players.find(p => p.id === room.spyfallSpyId);
      const nonSpies = room.players.filter(p => p.id !== room.spyfallSpyId);

      if (guessedCorrectly) {
        // Spy caught but guessed location — spy still wins (150 pts for the clever escape).
        if (spy) spy.score += 150;
        result = {
          outcome: "spy_caught_guessed",
          spyId: room.spyfallSpyId,
          location: room.spyfallLocation,
          guess: room.spyfallGuess,
          guessCorrect: true,
          accusedId: room.spyfallAccusedId,
          winnerIds: [room.spyfallSpyId],
        };
      } else {
        // Spy caught and failed guess — full non-spy victory.
        // 100 pts to everyone who voted for the spy + 50 pt group bonus for all non-spies.
        nonSpies.forEach(p => {
          if (room.votes[p.id] === room.spyfallSpyId) p.score += 100;
          p.score += 50; // group clear bonus
        });
        result = {
          outcome: "spy_caught_failed",
          spyId: room.spyfallSpyId,
          location: room.spyfallLocation,
          guess: room.spyfallGuess,
          guessCorrect: false,
          accusedId: room.spyfallAccusedId,
          winnerIds: nonSpies.map(p => p.id),
        };
      }
      // Falls through to shared post-processing → results.
    }
  }

  // ── Shared post-processing ────────────────────────────────────────────────
  // BE-LT-02: per-player point deltas for this round
  result.pointDeltas = {};
  room.players.forEach(p => { result.pointDeltas[p.id] = p.score - (scoreBefore[p.id] ?? 0); });

  // BE-SR-02: avatar-friendly winner objects (for games that already have winnerIds)
  if (result.winnerIds && result.winnerIds.length > 0) {
    result.winnersDetailed = result.winnerIds.map(id => {
      const p = room.players.find(x => x.id === id);
      return p ? { id: p.id, name: p.name, avatar: p.avatar ?? null, score: p.score, delta: result.pointDeltas[p.id] ?? 0 } : { id };
    });
  }

  // BE-TL-02: which players share first place overall (for podium / scoreboard)
  const topScore = Math.max(...room.players.map(p => p.score), 0);
  result.firstPlaceIds = room.players.filter(p => p.score === topScore).map(p => p.id);

  room.roundResult = result;
  room.phase = "results";
  broadcast(room.code);
}

// ── Disconnect handler ────────────────────────────────────────────────────────
function handleDisconnect(code, playerId) {
  const room = getRoom(code);
  if (!room) return;
  const idx = room.players.findIndex(p => p.id === playerId);
  if (idx === -1) return;

  const leavingPlayer = room.players[idx];
  const wasHost = room.host === playerId;
  room.players.splice(idx, 1);
  if (room.bomberInputs) delete room.bomberInputs[playerId];

  // ── Empty room: tear down all timers and delete ───────────────────────────
  if (room.players.length === 0) {
    if (room._triviaTimer) clearTimeout(room._triviaTimer);
    if (room._drawTimer) clearTimeout(room._drawTimer);
    if (room._bombTimer) clearTimeout(room._bombTimer);
    if (room._reactionDelay) clearTimeout(room._reactionDelay);
    if (room._reactionTimer) clearTimeout(room._reactionTimer);
    if (room._bomberLoop) clearInterval(room._bomberLoop);
    if (room._bomberMaxTimer) clearTimeout(room._bomberMaxTimer);
    if (room._bingoCallTimer) clearTimeout(room._bingoCallTimer);
    if (room._spyfallTurnTimer) clearTimeout(room._spyfallTurnTimer);
    const { deleteRoom } = require("../store");
    deleteRoom(code);
    return;
  }

  // ── BE-CS-02: notify remaining players someone left ────────────────────────
  sseBroadcast(code, "player_left", { id: leavingPlayer.id, name: leavingPlayer.name });

  // ── BE-CS-01: host left → disband the room ────────────────────────────────
  if (wasHost) {
    room.phase = "disbanded";
    room.disbandReason = "host_left";
    broadcast(code);
    // Tear down active game timers before the clients navigate away.
    if (room._triviaTimer) clearTimeout(room._triviaTimer);
    if (room._drawTimer) clearTimeout(room._drawTimer);
    if (room._bombTimer) clearTimeout(room._bombTimer);
    if (room._reactionDelay) clearTimeout(room._reactionDelay);
    if (room._reactionTimer) clearTimeout(room._reactionTimer);
    if (room._bomberLoop) clearInterval(room._bomberLoop);
    if (room._bomberMaxTimer) clearTimeout(room._bomberMaxTimer);
    if (room._bingoCallTimer) clearTimeout(room._bingoCallTimer);
    if (room._spyfallTurnTimer) clearTimeout(room._spyfallTurnTimer);
    return;
  }

  // ── Reassign host to first remaining player ────────────────────────────────
  room.host = room.players[0].id;
  room.players[0].isHost = true;

  // ── BE-CS-03: active-game player count drops below minimum ─────────────────
  const inGame = !["lobby", "results", "scoreboard", "disbanded"].includes(room.phase);
  if (inGame && room.gameType) {
    const cat = GAME_CATALOGUE[room.gameType];
    if (cat && room.players.length < cat.minPlayers) {
      // Stop all active timers first.
      if (room._triviaTimer) clearTimeout(room._triviaTimer);
      if (room._drawTimer) clearTimeout(room._drawTimer);
      if (room._bombTimer) clearTimeout(room._bombTimer);
      if (room._reactionDelay) clearTimeout(room._reactionDelay);
      if (room._reactionTimer) clearTimeout(room._reactionTimer);
      if (room._bomberLoop) clearInterval(room._bomberLoop);
      if (room._bomberMaxTimer) clearTimeout(room._bomberMaxTimer);
      if (room._bingoCallTimer) clearTimeout(room._bingoCallTimer);
      if (room._spyfallTurnTimer) clearTimeout(room._spyfallTurnTimer);
      room.phase = "disbanded";
      room.disbandReason = "not_enough_players";
      broadcast(code);
      return;
    }
  }

  // ── Normal in-game auto-advance checks ────────────────────────────────────
  if (["answering", "spotlight_write", "debate_write", "trivia"].includes(room.phase) && checkAllAnswered(room)) {
    if (room.gameType === "trivia_blitz") { resolveRound(room); return; }
    const needVote = ["guess_the_liar", "two_truths", "roast_room", "debate_pit"].includes(room.gameType);
    needVote ? advanceTo(room, "voting") : resolveRound(room);
    return;
  }
  if (room.phase === "voting" && checkAllVoted(room)) { resolveRound(room); return; }
  // If the disconnected player was the current asker in spyfall, advance the turn.
  if (room.phase === "spyfall_discussion" && room.spyfallAskerId === playerId) {
    advanceSpyfallTurn(room); return;
  }
  if (room.phase === "word_bomb" && room.wordBombActiveId === playerId) {
    const next = getNextAliveBombPlayer(room, playerId);
    if (next) { if (room._bombTimer) clearTimeout(room._bombTimer); room.wordBombActiveId = next.id; startBombTimer(room); }
    else resolveRound(room);
  }
  broadcast(code);
}

// ── Mafia helpers ─────────────────────────────────────────────────────────────

function checkMafiaWin(room) {
  const mafiaAlive = room.mafiaAliveIds.filter(id => room.mafiaRoles[id] === "mafia");
  const townAlive = room.mafiaAliveIds.filter(id => room.mafiaRoles[id] !== "mafia");
  if (mafiaAlive.length === 0) return "town";
  if (mafiaAlive.length >= townAlive.length) return "mafia";
  return null;
}

function resolveMafiaMatch(room, winner) {
  room.mafiaWinner = winner;
  const scoreBefore = {};
  room.players.forEach(p => { scoreBefore[p.id] = p.score; });
  const winningIds = winner === "mafia"
    ? room.players.filter(p => room.mafiaRoles[p.id] === "mafia").map(p => p.id)
    : room.mafiaAliveIds.filter(id => room.mafiaRoles[id] !== "mafia");
  winningIds.forEach(id => {
    const p = room.players.find(x => x.id === id);
    if (p) p.score += 250;
  });
  const pointDeltas = {};
  room.players.forEach(p => { pointDeltas[p.id] = p.score - (scoreBefore[p.id] ?? 0); });
  const topScore = Math.max(...room.players.map(p => p.score), 0);
  const firstPlaceIds = room.players.filter(p => p.score === topScore).map(p => p.id);
  room.roundResult = {
    winner,
    winnerIds: winningIds,
    survivors: [...room.mafiaAliveIds],
    eliminated: [...room.mafiaDeadIds],
    roles: room.mafiaRoles,
    pointDeltas,
    firstPlaceIds,
    winnersDetailed: winningIds.map(id => {
      const p = room.players.find(x => x.id === id);
      return p ? { id: p.id, name: p.name, avatar: p.avatar ?? null, score: p.score, delta: pointDeltas[id] ?? 0 } : { id };
    }),
  };
  // Force next-round click to go to scoreboard (single-match game).
  room.round = room.maxRounds;
  room.phase = "results";
  broadcast(room.code);
}

/**
 * Resolve the night: compare kill vs doctor save, deliver detective result,
 * update alive/dead, then move to day_discussion with a 45 s auto-advance timer.
 */
function resolveMafiaNight(room) {
  const targetId = room.mafiaNightTargetId;
  const savedId = room.mafiaDoctorSaveId;
  const saved = !!(targetId && targetId === savedId);

  // Private detective result
  const detectiveId = room.mafiaAliveIds.find(id => room.mafiaRoles[id] === "detective");
  if (detectiveId && room.mafiaDetectiveCheckId) {
    const checkId = room.mafiaDetectiveCheckId;
    sseSend(room.code, detectiveId, "detective_result", {
      targetId: checkId,
      targetName: room.players.find(p => p.id === checkId)?.name ?? checkId,
      isMafia: room.mafiaRoles[checkId] === "mafia",
    });
  }

  let killedId = null;
  if (targetId && !saved) {
    killedId = targetId;
    room.mafiaAliveIds = room.mafiaAliveIds.filter(id => id !== killedId);
    room.mafiaDeadIds.push(killedId);
    room.mafiaEliminatedId = killedId;
  }

  room.mafiaRoundSummary = { killedId, saved, night: room.mafiaDeadIds.length };
  room.mafiaNightTargetId = null;
  room.mafiaDoctorSaveId = null;
  room.mafiaDetectiveCheckId = null;

  const winner = checkMafiaWin(room);
  if (winner) { resolveMafiaMatch(room, winner); return; }

  room.votes = {};
  room.phase = "day_discussion"; broadcast(room.code);
  // 45 s auto-advance to voting if host doesn't click first.
  if (room._mafiaDayTimer) clearTimeout(room._mafiaDayTimer);
  room._mafiaDayTimer = setTimeout(() => {
    const r = getRoom(room.code);
    if (!r || r.phase !== "day_discussion" || r.gameType !== "mafia") return;
    r._mafiaDayTimer = null;
    r.votes = {};
    r.phase = "voting"; broadcast(r.code);
    r._mafiaVoteTimer = setTimeout(() => {
      const rr = getRoom(r.code);
      if (!rr || rr.phase !== "voting" || rr.gameType !== "mafia") return;
      resolveMafiaDay(rr);
    }, 60000);
  }, 45000);
}

/**
 * Transition to doctor_night. If no doctor is alive, skip straight.
 */
function startMafiaDoctorPhase(room) {
  const aliveDoctor = room.mafiaAliveIds.find(id => room.mafiaRoles[id] === "doctor");
  if (!aliveDoctor) { startMafiaDetectivePhase(room); return; }
  room.phase = "doctor_night"; broadcast(room.code);
}

/**
 * Transition to detective_night. If no detective is alive, skip straight.
 */
function startMafiaDetectivePhase(room) {
  const aliveDetective = room.mafiaAliveIds.find(id => room.mafiaRoles[id] === "detective");
  if (!aliveDetective) { resolveMafiaNight(room); return; }
  room.phase = "detective_night"; broadcast(room.code);
}

/**
 * Resolve the day vote. Eliminate the player with unique plurality.
 * If tied: no elimination. Then check win condition or loop to next night.
 */
function resolveMafiaDay(room) {
  if (room._mafiaVoteTimer) { clearTimeout(room._mafiaVoteTimer); room._mafiaVoteTimer = null; }
  const vc = {};
  room.mafiaAliveIds.forEach(id => { vc[id] = 0; });
  Object.entries(room.votes).forEach(([voterId, targetId]) => {
    if (room.mafiaAliveIds.includes(voterId) && targetId) {
      vc[targetId] = (vc[targetId] || 0) + 1;
    }
  });
  const max = Math.max(...Object.values(vc), 0);
  const topIds = Object.keys(vc).filter(id => vc[id] === max && max > 0);
  const eliminatedId = topIds.length === 1 ? topIds[0] : null;
  if (eliminatedId) {
    room.mafiaAliveIds = room.mafiaAliveIds.filter(id => id !== eliminatedId);
    room.mafiaDeadIds.push(eliminatedId);
    room.mafiaEliminatedId = eliminatedId;
  } else {
    room.mafiaEliminatedId = null;
  }
  const winner = checkMafiaWin(room);
  if (winner) { resolveMafiaMatch(room, winner); return; }
  // Loop: reset and start next night.
  room.mafiaNightTargetId = null;
  room.mafiaDoctorSaveId = null;
  room.mafiaDetectiveCheckId = null;
  room.votes = {};
  room.mafiaRoundSummary = null;
  room.phase = "mafia_night"; broadcast(room.code);
}

module.exports = {
  broadcast, startRound, resolveRound, handleDisconnect,
  checkAllAnswered, checkAllVoted, checkAllMatched,
  getNextAliveBombPlayer, startBombTimer,
  validateBingoClaim, scheduleBingoCall,
  advanceSpyfallTurn,
  resolveMafiaNight, startMafiaDoctorPhase, startMafiaDetectivePhase, resolveMafiaDay,
};
