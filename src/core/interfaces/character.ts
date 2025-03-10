// src/core/interfaces/character.ts

// Import types from core/types directory where they are defined
import { 
  Race, Class, Background, Alignment, Skill, 
  Condition, Subrace, Subclass, Language, ToolProficiency 
} from '../types/index';

// Re-export these types so they can be imported from this file
export { 
  Race, Class, Background, Alignment, Skill, 
  Condition, Subrace, Subclass, Language, ToolProficiency 
};

import { Item } from './item';

// Define inventory interface that was missing
export interface Inventory {
  gold: number;
  items: Item[];
}

// Define a trait type that can be a simple string or an object with detailed info
export interface TraitDetail {
  name: string;
  source: Race | Background | Class;
  description: string;
  mechanics?: string;
}

export type Trait = string | TraitDetail;

export interface Proficiencies {
  skills: Skill[];
  tools: ToolProficiency[];
  armor: string[];
  weapons: string[];
  savingThrows: string[];
  languages: Language[];
}

export interface AbilityScore {
  score: number;
  modifier: number;
}

export interface AbilityScores {
  // Long form properties (proper implementation)
  strength: AbilityScore;
  dexterity: AbilityScore;
  constitution: AbilityScore;
  intelligence: AbilityScore;
  wisdom: AbilityScore;
  charisma: AbilityScore;
  
  // Short form properties for backward compatibility
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
}

// Add class type and background type for compatibility
export type ClassType = Class;
export type BackgroundType = Background;

export interface HitDice {
  diceType: string; // e.g., 'd8', 'd10'
  total: number;
  used: number;
}

export interface SpellSlots {
  level1: { total: number; used: number };
  level2: { total: number; used: number };
  level3: { total: number; used: number };
  level4: { total: number; used: number };
  level5: { total: number; used: number };
  level6: { total: number; used: number };
  level7: { total: number; used: number };
  level8: { total: number; used: number };
  level9: { total: number; used: number };
}

export interface Character {
  id: string;
  name: string;
  race: Race;
  subrace?: Subrace;
  class: Class;
  subclass?: Subclass;
  background: Background;
  alignment: Alignment;
  level: number;
  experiencePoints: number;
  abilityScores: AbilityScores;
  hitPoints: { current: number; maximum: number };
  temporaryHitPoints: number;
  hitDice: HitDice;
  armorClass: number;
  initiative: number;
  speed: number;
  proficiencyBonus: number;
  skills: Record<Skill, { proficient: boolean; expertise: boolean; bonus: number }>;
  conditions: Condition[];
  inventory: Inventory;
  spells?: Spell[];
  statusEffects?: Array<{
    id: string;
    name: string;
    duration: number;
    modifiers?: any;
    description?: string;
  }>;
  traits: Trait[];
  proficiencies: Proficiencies;
  classFeatures: ClassFeature[];
  racialTraits: RacialTrait[];
  backgroundFeature: BackgroundFeature;
  feats: Feat[];
  personality: {
    traits: string[];
    ideals: string[];
    bonds: string[];
    flaws: string[];
  };
  spellcasting?: {
    ability: string;
    spellSaveDC: number;
    spellAttackBonus: number;
    spellSlots: SpellSlots;
    spellsKnown?: Spell[];
    spellcastingClass?: string;
  };
  equipment: Item[];
  wealth: {
    copper: number;
    silver: number;
    electrum: number;
    gold: number;
    platinum: number;
  };
  currency?: {
    copper: number;
    silver: number;
    electrum: number;
    gold: number;
    platinum: number;
  };
  appearance: {
    age: number;
    height: string;
    weight: string;
    eyes: string;
    skin: string;
    hair: string;
  };
  backstory: string;
  inspiration: boolean;
  deathSaves: {
    successes: number;
    failures: number;
  };
}

export interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: {
    verbal: boolean;
    somatic: boolean;
    material: boolean;
    materials?: string;
  };
  duration: string;
  description: string;
  higherLevels?: string;
  concentration: boolean;
  ritual: boolean;
}

export interface ClassFeature {
  name: string;
  level: number;
  description: string;
  source: Class | Subclass;
}

export interface RacialTrait {
  name: string;
  description: string;
  source: Race | Subrace;
}

export interface BackgroundFeature {
  name: string;
  description: string;
  source: Background;
}

export interface Feat {
  name: string;
  description: string;
  prerequisites?: {
    abilityScore?: Record<string, number>;
    race?: Race[];
    class?: Class[];
    other?: string;
  };
  benefits: string[];
}