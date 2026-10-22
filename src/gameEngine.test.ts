import { describe, expect, it } from 'vitest';
import { createLanternEvents, dropDisc, getDrop4Winner } from './gameEngine';

describe('Drop 4', () => {
  it('drops into the lowest open cell and detects a horizontal winner', () => {
    let board = Array(42).fill(null);
    for (let col = 0; col < 4; col += 1) board = dropDisc(board, col, 0);
    expect(board[35]).toBe(0);
    expect(getDrop4Winner(board)).toBe(0);
  });
  it('does not mutate a full column', () => {
    const board = Array(42).fill(null);
    let full = board;
    for (let i = 0; i < 6; i += 1) full = dropDisc(full, 2, (i % 2) as 0 | 1);
    expect(dropDisc(full, 2, 0)).toBe(full);
  });
});

describe('Lantern Keepers', () => {
  it('generates deterministic, bounded events', () => {
    const first = createLanternEvents(42);
    expect(first).toEqual(createLanternEvents(42));
    expect(first.every((event) => event.lantern >= 0 && event.lantern < 4)).toBe(true);
    expect(first.at(-1)?.at).toBeLessThan(60);
  });
});
