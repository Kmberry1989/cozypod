import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, CloudRain, Flame, RotateCcw, Sparkles, Wind } from 'lucide-react';
import { hotTakePrompts, trivia, wordSyllables } from '../data';
import { activeLanternEvents, melodyTap, nextTriviaQuestion, reflexTap, validateWord, type LanternHazard } from '../gameEngine';
import type { Drop4GameState, HotTakesGameState, LanternGameState, PlayerProfile, SharedGameAction, SharedGameState, WordBombGameState } from '../types';
import { Podling } from './Podling';

type GameActionHandler = (action: SharedGameAction) => Promise<{ state: SharedGameState | null; changed: boolean }>;
interface SharedStageProps<T> { players: PlayerProfile[]; meId: string; game: T | null; onAction: GameActionHandler; }

export function Drop4Stage({ players, meId, game, onAction }: SharedStageProps<Drop4GameState>) {
  if (!game || game.phase === 'waiting') return <WaitingForFriends title="Drop 4" />;
  const winner = game.winnerId ? playerName(players, game.winnerId) : '';
  const missingSeat = game.playerIds.some((id) => !players.some((player) => player.id === id));
  const currentId = game.playerIds[game.turnIndex];
  const canPlay = game.phase === 'playing' && !missingSeat && currentId === meId;
  const status = missingSeat ? 'Paused until both seated players are here.' : game.phase === 'draw' ? 'The board is full — cozy draw!' : game.phase === 'finished' ? `${winner} lined up four!` : canPlay ? 'Your turn — choose a column.' : `${playerName(players, currentId)}’s turn`;
  return (
    <div className="drop4-stage game-stage">
      <div className="game-title-row"><div><h2>Drop 4</h2><p>{status}</p></div><button type="button" onClick={() => void onAction({ type: 'restart' })} aria-label="Restart Drop 4"><RotateCcw size={18} /></button></div>
      <div className={`drop-board ${canPlay ? 'can-play' : 'locked-board'}`} aria-label="Drop 4 board">
        {game.board.map((cell, index) => <button key={index} disabled={!canPlay} type="button" className={cell === 0 ? 'red' : cell === 1 ? 'yellow' : ''} onClick={() => void onAction({ type: 'drop-disc', column: index % 7 })} aria-label={`Column ${(index % 7) + 1}${cell === -1 ? ', empty' : ', occupied'}`}><span /></button>)}
      </div>
      <div className="turn-cards">
        {game.playerIds.slice(0, 2).map((id, index) => { const player = players.find((item) => item.id === id); if (!player) return <div className="missing-player" key={id}><span><small>Disconnected</small><strong>Waiting…</strong></span></div>; return <div key={id} className={game.phase === 'playing' && game.turnIndex === index ? 'active' : ''}><Podling look={player.look} size="tiny" /><span><small>{id === meId ? 'You' : 'Friend'}</small><strong>{player.name}</strong></span><i className={index === 0 ? 'red' : 'yellow'} /></div>; })}
      </div>
    </div>
  );
}

export function TriviaStage() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const current = trivia[questionIndex];
  const next = () => { setPicked(null); setQuestionIndex((value) => nextTriviaQuestion(value, trivia.length)); };
  return (
    <div className="trivia-stage game-stage">
      <div className="game-title-row"><div><h2>Trivia</h2><p>{current.category}</p></div><button type="button" onClick={next} aria-label="Next trivia question"><RotateCcw size={18} /></button></div>
      <div className="trivia-question"><span>Question {questionIndex + 1}</span><h3>{current.question}</h3></div>
      <div className="answer-list">{current.answers.map((answer, index) => <button key={answer} className={picked === index ? (index === current.correct ? 'correct' : 'wrong') : ''} disabled={picked !== null} type="button" onClick={() => setPicked(index)}><b>{String.fromCharCode(65 + index)}</b>{answer}{picked === index && index === current.correct && <Check size={18} />}</button>)}</div>
      {picked !== null && <button className="stage-action" type="button" onClick={next}>{picked === current.correct ? 'Nice one! Next question' : 'Good try — next question'}</button>}
    </div>
  );
}

export function WordBombStage({ players, meId, game, onAction }: SharedStageProps<WordBombGameState>) {
  const [word, setWord] = useState('');
  const [message, setMessage] = useState('Use the letters anywhere in your word.');
  const [clock, setClock] = useState(Date.now());
  const timeoutSent = useRef(0);
  const gameSessionId = game?.sessionId;
  const gamePhase = game?.phase;
  useEffect(() => {
    if (!gameSessionId || gamePhase !== 'playing') return;
    const timer = window.setInterval(() => setClock(Date.now()), 200);
    return () => clearInterval(timer);
  }, [gameSessionId, gamePhase]);
  useEffect(() => {
    if (!game || game.phase !== 'playing' || clock < game.deadline || timeoutSent.current === game.deadline) return;
    timeoutSent.current = game.deadline;
    void onAction({ type: 'word-timeout' });
  }, [clock, game, onAction]);
  if (!game || game.phase === 'waiting') return <WaitingForFriends title="Word Bomb" />;
  const currentId = game.playerIds[game.turnIndex];
  const myTurn = game.phase === 'playing' && currentId === meId;
  const syllable = wordSyllables[game.syllableIndex];
  const remaining = Math.max(0, Math.ceil((game.deadline - clock) / 1000));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validity = validateWord(word, syllable, game.chain.map((entry) => entry.word));
    if (validity === 'empty') { setMessage('Type a word first.'); return; }
    if (validity === 'missing') { setMessage(`That word needs “${syllable}”.`); return; }
    if (validity === 'duplicate') { setMessage('That word was already used. Try another.'); return; }
    const result = await onAction({ type: 'submit-word', word });
    if (result.changed) { setWord(''); setMessage('Great save! Pass it on.'); }
  };
  const status = game.phase === 'finished' ? `${playerName(players, game.timedOutPlayerId || '')} ran out of time. ${playerName(players, game.winnerId || '')} wins!` : myTurn ? message : `${playerName(players, currentId)} is thinking…`;
  return (
    <div className="word-stage game-stage">
      <div className="game-title-row"><div><h2>Word Bomb</h2><p>{status}</p></div><button type="button" onClick={() => void onAction({ type: 'restart' })} aria-label="Restart Word Bomb"><RotateCcw size={18} /></button></div>
      <div className="bomb-orb"><span>{syllable}</span><small>{game.phase === 'playing' ? remaining : 0}s</small></div>
      <div className="word-chain">{game.chain.slice(-5).map((entry, index) => <span key={`${entry.playerId}-${entry.word}-${index}`}>{entry.word}</span>)}</div>
      <form className="word-form" onSubmit={submit}><input disabled={!myTurn} value={word} onChange={(event) => setWord(event.target.value)} placeholder={myTurn ? `A word with ${syllable}…` : 'Waiting for your turn…'} autoFocus={myTurn} /><button disabled={!myTurn} type="submit">Send</button></form>
    </div>
  );
}

const melodyColors = ['tomato', 'butter', 'mint', 'lilac'];
export function MelodyStage() {
  const [sequence, setSequence] = useState<number[]>([0]);
  const [input, setInput] = useState<number[]>([]);
  const [status, setStatus] = useState('Listen, then repeat the tune.');
  const [lit, setLit] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const clearPlayback = () => { timers.current.forEach(clearTimeout); timers.current = []; setLit(null); setPlaying(false); };
  useEffect(() => clearPlayback, []);
  const show = (notes = sequence) => {
    clearPlayback(); setPlaying(true);
    notes.forEach((value, index) => {
      timers.current.push(window.setTimeout(() => setLit(value), 520 * index));
      timers.current.push(window.setTimeout(() => setLit(null), 520 * index + 350));
    });
    timers.current.push(window.setTimeout(() => setPlaying(false), notes.length * 520));
  };
  const tap = (value: number) => {
    if (playing) return;
    setLit(value); timers.current.push(window.setTimeout(() => setLit(null), 180));
    const result = melodyTap(sequence, input, value);
    setSequence(result.sequence); setInput(result.input);
    if (result.outcome === 'wrong') { setStatus('Almost! Back to the first note.'); timers.current.push(window.setTimeout(() => show([0]), 500)); }
    if (result.outcome === 'complete') { setStatus(`Beautiful! Sequence ${result.sequence.length}.`); timers.current.push(window.setTimeout(() => show(result.sequence), 650)); }
  };
  return <div className="melody-stage game-stage"><div className="game-title-row"><div><h2>Melody</h2><p>{status}</p></div><button type="button" disabled={playing} onClick={() => show()}>Play</button></div><div className="melody-pads">{melodyColors.map((color, index) => <button disabled={playing} className={`${color} ${lit === index ? 'lit' : ''}`} key={color} type="button" onClick={() => tap(index)} aria-label={`Melody note ${index + 1}`}><span>♪</span></button>)}</div><strong className="sequence-score">Sequence {sequence.length}</strong></div>;
}

export function ReflexStage() {
  const [phase, setPhase] = useState<'idle' | 'wait' | 'go' | 'result'>('idle');
  const [started, setStarted] = useState(0);
  const [result, setResult] = useState('');
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const start = () => { if (timer.current) clearTimeout(timer.current); setPhase('wait'); setResult('Wait for the lantern…'); timer.current = window.setTimeout(() => { setStarted(performance.now()); setPhase('go'); setResult('NOW!'); }, 1200 + Math.random() * 1800); };
  const tap = () => { const next = reflexTap(phase, started, performance.now()); if (phase === 'wait' && timer.current) clearTimeout(timer.current); setResult(next.message); setPhase(next.phase); };
  return <div className="reflex-stage game-stage"><div className="game-title-row"><div><h2>Reflex</h2><p>{result || 'Ready for the signal?'}</p></div></div><button className={`reflex-button ${phase}`} type="button" onClick={phase === 'idle' || phase === 'result' ? start : tap}><span>{phase === 'go' ? 'TAP!' : phase === 'wait' ? 'Wait…' : 'Start'}</span></button></div>;
}

export function HotTakesStage({ players, meId, game, onAction }: SharedStageProps<HotTakesGameState>) {
  if (!game || game.phase === 'waiting') return <WaitingForFriends title="Hot Takes" />;
  const myVote = game.votes[meId];
  const counts = Object.values(game.votes).reduce<Record<string, number>>((result, id) => ({ ...result, [id]: (result[id] || 0) + 1 }), {});
  return <div className="takes-stage game-stage"><div className="game-title-row"><div><h2>Hot Takes</h2><p>{game.revealed ? 'The Pod has spoken.' : myVote ? 'Vote locked. Waiting for the Pod…' : 'Vote first. Explain later.'}</p></div>{game.revealed && <button type="button" onClick={() => void onAction({ type: 'next-prompt' })}><RotateCcw size={18} /></button>}</div><h3>{hotTakePrompts[game.promptIndex]}</h3><div className="candidate-grid">{game.playerIds.map((id) => { const player = players.find((item) => item.id === id); if (!player) return null; return <button key={id} className={myVote === id ? 'selected' : ''} disabled={Boolean(myVote) || game.revealed} type="button" onClick={() => void onAction({ type: 'cast-vote', targetId: id })}><Podling look={player.look} size="small" /><strong>{player.name}</strong>{game.revealed && <span>{counts[id] || 0} votes</span>}</button>; })}</div><button className="stage-action" disabled={!game.revealed} type="button" onClick={() => game.revealed && void onAction({ type: 'next-prompt' })}>{game.revealed ? 'Next hot take' : `${Object.keys(game.votes).length}/${game.playerIds.length} votes locked`}</button></div>;
}

const hazardIcons: Record<LanternHazard, typeof Wind> = { gust: Wind, rain: CloudRain, spark: Sparkles };
export function LanternStage({ players, meId, game, onAction, onWin }: SharedStageProps<LanternGameState> & { onWin: () => void }) {
  const [clock, setClock] = useState(Date.now());
  const claiming = useRef(false);
  const gameSessionId = game?.sessionId;
  const gamePhase = game?.phase;
  useEffect(() => {
    if (!gameSessionId || gamePhase !== 'playing') return;
    const timer = window.setInterval(() => { setClock(Date.now()); void onAction({ type: 'lantern-tick' }); }, 500);
    return () => clearInterval(timer);
  }, [gameSessionId, gamePhase, onAction]);
  useEffect(() => {
    if (!game || game.phase !== 'finished' || game.rewardClaims[meId] || claiming.current) return;
    claiming.current = true;
    void onAction({ type: 'claim-lantern-reward' }).then((result) => { if (result.changed) onWin(); claiming.current = false; });
  }, [game, meId, onAction, onWin]);
  if (!game || game.phase === 'waiting') return <WaitingForFriends title="Lantern Keepers" />;
  const remaining = game.phase === 'playing' ? Math.min(60, Math.max(0, Math.ceil((game.deadline - clock) / 1000))) : game.phase === 'ready' ? 60 : 0;
  const elapsed = game.phase === 'playing' ? Math.max(0, (clock - game.startedAt) / 1000) : 0;
  const active = activeLanternEvents(game, elapsed);
  const status = game.phase === 'playing' ? 'Keep every corner glowing!' : game.phase === 'finished' ? 'The clubhouse stayed warm!' : game.phase === 'lost' ? 'The lanterns went dark. Try again together.' : 'Weather the storm together.';
  return (
    <div className="lantern-stage game-stage">
      <div className="game-title-row"><div><h2>Lantern Keepers</h2><p>{status}</p></div><div className="lantern-timer">{remaining}s</div></div>
      <div className="warmth-meter"><span style={{ width: `${game.warmth}%` }} /><strong><Flame size={15} /> {game.warmth}% warmth</strong></div>
      <div className="lantern-grid">{[0, 1, 2, 3].map((index) => { const event = active.find((item) => item.lantern === index); const Icon = event ? hazardIcons[event.hazard] : null; return <button key={index} disabled={game.phase !== 'playing'} className={`lantern-slot lantern-${index} ${event ? 'in-danger' : ''}`} type="button" onClick={() => void onAction({ type: 'resolve-lantern', lantern: index })}><span className={`lantern-sprite state-${game.warmth < 35 ? 'dim' : 'lit'}`} />{Icon && <i><Icon size={22} /></i>}<small>{players[index]?.name || `Corner ${index + 1}`}</small></button>; })}</div>
      {game.phase !== 'playing' && <button className="stage-action" type="button" onClick={() => void onAction({ type: 'start-lanterns' })}>{game.phase === 'ready' ? 'Light the lanterns' : 'Play another storm'}</button>}
    </div>
  );
}

function WaitingForFriends({ title }: { title: string }) {
  return <div className="game-stage game-waiting"><Sparkles size={34} /><h2>{title}</h2><p>Waiting for another real player to join this Pod.</p><small>Solo games like Trivia, Melody, and Reflex are ready now.</small></div>;
}

function playerName(players: PlayerProfile[], id: string) {
  return players.find((player) => player.id === id)?.name || 'A friend';
}
