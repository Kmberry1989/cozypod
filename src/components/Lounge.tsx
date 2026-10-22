import { useMemo, useState, type FormEvent } from 'react';
import { ChevronRight, CloudRain, Copy, Gift, Mic, MicOff, Music2, PartyPopper, Send, Sparkles, UsersRound, WandSparkles } from 'lucide-react';
import { games, promptCards } from '../data';
import type { ChatMessage, GameId, PartyState, PlayerProfile } from '../types';
import { Podling } from './Podling';
import { cozyAudio } from '../services/audio';
import { isMultiplayerGame } from '../gameEngine';

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
  onRemoveQueue: (index: number) => void;
  onStartParty: () => void;
  onOpenArcade: () => void;
  onReward: (message: string) => void;
  musicOn: boolean;
  onMusic: () => void;
}

const positionsByCount = {
  1: [{ left: '50%', top: '55%' }],
  2: [{ left: '30%', top: '55%' }, { left: '70%', top: '55%' }],
  3: [{ left: '20%', top: '57%' }, { left: '50%', top: '48%' }, { left: '80%', top: '57%' }],
  4: [{ left: '13%', top: '57%' }, { left: '37%', top: '48%' }, { left: '59%', top: '51%' }, { left: '77%', top: '58%' }],
} as const;

export function Lounge({ players, roomCode, messages, party, voiceOn, voiceReady, onVoice, onMessage, onEmote, onReady, onQueue, onRemoveQueue, onStartParty, onOpenArcade, onReward, musicOn, onMusic }: LoungeProps) {
  const [draft, setDraft] = useState('');
  const [drawer, setDrawer] = useState<'toys' | 'party' | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [showAllEmotes, setShowAllEmotes] = useState(false);
  const readyCount = players.filter((player) => player.ready).length;
  const allReady = players.length > 0 && readyCount === players.length;
  const needsFriend = party.queue.some(isMultiplayerGame) && players.length < 2;
  const playerPositions = positionsByCount[players.length as keyof typeof positionsByCount] || positionsByCount[4];
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
          <UsersRound size={18} /><span><strong>{readyCount}/{players.length} ready · {players.length}/4 friends</strong><small>{party.queue.length ? `${party.queue.length} games queued` : 'Build a party queue'}</small></span><ChevronRight size={18} />
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
          {(showAllEmotes ? ['👋', '❤️', '👏', '🎉', '😂', '🌱', '✨', '☕', '🔥', '🤝'] : ['👋', '❤️', '👏', '🎉']).map((emoji) => <button key={emoji} type="button" aria-label={`Send ${emoji} reaction`} onClick={() => onEmote(emoji)}>{emoji}</button>)}
          <button type="button" aria-label={showAllEmotes ? 'Fewer reactions' : 'More reactions'} onClick={() => setShowAllEmotes((value) => !value)}>{showAllEmotes ? '−' : '•••'}</button>
        </div>
        <div className="chat-list" aria-live="polite">
          {!recentMessages.length && <p className="empty-chat">No messages yet. Say hello to your Pod.</p>}
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
            {party.queue.length === 0 ? <p>Pick a few games for the night.</p> : party.queue.map((id, index) => <span key={`${id}-${index}`}>{games.find((game) => game.id === id)?.icon} {games.find((game) => game.id === id)?.label}<button type="button" aria-label={`Remove ${games.find((game) => game.id === id)?.label}`} onClick={() => onRemoveQueue(index)}>×</button></span>)}
          </div>
          <div className="party-game-picks">
            {games.map((game) => <button key={game.id} disabled={party.queue.length >= 5} type="button" onClick={() => onQueue(game.id)}><span>{game.icon}</span>{game.label}</button>)}
          </div>
          {needsFriend && <p className="party-note">This game starts when another friend joins.</p>}
          <button className="primary-button" disabled={!allReady || party.queue.length === 0 || needsFriend} type="button" onClick={() => { onStartParty(); setDrawer(null); onOpenArcade(); }}>Start party</button>
        </aside>
      )}
    </section>
  );
}
