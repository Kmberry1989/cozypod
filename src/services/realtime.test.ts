import { describe, expect, it } from 'vitest';
import { roomLastActivity, type RoomSnapshot } from './realtime';

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
