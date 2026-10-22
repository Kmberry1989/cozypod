import { describe, expect, it } from 'vitest';
import { hotTakePrompts, promptCards, seedPlayers, trivia, wordSyllables } from './data';

describe('replayable content pools', () => {
  it('keeps trivia answers valid and questions unique', () => {
    expect(trivia.length).toBeGreaterThanOrEqual(12);
    expect(new Set(trivia.map((item) => item.question)).size).toBe(trivia.length);
    trivia.forEach((item) => {
      expect(item.answers).toHaveLength(4);
      expect(item.correct).toBeGreaterThanOrEqual(0);
      expect(item.correct).toBeLessThan(item.answers.length);
    });
  });

  it('has non-repeating social and word-game prompts', () => {
    expect(new Set(hotTakePrompts).size).toBe(hotTakePrompts.length);
    expect(new Set(promptCards).size).toBe(promptCards.length);
    expect(new Set(wordSyllables).size).toBe(wordSyllables.length);
    expect(hotTakePrompts.length).toBeGreaterThanOrEqual(10);
    expect(promptCards.length).toBeGreaterThanOrEqual(10);
    expect(wordSyllables.every((syllable) => /^[A-Z]{2,3}$/.test(syllable))).toBe(true);
  });

  it('starts fresh profiles before progression unlocks', () => {
    expect(seedPlayers[0]).toMatchObject({ level: 1, xp: 0, coins: 200, trophyCount: 0 });
  });
});
