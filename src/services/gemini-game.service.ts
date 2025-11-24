import { Injectable } from '@angular/core';
import { GoogleGenAI, Schema, Type } from '@google/genai';

export interface EnemySpawn {
  type: 'SLIME' | 'RAT' | 'SKELETON' | 'ROBOT' | 'GHOST' | 'ALIEN';
  x: number;
  y: number;
  name: string;
}

export interface NPCSpawn {
  name: string;
  role: 'VILLAGER' | 'SHOPKEEPER' | 'GUARD' | 'ELDER';
  x: number;
  y: number;
  greeting: string; // Short initial text
  personality: string; // Context for AI generation
  shopInventory?: string[]; // List of item types if shopkeeper
}

export interface WorldChunk {
  layout: number[][]; // 0=Floor, 1=Wall, 2=Hazard, 3=Treasure, 4=DroppedItem, 5=Building
  width: number;
  height: number;
  biomeName: string;
  flavorText: string;
  enemies: EnemySpawn[];
  npcs: NPCSpawn[];
  isCity: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiGameService {
  private readonly ai: GoogleGenAI;
  private readonly modelId = 'gemini-2.5-flash';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });
  }

  async generateDialogue(npc: NPCSpawn, playerClass: string, biome: string): Promise<string> {
    const prompt = `
      Write a short RPG dialogue (max 2 sentences).
      Speaker: ${npc.name} (${npc.role}).
      Personality: ${npc.personality}.
      Location: ${biome}.
      The player is a ${playerClass}.
      
      If the NPC is a SHOPKEEPER, they should mention they have wares.
      If the NPC is a GUARD, they should be stern but helpful.
      Match the tone to the biome (Fantasy vs Sci-Fi).
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelId,
        contents: prompt,
        config: {
          maxOutputTokens: 100,
          temperature: 0.9
        }
      });
      return response.text?.trim() || "...";
    } catch (e) {
      return "The transmission is static...";
    }
  }

  async generateChunk(chunkX: number, chunkY: number): Promise<WorldChunk> {
    const width = 10;
    const height = 9;
    
    // Determine if this should be a city (approx 20% chance or if 0,0)
    const isCity = (chunkX === 0 && chunkY === 0) || Math.random() < 0.2;

    const prompt = `Generate a map chunk for an 8-bit RPG open world at coordinates (${chunkX}, ${chunkY}).
    Grid Size: ${width}x${height}.
    
    Context:
    - X > 0: Sci-fi/Future. X < 0: Fantasy/Ancient.
    - Y > 0: Cold/Snow. Y < 0: Hot/Magma.
    - Is City/Town: ${isCity}.

    Rules:
    - Layout: ${height} rows, ${width} cols. 
      - 0=Floor
      - 1=Wall
      - 2=Hazard (Rare)
      - 3=Treasure
      - 5=Building/House (Use for Cities).
    
    ${isCity ? 
      `CITY RULES:
       - No enemies.
       - Include 2-3 NPCs (VILLAGER, SHOPKEEPER, GUARD).
       - Use code 5 for houses/shops.
       - Open paths.` 
      : 
      `WILDERNESS RULES:
       - List 1-3 enemies.
       - Ancient: SLIME, RAT, SKELETON, GHOST.
       - Future: ROBOT, ALIEN.
       - No NPCs.`
    }

    - CRITICAL: The map MUST be traversable.
    - If chunk (0,0): Center (5,4) MUST be empty (0).
    `;

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        layout: {
          type: Type.ARRAY,
          items: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
          },
        },
        biomeName: { type: Type.STRING },
        flavorText: { type: Type.STRING },
        isCity: { type: Type.BOOLEAN },
        enemies: {
          type: Type.ARRAY,
          items: {
             type: Type.OBJECT,
             properties: {
                type: { type: Type.STRING, enum: ['SLIME', 'RAT', 'SKELETON', 'ROBOT', 'GHOST', 'ALIEN'] },
                x: { type: Type.INTEGER },
                y: { type: Type.INTEGER },
                name: { type: Type.STRING }
             },
             required: ['type', 'x', 'y', 'name']
          }
        },
        npcs: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING, enum: ['VILLAGER', 'SHOPKEEPER', 'GUARD', 'ELDER'] },
              x: { type: Type.INTEGER },
              y: { type: Type.INTEGER },
              greeting: { type: Type.STRING },
              personality: { type: Type.STRING },
              shopInventory: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                nullable: true 
              }
            },
            required: ['name', 'role', 'x', 'y', 'greeting', 'personality']
          }
        }
      },
      required: ['layout', 'biomeName', 'flavorText', 'enemies', 'npcs', 'isCity']
    };

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelId,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        }
      });

      let text = response.text || '{}';
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

      const json = JSON.parse(text);
      
      return {
        width,
        height,
        layout: json.layout,
        biomeName: json.biomeName || 'Unknown Sector',
        flavorText: json.flavorText || 'Static fills the air...',
        enemies: json.enemies || [],
        npcs: json.npcs || [],
        isCity: !!json.isCity
      };
    } catch (e) {
      console.error("Gemini generation failed", e);
      return this.getFallbackChunk(chunkX, chunkY);
    }
  }

  private getFallbackChunk(x: number, y: number): WorldChunk {
    return {
      width: 10,
      height: 9,
      layout: [
        [0,0,1,0,0,0,0,1,0,0],
        [0,0,1,0,0,0,0,1,0,0],
        [1,1,1,0,0,0,0,1,1,1],
        [0,0,0,0,3,3,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0],
        [1,1,1,0,0,0,0,1,1,1],
        [0,0,1,0,0,0,0,1,0,0],
        [0,0,1,0,0,0,0,1,0,0],
      ],
      biomeName: `Glitch Sector ${x},${y}`,
      flavorText: "The simulation is unstable here.",
      enemies: [
        { type: 'SLIME', x: 2, y: 2, name: 'Glitch Slime' }
      ],
      npcs: [],
      isCity: false
    };
  }
}