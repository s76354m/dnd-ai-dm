/**
 * Spell Library
 * 
 * This file contains implementations of common D&D 5e spells
 * using the spell data model defined in spell.ts.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Spell, 
  SpellSchool, 
  DamageType, 
  AbilityType, 
  ConditionType,
  SpellRegistry,
  BasicDamageEffect,
  BasicHealingEffect,
  SpellEffect,
  EffectResult
} from './spell';

const spellRegistry = SpellRegistry.getInstance();

/**
 * Initialize the spell library with basic spells
 */
export function initializeSpellLibrary(): void {
  // Register cantrips
  spellRegistry.registerSpell(fireBolt);
  spellRegistry.registerSpell(sacredFlame);
  spellRegistry.registerSpell(eldritchBlast);
  spellRegistry.registerSpell(minorIllusion);
  spellRegistry.registerSpell(prestidigitation);
  
  // Register level 1 spells
  spellRegistry.registerSpell(cureLightWounds);
  spellRegistry.registerSpell(magicMissile);
  spellRegistry.registerSpell(burningHands);
  spellRegistry.registerSpell(shield);
  spellRegistry.registerSpell(sleep);
  
  // Register level 2 spells
  spellRegistry.registerSpell(acidArrow);
  spellRegistry.registerSpell(scorchingRay);
  spellRegistry.registerSpell(holdPerson);
  
  // Register level 3 spells
  spellRegistry.registerSpell(fireball);
  spellRegistry.registerSpell(lightningBolt);
  
  console.log(`Spell Library initialized with ${spellRegistry.getAllSpells().length} spells.`);
}

/**
 * Custom spell effect for Magic Missile
 */
class MagicMissileEffect implements SpellEffect {
  apply(target: any, caster: any, level: number): EffectResult {
    // Base is 3 darts
    let missiles = 3;
    
    // Add one dart for each spell slot level above 1
    if (level > 1) {
      missiles += (level - 1);
    }
    
    // Each missile does 1d4+1 force damage
    const damagePerMissile = Math.floor(Math.random() * 4) + 1 + 1;
    const totalDamage = damagePerMissile * missiles;
    
    return {
      success: true,
      damage: totalDamage,
      damageType: DamageType.Force,
      message: `${missiles} magic missiles hit ${target.name} for a total of ${totalDamage} force damage.`
    };
  }
  
  getDescription(caster: any, target: any, level: number): string {
    let missiles = 3;
    if (level > 1) {
      missiles += (level - 1);
    }
    
    return `${caster.name} conjures ${missiles} glowing darts of magical force that unerringly strike ${target.name}.`;
  }
}

/**
 * Custom spell effect for Sleep
 */
class SleepEffect implements SpellEffect {
  apply(target: any, caster: any, level: number): EffectResult {
    // Base is 5d8 hit points of creatures affected
    let hitPoints = 0;
    for (let i = 0; i < 5; i++) {
      hitPoints += Math.floor(Math.random() * 8) + 1;
    }
    
    // Add 2d8 for each level above 1st
    if (level > 1) {
      for (let i = 0; i < 2 * (level - 1); i++) {
        hitPoints += Math.floor(Math.random() * 8) + 1;
      }
    }
    
    const isImmune = target.type === 'undead' || target.type === 'construct';
    const isAffected = !isImmune && target.hitPoints.current <= hitPoints;
    
    if (isAffected) {
      return {
        success: true,
        conditions: [ConditionType.Unconscious],
        message: `${target.name} falls into a magical slumber.`
      };
    } else if (isImmune) {
      return {
        success: false,
        message: `${target.name} is immune to being magically put to sleep.`
      };
    } else {
      return {
        success: false,
        message: `${target.name} has too many hit points to be affected.`
      };
    }
  }
  
  getDescription(caster: any, target: any, level: number): string {
    return `${caster.name} weaves a spell that sends creatures into a magical slumber.`;
  }
}

/**
 * Custom spell effect for Hold Person
 */
class HoldPersonEffect implements SpellEffect {
  apply(target: any, caster: any, level: number): EffectResult {
    // Check if target is humanoid
    if (target.type !== 'humanoid') {
      return {
        success: false,
        message: `${target.name} is not a humanoid and is unaffected by the spell.`
      };
    }
    
    // Target must make a Wisdom saving throw
    const saveDC = caster.spellSaveDC;
    const saveRoll = Math.floor(Math.random() * 20) + 1 + (target.abilityScores.wisdom.modifier || 0);
    
    if (saveRoll >= saveDC) {
      return {
        success: false,
        message: `${target.name} resists the paralyzing effect.`
      };
    } else {
      return {
        success: true,
        conditions: [ConditionType.Paralyzed],
        message: `${target.name} is paralyzed by the spell.`
      };
    }
  }
  
  getDescription(caster: any, target: any, level: number): string {
    return `${caster.name} attempts to paralyze ${target.name} with magical energy.`;
  }
}

/**
 * Custom spell effect for Shield
 */
class ShieldEffect implements SpellEffect {
  apply(target: any, caster: any, level: number): EffectResult {
    // Shield adds +5 to AC until the start of your next turn
    // It also negates Magic Missile damage
    return {
      success: true,
      message: `${target.name}'s AC increases by 5 until the start of their next turn.`
    };
  }
  
  getDescription(caster: any, target: any, level: number): string {
    return `${caster.name} creates an invisible barrier of magical force.`;
  }
}

// Cantrips (Level 0)

const fireBolt: Spell = {
  id: uuidv4(),
  name: "Fire Bolt",
  level: 0,
  school: SpellSchool.Evocation,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "ranged",
    distance: 120
  },
  components: {
    verbal: true,
    somatic: true,
    material: false
  },
  duration: {
    type: "instantaneous"
  },
  description: "You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage. A flammable object hit by this spell ignites if it isn't being worn or carried.",
  higherLevels: "This spell's damage increases by 1d10 when you reach 5th level (2d10), 11th level (3d10), and 17th level (4d10).",
  classes: ["sorcerer", "wizard"],
  tags: ["damage", "ranged", "attack"],
  damageType: DamageType.Fire,
  concentration: false,
  ritual: false,
  effects: [
    new BasicDamageEffect(DamageType.Fire, "1d10")
  ]
};

const sacredFlame: Spell = {
  id: uuidv4(),
  name: "Sacred Flame",
  level: 0,
  school: SpellSchool.Evocation,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "ranged",
    distance: 60
  },
  components: {
    verbal: true,
    somatic: true,
    material: false
  },
  duration: {
    type: "instantaneous"
  },
  description: "Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take 1d8 radiant damage. The target gains no benefit from cover for this saving throw.",
  higherLevels: "The spell's damage increases by 1d8 when you reach 5th level (2d8), 11th level (3d8), and 17th level (4d8).",
  classes: ["cleric"],
  tags: ["damage", "ranged", "save"],
  damageType: DamageType.Radiant,
  saveType: AbilityType.Dexterity,
  concentration: false,
  ritual: false,
  effects: [
    new BasicDamageEffect(DamageType.Radiant, "1d8")
  ]
};

const eldritchBlast: Spell = {
  id: uuidv4(),
  name: "Eldritch Blast",
  level: 0,
  school: SpellSchool.Evocation,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "ranged",
    distance: 120
  },
  components: {
    verbal: true,
    somatic: true,
    material: false
  },
  duration: {
    type: "instantaneous"
  },
  description: "A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 force damage.",
  higherLevels: "At higher levels, you can create more beams: two beams at 5th level, three beams at 11th level, and four beams at 17th level. You can direct the beams at the same target or at different ones. Make a separate attack roll for each beam.",
  classes: ["warlock"],
  tags: ["damage", "ranged", "attack"],
  damageType: DamageType.Force,
  concentration: false,
  ritual: false,
  effects: [
    new BasicDamageEffect(DamageType.Force, "1d10")
  ]
};

const minorIllusion: Spell = {
  id: uuidv4(),
  name: "Minor Illusion",
  level: 0,
  school: SpellSchool.Illusion,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "ranged",
    distance: 30
  },
  components: {
    verbal: false,
    somatic: true,
    material: true,
    materials: "a bit of fleece"
  },
  duration: {
    type: "timed",
    time: 1,
    unit: "minute"
  },
  description: "You create a sound or an image of an object within range that lasts for the duration. The illusion also ends if you dismiss it as an action or cast this spell again.",
  classes: ["bard", "sorcerer", "warlock", "wizard"],
  tags: ["utility", "deception"],
  concentration: false,
  ritual: false,
  effects: []
};

const prestidigitation: Spell = {
  id: uuidv4(),
  name: "Prestidigitation",
  level: 0,
  school: SpellSchool.Transmutation,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "ranged",
    distance: 10
  },
  components: {
    verbal: true,
    somatic: true,
    material: false
  },
  duration: {
    type: "timed",
    time: 1,
    unit: "hour"
  },
  description: "This spell is a minor magical trick that novice spellcasters use for practice. You create one of the following magical effects within range: a harmless sensory effect, light or snuff a small flame, clean or soil an object, chill/warm/flavor non-living material, color a small object, or create a small mark or symbol that lasts for 1 hour.",
  classes: ["bard", "sorcerer", "warlock", "wizard"],
  tags: ["utility", "versatile"],
  concentration: false,
  ritual: false,
  effects: []
};

// Level 1 spells

const cureLightWounds: Spell = {
  id: uuidv4(),
  name: "Cure Wounds",
  level: 1,
  school: SpellSchool.Evocation,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "touch",
  },
  components: {
    verbal: true,
    somatic: true,
    material: false
  },
  duration: {
    type: "instantaneous"
  },
  description: "A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier. This spell has no effect on undead or constructs.",
  higherLevels: "When you cast this spell using a spell slot of 2nd level or higher, the healing increases by 1d8 for each slot level above 1st.",
  classes: ["bard", "cleric", "druid", "paladin", "ranger"],
  tags: ["healing", "touch"],
  concentration: false,
  ritual: false,
  effects: [
    new BasicHealingEffect("1d8+3", {
      higherLevel: 2,
      additionalHealing: "1d8"
    })
  ]
};

const magicMissile: Spell = {
  id: uuidv4(),
  name: "Magic Missile",
  level: 1,
  school: SpellSchool.Evocation,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "ranged",
    distance: 120
  },
  components: {
    verbal: true,
    somatic: true,
    material: false
  },
  duration: {
    type: "instantaneous"
  },
  description: "You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target. The darts all strike simultaneously, and you can direct them to hit one creature or several.",
  higherLevels: "When you cast this spell using a spell slot of 2nd level or higher, the spell creates one more dart for each slot level above 1st.",
  classes: ["sorcerer", "wizard"],
  tags: ["damage", "ranged", "force"],
  damageType: DamageType.Force,
  concentration: false,
  ritual: false,
  effects: [
    new MagicMissileEffect()
  ]
};

const burningHands: Spell = {
  id: uuidv4(),
  name: "Burning Hands",
  level: 1,
  school: SpellSchool.Evocation,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "self"
  },
  components: {
    verbal: true,
    somatic: true,
    material: false
  },
  duration: {
    type: "instantaneous"
  },
  description: "As you hold your hands with thumbs touching and fingers spread, a thin sheet of flames shoots forth from your outstretched fingertips. Each creature in a 15-foot cone must make a Dexterity saving throw. A creature takes 3d6 fire damage on a failed save, or half as much damage on a successful one.",
  higherLevels: "When you cast this spell using a spell slot of 2nd level or higher, the damage increases by 1d6 for each slot level above 1st.",
  classes: ["sorcerer", "wizard"],
  tags: ["damage", "area", "fire", "save"],
  damageType: DamageType.Fire,
  saveType: AbilityType.Dexterity,
  areaOfEffect: {
    type: "cone",
    size: 15
  },
  concentration: false,
  ritual: false,
  effects: [
    new BasicDamageEffect(DamageType.Fire, "3d6", {
      higherLevel: 2,
      additionalDamage: "1d6"
    })
  ]
};

const shield: Spell = {
  id: uuidv4(),
  name: "Shield",
  level: 1,
  school: SpellSchool.Abjuration,
  castingTime: {
    type: "reaction",
    value: 1,
    condition: "which you take when you are hit by an attack or targeted by the magic missile spell"
  },
  range: {
    type: "self"
  },
  components: {
    verbal: true,
    somatic: true,
    material: false
  },
  duration: {
    type: "timed",
    time: 1,
    unit: "round"
  },
  description: "An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.",
  classes: ["sorcerer", "wizard"],
  tags: ["protection", "reaction"],
  concentration: false,
  ritual: false,
  effects: [
    new ShieldEffect()
  ]
};

const sleep: Spell = {
  id: uuidv4(),
  name: "Sleep",
  level: 1,
  school: SpellSchool.Enchantment,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "ranged",
    distance: 90
  },
  components: {
    verbal: true,
    somatic: true,
    material: true,
    materials: "a pinch of fine sand, rose petals, or a cricket"
  },
  duration: {
    type: "timed",
    time: 1,
    unit: "minute"
  },
  description: "This spell sends creatures into a magical slumber. Roll 5d8; the total is how many hit points of creatures this spell can affect. Creatures within 20 feet of a point you choose within range are affected in ascending order of their current hit points. Starting with the creature that has the lowest current hit points, each creature affected by this spell falls unconscious until the spell ends, the sleeper takes damage, or someone uses an action to shake or slap the sleeper awake. Subtract each creature's hit points from the total before moving on to the creature with the next lowest hit points. A creature's hit points must be equal to or less than the remaining total for that creature to be affected. Undead and creatures immune to being charmed aren't affected by this spell.",
  higherLevels: "When you cast this spell using a spell slot of 2nd level or higher, roll an additional 2d8 for each slot level above 1st.",
  classes: ["bard", "sorcerer", "wizard"],
  tags: ["control", "area", "debuff"],
  areaOfEffect: {
    type: "sphere",
    size: 20
  },
  concentration: false,
  ritual: false,
  effects: [
    new SleepEffect()
  ]
};

// Level 2 spells

const acidArrow: Spell = {
  id: uuidv4(),
  name: "Acid Arrow",
  level: 2,
  school: SpellSchool.Evocation,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "ranged",
    distance: 90
  },
  components: {
    verbal: true,
    somatic: true,
    material: true,
    materials: "powdered rhubarb leaf and an adder's stomach"
  },
  duration: {
    type: "instantaneous"
  },
  description: "A shimmering green arrow streaks toward a target within range and bursts in a spray of acid. Make a ranged spell attack against the target. On a hit, the target takes 4d4 acid damage immediately and 2d4 acid damage at the end of its next turn. On a miss, the arrow splashes the target with acid for half as much of the initial damage and no damage at the end of its next turn.",
  higherLevels: "When you cast this spell using a spell slot of 3rd level or higher, the damage (both initial and later) increases by 1d4 for each slot level above 2nd.",
  classes: ["wizard"],
  tags: ["damage", "ranged", "attack", "acid"],
  damageType: DamageType.Acid,
  concentration: false,
  ritual: false,
  effects: [
    new BasicDamageEffect(DamageType.Acid, "4d4", {
      higherLevel: 3,
      additionalDamage: "1d4"
    })
  ]
};

const scorchingRay: Spell = {
  id: uuidv4(),
  name: "Scorching Ray",
  level: 2,
  school: SpellSchool.Evocation,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "ranged",
    distance: 120
  },
  components: {
    verbal: true,
    somatic: true,
    material: false
  },
  duration: {
    type: "instantaneous"
  },
  description: "You create three rays of fire and hurl them at targets within range. You can hurl them at one target or several. Make a ranged spell attack for each ray. On a hit, the target takes 2d6 fire damage.",
  higherLevels: "When you cast this spell using a spell slot of 3rd level or higher, you create one additional ray for each slot level above 2nd.",
  classes: ["sorcerer", "wizard"],
  tags: ["damage", "ranged", "attack", "fire"],
  damageType: DamageType.Fire,
  concentration: false,
  ritual: false,
  effects: [
    new BasicDamageEffect(DamageType.Fire, "2d6")
  ]
};

const holdPerson: Spell = {
  id: uuidv4(),
  name: "Hold Person",
  level: 2,
  school: SpellSchool.Enchantment,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "ranged",
    distance: 60
  },
  components: {
    verbal: true,
    somatic: true,
    material: true,
    materials: "a small, straight piece of iron"
  },
  duration: {
    type: "concentration",
    time: 1,
    unit: "minute"
  },
  description: "Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration. At the end of each of its turns, the target can make another Wisdom saving throw. On a success, the spell ends on the target.",
  higherLevels: "When you cast this spell using a spell slot of 3rd level or higher, you can target one additional humanoid for each slot level above 2nd. The humanoids must be within 30 feet of each other when you target them.",
  classes: ["bard", "cleric", "druid", "sorcerer", "warlock", "wizard"],
  tags: ["control", "debuff", "save"],
  saveType: AbilityType.Wisdom,
  concentration: true,
  ritual: false,
  effects: [
    new HoldPersonEffect()
  ]
};

// Level 3 spells

const fireball: Spell = {
  id: uuidv4(),
  name: "Fireball",
  level: 3,
  school: SpellSchool.Evocation,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "ranged",
    distance: 150
  },
  components: {
    verbal: true,
    somatic: true,
    material: true,
    materials: "a tiny ball of bat guano and sulfur"
  },
  duration: {
    type: "instantaneous"
  },
  description: "A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one. The fire spreads around corners. It ignites flammable objects in the area that aren't being worn or carried.",
  higherLevels: "When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.",
  classes: ["sorcerer", "wizard"],
  tags: ["damage", "area", "fire", "save"],
  damageType: DamageType.Fire,
  saveType: AbilityType.Dexterity,
  areaOfEffect: {
    type: "sphere",
    size: 20
  },
  concentration: false,
  ritual: false,
  effects: [
    new BasicDamageEffect(DamageType.Fire, "8d6", {
      higherLevel: 4,
      additionalDamage: "1d6"
    })
  ]
};

const lightningBolt: Spell = {
  id: uuidv4(),
  name: "Lightning Bolt",
  level: 3,
  school: SpellSchool.Evocation,
  castingTime: {
    type: "action",
    value: 1
  },
  range: {
    type: "self"
  },
  components: {
    verbal: true,
    somatic: true,
    material: true,
    materials: "a bit of fur and a rod of amber, crystal, or glass"
  },
  duration: {
    type: "instantaneous"
  },
  description: "A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you in a direction you choose. Each creature in the line must make a Dexterity saving throw. A creature takes 8d6 lightning damage on a failed save, or half as much damage on a successful one. The lightning ignites flammable objects in the area that aren't being worn or carried.",
  higherLevels: "When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.",
  classes: ["sorcerer", "wizard"],
  tags: ["damage", "area", "lightning", "save"],
  damageType: DamageType.Lightning,
  saveType: AbilityType.Dexterity,
  areaOfEffect: {
    type: "line",
    size: 100
  },
  concentration: false,
  ritual: false,
  effects: [
    new BasicDamageEffect(DamageType.Lightning, "8d6", {
      higherLevel: 4,
      additionalDamage: "1d6"
    })
  ]
}; 