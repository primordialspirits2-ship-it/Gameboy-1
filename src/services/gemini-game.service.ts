import { Injectable } from '@angular/core';
import { GoogleGenAI, Schema, Type } from '@google/genai';

export interface EnemySpawn {
  type: 'SLIME' | 'RAT' | 'SKELETON' | 'ROBOT' | 'GHOST' | 'ALIEN';
  x: number;
  y: number;
  name: string;
}

export interface WorldChunk {
  layout: number[][]; // 0=Floor, 1=Wall, 2=Hazard, 3=Treasure, 4=DroppedItem
  width: number;
  height: number;
  biomeName: string;
  flavorText: string;
  enemies: EnemySpawn[];
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

  async generateChunk(chunkX: number, chunkY: number): Promise<WorldChunk> {
    const width = 10;
    const height = 9;

    const prompt = `Generate a map chunk for an 8-bit RPG open world at coordinates (${chunkX}, ${chunkY}).
    Grid Size: ${width}x${height}.
    
    Context:
    - X > 0: Sci-fi/Future. X < 0: Fantasy/Ancient.
    - Y > 0: Cold/Snow. Y < 0: Hot/Magma.
    
    Rules:
    - Layout: ${height} rows, ${width} cols. 0=Floor, 1=Wall, 2=Hazard (Rare), 3=Treasure (1-3).
    - Enemies: List 1-3 enemies. 
      - Ancient/Fantasy: SLIME, RAT, SKELETON, GHOST.
      - Future/SciFi: ROBOT, ALIEN, DRONE (use RAT stats).
    - CRITICAL: The map MUST be traversable. Do NOT generate a closed box or room. 
    - CRITICAL: Use Walls (1) sparsely. Create open fields or maze-like paths, but never fully enclose an area.
    - Edges should be mostly open to allow travel to neighboring chunks.
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
        }
      },
      required: ['layout', 'biomeName', 'flavorText', 'enemies']
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
        enemies: json.enemies || []
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
      ]
    };
  }
}