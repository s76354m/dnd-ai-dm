/**
 * Dice rolling utilities for D&D mechanics
 * Provides functions for rolling dice and calculating probabilities
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
 * Options for dice rolling
 */
export interface DiceRollOptions {
  /** Maximum number of dice allowed in a single roll (to prevent abuse) */
  maxDiceCount?: number;
  /** Maximum die size allowed (to prevent extreme values) */
  maxDieSize?: number;
  /** Enable logging of dice roll details */
  debug?: boolean;
}

/**
 * Default options for dice rolling
 */
const DEFAULT_DICE_OPTIONS: DiceRollOptions = {
  maxDiceCount: 100,
  maxDieSize: 1000,
  debug: false
};

/**
 * Roll a single die with the specified number of sides
 * @param sides Number of sides on the die
 * @returns Random number between 1 and sides
 */
export function rollDie(sides: number): number {
  if (sides < 1) {
    throw new DiceRollError(`Invalid die size: ${sides}. Must be at least 1.`);
  }
  
  if (!Number.isInteger(sides)) {
    throw new DiceRollError(`Invalid die size: ${sides}. Must be an integer.`);
  }
  
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice of the same type
 * @param count Number of dice to roll
 * @param sides Number of sides on each die
 * @param options Options for dice rolling
 * @returns Array of dice roll results
 */
export function rollMultipleDice(
  count: number, 
  sides: number, 
  options: DiceRollOptions = {}
): number[] {
  const opts = { ...DEFAULT_DICE_OPTIONS, ...options };
  
  if (count < 1) {
    throw new DiceRollError(`Invalid dice count: ${count}. Must be at least 1.`);
  }
  
  if (!Number.isInteger(count)) {
    throw new DiceRollError(`Invalid dice count: ${count}. Must be an integer.`);
  }
  
  if (count > (opts.maxDiceCount || DEFAULT_DICE_OPTIONS.maxDiceCount!)) {
    throw new DiceRollError(
      `Too many dice: ${count}. Maximum allowed is ${opts.maxDiceCount || DEFAULT_DICE_OPTIONS.maxDiceCount!}.`
    );
  }
  
  if (sides > (opts.maxDieSize || DEFAULT_DICE_OPTIONS.maxDieSize!)) {
    throw new DiceRollError(
      `Die size too large: ${sides}. Maximum allowed is ${opts.maxDieSize || DEFAULT_DICE_OPTIONS.maxDieSize!}.`
    );
  }
  
  const results: number[] = [];
  
  for (let i = 0; i < count; i++) {
    results.push(rollDie(sides));
  }
  
  return results;
}

/**
 * Roll dice using standard D&D notation (e.g., "2d6+3")
 * @param notation Dice notation string (e.g., "2d6+3", "1d20-2", "3d8")
 * @param options Options for dice rolling
 * @returns Result of the dice roll
 */
export function rollDice(notation: string, options: DiceRollOptions = {}): DiceRollResult {
  const opts = { ...DEFAULT_DICE_OPTIONS, ...options };
  const debug: string[] = [];
  
  if (opts.debug) {
    debug.push(`Rolling: ${notation}`);
  }
  
  // Regular expression to parse dice notation
  // Matches patterns like "2d6", "1d20+3", "3d8-2", etc.
  const diceRegex = /^(\d+)d(\d+)(?:([+-])(\d+))?$/;
  const match = notation.toLowerCase().match(diceRegex);
  
  if (!match) {
    throw new DiceRollError(`Invalid dice notation: ${notation}. Expected format like "2d6+3".`);
  }
  
  const numDice = parseInt(match[1], 10);
  const dieSize = parseInt(match[2], 10);
  const hasModifier = match[3] !== undefined;
  const modifierSign = match[3] === '+' ? 1 : -1;
  const modifierValue = hasModifier ? parseInt(match[4], 10) : 0;
  const modifier = hasModifier ? modifierSign * modifierValue : 0;
  
  if (opts.debug) {
    debug.push(`Parsed: ${numDice} dice with ${dieSize} sides, modifier: ${modifier}`);
  }
  
  const rolls = rollMultipleDice(numDice, dieSize, opts);
  const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
  const total = rollSum + modifier;
  
  if (opts.debug) {
    debug.push(`Rolls: [${rolls.join(', ')}], sum: ${rollSum}, total with modifier: ${total}`);
  }
  
  return {
    total,
    rolls,
    modifier,
    meta: {
      notation,
      numDice,
      dieSize,
      debug: opts.debug ? debug : undefined
    }
  };
}

/**
 * Roll a d20 check with advantage/disadvantage and modifiers
 * @param abilityModifier Ability modifier to add to the roll
 * @param proficiencyBonus Proficiency bonus to add to the roll
 * @param options Options for the roll
 * @returns Result of the d20 check
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
  const debug: string[] = [];
  const modifier = abilityModifier + proficiencyBonus;
  
  if (options.debug) {
    debug.push(`Rolling d20 check with modifier: ${modifier}`);
    debug.push(`Ability modifier: ${abilityModifier}, Proficiency bonus: ${proficiencyBonus}`);
    
    if (options.advantage) {
      debug.push('Rolling with advantage');
    }
    
    if (options.disadvantage) {
      debug.push('Rolling with disadvantage');
    }
    
    if (options.dc !== undefined) {
      debug.push(`DC: ${options.dc}`);
    }
  }
  
  // Handle advantage and disadvantage canceling each other out
  const hasAdvantage = options.advantage && !options.disadvantage;
  const hasDisadvantage = options.disadvantage && !options.advantage;
  
  // Roll twice if advantage or disadvantage
  const rolls = [rollDie(20)];
  
  if (hasAdvantage || hasDisadvantage) {
    rolls.push(rollDie(20));
  }
  
  if (options.debug) {
    debug.push(`Rolls: [${rolls.join(', ')}]`);
  }
  
  // Determine which roll to use
  let roll: number;
  
  if (hasAdvantage) {
    roll = Math.max(...rolls);
    if (options.debug) {
      debug.push(`Using higher roll with advantage: ${roll}`);
    }
  } else if (hasDisadvantage) {
    roll = Math.min(...rolls);
    if (options.debug) {
      debug.push(`Using lower roll with disadvantage: ${roll}`);
    }
  } else {
    roll = rolls[0];
  }
  
  const total = roll + modifier;
  
  if (options.debug) {
    debug.push(`Total: ${roll} + ${modifier} = ${total}`);
  }
  
  // Determine success/failure
  let success = true;
  if (options.dc !== undefined) {
    success = total >= options.dc;
    if (options.debug) {
      debug.push(`Check ${success ? 'succeeds' : 'fails'} against DC ${options.dc}`);
    }
  }
  
  // Handle critical success/failure
  let critical: 'success' | 'failure' | null = null;
  const critSuccess = options.critical?.success ?? 20;
  const critFailure = options.critical?.failure ?? 1;
  
  if (roll >= critSuccess) {
    critical = 'success';
    if (options.debug) {
      debug.push(`Critical success! (${roll} >= ${critSuccess})`);
    }
  } else if (roll <= critFailure) {
    critical = 'failure';
    if (options.debug) {
      debug.push(`Critical failure! (${roll} <= ${critFailure})`);
    }
  }
  
  return {
    roll,
    total,
    modifier,
    success,
    critical,
    rolls: options.debug ? rolls : undefined,
    meta: options.debug ? { debug } : undefined
  };
}

/**
 * Check if a string is valid dice notation
 * @param notation Dice notation to check
 * @returns Whether the notation is valid
 */
export function isValidDiceNotation(notation: string): boolean {
  const diceRegex = /^(\d+)d(\d+)(?:([+-])(\d+))?$/;
  return diceRegex.test(notation.toLowerCase());
}

/**
 * Calculate probabilities for a dice roll
 * @param notation Dice notation to analyze
 * @returns Probability statistics
 */
export function calculateDiceProbabilities(notation: string): {
  min: number;
  max: number;
  mean: number;
  median: number;
  distribution?: Map<number, number>;
} {
  if (!isValidDiceNotation(notation)) {
    throw new DiceRollError(`Invalid dice notation: ${notation}. Expected format like "2d6+3".`);
  }
  
  const diceRegex = /^(\d+)d(\d+)(?:([+-])(\d+))?$/;
  const match = notation.toLowerCase().match(diceRegex)!;
  
  const numDice = parseInt(match[1], 10);
  const dieSize = parseInt(match[2], 10);
  const hasModifier = match[3] !== undefined;
  const modifierSign = match[3] === '+' ? 1 : -1;
  const modifierValue = hasModifier ? parseInt(match[4], 10) : 0;
  const modifier = hasModifier ? modifierSign * modifierValue : 0;
  
  // Calculate min, max, and mean
  const min = numDice + modifier; // Minimum is all 1s
  const max = numDice * dieSize + modifier; // Maximum is all max values
  const mean = numDice * ((dieSize + 1) / 2) + modifier; // Mean of a die is (sides+1)/2
  
  // For small dice pools, calculate the full distribution
  // For larger pools, this becomes computationally expensive
  let distribution: Map<number, number> | undefined;
  let median = 0;
  
  if (numDice <= 10 && dieSize <= 20) {
    distribution = calculateExactDistribution(numDice, dieSize, modifier);
    
    // Calculate median from distribution
    const sortedOutcomes = Array.from(distribution.entries())
      .sort(([a], [b]) => a - b);
    
    const totalCombinations = Array.from(distribution.values())
      .reduce((sum, count) => sum + count, 0);
    
    let cumulativeCount = 0;
    for (const [outcome, count] of sortedOutcomes) {
      cumulativeCount += count;
      if (cumulativeCount >= totalCombinations / 2) {
        median = outcome;
        break;
      }
    }
  } else {
    // For large dice pools, approximate the median as the mean
    // This is accurate for large pools due to the central limit theorem
    median = Math.round(mean);
  }
  
  return {
    min,
    max,
    mean,
    median,
    distribution
  };
}

/**
 * Calculate the exact probability distribution for a dice pool
 * @param numDice Number of dice
 * @param dieSize Number of sides per die
 * @param modifier Static modifier to add
 * @returns Map of outcomes to number of combinations
 */
function calculateExactDistribution(
  numDice: number,
  dieSize: number,
  modifier: number
): Map<number, number> {
  // Start with a single die
  let distribution = new Map<number, number>();
  
  // Initialize with a single die
  for (let i = 1; i <= dieSize; i++) {
    distribution.set(i, 1);
  }
  
  // Add additional dice
  for (let d = 1; d < numDice; d++) {
    const newDistribution = new Map<number, number>();
    
    // For each existing outcome
    for (const [outcome, count] of distribution.entries()) {
      // Add each possible roll of the new die
      for (let i = 1; i <= dieSize; i++) {
        const newOutcome = outcome + i;
        const newCount = (newDistribution.get(newOutcome) || 0) + count;
        newDistribution.set(newOutcome, newCount);
      }
    }
    
    distribution = newDistribution;
  }
  
  // Apply modifier
  if (modifier !== 0) {
    const modifiedDistribution = new Map<number, number>();
    
    for (const [outcome, count] of distribution.entries()) {
      modifiedDistribution.set(outcome + modifier, count);
    }
    
    distribution = modifiedDistribution;
  }
  
  return distribution;
} 