import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, CloudRain, Flame, RotateCcw, Sparkles, Wind } from 'lucide-react';
import { hotTakePrompts, trivia, wordSyllables } from '../data';
import { activeLanternEvents, bridgeTileMask, createCozyCode, createGardenPuzzle, createMosaicPuzzle, createPairsDeck, isMosaicComplete, melodyTap, mosaicMovableTiles, moveMosaic, moveTeaStack, nextTriviaQuestion, reflexTap, reversiScores, reversiValidMoves, scoreCozyCode, scoreMarketInventory, toggleGarden, validBridgePlacements, validateWord, type LanternHazard } from '../gameEngine';
import type { BridgeGameState, Drop4GameState, HotTakesGameState, LanternGameState, MarketGameState, PlayerProfile, ReversiGameState, SharedGameAction, SharedGameState, WordBombGameState } from '../types';
import { Podling } from './Podling';
import bridgeTiles from '../assets/content/game-art/bridge-tiles.webp';
import marketItems from '../assets/content/game-art/cozy-market-items.webp';

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
      <div className="game-title-row"><div><h2>Drop 4</h2><p>{status}</p></div>{(game.phase === 'finished' || game.phase === 'draw') && <button type="button" onClick={() => void onAction({ type: 'restart' })} aria-label="Restart Drop 4"><RotateCcw size={18} /></button>}</div>
      <div className={`drop-board ${canPlay ? 'can-play' : 'locked-board'}`} aria-label="Drop 4 board">
        {game.board.map((cell, index) => <button key={index} disabled={!canPlay} type="button" className={cell === 0 ? 'red' : cell === 1 ? 'yellow' : ''} onClick={() => void onAction({ type: 'drop-disc', column: index % 7 })} aria-label={`Column ${(index % 7) + 1}${cell === -1 ? ', empty' : ', occupied'}`}><span /></button>)}
      </div>
      <div className="turn-cards">
        {game.playerIds.slice(0, 2).map((id, index) => { const player = players.find((item) => item.id === id); if (!player) return <div className="missing-player" key={id}><span><small>Disconnected</small><strong>Waiting…</strong></span></div>; return <div key={id} className={game.phase === 'playing' && game.turnIndex === index ? 'active' : ''}><Podling look={player.look} size="tiny" /><span><small>{id === meId ? 'You' : 'Friend'}</small><strong>{player.name}</strong></span><i className={index === 0 ? 'red' : 'yellow'} /></div>; })}
      </div>
    </div>
  );
}

export function TriviaStage({ onReward }: { onReward: (message: string) => void }) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [roundQuestion, setRoundQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);
  const [best, recordBest] = useHighestScore('trivia');
  const current = trivia[questionIndex];
  const answer = (index: number) => { setPicked(index); if (index === current.correct) setScore((value) => value + 1); };
  const next = () => {
    if (roundQuestion === 4) { setComplete(true); recordBest(score); onReward('Trivia round complete! +40 coins · +30 XP.'); return; }
    setPicked(null); setRoundQuestion((value) => value + 1); setQuestionIndex((value) => nextTriviaQuestion(value, trivia.length));
  };
  const reset = () => { setQuestionIndex((value) => nextTriviaQuestion(value, trivia.length)); setPicked(null); setRoundQuestion(0); setScore(0); setComplete(false); };
  return (
    <div className="trivia-stage game-stage">
      <div className="game-title-row"><div><h2>Trivia</h2><p>{complete ? 'Round complete!' : current.category}</p></div>{best !== null && <small className="personal-best">Best {best}/5</small>}</div>
      {complete ? <div className="trivia-result"><span>{score >= 4 ? '🏆' : score >= 2 ? '⭐' : '🌱'}</span><h3>{score} out of 5</h3><p>{score === 5 ? 'A perfect cozy quiz!' : score >= 3 ? 'Your clubhouse brain is glowing.' : 'Every answer grows the next round.'}</p><button className="stage-action" type="button" onClick={reset}>Play another round</button></div> : <>
      <div className="trivia-question"><span>Question {roundQuestion + 1} of 5 · {score} right</span><h3>{current.question}</h3></div>
      <div className="answer-list">{current.answers.map((answerText, index) => <button key={answerText} className={picked === index ? (index === current.correct ? 'correct' : 'wrong') : ''} disabled={picked !== null} type="button" onClick={() => answer(index)}><b>{String.fromCharCode(65 + index)}</b>{answerText}{picked === index && index === current.correct && <Check size={18} />}</button>)}</div>
      {picked !== null && <button className="stage-action" type="button" onClick={next}>{roundQuestion === 4 ? 'See round results' : picked === current.correct ? 'Nice one! Next question' : 'Good try — next question'}</button>}</>}
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
      <div className="game-title-row"><div><h2>Word Bomb</h2><p>{status}</p></div>{game.phase === 'finished' && <button type="button" onClick={() => void onAction({ type: 'restart' })} aria-label="Restart Word Bomb"><RotateCcw size={18} /></button>}</div>
      <div className="bomb-orb"><span>{syllable}</span><small>{game.phase === 'playing' ? remaining : 0}s</small></div>
      <div className="word-chain">{game.chain.slice(-5).map((entry, index) => <span key={`${entry.playerId}-${entry.word}-${index}`}>{entry.word}</span>)}</div>
      <form className="word-form" onSubmit={submit}><input disabled={!myTurn} value={word} onChange={(event) => setWord(event.target.value)} placeholder={myTurn ? `A word with ${syllable}…` : 'Waiting for your turn…'} autoFocus={myTurn} /><button disabled={!myTurn} type="submit">Send</button></form>
    </div>
  );
}

const melodyColors = ['tomato', 'butter', 'mint', 'lilac'];
export function MelodyStage({ onReward }: { onReward: (message: string) => void }) {
  const [sequence, setSequence] = useState<number[]>([0]);
  const [input, setInput] = useState<number[]>([]);
  const [status, setStatus] = useState('Listen, then repeat the tune.');
  const [lit, setLit] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [complete, setComplete] = useState(false);
  const [best, recordBest] = useHighestScore('melody');
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
    if (playing || complete) return;
    setLit(value); timers.current.push(window.setTimeout(() => setLit(null), 180));
    const result = melodyTap(sequence, input, value);
    if (result.outcome === 'wrong') { recordBest(sequence.length - 1); setSequence(result.sequence); setInput(result.input); setStatus('Almost! Back to the first note.'); timers.current.push(window.setTimeout(() => show([0]), 500)); return; }
    if (result.outcome === 'complete' && sequence.length >= 6) { setInput([]); setComplete(true); recordBest(sequence.length); setStatus('A six-note masterpiece!'); onReward('Melody mastered! +40 coins · +30 XP.'); return; }
    setSequence(result.sequence); setInput(result.input);
    if (result.outcome === 'complete') { setStatus(`Beautiful! Sequence ${result.sequence.length}.`); timers.current.push(window.setTimeout(() => show(result.sequence), 650)); }
  };
  const reset = () => { clearPlayback(); setSequence([0]); setInput([]); setComplete(false); setStatus('Listen, then repeat the tune.'); };
  return <div className="melody-stage game-stage"><div className="game-title-row"><div><h2>Melody</h2><p>{status}</p></div>{best !== null && <small className="personal-best">Best {best} notes</small>}</div><div className="melody-pads">{melodyColors.map((color, index) => <button disabled={playing || complete} className={`${color} ${lit === index ? 'lit' : ''}`} key={color} type="button" onClick={() => tap(index)} aria-label={`Melody note ${index + 1}`}><span>♪</span></button>)}</div><strong className="sequence-score">{complete ? 'Tune mastered!' : `Sequence ${sequence.length} of 6`}</strong>{complete ? <button className="stage-action" type="button" onClick={reset}>Play a new tune</button> : <button className="stage-action melody-replay" type="button" disabled={playing} onClick={() => show()}>Hear sequence</button>}</div>;
}

export function ReflexStage({ onReward }: { onReward: (message: string) => void }) {
  const [phase, setPhase] = useState<'idle' | 'wait' | 'go' | 'result'>('idle');
  const [started, setStarted] = useState(0);
  const [result, setResult] = useState('');
  const [best, recordBest] = useLowestScore('reflex');
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const start = () => { if (timer.current) clearTimeout(timer.current); setPhase('wait'); setResult('Wait for the lantern…'); timer.current = window.setTimeout(() => { setStarted(performance.now()); setPhase('go'); setResult('NOW!'); }, 1200 + Math.random() * 1800); };
  const tap = () => { const now = performance.now(); const next = reflexTap(phase, started, now); if (phase === 'wait' && timer.current) clearTimeout(timer.current); if (phase === 'go') { const score = Math.round(now - started); if (best === null || score < best) onReward('New reflex best! +15 coins · +10 XP.'); recordBest(score); } setResult(next.message); setPhase(next.phase); };
  return <div className="reflex-stage game-stage"><div className="game-title-row"><div><h2>Reflex</h2><p>{result || 'Ready for the signal?'}</p></div>{best !== null && <small className="personal-best">Best {best} ms</small>}</div><button className={`reflex-button ${phase}`} type="button" onClick={phase === 'idle' || phase === 'result' ? start : tap}><span>{phase === 'go' ? 'TAP!' : phase === 'wait' ? 'Wait…' : 'Start'}</span></button></div>;
}

const pairKeepsakes = [
  { icon: '🍄', label: 'Mushroom' }, { icon: '🌰', label: 'Acorn' },
  { icon: '🍃', label: 'Leaf' }, { icon: '🌙', label: 'Moon' },
  { icon: '🫖', label: 'Tea pot' }, { icon: '🧶', label: 'Yarn' },
  { icon: '🏮', label: 'Lantern' }, { icon: '⭐', label: 'Star' },
];

export function PairsStage({ onReward }: { onReward: (message: string) => void }) {
  const [seed, setSeed] = useState(() => Date.now());
  const [deck, setDeck] = useState(() => createPairsDeck(seed));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [complete, setComplete] = useState(false);
  const [best, recordBest] = useLowestScore('pairs');
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    const nextSeed = seed + 1;
    setSeed(nextSeed); setDeck(createPairsDeck(nextSeed)); setFlipped([]); setMatched([]); setMoves(0); setLocked(false); setComplete(false);
  };
  const reveal = (index: number) => {
    if (locked || complete || flipped.includes(index) || matched.includes(index)) return;
    if (!flipped.length) { setFlipped([index]); return; }
    const first = flipped[0];
    const nextMoves = moves + 1;
    setFlipped([first, index]); setMoves(nextMoves); setLocked(true);
    const isMatch = deck[first] === deck[index];
    timer.current = window.setTimeout(() => {
      if (isMatch) {
        const nextMatched = [...matched, first, index];
        setMatched(nextMatched);
        if (nextMatched.length === deck.length) {
          setComplete(true);
          recordBest(nextMoves);
          onReward('Firefly Pairs complete! +40 coins · +30 XP.');
        }
      }
      setFlipped([]); setLocked(false);
    }, isMatch ? 430 : 780);
  };
  const stars = moves <= 12 ? 3 : moves <= 18 ? 2 : 1;
  return <div className="pairs-stage game-stage">
    <div className="game-title-row"><div><h2>Firefly Pairs</h2><p>{complete ? `All keepsakes found in ${moves} moves!` : 'Find the matching keepsakes.'}</p></div><button type="button" onClick={reset} aria-label="Restart Firefly Pairs"><RotateCcw size={18} /></button></div>
    <div className="pairs-score"><span><b>{matched.length / 2}</b> / 8 pairs</span><span><b>{moves}</b> moves</span>{best !== null && <span>Best <b>{best}</b></span>}{complete && <span aria-label={`${stars} stars`}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>}</div>
    <div className="pairs-board" aria-label="Firefly Pairs board">{deck.map((keepsake, index) => {
      const showing = flipped.includes(index) || matched.includes(index);
      const item = pairKeepsakes[keepsake];
      return <button key={index} type="button" disabled={locked || matched.includes(index) || complete} className={`${showing ? 'showing' : ''} ${matched.includes(index) ? 'matched' : ''}`} onClick={() => reveal(index)} aria-label={showing ? `${item.label}${matched.includes(index) ? ', matched' : ''}` : `Hidden card ${index + 1}`} aria-pressed={showing}><span className="pair-card-back">✦</span><span className="pair-card-front"><b>{item.icon}</b><small>{item.label}</small></span></button>;
    })}</div>
    {complete && <button className="stage-action" type="button" onClick={reset}>Shuffle and play again</button>}
  </div>;
}

export function GardenStage({ onReward }: { onReward: (message: string) => void }) {
  const [seed, setSeed] = useState(() => Date.now());
  const [board, setBoard] = useState(() => createGardenPuzzle(seed));
  const [moves, setMoves] = useState(0);
  const [complete, setComplete] = useState(false);
  const [best, recordBest] = useLowestScore('garden');
  const newPuzzle = () => {
    const nextSeed = seed + 1;
    setSeed(nextSeed); setBoard(createGardenPuzzle(nextSeed)); setMoves(0); setComplete(false);
  };
  const tend = (index: number) => {
    if (complete) return;
    const next = toggleGarden(board, index);
    const won = next.every(Boolean);
    const nextMoves = moves + 1;
    setBoard(next); setMoves(nextMoves); setComplete(won);
    if (won) { recordBest(nextMoves); onReward('Glow Garden complete! +40 coins · +30 XP.'); }
  };
  const awake = board.filter(Boolean).length;
  return <div className="garden-stage game-stage">
    <div className="game-title-row"><div><h2>Glow Garden</h2><p>{complete ? `The whole garden is glowing after ${moves} taps!` : 'A tap changes this plot and its neighbors.'}</p></div><button type="button" onClick={newPuzzle} aria-label="New Glow Garden puzzle"><RotateCcw size={18} /></button></div>
    <div className="garden-score"><span><b>{awake}</b> / 25 awake</span><span><b>{moves}</b> taps</span>{best !== null && <span>Best <b>{best}</b></span>}</div>
    <div className="garden-board" aria-label="Glow Garden board">{board.map((lit, index) => <button key={index} type="button" disabled={complete} className={lit ? 'blooming' : 'sleeping'} onClick={() => tend(index)} aria-label={`Garden plot ${index + 1}, ${lit ? 'blooming' : 'sleeping'}`} aria-pressed={lit}><span>{lit ? '✿' : '·'}</span></button>)}</div>
    <p className="garden-tip">Tip: corner taps reach three plots; middle taps reach five.</p>
    {complete && <button className="stage-action" type="button" onClick={newPuzzle}>Plant a new puzzle</button>}
  </div>;
}

export function TeaStackStage({ onReward }: { onReward: (message: string) => void }) {
  const [pegs, setPegs] = useState<number[][]>([[3, 2, 1], [], []]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [message, setMessage] = useState('Move the tea set to the window tray.');
  const [best, recordBest] = useLowestScore('tea-stack');
  const complete = pegs[2].length === 3;
  const reset = () => { setPegs([[3, 2, 1], [], []]); setSelected(null); setMoves(0); setMessage('Move the tea set to the window tray.'); };
  const choose = (peg: number) => {
    if (complete) return;
    if (selected === null) {
      if (!pegs[peg].length) { setMessage('That tray is empty. Choose a cup first.'); return; }
      setSelected(peg); setMessage('Now choose a tray for the top cup.'); return;
    }
    if (selected === peg) { setSelected(null); setMessage('Cup set down. Choose another tray.'); return; }
    const next = moveTeaStack(pegs, selected, peg);
    setSelected(null);
    if (next === pegs) { setMessage('A bigger cup cannot sit on a smaller cup.'); return; }
    const nextMoves = moves + 1;
    const won = next[2].length === 3;
    setPegs(next); setMoves(nextMoves);
    if (won) { setMessage(`Perfect pour in ${nextMoves} moves!`); recordBest(nextMoves); onReward('Tea Stack complete! +40 coins · +30 XP.'); }
    else setMessage('Lovely. Choose the next top cup.');
  };
  return <div className="tea-stage game-stage">
    <div className="game-title-row"><div><h2>Tea Stack</h2><p>{message}</p></div><button type="button" onClick={reset} aria-label="Restart Tea Stack"><RotateCcw size={18} /></button></div>
    <div className="tea-score"><span><b>{moves}</b> moves</span><span>Best possible: <b>7</b></span>{best !== null && <span>Your best: <b>{best}</b></span>}</div>
    <div className="tea-table" aria-label="Tea Stack trays">{pegs.map((cups, peg) => <button key={peg} type="button" disabled={complete} className={selected === peg ? 'selected' : ''} onClick={() => choose(peg)} aria-label={`Tray ${peg + 1}, ${cups.length} cups`}><span className="tea-window">{peg === 2 ? '☾' : ''}</span><i className="tea-post" />{[...cups].reverse().map((cup) => <span key={cup} className={`tea-cup cup-${cup}`}><b>{cup === 1 ? '·' : cup === 2 ? '⁙' : '✦'}</b></span>)}<em>{peg === 0 ? 'Start' : peg === 2 ? 'Window' : 'Table'}</em></button>)}</div>
    <p className="tea-tip">Tap a tray to lift its top cup, then tap a destination.</p>
    {complete && <button className="stage-action" type="button" onClick={reset}>Stack another tea set</button>}
  </div>;
}

const mosaicTiles = ['🌙', '⭐', '☁', '✨', '🏮', '🍄', '🌿', '☕'];

export function MosaicStage({ onReward }: { onReward: (message: string) => void }) {
  const [seed, setSeed] = useState(() => Date.now());
  const [board, setBoard] = useState(() => createMosaicPuzzle(seed));
  const [moves, setMoves] = useState(0);
  const [complete, setComplete] = useState(false);
  const [best, recordBest] = useLowestScore('mosaic');
  const newPuzzle = () => {
    const nextSeed = seed + 1;
    setSeed(nextSeed); setBoard(createMosaicPuzzle(nextSeed)); setMoves(0); setComplete(false);
  };
  const slide = (index: number) => {
    if (complete) return;
    const next = moveMosaic(board, index);
    if (next === board) return;
    const nextMoves = moves + 1;
    const won = isMosaicComplete(next);
    setBoard(next); setMoves(nextMoves); setComplete(won);
    if (won) { recordBest(nextMoves); onReward('Moon Mosaic complete! +40 coins · +30 XP.'); }
  };
  const movable = new Set(mosaicMovableTiles(board));
  return <div className="mosaic-stage game-stage">
    <div className="game-title-row"><div><h2>Moon Mosaic</h2><p>{complete ? `The moonlit scene is whole after ${moves} slides!` : 'Slide the numbered keepsakes into order.'}</p></div><button type="button" onClick={newPuzzle} aria-label="New Moon Mosaic puzzle"><RotateCcw size={18} /></button></div>
    <div className="mosaic-score"><span><b>{moves}</b> slides</span>{best !== null && <span>Best <b>{best}</b></span>}</div>
    <div className="mosaic-board" aria-label="Moon Mosaic board">{board.map((tile, index) => tile === 0
      ? <span className="mosaic-empty" key="empty" aria-label="Empty mosaic space" />
      : <button key={tile} type="button" disabled={complete || !movable.has(index)} onClick={() => slide(index)} aria-label={`Tile ${tile}${movable.has(index) ? ', movable' : ''}`}><small>{tile}</small><b>{mosaicTiles[tile - 1]}</b></button>)}</div>
    <p className="mosaic-tip">Finish 1–8 from left to right, leaving the last space open.</p>
    {complete && <button className="stage-action" type="button" onClick={newPuzzle}>Shuffle another mosaic</button>}
  </div>;
}

const codeCharms = ['🌙', '⭐', '🍄', '🌿', '☕', '🏮'];
interface CodeGuess { charms: number[]; exact: number; nearby: number; }

export function CozyCodeStage({ onReward }: { onReward: (message: string) => void }) {
  const [seed, setSeed] = useState(() => Date.now());
  const [secret, setSecret] = useState(() => createCozyCode(seed));
  const [current, setCurrent] = useState<number[]>([]);
  const [guesses, setGuesses] = useState<CodeGuess[]>([]);
  const [message, setMessage] = useState('Choose four different charms.');
  const [best, recordBest] = useLowestScore('cozy-code');
  const won = guesses.some((guess) => guess.exact === 4);
  const lost = !won && guesses.length >= 7;
  const complete = won || lost;
  const newPuzzle = () => {
    const nextSeed = seed + 1;
    setSeed(nextSeed); setSecret(createCozyCode(nextSeed)); setCurrent([]); setGuesses([]); setMessage('Choose four different charms.');
  };
  const addCharm = (charm: number) => {
    if (complete || current.length >= 4 || current.includes(charm)) return;
    setCurrent([...current, charm]); setMessage('Build your four-charm guess.');
  };
  const submit = () => {
    if (current.length !== 4 || complete) { setMessage('Choose four charms before checking the code.'); return; }
    const score = scoreCozyCode(secret, current);
    const nextGuesses = [...guesses, { charms: current, ...score }];
    setGuesses(nextGuesses); setCurrent([]);
    if (score.exact === 4) {
      recordBest(nextGuesses.length); setMessage(`Code cracked in ${nextGuesses.length} ${nextGuesses.length === 1 ? 'guess' : 'guesses'}!`); onReward('Cozy Code cracked! +40 coins · +30 XP.');
    } else if (nextGuesses.length === 7) setMessage('The lock clicked shut. The code is revealed below.');
    else setMessage(`${score.exact} exact · ${score.nearby} nearby. Try again.`);
  };
  return <div className="code-stage game-stage">
    <div className="game-title-row"><div><h2>Cozy Code</h2><p aria-live="polite">{message}</p></div><button type="button" onClick={newPuzzle} aria-label="New Cozy Code puzzle"><RotateCcw size={18} /></button></div>
    <div className="code-score"><span><b>{guesses.length}</b> / 7 guesses</span>{best !== null && <span>Best <b>{best}</b></span>}</div>
    <div className="code-history" aria-label="Cozy Code guesses">
      {guesses.map((guess, index) => <div className="code-guess" key={index}><small>{index + 1}</small><span>{guess.charms.map((charm) => <b key={charm}>{codeCharms[charm]}</b>)}</span><em aria-label={`${guess.exact} exact and ${guess.nearby} nearby`}>{'●'.repeat(guess.exact)}{'○'.repeat(guess.nearby)}<i>{4 - guess.exact - guess.nearby ? '·'.repeat(4 - guess.exact - guess.nearby) : ''}</i></em></div>)}
      {!guesses.length && <p>Gold ● = exact spot<br />White ○ = right charm, new spot</p>}
      {lost && <div className="code-reveal"><small>Code</small><span>{secret.map((charm) => <b key={charm}>{codeCharms[charm]}</b>)}</span></div>}
    </div>
    {!complete && <><div className="code-current" aria-label="Current Cozy Code guess">{Array.from({ length: 4 }, (_, index) => <span className={current[index] === undefined ? 'empty' : ''} key={index}>{current[index] === undefined ? '?' : codeCharms[current[index]]}</span>)}</div>
    <div className="code-palette" aria-label="Choose a charm">{codeCharms.map((charm, index) => <button key={charm} type="button" disabled={current.includes(index)} onClick={() => addCharm(index)} aria-label={`Add ${charm} charm`}>{charm}</button>)}</div>
    <div className="code-actions"><button type="button" disabled={!current.length} onClick={() => setCurrent(current.slice(0, -1))}>Undo</button><button type="button" disabled={current.length !== 4} onClick={submit}>Check code</button></div></>}
    {complete && <button className="stage-action" type="button" onClick={newPuzzle}>{won ? 'Crack another code' : 'Try a new code'}</button>}
  </div>;
}

export function HotTakesStage({ players, meId, game, onAction }: SharedStageProps<HotTakesGameState>) {
  if (!game || game.phase === 'waiting') return <WaitingForFriends title="Hot Takes" />;
  const myVote = game.votes[meId];
  const counts = Object.values(game.votes).reduce<Record<string, number>>((result, id) => ({ ...result, [id]: (result[id] || 0) + 1 }), {});
  return <div className="takes-stage game-stage"><div className="game-title-row"><div><h2>Hot Takes</h2><p>{game.revealed ? 'The Pod has spoken.' : myVote ? 'Vote locked. Waiting for the Pod…' : 'Vote first. Explain later.'}</p></div>{game.revealed && <button type="button" onClick={() => void onAction({ type: 'next-prompt' })}><RotateCcw size={18} /></button>}</div><h3>{hotTakePrompts[game.promptIndex]}</h3><div className="candidate-grid">{game.playerIds.map((id) => { const player = players.find((item) => item.id === id); if (!player) return null; return <button key={id} className={myVote === id ? 'selected' : ''} disabled={Boolean(myVote) || game.revealed} type="button" onClick={() => void onAction({ type: 'cast-vote', targetId: id })}><Podling look={player.look} size="small" /><strong>{player.name}</strong>{game.revealed && <span>{counts[id] || 0} votes</span>}</button>; })}</div><button className="stage-action" disabled={!game.revealed} type="button" onClick={() => game.revealed && void onAction({ type: 'next-prompt' })}>{game.revealed ? 'Next hot take' : `${Object.keys(game.votes).length}/${game.playerIds.length} votes locked`}</button></div>;
}

const hazardIcons: Record<LanternHazard, typeof Wind> = { gust: Wind, rain: CloudRain, spark: Sparkles };
export function LanternStage({ players, game, onAction }: SharedStageProps<LanternGameState>) {
  const [clock, setClock] = useState(Date.now());
  const gameSessionId = game?.sessionId;
  const gamePhase = game?.phase;
  useEffect(() => {
    if (!gameSessionId || gamePhase !== 'playing') return;
    const timer = window.setInterval(() => { setClock(Date.now()); void onAction({ type: 'lantern-tick' }); }, 500);
    return () => clearInterval(timer);
  }, [gameSessionId, gamePhase, onAction]);
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

export function ReversiStage({ players, meId, game, onAction }: SharedStageProps<ReversiGameState>) {
  if (!game || game.phase === 'waiting') return <WaitingForFriends title="Mossy Reversi" />;
  const missingSeat = game.playerIds.some((id) => !players.some((player) => player.id === id));
  const currentId = game.playerIds[game.turnIndex];
  const canPlay = game.phase === 'playing' && !missingSeat && currentId === meId;
  const legalMoves = new Set(reversiValidMoves(game.board, game.turnIndex));
  const scores = reversiScores(game.board);
  const status = missingSeat ? 'Paused while a seated player reconnects.' : game.phase === 'draw' ? 'The grove is perfectly balanced.' : game.phase === 'finished' ? `${playerName(players, game.winnerId || '')} claimed the grove!` : canPlay ? 'Your turn — choose a glowing leaf.' : `${playerName(players, currentId)}’s turn`;
  return <div className="reversi-stage game-stage">
    <div className="game-title-row"><div><h2>Mossy Reversi</h2><p>{status}</p></div>{(game.phase === 'finished' || game.phase === 'draw') && <button type="button" onClick={() => void onAction({ type: 'restart' })} aria-label="Restart Mossy Reversi"><RotateCcw size={18} /></button>}</div>
    <div className="reversi-layout">
      <div className="reversi-board" aria-label="Mossy Reversi board">{game.board.map((cell, index) => <button key={index} type="button" disabled={!canPlay || !legalMoves.has(index)} className={`${cell === 0 ? 'cream-disc' : cell === 1 ? 'moss-disc' : ''} ${legalMoves.has(index) && canPlay ? 'legal-move' : ''}`} aria-label={cell === -1 ? `Square ${index + 1}${legalMoves.has(index) ? ', legal move' : ''}` : `${cell === 0 ? 'Cream' : 'Moss'} disc`} onClick={() => void onAction({ type: 'place-reversi', index })}><span /></button>)}</div>
      <div className="strategy-score">{game.playerIds.map((id, index) => <div className={game.phase === 'playing' && game.turnIndex === index ? 'active' : ''} key={id}><i className={index === 0 ? 'cream-token' : 'moss-token'} /><span><small>{id === meId ? 'You' : 'Friend'}</small><strong>{playerName(players, id)}</strong></span><b>{scores[index]}</b></div>)}</div>
    </div>
  </div>;
}

const bridgeTileNames = ['Straight', 'Corner', 'Junction', 'Crossing'];
export function BridgeStage({ players, meId, game, onAction }: SharedStageProps<BridgeGameState>) {
  const [tile, setTile] = useState(0);
  const [rotation, setRotation] = useState(0);
  if (!game || game.phase === 'waiting') return <WaitingForFriends title="Bridge Builders" />;
  const currentId = game.playerIds[game.turnIndex];
  const currentPresent = players.some((player) => player.id === currentId);
  const canPlay = game.phase === 'playing' && currentPresent && currentId === meId;
  const mask = bridgeTileMask(tile, rotation);
  const legal = new Set(validBridgePlacements(game.board, mask));
  const status = !currentPresent ? `Waiting for ${playerName(players, currentId)} to reconnect.` : game.phase === 'draw' ? 'No dry timber left — cozy draw!' : game.phase === 'finished' ? `${playerName(players, game.winnerId || '')} completed the crossing!` : canPlay ? 'Your turn — extend the connected route.' : `${playerName(players, currentId)} is building…`;
  return <div className="bridge-stage game-stage">
    <div className="game-title-row"><div><h2>Bridge Builders</h2><p>{status}</p></div>{(game.phase === 'finished' || game.phase === 'draw') && <button type="button" onClick={() => void onAction({ type: 'restart' })} aria-label="Restart Bridge Builders"><RotateCcw size={18} /></button>}</div>
    <div className="bridge-tools" aria-label="Choose a bridge tile">{bridgeTileNames.map((name, index) => <button key={name} type="button" className={tile === index ? 'selected' : ''} onClick={() => setTile(index)} aria-label={name}><span className={`bridge-art sprite-${index}`} style={{ backgroundImage: `url(${bridgeTiles})` }} /><small>{name}</small></button>)}<button type="button" className="rotate-bridge" onClick={() => setRotation((value) => (value + 1) % 4)}>Rotate ↻</button></div>
    <div className="bridge-board" aria-label="Bridge Builders board">{game.board.map((cell, index) => {
      const visual = bridgeVisual(cell); const isBank = index === 21 || index === 27;
      return <button key={index} type="button" disabled={!canPlay || !legal.has(index)} className={`${isBank ? 'bridge-bank' : cell ? 'placed-bridge' : ''} ${legal.has(index) && canPlay ? 'legal-bridge' : ''}`} onClick={() => void onAction({ type: 'place-bridge', index, tile, rotation })} aria-label={isBank ? (index === 21 ? 'Start cottage' : 'Goal cottage') : cell ? 'Placed bridge tile' : `River square ${index + 1}${legal.has(index) ? ', valid placement' : ''}`}>{isBank ? <span>{index === 21 ? '🏡' : '🏠'}</span> : cell ? <span className={`bridge-art sprite-${visual.tile}`} style={{ backgroundImage: `url(${bridgeTiles})`, transform: `rotate(${visual.rotation * 90}deg) scale(1.35)` }} /> : null}</button>;
    })}</div>
    <div className="bridge-turns">{game.playerIds.map((id, index) => <span className={game.turnIndex === index && game.phase === 'playing' ? 'active' : ''} key={id}><i style={{ background: ['#4f9ed1', '#e6624e', '#e8b43e', '#8a67c7'][index] }} />{id === meId ? 'You' : playerName(players, id)}</span>)}</div>
  </div>;
}

const marketItemNames = ['Herbal Tea', 'Wool Yarn', 'Sweet Roll', 'Cozy Candle', 'Story Book'];
export function MarketStage({ players, meId, game, onAction }: SharedStageProps<MarketGameState>) {
  if (!game || game.phase === 'waiting') return <WaitingForFriends title="Cozy Market" />;
  const currentId = game.playerIds[game.turnIndex];
  const currentPresent = players.some((player) => player.id === currentId);
  const canPlay = game.phase === 'playing' && currentPresent && currentId === meId;
  const winnerNames = game.winnerIds.map((id) => playerName(players, id)).join(' & ');
  const status = game.phase === 'finished' ? `${winnerNames} won the market!` : !currentPresent ? `Waiting for ${playerName(players, currentId)} to reconnect.` : canPlay ? 'Your pick — build a pair, trio, or variety set.' : `${playerName(players, currentId)} is choosing…`;
  return <div className="market-stage game-stage">
    <div className="game-title-row"><div><h2>Cozy Market</h2><p>{status}</p></div><div className="market-round">Round {game.round}/3</div></div>
    <div className="market-row" aria-label="Market items">{game.available.map((item, slot) => <button key={`${game.round}-${slot}-${item}`} type="button" disabled={!canPlay} onClick={() => void onAction({ type: 'pick-market', slot })}><span className={`market-art sprite-${item}`} style={{ backgroundImage: `url(${marketItems})` }} /><strong>{marketItemNames[item]}</strong><small>Pick item</small></button>)}</div>
    <div className="market-baskets">{game.playerIds.map((id, index) => { const inventory = game.inventories[id] || []; const score = game.phase === 'finished' ? game.scores[id] : scoreMarketInventory(inventory); return <div className={game.turnIndex === index && game.phase === 'playing' ? 'active' : ''} key={id}><header><span><small>{id === meId ? 'Your basket' : 'Friend'}</small><strong>{playerName(players, id)}</strong></span><b>{score} pts</b></header><section>{inventory.map((item, itemIndex) => <span key={`${item}-${itemIndex}`} className={`market-art sprite-${item}`} style={{ backgroundImage: `url(${marketItems})` }} />)}{!inventory.length && <em>Empty basket</em>}</section></div>; })}</div>
    {game.phase === 'finished' && <button className="stage-action" type="button" onClick={() => void onAction({ type: 'restart' })}>Open a new market</button>}
  </div>;
}

function bridgeVisual(mask: number) {
  const bits = [1, 2, 4, 8].filter((bit) => mask & bit);
  if (bits.length === 4) return { tile: 3, rotation: 0 };
  if (bits.length === 3) {
    const rotations = [11, 7, 14, 13];
    return { tile: 2, rotation: Math.max(0, rotations.indexOf(mask)) };
  }
  if (mask === 10) return { tile: 0, rotation: 0 };
  if (mask === 5) return { tile: 0, rotation: 1 };
  const rotations = [3, 6, 12, 9];
  return { tile: 1, rotation: Math.max(0, rotations.indexOf(mask)) };
}

function WaitingForFriends({ title }: { title: string }) {
  return <div className="game-stage game-waiting"><Sparkles size={34} /><h2>{title}</h2><p>Waiting for another real player to join this Pod.</p><small>Solo games stay ready while you wait.</small></div>;
}

function playerName(players: PlayerProfile[], id: string) {
  return players.find((player) => player.id === id)?.name || 'A friend';
}

function useLowestScore(game: string) {
  const key = `cozypod_v2_best_${game}`;
  const [best, setBest] = useState<number | null>(() => {
    const saved = Number(localStorage.getItem(key));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  });
  const record = (score: number) => {
    if (!Number.isFinite(score) || score <= 0 || (best !== null && score >= best)) return;
    setBest(score);
    localStorage.setItem(key, String(score));
  };
  return [best, record] as const;
}

function useHighestScore(game: string) {
  const key = `cozypod_v2_best_${game}`;
  const [best, setBest] = useState<number | null>(() => {
    const saved = Number(localStorage.getItem(key));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  });
  const record = (score: number) => {
    if (!Number.isFinite(score) || score <= 0 || (best !== null && score <= best)) return;
    setBest(score);
    localStorage.setItem(key, String(score));
  };
  return [best, record] as const;
}
