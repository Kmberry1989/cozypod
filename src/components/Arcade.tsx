import { BookOpen } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { games } from '../data';
import type { GameId, PartyState, PlayerProfile, SharedGameAction, SharedGameState } from '../types';
import { BridgeStage, Drop4Stage, HotTakesStage, LanternStage, MarketStage, MelodyStage, ReflexStage, ReversiStage, TriviaStage, WordBombStage } from './GameStages';

interface ArcadeProps {
  players: PlayerProfile[];
  meId: string;
  selected: GameId;
  party: PartyState;
  sharedGame: SharedGameState | null;
  onSelect: (id: GameId) => void;
  onGameAction: (action: SharedGameAction) => Promise<{ state: SharedGameState | null; changed: boolean }>;
  onReward: (message: string) => void;
}

const rules: Record<GameId, string> = {
  drop4: 'Two players alternate dropping discs. Connect four across, down, or diagonally.',
  wordbomb: 'Use the shown letters in a new word before your ten-second turn expires.',
  trivia: 'Pick one answer. The correct choice is revealed before the next question.',
  melody: 'Listen to the notes, then repeat the complete sequence in order.',
  reflex: 'Start the round, wait for the lantern to glow, then tap as quickly as you can.',
  hottakes: 'Every player votes once. Results appear after everyone has locked a vote.',
  lanterns: 'Work together for sixty seconds. Tap a threatened lantern before its hazard lands.',
  reversi: 'Two players place discs to trap and flip straight lines. If you have no legal move, your turn is skipped. Most discs wins.',
  bridges: 'Two to four players extend one connected route. Choose and rotate a tile; the player whose placement reaches the far cottage wins.',
  market: 'Two to four players draft one item per round for three rounds. A pair scores 4, three different score 5, and a matching trio scores 9.',
};

export function Arcade({ players, meId, selected, party, sharedGame, onSelect, onGameAction, onReward }: ArcadeProps) {
  const [showRules, setShowRules] = useState(false);
  const active = games.find((game) => game.id === selected)!;
  return (
    <section className="arcade-screen" aria-labelledby="arcade-title">
      <div className="screen-heading"><div><h1 id="arcade-title">Arcade</h1><p>{party.phase === 'playing' ? `Party round ${party.round + 1}` : 'Pick a game from the shelf'}</p></div><button type="button" onClick={() => setShowRules((value) => !value)}><BookOpen size={17} /> How to play</button></div>
      {showRules && <aside className="game-rules" aria-label={`${active.label} rules`}><strong>{active.label}</strong><p>{rules[selected]}</p></aside>}
      <div className="game-shelf" aria-label="Choose a game">
        {games.map((game) => <button key={game.id} className={selected === game.id ? 'active' : ''} style={{ '--token': game.color } as CSSProperties} type="button" onClick={() => onSelect(game.id)}><span>{game.icon}</span><small>{game.label}</small></button>)}
      </div>
      <div className="active-game" style={{ '--game-accent': active.color } as CSSProperties}>
        {selected === 'drop4' && <Drop4Stage players={players} meId={meId} game={sharedGame?.gameId === 'drop4' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'wordbomb' && <WordBombStage players={players} meId={meId} game={sharedGame?.gameId === 'wordbomb' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'trivia' && <TriviaStage />}
        {selected === 'melody' && <MelodyStage />}
        {selected === 'reflex' && <ReflexStage />}
        {selected === 'hottakes' && <HotTakesStage players={players} meId={meId} game={sharedGame?.gameId === 'hottakes' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'lanterns' && <LanternStage players={players} meId={meId} game={sharedGame?.gameId === 'lanterns' ? sharedGame : null} onAction={onGameAction} onWin={() => onReward('Storm cleared! Everyone earned +40 coins and +30 XP.')} />}
        {selected === 'reversi' && <ReversiStage players={players} meId={meId} game={sharedGame?.gameId === 'reversi' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'bridges' && <BridgeStage players={players} meId={meId} game={sharedGame?.gameId === 'bridges' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'market' && <MarketStage players={players} meId={meId} game={sharedGame?.gameId === 'market' ? sharedGame : null} onAction={onGameAction} />}
      </div>
    </section>
  );
}
