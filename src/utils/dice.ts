/**
 * Dice Rolling Utilities
 * 
 * Comprehensive utility functions for rolling dice with validation and error handling.
 * Supports standard D&D dice notation parsing and rolling.
 */

/**
 * Result of a dice roll
 */
export interface DiceRollResult {
  /** The total value of the roll including modifiers */
  total: number;
  /** Individual dice results */
  rolls: number[];
  /** Any static modifier added to the roll */
  modifier: number;
  /** Information about the roll for debugging */
  meta: {
    /** The original notation used */
    notation: string;
    /** Number of dice rolled */
    numDice: number;
    /** Size of dice used */
    dieSize: number;
    /** Detailed information about the roll process */
    debug?: string[];
  };
}

/**
 * Error thrown when there's an issue with dice rolling
 */
export class DiceRollError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiceRollError';
  }
}

/**
 * Configuration options for dice rolling
 */
export interface DiceRollOptions {
  /** Maximum number of dice allowed in a single roll (to prevent abuse) */
  maxDiceCount?: number;
  /** Maximum die size allowed (to prevent extreme values) */
  maxDieSize?: number;
  /** Enable logging of dice roll details */
  debug?: boolean;
}

// Default limits to prevent abuse or extreme calculations
const DEFAULT_MAX_DICE_COUNT = 100;
const DEFAULT_MAX_DIE_SIZE = 1000;

/**
 * Roll a single die of the specified size
 * 
 * @param sides Number of sides on the die
 * @returns A random number between 1 and sides (inclusive)
 * @throws {DiceRollError} If sides is not a positive integer
 */
export function rollDie(sides: number): number {
  // Validate sides
  if (!Number.isInteger(sides)) {
    throw new DiceRollError(`Die size must be an integer, got: ${sides}`);
  }
  
  if (sides <= 0) {
    throw new DiceRollError(`Die size must be positive, got: ${sides}`);
  }
  
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice of the same size
 * 
 * @param count Number of dice to roll
 * @param sides Number of sides on each die
 * @param options Configuration options
 * @returns Array of roll results
 * @throws {DiceRollError} If parameters are invalid
 */
export function rollMultipleDice(
  count: number, 
  sides: number, 
  options: DiceRollOptions = {}
): number[] {
  // Get limits from options or use defaults
  const maxDiceCount = options.maxDiceCount ?? DEFAULT_MAX_DICE_COUNT;
  const maxDieSize = options.maxDieSize ?? DEFAULT_MAX_DIE_SIZE;
  
  // Validate count
  if (!Number.isInteger(count)) {
    throw new DiceRollError(`Dice count must be an integer, got: ${count}`);
  }
  
  if (count <= 0) {
    throw new DiceRollError(`Dice count must be positive, got: ${count}`);
  }
  
  if (count > maxDiceCount) {
    throw new DiceRollError(`Exceeded maximum allowed dice count (${maxDiceCount}), got: ${count}`);
  }
  
  // Validate sides
  if (!Number.isInteger(sides)) {
    throw new DiceRollError(`Die size must be an integer, got: ${sides}`);
  }
  
  if (sides <= 0) {
    throw new DiceRollError(`Die size must be positive, got: ${sides}`);
  }
  
  if (sides > maxDieSize) {
    throw new DiceRollError(`Exceeded maximum allowed die size (${maxDieSize}), got: ${sides}`);
  }
  
  // Roll the dice
  const results: number[] = [];
  
  for (let i = 0; i < count; i++) {
    results.push(rollDie(sides));
  }
  
  return results;
}

/**
 * Parse a dice notation string and roll the dice
 * 
 * @param notation The dice notation (e.g., "2d6+3", "4d8-2", "d20")
 * @param options Configuration options
 * @returns The result of the roll
 * @throws {DiceRollError} If the notation is invalid or parameters exceed limits
 */
export function rollDice(notation: string, options: DiceRollOptions = {}): DiceRollResult {
  if (!notation || typeof notation !== 'string') {
    throw new DiceRollError(`Invalid dice notation: ${notation}`);
  }
  
  const debug: string[] = options.debug ? [] : undefined as unknown as string[];
  if (debug) debug.push(`Processing dice notation: ${notation}`);
  
  // Support for more complex dice notation: NdM+K or NdM-K or just dM (for 1dM)
  const diceRegex = /^(\d+)?d(\d+)(?:([-+])(\d+))?$/i;
  const match = notation.toLowerCase().match(diceRegex);
  
  if (!match) {
    throw new DiceRollError(`Invalid dice notation format: ${notation}. Expected format like '2d6+3' or 'd20'.`);
  }
  
  // Parse components
  const numDice = match[1] ? parseInt(match[1]) : 1; // Default to 1 if not specified
  const dieSize = parseInt(match[2]);
  const modifierSign = match[3] || '+'; // Default to + if not specified
  const modifierValue = match[4] ? parseInt(match[4]) : 0;
  const modifier = modifierSign === '+' ? modifierValue : -modifierValue;
  
  if (debug) {
    debug.push(`Parsed components: ${numDice} dice with ${dieSize} sides, modifier ${modifierSign}${modifierValue}`);
  }
  
  try {
    // Roll the dice
    const rolls = rollMultipleDice(numDice, dieSize, options);
    
    if (debug) {
      debug.push(`Roll results: [${rolls.join(', ')}]`);
      debug.push(`Modifier: ${modifier}`);
    }
    
    // Calculate the total
    const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
    const total = rollSum + modifier;
    
    if (debug) {
      debug.push(`Roll sum: ${rollSum}`);
      debug.push(`Total after modifier: ${total}`);
    }
    
    return {
      total,
      rolls,
      modifier,
      meta: {
        notation,
        numDice,
        dieSize,
        debug
      }
    };
  } catch (error) {
    if (error instanceof DiceRollError) {
      throw error;
    }
    
    // Handle unexpected errors
    throw new DiceRollError(`Error rolling dice: ${(error as Error).message}`);
  }
}

/**
 * Roll ability check or saving throw
 * 
 * @param abilityModifier The ability modifier for the check
 * @param proficiencyBonus Optional proficiency bonus
 * @param options Additional options for the roll
 * @returns Result of the ability check or saving throw
 */
export function rollD20Check(
  abilityModifier: number,
  proficiencyBonus: number = 0,
  options: {
    advantage?: boolean;
    disadvantage?: boolean;
    dc?: number;
    critical?: { success: number; failure: number; };
    debug?: boolean;
  } = {}
): {
  roll: number;
  total: number;
  modifier: number;
  success: boolean;
  critical: 'success' | 'failure' | null;
  rolls?: number[];
  meta?: { debug?: string[] };
} {
  const { advantage = false, disadvantage = false, dc = 10, debug = false } = options;
  const critical = options.critical || { success: 20, failure: 1 };
  
  const debugInfo: string[] = options.debug ? [] : undefined as unknown as string[];
  
  if (debugInfo) {
    debugInfo.push(`Rolling D20 check with ability modifier ${abilityModifier}, proficiency ${proficiencyBonus}`);
    if (advantage) debugInfo.push('Rolling with advantage');
    if (disadvantage) debugInfo.push('Rolling with disadvantage');
  }
  
  // Calculate total modifier
  const totalModifier = abilityModifier + proficiencyBonus;
  
  // Roll the d20, with advantage/disadvantage if applicable
  let roll: number;
  let rolls: number[] = [];
  
  if (advantage && !disadvantage) {
    // Roll twice and take the higher value
    const roll1 = rollDie(20);
    const roll2 = rollDie(20);
    rolls = [roll1, roll2];
    roll = Math.max(roll1, roll2);
    
    if (debugInfo) {
      debugInfo.push(`Advantage rolls: ${roll1}, ${roll2} (using ${roll})`);
    }
  } else if (disadvantage && !advantage) {
    // Roll twice and take the lower value
    const roll1 = rollDie(20);
    const roll2 = rollDie(20);
    rolls = [roll1, roll2];
    roll = Math.min(roll1, roll2);
    
    if (debugInfo) {
      debugInfo.push(`Disadvantage rolls: ${roll1}, ${roll2} (using ${roll})`);
    }
  } else {
    // Regular roll
    roll = rollDie(20);
    rolls = [roll];
    
    if (debugInfo) {
      debugInfo.push(`Standard roll: ${roll}`);
    }
  }
  
  // Calculate the total
  const total = roll + totalModifier;
  
  if (debugInfo) {
    debugInfo.push(`Total modifier: ${totalModifier}`);
    debugInfo.push(`Total roll: ${roll} + ${totalModifier} = ${total}`);
    debugInfo.push(`DC: ${dc}, Success: ${total >= dc}`);
  }
  
  // Check for critical success or failure
  let criticalResult: 'success' | 'failure' | null = null;
  if (roll >= critical.success) {
    criticalResult = 'success';
    if (debugInfo) debugInfo.push('Critical success!');
  } else if (roll <= critical.failure) {
    criticalResult = 'failure';
    if (debugInfo) debugInfo.push('Critical failure!');
  }
  
  return {
    roll,
    total,
    modifier: totalModifier,
    success: total >= dc,
    critical: criticalResult,
    rolls: rolls.length > 1 ? rolls : undefined,
    meta: debug ? { debug: debugInfo } : undefined
  };
}

/**
 * Checks if a string is valid dice notation
 * 
 * @param notation String to check
 * @returns Whether the string is valid dice notation
 */
export function isValidDiceNotation(notation: string): boolean {
  if (!notation || typeof notation !== 'string') {
    return false;
  }
  
  const diceRegex = /^(\d+)?d(\d+)(?:([-+])(\d+))?$/i;
  return diceRegex.test(notation.toLowerCase());
}

/**
 * Calculate probabilities for a dice roll
 * 
 * @param notation Dice notation
 * @returns Probability information
 */
export function calculateDiceProbabilities(notation: string): {
  min: number;
  max: number;
  mean: number;
  median: number;
  distribution?: Map<number, number>;
} {
  try {
    // Parse the notation
    const diceRegex = /^(\d+)?d(\d+)(?:([-+])(\d+))?$/i;
    const match = notation.toLowerCase().match(diceRegex);
    
    if (!match) {
      throw new DiceRollError(`Invalid dice notation: ${notation}`);
    }
    
    const numDice = match[1] ? parseInt(match[1]) : 1;
    const dieSize = parseInt(match[2]);
    const modifierSign = match[3] || '+';
    const modifierValue = match[4] ? parseInt(match[4]) : 0;
    const modifier = modifierSign === '+' ? modifierValue : -modifierValue;
    
    // Calculate min and max
    const min = numDice + modifier; // Minimum is all 1s
    const max = numDice * dieSize + modifier; // Maximum is all maximum values
    
    // Calculate mean
    // For a fair die of size n, the mean is (n+1)/2
    const meanPerDie = (dieSize + 1) / 2;
    const mean = numDice * meanPerDie + modifier;
    
    // Calculate median (approximation for multiple dice)
    const median = Math.floor((min + max) / 2);
    
    return {
      min,
      max,
      mean,
      median
    };
  } catch (error) {
    throw new DiceRollError(`Error calculating probabilities: ${(error as Error).message}`);
  }
} 