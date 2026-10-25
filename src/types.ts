export type View = 'lounge' | 'arcade' | 'wardrobe';
export type GameId = 'drop4' | 'wordbomb' | 'trivia' | 'melody' | 'reflex' | 'pairs' | 'garden' | 'teastack' | 'mosaic' | 'cozycode' | 'hottakes' | 'lanterns' | 'reversi' | 'bridges' | 'market';
export type MultiplayerGameId = 'drop4' | 'wordbomb' | 'hottakes' | 'lanterns' | 'reversi' | 'bridges' | 'market';
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
  joinedAt?: number;
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
  players: 'Solo' | '2 players' | '2–4 players';
  cooperative?: boolean;
}

export type PartyPhase = 'lounge' | 'ready' | 'playing' | 'recap';

export interface PartyState {
  phase: PartyPhase;
  queue: GameId[];
  round: number;
  scores: Record<string, number>;
  updatedAt?: number;
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
  rewardClaims: Record<string, boolean>;
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
}

export interface ReversiGameState extends SharedGameBase {
  gameId: 'reversi';
  board: Array<-1 | 0 | 1>;
  turnIndex: 0 | 1;
  winnerId?: string;
}

export interface BridgeGameState extends SharedGameBase {
  gameId: 'bridges';
  board: number[];
  owners: number[];
  turnIndex: number;
  winnerId?: string;
}

export interface MarketGameState extends SharedGameBase {
  gameId: 'market';
  seed: number;
  round: number;
  turnIndex: number;
  available: number[];
  inventories: Record<string, number[]>;
  scores: Record<string, number>;
  winnerIds: string[];
}

export type SharedGameState = Drop4GameState | WordBombGameState | HotTakesGameState | LanternGameState | ReversiGameState | BridgeGameState | MarketGameState;

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
  | { type: 'claim-game-reward' }
  | { type: 'place-reversi'; index: number }
  | { type: 'place-bridge'; index: number; tile: number; rotation: number }
  | { type: 'pick-market'; slot: number };

export interface TriviaQuestion {
  category: string;
  question: string;
  answers: string[];
  correct: number;
}
