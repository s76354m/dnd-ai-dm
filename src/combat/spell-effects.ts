/**
 * Spell Effects for Combat
 * 
 * This file implements the effects of spells in combat, integrating with the
 * combat system to provide magical abilities and effects during encounters.
 */

import { Character } from '../core/interfaces/character';
import { NPC } from '../core/interfaces/npc';
import { CombatEffect, EnvironmentalEffect, CombatParticipant } from '../core/interfaces/combat';
import { Spell } from '../core/interfaces/spell';
import { rollDice, rollSavingThrow } from '../utils/ability-utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Spell targeting types
 */
export type SpellTarget = 'single' | 'multiple' | 'area' | 'self';

/**
 * Spell effect types
 */
export type SpellEffectType = 
  | 'damage' 
  | 'healing' 
  | 'buff' 
  | 'debuff' 
  | 'control' 
  | 'utility' 
  | 'summoning';

/**
 * Spell damage types
 */
export type SpellDamageType = 
  | 'acid' 
  | 'cold' 
  | 'fire' 
  | 'force' 
  | 'lightning' 
  | 'necrotic' 
  | 'poison' 
  | 'psychic' 
  | 'radiant' 
  | 'thunder';

/**
 * Extended combat effect with description for spell effects
 */
export interface SpellCombatEffect extends CombatEffect {
  description?: string;
}

/**
 * Extended spell interface with combat-specific properties
 */
export interface CombatSpell extends Spell {
  id: string;
  target: SpellTarget;
  effectType: SpellEffectType;
  damageType?: SpellDamageType;
  damageFormula?: string;
  healingFormula?: string;
  savingThrow?: {
    ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
    dc: number;
  };
  areaOfEffect?: {
    type: 'cone' | 'cube' | 'cylinder' | 'line' | 'sphere';
    size: number; // Size in feet
  };
  temporaryEffect?: Partial<SpellCombatEffect>;
  environmentalEffect?: Partial<EnvironmentalEffect>;
  concentration: boolean;
}

/**
 * Result of casting a spell in combat
 */
export interface SpellCastResult {
  success: boolean;
  message: string;
  damage?: number;
  healing?: number;
  targets: string[];
  savingThrows?: {
    targetId: string;
    success: boolean;
    roll: number;
    total: number;
  }[];
  appliedEffects: {
    targetId: string;
    effect: string;
    duration: number;
  }[];
  createdEnvironmentalEffect?: EnvironmentalEffect;
}

/**
 * Manages spell effects in combat
 */
export class SpellEffectManager {
  private knownSpells: Map<string, CombatSpell> = new Map();
  
  constructor() {
    // Initialize with some basic spells
    this.initializeBasicSpells();
  }
  
  /**
   * Initialize a set of basic spells
   */
  private initializeBasicSpells(): void {
    const spells: CombatSpell[] = [
      // Cantrips (level 0)
      {
        id: uuidv4(),
        name: "Fire Bolt",
        level: 0,
        school: "Evocation",
        castingTime: "1 action",
        range: "120 feet",
        components: ["V", "S"],
        duration: "Instantaneous",
        description: "You hurl a mote of fire at a creature or object within range.",
        target: "single",
        effectType: "damage",
        damageType: "fire",
        damageFormula: "1d10",
        concentration: false
      },
      {
        id: uuidv4(),
        name: "Ray of Frost",
        level: 0,
        school: "Evocation",
        castingTime: "1 action",
        range: "60 feet",
        components: ["V", "S"],
        duration: "Instantaneous",
        description: "A frigid beam of blue-white light streaks toward a creature within range.",
        target: "single",
        effectType: "damage",
        damageType: "cold",
        damageFormula: "1d8",
        temporaryEffect: {
          name: "Slowed by Ray of Frost",
          duration: 1,
          effect: (participant: CombatParticipant) => {
            participant.movement = Math.max(0, participant.movement - 10);
          }
        },
        concentration: false
      },
      
      // Level 1 spells
      {
        id: uuidv4(),
        name: "Magic Missile",
        level: 1,
        school: "Evocation",
        castingTime: "1 action",
        range: "120 feet",
        components: ["V", "S"],
        duration: "Instantaneous",
        description: "You create three glowing darts of magical force that unerringly strike their targets.",
        target: "multiple",
        effectType: "damage",
        damageType: "force",
        damageFormula: "1d4+1",
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
        description: "A creature you touch regains hit points.",
        target: "single",
        effectType: "healing",
        healingFormula: "1d8+3",
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
        description: "You create a thin sheet of flames that shoots forth from your fingertips.",
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
      
      // Level 2 spells
      {
        id: uuidv4(),
        name: "Scorching Ray",
        level: 2,
        school: "Evocation",
        castingTime: "1 action",
        range: "120 feet",
        components: ["V", "S"],
        duration: "Instantaneous",
        description: "You create three rays of fire and hurl them at targets within range.",
        target: "multiple",
        effectType: "damage",
        damageType: "fire",
        damageFormula: "2d6",
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
        description: "You conjure a mass of thick, sticky webbing that fills a 20-foot cube.",
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
          description: "The area is filled with thick, sticky webbing that is difficult to move through.",
          type: "hazard",
          effect: (entity: Character | NPC) => {
            // Implementation would track restrained condition
            console.log(`${entity.name} is affected by the Web spell`);
          },
          duration: 10,
          savingThrow: {
            ability: "strength",
            dc: 15
          }
        },
        concentration: true
      },
      
      // Level 3 spells
      {
        id: uuidv4(),
        name: "Fireball",
        level: 3,
        school: "Evocation",
        castingTime: "1 action",
        range: "150 feet",
        components: ["V", "S", "M"],
        duration: "Instantaneous",
        description: "A bright streak flashes from your pointing finger to a point you choose and then blossoms with a low roar into an explosion of flame.",
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
      }
    ];
    
    // Add spells to the known spells map
    for (const spell of spells) {
      this.knownSpells.set(spell.id, spell);
    }
  }
  
  /**
   * Get a known spell by ID
   */
  public getSpell(id: string): CombatSpell | undefined {
    return this.knownSpells.get(id);
  }
  
  /**
   * Get all spells of a particular level
   */
  public getSpellsByLevel(level: number): CombatSpell[] {
    return Array.from(this.knownSpells.values())
      .filter(spell => spell.level === level);
  }
  
  /**
   * Add a new spell to the manager
   */
  public addSpell(spell: CombatSpell): void {
    if (!spell.id) {
      spell.id = uuidv4();
    }
    this.knownSpells.set(spell.id, spell);
  }
  
  /**
   * Cast a spell in combat
   */
  public castSpell(
    spellId: string,
    caster: Character | NPC,
    targets: (Character | NPC)[],
    targetPosition?: { x: number, y: number }
  ): SpellCastResult {
    const spell = this.knownSpells.get(spellId);
    
    if (!spell) {
      return {
        success: false,
        message: `Unknown spell.`,
        targets: [],
        appliedEffects: []
      };
    }
    
    // Check if spell targeting is valid
    if (!this.validateTargeting(spell, targets, targetPosition)) {
      return {
        success: false,
        message: `Invalid targeting for ${spell.name}.`,
        targets: [],
        appliedEffects: []
      };
    }
    
    // Process the spell based on its effect type
    switch (spell.effectType) {
      case 'damage':
        return this.processDamageSpell(spell, caster, targets);
      case 'healing':
        return this.processHealingSpell(spell, caster, targets);
      case 'control':
      case 'buff':
      case 'debuff':
        return this.processEffectSpell(spell, caster, targets);
      case 'utility':
        return this.processUtilitySpell(spell, caster, targets, targetPosition);
      case 'summoning':
        return this.processSummoningSpell(spell, caster, targetPosition);
      default:
        return {
          success: false,
          message: `Unsupported spell effect type: ${spell.effectType}`,
          targets: [],
          appliedEffects: []
        };
    }
  }
  
  /**
   * Validate spell targeting
   */
  private validateTargeting(
    spell: CombatSpell,
    targets: (Character | NPC)[],
    targetPosition?: { x: number, y: number }
  ): boolean {
    switch (spell.target) {
      case 'single':
        // Single target spells need exactly one target
        return targets.length === 1;
      case 'multiple':
        // Multiple target spells need at least one target
        return targets.length > 0;
      case 'area':
        // Area spells need either targets or a position
        return targets.length > 0 || !!targetPosition;
      case 'self':
        // Self spells target the caster, so targets should be empty
        return targets.length === 0;
      default:
        return false;
    }
  }
  
  /**
   * Process a damage-dealing spell
   */
  private processDamageSpell(
    spell: CombatSpell,
    caster: Character | NPC,
    targets: (Character | NPC)[]
  ): SpellCastResult {
    if (!spell.damageFormula) {
      return {
        success: false,
        message: `Spell ${spell.name} is missing damage formula.`,
        targets: targets.map(t => t.id),
        appliedEffects: []
      };
    }
    
    let totalDamage = 0;
    const savingThrows: { targetId: string; success: boolean; roll: number; total: number }[] = [];
    const appliedEffects: { targetId: string; effect: string; duration: number }[] = [];
    const affectedTargets: string[] = [];
    
    // Calculate damage based on spell level and formula
    const damageRoll = rollDice(spell.damageFormula);
    
    // Apply damage to each target
    for (const target of targets) {
      let damage = damageRoll.total;
      affectedTargets.push(target.id);
      
      // If the spell has a saving throw, roll it
      if (spell.savingThrow) {
        // Get the target's ability score
        let abilityScore = 10; // Default
        const ability = spell.savingThrow.ability;
        
        if ('abilityScores' in target) {
          abilityScore = target.abilityScores[ability];
        } else if (target.stats?.abilityScores) {
          abilityScore = target.stats.abilityScores[ability];
        }
        
        // Roll the saving throw
        const save = rollSavingThrow(
          abilityScore,
          0, // No proficiency for simplicity
          spell.savingThrow.dc
        );
        
        savingThrows.push({
          targetId: target.id,
          success: save.success,
          roll: save.roll,
          total: save.total
        });
        
        // If the save is successful, halve the damage (common rule for many spells)
        if (save.success) {
          damage = Math.floor(damage / 2);
        }
      }
      
      // Apply the damage to the target
      totalDamage += damage;
      this.applySpellDamage(target, damage);
      
      // Apply any additional effects
      if (spell.temporaryEffect && spell.temporaryEffect.name) {
        appliedEffects.push({
          targetId: target.id,
          effect: spell.temporaryEffect.name,
          duration: spell.temporaryEffect.duration || 1
        });
      }
    }
    
    // Create message
    let message = '';
    
    if (targets.length === 1) {
      message = `${caster.name} casts ${spell.name} at ${targets[0].name}`;
      
      if (savingThrows.length > 0) {
        const save = savingThrows[0];
        message += save.success
          ? `, who successfully saves (${save.total} vs DC ${spell.savingThrow!.dc})`
          : `, who fails to save (${save.total} vs DC ${spell.savingThrow!.dc})`;
      }
      
      message += `, dealing ${totalDamage} ${spell.damageType} damage.`;
    } else {
      message = `${caster.name} casts ${spell.name}, targeting ${targets.length} creatures`;
      
      if (spell.areaOfEffect) {
        message += ` in a ${spell.areaOfEffect.size}-foot ${spell.areaOfEffect.type}`;
      }
      
      message += `, dealing a total of ${totalDamage} ${spell.damageType} damage.`;
    }
    
    // Add effect information
    if (appliedEffects.length > 0) {
      const effectNames = [...new Set(appliedEffects.map(e => e.effect))];
      message += ` The spell also applies ${effectNames.join(', ')}.`;
    }
    
    return {
      success: true,
      message,
      damage: totalDamage,
      targets: affectedTargets,
      savingThrows,
      appliedEffects
    };
  }
  
  /**
   * Process a healing spell
   */
  private processHealingSpell(
    spell: CombatSpell,
    caster: Character | NPC,
    targets: (Character | NPC)[]
  ): SpellCastResult {
    if (!spell.healingFormula) {
      return {
        success: false,
        message: `Spell ${spell.name} is missing healing formula.`,
        targets: targets.map(t => t.id),
        appliedEffects: []
      };
    }
    
    let totalHealing = 0;
    const affectedTargets: string[] = [];
    
    // Calculate healing based on spell formula
    const healingRoll = rollDice(spell.healingFormula);
    
    // Apply healing to each target
    for (const target of targets) {
      const healing = healingRoll.total;
      affectedTargets.push(target.id);
      
      // Apply the healing to the target
      totalHealing += healing;
      this.applySpellHealing(target, healing);
    }
    
    // Create message
    let message = '';
    
    if (targets.length === 1) {
      message = `${caster.name} casts ${spell.name} on ${targets[0].name}, healing ${totalHealing} hit points.`;
    } else {
      message = `${caster.name} casts ${spell.name}, healing ${targets.length} creatures for a total of ${totalHealing} hit points.`;
    }
    
    return {
      success: true,
      message,
      healing: totalHealing,
      targets: affectedTargets,
      appliedEffects: []
    };
  }
  
  /**
   * Process a spell that applies effects (buff, debuff, control)
   */
  private processEffectSpell(
    spell: CombatSpell,
    caster: Character | NPC,
    targets: (Character | NPC)[]
  ): SpellCastResult {
    const savingThrows: { targetId: string; success: boolean; roll: number; total: number }[] = [];
    const appliedEffects: { targetId: string; effect: string; duration: number }[] = [];
    const affectedTargets: string[] = [];
    
    // Apply effects to each target
    for (const target of targets) {
      affectedTargets.push(target.id);
      let effectApplied = true;
      
      // If the spell has a saving throw, roll it
      if (spell.savingThrow) {
        // Get the target's ability score
        let abilityScore = 10; // Default
        const ability = spell.savingThrow.ability;
        
        if ('abilityScores' in target) {
          abilityScore = target.abilityScores[ability];
        } else if (target.stats?.abilityScores) {
          abilityScore = target.stats.abilityScores[ability];
        }
        
        // Roll the saving throw
        const save = rollSavingThrow(
          abilityScore,
          0, // No proficiency for simplicity
          spell.savingThrow.dc
        );
        
        savingThrows.push({
          targetId: target.id,
          success: save.success,
          roll: save.roll,
          total: save.total
        });
        
        // If the save is successful, the effect might not be applied (common rule)
        if (save.success) {
          effectApplied = false;
        }
      }
      
      // Apply any effects if the save failed or there was no save
      if (effectApplied && spell.temporaryEffect && spell.temporaryEffect.name) {
        appliedEffects.push({
          targetId: target.id,
          effect: spell.temporaryEffect.name,
          duration: spell.temporaryEffect.duration || 1
        });
      }
    }
    
    // Create environmental effect if applicable
    let createdEnvironmentalEffect: EnvironmentalEffect | undefined;
    
    if (spell.environmentalEffect && spell.environmentalEffect.name) {
      createdEnvironmentalEffect = {
        name: spell.environmentalEffect.name,
        description: spell.environmentalEffect.description || `Effect created by ${spell.name}`,
        type: spell.environmentalEffect.type || 'hazard',
        effect: spell.environmentalEffect.effect || ((entity) => {}),
        duration: spell.environmentalEffect.duration || 1,
        savingThrow: spell.environmentalEffect.savingThrow
      };
    }
    
    // Create message
    let message = '';
    
    if (targets.length === 1) {
      message = `${caster.name} casts ${spell.name} on ${targets[0].name}`;
      
      if (savingThrows.length > 0) {
        const save = savingThrows[0];
        message += save.success
          ? `, who successfully saves (${save.total} vs DC ${spell.savingThrow!.dc}) and is unaffected`
          : `, who fails to save (${save.total} vs DC ${spell.savingThrow!.dc})`;
      }
      
      if (appliedEffects.length > 0) {
        message += ` and is affected by ${appliedEffects[0].effect} for ${appliedEffects[0].duration} rounds.`;
      } else {
        message += '.';
      }
    } else {
      message = `${caster.name} casts ${spell.name}, targeting ${targets.length} creatures`;
      
      if (spell.areaOfEffect) {
        message += ` in a ${spell.areaOfEffect.size}-foot ${spell.areaOfEffect.type}`;
      }
      
      const successfulSaves = savingThrows.filter(s => s.success).length;
      if (savingThrows.length > 0) {
        message += `. ${successfulSaves} succeed on their saving throws and ${savingThrows.length - successfulSaves} fail.`;
      } else {
        message += '.';
      }
      
      if (appliedEffects.length > 0) {
        const effectNames = [...new Set(appliedEffects.map(e => e.effect))];
        message += ` ${appliedEffects.length} creatures are affected by ${effectNames.join(', ')}.`;
      }
    }
    
    // Add environmental effect information
    if (createdEnvironmentalEffect) {
      message += ` The spell creates ${createdEnvironmentalEffect.name} in the area.`;
    }
    
    return {
      success: true,
      message,
      targets: affectedTargets,
      savingThrows,
      appliedEffects,
      createdEnvironmentalEffect
    };
  }
  
  /**
   * Process a utility spell
   */
  private processUtilitySpell(
    spell: CombatSpell,
    caster: Character | NPC,
    targets: (Character | NPC)[],
    targetPosition?: { x: number, y: number }
  ): SpellCastResult {
    // Utility spells often have custom effects that don't fit into other categories
    const message = `${caster.name} casts ${spell.name}.`;
    
    return {
      success: true,
      message,
      targets: targets.map(t => t.id),
      appliedEffects: []
    };
  }
  
  /**
   * Process a summoning spell
   */
  private processSummoningSpell(
    spell: CombatSpell,
    caster: Character | NPC,
    targetPosition?: { x: number, y: number }
  ): SpellCastResult {
    // For simplicity, summoning spells just return a message for now
    // In a full implementation, this would create a new NPC
    const message = `${caster.name} casts ${spell.name}, but summoning is not fully implemented.`;
    
    return {
      success: true,
      message,
      targets: [],
      appliedEffects: []
    };
  }
  
  /**
   * Apply damage from a spell to a target
   */
  private applySpellDamage(target: Character | NPC, damage: number): void {
    // Apply damage to the target's hit points
    if ('hitPoints' in target) {
      target.hitPoints = Math.max(0, target.hitPoints - damage);
    } else if (target.stats?.hitPoints !== undefined) {
      target.stats.hitPoints = Math.max(0, target.stats.hitPoints - damage);
    }
  }
  
  /**
   * Apply healing from a spell to a target
   */
  private applySpellHealing(target: Character | NPC, healing: number): void {
    // Apply healing to the target's hit points, up to their max
    if ('hitPoints' in target && 'maxHitPoints' in target) {
      target.hitPoints = Math.min(target.maxHitPoints, target.hitPoints + healing);
    } else if (target.stats?.hitPoints !== undefined) {
      // For NPCs, estimate max HP as current HP (for simplicity)
      // In a full implementation, NPCs would have max HP too
      const maxHp = target.stats.hitPoints * 2; // Rough estimate
      target.stats.hitPoints = Math.min(maxHp, target.stats.hitPoints + healing);
    }
  }
} 