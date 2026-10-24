// Generated rain ambience: filtered noise for the downpour, a low rumble, and occasional drips on the sill.
export class RainSound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.playing = false;
    this.dripTimer = null;
  }

  init() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    this.ctx = new AudioCtx();
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
      }
    }

    const rain = ctx.createBufferSource();
    rain.buffer = buffer;
    rain.loop = true;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 400;
    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 5200;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.55;
    rain.connect(high).connect(low).connect(rainGain).connect(this.master);

    const rumble = ctx.createBufferSource();
    rumble.buffer = buffer;
    rumble.loop = true;
    rumble.playbackRate.value = 0.5;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 180;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.9;
    rumble.connect(rumbleFilter).connect(rumbleGain).connect(this.master);

    rain.start();
    rumble.start();
    return true;
  }

  drip() {
    if (!this.playing) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const t = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400 + Math.random() * 1600, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.08);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.05, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    if (pan) {
      pan.pan.value = Math.random() * 1.4 - 0.7;
      osc.connect(gain).connect(pan).connect(this.master);
    } else {
      osc.connect(gain).connect(this.master);
    }
    osc.start(t);
    osc.stop(t + 0.15);
    this.dripTimer = setTimeout(() => this.drip(), 250 + Math.random() * 1400);
  }

  async toggle() {
    if (!this.ctx && !this.init()) return false;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.playing = !this.playing;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(this.playing ? 0.6 : 0, t, 0.6);
    clearTimeout(this.dripTimer);
    if (this.playing) this.drip();
    return this.playing;
  }
}
