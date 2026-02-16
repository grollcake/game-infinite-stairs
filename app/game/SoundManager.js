// Sound Manager using Web Audio API
export class SoundManager {
  constructor() {
    this.audioContext = null;
    this.initialized = false;
    this.muted = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    if (!this.initialized || this.muted) return;
    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      osc.start(this.audioContext.currentTime);
      osc.stop(this.audioContext.currentTime + duration);
    } catch (e) { /* ignore */ }
  }

  playStep(floor) {
    // Cheerful ascending notes
    const baseFreq = 400 + (floor % 8) * 50;
    this.playTone(baseFreq, 0.08, 'square', 0.15);
    setTimeout(() => {
      this.playTone(baseFreq * 1.5, 0.06, 'square', 0.1);
    }, 30);
  }

  playDirectionChange() {
    this.playTone(600, 0.06, 'triangle', 0.2);
    setTimeout(() => this.playTone(800, 0.06, 'triangle', 0.15), 40);
  }

  playGameOver() {
    const notes = [400, 350, 300, 200];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sawtooth', 0.2), i * 120);
    });
  }

  playMilestone() {
    // Celebration jingle for every 100 floors
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.25), i * 100);
    });
    // Add sparkle
    setTimeout(() => {
      this.playTone(1200, 0.3, 'sine', 0.15);
      this.playTone(1500, 0.3, 'sine', 0.1);
    }, 400);
  }

  playItemPickup() {
    this.playTone(800, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(1200, 0.15, 'sine', 0.15), 50);
  }

  playUnlock() {
    const notes = [440, 554, 659, 880, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.3), i * 80);
    });
  }

  playButtonHover() {
    this.playTone(800, 0.03, 'sine', 0.05);
  }

  playStartGame() {
    this.playTone(440, 0.1, 'square', 0.15);
    setTimeout(() => this.playTone(660, 0.1, 'square', 0.15), 100);
    setTimeout(() => this.playTone(880, 0.15, 'square', 0.2), 200);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}

export const soundManager = new SoundManager();
