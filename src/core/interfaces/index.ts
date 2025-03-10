/**
 * Core Interfaces Index
 * 
 * This file consolidates all interface exports from the interfaces directory
 * to simplify imports throughout the codebase.
 */

// Re-export interfaces from character module
export { 
  Character,
  AbilityScores,
  AbilityScore,
  HitDice,
  SpellSlots,
  Proficiencies,
  Trait,
  TraitDetail,
  ClassFeature,
  RacialTrait,
  BackgroundFeature,
  Feat,
  Spell as CharacterSpell,
  Inventory
} from './character';

// Re-export interfaces from game module
export {
  GameState,
  GameEvent,
  Item as GameItem,
  EnvironmentalEffect as GameEnvironmentalEffect
} from './game';

// Re-export interfaces from game-modes module
export {
  GameMode,
  GameSettings
} from './game-modes';

// Re-export interfaces from item module
export { 
  Item,
  ItemType
} from './item';

// Add magical item interfaces
export {
  MagicalItem,
  MagicalItemType,
  MagicalProperty,
  Attunement
} from './magical-item';

// Re-export interfaces from npc module
export {
  NPC,
  NPCMemory,
  NPCPersonality,
  NPCRelationship
} from './npc';

// Re-export interfaces from world module
export {
  WorldState,
  GameTime
} from './world';

// Re-export interfaces from location module
export {
  Location,
  PointOfInterest,
  LocationDescription,
  LocationType,
  LocationConnection,
  Region,
  LightingLevel,
  TerrainType,
  LocationExit
} from './location';

// Re-export interfaces from combat module
export {
  CombatState,
  CombatAction,
  CombatEffect,
  EnvironmentalEffect
} from './combat';

// Re-export extended combat interfaces
export {
  CombatantStatus,
  Initiative,
  AttackRoll,
  DamageRoll,
  SavingThrow,
  ExtendedCombatState
} from './combat-extensions';

// Re-export interfaces from quest module
export {
  Quest,
  QuestObjective,
  QuestReward
} from './quest';

// Re-export monster interfaces
export {
  Monster,
  MonsterAction
} from './monster';

// Re-export engine interfaces
export {
  DMEngine as Engine,
  DMEngineState as EngineState,
  DMEngineEvent as EngineEvent
} from './engine';

// Re-export spell interfaces
export { 
  Spell
} from './spell';

// Re-export command interfaces
export {
  ResolvedCommand
} from './command';