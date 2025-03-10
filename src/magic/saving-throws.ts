/**
 * Saving Throw System
 * 
 * This file provides the functionality for handling saving throws against spell effects
 * and other abilities in the D&D AI DM system.
 */

import { AbilityType, DamageType } from './spell';

/**
 * Result of a saving throw attempt
 */
export interface SavingThrowResult {
  success: boolean;
  roll: number;
  total: number;
  dc: number;
  abilityType: AbilityType;
  advantage: boolean;
  disadvantage: boolean;
  modifier: number;
  context?: string;
}

/**
 * Parameters for making a saving throw
 */
export interface SavingThrowParams {
  target: any;
  abilityType: AbilityType;
  dc: number;
  advantage?: boolean;
  disadvantage?: boolean;
  modifier?: number;
  context?: string;
}

/**
 * Effect modifier based on saving throw result
 */
export enum SaveEffect {
  None = "none",
  Half = "half",
  Negated = "negated",
  Reduced = "reduced"
}

/**
 * Make a saving throw for a target
 */
export function makeSavingThrow(params: SavingThrowParams): SavingThrowResult {
  const {
    target,
    abilityType,
    dc,
    advantage = false,
    disadvantage = false,
    modifier = 0,
    context = ''
  } = params;
  
  // Get the ability modifier from the target
  let abilityModifier = 0;
  
  // Handle different target structures (resilient code that works with various character formats)
  if (target.abilityScores) {
    const abilityKey = abilityType.toLowerCase();
    // Try different property formats
    if (target.abilityScores[abilityKey]?.modifier !== undefined) {
      abilityModifier = target.abilityScores[abilityKey].modifier;
    } else if (target.abilityScores[abilityKey]?.value !== undefined) {
      // Convert value to modifier: (score - 10) / 2, rounded down
      abilityModifier = Math.floor((target.abilityScores[abilityKey].value - 10) / 2);
    } else if (typeof target.abilityScores[abilityKey] === 'number') {
      // Direct number value, convert to modifier
      abilityModifier = Math.floor((target.abilityScores[abilityKey] - 10) / 2);
    }
  }
  
  // Check for proficiency in saving throws
  let proficiencyBonus = 0;
  if (
    target.proficiencies?.savingThrows?.includes(abilityType.toLowerCase()) ||
    target.savingThrowProficiencies?.includes(abilityType.toLowerCase())
  ) {
    proficiencyBonus = target.proficiencyBonus || calculateProficiencyBonus(target.level || 1);
  }
  
  // Apply total modifier
  const totalModifier = abilityModifier + proficiencyBonus + modifier;
  
  // Roll the saving throw
  const roll = rollSavingThrow(advantage, disadvantage);
  const total = roll + totalModifier;
  
  // Determine success or failure
  const success = total >= dc;
  
  return {
    success,
    roll,
    total,
    dc,
    abilityType,
    advantage,
    disadvantage,
    modifier: totalModifier,
    context
  };
}

/**
 * Roll a d20 for a saving throw, handling advantage and disadvantage
 */
function rollSavingThrow(advantage: boolean, disadvantage: boolean): number {
  // If both advantage and disadvantage apply, they cancel out
  if (advantage && disadvantage) {
    return rollD20();
  }
  
  if (advantage) {
    const roll1 = rollD20();
    const roll2 = rollD20();
    return Math.max(roll1, roll2);
  }
  
  if (disadvantage) {
    const roll1 = rollD20();
    const roll2 = rollD20();
    return Math.min(roll1, roll2);
  }
  
  return rollD20();
}

/**
 * Roll a d20
 */
function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Calculate proficiency bonus based on level
 */
function calculateProficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

/**
 * Check if a target has advantage on a saving throw against a specific effect
 */
export function hasSavingThrowAdvantage(
  target: any,
  abilityType: AbilityType,
  damageType?: DamageType
): boolean {
  // Check for class features, racial traits, etc. that grant advantage
  
  // Examples of common D&D advantage conditions:
  
  // Dwarves have advantage on saving throws against poison
  if (
    target.race?.name?.toLowerCase().includes('dwarf') &&
    damageType === DamageType.Poison
  ) {
    return true;
  }
  
  // Gnomes have advantage on INT, WIS, CHA saving throws against magic
  if (
    target.race?.name?.toLowerCase().includes('gnome') &&
    (abilityType === AbilityType.Intelligence || 
     abilityType === AbilityType.Wisdom || 
     abilityType === AbilityType.Charisma)
  ) {
    return true;
  }
  
  // Check for specific features
  const features = target.features || [];
  for (const feature of features) {
    if (
      // Barbarians with Danger Sense have advantage on DEX saves they can see
      (feature.name === 'Danger Sense' && abilityType === AbilityType.Dexterity) ||
      // Monks with Diamond Soul have advantage on all saving throws
      (feature.name === 'Diamond Soul') ||
      // Paladins with Aura of Protection give saving throw bonuses to nearby allies
      (feature.name === 'Aura of Protection')
    ) {
      return true;
    }
  }
  
  // Check for magic resistance
  if (target.traits?.magicResistance) {
    return true;
  }
  
  return false;
}

/**
 * Check if a target has disadvantage on a saving throw against a specific effect
 */
export function hasSavingThrowDisadvantage(
  target: any,
  abilityType: AbilityType
): boolean {
  // Check for conditions that impose disadvantage
  const conditions = target.conditions || [];
  
  // Poisoned condition gives disadvantage on ability checks and attack rolls, not saves
  if (conditions.includes('Poisoned')) {
    return false;
  }
  
  // Restrained condition doesn't affect saving throws directly
  
  // Exhaustion level 3 or higher gives disadvantage on saving throws
  const exhaustionLevel = target.exhaustion || 0;
  if (exhaustionLevel >= 3) {
    return true;
  }
  
  return false;
}

/**
 * Determine if a target is immune to a specific damage type or effect
 */
export function isImmuneToEffect(
  target: any,
  damageType?: DamageType,
  effectType?: string
): boolean {
  // Check immunities for damage types
  if (damageType && target.immunities?.includes(damageType)) {
    return true;
  }
  
  // Check immunities for effect types (like being immune to the frightened condition)
  if (effectType && target.conditionImmunities?.includes(effectType)) {
    return true;
  }
  
  return false;
}

/**
 * Determine if a target has resistance to a specific damage type
 */
export function hasResistanceToEffect(
  target: any,
  damageType?: DamageType
): boolean {
  if (damageType && target.resistances?.includes(damageType)) {
    return true;
  }
  
  return false;
}

/**
 * Modify damage based on saving throw, resistance, and immunities
 */
export function modifyDamageBasedOnSave(
  damage: number,
  saveResult: SavingThrowResult,
  saveEffect: SaveEffect,
  target: any,
  damageType?: DamageType
): number {
  // Check for immunity first
  if (isImmuneToEffect(target, damageType)) {
    return 0;
  }
  
  // Apply saving throw effects
  let modifiedDamage = damage;
  
  if (saveResult.success) {
    switch (saveEffect) {
      case SaveEffect.Negated:
        modifiedDamage = 0;
        break;
      case SaveEffect.Half:
        modifiedDamage = Math.floor(damage / 2);
        break;
      case SaveEffect.Reduced:
        modifiedDamage = Math.floor(damage * 0.75); // 25% reduction
        break;
      case SaveEffect.None:
      default:
        // No change to damage
        break;
    }
  }
  
  // Apply resistance (half damage)
  if (hasResistanceToEffect(target, damageType)) {
    modifiedDamage = Math.floor(modifiedDamage / 2);
  }
  
  // Apply vulnerability (double damage)
  if (damageType && target.vulnerabilities?.includes(damageType)) {
    modifiedDamage = modifiedDamage * 2;
  }
  
  return Math.max(0, modifiedDamage); // Ensure damage is never negative
}

/**
 * Format a saving throw result as a descriptive string
 */
export function formatSavingThrowResult(result: SavingThrowResult): string {
  const outcomeText = result.success ? "succeeds" : "fails";
  const rollText = `${result.roll}${result.modifier >= 0 ? '+' : ''}${result.modifier} = ${result.total}`;
  
  let advantageText = '';
  if (result.advantage && !result.disadvantage) {
    advantageText = ' with advantage';
  } else if (!result.advantage && result.disadvantage) {
    advantageText = ' with disadvantage';
  }
  
  return `${result.context || 'Target'} rolls a ${rollText} and ${outcomeText} on the ${result.abilityType} saving throw (DC ${result.dc})${advantageText}.`;
} 