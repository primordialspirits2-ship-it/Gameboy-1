
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerStats } from '../../models/game.types';

@Component({
  selector: 'app-status-hud',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#1f2937] to-transparent z-20 flex justify-between px-2 pt-2 text-[0.65rem] font-bold text-white drop-shadow-md" role="status">
        <div class="flex gap-3">
            <span class="text-[#fca5a5]" aria-label="Health Points">HP {{ stats().hp }}/{{ stats().maxHp }}</span>
            <span class="text-[#93c5fd]" aria-label="Magic Points">MP {{ stats().mp }}/{{ stats().maxMp }}</span>
        </div>
        <div class="flex gap-3">
            <span class="text-[#fbbf24]" aria-label="Player Level">LV {{ stats().level }}</span>
            <span class="text-[#fbbf24]" aria-label="Gold Collected">G {{ score() }}</span>
        </div>
    </header>
  `
})
export class StatusHudComponent {
  stats = input.required<PlayerStats>();
  score = input.required<number>();
}
