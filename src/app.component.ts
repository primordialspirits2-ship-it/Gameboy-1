import { Component, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameScreenComponent, GameState } from './components/game-screen.component';
import { GameControlsComponent } from './components/game-controls.component';
import { GeminiGameService, WorldChunk } from './services/gemini-game.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, GameScreenComponent, GameControlsComponent],
  templateUrl: './app.component.html',
  styleUrls: []
})
export class AppComponent {
  private geminiService = inject(GeminiGameService);

  // Game State
  gameState = signal<GameState>('BOOT');
  
  // World State
  // We use a Map string key "x,y" to store generated chunks
  private worldMap = new Map<string, WorldChunk>();
  
  chunkCoords = signal<{x: number, y: number}>({x: 0, y: 0});
  currentChunk = signal<WorldChunk | null>(null);
  
  // Player State
  playerPos = signal<{x: number, y: number}>({x: 5, y: 4}); // Center start
  score = signal<number>(0);
  message = signal<string>("Initializing...");
  powerOn = signal<boolean>(true);

  // Audio System
  private audioCtx: AudioContext | null = null;

  constructor() {
    // Initial Boot Sequence
    setTimeout(() => {
      this.playBootSound();
      this.startOpenWorld();
    }, 2500);
  }

  // --- AUDIO ENGINE ---
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

  private playBootSound() {
    this.playTone(660, 'square', 0.1, 0, 0.1);
    this.playTone(1320, 'square', 0.6, 0.1, 0.1); 
  }
  private playMoveSound() { this.playTone(220, 'square', 0.05); }
  private playBumpSound() { this.playTone(100, 'sawtooth', 0.1, 0, 0.1); }
  private playCoinSound() { 
    this.playTone(1200, 'sine', 0.1, 0, 0.1); 
    this.playTone(1800, 'sine', 0.2, 0.1, 0.1);
  }
  private playDieSound() {
    this.playTone(400, 'sawtooth', 0.1, 0);
    this.playTone(300, 'sawtooth', 0.1, 0.1);
    this.playTone(200, 'sawtooth', 0.4, 0.2);
  }
  private playStartSound() { this.playTone(1200, 'square', 0.05); }

  // --- GAME LOGIC ---

  async startOpenWorld() {
    this.score.set(0);
    this.chunkCoords.set({x: 0, y: 0});
    this.playerPos.set({x: 5, y: 4}); // Safe center default
    this.worldMap.clear();
    await this.loadChunk(0, 0);
  }

  async loadChunk(x: number, y: number, entryPoint?: {x: number, y: number}) {
    const key = `${x},${y}`;
    
    // Check if chunk exists in memory
    if (this.worldMap.has(key)) {
      this.setChunkActive(x, y, this.worldMap.get(key)!, entryPoint);
      return;
    }

    // Generate new chunk
    this.gameState.set('LOADING');
    this.message.set("Scanning sector...");
    
    try {
      const chunk = await this.geminiService.generateChunk(x, y);
      this.worldMap.set(key, chunk);
      this.setChunkActive(x, y, chunk, entryPoint);
    } catch (e) {
      console.error(e);
      this.message.set("Sector corrupted.");
    }
  }

  private setChunkActive(cx: number, cy: number, chunk: WorldChunk, entryPoint?: {x: number, y: number}) {
    this.chunkCoords.set({x: cx, y: cy});
    this.currentChunk.set(chunk);
    
    // If we have a specific entry point (from walking), use it. 
    // Otherwise keep current pos (start game) but validate it.
    if (entryPoint) {
      this.playerPos.set(entryPoint);
      // FORCE VALIDITY: Ensure the tile the player landed on is walkable (0).
      // This prevents getting stuck when entering a new chunk into a wall.
      if (chunk.layout[entryPoint.y][entryPoint.x] === 1) {
        chunk.layout[entryPoint.y][entryPoint.x] = 0;
      }
    } else {
       // On startup, ensure center is safe
       if (chunk.layout[4][5] !== 0) chunk.layout[4][5] = 0;
       this.playerPos.set({x: 5, y: 4});
    }

    this.message.set(chunk.flavorText);
    this.gameState.set('PLAYING');
  }

  handleInput(key: string) {
    this.initAudio();

    if (this.gameState() === 'PLAYING') {
      this.handleMovement(key);
    } else if (this.gameState() === 'GAME_OVER' && key === 'START') {
      this.startOpenWorld();
    }
  }

  handleMovement(key: string) {
    const currentPos = this.playerPos();
    const chunk = this.currentChunk();
    if (!chunk) return;

    let newX = currentPos.x;
    let newY = currentPos.y;

    // Movement Delta
    switch (key) {
      case 'UP': newY--; break;
      case 'DOWN': newY++; break;
      case 'LEFT': newX--; break;
      case 'RIGHT': newX++; break;
      case 'START': 
        this.message.set("Paused."); 
        this.playStartSound();
        return;
      default: return;
    }

    // --- Chunk Transition Check ---
    const width = chunk.width;
    const height = chunk.height;
    
    if (newX < 0) {
      this.loadChunk(this.chunkCoords().x - 1, this.chunkCoords().y, {x: width - 1, y: newY});
      return;
    }
    if (newX >= width) {
      this.loadChunk(this.chunkCoords().x + 1, this.chunkCoords().y, {x: 0, y: newY});
      return;
    }
    if (newY < 0) {
      this.loadChunk(this.chunkCoords().x, this.chunkCoords().y - 1, {x: newX, y: height - 1});
      return;
    }
    if (newY >= height) {
      this.loadChunk(this.chunkCoords().x, this.chunkCoords().y + 1, {x: newX, y: 0});
      return;
    }

    // --- Local Movement Check ---
    const cellContent = chunk.layout[newY][newX];

    // 1 = Wall
    if (cellContent === 1) {
      this.playBumpSound();
      return;
    }

    // Move Player
    this.playerPos.set({x: newX, y: newY});
    this.playMoveSound();

    // 2 = Hazard
    if (cellContent === 2) {
      this.message.set("Critial Damage!");
      this.playDieSound();
      this.gameState.set('GAME_OVER');
      return;
    }

    // 3 = Treasure
    if (cellContent === 3) {
      this.playCoinSound();
      this.score.update(s => s + 100);
      this.message.set("Found Loot!");
      // Remove treasure from data so it doesn't respawn
      chunk.layout[newY][newX] = 0;
    }
  }

  // Keyboard Listeners
  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowUp': this.handleInput('UP'); break;
      case 'ArrowDown': this.handleInput('DOWN'); break;
      case 'ArrowLeft': this.handleInput('LEFT'); break;
      case 'ArrowRight': this.handleInput('RIGHT'); break;
      case 'Enter': this.handleInput('START'); break;
      case 'Shift': this.handleInput('SELECT'); break;
      case 'z': 
      case 'Z': this.handleInput('A'); break;
      case 'x':
      case 'X': this.handleInput('B'); break;
    }
  }
}
