
import { Component, output } from '@angular/core';

@Component({
  selector: 'app-game-controls',
  template: `
    <div class="controls-container w-full max-w-[340px] mx-auto relative select-none">
      <!-- Label removed or moved to app component for flexibility -->
      <div class="absolute top-[-20px] left-4 flex gap-2 items-center opacity-40 sm:opacity-80">
         <div class="w-1.5 h-1.5 rounded-full border border-[#374151]"></div>
         <span class="text-[#374151] italic font-bold tracking-wider text-[8px] font-sans">PHONES</span>
      </div>

      <div class="flex justify-between items-end px-2 pb-2 sm:pb-4">
        
        <!-- D-PAD AREA -->
        <div class="d-pad relative w-[120px] h-[120px] scale-90 sm:scale-100 origin-bottom-left">
          <div class="absolute inset-[15px] rounded-full bg-gray-300 opacity-20 blur-md"></div> <!-- Depression shadow -->
          
          <!-- D-Pad Cross -->
          <!-- Left -->
          <div class="absolute top-[40px] left-0 w-[40px] h-[40px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-l active:scale-[0.95] origin-right cursor-pointer shadow-lg z-10 border-r border-gray-700"
               (mousedown)="onInput('LEFT', $event)" (touchstart)="onInput('LEFT', $event)">
             <div class="w-full h-full flex items-center justify-center">
                <div class="w-[60%] h-[60%] rounded-full bg-gradient-to-br from-gray-700 to-black opacity-30"></div> <!-- Concave thumb rest -->
             </div>
          </div>
          <!-- Right -->
          <div class="absolute top-[40px] right-0 w-[40px] h-[40px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-r active:scale-[0.95] origin-left cursor-pointer shadow-lg z-10 border-l border-gray-700"
               (mousedown)="onInput('RIGHT', $event)" (touchstart)="onInput('RIGHT', $event)">
               <div class="w-full h-full flex items-center justify-center">
                <div class="w-[60%] h-[60%] rounded-full bg-gradient-to-br from-gray-700 to-black opacity-30"></div>
             </div>
          </div>
          <!-- Up -->
          <div class="absolute top-0 left-[40px] w-[40px] h-[40px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-t active:scale-[0.95] origin-bottom cursor-pointer shadow-lg z-10 border-b border-gray-700"
               (mousedown)="onInput('UP', $event)" (touchstart)="onInput('UP', $event)">
               <div class="w-full h-full flex items-center justify-center">
                <div class="w-[60%] h-[60%] rounded-full bg-gradient-to-br from-gray-700 to-black opacity-30"></div>
             </div>
          </div>
          <!-- Down -->
          <div class="absolute bottom-0 left-[40px] w-[40px] h-[40px] bg-gradient-to-b from-gray-800 to-gray-900 rounded-b active:scale-[0.95] origin-top cursor-pointer shadow-lg z-10 border-t border-gray-700"
               (mousedown)="onInput('DOWN', $event)" (touchstart)="onInput('DOWN', $event)">
               <div class="w-full h-full flex items-center justify-center">
                <div class="w-[60%] h-[60%] rounded-full bg-gradient-to-br from-gray-700 to-black opacity-30"></div>
             </div>
          </div>
          
          <!-- Center Pivot -->
          <div class="absolute top-[40px] left-[40px] w-[40px] h-[40px] bg-gray-900 z-20 flex items-center justify-center">
            <div class="w-[20px] h-[20px] rounded-full bg-gradient-to-br from-gray-800 to-black shadow-inner"></div>
          </div>
        </div>

        <!-- A/B Buttons -->
        <div class="action-buttons flex gap-4 sm:gap-5 transform -rotate-12 translate-y-[-10px] bg-gray-300/10 rounded-full px-4 py-2 scale-90 sm:scale-100 origin-bottom-right">
          <div class="flex flex-col items-center gap-1 group">
            <button class="w-12 h-12 rounded-full bg-gradient-to-br from-[#b91c3d] to-[#7f132a] shadow-[0_4px_0_#580d1d,0_5px_10px_rgba(0,0,0,0.4)] active:translate-y-[4px] active:shadow-none transition-all border border-[#8a152e] relative overflow-hidden"
                    (mousedown)="onInput('B', $event)" (touchstart)="onInput('B', $event)">
                 <div class="absolute top-1 right-2 w-3 h-2 bg-white opacity-20 rounded-full blur-[1px]"></div>
            </button>
            <span class="text-[#374151] font-bold text-sm tracking-widest font-sans emboss">B</span>
          </div>
          <div class="flex flex-col items-center gap-1 mt-[-15px] group">
            <button class="w-12 h-12 rounded-full bg-gradient-to-br from-[#b91c3d] to-[#7f132a] shadow-[0_4px_0_#580d1d,0_5px_10px_rgba(0,0,0,0.4)] active:translate-y-[4px] active:shadow-none transition-all border border-[#8a152e] relative overflow-hidden"
                    (mousedown)="onInput('A', $event)" (touchstart)="onInput('A', $event)">
                 <div class="absolute top-1 right-2 w-3 h-2 bg-white opacity-20 rounded-full blur-[1px]"></div>
            </button>
            <span class="text-[#374151] font-bold text-sm tracking-widest font-sans emboss">A</span>
          </div>
        </div>
      </div>

      <!-- Start/Select -->
      <div class="flex justify-center gap-6 mt-2">
        <div class="flex flex-col items-center gap-1">
          <button class="w-14 h-3 bg-gray-600 rounded-full transform rotate-[25deg] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] active:bg-gray-800 border border-gray-500"
                  (mousedown)="onInput('SELECT', $event)" (touchstart)="onInput('SELECT', $event)"></button>
          <span class="text-[#374151] font-bold text-[10px] tracking-widest mt-1 font-sans emboss">SELECT</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <button class="w-14 h-3 bg-gray-600 rounded-full transform rotate-[25deg] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] active:bg-gray-800 border border-gray-500"
                  (mousedown)="onInput('START', $event)" (touchstart)="onInput('START', $event)"></button>
          <span class="text-[#374151] font-bold text-[10px] tracking-widest mt-1 font-sans emboss">START</span>
        </div>
      </div>

      <!-- Speaker Grille -->
      <div class="absolute bottom-2 right-[-20px] flex gap-[6px] transform -rotate-[25deg] opacity-20 pointer-events-none">
         <div class="w-[6px] h-[60px] bg-black rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"></div>
         <div class="w-[6px] h-[60px] bg-black rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"></div>
         <div class="w-[6px] h-[60px] bg-black rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"></div>
         <div class="w-[6px] h-[60px] bg-black rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"></div>
         <div class="w-[6px] h-[60px] bg-black rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"></div>
         <div class="w-[6px] h-[60px] bg-black rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"></div>
      </div>
    </div>
  `,
  styles: [`
    .emboss {
      text-shadow: 1px 1px 0 rgba(255,255,255,0.4), -1px -1px 0 rgba(0,0,0,0.1);
    }
    .controls-container {
      touch-action: none;
    }
  `]
})
export class GameControlsComponent {
  readonly action = output<string>();

  onInput(key: string, event?: Event) {
    if (event) {
      if (event.cancelable) {
        event.preventDefault();
      }
    }
    
    // Haptic feedback
    if (window.navigator && window.navigator.vibrate) {
       try { window.navigator.vibrate(10); } catch(e) {}
    }
    this.action.emit(key);
  }
}
