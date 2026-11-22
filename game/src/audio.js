// WebAudio synth blips only — no audio files. Created lazily on first gesture;
// M toggles mute. Every sound is a short oscillator/envelope burst.
export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._klaxonOn = false;
    this._klaxonTimer = null;
  }

  ensure() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
      } catch (e) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopKlaxon();
    return this.muted;
  }

  _tone(freq, dur, type, gain, when = 0, slideTo = null) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  footstep(nearGuard) {
    this._tone(nearGuard ? 220 : 160, 0.05, 'triangle', nearGuard ? 0.05 : 0.025);
  }

  pickup() {
    this._tone(880, 0.12, 'sine', 0.12);
    this._tone(1318, 0.18, 'sine', 0.1, 0.07);
  }

  prize() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.22, 'triangle', 0.12, i * 0.09));
  }

  toss() {
    this._tone(600, 0.1, 'sine', 0.07, 0, 900);
  }

  clink() {
    this._tone(2400, 0.09, 'square', 0.05);
    this._tone(1800, 0.14, 'sine', 0.06, 0.05);
  }

  sting() {
    this._tone(220, 0.3, 'sawtooth', 0.12, 0, 110);
  }

  caught() {
    this._tone(330, 0.25, 'sawtooth', 0.12, 0, 90);
    this._tone(165, 0.4, 'sawtooth', 0.1, 0.18, 55);
  }

  doorOpen() {
    this._tone(392, 0.15, 'triangle', 0.1);
    this._tone(587, 0.25, 'triangle', 0.1, 0.1);
  }

  clear() {
    [392, 523, 659, 784].forEach((f, i) => this._tone(f, 0.25, 'triangle', 0.11, i * 0.1));
  }

  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this._tone(f, 0.3, 'triangle', 0.11, i * 0.11));
  }

  // Two-tone klaxon while the alarm is high; call once per frame with the state.
  klaxon(active) {
    if (!active) {
      this.stopKlaxon();
      return;
    }
    if (this._klaxonTimer) return;
    this._klaxonTimer = setInterval(() => {
      this._tone(660, 0.16, 'square', 0.045);
      this._tone(440, 0.16, 'square', 0.045, 0.18);
    }, 380);
  }

  stopKlaxon() {
    if (this._klaxonTimer) {
      clearInterval(this._klaxonTimer);
      this._klaxonTimer = null;
    }
  }
}
