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
    <div class="screen-bezel bg-gray-600 rounded-t-lg rounded-b-[3rem] p-6 sm:p-8 pt-6 pb-2 shadow-inner relative mx-auto max-w-[360px]">
      
      <!-- Power LED -->
      <div class="absolute top-[30%] left-2 w-2 h-2 rounded-full bg-red-600 shadow-[0_0_5px_rgba(220,38,38,0.8)] transition-opacity duration-500"
           [class.opacity-100]="powerOn()" [class.opacity-20]="!powerOn()">
      </div>
      <div class="absolute top-[35%] left-1 text-[0.5rem] text-gray-400 font-bold tracking-wider">BATTERY</div>

      <!-- The LCD Screen -->
      <div class="lcd-screen bg-[#8bac0f] w-full aspect-[10/9] border-4 border-[#4b5c08] shadow-[inset_0_0_10px_rgba(0,0,0,0.4)] relative overflow-hidden font-mono">
        
        <!-- Scanlines Overlay -->
        <div class="scanlines pointer-events-none absolute inset-0 z-20"></div>
        
        <!-- Pixel Grid Effect -->
        <div class="pixel-grid pointer-events-none absolute inset-0 z-10 opacity-10"></div>

        <!-- CONTENT LAYERS -->
        <div class="relative z-0 w-full h-full p-1 flex flex-col">
            
            <!-- Boot Screen -->
            @if (state() === 'BOOT') {
              <div class="w-full h-full flex flex-col items-center justify-center animate-fade-in">
                 <div class="text-[#0f380f] text-2xl font-black tracking-[0.2em] animate-slide-down">GEMINI</div>
                 <div class="text-[#0f380f] text-xs mt-2 tracking-widest">Licensed by Google</div>
              </div>
            }

            <!-- Loading Screen (World Gen) -->
            @if (state() === 'LOADING') {
              <div class="w-full h-full flex flex-col items-center justify-center bg-[#8bac0f]">
                 <div class="flex gap-1 mb-2">
                    <div class="w-2 h-2 bg-[#0f380f] animate-bounce"></div>
                    <div class="w-2 h-2 bg-[#0f380f] animate-bounce delay-75"></div>
                    <div class="w-2 h-2 bg-[#0f380f] animate-bounce delay-150"></div>
                 </div>
                 <div class="text-[#0f380f] text-sm font-bold blink">LOADING ZONE...</div>
                 <div class="text-[#306230] text-[10px] mt-1">{{ message() }}</div>
              </div>
            }

            <!-- Playing State -->
            @if (state() === 'PLAYING') {
              <!-- HUD -->
              <div class="flex justify-between items-center border-b-2 border-[#306230] pb-1 mb-1 px-1">
                 <span class="text-[#0f380f] text-xs font-bold">POS:{{ chunkCoords().x }},{{ chunkCoords().y }}</span>
                 <div class="flex gap-2">
                    <span class="text-[#0f380f] text-xs font-bold">GOLD:{{ score() }}</span>
                 </div>
              </div>

              <!-- The Grid -->
              <div class="flex-1 relative grid-container" 
                   [style.grid-template-columns]="'repeat(' + (currentChunk()?.width || 10) + ', 1fr)'"
                   [style.grid-template-rows]="'repeat(' + (currentChunk()?.height || 9) + ', 1fr)'">
                
                @if (currentChunk(); as data) {
                  @for (row of data.layout; track $index; let y = $index) {
                    @for (cell of row; track $index; let x = $index) {
                      <div class="w-full h-full flex items-center justify-center text-[10px] sm:text-xs relative">
                         <!-- Floor -->
                         @if (cell === 0 || cell === 3) {
                            <div class="w-1 h-1 bg-[#9bbc0f] rounded-full opacity-30"></div>
                         }
                         <!-- Wall -->
                         @if (cell === 1) {
                            <div class="w-full h-full bg-[#306230] border border-[#0f380f] shadow-sm"></div>
                         }
                         <!-- Hazard -->
                         @if (cell === 2) {
                            <div class="absolute inset-0 flex items-center justify-center text-[#0f380f] animate-pulse">^</div>
                         }
                         <!-- Treasure -->
                         @if (cell === 3) {
                            <div class="absolute inset-0 flex items-center justify-center text-[#0f380f] font-bold animate-pulse">$</div>
                         }
                         <!-- Player -->
                         @if (x === playerPos().x && y === playerPos().y) {
                            <div class="absolute inset-0 bg-[#0f380f] flex items-center justify-center text-[#9bbc0f] font-bold z-10 shadow-sm border border-[#9bbc0f]">P</div>
                         }
                      </div>
                    }
                  }
                }
              </div>

              <!-- Message Bar -->
               <div class="mt-1 min-h-[1.5rem] bg-[#9bbc0f] border-t-2 border-[#306230] px-1 flex items-center">
                 <span class="text-[#0f380f] text-[10px] leading-none typing-effect">
                    <span class="font-bold mr-1">{{ currentChunk()?.biomeName }}:</span>
                    {{ message() }}
                 </span>
               </div>
            }

            <!-- Game Over -->
            @if (state() === 'GAME_OVER') {
               <div class="w-full h-full flex flex-col items-center justify-center bg-[#0f380f]">
                 <h1 class="text-[#9bbc0f] text-xl font-bold mb-2">GAME OVER</h1>
                 <p class="text-[#8bac0f] text-xs text-center px-4">{{ message() }}</p>
                 <p class="text-[#8bac0f] text-xs mt-4 blink">PRESS START</p>
               </div>
            }

        </div>
      </div>

      <!-- Screen Gloss/Reflection -->
      <div class="absolute top-6 right-8 w-16 h-64 bg-gradient-to-b from-white to-transparent opacity-10 rotate-12 pointer-events-none rounded-lg"></div>

      <div class="text-center mt-2">
        <span class="text-gray-400 text-xs tracking-widest italic font-bold">GEMINI MATRIX DISPLAY</span>
      </div>
    </div>
  `,
  styles: [`
    .scanlines {
      background: linear-gradient(
        to bottom,
        rgba(255,255,255,0),
        rgba(255,255,255,0) 50%,
        rgba(0,0,0,0.1) 50%,
        rgba(0,0,0,0.1)
      );
      background-size: 100% 4px;
    }
    .pixel-grid {
        background-image: 
        linear-gradient(to right, rgba(0, 0, 0, 0.1) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 1px, transparent 1px);
        background-size: 4px 4px;
    }
    .blink {
      animation: blink 1s steps(2, start) infinite;
    }
    @keyframes blink {
      to { visibility: hidden; }
    }
    .grid-container {
      display: grid;
      gap: 1px;
      background-color: #8bac0f;
      padding: 2px;
    }
    @keyframes slide-down {
        0% { transform: translateY(-20px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
    }
    .animate-slide-down {
        animation: slide-down 2s ease-out forwards;
    }
    .typing-effect {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;  
        overflow: hidden;
    }
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
}
