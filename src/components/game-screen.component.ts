
import { Component, input, computed, effect, signal, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameState, ActiveEnemy, CharacterClass, InventoryItem, PlayerStats, DialogueData, WorldChunk, NPCSpawn } from '../models/game.types';

// Import UI Sub-Components
import { StatusHudComponent } from './ui/status-hud.component';
import { InventoryComponent } from './ui/inventory.component';
import { DialogueComponent } from './ui/dialogue.component';
import { ShopComponent } from './ui/shop.component';
import { WorldMapComponent } from './ui/world-map.component';

@Component({
  selector: 'app-game-screen',
  standalone: true,
  imports: [
    CommonModule,
    StatusHudComponent,
    InventoryComponent,
    DialogueComponent,
    ShopComponent,
    WorldMapComponent
  ],
  template: `
    <section class="transition-all duration-300 w-full h-full relative flex flex-col"
         [class.screen-bezel]="!isFullScreen()"
         [class.bg-[#5c5f68]]="!isFullScreen()"
         [class.rounded-2xl]="!isFullScreen()"
         [class.sm:rounded-3xl]="!isFullScreen()"
         [class.p-3]="!isFullScreen()"
         [class.sm:p-5]="!isFullScreen()"
         [class.p-0]="isFullScreen()"
         [class.bg-black]="isFullScreen()">
      
      @if (!isFullScreen()) {
        <div class="absolute top-[40%] left-2 sm:left-3 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] z-20">
           <div class="w-full h-full rounded-full bg-red-500 opacity-0 transition-opacity duration-300 shadow-[0_0_5px_#ef4444]" 
                [class.opacity-100]="powerOn()" [class.animate-pulse-subtle]="powerOn()"></div>
        </div>
      }

      <div class="lcd-screen flex-1 w-full bg-[#0f1218] overflow-hidden font-mono select-none flex flex-col items-center justify-center relative"
           [class.border-4]="!isFullScreen()"
           [class.border-[#374151]]="!isFullScreen()">
        
        <div class="relative z-0 w-full h-full flex flex-col text-[#e0e7ff]">
            
            <!-- BOOT / TITLE SCREEN -->
            @if (state() === 'BOOT' || state() === 'TITLE') {
              <div class="w-full h-full flex flex-col items-center justify-center animate-fade-in bg-[#1a1c23]">
                 <h1 class="text-[#e0e7ff] text-3xl sm:text-5xl font-black tracking-[0.2em] drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">GEMINI</h1>
                 <h2 class="text-[#9ca3af] text-xl tracking-[0.5em] mb-8">RPG</h2>
                 
                 <div class="flex flex-col gap-4 text-sm font-bold tracking-wider">
                    <div class="flex items-center gap-2" [class.text-yellow-400]="titleCursor()===0" [class.text-gray-600]="titleCursor()!==0">
                       <span class="w-4">{{ titleCursor()===0 ? '►' : '' }}</span> NEW GAME
                    </div>
                    @if (hasSaveGame()) {
                      <div class="flex items-center gap-2" [class.text-yellow-400]="titleCursor()===1" [class.text-gray-600]="titleCursor()!==1">
                         <span class="w-4">{{ titleCursor()===1 ? '►' : '' }}</span> CONTINUE
                      </div>
                    }
                 </div>
              </div>
            }

            <!-- CLASS SELECT -->
            @if (state() === 'CLASS_SELECT') {
              <div class="w-full h-full flex flex-col items-center pt-6 bg-[#1a1c23]">
                 <h2 class="text-white text-lg font-bold mb-4 border-b-2 border-white pb-1 tracking-wider">SELECT CLASS</h2>
                 <ul class="w-full max-w-xs space-y-4 px-4 list-none m-0 p-0">
                   @for (cls of availableClasses(); track cls.name; let i = $index) {
                     <li class="flex items-center gap-2 transition-all duration-200" 
                          [class.opacity-60]="i !== selectedClassIdx()"
                          [class.scale-105]="i === selectedClassIdx()">
                        <div class="w-4 text-white font-bold text-xl">{{ i === selectedClassIdx() ? '►' : '' }}</div>
                        <div class="flex-1 border-2 border-gray-600 p-2 bg-[#2a2d38]">
                           <div class="flex justify-between items-center mb-1 border-b border-gray-500 pb-1">
                              <span class="font-bold text-white text-lg">{{ cls.name }}</span>
                           </div>
                           <div class="text-[0.6rem] text-gray-300 mb-2 font-bold">{{ cls.desc }}</div>
                           <div class="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-[0.55rem] font-bold text-gray-400">
                              <div class="bg-black/20 px-1 rounded">HP <span class="text-white">{{ cls.hp }}</span></div>
                              <div class="bg-black/20 px-1 rounded">GRIT <span class="text-white">{{ cls.grit }}</span></div>
                              <div class="bg-black/20 px-1 rounded">ATK <span class="text-white">{{ cls.atk }}</span></div>
                              <div class="bg-black/20 px-1 rounded">AGIL <span class="text-white">{{ cls.agility }}</span></div>
                           </div>
                        </div>
                     </li>
                   }
                 </ul>
              </div>
            }

            <!-- LEVEL UP -->
            @if (state() === 'LEVEL_UP') {
              <div class="w-full h-full flex flex-col items-center justify-center bg-[#1a1c23]/95 z-50 animate-fade-in">
                 <div class="border-2 border-yellow-400 bg-black p-4 w-3/4 max-w-sm shadow-2xl relative overflow-hidden">
                    <div class="absolute -top-10 -right-10 w-20 h-20 bg-yellow-400/20 rotate-45 blur-xl"></div>
                    
                    <h2 class="text-yellow-400 text-center font-bold text-lg mb-1 tracking-widest animate-pulse">LEVEL UP!</h2>
                    <div class="text-center text-white text-[0.6rem] mb-4">POINTS AVAILABLE: <span class="text-yellow-400 font-bold">{{ playerStats().pointsAvailable }}</span></div>

                    <div class="space-y-2">
                       <div class="flex justify-between items-center p-1 cursor-pointer" [class.bg-white]="levelUpCursor() === 0" [class.text-black]="levelUpCursor() === 0" [class.text-gray-400]="levelUpCursor() !== 0">
                          <span>GRIT (+HP)</span>
                          <span class="font-bold">{{ playerStats().grit }} {{ levelUpCursor() === 0 ? '▲' : '' }}</span>
                       </div>
                       <div class="flex justify-between items-center p-1 cursor-pointer" [class.bg-white]="levelUpCursor() === 1" [class.text-black]="levelUpCursor() === 1" [class.text-gray-400]="levelUpCursor() !== 1">
                          <span>AGILITY (+DODGE)</span>
                          <span class="font-bold">{{ playerStats().agility }} {{ levelUpCursor() === 1 ? '▲' : '' }}</span>
                       </div>
                       <div class="flex justify-between items-center p-1 cursor-pointer" [class.bg-white]="levelUpCursor() === 2" [class.text-black]="levelUpCursor() === 2" [class.text-gray-400]="levelUpCursor() !== 2">
                          <span>WILL (+MP)</span>
                          <span class="font-bold">{{ playerStats().will }} {{ levelUpCursor() === 2 ? '▲' : '' }}</span>
                       </div>
                       <div class="flex justify-between items-center p-1 cursor-pointer" [class.bg-white]="levelUpCursor() === 3" [class.text-black]="levelUpCursor() === 3" [class.text-gray-400]="levelUpCursor() !== 3">
                          <span>WISDOM (+XP)</span>
                          <span class="font-bold">{{ playerStats().wisdom }} {{ levelUpCursor() === 3 ? '▲' : '' }}</span>
                       </div>
                    </div>
                 </div>
              </div>
            }

            <!-- LOADING -->
            @if (state() === 'LOADING') {
              <div class="w-full h-full flex flex-col items-center justify-center bg-[#1a1c23]">
                 <div class="relative w-16 h-16 mb-4">
                    <div class="absolute inset-0 border-4 border-t-[#6366f1] border-r-[#6366f1] border-b-[#1f2937] border-l-[#1f2937] rounded-full animate-spin"></div>
                 </div>
                 <div class="text-white text-lg font-bold animate-pulse tracking-widest">GENERATING</div>
                 <div class="text-[#9ca3af] text-xs mt-2 text-center px-8">{{ message() }}</div>
              </div>
            }

            <!-- MAP OVERLAY -->
            @if (state() === 'MAP') {
              <app-world-map [gridData]="mapGrid()" [currentCoords]="chunkCoords()"></app-world-map>
            }

            <!-- MAIN GAME LOOP -->
            @if (['PLAYING', 'INVENTORY', 'GAME_OVER', 'DIALOGUE', 'SHOP'].includes(state())) {
              <div class="w-full h-full relative bg-[#1a1a1a]" [class.animate-shake]="shakeScreen()">
                 <app-status-hud [stats]="playerStats()" [score]="score()"></app-status-hud>

                 <!-- GRID CONTAINER -->
                 <div #gameGrid class="w-full h-full flex items-center justify-center p-0">
                    <div class="relative bg-[#111827] shadow-2xl border border-gray-800 overflow-hidden flex flex-col"
                         [style.width.px]="gridSize().width"
                         [style.height.px]="gridSize().height">
                         
                      <!-- Render Map with Flexbox -->
                      @if (currentChunk()) {
                          @for (row of currentChunk()?.layout; track $index; let y = $index) {
                            <div class="flex-1 w-full flex">
                                @for (tile of row; track $index; let x = $index) {
                                  <div class="flex-1 h-full relative border-[0.5px] border-white/5"
                                        [style.background-color]="tile === 0 ? '#0f172a' : tile === 1 ? '#334155' : tile === 5 ? '#475569' : 'transparent'">
                                    @if (tile === 5) {
                                        <div class="w-full h-full bg-[#374151] relative">
                                            <div class="absolute top-1 left-1 w-1 h-1 bg-[#fcd34d] shadow-[0_0_5px_#fcd34d]"></div>
                                        </div>
                                    }
                                    @if (tile === 2) { <div class="absolute inset-1 bg-red-900/50"><div class="w-1 h-1 bg-red-500 rounded-full animate-ping"></div></div> }
                                    @if (tile === 3) { <div class="absolute inset-1 flex items-center justify-center animate-bounce"><div class="w-[60%] h-[40%] bg-yellow-500 border border-yellow-700"></div></div> }
                                    @if (tile === 4) { <div class="absolute inset-1 flex items-center justify-center animate-pulse"><div class="w-[40%] h-[40%] bg-blue-400 rotate-45 border border-white"></div></div> }
                                  </div>
                                }
                            </div>
                          }
                      }

                      <!-- Render NPCs -->
                      @for (npc of npcs(); track npc.x + ',' + npc.y) {
                        <div class="absolute z-10 transition-all duration-300"
                             [style.left]="(npc.x / currentWidth() * 100) + '%'"
                             [style.top]="(npc.y / currentHeight() * 100) + '%'"
                             [style.width]="(100 / currentWidth()) + '%'"
                             [style.height]="(100 / currentHeight()) + '%'">
                           <div class="w-full h-full flex items-center justify-center relative">
                              <div class="w-[70%] h-[80%] bg-green-700 rounded-t-lg relative shadow-md">
                                 @if(npc.activeQuest && !npc.activeQuest.isCompleted) {
                                    <div class="absolute -top-3 left-1/2 -translate-x-1/2 text-yellow-400 font-bold text-xs animate-bounce">!</div>
                                 } @else if (npc.role === 'SHOPKEEPER') {
                                    <div class="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] text-yellow-300">$</div>
                                 }
                              </div>
                           </div>
                        </div>
                      }

                      <!-- Render Enemies -->
                      @for (enemy of enemies(); track enemy.id) {
                         <div class="absolute z-10 transition-all duration-300"
                              [style.left]="(enemy.x / currentWidth() * 100) + '%'"
                              [style.top]="(enemy.y / currentHeight() * 100) + '%'"
                              [style.width]="(100 / currentWidth()) + '%'"
                              [style.height]="(100 / currentHeight()) + '%'">
                            <div class="w-full h-full flex items-center justify-center relative" [class.animate-pulse]="enemy.flash">
                               <div class="w-[70%] h-[70%] relative" [class.text-[#ef4444]]="enemy.isElite" [class.text-white]="!enemy.isElite">
                                  <div class="w-full h-full bg-current rounded-sm"></div>
                               </div>
                            </div>
                         </div>
                      }

                      <!-- Render Player -->
                      <div class="absolute z-20 transition-all duration-200"
                           [style.left]="(playerPos().x / currentWidth() * 100) + '%'"
                           [style.top]="(playerPos().y / currentHeight() * 100) + '%'"
                           [style.width]="(100 / currentWidth()) + '%'"
                           [style.height]="(100 / currentHeight()) + '%'">
                         <div class="w-full h-full flex items-center justify-center">
                            <div class="w-[60%] h-[80%] bg-blue-500 rounded-sm relative shadow-lg ring-1 ring-blue-300">
                               <div class="absolute top-1 left-1 right-1 h-[30%] bg-pink-300 rounded-sm"></div>
                            </div>
                         </div>
                      </div>

                    </div>
                 </div>

                 <!-- OVERLAYS -->
                 @if (state() === 'DIALOGUE') { <app-dialogue [data]="dialogueData()"></app-dialogue> }
                 @if (state() === 'SHOP') { <app-shop [npcName]="currentNpc()?.name || 'SHOP'" [items]="shopItems()" [cursor]="shopCursor()" [score]="score()"></app-shop> }
                 @if (state() === 'INVENTORY') { <app-inventory [items]="inventory()" [cursor]="inventoryCursor()" [stats]="playerStats()"></app-inventory> }

                 <footer class="absolute bottom-0 left-0 right-0 h-6 bg-[#1f2937]/90 z-20 flex items-center justify-between px-2 border-t border-gray-700">
                    <span class="text-[0.55rem] text-gray-400 font-mono truncate max-w-[70%]">{{ message() }}</span>
                    @if(state() === 'GAME_OVER') { <span class="text-[0.55rem] text-red-500 font-bold animate-pulse">RESTART?</span> }
                 </footer>
              </div>
            }

        </div>
      </div>
    </section>
  `,
  styles: [`
    .screen-bezel { box-shadow: inset 0 2px 5px rgba(255,255,255,0.1), inset 0 -2px 5px rgba(0,0,0,0.3), 5px 5px 15px rgba(0,0,0,0.5); }
    .lcd-screen { background-image: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); background-size: 100% 2px, 3px 100%; }
    .animate-shake { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
    @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .animate-pulse-subtle { animation: pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
    @keyframes pulseSubtle { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  `]
})
export class GameScreenComponent {
  state = input.required<GameState>();
  score = input.required<number>();
  chunkCoords = input.required<{x: number, y: number}>();
  currentChunk = input.required<WorldChunk | null>();
  worldMap = input.required<Map<string, WorldChunk>>();
  playerPos = input.required<{x: number, y: number}>();
  message = input.required<string>();
  powerOn = input.required<boolean>();
  playerStats = input.required<PlayerStats>();
  enemies = input.required<ActiveEnemy[]>();
  npcs = input.required<NPCSpawn[]>();
  shakeScreen = input.required<boolean>();
  
  availableClasses = input.required<CharacterClass[]>();
  selectedClassIdx = input.required<number>();
  
  inventory = input.required<InventoryItem[]>();
  inventoryCursor = input.required<number>();
  levelUpCursor = input<number>(0);

  dialogueData = input.required<DialogueData | null>();
  shopItems = input.required<InventoryItem[]>();
  shopCursor = input.required<number>();
  currentNpc = input<NPCSpawn | null>(null);

  isFullScreen = input.required<boolean>();
  
  // Title Screen Inputs
  titleCursor = input<number>(0);
  hasSaveGame = input<boolean>(false);

  gameGridRef = viewChild<ElementRef>('gameGrid');
  gridSize = signal<{width: number, height: number}>({width: 300, height: 225}); // default 4:3

  currentWidth = computed(() => this.currentChunk()?.width ?? 20);
  currentHeight = computed(() => this.currentChunk()?.height ?? 15);

  constructor() {
     effect((onCleanup) => {
        const el = this.gameGridRef()?.nativeElement;
        const cw = this.currentWidth();
        const ch = this.currentHeight();

        if (!el) return;
        
        const obs = new ResizeObserver(entries => {
           for (const entry of entries) {
              const { width, height } = entry.contentRect;
              // Target aspect ratio based on chunk size (20:15 = 4:3)
              let w = width;
              let h = width * (ch / cw); 
              
              if (h > height) {
                 h = height;
                 w = height * (cw / ch);
              }
              this.gridSize.set({width: w, height: h});
           }
        });
        obs.observe(el);
        onCleanup(() => obs.disconnect());
     });
  }

  // Map logic helper
  mapGrid = computed(() => {
     const map = this.worldMap();
     const keys = Array.from(map.keys());
     if (keys.length === 0) return { width: 1, height: 1, cells: [] };

     const coords = keys.map((k: string) => {
        const [x, y] = k.split(',').map(Number);
        return { x, y, chunk: map.get(k)! };
     });

     const minX = Math.min(...coords.map(c => c.x));
     const maxX = Math.max(...coords.map(c => c.x));
     const minY = Math.min(...coords.map(c => c.y));
     const maxY = Math.max(...coords.map(c => c.y));

     const width = maxX - minX + 1;
     const height = maxY - minY + 1;
     
     const cells = [];
     for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
           const found = coords.find(c => c.x === x && c.y === y);
           cells.push(found ? { ...found.chunk, x, y } : null);
        }
     }

     return { width, height, cells };
  });
}
