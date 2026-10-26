import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { seedPlayers } from '../data';
import { AppShell } from './AppShell';

afterEach(cleanup);

describe('AppShell connection status', () => {
  it('offers a reconnect action while offline', () => {
    const reconnect = vi.fn();
    render(<AppShell view="lounge" player={seedPlayers[0]} roomCode="TEST" connectionStatus="offline" onView={() => undefined} onReconnect={reconnect}><p>Room</p></AppShell>);
    const button = screen.getByRole('button', { name: 'Reconnect' });
    expect(button.hasAttribute('disabled')).toBe(false);
    fireEvent.click(button);
    expect(reconnect).toHaveBeenCalledOnce();
  });

  it.each([
    ['online', 'Online'],
    ['connecting', 'Joining…'],
  ] as const)('shows %s without an active retry button', (status, label) => {
    render(<AppShell view="arcade" player={seedPlayers[0]} roomCode="TEST" connectionStatus={status} onView={() => undefined} onReconnect={() => undefined}><p>Room</p></AppShell>);
    expect(screen.getByRole('button', { name: label }).hasAttribute('disabled')).toBe(true);
  });
});
