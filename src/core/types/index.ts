/*
 * src/core/types/index.ts
 * Contains shared type definitions for the D&D AI project.
 */

export type Ability = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

// Race type is defined as a string to allow for case-insensitive values in tests
// Valid races are: human, elf, dwarf, halfling, gnome, half-elf, half-orc, tiefling, dragonborn
// The validation should be done at runtime using isValidRace function
export type Race = string;

// Valid race values (lowercase)
export const validRaces = [
  'human', 
  'elf', 
  'dwarf', 
  'halfling', 
  'gnome', 
  'half-elf', 
  'half-orc', 
  'tiefling',
  'dragonborn',
  'orc' // Added for NPC races
];

// Function to validate race values
export function isValidRace(race: string): boolean {
  return validRaces.includes(race.toLowerCase());
}

export type Subrace = 
  | 'high-elf' 
  | 'wood-elf' 
  | 'dark-elf' 
  | 'hill-dwarf' 
  | 'mountain-dwarf' 
  | 'lightfoot-halfling' 
  | 'stout-halfling' 
  | 'forest-gnome' 
  | 'rock-gnome'
  | 'variant-human';

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

export type Subclass = 
  // Barbarian
  | 'berserker' 
  | 'totem-warrior'
  // Bard
  | 'college-of-lore'
  | 'college-of-valor'
  // Cleric
  | 'knowledge-domain'
  | 'life-domain'
  | 'light-domain'
  | 'nature-domain'
  | 'tempest-domain'
  | 'trickery-domain'
  | 'war-domain'
  // Druid
  | 'circle-of-the-land'
  | 'circle-of-the-moon'
  // Fighter
  | 'champion'
  | 'battle-master'
  | 'eldritch-knight'
  // Monk
  | 'way-of-the-open-hand'
  | 'way-of-shadow'
  | 'way-of-the-four-elements'
  // Paladin
  | 'oath-of-devotion'
  | 'oath-of-the-ancients'
  | 'oath-of-vengeance'
  // Ranger
  | 'hunter'
  | 'beast-master'
  // Rogue
  | 'thief'
  | 'assassin'
  | 'arcane-trickster'
  // Sorcerer
  | 'draconic-bloodline'
  | 'wild-magic'
  // Warlock
  | 'the-archfey'
  | 'the-fiend'
  | 'the-great-old-one'
  // Wizard
  | 'school-of-abjuration'
  | 'school-of-conjuration'
  | 'school-of-divination'
  | 'school-of-enchantment'
  | 'school-of-evocation'
  | 'school-of-illusion'
  | 'school-of-necromancy'
  | 'school-of-transmutation';

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

export type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export type Alignment = 'lawful good' | 'neutral good' | 'chaotic good' |
                        'lawful neutral' | 'true neutral' | 'chaotic neutral' |
                        'lawful evil' | 'neutral evil' | 'chaotic evil' |
                        'unaligned';

export type Skill = 
  | 'acrobatics' 
  | 'animal handling' 
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
  | 'sleight of hand' 
  | 'stealth' 
  | 'survival';

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
  | 'deep speech' 
  | 'infernal' 
  | 'primordial' 
  | 'sylvan' 
  | 'undercommon';

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

export type ToolProficiency = 
  | 'alchemist\'s supplies' 
  | 'brewer\'s supplies' 
  | 'calligrapher\'s supplies' 
  | 'carpenter\'s tools' 
  | 'cartographer\'s tools' 
  | 'cobbler\'s tools' 
  | 'cook\'s utensils' 
  | 'glassblower\'s tools' 
  | 'jeweler\'s tools' 
  | 'leatherworker\'s tools' 
  | 'mason\'s tools' 
  | 'painter\'s supplies' 
  | 'potter\'s tools' 
  | 'smith\'s tools' 
  | 'tinker\'s tools' 
  | 'weaver\'s tools' 
  | 'woodcarver\'s tools' 
  | 'disguise kit' 
  | 'forgery kit' 
  | 'herbalism kit' 
  | 'navigator\'s tools' 
  | 'poisoner\'s kit' 
  | 'thieves\' tools' 
  | 'musical instrument';

export type DMPersonality = 'neutral' | 'classic' | 'helpful' | 'adversarial' | 'whimsical';

export const __types = {};