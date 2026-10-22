import { useState, type FormEvent } from 'react';
import { ArrowRight, Hash, UserRound, UsersRound } from 'lucide-react';
import { Podling } from './Podling';
import type { PlayerProfile } from '../types';

interface JoinScreenProps {
  player: PlayerProfile;
  initialRoom: string;
  onEnter: (name: string, room: string) => void;
  onGoogle: () => void;
}

export function JoinScreen({ player, initialRoom, onEnter, onGoogle }: JoinScreenProps) {
  const [name, setName] = useState(player.name === 'Maple' ? '' : player.name);
  const [room, setRoom] = useState(initialRoom);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onEnter(name.trim() || 'Maple', room.trim().toUpperCase() || 'J4KQ');
  };

  return (
    <main className="join-screen">
      <div className="join-scenery" aria-hidden="true" />
      <section className="join-content" aria-labelledby="join-title">
        <img className="join-logo" src={`${import.meta.env.BASE_URL}art/v2/cozypod-wordmark.webp`} alt="CozyPod" />
        <h1 id="join-title" className="sr-only">CozyPod</h1>
        <p className="join-tagline">Your tiny hangout after hours.</p>
        <div className="join-friends" aria-label="A private pod for four friends">
          {(['teal', 'lime', 'lilac', 'mint'] as const).map((body, index) => (
            <Podling key={body} size="small" look={{ body, sprout: index === 1 ? 'flower' : index === 2 ? 'mushroom' : 'leaf', face: index === 2 ? 'sleepy' : 'happy' }} />
          ))}
        </div>
        <div className="four-seat-note"><UsersRound size={16} /> Private rooms for up to four friends</div>
        <form className="join-form" onSubmit={submit}>
          <label className="join-field">
            <UserRound size={20} />
            <span className="sr-only">Display name</span>
            <input maxLength={20} value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter a display name" autoComplete="nickname" />
            <small>{name.length}/20</small>
          </label>
          <label className="join-field">
            <Hash size={20} />
            <span className="sr-only">Room code</span>
            <input maxLength={8} value={room} onChange={(event) => setRoom(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="Room code (optional)" autoCapitalize="characters" />
            <small>e.g. J4KQ</small>
          </label>
          <button className="primary-button enter-button" type="submit">Enter the Pod <ArrowRight size={21} /></button>
        </form>
        <div className="join-or"><span />or<span /></div>
        <button className="google-button" type="button" onClick={onGoogle}><strong>G</strong> Continue with Google</button>
      </section>
    </main>
  );
}
