import { Component, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameScreenComponent, GameState, ActiveEnemy, CharacterClass, InventoryItem, DialogueData } from './components/game-screen.component';
import { GameControlsComponent } from './components/game-controls.component';
import { GeminiGameService, WorldChunk, EnemySpawn, NPCSpawn } from './services/gemini-game.service';

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
  isFullScreen = signal<boolean>(false);
  
  // World State
  // We use a signal for the map so changes propagate to the GameScreen for rendering
  worldMap = signal<Map<string, WorldChunk>>(new Map());
  
  chunkCoords = signal<{x: number, y: number}>({x: 0, y: 0});
  currentChunk = signal<WorldChunk | null>(null);
  
  // Entity State
  enemies = signal<ActiveEnemy[]>([]);
  npcs = signal<NPCSpawn[]>([]);
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

  // Inventory State
  inventory = signal<InventoryItem[]>([]);
  inventoryCursor = signal<number>(0);

  // Dialogue & Shop State
  dialogueData = signal<DialogueData | null>(null);
  currentNpc = signal<NPCSpawn | null>(null);
  shopItems = signal<InventoryItem[]>([]);
  shopCursor = signal<number>(0);

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
  private playTalkSound() { this.playTone(300, 'square', 0.03, 0, 0.05); this.playTone(350, 'square', 0.03, 0.05, 0.05); }

  toggleFullScreen() {
     this.isFullScreen.update(v => !v);
  }

  // --- GAME LOGIC ---

  startOpenWorld() {
    this.score.set(0);
    this.stepsTaken = 0;
    this.chunkCoords.set({x: 0, y: 0});
    this.playerPos.set({x: 5, y: 4});
    
    // Clear and reset map with immutable update
    this.worldMap.set(new Map());
    
    this.inventory.set([]); // Reset inventory
    this.inventoryCursor.set(0);
    
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
    const currentMap = this.worldMap();
    
    if (currentMap.has(key)) {
      this.setChunkActive(x, y, currentMap.get(key)!, entryPoint);
      return;
    }

    this.gameState.set('LOADING');
    this.message.set("Scanning sector...");
    
    try {
      const chunk = await this.geminiService.generateChunk(x, y);
      
      // Update world map signal
      this.worldMap.update(map => {
        const newMap = new Map(map);
        newMap.set(key, chunk);
        return newMap;
      });

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
    this.npcs.set(chunk.npcs || []);
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

    // Global Menus
    if (key === 'SELECT') {
      if (this.gameState() === 'PLAYING') {
         this.gameState.set('MAP');
         this.playMenuSound();
         return;
      } else if (this.gameState() === 'MAP') {
         this.gameState.set('PLAYING');
         this.playMenuSound();
         return;
      }
    }

    if (this.gameState() === 'CLASS_SELECT') {
       this.handleClassMenuInput(key);
    } else if (this.gameState() === 'PLAYING') {
       this.handlePlayerTurn(key);
    } else if (this.gameState() === 'INVENTORY') {
       this.handleInventoryInput(key);
    } else if (this.gameState() === 'DIALOGUE') {
       this.handleDialogueInput(key);
    } else if (this.gameState() === 'SHOP') {
       this.handleShopInput(key);
    } else if (this.gameState() === 'MAP') {
       if (key === 'B' || key === 'START') {
         this.gameState.set('PLAYING');
         this.playMenuSound();
       }
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

  // --- INVENTORY LOGIC ---
  handleInventoryInput(key: string) {
     const inv = this.inventory();
     if (key === 'B' || key === 'START') {
         this.gameState.set('PLAYING');
         this.playMenuSound();
     } else if (key === 'UP') {
         this.inventoryCursor.update(c => Math.max(0, c - 1));
         this.playMenuSound();
     } else if (key === 'DOWN') {
         this.inventoryCursor.update(c => Math.min(inv.length - 1, c + 1));
         this.playMenuSound();
     } else if (key === 'A') {
         if (inv.length > 0) {
             this.useItem(inv[this.inventoryCursor()]);
         }
     }
  }

  addItemToInventory(item: InventoryItem) {
     this.inventory.update(inv => {
         const existing = inv.find(i => i.type === item.type);
         if (existing) {
             existing.count++;
             return [...inv];
         } else {
             return [...inv, item];
         }
     });
     this.message.set(`Got ${item.name}!`);
  }

  useItem(item: InventoryItem) {
     let used = false;
     if (item.type === 'POTION_HP') {
         if (this.playerStats().hp < this.playerStats().maxHp) {
             this.playerStats.update(s => ({ ...s, hp: Math.min(s.maxHp, s.hp + 5) }));
             this.message.set("Restored HP!");
             this.playCoinSound();
             used = true;
         } else {
             this.message.set("HP is full.");
             this.playBumpSound();
         }
     } else if (item.type === 'POTION_MP') {
         if (this.playerStats().mp < this.playerStats().maxMp) {
             this.playerStats.update(s => ({ ...s, mp: Math.min(s.maxMp, s.mp + 5) }));
             this.message.set("Restored MP!");
             this.playCoinSound();
             used = true;
         } else {
             this.message.set("MP is full.");
             this.playBumpSound();
         }
     } else if (item.type === 'ELIXIR') {
         this.playerStats.update(s => ({ ...s, hp: s.maxHp, mp: s.maxMp }));
         this.message.set("Fully Restored!");
         this.playMagicSound();
         used = true;
     }

     if (used) {
         this.inventory.update(inv => {
             item.count--;
             if (item.count <= 0) {
                 return inv.filter(i => i !== item);
             }
             return [...inv];
         });
         // Adjust cursor if last item removed
         if (this.inventory().length <= this.inventoryCursor()) {
             this.inventoryCursor.set(Math.max(0, this.inventory().length - 1));
         }
     }
  }

  // --- DIALOGUE & SHOP SYSTEM ---
  async startDialogue(npc: NPCSpawn) {
     this.playTalkSound();
     this.currentNpc.set(npc);
     this.gameState.set('DIALOGUE');
     
     // Set initial greeting while fetching real dialogue
     this.dialogueData.set({
        npcName: npc.name,
        text: npc.greeting || "Hello there.",
        isShopkeeper: npc.role === 'SHOPKEEPER'
     });

     // Fetch dynamic dialogue from AI
     const playerClass = this.classes[this.selectedClassIdx()].name;
     const biome = this.currentChunk()?.biomeName || 'Unknown';
     
     try {
        const text = await this.geminiService.generateDialogue(npc, playerClass, biome);
        this.dialogueData.set({
           npcName: npc.name,
           text: text,
           isShopkeeper: npc.role === 'SHOPKEEPER'
        });
     } catch (e) {
        // Fallback handled by keeping greeting
     }
  }

  handleDialogueInput(key: string) {
     const npc = this.currentNpc();
     if (key === 'A') {
        if (npc?.role === 'SHOPKEEPER') {
           this.openShop(npc);
        } else {
           this.gameState.set('PLAYING');
        }
     } else if (key === 'B') {
        this.gameState.set('PLAYING');
     }
  }

  openShop(npc: NPCSpawn) {
     this.playCoinSound();
     this.gameState.set('SHOP');
     // Generate Shop Inventory based on level
     const level = this.playerStats().level;
     const items: InventoryItem[] = [
        { id: 'shop1', name: 'HP Potion', type: 'POTION_HP', desc: 'Heals 5 HP', count: 1, cost: 25 },
        { id: 'shop2', name: 'MP Potion', type: 'POTION_MP', desc: 'Restores 5 MP', count: 1, cost: 30 }
     ];
     
     if (level >= 3) {
        items.push({ id: 'shop3', name: 'Elixir', type: 'ELIXIR', desc: 'Full Restore', count: 1, cost: 100 });
     }
     
     this.shopItems.set(items);
     this.shopCursor.set(0);
  }

  handleShopInput(key: string) {
     if (key === 'B' || key === 'START') {
        this.gameState.set('PLAYING');
        this.playMenuSound();
        return;
     }

     if (key === 'UP') {
        this.shopCursor.update(c => Math.max(0, c - 1));
        this.playMenuSound();
     } else if (key === 'DOWN') {
        this.shopCursor.update(c => Math.min(this.shopItems().length - 1, c + 1));
        this.playMenuSound();
     } else if (key === 'A') {
        this.buyItem(this.shopItems()[this.shopCursor()]);
     }
  }

  buyItem(item: InventoryItem) {
     if (!item.cost) return;

     if (this.score() >= item.cost) {
        this.score.update(s => s - item.cost!);
        this.addItemToInventory({ ...item, count: 1 });
        this.playCoinSound();
        this.message.set("Bought " + item.name);
     } else {
        this.playBumpSound();
        this.message.set("Not enough gold!");
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
      case 'A': 
         // Check interaction
         const facingX = pos.x + (this.lastMoveX || 0);
         const facingY = pos.y + (this.lastMoveY || 1);
         if (!this.tryInteract(facingX, facingY)) {
             this.castAbility();
         }
         return; 
      case 'B': this.gameState.set('INVENTORY'); this.playMenuSound(); return;
      case 'START': this.message.set("Paused"); this.playStartSound(); return;
      default: return;
    }

    // Keep track of facing direction for interaction
    this.lastMoveX = dx;
    this.lastMoveY = dy;

    const tx = pos.x + dx;
    const ty = pos.y + dy;
    const chunk = this.currentChunk();
    if (!chunk) return;

    // 0. Check Interaction with NPC (Bump to talk)
    if (this.tryInteract(tx, ty)) return;

    // 1. Check Map Bounds (Transition)
    if (tx < 0 || tx >= chunk.width || ty < 0 || ty >= chunk.height) {
      this.transitionChunk(tx, ty, chunk);
      return;
    }

    // 2. Check Walls
    if (chunk.layout[ty][tx] === 1 || chunk.layout[ty][tx] === 5) {
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

  private lastMoveX = 0;
  private lastMoveY = 0;

  tryInteract(x: number, y: number): boolean {
     const npc = this.npcs().find(n => n.x === x && n.y === y);
     if (npc) {
        this.startDialogue(npc);
        return true;
     }
     return false;
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
    // Walls or Buildings
    if (chunk.layout[y][x] === 1 || chunk.layout[y][x] === 5) return false;
    // Other enemies
    if (this.enemies().some(e => e.x === x && e.y === y)) return false;
    // NPCs
    if (this.npcs().some(n => n.x === x && n.y === y)) return false;
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
     if (roll < 0.35) {
        this.addItemToInventory({ 
            id: crypto.randomUUID(), 
            name: 'Potion', 
            type: 'POTION_HP', 
            desc: 'Restores HP', 
            count: 1 
        });
     } else if (roll < 0.7) {
        this.addItemToInventory({ 
            id: crypto.randomUUID(), 
            name: 'Ether', 
            type: 'POTION_MP', 
            desc: 'Restores MP', 
            count: 1 
        });
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
       this.addItemToInventory({ 
           id: crypto.randomUUID(), 
           name: 'Elixir', 
           type: 'ELIXIR', 
           desc: 'Fully restores status.', 
           count: 1 
       });
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
      case 'Shift': this.handleInput('SELECT'); break; // Map shortcut
      case 'z': case 'Z': this.handleInput('A'); break;
      case 'x': case 'X': this.handleInput('B'); break;
    }
  }
}