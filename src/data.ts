import type { GameMeta, PlayerProfile, TriviaQuestion } from './types';

export const games: GameMeta[] = [
  { id: 'drop4', label: 'Drop 4', icon: '🔴', color: '#df473b', description: 'Line up four before your friends do.', players: '2 players' },
  { id: 'wordbomb', label: 'Word Bomb', icon: '💣', color: '#28242a', description: 'Think fast. Keep the word chain alive.', players: '2–4 players' },
  { id: 'trivia', label: 'Trivia', icon: '?', color: '#87a66a', description: 'Buzz in for a cozy brain battle.', players: 'Solo' },
  { id: 'melody', label: 'Melody', icon: '♪', color: '#9b7cca', description: 'Repeat the tune, one note at a time.', players: 'Solo' },
  { id: 'reflex', label: 'Reflex', icon: '⚡', color: '#e7a62e', description: 'Wait for the glow. Then tap!', players: 'Solo' },
  { id: 'pairs', label: 'Firefly Pairs', icon: '✨', color: '#8067b7', description: 'Turn over keepsakes and find every pair.', players: 'Solo' },
  { id: 'garden', label: 'Glow Garden', icon: '🌼', color: '#4f8e68', description: 'Wake every moonflower with clever taps.', players: 'Solo' },
  { id: 'teastack', label: 'Tea Stack', icon: '🫖', color: '#ba704d', description: 'Move the tiny tea set without a spill.', players: 'Solo' },
  { id: 'mosaic', label: 'Moon Mosaic', icon: '🌙', color: '#5577a6', description: 'Slide the night-sky tiles back into place.', players: 'Solo' },
  { id: 'cozycode', label: 'Cozy Code', icon: '🔐', color: '#8e5c96', description: 'Crack the four-charm code in seven guesses.', players: 'Solo' },
  { id: 'hottakes', label: 'Hot Takes', icon: '🔥', color: '#e96746', description: 'Vote, reveal, and defend your choice.', players: '2–4 players' },
  { id: 'lanterns', label: 'Lantern Keepers', icon: '🏮', color: '#4f94a1', description: 'Keep the clubhouse glowing together.', players: '2–4 players', cooperative: true },
  { id: 'reversi', label: 'Mossy Reversi', icon: '🍃', color: '#628753', description: 'Flip the grove and claim the most moss.', players: '2 players' },
  { id: 'bridges', label: 'Bridge Builders', icon: '🌉', color: '#438eaa', description: 'Place path tiles and finish the crossing.', players: '2–4 players' },
  { id: 'market', label: 'Cozy Market', icon: '🧺', color: '#c97743', description: 'Draft three treasures into the best set.', players: '2–4 players' },
];

export const seedPlayers: PlayerProfile[] = [
  { id: 'you', name: 'Maple', status: 'Feeling cozy', look: { body: 'teal', sprout: 'leaf', face: 'happy' }, level: 1, xp: 0, coins: 200, ready: false, online: true, trophyCount: 0, shelfToy: '⭐' },
];

export const trivia: TriviaQuestion[] = [
  { category: 'Cozy Things', question: 'Which drink is traditionally made with steamed milk and espresso?', answers: ['Lemonade', 'Latte', 'Iced tea', 'Soda'], correct: 1 },
  { category: 'Tiny Worlds', question: 'What do fireflies use their glow for?', answers: ['Keeping warm', 'Communication', 'Finding snacks', 'Navigation only'], correct: 1 },
  { category: 'Game Night', question: 'How many spaces are on a standard chessboard?', answers: ['32', '48', '64', '100'], correct: 2 },
  { category: 'Rainy Days', question: 'What instrument measures rainfall?', answers: ['Barometer', 'Rain gauge', 'Compass', 'Thermometer'], correct: 1 },
  { category: 'Woodland', question: 'An acorn grows into which kind of tree?', answers: ['Maple', 'Pine', 'Oak', 'Willow'], correct: 2 },
  { category: 'Kitchen', question: 'Which ingredient makes bread dough rise?', answers: ['Yeast', 'Cocoa', 'Salt', 'Vanilla'], correct: 0 },
  { category: 'Night Sky', question: 'Which planet is famous for its bright rings?', answers: ['Mars', 'Venus', 'Saturn', 'Mercury'], correct: 2 },
  { category: 'Music', question: 'How many notes are in a standard major scale before it repeats?', answers: ['Five', 'Seven', 'Nine', 'Twelve'], correct: 1 },
  { category: 'Tiny Worlds', question: 'What is a group of mushrooms sometimes called?', answers: ['A chorus', 'A troop', 'A bouquet', 'A circle only'], correct: 1 },
  { category: 'Cozy Things', question: 'Which fiber comes from sheep?', answers: ['Linen', 'Silk', 'Wool', 'Cotton'], correct: 2 },
  { category: 'Game Night', question: 'In a standard deck, how many suits are there?', answers: ['Three', 'Four', 'Five', 'Six'], correct: 1 },
  { category: 'Garden', question: 'Which part of a flower usually attracts pollinators with color?', answers: ['Roots', 'Stem', 'Petals', 'Seeds'], correct: 2 },
];

export const hotTakePrompts = [
  'Who would survive longest with only snacks and a flashlight?',
  'Which is the perfect rainy-night food?',
  'Who is most likely to become accidentally famous?',
  'Who would discover the clubhouse’s secret passage first?',
  'Which snack belongs in every game-night bowl?',
  'Who would befriend a mysterious forest creature?',
  'Which season has the strongest cozy energy?',
  'Who would build the best blanket fort?',
  'Which tiny superpower would be most useful?',
  'Who is most likely to stay up until sunrise talking?',
  'Which song should play when the Pod enters a room?',
  'Who would win a no-recipe baking contest?',
];

export const wordSyllables = ['ST', 'CH', 'ING', 'AR', 'ON', 'ATE', 'OO', 'ER', 'LY', 'EA', 'TR', 'EN'];

export const promptCards = [
  'What tiny win made your week better?',
  'Pick a soundtrack for this exact moment.',
  'If this room had a secret door, where would it go?',
  'Invent a snack that should not work—but does.',
  'What ordinary object would make a great magical artifact?',
  'Name a place you would revisit just for the atmosphere.',
  'Design the perfect three-item rainy-day kit.',
  'What harmless rule should every clubhouse have?',
  'Give tonight’s gathering a dramatic episode title.',
  'Which fictional world deserves a quiet little café?',
  'What smell instantly makes a place feel like home?',
  'Invent a holiday for something wonderfully unimportant.',
];
