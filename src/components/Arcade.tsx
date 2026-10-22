import { BookOpen } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { games } from '../data';
import { isMultiplayerGame, isSharedGameComplete } from '../gameEngine';
import type { GameId, PartyState, PlayerProfile, SharedGameAction, SharedGameState } from '../types';
import { BridgeStage, Drop4Stage, GardenStage, HotTakesStage, LanternStage, MarketStage, MelodyStage, PairsStage, ReflexStage, ReversiStage, TeaStackStage, TriviaStage, WordBombStage } from './GameStages';

interface ArcadeProps {
  players: PlayerProfile[];
  meId: string;
  selected: GameId;
  party: PartyState;
  sharedGame: SharedGameState | null;
  onSelect: (id: GameId) => void;
  onGameAction: (action: SharedGameAction) => Promise<{ state: SharedGameState | null; changed: boolean }>;
  onNextPartyRound: () => void;
  onFinishParty: () => void;
  onReward: (message: string) => void;
}

const rules: Record<GameId, string> = {
  drop4: 'Two players alternate dropping discs. Connect four across, down, or diagonally.',
  wordbomb: 'Use the shown letters in a new word before your ten-second turn expires.',
  trivia: 'Pick one answer. The correct choice is revealed before the next question.',
  melody: 'Listen to the notes, then repeat the complete sequence in order.',
  reflex: 'Start the round, wait for the lantern to glow, then tap as quickly as you can.',
  pairs: 'Turn over two keepsakes at a time. Matching pairs stay revealed. Find all eight pairs in as few moves as you can.',
  garden: 'Tap a garden plot to wake or rest it and its four neighbors. Make all twenty-five moonflowers glow at once.',
  teastack: 'Move the three cups from the left tray to the right. Move one top cup at a time, and never place a larger cup on a smaller one.',
  hottakes: 'Every player votes once. Results appear after everyone has locked a vote.',
  lanterns: 'Work together for sixty seconds. Tap a threatened lantern before its hazard lands.',
  reversi: 'Two players place discs to trap and flip straight lines. If you have no legal move, your turn is skipped. Most discs wins.',
  bridges: 'Two to four players extend one connected route. Choose and rotate a tile; the player whose placement reaches the far cottage wins.',
  market: 'Two to four players draft one item per round for three rounds. A pair scores 4, three different score 5, and a matching trio scores 9.',
};

export function Arcade({ players, meId, selected, party, sharedGame, onSelect, onGameAction, onNextPartyRound, onFinishParty, onReward }: ArcadeProps) {
  const [showRules, setShowRules] = useState(false);
  const claimingReward = useRef('');
  const shelf = useRef<HTMLDivElement>(null);
  const active = games.find((game) => game.id === selected)!;
  const rewardLabel = games.find((game) => game.id === sharedGame?.gameId)?.label || 'Game';
  const rewardReady = isSharedGameComplete(sharedGame);
  const rewardClaimed = Boolean(sharedGame?.rewardClaims[meId]);
  const partyGame = party.queue[party.round];
  const partyRoundComplete = !isMultiplayerGame(partyGame) || (sharedGame?.gameId === partyGame && isSharedGameComplete(sharedGame));
  useEffect(() => {
    shelf.current?.querySelector<HTMLElement>(`[data-game-id="${selected}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selected]);
  useEffect(() => {
    if (!sharedGame || !rewardReady || rewardClaimed || claimingReward.current === sharedGame.sessionId) return;
    claimingReward.current = sharedGame.sessionId;
    void onGameAction({ type: 'claim-game-reward' }).then((result) => {
      if (result.changed) onReward(`${rewardLabel} complete! Trophy earned · +40 coins · +30 XP.`);
    });
  }, [onGameAction, onReward, rewardClaimed, rewardLabel, rewardReady, sharedGame]);
  return (
    <section className="arcade-screen" aria-labelledby="arcade-title">
      <div className="screen-heading"><div><h1 id="arcade-title">Arcade</h1><p>{party.phase === 'playing' ? `Party round ${party.round + 1}` : 'Pick a game from the shelf'}</p></div><button type="button" onClick={() => setShowRules((value) => !value)}><BookOpen size={17} /> How to play</button></div>
      {showRules && <aside className="game-rules" aria-label={`${active.label} rules`}><strong>{active.label}</strong><p>{rules[selected]}</p></aside>}
      <div className="game-shelf" aria-label="Choose a game" ref={shelf}>
        {games.map((game) => <button key={game.id} data-game-id={game.id} disabled={party.phase === 'playing' && game.id !== partyGame} className={selected === game.id ? 'active' : ''} style={{ '--token': game.color } as CSSProperties} type="button" onClick={() => onSelect(game.id)}><span>{game.icon}</span><small>{game.label}</small></button>)}
      </div>
      {party.phase === 'playing' && party.queue.length > 0 && <div className="party-round-bar"><span><strong>Party round {party.round + 1} of {party.queue.length}</strong><small>{games.find((game) => game.id === partyGame)?.label}</small></span><button type="button" disabled={!partyRoundComplete} onClick={onNextPartyRound}>{!partyRoundComplete ? 'Finish round first' : party.round + 1 >= party.queue.length ? 'Finish party' : 'Next game'}</button></div>}
      <div className="active-game" style={{ '--game-accent': active.color } as CSSProperties}>
        {party.phase === 'recap' && <div className="party-recap game-stage"><span>🏆</span><h2>Party recap</h2><p>Every round, every friend, one very cozy night.</p><div>{players.map((player) => <section key={player.id}><strong>{player.name}</strong><b>{party.scores[player.id] || 0} pts</b></section>)}</div><button className="stage-action" type="button" onClick={onFinishParty}>Back to the lounge</button></div>}
        {party.phase !== 'recap' && <>
        {selected === 'drop4' && <Drop4Stage players={players} meId={meId} game={sharedGame?.gameId === 'drop4' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'wordbomb' && <WordBombStage players={players} meId={meId} game={sharedGame?.gameId === 'wordbomb' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'trivia' && <TriviaStage />}
        {selected === 'melody' && <MelodyStage />}
        {selected === 'reflex' && <ReflexStage />}
        {selected === 'pairs' && <PairsStage onReward={onReward} />}
        {selected === 'garden' && <GardenStage onReward={onReward} />}
        {selected === 'teastack' && <TeaStackStage onReward={onReward} />}
        {selected === 'hottakes' && <HotTakesStage players={players} meId={meId} game={sharedGame?.gameId === 'hottakes' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'lanterns' && <LanternStage players={players} meId={meId} game={sharedGame?.gameId === 'lanterns' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'reversi' && <ReversiStage players={players} meId={meId} game={sharedGame?.gameId === 'reversi' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'bridges' && <BridgeStage players={players} meId={meId} game={sharedGame?.gameId === 'bridges' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'market' && <MarketStage players={players} meId={meId} game={sharedGame?.gameId === 'market' ? sharedGame : null} onAction={onGameAction} />}
        </>}
      </div>
    </section>
  );
}
