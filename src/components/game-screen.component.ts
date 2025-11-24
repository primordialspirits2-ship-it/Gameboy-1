
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorldChunk } from '../services/gemini-game.service';

export type GameState = 'BOOT' | 'CLASS_SELECT' | 'LOADING' | 'PLAYING' | 'GAME_OVER';

export interface ActiveEnemy {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  name: string;
  isElite?: boolean;
  flash?: boolean; // For damage animation
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

@Component({
  selector: 'app-game-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Main Screen Container -->
    <div class="screen-bezel w-full h-full bg-[#5c5f68] rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)] relative flex flex-col">
      
      <!-- Power LED -->
      <div class="absolute top-[40%] left-2 sm:left-3 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-900 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] z-20">
         <div class="w-full h-full rounded-full bg-red-500 opacity-0 transition-opacity duration-300 shadow-[0_0_5px_#ef4444]" 
              [class.opacity-100]="powerOn()" [class.animate-pulse-subtle]="powerOn()"></div>
      </div>
      <div class="absolute top-[48%] left-[0.3rem] sm:left-2 text-[0.3rem] sm:text-[0.4rem] text-gray-400 font-bold tracking-widest font-sans transform -rotate-90 origin-center">BATTERY</div>

      <!-- The LCD Screen Area -->
      <div class="lcd-screen flex-1 w-full bg-[#9ca3af] border-4 border-[#374151] shadow-[inset_0_5px_15px_rgba(0,0,0,0.5)] relative overflow-hidden font-mono select-none flex flex-col rounded-sm">
        
        <!-- Retro Screen Effects -->
        <div class="scanlines pointer-events-none absolute inset-0 z-30 opacity-20"></div>
        <div class="pixel-grid pointer-events-none absolute inset-0 z-20 opacity-30"></div>
        <div class="absolute inset-0 z-20 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.15)]"></div>

        <!-- CONTENT LAYERS -->
        <div class="relative z-0 w-full h-full flex flex-col">
            
            <!-- Boot Screen -->
            @if (state() === 'BOOT') {
              <div class="w-full h-full flex flex-col items-center justify-center animate-fade-in bg-[#e5e7eb]">
                 <div class="text-[#111827] text-3xl sm:text-5xl font-black tracking-[0.2em] animate-slide-down drop-shadow-sm filter blur-[0.5px]">GEMINI</div>
                 <div class="text-[#111827] text-xs sm:text-sm mt-4 tracking-widest font-bold">Licensed by Google</div>
              </div>
            }

            <!-- Class Selection -->
            @if (state() === 'CLASS_SELECT') {
              <div class="w-full h-full flex flex-col items-center pt-6 bg-[#e5e7eb]">
                 <h2 class="text-[#111827] text-lg font-bold mb-4 underline decoration-4 underline-offset-4 tracking-wider">SELECT CLASS</h2>
                 
                 <div class="w-full max-w-xs space-y-4 px-4">
                   @for (cls of availableClasses(); track cls.name; let i = $index) {
                     <div class="flex items-center gap-2 transition-all duration-200" 
                          [class.opacity-60]="i !== selectedClassIdx()"
                          [class.scale-105]="i === selectedClassIdx()">
                        <!-- Cursor -->
                        <div class="w-4 text-[#111827] font-bold text-xl">
                           @if(i === selectedClassIdx()) { ► }
                        </div>
                        
                        <div class="flex-1 border-2 border-[#111827] p-2 bg-[#f3f4f6] shadow-[2px_2px_0_rgba(0,0,0,0.2)]">
                           <div class="flex justify-between items-center mb-1 border-b border-gray-300 pb-1">
                              <span class="font-bold text-[#111827] text-lg">{{ cls.name }}</span>
                              <!-- Mini Icon -->
                              <div class="w-6 h-6">
                                @if (cls.name === 'WARRIOR') {
                                  <svg viewBox="0 0 16 16" class="w-full h-full">
                                    <path d="M6 12 L4 14 L2 12 L4 2 L6 0 L8 2 L10 12 L8 14 L6 12 Z" fill="#111827"/>
                                    <rect x="5" y="4" width="2" height="8" fill="#e5e7eb"/>
                                  </svg>
                                } @else {
                                  <svg viewBox="0 0 16 16" class="w-full h-full">
                                     <path d="M8 2 L6 4 L6 14 L10 14 L10 4 Z" fill="#111827"/>
                                     <circle cx="8" cy="3" r="2" fill="#e5e7eb" stroke="#111827"/>
                                  </svg>
                                }
                              </div>
                           </div>
                           <div class="text-[0.6rem] leading-tight text-[#111827] mb-2 font-bold">{{ cls.desc }}</div>
                           <div class="text-[0.6rem] leading-tight text-[#be123c] font-bold mb-1 uppercase tracking-wider">★ {{ cls.ability }}</div>
                           
                           <!-- Stats Grid -->
                           <div class="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-[0.55rem] font-bold text-[#4b5563]">
                              <div class="flex justify-between bg-gray-200 px-1"><span>HP</span> <span>{{ cls.hp }}</span></div>
                              <div class="flex justify-between bg-gray-200 px-1"><span>MP</span> <span>{{ cls.mp }}</span></div>
                              <div class="flex justify-between bg-gray-200 px-1"><span>ATK</span> <span>{{ cls.atk }}</span></div>
                              <div class="flex justify-between bg-gray-200 px-1"><span>DEF</span> <span>{{ cls.def }}</span></div>
                           </div>
                        </div>
                     </div>
                   }
                 </div>
                 
                 <div class="mt-auto mb-6 text-[#111827] text-xs animate-pulse font-bold tracking-widest">PRESS START</div>
              </div>
            }

            <!-- Loading Screen -->
            @if (state() === 'LOADING') {
              <div class="w-full h-full flex flex-col items-center justify-center bg-[#e5e7eb]">
                 <div class="relative w-16 h-16 mb-4">
                    <div class="absolute inset-0 border-4 border-[#111827] animate-spin"></div>
                    <div class="absolute inset-2 bg-[#111827] animate-pulse"></div>
                 </div>
                 <div class="text-[#111827] text-lg font-bold animate-pulse tracking-widest">GENERATING</div>
                 <div class="text-[#4b5563] text-xs mt-2 text-center px-8 leading-tight max-w-md font-mono border-t border-[#9ca3af] pt-2">{{ message() }}</div>
              </div>
            }

            <!-- Playing State -->
            @if (state() === 'PLAYING') {
              <!-- HUD -->
              <div class="flex-none flex justify-between items-start border-b-2 border-[#111827] bg-[#e5e7eb] z-10 relative px-2 py-1.5 shadow-md">
                 
                 <!-- Stats -->
                 <div class="flex flex-col gap-1">
                    <!-- HP -->
                    <div class="flex gap-1 items-center">
                      <span class="text-[0.5rem] font-black w-5 tracking-tighter">HP</span>
                      <div class="flex gap-[1px]">
                        @for (heart of [].constructor(playerStats().maxHp); track $index) {
                           <div class="w-2 h-2 sm:w-2.5 sm:h-2.5 relative">
                              @if ($index < playerStats().hp) {
                                <div class="absolute inset-0 bg-[#be123c] border border-[#111827] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"></div>
                              } @else {
                                <div class="absolute inset-0 bg-[#374151] opacity-20 border border-[#111827]"></div>
                              }
                           </div>
                        }
                      </div>
                    </div>
                    <!-- MP -->
                    <div class="flex gap-1 items-center">
                      <span class="text-[0.5rem] font-black w-5 tracking-tighter">MP</span>
                      <div class="flex gap-[1px]">
                        @for (orb of [].constructor(playerStats().maxMp); track $index) {
                           <div class="w-2 h-2 sm:w-2.5 sm:h-2.5 relative">
                              @if ($index < playerStats().mp) {
                                 <div class="absolute inset-0 bg-[#1d4ed8] border border-[#111827] shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]"></div>
                              } @else {
                                 <div class="absolute inset-0 bg-[#374151] opacity-20 border border-[#111827]"></div>
                              }
                           </div>
                        }
                      </div>
                    </div>
                 </div>

                 <!-- Level & Gear -->
                 <div class="flex flex-col items-end gap-1">
                     <div class="text-[#111827] text-[0.6rem] font-black bg-[#d1d5db] px-1 border border-[#9ca3af]">LVL {{ playerStats().level }}</div>
                     <div class="flex gap-1">
                        <div class="bg-[#111827] text-[#f3f4f6] px-1 rounded-[1px] text-[0.5rem] font-bold">ATK {{playerStats().atk}}</div>
                        <div class="bg-[#111827] text-[#f3f4f6] px-1 rounded-[1px] text-[0.5rem] font-bold">DEF {{playerStats().def}}</div>
                     </div>
                 </div>
              </div>

              <!-- Viewport -->
              <div class="flex-1 min-h-0 w-full flex items-center justify-center bg-[#0f172a] overflow-hidden relative" [class.shake]="shakeScreen()">
                
                <div class="grid-container bg-[#9ca3af] shadow-2xl relative transition-transform duration-300" 
                     [style.aspect-ratio]="(currentChunk()?.width || 10) + '/' + (currentChunk()?.height || 9)"
                     [style.height]="'100%'"
                     [style.max-width]="'100%'"
                     [style.grid-template-columns]="'repeat(' + (currentChunk()?.width || 10) + ', 1fr)'"
                     [style.grid-template-rows]="'repeat(' + (currentChunk()?.height || 9) + ', 1fr)'">
                  
                  @if (currentChunk(); as data) {
                    @for (row of data.layout; track $index; let y = $index) {
                      @for (cell of row; track $index; let x = $index) {
                        <div class="w-full h-full relative">
                           
                           <!-- Floor Texture (Improved) -->
                           <svg viewBox="0 0 16 16" class="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                              <rect width="16" height="16" [attr.fill]="(x + y) % 2 === 0 ? '#d1d5db' : '#e5e7eb'" /> <!-- Checkerboard -->
                              <!-- Subtle noise/texture -->
                              @if ((x * 3 + y * 7) % 5 === 0) {
                                <rect x="3" y="3" width="1" height="1" fill="#9ca3af" opacity="0.5"/>
                                <rect x="12" y="10" width="1" height="1" fill="#9ca3af" opacity="0.5"/>
                              }
                              @if ((x * 2 + y * 5) % 7 === 0) {
                                 <path d="M2 13 L3 11 L4 13" stroke="#9ca3af" stroke-width="0.5" fill="none" opacity="0.6"/>
                              }
                           </svg>
                           
                           <!-- Wall (1) -->
                           @if (cell === 1) {
                              <!-- Rock or Tree based on position hash -->
                              @if ((x + y + (currentChunk()?.width || 0)) % 3 === 0) {
                                <!-- ROCK Sprite -->
                                <div class="absolute inset-[-10%] z-10">
                                  <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-md">
                                    <path d="M2 14 H14 L13 10 L15 8 L12 4 L8 2 L5 3 L2 7 Z" fill="#4b5563"/>
                                    <path d="M4 10 L6 8 L5 6" stroke="#374151" stroke-width="1" fill="none"/>
                                    <path d="M10 5 L12 8" stroke="#374151" stroke-width="1" fill="none"/>
                                    <path d="M8 2 L9 4 L8 6 L6 5 Z" fill="#6b7280"/> <!-- Highlight -->
                                  </svg>
                                </div>
                              } @else {
                                <!-- PINE TREE Sprite (Better) -->
                                <div class="absolute inset-[-25%] z-10 -bottom-1">
                                  <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-lg">
                                    <rect x="7" y="13" width="2" height="3" fill="#451a03"/> <!-- Trunk -->
                                    <path d="M8 1 L3 7 H6 L2 11 H14 L10 7 H13 L8 1 Z" fill="#14532d"/> <!-- Body -->
                                    <path d="M8 1 L5 6 H7 L4 10 H8 V1 Z" fill="#166534"/> <!-- Highlight side -->
                                    <path d="M2 11 L1 12 H15 L14 11" fill="#14532d" opacity="0.5"/> <!-- Shadow bottom -->
                                  </svg>
                                </div>
                              }
                           }

                           <!-- Hazard (2) -->
                           @if (cell === 2) {
                              <div class="absolute inset-0 flex items-center justify-center z-0">
                                 <svg viewBox="0 0 16 16" class="w-full h-full">
                                    <path d="M2 14 L5 8 L8 14" fill="#525252"/>
                                    <path d="M6 14 L9 5 L12 14" fill="#404040"/>
                                    <path d="M10 14 L13 9 L15 14" fill="#525252"/>
                                    <path d="M9 5 L9 2" stroke="#dc2626" stroke-width="0.5"/>
                                 </svg>
                              </div>
                           }

                           <!-- Treasure (3) -->
                           @if (cell === 3) {
                              <div class="absolute inset-[-10%] flex items-center justify-center animate-bounce-custom z-10">
                                 <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-sm">
                                    <rect x="2" y="5" width="12" height="9" rx="1" fill="#b45309"/>
                                    <rect x="1" y="3" width="14" height="3" rx="1" fill="#d97706"/>
                                    <rect x="7" y="6" width="2" height="3" fill="#fbbf24"/> <!-- Lock -->
                                    <path d="M2 5 H14" stroke="#78350f" stroke-width="1" opacity="0.5"/>
                                 </svg>
                              </div>
                           }
                           
                           <!-- Item (4) -->
                           @if (cell === 4) {
                              <div class="absolute inset-0 flex items-center justify-center animate-float z-10">
                                 <svg viewBox="0 0 16 16" class="w-3/4 h-3/4 drop-shadow-md">
                                    <path d="M6 10 C6 13, 10 13, 10 10 L10 6 L6 6 Z" fill="#ef4444" stroke="#991b1b" stroke-width="1"/>
                                    <rect x="7" y="3" width="2" height="3" fill="#f3f4f6" stroke="#991b1b" stroke-width="0.5"/>
                                    <path d="M7 8 L8 9 L9 8" fill="white" opacity="0.6"/>
                                 </svg>
                              </div>
                           }

                           <!-- ENEMIES -->
                           @for (enemy of enemies(); track enemy.id) {
                              @if (enemy.x === x && enemy.y === y) {
                                <div class="absolute inset-[-20%] z-20 flex items-center justify-center transition-all duration-100"
                                     [class.opacity-0]="enemy.flash"
                                     [class.opacity-100]="!enemy.flash"
                                     [class.scale-125]="enemy.isElite">
                                   
                                   <!-- SLIME -->
                                   @if (enemy.type === 'SLIME') {
                                     <svg viewBox="0 0 16 16" class="w-full h-full animate-squish drop-shadow-md">
                                        <path d="M5 14 H11 V12 H12 V9 H11 V7 H5 V9 H4 V12 H5 Z" fill="#16a34a"/> <!-- Main Body -->
                                        <path d="M5 9 H11 V12 H5 Z" fill="#22c55e"/> <!-- Highlight -->
                                        <rect x="6" y="8" width="1" height="2" fill="#064e3b"/> <!-- Eye -->
                                        <rect x="9" y="8" width="1" height="2" fill="#064e3b"/> <!-- Eye -->
                                     </svg>
                                   }
                                   
                                   <!-- RAT -->
                                   @if (enemy.type === 'RAT' || enemy.type === 'BAT') {
                                     <svg viewBox="0 0 16 16" class="w-full h-full animate-float drop-shadow-md">
                                        <path d="M2 12 H10 V9 H12 V10 H14 V8 H10 V7 H4 V9 H2 Z" fill="#525252"/>
                                        <rect x="11" y="8" width="1" height="1" fill="#ef4444"/> <!-- Eye -->
                                        <rect x="14" y="9" width="1" height="1" fill="pink"/> <!-- Nose -->
                                        <path d="M1 10 H2 V11 H1 Z" fill="#a3a3a3"/> <!-- Tail start -->
                                     </svg>
                                   }

                                   <!-- SKELETON -->
                                   @if (enemy.type === 'SKELETON') {
                                     <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-md">
                                        <rect x="5" y="2" width="6" height="5" fill="#f3f4f6" />
                                        <rect x="6" y="4" width="1" height="2" fill="#111827"/>
                                        <rect x="9" y="4" width="1" height="2" fill="#111827"/>
                                        <rect x="7" y="6" width="2" height="1" fill="#111827"/> <!-- Nose -->
                                        <path d="M6 9 H10 M6 10 H10 M6 11 H10" stroke="#e5e7eb" stroke-width="1"/> <!-- Ribs -->
                                        <line x1="8" y1="8" x2="8" y2="12" stroke="#e5e7eb" stroke-width="1"/>
                                        <path d="M4 8 L6 8 M12 8 L10 8" stroke="#e5e7eb" stroke-width="1"/>
                                        <rect x="12" y="6" width="1" height="4" fill="#9ca3af"/> <!-- Sword -->
                                     </svg>
                                   }

                                   <!-- ROBOT -->
                                   @if (enemy.type === 'ROBOT') {
                                     <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-md">
                                        <rect x="4" y="4" width="8" height="7" fill="#64748b" stroke="#334155" stroke-width="1"/>
                                        <rect x="5" y="6" width="6" height="2" fill="#0f172a"/>
                                        <rect x="6" y="6" width="1" height="1" fill="#ef4444" class="animate-pulse"/>
                                        <line x1="8" y1="4" x2="8" y2="2" stroke="#64748b"/>
                                        <circle cx="8" cy="1" r="1" fill="#ef4444"/>
                                        <rect x="3" y="6" width="1" height="4" fill="#475569"/> <!-- Arm L -->
                                        <rect x="12" y="6" width="1" height="4" fill="#475569"/> <!-- Arm R -->
                                        <rect x="5" y="11" width="2" height="3" fill="#334155"/> <!-- Leg -->
                                        <rect x="9" y="11" width="2" height="3" fill="#334155"/> <!-- Leg -->
                                     </svg>
                                   }

                                   <!-- GHOST -->
                                   @if (enemy.type === 'GHOST') {
                                     <svg viewBox="0 0 16 16" class="w-full h-full animate-float opacity-80 drop-shadow-md">
                                        <path d="M4 14 L4 6 C4 2, 12 2, 12 6 L12 14 L10 12 L8 14 L6 12 L4 14 Z" fill="#e0f2fe"/>
                                        <rect x="6" y="5" width="1" height="2" fill="#1e3a8a"/>
                                        <rect x="9" y="5" width="1" height="2" fill="#1e3a8a"/>
                                     </svg>
                                   }

                                   <!-- ALIEN -->
                                   @if (enemy.type === 'ALIEN') {
                                     <svg viewBox="0 0 16 16" class="w-full h-full animate-bounce-custom drop-shadow-md">
                                        <path d="M5 2 H11 V8 H13 V12 H3 V8 H5 V2 Z" fill="#10b981"/> <!-- Head -->
                                        <rect x="4" y="4" width="2" height="2" fill="#064e3b"/> <!-- Eye -->
                                        <rect x="10" y="4" width="2" height="2" fill="#064e3b"/> <!-- Eye -->
                                        <rect x="5" y="12" width="1" height="2" fill="#047857"/> <!-- Leg -->
                                        <rect x="10" y="12" width="1" height="2" fill="#047857"/> <!-- Leg -->
                                     </svg>
                                   }

                                   <!-- HP Bar -->
                                   <div class="absolute -top-3 w-full flex justify-center gap-[1px]">
                                      @for (h of [].constructor(enemy.maxHp); track $index) {
                                        <div class="w-1 h-1 rounded-full border border-[#111827]" 
                                             [class.bg-[#ef4444]]="$index < enemy.hp" 
                                             [class.bg-[#374151]]="$index >= enemy.hp"></div>
                                      }
                                   </div>
                                </div>
                              }
                           }

                           <!-- Player -->
                           @if (x === playerPos().x && y === playerPos().y) {
                              <div class="absolute inset-[-25%] z-30 flex items-center justify-center transition-transform duration-100"
                                   [class.translate-y-[-8%]]="isMoving()">
                                 
                                 <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-xl">
                                    <ellipse cx="8" cy="15" rx="5" ry="1.5" fill="#000" opacity="0.4" />

                                    @if (hasMagic()) {
                                       <!-- MAGE -->
                                       <path d="M5 14 L6 6 H10 L11 14 Z" fill="#2563eb"/> <!-- Robe -->
                                       <path d="M8 2 L4 6 H12 Z" fill="#2563eb"/> <!-- Hat -->
                                       <rect x="3" y="6" width="10" height="1" fill="#1e40af"/> <!-- Brim -->
                                       <rect x="6" y="6" width="4" height="3" fill="#fca5a5"/> <!-- Face -->
                                       <rect x="4" y="7" width="2" height="4" fill="#1d4ed8" transform="rotate(20 4 7)"/> <!-- Arm -->
                                       <line x1="12" y1="5" x2="12" y2="14" stroke="#78350f"/> <!-- Staff -->
                                       <circle cx="12" cy="5" r="1.5" fill="#ef4444"/> <!-- Orb -->
                                    } @else {
                                       <!-- WARRIOR -->
                                       <rect x="5" y="5" width="6" height="7" fill="#9ca3af"/> <!-- Armor -->
                                       <path d="M5 2 H11 V6 H5 Z" fill="#4b5563"/> <!-- Helmet -->
                                       <rect x="6" y="3" width="1" height="2" fill="#111827"/> <!-- Eye -->
                                       <rect x="9" y="3" width="1" height="2" fill="#111827"/> <!-- Eye -->
                                       <rect x="12" y="4" width="2" height="8" fill="#d1d5db"/> <!-- Sword Blade -->
                                       <rect x="11" y="10" width="4" height="1" fill="#4b5563"/> <!-- Hilt -->
                                       <rect x="12" y="11" width="2" height="2" fill="#374151"/> <!-- Handle -->
                                    }
                                 </svg>
                              </div>
                           }
                        </div>
                      }
                    }
                  }
                </div>
              </div>

              <!-- Message Bar -->
               <div class="flex-none h-9 bg-[#e5e7eb] border-t-4 border-[#374151] px-2 flex items-center shadow-inner relative z-20">
                 <div class="w-1.5 h-1.5 bg-[#111827] mr-2 animate-blink"></div>
                 <span class="text-[#111827] text-[0.6rem] sm:text-xs leading-tight typing-effect font-mono w-full truncate font-bold">
                    {{ message() }}
                 </span>
               </div>
            }

            <!-- Game Over -->
            @if (state() === 'GAME_OVER') {
               <div class="w-full h-full flex flex-col items-center justify-center bg-[#111827] z-50 absolute inset-0 bg-opacity-95">
                 <div class="border-4 border-[#e5e7eb] p-6 bg-[#111827] max-w-sm mx-4 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    <h1 class="text-[#f3f4f6] text-4xl font-bold mb-4 text-center tracking-tighter drop-shadow-md">DEAD</h1>
                    <div class="w-full h-[2px] bg-[#4b5563] mb-4"></div>
                    <p class="text-[#d1d5db] text-sm text-center px-2 mb-6 leading-relaxed font-mono">{{ message() }}</p>
                    <p class="text-[#f3f4f6] text-sm text-center animate-blink mt-2 font-bold tracking-widest">► PRESS START</p>
                 </div>
               </div>
            }

        </div>
      </div>

      <!-- Screen Gloss/Reflection -->
      <div class="absolute top-6 right-8 w-1/3 h-2/3 bg-gradient-to-bl from-white via-transparent to-transparent opacity-[0.07] pointer-events-none rounded-lg z-40 transform skew-x-12"></div>
    </div>
  `,
  styles: [`
    .scanlines {
      background: linear-gradient(to bottom, rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
      background-size: 100% 4px;
    }
    .pixel-grid {
      background-image: linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
      background-size: 4px 4px;
    }
    .animate-blink { animation: blink 0.8s steps(2, start) infinite; }
    .animate-squish { animation: squish 2s infinite ease-in-out; }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .animate-bounce-custom { animation: bounce 0.8s infinite alternate ease-in-out; }
    
    @keyframes blink { to { visibility: hidden; } }
    @keyframes squish { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.1, 0.9); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
    @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-3px); } }
    
    .shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
    @keyframes shake { 
      10%, 90% { transform: translate3d(-2px, 0, 0); }
      20%, 80% { transform: translate3d(3px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-5px, 0, 0); }
      40%, 60% { transform: translate3d(5px, 0, 0); }
    }

    .animate-slide-down { animation: slide-down 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
    @keyframes slide-down { 
        0% { transform: translateY(-20px); opacity: 0; } 
        100% { transform: translateY(0); opacity: 1; } 
    }
    .animate-pulse-subtle { animation: pulse-subtle 3s infinite; }
    @keyframes pulse-subtle { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.4; } }

    .grid-container { display: grid; }
  `]
})
export class GameScreenComponent {
  state = input.required<GameState>();
  score = input.required<number>();
  chunkCoords = input.required<{x: number, y: number}>();
  currentChunk = input<WorldChunk | null>();
  playerPos = input.required<{x: number, y: number}>();
  enemies = input<ActiveEnemy[]>([]);
  message = input.required<string>();
  powerOn = input<boolean>(true);
  playerStats = input.required<{hp: number, maxHp: number, mp: number, maxMp: number, level: number, weapon: string, armor: string, atk: number, def: number}>();
  shakeScreen = input<boolean>(false);
  
  availableClasses = input<CharacterClass[]>([]);
  selectedClassIdx = input<number>(0);

  isMoving = computed(() => {
    return (this.playerPos().x + this.playerPos().y) % 2 !== 0;
  });

  hasSword = computed(() => {
    const w = this.playerStats().weapon.toLowerCase();
    return w.includes('sword') || w.includes('blade') || w.includes('knife') || w.includes('axe') || w.includes('fists');
  });

  hasMagic = computed(() => {
    const w = this.playerStats().weapon.toLowerCase();
    return w.includes('wand') || w.includes('staff') || w.includes('rod') || w.includes('book');
  });
}
