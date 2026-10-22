import type { GameMeta, PlayerProfile, TriviaQuestion } from './types';

export const games: GameMeta[] = [
  { id: 'drop4', label: 'Drop 4', icon: '🔴', color: '#df473b', description: 'Line up four before your friends do.' },
  { id: 'wordbomb', label: 'Word Bomb', icon: '💣', color: '#28242a', description: 'Think fast. Keep the word chain alive.' },
  { id: 'trivia', label: 'Trivia', icon: '?', color: '#87a66a', description: 'Buzz in for a cozy brain battle.' },
  { id: 'melody', label: 'Melody', icon: '♪', color: '#9b7cca', description: 'Repeat the tune, one note at a time.' },
  { id: 'reflex', label: 'Reflex', icon: '⚡', color: '#e7a62e', description: 'Wait for the glow. Then tap!' },
  { id: 'hottakes', label: 'Hot Takes', icon: '🔥', color: '#e96746', description: 'Vote, reveal, and defend your choice.' },
  { id: 'lanterns', label: 'Lantern Keepers', icon: '🏮', color: '#4f94a1', description: 'Keep the clubhouse glowing together.', cooperative: true },
];

export const seedPlayers: PlayerProfile[] = [
  { id: 'you', name: 'Maple', status: 'Feeling cozy', look: { body: 'teal', sprout: 'leaf', face: 'happy' }, level: 12, xp: 62, coins: 1240, ready: false, online: true, trophyCount: 5, shelfToy: '⭐' },
];

export const trivia: TriviaQuestion[] = [
  { category: 'Cozy Things', question: 'Which drink is traditionally made with steamed milk and espresso?', answers: ['Lemonade', 'Latte', 'Iced tea', 'Soda'], correct: 1 },
  { category: 'Tiny Worlds', question: 'What do fireflies use their glow for?', answers: ['Keeping warm', 'Communication', 'Finding snacks', 'Navigation only'], correct: 1 },
  { category: 'Game Night', question: 'How many spaces are on a standard chessboard?', answers: ['32', '48', '64', '100'], correct: 2 },
];

export const hotTakePrompts = [
  'Who would survive longest with only snacks and a flashlight?',
  'Which is the perfect rainy-night food?',
  'Who is most likely to become accidentally famous?',
];

export const wordSyllables = ['ST', 'CH', 'ING', 'AR', 'ON', 'ATE'];

export const promptCards = [
  'What tiny win made your week better?',
  'Pick a soundtrack for this exact moment.',
  'If this room had a secret door, where would it go?',
  'Invent a snack that should not work—but does.',
];
