type SoundEffect =
  | 'cardDeal'
  | 'cardFlip'
  | 'chipPlace'
  | 'win'
  | 'lose'
  | 'buttonClick';

class SoundManager {
  private sounds: Map<SoundEffect, HTMLAudioElement> = new Map();
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    if (this.isInitialized) return;

    this.loadSound('cardDeal', '/sounds/card-deal.wav');
    this.loadSound('cardFlip', '/sounds/card-flip.wav');
    this.loadSound('chipPlace', '/sounds/chip-place.wav');
    this.loadSound('win', '/sounds/win.mp3');
    this.loadSound('lose', '/sounds/lose.wav');
    this.loadSound('buttonClick', '/sounds/button-click.wav');

    this.isInitialized = true;
  }

  private loadSound(name: SoundEffect, path: string) {
    if (typeof window === 'undefined') return;

    const audio = new Audio(path);
    audio.preload = 'auto';
    audio.volume = 0.4;
    this.sounds.set(name, audio);
  }

  play(effect: SoundEffect, volume?: number) {
    if (typeof window === 'undefined') return;
    if (!this.isInitialized) this.initialize();
    if (this.isMuted) return;

    const sound = this.sounds.get(effect);
    if (sound) {
      try {
        // Reset the audio to beginning if it's already playing
        sound.currentTime = 0;
        
        const originalVolume = sound.volume;
        if (volume !== undefined) {
          sound.volume = Math.max(0, Math.min(1, volume));
        }

        sound.play().catch(err => {
          console.warn(`Failed to play sound ${effect}:`, err);
        });

        // Restore original volume after playing (for next use)
        if (volume !== undefined) {
          setTimeout(() => {
            sound.volume = originalVolume;
          }, 100);
        }
      } catch (err) {
        console.warn(`Error playing sound ${effect}:`, err);
      }
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  isSoundMuted(): boolean {
    return this.isMuted;
  }

  setVolume(effect: SoundEffect, volume: number) {
    const sound = this.sounds.get(effect);
    if (sound) {
      sound.volume = Math.max(0, Math.min(1, volume));
    }
  }

  setGlobalVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(sound => {
      sound.volume = clampedVolume;
    });
  }
}

export const soundManager = new SoundManager();

export const playSounds = {
  cardDeal: () => soundManager.play('cardDeal'),
  cardFlip: () => soundManager.play('cardFlip'),
  chipPlace: () => soundManager.play('chipPlace', 0.3),
  win: () => soundManager.play('win', 0.5),
  lose: () => soundManager.play('lose', 0.4),
  buttonClick: () => soundManager.play('buttonClick', 0.2),
};
