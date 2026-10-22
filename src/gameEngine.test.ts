import { describe, expect, it } from 'vitest';
import {
  applySharedGameAction,
  createLanternEvents,
  createSharedGame,
  dropDisc,
  getDrop4Winner,
  isDrop4Draw,
  melodyTap,
  nextTriviaQuestion,
  reflexTap,
  settleLanternTime,
  validateWord,
} from './gameEngine';
import type { Drop4GameState, HotTakesGameState, LanternGameState, WordBombGameState } from './types';

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
    const claimed = applySharedGameAction(finished, { type: 'claim-lantern-reward' }, 'a', 3000) as LanternGameState;
    expect(claimed.rewardClaims.a).toBe(true);
    expect(applySharedGameAction(claimed, { type: 'claim-lantern-reward' }, 'a', 3001)).toBe(claimed);
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
});
