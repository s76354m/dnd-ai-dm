// src/character/creation/ability-scores.ts

import { AbilityScores } from '../../core/interfaces';
import { Ability } from '../../core/types/index';

export type GenerationMethod = 'standard' | 'pointbuy' | 'roll';

export interface AbilityScoreModifiers {
  racial: Partial<AbilityScores>;
  background?: Partial<AbilityScores>;
  feats?: Partial<AbilityScores>;
}

export class AbilityScoreGenerator {
  private static readonly STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
  private static readonly POINT_BUY_COSTS = {
    8: 0,
    9: 1,
    10: 2,
    11: 3,
    12: 4,
    13: 5,
    14: 7,
    15: 9
  };
  private static readonly TOTAL_POINTS = 27;

  /**
   * Generate ability scores using the specified method
   */
  public static async generateScores(
    method: GenerationMethod,
    modifiers: AbilityScoreModifiers
  ): Promise<AbilityScores> {
    let baseScores: AbilityScores;

    switch (method) {
      case 'standard':
        baseScores = await this.generateStandardArray();
        break;
      case 'pointbuy':
        baseScores = await this.generatePointBuy();
        break;
      case 'roll':
        baseScores = await this.generateRolled();
        break;
      default:
        throw new Error(`Unknown generation method: ${method}`);
    }

    return this.applyModifiers(baseScores, modifiers);
  }

  /**
   * Generate scores using the standard array
   */
  private static async generateStandardArray(): Promise<AbilityScores> {
    return {
      strength: this.STANDARD_ARRAY[0],
      dexterity: this.STANDARD_ARRAY[1],
      constitution: this.STANDARD_ARRAY[2],
      intelligence: this.STANDARD_ARRAY[3],
      wisdom: this.STANDARD_ARRAY[4],
      charisma: this.STANDARD_ARRAY[5]
    };
  }

  /**
   * Generate scores using point buy
   */
  private static async generatePointBuy(): Promise<AbilityScores> {
    // Implement point buy logic
    // This will be connected to the UI for user input
    return {
      strength: 8,
      dexterity: 8,
      constitution: 8,
      intelligence: 8,
      wisdom: 8,
      charisma: 8
    };
  }

  /**
   * Generate scores by rolling dice
   */
  private static async generateRolled(): Promise<AbilityScores> {
    const scores = {
      strength: this.rollAbilityScore(),
      dexterity: this.rollAbilityScore(),
      constitution: this.rollAbilityScore(),
      intelligence: this.rollAbilityScore(),
      wisdom: this.rollAbilityScore(),
      charisma: this.rollAbilityScore()
    };

    return scores;
  }

  /**
   * Roll a single ability score (4d6 drop lowest)
   */
  private static rollAbilityScore(): number {
    const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    rolls.sort((a, b) => b - a);
    return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
  }

  /**
   * Apply racial and other modifiers to base scores
   */
  private static applyModifiers(
    baseScores: AbilityScores,
    modifiers: AbilityScoreModifiers
  ): AbilityScores {
    const result = { ...baseScores };
    const allModifiers = [
      modifiers.racial,
      modifiers.background || {},
      modifiers.feats || {}
    ];

    for (const modifier of allModifiers) {
      for (const [ability, value] of Object.entries(modifier)) {
        result[ability as keyof AbilityScores] += value;
      }
    }

    return result;
  }

  /**
   * Calculate ability score modifier
   */
  public static getModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  /**
   * Validate ability scores
   */
  public static validateScores(scores: AbilityScores): boolean {
    // Check if all scores are within valid range (1-20 for level 1)
    return Object.values(scores).every(score => score >= 1 && score <= 20);
  }

  /**
   * Calculate point buy cost for a score
   */
  public static getPointBuyCost(score: number): number {
    return this.POINT_BUY_COSTS[score as keyof typeof this.POINT_BUY_COSTS] || 0;
  }

  /**
   * Calculate total point buy cost for a set of scores
   */
  public static calculateTotalCost(scores: AbilityScores): number {
    return Object.values(scores).reduce(
      (total, score) => total + this.getPointBuyCost(score),
      0
    );
  }

  /**
   * Check if point buy scores are valid
   */
  public static validatePointBuy(scores: AbilityScores): boolean {
    const totalCost = this.calculateTotalCost(scores);
    const validScores = Object.values(scores).every(
      score => score >= 8 && score <= 15
    );
    return totalCost <= this.TOTAL_POINTS && validScores;
  }
}