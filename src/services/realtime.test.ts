import { describe, expect, it } from 'vitest';
import { seedPlayers } from '../data';
import { realtime, roomLastActivity, type RoomSnapshot } from './realtime';

describe('room retention', () => {
  it('uses the newest party or chat activity for stale-room cleanup', () => {
    const room = {
      party: { phase: 'lounge', round: 0, queue: [], scores: {}, updatedAt: 300 },
      messages: {
        one: { id: 'one', playerId: 'a', name: 'A', text: 'old', createdAt: 100 },
        two: { id: 'two', playerId: 'b', name: 'B', text: 'new', createdAt: 500 },
      },
    } satisfies RoomSnapshot;
    expect(roomLastActivity(room)).toBe(500);
    expect(roomLastActivity({})).toBe(0);
  });
});

describe('offline rooms', () => {
  it('enters local mode immediately without initializing Firebase', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const connection = await realtime.connect('OFFLINE', seedPlayers[0], () => undefined);
    expect(connection.online).toBe(false);
    expect(connection.uid).toBe(seedPlayers[0].id);
    expect(connection.error).toContain('solo games are ready');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });
});
