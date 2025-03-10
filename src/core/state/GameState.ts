/**
 * GameState interface
 * Represents the complete state of the game at any point in time
 */
export interface GameState {
  id: string;
  player: Character;
  currentLocation: Location;
  npcs: Map<string, NPC>;
  combatState: CombatState | null;
  inventory: Inventory;
  quests: Quest[];
  gameTime: GameTime;
  worldState: WorldState;
  sessionHistory: GameEvent[];
}

/**
 * Character interface
 * Represents a player character or NPC
 */
export interface Character {
  id: string;
  name: string;
  race: Race;
  class: CharacterClass[];
  background: Background;
  abilities: AbilityScores;
  hitPoints: {current: number, maximum: number};
  level: number;
  experience: number;
  proficiencies: Proficiency[];
  inventory: Inventory;
  spellbook: Spellbook | null;
  features: Feature[];
  personality: CharacterPersonality;
  conditions: Condition[];
}

/**
 * Location interface
 * Represents a location in the game world
 */
export interface Location {
  id: string;
  name: string;
  description: string;
  connections: Connection[];
  npcs: string[]; // IDs of NPCs present
  items: Item[];
  environment: Environment;
  isDiscovered: boolean;
}

/**
 * NPC interface
 * Represents a non-player character
 */
export interface NPC {
  id: string;
  name: string;
  description: string;
  attitude: Attitude;
  dialogue: DialogueNode[];
  character?: Character; // For NPCs that have full character sheets
  questGiver: boolean;
  memory: NPCMemory[];
}

/**
 * CombatState interface
 * Represents the state of combat
 */
export interface CombatState {
  id: string;
  participants: CombatParticipant[];
  initiativeOrder: string[]; // IDs in initiative order
  currentTurn: number;
  round: number;
  isActive: boolean;
  environment: CombatEnvironment;
}

/**
 * Inventory interface
 * Represents a collection of items
 */
export interface Inventory {
  id: string;
  items: Item[];
  gold: number;
  maxWeight: number;
  currentWeight: number;
}

/**
 * Quest interface
 * Represents a quest or mission
 */
export interface Quest {
  id: string;
  name: string;
  description: string;
  objectives: QuestObjective[];
  rewards: Reward[];
  isComplete: boolean;
  isActive: boolean;
  giver: string; // NPC ID
}

/**
 * GameTime interface
 * Represents the passage of time in the game
 */
export interface GameTime {
  day: number;
  hour: number;
  minute: number;
  timeOfDay: TimeOfDay;
  totalMinutes: number;
}

/**
 * WorldState interface
 * Represents the state of the game world
 */
export interface WorldState {
  name: string;
  regions: Region[];
  currentWeather: Weather;
  globalEvents: WorldEvent[];
  factions: Faction[];
}

/**
 * GameEvent interface
 * Represents an event that occurred during gameplay
 */
export interface GameEvent {
  id: string;
  timestamp: number;
  type: EventType;
  description: string;
  relatedEntities: string[]; // IDs of related entities
  location: string; // Location ID
}

// Placeholder types (to be implemented in separate files)
export type Race = any;
export type CharacterClass = any;
export type Background = any;
export type AbilityScores = any;
export type Proficiency = any;
export type Spellbook = any;
export type Feature = any;
export type CharacterPersonality = any;
export type Condition = any;
export type Connection = any;
export type Item = any;
export type Environment = any;
export type Attitude = any;
export type DialogueNode = any;
export type NPCMemory = any;
export type CombatParticipant = any;
export type CombatEnvironment = any;
export type QuestObjective = any;
export type Reward = any;
export type TimeOfDay = any;
export type Region = any;
export type Weather = any;
export type WorldEvent = any;
export type Faction = any;
export type EventType = any; 