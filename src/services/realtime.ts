import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInAnonymously, signInWithPopup, type Auth } from 'firebase/auth';
import { getDatabase, onChildAdded, onDisconnect, onValue, push, ref, remove, runTransaction, set, update, type Database } from 'firebase/database';
import type { ChatMessage, PartyState, PlayerProfile, SharedGameState } from '../types';

const fallbackConfig = {
  apiKey: 'AIzaSyDJffr2GYu8Q22oZ4bvnsfL1UVFvLQU35k',
  authDomain: 'spatial-canvas-a9726.firebaseapp.com',
  databaseURL: 'https://spatial-canvas-a9726-default-rtdb.firebaseio.com',
  projectId: 'spatial-canvas-a9726',
  storageBucket: 'spatial-canvas-a9726.firebasestorage.app',
  messagingSenderId: '204810238888',
  appId: '1:204810238888:web:7e0164fed39f09dcc03b9d',
};

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fallbackConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fallbackConfig.authDomain,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || fallbackConfig.databaseURL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fallbackConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fallbackConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fallbackConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fallbackConfig.appId,
};

export interface RoomSnapshot {
  players?: Record<string, PlayerProfile>;
  messages?: Record<string, ChatMessage>;
  party?: Partial<PartyState>;
}

export interface GameTransactionResult { state: SharedGameState | null; changed: boolean; }

export interface VoiceSignal {
  from: string;
  type: 'offer' | 'answer' | 'ice';
  sdp?: string;
  candidate?: string;
  createdAt: number;
}

class RealtimeService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Database | null = null;
  private roomCode = '';
  private uid = '';
  private onlineRoom = false;
  private authEmulatorConnected = false;

  private ensureFirebase() {
    const app = this.app ??= initializeApp(config);
    const auth = this.auth ??= getAuth(app);
    const db = this.db ??= getDatabase(app);
    const authEmulator = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL;
    if (authEmulator && !this.authEmulatorConnected) {
      connectAuthEmulator(auth, authEmulator, { disableWarnings: true });
      this.authEmulatorConnected = true;
    }
    return { auth, db };
  }

  async connect(roomCode: string, player: PlayerProfile, onRoom: (snapshot: RoomSnapshot, selfUid: string) => void) {
    try {
      const { auth, db } = this.ensureFirebase();
      if (!auth.currentUser) await signInAnonymously(auth);
      this.uid = auth.currentUser?.uid || player.id;
      this.roomCode = roomCode;
      const normalized = { ...player, id: this.uid, online: true };
      const functionsBase = import.meta.env.VITE_FUNCTIONS_BASE_URL;
      if (functionsBase && auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        const response = await fetch(`${functionsBase}/createOrJoinRoom`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
          body: JSON.stringify({ roomCode, player: normalized }),
        });
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Could not join this room.');
      }
      const playerRef = ref(db, `v2/rooms/${roomCode}/players/${this.uid}`);
      await set(playerRef, normalized);
      await onDisconnect(playerRef).remove();
      this.onlineRoom = true;
      const unsubscribe = onValue(ref(db, `v2/rooms/${roomCode}`), (snapshot) => onRoom((snapshot.val() || {}) as RoomSnapshot, this.uid));
      return { uid: this.uid, unsubscribe, online: true };
    } catch (error) {
      this.onlineRoom = false;
      console.info('CozyPod is using local room mode.', error);
      return { uid: player.id, unsubscribe: () => undefined, online: false };
    }
  }

  async updatePlayer(player: PlayerProfile) {
    if (!this.db || !this.roomCode || !this.uid) return;
    await set(ref(this.db, `v2/rooms/${this.roomCode}/players/${this.uid}`), { ...player, id: this.uid, online: true }).catch(() => undefined);
  }

  async sendMessage(message: ChatMessage) {
    if (!this.db || !this.roomCode) return;
    await set(ref(this.db, `v2/rooms/${this.roomCode}/messages/${message.id}`), message).catch(() => undefined);
  }

  async updateParty(party: PartyState) {
    if (!this.db || !this.roomCode) return;
    const metadata = { phase: party.phase, queue: party.queue, round: party.round, scores: party.scores, selectedGame: party.selectedGame || null };
    await update(ref(this.db, `v2/rooms/${this.roomCode}/party`), metadata).catch(() => undefined);
  }

  async transactGame(updater: (current: SharedGameState | null) => SharedGameState | null): Promise<GameTransactionResult | null> {
    if (!this.db || !this.roomCode || !this.uid || !this.onlineRoom) return null;
    const result = await runTransaction(ref(this.db, `v2/rooms/${this.roomCode}/party/game`), (value) => {
      const current = (value || null) as SharedGameState | null;
      const next = updater(current);
      return next === current ? undefined : next;
    }).catch(() => null);
    if (!result) return null;
    return { state: (result.snapshot.val() || null) as SharedGameState | null, changed: result.committed };
  }

  voiceIdentity() {
    if (!this.db || !this.roomCode || !this.uid) throw new Error('Voice needs an online Pod. Rejoin the room and try again.');
    return { uid: this.uid, roomCode: this.roomCode };
  }

  async verifyVoiceSignaling() {
    const { uid, roomCode } = this.voiceIdentity();
    const probe = push(ref(this.db!, `v2/voiceSignals/${roomCode}/${uid}`));
    await set(probe, { from: uid, type: 'ice', candidate: '{}', createdAt: Date.now() });
    await remove(probe);
  }

  watchVoiceParticipants(onChange: (ids: string[]) => void) {
    const { roomCode } = this.voiceIdentity();
    return onValue(ref(this.db!, `v2/rooms/${roomCode}/players`), (snapshot) => {
      onChange(Object.keys((snapshot.val() || {}) as Record<string, PlayerProfile>));
    });
  }

  listenForVoiceSignals(onSignal: (signal: VoiceSignal) => void | Promise<void>) {
    const { uid, roomCode } = this.voiceIdentity();
    return onChildAdded(ref(this.db!, `v2/voiceSignals/${roomCode}/${uid}`), (snapshot) => {
      const signal = snapshot.val() as VoiceSignal;
      Promise.resolve(onSignal(signal)).finally(() => remove(snapshot.ref).catch(() => undefined));
    });
  }

  async sendVoiceSignal(targetUid: string, signal: Omit<VoiceSignal, 'from' | 'createdAt'>) {
    const { uid, roomCode } = this.voiceIdentity();
    await push(ref(this.db!, `v2/voiceSignals/${roomCode}/${targetUid}`), { ...signal, from: uid, createdAt: Date.now() });
  }

  async clearVoiceSignals() {
    if (!this.db || !this.roomCode || !this.uid) return;
    await remove(ref(this.db, `v2/voiceSignals/${this.roomCode}/${this.uid}`)).catch(() => undefined);
  }

  async signInGoogle() {
    const { auth } = this.ensureFirebase();
    return signInWithPopup(auth, new GoogleAuthProvider());
  }

  async leave() {
    if (this.db && this.roomCode && this.uid) await remove(ref(this.db, `v2/rooms/${this.roomCode}/players/${this.uid}`)).catch(() => undefined);
    this.onlineRoom = false;
  }
}

export const realtime = new RealtimeService();
