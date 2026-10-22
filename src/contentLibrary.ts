import { useEffect, useMemo, useState } from 'react';

export type ContentCategory = 'podling-bodies' | 'podling-headwear' | 'podling-hats' | 'podling-faces' | 'toys' | 'room-backgrounds' | 'game-art';

export interface ContentAsset {
  id: string;
  name: string;
  url: string;
  category: ContentCategory;
  source: 'built-in' | 'project' | 'local';
}

export const categoryLabels: Record<ContentCategory, string> = {
  'podling-bodies': 'Podling bodies',
  'podling-headwear': 'Headwear',
  'podling-hats': 'Hats / front accessories',
  'podling-faces': 'Faces / eyes',
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
  return [{ id: `project:${path}`, name, url, category, source: 'project' }];
});

const DB_NAME = 'cozypod-content-library';
const STORE = 'assets';

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readLocalAssets(): Promise<ContentAsset[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    request.onsuccess = () => resolve((request.result as ContentAsset[]).map((asset) => ({ ...asset, category: asset.category || 'toys', source: 'local' })));
    request.onerror = () => reject(request.error);
  });
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function saveLocalAsset(file: File, category: ContentCategory): Promise<ContentAsset> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Keep each asset under 5 MB.');
  const asset: ContentAsset = { id: `local:${crypto.randomUUID()}`, name: file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), url: await fileToDataUrl(file), category, source: 'local' };
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const request = database.transaction(STORE, 'readwrite').objectStore(STORE).put(asset);
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
  return asset;
}

export function resolveLayer(value: string, category: 'body' | 'sprout' | 'face') {
  if (value.startsWith('data:') || value.includes('/')) return value;
  return `${base}art/podling/${category}-${value}.png`;
}

export function useContentLibrary() {
  const [localAssets, setLocalAssets] = useState<ContentAsset[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { readLocalAssets().then(setLocalAssets).catch(() => setError('Local assets are unavailable in this browser.')); }, []);
  const assets = useMemo(() => [...builtIns, ...projectAssets, ...localAssets], [localAssets]);
  const byCategory = (category: ContentCategory) => assets.filter((asset) => asset.category === category);
  const addFiles = async (files: FileList | File[], category: ContentCategory) => {
    setError('');
    try { const added = await Promise.all(Array.from(files).map((file) => saveLocalAsset(file, category))); setLocalAssets((current) => [...current, ...added]); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not add that asset.'); }
  };
  return { assets, byCategory, addFiles, error };
}
