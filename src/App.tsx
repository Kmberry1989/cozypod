import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { Arcade } from './components/Arcade';
import { JoinScreen } from './components/JoinScreen';
import { Lounge } from './components/Lounge';
import { Wardrobe } from './components/Wardrobe';
import { realtime, type RoomSnapshot } from './services/realtime';
import { voice } from './services/voice';
import { seedPlayers } from './data';
import { levelThreshold } from './gameEngine';
import type { ChatMessage, GameId, PartyState, PlayerProfile, View } from './types';
import { cozyAudio } from './services/audio';

const starterMessages: ChatMessage[] = [
  { id: 'welcome-1', playerId: 'sunny', name: 'Sunny', text: 'this room is so cozy 💛', createdAt: Date.now() - 120000 },
  { id: 'welcome-2', playerId: 'bean', name: 'Bean', text: 'pizza and games? 🎮', createdAt: Date.now() - 65000 },
  { id: 'welcome-3', playerId: 'pebble', name: 'Pebble', text: 'let’s goooo ✨', createdAt: Date.now() - 20000 },
];

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
  const [players, setPlayers] = useState<PlayerProfile[]>(() => [loadProfile(), ...seedPlayers.slice(1)]);
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [party, setParty] = useState<PartyState>(starterParty);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const me = players[0];
  useEffect(() => { localStorage.setItem('cozypod_v2_profile', JSON.stringify(me)); }, [me]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3600); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const playTap = (event: PointerEvent) => { if ((event.target as HTMLElement).closest('button, label[for], .asset-drop-zone')) cozyAudio.tap(); };
    document.addEventListener('pointerdown', playTap);
    return () => document.removeEventListener('pointerdown', playTap);
  }, []);
  useEffect(() => () => { void voice.disconnect(); }, []);

  const applyRoomSnapshot = useCallback((snapshot: RoomSnapshot) => {
    if (snapshot.players) {
      const remote = Object.values(snapshot.players);
      setPlayers((current) => [current[0], ...remote.filter((item) => item.id !== current[0].id).slice(0, 3), ...seedPlayers.slice(1)].slice(0, 4));
    }
    if (snapshot.messages) setMessages(Object.values(snapshot.messages).sort((a, b) => a.createdAt - b.createdAt).slice(-50));
    if (snapshot.party) setParty(snapshot.party);
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
    setVoiceReady(true);
  };

  const updateMe = (next: PlayerProfile) => {
    setPlayers((current) => [next, ...current.slice(1)]);
    realtime.updatePlayer(next);
  };

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
  const startParty = () => {
    const first = party.queue[0] || 'drop4';
    const next = { ...party, phase: 'playing' as const, round: 0 };
    setSelectedGame(first); setParty(next); realtime.updateParty(next);
  };

  const reward = useCallback((message: string) => {
    setToast(message);
    if (message.includes('+')) cozyAudio.success();
    if (!message.includes('+')) return;
    setPlayers((current) => {
      const player = current[0];
      let xp = player.xp + 30;
      let level = player.level;
      if (xp >= levelThreshold(level)) { xp -= levelThreshold(level); level += 1; }
      return [{ ...player, coins: player.coins + 40, xp, level, trophyCount: player.trophyCount + (message.includes('Storm cleared') ? 1 : 0) }, ...current.slice(1)];
    });
  }, []);

  const toggleVoice = async () => {
    try {
      if (voiceOn) { await voice.disconnect(); setVoiceOn(false); }
      else { await voice.connect(); setVoiceOn(true); setToast('Free peer-to-peer voice is on'); }
    } catch (error) { setToast(error instanceof Error ? error.message : 'Voice is unavailable.'); }
  };

  const googleSignIn = async () => {
    try { await realtime.linkGoogle(); setToast('Progress is now synced with Google.'); }
    catch (error) { setToast(error instanceof Error ? error.message : 'Google sign-in was cancelled.'); }
  };

  const toggleMusic = () => { const next = !musicOn; setMusicOn(next); cozyAudio.setMusic(next); setToast(next ? 'Rainy-day radio is playing' : 'Clubhouse mix paused'); };

  let appContent;
  if (view === 'lounge') appContent = <Lounge players={players} roomCode={roomCode} messages={messages} party={party} voiceOn={voiceOn} voiceReady={voiceReady} onVoice={toggleVoice} onMessage={addMessage} onEmote={sendEmote} onReady={toggleReady} onQueue={queueGame} onStartParty={startParty} onOpenArcade={() => setView('arcade')} onReward={reward} musicOn={musicOn} onMusic={toggleMusic} />;
  else if (view === 'arcade') appContent = <Arcade players={players} selected={selectedGame} party={party} onSelect={setSelectedGame} onReward={reward} />;
  else appContent = <Wardrobe player={me} onChange={updateMe} />;

  if (!joined) return <><JoinScreen player={me} initialRoom={roomCode} onEnter={enterRoom} onGoogle={googleSignIn} />{toast && <Toast text={toast} onClose={() => setToast(null)} />}</>;
  return <><AppShell view={view} player={me} roomCode={roomCode} onView={setView}>{appContent}</AppShell>{toast && <Toast text={toast} onClose={() => setToast(null)} />}</>;
}

function Toast({ text, onClose }: { text: string; onClose: () => void }) {
  return <div className="toast" role="status"><CheckCircle2 size={19} /><span>{text}</span><button type="button" onClick={onClose} aria-label="Dismiss"><X size={16} /></button></div>;
}

export default App;
