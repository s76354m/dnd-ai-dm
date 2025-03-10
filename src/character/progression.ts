/**
 * Character Progression System
 * 
 * Handles experience points, leveling, and character advancement
 */

import { Character, AbilityScores } from '../core/interfaces/character';
import { Class } from '../core/types';
import { EventEmitter } from 'events';
import { calculateModifier } from '../utils/ability-utils';

/**
 * Experience points required for each level
 */
export const XP_REQUIREMENTS = [
  0,      // Level 1
  300,    // Level 2
  900,    // Level 3
  2700,   // Level 4
  6500,   // Level 5
  14000,  // Level 6
  23000,  // Level 7
  34000,  // Level 8
  48000,  // Level 9
  64000,  // Level 10
  85000,  // Level 11
  100000, // Level 12
  120000, // Level 13
  140000, // Level 14
  165000, // Level 15
  195000, // Level 16
  225000, // Level 17
  265000, // Level 18
  305000, // Level 19
  355000  // Level 20
];

/**
 * Proficiency bonus by level
 */
export const PROFICIENCY_BONUS = [
  2, // Level 1
  2, // Level 2
  2, // Level 3
  2, // Level 4
  3, // Level 5
  3, // Level 6
  3, // Level 7
  3, // Level 8
  4, // Level 9
  4, // Level 10
  4, // Level 11
  4, // Level 12
  5, // Level 13
  5, // Level 14
  5, // Level 15
  5, // Level 16
  6, // Level 17
  6, // Level 18
  6, // Level 19
  6  // Level 20
];

/**
 * Class hit dice values
 */
export const CLASS_HIT_DICE: Record<Class, number> = {
  barbarian: 12,
  bard: 8,
  cleric: 8,
  druid: 8,
  fighter: 10,
  monk: 8,
  paladin: 10,
  ranger: 10,
  rogue: 8,
  sorcerer: 6,
  warlock: 8,
  wizard: 6
};

/**
 * XP award by challenge rating
 */
export const XP_BY_CR = {
  0: 10,
  0.125: 25,
  0.25: 50,
  0.5: 100,
  1: 200,
  2: 450,
  3: 700,
  4: 1100,
  5: 1800,
  6: 2300,
  7: 2900,
  8: 3900,
  9: 5000,
  10: 5900,
  11: 7200,
  12: 8400,
  13: 10000,
  14: 11500,
  15: 13000,
  16: 15000,
  17: 18000,
  18: 20000,
  19: 22000,
  20: 25000,
  21: 33000,
  22: 41000,
  23: 50000,
  24: 62000,
  25: 75000,
  26: 90000,
  27: 105000,
  28: 120000,
  29: 135000,
  30: 155000
};

/**
 * Event interfaces for character advancement
 */
export interface LevelUpEvent {
  oldLevel: number;
  newLevel: number;
  character: Character;
  newFeatures: any[];
  hitPointsGained: number;
  abilityScoreImprovements?: {
    type: 'improvement' | 'feat';
    ability?: keyof AbilityScores;
    value?: number;
    feat?: string;
  }[];
}

/**
 * XP Source types
 */
export type XPSource = 
  | 'combat' 
  | 'quest' 
  | 'exploration' 
  | 'roleplay' 
  | 'milestone' 
  | 'other';

/**
 * XP Award event
 */
export interface XPAwardEvent {
  source: XPSource;
  amount: number;
  description: string;
  timestamp: Date;
}

/**
 * Manages character progression, including experience and leveling
 */
export class ProgressionManager extends EventEmitter {
  private character: Character;
  private xpHistory: XPAwardEvent[] = [];
  
  constructor(character: Character) {
    super();
    this.character = character;
  }
  
  /**
   * Award XP to the character
   */
  public awardXP(
    amount: number,
    source: XPSource,
    description: string = ''
  ): LevelUpEvent | null {
    if (amount <= 0) return null;
    
    // Record the XP award
    const xpEvent: XPAwardEvent = {
      source,
      amount,
      description,
      timestamp: new Date()
    };
    
    this.xpHistory.push(xpEvent);
    
    // Update character's XP
    const oldXP = this.character.experiencePoints;
    const newXP = oldXP + amount;
    this.character.experiencePoints = newXP;
    
    // Check if character leveled up
    const oldLevel = this.character.level;
    const newLevel = this.determineLevel(newXP);
    
    // If no level up, return null
    if (newLevel <= oldLevel) {
      // Emit XP gained event
      this.emit('xpGained', {
        character: this.character,
        xpGained: amount,
        newTotal: newXP,
        source,
        description
      });
      return null;
    }
    
    // Handle level up
    return this.levelUp(oldLevel, newLevel);
  }
  
  /**
   * Award XP for defeating an enemy
   */
  public awardCombatXP(challengeRating: number, sharedWithParty: boolean = false): number {
    // Find the closest CR in our table
    const cr = Object.keys(XP_BY_CR)
      .map(Number)
      .sort((a, b) => Math.abs(a - challengeRating) - Math.abs(b - challengeRating))[0];
    
    // Get base XP amount
    let xpAmount = XP_BY_CR[cr as keyof typeof XP_BY_CR] || 0;
    
    // Adjust if shared with party (assuming 4-person party)
    if (sharedWithParty) {
      xpAmount = Math.floor(xpAmount / 4);
    }
    
    // Award the XP
    this.awardXP(
      xpAmount, 
      'combat', 
      `Defeated an enemy with CR ${challengeRating}`
    );
    
    return xpAmount;
  }
  
  /**
   * Award XP for completing a quest
   */
  public awardQuestXP(
    questDifficulty: 'easy' | 'medium' | 'hard' | 'challenging' | 'deadly',
    questLevel: number = this.character.level
  ): number {
    // Determine base XP by difficulty and character level
    let baseXP = 0;
    
    switch (questDifficulty) {
      case 'easy':
        baseXP = 50 * questLevel;
        break;
      case 'medium':
        baseXP = 100 * questLevel;
        break;
      case 'hard':
        baseXP = 200 * questLevel;
        break;
      case 'challenging':
        baseXP = 300 * questLevel;
        break;
      case 'deadly':
        baseXP = 500 * questLevel;
        break;
    }
    
    // Award the XP
    this.awardXP(
      baseXP, 
      'quest', 
      `Completed a ${questDifficulty} quest (level ${questLevel})`
    );
    
    return baseXP;
  }
  
  /**
   * Award XP for exploration or discovery
   */
  public awardExplorationXP(
    discoveryType: 'location' | 'secret' | 'lore' | 'treasure',
    significance: 'minor' | 'moderate' | 'major'
  ): number {
    let xpAmount = 0;
    
    // Base amount by significance
    switch (significance) {
      case 'minor':
        xpAmount = 10 * this.character.level;
        break;
      case 'moderate':
        xpAmount = 25 * this.character.level;
        break;
      case 'major':
        xpAmount = 50 * this.character.level;
        break;
    }
    
    // Modify based on discovery type
    switch (discoveryType) {
      case 'location':
        // Base XP is fine
        break;
      case 'secret':
        xpAmount = Math.floor(xpAmount * 1.2); // +20%
        break;
      case 'lore':
        xpAmount = Math.floor(xpAmount * 1.1); // +10%
        break;
      case 'treasure':
        xpAmount = Math.floor(xpAmount * 1.3); // +30%
        break;
    }
    
    // Award the XP
    this.awardXP(
      xpAmount, 
      'exploration', 
      `Discovered a ${significance} ${discoveryType}`
    );
    
    return xpAmount;
  }
  
  /**
   * Award XP for good roleplay
   */
  public awardRoleplayXP(
    quality: 'good' | 'excellent' | 'exceptional',
    impactful: boolean = false
  ): number {
    let xpAmount = 0;
    
    // Base amount by quality
    switch (quality) {
      case 'good':
        xpAmount = 10 * this.character.level;
        break;
      case 'excellent':
        xpAmount = 25 * this.character.level;
        break;
      case 'exceptional':
        xpAmount = 50 * this.character.level;
        break;
    }
    
    // Bonus for impactful roleplay
    if (impactful) {
      xpAmount = Math.floor(xpAmount * 1.5); // +50%
    }
    
    // Award the XP
    this.awardXP(
      xpAmount, 
      'roleplay', 
      `${quality} roleplay${impactful ? ' with significant impact' : ''}`
    );
    
    return xpAmount;
  }
  
  /**
   * Award a milestone level up (skips XP)
   */
  public awardMilestone(description: string = 'Story milestone reached'): LevelUpEvent | null {
    if (this.character.level >= 20) {
      return null; // Already at max level
    }
    
    const oldLevel = this.character.level;
    const newLevel = oldLevel + 1;
    
    // Set XP to minimum for new level
    this.character.experiencePoints = XP_REQUIREMENTS[newLevel - 1];
    
    // Record the milestone
    this.xpHistory.push({
      source: 'milestone',
      amount: 0, // No actual XP awarded
      description,
      timestamp: new Date()
    });
    
    // Process the level up
    return this.levelUp(oldLevel, newLevel);
  }
  
  /**
   * Handle leveling up from oldLevel to newLevel
   */
  private levelUp(oldLevel: number, newLevel: number): LevelUpEvent {
    // Track all features gained
    const newFeatures: any[] = [];
    let totalHitPointsGained = 0;
    const abilityImprovements: LevelUpEvent['abilityScoreImprovements'] = [];
    
    // Handle each level individually
    for (let level = oldLevel + 1; level <= newLevel; level++) {
      // Calculate hit points gained
      const hitPointsGained = this.calculateHitPointsForLevel(level);
      totalHitPointsGained += hitPointsGained;
      
      // Update character's hit points
      this.character.hitPoints.maximum += hitPointsGained;
      this.character.hitPoints.current += hitPointsGained;
      
      // Check for ability score improvements at appropriate levels
      // Classes typically get ASIs at levels 4, 8, 12, 16, 19
      if ([4, 8, 12, 16, 19].includes(level)) {
        abilityImprovements.push({
          type: 'improvement',
          ability: undefined, // To be chosen by the player
          value: 2 // Default +2 to one ability score
        });
      }
      
      // Get class features for this level
      const features = this.getClassFeaturesForLevel(level);
      newFeatures.push(...features);
      
      // Apply proficiency bonus update
      this.character.proficiencyBonus = PROFICIENCY_BONUS[level - 1];
    }
    
    // Update character level
    this.character.level = newLevel;
    
    // Create level up event
    const levelUpEvent: LevelUpEvent = {
      oldLevel,
      newLevel,
      character: this.character,
      newFeatures,
      hitPointsGained: totalHitPointsGained,
      abilityScoreImprovements: abilityImprovements
    };
    
    // Add new features to character
    for (const feature of newFeatures) {
      if (!this.character.classFeatures) {
        this.character.classFeatures = [];
      }
      this.character.classFeatures.push(feature);
    }
    
    // Emit the level up event
    this.emit('levelUp', levelUpEvent);
    
    return levelUpEvent;
  }
  
  /**
   * Calculate hit points gained for a specific level
   */
  private calculateHitPointsForLevel(level: number): number {
    // For the first level, use maximum hit points based on class
    if (level === 1) {
      const primaryClass = this.character.class;
      const conModifier = calculateModifier(this.character.abilityScores.constitution.score);
      return CLASS_HIT_DICE[primaryClass] + conModifier;
    }
    
    // For other levels, roll or use average
    const primaryClass = this.character.class;
    const conModifier = calculateModifier(this.character.abilityScores.constitution.score);
    const hitDie = CLASS_HIT_DICE[primaryClass];
    
    // Use average hit points (half of max + 1)
    let hpGained = Math.floor(hitDie / 2) + 1 + conModifier;
    
    // Minimum of 1 hit point gained per level
    return Math.max(1, hpGained);
  }
  
  /**
   * Get class features for a specific level
   */
  private getClassFeaturesForLevel(level: number): any[] {
    const features: any[] = [];
    const primaryClass = this.character.class;
    
    // In a full implementation, this would load features from a database or config file
    // For now, simulate with some basic features for each class at various levels
    
    // General class features by level
    switch (level) {
      case 2:
        if (primaryClass === 'fighter') {
          features.push({
            name: 'Action Surge',
            description: 'You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action.'
          });
        } else if (primaryClass === 'wizard') {
          features.push({
            name: 'Arcane Recovery',
            description: 'You have learned to regain some of your magical energy by studying your spellbook.'
          });
        }
        break;
      case 3:
        if (primaryClass === 'rogue') {
          features.push({
            name: 'Sneak Attack Improvement',
            description: 'Your Sneak Attack damage increases to 2d6.'
          });
        }
        break;
      case 5:
        if (['fighter', 'barbarian', 'paladin', 'ranger'].includes(primaryClass)) {
          features.push({
            name: 'Extra Attack',
            description: 'You can attack twice, instead of once, whenever you take the Attack action on your turn.'
          });
        }
        break;
    }
    
    return features;
  }
  
  /**
   * Determine character level based on XP
   */
  private determineLevel(xp: number): number {
    // Find the highest level the character qualifies for
    for (let level = XP_REQUIREMENTS.length - 1; level >= 0; level--) {
      if (xp >= XP_REQUIREMENTS[level]) {
        return level + 1; // +1 because array is 0-indexed
      }
    }
    return 1; // Default to level 1
  }
  
  /**
   * Get the XP required for the next level
   */
  public getXPRequiredForNextLevel(): number {
    if (this.character.level >= 20) {
      return Infinity; // Max level reached
    }
    
    return XP_REQUIREMENTS[this.character.level];
  }
  
  /**
   * Get XP progress as a percentage towards next level
   */
  public getXPProgressPercentage(): number {
    if (this.character.level >= 20) {
      return 100;
    }
    
    const currentLevelXP = XP_REQUIREMENTS[this.character.level - 1];
    const nextLevelXP = XP_REQUIREMENTS[this.character.level];
    const characterXP = this.character.experiencePoints;
    
    const xpForCurrentLevel = characterXP - currentLevelXP;
    const xpRequiredForNextLevel = nextLevelXP - currentLevelXP;
    
    return Math.floor((xpForCurrentLevel / xpRequiredForNextLevel) * 100);
  }
  
  /**
   * Get summary of experience history
   */
  public getXPHistory(): XPAwardEvent[] {
    return [...this.xpHistory];
  }
  
  /**
   * Get total XP earned from a specific source
   */
  public getTotalXPBySource(source: XPSource): number {
    return this.xpHistory
      .filter(event => event.source === source)
      .reduce((total, event) => total + event.amount, 0);
  }
}

// Create a singleton for global access
export const characterProgressionManager = {
  createProgressionForCharacter(character: Character): ProgressionManager {
    return new ProgressionManager(character);
  }
};

export default characterProgressionManager; 