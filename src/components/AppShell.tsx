import type { ReactNode } from 'react';
import { Gamepad2, Home, LoaderCircle, Shirt, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionStatus, PlayerProfile, View } from '../types';
import { Podling } from './Podling';

interface AppShellProps {
  view: View;
  player: PlayerProfile;
  roomCode: string;
  connectionStatus: ConnectionStatus;
  children: ReactNode;
  onView: (view: View) => void;
  onReconnect: () => void;
}

const nav = [
  { id: 'lounge' as const, label: 'Lounge', Icon: Home },
  { id: 'arcade' as const, label: 'Arcade', Icon: Gamepad2 },
  { id: 'wardrobe' as const, label: 'Wardrobe', Icon: Shirt },
];

export function AppShell({ view, player, roomCode, connectionStatus, children, onView, onReconnect }: AppShellProps) {
  const ConnectionIcon = connectionStatus === 'online' ? Wifi : connectionStatus === 'connecting' ? LoaderCircle : WifiOff;
  const connectionLabel = connectionStatus === 'online' ? 'Online' : connectionStatus === 'connecting' ? 'Joining…' : 'Reconnect';
  return (
    <div className={`app-shell view-${view}`}>
      <header className="topbar">
        <div className="profile-brief">
          <Podling look={player.look} size="tiny" />
          <div><strong>{player.name}</strong><span>Lv {player.level}</span></div>
        </div>
        <div className="topbar-right">
          <button className={`connection-status ${connectionStatus}`} type="button" disabled={connectionStatus !== 'offline'} onClick={onReconnect} aria-label={connectionLabel} aria-live="polite" title={connectionStatus === 'offline' ? 'Play solo offline or retry the live room' : connectionLabel}>
            <ConnectionIcon size={13} className={connectionStatus === 'connecting' ? 'spin' : ''} /><span>{connectionLabel}</span>
          </button>
          <div className="coin-count" aria-label={`${player.coins} coins`}><span>●</span>{player.coins.toLocaleString()}</div>
          <button className="room-code" type="button" onClick={() => navigator.clipboard?.writeText(`${location.origin}${location.pathname}?room=${roomCode}`)}>
            <small>Room code</small><strong>{roomCode}</strong>
          </button>
        </div>
      </header>
      <div className="app-body">{children}</div>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {nav.map(({ id, label, Icon }) => (
          <button key={id} className={view === id ? 'active' : ''} type="button" onClick={() => onView(id)} aria-current={view === id ? 'page' : undefined}>
            <Icon size={23} strokeWidth={2.5} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
