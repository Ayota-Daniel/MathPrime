/** Synchronise le gestionnaire audio avec les réglages du store. */
import { useEffect } from 'react';
import { audio } from './audio';
import { useGame } from '../store/game';

export function useAudioSettings() {
  const sound = useGame((s) => s.settings.sound);
  const music = useGame((s) => s.settings.music);
  useEffect(() => { audio.enabled = sound; }, [sound]);
  useEffect(() => {
    audio.musicEnabled = music;
    if (music) audio.startMusic(); else audio.stopMusic();
  }, [music]);
}
