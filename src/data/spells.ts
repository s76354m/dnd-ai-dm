/**
 * Spells Data File
 * 
 * Contains detailed spell information including effects, damage formulas,
 * and combat integration for the D&D AI DM system.
 */

import { 
  CombatSpell, 
  SpellTarget, 
  SpellEffectType, 
  SpellDamageType 
} from '../combat/spell-effects';
import { v4 as uuidv4 } from 'uuid';

/**
 * Spell school types
 */
export type SpellSchool = 
  | 'Abjuration'
  | 'Conjuration'
  | 'Divination'
  | 'Enchantment'
  | 'Evocation'
  | 'Illusion'
  | 'Necromancy'
  | 'Transmutation';

/**
 * Component types for spells
 */
export type SpellComponent = 'V' | 'S' | 'M';

/**
 * Ability types for saving throws
 */
export type AbilityType = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

/**
 * Generate spells with scaling effects based on spell level
 * @param baseSpell Base spell definition
 * @param levelScaling How the spell scales with level
 */
const createScalingSpell = (
  baseSpell: Partial<CombatSpell>,
  levelScaling: {
    damageFormula?: (level: number) => string;
    healingFormula?: (level: number) => string;
    description?: (level: number) => string;
  }
): CombatSpell => {
  // Generate the spell ID if not provided
  if (!baseSpell.id) {
    baseSpell.id = uuidv4();
  }
  
  // Generate description with level scaling
  if (levelScaling.description) {
    baseSpell.description = levelScaling.description(baseSpell.level || 0);
  }
  
  // Scale damage formula if provided
  if (levelScaling.damageFormula && baseSpell.effectType === 'damage') {
    baseSpell.damageFormula = levelScaling.damageFormula(baseSpell.level || 0);
  }
  
  // Scale healing formula if provided
  if (levelScaling.healingFormula && baseSpell.effectType === 'healing') {
    baseSpell.healingFormula = levelScaling.healingFormula(baseSpell.level || 0);
  }
  
  return baseSpell as CombatSpell;
};

/**
 * Comprehensive spell list
 */
export const SPELLS: CombatSpell[] = [
  // CANTRIPS (0-LEVEL) -------------------------------------------------------------------------
  {
    id: uuidv4(),
    name: "Fire Bolt",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: ["V", "S"],
    duration: "Instantaneous",
    description: "You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage. A flammable object hit by this spell ignites if it isn't being worn or carried.",
    target: "single",
    effectType: "damage",
    damageType: "fire",
    damageFormula: "1d10",
    concentration: false
  },
  {
    id: uuidv4(),
    name: "Sacred Flame",
    level: 0,
    school: "Evocation",
    castingTime: "1 action",
    range: "60 feet",
    components: ["V", "S"],
    duration: "Instantaneous",
    description: "Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take 1d8 radiant damage. The target gains no benefit from cover for this saving throw.",
    target: "single",
    effectType: "damage",
    damageType: "radiant",
    damageFormula: "1d8",
    savingThrow: {
      ability: "dexterity",
      dc: 15 // Will be calculated dynamically in actual implementation
    },
    concentration: false
  },
  {
    id: uuidv4(),
    name: "Guidance",
    level: 0,
    school: "Divination",
    castingTime: "1 action",
    range: "Touch",
    components: ["V", "S"],
    duration: "Concentration, up to 1 minute",
    description: "You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice. It can roll the die before or after making the ability check. The spell then ends.",
    target: "single",
    effectType: "buff",
    temporaryEffect: {
      name: "Guidance",
      description: "+1d4 to next ability check",
      duration: 10, // 10 rounds = 1 minute
    },
    concentration: true
  },

  // 1ST LEVEL SPELLS ----------------------------------------------------------------------
  {
    id: uuidv4(),
    name: "Magic Missile",
    level: 1,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: ["V", "S"],
    duration: "Instantaneous",
    description: "You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4+1 force damage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or several.",
    target: "multiple",
    effectType: "damage",
    damageType: "force",
    damageFormula: "3*(1d4+1)", // 3 darts at 1d4+1 each
    concentration: false
  },
  {
    id: uuidv4(),
    name: "Cure Wounds",
    level: 1,
    school: "Evocation",
    castingTime: "1 action",
    range: "Touch",
    components: ["V", "S"],
    duration: "Instantaneous",
    description: "A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.",
    target: "single",
    effectType: "healing",
    healingFormula: "1d8+3", // +3 represents spellcasting modifier
    concentration: false
  },
  {
    id: uuidv4(),
    name: "Shield",
    level: 1,
    school: "Abjuration",
    castingTime: "1 reaction",
    range: "Self",
    components: ["V", "S"],
    duration: "1 round",
    description: "An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.",
    target: "self",
    effectType: "buff",
    temporaryEffect: {
      name: "Shield",
      description: "+5 AC until next turn",
      duration: 1,
    },
    concentration: false
  },
  {
    id: uuidv4(),
    name: "Burning Hands",
    level: 1,
    school: "Evocation",
    castingTime: "1 action",
    range: "Self (15-foot cone)",
    components: ["V", "S"],
    duration: "Instantaneous",
    description: "As you hold your hands with thumbs touching and fingers spread, a thin sheet of flames shoots forth from your outstretched fingertips. Each creature in a 15-foot cone must make a Dexterity saving throw. A creature takes 3d6 fire damage on a failed save, or half as much damage on a successful one.",
    target: "area",
    effectType: "damage",
    damageType: "fire",
    damageFormula: "3d6",
    savingThrow: {
      ability: "dexterity",
      dc: 15
    },
    areaOfEffect: {
      type: "cone",
      size: 15
    },
    concentration: false
  },

  // 2ND LEVEL SPELLS ----------------------------------------------------------------------
  {
    id: uuidv4(),
    name: "Scorching Ray",
    level: 2,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: ["V", "S"],
    duration: "Instantaneous",
    description: "You create three rays of fire and hurl them at targets within range. You can hurl them at one target or several. Make a ranged spell attack for each ray. On a hit, the target takes 2d6 fire damage.",
    target: "multiple",
    effectType: "damage",
    damageType: "fire",
    damageFormula: "2d6", // Per ray, 3 rays total
    concentration: false
  },
  {
    id: uuidv4(),
    name: "Spiritual Weapon",
    level: 2,
    school: "Evocation",
    castingTime: "1 bonus action",
    range: "60 feet",
    components: ["V", "S"],
    duration: "1 minute",
    description: "You create a floating, spectral weapon within range that lasts for the duration or until you cast this spell again. When you cast the spell, you can make a melee spell attack against a creature within 5 feet of the weapon. On a hit, the target takes 1d8 + your spellcasting ability modifier force damage.",
    target: "single",
    effectType: "damage",
    damageType: "force",
    damageFormula: "1d8+3",
    temporaryEffect: {
      name: "Spiritual Weapon",
      description: "Spectral weapon that can attack as a bonus action",
      duration: 10, // 10 rounds = 1 minute
    },
    concentration: false
  },
  {
    id: uuidv4(),
    name: "Web",
    level: 2,
    school: "Conjuration",
    castingTime: "1 action",
    range: "60 feet",
    components: ["V", "S", "M"],
    duration: "Concentration, up to 1 hour",
    description: "You conjure a mass of thick, sticky webbing at a point of your choice within range. The webs fill a 20-foot cube from that point for the duration. The webs are difficult terrain and lightly obscure their area. Each creature that starts its turn in the webs or that enters them during its turn must make a Dexterity saving throw or be restrained as long as it remains in the webs or until it breaks free.",
    target: "area",
    effectType: "control",
    savingThrow: {
      ability: "dexterity",
      dc: 15
    },
    areaOfEffect: {
      type: "cube",
      size: 20
    },
    environmentalEffect: {
      name: "Web",
      description: "Area filled with sticky webs - difficult terrain and creatures can become restrained",
      duration: 60, // 1 hour in rounds
    },
    concentration: true
  },

  // 3RD LEVEL SPELLS ----------------------------------------------------------------------
  {
    id: uuidv4(),
    name: "Fireball",
    level: 3,
    school: "Evocation",
    castingTime: "1 action",
    range: "150 feet",
    components: ["V", "S", "M"],
    duration: "Instantaneous",
    description: "A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.",
    target: "area",
    effectType: "damage",
    damageType: "fire",
    damageFormula: "8d6",
    savingThrow: {
      ability: "dexterity",
      dc: 15
    },
    areaOfEffect: {
      type: "sphere",
      size: 20
    },
    concentration: false
  },
  {
    id: uuidv4(),
    name: "Counterspell",
    level: 3,
    school: "Abjuration",
    castingTime: "1 reaction",
    range: "60 feet",
    components: ["S"],
    duration: "Instantaneous",
    description: "You attempt to interrupt a creature in the process of casting a spell. If the creature is casting a spell of 3rd level or lower, its spell fails and has no effect. If it is casting a spell of 4th level or higher, make an ability check using your spellcasting ability. The DC equals 10 + the spell's level. On a success, the creature's spell fails and has no effect.",
    target: "single",
    effectType: "control",
    concentration: false
  },
  {
    id: uuidv4(),
    name: "Haste",
    level: 3,
    school: "Transmutation",
    castingTime: "1 action",
    range: "30 feet",
    components: ["V", "S", "M"],
    duration: "Concentration, up to 1 minute",
    description: "Choose a willing creature that you can see within range. Until the spell ends, the target's speed is doubled, it gains a +2 bonus to AC, it has advantage on Dexterity saving throws, and it gains an additional action on each of its turns. When the spell ends, the target can't move or take actions until after its next turn, as a wave of lethargy sweeps over it.",
    target: "single",
    effectType: "buff",
    temporaryEffect: {
      name: "Haste",
      description: "Double speed, +2 AC, advantage on DEX saves, extra action",
      duration: 10,
    },
    concentration: true
  },

  // 4TH LEVEL SPELLS ----------------------------------------------------------------------
  {
    id: uuidv4(),
    name: "Polymorph",
    level: 4,
    school: "Transmutation", 
    castingTime: "1 action",
    range: "60 feet",
    components: ["V", "S", "M"],
    duration: "Concentration, up to 1 hour",
    description: "This spell transforms a creature that you can see within range into a new form. An unwilling creature must make a Wisdom saving throw to avoid the effect. The spell has no effect on a shapechanger or a creature with 0 hit points.",
    target: "single",
    effectType: "control",
    savingThrow: {
      ability: "wisdom",
      dc: 15
    },
    concentration: true
  },
  {
    id: uuidv4(),
    name: "Wall of Fire",
    level: 4,
    school: "Evocation",
    castingTime: "1 action",
    range: "120 feet",
    components: ["V", "S", "M"],
    duration: "Concentration, up to 1 minute",
    description: "You create a wall of fire on a solid surface within range. You can make the wall up to 60 feet long, 20 feet high, and 1 foot thick, or a ringed wall up to 20 feet in diameter, 20 feet high, and 1 foot thick. The wall is opaque and lasts for the duration. When the wall appears, each creature within its area must make a Dexterity saving throw. On a failed save, a creature takes 5d8 fire damage, or half as much damage on a successful save.",
    target: "area",
    effectType: "damage",
    damageType: "fire",
    damageFormula: "5d8",
    savingThrow: {
      ability: "dexterity",
      dc: 15
    },
    areaOfEffect: {
      type: "line",
      size: 60
    },
    environmentalEffect: {
      name: "Wall of Fire",
      description: "A burning wall that damages creatures that enter it or start their turn within 10 feet",
      duration: 10,
    },
    concentration: true
  },

  // 5TH LEVEL SPELLS ----------------------------------------------------------------------
  {
    id: uuidv4(),
    name: "Cone of Cold",
    level: 5,
    school: "Evocation",
    castingTime: "1 action",
    range: "Self (60-foot cone)",
    components: ["V", "S", "M"],
    duration: "Instantaneous",
    description: "A blast of cold air erupts from your hands. Each creature in a 60-foot cone must make a Constitution saving throw. A creature takes 8d8 cold damage on a failed save, or half as much damage on a successful one.",
    target: "area",
    effectType: "damage",
    damageType: "cold",
    damageFormula: "8d8",
    savingThrow: {
      ability: "constitution",
      dc: 15
    },
    areaOfEffect: {
      type: "cone",
      size: 60
    },
    concentration: false
  },
  {
    id: uuidv4(),
    name: "Mass Cure Wounds",
    level: 5,
    school: "Evocation",
    castingTime: "1 action",
    range: "60 feet",
    components: ["V", "S"],
    duration: "Instantaneous",
    description: "A wave of healing energy washes out from a point of your choice within range. Choose up to six creatures in a 30-foot-radius sphere centered on that point. Each target regains hit points equal to 3d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.",
    target: "multiple",
    effectType: "healing",
    healingFormula: "3d8+3",
    areaOfEffect: {
      type: "sphere",
      size: 30
    },
    concentration: false
  }
];

/**
 * Find a spell by name (case insensitive)
 * @param name The name of the spell to find
 * @returns The spell object or undefined if not found
 */
export function findSpellByName(name: string): CombatSpell | undefined {
  return SPELLS.find(spell => 
    spell.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get all spells of a specific level
 * @param level The spell level
 * @returns Array of spells of the specified level
 */
export function getSpellsByLevel(level: number): CombatSpell[] {
  return SPELLS.filter(spell => spell.level === level);
}

/**
 * Get all spells from a specific school of magic
 * @param school The school of magic
 * @returns Array of spells from the specified school
 */
export function getSpellsBySchool(school: SpellSchool): CombatSpell[] {
  return SPELLS.filter(spell => spell.school === school);
}

/**
 * Get all spells with a specific effect type
 * @param effectType The effect type to filter by
 * @returns Array of spells with the specified effect type
 */
export function getSpellsByEffectType(effectType: SpellEffectType): CombatSpell[] {
  return SPELLS.filter(spell => spell.effectType === effectType);
}

/**
 * Scale a spell's effect based on the level it's cast at
 * @param spell The base spell
 * @param castLevel The level at which the spell is being cast
 * @returns A new spell object with scaled effects
 */
export function scaleSpellToLevel(spell: CombatSpell, castLevel: number): CombatSpell {
  // Don't scale if casting at base level or lower
  if (castLevel <= spell.level) {
    return spell;
  }

  // Create a copy of the spell to modify
  const scaledSpell: CombatSpell = {...spell};
  const levelDifference = castLevel - spell.level;
  
  // Scale damage
  if (spell.damageFormula) {
    // Handle different scaling patterns based on spell
    switch (spell.name) {
      case "Magic Missile":
        // Adds 1 dart per level
        const numDarts = 3 + levelDifference;
        scaledSpell.damageFormula = `${numDarts}*(1d4+1)`;
        break;
      
      case "Fireball":
      case "Lightning Bolt":
        // Add 1d6 per level above 3rd
        const baseDamage = parseInt(spell.damageFormula.split('d')[0]);
        scaledSpell.damageFormula = `${baseDamage + levelDifference}d6`;
        break;
        
      case "Cure Wounds":
      case "Inflict Wounds":
        // Add 1d8 per level
        const baseHealing = parseInt(spell.damageFormula.split('d')[0]);
        scaledSpell.damageFormula = `${baseHealing + levelDifference}d8+3`;
        break;
        
      default:
        // Generic scaling - add 1 die per level for most spells
        if (spell.damageFormula.includes('d')) {
          const [diceCount, rest] = spell.damageFormula.split('d');
          const newDiceCount = parseInt(diceCount) + levelDifference;
          scaledSpell.damageFormula = `${newDiceCount}d${rest}`;
        }
    }
  }
  
  // Scale healing
  if (spell.healingFormula) {
    if (spell.healingFormula.includes('d')) {
      const [diceCount, rest] = spell.healingFormula.split('d');
      const newDiceCount = parseInt(diceCount) + levelDifference;
      scaledSpell.healingFormula = `${newDiceCount}d${rest}`;
    }
  }
  
  return scaledSpell;
}

export default SPELLS; 