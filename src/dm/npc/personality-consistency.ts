/**
 * NPC Personality Consistency Tracker
 * 
 * Tracks and enforces consistent NPC personalities across interactions.
 * Identifies dialogue that contradicts established personality traits
 * and provides suggestions for maintaining consistency.
 */

import { NPC } from '../../core/interfaces/npc';
import { GameState } from '../../core/interfaces/game';

/**
 * Personality trait with confidence level
 */
export interface PersonalityTrait {
  trait: string;
  description: string;
  confidence: number; // 0-10 where 10 is highest confidence
  examples: string[]; // Examples of the trait in action
  observed: Date; // When the trait was first observed
  contradictions: number; // Count of times trait was contradicted
}

/**
 * Represents a potential contradiction in personality
 */
export interface PersonalityContradiction {
  trait: string;
  severity: 'low' | 'medium' | 'high';
  contradiction: string;
  suggestion: string;
}

/**
 * Validation result for an NPC's dialogue
 */
export interface PersonalityValidationResult {
  isConsistent: boolean;
  score: number; // 0-100 where 100 is perfectly consistent
  contradictions: PersonalityContradiction[];
  suggestedRevisions: string[];
}

/**
 * Options for the personality consistency tracker
 */
export interface PersonalityConsistencyOptions {
  minConfidenceThreshold: number; // Minimum confidence to consider a trait established
  maxTraitsPerNPC: number; // Maximum number of traits to track per NPC
  enableAutomaticTraitExtraction: boolean; // Whether to automatically extract traits
  contradictionThreshold: number; // How many contradictions before removing a trait
  severityScoringImpact: Record<string, number>; // Impact of different severity levels on score
}

/**
 * Default options for personality consistency tracker
 */
export const DEFAULT_CONSISTENCY_OPTIONS: PersonalityConsistencyOptions = {
  minConfidenceThreshold: 3,
  maxTraitsPerNPC: 10,
  enableAutomaticTraitExtraction: true,
  contradictionThreshold: 3,
  severityScoringImpact: {
    'low': 5,
    'medium': 15,
    'high': 30
  }
};

/**
 * Personality consistency tracker for NPCs
 */
export class NPCPersonalityConsistencyTracker {
  private npcTraits: Map<string, PersonalityTrait[]> = new Map();
  private options: PersonalityConsistencyOptions;
  
  // Common personality trait keywords to check for
  private readonly traitKeywords: Record<string, string[]> = {
    'friendly': ['kind', 'warm', 'welcoming', 'helpful', 'generous', 'amiable', 'cordial'],
    'hostile': ['unfriendly', 'aggressive', 'threatening', 'antagonistic', 'belligerent', 'mean'],
    'cautious': ['careful', 'wary', 'vigilant', 'guarded', 'suspicious', 'reluctant', 'hesitant'],
    'brave': ['courageous', 'fearless', 'valiant', 'heroic', 'bold', 'daring', 'intrepid'],
    'cowardly': ['timid', 'fearful', 'scared', 'afraid', 'meek', 'nervous', 'craven'],
    'intelligent': ['smart', 'brilliant', 'clever', 'wise', 'knowledgeable', 'sharp', 'perceptive'],
    'foolish': ['stupid', 'dim', 'slow', 'dull', 'witless', 'dense', 'simple'],
    'honest': ['truthful', 'straightforward', 'sincere', 'direct', 'candid', 'upfront'],
    'dishonest': ['deceitful', 'lying', 'deceptive', 'duplicitous', 'untruthful', 'fraudulent'],
    'greedy': ['avaricious', 'selfish', 'materialistic', 'covetous', 'miserly', 'stingy'],
    'generous': ['giving', 'charitable', 'unselfish', 'benevolent', 'magnanimous', 'altruistic'],
    'loyal': ['faithful', 'devoted', 'dedicated', 'steadfast', 'staunch', 'true'],
    'treacherous': ['disloyal', 'backstabbing', 'traitorous', 'untrustworthy', 'faithless'],
    'humble': ['modest', 'unassuming', 'unpretentious', 'meek', 'self-effacing'],
    'arrogant': ['proud', 'haughty', 'conceited', 'vain', 'egotistical', 'pompous', 'boastful'],
    'patient': ['tolerant', 'forbearing', 'calm', 'composed', 'unruffled', 'enduring'],
    'impatient': ['hurried', 'rushed', 'hasty', 'restless', 'irritable', 'anxious'],
    'religious': ['devout', 'pious', 'spiritual', 'faithful', 'godly', 'reverent'],
    'skeptical': ['doubtful', 'questioning', 'disbelieving', 'cynical', 'distrustful']
  };
  
  // Common contradictory trait pairs
  private readonly contradictoryTraits: Array<[string, string]> = [
    ['friendly', 'hostile'],
    ['brave', 'cowardly'],
    ['intelligent', 'foolish'],
    ['honest', 'dishonest'],
    ['greedy', 'generous'],
    ['loyal', 'treacherous'],
    ['humble', 'arrogant'],
    ['patient', 'impatient'],
    ['religious', 'skeptical']
  ];
  
  /**
   * Create a new NPC personality consistency tracker
   * 
   * @param options Configuration options
   */
  constructor(options: Partial<PersonalityConsistencyOptions> = {}) {
    this.options = { ...DEFAULT_CONSISTENCY_OPTIONS, ...options };
  }
  
  /**
   * Get all personality traits for an NPC
   * 
   * @param npcId The NPC's ID
   * @returns Array of personality traits
   */
  public getTraits(npcId: string): PersonalityTrait[] {
    return this.npcTraits.get(npcId) || [];
  }
  
  /**
   * Add a personality trait to an NPC
   * 
   * @param npcId The NPC's ID
   * @param trait Trait name (e.g., "friendly")
   * @param description Description of how the trait manifests
   * @param confidence Initial confidence level (1-10)
   * @param example Example of the trait in action
   * @returns True if the trait was added, false if it couldn't be added
   */
  public addTrait(
    npcId: string,
    trait: string,
    description: string,
    confidence: number = 5,
    example: string = ''
  ): boolean {
    // Initialize traits array if it doesn't exist
    if (!this.npcTraits.has(npcId)) {
      this.npcTraits.set(npcId, []);
    }
    
    const traits = this.npcTraits.get(npcId)!;
    
    // Check if trait already exists
    const existingTrait = traits.find(t => 
      t.trait.toLowerCase() === trait.toLowerCase() ||
      this.areTraitsSimilar(t.trait, trait)
    );
    
    if (existingTrait) {
      // Update existing trait
      existingTrait.confidence = Math.min(10, existingTrait.confidence + 1);
      if (example && !existingTrait.examples.includes(example)) {
        existingTrait.examples.push(example);
      }
      return true;
    }
    
    // Check for contradictory traits
    const contradictoryTrait = this.findContradictoryTrait(traits, trait);
    if (contradictoryTrait) {
      // Don't add contradictory traits unless the existing one has low confidence
      if (contradictoryTrait.confidence > 2 * confidence) {
        return false;
      }
      
      // Otherwise, reduce confidence in contradictory trait
      contradictoryTrait.contradictions++;
      
      // Remove contradictory trait if it's been contradicted too many times
      if (contradictoryTrait.contradictions >= this.options.contradictionThreshold) {
        const index = traits.indexOf(contradictoryTrait);
        traits.splice(index, 1);
      }
    }
    
    // Check if we're at the trait limit
    if (traits.length >= this.options.maxTraitsPerNPC) {
      // Remove the trait with the lowest confidence
      traits.sort((a, b) => a.confidence - b.confidence);
      traits.shift(); // Remove first element (lowest confidence)
    }
    
    // Add the new trait
    traits.push({
      trait,
      description,
      confidence: Math.min(10, Math.max(1, confidence)),
      examples: example ? [example] : [],
      observed: new Date(),
      contradictions: 0
    });
    
    return true;
  }
  
  /**
   * Extract personality traits from an NPC's dialogue
   * 
   * @param npcId The NPC's ID
   * @param dialogue Dialogue to analyze
   * @returns Array of extracted traits
   */
  public extractTraitsFromDialogue(npcId: string, dialogue: string): string[] {
    const extractedTraits: string[] = [];
    const lowercaseDialogue = dialogue.toLowerCase();
    
    // Check for direct mentions of personality traits
    for (const [trait, keywords] of Object.entries(this.traitKeywords)) {
      // Count mentions of trait and its keywords
      const keywordMatches = keywords.filter(keyword => 
        lowercaseDialogue.includes(keyword)
      ).length;
      
      // Add trait if enough keywords are mentioned
      if (keywordMatches > 0 || lowercaseDialogue.includes(trait)) {
        extractedTraits.push(trait);
      }
    }
    
    // Look for behavioral indicators
    this.extractBehavioralTraits(lowercaseDialogue, extractedTraits);
    
    return extractedTraits;
  }
  
  /**
   * Extract traits based on behavioral indicators in dialogue
   * 
   * @param dialogue Lowercase dialogue to analyze
   * @param traits Array to add extracted traits to
   */
  private extractBehavioralTraits(dialogue: string, traits: string[]): void {
    // Check for friendly behaviors
    if (dialogue.match(/smile(s|d)?( warmly)?/) || 
        dialogue.match(/laugh(s|ed)?( heartily)?/) || 
        dialogue.match(/greet(s|ed)?( you)? (warmly|happily)/) ||
        dialogue.match(/welcome(s|d) you/)) {
      traits.push('friendly');
    }
    
    // Check for hostile behaviors
    if (dialogue.match(/glare(s|d)?( angrily)?/) || 
        dialogue.match(/scowl(s|ed)?/) || 
        dialogue.match(/snarl(s|ed)?/) ||
        dialogue.match(/threaten(s|ed)?/)) {
      traits.push('hostile');
    }
    
    // Check for cautious behaviors
    if (dialogue.match(/look(s|ed)? around nervously/) || 
        dialogue.match(/eye(s|d)? you (suspiciously|carefully)/) || 
        dialogue.match(/hesitate(s|d) before (speaking|responding)/) ||
        dialogue.match(/speak(s|spoke) quietly/)) {
      traits.push('cautious');
    }
    
    // Check for intelligent behaviors
    if (dialogue.match(/explains? in detail/) || 
        dialogue.match(/references? complex (concepts|ideas)/) || 
        dialogue.match(/speaks? (eloquently|articulately)/) ||
        dialogue.match(/quotes? from books or scholars/)) {
      traits.push('intelligent');
    }
    
    // Check for greedy behaviors
    if (dialogue.match(/ask(s|ed)? about payment/) || 
        dialogue.match(/demand(s|ed)? more gold/) || 
        dialogue.match(/haggle(s|d)( over the price)?/) ||
        dialogue.match(/reluctant to (share|give)/)) {
      traits.push('greedy');
    }
    
    // Check for religious behaviors
    if (dialogue.match(/pray(s|ed)( to the gods)?/) || 
        dialogue.match(/invoke(s|d) the name of [a-z]+/) || 
        dialogue.match(/make(s|made) a religious gesture/) ||
        dialogue.match(/speak(s|spoke) of divine (will|purpose)/)) {
      traits.push('religious');
    }
  }
  
  /**
   * Update traits based on NPC dialogue and response
   * 
   * @param npcId The NPC's ID
   * @param npc The NPC object
   * @param dialogue NPC's dialogue
   */
  public updateTraitsFromDialogue(npcId: string, npc: NPC, dialogue: string): void {
    if (!this.options.enableAutomaticTraitExtraction) {
      return;
    }
    
    // Extract traits from personality description if available
    if (npc.personality && !this.npcTraits.has(npcId)) {
      this.extractTraitsFromPersonalityDescription(npcId, npc.personality);
    }
    
    // Extract traits from dialogue
    const extractedTraits = this.extractTraitsFromDialogue(npcId, dialogue);
    
    // Add or reinforce each extracted trait
    for (const trait of extractedTraits) {
      this.addTrait(
        npcId,
        trait,
        `Exhibits ${trait} behavior in dialogue`,
        4, // Moderate confidence for traits extracted from dialogue
        dialogue.substring(0, 100) // First 100 chars as example
      );
    }
  }
  
  /**
   * Extract initial traits from an NPC's personality description
   * 
   * @param npcId The NPC's ID
   * @param personalityDescription The NPC's personality description
   */
  public extractTraitsFromPersonalityDescription(npcId: string, personalityDescription: string): void {
    const lowercaseDesc = personalityDescription.toLowerCase();
    
    // Look for direct mentions of traits
    for (const [trait, keywords] of Object.entries(this.traitKeywords)) {
      if (lowercaseDesc.includes(trait) || keywords.some(keyword => lowercaseDesc.includes(keyword))) {
        this.addTrait(
          npcId,
          trait,
          `Described as ${trait} in personality`,
          7, // High confidence for explicitly described traits
          personalityDescription
        );
      }
    }
  }
  
  /**
   * Validate an NPC's dialogue for personality consistency
   * 
   * @param npcId The NPC's ID
   * @param dialogue Dialogue to validate
   * @returns Validation result
   */
  public validateDialogue(npcId: string, dialogue: string): PersonalityValidationResult {
    const traits = this.getTraits(npcId);
    
    // If we don't have any traits with sufficient confidence, consistency is unknown
    const establishedTraits = traits.filter(t => 
      t.confidence >= this.options.minConfidenceThreshold
    );
    
    if (establishedTraits.length === 0) {
      return {
        isConsistent: true, // No established traits to contradict
        score: 100,
        contradictions: [],
        suggestedRevisions: []
      };
    }
    
    // Find contradictions
    const contradictions: PersonalityContradiction[] = [];
    const lowercaseDialogue = dialogue.toLowerCase();
    
    // Check each established trait
    for (const trait of establishedTraits) {
      const traitContradictions = this.findTraitContradictions(
        trait.trait,
        lowercaseDialogue
      );
      
      contradictions.push(...traitContradictions);
    }
    
    // Calculate consistency score
    let score = 100;
    for (const contradiction of contradictions) {
      score -= this.options.severityScoringImpact[contradiction.severity] || 10;
    }
    score = Math.max(0, score);
    
    // Generate suggestions
    const suggestedRevisions = contradictions.map(c => c.suggestion);
    
    return {
      isConsistent: contradictions.length === 0,
      score,
      contradictions,
      suggestedRevisions
    };
  }
  
  /**
   * Find contradictions to a specific trait in dialogue
   * 
   * @param trait Trait to check
   * @param dialogue Lowercase dialogue to analyze
   * @returns Array of contradictions
   */
  private findTraitContradictions(trait: string, dialogue: string): PersonalityContradiction[] {
    const contradictions: PersonalityContradiction[] = [];
    
    // Get contradictory traits
    const oppositeTraits = this.getOppositeTraits(trait);
    
    // Check for opposites
    for (const oppositeTrait of oppositeTraits) {
      // Check if dialogue contains opposite trait keywords
      const oppositeKeywords = this.traitKeywords[oppositeTrait] || [];
      
      // Count mentions of opposite trait and its keywords
      const mentionCount = oppositeKeywords.filter(keyword => 
        dialogue.includes(keyword)
      ).length + (dialogue.includes(oppositeTrait) ? 1 : 0);
      
      // If opposite trait is mentioned, that's a contradiction
      if (mentionCount > 0) {
        let severity: 'low' | 'medium' | 'high' = 'low';
        
        // Determine severity based on number of mentions
        if (mentionCount >= 3) {
          severity = 'high';
        } else if (mentionCount === 2) {
          severity = 'medium';
        }
        
        contradictions.push({
          trait,
          severity,
          contradiction: `Dialogue exhibits "${oppositeTrait}" behavior, which contradicts the established "${trait}" trait`,
          suggestion: `Revise dialogue to align with the NPC's ${trait} personality trait.`
        });
      }
    }
    
    // Check for behavioral contradictions
    this.checkForBehavioralContradictions(trait, dialogue, contradictions);
    
    return contradictions;
  }
  
  /**
   * Check for behavioral contradictions in dialogue
   * 
   * @param trait Trait to check
   * @param dialogue Lowercase dialogue to analyze
   * @param contradictions Array to add contradictions to
   */
  private checkForBehavioralContradictions(
    trait: string, 
    dialogue: string,
    contradictions: PersonalityContradiction[]
  ): void {
    // Define behavioral patterns that contradict specific traits
    const behavioralContradictions: Record<string, Array<{pattern: RegExp, description: string}>> = {
      'friendly': [
        { 
          pattern: /refuse(s|d)? to (help|assist)/i, 
          description: 'refusing to help others'
        },
        { 
          pattern: /ignore(s|d)? (your|the) (question|request)/i, 
          description: 'ignoring questions or requests'
        },
        { 
          pattern: /(harsh|cold) (tone|voice|reply)/i, 
          description: 'using a harsh or cold tone'
        }
      ],
      'cautious': [
        { 
          pattern: /immediately (agree|agreed|trusts|trusted)/i, 
          description: 'immediately trusting or agreeing without verification'
        },
        { 
          pattern: /reveal(s|ed)? (sensitive|private|secret) information/i, 
          description: 'revealing sensitive information too readily'
        },
        { 
          pattern: /rush(es|ed) (into|to)/i, 
          description: 'rushing into situations without consideration'
        }
      ],
      'intelligent': [
        { 
          pattern: /confusion|confused|doesn't understand|struggle(s|d) to comprehend/i, 
          description: 'showing confusion or lack of understanding of simple concepts'
        },
        { 
          pattern: /simple (words|language|terms)/i, 
          description: 'using overly simplistic language'
        },
        { 
          pattern: /incorrect (facts|information)/i, 
          description: 'stating incorrect information confidently'
        }
      ],
      'greedy': [
        { 
          pattern: /offer(s|ed)? (freely|without payment|for free)/i, 
          description: 'offering services or items without payment'
        },
        { 
          pattern: /generous (gift|donation|offer)/i, 
          description: 'showing generosity without expectation of return'
        },
        { 
          pattern: /refuse(s|d)? payment/i, 
          description: 'refusing payment for services or goods'
        }
      ]
      // Additional trait contradictions could be defined here
    };
    
    // Check if we have behavioral contradictions for this trait
    const contradictionPatterns = behavioralContradictions[trait];
    if (!contradictionPatterns) {
      return;
    }
    
    // Check each pattern
    for (const { pattern, description } of contradictionPatterns) {
      if (pattern.test(dialogue)) {
        contradictions.push({
          trait,
          severity: 'medium',
          contradiction: `Dialogue shows ${description}, which contradicts the established "${trait}" trait`,
          suggestion: `Revise the dialogue to be more consistent with the NPC's ${trait} nature, avoiding behaviors like ${description}.`
        });
      }
    }
  }
  
  /**
   * Get the opposite traits for a given trait
   * 
   * @param trait Trait to find opposites for
   * @returns Array of opposite traits
   */
  private getOppositeTraits(trait: string): string[] {
    const opposites: string[] = [];
    
    // Check explicit contradictory pairs
    for (const [trait1, trait2] of this.contradictoryTraits) {
      if (trait1 === trait) {
        opposites.push(trait2);
      } else if (trait2 === trait) {
        opposites.push(trait1);
      }
    }
    
    // If no explicit opposite found, use a heuristic approach
    if (opposites.length === 0) {
      // This would be more sophisticated in a real implementation
      // For now, we just return a generic opposite
      if (trait.startsWith('un') || trait.startsWith('in') || trait.startsWith('dis')) {
        // If the trait is negative, the opposite is the positive form
        opposites.push(trait.substring(2));
      } else {
        // Otherwise, prepend "un" for a simple opposite
        opposites.push('un' + trait);
      }
    }
    
    return opposites;
  }
  
  /**
   * Check if two traits are similar based on keywords
   * 
   * @param trait1 First trait
   * @param trait2 Second trait
   * @returns True if the traits are similar
   */
  private areTraitsSimilar(trait1: string, trait2: string): boolean {
    // Check if either trait is a keyword of the other
    const keywords1 = this.traitKeywords[trait1] || [];
    const keywords2 = this.traitKeywords[trait2] || [];
    
    return keywords1.includes(trait2) || 
           keywords2.includes(trait1);
  }
  
  /**
   * Find a contradictory trait in an array of traits
   * 
   * @param traits Array of traits to check
   * @param newTrait New trait to check against
   * @returns Contradictory trait if found, undefined otherwise
   */
  private findContradictoryTrait(traits: PersonalityTrait[], newTrait: string): PersonalityTrait | undefined {
    // Get opposites for the new trait
    const opposites = this.getOppositeTraits(newTrait);
    
    // Check if any existing trait is in the opposites list
    return traits.find(trait => 
      opposites.includes(trait.trait) || 
      opposites.some(opposite => this.areTraitsSimilar(opposite, trait.trait))
    );
  }
  
  /**
   * Generate a personality-consistent response to replace an inconsistent one
   * 
   * @param npcId The NPC's ID
   * @param originalResponse Original inconsistent response
   * @param contradictions Contradictions that were found
   * @returns Suggestion for a more consistent response
   */
  public generateConsistentResponseSuggestion(
    npcId: string,
    originalResponse: string,
    contradictions: PersonalityContradiction[]
  ): string {
    if (contradictions.length === 0) {
      return originalResponse;
    }
    
    const traits = this.getTraits(npcId);
    
    // This is a simplified approach. In a real implementation, you might
    // use the AI to generate a more consistent response.
    let suggestion = `Consider revising this dialogue to better match the NPC's established traits:\n\n`;
    
    // List the established traits
    suggestion += `Established traits:\n`;
    for (const trait of traits) {
      if (trait.confidence >= this.options.minConfidenceThreshold) {
        suggestion += `- ${trait.trait}: ${trait.description}\n`;
        if (trait.examples.length > 0) {
          suggestion += `  Example: "${trait.examples[0]}"\n`;
        }
      }
    }
    
    // List the contradictions
    suggestion += `\nContradictions found:\n`;
    for (const contradiction of contradictions) {
      suggestion += `- ${contradiction.contradiction}\n`;
    }
    
    // Provide specific suggestions
    suggestion += `\nSuggestions for improvement:\n`;
    for (const contradiction of contradictions) {
      suggestion += `- ${contradiction.suggestion}\n`;
    }
    
    return suggestion;
  }
  
  /**
   * Clear traits for a specific NPC
   * 
   * @param npcId The NPC's ID
   */
  public clearTraits(npcId: string): void {
    this.npcTraits.delete(npcId);
  }
  
  /**
   * Clear all NPC traits
   */
  public clearAllTraits(): void {
    this.npcTraits.clear();
  }
  
  /**
   * Get all NPCs with tracked personality traits
   * 
   * @returns Array of NPC IDs
   */
  public getNPCsWithTraits(): string[] {
    return Array.from(this.npcTraits.keys());
  }
}

export default NPCPersonalityConsistencyTracker; 