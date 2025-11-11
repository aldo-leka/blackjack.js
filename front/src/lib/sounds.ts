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

  constructor() {
    this.loadSound('cardDeal', '/sounds/card-deal.wav');
    this.loadSound('cardFlip', '/sounds/card-flip.wav');
    this.loadSound('chipPlace', '/sounds/chip-place.wav');
    this.loadSound('win', '/sounds/win.mp3');
    this.loadSound('lose', '/sounds/lose.wav');
    this.loadSound('buttonClick', '/sounds/button-click.wav');
  }

  private loadSound(name: SoundEffect, path: string) {
    const audio = new Audio(path);
    audio.preload = 'auto';
    audio.volume = 0.4;
    this.sounds.set(name, audio);
  }

  play(effect: SoundEffect, volume?: number) {
    if (this.isMuted) return;

    const sound = this.sounds.get(effect);
    if (sound) {
      // Clone the audio to allow overlapping sounds
      const clone = sound.cloneNode() as HTMLAudioElement;
      if (volume !== undefined) {
        clone.volume = Math.max(0, Math.min(1, volume));
      }
      clone.play().catch(err => {
        console.warn(`Failed to play sound ${effect}:`, err);
      });
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
