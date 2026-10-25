import { BookOpen, Trophy } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { games } from '../data';
import { isMultiplayerGame, isSharedGameComplete, isSharedGameSettled } from '../gameEngine';
import type { GameId, PartyState, PlayerProfile, SharedGameAction, SharedGameState } from '../types';
import { BridgeStage, CozyCodeStage, Drop4Stage, GardenStage, HotTakesStage, LanternStage, MarketStage, MelodyStage, MosaicStage, PairsStage, ReflexStage, ReversiStage, TeaStackStage, TriviaStage, WordBombStage } from './GameStages';

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
  mosaic: 'Slide a tile next to the empty space. Restore the moonlit scene in number order, with the empty space at the bottom right.',
  cozycode: 'Build a four-charm guess with no repeats. A gold clue means the right charm is in the right place; a white clue means the charm belongs somewhere else.',
  hottakes: 'Every player votes once. Results appear after everyone has locked a vote.',
  lanterns: 'Work together for sixty seconds. Tap a threatened lantern before its hazard lands.',
  reversi: 'Two players place discs to trap and flip straight lines. If you have no legal move, your turn is skipped. Most discs wins.',
  bridges: 'Two to four players extend one connected route. Choose and rotate a tile; the player whose placement reaches the far cottage wins.',
  market: 'Two to four players draft one item per round for three rounds. A pair scores 4, three different score 5, and a matching trio scores 9.',
};

const recordDefinitions = [
  { game: 'Trivia', key: 'trivia', suffix: '/5' },
  { game: 'Melody', key: 'melody', suffix: ' notes' },
  { game: 'Reflex', key: 'reflex', suffix: ' ms' },
  { game: 'Firefly Pairs', key: 'pairs', suffix: ' moves' },
  { game: 'Glow Garden', key: 'garden', suffix: ' taps' },
  { game: 'Tea Stack', key: 'tea-stack', suffix: ' moves' },
  { game: 'Moon Mosaic', key: 'mosaic', suffix: ' slides' },
  { game: 'Cozy Code', key: 'cozy-code', suffix: ' guesses' },
];

export function Arcade({ players, meId, selected, party, sharedGame, onSelect, onGameAction, onNextPartyRound, onFinishParty, onReward }: ArcadeProps) {
  const [showRules, setShowRules] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [filter, setFilter] = useState<'all' | 'solo' | 'group'>('all');
  const claimingReward = useRef('');
  const shelf = useRef<HTMLDivElement>(null);
  const active = games.find((game) => game.id === selected)!;
  const me = players.find((player) => player.id === meId);
  const rewardLabel = games.find((game) => game.id === sharedGame?.gameId)?.label || 'Game';
  const rewardReady = isSharedGameComplete(sharedGame);
  const rewardClaimed = Boolean(sharedGame?.rewardClaims[meId]);
  const partyGame = party.queue[party.round];
  const partyRoundComplete = !isMultiplayerGame(partyGame) || (sharedGame?.gameId === partyGame && isSharedGameSettled(sharedGame));
  const topPartyScore = Math.max(0, ...Object.values(party.scores));
  const visibleGames = party.phase === 'playing' ? games : games.filter((game) => filter === 'all' || (filter === 'solo' ? game.players === 'Solo' : game.players !== 'Solo'));
  const chooseFilter = (nextFilter: 'all' | 'solo' | 'group') => {
    setFilter(nextFilter);
    const pool = games.filter((game) => nextFilter === 'all' || (nextFilter === 'solo' ? game.players === 'Solo' : game.players !== 'Solo'));
    if (!pool.some((game) => game.id === selected)) onSelect(pool[0].id);
  };
  const surprise = () => {
    let pool = visibleGames;
    if (players.length < 2) pool = pool.filter((game) => game.players === 'Solo');
    const choices = pool.filter((game) => game.id !== selected);
    const next = choices[Math.floor(Math.random() * choices.length)] || pool[0];
    if (next) onSelect(next.id);
  };
  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    shelf.current?.querySelector<HTMLElement>(`[data-game-id="${selected}"]`)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
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
      <div className="screen-heading"><div><h1 id="arcade-title">Arcade</h1><p>{party.phase === 'playing' ? `Party round ${party.round + 1}` : 'Pick a game from the shelf'}</p></div><div className="heading-actions"><button type="button" aria-expanded={showRecords} onClick={() => { setShowRecords((value) => !value); setShowRules(false); }}><Trophy size={17} /> Records</button><button type="button" aria-expanded={showRules} onClick={() => { setShowRules((value) => !value); setShowRecords(false); }}><BookOpen size={17} /> How to play</button></div></div>
      {showRules && <aside className="game-rules" aria-label={`${active.label} rules`}><strong>{active.label}<small>{active.players}</small></strong><p>{rules[selected]}</p></aside>}
      {showRecords && <aside className="arcade-records" aria-label="Your arcade records"><header><span><Trophy size={19} /><strong>Your arcade records</strong></span><small>Level {me?.level || 1} · {me?.coins || 0} coins · {me?.trophyCount || 0} trophies</small></header><div>{recordDefinitions.map((record) => { const score = Number(localStorage.getItem(`cozypod_v2_best_${record.key}`)); return <section className={score > 0 ? 'earned' : ''} key={record.key}><span>{score > 0 ? '★' : '·'}</span><small>{record.game}</small><strong>{score > 0 ? `${score}${record.suffix}` : 'Not set'}</strong></section>; })}</div></aside>}
      {party.phase !== 'playing' && <div className="arcade-tools"><div role="group" aria-label="Filter arcade games">{(['all', 'solo', 'group'] as const).map((option) => <button key={option} type="button" className={filter === option ? 'active' : ''} aria-pressed={filter === option} onClick={() => chooseFilter(option)}>{option === 'all' ? 'All games' : option === 'solo' ? 'Solo' : 'Group'}</button>)}</div><button type="button" disabled={players.length < 2 && filter === 'group'} onClick={surprise}>{players.length < 2 && filter === 'group' ? 'Invite a friend' : '✨ Surprise me'}</button></div>}
      <div className="game-shelf" aria-label="Choose a game" ref={shelf}>
        {visibleGames.map((game) => <button key={game.id} data-game-id={game.id} title={`${game.label} · ${game.players} — ${game.description}`} disabled={party.phase === 'playing' && game.id !== partyGame} className={selected === game.id ? 'active' : ''} style={{ '--token': game.color } as CSSProperties} type="button" onClick={() => onSelect(game.id)}><span>{game.icon}</span><small>{game.label}</small></button>)}
      </div>
      {party.phase === 'playing' && party.queue.length > 0 && <div className="party-round-bar"><span><strong>Party round {party.round + 1} of {party.queue.length}</strong><small>{games.find((game) => game.id === partyGame)?.label}</small></span><button type="button" disabled={!partyRoundComplete} onClick={onNextPartyRound}>{!partyRoundComplete ? 'Finish round first' : party.round + 1 >= party.queue.length ? 'Finish party' : 'Next game'}</button></div>}
      <div className="active-game" style={{ '--game-accent': active.color } as CSSProperties}>
        {party.phase === 'recap' && <div className="party-recap game-stage"><span>🏆</span><h2>Party recap</h2><p>Every round, every friend, one very cozy night.</p><div>{players.map((player) => { const score = party.scores[player.id] || 0; return <section className={topPartyScore > 0 && score === topPartyScore ? 'winner' : ''} key={player.id}><strong>{topPartyScore > 0 && score === topPartyScore ? '👑 ' : ''}{player.name}</strong><b>{score} pts</b></section>; })}</div><button className="stage-action" type="button" onClick={onFinishParty}>Back to the lounge</button></div>}
        {party.phase !== 'recap' && <>
        {selected === 'drop4' && <Drop4Stage players={players} meId={meId} game={sharedGame?.gameId === 'drop4' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'wordbomb' && <WordBombStage players={players} meId={meId} game={sharedGame?.gameId === 'wordbomb' ? sharedGame : null} onAction={onGameAction} />}
        {selected === 'trivia' && <TriviaStage onReward={onReward} />}
        {selected === 'melody' && <MelodyStage onReward={onReward} />}
        {selected === 'reflex' && <ReflexStage onReward={onReward} />}
        {selected === 'pairs' && <PairsStage onReward={onReward} />}
        {selected === 'garden' && <GardenStage onReward={onReward} />}
        {selected === 'teastack' && <TeaStackStage onReward={onReward} />}
        {selected === 'mosaic' && <MosaicStage onReward={onReward} />}
        {selected === 'cozycode' && <CozyCodeStage onReward={onReward} />}
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
