export type GameCategory = "popular" | "original";

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
  | "scoreboard";

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  hasAnswered?: boolean;
  hasVoted?: boolean;
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
}
