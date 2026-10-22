import type { PlayerProfile } from './types';

export type ContentCategory = 'podling-bodies' | 'podling-headwear' | 'podling-hats' | 'podling-faces' | 'trophies' | 'toys' | 'room-backgrounds' | 'game-art';

export interface ContentAsset {
  id: string;
  name: string;
  url: string;
  category: ContentCategory;
  source: 'built-in' | 'project';
}

export const categoryLabels: Record<ContentCategory, string> = {
  'podling-bodies': 'Podling bodies',
  'podling-headwear': 'Headwear',
  'podling-hats': 'Hats / front accessories',
  'podling-faces': 'Faces / eyes',
  trophies: 'Trophies',
  toys: 'Toys & shelf items',
  'room-backgrounds': 'Room backgrounds',
  'game-art': 'Game art',
};

const base = import.meta.env.BASE_URL;
const builtIns: ContentAsset[] = [
  ...(['teal', 'lime', 'mint', 'lilac'] as const).map((id) => ({ id, name: id, url: `${base}art/podling/body-${id}.png`, category: 'podling-bodies' as const, source: 'built-in' as const })),
  ...(['leaf', 'flower', 'mushroom'] as const).map((id) => ({ id, name: id, url: `${base}art/podling/sprout-${id}.png`, category: 'podling-headwear' as const, source: 'built-in' as const })),
  ...(['happy', 'sleepy', 'starry'] as const).map((id) => ({ id, name: id, url: `${base}art/podling/face-${id}.png`, category: 'podling-faces' as const, source: 'built-in' as const })),
  { id: 'rainy-clubhouse', name: 'Rainy clubhouse', url: `${base}art/v2/lounge-rainy.webp`, category: 'room-backgrounds', source: 'built-in' },
];

const discovered = import.meta.glob('./assets/content/**/*.{png,jpg,jpeg,webp,gif,svg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const categoryNames = Object.keys(categoryLabels) as ContentCategory[];

const projectAssets: ContentAsset[] = Object.entries(discovered).flatMap(([path, url]) => {
  const category = categoryNames.find((name) => path.includes(`/content/${name}/`));
  if (!category) return [];
  const file = path.split('/').pop() || 'asset';
  const name = file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return [{ id: `project:${path}`, name, url, category, source: 'project' as const }];
}).sort((a, b) => a.id.localeCompare(b.id));

export function resolveLayer(value: string, category: 'body' | 'sprout' | 'face') {
  if (value.startsWith('data:') || value.includes('/')) return value;
  return `${base}art/podling/${category}-${value}.png`;
}

export function useContentLibrary() {
  const assets = [...builtIns, ...projectAssets];
  const byCategory = (category: ContentCategory) => assets.filter((asset) => asset.category === category);
  return { assets, byCategory };
}

export function clubhouseUnlock(asset: ContentAsset, player: PlayerProfile) {
  if (asset.name === 'Mosslight Conservatory') return { unlocked: player.level >= 5, requirement: 'Reach level 5' };
  if (asset.name === 'Cocoa Snow Lodge') return { unlocked: player.trophyCount >= 5, requirement: 'Earn 5 trophies' };
  if (asset.name === 'Starlight Observatory') return { unlocked: player.level >= 15, requirement: 'Reach level 15' };
  return { unlocked: true, requirement: 'Unlocked' };
}

export function rewardUnlock(asset: ContentAsset, index: number, assets: ContentAsset[], player: PlayerProfile) {
  if (asset.source === 'built-in') return { unlocked: true, requirement: 'Starter item' };
  const projectIndex = assets.slice(0, index).filter((item) => item.source === 'project').length;
  if (asset.category === 'trophies' || asset.category === 'toys' || asset.category === 'podling-hats') {
    const needed = projectIndex + 1;
    return { unlocked: player.trophyCount >= needed, requirement: `Earn ${needed} ${needed === 1 ? 'trophy' : 'trophies'}` };
  }
  const needed = asset.category === 'podling-faces' ? 2 + projectIndex * 2 : 3 + projectIndex * 3;
  return { unlocked: player.level >= needed, requirement: `Reach level ${needed}` };
}
