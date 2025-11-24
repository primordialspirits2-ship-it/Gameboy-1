
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorldChunk } from '../../models/game.types';

export interface MapGridData {
  width: number;
  height: number;
  cells: (WorldChunk & {x: number, y: number} | null)[];
}

@Component({
  selector: 'app-world-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute inset-0 z-50 bg-[#1f2937] flex flex-col p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="map-title">
      <header class="flex justify-between items-end border-b-2 border-white pb-2 mb-4">
         <h2 id="map-title" class="text-white text-xl font-bold tracking-wider">WORLD MAP</h2>
         <span class="text-xs text-gray-400 animate-pulse" aria-hidden="true">PRESS B TO CLOSE</span>
      </header>
      
      <div class="flex-1 overflow-auto flex items-center justify-center bg-[#111827] rounded-lg shadow-inner border border-gray-700 relative">
        <!-- Dynamic Map Grid -->
         <div class="grid gap-1 p-4" 
              [style.grid-template-columns]="'repeat(' + gridData().width + ', 30px)'"
              role="grid"
              aria-label="Explored Sectors Grid">
            @for (cell of gridData().cells; track $index) {
              <div class="w-[30px] h-[30px] flex items-center justify-center text-[8px] relative rounded-sm transition-all"
                   [class.bg-gray-800]="!cell"
                   [class.bg-[#4ade80]]="cell && cell.isCity"
                   [class.bg-[#60a5fa]]="cell && !cell.isCity && cell.biomeName.includes('Ice')"
                   [class.bg-[#ef4444]]="cell && !cell.isCity && cell.biomeName.includes('Magma')"
                   [class.bg-[#a78bfa]]="cell && !cell.isCity && !cell.biomeName.includes('Ice') && !cell.biomeName.includes('Magma')"
                   [class.border]="cell"
                   [class.border-white]="cell && cell.x === currentCoords().x && cell.y === currentCoords().y"
                   [class.opacity-40]="!cell"
                   role="gridcell"
                   [attr.aria-label]="cell ? (cell.isCity ? 'City Sector' : cell.biomeName) : 'Unexplored Sector'">
                 
                 @if(cell) {
                   @if(cell.x === currentCoords().x && cell.y === currentCoords().y) {
                     <div class="absolute inset-0 animate-pulse bg-white/30 z-10"></div>
                     <div class="w-2 h-2 rounded-full bg-white z-20" aria-label="You are here"></div>
                   }
                   @if(cell.isCity) {
                     <span class="text-black font-bold z-10" aria-hidden="true">C</span>
                   }
                 }
              </div>
            }
         </div>
         
         @if(gridData().cells.length === 0) {
           <div class="text-gray-500 text-xs">NO DATA</div>
         }
      </div>

      <footer class="mt-4 text-[10px] text-gray-400 font-mono text-center">
         Coordinates: {{ currentCoords().x }}, {{ currentCoords().y }}
      </footer>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class WorldMapComponent {
  gridData = input.required<MapGridData>();
  currentCoords = input.required<{x: number, y: number}>();
}
