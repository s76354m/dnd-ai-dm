/**
 * Combat Context Manager
 * 
 * Manages context for combat narratives to maintain coherent and exciting
 * combat descriptions across multiple rounds and turns.
 */

import { GameState } from '../../core/interfaces/game';
import { CombatAction, ActionResult, CombatState } from '../../core/interfaces/combat';
import { Character } from '../../core/interfaces/character';
import { NPC } from '../../core/interfaces/npc';

/**
 * Represents a single action in combat
 */
export interface CombatActionRecord {
  round: number;
  turn: number;
  timestamp: Date;
  actor: string;
  actorType: 'player' | 'npc' | 'enemy';
  action: string;
  targets: string[];
  description: string;
  result: string;
}

/**
 * Configuration options for the combat context
 */
export interface CombatContextConfig {
  maxRoundsToTrack: number;
  includeActorDetails: boolean;
  includeEnvironmentalDetails: boolean;
  includePositioning: boolean;
  includeConditionEffects: boolean;
  includeTacticalSuggestions: boolean;
  includeTargetDetails?: boolean;
  tokenBudget?: number;
}

/**
 * Default configuration for combat context
 */
export const DEFAULT_COMBAT_CONFIG: CombatContextConfig = {
  maxRoundsToTrack: 3,
  includeActorDetails: true,
  includeEnvironmentalDetails: true,
  includePositioning: true,
  includeConditionEffects: true,
  includeTacticalSuggestions: false,
  tokenBudget: 1500
};

/**
 * Manages context for coherent combat narratives
 */
export class CombatContext {
  private actionHistory: Map<number, CombatActionRecord[]> = new Map();
  private currentRound: number = 1;
  private config: CombatContextConfig;
  private combatSummary: string = '';
  private environmentDescription: string = '';
  private lastPositionUpdate: Map<string, string> = new Map();
  private conditions: Map<string, string[]> = new Map();
  
  constructor(config: Partial<CombatContextConfig> = {}) {
    this.config = { ...DEFAULT_COMBAT_CONFIG, ...config };
  }
  
  /**
   * Adds a combat action to the context
   */
  public addAction(
    round: number,
    turn: number,
    action: CombatAction,
    result: ActionResult,
    gameState: GameState
  ): void {
    // Create a record of the action
    const record: CombatActionRecord = {
      round,
      turn,
      timestamp: new Date(),
      actor: action.actorId,
      actorType: this.determineActorType(action.actorId, gameState),
      action: action.type,
      targets: action.targetIds,
      description: action.description || '',
      result: this.formatActionResult(result)
    };

    // Store the action in the history
    if (!this.actionHistory.has(round)) {
      this.actionHistory.set(round, []);
    }
    this.actionHistory.get(round)?.push(record);

    // Update the current round if needed
    if (round > this.currentRound) {
      this.currentRound = round;
    }

    // Update positioning and conditions
    this.updatePositioning(action, result);
    this.updateConditions(action, result);
  }
  
  /**
   * Set the environment description for the combat
   * 
   * @param description Description of the combat environment
   */
  public setEnvironment(description: string): void {
    this.environmentDescription = description;
  }
  
  /**
   * Set the combat summary
   * 
   * @param summary Summary of the combat situation
   */
  public setCombatSummary(summary: string): void {
    this.combatSummary = summary;
  }
  
  /**
   * Builds a context string for the current combat state
   */
  public buildContextString(
    round: number,
    turn: number,
    currentAction: CombatAction,
    gameState: GameState
  ): string {
    const contextParts: string[] = [];

    // Add combat summary
    contextParts.push(`Combat Round: ${round}`);
    contextParts.push(`Current Turn: ${turn}`);
    
    if (this.combatSummary) {
      contextParts.push(`Combat Summary: ${this.combatSummary}`);
    }

    // Add environment description if available
    if (this.config.includeEnvironmentalDetails && this.environmentDescription) {
      contextParts.push(`Environment: ${this.environmentDescription}`);
    }

    // Add combatants context
    if (this.config.includeActorDetails) {
      contextParts.push(this.formatCombatantsContext(gameState));
    }

    // Add action history
    contextParts.push(this.formatActionHistoryContext());

    // Add current action context
    contextParts.push(this.formatCurrentActionContext(currentAction));

    // Add positioning context
    if (this.config.includePositioning) {
      contextParts.push(this.formatPositioningContext());
    }

    // Add conditions context
    if (this.config.includeConditionEffects) {
      contextParts.push(this.formatConditionsContext());
    }

    // Add tactical suggestions if enabled
    if (this.config.includeTacticalSuggestions) {
      contextParts.push(this.generateTacticalSuggestions(gameState, currentAction));
    }

    return contextParts.filter(part => part.length > 0).join('\n\n');
  }
  
  /**
   * Format action result as a string
   * 
   * @param result The action result
   * @returns Formatted result string
   */
  private formatActionResult(result: ActionResult): string {
    if (result.success) {
      if (result.damage) {
        return `Hit for ${result.damage} damage.`;
      } else if (result.healing) {
        return `Healed for ${result.healing} hit points.`;
      } else if (result.conditionsApplied?.length) {
        return `Applied: ${result.conditionsApplied.join(', ')}.`;
      } else {
        return 'Succeeded.';
      }
    } else {
      return `Failed${result.reason ? ` (${result.reason})` : ''}.`;
    }
  }
  
  /**
   * Format the combatants context
   * 
   * @param gameState The current game state
   * @returns Formatted combatants context
   */
  private formatCombatantsContext(gameState: GameState): string {
    if (!gameState.combatState) return '';
    
    const combatantsText = gameState.combatState.combatants.map(c => {
      const healthPercentage = Math.floor((c.health.current / c.health.maximum) * 100);
      const healthStatus = healthPercentage > 75 ? 'Healthy' : 
                          healthPercentage > 50 ? 'Injured' :
                          healthPercentage > 25 ? 'Badly wounded' : 'Near death';
      
      return `${c.name} (${c.isPlayer ? 'Player' : 'Enemy'}): ${healthStatus}, ${c.health.current}/${c.health.maximum} HP`;
    }).join('\n');
    
    return `COMBATANTS:\n${combatantsText}`;
  }
  
  /**
   * Format the action history context
   * 
   * @returns Formatted action history
   */
  private formatActionHistoryContext(): string {
    const rounds = [...this.actionHistory.keys()].sort((a, b) => a - b);
    if (rounds.length === 0) return 'COMBAT HISTORY:\nCombat just started.';
    
    const historyText = rounds.map(round => {
      const actions = this.actionHistory.get(round) || [];
      const actionTexts = actions.map(a => 
        `${a.actor} (${a.actorType}): ${a.action} against ${a.targets.join(', ')}. ${a.result}`
      ).join('\n');
      
      return `Round ${round}:\n${actionTexts}`;
    }).join('\n\n');
    
    return `COMBAT HISTORY:\n${historyText}`;
  }
  
  /**
   * Format the current action context
   * 
   * @param action The current action
   * @returns Formatted current action
   */
  private formatCurrentActionContext(action: CombatAction): string {
    return `CURRENT ACTION:
Actor: ${action.actor.name} (${action.actor.isPlayer ? 'Player' : 'Enemy'})
Action: ${action.type}
Targets: ${action.targets.map(t => t.name).join(', ')}
Details: ${action.details || 'No additional details'}`; 
  }
  
  /**
   * Format the positioning context
   * 
   * @returns Formatted positioning context
   */
  private formatPositioningContext(): string {
    const positions = Array.from(this.lastPositionUpdate.entries())
      .map(([name, position]) => `${name}: ${position}`)
      .join('\n');
    
    return `POSITIONING:\n${positions}`;
  }
  
  /**
   * Format the conditions context
   * 
   * @returns Formatted conditions context
   */
  private formatConditionsContext(): string {
    const conditionsText = Array.from(this.conditions.entries())
      .map(([name, conditions]) => `${name}: ${conditions.join(', ')}`)
      .join('\n');
    
    return `CONDITIONS:\n${conditionsText}`;
  }
  
  /**
   * Generate tactical suggestions based on the current state
   * 
   * @param gameState The current game state
   * @param currentAction The current action
   * @returns Tactical suggestions
   */
  private generateTacticalSuggestions(
    gameState: GameState,
    currentAction: CombatAction
  ): string {
    // This would be more sophisticated in a real implementation,
    // potentially using AI to generate the suggestions
    const suggestions = [
      "Consider the terrain and positioning for tactical advantages",
      "Remember that some spells require concentration",
      "Use the environment for cover and tactical advantages",
      "Consider using area-of-effect abilities when enemies are clustered"
    ];
    
    return `TACTICAL NOTES:\n${suggestions.join('\n')}`;
  }
  
  /**
   * Update positioning based on the action and result
   * 
   * @param action The combat action
   * @param result The action result
   */
  private updatePositioning(action: CombatAction, result: ActionResult): void {
    // In a real implementation, this would track actual positions
    // For now, we'll just simulate with general descriptions
    
    if (action.type === 'move') {
      this.lastPositionUpdate.set(
        action.actor.name, 
        action.details || 'has moved to a new position'
      );
    } else if (action.type === 'disengage') {
      this.lastPositionUpdate.set(
        action.actor.name, 
        'has disengaged and moved away'
      );
    } else if (action.type === 'dash') {
      this.lastPositionUpdate.set(
        action.actor.name, 
        'has dashed across the battlefield'
      );
    }
  }
  
  /**
   * Update conditions based on the action and result
   * 
   * @param action The combat action
   * @param result The action result
   */
  private updateConditions(action: CombatAction, result: ActionResult): void {
    // Apply new conditions
    if (result.conditionsApplied && result.conditionsApplied.length > 0) {
      action.targets.forEach(target => {
        const currentConditions = this.conditions.get(target.name) || [];
        const updatedConditions = [
          ...currentConditions,
          ...result.conditionsApplied || []
        ];
        this.conditions.set(target.name, updatedConditions);
      });
    }
    
    // Remove expired conditions
    if (result.conditionsRemoved && result.conditionsRemoved.length > 0) {
      action.targets.forEach(target => {
        const currentConditions = this.conditions.get(target.name) || [];
        const updatedConditions = currentConditions.filter(
          c => !(result.conditionsRemoved || []).includes(c)
        );
        
        if (updatedConditions.length > 0) {
          this.conditions.set(target.name, updatedConditions);
        } else {
          this.conditions.delete(target.name);
        }
      });
    }
  }
  
  /**
   * Get the current configuration
   * 
   * @returns The current configuration
   */
  public getConfig(): CombatContextConfig {
    return { ...this.config };
  }
  
  /**
   * Update the configuration
   * 
   * @param config The new configuration options
   */
  public updateConfig(config: Partial<CombatContextConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Clear the combat history
   */
  public clear(): void {
    this.actionHistory.clear();
    this.currentRound = 1;
    this.combatSummary = '';
    this.lastPositionUpdate.clear();
    this.conditions.clear();
  }
  
  /**
   * Generate a summary of the combat so far
   * 
   * @returns A summary of the combat
   */
  public generateCombatSummary(): string {
    const rounds = [...this.actionHistory.keys()].sort((a, b) => a - b);
    if (rounds.length === 0) return 'Combat has just begun.';
    
    const significantEvents: string[] = [];
    let playerDamageDealt = 0;
    let playerDamageReceived = 0;
    let significantConditions: string[] = [];
    
    // Gather significant events
    rounds.forEach(round => {
      const actions = this.actionHistory.get(round) || [];
      
      actions.forEach(action => {
        // Track damage
        if (action.result.includes('damage')) {
          const damageMatch = action.result.match(/Hit for (\d+) damage/);
          if (damageMatch && damageMatch[1]) {
            const damage = parseInt(damageMatch[1]);
            if (action.actorType === 'player') {
              playerDamageDealt += damage;
            } else {
              playerDamageReceived += damage;
            }
          }
        }
        
        // Track significant conditions
        if (action.result.includes('Applied:')) {
          const conditions = action.result.replace('Applied:', '').trim().split(',');
          significantConditions = [...significantConditions, ...conditions];
        }
        
        // Track critical hits or misses
        if (action.result.includes('Critical hit') || action.result.includes('Critical miss')) {
          significantEvents.push(`${action.actor} ${action.result.toLowerCase()} on ${action.targets.join(', ')}`);
        }
      });
    });
    
    // Generate summary
    const summary = [
      `Combat has lasted ${rounds.length} rounds so far.`,
      `The player has dealt ${playerDamageDealt} damage and received ${playerDamageReceived} damage.`
    ];
    
    if (significantConditions.length > 0) {
      summary.push(`Active conditions in combat: ${[...new Set(significantConditions)].join(', ')}`);
    }
    
    if (significantEvents.length > 0) {
      summary.push(`Notable events: ${significantEvents.join('; ')}`);
    }
    
    return summary.join(' ');
  }

  /**
   * Determines the type of actor (player, npc, or enemy) based on the actorId
   */
  private determineActorType(actorId: string, gameState: GameState): 'player' | 'npc' | 'enemy' {
    if (actorId === gameState.player.id) {
      return 'player';
    }
    
    // Check if the actor is an NPC
    const npc = gameState.npcs.find(npc => npc.id === actorId);
    if (npc) {
      return npc.isHostile ? 'enemy' : 'npc';
    }
    
    // Default to enemy if not found
    return 'enemy';
  }
}

export default CombatContext; 