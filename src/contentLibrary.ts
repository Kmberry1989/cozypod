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
