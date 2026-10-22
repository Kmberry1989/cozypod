import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ImagePlus, Lock, Pencil, Shuffle, Upload } from 'lucide-react';
import type { ContentAsset, ContentCategory } from '../contentLibrary';
import { categoryLabels, useContentLibrary } from '../contentLibrary';
import type { PlayerProfile } from '../types';
import { Podling } from './Podling';

interface WardrobeProps {
  player: PlayerProfile;
  onChange: (next: PlayerProfile) => void;
}

const uploadCategories = Object.keys(categoryLabels) as ContentCategory[];

export function Wardrobe({ player, onChange }: WardrobeProps) {
  const { assets, byCategory, addFiles, error } = useContentLibrary();
  const [uploadCategory, setUploadCategory] = useState<ContentCategory>('podling-headwear');
  const bodies = byCategory('podling-bodies');
  const headwear = byCategory('podling-headwear');
  const hats = byCategory('podling-hats');
  const faces = byCategory('podling-faces');
  const backgrounds = byCategory('room-backgrounds');
  const randomize = () => onChange({ ...player, look: { body: randomAssetValue(bodies), sprout: randomAssetValue(headwear), face: randomAssetValue(faces), hat: hats.length && Math.random() > .45 ? randomAssetValue(hats) : undefined } });
  const equipLayer = (part: 'body' | 'sprout' | 'face' | 'hat', asset: ContentAsset) => onChange({ ...player, look: { ...player.look, [part]: assetValue(asset) } });
  const isEquipped = (asset: ContentAsset, value?: string) => value === asset.id || value === asset.url;

  return (
    <section className="wardrobe-screen" aria-labelledby="wardrobe-title">
      <div className="screen-heading"><div><h1 id="wardrobe-title">Wardrobe</h1><p>Make your Podling feel like you</p></div><button type="button" onClick={randomize}><Shuffle size={17} /> Surprise me</button></div>
      <div className="wardrobe-preview" style={player.roomBackground ? { backgroundImage: `url(${player.roomBackground})` } : undefined}>
        <button type="button" aria-label="Previous outfit"><ChevronLeft /></button>
        <div className="preview-plinth"><Podling look={player.look} size="large" /><span className="plinth" /></div>
        <button type="button" aria-label="Next outfit"><ChevronRight /></button>
        <div className="profile-card"><strong>{player.name}<Pencil size={14} /></strong><span>{player.status}<Pencil size={12} /></span></div>
      </div>
      <div className="customizer">
        <AssetRail title="Body" assets={bodies} selected={player.look.body} onSelect={(asset) => equipLayer('body', asset)} />
        <AssetRail title="Sprout / Back accessory" assets={headwear} selected={player.look.sprout} onSelect={(asset) => equipLayer('sprout', asset)} />
        <AssetRail title="Hat / Front accessory" assets={hats} selected={player.look.hat || ''} onSelect={(asset) => equipLayer('hat', asset)} empty="Add a transparent hat asset below; it will layer in front of the body." />
        <AssetRail title="Face / Eyes" assets={faces} selected={player.look.face} onSelect={(asset) => equipLayer('face', asset)} />
        <div className="trophy-shelf"><div><strong>Trophies</strong><small>Earned together</small></div><div className="shelf"><span>⭐</span><span>🎮</span><span>👑</span><span>💗</span><span>🌱</span></div></div>
        <ClubhousePicker player={player} backgrounds={backgrounds} onChange={onChange} />
        <div className="content-library">
          <div className="art-drops-heading"><span><strong>Content library</strong><small>Auto-discovered project packs + this device</small></span></div>
          <div className="asset-upload-controls">
            <select aria-label="Asset category" value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value as ContentCategory)}>{uploadCategories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select>
            <label><Upload size={15} /> Add assets<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" multiple onChange={(event) => event.target.files && addFiles(event.target.files, uploadCategory)} /></label>
          </div>
          <label className="asset-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files, uploadCategory); }}><ImagePlus size={19} /><span>Drop {categoryLabels[uploadCategory].toLowerCase()} here</span><input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" multiple onChange={(event) => event.target.files && addFiles(event.target.files, uploadCategory)} /></label>
          {error && <p className="asset-error" role="alert">{error}</p>}
          <div className="content-category-groups">
            {uploadCategories.map((category) => {
              const categoryAssets = assets.filter((asset) => asset.category === category && asset.source !== 'built-in' && category !== 'room-backgrounds');
              if (!categoryAssets.length) return null;
              return <section key={category}><h3>{categoryLabels[category]} <span>{categoryAssets.length}</span></h3><div className="asset-grid">{categoryAssets.map((asset) => <button key={asset.id} className={isEquipped(asset, selectedValue(player, category)) ? 'selected' : ''} type="button" onClick={() => equipAsset(player, onChange, asset)}><img src={asset.url} alt="" /><span>{asset.name}</span><small>{asset.source === 'project' ? 'Project' : 'This device'}</small></button>)}</div></section>;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function AssetRail({ title, assets, selected, onSelect, empty }: { title: string; assets: ContentAsset[]; selected: string; onSelect: (asset: ContentAsset) => void; empty?: string }) {
  return <div className="custom-section"><div><strong>{title}</strong><small>{assets.length} collected</small></div>{assets.length ? <div className="accessory-rail">{assets.map((asset) => <button key={asset.id} className={selected === asset.id || selected === asset.url ? 'selected' : ''} type="button" title={asset.name} onClick={() => onSelect(asset)}><img src={asset.url} alt={asset.name} /></button>)}</div> : <p className="empty-asset-slot">{empty}</p>}</div>;
}

function ClubhousePicker({ player, backgrounds, onChange }: { player: PlayerProfile; backgrounds: ContentAsset[]; onChange: (next: PlayerProfile) => void }) {
  const active = player.roomBackground || backgrounds[0]?.url;
  return <div className="clubhouse-picker"><div className="clubhouse-heading"><span><strong>My clubhouse</strong><small>Your view only—friends can choose their own</small></span><small>{backgrounds.filter((asset) => clubhouseUnlock(asset, player).unlocked).length}/{backgrounds.length} unlocked</small></div><div className="clubhouse-rail">{backgrounds.map((asset) => { const rule = clubhouseUnlock(asset, player); const selected = active === asset.url; return <button key={asset.id} className={selected ? 'selected' : ''} disabled={!rule.unlocked} type="button" onClick={() => onChange({ ...player, roomBackground: asset.url })}><img src={asset.url} alt="" /><span>{asset.name}</span><small>{rule.unlocked ? (selected ? 'Equipped' : 'Unlocked') : rule.requirement}</small>{selected && <i><Check size={12} /></i>}{!rule.unlocked && <i><Lock size={12} /></i>}</button>; })}</div></div>;
}

function clubhouseUnlock(asset: ContentAsset, player: PlayerProfile) {
  if (asset.name === 'Mosslight Conservatory') return { unlocked: player.level >= 5, requirement: 'Reach level 5' };
  if (asset.name === 'Cocoa Snow Lodge') return { unlocked: player.trophyCount >= 5, requirement: 'Earn 5 trophies' };
  if (asset.name === 'Starlight Observatory') return { unlocked: player.level >= 15, requirement: 'Reach level 15' };
  return { unlocked: true, requirement: 'Unlocked' };
}

function assetValue(asset: ContentAsset) { return asset.source === 'built-in' ? asset.id : asset.url; }
function randomAssetValue(assets: ContentAsset[]) { const asset = assets[Math.floor(Math.random() * assets.length)]; return asset ? assetValue(asset) : ''; }
function selectedValue(player: PlayerProfile, category: ContentCategory) {
  if (category === 'podling-bodies') return player.look.body;
  if (category === 'podling-headwear') return player.look.sprout;
  if (category === 'podling-hats') return player.look.hat;
  if (category === 'podling-faces') return player.look.face;
  if (category === 'toys') return player.shelfToy;
  if (category === 'room-backgrounds') return player.roomBackground;
  return undefined;
}
function equipAsset(player: PlayerProfile, onChange: (next: PlayerProfile) => void, asset: ContentAsset) {
  if (asset.category === 'podling-bodies') onChange({ ...player, look: { ...player.look, body: asset.url } });
  else if (asset.category === 'podling-headwear') onChange({ ...player, look: { ...player.look, sprout: asset.url } });
  else if (asset.category === 'podling-hats') onChange({ ...player, look: { ...player.look, hat: asset.url } });
  else if (asset.category === 'podling-faces') onChange({ ...player, look: { ...player.look, face: asset.url } });
  else if (asset.category === 'toys') onChange({ ...player, shelfToy: asset.url });
  else if (asset.category === 'room-backgrounds') onChange({ ...player, roomBackground: asset.url });
  else if (asset.category === 'game-art') window.open(asset.url, '_blank', 'noopener,noreferrer');
}
