/**
 * Combat Validator
 * 
 * Provides validation functions for combat actions, targets, and other combat-related operations.
 * Used by the CombatManager to ensure valid inputs and improve error handling.
 */

import { CombatParticipant, CombatState, InitiativeEntry, ActionType } from './combat-manager';
import { Character } from '../core/interfaces/character';
import { NPC } from '../core/interfaces/npc';

export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** Error message if validation failed */
  errorMessage?: string;
  /** The validated entity (participant, target, etc.) if found */
  entity?: any;
}

/**
 * Validator for combat-related operations
 */
export class CombatValidator {
  /**
   * Validate that combat is currently active
   */
  public validateActiveCombat(combatState: CombatState | null): ValidationResult {
    if (!combatState) {
      return {
        isValid: false,
        errorMessage: 'No active combat encounter'
      };
    }
    
    if (combatState.status !== 'active') {
      return {
        isValid: false,
        errorMessage: `Combat is not active (current status: ${combatState.status})`
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Validate a participant in combat
   */
  public validateParticipant(
    participantId: string,
    combatState: CombatState
  ): ValidationResult {
    if (!participantId) {
      return {
        isValid: false,
        errorMessage: 'No participant ID provided'
      };
    }
    
    const participantEntry = combatState.initiativeOrder.find(
      entry => entry.participant.id === participantId
    );
    
    if (!participantEntry) {
      return {
        isValid: false,
        errorMessage: `Participant with ID ${participantId} not found in combat`
      };
    }
    
    return {
      isValid: true,
      entity: participantEntry
    };
  }
  
  /**
   * Validate that it's the participant's turn
   */
  public validateParticipantTurn(
    participantId: string,
    combatState: CombatState
  ): ValidationResult {
    const participantResult = this.validateParticipant(participantId, combatState);
    if (!participantResult.isValid) {
      return participantResult;
    }
    
    const currentTurnEntry = combatState.initiativeOrder[combatState.currentTurnIndex];
    if (currentTurnEntry.participant.id !== participantId) {
      return {
        isValid: false,
        errorMessage: `It's not ${participantResult.entity.participant.name}'s turn`
      };
    }
    
    return {
      isValid: true,
      entity: currentTurnEntry
    };
  }
  
  /**
   * Validate a combat target
   */
  public validateTarget(
    targetId: string,
    combatState: CombatState
  ): ValidationResult {
    if (!targetId) {
      return {
        isValid: false,
        errorMessage: 'No target ID provided'
      };
    }
    
    const targetEntry = combatState.initiativeOrder.find(
      entry => entry.participant.id === targetId
    );
    
    if (!targetEntry) {
      return {
        isValid: false,
        errorMessage: `Target with ID ${targetId} not found in combat`
      };
    }
    
    // Check if target is defeated or dead
    if (targetEntry.conditions.includes('defeated') || 
        targetEntry.conditions.includes('dead')) {
      return {
        isValid: false,
        errorMessage: `${targetEntry.participant.name} is already defeated and cannot be targeted`
      };
    }
    
    return {
      isValid: true,
      entity: targetEntry
    };
  }
  
  /**
   * Validate that an action is available for a participant
   */
  public validateAction(
    participantEntry: InitiativeEntry,
    actionType: ActionType
  ): ValidationResult {
    // Check if the participant has the required resource for the action
    switch (actionType) {
      case ActionType.Attack:
      case ActionType.Cast:
      case ActionType.Dash:
      case ActionType.Disengage:
      case ActionType.Dodge:
      case ActionType.Help:
      case ActionType.Hide:
      case ActionType.Ready:
      case ActionType.Search:
      case ActionType.UseItem:
      case ActionType.UseFeature:
        if (!participantEntry.hasAction) {
          return {
            isValid: false,
            errorMessage: `${participantEntry.participant.name} has already used their action this turn`
          };
        }
        break;
    }
    
    // For spellcasting, validate the participant can cast spells
    if (actionType === ActionType.Cast) {
      if (participantEntry.isPlayer) {
        const player = participantEntry.participant as Character;
        if (!player.spells || player.spells.length === 0) {
          return {
            isValid: false,
            errorMessage: `${player.name} doesn't have any spells available`
          };
        }
      } else {
        const npc = participantEntry.participant as NPC;
        // Assuming NPCs have their spellcasting ability determined elsewhere
        // This is a simplified check that could be expanded
        if (!npc.spellcasting) {
          return {
            isValid: false,
            errorMessage: `${npc.name} can't cast spells`
          };
        }
      }
    }
    
    return { isValid: true };
  }
  
  /**
   * Validate a specific attack
   */
  public validateAttack(
    attackerEntry: InitiativeEntry,
    targetEntry: InitiativeEntry,
    attackName?: string
  ): ValidationResult {
    // Basic validation that attacker can perform an attack
    const actionResult = this.validateAction(attackerEntry, ActionType.Attack);
    if (!actionResult.isValid) {
      return actionResult;
    }
    
    // If a specific attack was specified, validate it exists
    if (attackName) {
      if (attackerEntry.isPlayer) {
        const player = attackerEntry.participant as Character;
        // Check if the player has the specified weapon equipped
        const weaponExists = player.equipment?.some(item => 
          item.isEquipped && 
          item.properties.includes('weapon') && 
          item.name.toLowerCase().includes(attackName.toLowerCase())
        );
        
        if (!weaponExists) {
          return {
            isValid: false,
            errorMessage: `${player.name} doesn't have ${attackName} equipped`
          };
        }
      } else {
        const npc = attackerEntry.participant as NPC;
        // For NPCs, check if they have the specified attack
        // This would need to interface with the actual monster actions system
        // This is a simplified placeholder
        const hasAttack = true; // Replace with actual check
        
        if (!hasAttack) {
          return {
            isValid: false,
            errorMessage: `${npc.name} doesn't have ${attackName} ability`
          };
        }
      }
    }
    
    return { isValid: true };
  }
  
  /**
   * Validate a spell for casting
   */
  public validateSpell(
    casterEntry: InitiativeEntry,
    spellName: string,
    level: number,
    targetIds: string[],
    combatState: CombatState
  ): ValidationResult {
    // Basic validation that caster can cast spells
    const actionResult = this.validateAction(casterEntry, ActionType.Cast);
    if (!actionResult.isValid) {
      return actionResult;
    }
    
    // Check if caster has the spell
    let hasSpell = false;
    let spellData: any = null;
    
    if (casterEntry.isPlayer) {
      const player = casterEntry.participant as Character;
      
      if (!player.spells) {
        return {
          isValid: false,
          errorMessage: `${player.name} doesn't have any spells`
        };
      }
      
      const spell = player.spells.find(s => 
        s.name.toLowerCase() === spellName.toLowerCase()
      );
      
      if (spell) {
        hasSpell = true;
        spellData = spell;
      }
    } else {
      // For NPCs, check their spellcasting abilities
      // This is a simplified placeholder
      const npc = casterEntry.participant as NPC;
      hasSpell = true; // Replace with actual check
    }
    
    if (!hasSpell) {
      return {
        isValid: false,
        errorMessage: `${casterEntry.participant.name} doesn't know the spell ${spellName}`
      };
    }
    
    // Validate spell level
    if (level < 0 || level > 9) {
      return {
        isValid: false,
        errorMessage: `Invalid spell level: ${level} (must be between 0 and 9)`
      };
    }
    
    // Validate targets
    if (targetIds && targetIds.length > 0) {
      // Check that all targets are valid
      for (const targetId of targetIds) {
        const targetResult = this.validateTarget(targetId, combatState);
        if (!targetResult.isValid) {
          return targetResult;
        }
      }
      
      // Additional spell-specific target validation could be added here
      // For example, some spells might require a single target, others multiple targets
    }
    
    return { isValid: true, entity: spellData };
  }
  
  /**
   * Validate an item for use in combat
   */
  public validateItem(
    userEntry: InitiativeEntry,
    itemId: string,
    targetId: string | undefined,
    combatState: CombatState
  ): ValidationResult {
    // Basic validation that user can use items
    const actionResult = this.validateAction(userEntry, ActionType.UseItem);
    if (!actionResult.isValid) {
      return actionResult;
    }
    
    // Check if user has the item
    let hasItem = false;
    let itemData: any = null;
    
    if (userEntry.isPlayer) {
      const player = userEntry.participant as Character;
      
      if (!player.inventory || !player.inventory.items) {
        return {
          isValid: false,
          errorMessage: `${player.name} doesn't have any items`
        };
      }
      
      const item = player.inventory.items.find(i => i.id === itemId);
      
      if (item) {
        hasItem = true;
        itemData = item;
        
        // Check if item is usable in combat
        if (!item.properties || !item.properties.includes('usable')) {
          return {
            isValid: false,
            errorMessage: `${item.name} cannot be used in combat`
          };
        }
      }
    } else {
      // For NPCs, check their inventory
      // This is a simplified placeholder
      const npc = userEntry.participant as NPC;
      hasItem = true; // Replace with actual check
    }
    
    if (!hasItem) {
      return {
        isValid: false,
        errorMessage: `${userEntry.participant.name} doesn't have that item`
      };
    }
    
    // If item requires a target, validate the target
    if (targetId) {
      const targetResult = this.validateTarget(targetId, combatState);
      if (!targetResult.isValid) {
        return targetResult;
      }
    }
    
    return { isValid: true, entity: itemData };
  }
  
  /**
   * Validate movement in combat
   */
  public validateMovement(
    participantEntry: InitiativeEntry,
    distance: number
  ): ValidationResult {
    if (!participantEntry.hasMovement) {
      return {
        isValid: false,
        errorMessage: `${participantEntry.participant.name} has already used their movement this turn`
      };
    }
    
    // Check if distance is valid
    if (distance <= 0) {
      return {
        isValid: false,
        errorMessage: `Movement distance must be positive`
      };
    }
    
    const maxSpeed = participantEntry.isPlayer
      ? (participantEntry.participant as Character).speed
      : (participantEntry.participant as NPC).stats.speed || 30;
    
    if (distance > maxSpeed) {
      return {
        isValid: false,
        errorMessage: `Movement distance (${distance}) exceeds speed (${maxSpeed})`
      };
    }
    
    return { isValid: true };
  }
} 