import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Check, CloudRain, Flame, RotateCcw, Sparkles, Wind } from 'lucide-react';
import { hotTakePrompts, trivia, wordSyllables } from '../data';
import { createLanternEvents, dropDisc, getDrop4Winner, type DropCell, type LanternHazard } from '../gameEngine';
import type { PlayerProfile } from '../types';
import { Podling } from './Podling';

export function Drop4Stage({ players }: { players: PlayerProfile[] }) {
  const [board, setBoard] = useState<DropCell[]>(Array(42).fill(null));
  const [turn, setTurn] = useState<0 | 1>(0);
  const winner = getDrop4Winner(board);
  const play = (column: number) => {
    if (winner !== null) return;
    const next = dropDisc(board, column, turn);
    if (next !== board) { setBoard(next); setTurn(turn === 0 ? 1 : 0); }
  };
  const reset = () => { setBoard(Array(42).fill(null)); setTurn(0); };
  return (
    <div className="drop4-stage game-stage">
      <div className="game-title-row"><div><h2>Drop 4</h2><p>{winner === null ? `${players[turn].name}’s turn` : `${players[winner].name} lined up four!`}</p></div><button type="button" onClick={reset} aria-label="Restart Drop 4"><RotateCcw size={18} /></button></div>
      <div className="drop-board" aria-label="Drop 4 board">
        {board.map((cell, index) => <button key={index} type="button" className={cell === 0 ? 'red' : cell === 1 ? 'yellow' : ''} onClick={() => play(index % 7)} aria-label={`Column ${(index % 7) + 1}${cell === null ? ', empty' : ', occupied'}`}><span /></button>)}
      </div>
      <div className="turn-cards">
        {[players[0], players[1]].map((player, index) => <div key={player.id} className={winner === null && turn === index ? 'active' : ''}><Podling look={player.look} size="tiny" /><span><small>{index === 0 ? 'You' : 'Next'}</small><strong>{player.name}</strong></span><i className={index === 0 ? 'red' : 'yellow'} /></div>)}
      </div>
    </div>
  );
}

export function TriviaStage() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const current = trivia[questionIndex];
  const next = () => { setPicked(null); setQuestionIndex((value) => (value + 1) % trivia.length); };
  return (
    <div className="trivia-stage game-stage">
      <div className="game-title-row"><div><h2>Trivia</h2><p>{current.category}</p></div><button type="button" onClick={next}><RotateCcw size={18} /></button></div>
      <div className="trivia-question"><span>Question {questionIndex + 1}</span><h3>{current.question}</h3></div>
      <div className="answer-list">{current.answers.map((answer, index) => <button key={answer} className={picked === index ? (index === current.correct ? 'correct' : 'wrong') : ''} disabled={picked !== null} type="button" onClick={() => setPicked(index)}><b>{String.fromCharCode(65 + index)}</b>{answer}{picked === index && index === current.correct && <Check size={18} />}</button>)}</div>
      {picked !== null && <button className="stage-action" type="button" onClick={next}>{picked === current.correct ? 'Nice one! Next question' : 'Good try — next question'}</button>}
    </div>
  );
}

export function WordBombStage() {
  const [syllable, setSyllable] = useState(wordSyllables[0]);
  const [word, setWord] = useState('');
  const [chain, setChain] = useState<string[]>([]);
  const [status, setStatus] = useState('Use the letters anywhere in your word.');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const clean = word.trim().toUpperCase();
    if (!clean.includes(syllable)) { setStatus(`That word needs “${syllable}”.`); return; }
    setChain((items) => [...items.slice(-4), word.trim()]);
    setWord('');
    setSyllable(wordSyllables[(wordSyllables.indexOf(syllable) + 1) % wordSyllables.length]);
    setStatus('Great save! Pass it on.');
  };
  return (
    <div className="word-stage game-stage"><div className="game-title-row"><div><h2>Word Bomb</h2><p>{status}</p></div></div><div className="bomb-orb"><span>{syllable}</span><small>{Math.max(3, 10 - chain.length)}s</small></div><div className="word-chain">{chain.map((item) => <span key={`${item}-${Math.random()}`}>{item}</span>)}</div><form className="word-form" onSubmit={submit}><input value={word} onChange={(event) => setWord(event.target.value)} placeholder={`A word with ${syllable}…`} autoFocus /><button type="submit">Send</button></form></div>
  );
}

const melodyColors = ['tomato', 'butter', 'mint', 'lilac'];
export function MelodyStage() {
  const [sequence, setSequence] = useState<number[]>([0]);
  const [input, setInput] = useState<number[]>([]);
  const [status, setStatus] = useState('Listen, then repeat the tune.');
  const [lit, setLit] = useState<number | null>(null);
  const show = () => sequence.forEach((value, index) => setTimeout(() => { setLit(value); setTimeout(() => setLit(null), 350); }, 520 * index));
  const tap = (value: number) => {
    const next = [...input, value]; setInput(next); setLit(value); setTimeout(() => setLit(null), 180);
    if (value !== sequence[next.length - 1]) { setStatus('Almost! The melody starts over.'); setInput([]); return; }
    if (next.length === sequence.length) { const extended = [...sequence, (sequence.length * 3 + 1) % 4]; setSequence(extended); setInput([]); setStatus(`Beautiful! Sequence ${extended.length}.`); setTimeout(() => extended.forEach((note, index) => setTimeout(() => { setLit(note); setTimeout(() => setLit(null), 300); }, 460 * index)), 650); }
  };
  return <div className="melody-stage game-stage"><div className="game-title-row"><div><h2>Melody</h2><p>{status}</p></div><button type="button" onClick={show}>Play</button></div><div className="melody-pads">{melodyColors.map((color, index) => <button className={`${color} ${lit === index ? 'lit' : ''}`} key={color} type="button" onClick={() => tap(index)} aria-label={`Melody note ${index + 1}`}><span>♪</span></button>)}</div><strong className="sequence-score">Sequence {sequence.length}</strong></div>;
}

export function ReflexStage() {
  const [phase, setPhase] = useState<'idle' | 'wait' | 'go' | 'result'>('idle');
  const [started, setStarted] = useState(0);
  const [result, setResult] = useState('');
  const timer = useRef<number | null>(null);
  const start = () => { setPhase('wait'); setResult('Wait for the lantern…'); timer.current = window.setTimeout(() => { setStarted(performance.now()); setPhase('go'); setResult('NOW!'); }, 1200 + Math.random() * 1800); };
  const tap = () => {
    if (phase === 'wait') { if (timer.current) clearTimeout(timer.current); setResult('Too soon! The lantern was still dim.'); setPhase('result'); }
    else if (phase === 'go') { setResult(`${Math.round(performance.now() - started)} ms — lightning fast!`); setPhase('result'); }
  };
  return <div className="reflex-stage game-stage"><div className="game-title-row"><div><h2>Reflex</h2><p>{result || 'Ready for the signal?'}</p></div></div><button className={`reflex-button ${phase}`} type="button" onClick={phase === 'idle' || phase === 'result' ? start : tap}><span>{phase === 'go' ? 'TAP!' : phase === 'wait' ? 'Wait…' : 'Start'}</span></button></div>;
}

export function HotTakesStage({ players }: { players: PlayerProfile[] }) {
  const [prompt, setPrompt] = useState(0);
  const [vote, setVote] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const next = () => { setPrompt((value) => (value + 1) % hotTakePrompts.length); setVote(null); setRevealed(false); };
  return <div className="takes-stage game-stage"><div className="game-title-row"><div><h2>Hot Takes</h2><p>Vote first. Explain later.</p></div><button type="button" onClick={next}><RotateCcw size={18} /></button></div><h3>{hotTakePrompts[prompt]}</h3><div className="candidate-grid">{players.map((player, index) => <button key={player.id} className={vote === player.id ? 'selected' : ''} type="button" onClick={() => setVote(player.id)}><Podling look={player.look} size="small" /><strong>{player.name}</strong>{revealed && <span>{index === 0 ? 2 : index === 2 ? 1 : 0} votes</span>}</button>)}</div><button className="stage-action" disabled={!vote} type="button" onClick={() => setRevealed(true)}>{revealed ? 'The Pod has spoken' : 'Reveal votes'}</button></div>;
}

const hazardIcons: Record<LanternHazard, typeof Wind> = { gust: Wind, rain: CloudRain, spark: Sparkles };
export function LanternStage({ onWin }: { onWin: () => void }) {
  const events = useMemo(() => createLanternEvents(20261022, 60), []);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(60);
  const [warmth, setWarmth] = useState(100);
  const [resolved, setResolved] = useState<number[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      const next = Math.max(0, 60 - Math.floor((Date.now() - startedAt) / 1000));
      setRemaining(next);
      const elapsed = 60 - next;
      const missed = events.filter((event) => event.at < elapsed - 3.2 && !resolved.includes(event.id));
      if (missed.length) setWarmth((value) => Math.max(0, value - 4));
      if (next === 0) { setRunning(false); onWin(); }
    }, 250);
    return () => clearInterval(timer);
  }, [running, startedAt, events, resolved, onWin]);
  const elapsed = 60 - remaining;
  const active = events.filter((event) => event.at <= elapsed && event.at > elapsed - 4 && !resolved.includes(event.id));
  const handle = (lantern: number) => {
    const event = active.find((item) => item.lantern === lantern);
    if (!event) return;
    setResolved((items) => [...items, event.id]); setWarmth((value) => Math.min(100, value + 2));
  };
  const start = () => { setResolved([]); setWarmth(100); setRemaining(60); setStartedAt(Date.now()); setRunning(true); };
  return (
    <div className="lantern-stage game-stage">
      <div className="game-title-row"><div><h2>Lantern Keepers</h2><p>{running ? 'Keep every corner glowing!' : remaining === 0 ? 'The clubhouse stayed warm!' : 'Weather the storm together.'}</p></div><div className="lantern-timer">{remaining}s</div></div>
      <div className="warmth-meter"><span style={{ width: `${warmth}%` }} /><strong><Flame size={15} /> {warmth}% warmth</strong></div>
      <div className="lantern-grid">{[0, 1, 2, 3].map((index) => { const event = active.find((item) => item.lantern === index); const Icon = event ? hazardIcons[event.hazard] : null; return <button key={index} className={`lantern-slot lantern-${index} ${event ? 'in-danger' : ''}`} type="button" onClick={() => handle(index)}><span className={`lantern-sprite state-${warmth < 35 ? 'dim' : 'lit'}`} />{Icon && <i><Icon size={22} /></i>}<small>{['Maple', 'Sunny', 'Bean', 'Pebble'][index]}</small></button>; })}</div>
      {!running && <button className="stage-action" type="button" onClick={start}>{remaining === 0 ? 'Play another storm' : 'Light the lanterns'}</button>}
    </div>
  );
}
