import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { Arcade } from './components/Arcade';
import { JoinScreen } from './components/JoinScreen';
import { Lounge } from './components/Lounge';
import { Wardrobe } from './components/Wardrobe';
import { realtime, type GameTransactionResult, type RoomSnapshot } from './services/realtime';
import { voice } from './services/voice';
import { seedPlayers } from './data';
import { applyProfileReward, applySharedGameAction, createSharedGame, isMultiplayerGame, normalizeSharedGame, partyRoundWinnerIds, refreshWaitingGame } from './gameEngine';
import type { ChatMessage, GameId, PartyState, PlayerProfile, SharedGameAction, SharedGameState, View } from './types';
import { cozyAudio } from './services/audio';
import { googleAuthErrorMessage } from './authErrors';

const starterParty: PartyState = { phase: 'lounge', queue: [], round: 0, scores: {} };

function loadProfile() {
  try {
    const saved = localStorage.getItem('cozypod_v2_profile');
    if (saved) return { ...seedPlayers[0], ...JSON.parse(saved), id: 'you', ready: false, online: true } as PlayerProfile;
  } catch { /* fresh v2 profile */ }
  return seedPlayers[0];
}

function App() {
  const params = new URLSearchParams(location.search);
  const [joined, setJoined] = useState(false);
  const [view, setView] = useState<View>('lounge');
  const [selectedGame, setSelectedGame] = useState<GameId>('drop4');
  const [roomCode, setRoomCode] = useState((params.get('room') || 'J4KQ').toUpperCase());
  const [players, setPlayers] = useState<PlayerProfile[]>(() => [loadProfile()]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [party, setParty] = useState<PartyState>(starterParty);
  const [sharedGame, setSharedGame] = useState<SharedGameState | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const sharedGameRef = useRef<SharedGameState | null>(null);

  const me = players[0];
  const meRef = useRef(me);
  useEffect(() => { sharedGameRef.current = sharedGame; }, [sharedGame]);
  useEffect(() => { meRef.current = me; }, [me]);
  useEffect(() => { localStorage.setItem('cozypod_v2_profile', JSON.stringify(me)); }, [me]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3600); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const playTap = (event: PointerEvent) => { if ((event.target as HTMLElement).closest('button, label[for]')) cozyAudio.tap(); };
    const blockNativeGesture = (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('input, textarea, [contenteditable="true"], a')) event.preventDefault();
    };
    document.addEventListener('pointerdown', playTap);
    document.addEventListener('contextmenu', blockNativeGesture);
    document.addEventListener('dragstart', blockNativeGesture);
    return () => {
      document.removeEventListener('pointerdown', playTap);
      document.removeEventListener('contextmenu', blockNativeGesture);
      document.removeEventListener('dragstart', blockNativeGesture);
    };
  }, []);
  useEffect(() => () => { void voice.disconnect(); }, []);

  const applyRoomSnapshot = useCallback((snapshot: RoomSnapshot, selfUid: string) => {
    if (snapshot.players) {
      const remote = Object.values(snapshot.players);
      setPlayers((current) => {
        const mine = remote.find((item) => item.id === selfUid) || { ...current[0], id: selfUid };
        return [mine, ...remote.filter((item) => item.id !== selfUid).slice(0, 3)];
      });
    }
    if (snapshot.messages) setMessages(Object.values(snapshot.messages).sort((a, b) => a.createdAt - b.createdAt).slice(-50));
    else setMessages([]);
    if (snapshot.party) {
      setParty((current) => ({ ...current, ...snapshot.party, queue: snapshot.party?.queue || (snapshot.party?.phase === 'lounge' ? [] : current.queue), scores: snapshot.party?.scores || (snapshot.party?.phase === 'lounge' ? {} : current.scores) }));
      if (snapshot.party.game) {
        setSharedGame(normalizeSharedGame(snapshot.party.game));
      }
      if (snapshot.party.selectedGame) setSelectedGame(snapshot.party.selectedGame);
      else if (snapshot.party.game) setSelectedGame(snapshot.party.game.gameId);
    }
  }, []);

  const enterRoom = async (name: string, code: string) => {
    const next = { ...me, name, ready: false };
    setPlayers((current) => [next, ...current.slice(1)]);
    setRoomCode(code);
    setJoined(true);
    setVoiceReady(false);
    history.replaceState(null, '', `${location.pathname}?room=${code}`);
    const connection = await realtime.connect(code, next, applyRoomSnapshot);
    if (connection.uid !== next.id) setPlayers((current) => [{ ...current[0], id: connection.uid }, ...current.slice(1)]);
    setVoiceReady(connection.online);
    if (!connection.online) setToast('Local mode: realtime rooms need Firebase database access.');
  };

  const updateMe = (next: PlayerProfile) => {
    setPlayers((current) => [next, ...current.slice(1)]);
    realtime.updatePlayer(next);
  };

  const transactGame = useCallback(async (action: SharedGameAction): Promise<GameTransactionResult> => {
    const actorId = players[0].id;
    const now = Date.now();
    const online = await realtime.transactGame((current) => current ? applySharedGameAction(current, action, actorId, now) : current);
    if (online) {
      const state = online.state ? normalizeSharedGame(online.state) : null;
      setSharedGame(state);
      return { ...online, state };
    }
    const current = sharedGameRef.current;
    if (!current) return { state: null, changed: false };
    const next = applySharedGameAction(current, action, actorId, now);
    const changed = next !== current;
    if (changed) setSharedGame(next);
    return { state: next, changed };
  }, [players]);

  const ensureSharedGame = useCallback(async (gameId: GameId, roster = players) => {
    if (!isMultiplayerGame(gameId)) return;
    const ids = roster.map((player) => player.id);
    const now = Date.now();
    const update = (current: SharedGameState | null) => {
      if (!current || current.gameId !== gameId) return createSharedGame(gameId, ids, now);
      return refreshWaitingGame(current, ids, now);
    };
    const online = await realtime.transactGame(update);
    if (online) setSharedGame(online.state ? normalizeSharedGame(online.state) : null);
    else {
      const next = update(sharedGameRef.current);
      sharedGameRef.current = next;
      setSharedGame(next);
    }
  }, [players]);

  const startFreshSharedGame = useCallback(async (gameId: GameId) => {
    if (!isMultiplayerGame(gameId)) {
      sharedGameRef.current = null;
      setSharedGame(null);
      await realtime.transactGame(() => null);
      return;
    }
    const next = createSharedGame(gameId, players.map((player) => player.id), Date.now());
    const online = await realtime.transactGame(() => next);
    setSharedGame(online?.state ? normalizeSharedGame(online.state) : next);
  }, [players]);

  useEffect(() => {
    if (joined && sharedGame?.gameId === selectedGame) void ensureSharedGame(selectedGame, players);
  }, [joined, selectedGame, players, sharedGame?.gameId, ensureSharedGame]);

  const addMessage = (text: string) => {
    const message = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, playerId: me.id, name: me.name, text, createdAt: Date.now() };
    setMessages((current) => [...current.slice(-49), message]);
    realtime.sendMessage(message);
  };

  const sendEmote = (emoji: string) => {
    addMessage(`${emoji} ${emoji}`);
    setToast(`${emoji} sent to the Pod`);
  };

  const toggleReady = () => updateMe({ ...me, ready: !me.ready });
  const queueGame = (game: GameId) => {
    if (party.queue.length >= 5) return;
    const next = { ...party, phase: 'ready' as const, queue: [...party.queue, game] };
    setParty(next); realtime.updateParty(next);
  };
  const removeQueuedGame = (index: number) => {
    if (party.phase === 'playing') return;
    const queue = party.queue.filter((_, itemIndex) => itemIndex !== index);
    const next = { ...party, phase: queue.length ? 'ready' as const : 'lounge' as const, queue };
    setParty(next); void realtime.updateParty(next);
  };
  const startParty = () => {
    const first = party.queue[0] || 'drop4';
    const next = { ...party, phase: 'playing' as const, round: 0, selectedGame: first, scores: Object.fromEntries(players.map((player) => [player.id, 0])) };
    setSelectedGame(first); setParty(next); realtime.updateParty(next);
    void startFreshSharedGame(first);
  };

  const advanceParty = () => {
    if (party.phase !== 'playing') return;
    const scores = { ...party.scores };
    const roundGame = party.queue[party.round];
    const winners = partyRoundWinnerIds(roundGame, sharedGame);
    winners.forEach((id) => { scores[id] = (scores[id] || 0) + 1; });
    const nextRound = party.round + 1;
    if (nextRound >= party.queue.length) {
      const next = { ...party, phase: 'recap' as const, scores };
      setParty(next); void realtime.updateParty(next); return;
    }
    const gameId = party.queue[nextRound];
    const next = { ...party, round: nextRound, scores, selectedGame: gameId };
    setParty(next); setSelectedGame(gameId); void realtime.updateParty(next); void startFreshSharedGame(gameId);
  };

  const finishParty = () => {
    const next: PartyState = { phase: 'lounge', queue: [], round: 0, scores: {} };
    setParty(next); void realtime.updateParty(next); setView('lounge');
  };

  const selectGame = (gameId: GameId) => {
    setSelectedGame(gameId);
    const next = { ...party, selectedGame: gameId };
    setParty(next);
    void realtime.updateParty(next);
    if (isMultiplayerGame(gameId)) void ensureSharedGame(gameId);
    else void startFreshSharedGame(gameId);
  };

  const reward = useCallback((message: string) => {
    setToast(message);
    const player = meRef.current;
    const updated = applyProfileReward(player, message);
    if (updated === player) return;
    cozyAudio.success();
    meRef.current = updated;
    setPlayers((current) => [updated, ...current.slice(1)]);
    void realtime.updatePlayer(updated);
  }, []);

  const toggleVoice = async () => {
    try {
      if (voiceOn) { await voice.disconnect(); setVoiceOn(false); }
      else { await voice.connect(); setVoiceOn(true); setToast('Free peer-to-peer voice is on'); }
    } catch (error) { setToast(error instanceof Error ? error.message : 'Voice is unavailable.'); }
  };

  const googleSignIn = async () => {
    try {
      const credential = await realtime.signInGoogle();
      const googleName = credential.user.displayName?.trim().slice(0, 20) || me.name;
      await enterRoom(googleName, roomCode);
      setToast('Signed in with Google');
    } catch (error) { setToast(googleAuthErrorMessage(error)); }
  };

  const toggleMusic = () => { const next = !musicOn; setMusicOn(next); cozyAudio.setMusic(next); setToast(next ? 'Rainy-day radio is playing' : 'Clubhouse mix paused'); };

  let appContent;
  if (view === 'lounge') appContent = <Lounge players={players} roomCode={roomCode} messages={messages} party={party} voiceOn={voiceOn} voiceReady={voiceReady} onVoice={toggleVoice} onMessage={addMessage} onEmote={sendEmote} onReady={toggleReady} onQueue={queueGame} onRemoveQueue={removeQueuedGame} onStartParty={startParty} onOpenArcade={() => setView('arcade')} onReward={reward} musicOn={musicOn} onMusic={toggleMusic} />;
  else if (view === 'arcade') appContent = <Arcade players={players} meId={me.id} selected={selectedGame} party={party} sharedGame={sharedGame} onSelect={selectGame} onGameAction={transactGame} onNextPartyRound={advanceParty} onFinishParty={finishParty} onReward={reward} />;
  else appContent = <Wardrobe player={me} onChange={updateMe} />;

  if (!joined) return <><JoinScreen player={me} initialRoom={roomCode} onEnter={enterRoom} onGoogle={googleSignIn} />{toast && <Toast text={toast} onClose={() => setToast(null)} />}</>;
  return <><AppShell view={view} player={me} roomCode={roomCode} onView={setView}>{appContent}</AppShell>{toast && <Toast text={toast} onClose={() => setToast(null)} />}</>;
}

function Toast({ text, onClose }: { text: string; onClose: () => void }) {
  return <div className="toast" role="status"><CheckCircle2 size={19} /><span>{text}</span><button type="button" onClick={onClose} aria-label="Dismiss"><X size={16} /></button></div>;
}

export default App;
