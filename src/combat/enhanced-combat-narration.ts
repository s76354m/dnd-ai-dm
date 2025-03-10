/**
 * Enhanced Combat Narration
 * 
 * Uses advanced prompt templates to generate vivid and dynamic combat narration
 * tailored to the specific combat actions, participants, and environment.
 */

import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../dm/ai-service';
import { createPromptTemplate } from '../dm/prompts/advanced-prompt-templates';
import { CombatPromptTemplate } from '../dm/prompts/advanced-prompt-templates';
import { createStyle, StyleOptions } from '../dm/prompts/advanced-prompt-templates';
import { Character } from '../core/interfaces/character';
import { NPC } from '../core/interfaces/npc';
import { Location } from '../core/interfaces/world';
import { CombatAction, AttackResult, CombatEffect, CombatState } from './combat-types';
import { appConfig } from '../config';

/**
 * Combat action details to be narrated
 */
export interface CombatActionDetails {
  actionType: CombatAction;
  actor: Character | NPC;
  targets?: Array<Character | NPC>;
  result?: AttackResult;
  spellName?: string;
  itemName?: string;
  abilityName?: string;
  damageDealt?: number;
  healingDone?: number;
  effectsApplied?: CombatEffect[];
  isSuccessful?: boolean;
  isCritical?: boolean;
  specialCircumstances?: string[];
}

/**
 * Combat context for narration
 */
export interface CombatContext {
  combatState: CombatState;
  location: Location;
  environmentalFactors?: string[];
  previousActions?: CombatActionDetails[];
  round: number;
  tension: 'low' | 'moderate' | 'high' | 'climactic';
}

/**
 * Narration style preferences
 */
export interface CombatNarrationStyle extends Partial<StyleOptions> {
  bloodiness?: 'none' | 'mild' | 'moderate' | 'graphic';
  pacing?: 'slow' | 'moderate' | 'quick' | 'frantic';
  focusOn?: 'tactics' | 'emotion' | 'environment' | 'consequences';
}

export class EnhancedCombatNarration {
  private aiService: AIService;
  private narrationHistory: Map<string, string[]>;
  private defaultStyle: CombatNarrationStyle;
  
  constructor(aiService: AIService) {
    this.aiService = aiService;
    this.narrationHistory = new Map();
    this.defaultStyle = {
      tone: 'dramatic',
      verbosity: 'balanced',
      detail: 'high',
      emphasis: 'action',
      bloodiness: 'moderate',
      pacing: 'moderate',
      focusOn: 'tactics'
    };
  }
  
  /**
   * Generate a narrative description of a combat action
   */
  public async narrateAction(
    actionDetails: CombatActionDetails,
    context: CombatContext,
    style?: CombatNarrationStyle
  ): Promise<string> {
    // Create a combat prompt template
    const promptTemplate = createPromptTemplate('combat') as CombatPromptTemplate;
    
    // Apply narration style, adapting based on the combat context and action
    const narrationStyle = this.getActionBasedStyle(actionDetails, context, style);
    
    // Format the prompts using the template
    const combatContext = {
      action: this.formatActionForPrompt(actionDetails),
      context: this.formatContextForPrompt(context),
      style: narrationStyle
    };
    
    const userPrompt = promptTemplate.formatUserPrompt({
      combatContext
    });
    
    const systemPrompt = promptTemplate.formatSystemPrompt();
    
    try {
      // Call the AI service with the formatted prompts
      const response = await this.aiService.generateCompletion(
        userPrompt,
        'combat',
        {
          systemPrompt,
          temperature: narrationStyle.creativity || appConfig.aiCreativity
        }
      );
      
      const narration = response.text;
      
      // Store the narration in history for context in future narrations
      this.updateNarrationHistory(context.combatState.round.toString(), narration);
      
      return narration;
    } catch (error) {
      console.warn('Failed to generate combat narration, using fallback description', error);
      return this.createFallbackNarration(actionDetails, context);
    }
  }
  
  /**
   * Generate a narrative summary for the start of a combat round
   */
  public async narrateRoundStart(
    context: CombatContext,
    style?: CombatNarrationStyle
  ): Promise<string> {
    // Create a combat prompt template with round start focus
    const promptTemplate = createPromptTemplate('combat') as CombatPromptTemplate;
    
    // Adapt style for round start narration
    const roundStyle = this.getRoundBasedStyle(context, style);
    
    // Prepare round context
    const roundContext = {
      round: context.round,
      participants: context.combatState.participants.map(p => ({
        name: p.name,
        isPlayer: p.isPlayer,
        hasActed: p.hasActed,
        initiative: p.initiative
      })),
      activeEffects: context.combatState.effects.filter(e => e.isActive),
      location: {
        name: context.location.name,
        description: context.location.description,
        lighting: context.location.lighting,
        terrain: context.location.terrain
      },
      environmentalFactors: context.environmentalFactors || []
    };
    
    // Format the prompts for round narration
    const userPrompt = promptTemplate.formatUserPrompt({
      roundContext,
      style: roundStyle
    });
    
    const systemPrompt = promptTemplate.formatSystemPrompt();
    
    try {
      // Call the AI service
      const response = await this.aiService.generateCompletion(
        userPrompt,
        'combat_round',
        {
          systemPrompt,
          temperature: roundStyle.creativity || appConfig.aiCreativity
        }
      );
      
      const narration = response.text;
      
      // Store the round narration
      this.updateNarrationHistory(`round_${context.round}`, narration);
      
      return narration;
    } catch (error) {
      console.warn('Failed to generate round narration, using fallback', error);
      return this.createFallbackRoundNarration(context);
    }
  }
  
  /**
   * Generate a concluding narration for the end of combat
   */
  public async narrateCombatEnd(
    context: CombatContext,
    outcome: 'victory' | 'defeat' | 'flee' | 'truce',
    style?: CombatNarrationStyle
  ): Promise<string> {
    // Create a combat prompt template
    const promptTemplate = createPromptTemplate('combat') as CombatPromptTemplate;
    
    // Adapt style for combat conclusion
    const conclusionStyle = this.getConclusionStyle(context, outcome, style);
    
    // Format conclusion context
    const conclusionContext = {
      outcome,
      combatDuration: context.round,
      survivors: context.combatState.participants.filter(p => true), // In a real system, would filter based on health
      location: context.location.name,
      significance: outcome === 'victory' ? 'major' : outcome === 'defeat' ? 'setback' : 'neutral'
    };
    
    // Format the prompts for conclusion
    const userPrompt = promptTemplate.formatUserPrompt({
      conclusionContext,
      style: conclusionStyle
    });
    
    const systemPrompt = promptTemplate.formatSystemPrompt();
    
    try {
      // Call the AI service
      const response = await this.aiService.generateCompletion(
        userPrompt,
        'combat_conclusion',
        {
          systemPrompt,
          temperature: conclusionStyle.creativity || appConfig.aiCreativity
        }
      );
      
      return response.text;
    } catch (error) {
      console.warn('Failed to generate combat conclusion, using fallback', error);
      return this.createFallbackConclusionNarration(context, outcome);
    }
  }
  
  /**
   * Format action details for use in a prompt
   */
  private formatActionForPrompt(action: CombatActionDetails): Record<string, any> {
    return {
      type: action.actionType,
      actor: {
        name: action.actor.name,
        isPlayer: 'class' in action.actor, // Simple check if it's a player character
        race: action.actor.race,
        // Other relevant actor details
      },
      targets: action.targets?.map(target => ({
        name: target.name,
        isPlayer: 'class' in target,
        // Other relevant target details
      })),
      result: action.result,
      spell: action.spellName,
      item: action.itemName,
      ability: action.abilityName,
      damage: action.damageDealt,
      healing: action.healingDone,
      effects: action.effectsApplied,
      success: action.isSuccessful,
      critical: action.isCritical,
      circumstances: action.specialCircumstances
    };
  }
  
  /**
   * Format combat context for use in a prompt
   */
  private formatContextForPrompt(context: CombatContext): Record<string, any> {
    return {
      round: context.round,
      location: {
        name: context.location.name,
        description: context.location.description,
        lighting: context.location.lighting,
        terrain: context.location.terrain
      },
      participants: context.combatState.participants.map(p => ({
        name: p.name,
        isPlayer: p.isPlayer,
        initiative: p.initiative,
        hasActed: p.hasActed
      })),
      environmentalFactors: context.environmentalFactors || [],
      effects: context.combatState.effects.filter(e => e.isActive).map(e => ({
        name: e.name,
        description: e.description,
        target: e.target
      })),
      tension: context.tension || 'moderate',
      history: this.getRecentNarrationHistory(context.combatState.round.toString(), 3)
    };
  }
  
  /**
   * Get recent narration history for context
   */
  private getRecentNarrationHistory(currentKey: string, count: number): string[] {
    const history: string[] = [];
    
    // Get the most recent narrations
    const keys = Array.from(this.narrationHistory.keys()).sort();
    const currentIndex = keys.indexOf(currentKey);
    
    if (currentIndex >= 0) {
      const startIndex = Math.max(0, currentIndex - count);
      for (let i = startIndex; i < currentIndex; i++) {
        const narrations = this.narrationHistory.get(keys[i]);
        if (narrations && narrations.length > 0) {
          history.push(narrations[narrations.length - 1]);
        }
      }
    }
    
    return history;
  }
  
  /**
   * Update the narration history
   */
  private updateNarrationHistory(key: string, narration: string): void {
    if (!this.narrationHistory.has(key)) {
      this.narrationHistory.set(key, []);
    }
    
    const narrations = this.narrationHistory.get(key)!;
    narrations.push(narration);
    
    // Limit history to prevent memory issues
    if (narrations.length > 10) {
      narrations.shift();
    }
  }
  
  /**
   * Get a style adapted for specific action types
   */
  private getActionBasedStyle(
    action: CombatActionDetails,
    context: CombatContext,
    customStyle?: CombatNarrationStyle
  ): StyleOptions {
    // Base style
    let baseStyle: Partial<StyleOptions> = { ...this.defaultStyle };
    
    // Adjust based on action type
    switch (action.actionType) {
      case CombatAction.ATTACK:
        baseStyle = {
          ...baseStyle,
          emphasis: 'action',
          tone: action.isCritical ? 'intense' : 'dramatic'
        };
        break;
      case CombatAction.CAST_SPELL:
        baseStyle = {
          ...baseStyle,
          emphasis: 'magic',
          tone: 'mystical'
        };
        break;
      case CombatAction.HEAL:
        baseStyle = {
          ...baseStyle,
          emphasis: 'emotion',
          tone: 'hopeful'
        };
        break;
      case CombatAction.DODGE:
      case CombatAction.HIDE:
        baseStyle = {
          ...baseStyle,
          emphasis: 'tension',
          pacing: 'quick'
        };
        break;
      // Add other action types as needed
    }
    
    // Adjust based on success/failure
    if (action.isSuccessful === false) {
      baseStyle.tone = 'disappointing';
    }
    
    // Adjust based on tension
    if (context.tension === 'high' || context.tension === 'climactic') {
      baseStyle.verbosity = 'detailed';
      baseStyle.pacing = 'frantic';
    }
    
    // Create combined style with custom overrides
    return createStyle({
      ...baseStyle,
      ...customStyle
    });
  }
  
  /**
   * Get a style adapted for round narration
   */
  private getRoundBasedStyle(
    context: CombatContext,
    customStyle?: CombatNarrationStyle
  ): StyleOptions {
    // Base style for rounds
    let baseStyle: Partial<StyleOptions> = {
      ...this.defaultStyle,
      emphasis: 'atmosphere',
      verbosity: 'balanced'
    };
    
    // Adjust based on round number
    if (context.round === 1) {
      // First round emphasizes the beginning of combat
      baseStyle.emphasis = 'setup';
      baseStyle.detail = 'high';
      baseStyle.verbosity = 'detailed';
    } else if (context.round > 3 && context.tension === 'high') {
      // Later rounds with high tension
      baseStyle.pacing = 'frantic';
      baseStyle.tone = 'intense';
    }
    
    // Create combined style with custom overrides
    return createStyle({
      ...baseStyle,
      ...customStyle
    });
  }
  
  /**
   * Get a style adapted for combat conclusion
   */
  private getConclusionStyle(
    context: CombatContext,
    outcome: 'victory' | 'defeat' | 'flee' | 'truce',
    customStyle?: CombatNarrationStyle
  ): StyleOptions {
    // Base style for conclusion
    let baseStyle: Partial<StyleOptions> = {
      ...this.defaultStyle,
      verbosity: 'detailed',
      emphasis: 'consequences'
    };
    
    // Adjust based on outcome
    switch (outcome) {
      case 'victory':
        baseStyle.tone = 'triumphant';
        break;
      case 'defeat':
        baseStyle.tone = 'somber';
        break;
      case 'flee':
        baseStyle.tone = 'tense';
        baseStyle.pacing = 'quick';
        break;
      case 'truce':
        baseStyle.tone = 'neutral';
        baseStyle.emphasis = 'resolution';
        break;
    }
    
    // Create combined style with custom overrides
    return createStyle({
      ...baseStyle,
      ...customStyle
    });
  }
  
  /**
   * Create a fallback narration when AI generation fails
   */
  private createFallbackNarration(action: CombatActionDetails, context: CombatContext): string {
    const actorName = action.actor.name;
    const targetName = action.targets?.[0]?.name || 'the target';
    
    switch (action.actionType) {
      case CombatAction.ATTACK:
        if (action.isSuccessful) {
          return `${actorName} attacks ${targetName} and lands a ${action.isCritical ? 'critical hit' : 'hit'}, dealing ${action.damageDealt} damage.`;
        } else {
          return `${actorName} attacks ${targetName} but misses.`;
        }
      case CombatAction.CAST_SPELL:
        return `${actorName} casts ${action.spellName} ${action.targets ? `targeting ${targetName}` : ''}.`;
      case CombatAction.DODGE:
        return `${actorName} takes the dodge action, making themselves harder to hit.`;
      case CombatAction.HEAL:
        return `${actorName} heals ${targetName} for ${action.healingDone} hit points.`;
      default:
        return `${actorName} performs a ${action.actionType} action.`;
    }
  }
  
  /**
   * Create a fallback round narration when AI generation fails
   */
  private createFallbackRoundNarration(context: CombatContext): string {
    return `Round ${context.round} begins. The participants ready themselves for action in ${context.location.name}.`;
  }
  
  /**
   * Create a fallback conclusion narration when AI generation fails
   */
  private createFallbackConclusionNarration(context: CombatContext, outcome: 'victory' | 'defeat' | 'flee' | 'truce'): string {
    switch (outcome) {
      case 'victory':
        return `After ${context.round} rounds of combat, you emerge victorious!`;
      case 'defeat':
        return `After a valiant struggle, you have been defeated.`;
      case 'flee':
        return `You manage to escape from the battle.`;
      case 'truce':
        return `The combat ends with both sides agreeing to a truce.`;
      default:
        return `The combat has concluded.`;
    }
  }
} 