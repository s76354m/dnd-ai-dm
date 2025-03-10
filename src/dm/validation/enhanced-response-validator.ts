/**
 * Enhanced Response Validator for DnD AI DM
 * 
 * Provides comprehensive validation for AI-generated responses to ensure
 * consistency, accuracy, and high quality across different game aspects.
 */

import { GameState } from '../../core/interfaces/game';
import { PromptComponent } from '../prompts/advanced-prompt-templates';

/**
 * Severity levels for validation issues
 */
export enum IssueSeverity {
  Critical = 'critical',       // Must be fixed before displaying to user
  High = 'high',               // Should be fixed if possible
  Medium = 'medium',           // Recommended to fix
  Low = 'low',                 // Minor issues that could be improved
  Info = 'info'                // Informational only
}

/**
 * Types of validation issues
 */
export enum ValidationIssueType {
  WorldInconsistency = 'world_inconsistency',         // Contradicts established world facts
  CharacterInconsistency = 'character_inconsistency',  // Contradicts character traits/abilities
  RuleViolation = 'rule_violation',                   // Violates D&D game rules
  NarrativeQuality = 'narrative_quality',             // Poor narrative quality
  FactualError = 'factual_error',                     // Contains incorrect D&D facts
  InappropriateContent = 'inappropriate_content',     // Contains inappropriate content
  StyleViolation = 'style_violation',                 // Doesn't match requested style
  ToneIssue = 'tone_issue',                           // Inconsistent tone
  ResponseFormat = 'response_format',                 // Formatting issues
  ContextError = 'context_error',                     // Missing or misinterpreting context
  LogicalFlaw = 'logical_flaw',                       // Contains logical flaws
  MechanicalError = 'mechanical_error'                // Incorrect game mechanics
}

/**
 * Describes a specific validation issue
 */
export interface ValidationIssue {
  type: ValidationIssueType;
  severity: IssueSeverity;
  description: string;
  problematicText?: string;
  suggestedFix?: string;
  ruleReference?: string;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  isValid: boolean;
  score: number;  // 0-100 quality score
  issues: ValidationIssue[];
  suggestedImprovements: string[];
  component: PromptComponent;
}

/**
 * Options for validation
 */
export interface ValidationOptions {
  worldConsistencyCheck: boolean;
  characterConsistencyCheck: boolean;
  ruleAccuracyCheck: boolean;
  narrativeQualityCheck: boolean;
  toneCheck: boolean;
  minValidationScore: number;
  maxIssues?: number;
  maxCriticalIssues?: number;
  criticalIssueTypes?: ValidationIssueType[];
}

/**
 * Default validation options
 */
export const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  worldConsistencyCheck: true,
  characterConsistencyCheck: true,
  ruleAccuracyCheck: true,
  narrativeQualityCheck: true,
  toneCheck: true,
  minValidationScore: 70,
  maxIssues: 5,
  maxCriticalIssues: 0,
  criticalIssueTypes: [
    ValidationIssueType.WorldInconsistency,
    ValidationIssueType.RuleViolation,
    ValidationIssueType.InappropriateContent
  ]
};

/**
 * Enhanced Response Validator
 * 
 * Validates AI-generated responses for quality, consistency, and rule accuracy
 */
export class EnhancedResponseValidator {
  private options: ValidationOptions;
  private gameState?: GameState;
  private worldFacts: Map<string, string> = new Map();
  private characterTraits: Map<string, string[]> = new Map();
  private dndRuleReferences: Map<string, string> = new Map();
  
  constructor(options: Partial<ValidationOptions> = {}) {
    this.options = { ...DEFAULT_VALIDATION_OPTIONS, ...options };
    this.initializeRuleReferences();
  }
  
  /**
   * Initialize D&D rule references
   */
  private initializeRuleReferences(): void {
    // Initialize with common rules that are frequently relevant
    this.dndRuleReferences.set('ability_checks', 'Ability checks use d20 + ability modifier + proficiency if applicable');
    this.dndRuleReferences.set('attack_rolls', 'Attack rolls are d20 + ability modifier + proficiency if applicable');
    this.dndRuleReferences.set('saving_throws', 'Saving throws are d20 + ability modifier + proficiency if applicable');
    this.dndRuleReferences.set('spell_save_dc', 'Spell save DC = 8 + proficiency bonus + spellcasting ability modifier');
    this.dndRuleReferences.set('advantage', 'Advantage: roll 2d20 and take the higher result');
    this.dndRuleReferences.set('disadvantage', 'Disadvantage: roll 2d20 and take the lower result');
    this.dndRuleReferences.set('critical_hit', 'Critical hit on natural 20, double the damage dice');
    this.dndRuleReferences.set('death_saves', 'Death saves: 3 successes to stabilize, 3 failures to die');
    this.dndRuleReferences.set('conditions', 'Conditions have specific mechanical effects defined in the PHB');
    this.dndRuleReferences.set('concentration', 'Concentration requires a Constitution save when taking damage (DC = 10 or half damage, whichever is higher)');
  }
  
  /**
   * Set the current game state for contextual validation
   * 
   * @param gameState Current game state
   */
  public setGameState(gameState: GameState): void {
    this.gameState = gameState;
    this.updateWorldFacts(gameState);
    this.updateCharacterTraits(gameState);
  }
  
  /**
   * Add a world fact for consistency checking
   * 
   * @param key Fact identifier
   * @param fact Fact description
   */
  public addWorldFact(key: string, fact: string): void {
    this.worldFacts.set(key, fact);
  }
  
  /**
   * Remove a world fact
   * 
   * @param key Fact identifier
   */
  public removeWorldFact(key: string): void {
    this.worldFacts.delete(key);
  }
  
  /**
   * Add character trait for consistency checking
   * 
   * @param characterName Character name
   * @param trait Character trait
   */
  public addCharacterTrait(characterName: string, trait: string): void {
    if (!this.characterTraits.has(characterName)) {
      this.characterTraits.set(characterName, []);
    }
    
    this.characterTraits.get(characterName)?.push(trait);
  }
  
  /**
   * Update options
   * 
   * @param options New options
   */
  public updateOptions(options: Partial<ValidationOptions>): void {
    this.options = { ...this.options, ...options };
  }
  
  /**
   * Main validation method
   * 
   * @param response AI-generated response to validate
   * @param component Type of response (narrative, combat, etc.)
   * @param context Original context that was provided to the AI
   * @returns Validation result
   */
  public validate(
    response: string,
    component: PromptComponent,
    context: string
  ): ValidationResult {
    const issues: ValidationIssue[] = [];
    const improvements: string[] = [];
    
    // Run enabled validation checks
    if (this.options.worldConsistencyCheck) {
      issues.push(...this.checkWorldConsistency(response, context));
    }
    
    if (this.options.characterConsistencyCheck) {
      issues.push(...this.checkCharacterConsistency(response));
    }
    
    if (this.options.ruleAccuracyCheck) {
      issues.push(...this.checkRuleAccuracy(response, component));
    }
    
    if (this.options.narrativeQualityCheck) {
      const qualityResult = this.checkNarrativeQuality(response, component);
      issues.push(...qualityResult.issues);
      improvements.push(...qualityResult.improvements);
    }
    
    if (this.options.toneCheck) {
      issues.push(...this.checkTone(response, context));
    }
    
    // Calculate overall score
    const score = this.calculateQualityScore(issues, response);
    
    // Determine if response is valid based on criteria
    const isValid = this.isResponseValid(issues, score);
    
    return {
      isValid,
      score,
      issues,
      suggestedImprovements: improvements,
      component
    };
  }
  
  /**
   * Check for world consistency issues
   * 
   * @param response Response to check
   * @param context Original context
   * @returns Identified issues
   */
  private checkWorldConsistency(response: string, context: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check against stored world facts
    this.worldFacts.forEach((fact, key) => {
      // This is a simplified implementation
      // A real implementation would use more sophisticated NLP techniques
      
      // For example, if a fact states "The king of Neverwinter is Lord Neverember"
      // and the response mentions "King Nasher of Neverwinter", that's an inconsistency
      
      // For demo purposes, we'll just do simple keyword checking
      if (fact.includes('is') || fact.includes('are')) {
        const factParts = fact.split(/\s+is\s+|\s+are\s+/);
        if (factParts.length === 2) {
          const [subject, attribute] = factParts;
          
          // Check if response mentions subject but associates it with different attribute
          // This is highly simplified and would need more sophisticated checking
          if (response.includes(subject) && 
              !response.includes(attribute) && 
              response.match(new RegExp(`${subject}\\s+is\\s+\\w+`))) {
            issues.push({
              type: ValidationIssueType.WorldInconsistency,
              severity: IssueSeverity.High,
              description: `Response may contradict known fact: "${fact}"`,
              problematicText: response.match(new RegExp(`${subject}\\s+is\\s+[^.!?]+`))?.[0],
              suggestedFix: `Ensure consistency with the fact that ${fact}`
            });
          }
        }
      }
    });
    
    return issues;
  }
  
  /**
   * Check for character consistency issues
   * 
   * @param response Response to check
   * @returns Identified issues
   */
  private checkCharacterConsistency(response: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    this.characterTraits.forEach((traits, characterName) => {
      // Check if character is mentioned in response
      if (response.includes(characterName)) {
        // Check for trait inconsistencies
        // Again, this is simplified and would need more sophisticated checking
        traits.forEach(trait => {
          // If trait is "brave" check for mentions of character being cowardly
          // If trait is "intelligent" check for mentions of character being stupid
          // etc.
          
          const opposites: Record<string, string[]> = {
            'brave': ['coward', 'cowardly', 'fearful', 'afraid'],
            'intelligent': ['stupid', 'dumb', 'foolish', 'idiotic'],
            'loyal': ['traitor', 'traitorous', 'disloyal', 'unfaithful'],
            'honest': ['liar', 'dishonest', 'deceptive', 'deceitful']
          };
          
          const oppositesForTrait = opposites[trait.toLowerCase()];
          if (oppositesForTrait) {
            for (const opposite of oppositesForTrait) {
              const pattern = new RegExp(`${characterName}[^.!?]*\\b${opposite}\\b`, 'i');
              const match = response.match(pattern);
              
              if (match) {
                issues.push({
                  type: ValidationIssueType.CharacterInconsistency,
                  severity: IssueSeverity.Medium,
                  description: `Response describes ${characterName} as "${opposite}" which contradicts known trait "${trait}"`,
                  problematicText: match[0],
                  suggestedFix: `Adjust description to align with ${characterName}'s established trait: ${trait}`
                });
              }
            }
          }
        });
      }
    });
    
    return issues;
  }
  
  /**
   * Check for rule accuracy issues
   * 
   * @param response Response to check
   * @param component Component type
   * @returns Identified issues
   */
  private checkRuleAccuracy(response: string, component: PromptComponent): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // This would be a complex implementation in practice
    // For demo purposes, we'll check for common rule errors
    
    // Check for ability score range errors (D&D ability scores are 1-30, usually 1-20)
    const abilityScorePattern = /\b(strength|dexterity|constitution|intelligence|wisdom|charisma) (?:score|modifier)? of (\d+)\b/gi;
    let match;
    
    while ((match = abilityScorePattern.exec(response)) !== null) {
      const scoreValue = parseInt(match[2]);
      if (scoreValue > 30) {
        issues.push({
          type: ValidationIssueType.RuleViolation,
          severity: IssueSeverity.High,
          description: `Invalid ability score value: ${scoreValue} is beyond the maximum of 30`,
          problematicText: match[0],
          suggestedFix: `Adjust the ${match[1]} score to be within the valid range (1-30)`,
          ruleReference: 'Ability scores in D&D 5e range from 1-30, with 20 being the usual maximum for player characters'
        });
      }
    }
    
    // Check for incorrect dice notation
    const invalidDicePattern = /\b([d]\d+|d0|d1|d[3-9][0-9]+)\b/g;
    const invalidDiceMatches = response.match(invalidDicePattern);
    
    if (invalidDiceMatches) {
      invalidDiceMatches.forEach(match => {
        issues.push({
          type: ValidationIssueType.RuleViolation,
          severity: IssueSeverity.Medium,
          description: `Invalid dice notation: ${match}`,
          problematicText: match,
          suggestedFix: 'Use standard D&D dice notation (d4, d6, d8, d10, d12, d20, d100)',
          ruleReference: 'D&D uses specific dice denominations: d4, d6, d8, d10, d12, d20, and d100 (or percentile dice)'
        });
      });
    }
    
    // Check for specific component-based rules
    if (component === 'combat') {
      // Check for incorrect action economy
      const multipleActionPattern = /\btakes? (two|three|four|multiple) actions\b/i;
      const multipleActionMatch = response.match(multipleActionPattern);
      
      if (multipleActionMatch) {
        issues.push({
          type: ValidationIssueType.RuleViolation,
          severity: IssueSeverity.Medium,
          description: 'Incorrect action economy: Characters typically get one action per turn',
          problematicText: multipleActionMatch[0],
          suggestedFix: 'Adjust to reflect standard action economy (action, bonus action, reaction, movement)',
          ruleReference: 'On their turn, a character gets one action, one bonus action (if available), movement, and potentially one reaction per round'
        });
      }
    } else if (component === 'spell') {
      // Check for incorrect spell level effects
      const spellLevelPattern = /level (\d+) (fireball|magic missile|cure wounds)/i;
      const spellLevelMatch = response.match(spellLevelPattern);
      
      if (spellLevelMatch) {
        const level = parseInt(spellLevelMatch[1]);
        const spell = spellLevelMatch[2].toLowerCase();
        
        // Check if spell level is valid for the named spell
        if ((spell === 'fireball' && level < 3) || 
            (spell === 'magic missile' && level < 1) || 
            (spell === 'cure wounds' && level < 1)) {
          issues.push({
            type: ValidationIssueType.RuleViolation,
            severity: IssueSeverity.High,
            description: `Incorrect spell level: ${spell} cannot be cast at level ${level}`,
            problematicText: spellLevelMatch[0],
            suggestedFix: `Adjust the spell level to be valid for ${spell}`,
            ruleReference: `${spell} is a ${spell === 'fireball' ? '3rd' : '1st'}-level spell and cannot be cast at lower levels`
          });
        }
      }
    }
    
    return issues;
  }
  
  /**
   * Check narrative quality
   * 
   * @param response Response to check
   * @param component Component type
   * @returns Quality issues and improvement suggestions
   */
  private checkNarrativeQuality(
    response: string, 
    component: PromptComponent
  ): { issues: ValidationIssue[], improvements: string[] } {
    const issues: ValidationIssue[] = [];
    const improvements: string[] = [];
    
    // Check for repetitive language
    const paragraphs = response.split(/\n+/);
    const sentenceStarters = new Map<string, number>();
    
    paragraphs.forEach(paragraph => {
      const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      sentences.forEach(sentence => {
        const firstWord = sentence.trim().split(/\s+/)[0].toLowerCase();
        if (firstWord && firstWord.length > 1) {
          sentenceStarters.set(firstWord, (sentenceStarters.get(firstWord) || 0) + 1);
        }
      });
    });
    
    // Look for overused sentence starters
    sentenceStarters.forEach((count, word) => {
      if (count >= 3 && paragraphs.length > 1) {
        issues.push({
          type: ValidationIssueType.NarrativeQuality,
          severity: IssueSeverity.Low,
          description: `Repetitive sentence structure: "${word}" begins ${count} sentences`,
          suggestedFix: 'Vary sentence structure for more engaging narrative flow'
        });
        
        improvements.push(`Consider using more varied sentence starters than "${word}"`);
      }
    });
    
    // Check for passive voice overuse (simplified check)
    const passiveVoicePatterns = [
      /\bwas (made|done|created|formed|built|written|spoken|broken|taken)\b/gi,
      /\bwere (made|done|created|formed|built|written|spoken|broken|taken)\b/gi,
      /\bis (made|done|created|formed|built|written|spoken|broken|taken)\b/gi,
      /\bare (made|done|created|formed|built|written|spoken|broken|taken)\b/gi,
      /\bhas been (made|done|created|formed|built|written|spoken|broken|taken)\b/gi,
      /\bhave been (made|done|created|formed|built|written|spoken|broken|taken)\b/gi
    ];
    
    let passiveCount = 0;
    for (const pattern of passiveVoicePatterns) {
      const matches = response.match(pattern);
      if (matches) {
        passiveCount += matches.length;
      }
    }
    
    if (passiveCount >= 3 && response.length > 200) {
      issues.push({
        type: ValidationIssueType.NarrativeQuality,
        severity: IssueSeverity.Low,
        description: `High use of passive voice: ${passiveCount} instances detected`,
        suggestedFix: 'Convert some passive voice constructions to active voice for more dynamic narration'
      });
      
      improvements.push('Use more active voice to create dynamic, engaging descriptions');
    }
    
    // Check for specific component quality issues
    if (component === 'combat') {
      // Combat should be dynamic and exciting
      const sensoryWords = [
        'feel', 'felt', 'saw', 'see', 'hear', 'heard', 'smell', 'smelled', 'taste', 'tasted',
        'blood', 'pain', 'force', 'impact', 'crash', 'bang', 'slash', 'clang', 'thud'
      ];
      
      let sensoryCount = 0;
      for (const word of sensoryWords) {
        const regex = new RegExp(`\\b${word}(s|ed|ing)?\\b`, 'gi');
        const matches = response.match(regex);
        if (matches) {
          sensoryCount += matches.length;
        }
      }
      
      if (response.length > 200 && sensoryCount < 2) {
        issues.push({
          type: ValidationIssueType.NarrativeQuality,
          severity: IssueSeverity.Medium,
          description: 'Combat description lacks sensory detail',
          suggestedFix: 'Add more sensory elements (sounds, sensations, visual details) to make combat feel more immersive'
        });
        
        improvements.push('Enhance combat descriptions with more sensory details that convey the intensity of battle');
      }
    } else if (component === 'location') {
      // Location descriptions should include multiple senses
      const sensePatterns = [
        /\b(see|saw|looks|appeared|sight|visual|visually)\b/i,
        /\b(hear|heard|sound|sounds|audio|audible|listen)\b/i,
        /\b(smell|scent|aroma|odor|fragrance|stench)\b/i,
        /\b(feel|felt|touch|texture|rough|smooth|hot|cold)\b/i,
        /\b(taste|flavor|sweet|sour|bitter|salty)\b/i
      ];
      
      const detectedSenses = new Set<number>();
      
      patternsLoop: for (let i = 0; i < sensePatterns.length; i++) {
        const matches = response.match(sensePatterns[i]);
        if (matches) {
          detectedSenses.add(i);
          if (detectedSenses.size >= 3) break patternsLoop; // Found at least 3 senses
        }
      }
      
      if (response.length > 300 && detectedSenses.size < 3) {
        issues.push({
          type: ValidationIssueType.NarrativeQuality,
          severity: IssueSeverity.Medium,
          description: 'Location description lacks sensory variety',
          suggestedFix: `Include more sensory details. Currently using ${detectedSenses.size}/5 senses.`
        });
        
        const missingSenses = [];
        if (!detectedSenses.has(0)) missingSenses.push('visual details');
        if (!detectedSenses.has(1)) missingSenses.push('sounds');
        if (!detectedSenses.has(2)) missingSenses.push('smells');
        if (!detectedSenses.has(3)) missingSenses.push('textures/feelings');
        if (!detectedSenses.has(4)) missingSenses.push('tastes');
        
        improvements.push(`Enhance location description with more sensory elements: ${missingSenses.join(', ')}`);
      }
    }
    
    return { issues, improvements };
  }
  
  /**
   * Check tone consistency
   * 
   * @param response Response to check
   * @param context Original context
   * @returns Identified issues
   */
  private checkTone(response: string, context: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    
    // Check for sudden tone shifts
    const toneCategories = {
      formal: ['henceforth', 'whereby', 'thus', 'herein', 'forthwith', 'hereby', 'thereof', 'wherein'],
      informal: ['cool', 'awesome', 'guy', 'folks', 'kinda', 'sorta', 'totally', 'whatever'],
      archaic: ['thee', 'thou', 'thy', 'thine', 'hast', 'doth', 'verily', 'forsooth'],
      modern: ['okay', 'alright', 'yeah', 'nope', 'btw', 'lol', 'gonna', 'wanna']
    };
    
    const detectedTones = new Map<string, number>();
    
    for (const [tone, words] of Object.entries(toneCategories)) {
      let count = 0;
      for (const word of words) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matches = response.match(regex);
        if (matches) {
          count += matches.length;
        }
      }
      
      if (count > 0) {
        detectedTones.set(tone, count);
      }
    }
    
    // Check for inconsistent tone mixing (e.g., archaic and modern)
    if (detectedTones.has('archaic') && detectedTones.has('modern')) {
      issues.push({
        type: ValidationIssueType.ToneIssue,
        severity: IssueSeverity.Medium,
        description: 'Inconsistent tone: mixing archaic and modern language',
        suggestedFix: 'Maintain a consistent tone throughout the response'
      });
    }
    
    if (detectedTones.has('formal') && detectedTones.has('informal') && 
        (detectedTones.get('formal')! > 1 && detectedTones.get('informal')! > 1)) {
      issues.push({
        type: ValidationIssueType.ToneIssue,
        severity: IssueSeverity.Low,
        description: 'Mixed tone: alternating between formal and informal language',
        suggestedFix: 'Choose either a formal or informal tone and maintain it consistently'
      });
    }
    
    return issues;
  }
  
  /**
   * Calculate overall quality score
   * 
   * @param issues Identified issues
   * @param response Response text
   * @returns Quality score (0-100)
   */
  private calculateQualityScore(issues: ValidationIssue[], response: string): number {
    // Start with perfect score
    let score = 100;
    
    // Deduct points based on issue severity
    const severityDeductions = {
      [IssueSeverity.Critical]: 30,
      [IssueSeverity.High]: 15,
      [IssueSeverity.Medium]: 8,
      [IssueSeverity.Low]: 3,
      [IssueSeverity.Info]: 0
    };
    
    // Count issues by type for diminishing returns
    const typeCounts: Record<string, number> = {};
    
    issues.forEach(issue => {
      typeCounts[issue.type] = (typeCounts[issue.type] || 0) + 1;
      
      // Apply diminishing returns for repeated issue types
      const multiplier = Math.max(0.5, 1 - (typeCounts[issue.type] - 1) * 0.2);
      score -= severityDeductions[issue.severity] * multiplier;
    });
    
    // Bonus for longer, more detailed responses (up to a point)
    const wordCount = response.split(/\s+/).length;
    if (wordCount > 50 && wordCount <= 500) {
      score += 5 * (wordCount / 500);
    }
    
    // Ensure score stays in 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  /**
   * Determine if a response is valid based on validation criteria
   * 
   * @param issues Identified issues
   * @param score Quality score
   * @returns Whether the response is valid
   */
  private isResponseValid(issues: ValidationIssue[], score: number): boolean {
    // Check for minimum score
    if (score < this.options.minValidationScore) {
      return false;
    }
    
    // Check for maximum issues
    if (this.options.maxIssues !== undefined && issues.length > this.options.maxIssues) {
      return false;
    }
    
    // Check for critical issues
    if (this.options.maxCriticalIssues !== undefined) {
      const criticalIssueCount = issues.filter(i => 
        i.severity === IssueSeverity.Critical || 
        (this.options.criticalIssueTypes?.includes(i.type) ?? false)
      ).length;
      
      if (criticalIssueCount > this.options.maxCriticalIssues) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Update world facts from game state
   * 
   * @param gameState Current game state
   */
  private updateWorldFacts(gameState: GameState): void {
    // This would extract relevant facts from the game state
    // For example, current location details, active quests, etc.
    
    if (gameState.currentLocation) {
      this.addWorldFact(
        `location_${gameState.currentLocation.id}`,
        `The current location is ${gameState.currentLocation.name}`
      );
      
      if (gameState.currentLocation.description) {
        this.addWorldFact(
          `location_desc_${gameState.currentLocation.id}`,
          gameState.currentLocation.description
        );
      }
    }
    
    // Add relevant NPCs
    gameState.npcs.forEach((npc, id) => {
      this.addWorldFact(
        `npc_${id}`,
        `${npc.name} is a ${npc.race} ${npc.occupation || ''}`
      );
    });
    
    // Add active quests
    gameState.quests.forEach((quest, index) => {
      if (quest.active) {
        this.addWorldFact(
          `quest_${index}`,
          `"${quest.name}" is an active quest given by ${quest.giver}`
        );
      }
    });
    
    // Add time of day and weather
    if (gameState.gameTime) {
      this.addWorldFact(
        'time_of_day',
        `The current time is ${gameState.gameTime.timeOfDay}`
      );
    }
    
    if (gameState.worldState?.currentWeather) {
      this.addWorldFact(
        'weather',
        `The current weather is ${gameState.worldState.currentWeather}`
      );
    }
  }
  
  /**
   * Update character traits from game state
   * 
   * @param gameState Current game state
   */
  private updateCharacterTraits(gameState: GameState): void {
    // Player character traits
    if (gameState.player) {
      const pc = gameState.player;
      this.characterTraits.set(pc.name, []);
      
      if (pc.personality) {
        if (pc.personality.traits) {
          pc.personality.traits.forEach(trait => 
            this.addCharacterTrait(pc.name, trait)
          );
        }
        
        if (pc.personality.ideals) {
          pc.personality.ideals.forEach(ideal => 
            this.addCharacterTrait(pc.name, ideal)
          );
        }
        
        if (pc.personality.flaws) {
          pc.personality.flaws.forEach(flaw => 
            this.addCharacterTrait(pc.name, flaw)
          );
        }
      }
      
      // Class and race provide implicit traits
      this.addCharacterTrait(pc.name, `${pc.race}`);
      if (Array.isArray(pc.class)) {
        pc.class.forEach(c => this.addCharacterTrait(pc.name, c.name));
      } else if (pc.class) {
        this.addCharacterTrait(pc.name, pc.class.name);
      }
    }
    
    // NPC traits
    gameState.npcs.forEach((npc, id) => {
      if (npc.personality) {
        this.characterTraits.set(npc.name, []);
        
        if (typeof npc.personality === 'string') {
          this.addCharacterTrait(npc.name, npc.personality);
        } else if (Array.isArray(npc.personality)) {
          npc.personality.forEach(trait => 
            this.addCharacterTrait(npc.name, trait)
          );
        } else if (typeof npc.personality === 'object') {
          for (const [trait, value] of Object.entries(npc.personality)) {
            this.addCharacterTrait(npc.name, `${trait}: ${value}`);
          }
        }
      }
    });
  }
  
  /**
   * Generate a suggested correction based on validation issues
   * 
   * @param response Original response
   * @param issues Validation issues
   * @returns Suggested corrected response
   */
  public suggestCorrection(response: string, issues: ValidationIssue[]): string {
    // In a real implementation, this would be much more sophisticated
    // potentially using a second LLM call to correct the issues
    
    let correctedResponse = response;
    
    // Sort issues by severity
    const sortedIssues = [...issues].sort((a, b) => {
      const severityOrder = {
        [IssueSeverity.Critical]: 0,
        [IssueSeverity.High]: 1,
        [IssueSeverity.Medium]: 2,
        [IssueSeverity.Low]: 3,
        [IssueSeverity.Info]: 4
      };
      
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    // For this simplified implementation, we'll just annotate the issues
    // A real implementation would intelligently modify the text
    const annotations: string[] = [];
    
    sortedIssues.forEach((issue, index) => {
      if (issue.problematicText && issue.suggestedFix) {
        annotations.push(`Issue ${index + 1}: "${issue.problematicText}" - ${issue.suggestedFix}`);
      } else {
        annotations.push(`Issue ${index + 1}: ${issue.description} - ${issue.suggestedFix || 'No suggestion available'}`);
      }
    });
    
    if (annotations.length > 0) {
      correctedResponse += '\n\n/* Suggested improvements:\n' + annotations.join('\n') + '\n*/';
    }
    
    return correctedResponse;
  }
}

export default EnhancedResponseValidator; 