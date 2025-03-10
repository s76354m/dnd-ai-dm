/**
 * Tactical AI Decision Making System
 * 
 * Uses AI to make intelligent, context-aware decisions for enemies in combat
 * based on their type, situation, and the current combat state.
 */

import { v4 as uuidv4 } from 'uuid';
import { AIService } from '../dm/ai-service';
import { CombatPromptTemplate } from '../dm/prompts/advanced-prompt-templates';
import { createPromptTemplate } from '../dm/prompts/advanced-prompt-templates';
import { CombatState, InitiativeEntry } from './combat-types';
import { NPC } from '../core/interfaces/npc';
import { Character } from '../core/interfaces/character';
import { Location } from '../core/interfaces/location';
import { EnemyManager } from './enemy-manager';
import { appConfig } from '../config';

/**
 * Tactical decision context for AI decision-making
 */
export interface TacticalContext {
  combatState: CombatState;
  npc: NPC;
  availableActions: Array<{
    name: string;
    type: 'melee' | 'ranged' | 'spell' | 'special' | 'movement' | 'item';
    description: string;
    targetRequired: boolean;
    range?: number;
    cooldown?: number;
    lastUsed?: number;
  }>;
  possibleTargets: Array<{
    id: string;
    name: string;
    isPlayer: boolean;
    currentHealth: number;
    maxHealth: number;
    armorClass: number;
    threatLevel: number;
    distance: number;
    conditions: string[];
  }>;
  battlefield: {
    terrain: string;
    lighting: string;
    specialFeatures: string[];
    environmentalFactors: string[];
  };
  npcBehavior: {
    aggression: 'passive' | 'defensive' | 'aggressive' | 'frenzied';
    intelligence: 'animal' | 'low' | 'average' | 'high' | 'genius';
    tacticalPreference: 'melee' | 'ranged' | 'spellcasting' | 'defensive' | 'mixed';
    selfPreservation: 'none' | 'low' | 'medium' | 'high';
    packTactics: boolean;
    preferredTargets?: string[];
    avoidedTargets?: string[];
  };
  currentRound: number;
  npcRelativeHealth: 'healthy' | 'injured' | 'critical';
  allyStatus: {
    count: number;
    healthStatuses: {
      healthy: number;
      injured: number;
      critical: number;
      defeated: number;
    };
  };
}

/**
 * Tactical decision output from AI
 */
export interface TacticalDecision {
  actionName: string;
  actionType: string;
  targetId?: string;
  reasoning: string;
  fallbackAction?: string;
  fallbackTarget?: string;
  movementIntention?: 'approach' | 'retreat' | 'flank' | 'hold';
  specialConsiderations?: string[];
}

/**
 * Manages AI-powered tactical decision making for enemies
 */
export class TacticalAI {
  private aiService: AIService;
  private enemyManager: EnemyManager;
  private decisionCache: Map<string, TacticalDecision>;
  
  constructor(aiService: AIService, enemyManager: EnemyManager) {
    this.aiService = aiService;
    this.enemyManager = enemyManager;
    this.decisionCache = new Map();
  }
  
  /**
   * Get a tactical decision for an NPC in the current combat state
   */
  public async decideTacticalAction(
    npcId: string,
    combatState: CombatState,
    location: Location
  ): Promise<TacticalDecision> {
    // Check if a decision is already cached for this NPC in the current round
    const cacheKey = `${npcId}-${combatState.round}`;
    if (this.decisionCache.has(cacheKey)) {
      return this.decisionCache.get(cacheKey)!;
    }
    
    // Find the NPC entry in the initiative order
    const npcEntry = combatState.initiativeOrder.find(
      entry => !entry.isPlayer && entry.participant.id === npcId
    );
    
    if (!npcEntry) {
      throw new Error(`NPC with ID ${npcId} not found in combat initiative order`);
    }
    
    const npc = npcEntry.participant as NPC;
    
    // Get monster behavior from the enemy manager
    const monsterBehavior = this.enemyManager.getMonsterBehavior(npcId) || {
      aggression: 'aggressive',
      intelligence: 'average',
      tacticalPreference: 'mixed',
      selfPreservation: 'medium',
      packTactics: false
    };
    
    // Available actions
    const availableActions = this.getAvailableActions(npc);
    
    // Potential targets
    const possibleTargets = this.getPossibleTargets(npc, combatState);
    
    // Prepare tactical context
    const tacticalContext = this.prepareTacticalContext(
      npc,
      npcEntry,
      combatState,
      availableActions,
      possibleTargets,
      location,
      monsterBehavior
    );
    
    try {
      // Get AI-driven tactical decision
      const decision = await this.generateTacticalDecision(tacticalContext);
      
      // Cache the decision
      this.decisionCache.set(cacheKey, decision);
      
      return decision;
    } catch (error) {
      console.warn('Error generating tactical decision, using fallback strategy', error);
      
      // Fallback to basic decision making
      return this.generateFallbackDecision(npc, possibleTargets, availableActions);
    }
  }
  
  /**
   * Get available actions for an NPC
   */
  private getAvailableActions(npc: NPC): any[] {
    // Get actions from enemy manager
    const monsterActions = this.enemyManager.getMonsterActions(npc.id) || [];
    
    // Add basic actions if none are available
    if (monsterActions.length === 0) {
      return [
        {
          name: 'Attack',
          type: 'melee',
          description: 'Basic melee attack',
          targetRequired: true,
          range: 5
        },
        {
          name: 'Retreat',
          type: 'movement',
          description: 'Move away from enemies',
          targetRequired: false
        },
        {
          name: 'Hold Position',
          type: 'movement',
          description: 'Stay in current position',
          targetRequired: false
        }
      ];
    }
    
    return monsterActions;
  }
  
  /**
   * Get possible targets for an NPC
   */
  private getPossibleTargets(npc: NPC, combatState: CombatState): any[] {
    // Get all potential targets (players and other NPCs)
    const targets = combatState.initiativeOrder
      .filter(entry => entry.participant.id !== npc.id) // Exclude self
      .map(entry => {
        const target = entry.participant;
        const isPlayer = entry.isPlayer;
        
        // Determine health status
        const currentHealth = isPlayer 
          ? (target as Character).hitPoints.current 
          : (target as NPC).stats.hitPoints.current;
        
        const maxHealth = isPlayer 
          ? (target as Character).hitPoints.maximum 
          : (target as NPC).stats.hitPoints.maximum;
        
        // Calculate threat level (simplified for now)
        let threatLevel = isPlayer ? 5 : 3; // Players are generally higher threat
        
        // Consider health
        if (currentHealth < maxHealth * 0.3) {
          threatLevel -= 2; // Injured targets are less threatening
        }
        
        // Consider conditions
        if (entry.conditions.includes('unconscious') || 
            entry.conditions.includes('incapacitated') ||
            entry.conditions.includes('defeated')) {
          threatLevel = 0; // Incapacitated targets are not a threat
        }
        
        // Mock distance for now (would be calculated from actual positions in full system)
        const distance = Math.floor(Math.random() * 30) + 5; // 5-35 feet
        
        return {
          id: target.id,
          name: target.name,
          isPlayer,
          currentHealth,
          maxHealth,
          armorClass: isPlayer 
            ? (target as Character).armorClass 
            : (target as NPC).stats.armorClass,
          threatLevel,
          distance,
          conditions: entry.conditions
        };
      });
    
    return targets;
  }
  
  /**
   * Prepare the tactical context for AI decision making
   */
  private prepareTacticalContext(
    npc: NPC,
    npcEntry: InitiativeEntry,
    combatState: CombatState,
    availableActions: any[],
    possibleTargets: any[],
    location: Location,
    behavior: any
  ): TacticalContext {
    // Calculate NPC relative health
    const healthRatio = npc.stats.hitPoints.current / npc.stats.hitPoints.maximum;
    const healthStatus = healthRatio > 0.7 
      ? 'healthy' 
      : healthRatio > 0.3 
        ? 'injured' 
        : 'critical';
    
    // Count allies and their status
    const allies = combatState.initiativeOrder.filter(
      entry => !entry.isPlayer && entry.participant.id !== npc.id
    );
    
    const allyHealthStatuses = {
      healthy: 0,
      injured: 0,
      critical: 0,
      defeated: 0
    };
    
    allies.forEach(ally => {
      const allyNpc = ally.participant as NPC;
      const allyRatio = allyNpc.stats.hitPoints.current / allyNpc.stats.hitPoints.maximum;
      
      if (ally.conditions.includes('defeated')) {
        allyHealthStatuses.defeated++;
      } else if (allyRatio > 0.7) {
        allyHealthStatuses.healthy++;
      } else if (allyRatio > 0.3) {
        allyHealthStatuses.injured++;
      } else {
        allyHealthStatuses.critical++;
      }
    });
    
    return {
      combatState: {
        id: combatState.id,
        status: combatState.status,
        round: combatState.round,
        currentTurnIndex: combatState.currentTurnIndex,
        combatLog: combatState.combatLog.slice(-5), // Just the last 5 log entries
        location: combatState.location,
        encounterDifficulty: combatState.encounterDifficulty
      },
      npc,
      availableActions,
      possibleTargets,
      battlefield: {
        terrain: location.terrain || 'normal',
        lighting: location.lighting || 'normal',
        specialFeatures: location.specialFeatures || [],
        environmentalFactors: location.environmentalFactors || []
      },
      npcBehavior: {
        aggression: behavior.aggression || 'aggressive',
        intelligence: behavior.intelligence || 'average',
        tacticalPreference: behavior.tacticalPreference || 'mixed',
        selfPreservation: behavior.selfPreservation || 'medium',
        packTactics: behavior.packTactics || false,
        preferredTargets: behavior.preferredTargets || [],
        avoidedTargets: behavior.avoidedTargets || []
      },
      currentRound: combatState.round,
      npcRelativeHealth: healthStatus,
      allyStatus: {
        count: allies.length,
        healthStatuses: allyHealthStatuses
      }
    };
  }
  
  /**
   * Generate a tactical decision using AI
   */
  private async generateTacticalDecision(context: TacticalContext): Promise<TacticalDecision> {
    // Create a tactical AI prompt template
    const promptTemplate = createPromptTemplate('combat') as CombatPromptTemplate;
    
    // Format the context for the prompt
    const formattedContext = JSON.stringify({
      npc: {
        name: context.npc.name,
        type: context.npc.race,
        healthStatus: context.npcRelativeHealth,
        traits: context.npc.traits || []
      },
      behavior: context.npcBehavior,
      currentRound: context.currentRound,
      availableActions: context.availableActions.map(action => ({
        name: action.name,
        type: action.type,
        description: action.description
      })),
      possibleTargets: context.possibleTargets
        .filter(target => !target.conditions.includes('defeated'))
        .map(target => ({
          name: target.name,
          isPlayer: target.isPlayer,
          healthStatus: `${Math.round((target.currentHealth / target.maxHealth) * 100)}%`,
          threatLevel: target.threatLevel,
          distance: target.distance,
          conditions: target.conditions
        })),
      allyStatus: context.allyStatus,
      battlefield: context.battlefield,
      recentEvents: context.combatState.combatLog
    }, null, 2);
    
    // Create the tactical decision prompt
    const userPrompt = `I need a tactical decision for an NPC in D&D combat.

COMBAT CONTEXT:
${formattedContext}

Decide what action the NPC should take based on their behavior profile, available actions, and the combat situation.
Respond with a JSON object containing:
- actionName: The name of the chosen action
- actionType: The type of action (melee, ranged, spell, special, movement, item)
- targetId: The ID of the target (if applicable)
- reasoning: A brief explanation of the tactical reasoning
- fallbackAction: An alternative action if the primary one can't be executed
- movementIntention: The NPC's movement plan (approach, retreat, flank, hold)

TACTICAL DECISION:`;
    
    const systemPrompt = `You are an expert tactician for a D&D combat system.
Your task is to analyze combat situations and make optimal tactical decisions for NPCs.
Consider the NPC's behavior profile, available actions, current health, ally status, and battlefield conditions.
Base your decision on D&D 5e combat tactics and the specific situation presented.

Guidelines:
- Different enemy types should use different tactics (beasts are direct, intelligent foes are strategic)
- Consider range, positioning, and tactical advantages
- Prioritize targets based on threat level, accessibility, and vulnerability
- Account for self-preservation instincts based on the NPC's profile
- Consider pack tactics when allies are present
- Evaluate battlefield conditions that might create advantages or disadvantages
- Always provide a fallback option in case the primary action can't be executed

Respond ONLY with a valid JSON object containing the requested decision information.`;
    
    try {
      // Call the AI service
      const response = await this.aiService.generateCompletion(
        userPrompt,
        'tactical',
        {
          systemPrompt,
          temperature: 0.4 // Lower temperature for more consistent tactical decisions
        }
      );
      
      // Parse the response to extract the decision
      const decisionText = response.text.trim();
      
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = decisionText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not extract valid JSON from AI response');
      }
      
      const decisionJson = JSON.parse(jsonMatch[0]);
      
      // Validate and return the decision
      return {
        actionName: decisionJson.actionName || 'Attack',
        actionType: decisionJson.actionType || 'melee',
        targetId: decisionJson.targetId,
        reasoning: decisionJson.reasoning || 'Basic attack strategy',
        fallbackAction: decisionJson.fallbackAction,
        fallbackTarget: decisionJson.fallbackTarget,
        movementIntention: decisionJson.movementIntention || 'approach',
        specialConsiderations: decisionJson.specialConsiderations || []
      };
    } catch (error) {
      console.error('Error generating tactical decision:', error);
      throw error;
    }
  }
  
  /**
   * Generate a simple fallback decision when AI fails
   */
  private generateFallbackDecision(
    npc: NPC,
    possibleTargets: any[],
    availableActions: any[]
  ): TacticalDecision {
    // Find player targets that aren't defeated
    const playerTargets = possibleTargets.filter(
      target => target.isPlayer && !target.conditions.includes('defeated')
    );
    
    // If no valid player targets, target any non-defeated enemy
    const validTargets = playerTargets.length > 0 
      ? playerTargets 
      : possibleTargets.filter(target => !target.conditions.includes('defeated'));
    
    // If no valid targets at all, decide to retreat
    if (validTargets.length === 0) {
      return {
        actionName: 'Retreat',
        actionType: 'movement',
        reasoning: 'No valid targets, retreating to safety',
        movementIntention: 'retreat',
        specialConsiderations: ['No valid targets']
      };
    }
    
    // Find a basic attack action
    const attackAction = availableActions.find(action => 
      action.type === 'melee' || action.type === 'ranged'
    );
    
    // Sort targets by threat (highest first)
    validTargets.sort((a, b) => b.threatLevel - a.threatLevel);
    
    // Pick the highest threat target
    const primaryTarget = validTargets[0];
    
    // Pick a secondary target if available
    const secondaryTarget = validTargets.length > 1 ? validTargets[1] : primaryTarget;
    
    if (attackAction) {
      return {
        actionName: attackAction.name,
        actionType: attackAction.type,
        targetId: primaryTarget.id,
        reasoning: `Basic attack strategy targeting highest threat: ${primaryTarget.name}`,
        fallbackAction: 'Attack',
        fallbackTarget: secondaryTarget.id,
        movementIntention: 'approach',
        specialConsiderations: ['Fallback strategy due to AI failure']
      };
    } else {
      // If no attack action, use the first available action
      const action = availableActions[0] || { name: 'Attack', type: 'melee' };
      
      return {
        actionName: action.name,
        actionType: action.type,
        targetId: action.targetRequired ? primaryTarget.id : undefined,
        reasoning: 'Default action with highest threat target',
        fallbackAction: 'Retreat',
        movementIntention: 'approach',
        specialConsiderations: ['Fallback strategy due to AI failure']
      };
    }
  }
}

/**
 * Create a new tactical AI instance
 */
export function createTacticalAI(aiService: AIService, enemyManager: EnemyManager): TacticalAI {
  return new TacticalAI(aiService, enemyManager);
} 