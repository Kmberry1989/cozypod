import { Check, ChevronLeft, ChevronRight, Lock, Shuffle } from 'lucide-react';
import type { ContentAsset } from '../contentLibrary';
import { clubhouseUnlock, rewardUnlock, useContentLibrary } from '../contentLibrary';
import type { PlayerProfile } from '../types';
import { Podling } from './Podling';

interface WardrobeProps {
  player: PlayerProfile;
  onChange: (next: PlayerProfile) => void;
}

export function Wardrobe({ player, onChange }: WardrobeProps) {
  const { byCategory } = useContentLibrary();
  const bodies = byCategory('podling-bodies');
  const headwear = byCategory('podling-headwear');
  const hats = byCategory('podling-hats');
  const faces = byCategory('podling-faces');
  const trophies = byCategory('trophies');
  const toys = byCategory('toys');
  const backgrounds = byCategory('room-backgrounds');
  const randomize = () => onChange({ ...player, look: { body: randomUnlockedValue(bodies, player), sprout: randomUnlockedValue(headwear, player), face: randomUnlockedValue(faces, player), hat: hats.length && Math.random() > .45 ? randomUnlockedValue(hats, player) : undefined } });
  const cycleOutfit = (direction: -1 | 1) => onChange({ ...player, look: { ...player.look, body: cycleUnlockedValue(bodies, player.look.body, player, direction), sprout: cycleUnlockedValue(headwear, player.look.sprout, player, direction), face: cycleUnlockedValue(faces, player.look.face, player, direction) } });
  const equipLayer = (part: 'body' | 'sprout' | 'face' | 'hat', asset: ContentAsset) => onChange({ ...player, look: { ...player.look, [part]: assetValue(asset) } });

  return (
    <section className="wardrobe-screen" aria-labelledby="wardrobe-title">
      <div className="screen-heading"><div><h1 id="wardrobe-title">Wardrobe</h1><p>Make your Podling feel like you</p></div><button type="button" onClick={randomize}><Shuffle size={17} /> Surprise me</button></div>
      <div className="wardrobe-preview" style={player.roomBackground ? { backgroundImage: `url(${player.roomBackground})` } : undefined}>
        <button type="button" aria-label="Previous outfit" onClick={() => cycleOutfit(-1)}><ChevronLeft /></button>
        <div className="preview-plinth"><Podling look={player.look} size="large" /><span className="plinth" /></div>
        <button type="button" aria-label="Next outfit" onClick={() => cycleOutfit(1)}><ChevronRight /></button>
        <div className="profile-card"><strong>{player.name}</strong><span>{player.status}</span></div>
      </div>
      <div className="customizer">
        <AssetRail title="Body" assets={bodies} selected={player.look.body} player={player} onSelect={(asset) => equipLayer('body', asset)} />
        <AssetRail title="Sprout / Back accessory" assets={headwear} selected={player.look.sprout} player={player} onSelect={(asset) => equipLayer('sprout', asset)} />
        <AssetRail title="Hat / Front accessory" assets={hats} selected={player.look.hat || ''} player={player} onSelect={(asset) => equipLayer('hat', asset)} empty="New accessories appear here when added to the project folder." />
        <AssetRail title="Face / Eyes" assets={faces} selected={player.look.face} player={player} onSelect={(asset) => equipLayer('face', asset)} />
        <TrophyShelf trophies={trophies} player={player} />
        <AssetRail title="Shared shelf toy" assets={toys} selected={player.shelfToy} player={player} onSelect={(asset) => onChange({ ...player, shelfToy: asset.url })} />
        <ClubhousePicker player={player} backgrounds={backgrounds} onChange={onChange} />
      </div>
    </section>
  );
}

function AssetRail({ title, assets, selected, player, onSelect, empty }: { title: string; assets: ContentAsset[]; selected: string; player: PlayerProfile; onSelect: (asset: ContentAsset) => void; empty?: string }) {
  const unlocked = assets.filter((asset, index) => rewardUnlock(asset, index, assets, player).unlocked).length;
  return <div className="custom-section"><div><strong>{title}</strong><small>{unlocked}/{assets.length} unlocked</small></div>{assets.length ? <div className="accessory-rail">{assets.map((asset, index) => { const rule = rewardUnlock(asset, index, assets, player); return <button key={asset.id} className={`${selected === asset.id || selected === asset.url ? 'selected' : ''} ${rule.unlocked ? '' : 'locked'}`} disabled={!rule.unlocked} type="button" title={rule.unlocked ? asset.name : `${asset.name} — ${rule.requirement}`} onClick={() => onSelect(asset)}><img src={asset.url} alt={asset.name} />{!rule.unlocked && <i aria-hidden="true"><Lock size={13} /></i>}</button>; })}</div> : <p className="empty-asset-slot">{empty}</p>}</div>;
}

function TrophyShelf({ trophies, player }: { trophies: ContentAsset[]; player: PlayerProfile }) {
  return <div className="trophy-shelf"><div><strong>Trophies</strong><small>{Math.min(player.trophyCount, trophies.length)}/{trophies.length} earned together</small></div><div className="shelf">{trophies.map((asset, index) => { const rule = rewardUnlock(asset, index, trophies, player); return <span className={`shelf-item ${rule.unlocked ? '' : 'locked'}`} key={asset.id} title={rule.unlocked ? asset.name : `${asset.name} — ${rule.requirement}`}><img src={asset.url} alt={rule.unlocked ? asset.name : ''} />{!rule.unlocked && <i aria-hidden="true"><Lock size={12} /></i>}</span>; })}</div></div>;
}

function ClubhousePicker({ player, backgrounds, onChange }: { player: PlayerProfile; backgrounds: ContentAsset[]; onChange: (next: PlayerProfile) => void }) {
  const active = player.roomBackground || backgrounds[0]?.url;
  return <div className="clubhouse-picker"><div className="clubhouse-heading"><span><strong>My clubhouse</strong><small>Your view only—friends can choose their own</small></span><small>{backgrounds.filter((asset) => clubhouseUnlock(asset, player).unlocked).length}/{backgrounds.length} unlocked</small></div><div className="clubhouse-rail">{backgrounds.map((asset) => { const rule = clubhouseUnlock(asset, player); const selected = active === asset.url; return <button key={asset.id} className={selected ? 'selected' : ''} disabled={!rule.unlocked} type="button" onClick={() => onChange({ ...player, roomBackground: asset.url })}><img src={asset.url} alt="" /><span>{asset.name}</span><small>{rule.unlocked ? (selected ? 'Equipped' : 'Unlocked') : rule.requirement}</small>{selected && <i><Check size={12} /></i>}{!rule.unlocked && <i><Lock size={12} /></i>}</button>; })}</div></div>;
}

function assetValue(asset: ContentAsset) { return asset.source === 'built-in' ? asset.id : asset.url; }
function randomUnlockedValue(assets: ContentAsset[], player: PlayerProfile) {
  const unlocked = assets.filter((asset, index) => rewardUnlock(asset, index, assets, player).unlocked);
  const asset = unlocked[Math.floor(Math.random() * unlocked.length)];
  return asset ? assetValue(asset) : '';
}

function cycleUnlockedValue(assets: ContentAsset[], current: string, player: PlayerProfile, direction: -1 | 1) {
  const unlocked = assets.filter((asset, index) => rewardUnlock(asset, index, assets, player).unlocked);
  if (!unlocked.length) return current;
  const currentIndex = unlocked.findIndex((asset) => assetValue(asset) === current || asset.id === current);
  const nextIndex = (Math.max(0, currentIndex) + direction + unlocked.length) % unlocked.length;
  return assetValue(unlocked[nextIndex]);
}
