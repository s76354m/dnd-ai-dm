/**
 * Type Definitions Index
 * 
 * This file exports all type definitions from the types directory.
 */

// Re-export all types from individual type files
export * from './emotion-types';
export * from './memory-types';
export * from './npc-types';
export * from './spatial-types';

// Core game types - these match the types described in core/types but with string literals
// for compatibility until the proper types are restored

/**
 * Character race
 */
export type Race = 
  | 'human'
  | 'elf'
  | 'dwarf'
  | 'halfling'
  | 'gnome'
  | 'half-elf'
  | 'half-orc'
  | 'tiefling'
  | 'dragonborn';

/**
 * Character subrace
 */
export type Subrace = 
  | 'hill-dwarf'
  | 'mountain-dwarf'
  | 'high-elf'
  | 'wood-elf'
  | 'drow'
  | 'lightfoot-halfling'
  | 'stout-halfling'
  | 'forest-gnome'
  | 'rock-gnome';

/**
 * Character class
 */
export type Class = 
  | 'barbarian'
  | 'bard'
  | 'cleric'
  | 'druid'
  | 'fighter'
  | 'monk'
  | 'paladin'
  | 'ranger'
  | 'rogue'
  | 'sorcerer'
  | 'warlock'
  | 'wizard';

/**
 * Character subclass 
 */
export type Subclass = string;

/**
 * Character background
 */
export type Background = 
  | 'acolyte'
  | 'charlatan'
  | 'criminal'
  | 'entertainer'
  | 'folkhero'
  | 'guildartisan'
  | 'hermit'
  | 'noble'
  | 'outlander'
  | 'sage'
  | 'sailor'
  | 'soldier'
  | 'urchin';

/**
 * Character alignment
 */
export type Alignment = 
  | 'lawful-good'
  | 'neutral-good'
  | 'chaotic-good'
  | 'lawful-neutral'
  | 'neutral'
  | 'chaotic-neutral'
  | 'lawful-evil'
  | 'neutral-evil'
  | 'chaotic-evil';

/**
 * Character skill 
 */
export type Skill = 
  | 'acrobatics'
  | 'animal-handling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleight-of-hand'
  | 'stealth'
  | 'survival';

/**
 * Character condition
 */
export type Condition = 
  | 'blinded'
  | 'charmed'
  | 'deafened'
  | 'exhaustion'
  | 'frightened'
  | 'grappled'
  | 'incapacitated'
  | 'invisible'
  | 'paralyzed'
  | 'petrified'
  | 'poisoned'
  | 'prone'
  | 'restrained'
  | 'stunned'
  | 'unconscious';

/**
 * Character language
 */
export type Language = 
  | 'common'
  | 'dwarvish'
  | 'elvish'
  | 'giant'
  | 'gnomish'
  | 'goblin'
  | 'halfling'
  | 'orc'
  | 'abyssal'
  | 'celestial'
  | 'draconic'
  | 'deep-speech'
  | 'infernal'
  | 'primordial'
  | 'sylvan'
  | 'undercommon';

/**
 * Tool proficiency
 */
export type ToolProficiency = 
  | 'alchemist-supplies'
  | 'brewer-supplies'
  | 'calligrapher-supplies'
  | 'carpenter-tools'
  | 'cartographer-tools'
  | 'cobbler-tools'
  | 'cook-utensils'
  | 'glassblower-tools'
  | 'jeweler-tools'
  | 'leatherworker-tools'
  | 'mason-tools'
  | 'painter-supplies'
  | 'potter-tools'
  | 'smith-tools'
  | 'tinker-tools'
  | 'weaver-tools'
  | 'woodcarver-tools'
  | 'disguise-kit'
  | 'forgery-kit'
  | 'herbalism-kit'
  | 'navigator-tools'
  | 'poisoner-kit'
  | 'thieves-tools'
  | 'musical-instrument';

/**
 * Time of day
 */
export enum TimeOfDay {
  Dawn = 'dawn',
  Morning = 'morning', 
  Noon = 'noon',
  Afternoon = 'afternoon',
  Evening = 'evening',
  Dusk = 'dusk',
  Night = 'night',
  Midnight = 'midnight'
} 