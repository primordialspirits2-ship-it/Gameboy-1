
import { Component, signal, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameScreenComponent } from './components/game-screen.component';
import { GameControlsComponent } from './components/game-controls.component';
import { GeminiGameService, ChunkExits } from './services/gemini-game.service';
import { AudioService } from './services/audio.service';
import { GameState, ActiveEnemy, CharacterClass, InventoryItem, PlayerStats, DialogueData, WorldChunk, NPCSpawn, Quest } from './models/game.types';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, GameScreenComponent, GameControlsComponent],
  templateUrl: './app.component.html',
  styleUrls: []
})
export class AppComponent {
  private geminiService = inject(GeminiGameService);
  private audioService = inject(AudioService);

  gameState = signal<GameState>('BOOT');
  isFullScreen = signal<boolean>(false);
  
  // World
  worldMap = signal<Map<string, WorldChunk>>(new Map());
  chunkCoords = signal<{x: number, y: number}>({x: 0, y: 0});
  currentChunk = signal<WorldChunk | null>(null);
  
  // Entities
  enemies = signal<ActiveEnemy[]>([]);
  npcs = signal<NPCSpawn[]>([]);
  shakeScreen = signal<boolean>(false);
  
  // Player
  playerPos = signal<{x: number, y: number}>({x: 10, y: 7});
  score = signal<number>(0);
  message = signal<string>("Initializing...");
  powerOn = signal<boolean>(true);
  stepsTaken = 0;
  
  activeQuest = signal<Quest | null>(null);

  playerStats = signal<PlayerStats>({
    hp: 10, maxHp: 10, mp: 5, maxMp: 5, level: 1, xp: 0, xpToNext: 100,
    atk: 1, def: 0, grit: 1, agility: 1, will: 1, wisdom: 1, pointsAvailable: 0,
    weapon: 'Fists', armor: 'Shirt', desc: ''
  });

  inventory = signal<InventoryItem[]>([]);
  inventoryCursor = signal<number>(0);
  levelUpCursor = signal<number>(0);

  dialogueData = signal<DialogueData | null>(null);
  currentNpc = signal<NPCSpawn | null>(null);
  shopItems = signal<InventoryItem[]>([]);
  shopCursor = signal<number>(0);

  // Title Screen State
  titleCursor = signal<number>(0);
  hasSaveGame = signal<boolean>(false);

  classes: CharacterClass[] = [
    { name: 'WARRIOR', hp: 20, mp: 5, atk: 4, def: 2, grit: 5, agility: 2, will: 2, wisdom: 1, weapon: 'Iron Sword', armor: 'Chainmail', desc: 'High Grit & HP.', ability: 'Spin Slash' },
    { name: 'MAGE', hp: 12, mp: 15, atk: 6, def: 0, grit: 1, agility: 3, will: 6, wisdom: 5, weapon: 'Novice Wand', armor: 'Silk Robe', desc: 'High Will & Wisdom.', ability: 'Thunder' }
  ];
  selectedClassIdx = signal(0);
  private lastInputTime = 0;

  constructor() {
    this.hasSaveGame.set(!!localStorage.getItem('rpg_save'));
    setTimeout(() => {
      this.audioService.playBootSound();
      this.gameState.set('TITLE');
    }, 2000);
  }

  toggleFullScreen() { this.isFullScreen.update(v => !v); }

  // --- SAVE / LOAD ---

  saveGame() {
    const save = {
      x: this.chunkCoords().x, y: this.chunkCoords().y,
      px: this.playerPos().x, py: this.playerPos().y,
      stats: this.playerStats(),
      inv: this.inventory(),
      score: this.score(),
      quest: this.activeQuest(),
      map: Array.from(this.worldMap().entries())
    };
    localStorage.setItem('rpg_save', JSON.stringify(save));
    this.message.set("GAME SAVED");
    this.audioService.playCoinSound();
  }

  loadGame() {
    const raw = localStorage.getItem('rpg_save');
    if (!raw) return;
    const save = JSON.parse(raw);
    
    this.playerStats.set(save.stats);
    this.inventory.set(save.inv);
    this.score.set(save.score);
    this.activeQuest.set(save.quest);
    this.worldMap.set(new Map(save.map));
    
    this.loadChunk(save.x, save.y, {x: save.px, y: save.py});
  }

  // --- GAME START ---

  startNewGame() {
    this.score.set(0);
    this.stepsTaken = 0;
    this.chunkCoords.set({x: 0, y: 0});
    this.playerPos.set({x: 10, y: 7});
    this.worldMap.set(new Map());
    this.inventory.set([]);
    this.activeQuest.set(null);
    
    const cls = this.classes[this.selectedClassIdx()];
    this.playerStats.set({ 
      hp: cls.hp, maxHp: cls.hp, mp: cls.mp, maxMp: cls.mp,
      level: 1, xp: 0, xpToNext: 50, atk: cls.atk, def: cls.def, 
      grit: cls.grit, agility: cls.agility, will: cls.will, wisdom: cls.wisdom, pointsAvailable: 0,
      weapon: cls.weapon, armor: cls.armor, desc: cls.desc
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
    this.message.set(`Exploring Sector ${x},${y}...`);

    // --- EDGE MATCHING LOGIC ---
    const north = currentMap.get(`${x},${y-1}`);
    const south = currentMap.get(`${x},${y+1}`);
    const west = currentMap.get(`${x-1},${y}`);
    const east = currentMap.get(`${x+1},${y}`);
    
    const w = 20, h = 15;
    const exits: ChunkExits = {};

    // Helper to find open indices (0 = Floor)
    const getOpenings = (arr: number[]) => arr.map((v, i) => v === 0 ? i : -1).filter(i => i !== -1);

    if (north) exits.north = getOpenings(north.layout[h-1]);
    if (south) exits.south = getOpenings(south.layout[0]);
    if (west) exits.west = getOpenings(west.layout.map(r => r[w-1]));
    if (east) exits.east = getOpenings(east.layout.map(r => r[0]));
    
    try {
      const chunk = await this.geminiService.generateChunk(x, y, exits);
      this.worldMap.update(map => {
        const newMap = new Map(map);
        newMap.set(key, chunk);
        return newMap;
      });
      this.setChunkActive(x, y, chunk, entryPoint);
      // Auto-save on new chunk load
      this.saveGame();
    } catch (e) {
      this.message.set("Sector Unstable.");
    }
  }

  private setChunkActive(cx: number, cy: number, chunk: WorldChunk, entryPoint?: {x: number, y: number}) {
    this.chunkCoords.set({x: cx, y: cy});
    this.currentChunk.set(chunk);
    
    let sx = 10, sy = 7;
    if (entryPoint) { sx = entryPoint.x; sy = entryPoint.y; }

    // Ensure player doesn't spawn in a wall (just in case)
    if (chunk.layout[sy] && chunk.layout[sy][sx] === 1) chunk.layout[sy][sx] = 0;

    this.playerPos.set({x: sx, y: sy});

    // Populate enemies
    const dist = Math.abs(cx) + Math.abs(cy);
    const scale = 1 + (dist * 0.1);
    
    const activeEnemies: ActiveEnemy[] = (chunk.enemies || []).map((e, idx) => ({
        id: `e_${cx}_${cy}_${idx}`,
        type: e.type,
        x: e.x, y: e.y,
        hp: Math.floor(5 * scale), maxHp: Math.floor(5 * scale),
        name: e.name,
        isElite: Math.random() < 0.1
    }));

    this.enemies.set(activeEnemies);
    this.npcs.set(chunk.npcs || []);
    this.message.set(chunk.flavorText);
    this.gameState.set('PLAYING');
  }

  handleInput(key: string) {
    const now = Date.now();
    if (now - this.lastInputTime < 130) return; 
    this.lastInputTime = now;

    const state = this.gameState();

    if (state === 'TITLE') {
       if (key === 'UP' || key === 'DOWN') {
          if (this.hasSaveGame()) {
             this.titleCursor.update(c => c === 0 ? 1 : 0);
             this.audioService.playMenuSound();
          }
       } else if (key === 'START' || key === 'A') {
          if (this.titleCursor() === 1) {
             this.loadGame();
          } else {
             this.gameState.set('CLASS_SELECT');
          }
          this.audioService.playStartSound();
       }
       return;
    }

    if (key === 'SELECT') {
      if (state === 'PLAYING') this.gameState.set('MAP');
      else if (state === 'MAP') this.gameState.set('PLAYING');
      this.audioService.playMenuSound();
      return;
    }

    if (state === 'CLASS_SELECT') this.handleClassMenuInput(key);
    else if (state === 'PLAYING') this.handlePlayerTurn(key);
    else if (state === 'INVENTORY') this.handleInventoryInput(key);
    else if (state === 'DIALOGUE') this.handleDialogueInput(key);
    else if (state === 'SHOP') this.handleShopInput(key);
    else if (state === 'LEVEL_UP') this.handleLevelUpInput(key);
    else if (state === 'MAP') { if (key === 'B') this.gameState.set('PLAYING'); }
    else if (state === 'GAME_OVER' && key === 'START') {
       this.gameState.set('TITLE');
       this.audioService.playBootSound();
    }
  }

  handleClassMenuInput(key: string) {
     if (key === 'UP' || key === 'DOWN') {
        this.selectedClassIdx.update(i => (i + 1) % this.classes.length);
     } else if (key === 'START' || key === 'A') {
        this.startNewGame();
     }
  }

  handleInventoryInput(key: string) {
     if (key === 'B') this.gameState.set('PLAYING');
     else if (key === 'UP') this.inventoryCursor.update(c => Math.max(0, c - 1));
     else if (key === 'DOWN') this.inventoryCursor.update(c => Math.min(this.inventory().length - 1, c + 1));
     else if (key === 'A') {
        const item = this.inventory()[this.inventoryCursor()];
        if (item) this.useItem(item);
     }
  }

  handleLevelUpInput(key: string) {
     if (key === 'UP') this.levelUpCursor.update(c => Math.max(0, c - 1));
     else if (key === 'DOWN') this.levelUpCursor.update(c => Math.min(3, c + 1));
     else if (key === 'A') {
        this.playerStats.update(s => {
           const c = this.levelUpCursor();
           if (s.pointsAvailable <= 0) return s;
           
           let ns = {...s, pointsAvailable: s.pointsAvailable - 1};
           if (c === 0) { ns.grit++; ns.maxHp += 5; ns.hp += 5; } // Grit: +5 HP
           if (c === 1) { ns.agility++; } // Agility: Dodge/Crit
           if (c === 2) { ns.will++; ns.maxMp += 3; ns.mp += 3; } // Will: +3 MP
           if (c === 3) { ns.wisdom++; } // Wisdom: XP/Magic
           
           if (ns.pointsAvailable <= 0) {
              setTimeout(() => this.gameState.set('PLAYING'), 200);
           }
           return ns;
        });
        this.audioService.playCoinSound();
     }
  }

  useItem(item: InventoryItem) {
     if (item.type === 'QUEST_ITEM') {
        this.message.set("Someone might need this.");
        return;
     }
     
     // Consumption logic
     let used = false;
     if (item.type.includes('POTION_HP')) {
        this.playerStats.update(s => ({...s, hp: Math.min(s.maxHp, s.hp + 10)}));
        used = true;
     }
     if (item.type.includes('POTION_MP')) {
        this.playerStats.update(s => ({...s, mp: Math.min(s.maxMp, s.mp + 10)}));
        used = true;
     }

     if (used) {
        this.audioService.playCoinSound();
        this.inventory.update(inv => {
           item.count--;
           return item.count <= 0 ? inv.filter(i => i !== item) : [...inv];
        });
     }
  }

  async startDialogue(npc: NPCSpawn) {
     this.currentNpc.set(npc);
     this.gameState.set('DIALOGUE');
     
     const quest = this.activeQuest();
     let text = npc.greeting;

     // Quest Logic: Interaction
     if (quest && !quest.isCompleted && quest.giverName === npc.name) {
        // Check if we have the item
        const hasItem = this.inventory().find(i => i.name === quest.targetItemName);
        if (hasItem) {
           text = "You found it! Thank you! Here is your reward.";
           this.completeQuest(quest, hasItem);
        } else {
           text = `Please find my ${quest.targetItemName}.`;
        }
     } else if (npc.activeQuest && !this.activeQuest()) {
        // Offer new quest
        this.activeQuest.set(npc.activeQuest);
        text = `${npc.activeQuest.description} (Quest Accepted)`;
        this.audioService.playMagicSound();
     } else {
        // Generate AI chat
        try {
           text = await this.geminiService.generateDialogue(npc, this.classes[this.selectedClassIdx()].name, this.currentChunk()?.biomeName || '');
        } catch {}
     }

     this.dialogueData.set({
        npcName: npc.name,
        text,
        isShopkeeper: npc.role === 'SHOPKEEPER'
     });
  }

  completeQuest(quest: Quest, item: InventoryItem) {
     this.score.update(s => s + quest.rewardGold);
     this.gainXp(quest.rewardXp);
     this.audioService.playMagicSound();
     
     // Remove item
     this.inventory.update(inv => inv.filter(i => i !== item));
     
     // Mark complete
     this.activeQuest.update(q => q ? {...q, isCompleted: true} : null);
     this.saveGame();
  }

  handleDialogueInput(key: string) {
     if (key === 'A') {
        if (this.currentNpc()?.role === 'SHOPKEEPER') this.openShop(this.currentNpc()!);
        else this.gameState.set('PLAYING');
     } else if (key === 'B') this.gameState.set('PLAYING');
  }

  handleShopInput(key: string) {
     if (key === 'B') this.gameState.set('PLAYING');
     else if (key === 'UP') this.shopCursor.update(c => Math.max(0, c - 1));
     else if (key === 'DOWN') this.shopCursor.update(c => Math.min(this.shopItems().length - 1, c + 1));
     else if (key === 'A') {
        const item = this.shopItems()[this.shopCursor()];
        if (this.score() >= (item.cost || 0)) {
           this.score.update(s => s - item.cost!);
           this.addItemToInventory({...item, count: 1});
           this.audioService.playCoinSound();
        }
     }
  }

  openShop(npc: NPCSpawn) {
     this.gameState.set('SHOP');
     this.shopItems.set([
        { id: '1', name: 'Potion', type: 'POTION_HP', desc: 'Heals HP', count: 1, cost: 20 },
        { id: '2', name: 'Ether', type: 'POTION_MP', desc: 'Heals MP', count: 1, cost: 30 }
     ]);
  }

  addItemToInventory(item: InventoryItem) {
     this.inventory.update(inv => {
        const existing = inv.find(i => i.name === item.name);
        if (existing) { existing.count++; return [...inv]; }
        return [...inv, item];
     });
  }

  handlePlayerTurn(key: string) {
    const pos = this.playerPos();
    let dx = 0, dy = 0;
    
    if (key === 'UP') dy = -1;
    else if (key === 'DOWN') dy = 1;
    else if (key === 'LEFT') dx = -1;
    else if (key === 'RIGHT') dx = 1;
    else if (key === 'A') { /* Ability logic placeholder */ return; }
    else if (key === 'B') { this.gameState.set('INVENTORY'); return; }
    else if (key === 'START') { this.saveGame(); return; } 

    const tx = pos.x + dx;
    const ty = pos.y + dy;
    const chunk = this.currentChunk();
    if (!chunk) return;

    // Check bounds for chunk transition
    if (tx < 0 || tx >= chunk.width || ty < 0 || ty >= chunk.height) {
       this.transitionChunk(tx, ty, chunk);
       return;
    }

    // NPC Interaction
    if (this.npcs().find(n => n.x === tx && n.y === ty)) {
       this.startDialogue(this.npcs().find(n => n.x === tx && n.y === ty)!);
       return;
    }

    if (chunk.layout[ty][tx] === 1 || chunk.layout[ty][tx] === 5) {
       this.audioService.playBumpSound();
       return;
    }

    // Enemy collision
    const enemyIdx = this.enemies().findIndex(e => e.x === tx && e.y === ty);
    if (enemyIdx !== -1) {
       this.playerAttack(enemyIdx);
       // Enemies take turn if they survive
       if (this.enemies()[enemyIdx]) this.processEnemyTurns();
       return;
    }

    this.playerPos.set({x: tx, y: ty});
    this.stepsTaken++;
    this.audioService.playMoveSound();

    if (chunk.layout[ty][tx] === 3) this.collectLoot(tx, ty);
    
    this.processEnemyTurns();
  }
  
  processEnemyTurns() {
     const p = this.playerPos();
     const stats = this.playerStats();

     this.enemies.update(enemies => {
        return enemies.map(e => {
           const dx = Math.abs(e.x - p.x);
           const dy = Math.abs(e.y - p.y);
           
           if (dx + dy <= 1) {
              // Attack Player
              // Dodge Calc: Agility * 2% chance
              if (Math.random() < stats.agility * 0.02) {
                 this.message.set("Dodged!");
              } else {
                 // Damage Calc: Enemy Base (2) - (Def + Grit/2)
                 const dmg = Math.max(1, 2 - (stats.def + Math.floor(stats.grit / 2)));
                 this.playerStats.update(s => ({...s, hp: Math.max(0, s.hp - dmg)}));
                 this.shakeScreen.set(true);
                 setTimeout(() => this.shakeScreen.set(false), 300);
                 this.audioService.playHurtSound();
                 if (this.playerStats().hp <= 0) {
                    this.gameState.set('GAME_OVER');
                    this.audioService.playDieSound();
                 }
              }
              return e;
           } else if (dx + dy < 6) {
              // Move towards player
              let nx = e.x, ny = e.y;
              if (dx > dy) nx += (p.x > e.x ? 1 : -1);
              else ny += (p.y > e.y ? 1 : -1);
              
              // Simple collision check (only walls)
              const chunk = this.currentChunk();
              if (chunk && chunk.layout[ny] && chunk.layout[ny][nx] === 0) {
                 return {...e, x: nx, y: ny};
              }
           }
           return e;
        });
     });
  }

  playerAttack(idx: number) {
     const stats = this.playerStats();
     
     // Crit Calc: Agility * 3%
     const isCrit = Math.random() < stats.agility * 0.03;
     let dmg = stats.atk;
     if (isCrit) {
        dmg *= 2;
        this.message.set("CRITICAL HIT!");
     }
     
     this.enemies.update(list => {
        const e = list[idx];
        e.hp -= dmg;
        e.flash = true;
        setTimeout(() => { 
           this.enemies.update(l => l.map(en => en.id === e.id ? {...en, flash: false} : en));
        }, 200);

        if (e.hp <= 0) {
           this.gainXp(e.isElite ? 20 : 10);
           this.audioService.playHitSound();
           return list.filter(en => en.id !== e.id);
        } else {
           this.audioService.playBumpSound(); // Thud
           return [...list];
        }
     });
  }

  collectLoot(x: number, y: number) {
     const chunk = this.currentChunk()!;
     chunk.layout[y][x] = 0;
     this.audioService.playCoinSound();
     
     const quest = this.activeQuest();
     if (quest && !quest.isCompleted && Math.random() < 0.4) {
        this.addItemToInventory({
           id: crypto.randomUUID(), name: quest.targetItemName, 
           type: 'QUEST_ITEM', count: 1, desc: 'Quest Item'
        });
        this.message.set(`Found ${quest.targetItemName}!`);
     } else {
        this.addItemToInventory({
           id: crypto.randomUUID(), name: 'Gold Coin', type: 'POTION_HP', count: 1, desc: 'Valuable'
        });
     }
  }

  gainXp(amount: number) {
     // Wisdom Bonus: +5% per point
     const bonus = 1 + (this.playerStats().wisdom * 0.05);
     const total = Math.floor(amount * bonus);
     
     this.playerStats.update(s => {
        let xp = s.xp + total;
        let lvl = s.level;
        let points = s.pointsAvailable;
        let next = s.xpToNext;
        
        if (xp >= next) {
           lvl++;
           xp -= next;
           next = Math.floor(next * 1.5);
           points++; // Grant stat point
           this.audioService.playMagicSound();
           this.message.set("LEVEL UP!");
           setTimeout(() => this.gameState.set('LEVEL_UP'), 500);
        }
        return {...s, xp, level: lvl, xpToNext: next, pointsAvailable: points};
     });
  }

  transitionChunk(tx: number, ty: number, chunk: WorldChunk) {
    const cx = this.chunkCoords().x;
    const cy = this.chunkCoords().y;
    if (tx < 0) this.loadChunk(cx - 1, cy, {x: chunk.width - 1, y: ty});
    else if (tx >= chunk.width) this.loadChunk(cx + 1, cy, {x: 0, y: ty});
    else if (ty < 0) this.loadChunk(cx, cy - 1, {x: tx, y: chunk.height - 1});
    else if (ty >= chunk.height) this.loadChunk(cx, cy + 1, {x: tx, y: 0});
  }
}
