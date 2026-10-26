import { describe, expect, it } from 'vitest';
import { achievements, dailyGoalFor, emptyDailyProgress, localDateKey, normalizeDailyProgress, recordSoloCompletion } from './progression';
import { seedPlayers } from './data';

describe('arcade progression', () => {
  it('uses a stable local calendar key', () => {
    expect(localDateKey(new Date(2026, 9, 6, 23, 59))).toBe('2026-10-06');
  });

  it('records rounds and distinct solo games', () => {
    const date = '2026-10-26';
    let progress = emptyDailyProgress(date);
    progress = recordSoloCompletion(progress, 'trivia', date);
    progress = recordSoloCompletion(progress, 'trivia', date);
    progress = recordSoloCompletion(progress, 'mosaic', date);
    expect(progress.rounds).toBe(3);
    expect(progress.games).toEqual({ trivia: 2, mosaic: 1 });
  });

  it('resets stale daily progress on the next day', () => {
    const stale = recordSoloCompletion(emptyDailyProgress('2026-10-25'), 'melody', '2026-10-25');
    expect(recordSoloCompletion(stale, 'reflex', '2026-10-26')).toEqual({ date: '2026-10-26', rounds: 1, games: { reflex: 1 }, claimed: false });
  });

  it('sanitizes malformed stored progress', () => {
    expect(normalizeDailyProgress({ date: '2026-10-26', rounds: -2, games: { trivia: 2, nope: 4, reflex: 0 }, claimed: 'yes' }, '2026-10-26'))
      .toEqual({ date: '2026-10-26', rounds: 0, games: { trivia: 2 }, claimed: false });
  });

  it('rotates goals deterministically and caps can be applied by the UI', () => {
    const goal = dailyGoalFor('2026-10-26');
    expect(dailyGoalFor('2026-10-26').id).toBe(goal.id);
    expect(goal.target).toBeGreaterThan(0);
    expect(goal.progress(emptyDailyProgress('2026-10-26'))).toBe(0);
  });

  it('unlocks achievements from records and profile milestones', () => {
    expect(achievements.find((item) => item.id === 'first-glow')?.unlocked(seedPlayers[0], 1)).toBe(true);
    expect(achievements.find((item) => item.id === 'trophy-shelf')?.unlocked({ ...seedPlayers[0], trophyCount: 3 }, 0)).toBe(true);
    expect(achievements.find((item) => item.id === 'arcade-natural')?.unlocked(seedPlayers[0], 7)).toBe(false);
  });
});
