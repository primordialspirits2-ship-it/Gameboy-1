import { Component, output } from '@angular/core';

@Component({
  selector: 'app-game-controls',
  template: `
    <div class="controls-container mt-8 w-full max-w-[340px] mx-auto relative select-none">
      <!-- Label -->
      <div class="absolute top-[-30px] left-4 text-[#306230] opacity-80 italic font-bold tracking-wider text-xs">
        STEREO SOUND
      </div>

      <div class="flex justify-between items-end px-4 pb-4">
        
        <!-- D-PAD -->
        <div class="d-pad relative w-[120px] h-[120px]">
          <div class="absolute top-[40px] left-0 w-[40px] h-[40px] bg-gray-900 rounded-l active:bg-gray-700 cursor-pointer shadow-lg"
               (mousedown)="onInput('LEFT', $event)" (touchstart)="onInput('LEFT', $event)">
            <div class="w-full h-full flex items-center justify-center"><div class="w-0 h-0 border-t-[6px] border-t-transparent border-r-[10px] border-r-gray-600 border-b-[6px] border-b-transparent"></div></div>
          </div>
          <div class="absolute top-[40px] right-0 w-[40px] h-[40px] bg-gray-900 rounded-r active:bg-gray-700 cursor-pointer shadow-lg"
               (mousedown)="onInput('RIGHT', $event)" (touchstart)="onInput('RIGHT', $event)">
               <div class="w-full h-full flex items-center justify-center"><div class="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-gray-600 border-b-[6px] border-b-transparent"></div></div>
          </div>
          <div class="absolute top-0 left-[40px] w-[40px] h-[40px] bg-gray-900 rounded-t active:bg-gray-700 cursor-pointer shadow-lg"
               (mousedown)="onInput('UP', $event)" (touchstart)="onInput('UP', $event)">
               <div class="w-full h-full flex items-center justify-center"><div class="w-0 h-0 border-l-[6px] border-l-transparent border-b-[10px] border-b-gray-600 border-r-[6px] border-r-transparent"></div></div>
          </div>
          <div class="absolute bottom-0 left-[40px] w-[40px] h-[40px] bg-gray-900 rounded-b active:bg-gray-700 cursor-pointer shadow-lg"
               (mousedown)="onInput('DOWN', $event)" (touchstart)="onInput('DOWN', $event)">
               <div class="w-full h-full flex items-center justify-center"><div class="w-0 h-0 border-l-[6px] border-l-transparent border-t-[10px] border-t-gray-600 border-r-[6px] border-r-transparent"></div></div>
          </div>
          <!-- Center D-pad pivot -->
          <div class="absolute top-[40px] left-[40px] w-[40px] h-[40px] bg-gray-900 radial-gradient">
            <div class="w-[30px] h-[30px] rounded-full bg-gray-800 mx-auto mt-[5px] shadow-inner opacity-50"></div>
          </div>
        </div>

        <!-- A/B Buttons -->
        <div class="action-buttons flex gap-4 transform -rotate-12 translate-y-[-10px]">
          <div class="flex flex-col items-center gap-1">
            <button class="w-12 h-12 rounded-full bg-red-700 shadow-md active:translate-y-1 active:shadow-none border-b-4 border-red-900 transition-transform"
                    (mousedown)="onInput('B', $event)" (touchstart)="onInput('B', $event)"></button>
            <span class="text-blue-900 font-bold text-sm tracking-widest">B</span>
          </div>
          <div class="flex flex-col items-center gap-1 mt-[-15px]">
            <button class="w-12 h-12 rounded-full bg-red-700 shadow-md active:translate-y-1 active:shadow-none border-b-4 border-red-900 transition-transform"
                    (mousedown)="onInput('A', $event)" (touchstart)="onInput('A', $event)"></button>
            <span class="text-blue-900 font-bold text-sm tracking-widest">A</span>
          </div>
        </div>
      </div>

      <!-- Start/Select -->
      <div class="flex justify-center gap-8 mt-2">
        <div class="flex flex-col items-center gap-1">
          <button class="w-16 h-3 bg-gray-700 rounded-full transform rotate-[25deg] shadow active:bg-gray-900 border border-gray-900"
                  (mousedown)="onInput('SELECT', $event)" (touchstart)="onInput('SELECT', $event)"></button>
          <span class="text-blue-900 font-bold text-xs tracking-widest mt-1">SELECT</span>
        </div>
        <div class="flex flex-col items-center gap-1">
          <button class="w-16 h-3 bg-gray-700 rounded-full transform rotate-[25deg] shadow active:bg-gray-900 border border-gray-900"
                  (mousedown)="onInput('START', $event)" (touchstart)="onInput('START', $event)"></button>
          <span class="text-blue-900 font-bold text-xs tracking-widest mt-1">START</span>
        </div>
      </div>

      <!-- Speaker Grille -->
      <div class="absolute bottom-4 right-[-10px] flex gap-1 transform -rotate-[20deg] opacity-30">
         <div class="w-1.5 h-12 bg-black rounded-full"></div>
         <div class="w-1.5 h-12 bg-black rounded-full"></div>
         <div class="w-1.5 h-12 bg-black rounded-full"></div>
         <div class="w-1.5 h-12 bg-black rounded-full"></div>
         <div class="w-1.5 h-12 bg-black rounded-full"></div>
         <div class="w-1.5 h-12 bg-black rounded-full"></div>
      </div>
    </div>
  `,
  styles: [`
    .radial-gradient {
      background: radial-gradient(circle at center, #2d3748 0%, #1a202c 100%);
    }
    .controls-container {
      touch-action: none; /* Disables browser zoom/scroll handling */
    }
  `]
})
export class GameControlsComponent {
  readonly action = output<string>();

  onInput(key: string, event?: Event) {
    if (event) {
      // Important to prevent default touch behaviors like scrolling or zooming
      // and to prevent double-firing on some touch devices (touch + mouse emulation)
      if (event.cancelable) {
        event.preventDefault();
      }
    }
    
    // Haptic feedback if available
    if (window.navigator && window.navigator.vibrate) {
       try { window.navigator.vibrate(10); } catch(e) {}
    }
    this.action.emit(key);
  }
}