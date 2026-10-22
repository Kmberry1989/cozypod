import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  voiceIdentity: vi.fn(() => ({ uid: 'maple', roomCode: 'J4KQ' })),
  verifyVoiceSignaling: vi.fn(async () => undefined),
  listenForVoiceSignals: vi.fn(() => vi.fn()),
  watchVoiceParticipants: vi.fn(() => vi.fn()),
  sendVoiceSignal: vi.fn(async () => undefined),
  clearVoiceSignals: vi.fn(async () => undefined),
}));

vi.mock('./realtime', () => ({ realtime: mocks }));

import { voice } from './voice';

describe('free peer-to-peer voice', () => {
  const stopTrack = vi.fn();
  const getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream));

  beforeEach(async () => {
    await voice.disconnect();
    vi.clearAllMocks();
    Object.defineProperty(window, 'RTCPeerConnection', { configurable: true, value: class {} });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  });

  it('checks signaling before requesting and stopping the microphone', async () => {
    await voice.connect();

    expect(mocks.verifyVoiceSignaling).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ video: false }));
    expect(mocks.listenForVoiceSignals).toHaveBeenCalledOnce();
    expect(mocks.watchVoiceParticipants).toHaveBeenCalledOnce();

    await voice.disconnect();
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(mocks.clearVoiceSignals).toHaveBeenCalled();
  });

  it('does not request microphone access when signaling is unavailable', async () => {
    mocks.verifyVoiceSignaling.mockRejectedValueOnce(new Error('Permission denied'));

    await expect(voice.connect()).rejects.toThrow('Voice signaling needs the latest Firebase database rules.');
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
