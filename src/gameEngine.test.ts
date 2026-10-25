import { describe, expect, it } from 'vitest';
import {
  applySharedGameAction,
  applyProfileReward,
  bridgeTileMask,
  createMarketRow,
  createMosaicPuzzle,
  createCozyCode,
  createPairsDeck,
  createGardenPuzzle,
  createLanternEvents,
  createSharedGame,
  dropDisc,
  getDrop4Winner,
  isDrop4Draw,
  isSharedGameComplete,
  isSharedGameSettled,
  isMosaicComplete,
  melodyTap,
  mergeProfileProgress,
  mosaicMovableTiles,
  moveMosaic,
  moveTeaStack,
  nextTriviaQuestion,
  normalizeSharedGame,
  partyRoundWinnerIds,
  reflexTap,
  refreshSharedGameRoster,
  reversiFlips,
  reversiScores,
  reversiValidMoves,
  scoreMarketInventory,
  scoreCozyCode,
  sharedGameWinnerIds,
  settleLanternTime,
  toggleGarden,
  validBridgePlacements,
  validateWord,
} from './gameEngine';
import type { BridgeGameState, Drop4GameState, HotTakesGameState, LanternGameState, MarketGameState, ReversiGameState, WordBombGameState } from './types';
import { seedPlayers } from './data';

describe('Drop 4', () => {
  it('drops into the lowest open cell, rejects a full column, and finds wins', () => {
    let board = Array(42).fill(-1);
    for (let col = 0; col < 4; col += 1) board = dropDisc(board, col, 0);
    expect(board[35]).toBe(0);
    expect(getDrop4Winner(board)).toBe(0);
    let full = Array(42).fill(-1);
    for (let i = 0; i < 6; i += 1) full = dropDisc(full, 2, (i % 2) as 0 | 1);
    expect(dropDisc(full, 2, 0)).toBe(full);
  });

  it('enforces the active player across consecutive actions', () => {
    const state = createSharedGame('drop4', ['a', 'b', 'spectator'], 100) as Drop4GameState;
    expect(state.playerIds).toEqual(['a', 'b']);
    expect(applySharedGameAction(state, { type: 'restart' }, 'spectator', 101)).toBe(state);
    expect(applySharedGameAction(state, { type: 'restart' }, 'a', 101)).toBe(state);
    expect(applySharedGameAction(state, { type: 'drop-disc', column: 0 }, 'b', 101)).toBe(state);
    const first = applySharedGameAction(state, { type: 'drop-disc', column: 0 }, 'a', 102) as Drop4GameState;
    expect(first.board[35]).toBe(0);
    expect(first.turnIndex).toBe(1);
    expect(applySharedGameAction(first, { type: 'drop-disc', column: 1 }, 'a', 103)).toBe(first);
    const second = applySharedGameAction(first, { type: 'drop-disc', column: 1 }, 'b', 104) as Drop4GameState;
    expect(second.board[36]).toBe(1);
  });

  it('detects a full-board draw', () => {
    const board = [
      0, 0, 1, 1, 0, 0, 1,
      1, 1, 0, 0, 1, 1, 0,
      0, 0, 1, 1, 0, 0, 1,
      1, 1, 0, 0, 1, 1, 0,
      0, 0, 1, 1, 0, 0, 1,
      1, 1, 0, 0, 1, 1, 0,
    ] as Array<0 | 1>;
    expect(getDrop4Winner(board)).toBeNull();
    expect(isDrop4Draw(board)).toBe(true);
  });
});

describe('Word Bomb', () => {
  it('validates required letters and duplicate words', () => {
    expect(validateWord('', 'ST', [])).toBe('empty');
    expect(validateWord('chair', 'ST', [])).toBe('missing');
    expect(validateWord('Star', 'ST', ['star'])).toBe('duplicate');
    expect(validateWord('stone', 'ST', [])).toBe('valid');
  });

  it('rotates turns after a valid word and ends clearly on timeout', () => {
    const state = createSharedGame('wordbomb', ['a', 'b'], 1000) as WordBombGameState;
    const played = applySharedGameAction(state, { type: 'submit-word', word: 'stone' }, 'a', 1500) as WordBombGameState;
    expect(played.chain).toEqual([{ playerId: 'a', word: 'stone' }]);
    expect(played.turnIndex).toBe(1);
    expect(played.deadline).toBe(11500);
    expect(applySharedGameAction(played, { type: 'submit-word', word: 'chair' }, 'a', 1600)).toBe(played);
    const timedOut = applySharedGameAction(played, { type: 'word-timeout' }, 'b', 11501) as WordBombGameState;
    expect(timedOut.phase).toBe('finished');
    expect(timedOut.timedOutPlayerId).toBe('b');
    expect(timedOut.winnerId).toBe('a');
  });
});

describe('Hot Takes', () => {
  it('accepts one vote per player and reveals real totals after everyone votes', () => {
    const state = createSharedGame('hottakes', ['a', 'b'], 100) as HotTakesGameState;
    const first = applySharedGameAction(state, { type: 'cast-vote', targetId: 'b' }, 'a', 101) as HotTakesGameState;
    expect(first.revealed).toBe(false);
    expect(applySharedGameAction(first, { type: 'cast-vote', targetId: 'a' }, 'a', 102)).toBe(first);
    const second = applySharedGameAction(first, { type: 'cast-vote', targetId: 'b' }, 'b', 103) as HotTakesGameState;
    expect(second.revealed).toBe(true);
    expect(Object.values(second.votes).filter((id) => id === 'b')).toHaveLength(2);
  });

  it('reconciles live voters after joins and disconnects without keeping stale votes', () => {
    const state = createSharedGame('hottakes', ['a', 'b', 'c'], 100) as HotTakesGameState;
    const first = applySharedGameAction(state, { type: 'cast-vote', targetId: 'b' }, 'a', 101) as HotTakesGameState;
    const expanded = refreshSharedGameRoster(first, ['a', 'b', 'c', 'd'], 102) as HotTakesGameState;
    expect(expanded.playerIds).toEqual(['a', 'b', 'c', 'd']);
    const second = applySharedGameAction(expanded, { type: 'cast-vote', targetId: 'b' }, 'b', 103) as HotTakesGameState;
    const reconciled = refreshSharedGameRoster(second, ['a', 'b'], 104) as HotTakesGameState;
    expect(reconciled.playerIds).toEqual(['a', 'b']);
    expect(reconciled.revealed).toBe(true);
    expect(refreshSharedGameRoster(reconciled, ['a', 'b', 'd'], 105)).toBe(reconciled);
  });
});

describe('Lantern Keepers', () => {
  it('generates deterministic bounded hazards and charges each miss once', () => {
    const first = createLanternEvents(42);
    expect(first).toEqual(createLanternEvents(42));
    expect(first.every((event) => event.lantern >= 0 && event.lantern < 4)).toBe(true);
    let state = createSharedGame('lanterns', ['a', 'b'], 1000) as LanternGameState;
    state = applySharedGameAction(state, { type: 'start-lanterns' }, 'a', 2000) as LanternGameState;
    const settled = settleLanternTime(state, 10000);
    expect(settled.penalized.length).toBeGreaterThan(0);
    expect(settleLanternTime(settled, 10000)).toBe(settled);
  });

  it('loses at zero warmth and allows one reward claim per player after success', () => {
    let state = createSharedGame('lanterns', ['a', 'b'], 1000) as LanternGameState;
    state = applySharedGameAction(state, { type: 'start-lanterns' }, 'a', 2000) as LanternGameState;
    const lost = settleLanternTime({ ...state, warmth: 4 }, 10000);
    expect(lost.phase).toBe('lost');
    const finished = { ...state, phase: 'finished' as const };
    const claimed = applySharedGameAction(finished, { type: 'claim-game-reward' }, 'a', 3000) as LanternGameState;
    expect(claimed.rewardClaims.a).toBe(true);
    expect(applySharedGameAction(claimed, { type: 'claim-game-reward' }, 'a', 3001)).toBe(claimed);
  });
});

describe('solo game transitions', () => {
  it('cycles trivia questions consistently', () => {
    expect(nextTriviaQuestion(0, 3)).toBe(1);
    expect(nextTriviaQuestion(2, 3)).toBe(0);
  });

  it('extends a correct melody and resets after a wrong note', () => {
    expect(melodyTap([0], [], 0)).toEqual({ outcome: 'complete', sequence: [0, 0], input: [] });
    expect(melodyTap([0, 2], [], 1)).toEqual({ outcome: 'wrong', sequence: [0], input: [] });
  });

  it('distinguishes an early reflex tap from a measured result', () => {
    expect(reflexTap('wait', 0, 100).message).toContain('Too soon');
    expect(reflexTap('go', 100, 287).message).toContain('187 ms');
  });

  it('creates a deterministic memory deck with exactly eight pairs', () => {
    const deck = createPairsDeck(42);
    expect(deck).toEqual(createPairsDeck(42));
    expect(deck).not.toEqual(createPairsDeck(43));
    expect(deck).toHaveLength(16);
    expect(Array.from({ length: 8 }, (_, item) => deck.filter((card) => card === item).length)).toEqual(Array(8).fill(2));
  });

  it('creates deterministic, solvable glow garden layouts', () => {
    const puzzle = createGardenPuzzle(42);
    expect(puzzle).toEqual(createGardenPuzzle(42));
    expect(puzzle).not.toEqual(createGardenPuzzle(43));
    expect(puzzle).toHaveLength(25);
    expect(puzzle.every(Boolean)).toBe(false);
    const corner = toggleGarden(Array(25).fill(false), 0);
    expect(corner.filter(Boolean)).toHaveLength(3);
    const center = toggleGarden(Array(25).fill(false), 12);
    expect(center.filter(Boolean)).toHaveLength(5);
    expect(toggleGarden(center, 12).every((value) => !value)).toBe(true);
  });

  it('moves tea cups only onto empty trays or larger cups', () => {
    const start = [[3, 2, 1], [], []];
    const first = moveTeaStack(start, 0, 2);
    expect(first).toEqual([[3, 2], [], [1]]);
    expect(moveTeaStack(first, 0, 2)).toBe(first);
    expect(moveTeaStack(first, 2, 1)).toEqual([[3, 2], [1], []]);
    expect(moveTeaStack(start, 1, 2)).toBe(start);
    const solved = [[0, 2], [0, 1], [2, 1], [0, 2], [1, 0], [1, 2], [0, 2]].reduce((pegs, [from, to]) => moveTeaStack(pegs, from, to), start);
    expect(solved).toEqual([[], [], [3, 2, 1]]);
  });

  it('creates deterministic solvable moon mosaics and only slides adjacent tiles', () => {
    const puzzle = createMosaicPuzzle(42);
    expect(puzzle).toEqual(createMosaicPuzzle(42));
    expect(puzzle).not.toEqual(createMosaicPuzzle(43));
    expect([...puzzle].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(isMosaicComplete(puzzle)).toBe(false);
    const solved = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    expect(mosaicMovableTiles(solved)).toEqual([5, 7]);
    expect(moveMosaic(solved, 0)).toBe(solved);
    expect(moveMosaic(solved, 7)).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
    expect(isMosaicComplete(solved)).toBe(true);
  });

  it('creates deterministic cozy codes and scores exact and nearby charms', () => {
    const code = createCozyCode(42);
    expect(code).toEqual(createCozyCode(42));
    expect(code).not.toEqual(createCozyCode(43));
    expect(code).toHaveLength(4);
    expect(new Set(code).size).toBe(4);
    expect(code.every((charm) => charm >= 0 && charm < 6)).toBe(true);
    expect(scoreCozyCode([0, 1, 2, 3], [0, 2, 1, 4])).toEqual({ exact: 1, nearby: 2 });
    expect(scoreCozyCode([0, 1, 2, 3], [0, 1, 2, 3])).toEqual({ exact: 4, nearby: 0 });
    expect(scoreCozyCode([0, 0, 1, 2], [0, 1, 0, 0])).toEqual({ exact: 1, nearby: 2 });
    expect(scoreCozyCode([0], [0])).toEqual({ exact: 0, nearby: 0 });
  });
});

describe('Mossy Reversi', () => {
  it('exposes legal opening moves, flips trapped discs, and rejects invalid turns', () => {
    const state = createSharedGame('reversi', ['a', 'b', 'watcher'], 100) as ReversiGameState;
    expect(state.playerIds).toEqual(['a', 'b']);
    const moves = reversiValidMoves(state.board, 0);
    expect(moves).toEqual([20, 29, 34, 43]);
    expect(applySharedGameAction(state, { type: 'place-reversi', index: moves[0] }, 'b', 101)).toBe(state);
    const played = applySharedGameAction(state, { type: 'place-reversi', index: moves[0] }, 'a', 102) as ReversiGameState;
    expect(reversiScores(played.board)).toEqual([4, 1]);
    expect(played.turnIndex).toBe(1);
    expect(applySharedGameAction(played, { type: 'place-reversi', index: 0 }, 'b', 103)).toBe(played);
  });

  it('flips in every direction and reaches a deterministic result with forced passes', () => {
    const board = Array(64).fill(-1) as ReversiGameState['board'];
    [18, 19, 20, 26, 28, 34, 35, 36].forEach((index) => { board[index] = 1; });
    [9, 11, 13, 25, 29, 41, 43, 45].forEach((index) => { board[index] = 0; });
    expect(reversiFlips(board, 27, 0)).toHaveLength(8);

    let state = createSharedGame('reversi', ['a', 'b'], 200) as ReversiGameState;
    let moves = 0;
    while (state.phase === 'playing' && moves < 64) {
      const index = reversiValidMoves(state.board, state.turnIndex)[0];
      state = applySharedGameAction(state, { type: 'place-reversi', index }, state.playerIds[state.turnIndex], 201 + moves) as ReversiGameState;
      moves += 1;
    }
    expect(['finished', 'draw']).toContain(state.phase);
    expect(moves).toBeLessThanOrEqual(60);
  });
});

describe('Bridge Builders', () => {
  it('requires a reciprocal connected route and awards the completing placement', () => {
    let state = createSharedGame('bridges', ['a', 'b'], 100) as BridgeGameState;
    const straight = bridgeTileMask(0, 0);
    expect(validBridgePlacements(state.board, straight)).toEqual([22]);
    expect(applySharedGameAction(state, { type: 'place-bridge', index: 30, tile: 0, rotation: 0 }, 'a', 101)).toBe(state);
    for (const [step, index] of [22, 23, 24, 25, 26].entries()) {
      const actor = step % 2 === 0 ? 'a' : 'b';
      state = applySharedGameAction(state, { type: 'place-bridge', index, tile: 0, rotation: 0 }, actor, 102 + step) as BridgeGameState;
    }
    expect(state.phase).toBe('finished');
    expect(state.winnerId).toBe('a');
  });

  it('seats up to four builders and rejects a tile facing away from the route', () => {
    const state = createSharedGame('bridges', ['a', 'b', 'c', 'd', 'watcher'], 200) as BridgeGameState;
    expect(state.playerIds).toEqual(['a', 'b', 'c', 'd']);
    expect(validBridgePlacements(state.board, bridgeTileMask(0, 1))).toEqual([]);
    const played = applySharedGameAction(state, { type: 'place-bridge', index: 22, tile: 0, rotation: 0 }, 'a', 201) as BridgeGameState;
    expect(played.turnIndex).toBe(1);
  });
});

describe('Cozy Market', () => {
  it('drafts one item per player for three rounds and scores deterministic sets', () => {
    let state = createSharedGame('market', ['a', 'b'], 100) as MarketGameState;
    expect(state.available).toEqual(createMarketRow(state.seed, 1));
    const wrongTurn = applySharedGameAction(state, { type: 'pick-market', slot: 0 }, 'b', 101);
    expect(wrongTurn).toBe(state);
    for (let round = 1; round <= 3; round += 1) {
      state = applySharedGameAction(state, { type: 'pick-market', slot: 0 }, 'a', 110 + round) as MarketGameState;
      const duplicate = applySharedGameAction(state, { type: 'pick-market', slot: 99 }, 'b', 120 + round);
      expect(duplicate).toBe(state);
      state = applySharedGameAction(state, { type: 'pick-market', slot: 0 }, 'b', 130 + round) as MarketGameState;
    }
    expect(state.phase).toBe('finished');
    expect(state.inventories.a).toHaveLength(3);
    expect(Object.values(state.scores)).toHaveLength(2);
    expect(scoreMarketInventory([1, 1, 1])).toBe(9);
    expect(scoreMarketInventory([0, 1, 2])).toBe(5);
    expect(scoreMarketInventory([3, 3, 4])).toBe(4);
  });

  it('waits for every seated shopper before refilling a four-player market', () => {
    let state = createSharedGame('market', ['a', 'b', 'c', 'd'], 300) as MarketGameState;
    for (const id of ['a', 'b', 'c']) state = applySharedGameAction(state, { type: 'pick-market', slot: 0 }, id, 301) as MarketGameState;
    expect(state.round).toBe(1);
    expect(state.available).toHaveLength(2);
    state = applySharedGameAction(state, { type: 'pick-market', slot: 0 }, 'd', 302) as MarketGameState;
    expect(state.round).toBe(2);
    expect(state.available).toHaveLength(5);
  });
});

describe('party scoring', () => {
  it('extracts deterministic winners from competitive and cooperative results', () => {
    const drop = { ...(createSharedGame('drop4', ['a', 'b'], 1) as Drop4GameState), phase: 'finished' as const, winnerId: 'b' };
    expect(sharedGameWinnerIds(drop)).toEqual(['b']);
    const market = { ...(createSharedGame('market', ['a', 'b'], 1) as MarketGameState), phase: 'finished' as const, winnerIds: ['a', 'b'] };
    expect(sharedGameWinnerIds(market)).toEqual(['a', 'b']);
    const lanterns = { ...(createSharedGame('lanterns', ['a', 'b'], 1) as LanternGameState), phase: 'finished' as const };
    expect(sharedGameWinnerIds(lanterns)).toEqual(['a', 'b']);
  });

  it('never carries a stale shared winner into another or solo round', () => {
    const finishedDrop = { ...(createSharedGame('drop4', ['a', 'b'], 1) as Drop4GameState), phase: 'finished' as const, winnerId: 'a' };
    expect(partyRoundWinnerIds('drop4', finishedDrop)).toEqual(['a']);
    expect(partyRoundWinnerIds('market', finishedDrop)).toEqual([]);
    expect(partyRoundWinnerIds('pairs', finishedDrop)).toEqual([]);
  });

  it('lets a lost cooperative round advance without making it rewardable', () => {
    const lost = { ...(createSharedGame('lanterns', ['a', 'b'], 1) as LanternGameState), phase: 'lost' as const, warmth: 0 };
    expect(isSharedGameSettled(lost)).toBe(true);
    expect(isSharedGameComplete(lost)).toBe(false);
    expect(applySharedGameAction(lost, { type: 'claim-game-reward' }, 'a', 2)).toBe(lost);
  });
});

describe('shared snapshot recovery', () => {
  it('repairs incomplete fixed-size boards before gameplay', () => {
    const drop = createSharedGame('drop4', ['a', 'b'], 1) as Drop4GameState;
    const repairedDrop = normalizeSharedGame({ ...drop, board: [0] } as Drop4GameState) as Drop4GameState;
    expect(repairedDrop.board).toHaveLength(42);
    expect(repairedDrop.board.every((cell) => cell === -1)).toBe(true);
    const bridge = createSharedGame('bridges', ['a', 'b'], 1) as BridgeGameState;
    const repairedBridge = normalizeSharedGame({ ...bridge, board: [], owners: [] } as BridgeGameState) as BridgeGameState;
    expect(repairedBridge.board).toHaveLength(49);
    expect(repairedBridge.board[21]).toBe(2);
    expect(repairedBridge.board[27]).toBe(8);
    expect(repairedBridge.owners).toHaveLength(49);
  });
});

describe('profile rewards', () => {
  it('applies the amounts written in reward messages', () => {
    const player = { ...seedPlayers[0], level: 1, xp: 95, coins: 100, trophyCount: 0 };
    const gacha = applyProfileReward(player, 'You found a tiny clay star! +15 coins');
    expect(gacha).toMatchObject({ coins: 115, xp: 95, level: 1, trophyCount: 0 });
    const win = applyProfileReward(gacha, 'Game complete! Trophy earned · +40 coins · +30 XP.');
    expect(win).toMatchObject({ coins: 155, xp: 25, level: 2, trophyCount: 1 });
  });

  it('leaves flavor-only messages unchanged', () => {
    expect(applyProfileReward(seedPlayers[0], 'The rain sounds extra cozy now.')).toBe(seedPlayers[0]);
  });

  it('does not let a stale room snapshot roll back earned progress', () => {
    const local = { ...seedPlayers[0], level: 13, xp: 5, coins: 1300, trophyCount: 7 };
    const remote = { ...seedPlayers[0], look: { ...seedPlayers[0].look, body: 'mint' } };
    expect(mergeProfileProgress(local, remote)).toMatchObject({ level: 13, xp: 5, coins: 1300, trophyCount: 7, look: remote.look });
  });
});
