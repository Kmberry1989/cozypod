import { hotTakePrompts, wordSyllables } from './data';
import type { GameId, LanternGameState, MultiplayerGameId, SharedGameAction, SharedGameState } from './types';

export type DropCell = -1 | 0 | 1;

export function dropDisc(board: DropCell[], column: number, player: 0 | 1): DropCell[] {
  if (column < 0 || column > 6 || board.length !== 42) return board;
  const next = [...board];
  for (let row = 5; row >= 0; row -= 1) {
    const index = row * 7 + column;
    if (next[index] === -1) {
      next[index] = player;
      return next;
    }
  }
  return board;
}

export function getDrop4Winner(board: DropCell[]): 0 | 1 | null {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const value = board[row * 7 + col];
      if (value === -1) continue;
      for (const [dr, dc] of directions) {
        let count = 1;
        for (let i = 1; i < 4; i += 1) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r * 7 + c] !== value) break;
          count += 1;
        }
        if (count === 4) return value;
      }
    }
  }
  return null;
}

export function isDrop4Draw(board: DropCell[]) {
  return board.length === 42 && board.every((cell) => cell !== -1) && getDrop4Winner(board) === null;
}

export type LanternHazard = 'gust' | 'rain' | 'spark';
export interface LanternEvent { id: number; lantern: number; hazard: LanternHazard; at: number; }

export function createLanternEvents(seed: number, duration = 60): LanternEvent[] {
  let state = seed || 1;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const events: LanternEvent[] = [];
  for (let at = 4, id = 0; at < duration; at += Math.max(2.2, 5.4 - at / 25)) {
    events.push({ id, lantern: Math.floor(random() * 4), hazard: (['gust', 'rain', 'spark'] as const)[Math.floor(random() * 3)], at: Math.round(at * 10) / 10 });
    id += 1;
  }
  return events;
}

export function isMultiplayerGame(gameId: GameId): gameId is MultiplayerGameId {
  return gameId === 'drop4' || gameId === 'wordbomb' || gameId === 'hottakes' || gameId === 'lanterns';
}

export function createSharedGame(gameId: MultiplayerGameId, playerIds: string[], now = Date.now()): SharedGameState {
  const players = [...new Set(playerIds)].slice(0, 4);
  const ready = players.length >= 2;
  const base = { sessionId: `${gameId}-${now}-${players.join('-')}`, playerIds: players, createdAt: now, updatedAt: now };
  if (gameId === 'drop4') return { ...base, playerIds: players.slice(0, 2), gameId, phase: ready ? 'playing' : 'waiting', board: Array(42).fill(-1), turnIndex: 0 };
  if (gameId === 'wordbomb') return { ...base, gameId, phase: ready ? 'playing' : 'waiting', chain: [], syllableIndex: 0, turnIndex: 0, deadline: ready ? now + 10000 : 0 };
  if (gameId === 'hottakes') return { ...base, gameId, phase: ready ? 'playing' : 'waiting', promptIndex: 0, votes: {}, revealed: false };
  return { ...base, gameId, phase: ready ? 'ready' : 'waiting', seed: now % 2147483647, startedAt: 0, deadline: 0, warmth: 100, resolved: [], penalized: [], rewardClaims: {} };
}

export function normalizeSharedGame(state: SharedGameState): SharedGameState {
  if (state.gameId === 'drop4') return state.board ? state : { ...state, board: Array(42).fill(-1) };
  if (state.gameId === 'wordbomb') return state.chain ? state : { ...state, chain: [] };
  if (state.gameId === 'hottakes') return state.votes ? state : { ...state, votes: {} };
  if (state.resolved && state.penalized && state.rewardClaims) return state;
  return { ...state, resolved: state.resolved || [], penalized: state.penalized || [], rewardClaims: state.rewardClaims || {} };
}

export function refreshWaitingGame(state: SharedGameState, playerIds: string[], now = Date.now()) {
  state = normalizeSharedGame(state);
  if (state.phase !== 'waiting') return state;
  const players = [...new Set(playerIds)].slice(0, 4);
  if (players.length < 2 && sameIds(players, state.playerIds)) return state;
  return createSharedGame(state.gameId, players, now);
}

export function applySharedGameAction(state: SharedGameState, action: SharedGameAction, actorId: string, now = Date.now()): SharedGameState {
  state = normalizeSharedGame(state);
  if (!state.playerIds.includes(actorId)) return state;
  if (action.type === 'restart') return createSharedGame(state.gameId, state.playerIds, now);

  if (state.gameId === 'drop4' && action.type === 'drop-disc') {
    if (state.phase !== 'playing' || state.playerIds[state.turnIndex] !== actorId) return state;
    const board = dropDisc(state.board, action.column, state.turnIndex);
    if (board === state.board) return state;
    const winner = getDrop4Winner(board);
    if (winner !== null) return { ...state, board, phase: 'finished', winnerId: state.playerIds[winner], updatedAt: now };
    if (isDrop4Draw(board)) return { ...state, board, phase: 'draw', updatedAt: now };
    return { ...state, board, turnIndex: state.turnIndex === 0 ? 1 : 0, updatedAt: now };
  }

  if (state.gameId === 'wordbomb') {
    if (action.type === 'word-timeout') {
      if (state.phase !== 'playing' || now < state.deadline) return state;
      const timedOutPlayerId = state.playerIds[state.turnIndex];
      const winnerId = state.playerIds[(state.turnIndex + 1) % state.playerIds.length];
      return { ...state, phase: 'finished', timedOutPlayerId, winnerId, updatedAt: now };
    }
    if (action.type === 'submit-word') {
      if (state.phase !== 'playing' || state.playerIds[state.turnIndex] !== actorId || now > state.deadline) return state;
      if (validateWord(action.word, wordSyllables[state.syllableIndex], state.chain.map((entry) => entry.word)) !== 'valid') return state;
      const turnIndex = (state.turnIndex + 1) % state.playerIds.length;
      return { ...state, chain: [...state.chain, { playerId: actorId, word: action.word.trim() }], syllableIndex: (state.syllableIndex + 1) % wordSyllables.length, turnIndex, deadline: now + 10000, updatedAt: now };
    }
  }

  if (state.gameId === 'hottakes') {
    if (action.type === 'cast-vote') {
      if (state.phase !== 'playing' || state.revealed || state.votes[actorId] || !state.playerIds.includes(action.targetId)) return state;
      const votes = { ...state.votes, [actorId]: action.targetId };
      return { ...state, votes, revealed: Object.keys(votes).length === state.playerIds.length, updatedAt: now };
    }
    if (action.type === 'next-prompt' && state.revealed) {
      return { ...state, promptIndex: (state.promptIndex + 1) % hotTakePrompts.length, votes: {}, revealed: false, updatedAt: now };
    }
  }

  if (state.gameId === 'lanterns') {
    if (action.type === 'start-lanterns' && (state.phase === 'ready' || state.phase === 'finished' || state.phase === 'lost')) {
      return { ...state, phase: 'playing', seed: now % 2147483647, startedAt: now, deadline: now + 60000, warmth: 100, resolved: [], penalized: [], rewardClaims: {}, updatedAt: now };
    }
    const settled = settleLanternTime(state, now);
    if (action.type === 'lantern-tick') return settled;
    if (action.type === 'resolve-lantern' && settled.phase === 'playing') {
      const elapsed = (now - settled.startedAt) / 1000;
      const event = activeLanternEvents(settled, elapsed).find((item) => item.lantern === action.lantern);
      if (!event) return settled;
      return { ...settled, resolved: [...settled.resolved, event.id], warmth: Math.min(100, settled.warmth + 2), updatedAt: now };
    }
    if (action.type === 'claim-lantern-reward' && settled.phase === 'finished' && !settled.rewardClaims[actorId]) {
      return { ...settled, rewardClaims: { ...settled.rewardClaims, [actorId]: true }, updatedAt: now };
    }
  }

  return state;
}

export function validateWord(word: string, syllable: string, usedWords: string[]): 'valid' | 'empty' | 'missing' | 'duplicate' {
  const clean = word.trim().toUpperCase();
  if (!clean) return 'empty';
  if (!clean.includes(syllable.toUpperCase())) return 'missing';
  if (usedWords.some((used) => used.trim().toUpperCase() === clean)) return 'duplicate';
  return 'valid';
}

export function settleLanternTime(state: LanternGameState, now: number): LanternGameState {
  state = normalizeSharedGame(state) as LanternGameState;
  if (state.phase !== 'playing') return state;
  const elapsed = Math.max(0, (Math.min(now, state.deadline) - state.startedAt) / 1000);
  const events = createLanternEvents(state.seed, 60);
  const missed = events.filter((event) => event.at < elapsed - 3.2 && !state.resolved.includes(event.id) && !state.penalized.includes(event.id));
  const penalized = [...state.penalized, ...missed.map((event) => event.id)];
  const warmth = Math.max(0, state.warmth - missed.length * 4);
  if (warmth === 0) return { ...state, warmth, penalized, phase: 'lost', updatedAt: now };
  if (now >= state.deadline) return { ...state, warmth, penalized, phase: 'finished', updatedAt: now };
  if (!missed.length) return state;
  return { ...state, warmth, penalized, updatedAt: now };
}

export function activeLanternEvents(state: LanternGameState, elapsed: number) {
  return createLanternEvents(state.seed, 60).filter((event) => event.at <= elapsed && event.at > elapsed - 4 && !state.resolved.includes(event.id) && !state.penalized.includes(event.id));
}

export function nextTriviaQuestion(index: number, count: number) {
  return count > 0 ? (index + 1) % count : 0;
}

export function melodyTap(sequence: number[], input: number[], value: number) {
  const nextInput = [...input, value];
  if (value !== sequence[nextInput.length - 1]) return { outcome: 'wrong' as const, sequence: [0], input: [] as number[] };
  if (nextInput.length < sequence.length) return { outcome: 'continue' as const, sequence, input: nextInput };
  return { outcome: 'complete' as const, sequence: [...sequence, (sequence.length * 3 + 1) % 4], input: [] as number[] };
}

export function reflexTap(phase: 'idle' | 'wait' | 'go' | 'result', startedAt: number, now: number) {
  if (phase === 'wait') return { phase: 'result' as const, message: 'Too soon! The lantern was still dim.' };
  if (phase === 'go') return { phase: 'result' as const, message: `${Math.round(now - startedAt)} ms — lightning fast!` };
  return { phase, message: '' };
}

export function levelThreshold(level: number) {
  return Math.max(100, level * 100);
}

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
