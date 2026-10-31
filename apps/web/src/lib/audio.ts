/** audio.ts — gestionnaire de son web.
 *  SFX synthétisés via Web Audio (zéro fichier). Musique = slot optionnel (.mp3 fourni par toi). */
type Sfx = 'select' | 'success' | 'fail' | 'tick' | 'timeup' | 'record';

class AudioManager {
  private ctx: AudioContext | null = null;
  private music: HTMLAudioElement | null = null;
  private musicVariant: 'main' | 'rogue' | null = null;
  enabled = true;
  musicEnabled = true;

  private ac(): AudioContext {
    // créé à la 1re interaction (politique autoplay des navigateurs)
    this.ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return this.ctx;
  }

  /** bip enveloppé : fréquence, durée, forme. */
  private beep(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.06) {
    if (!this.enabled) return;
    const ac = this.ac();
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(); osc.stop(ac.currentTime + dur);
  }

  play(s: Sfx) {
    switch (s) {
      case 'select':  return this.beep(520, 0.07, 'triangle');
      case 'success': this.beep(660, 0.10, 'sine'); setTimeout(() => this.beep(880, 0.14, 'sine'), 90); return; // petite tierce montante
      case 'fail':    this.beep(200, 0.18, 'sawtooth', 0.05); return;
      case 'tick':    return this.beep(900, 0.03, 'square', 0.03);
      case 'timeup':  this.beep(300, 0.2, 'sawtooth', 0.06); setTimeout(() => this.beep(160, 0.3, 'sawtooth', 0.06), 120); return;
      case 'record':  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.beep(f, i === 3 ? 0.22 : 0.1, 'triangle'), i * 90)); return;
    }
  }

  /** 2 musiques : générale (/music.wav) et rogue (/music-rogue.wav). */
  private currentTrack: 'main' | 'rogue' | null = null;
  switchMusic(track: 'main' | 'rogue') {
    if (!this.musicEnabled) { this.currentTrack = track; return; }
    if (this.currentTrack === track && this.music) return;
    this.stopMusic();
    this.currentTrack = track;
    const src = track === 'rogue' ? '/music-rogue.wav' : '/music.wav';
    this.music = Object.assign(new Audio(src), { loop: true, volume: 0.25 });
    void this.music.play().catch(() => {}); // fichier absent -> ignoré
  }
  startMusic() { this.switchMusic(this.currentTrack ?? 'main'); }
  stopMusic() { this.music?.pause(); this.music = null; }
}

export const audio = new AudioManager();
