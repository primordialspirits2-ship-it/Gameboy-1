
import { Component, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameScreenComponent, GameState, ActiveEnemy, CharacterClass } from './components/game-screen.component';
import { GameControlsComponent } from './components/game-controls.component';
import { GeminiGameService, WorldChunk, EnemySpawn } from './services/gemini-game.service';

interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  xp: number;
  atk: number;
  def: number;
  weapon: string;
  armor: string;
}

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
  private worldMap = new Map<string, WorldChunk>();
  chunkCoords = signal<{x: number, y: number}>({x: 0, y: 0});
  currentChunk = signal<WorldChunk | null>(null);
  
  // Entity State
  enemies = signal<ActiveEnemy[]>([]);
  shakeScreen = signal<boolean>(false);
  
  // Player State
  playerPos = signal<{x: number, y: number}>({x: 5, y: 4});
  score = signal<number>(0);
  message = signal<string>("Initializing...");
  powerOn = signal<boolean>(true);
  
  stepsTaken = 0; // Tracks movement for regen

  playerStats = signal<PlayerStats>({
    hp: 3, maxHp: 3, mp: 3, maxMp: 3, level: 1, xp: 0,
    atk: 1, def: 0,
    weapon: 'Fists',
    armor: 'Shirt'
  });

  // Class Selection State
  classes: CharacterClass[] = [
    { 
      name: 'WARRIOR', hp: 12, mp: 4, atk: 3, def: 2, 
      weapon: 'Iron Sword', armor: 'Chainmail', 
      desc: 'Regens HP periodically.', ability: 'Spin Slash (3MP)' 
    },
    { 
      name: 'MAGE', hp: 6, mp: 12, atk: 5, def: 0, 
      weapon: 'Novice Wand', armor: 'Silk Robe',  
      desc: 'Regens MP periodically.', ability: 'Thunder (4MP)' 
    }
  ];
  selectedClassIdx = signal(0);

  // Input handling
  private lastInputTime = 0;
  private audioCtx: AudioContext | null = null;

  constructor() {
    setTimeout(() => {
      this.playBootSound();
      this.gameState.set('CLASS_SELECT');
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

  private playBootSound() { this.playTone(660, 'square', 0.1, 0, 0.1); this.playTone(1320, 'square', 0.6, 0.1, 0.1); }
  private playMoveSound() { this.playTone(220, 'square', 0.05); }
  private playBumpSound() { this.playTone(100, 'sawtooth', 0.1, 0, 0.1); }
  private playHitSound() { this.playTone(150, 'square', 0.1, 0, 0.2); }
  private playHurtSound() { this.playTone(100, 'sawtooth', 0.3, 0, 0.2); }
  private playCoinSound() { this.playTone(1200, 'sine', 0.1, 0, 0.1); this.playTone(1800, 'sine', 0.2, 0.1, 0.1); }
  private playMagicSound() { this.playTone(600, 'sine', 0.1, 0, 0.1); this.playTone(1200, 'sawtooth', 0.2, 0.1, 0.1); }
  private playDieSound() { this.playTone(400, 'sawtooth', 0.1, 0); this.playTone(300, 'sawtooth', 0.1, 0.1); this.playTone(200, 'sawtooth', 0.4, 0.2); }
  private playStartSound() { this.playTone(1200, 'square', 0.05); }
  private playMenuSound() { this.playTone(440, 'square', 0.05, 0, 0.05); }

  // --- GAME LOGIC ---

  startOpenWorld() {
    this.score.set(0);
    this.stepsTaken = 0;
    this.chunkCoords.set({x: 0, y: 0});
    this.playerPos.set({x: 5, y: 4});
    this.worldMap.clear();
    
    // Set stats from selected class
    const cls = this.classes[this.selectedClassIdx()];
    this.playerStats.set({ 
      hp: cls.hp, maxHp: cls.hp, 
      mp: cls.mp, maxMp: cls.mp,
      level: 1, xp: 0, 
      atk: cls.atk, def: cls.def, 
      weapon: cls.weapon, armor: cls.armor 
    });

    this.loadChunk(0, 0);
  }

  async loadChunk(x: number, y: number, entryPoint?: {x: number, y: number}) {
    const key = `${x},${y}`;
    if (this.worldMap.has(key)) {
      this.setChunkActive(x, y, this.worldMap.get(key)!, entryPoint);
      return;
    }

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
    
    let sx = 5, sy = 4;
    if (entryPoint) { sx = entryPoint.x; sy = entryPoint.y; }

    this.ensureSafeSpawn(chunk, sx, sy, !entryPoint);
    this.playerPos.set({x: sx, y: sy});

    // --- DIFFICULTY SCALING ---
    // Danger increases with distance from center (0,0)
    const dist = Math.abs(cx) + Math.abs(cy);
    // Scale factor: +10% stats per chunk distance, +5% per player level
    const scale = 1 + (dist * 0.15) + (this.playerStats().level * 0.05);

    // Initialize Entities for this session
    const safeEnemies = (chunk.enemies || []).filter(e => e.x !== sx || e.y !== sy).map((e, idx) => {
       let baseHp = 2;

       if (e.type === 'ROBOT' || e.type === 'ALIEN') { baseHp = 5; }
       else if (e.type === 'GHOST' || e.type === 'SKELETON') { baseHp = 4; }
       
       // Elite Logic (10% Chance)
       const isElite = Math.random() < 0.1;
       const hp = Math.floor(baseHp * scale * (isElite ? 1.5 : 1));
       const maxHp = hp;
       const name = (isElite ? 'Elite ' : '') + (e.name || e.type);
       
       return {
          id: `e_${cx}_${cy}_${idx}`,
          type: e.type,
          x: e.x,
          y: e.y,
          hp,
          maxHp,
          name,
          isElite
       };
    });
    
    this.enemies.set(safeEnemies);
    this.message.set(chunk.flavorText);
    this.gameState.set('PLAYING');
  }

  private ensureSafeSpawn(chunk: WorldChunk, x: number, y: number, isStart = false) {
    if (!this.isValidIdx(x, y, chunk)) return;
    chunk.layout[y][x] = 0; // Clear player tile
    
    // Always clear immediate neighbors to prevent "spawn trapping"
    const neighbors = [{dx: 0, dy: -1}, {dx: 0, dy: 1}, {dx: -1, dy: 0}, {dx: 1, dy: 0}];
    for (const n of neighbors) {
         const nx = x + n.dx; const ny = y + n.dy;
         if (this.isValidIdx(nx, ny, chunk)) {
            // Clear walls/hazards immediately adjacent to spawn
            if (chunk.layout[ny][nx] === 1 || chunk.layout[ny][nx] === 2) {
               chunk.layout[ny][nx] = 0;
            }
         }
    }
  }

  private isValidIdx(x: number, y: number, chunk: WorldChunk): boolean {
    return x >= 0 && x < chunk.width && y >= 0 && y < chunk.height;
  }

  handleInput(key: string) {
    this.initAudio();
    const now = Date.now();
    if (now - this.lastInputTime < 130) return; // Debounce
    this.lastInputTime = now;

    if (this.gameState() === 'CLASS_SELECT') {
       this.handleClassMenuInput(key);
    } else if (this.gameState() === 'PLAYING') {
      this.handlePlayerTurn(key);
    } else if (this.gameState() === 'GAME_OVER' && key === 'START') {
      this.gameState.set('CLASS_SELECT');
      this.playBootSound();
    }
  }

  handleClassMenuInput(key: string) {
     if (key === 'UP') {
        this.selectedClassIdx.update(i => (i - 1 + this.classes.length) % this.classes.length);
        this.playMenuSound();
     } else if (key === 'DOWN') {
        this.selectedClassIdx.update(i => (i + 1) % this.classes.length);
        this.playMenuSound();
     } else if (key === 'START' || key === 'A') {
        this.playStartSound();
        this.startOpenWorld();
     }
  }

  // --- COMBAT & MOVEMENT ---

  handlePlayerTurn(key: string) {
    const pos = this.playerPos();
    let dx = 0, dy = 0;
    switch (key) {
      case 'UP': dy = -1; break;
      case 'DOWN': dy = 1; break;
      case 'LEFT': dx = -1; break;
      case 'RIGHT': dx = 1; break;
      case 'A': this.castAbility(); return; // Use Ability
      case 'START': this.message.set("Paused"); this.playStartSound(); return;
      default: return;
    }

    const tx = pos.x + dx;
    const ty = pos.y + dy;
    const chunk = this.currentChunk();
    if (!chunk) return;

    // 1. Check Map Bounds (Transition)
    if (tx < 0 || tx >= chunk.width || ty < 0 || ty >= chunk.height) {
      this.transitionChunk(tx, ty, chunk);
      return;
    }

    // 2. Check Walls
    if (chunk.layout[ty][tx] === 1) {
      this.playBumpSound();
      return;
    }

    // 3. Check Enemies (Combat)
    const enemyIdx = this.enemies().findIndex(e => e.x === tx && e.y === ty);
    if (enemyIdx !== -1) {
      this.playerAttack(enemyIdx);
      this.processEnemyTurns();
      return;
    }

    // 4. Move Player
    this.playerPos.set({x: tx, y: ty});
    this.playMoveSound();
    this.stepsTaken++;
    this.applyRegen();

    // 5. Check Hazards/Loot
    const cell = chunk.layout[ty][tx];
    if (cell === 2) {
      this.takeDamage(1, "Spikes pierced you!");
    } else if (cell === 3) {
      this.collectLoot(tx, ty);
    } else if (cell === 4) {
      this.collectDrop(tx, ty);
    }

    // 6. Enemies Move
    this.processEnemyTurns();
  }

  applyRegen() {
     const cls = this.classes[this.selectedClassIdx()].name;
     // Warrior: HP Regen
     if (cls === 'WARRIOR' && this.stepsTaken % 20 === 0) {
        if (this.playerStats().hp < this.playerStats().maxHp) {
            this.playerStats.update(s => ({...s, hp: s.hp + 1}));
        }
     } 
     // Mage: MP Regen
     else if (cls === 'MAGE' && this.stepsTaken % 15 === 0) {
        if (this.playerStats().mp < this.playerStats().maxMp) {
            this.playerStats.update(s => ({...s, mp: s.mp + 1}));
        }
     }
  }

  castAbility() {
     const clsName = this.classes[this.selectedClassIdx()].name;
     const stats = this.playerStats();
     const enemies = this.enemies();

     if (clsName === 'WARRIOR') {
        // ABILITY: Spin Slash (3 MP)
        if (stats.mp < 3) {
           this.message.set("Not enough MP! (3)");
           return;
        }
        this.playerStats.update(s => ({...s, mp: s.mp - 3}));
        this.playMagicSound();
        this.message.set("Spin Slash!");
        this.triggerShake();

        // Damage all adjacent
        const px = this.playerPos().x; 
        const py = this.playerPos().y;
        let hit = false;

        // Iterate backwards to support removal
        for (let i = enemies.length - 1; i >= 0; i--) {
           const e = enemies[i];
           // Check adjacency
           if (Math.abs(e.x - px) + Math.abs(e.y - py) === 1) {
              hit = true;
              this.damageEnemy(i, Math.ceil(stats.atk * 1.5), "Spin");
           }
        }
        if (!hit) this.message.set("Spin Slash missed!");
        this.processEnemyTurns();

     } else if (clsName === 'MAGE') {
        // ABILITY: Thunder (4 MP)
        if (stats.mp < 4) {
           this.message.set("Not enough MP! (4)");
           return;
        }
        if (enemies.length === 0) {
           this.message.set("No targets!");
           return;
        }

        this.playerStats.update(s => ({...s, mp: s.mp - 4}));
        this.playMagicSound();
        this.triggerShake();

        // Target random enemy
        const targetIdx = Math.floor(Math.random() * enemies.length);
        this.damageEnemy(targetIdx, stats.atk * 3, "Thunder");
        this.processEnemyTurns();
     }
  }

  damageEnemy(index: number, amount: number, source: string) {
     this.playHitSound();
     this.enemies.update(list => {
        const e = list[index];
        if (!e) return list;

        // Critical Hit Check
        const critChance = this.playerStats().level * 0.02; // 2% per level
        const isCrit = Math.random() < critChance;
        const finalDmg = isCrit ? amount * 2 : amount;

        e.hp -= finalDmg;
        e.flash = true;
        
        const critText = isCrit ? " CRIT!" : "";
        this.message.set(`${source} hit ${e.name} for ${finalDmg}!${critText}`);

        setTimeout(() => {
           this.enemies.update(curr => {
              const t = curr.find(x => x.id === e.id);
              if (t) t.flash = false;
              return [...curr];
           });
        }, 150);

        if (e.hp <= 0) {
           // Defeated
           this.score.update(s => s + 50);
           this.gainXp(10 + (e.maxHp * 2)); // More XP for harder enemies
           this.message.set(`Defeated ${e.name}!`);
           
           // Loot Roll
           let dropChance = 0.4;
           if (e.isElite) dropChance = 0.8;

           if (Math.random() < dropChance) {
              const chunk = this.currentChunk();
              if (chunk) {
                 chunk.layout[e.y][e.x] = 4; // Drop
                 this.currentChunk.set({...chunk});
              }
           }
           return list.filter(x => x.id !== e.id);
        }
        return [...list];
     });
  }

  playerAttack(enemyIdx: number) {
    const dmg = Math.max(1, this.playerStats().atk);
    this.damageEnemy(enemyIdx, dmg, "Attack");
  }

  processEnemyTurns() {
    this.enemies.update(list => {
      return list.map(e => {
        const px = this.playerPos().x;
        const py = this.playerPos().y;
        const dist = Math.abs(e.x - px) + Math.abs(e.y - py);

        // Attack Range
        if (dist === 1) {
          // Damage scales with enemy maxHp (approximation of strength)
          let dmg = Math.max(1, Math.floor(e.maxHp / 3));
          if (e.isElite) dmg += 1;
          this.takeDamage(dmg, `${e.name} hit you!`); 
          return e;
        } 
        // Aggro Range (increased to 6 for challenge)
        else if (dist < 6) {
          // Move towards player
          let mx = e.x, my = e.y;
          if (e.x < px) mx++; else if (e.x > px) mx--;
          else if (e.y < py) my++; else if (e.y > py) my--;
          
          if (this.isWalkable(mx, my)) {
            e.x = mx; e.y = my;
          }
          return e;
        }
        return e;
      });
    });
  }

  isWalkable(x: number, y: number): boolean {
    const chunk = this.currentChunk();
    if (!chunk) return false;
    // Walls
    if (chunk.layout[y][x] === 1) return false;
    // Other enemies
    if (this.enemies().some(e => e.x === x && e.y === y)) return false;
    // Player
    if (this.playerPos().x === x && this.playerPos().y === y) return false;
    return true;
  }

  takeDamage(amount: number, reason: string) {
    const dmg = Math.max(1, amount - this.playerStats().def);
    this.playHurtSound();
    this.triggerShake();
    
    this.playerStats.update(s => ({ ...s, hp: s.hp - dmg }));
    this.message.set(reason);

    if (this.playerStats().hp <= 0) {
      this.playDieSound();
      this.gameState.set('GAME_OVER');
      this.message.set("GAME OVER");
    }
  }

  triggerShake() {
    this.shakeScreen.set(true);
    setTimeout(() => this.shakeScreen.set(false), 300);
  }

  collectDrop(x: number, y: number) {
     this.playCoinSound();
     const chunk = this.currentChunk();
     if (chunk) {
        chunk.layout[y][x] = 0;
        this.currentChunk.set({...chunk});
     }
     
     const roll = Math.random();
     if (roll < 0.33) {
        this.playerStats.update(s => ({ ...s, hp: Math.min(s.maxHp, s.hp + 2) }));
        this.message.set("Found Health Potion!");
     } else if (roll < 0.66) {
        this.playerStats.update(s => ({ ...s, mp: Math.min(s.maxMp, s.mp + 3) }));
        this.message.set("Found Mana Potion!");
     } else {
        this.message.set("Found Knowledge Orb!");
        this.gainXp(25);
     }
  }

  collectLoot(x: number, y: number) {
    this.playCoinSound();
    const chunk = this.currentChunk();
    if (chunk) {
       chunk.layout[y][x] = 0; // Remove chest
       this.currentChunk.set({...chunk});
    }

    const roll = Math.random();
    const currentClass = this.classes[this.selectedClassIdx()].name;
    const tier = Math.min(3, Math.floor(this.playerStats().level / 2));

    if (roll < 0.25) {
       // Elixir
       this.playerStats.update(s => ({ 
          ...s, 
          hp: s.maxHp, 
          mp: s.maxMp 
       }));
       this.message.set("Found Elixir! Fully Restored.");
    } else if (roll < 0.6) {
      // Weapon Upgrade
      let newWep = '';
      if (currentClass === 'MAGE') {
        const mageWeaps = ['Magic Wand', 'Oak Staff', 'Mystic Rod', 'Void Scepter'];
        newWep = mageWeaps[tier] || 'God Staff';
      } else {
        const warWeaps = ['Iron Sword', 'Steel Blade', 'Hero Sword', 'Laser Blade'];
        newWep = warWeaps[tier] || 'God Sword';
      }
      this.playerStats.update(s => ({ ...s, weapon: newWep, atk: s.atk + 1 }));
      this.message.set(`Found ${newWep}! ATK UP!`);
    } else {
      // Armor Upgrade
      let newArm = '';
       if (currentClass === 'MAGE') {
        const mageArms = ['Silk Robe', 'Runed Cloak', 'Star Vest', 'Time Cowl'];
        newArm = mageArms[tier] || 'God Robe';
      } else {
        const warArms = ['Leather', 'Chainmail', 'Plasteel', 'Power Armor'];
        newArm = warArms[tier] || 'God Armor';
      }
      this.playerStats.update(s => ({ ...s, armor: newArm, def: s.def + 1 }));
      this.message.set(`Found ${newArm}! DEF UP!`);
    }
  }

  gainXp(amount: number) {
    this.playerStats.update(s => {
      let nxp = s.xp + amount;
      let nlvl = s.level;
      let nMaxHp = s.maxHp;
      let nMaxMp = s.maxMp;
      
      if (nxp >= nlvl * 100) {
        nxp -= nlvl * 100;
        nlvl++;
        nMaxHp += 2;
        nMaxMp += 1;
        this.message.set(`LEVEL UP! LVL ${nlvl}`);
        this.playCoinSound();
        // Heal on level up
        return { ...s, xp: nxp, level: nlvl, maxHp: nMaxHp, maxMp: nMaxMp, hp: nMaxHp, mp: nMaxMp };
      }
      return { ...s, xp: nxp };
    });
  }

  transitionChunk(tx: number, ty: number, chunk: WorldChunk) {
    const cx = this.chunkCoords().x;
    const cy = this.chunkCoords().y;
    const w = chunk.width;
    const h = chunk.height;

    if (tx < 0) this.loadChunk(cx - 1, cy, {x: w - 1, y: ty});
    else if (tx >= w) this.loadChunk(cx + 1, cy, {x: 0, y: ty});
    else if (ty < 0) this.loadChunk(cx, cy - 1, {x: tx, y: h - 1});
    else if (ty >= h) this.loadChunk(cx, cy + 1, {x: tx, y: 0});
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent) {
    if (event.repeat) return;
    switch (event.key) {
      case 'ArrowUp': this.handleInput('UP'); break;
      case 'ArrowDown': this.handleInput('DOWN'); break;
      case 'ArrowLeft': this.handleInput('LEFT'); break;
      case 'ArrowRight': this.handleInput('RIGHT'); break;
      case 'Enter': this.handleInput('START'); break;
      case 'z': case 'Z': this.handleInput('A'); break;
    }
  }
}
