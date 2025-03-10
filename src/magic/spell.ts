/**
 * Spell System Core
 * 
 * This file defines the core data structures and interfaces for the D&D 5e spell system.
 * It includes types for spell properties, effects, and a registry for managing spells.
 */

import { v4 as uuidv4 } from 'uuid';
import { makeSavingThrow, SavingThrowResult, SaveEffect, formatSavingThrowResult, hasSavingThrowAdvantage, hasSavingThrowDisadvantage } from './saving-throws';
import { AoeShape } from './targeting';

/**
 * Enum for D&D 5e spell schools
 */
export enum SpellSchool {
  Abjuration = 'Abjuration',
  Conjuration = 'Conjuration',
  Divination = 'Divination',
  Enchantment = 'Enchantment',
  Evocation = 'Evocation',
  Illusion = 'Illusion',
  Necromancy = 'Necromancy',
  Transmutation = 'Transmutation'
}

/**
 * Enum for D&D ability types
 */
export enum AbilityType {
  Strength = 'Strength',
  Dexterity = 'Dexterity',
  Constitution = 'Constitution',
  Intelligence = 'Intelligence',
  Wisdom = 'Wisdom',
  Charisma = 'Charisma'
}

/**
 * Enum for D&D damage types
 */
export enum DamageType {
  Acid = 'Acid',
  Bludgeoning = 'Bludgeoning',
  Cold = 'Cold',
  Fire = 'Fire',
  Force = 'Force',
  Lightning = 'Lightning',
  Necrotic = 'Necrotic',
  Piercing = 'Piercing',
  Poison = 'Poison',
  Psychic = 'Psychic',
  Radiant = 'Radiant',
  Slashing = 'Slashing',
  Thunder = 'Thunder'
}

/**
 * Enum for conditions that can be applied by spells
 */
export enum ConditionType {
  Blinded = 'Blinded',
  Charmed = 'Charmed',
  Deafened = 'Deafened',
  Frightened = 'Frightened',
  Grappled = 'Grappled',
  Incapacitated = 'Incapacitated',
  Invisible = 'Invisible',
  Paralyzed = 'Paralyzed',
  Petrified = 'Petrified',
  Poisoned = 'Poisoned',
  Prone = 'Prone',
  Restrained = 'Restrained',
  Stunned = 'Stunned',
  Unconscious = 'Unconscious'
}

/**
 * Interface for spell components
 */
export interface SpellComponents {
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  materials?: string;
}

/**
 * Interface for spell casting time
 */
export interface CastingTime {
  type: 'action' | 'bonus action' | 'reaction' | 'minute' | 'hour';
  value: number;
  condition?: string; // For reactions
}

/**
 * Interface for spell range
 */
export interface Range {
  type: 'self' | 'touch' | 'ranged';
  distance?: number; // In feet, if ranged
}

/**
 * Interface for spell duration
 */
export interface Duration {
  type: 'instantaneous' | 'concentration' | 'timed' | 'until dispelled' | 'special';
  time?: number;
  unit?: 'round' | 'minute' | 'hour' | 'day';
}

/**
 * Interface for area of effect
 */
export interface AreaOfEffect {
  type: AoeShape;
  size: number; // Size in feet
  width?: number; // For line and cube shapes
  origin?: 'self' | 'point'; // Where the area originates from
}

/**
 * Interface for healing properties
 */
export interface Healing {
  formula: string; // Dice formula like "1d8+3"
  higherLevel?: {
    level: number;
    additionalHealing: string;
  };
}

/**
 * Interface for conditions
 */
export interface Condition {
  type: ConditionType;
  duration: number; // Duration in rounds
  savingThrow?: AbilityType; // Ability to save against the condition
  saveDC?: number; // DC to save against
}

/**
 * Interface for damage scaling at higher levels
 */
export interface DamageScaling {
  higherLevel: number; // Minimum level for scaling
  additionalDamage: string; // Additional damage formula
}

/**
 * Interface for healing scaling at higher levels
 */
export interface HealingScaling {
  higherLevel: number; // Minimum level for scaling
  additionalHealing: string; // Additional healing formula
}

/**
 * Interface for the result of a spell effect
 */
export interface EffectResult {
  success: boolean;
  message: string;
  damage?: number;
  damageType?: DamageType;
  healing?: number;
  conditions?: ConditionType[];
}

/**
 * Interface for a spell effect
 */
export interface SpellEffect {
  apply(target: any, caster: any, level: number): EffectResult;
  getDescription(caster: any, target: any, level: number): string;
}

/**
 * Main interface for D&D spells
 */
export interface Spell {
  id: string;
  name: string;
  level: number;
  school: SpellSchool;
  castingTime: CastingTime;
  range: Range;
  components: SpellComponents;
  duration: Duration;
  description: string;
  higherLevels?: string;
  classes: string[];
  tags: string[];
  damageType?: DamageType;
  saveType?: AbilityType;
  concentration: boolean;
  ritual: boolean;
  areaOfEffect?: AreaOfEffect;
  effects: SpellEffect[];
}

/**
 * Implementation of a basic damage effect
 */
export class BasicDamageEffect implements SpellEffect {
  private damageType: DamageType;
  private damageFormula: string;
  private scaling?: DamageScaling;
  
  constructor(damageType: DamageType, damageFormula: string, scaling?: DamageScaling) {
    this.damageType = damageType;
    this.damageFormula = damageFormula;
    this.scaling = scaling;
  }
  
  apply(target: any, caster: any, level: number): EffectResult {
    // Calculate base damage
    const damage = this.calculateDamage(level);
    
    // Check if target makes a save (if applicable)
    let success = true;
    let message = `${target.name} takes ${damage} ${this.damageType} damage.`;
    
    return {
      success,
      damage,
      damageType: this.damageType,
      message
    };
  }
  
  getDescription(caster: any, target: any, level: number): string {
    return `${caster.name}'s spell hits ${target.name} with ${this.damageType.toLowerCase()} damage.`;
  }
  
  private calculateDamage(level: number): number {
    // Parse the damage formula (e.g., "1d8", "3d6+4")
    let damage = this.rollDice(this.damageFormula);
    
    // Add additional damage for higher level casting
    if (this.scaling && level >= this.scaling.higherLevel) {
      const additionalLevels = level - this.scaling.higherLevel + 1;
      const additionalDamage = this.rollDice(this.scaling.additionalDamage) * additionalLevels;
      damage += additionalDamage;
    }
    
    return damage;
  }
  
  private rollDice(formula: string): number {
    // This is a simplified dice rolling implementation
    // In a real application, you'd want a more robust solution
    const parts = formula.split(/[d+]/);
    
    if (parts.length === 2) {
      // Simple formula like "1d8"
      const numDice = parseInt(parts[0], 10) || 1;
      const dieSize = parseInt(parts[1], 10) || 6;
      
      let total = 0;
      for (let i = 0; i < numDice; i++) {
        total += Math.floor(Math.random() * dieSize) + 1;
      }
      return total;
    } else if (parts.length === 3) {
      // Formula with a bonus like "1d8+3"
      const numDice = parseInt(parts[0], 10) || 1;
      const dieSize = parseInt(parts[1], 10) || 6;
      const bonus = parseInt(parts[2], 10) || 0;
      
      let total = bonus;
      for (let i = 0; i < numDice; i++) {
        total += Math.floor(Math.random() * dieSize) + 1;
      }
      return total;
    }
    
    // Default fallback
    return Math.floor(Math.random() * 6) + 1;
  }
}

/**
 * Implementation of a basic healing effect
 */
export class BasicHealingEffect implements SpellEffect {
  private healingFormula: string;
  private scaling?: HealingScaling;
  
  constructor(healingFormula: string, scaling?: HealingScaling) {
    this.healingFormula = healingFormula;
    this.scaling = scaling;
  }
  
  apply(target: any, caster: any, level: number): EffectResult {
    // Calculate healing
    const healing = this.calculateHealing(level);
    
    return {
      success: true,
      healing,
      message: `${target.name} regains ${healing} hit points.`
    };
  }
  
  getDescription(caster: any, target: any, level: number): string {
    return `${caster.name}'s spell heals ${target.name}.`;
  }
  
  private calculateHealing(level: number): number {
    // Parse the healing formula (e.g., "1d8+3")
    let healing = this.rollDice(this.healingFormula);
    
    // Add additional healing for higher level casting
    if (this.scaling && level >= this.scaling.higherLevel) {
      const additionalLevels = level - this.scaling.higherLevel + 1;
      const additionalHealing = this.rollDice(this.scaling.additionalHealing) * additionalLevels;
      healing += additionalHealing;
    }
    
    return healing;
  }
  
  private rollDice(formula: string): number {
    // This is a simplified dice rolling implementation
    // In a real application, you'd want a more robust solution
    const parts = formula.split(/[d+]/);
    
    if (parts.length === 2) {
      // Simple formula like "1d8"
      const numDice = parseInt(parts[0], 10) || 1;
      const dieSize = parseInt(parts[1], 10) || 6;
      
      let total = 0;
      for (let i = 0; i < numDice; i++) {
        total += Math.floor(Math.random() * dieSize) + 1;
      }
      return total;
    } else if (parts.length === 3) {
      // Formula with a bonus like "1d8+3"
      const numDice = parseInt(parts[0], 10) || 1;
      const dieSize = parseInt(parts[1], 10) || 6;
      const bonus = parseInt(parts[2], 10) || 0;
      
      let total = bonus;
      for (let i = 0; i < numDice; i++) {
        total += Math.floor(Math.random() * dieSize) + 1;
      }
      return total;
    }
    
    // Default fallback
    return Math.floor(Math.random() * 6) + 1;
  }
}

/**
 * Saving throw effect implementation
 */
export class SavingThrowEffect implements SpellEffect {
  private abilityType: AbilityType;
  private saveEffect: SaveEffect;
  private damageType?: DamageType;
  private damageFormula?: string;
  private condition?: ConditionType;
  private conditionDuration?: number;
  private scaling?: DamageScaling;
  
  constructor(
    abilityType: AbilityType,
    saveEffect: SaveEffect,
    options?: {
      damageType?: DamageType;
      damageFormula?: string;
      condition?: ConditionType;
      conditionDuration?: number;
      scaling?: DamageScaling;
    }
  ) {
    this.abilityType = abilityType;
    this.saveEffect = saveEffect;
    this.damageType = options?.damageType;
    this.damageFormula = options?.damageFormula;
    this.condition = options?.condition;
    this.conditionDuration = options?.conditionDuration || 1;
    this.scaling = options?.scaling;
  }
  
  apply(target: any, caster: any, level: number): EffectResult {
    // Calculate save DC based on caster's stats
    const saveDC = this.calculateSaveDC(caster);
    
    // Check for advantage or disadvantage
    const advantage = hasSavingThrowAdvantage(target, this.abilityType, this.damageType);
    const disadvantage = hasSavingThrowDisadvantage(target, this.abilityType);
    
    // Make the saving throw
    const savingThrow = makeSavingThrow({
      target,
      abilityType: this.abilityType,
      dc: saveDC,
      advantage,
      disadvantage,
      context: target.name
    });
    
    // Initialize result
    let result: EffectResult = {
      success: true,
      message: formatSavingThrowResult(savingThrow)
    };
    
    // Handle damage effects
    if (this.damageFormula && this.damageType) {
      // Calculate base damage
      const baseDamage = this.calculateDamage(level);
      
      // Apply saving throw and resistance modifications
      let finalDamage = baseDamage;
      
      // If save succeeds
      if (savingThrow.success) {
        if (this.saveEffect === SaveEffect.Half) {
          finalDamage = Math.floor(baseDamage / 2);
          result.message += ` ${target.name} takes ${finalDamage} ${this.damageType} damage (reduced by half).`;
        } else if (this.saveEffect === SaveEffect.Negated) {
          finalDamage = 0;
          result.message += ` ${target.name} avoids all damage.`;
        } else if (this.saveEffect === SaveEffect.Reduced) {
          finalDamage = Math.floor(baseDamage * 0.75);
          result.message += ` ${target.name} takes ${finalDamage} ${this.damageType} damage (reduced).`;
        }
      } else {
        // Save failed, take full damage
        result.message += ` ${target.name} takes ${finalDamage} ${this.damageType} damage.`;
      }
      
      // Update result with damage info
      result.damage = finalDamage;
      result.damageType = this.damageType;
      
      // Apply damage to target if it has hp
      if (target.hitPoints) {
        target.hitPoints.current = Math.max(0, target.hitPoints.current - finalDamage);
        result.message += ` ${target.name} has ${target.hitPoints.current}/${target.hitPoints.maximum} HP remaining.`;
      }
    }
    
    // Handle condition effects
    if (this.condition) {
      const applyCondition = !savingThrow.success || this.saveEffect === SaveEffect.None;
      
      if (applyCondition) {
        // Add condition to target
        if (!target.conditions) {
          target.conditions = [];
        }
        
        if (!target.conditions.includes(this.condition)) {
          target.conditions.push(this.condition);
          result.message += ` ${target.name} is now affected by: ${this.condition}`;
        }
        
        // Track condition duration if not already tracked
        if (!target.conditionDurations) {
          target.conditionDurations = {};
        }
        
        target.conditionDurations[this.condition] = this.conditionDuration;
        
        // Add to result
        if (!result.conditions) {
          result.conditions = [];
        }
        result.conditions.push(this.condition);
      } else {
        result.message += ` ${target.name} resists the ${this.condition} effect.`;
      }
    }
    
    return result;
  }
  
  getDescription(caster: any, target: any, level: number): string {
    let description = `${target.name} must make a DC ${this.calculateSaveDC(caster)} ${this.abilityType} saving throw`;
    
    if (this.damageFormula && this.damageType) {
      const damage = this.calculateDamage(level);
      
      if (this.saveEffect === SaveEffect.Half) {
        description += ` or take ${damage} ${this.damageType} damage, or half as much on a successful save.`;
      } else if (this.saveEffect === SaveEffect.Negated) {
        description += ` or take ${damage} ${this.damageType} damage. No damage on a successful save.`;
      } else if (this.saveEffect === SaveEffect.None) {
        description += `. The target takes ${damage} ${this.damageType} damage regardless of the save.`;
      } else {
        description += ` or take ${damage} ${this.damageType} damage.`;
      }
    }
    
    if (this.condition) {
      if (this.saveEffect === SaveEffect.Negated) {
        description += ` On a failed save, the target is ${this.condition.toLowerCase()} for ${this.conditionDuration} rounds.`;
      } else {
        description += ` The target is ${this.condition.toLowerCase()} for ${this.conditionDuration} rounds.`;
      }
    }
    
    return description;
  }
  
  private calculateSaveDC(caster: any): number {
    // Try to get DC from caster
    if (caster.spellSaveDC) {
      return caster.spellSaveDC;
    }
    
    // Otherwise calculate it
    if (caster.spellbook?.spellcastingAbility) {
      const abilityKey = caster.spellbook.spellcastingAbility.toLowerCase();
      const abilityScore = caster.abilityScores?.[abilityKey]?.score || 10;
      const profBonus = caster.proficiencyBonus || Math.floor((caster.level - 1) / 4) + 2;
      
      return 8 + profBonus + Math.floor((abilityScore - 10) / 2);
    }
    
    // Default DC if nothing else works
    return 13;
  }
  
  private calculateDamage(level: number): number {
    if (!this.damageFormula) return 0;
    
    let damageFormula = this.damageFormula;
    
    // Apply scaling for higher level casting
    if (this.scaling && level >= this.scaling.higherLevel) {
      const scalingLevels = level - this.scaling.higherLevel + 1;
      for (let i = 0; i < scalingLevels; i++) {
        damageFormula += ` + ${this.scaling.additionalDamage}`;
      }
    }
    
    return this.rollDice(damageFormula);
  }
  
  private rollDice(formula: string): number {
    let total = 0;
    
    // Split formula into parts (e.g., "2d6 + 3d4 + 5")
    const parts = formula.split('+').map(part => part.trim());
    
    for (const part of parts) {
      if (part.includes('d')) {
        // It's a dice roll
        const [countStr, sideStr] = part.split('d');
        const count = parseInt(countStr || '1');
        const sides = parseInt(sideStr);
        
        if (!isNaN(count) && !isNaN(sides)) {
          for (let i = 0; i < count; i++) {
            total += Math.floor(Math.random() * sides) + 1;
          }
        }
      } else {
        // It's a fixed modifier
        const mod = parseInt(part);
        if (!isNaN(mod)) {
          total += mod;
        }
      }
    }
    
    return total;
  }
}

/**
 * Registry for spells
 */
export class SpellRegistry {
  private static instance: SpellRegistry;
  private spells: Map<string, Spell> = new Map();
  
  private constructor() {}
  
  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): SpellRegistry {
    if (!SpellRegistry.instance) {
      SpellRegistry.instance = new SpellRegistry();
    }
    return SpellRegistry.instance;
  }
  
  /**
   * Register a spell in the registry
   */
  public registerSpell(spell: Spell): void {
    if (!spell.id) {
      spell.id = uuidv4();
    }
    this.spells.set(spell.name.toLowerCase(), spell);
  }
  
  /**
   * Get a spell by name
   */
  public getSpellByName(name: string): Spell | undefined {
    return this.spells.get(name.toLowerCase());
  }
  
  /**
   * Get all registered spells
   */
  public getAllSpells(): Spell[] {
    return Array.from(this.spells.values());
  }
  
  /**
   * Get spells filtered by level
   */
  public getSpellsByLevel(level: number): Spell[] {
    return this.getAllSpells().filter(spell => spell.level === level);
  }
  
  /**
   * Get spells filtered by class
   */
  public getSpellsByClass(className: string): Spell[] {
    return this.getAllSpells().filter(
      spell => spell.classes.some(c => c.toLowerCase() === className.toLowerCase())
    );
  }
  
  /**
   * Get spells filtered by school
   */
  public getSpellsBySchool(school: SpellSchool): Spell[] {
    return this.getAllSpells().filter(spell => spell.school === school);
  }
  
  /**
   * Get spells filtered by tag
   */
  public getSpellsByTag(tag: string): Spell[] {
    return this.getAllSpells().filter(
      spell => spell.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  }
}

/**
 * Calculate a character's spell save DC
 */
export function calculateSpellSaveDC(abilityScore: number, proficiencyBonus: number): number {
  const abilityModifier = Math.floor((abilityScore - 10) / 2);
  return 8 + proficiencyBonus + abilityModifier;
}

/**
 * Calculate a character's spell attack bonus
 */
export function calculateSpellAttackBonus(abilityScore: number, proficiencyBonus: number): number {
  const abilityModifier = Math.floor((abilityScore - 10) / 2);
  return proficiencyBonus + abilityModifier;
} 