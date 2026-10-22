import { hotTakePrompts, wordSyllables } from './data';
import type { GameId, LanternGameState, MultiplayerGameId, PlayerProfile, ReversiGameState, SharedGameAction, SharedGameState } from './types';

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
  return gameId === 'drop4' || gameId === 'wordbomb' || gameId === 'hottakes' || gameId === 'lanterns' || gameId === 'reversi' || gameId === 'bridges' || gameId === 'market';
}

export function createSharedGame(gameId: MultiplayerGameId, playerIds: string[], now = Date.now()): SharedGameState {
  const players = [...new Set(playerIds)].slice(0, 4);
  const ready = players.length >= 2;
  const base = { sessionId: `${gameId}-${now}-${players.join('-')}`, playerIds: players, createdAt: now, updatedAt: now, rewardClaims: {} };
  if (gameId === 'drop4') return { ...base, playerIds: players.slice(0, 2), gameId, phase: ready ? 'playing' : 'waiting', board: Array(42).fill(-1), turnIndex: 0 };
  if (gameId === 'wordbomb') return { ...base, gameId, phase: ready ? 'playing' : 'waiting', chain: [], syllableIndex: 0, turnIndex: 0, deadline: ready ? now + 10000 : 0 };
  if (gameId === 'hottakes') return { ...base, gameId, phase: ready ? 'playing' : 'waiting', promptIndex: 0, votes: {}, revealed: false };
  if (gameId === 'lanterns') return { ...base, gameId, phase: ready ? 'ready' : 'waiting', seed: now % 2147483647, startedAt: 0, deadline: 0, warmth: 100, resolved: [], penalized: [], rewardClaims: {} };
  if (gameId === 'reversi') return { ...base, playerIds: players.slice(0, 2), gameId, phase: ready ? 'playing' : 'waiting', board: createReversiBoard(), turnIndex: 0 };
  if (gameId === 'bridges') {
    const board = Array(49).fill(0); board[21] = 2; board[27] = 8;
    return { ...base, gameId, phase: ready ? 'playing' : 'waiting', board, owners: Array(49).fill(-1), turnIndex: 0 };
  }
  const seed = now % 2147483647;
  return { ...base, gameId, phase: ready ? 'playing' : 'waiting', seed, round: 1, turnIndex: 0, available: createMarketRow(seed, 1), inventories: Object.fromEntries(players.map((id) => [id, []])), scores: Object.fromEntries(players.map((id) => [id, 0])), winnerIds: [] };
}

export function normalizeSharedGame(state: SharedGameState): SharedGameState {
  state = state.rewardClaims ? state : { ...state, rewardClaims: {} };
  if (state.gameId === 'drop4') return state.board ? state : { ...state, board: Array(42).fill(-1) };
  if (state.gameId === 'wordbomb') return state.chain ? state : { ...state, chain: [] };
  if (state.gameId === 'hottakes') return state.votes ? state : { ...state, votes: {} };
  if (state.gameId === 'lanterns') {
    if (state.resolved && state.penalized && state.rewardClaims) return state;
    return { ...state, resolved: state.resolved || [], penalized: state.penalized || [], rewardClaims: state.rewardClaims || {} };
  }
  if (state.gameId === 'reversi') return state.board ? state : { ...state, board: createReversiBoard() };
  if (state.gameId === 'bridges') return state.board && state.owners ? state : { ...state, board: state.board || Array(49).fill(0), owners: state.owners || Array(49).fill(-1) };
  if (state.available && state.inventories && state.scores && state.winnerIds) return state;
  return { ...state, available: state.available || createMarketRow(state.seed, state.round), inventories: state.inventories || {}, scores: state.scores || {}, winnerIds: state.winnerIds || [] };
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
  if (action.type === 'claim-game-reward') {
    if (!isSharedGameComplete(state) || state.rewardClaims[actorId]) return state;
    return { ...state, rewardClaims: { ...state.rewardClaims, [actorId]: true }, updatedAt: now };
  }
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

  if (state.gameId === 'reversi' && action.type === 'place-reversi') {
    if (state.phase !== 'playing' || state.playerIds[state.turnIndex] !== actorId) return state;
    const flips = reversiFlips(state.board, action.index, state.turnIndex);
    if (!flips.length) return state;
    const board = [...state.board];
    board[action.index] = state.turnIndex;
    flips.forEach((index) => { board[index] = state.turnIndex; });
    const other = state.turnIndex === 0 ? 1 : 0;
    const otherMoves = reversiValidMoves(board, other);
    const myMoves = reversiValidMoves(board, state.turnIndex);
    if (!otherMoves.length && !myMoves.length) {
      const counts = reversiScores(board);
      const winnerId = counts[0] === counts[1] ? undefined : state.playerIds[counts[0] > counts[1] ? 0 : 1];
      return { ...state, board, phase: winnerId ? 'finished' : 'draw', winnerId, updatedAt: now };
    }
    return { ...state, board, turnIndex: otherMoves.length ? other : state.turnIndex, updatedAt: now };
  }

  if (state.gameId === 'bridges' && action.type === 'place-bridge') {
    if (state.phase !== 'playing' || state.playerIds[state.turnIndex] !== actorId || !Number.isInteger(action.index) || action.index < 0 || action.index >= 49 || state.board[action.index] !== 0) return state;
    const mask = bridgeTileMask(action.tile, action.rotation);
    if (!mask || !validBridgePlacements(state.board, mask).includes(action.index)) return state;
    const board = [...state.board]; const owners = [...state.owners];
    board[action.index] = mask; owners[action.index] = state.turnIndex;
    if (bridgeReachable(board).has(27)) return { ...state, board, owners, phase: 'finished', winnerId: actorId, updatedAt: now };
    if (board.every((cell) => cell !== 0)) return { ...state, board, owners, phase: 'draw', updatedAt: now };
    return { ...state, board, owners, turnIndex: (state.turnIndex + 1) % state.playerIds.length, updatedAt: now };
  }

  if (state.gameId === 'market' && action.type === 'pick-market') {
    if (state.phase !== 'playing' || state.playerIds[state.turnIndex] !== actorId || !Number.isInteger(action.slot) || action.slot < 0 || action.slot >= state.available.length) return state;
    const item = state.available[action.slot];
    const available = state.available.filter((_, index) => index !== action.slot);
    const inventories = { ...state.inventories, [actorId]: [...(state.inventories[actorId] || []), item] };
    const completedRound = state.turnIndex === state.playerIds.length - 1;
    if (completedRound && state.round === 3) {
      const scores = Object.fromEntries(state.playerIds.map((id) => [id, scoreMarketInventory(inventories[id] || [])]));
      const best = Math.max(...Object.values(scores));
      return { ...state, available, inventories, scores, winnerIds: state.playerIds.filter((id) => scores[id] === best), phase: 'finished', updatedAt: now };
    }
    if (completedRound) return { ...state, round: state.round + 1, turnIndex: 0, available: createMarketRow(state.seed, state.round + 1), inventories, updatedAt: now };
    return { ...state, available, inventories, turnIndex: state.turnIndex + 1, updatedAt: now };
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

export function createReversiBoard(): ReversiGameState['board'] {
  const board = Array(64).fill(-1) as ReversiGameState['board'];
  board[27] = 0; board[28] = 1; board[35] = 1; board[36] = 0;
  return board;
}

export function reversiFlips(board: ReversiGameState['board'], index: number, player: 0 | 1) {
  if (!Number.isInteger(index) || index < 0 || index >= 64 || board[index] !== -1) return [];
  const row = Math.floor(index / 8); const column = index % 8; const opponent = player === 0 ? 1 : 0;
  const flips: number[] = [];
  for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
    const line: number[] = []; let r = row + dr; let c = column + dc;
    while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === opponent) { line.push(r * 8 + c); r += dr; c += dc; }
    if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === player) flips.push(...line);
  }
  return flips;
}

export function reversiValidMoves(board: ReversiGameState['board'], player: 0 | 1) {
  return board.map((_, index) => index).filter((index) => reversiFlips(board, index, player).length > 0);
}

export function reversiScores(board: ReversiGameState['board']): [number, number] {
  return [board.filter((cell) => cell === 0).length, board.filter((cell) => cell === 1).length];
}

export function bridgeTileMask(tile: number, rotation: number) {
  const bases = [10, 3, 11, 15];
  if (!Number.isInteger(tile) || tile < 0 || tile >= bases.length || !Number.isInteger(rotation)) return 0;
  let mask = bases[tile];
  for (let step = 0; step < ((rotation % 4) + 4) % 4; step += 1) mask = ((mask << 1) & 15) | ((mask >> 3) & 1);
  return mask;
}

const bridgeDirections = [
  { bit: 1, opposite: 4, dr: -1, dc: 0 },
  { bit: 2, opposite: 8, dr: 0, dc: 1 },
  { bit: 4, opposite: 1, dr: 1, dc: 0 },
  { bit: 8, opposite: 2, dr: 0, dc: -1 },
];

export function bridgeReachable(board: number[]) {
  const reached = new Set<number>([21]); const queue = [21];
  while (queue.length) {
    const index = queue.shift()!; const row = Math.floor(index / 7); const column = index % 7;
    for (const direction of bridgeDirections) {
      const r = row + direction.dr; const c = column + direction.dc;
      if (!(board[index] & direction.bit) || r < 0 || r >= 7 || c < 0 || c >= 7) continue;
      const next = r * 7 + c;
      if ((board[next] & direction.opposite) && !reached.has(next)) { reached.add(next); queue.push(next); }
    }
  }
  return reached;
}

export function validBridgePlacements(board: number[], mask: number) {
  const reached = bridgeReachable(board);
  return board.map((value, index) => ({ value, index })).filter(({ value, index }) => {
    if (value !== 0) return false;
    const row = Math.floor(index / 7); const column = index % 7;
    return bridgeDirections.some((direction) => {
      const r = row + direction.dr; const c = column + direction.dc;
      if (!(mask & direction.bit) || r < 0 || r >= 7 || c < 0 || c >= 7) return false;
      const neighbor = r * 7 + c;
      return reached.has(neighbor) && Boolean(board[neighbor] & direction.opposite);
    });
  }).map(({ index }) => index);
}

export function createMarketRow(seed: number, round: number) {
  const offset = Math.abs(seed + round * 3) % 5;
  return Array.from({ length: 5 }, (_, index) => (index + offset) % 5);
}

export function scoreMarketInventory(items: number[]) {
  const counts = items.reduce<Record<number, number>>((result, item) => ({ ...result, [item]: (result[item] || 0) + 1 }), {});
  const unique = Object.keys(counts).length;
  if (items.length === 3 && unique === 1) return 9;
  if (items.length === 3 && unique === 3) return 5;
  if (Object.values(counts).some((count) => count === 2)) return 4;
  return items.length;
}

export function sharedGameWinnerIds(state: SharedGameState | null) {
  if (!state) return [];
  if (state.gameId === 'market') return state.phase === 'finished' ? state.winnerIds : [];
  if (state.gameId === 'lanterns') return state.phase === 'finished' ? state.playerIds : [];
  if (state.gameId === 'hottakes') return [];
  if ('winnerId' in state && state.phase === 'finished' && state.winnerId) return [state.winnerId];
  return [];
}

export function partyRoundWinnerIds(gameId: GameId, state: SharedGameState | null) {
  if (!isMultiplayerGame(gameId) || state?.gameId !== gameId) return [];
  return sharedGameWinnerIds(state);
}

export function isSharedGameComplete(state: SharedGameState | null) {
  if (!state) return false;
  if (state.gameId === 'hottakes') return state.revealed;
  return state.phase === 'finished' || state.phase === 'draw';
}

export function nextTriviaQuestion(index: number, count: number) {
  return count > 0 ? (index + 1) % count : 0;
}

export function createPairsDeck(seed: number) {
  const deck = Array.from({ length: 16 }, (_, index) => index % 8);
  let state = (Math.abs(Math.floor(seed)) || 1) >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [deck[index], deck[swap]] = [deck[swap], deck[index]];
  }
  return deck;
}

export function toggleGarden(board: boolean[], index: number, size = 5) {
  if (board.length !== size * size || !Number.isInteger(index) || index < 0 || index >= board.length) return board;
  const next = [...board];
  const row = Math.floor(index / size);
  const column = index % size;
  [[row, column], [row - 1, column], [row + 1, column], [row, column - 1], [row, column + 1]].forEach(([r, c]) => {
    if (r >= 0 && r < size && c >= 0 && c < size) next[r * size + c] = !next[r * size + c];
  });
  return next;
}

export function createGardenPuzzle(seed: number, size = 5) {
  let state = (Math.abs(Math.floor(seed)) || 1) >>> 0;
  const pressed = new Set<number>();
  while (pressed.size < Math.min(6, size * size)) {
    state = (state * 1664525 + 1013904223) >>> 0;
    pressed.add(Math.floor((state / 4294967296) * size * size));
  }
  let board = Array(size * size).fill(true) as boolean[];
  pressed.forEach((index) => { board = toggleGarden(board, index, size); });
  return board.every(Boolean) ? toggleGarden(board, 0, size) : board;
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

export function applyProfileReward(player: PlayerProfile, message: string) {
  const coins = Number(message.match(/\+(\d+)\s*coins?/i)?.[1] || 0);
  const earnedXp = Number(message.match(/\+(\d+)\s*xp/i)?.[1] || 0);
  if (!coins && !earnedXp && !message.includes('Trophy earned') && !message.includes('Storm cleared')) return player;
  let xp = player.xp + earnedXp;
  let level = player.level;
  while (xp >= levelThreshold(level)) {
    xp -= levelThreshold(level);
    level += 1;
  }
  return {
    ...player,
    coins: player.coins + coins,
    xp,
    level,
    trophyCount: player.trophyCount + (message.includes('Trophy earned') || message.includes('Storm cleared') ? 1 : 0),
  };
}

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}
