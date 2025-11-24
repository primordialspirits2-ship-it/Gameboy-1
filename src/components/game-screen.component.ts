
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorldChunk } from '../services/gemini-game.service';

export type GameState = 'BOOT' | 'LOADING' | 'PLAYING' | 'GAME_OVER';

@Component({
  selector: 'app-game-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Main Screen Container with Bevel -->
    <div class="screen-bezel bg-[#5c5f68] rounded-t-lg rounded-b-[3rem] p-6 sm:p-8 pt-6 pb-2 shadow-[inset_0_2px_5px_rgba(0,0,0,0.4)] relative mx-auto max-w-[360px]">
      
      <!-- Power LED -->
      <div class="absolute top-[30%] left-3 w-2.5 h-2.5 rounded-full bg-red-700 shadow-[0_0_2px_rgba(0,0,0,0.5)] z-20">
         <div class="w-full h-full rounded-full bg-red-500 opacity-0 transition-opacity duration-300" 
              [class.opacity-100]="powerOn()" [class.animate-pulse-subtle]="powerOn()"></div>
      </div>
      <div class="absolute top-[36%] left-1.5 text-[0.4rem] text-gray-300 font-bold tracking-widest font-sans">BATTERY</div>

      <!-- The LCD Screen -->
      <div class="lcd-screen bg-[#8bac0f] w-full aspect-[10/9] border-4 border-[#4b5c08] shadow-[inset_0_5px_15px_rgba(0,0,0,0.5)] relative overflow-hidden font-mono select-none">
        
        <!-- Scanlines Overlay -->
        <div class="scanlines pointer-events-none absolute inset-0 z-30 opacity-40"></div>
        
        <!-- Pixel Grid Effect -->
        <div class="pixel-grid pointer-events-none absolute inset-0 z-20 opacity-30"></div>
        
        <!-- Shadow Vignette -->
        <div class="absolute inset-0 z-20 pointer-events-none shadow-[inset_0_0_20px_rgba(15,56,15,0.4)]"></div>

        <!-- CONTENT LAYERS -->
        <div class="relative z-0 w-full h-full p-[2px] flex flex-col">
            
            <!-- Boot Screen -->
            @if (state() === 'BOOT') {
              <div class="w-full h-full flex flex-col items-center justify-center animate-fade-in bg-[#8bac0f]">
                 <div class="text-[#0f380f] text-2xl font-black tracking-[0.2em] animate-slide-down drop-shadow-sm">GEMINI</div>
                 <div class="text-[#0f380f] text-[0.6rem] mt-2 tracking-widest font-bold">Licensed by Google</div>
              </div>
            }

            <!-- Loading Screen (World Gen) -->
            @if (state() === 'LOADING') {
              <div class="w-full h-full flex flex-col items-center justify-center bg-[#8bac0f]">
                 <div class="flex gap-2 mb-4">
                    <div class="w-3 h-3 bg-[#0f380f] animate-bounce-custom"></div>
                    <div class="w-3 h-3 bg-[#0f380f] animate-bounce-custom delay-100"></div>
                    <div class="w-3 h-3 bg-[#0f380f] animate-bounce-custom delay-200"></div>
                 </div>
                 <div class="text-[#0f380f] text-sm font-bold animate-pulse">GENERATING MAP</div>
                 <div class="text-[#306230] text-[10px] mt-2 text-center px-4 leading-tight">{{ message() }}</div>
              </div>
            }

            <!-- Playing State -->
            @if (state() === 'PLAYING') {
              <!-- HUD -->
              <div class="flex justify-between items-end border-b-2 border-[#306230] pb-1 mb-1 px-1 pt-1 bg-[#8bac0f] z-10 relative">
                 <div class="flex flex-col">
                    <span class="text-[#0f380f] text-[0.5rem] font-bold">POS</span>
                    <span class="text-[#0f380f] text-xs font-bold">{{ chunkCoords().x }},{{ chunkCoords().y }}</span>
                 </div>
                 <div class="flex flex-col items-end">
                     <span class="text-[#0f380f] text-[0.5rem] font-bold">GOLD</span>
                     <span class="text-[#0f380f] text-xs font-bold">{{ score() }}</span>
                 </div>
              </div>

              <!-- The Grid -->
              <div class="flex-1 relative grid-container bg-[#9bbc0f]" 
                   [style.grid-template-columns]="'repeat(' + (currentChunk()?.width || 10) + ', 1fr)'"
                   [style.grid-template-rows]="'repeat(' + (currentChunk()?.height || 9) + ', 1fr)'">
                
                @if (currentChunk(); as data) {
                  @for (row of data.layout; track $index; let y = $index) {
                    @for (cell of row; track $index; let x = $index) {
                      <div class="w-full h-full relative">
                         
                         <!-- Base Floor Texture (Procedural) -->
                         <!-- Checkered pattern variation using CSS opacity -->
                         <div class="absolute inset-0" 
                              [class.bg-[#8bac0f]]="(x + y) % 2 === 0" 
                              [class.bg-[#9bbc0f]]="(x + y) % 2 !== 0">
                         </div>

                         <!-- Random Grass Decoration -->
                         @if (cell === 0 && (x * 7 + y * 13) % 7 === 0) {
                            <svg viewBox="0 0 16 16" class="absolute inset-0 w-full h-full opacity-60">
                                <rect x="3" y="10" width="1" height="2" fill="#306230"/>
                                <rect x="4" y="12" width="1" height="1" fill="#306230"/>
                                <rect x="2" y="11" width="1" height="1" fill="#306230"/>
                            </svg>
                         }
                         
                         <!-- Wall (1) - Tree or Rock Variation -->
                         @if (cell === 1) {
                            @if ((x + y) % 3 === 0) {
                              <!-- ROCK SPRITE -->
                              <div class="absolute inset-[-10%] z-10">
                                <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-sm">
                                  <path d="M4 6 h8 v8 h-8 z" fill="#306230" /> <!-- Base -->
                                  <path d="M5 5 h6 v1 h2 v1 h1 v6 h-1 v1 h-10 v-1 h-1 v-6 h1 v-1 h2 z" fill="#0f380f"/> <!-- Outline -->
                                  <rect x="5" y="7" width="2" height="2" fill="#8bac0f" opacity="0.5"/> <!-- Crack -->
                                  <rect x="10" y="10" width="2" height="1" fill="#8bac0f" opacity="0.5"/>
                                </svg>
                              </div>
                            } @else {
                              <!-- PINE TREE SPRITE -->
                              <div class="absolute inset-[-15%] z-10 bottom-[2px]">
                                <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-md">
                                  <!-- Trunk -->
                                  <rect x="7" y="12" width="2" height="3" fill="#306230"/>
                                  <!-- Leaves Layers -->
                                  <path d="M2 12 h12 l-2 -3 h-1 l-2 -3 h-1 l-2 6 z" fill="#306230" /> 
                                  <!-- Pixel Art Tree Construction -->
                                  <rect x="3" y="10" width="10" height="2" fill="#0f380f"/> <!-- Bottom tier -->
                                  <rect x="4" y="8" width="8" height="2" fill="#0f380f"/> <!-- Mid tier -->
                                  <rect x="5" y="6" width="6" height="2" fill="#0f380f"/> <!-- Top tier -->
                                  <rect x="7" y="4" width="2" height="2" fill="#0f380f"/> <!-- Tip -->
                                  
                                  <!-- Highlights -->
                                  <rect x="4" y="10" width="1" height="1" fill="#8bac0f"/>
                                  <rect x="5" y="8" width="1" height="1" fill="#8bac0f"/>
                                  <rect x="6" y="6" width="1" height="1" fill="#8bac0f"/>
                                </svg>
                              </div>
                            }
                         }
                         
                         <!-- Hazard (2) - SPIKES -->
                         @if (cell === 2) {
                            <div class="absolute inset-0 flex items-center justify-center">
                               <svg viewBox="0 0 16 16" class="w-full h-full animate-pulse">
                                  <!-- 3 Spikes -->
                                  <path d="M2 14 L5 4 L8 14" fill="#0f380f"/>
                                  <path d="M6 14 L9 6 L12 14" fill="#0f380f"/>
                                  <path d="M10 14 L13 4 L15 14" fill="#0f380f"/>
                               </svg>
                            </div>
                         }
                         
                         <!-- Treasure (3) - CHEST -->
                         @if (cell === 3) {
                            <div class="absolute inset-0 p-1 flex items-center justify-center">
                               <svg viewBox="0 0 16 16" class="w-full h-full">
                                  <!-- Outline -->
                                  <rect x="2" y="5" width="12" height="10" fill="#0f380f" rx="1" />
                                  <!-- Body Color -->
                                  <rect x="3" y="9" width="10" height="5" fill="#306230" />
                                  <!-- Lid Color -->
                                  <rect x="3" y="6" width="10" height="2" fill="#8bac0f" />
                                  <!-- Lock -->
                                  <rect x="7" y="8" width="2" height="2" fill="#9bbc0f" />
                               </svg>
                            </div>
                         }

                         <!-- Player - HERO SPRITE -->
                         @if (x === playerPos().x && y === playerPos().y) {
                            <div class="absolute inset-[-20%] z-20 flex items-center justify-center transition-transform duration-150"
                                 [class.translate-y-[-10%]]="isMoving()">
                               <svg viewBox="0 0 16 16" class="w-full h-full drop-shadow-xl animate-float">
                                  <!-- Shadow -->
                                  <ellipse cx="8" cy="15" rx="4" ry="1" fill="#0f380f" opacity="0.4" />
                                  
                                  <!-- Body/Cloak -->
                                  <rect x="4" y="9" width="8" height="5" fill="#0f380f" />
                                  
                                  <!-- Legs -->
                                  <rect x="5" y="14" width="2" height="2" fill="#0f380f" />
                                  <rect x="9" y="14" width="2" height="2" fill="#0f380f" />

                                  <!-- Head/Helmet -->
                                  <rect x="4" y="3" width="8" height="6" fill="#0f380f" />
                                  <rect x="5" y="4" width="6" height="4" fill="#9bbc0f" /> <!-- Face -->
                                  
                                  <!-- Eyes -->
                                  <rect x="6" y="5" width="1" height="2" fill="#0f380f" />
                                  <rect x="9" y="5" width="1" height="2" fill="#0f380f" />
                                  
                                  <!-- Sword/Item -->
                                  <path d="M13 8 h1 v5 h-1 z" fill="#0f380f" />
                                  <rect x="12" y="11" width="3" height="1" fill="#0f380f" />
                               </svg>
                            </div>
                         }
                      </div>
                    }
                  }
                }
              </div>

              <!-- Message Bar -->
               <div class="mt-1 h-8 bg-[#9bbc0f] border-t-2 border-[#306230] px-2 flex items-center shadow-sm">
                 <span class="text-[#0f380f] text-[10px] leading-tight typing-effect font-mono w-full">
                    <span class="font-bold mr-1 bg-[#306230] text-[#9bbc0f] px-1 rounded-sm">{{ currentChunk()?.biomeName || 'UNK' }}</span>
                    {{ message() }}
                 </span>
               </div>
            }

            <!-- Game Over -->
            @if (state() === 'GAME_OVER') {
               <div class="w-full h-full flex flex-col items-center justify-center bg-[#0f380f] z-50 absolute inset-0 bg-opacity-95">
                 <div class="border-4 border-[#8bac0f] p-4 bg-[#0f380f]">
                    <h1 class="text-[#9bbc0f] text-2xl font-bold mb-2 text-center tracking-tighter">DEAD</h1>
                    <div class="w-full h-[2px] bg-[#306230] mb-2"></div>
                    <p class="text-[#8bac0f] text-xs text-center px-2 mb-4 leading-relaxed">{{ message() }}</p>
                    <p class="text-[#9bbc0f] text-xs text-center animate-blink mt-2">► PRESS START</p>
                 </div>
               </div>
            }

        </div>
      </div>

      <!-- Screen Gloss/Reflection -->
      <div class="absolute top-6 right-8 w-16 h-48 bg-gradient-to-b from-white to-transparent opacity-5 rotate-12 pointer-events-none rounded-lg z-40"></div>
    </div>
  `,
  styles: [`
    .scanlines {
      background: linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.1) 50%);
      background-size: 100% 3px;
    }
    .pixel-grid {
      background-image: linear-gradient(to right, rgba(15, 56, 15, 0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(15, 56, 15, 0.05) 1px, transparent 1px);
      background-size: 3px 3px;
    }
    .animate-blink { animation: blink 0.8s steps(2, start) infinite; }
    .animate-float { animation: float 2s ease-in-out infinite; }
    .animate-bounce-custom { animation: bounce 0.6s infinite alternate; }
    
    @keyframes blink { to { visibility: hidden; } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
    @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-4px); } }
    
    .animate-slide-down { animation: slide-down 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
    @keyframes slide-down { 
        0% { transform: translateY(-30px); opacity: 0; } 
        100% { transform: translateY(0); opacity: 1; } 
    }
    .animate-pulse-subtle { animation: pulse-subtle 2s infinite; }
    @keyframes pulse-subtle { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

    .grid-container { display: grid; }
  `]
})
export class GameScreenComponent {
  state = input.required<GameState>();
  score = input.required<number>();
  chunkCoords = input.required<{x: number, y: number}>();
  currentChunk = input<WorldChunk | null>();
  playerPos = input.required<{x: number, y: number}>();
  message = input.required<string>();
  powerOn = input<boolean>(true);

  // Derived state to trigger movement animation frame if needed
  isMoving = computed(() => {
    // Simple toggle based on pos to allow CSS transition
    return (this.playerPos().x + this.playerPos().y) % 2 !== 0;
  });
}
