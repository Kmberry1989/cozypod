import { BookOpen } from 'lucide-react';
import type { CSSProperties } from 'react';
import { games } from '../data';
import type { GameId, PartyState, PlayerProfile } from '../types';
import { Drop4Stage, HotTakesStage, LanternStage, MelodyStage, ReflexStage, TriviaStage, WordBombStage } from './GameStages';

interface ArcadeProps {
  players: PlayerProfile[];
  selected: GameId;
  party: PartyState;
  onSelect: (id: GameId) => void;
  onReward: (message: string) => void;
}

export function Arcade({ players, selected, party, onSelect, onReward }: ArcadeProps) {
  const active = games.find((game) => game.id === selected)!;
  return (
    <section className="arcade-screen" aria-labelledby="arcade-title">
      <div className="screen-heading"><div><h1 id="arcade-title">Arcade</h1><p>{party.phase === 'playing' ? `Party round ${party.round + 1}` : 'Pick a game from the shelf'}</p></div><button type="button"><BookOpen size={17} /> How to play</button></div>
      <div className="game-shelf" aria-label="Choose a game">
        {games.map((game) => <button key={game.id} className={selected === game.id ? 'active' : ''} style={{ '--token': game.color } as CSSProperties} type="button" onClick={() => onSelect(game.id)}><span>{game.icon}</span><small>{game.label}</small></button>)}
      </div>
      <div className="active-game" style={{ '--game-accent': active.color } as CSSProperties}>
        {selected === 'drop4' && <Drop4Stage players={players} />}
        {selected === 'wordbomb' && <WordBombStage />}
        {selected === 'trivia' && <TriviaStage />}
        {selected === 'melody' && <MelodyStage />}
        {selected === 'reflex' && <ReflexStage />}
        {selected === 'hottakes' && <HotTakesStage players={players} />}
        {selected === 'lanterns' && <LanternStage onWin={() => onReward('Storm cleared! Everyone earned +40 coins and +30 XP.')} />}
      </div>
    </section>
  );
}
