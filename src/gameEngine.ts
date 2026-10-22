export type DropCell = 0 | 1 | null;

export function dropDisc(board: DropCell[], column: number, player: 0 | 1): DropCell[] {
  if (column < 0 || column > 6 || board.length !== 42) return board;
  const next = [...board];
  for (let row = 5; row >= 0; row -= 1) {
    const index = row * 7 + column;
    if (next[index] === null) {
      next[index] = player;
      return next;
    }
  }
  return board;
}

export function getDrop4Winner(board: DropCell[]): 0 | 1 | null {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (let row = 0; row < 6; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const value = board[row * 7 + col];
      if (value === null) continue;
      for (const [dr, dc] of directions) {
        let count = 1;
        for (let i = 1; i < 4; i += 1) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || r >= 6 || c < 0 || c >= 7 || board[r * 7 + c] !== value) break;
          count += 1;
        }
        if (count === 4) return value;
      }
    }
  }
  return null;
}

export type LanternHazard = 'gust' | 'rain' | 'spark';
export interface LanternEvent { id: number; lantern: number; hazard: LanternHazard; at: number; }

export function createLanternEvents(seed: number, duration = 60): LanternEvent[] {
  let state = seed || 1;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const events: LanternEvent[] = [];
  for (let at = 4, id = 0; at < duration; at += Math.max(2.2, 5.4 - at / 25)) {
    events.push({ id, lantern: Math.floor(random() * 4), hazard: (['gust', 'rain', 'spark'] as const)[Math.floor(random() * 3)], at: Math.round(at * 10) / 10 });
    id += 1;
  }
  return events;
}

export function levelThreshold(level: number) {
  return Math.max(100, level * 100);
}
