/**
 * Response Validator
 * 
 * Validates AI-generated responses to ensure they are consistent, 
 * appropriate, and valid for the game world.
 */

import { GameState } from '../../core/interfaces/game';

/**
 * Result of validating an AI response
 */
export interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: ValidationIssue[];
  suggestions: string[];
}

/**
 * Represents a specific issue with an AI response
 */
export interface ValidationIssue {
  type: ValidationIssueType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  span?: {
    start: number;
    end: number;
  };
}

/**
 * Types of validation issues that can be detected
 */
export type ValidationIssueType = 
  | 'inconsistency'
  | 'inappropriate_content'
  | 'rule_violation'
  | 'world_mismatch'
  | 'narrative_break'
  | 'factual_error'
  | 'character_mismatch'
  | 'completeness';

/**
 * Options for response validation
 */
export interface ValidationOptions {
  checkInconsistencies: boolean;
  checkRules: boolean;
  checkWorldConsistency: boolean;
  checkNarrativeTone: boolean;
  checkFactualAccuracy: boolean;
  checkCharacterConsistency: boolean;
  checkCompleteness: boolean;
  strictnessLevel: 'low' | 'medium' | 'high';
}

/**
 * Default validation options
 */
export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  checkInconsistencies: true,
  checkRules: true,
  checkWorldConsistency: true,
  checkNarrativeTone: true,
  checkFactualAccuracy: true,
  checkCharacterConsistency: true,
  checkCompleteness: true,
  strictnessLevel: 'medium'
};

/**
 * Service for validating AI-generated responses
 */
export class ResponseValidator {
  private options: ValidationOptions;
  
  constructor(options: Partial<ValidationOptions> = {}) {
    this.options = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
  }
  
  /**
   * Validate an AI-generated response for a specific component
   * 
   * @param response The AI-generated response to validate
   * @param context The context used to generate the response
   * @param gameState The current game state
   * @param component The component that generated the response
   * @returns A validation result
   */
  public validate(
    response: string,
    context: string,
    gameState: GameState,
    component: string
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];
    
    // Run enabled validation checks
    if (this.options.checkInconsistencies) {
      this.checkForInconsistencies(response, context, issues, suggestions);
    }
    
    if (this.options.checkRules) {
      this.checkForRuleViolations(response, gameState, component, issues, suggestions);
    }
    
    if (this.options.checkWorldConsistency) {
      this.checkForWorldInconsistencies(response, gameState, issues, suggestions);
    }
    
    if (this.options.checkNarrativeTone) {
      this.checkNarrativeTone(response, component, issues, suggestions);
    }
    
    if (this.options.checkFactualAccuracy) {
      this.checkFactualAccuracy(response, gameState, issues, suggestions);
    }
    
    if (this.options.checkCharacterConsistency) {
      this.checkCharacterConsistency(response, gameState, issues, suggestions);
    }
    
    if (this.options.checkCompleteness) {
      this.checkCompleteness(response, issues, suggestions);
    }
    
    // Calculate validation score
    const score = this.calculateValidationScore(issues);
    
    // Determine if the response is valid based on strictness level
    const isValid = this.isResponseValid(score, issues);
    
    return {
      isValid,
      score,
      issues,
      suggestions
    };
  }
  
  /**
   * Check for inconsistencies between the response and context
   */
  private checkForInconsistencies(
    response: string,
    context: string,
    issues: ValidationIssue[],
    suggestions: string[]
  ): void {
    // Simple keyword-based inconsistency check
    // In a full implementation, this would use more sophisticated techniques
    const contextKeywords = this.extractKeywords(context);
    const responseKeywords = this.extractKeywords(response);
    
    // Find contradictions (simplistic approach)
    const contradictions = this.findContradictions(context, response);
    
    for (const contradiction of contradictions) {
      issues.push({
        type: 'inconsistency',
        severity: 'medium',
        description: `Possible contradiction: "${contradiction}"`
      });
      
      suggestions.push(`Check for consistency with the provided context regarding "${contradiction}"`);
    }
  }
  
  /**
   * Check for D&D rule violations
   */
  private checkForRuleViolations(
    response: string,
    gameState: GameState,
    component: string,
    issues: ValidationIssue[],
    suggestions: string[]
  ): void {
    // Check for common rule violations based on component
    if (component === 'combat') {
      this.checkCombatRules(response, gameState, issues, suggestions);
    } else if (component === 'dm') {
      this.checkGeneralRules(response, gameState, issues, suggestions);
    }
  }
  
  /**
   * Check for combat rule violations
   */
  private checkCombatRules(
    response: string,
    gameState: GameState,
    issues: ValidationIssue[],
    suggestions: string[]
  ): void {
    // Check for action economy issues (simplified example)
    if (response.includes('attacks twice') && !response.includes('Extra Attack')) {
      issues.push({
        type: 'rule_violation',
        severity: 'medium',
        description: 'Multiple attacks mentioned without Extra Attack feature'
      });
      
      suggestions.push('Verify the character has Extra Attack or modify to a single attack');
    }
  }
  
  /**
   * Check for general rule violations
   */
  private checkGeneralRules(
    response: string,
    gameState: GameState,
    issues: ValidationIssue[],
    suggestions: string[]
  ): void {
    // Simplified check for skill/ability inconsistencies
    const matches = response.match(/roll a ([A-Za-z]+) check/g);
    if (matches) {
      for (const match of matches) {
        const skill = match.replace('roll a ', '').replace(' check', '').toLowerCase();
        
        // Verify this is a valid D&D skill or ability
        if (!this.isValidSkillOrAbility(skill)) {
          issues.push({
            type: 'rule_violation',
            severity: 'low',
            description: `Invalid skill or ability check: ${skill}`
          });
          
          suggestions.push(`Replace "${skill}" with a standard D&D skill or ability check`);
        }
      }
    }
  }
  
  /**
   * Check for world inconsistencies
   */
  private checkForWorldInconsistencies(
    response: string,
    gameState: GameState,
    issues: ValidationIssue[],
    suggestions: string[]
  ): void {
    // Check for location inconsistencies
    const currentLocation = gameState.currentLocation;
    
    // Check if the response references a location that doesn't exist
    // This is a simplified implementation
    const locationMatches = response.match(/in the ([A-Za-z\s]+)/g);
    if (locationMatches) {
      for (const match of locationMatches) {
        const location = match.replace('in the ', '').trim().toLowerCase();
        
        // Skip if it's the current location
        if (location === currentLocation.name.toLowerCase()) continue;
        
        // Skip common phrases
        if (['area', 'region', 'vicinity', 'distance', 'background'].includes(location)) continue;
        
        // Check if this location exists in known locations
        const locationExists = this.locationExistsInWorld(location, gameState);
        
        if (!locationExists) {
          issues.push({
            type: 'world_mismatch',
            severity: 'low',
            description: `Referenced unknown location: ${location}`
          });
          
          suggestions.push(`Check if "${location}" is an established location in the game world`);
        }
      }
    }
  }
  
  /**
   * Check narrative tone consistency
   */
  private checkNarrativeTone(
    response: string,
    component: string,
    issues: ValidationIssue[],
    suggestions: string[]
  ): void {
    // Check for narrative perspective issues
    if (component === 'dm' && response.includes('I think') || response.includes('In my opinion')) {
      issues.push({
        type: 'narrative_break',
        severity: 'low',
        description: 'DM response includes first-person perspective'
      });
      
      suggestions.push('Remove first-person language to maintain narrative immersion');
    }
    
    // Check for meta-references
    if (response.includes('player') || response.includes('roll dice') || response.includes('game master')) {
      issues.push({
        type: 'narrative_break',
        severity: 'medium',
        description: 'Response contains meta-references to game mechanics'
      });
      
      suggestions.push('Rephrase to avoid breaking immersion with meta-references');
    }
  }
  
  /**
   * Check factual accuracy
   */
  private checkFactualAccuracy(
    response: string,
    gameState: GameState,
    issues: ValidationIssue[],
    suggestions: string[]
  ): void {
    // Check NPC names
    const npcMatches = response.match(/([A-Z][a-z]+) (?:says|responds|answers|asks|replies)/g);
    if (npcMatches) {
      for (const match of npcMatches) {
        const npcName = match.split(' ')[0];
        
        // Check if this NPC exists
        const npcExists = this.npcExistsInWorld(npcName, gameState);
        
        if (!npcExists) {
          issues.push({
            type: 'factual_error',
            severity: 'medium',
            description: `Referenced unknown NPC: ${npcName}`
          });
          
          suggestions.push(`Check if "${npcName}" is an established NPC in the game world`);
        }
      }
    }
  }
  
  /**
   * Check character consistency
   */
  private checkCharacterConsistency(
    response: string,
    gameState: GameState,
    issues: ValidationIssue[],
    suggestions: string[]
  ): void {
    const playerCharacter = gameState.player;
    
    // Check for class ability inconsistencies
    const classAbilities = this.getClassAbilities(playerCharacter.class[0].name);
    const mentionedAbilities = this.extractAbilities(response);
    
    for (const ability of mentionedAbilities) {
      if (!classAbilities.includes(ability)) {
        issues.push({
          type: 'character_mismatch',
          severity: 'medium',
          description: `Mentioned ability "${ability}" not available to ${playerCharacter.class[0].name}`
        });
        
        suggestions.push(`Check if "${ability}" is available to the character's class and level`);
      }
    }
  }
  
  /**
   * Check response completeness
   */
  private checkCompleteness(
    response: string,
    issues: ValidationIssue[],
    suggestions: string[]
  ): void {
    // Check for incomplete sentences
    if (response.endsWith('...') || response.endsWith(',')) {
      issues.push({
        type: 'completeness',
        severity: 'high',
        description: 'Response ends abruptly'
      });
      
      suggestions.push('Complete the response without trailing ellipses or commas');
    }
    
    // Check for very short responses
    if (response.split(' ').length < 10) {
      issues.push({
        type: 'completeness',
        severity: 'medium',
        description: 'Response is very brief'
      });
      
      suggestions.push('Expand the response with more detail and description');
    }
  }
  
  /**
   * Calculate a validation score based on issues
   */
  private calculateValidationScore(issues: ValidationIssue[]): number {
    // Start with a perfect score
    let score = 100;
    
    // Deduct points based on severity
    for (const issue of issues) {
      switch (issue.severity) {
        case 'low':
          score -= 5;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'high':
          score -= 20;
          break;
      }
    }
    
    // Ensure score doesn't go below 0
    return Math.max(0, score);
  }
  
  /**
   * Determine if a response is valid based on the score and strictness level
   */
  private isResponseValid(score: number, issues: ValidationIssue[]): boolean {
    // Check for any high severity issues
    const hasHighSeverityIssues = issues.some(issue => issue.severity === 'high');
    
    // Set threshold based on strictness
    let threshold = 0;
    switch (this.options.strictnessLevel) {
      case 'low':
        threshold = 60;
        break;
      case 'medium':
        threshold = 75;
        break;
      case 'high':
        threshold = 90;
        break;
    }
    
    // Always fail if high severity issues and strictness is medium or high
    if (hasHighSeverityIssues && this.options.strictnessLevel !== 'low') {
      return false;
    }
    
    return score >= threshold;
  }
  
  /**
   * Get the validation options
   */
  public getOptions(): ValidationOptions {
    return { ...this.options };
  }
  
  /**
   * Update the validation options
   */
  public updateOptions(options: Partial<ValidationOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /* Helper methods for validation checks */
  
  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple implementation to extract nouns and proper nouns
    // In a real implementation, this would use NLP techniques
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    return Array.from(new Set(words));
  }
  
  /**
   * Find contradictions between context and response
   */
  private findContradictions(context: string, response: string): string[] {
    // Simplified contradiction detection
    // In a real implementation, this would use more sophisticated techniques
    const contradictions: string[] = [];
    
    // Check for negation patterns (very simplistic)
    const contextLines = context.split('\n');
    const responseLines = response.split('\n');
    
    for (const contextLine of contextLines) {
      if (contextLine.includes(':')) {
        const [key, value] = contextLine.split(':').map(s => s.trim());
        
        if (!key || !value) continue;
        
        // Check if the response contradicts this key-value pair
        for (const responseLine of responseLines) {
          if (responseLine.includes(key) && responseLine.includes('not ' + value)) {
            contradictions.push(key);
          }
        }
      }
    }
    
    return contradictions;
  }
  
  /**
   * Check if a skill or ability is valid in D&D 5e
   */
  private isValidSkillOrAbility(skill: string): boolean {
    const validSkills = [
      'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
      'acrobatics', 'animal handling', 'arcana', 'athletics', 'deception', 'history',
      'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
      'performance', 'persuasion', 'religion', 'sleight of hand', 'stealth', 'survival'
    ];
    
    return validSkills.includes(skill.toLowerCase());
  }
  
  /**
   * Check if a location exists in the game world
   */
  private locationExistsInWorld(location: string, gameState: GameState): boolean {
    // Simple implementation - in a real game, this would check a world database
    if (gameState.currentLocation.name.toLowerCase() === location) return true;
    
    if (gameState.currentLocation.connections) {
      const connections = Array.from(gameState.currentLocation.connections.values());
      return connections.some(conn => conn.toLowerCase().includes(location));
    }
    
    return false;
  }
  
  /**
   * Check if an NPC exists in the game world
   */
  private npcExistsInWorld(npcName: string, gameState: GameState): boolean {
    // Check if the NPC exists in the current location or is known globally
    return Array.from(gameState.npcs.values()).some(npc => 
      npc.name.toLowerCase() === npcName.toLowerCase()
    );
  }
  
  /**
   * Get available abilities for a class
   */
  private getClassAbilities(className: string): string[] {
    // This is a simplified implementation
    // In a real implementation, this would use a database of class abilities
    const abilities: Record<string, string[]> = {
      'fighter': ['second wind', 'action surge', 'martial archetype'],
      'wizard': ['arcane recovery', 'spellcasting', 'arcane tradition'],
      'cleric': ['spellcasting', 'divine domain', 'channel divinity', 'turn undead'],
      'rogue': ['sneak attack', 'thieves\' cant', 'cunning action', 'uncanny dodge'],
      'bard': ['spellcasting', 'bardic inspiration', 'jack of all trades', 'song of rest'],
      'druid': ['spellcasting', 'wild shape', 'druid circle'],
      'barbarian': ['rage', 'unarmored defense', 'reckless attack', 'danger sense'],
      'monk': ['unarmored defense', 'martial arts', 'ki', 'flurry of blows', 'patient defense'],
      'paladin': ['divine sense', 'lay on hands', 'spellcasting', 'divine smite'],
      'ranger': ['favored enemy', 'natural explorer', 'spellcasting', 'ranger archetype'],
      'sorcerer': ['spellcasting', 'sorcerous origin', 'font of magic', 'metamagic'],
      'warlock': ['otherworldly patron', 'pact magic', 'eldritch invocations', 'pact boon']
    };
    
    return abilities[className.toLowerCase()] || [];
  }
  
  /**
   * Extract abilities mentioned in text
   */
  private extractAbilities(text: string): string[] {
    // This is a simplified implementation
    // In a real implementation, this would use more sophisticated text analysis
    const classAbilities = [
      'second wind', 'action surge', 'martial archetype',
      'arcane recovery', 'spellcasting', 'arcane tradition',
      'divine domain', 'channel divinity', 'turn undead',
      'sneak attack', 'thieves\' cant', 'cunning action', 'uncanny dodge',
      'bardic inspiration', 'jack of all trades', 'song of rest',
      'wild shape', 'druid circle',
      'rage', 'unarmored defense', 'reckless attack', 'danger sense',
      'martial arts', 'ki', 'flurry of blows', 'patient defense',
      'divine sense', 'lay on hands', 'divine smite',
      'favored enemy', 'natural explorer', 'ranger archetype',
      'sorcerous origin', 'font of magic', 'metamagic',
      'otherworldly patron', 'pact magic', 'eldritch invocations', 'pact boon'
    ];
    
    const mentioned: string[] = [];
    
    for (const ability of classAbilities) {
      if (text.toLowerCase().includes(ability)) {
        mentioned.push(ability);
      }
    }
    
    return mentioned;
  }
}

export default ResponseValidator; 