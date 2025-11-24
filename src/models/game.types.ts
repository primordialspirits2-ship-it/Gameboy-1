
export type GameState = 'BOOT' | 'TITLE' | 'CLASS_SELECT' | 'LOADING' | 'PLAYING' | 'GAME_OVER' | 'INVENTORY' | 'DIALOGUE' | 'SHOP' | 'MAP' | 'LEVEL_UP';

export interface EnemySpawn {
  type: 'SLIME' | 'RAT' | 'SKELETON' | 'ROBOT' | 'GHOST' | 'ALIEN';
  x: number;
  y: number;
  name: string;
}

export interface Quest {
  id: string;
  giverName: string;
  description: string;
  targetItemName: string;
  rewardXp: number;
  rewardGold: number;
  isCompleted: boolean;
}

export interface NPCSpawn {
  name: string;
  role: 'VILLAGER' | 'SHOPKEEPER' | 'GUARD' | 'ELDER' | 'QUEST_GIVER';
  x: number;
  y: number;
  greeting: string; 
  personality: string; 
  shopInventory?: string[];
  activeQuest?: Quest; // If this NPC gives a quest
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

export interface ActiveEnemy {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  name: string;
  isElite?: boolean;
  flash?: boolean;
}

export interface CharacterClass {
  name: string;
  hp: number;
  mp: number;
  atk: number;
  def: number;
  grit: number;
  agility: number;
  will: number;
  wisdom: number;
  weapon: string;
  armor: string;
  desc: string;
  ability: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'POTION_HP' | 'POTION_MP' | 'ELIXIR' | 'QUEST_ITEM';
  desc: string;
  count: number;
  cost?: number; 
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  xp: number;
  xpToNext: number;
  atk: number;
  def: number;
  grit: number;    // Physical Defense / Max HP scaling
  agility: number; // Dodge / Crit chance
  will: number;    // Magic Defense / Max MP scaling
  wisdom: number;  // XP Gain / Ability Effectiveness
  pointsAvailable: number; // Stats to allocate
  weapon: string;
  armor: string;
  desc: string;
}

export interface DialogueData {
  npcName: string;
  text: string;
  isShopkeeper: boolean;
  hasQuest?: boolean;
  questCompleted?: boolean;
}
