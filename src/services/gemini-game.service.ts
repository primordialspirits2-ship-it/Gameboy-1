
import { Injectable } from '@angular/core';
import { GoogleGenAI, Schema, Type } from '@google/genai';
import { WorldChunk, NPCSpawn, Quest } from '../models/game.types';

export interface ChunkExits {
  north?: number[];
  south?: number[];
  east?: number[];
  west?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class GeminiGameService {
  private readonly ai: GoogleGenAI;
  private readonly modelId = 'gemini-2.5-flash';
  
  // Larger chunk size for True Open World feel
  private readonly CHUNK_WIDTH = 20;
  private readonly CHUNK_HEIGHT = 15;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
  }

  // Deterministic Biome based on coordinates (Perlin-ish logic)
  getBiomeForCoords(x: number, y: number): string {
    const scale = 0.15;
    const val = Math.sin(x * scale) + Math.cos(y * scale);
    
    if (x === 0 && y === 0) return 'Starter Valley';
    if (val > 1.2) return 'Volcanic Crags'; // Hot
    if (val > 0.5) return 'Sand Dunes'; // Desert
    if (val > -0.5) return 'Ancient Forest'; // Neutral
    if (val > -1.2) return 'Iron Wasteland'; // Industrial
    return 'Cryo Tundra'; // Cold
  }

  async generateDialogue(npc: NPCSpawn, playerClass: string, biome: string): Promise<string> {
    const prompt = `
      Write RPG dialogue (max 2 sentences).
      Speaker: ${npc.name} (${npc.role}). Personality: ${npc.personality}.
      Location: ${biome}. Player: ${playerClass}.
      ${npc.activeQuest ? `CONTEXT: You have a quest: "${npc.activeQuest.description}". Ask the player for help.` : ''}
      Return ONLY text.
    `;
    
    try {
      const response = await this.ai.models.generateContent({
        model: this.modelId,
        contents: prompt,
        config: { maxOutputTokens: 100 }
      });
      return response.text?.trim() || "...";
    } catch { return "Hello."; }
  }

  async generateChunk(chunkX: number, chunkY: number, exits: ChunkExits): Promise<WorldChunk> {
    const width = this.CHUNK_WIDTH;
    const height = this.CHUNK_HEIGHT;
    const biome = this.getBiomeForCoords(chunkX, chunkY);
    
    // City chance based on coords hash, ensuring fixed locations
    const hash = Math.abs((chunkX * 73856093) ^ (chunkY * 19349663));
    const isCity = (chunkX === 0 && chunkY === 0) || (hash % 10 === 0);

    const prompt = `
    Generate a 2D RPG map chunk (${width}x${height}).
    Biome: ${biome}.
    Is City: ${isCity}.
    
    CRITICAL LAYOUT RULES:
    - This is an OPEN WORLD. Do NOT create enclosed rooms.
    - Edges must be open to allow travel to neighboring maps.
    ${exits.north ? `- Connect to PATH at TOP (y=0) x=[${exits.north.join(',')}].` : ''}
    ${exits.south ? `- Connect to PATH at BOTTOM (y=${height-1}) x=[${exits.south.join(',')}].` : ''}
    ${exits.west ? `- Connect to PATH at LEFT (x=0) y=[${exits.west.join(',')}].` : ''}
    ${exits.east ? `- Connect to PATH at RIGHT (x=${width-1}) y=[${exits.east.join(',')}].` : ''}
    
    Layout Codes: 0=Floor, 1=Wall, 2=Hazard, 3=Chest, 5=Building.

    ${isCity ? `
      - Create a town layout with buildings (5) and clear paths (0).
      - Add 2-3 NPCs. One might be a QUEST_GIVER.
    ` : `
      - Wilderness. Add 3-5 enemies appropriate for ${biome}.
      - Add obstacles (1) and environment.
    `}
    `;

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        layout: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.INTEGER } } },
        flavorText: { type: Type.STRING },
        enemies: {
          type: Type.ARRAY, items: {
             type: Type.OBJECT,
             properties: {
                type: { type: Type.STRING, enum: ['SLIME', 'RAT', 'SKELETON', 'ROBOT', 'GHOST', 'ALIEN'] },
                x: { type: Type.INTEGER },
                y: { type: Type.INTEGER },
                name: { type: Type.STRING }
             }, required: ['type', 'x', 'y', 'name']
          }
        },
        npcs: {
          type: Type.ARRAY, items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING, enum: ['VILLAGER', 'SHOPKEEPER', 'GUARD', 'ELDER', 'QUEST_GIVER'] },
              x: { type: Type.INTEGER },
              y: { type: Type.INTEGER },
              greeting: { type: Type.STRING },
              personality: { type: Type.STRING },
              shopInventory: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
              activeQuest: {
                 type: Type.OBJECT, nullable: true,
                 properties: {
                    id: { type: Type.STRING },
                    giverName: { type: Type.STRING },
                    description: { type: Type.STRING },
                    targetItemName: { type: Type.STRING },
                    rewardXp: { type: Type.INTEGER },
                    rewardGold: { type: Type.INTEGER }
                 }
              }
            }, required: ['name', 'role', 'x', 'y', 'greeting', 'personality']
          }
        }
      },
      required: ['layout', 'flavorText', 'enemies', 'npcs']
    };

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelId,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: schema }
      });

      let text = response.text || '{}';
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const json = JSON.parse(text);
      
      let layout = json.layout;

      // --- CRITICAL POST-PROCESSING: FORCE PATHS ---
      // AI isn't always perfect. We must forcefully carve the paths to match neighbors.
      // If no neighbor exists, we carve a default center path to ensure the map isn't a closed box.

      // North (Top Row)
      if (exits.north && exits.north.length) {
         exits.north.forEach(x => { if (layout[0]) layout[0][x] = 0; });
      } else {
         // Default Exit: Center
         const mid = Math.floor(width / 2);
         if (layout[0]) { layout[0][mid] = 0; layout[0][mid+1] = 0; }
      }

      // South (Bottom Row)
      if (exits.south && exits.south.length) {
         exits.south.forEach(x => { if (layout[height-1]) layout[height-1][x] = 0; });
      } else {
         const mid = Math.floor(width / 2);
         if (layout[height-1]) { layout[height-1][mid] = 0; layout[height-1][mid+1] = 0; }
      }

      // West (Left Col)
      if (exits.west && exits.west.length) {
         exits.west.forEach(y => { if (layout[y]) layout[y][0] = 0; });
      } else {
         const mid = Math.floor(height / 2);
         if (layout[mid]) layout[mid][0] = 0;
         if (layout[mid+1]) layout[mid+1][0] = 0;
      }

      // East (Right Col)
      if (exits.east && exits.east.length) {
         exits.east.forEach(y => { if (layout[y]) layout[y][width-1] = 0; });
      } else {
         const mid = Math.floor(height / 2);
         if (layout[mid]) layout[mid][width-1] = 0;
         if (layout[mid+1]) layout[mid+1][width-1] = 0;
      }

      // Post-process quests
      const npcs = (json.npcs || []).map((n: any) => {
         if (n.activeQuest) {
            n.activeQuest.isCompleted = false;
            n.activeQuest.giverName = n.name;
            n.activeQuest.id = crypto.randomUUID();
         }
         return n;
      });

      return {
        width, height,
        layout: layout,
        biomeName: biome,
        flavorText: json.flavorText,
        enemies: json.enemies || [],
        npcs: npcs,
        isCity: isCity
      };
    } catch (e) {
      console.error(e);
      return this.getFallbackChunk(width, height, chunkX, chunkY, biome);
    }
  }

  private getFallbackChunk(w: number, h: number, x: number, y: number, biome: string): WorldChunk {
    const layout = Array(h).fill(0).map(() => Array(w).fill(0));
    // Simple borders
    for(let i=0; i<h; i++) { layout[i][0]=1; layout[i][w-1]=1; }
    for(let j=0; j<w; j++) { layout[0][j]=1; layout[h-1][j]=1; }
    // Add gates
    layout[Math.floor(h/2)][0] = 0; layout[Math.floor(h/2)][w-1] = 0;
    layout[0][Math.floor(w/2)] = 0; layout[h-1][Math.floor(w/2)] = 0;

    return {
      width: w, height: h, layout,
      biomeName: biome, flavorText: "Connection lost. Using emergency map.",
      enemies: [], npcs: [], isCity: false
    };
  }
}
