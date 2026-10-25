import { describe, expect, it } from 'vitest';
import { clubhouseUnlock, rewardUnlock, useContentLibrary } from './contentLibrary';
import { seedPlayers } from './data';

describe('project content library', () => {
  it('auto-discovers every supported reward category', () => {
    const { assets, byCategory } = useContentLibrary();
    expect(new Set(assets.map((asset) => asset.id)).size).toBe(assets.length);
    expect(byCategory('podling-faces').filter((asset) => asset.source === 'project')).toHaveLength(6);
    expect(byCategory('podling-hats')).toHaveLength(4);
    expect(byCategory('trophies')).toHaveLength(6);
    expect(byCategory('toys')).toHaveLength(1);
    expect(byCategory('room-backgrounds')).toHaveLength(4);
    expect(byCategory('game-art')).toHaveLength(2);
    expect(assets.every((asset) => Boolean(asset.url))).toBe(true);
  });

  it('unlocks wardrobe rewards and clubhouses from earned progress', () => {
    const { byCategory } = useContentLibrary();
    const starter = { ...seedPlayers[0], level: 1, trophyCount: 0 };
    const veteran = { ...starter, level: 15, trophyCount: 6 };
    const trophies = byCategory('trophies');
    expect(trophies.every((asset, index) => !rewardUnlock(asset, index, trophies, starter).unlocked)).toBe(true);
    expect(trophies.every((asset, index) => rewardUnlock(asset, index, trophies, veteran).unlocked)).toBe(true);
    const backgrounds = byCategory('room-backgrounds');
    expect(backgrounds.find((asset) => asset.name === 'Starlight Observatory')).toBeDefined();
    expect(backgrounds.every((asset) => clubhouseUnlock(asset, veteran).unlocked)).toBe(true);
    const customBackground = { id: 'custom', name: 'Cloud Nook', url: '/cloud.webp', category: 'room-backgrounds' as const, source: 'project' as const };
    expect(clubhouseUnlock(customBackground, { ...starter, level: 3 }, 0, [customBackground]).unlocked).toBe(false);
    expect(clubhouseUnlock(customBackground, { ...starter, level: 4 }, 0, [customBackground]).unlocked).toBe(true);
  });
});
