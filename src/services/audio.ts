type Wave = OscillatorType;

class CozyAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;

  private ensure() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = .24;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  private tone(frequency: number, duration: number, wave: Wave = 'sine', volume = .12, delay = 0) {
    const context = this.ensure();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(this.master!);
    oscillator.start(start); oscillator.stop(start + duration + .03);
  }

  tap() { this.tone(310, .055, 'triangle', .045); this.tone(190, .045, 'sine', .025, .025); }
  success() { [392, 523.25, 659.25, 783.99].forEach((note, index) => this.tone(note, .28, 'triangle', .07, index * .075)); }
  error() { this.tone(170, .18, 'sawtooth', .045); this.tone(135, .2, 'triangle', .04, .1); }
  whoosh() { this.noise(.28, 950, .055); }
  weather() { this.noise(.7, 1300, .035); this.tone(110, .65, 'sine', .025); }

  private noise(duration: number, cutoff: number, volume: number) {
    const context = this.ensure();
    const length = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource(); source.buffer = buffer;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = cutoff;
    const gain = context.createGain(); gain.gain.setValueAtTime(volume, context.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master!); source.start();
  }

  setMusic(enabled: boolean) {
    if (!enabled) { if (this.musicTimer) window.clearInterval(this.musicTimer); this.musicTimer = null; return; }
    if (this.musicTimer) return;
    const playBar = () => {
      const roots = [196, 220, 174.61, 261.63];
      const root = roots[this.musicStep % roots.length];
      [root, root * 1.25, root * 1.5].forEach((note, index) => this.tone(note, 1.75, 'sine', .018, index * .08));
      this.tone(root * 2, .32, 'triangle', .022, .35);
      this.tone(root * 2.5, .3, 'triangle', .018, 1.05);
      this.musicStep += 1;
    };
    playBar(); this.musicTimer = window.setInterval(playBar, 2300);
  }
}

export const cozyAudio = new CozyAudio();
