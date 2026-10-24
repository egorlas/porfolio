// Background music from assets/background.mp3. Browsers only allow sound after a click, so it loads and starts
// on the first toggle, fades in and out, and pauses while the tab is hidden.
const VOLUME = 0.55;

export class RoomSound {
  constructor(src) {
    this.src = src;
    this.audio = null;
    this.playing = false;
    this.fadeFrame = null;
    document.addEventListener('visibilitychange', () => {
      if (!this.audio || !this.playing) return;
      if (document.hidden) this.audio.pause();
      else this.audio.play().catch(() => {});
    });
  }

  ensure() {
    if (!this.audio) {
      this.audio = new Audio(this.src);
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = 0;
    }
    return this.audio;
  }

  fadeTo(target, duration, done) {
    const audio = this.audio;
    const from = audio.volume;
    const start = performance.now();
    cancelAnimationFrame(this.fadeFrame);
    const step = (now) => {
      const k = Math.min(1, (now - start) / duration);
      audio.volume = from + (target - from) * k;
      if (k < 1) this.fadeFrame = requestAnimationFrame(step);
      else done?.();
    };
    this.fadeFrame = requestAnimationFrame(step);
  }

  // Resolves to the new state. Rejects if the file can't be played.
  async toggle() {
    const audio = this.ensure();
    if (this.playing) {
      this.playing = false;
      this.fadeTo(0, 700, () => { if (!this.playing) audio.pause(); });
      return false;
    }
    await audio.play();
    this.playing = true;
    this.fadeTo(VOLUME, 1200);
    return true;
  }
}
