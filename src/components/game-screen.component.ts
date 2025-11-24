
import { Component, input, computed, effect, signal, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorldChunk, NPCSpawn } from '../services/gemini-game.service';

export type GameState = 'BOOT' | 'CLASS_SELECT' | 'LOADING' | 'PLAYING' | 'GAME_OVER' | 'INVENTORY' | 'DIALOGUE' | 'SHOP' | 'MAP';

export interface ActiveEnemy {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  name: string;
  isElite?: boolean;
  flash?: boolean;
}

export interface CharacterClass {
  name: string;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  weapon: string;
  armor: string;
  desc: string;
  ability: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'POTION_HP' | 'POTION_MP' | 'ELIXIR';
  desc: string;
  count: number;
  cost?: number; // For shops
}

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

export interface DialogueData {
  npcName: string;
  text: string;
  isShopkeeper: boolean;
}

@Component({
  selector: 'app-game-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Main Screen Container -->
    <div class="transition-all duration-300 w-full h-full relative flex flex-col"
         [class.screen-bezel]="!isFullScreen()"
         [class.bg-[#5c5f68]]="!isFullScreen()"
         [class.rounded-2xl]="!isFullScreen()"
         [class.sm:rounded-3xl]="!isFullScreen()"
         [class.p-3]="!isFullScreen()"
         [class.sm:p-5]="!isFullScreen()"
         [class.shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]]="!isFullScreen()"
         [class.p-0]="isFullScreen()"
         [class.bg-black]="isFullScreen()">
      
      @if (!isFullScreen()) {
        <!-- Power LED -->
        <div class="absolute top-[40%] left-2 sm:left-3 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] z-20">
           <div class="w-full h-full rounded-full bg-red-500 opacity-0 transition-opacity duration-300 shadow-[0_0_5px_#ef4444]" 
                [class.opacity-100]="powerOn()" [class.animate-pulse-subtle]="powerOn()"></div>
        </div>
        <div class="absolute top-[48%] left-[0.3rem] sm:left-2 text-[0.3rem] sm:text-[0.4rem] text-gray-400 font-bold tracking-widest font-sans transform -rotate-90 origin-center">BATTERY</div>
      }

      <!-- The LCD Screen Area -->
      <div class="lcd-screen flex-1 w-full bg-[#0f1218] overflow-hidden font-mono select-none flex flex-col items-center justify-center relative"
           [class.border-4]="!isFullScreen()"
           [class.border-[#374151]]="!isFullScreen()"
           [class.shadow-[inset_0_5px_15px_rgba(0,0,0,0.5)]]="!isFullScreen()"
           [class.rounded-sm]="!isFullScreen()">
        
        <!-- CONTENT LAYERS -->
        <div class="relative z-0 w-full h-full flex flex-col text-[#e0e7ff]">
            
            <!-- Boot Screen -->
            @if (state() === 'BOOT') {
              <div class="w-full h-full flex flex-col items-center justify-center animate-fade-in bg-[#1a1c23]">
                 <div class="text-[#e0e7ff] text-3xl sm:text-5xl font-black tracking-[0.2em] animate-slide-down drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">GEMINI</div>
                 <div class="text-[#9ca3af] text-xs sm:text-sm mt-4 tracking-widest font-bold">Licensed by Google</div>
              </div>
            }

            <!-- Class Selection -->
            @if (state() === 'CLASS_SELECT') {
              <div class="w-full h-full flex flex-col items-center pt-6 bg-[#1a1c23]">
                 <h2 class="text-white text-lg font-bold mb-4 border-b-2 border-white pb-1 tracking-wider">SELECT CLASS</h2>
                 
                 <div class="w-full max-w-xs space-y-4 px-4">
                   @for (cls of availableClasses(); track cls.name; let i = $index) {
                     <div class="flex items-center gap-2 transition-all duration-200" 
                          [class.opacity-60]="i !== selectedClassIdx()"
                          [class.scale-105]="i === selectedClassIdx()">
                        <!-- Cursor -->
                        <div class="w-4 text-white font-bold text-xl">
                           @if(i === selectedClassIdx()) { ► }
                        </div>
                        
                        <div class="flex-1 border-2 border-gray-600 p-2 bg-[#2a2d38] shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
                           <div class="flex justify-between items-center mb-1 border-b border-gray-500 pb-1">
                              <span class="font-bold text-white text-lg">{{ cls.name }}</span>
                              <!-- Mini Icon -->
                              <div class="w-6 h-6">
                                @if (cls.name === 'WARRIOR') {
                                  <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-md">
                                    <path d="M6 12 L4 14 L2 12 L4 2 L6 0 L8 2 L10 12 L8 14 L6 12 Z" fill="#9ca3af"/>
                                    <path d="M5 12 L4 13 L3 12 L4 4 L5 3 Z" fill="#e5e7eb"/>
                                    <rect x="5" y="4" width="2" height="8" fill="#4b5563"/>
                                  </svg>
                                } @else {
                                  <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-md">
                                     <path d="M8 2 L6 4 L6 14 L10 14 L10 4 Z" fill="#a78bfa"/>
                                     <circle cx="8" cy="3" r="2" fill="#c4b5fd" stroke="#4c1d95" stroke-width="0.5"/>
                                  </svg>
                                }
                              </div>
                           </div>
                           <div class="text-[0.6rem] leading-tight text-gray-300 mb-2 font-bold">{{ cls.desc }}</div>
                           <div class="text-[0.6rem] leading-tight text-[#fb7185] font-bold mb-1 uppercase tracking-wider">★ {{ cls.ability }}</div>
                           
                           <!-- Stats Grid -->
                           <div class="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-[0.55rem] font-bold text-gray-400">
                              <div class="flex justify-between bg-black/20 px-1 rounded"><span>HP</span> <span class="text-white">{{ cls.hp }}</span></div>
                              <div class="flex justify-between bg-black/20 px-1 rounded"><span>MP</span> <span class="text-white">{{ cls.mp }}</span></div>
                              <div class="flex justify-between bg-black/20 px-1 rounded"><span>ATK</span> <span class="text-white">{{ cls.atk }}</span></div>
                              <div class="flex justify-between bg-black/20 px-1 rounded"><span>DEF</span> <span class="text-white">{{ cls.def }}</span></div>
                           </div>
                        </div>
                     </div>
                   }
                 </div>
                 
                 <div class="mt-auto mb-6 text-white text-xs animate-pulse font-bold tracking-widest">PRESS START</div>
              </div>
            }

            <!-- Loading Screen -->
            @if (state() === 'LOADING') {
              <div class="w-full h-full flex flex-col items-center justify-center bg-[#1a1c23]">
                 <div class="relative w-16 h-16 mb-4">
                    <div class="absolute inset-0 border-4 border-t-[#6366f1] border-r-[#6366f1] border-b-[#1f2937] border-l-[#1f2937] rounded-full animate-spin"></div>
                 </div>
                 <div class="text-white text-lg font-bold animate-pulse tracking-widest">GENERATING</div>
                 <div class="text-[#9ca3af] text-xs mt-2 text-center px-8 leading-tight max-w-md font-mono border-t border-[#4b5563] pt-2">{{ message() }}</div>
              </div>
            }

            <!-- World Map -->
            @if (state() === 'MAP') {
              <div class="absolute inset-0 z-50 bg-[#1f2937] flex flex-col p-4 animate-fade-in">
                <div class="flex justify-between items-end border-b-2 border-gray-600 pb-2 mb-4">
                  <h2 class="text-white text-lg font-black tracking-widest">SECTOR MAP</h2>
                  <span class="text-[0.55rem] text-gray-400 font-bold mb-1">POS: {{chunkCoords().x}},{{chunkCoords().y}}</span>
                </div>

                <div class="flex-1 overflow-auto flex items-center justify-center relative bg-black/30 rounded shadow-inner custom-scrollbar">
                   @if (mapGrid(); as grid) {
                      <div class="grid gap-1 p-4 transition-all"
                           [style.grid-template-columns]="'repeat(' + grid.cols + ', minmax(0, 1fr))'">
                         @for (cell of grid.cells; track cell.id) {
                            <div class="w-8 h-8 sm:w-10 sm:h-10 border border-white/10 flex items-center justify-center relative rounded-sm transition-colors"
                                 [style.background-color]="cell.color"
                                 [class.opacity-10]="!cell.discovered"
                                 [class.opacity-100]="cell.discovered">
                               
                               @if (cell.discovered) {
                                  @if (cell.isCity) {
                                     <div class="text-[0.8rem] sm:text-[1rem] drop-shadow-md">🏠</div>
                                  }
                               } @else {
                                  <div class="w-1 h-1 rounded-full bg-white/20"></div>
                               }
                               
                               <!-- Player Marker -->
                               @if (cell.x === chunkCoords().x && cell.y === chunkCoords().y) {
                                  <div class="absolute inset-[-4px] border-2 border-white animate-pulse rounded-sm shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10"></div>
                                  <div class="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping absolute z-10"></div>
                               }
                            </div>
                         }
                      </div>
                   }
                </div>
                <div class="mt-4 text-[0.6rem] text-gray-400 font-bold tracking-wide text-center flex justify-center gap-4">
                   <div class="flex items-center gap-1"><div class="w-2 h-2 border border-white bg-red-500 rounded-full"></div> YOU</div>
                   <div class="flex items-center gap-1"><span>🏠</span> CITY</div>
                   <div class="flex items-center gap-1"><div class="w-2 h-2 bg-[#1f2937] border border-white/20"></div> UNKNOWN</div>
                </div>
                <div class="text-center mt-2 text-[0.55rem] text-gray-500 font-mono">[SELECT] TO CLOSE</div>
              </div>
            }

            <!-- Inventory Screen -->
            @if (state() === 'INVENTORY') {
               <div class="w-full h-full flex flex-col bg-[#1f2937] p-4 font-mono z-50">
                  <div class="flex justify-between items-end border-b-4 border-gray-700 mb-4 pb-1">
                     <h2 class="text-white text-lg font-black tracking-widest shadow-black drop-shadow-md">PACK</h2>
                     <span class="text-gray-400 text-[0.6rem] font-bold mb-1">HP:{{playerStats().hp}}/{{playerStats().maxHp}}</span>
                  </div>
                  
                  <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      @if (inventory().length === 0) {
                          <div class="h-full flex items-center justify-center text-gray-500 font-bold text-xs tracking-widest">- EMPTY -</div>
                      } @else {
                          <div class="space-y-2">
                             @for (item of inventory(); track item.id; let i = $index) {
                                <div class="flex items-center gap-2 p-1 transition-colors border border-transparent rounded"
                                     [class.bg-white]="i === inventoryCursor()"
                                     [class.text-black]="i === inventoryCursor()"
                                     [class.border-white]="i === inventoryCursor()"
                                     [class.text-white]="i !== inventoryCursor()">
                                    <div class="w-4 text-center font-black text-sm">
                                        @if (i === inventoryCursor()) { ► }
                                    </div>
                                    <div class="flex-1 flex justify-between items-center">
                                        <div class="flex items-center gap-2">
                                            <!-- Tiny Item Icon -->
                                            <div class="w-3 h-3 flex items-center justify-center">
                                                @if(item.type.includes('POTION_HP')) {
                                                    <div class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_2px_#f87171]"></div>
                                                } @else if(item.type.includes('POTION_MP')) {
                                                    <div class="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_2px_#60a5fa]"></div>
                                                } @else {
                                                    <div class="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_2px_#facc15]"></div>
                                                }
                                            </div>
                                            <span class="font-bold text-xs tracking-wide">{{ item.name }}</span>
                                        </div>
                                        <span class="font-bold text-xs">x{{ item.count }}</span>
                                    </div>
                                </div>
                             }
                          </div>
                      }
                  </div>

                  <!-- Item Description -->
                  <div class="h-20 bg-black/50 text-white mt-4 p-2 border-2 border-gray-600 rounded flex flex-col justify-between">
                      @if (inventory().length > 0) {
                          <p class="text-[0.65rem] leading-snug tracking-wide font-bold text-yellow-100">
                              {{ inventory()[inventoryCursor()].desc }}
                          </p>
                          <div class="flex justify-between items-end">
                            <div class="text-[0.5rem] text-gray-400 font-bold">{{ inventory()[inventoryCursor()].type }}</div>
                            <div class="text-[0.55rem] text-green-400 text-right animate-pulse font-bold">PRESS A TO USE</div>
                          </div>
                      }
                  </div>
                  
                  <div class="flex justify-end mt-2">
                      <span class="text-[0.5rem] font-black text-gray-400 tracking-wider">[B] BACK</span>
                  </div>
               </div>
            }

            <!-- Playing State -->
            @if (state() === 'PLAYING' || state() === 'GAME_OVER' || state() === 'DIALOGUE' || state() === 'SHOP') {
              
              <!-- HUD -->
              <div class="flex-none flex justify-between items-start border-b-2 border-black/50 bg-[#2a2d38] z-10 relative px-2 py-1.5 shadow-md">
                 <!-- Stats -->
                 <div class="flex flex-col gap-1">
                    <!-- HP -->
                    <div class="flex gap-1 items-center">
                      <span class="text-[0.5rem] font-black w-5 tracking-tighter text-[#fb7185] drop-shadow-sm">HP</span>
                      <div class="flex gap-[1px]">
                        @for (heart of [].constructor(playerStats().maxHp); track $index) {
                           <div class="w-2 h-2 sm:w-2.5 sm:h-2.5 relative bg-black/40 border border-gray-600">
                              @if ($index < playerStats().hp) {
                                <div class="absolute inset-[1px] bg-gradient-to-br from-red-500 to-red-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"></div>
                              }
                           </div>
                        }
                      </div>
                    </div>
                    <!-- MP -->
                    <div class="flex gap-1 items-center">
                      <span class="text-[0.5rem] font-black w-5 tracking-tighter text-[#818cf8] drop-shadow-sm">MP</span>
                      <div class="flex gap-[1px]">
                        @for (orb of [].constructor(playerStats().maxMp); track $index) {
                            <div class="w-2 h-2 sm:w-2.5 sm:h-2.5 relative bg-black/40 border border-gray-600 rounded-full">
                              @if ($index < playerStats().mp) {
                                <div class="absolute inset-[1px] bg-gradient-to-br from-blue-400 to-blue-600 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"></div>
                              }
                           </div>
                        }
                      </div>
                    </div>
                 </div>

                 <!-- Info -->
                 <div class="flex flex-col items-end">
                    <div class="text-[0.5rem] font-bold text-gray-400">LVL {{ playerStats().level }}</div>
                    <div class="text-[0.5rem] font-bold text-[#facc15] tracking-wide">$ {{ score() }}</div>
                 </div>
              </div>

              <!-- Messages -->
              <div class="absolute top-12 left-0 right-0 z-30 flex justify-center pointer-events-none px-4">
                 @if (message() && state() === 'PLAYING') {
                   <div class="bg-black/80 text-white px-3 py-1 rounded text-[0.6rem] font-bold tracking-wide shadow-lg border border-gray-600 animate-fade-out-up text-center">
                      {{ message() }}
                   </div>
                 }
              </div>

              <!-- GAME WORLD (GRID) -->
              <div #mapContainer class="flex-1 relative overflow-hidden flex items-center justify-center w-full h-full"
                   [class.p-2]="!isFullScreen()"
                   [class.p-0]="isFullScreen()"
                   [style.background-color]="themeColors().bg">
                 
                 <!-- Shake Container -->
                 <div class="relative transition-transform duration-75"
                      [class.translate-x-1]="shakeScreen()"
                      [class.translate-x-[-1]]="!shakeScreen() && shakeScreen()" 
                      [style.width.px]="gridWidth()" [style.height.px]="gridHeight()">

                    <!-- Tiles -->
                     @if (currentChunk()) {
                        @for (row of currentChunk()!.layout; track ri; let ri = $index) {
                          <div class="flex">
                            @for (cell of row; track ci; let ci = $index) {
                              <div class="relative" [style.width.px]="cellSize()" [style.height.px]="cellSize()">
                                 
                                 <!-- FLOOR LAYER with Texture -->
                                 <div class="absolute inset-0 opacity-100">
                                     <svg viewBox="0 0 16 16" class="w-full h-full" style="shape-rendering: crispEdges;">
                                        <!-- Base Floor Color -->
                                        <rect width="16" height="16" [attr.fill]="(ri+ci)%2===0 ? themeColors().floorA : themeColors().floorB" />
                                        
                                        <!-- Biome Texture Details -->
                                        @if (biome() === 'FOREST' || biome() === 'GRASS') {
                                           <!-- Grass Tufts -->
                                           @if ((ri * 7 + ci * 3) % 4 === 0) {
                                              <path d="M3 14 L3 11 M5 14 L5 10 M7 14 L7 12" stroke="#14532d" stroke-width="1" opacity="0.3" fill="none"/>
                                           }
                                           @if ((ri * 2 + ci * 5) % 7 === 0) {
                                              <circle cx="10" cy="5" r="1" fill="#14532d" opacity="0.2"/>
                                           }
                                        } @else if (biome() === 'DESERT') {
                                           <!-- Sand Ripples -->
                                           <path d="M2 4 Q8 2 14 4" stroke="#c2410c" stroke-width="0.5" opacity="0.2" fill="none"/>
                                           <path d="M2 12 Q8 10 14 12" stroke="#c2410c" stroke-width="0.5" opacity="0.2" fill="none"/>
                                           @if((ri+ci)%5===0) { <circle cx="8" cy="8" r="0.5" fill="#7c2d12" opacity="0.4"/> }
                                        } @else if (biome() === 'SCIFI') {
                                           <!-- Tech Grid/Bolts -->
                                            <rect x="1" y="1" width="14" height="14" stroke="#475569" stroke-width="0.5" fill="none" opacity="0.3"/>
                                            <rect x="2" y="2" width="1" height="1" fill="#94a3b8" opacity="0.5"/>
                                            <rect x="13" y="2" width="1" height="1" fill="#94a3b8" opacity="0.5"/>
                                            <rect x="2" y="13" width="1" height="1" fill="#94a3b8" opacity="0.5"/>
                                            <rect x="13" y="13" width="1" height="1" fill="#94a3b8" opacity="0.5"/>
                                        } @else if (biome() === 'SNOW') {
                                            <!-- Ice Cracks -->
                                            <path d="M4 4 L8 8 L12 4" stroke="#bae6fd" stroke-width="0.5" opacity="0.5" fill="none"/>
                                            <circle cx="2" cy="14" r="1" fill="#fff" opacity="0.4"/>
                                        } @else if (biome() === 'MAGMA') {
                                            <!-- Ash Spots -->
                                            <circle cx="5" cy="5" r="1" fill="#1c1917" opacity="0.3"/>
                                            <circle cx="12" cy="12" r="2" fill="#1c1917" opacity="0.2"/>
                                        }
                                     </svg>
                                 </div>
                                 
                                 <!-- Wall (1) -->
                                 @if (cell === 1) {
                                    <div class="absolute inset-0 flex items-center justify-center z-10">
                                       <!-- Shadow Base -->
                                       <div class="absolute bottom-0 left-0.5 right-0.5 h-2 bg-black/30 rounded-full blur-[1px]"></div>
                                       
                                       <!-- Dynamic Obstacle based on Biome -->
                                       <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-md">
                                          @if (biome() === 'FOREST') {
                                             <!-- Pine Tree -->
                                             <path d="M8 1 L3 9 L5 9 L2 14 L14 14 L11 9 L13 9 Z" fill="#15803d" stroke="#064e3b" stroke-width="0.5"/>
                                             <rect x="7" y="14" width="2" height="2" fill="#451a03"/>
                                             <path d="M6 9 L8 5 L10 9" fill="none" stroke="#22c55e" stroke-width="0.5" opacity="0.5"/>
                                          } @else if (biome() === 'SNOW') {
                                             <!-- Ice Pillar -->
                                             <path d="M4 14 L2 10 L6 4 L12 2 L14 8 L10 14 Z" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="0.5"/>
                                             <path d="M6 4 L8 10 M12 2 L8 10 M14 8 L8 10" stroke="#bae6fd" stroke-width="0.5"/>
                                          } @else if (biome() === 'DESERT') {
                                             <!-- Rock Formation -->
                                             <path d="M2 14 L4 8 L8 6 L12 8 L14 14 Z" fill="#ca8a04" stroke="#a16207" stroke-width="0.5"/>
                                             <path d="M4 8 L8 10 L12 8" fill="none" stroke="#a16207" stroke-width="0.5"/>
                                             <rect x="9" y="4" width="2" height="6" rx="1" fill="#65a30d"/> <!-- Tiny cactus on rock -->
                                          } @else if (biome() === 'SCIFI') {
                                             <!-- Server Block -->
                                             <rect x="2" y="1" width="12" height="14" fill="#334155" stroke="#1e293b" stroke-width="1"/>
                                             <rect x="3" y="2" width="10" height="2" fill="#0f172a"/>
                                             <circle cx="4" cy="3" r="0.5" fill="#f43f5e" class="animate-pulse"/>
                                             <circle cx="6" cy="3" r="0.5" fill="#10b981"/>
                                             <rect x="3" y="5" width="10" height="2" fill="#0f172a"/>
                                             <rect x="3" y="8" width="10" height="6" fill="#0f172a"/>
                                             <path d="M4 9 H12 M4 11 H12 M4 13 H12" stroke="#475569" stroke-width="0.5"/>
                                          } @else if (biome() === 'MAGMA') {
                                              <!-- Volcanic Rock -->
                                              <path d="M1 14 L4 4 L12 2 L15 14 Z" fill="#450a0a" stroke="#7f1d1d" stroke-width="1"/>
                                              <path d="M4 4 L8 14 L12 2" stroke="#7f1d1d" stroke-width="0.5" fill="none"/>
                                              <circle cx="10" cy="10" r="1" fill="#ef4444" class="animate-pulse"/>
                                          } @else {
                                             <!-- Stone Block (Default) -->
                                             <rect x="1" y="1" width="14" height="14" fill="#78716c"/>
                                             <rect x="2" y="2" width="12" height="12" stroke="#44403c" stroke-width="1" fill="none"/>
                                             <path d="M1 15 L15 1" stroke="#57534e" stroke-width="0.5" opacity="0.5"/>
                                          }
                                       </svg>
                                    </div>
                                 }
                                 
                                 <!-- Hazard (2) -->
                                 @if (cell === 2) {
                                    <div class="absolute inset-[2px] bg-red-900/40 animate-pulse border border-red-500/50 z-0">
                                       <svg viewBox="0 0 16 16" class="w-full h-full opacity-80">
                                          <path d="M2 14 L8 2 L14 14 H2 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="1"/>
                                          <rect x="7.5" y="6" width="1" height="5" fill="#fff"/>
                                          <rect x="7.5" y="12" width="1" height="1" fill="#fff"/>
                                       </svg>
                                    </div>
                                 }

                                 <!-- Treasure (3) -->
                                 @if (cell === 3) {
                                     <div class="absolute inset-1 flex items-center justify-center animate-bounce z-10">
                                         <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-sm">
                                            <rect x="2" y="6" width="12" height="8" fill="#ca8a04" stroke="#854d0e" stroke-width="1"/>
                                            <path d="M2 6 L14 6 L12 3 L4 3 Z" fill="#fbbf24" stroke="#854d0e" stroke-width="1"/>
                                            <circle cx="8" cy="8" r="1.5" fill="#1e293b"/> <!-- Lock -->
                                            <circle cx="8" cy="8" r="0.5" fill="#facc15"/>
                                         </svg>
                                     </div>
                                 }

                                 <!-- Item Drop (4) -->
                                 @if (cell === 4) {
                                     <div class="absolute inset-1 flex items-center justify-center animate-pulse z-10">
                                         <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">
                                            <circle cx="8" cy="8" r="5" fill="#3b82f6" opacity="0.6"/>
                                            <path d="M8 3 L9 7 L13 8 L9 9 L8 13 L7 9 L3 8 L7 7 Z" fill="#eff6ff"/>
                                         </svg>
                                     </div>
                                 }

                                 <!-- Building/House (5) -->
                                 @if (cell === 5) {
                                    <div class="absolute inset-0 flex items-center justify-center z-10">
                                       <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-lg">
                                          <!-- House Base -->
                                          <rect x="2" y="6" width="12" height="9" fill="#e7e5e4" stroke="#57534e" stroke-width="1"/>
                                          <!-- Roof -->
                                          <path d="M1 7 L8 1 L15 7" fill="#be123c" stroke="#881337" stroke-width="1"/>
                                          <!-- Door -->
                                          <rect x="6" y="10" width="4" height="5" fill="#451a03"/>
                                          <!-- Window -->
                                          <rect x="3" y="8" width="2" height="2" fill="#93c5fd" stroke="#2563eb" stroke-width="0.5"/>
                                          <rect x="11" y="8" width="2" height="2" fill="#93c5fd" stroke="#2563eb" stroke-width="0.5"/>
                                       </svg>
                                    </div>
                                 }
                              </div>
                            }
                          </div>
                        }
                     }

                     <!-- RENDER ENEMIES -->
                     @for (enemy of enemies(); track enemy.id) {
                        <div class="absolute transition-all duration-300 ease-in-out z-10"
                             [style.left.px]="enemy.x * cellSize()"
                             [style.top.px]="enemy.y * cellSize()"
                             [style.width.px]="cellSize()"
                             [style.height.px]="cellSize()">
                           <div class="w-full h-full p-1" 
                                [class.animate-shake]="enemy.flash"
                                [class.hue-rotate-90]="enemy.isElite">
                              <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-md">
                                 @switch(enemy.type) {
                                     @case('SLIME') {
                                        <path d="M3 13 Q1 13 1 10 Q1 5 8 5 Q15 5 15 10 Q15 13 13 13 Z" fill="#84cc16"/>
                                        <path d="M3 12 Q5 14 8 12 Q11 14 13 12" fill="#65a30d" opacity="0.5"/>
                                        <rect x="5" y="8" width="2" height="2" fill="black"/>
                                        <rect x="9" y="8" width="2" height="2" fill="black"/>
                                        <rect x="6" y="8" width="1" height="1" fill="white"/>
                                        <rect x="10" y="8" width="1" height="1" fill="white"/>
                                     }
                                     @case('RAT') {
                                        <path d="M12 11 Q12 6 8 6 Q3 6 3 11 Z" fill="#78716c"/>
                                        <circle cx="4" cy="11" r="1.5" fill="#fca5a5"/> <!-- Ear -->
                                        <circle cx="12" cy="11" r="1.5" fill="#fca5a5"/> <!-- Ear -->
                                        <circle cx="6" cy="9" r="0.5" fill="red"/> <!-- Eye -->
                                        <circle cx="10" cy="9" r="0.5" fill="red"/> <!-- Eye -->
                                        <path d="M8 11 L7 13 L9 13 Z" fill="pink"/> <!-- Nose -->
                                        <path d="M2 10 Q0 8 2 5" stroke="pink" stroke-width="1" fill="none"/>
                                     }
                                     @case('SKELETON') {
                                        <rect x="5" y="2" width="6" height="5" rx="1" fill="#e5e5e5"/>
                                        <rect x="6" y="3" width="1" height="1" fill="black"/>
                                        <rect x="9" y="3" width="1" height="1" fill="black"/>
                                        <rect x="7" y="5" width="2" height="1" fill="black"/> <!-- Mouth -->
                                        <rect x="7" y="7" width="2" height="3" fill="#e5e5e5"/> <!-- Spine -->
                                        <line x1="5" y1="8" x2="11" y2="8" stroke="#e5e5e5" stroke-width="1"/> <!-- Ribs -->
                                        <line x1="6" y1="13" x2="5" y2="15" stroke="#e5e5e5" stroke-width="1"/>
                                        <line x1="10" y1="13" x2="11" y2="15" stroke="#e5e5e5" stroke-width="1"/>
                                     }
                                     @case('GHOST') {
                                        <path d="M3 14 Q3 2 8 2 Q13 2 13 14 L11 11 L9 14 L7 11 L5 14 L3 11 Z" fill="#c084fc" opacity="0.9"/>
                                        <circle cx="6" cy="6" r="1.5" fill="black"/>
                                        <circle cx="10" cy="6" r="1.5" fill="black"/>
                                        <circle cx="5.5" cy="5.5" r="0.5" fill="white"/>
                                     }
                                     @case('ROBOT') {
                                        <rect x="3" y="2" width="10" height="8" fill="#475569" stroke="#94a3b8" stroke-width="1"/>
                                        <rect x="4" y="4" width="8" height="2" fill="#0ea5e9" class="animate-pulse"/>
                                        <circle cx="5" cy="13" r="2" fill="#64748b"/> <!-- Wheel -->
                                        <circle cx="11" cy="13" r="2" fill="#64748b"/> <!-- Wheel -->
                                        <path d="M2 5 L3 5 M13 5 L14 5" stroke="#94a3b8" stroke-width="1"/>
                                     }
                                     @case('ALIEN') {
                                         <path d="M3 6 C3 0, 13 0, 13 6 C13 12, 8 15, 8 15 C8 15, 3 12, 3 6" fill="#10b981"/>
                                         <ellipse cx="5" cy="6" rx="1.5" ry="2.5" fill="black" transform="rotate(-15 5 6)"/>
                                         <ellipse cx="11" cy="6" rx="1.5" ry="2.5" fill="black" transform="rotate(15 11 6)"/>
                                     }
                                 }
                              </svg>
                              <!-- HP Bar -->
                              <div class="absolute -top-1 left-0 right-0 h-1 bg-black/50">
                                 <div class="h-full bg-red-500" [style.width.%]="(enemy.hp / enemy.maxHp) * 100"></div>
                              </div>
                           </div>
                        </div>
                     }

                     <!-- RENDER NPCs -->
                     @for (npc of npcs(); track npc.name) {
                        <div class="absolute transition-all duration-300 ease-in-out z-10"
                             [style.left.px]="npc.x * cellSize()"
                             [style.top.px]="npc.y * cellSize()"
                             [style.width.px]="cellSize()"
                             [style.height.px]="cellSize()">
                            <div class="w-full h-full p-0.5">
                               <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-md">
                                  @if (npc.role === 'SHOPKEEPER') {
                                     <rect x="4" y="5" width="8" height="9" fill="#d97706"/> <!-- Apron -->
                                     <circle cx="8" cy="4" r="3" fill="#fde047"/> <!-- Head -->
                                     <path d="M3 4 L13 4" stroke="#78350f" stroke-width="2"/> <!-- Hat brim -->
                                     <rect x="5" y="1" width="6" height="3" fill="#78350f"/> <!-- Hat top -->
                                  } @else if (npc.role === 'GUARD') {
                                     <rect x="4" y="5" width="8" height="9" fill="#94a3b8"/> <!-- Armor -->
                                     <circle cx="8" cy="4" r="3" fill="#cbd5e1"/> <!-- Head -->
                                     <path d="M4 2 L12 2 L12 5 L8 6 L4 5 Z" fill="#475569"/> <!-- Helm -->
                                     <line x1="13" y1="6" x2="13" y2="15" stroke="#fff" stroke-width="1"/> <!-- Spear -->
                                  } @else {
                                     <!-- Villager -->
                                     <rect x="5" y="6" width="6" height="8" fill="#4ade80"/>
                                     <circle cx="8" cy="4" r="3" fill="#fca5a5"/>
                                     <rect x="5" y="2" width="6" height="2" fill="#166534"/> <!-- Hair -->
                                  }
                               </svg>
                               <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border border-black flex items-center justify-center animate-bounce">
                                 <span class="text-[0.4rem] font-bold text-black">!</span>
                               </div>
                            </div>
                        </div>
                     }

                     <!-- RENDER PLAYER -->
                     <div class="absolute transition-all duration-150 z-20"
                          [style.left.px]="playerPos().x * cellSize()"
                          [style.top.px]="playerPos().y * cellSize()"
                          [style.width.px]="cellSize()"
                          [style.height.px]="cellSize()">
                        <div class="w-full h-full p-0.5" [class.animate-bounce]="state() === 'PLAYING'">
                           <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-xl">
                              @if (playerClass().name === 'MAGE') {
                                 <!-- MAGE SPRITE -->
                                 <path d="M4 14 L6 6 L10 6 L12 14 Z" fill="#4f46e5"/> <!-- Robe -->
                                 <circle cx="8" cy="5" r="3" fill="#fbbf24"/> <!-- Head -->
                                 <path d="M3 5 L13 5 L8 1 Z" fill="#4f46e5"/> <!-- Hat -->
                                 <line x1="12" y1="8" x2="14" y2="4" stroke="#854d0e" stroke-width="1"/> <!-- Staff -->
                                 <circle cx="14" cy="4" r="1.5" fill="#38bdf8" class="animate-pulse"/> <!-- Staff Orb -->
                              } @else {
                                 <!-- WARRIOR SPRITE -->
                                 <rect x="5" y="7" width="6" height="6" rx="1" fill="#94a3b8"/> <!-- Armor -->
                                 <circle cx="8" cy="4" r="3" fill="#fca5a5"/> <!-- Head -->
                                 <path d="M4 2 L12 2 L12 5 L8 7 L4 5 Z" fill="#334155"/> <!-- Helm -->
                                 <path d="M12 9 L15 6 M13 10 L14 11" stroke="#cbd5e1" stroke-width="2"/> <!-- Sword -->
                                 <path d="M14 5 L16 3" stroke="#94a3b8" stroke-width="1"/>
                              }
                           </svg>
                        </div>
                     </div>

                 </div>
              </div>

              <!-- DIALOGUE BOX -->
              @if (state() === 'DIALOGUE' && dialogueData()) {
                  <div class="absolute bottom-0 left-0 right-0 bg-[#374151] border-t-4 border-white text-white p-3 z-50 flex flex-col gap-1 min-h-[100px] shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
                     <div class="flex justify-between items-center border-b border-gray-500 pb-1 mb-1">
                        <span class="font-bold text-yellow-300 tracking-wider text-xs">{{ dialogueData()?.npcName }}</span>
                        <span class="animate-pulse text-[0.5rem] text-gray-400">PRESS A to NEXT</span>
                     </div>
                     <p class="font-mono text-xs leading-5 typing-effect">{{ dialogueData()?.text }}</p>
                     
                     @if (dialogueData()?.isShopkeeper) {
                        <div class="mt-auto self-end text-green-400 text-[0.6rem] font-bold">TRADE (A)</div>
                     }
                  </div>
              }

              <!-- SHOP UI -->
              @if (state() === 'SHOP') {
                 <div class="absolute inset-4 bg-[#1f2937] border-4 border-yellow-600 z-50 flex flex-col p-2 shadow-2xl">
                    <div class="text-center bg-yellow-900/50 text-yellow-500 font-bold border-b border-yellow-700 pb-1 mb-2 tracking-widest">
                       MERCHANT
                    </div>
                    
                    <div class="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                       @for (item of shopItems(); track item.id; let i = $index) {
                          <div class="flex justify-between items-center p-1 rounded cursor-pointer"
                               [class.bg-yellow-800]="i === shopCursor()"
                               [class.text-white]="i === shopCursor()"
                               [class.text-gray-300]="i !== shopCursor()">
                             <div class="flex items-center gap-2">
                                <span class="w-3 text-center text-xs font-bold">{{ i === shopCursor() ? '►' : '' }}</span>
                                <span class="text-xs font-bold">{{ item.name }}</span>
                             </div>
                             <div class="text-xs font-mono text-yellow-200">$ {{ item.cost }}</div>
                          </div>
                       }
                    </div>

                    <div class="mt-2 border-t border-gray-600 pt-1 text-[0.6rem] text-gray-400 flex justify-between">
                       <span>YOUR GOLD: <b class="text-yellow-400">$ {{ score() }}</b></span>
                       <span>[B] LEAVE</span>
                    </div>
                 </div>
              }
            }

            @if (state() === 'GAME_OVER') {
              <div class="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center animate-fade-in">
                 <h1 class="text-4xl text-red-600 font-black tracking-widest mb-4 drop-shadow-[0_2px_0_#fff]">DEAD</h1>
                 <div class="text-gray-400 text-sm mb-8 font-bold">SCORE: {{ score() }}</div>
                 <div class="animate-pulse text-white text-xs font-bold tracking-widest">PRESS START</div>
              </div>
            }
        </div>

      </div>
      
      <!-- Bottom Branding -->
      @if (!isFullScreen()) {
        <div class="mt-2 flex justify-between items-center px-1">
           <div class="text-[#374151] font-bold text-[0.5rem] tracking-widest opacity-50 font-sans">STEREO SOUND</div>
           <div class="flex gap-1">
              <div class="w-8 h-1 bg-[#374151] rounded-full opacity-20"></div>
              <div class="w-8 h-1 bg-[#374151] rounded-full opacity-20"></div>
           </div>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes fade-out-up {
      0% { opacity: 1; transform: translateY(0); }
      80% { opacity: 1; transform: translateY(-10px); }
      100% { opacity: 0; transform: translateY(-20px); }
    }
    .animate-fade-out-up {
      animation: fade-out-up 2s ease-out forwards;
    }
    .animate-pulse-subtle {
       animation: pulse-subtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse-subtle {
       0%, 100% { opacity: 1; }
       50% { opacity: 0.6; }
    }
    .animate-slide-down {
       animation: slide-down 0.5s ease-out forwards;
    }
    @keyframes slide-down {
       from { transform: translateY(-20px); opacity: 0; }
       to { transform: translateY(0); opacity: 1; }
    }
    .animate-shake {
       animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
    @keyframes shake {
       10%, 90% { transform: translate3d(-1px, 0, 0); }
       20%, 80% { transform: translate3d(2px, 0, 0); }
       30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
       40%, 60% { transform: translate3d(4px, 0, 0); }
    }
    .custom-scrollbar::-webkit-scrollbar {
       width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
       background: #374151; 
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
       background: #9ca3af; 
       border-radius: 2px;
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-in forwards;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class GameScreenComponent {
  state = input.required<GameState>();
  score = input.required<number>();
  chunkCoords = input.required<{x: number, y: number}>();
  currentChunk = input.required<WorldChunk | null>();
  worldMap = input<Map<string, WorldChunk>>(new Map()); // Entire map data

  playerPos = input.required<{x: number, y: number}>();
  message = input.required<string>();
  powerOn = input.required<boolean>();
  playerStats = input.required<PlayerStats>();
  enemies = input.required<ActiveEnemy[]>();
  npcs = input<NPCSpawn[]>([]);
  shakeScreen = input.required<boolean>();
  
  availableClasses = input.required<CharacterClass[]>();
  selectedClassIdx = input.required<number>();

  inventory = input<InventoryItem[]>([]);
  inventoryCursor = input<number>(0);
  isFullScreen = input<boolean>(false);

  // Dialogue & Shop Inputs
  dialogueData = input<DialogueData | null>(null);
  shopItems = input<InventoryItem[]>([]);
  shopCursor = input<number>(0);

  // Responsive Grid with ResizeObserver
  mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');
  private containerW = signal(0);
  private containerH = signal(0);

  constructor() {
     effect((onCleanup) => {
        const el = this.mapContainer()?.nativeElement;
        if (!el) return;

        const ro = new ResizeObserver(entries => {
           for(const entry of entries) {
              this.containerW.set(entry.contentRect.width);
              this.containerH.set(entry.contentRect.height);
           }
        });
        ro.observe(el);
        onCleanup(() => ro.disconnect());
     });
  }

  cellSize = computed(() => {
     const w = this.containerW();
     const h = this.containerH();
     if (w === 0 || h === 0) return 32;

     // 10 cols, 9 rows
     const cellW = Math.floor(w / 10);
     const cellH = Math.floor(h / 9);
     
     // Ensure minimum size for stability, maximize fit
     return Math.max(Math.min(cellW, cellH), 16);
  });
  
  gridWidth = computed(() => 10 * this.cellSize());
  gridHeight = computed(() => 9 * this.cellSize());

  playerClass = computed(() => this.availableClasses()[this.selectedClassIdx()]);

  // Dynamic Biome Logic for Current Chunk
  biome = computed(() => {
     const { x, y } = this.chunkCoords();
     return this.getBiomeForCoords(x, y);
  });

  themeColors = computed(() => this.getThemeColors(this.biome()));

  // Map Generation Logic
  mapGrid = computed(() => {
     const map = this.worldMap();
     // Use explicit type for k to prevent unknown errors
     const keys = Array.from(map.keys()).map((k: string) => k.split(',').map(Number));
     
     if (keys.length === 0) return null;

     const xs = keys.map(k => k[0]);
     const ys = keys.map(k => k[1]);
     
     // Include player current position in bounds even if map not updated yet
     xs.push(this.chunkCoords().x);
     ys.push(this.chunkCoords().y);

     const minX = Math.min(...xs);
     const maxX = Math.max(...xs);
     const minY = Math.min(...ys);
     const maxY = Math.max(...ys);

     // Add padding for aesthetic
     const startX = minX - 1;
     const endX = maxX + 1;
     const startY = minY - 1;
     const endY = maxY + 1;
     
     const cols = endX - startX + 1;
     const rows = endY - startY + 1;

     const cells = [];
     
     for (let y = startY; y <= endY; y++) {
        for (let x = startX; x <= endX; x++) {
           const key = `${x},${y}`;
           const chunk = map.get(key);
           
           cells.push({
             id: key,
             x, y,
             discovered: !!chunk,
             isCity: chunk?.isCity,
             color: chunk ? this.getThemeColors(this.getBiomeForCoords(x, y)).bg : '#000000'
           });
        }
     }

     return { cells, cols, rows };
  });

  private getBiomeForCoords(x: number, y: number): string {
     if (x === 0 && y === 0) return 'GRASS';
     if (x > 0) {
        return y >= 0 ? 'SCIFI' : 'MAGMA';
     } else {
        return y >= 0 ? 'FOREST' : 'DESERT';
     }
  }

  private getThemeColors(biome: string) {
     switch (biome) {
        case 'GRASS': return { bg: '#84cc16', floorA: '#bef264', floorB: '#d9f99d' };
        case 'FOREST': return { bg: '#14532d', floorA: '#166534', floorB: '#15803d' };
        case 'DESERT': return { bg: '#c2410c', floorA: '#fdba74', floorB: '#fed7aa' };
        case 'SNOW': return { bg: '#e0f2fe', floorA: '#f0f9ff', floorB: '#ffffff' };
        case 'SCIFI': return { bg: '#1e293b', floorA: '#334155', floorB: '#475569' };
        case 'MAGMA': return { bg: '#450a0a', floorA: '#7f1d1d', floorB: '#991b1b' };
        default: return { bg: '#78716c', floorA: '#a8a29e', floorB: '#d6d3d1' };
     }
  }
}
