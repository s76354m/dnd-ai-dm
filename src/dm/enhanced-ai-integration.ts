/**
 * Enhanced AI Integration
 * 
 * This module integrates all the enhanced AI components that use advanced prompt templates,
 * creating a unified interface for AI-powered content generation in the game.
 */

import { AIService } from './ai-service';
import { EnhancedLocationGenerator } from '../world/enhanced-location-generator';
import { EnhancedNPCGenerator } from '../character/npc/enhanced-npc-generator';
import { EnhancedCombatNarration } from '../combat/enhanced-combat-narration';
import { StyleOptions } from './prompts/advanced-prompt-templates';
import { Location } from '../core/interfaces/world';
import { NPC } from '../core/interfaces/npc';
import { LocationTemplate, WorldRegion } from '../world/generator';
import { NPCGenerationOptions } from '../character/npc/enhanced-npc-generator';
import { CombatActionDetails, CombatContext, CombatNarrationStyle } from '../combat/enhanced-combat-narration';
import { Character } from '../core/interfaces/character';
import { DialogueNode } from '../core/interfaces/quest';

/**
 * Unified interface for all enhanced AI-generated content
 */
export class EnhancedAIIntegration {
  private aiService: AIService;
  private locationGenerator: EnhancedLocationGenerator;
  private npcGenerator: EnhancedNPCGenerator;
  private combatNarration: EnhancedCombatNarration;
  
  constructor(aiService: AIService, locationGenerator: EnhancedLocationGenerator) {
    this.aiService = aiService;
    this.locationGenerator = locationGenerator;
    this.npcGenerator = new EnhancedNPCGenerator(aiService);
    this.combatNarration = new EnhancedCombatNarration(aiService);
  }
  
  /**
   * Generate an enhanced location with rich descriptions
   */
  public async generateLocation(
    template: Partial<LocationTemplate>,
    styleOptions?: Partial<StyleOptions>,
    connections: Map<string, string> = new Map(),
    regionName?: string
  ): Promise<Location> {
    return this.locationGenerator.generateEnhancedLocation(
      template,
      styleOptions,
      connections,
      regionName
    );
  }
  
  /**
   * Generate an NPC with advanced personality and dialog options
   */
  public async generateNPC(options: NPCGenerationOptions): Promise<NPC> {
    return this.npcGenerator.generateNPC(options);
  }
  
  /**
   * Generate contextual dialogue for an NPC
   */
  public async generateNPCDialogue(
    npc: NPC,
    context: string,
    playerInput?: string
  ): Promise<DialogueNode[]> {
    return this.npcGenerator.generateContextualDialogue(npc, context, playerInput);
  }
  
  /**
   * Generate narrative for a combat action
   */
  public async generateCombatNarrative(
    actionDetails: CombatActionDetails,
    context: CombatContext,
    style?: CombatNarrationStyle
  ): Promise<string> {
    return this.combatNarration.narrateAction(actionDetails, context, style);
  }
  
  /**
   * Generate narrative for the start of a combat round
   */
  public async generateRoundStartNarrative(
    context: CombatContext,
    style?: CombatNarrationStyle
  ): Promise<string> {
    return this.combatNarration.narrateRoundStart(context, style);
  }
  
  /**
   * Generate narrative for the end of combat
   */
  public async generateCombatEndNarrative(
    context: CombatContext,
    outcome: 'victory' | 'defeat' | 'flee' | 'truce',
    style?: CombatNarrationStyle
  ): Promise<string> {
    return this.combatNarration.narrateCombatEnd(context, outcome, style);
  }
}

/**
 * Create an enhanced AI integration with all components
 */
export function createEnhancedAIIntegration(
  aiService: AIService,
  worldGenerator: EnhancedLocationGenerator
): EnhancedAIIntegration {
  return new EnhancedAIIntegration(aiService, worldGenerator);
}

/**
 * Initialize all enhanced AI components and return the integration object
 */
export function initializeEnhancedAI(aiService: AIService): EnhancedAIIntegration {
  // Create enhanced location generator by extending the base world generator
  const locationGenerator = new EnhancedLocationGenerator(aiService);
  
  // Create and return the integration object
  return createEnhancedAIIntegration(aiService, locationGenerator);
} 