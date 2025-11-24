
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioCtx: AudioContext | null = null;

  private initAudio() {
    if (!this.audioCtx) {
       const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
       this.audioCtx = new AudioContext();
    }
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, delay = 0, volume = 0.05) {
    this.initAudio();
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + delay);
    gain.gain.setValueAtTime(volume, this.audioCtx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + delay + duration);
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(this.audioCtx.currentTime + delay);
    osc.stop(this.audioCtx.currentTime + delay + duration);
  }

  playBootSound() { this.playTone(660, 'square', 0.1, 0, 0.1); this.playTone(1320, 'square', 0.6, 0.1, 0.1); }
  playMoveSound() { this.playTone(220, 'square', 0.05); }
  playBumpSound() { this.playTone(100, 'sawtooth', 0.1, 0, 0.1); }
  playHitSound() { this.playTone(150, 'square', 0.1, 0, 0.2); }
  playHurtSound() { this.playTone(100, 'sawtooth', 0.3, 0, 0.2); }
  playCoinSound() { this.playTone(1200, 'sine', 0.1, 0, 0.1); this.playTone(1800, 'sine', 0.2, 0.1, 0.1); }
  playMagicSound() { this.playTone(600, 'sine', 0.1, 0, 0.1); this.playTone(1200, 'sawtooth', 0.2, 0.1, 0.1); }
  playDieSound() { this.playTone(400, 'sawtooth', 0.1, 0); this.playTone(300, 'sawtooth', 0.1, 0.1); this.playTone(200, 'sawtooth', 0.4, 0.2); }
  playStartSound() { this.playTone(1200, 'square', 0.05); }
  playMenuSound() { this.playTone(440, 'square', 0.05, 0, 0.05); }
  playTalkSound() { this.playTone(300, 'square', 0.03, 0, 0.05); this.playTone(350, 'square', 0.03, 0.05, 0.05); }
}
