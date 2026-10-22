export type View = 'lounge' | 'arcade' | 'wardrobe';
export type GameId = 'drop4' | 'wordbomb' | 'trivia' | 'melody' | 'reflex' | 'hottakes' | 'lanterns';
export type MultiplayerGameId = 'drop4' | 'wordbomb' | 'hottakes' | 'lanterns';
export type BodyColor = string;
export type Sprout = string;
export type Face = string;

export interface PodlingLook {
  body: BodyColor;
  sprout: Sprout;
  face: Face;
  hat?: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  status: string;
  look: PodlingLook;
  level: number;
  xp: number;
  coins: number;
  ready: boolean;
  online: boolean;
  trophyCount: number;
  shelfToy: string;
  roomBackground?: string;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  name: string;
  text: string;
  createdAt: number;
}

export interface GameMeta {
  id: GameId;
  label: string;
  icon: string;
  color: string;
  description: string;
  cooperative?: boolean;
}

export type PartyPhase = 'lounge' | 'ready' | 'playing' | 'recap';

export interface PartyState {
  phase: PartyPhase;
  queue: GameId[];
  round: number;
  scores: Record<string, number>;
  selectedGame?: GameId;
  game?: SharedGameState;
}

export type SharedGamePhase = 'waiting' | 'ready' | 'playing' | 'finished' | 'draw' | 'lost';

interface SharedGameBase {
  sessionId: string;
  gameId: MultiplayerGameId;
  phase: SharedGamePhase;
  playerIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Drop4GameState extends SharedGameBase {
  gameId: 'drop4';
  board: Array<-1 | 0 | 1>;
  turnIndex: 0 | 1;
  winnerId?: string;
}

export interface WordBombEntry { playerId: string; word: string; }
export interface WordBombGameState extends SharedGameBase {
  gameId: 'wordbomb';
  chain: WordBombEntry[];
  syllableIndex: number;
  turnIndex: number;
  deadline: number;
  timedOutPlayerId?: string;
  winnerId?: string;
}

export interface HotTakesGameState extends SharedGameBase {
  gameId: 'hottakes';
  promptIndex: number;
  votes: Record<string, string>;
  revealed: boolean;
}

export interface LanternGameState extends SharedGameBase {
  gameId: 'lanterns';
  seed: number;
  startedAt: number;
  deadline: number;
  warmth: number;
  resolved: number[];
  penalized: number[];
  rewardClaims: Record<string, boolean>;
}

export type SharedGameState = Drop4GameState | WordBombGameState | HotTakesGameState | LanternGameState;

export type SharedGameAction =
  | { type: 'restart' }
  | { type: 'drop-disc'; column: number }
  | { type: 'submit-word'; word: string }
  | { type: 'word-timeout' }
  | { type: 'cast-vote'; targetId: string }
  | { type: 'next-prompt' }
  | { type: 'start-lanterns' }
  | { type: 'resolve-lantern'; lantern: number }
  | { type: 'lantern-tick' }
  | { type: 'claim-lantern-reward' };

export interface TriviaQuestion {
  category: string;
  question: string;
  answers: string[];
  correct: number;
}
