
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogueData } from '../../models/game.types';

@Component({
  selector: 'app-dialogue',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="absolute bottom-0 left-0 right-0 bg-blue-900 border-t-2 border-white p-3 z-50 h-32 flex flex-col shadow-2xl animate-slide-up" role="dialog" aria-modal="true" aria-labelledby="npc-name">
       <header class="flex justify-between items-start mb-1">
          <span id="npc-name" class="text-yellow-400 font-bold text-xs tracking-wider">{{ data()?.npcName }}</span>
          <span class="text-[0.5rem] text-gray-300 animate-pulse" aria-hidden="true">PRESS A TO CONTINUE</span>
       </header>
       <p class="text-white text-[0.6rem] leading-relaxed font-mono overflow-y-auto m-0" aria-live="polite">
          {{ data()?.text }}
       </p>
       @if (data()?.isShopkeeper) {
          <footer class="mt-auto text-right text-[0.55rem] text-green-300 font-bold" aria-hidden="true">PRESS A TO TRADE</footer>
       }
    </article>
  `,
  styles: [`
    .animate-slide-up { animation: slideUp 0.3s ease-out; }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  `]
})
export class DialogueComponent {
  data = input.required<DialogueData | null>();
}
