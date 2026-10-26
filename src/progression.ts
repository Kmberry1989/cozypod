import type { GameId, PlayerProfile } from './types';

export const soloGameIds = ['trivia', 'melody', 'reflex', 'pairs', 'garden', 'teastack', 'mosaic', 'cozycode'] as const satisfies readonly GameId[];
export type SoloGameId = (typeof soloGameIds)[number];

export interface DailyProgress {
  date: string;
  rounds: number;
  games: Partial<Record<SoloGameId, number>>;
  claimed: boolean;
}

export interface DailyGoal {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
  rewardXp: number;
  progress: (daily: DailyProgress) => number;
}

export interface AchievementDefinition {
  id: string;
  icon: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardXp: number;
  unlocked: (profile: PlayerProfile, recordCount: number) => boolean;
}

const dailyGoals: Omit<DailyGoal, 'progress'>[] = [
  { id: 'two-rounds', title: 'Two warm cups', description: 'Complete any 2 solo game rounds.', target: 2, rewardCoins: 30, rewardXp: 20 },
  { id: 'variety', title: 'Try a new nook', description: 'Complete 2 different solo games.', target: 2, rewardCoins: 35, rewardXp: 20 },
  { id: 'brain-glow', title: 'Brain glow', description: 'Finish Trivia, Moon Mosaic, or Cozy Code.', target: 1, rewardCoins: 25, rewardXp: 15 },
  { id: 'quick-ears', title: 'Quick ears', description: 'Finish a Melody or Reflex round.', target: 1, rewardCoins: 25, rewardXp: 15 },
];

export const achievements: AchievementDefinition[] = [
  { id: 'first-glow', icon: '✨', title: 'First glow', description: 'Set your first solo arcade record.', rewardCoins: 40, rewardXp: 25, unlocked: (_profile, records) => records >= 1 },
  { id: 'cozy-explorer', icon: '🧭', title: 'Cozy explorer', description: 'Set records in 4 solo games.', rewardCoins: 75, rewardXp: 40, unlocked: (_profile, records) => records >= 4 },
  { id: 'arcade-natural', icon: '🎮', title: 'Arcade natural', description: 'Set a record in every solo game.', rewardCoins: 150, rewardXp: 80, unlocked: (_profile, records) => records >= soloGameIds.length },
  { id: 'trophy-shelf', icon: '🏆', title: 'Trophy shelf', description: 'Earn 3 multiplayer trophies.', rewardCoins: 90, rewardXp: 50, unlocked: (profile) => profile.trophyCount >= 3 },
  { id: 'clubhouse-regular', icon: '🏡', title: 'Clubhouse regular', description: 'Reach Podling level 5.', rewardCoins: 120, rewardXp: 60, unlocked: (profile) => profile.level >= 5 },
];

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function emptyDailyProgress(date: string): DailyProgress {
  return { date, rounds: 0, games: {}, claimed: false };
}

export function normalizeDailyProgress(value: unknown, date: string): DailyProgress {
  if (!value || typeof value !== 'object' || (value as DailyProgress).date !== date) return emptyDailyProgress(date);
  const stored = value as Partial<DailyProgress>;
  const games = Object.fromEntries(Object.entries(stored.games || {}).filter(([id, count]) => soloGameIds.includes(id as SoloGameId) && Number.isInteger(count) && Number(count) > 0));
  return {
    date,
    rounds: Number.isInteger(stored.rounds) && Number(stored.rounds) >= 0 ? Number(stored.rounds) : 0,
    games,
    claimed: stored.claimed === true,
  };
}

export function recordSoloCompletion(current: DailyProgress, gameId: SoloGameId, date = localDateKey()): DailyProgress {
  const daily = current.date === date ? current : emptyDailyProgress(date);
  return {
    ...daily,
    rounds: daily.rounds + 1,
    games: { ...daily.games, [gameId]: (daily.games[gameId] || 0) + 1 },
  };
}

export function dailyGoalFor(date: string): DailyGoal {
  const dayNumber = Math.floor(new Date(`${date}T12:00:00`).getTime() / 86_400_000);
  const definition = dailyGoals[Math.abs(dayNumber) % dailyGoals.length];
  const progress = definition.id === 'two-rounds'
    ? (daily: DailyProgress) => daily.rounds
    : definition.id === 'variety'
      ? (daily: DailyProgress) => Object.keys(daily.games).length
      : definition.id === 'brain-glow'
        ? (daily: DailyProgress) => ['trivia', 'mosaic', 'cozycode'].reduce((total, id) => total + (daily.games[id as SoloGameId] || 0), 0)
        : (daily: DailyProgress) => ['melody', 'reflex'].reduce((total, id) => total + (daily.games[id as SoloGameId] || 0), 0);
  return { ...definition, progress };
}
