/**
 * Ability Score Utilities
 * 
 * Utility functions for working with ability scores.
 */

import { 
  rollDice as diceUtilRollDice, 
  rollD20Check, 
  DiceRollResult
} from './dice';

/**
 * Calculate the ability score modifier
 * 
 * @param score The ability score value
 * @returns The modifier value
 */
export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Get a textual representation of an ability score modifier
 * 
 * @param score The ability score value
 * @returns A string representation of the modifier (e.g., "+3" or "-1")
 */
export function getModifierText(score: number): string {
  const modifier = calculateModifier(score);
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}

/**
 * Calculate an ability check roll
 * 
 * @param score The ability score
 * @param proficiencyBonus Optional proficiency bonus
 * @param advantage Whether the roll has advantage
 * @param disadvantage Whether the roll has disadvantage
 * @returns The result of the ability check
 */
export function rollAbilityCheck(
  score: number,
  proficiencyBonus: number = 0,
  advantage: boolean = false,
  disadvantage: boolean = false
): {
  roll: number;
  total: number;
  modifier: number;
  success: boolean;
  critical: boolean;
} {
  const modifier = calculateModifier(score);
  
  // Use the new rollD20Check function
  const result = rollD20Check(modifier, proficiencyBonus, {
    advantage,
    disadvantage,
    dc: 10 // Default DC of 10
  });
  
  return {
    roll: result.roll,
    total: result.total,
    modifier: modifier + proficiencyBonus,
    success: result.success,
    critical: result.critical === 'success' // Convert to boolean for backward compatibility
  };
}

/**
 * Calculate a saving throw roll
 * 
 * @param score The ability score
 * @param proficiencyBonus Optional proficiency bonus
 * @param dc The difficulty class to beat
 * @param advantage Whether the roll has advantage
 * @param disadvantage Whether the roll has disadvantage
 * @returns The result of the saving throw
 */
export function rollSavingThrow(
  score: number,
  proficiencyBonus: number = 0,
  dc: number = 10,
  advantage: boolean = false,
  disadvantage: boolean = false
): {
  roll: number;
  total: number;
  modifier: number;
  success: boolean;
  critical: boolean;
} {
  const modifier = calculateModifier(score);
  
  // Use the new rollD20Check function
  const result = rollD20Check(modifier, proficiencyBonus, {
    advantage,
    disadvantage,
    dc
  });
  
  return {
    roll: result.roll,
    total: result.total,
    modifier: modifier + proficiencyBonus,
    success: result.success,
    critical: result.critical === 'success' // Convert to boolean for backward compatibility
  };
}

/**
 * Parse a dice notation string and roll the dice
 * 
 * @param notation The dice notation (e.g., "2d6+3")
 * @returns The result of the roll
 */
export function rollDice(notation: string): {
  total: number;
  rolls: number[];
  modifier: number;
} {
  // Use the new rollDice function
  const result = diceUtilRollDice(notation);
  
  return {
    total: result.total,
    rolls: result.rolls,
    modifier: result.modifier
  };
} 