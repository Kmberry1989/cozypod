import { useMemo, useState, type FormEvent } from 'react';
import { ChevronRight, CloudRain, Copy, Gift, Mic, MicOff, Music2, PartyPopper, Send, Sparkles, UsersRound, WandSparkles } from 'lucide-react';
import { games, promptCards } from '../data';
import type { ChatMessage, GameId, PartyState, PlayerProfile } from '../types';
import { Podling } from './Podling';
import { cozyAudio } from '../services/audio';

interface LoungeProps {
  players: PlayerProfile[];
  roomCode: string;
  messages: ChatMessage[];
  party: PartyState;
  voiceOn: boolean;
  voiceReady: boolean;
  onVoice: () => void;
  onMessage: (text: string) => void;
  onEmote: (emoji: string) => void;
  onReady: () => void;
  onQueue: (game: GameId) => void;
  onStartParty: () => void;
  onOpenArcade: () => void;
  onReward: (message: string) => void;
  musicOn: boolean;
  onMusic: () => void;
}

const playerPositions = [
  { left: '13%', top: '57%' },
  { left: '37%', top: '48%' },
  { left: '59%', top: '51%' },
  { left: '77%', top: '58%' },
];

export function Lounge({ players, roomCode, messages, party, voiceOn, voiceReady, onVoice, onMessage, onEmote, onReady, onQueue, onStartParty, onOpenArcade, onReward, musicOn, onMusic }: LoungeProps) {
  const [draft, setDraft] = useState('');
  const [drawer, setDrawer] = useState<'toys' | 'party' | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const readyCount = players.filter((player) => player.ready).length;
  const recentMessages = useMemo(() => messages.slice(-3), [messages]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onMessage(draft.trim());
    setDraft('');
  };

  return (
    <section className="lounge-screen" aria-label="CozyPod lounge">
      <div className="lounge-stage">
        <img className="lounge-background" src={players[0].roomBackground || `${import.meta.env.BASE_URL}art/v2/lounge-rainy.webp`} alt="A warm clay clubhouse on a rainy evening" />
        <div className="rain-layer" aria-hidden="true" />
        <button className="room-share" type="button" onClick={() => navigator.clipboard?.writeText(`${location.origin}${location.pathname}?room=${roomCode}`)}><Copy size={14} /> Invite</button>
        <button className="party-callout" type="button" onClick={() => setDrawer('party')}>
          <UsersRound size={18} /><span><strong>{readyCount}/4 ready</strong><small>{party.queue.length ? `${party.queue.length} games queued` : 'Build a party queue'}</small></span><ChevronRight size={18} />
        </button>
        <div className="podling-stage" aria-label="Players in the room">
          {players.map((player, index) => (
            <div key={player.id} className="stage-player" style={playerPositions[index]}>
              <Podling look={player.look} name={player.name} size="medium" />
              <span className="online-dot" title="Online" />
            </div>
          ))}
        </div>
        <div className="shared-toy-shelf" aria-label="The Pod’s shared collectible shelf">
          {players.map((player) => <div key={player.id} title={`${player.name}'s shelf pick`}>{player.shelfToy.startsWith('data:') || player.shelfToy.includes('/') ? <img src={player.shelfToy} alt={`${player.name}'s shelf collectible`} /> : <span>{player.shelfToy}</span>}</div>)}
        </div>
        <div className="lounge-rail" aria-label="Lounge actions">
          <button type="button" onClick={() => setDrawer(drawer === 'toys' ? null : 'toys')}><Gift size={19} /><span>Items</span></button>
          <button type="button" onClick={() => { cozyAudio.weather(); onReward('The rain sounds extra cozy now.'); }}><CloudRain size={19} /><span>Weather</span></button>
          <button type="button" onClick={() => { cozyAudio.whoosh(); onReward('Low gravity! The cushions drift for a moment.'); }}><WandSparkles size={19} /><span>Gravity</span></button>
          <button type="button" onClick={() => { cozyAudio.success(); onReward('You found a tiny clay star! +15 coins'); }}><Sparkles size={19} /><span>Gacha</span></button>
        </div>
      </div>

      <div className="social-panel">
        <div className="emote-strip" aria-label="Quick reactions">
          <button type="button" onClick={() => onMessage('Anyone up for a game?')}>💬 <span>Chat</span></button>
          {['👋', '❤️', '👏', '🎉'].map((emoji) => <button key={emoji} type="button" aria-label={`Send ${emoji} reaction`} onClick={() => onEmote(emoji)}>{emoji}</button>)}
          <button type="button" aria-label="More reactions" onClick={() => onReward('More reactions coming soon')}>•••</button>
        </div>
        <div className="chat-list" aria-live="polite">
          {recentMessages.map((message) => (
            <div className="chat-message" key={message.id}>
              <Podling look={players.find((player) => player.id === message.playerId)?.look ?? players[0].look} size="tiny" />
              <p><strong>{message.name}</strong><span>{message.text}</span></p><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
            </div>
          ))}
        </div>
        <form className="chat-composer" onSubmit={submit}>
          <input aria-label="Message the Pod" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={160} placeholder="Message the Pod…" />
          <button type="submit" aria-label="Send message"><Send size={18} /></button>
          <button className={voiceOn ? 'voice-on' : ''} type="button" disabled={!voiceReady} aria-label={!voiceReady ? 'Connecting voice chat' : voiceOn ? 'Leave voice chat' : 'Join free voice chat'} title={!voiceReady ? 'Connecting…' : voiceOn ? 'Leave voice chat' : 'Join free peer-to-peer voice'} onClick={onVoice}>{voiceOn ? <Mic size={20} /> : <MicOff size={20} />}</button>
        </form>
      </div>

      {drawer === 'toys' && (
        <aside className="toy-drawer panel-pop" aria-label="Lounge toy drawer">
          <div><Music2 size={18} /><strong>Clubhouse mix</strong><span>Procedural rainy-day radio</span><button type="button" onClick={onMusic}>{musicOn ? 'Pause' : 'Play'}</button></div>
          <div><PartyPopper size={18} /><strong>Cozy prompt</strong><span>{promptCards[promptIndex]}</span><button type="button" onClick={() => setPromptIndex((value) => (value + 1) % promptCards.length)}>Draw</button></div>
          <button className="drawer-close" type="button" onClick={() => setDrawer(null)}>Done</button>
        </aside>
      )}

      {drawer === 'party' && (
        <aside className="party-drawer panel-pop" aria-label="Party night setup">
          <header><div><strong>Tonight’s party</strong><span>Queue up to five games</span></div><button type="button" onClick={() => setDrawer(null)}>Done</button></header>
          <div className="ready-row">
            {players.map((player) => <div key={player.id} className={player.ready ? 'ready' : ''}><Podling look={player.look} size="tiny" /><span>{player.ready ? 'Ready!' : 'Waiting'}</span></div>)}
          </div>
          <button className={`ready-button ${players[0].ready ? 'is-ready' : ''}`} type="button" onClick={onReady}>{players[0].ready ? 'You’re ready ✓' : 'Ready up'}</button>
          <div className="queue-list">
            {party.queue.length === 0 ? <p>Pick a few games for the night.</p> : party.queue.map((id, index) => <span key={`${id}-${index}`}>{games.find((game) => game.id === id)?.icon} {games.find((game) => game.id === id)?.label}</span>)}
          </div>
          <div className="party-game-picks">
            {games.map((game) => <button key={game.id} disabled={party.queue.length >= 5} type="button" onClick={() => onQueue(game.id)}><span>{game.icon}</span>{game.label}</button>)}
          </div>
          <button className="primary-button" disabled={!players[0].ready || party.queue.length === 0} type="button" onClick={() => { onStartParty(); setDrawer(null); onOpenArcade(); }}>Start party</button>
        </aside>
      )}
    </section>
  );
}
