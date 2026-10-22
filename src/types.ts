export type View = 'lounge' | 'arcade' | 'wardrobe';
export type GameId = 'drop4' | 'wordbomb' | 'trivia' | 'melody' | 'reflex' | 'hottakes' | 'lanterns';
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
}

export interface TriviaQuestion {
  category: string;
  question: string;
  answers: string[];
  correct: number;
}
