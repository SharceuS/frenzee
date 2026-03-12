// ── HTTP API helpers ──────────────────────────────────────────────────────────
import type { AvatarConfig, Room } from "./types";

export const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:4000`
    : "http://localhost:4000");

async function post<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

// ── Room management ───────────────────────────────────────────────────────────
export async function apiCreateRoom(name: string, avatar: AvatarConfig) {
  return post<{ ok: boolean; code: string; playerId: string; room: Room; error?: string }>(
    "/rooms", { name, avatar }
  );
}

export async function apiJoinRoom(code: string, name: string, avatar: AvatarConfig) {
  return post<{ ok: boolean; playerId?: string; room?: Room; error?: string }>(
    `/rooms/${code.toUpperCase()}/join`, { name, avatar }
  );
}

// ── Lobby ─────────────────────────────────────────────────────────────────────
export async function apiSelectGame(code: string, playerId: string, gameType: string) {
  return post(`/rooms/${code}/game`, { playerId, gameType });
}

export async function apiStartGame(code: string, playerId: string, maxRounds: number) {
  return post(`/rooms/${code}/start`, { playerId, maxRounds });
}

// ── Game actions ──────────────────────────────────────────────────────────────
export async function apiSubmitAnswer(code: string, playerId: string, answer: unknown) {
  return post(`/rooms/${code}/answer`, { playerId, answer });
}

export async function apiSubmitVote(code: string, playerId: string, targetId: string) {
  return post(`/rooms/${code}/vote`, { playerId, targetId });
}

export async function apiSubmitMatchGuesses(code: string, playerId: string, guesses: Record<string, string>) {
  return post(`/rooms/${code}/match`, { playerId, guesses });
}

export async function apiNextRound(code: string, playerId: string) {
  return post(`/rooms/${code}/round/next`, { playerId });
}

export async function apiPlayAgain(code: string, playerId: string) {
  return post(`/rooms/${code}/round/again`, { playerId });
}

// ── Draw It ───────────────────────────────────────────────────────────────────
export async function apiDrawStroke(code: string, playerId: string, stroke: object) {
  return post(`/rooms/${code}/draw/stroke`, { playerId, stroke });
}

export async function apiDrawClear(code: string, playerId: string) {
  return post(`/rooms/${code}/draw/clear`, { playerId });
}

export async function apiDrawRequestWord(code: string, playerId: string) {
  return post(`/rooms/${code}/draw/word`, { playerId });
}

export async function apiDrawGuess(code: string, playerId: string, word: string) {
  return post<{ ok: boolean; correct?: boolean }>(`/rooms/${code}/draw/guess`, { playerId, word });
}

// ── Word Bomb ─────────────────────────────────────────────────────────────────
export async function apiWordBombSubmit(code: string, playerId: string, word: string) {
  return post<{ ok: boolean; reason?: string }>(`/rooms/${code}/wordbomb`, { playerId, word });
}

// ── Reaction Tap ──────────────────────────────────────────────────────────────
export async function apiReactionTap(code: string, playerId: string, clientMs: number) {
  return post(`/rooms/${code}/reaction`, { playerId, clientMs });
}

// ── Bomberman ─────────────────────────────────────────────────────────────────
export async function apiBombermanInput(code: string, playerId: string, dx: number, dy: number, bomb: boolean) {
  return post(`/rooms/${code}/bomberman/input`, { playerId, dx, dy, bomb });
}

export async function apiBombermanPing(code: string, clientTs: number) {
  return post<{ ts: number }>(`/rooms/${code}/bomberman/ping`, { ts: clientTs });
}
