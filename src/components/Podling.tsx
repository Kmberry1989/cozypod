import type { PodlingLook } from '../types';
import { resolveLayer } from '../contentLibrary';

interface PodlingProps {
  look: PodlingLook;
  name?: string;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  emote?: string;
  className?: string;
}

export function Podling({ look, name, size = 'medium', emote, className = '' }: PodlingProps) {
  return (
    <div className={`podling-wrap podling-${size} ${className}`} aria-label={name ? `${name}'s Podling` : 'Podling'}>
      {emote && <span className="podling-emote" aria-hidden="true">{emote}</span>}
      <div className="podling-art" aria-hidden="true">
        <img className="podling-layer podling-body" src={resolveLayer(look.body, 'body')} alt="" />
        <img className="podling-layer podling-sprout" src={resolveLayer(look.sprout, 'sprout')} alt="" />
        <img className="podling-layer podling-face" src={resolveLayer(look.face, 'face')} alt="" />
        {look.hat && <img className="podling-layer podling-hat" src={resolveLayer(look.hat, 'sprout')} alt="" />}
      </div>
      {name && <span className="podling-name">{name}</span>}
    </div>
  );
}
