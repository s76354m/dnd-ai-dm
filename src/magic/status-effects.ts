/**
 * Status Effect System
 * 
 * This file provides the functionality for applying, tracking, and removing
 * status effects/conditions in the D&D AI DM system.
 */

import { v4 as uuidv4 } from 'uuid';
import { ConditionType } from './spell';

/**
 * Interface for status effect durations
 */
export interface EffectDuration {
  type: 'instantaneous' | 'timed' | 'concentration' | 'permanent';
  value?: number;
  unit?: 'round' | 'minute' | 'hour';
  endTrigger?: string; // e.g., "Save at end of turn", "Until target takes damage"
}

/**
 * Interface for status effect saving throws
 */
export interface EffectSave {
  frequency: 'once' | 'startOfTurn' | 'endOfTurn' | 'roundStart' | 'roundEnd';
  abilityType: string;
  dc: number;
  onSuccess: 'removeEffect' | 'reduceDuration' | 'none';
}

/**
 * Interface for a status effect instance applied to a target
 */
export interface StatusEffect {
  id: string;
  name: string;
  type: ConditionType;
  description: string;
  source: string; // Who/what applied this effect
  target: string; // Who is affected
  duration: EffectDuration;
  save?: EffectSave;
  isActive: boolean;
  appliedAt: number; // When the effect was applied (timestamp or round number)
  modifiers?: {
    [stat: string]: number; // Stat modifications: e.g., 'speed': -50 for half speed
  };
  tags: string[]; // Categories like 'magical', 'poison', 'disease', etc.
}

/**
 * Class to manage status effects on characters and NPCs
 */
export class StatusEffectManager {
  private static instance: StatusEffectManager;
  private effects: Map<string, StatusEffect> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): StatusEffectManager {
    if (!StatusEffectManager.instance) {
      StatusEffectManager.instance = new StatusEffectManager();
    }
    return StatusEffectManager.instance;
  }

  /**
   * Apply a new status effect to a target
   */
  public applyEffect(params: {
    name: string;
    type: ConditionType;
    description: string;
    source: string;
    target: string;
    duration: EffectDuration;
    save?: EffectSave;
    modifiers?: { [stat: string]: number };
    tags?: string[];
  }): StatusEffect {
    // Check if similar effect exists and handle stacking rules
    this.handleEffectStacking(params);

    // Create new effect
    const effect: StatusEffect = {
      id: uuidv4(),
      name: params.name,
      type: params.type,
      description: params.description,
      source: params.source,
      target: params.target,
      duration: params.duration,
      save: params.save,
      isActive: true,
      appliedAt: Date.now(), // Use current time as default
      modifiers: params.modifiers || {},
      tags: params.tags || []
    };

    // Add to effect registry
    this.effects.set(effect.id, effect);

    // Log the application
    console.log(`Applied ${effect.name} to ${effect.target}`);

    return effect;
  }

  /**
   * Remove a status effect
   */
  public removeEffect(effectId: string): boolean {
    const effect = this.effects.get(effectId);
    if (!effect) {
      return false;
    }

    effect.isActive = false;
    this.effects.set(effectId, effect);
    
    // Log the removal
    console.log(`Removed ${effect.name} from ${effect.target}`);
    
    return true;
  }

  /**
   * Get all active effects for a target
   */
  public getActiveEffects(targetId: string): StatusEffect[] {
    const activeEffects: StatusEffect[] = [];
    
    this.effects.forEach(effect => {
      if (effect.target === targetId && effect.isActive) {
        activeEffects.push(effect);
      }
    });
    
    return activeEffects;
  }

  /**
   * Process saving throws for effects
   */
  public processSavingThrows(targetId: string, phase: 'startOfTurn' | 'endOfTurn' | 'roundStart' | 'roundEnd'): void {
    const targetEffects = this.getActiveEffects(targetId);
    
    targetEffects.forEach(effect => {
      if (effect.save && effect.save.frequency === phase) {
        // Roll saving throw - simplified for this example
        const rollResult = Math.floor(Math.random() * 20) + 1;
        const success = rollResult >= effect.save.dc;
        
        if (success) {
          if (effect.save.onSuccess === 'removeEffect') {
            this.removeEffect(effect.id);
            console.log(`${targetId} succeeded on save and removed ${effect.name}`);
          } else if (effect.save.onSuccess === 'reduceDuration' && 
                    effect.duration.type === 'timed' && 
                    effect.duration.value) {
            effect.duration.value--;
            if (effect.duration.value <= 0) {
              this.removeEffect(effect.id);
              console.log(`${targetId} succeeded on save, ${effect.name} duration reduced to 0 and removed`);
            } else {
              console.log(`${targetId} succeeded on save, ${effect.name} duration reduced to ${effect.duration.value}`);
            }
          }
        } else {
          console.log(`${targetId} failed save against ${effect.name}`);
        }
      }
    });
  }

  /**
   * Process effect durations at the end of a round
   */
  public processEffectDurations(): void {
    this.effects.forEach(effect => {
      if (!effect.isActive) return;
      
      if (effect.duration.type === 'timed' && effect.duration.value) {
        effect.duration.value--;
        if (effect.duration.value <= 0) {
          this.removeEffect(effect.id);
          console.log(`${effect.name} on ${effect.target} has expired`);
        }
      }
    });
  }

  /**
   * Handle concentration checks when taking damage
   */
  public checkConcentration(characterId: string, damage: number): boolean {
    // Find concentration effects maintained by this character
    const concentrationEffects: StatusEffect[] = [];
    
    this.effects.forEach(effect => {
      if (effect.source === characterId && 
          effect.duration.type === 'concentration' && 
          effect.isActive) {
        concentrationEffects.push(effect);
      }
    });
    
    if (concentrationEffects.length === 0) {
      return true; // No concentration to check
    }
    
    // Calculate DC (10 or half damage, whichever is higher)
    const concentrationDC = Math.max(10, Math.floor(damage / 2));
    
    // Roll concentration check - simplified
    const rollResult = Math.floor(Math.random() * 20) + 1;
    const success = rollResult >= concentrationDC;
    
    if (!success) {
      // End all concentration effects
      concentrationEffects.forEach(effect => {
        this.removeEffect(effect.id);
        console.log(`${characterId} lost concentration on ${effect.name}`);
      });
      return false;
    }
    
    console.log(`${characterId} maintained concentration`);
    return true;
  }

  /**
   * Check if a target has a specific condition
   */
  public hasCondition(targetId: string, condition: ConditionType): boolean {
    const targetEffects = this.getActiveEffects(targetId);
    return targetEffects.some(effect => effect.type === condition);
  }

  /**
   * Get effects of a specific type for a target
   */
  public getEffectsByType(targetId: string, type: ConditionType): StatusEffect[] {
    return this.getActiveEffects(targetId).filter(effect => effect.type === type);
  }

  /**
   * Handle stacking rules for similar effects
   */
  private handleEffectStacking(newEffect: {
    name: string;
    type: ConditionType;
    target: string;
  }): void {
    // Get existing effects of the same type on the target
    const existingEffects = this.getEffectsByType(newEffect.target, newEffect.type);
    
    if (existingEffects.length === 0) {
      return; // No stacking concerns
    }
    
    // Handle based on condition type - simplified version
    switch (newEffect.type) {
      // These conditions typically don't stack, but take the longest duration
      case ConditionType.Stunned:
      case ConditionType.Paralyzed:
      case ConditionType.Restrained:
      case ConditionType.Frightened:
        // For this example, we'll just allow the new effect to be applied
        // In a full implementation, you might compare durations and keep the longer one
        break;
        
      // These could potentially stack in some implementations
      case ConditionType.Poisoned:
        // Could potentially stack effects or take the worst effect
        break;
        
      default:
        // Default behavior is to allow the new effect
        break;
    }
  }
}

/**
 * Create formatted description of a status effect
 */
export function formatEffectDescription(effect: StatusEffect): string {
  let description = `${effect.name}: ${effect.description}`;
  
  // Add duration details
  if (effect.duration.type === 'instantaneous') {
    description += ' (Instantaneous)';
  } else if (effect.duration.type === 'concentration') {
    description += ' (Concentration)';
  } else if (effect.duration.type === 'timed' && effect.duration.value && effect.duration.unit) {
    description += ` (${effect.duration.value} ${effect.duration.unit}${effect.duration.value > 1 ? 's' : ''})`;
  } else if (effect.duration.type === 'permanent') {
    description += ' (Permanent)';
  }
  
  // Add saving throw details
  if (effect.save) {
    description += ` | Save: ${effect.save.abilityType} DC ${effect.save.dc} ${effect.save.frequency}`;
  }
  
  // Add modifier effects
  if (effect.modifiers && Object.keys(effect.modifiers).length > 0) {
    const modifierText = Object.entries(effect.modifiers)
      .map(([stat, value]) => `${stat}: ${value > 0 ? '+' : ''}${value}`)
      .join(', ');
    description += ` | Effects: ${modifierText}`;
  }
  
  return description;
} 