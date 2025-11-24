
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryItem, PlayerStats } from '../../models/game.types';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute top-10 right-0 bottom-0 w-3/4 sm:w-2/3 bg-[#111827] border-l-2 border-gray-600 z-40 p-3 shadow-xl animate-slide-left flex flex-col" role="dialog" aria-modal="true" aria-labelledby="inv-title">
       <header class="flex justify-between items-center border-b border-gray-600 pb-1 mb-2">
          <span id="inv-title" class="text-white font-bold text-xs">MENU</span>
          <span class="text-[0.6rem] text-yellow-400">LVL {{ stats().level }}</span>
       </header>

       <div class="flex-1 flex flex-col gap-4 overflow-hidden">
          
          <!-- Character Stats Panel -->
          <div class="bg-gray-800 p-2 rounded border border-gray-700">
             <div class="text-[0.6rem] text-gray-400 font-bold mb-1 tracking-wider border-b border-gray-600">STATS</div>
             <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.6rem] font-mono">
                <div class="flex justify-between"><span class="text-red-300">ATK</span> <span class="text-white">{{ stats().atk }}</span></div>
                <div class="flex justify-between"><span class="text-blue-300">DEF</span> <span class="text-white">{{ stats().def }}</span></div>
                <div class="flex justify-between" title="Max HP + Defense"><span class="text-orange-300">GRIT</span> <span class="text-white">{{ stats().grit }}</span></div>
                <div class="flex justify-between" title="Dodge + Crit"><span class="text-green-300">AGIL</span> <span class="text-white">{{ stats().agility }}</span></div>
                <div class="flex justify-between" title="Max MP"><span class="text-indigo-300">WILL</span> <span class="text-white">{{ stats().will }}</span></div>
                <div class="flex justify-between" title="XP Gain"><span class="text-purple-300">WISD</span> <span class="text-white">{{ stats().wisdom }}</span></div>
             </div>
          </div>

          <!-- Inventory List -->
          <div class="flex-1 flex flex-col min-h-0">
             <div class="text-[0.6rem] text-gray-400 font-bold mb-1 tracking-wider border-b border-gray-600">ITEMS</div>
             @if (items().length === 0) {
                <div class="text-gray-500 text-[0.6rem] text-center mt-4 italic">Bag is empty</div>
             }
             
             <ul class="space-y-1 list-none m-0 p-0 overflow-y-auto" role="listbox" aria-label="Inventory Items">
                @for (item of items(); track item.id; let i = $index) {
                   <li class="flex items-center text-[0.6rem] p-1 rounded transition-colors"
                        [class.bg-blue-900]="i === cursor()"
                        [class.text-white]="i === cursor()"
                        [class.text-gray-400]="i !== cursor()"
                        role="option"
                        [attr.aria-selected]="i === cursor()">
                      <span class="w-3 text-center" aria-hidden="true">{{ i === cursor() ? '►' : '' }}</span>
                      <span class="flex-1 truncate">{{ item.name }}</span>
                      <span class="ml-2 text-gray-500">x{{ item.count }}</span>
                   </li>
                }
             </ul>
          </div>

       </div>
       
       <footer class="mt-2 text-[0.5rem] text-gray-500 border-t border-gray-700 pt-1" aria-hidden="true">
          {{ items().length > 0 ? 'A: USE / B: CLOSE' : 'B: CLOSE' }}
       </footer>
    </div>
  `,
  styles: [`
    .animate-slide-left { animation: slideLeft 0.2s ease-out; }
    @keyframes slideLeft { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  `]
})
export class InventoryComponent {
  items = input.required<InventoryItem[]>();
  cursor = input.required<number>();
  stats = input.required<PlayerStats>();
}
