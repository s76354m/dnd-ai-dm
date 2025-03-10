import { AbilityScores, AbilityScore } from '../../core/interfaces/character';

/**
 * Converts short form ability scores (str, dex, etc.) to the proper AbilityScores format
 * with AbilityScore objects containing score and modifier values.
 */
export function convertToFullAbilityScores(shortForm: {
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
}): AbilityScores {
  const result: AbilityScores = {
    strength: { score: shortForm.str || 10, modifier: calculateModifier(shortForm.str || 10) },
    dexterity: { score: shortForm.dex || 10, modifier: calculateModifier(shortForm.dex || 10) },
    constitution: { score: shortForm.con || 10, modifier: calculateModifier(shortForm.con || 10) },
    intelligence: { score: shortForm.int || 10, modifier: calculateModifier(shortForm.int || 10) },
    wisdom: { score: shortForm.wis || 10, modifier: calculateModifier(shortForm.wis || 10) },
    charisma: { score: shortForm.cha || 10, modifier: calculateModifier(shortForm.cha || 10) },
    
    // Add short form properties for compatibility
    str: shortForm.str,
    dex: shortForm.dex,
    con: shortForm.con,
    int: shortForm.int,
    wis: shortForm.wis,
    cha: shortForm.cha
  };
  
  return result;
}

/**
 * Extracts short form ability scores from full AbilityScores object
 */
export function getShortFormAbilityScores(fullForm: AbilityScores): {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
} {
  return {
    str: fullForm.str !== undefined ? fullForm.str : fullForm.strength.score,
    dex: fullForm.dex !== undefined ? fullForm.dex : fullForm.dexterity.score,
    con: fullForm.con !== undefined ? fullForm.con : fullForm.constitution.score,
    int: fullForm.int !== undefined ? fullForm.int : fullForm.intelligence.score,
    wis: fullForm.wis !== undefined ? fullForm.wis : fullForm.wisdom.score,
    cha: fullForm.cha !== undefined ? fullForm.cha : fullForm.charisma.score
  };
}

/**
 * Calculate ability score modifier
 */
export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
} 