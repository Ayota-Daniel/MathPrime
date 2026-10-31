/** audio.ts (mobile) — expo-audio. SFX WAV + 2 musiques de fond (générale / rogue). */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
type Sfx = 'select' | 'success' | 'fail' | 'tick' | 'timeup' | 'record';
type Track = 'main' | 'rogue';

const FILES: Record<Sfx, number> = {
  select: require('../assets/sfx/select.wav'),
  success: require('../assets/sfx/success.wav'),
  fail: require('../assets/sfx/fail.wav'),
  tick: require('../assets/sfx/tick.wav'),
  timeup: require('../assets/sfx/timeup.wav'),
  record: require('../assets/sfx/record.wav'),
};
// Remplace music-rogue.wav par TON asset (même nom, même dossier).
const MUSIC: Record<Track, number> = {
  main: require('../assets/music.wav'),
  rogue: require('../assets/music-rogue.wav'),
};

class NativeAudio {
  enabled = true; musicEnabled = true;
  private players: Partial<Record<Sfx, AudioPlayer>> = {};
  private music: AudioPlayer | null = null;
  private musicVariant: 'main' | 'rogue' | null = null;
  private currentTrack: Track | null = null;

  private player(s: Sfx): AudioPlayer { return (this.players[s] ??= createAudioPlayer(FILES[s])); }
  async play(s: Sfx) {
    if (!this.enabled) return;
    try { const p = this.player(s); p.seekTo(0); p.play(); } catch { /* ignore */ }
  }

  /** Démarre/închange la musique selon le contexte (générale vs rogue). */
  async switchMusic(track: Track) {
    if (!this.musicEnabled) { this.currentTrack = track; return; }
    if (this.currentTrack === track && this.music) return;
    await this.stopMusic();
    this.currentTrack = track;
    try { this.music = createAudioPlayer(MUSIC[track]); this.music.loop = true; this.music.volume = 0.25; this.music.play(); } catch { /* ignore */ }
  }
  async startMusic() { await this.switchMusic(this.currentTrack ?? 'main'); }
  async stopMusic() { try { this.music?.pause(); this.music?.remove(); } catch { /* ignore */ } this.music = null; }
}
export const audio = new NativeAudio();
