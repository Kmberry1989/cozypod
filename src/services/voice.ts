import { realtime, type VoiceSignal } from './realtime';

interface PeerSlot {
  connection: RTCPeerConnection;
  pendingCandidates: RTCIceCandidateInit[];
}

const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

class VoiceService {
  private localStream: MediaStream | null = null;
  private peers = new Map<string, PeerSlot>();
  private remoteAudio = new Map<string, HTMLAudioElement>();
  private offering = new Set<string>();
  private stopParticipants: (() => void) | null = null;
  private stopSignals: (() => void) | null = null;
  private uid = '';

  async connect() {
    if (this.localStream) return;
    if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support voice chat.');
    }

    const identity = realtime.voiceIdentity();
    this.uid = identity.uid;
    try {
      await realtime.verifyVoiceSignaling();
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this.stopSignals = realtime.listenForVoiceSignals((signal) => this.handleSignal(signal));
      this.stopParticipants = realtime.watchVoiceParticipants((ids) => this.syncParticipants(ids));
    } catch (error) {
      await this.disconnect();
      if (error instanceof DOMException && error.name === 'NotAllowedError') throw new Error('Allow microphone access to join voice chat.');
      if (error instanceof Error && /permission_denied|permission denied/i.test(error.message)) throw new Error('Voice signaling needs the latest Firebase database rules.');
      throw error;
    }
  }

  async disconnect() {
    this.stopParticipants?.();
    this.stopSignals?.();
    this.stopParticipants = null;
    this.stopSignals = null;
    this.peers.forEach(({ connection }) => connection.close());
    this.peers.clear();
    this.offering.clear();
    this.remoteAudio.forEach((audio) => { audio.srcObject = null; audio.remove(); });
    this.remoteAudio.clear();
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    await realtime.clearVoiceSignals();
    this.uid = '';
  }

  private syncParticipants(ids: string[]) {
    const active = new Set(ids.filter((id) => id !== this.uid));
    this.peers.forEach((_slot, id) => { if (!active.has(id)) this.removePeer(id); });
    active.forEach((id) => { if (this.uid.localeCompare(id) < 0) void this.ensurePeer(id, true); });
  }

  private async ensurePeer(peerId: string, makeOffer = false) {
    let slot = this.peers.get(peerId);
    if (!slot) {
      const connection = new RTCPeerConnection(rtcConfiguration);
      slot = { connection, pendingCandidates: [] };
      this.peers.set(peerId, slot);
      this.localStream?.getTracks().forEach((track) => connection.addTrack(track, this.localStream!));
      connection.onicecandidate = (event) => {
        if (event.candidate) void realtime.sendVoiceSignal(peerId, { type: 'ice', candidate: JSON.stringify(event.candidate.toJSON()) });
      };
      connection.ontrack = (event) => this.attachRemoteAudio(peerId, event.streams[0] || new MediaStream([event.track]));
      connection.onconnectionstatechange = () => {
        if (connection.connectionState === 'failed' || connection.connectionState === 'closed') this.removePeer(peerId);
      };
    }

    const connection = slot.connection;
    if (makeOffer && !connection.localDescription && connection.signalingState === 'stable' && !this.offering.has(peerId)) {
      this.offering.add(peerId);
      try {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        await realtime.sendVoiceSignal(peerId, { type: 'offer', sdp: offer.sdp || '' });
      } finally {
        this.offering.delete(peerId);
      }
    }
    return slot;
  }

  private async handleSignal(signal: VoiceSignal) {
    if (!signal?.from || signal.from === this.uid) return;
    const slot = await this.ensurePeer(signal.from);
    const connection = slot.connection;

    if (signal.type === 'offer' && signal.sdp) {
      await connection.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
      await this.flushCandidates(slot);
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      await realtime.sendVoiceSignal(signal.from, { type: 'answer', sdp: answer.sdp || '' });
    } else if (signal.type === 'answer' && signal.sdp && connection.signalingState === 'have-local-offer') {
      await connection.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
      await this.flushCandidates(slot);
    } else if (signal.type === 'ice' && signal.candidate) {
      const candidate = JSON.parse(signal.candidate) as RTCIceCandidateInit;
      if (connection.remoteDescription) await connection.addIceCandidate(candidate);
      else slot.pendingCandidates.push(candidate);
    }
  }

  private async flushCandidates(slot: PeerSlot) {
    const candidates = slot.pendingCandidates.splice(0);
    for (const candidate of candidates) await slot.connection.addIceCandidate(candidate);
  }

  private attachRemoteAudio(peerId: string, stream: MediaStream) {
    let audio = this.remoteAudio.get(peerId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.hidden = true;
      audio.dataset.voicePeer = peerId;
      document.body.append(audio);
      this.remoteAudio.set(peerId, audio);
    }
    audio.srcObject = stream;
    void audio.play().catch(() => undefined);
  }

  private removePeer(peerId: string) {
    this.peers.get(peerId)?.connection.close();
    this.peers.delete(peerId);
    const audio = this.remoteAudio.get(peerId);
    if (audio) { audio.srcObject = null; audio.remove(); }
    this.remoteAudio.delete(peerId);
  }
}

export const voice = new VoiceService();
