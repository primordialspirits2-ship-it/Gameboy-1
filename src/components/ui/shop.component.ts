
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryItem } from '../../models/game.types';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute inset-4 bg-[#1f2937] border-2 border-white z-50 p-2 shadow-2xl animate-fade-in flex flex-col" role="dialog" aria-modal="true" aria-labelledby="shop-title">
       <header id="shop-title" class="text-center text-white border-b border-gray-500 pb-1 mb-2 font-bold text-sm tracking-wider uppercase">
          {{ npcName() || 'SHOP' }}'S WARES
       </header>
       
       <ul class="flex-1 space-y-2 overflow-y-auto list-none m-0 p-0" role="listbox" aria-label="Items for Sale">
          @for (item of items(); track item.id; let i = $index) {
             <li class="flex items-center p-1" 
                  [class.bg-blue-900]="i === cursor()"
                  [class.text-white]="i === cursor()"
                  [class.text-gray-400]="i !== cursor()"
                  role="option"
                  [attr.aria-selected]="i === cursor()">
                <div class="w-4 text-center mr-1" aria-hidden="true">{{ i === cursor() ? '►' : '' }}</div>
                <div class="flex-1">
                   <div class="text-xs font-bold">{{ item.name }}</div>
                   <div class="text-[0.5rem] italic opacity-80">{{ item.desc }}</div>
                </div>
                <div class="text-xs font-mono text-yellow-400">{{ item.cost }}G</div>
             </li>
          }
       </ul>

       <footer class="mt-2 border-t border-gray-500 pt-1 flex justify-between text-[0.6rem] text-gray-300">
          <span aria-label="Your Current Gold">YOUR GOLD: <span class="text-yellow-400">{{ score() }}G</span></span>
          <span class="animate-pulse" aria-hidden="true">B: EXIT</span>
       </footer>
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class ShopComponent {
  npcName = input.required<string>();
  items = input.required<InventoryItem[]>();
  cursor = input.required<number>();
  score = input.required<number>();
}
