// ── Avatar ────────────────────────────────────────
export interface AvatarConfig {
  head: number; // 0-3  hair style
  eyes: number; // 0-3  eye type
  mouth: number; // 0-3  mouth type
  color: number; // 0-7  palette
}

// ── Misc ─────────────────────────────────────────
export type GameCategory = "social" | "opinion" | "creative" | "wordplay" | "arcade";

export interface GameInfo {
  id: string;
  title: string;
  emoji: string;
  description: string;
  category: GameCategory;
  minPlayers: number;
  maxPlayers: number;
  color: string;
}

// ── Phase / Room ─────────────────────────────────
export type Phase =
  | "home"
  | "lobby"
  | "question"
  | "answering"
  | "spotlight_write"
  | "debate_write"
  | "voting"
  | "matching"
  | "results"
  | "scoreboard"
  // Arcade phases
  | "trivia"
  | "drawing"
  | "word_bomb"
  | "reaction"
  | "bomberman"
  | "bingo_live";

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  avatar?: AvatarConfig;
  hasAnswered?: boolean;
  hasVoted?: boolean;
  // Bomberman
  bomberX?: number | null;
  bomberY?: number | null;
  bomberAlive?: boolean | null;
  bomberFromR?: number | null;
  bomberFromC?: number | null;
  bomberToR?: number | null;
  bomberToC?: number | null;
  bomberMoveProgress?: number | null;
  bomberSpeedMult?: number | null;
}

export interface AnswerEntry {
  playerId: string;
  playerName: string;
  answer: string | Record<string, unknown>;
}

export interface Room {
  code: string;
  host: string;
  players: Player[];
  phase: Phase;
  gameType: string | null;
  round: number;
  maxRounds: number;
  currentQuestion: string | null;
  questionData: Record<string, unknown> | null;
  spotlightId: string | null;
  debaterIds: string[];
  liarId: string | null;
  answers: AnswerEntry[] | null;
  votes: Record<string, string> | null;
  matchGuesses: Record<string, Record<string, string>>;
  answerCount: number;
  voteCount: number;
  roundResult: Record<string, unknown> | null;
  // Trivia Blitz
  triviaStartTime: number | null;
  // Draw It
  drawItDrawerId: string | null;
  drawItGuessedIds: string[];
  // Word Bomb
  wordBombActiveId: string | null;
  wordBombPattern: string | null;
  wordBombLives: Record<string, number>;
  wordBombMinFuse: number;
  wordBombUsedWords: string[];
  // Reaction Tap
  reactionFired: boolean;
  reactionTimes: Record<string, number>;
  // Bomberman
  bomberGrid: number[][] | null;
  bomberBombs: {
    r: number;
    c: number;
    timer: number;
    ownerId: string;
    range: number;
  }[];
  bomberExplosions: {
    tiles: { r: number; c: number }[];
    centerR: number;
    centerC: number;
    expiresAt: number;
  }[];
  bomberPowerups: { r: number; c: number; type: "range" | "speed" }[];
  bomberGameOver: boolean;
  // Bingo
  bingoCards: Record<string, number[]> | null;
  bingoCalledItems: number[];
  bingoWinners: { id: string; name: string; pattern: string }[];
}
