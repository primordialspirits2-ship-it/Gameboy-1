import { Injectable } from '@angular/core';
import { GoogleGenAI, Schema, Type } from '@google/genai';

export interface WorldChunk {
  layout: number[][]; // 0=Floor, 1=Wall, 2=Hazard, 3=Treasure
  width: number;
  height: number;
  biomeName: string;
  flavorText: string;
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
    - As X increases, the world gets more futuristic/technological.
    - As X decreases, the world gets more ancient/ruined.
    - As Y increases, the biome gets colder/snowy.
    - As Y decreases, the biome gets hotter/volcanic.
    
    Rules:
    - The layout must be a ${height}x${width} integer array.
    - 0: Walkable Floor
    - 1: Wall / Obstacle (Tree, Rock, Building)
    - 2: Hazard (Spikes, Lava, Water) - Use sparingly.
    - 3: Treasure/Loot (Coins, Items) - Place 1 to 3 treasures in hard to reach spots.
    
    - Connectivity: This is an open world. Do not seal off the edges completely. The player must be able to traverse through this chunk to neighbor chunks.
    - Create organic shapes, rooms, or paths.
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
          description: `A 2D grid of integers. Rows: ${height}, Cols: ${width}.`,
        },
        biomeName: { type: Type.STRING, description: "Name of this area (e.g. 'Frozen Waste', 'Neon City Outskirts')" },
        flavorText: { type: Type.STRING, description: "One sentence description of the atmosphere." }
      },
      required: ['layout', 'biomeName', 'flavorText']
    };

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelId,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          thinkingConfig: { thinkingBudget: 512 }, // Lower thinking for faster world gen
          maxOutputTokens: 2048, 
        }
      });

      let text = response.text || '{}';
      // Sanitize: Remove markdown code block syntax if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const json = JSON.parse(text);
      
      // Basic validation
      if (!json.layout || json.layout.length !== height) {
        throw new Error('Invalid grid dimensions generated');
      }

      return {
        width,
        height,
        layout: json.layout,
        biomeName: json.biomeName || 'Unknown Sector',
        flavorText: json.flavorText || 'Static fills the air...'
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
      flavorText: "The simulation is unstable here."
    };
  }
}