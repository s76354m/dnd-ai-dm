/**
 * Command Processor
 * 
 * Processes player commands and converts them into game actions.
 * This file handles parsing and executing commands entered by the player.
 */

import { GameState } from './interfaces/game';
import { gameStateManager } from '../core/state';
import { Character, AbilityScores } from './interfaces/character';
import { CombatManager } from '../combat';
import { GameEvent } from './interfaces/events';
import { CommandValidator, ValidationResult } from './command-validator';
import { saveManager, SaveMetadata } from '../persistence/save-manager';
import { EnemyManager } from '../combat/enemy-manager';
import { SpellEffectManager } from '../combat/spell-effects';
import { SpellcastingManager } from '../character/spellcasting-manager';
import { ItemUsageManager } from '../character/item-usage-manager';
import { InventoryManager } from '../character/inventory';
import { NPC, NPCAttitude } from './interfaces/npc';
import { CombatState } from './interfaces/combat';
import { AIService } from '../dm/ai-service';
import { Location } from './interfaces/location';
import { Quest } from './interfaces/quest';
import { Item, ItemCategory } from './interfaces/item';

/**
 * Interface for command results
 */
export interface CommandResult {
  /** Message to display to the player */
  message: string;
  /** Changes to apply to the game state */
  stateChanges?: Partial<GameState>;
  /** Events triggered by this command */
  triggeredEvents?: GameEvent[];
  /** Whether this action should trigger a game state save */
  shouldSave?: boolean;
}

/**
 * Command Processor class for handling player input
 */
export class CommandProcessor {
  private gameState: GameState;
  private combatManager: CombatManager | null = null;
  private validator: CommandValidator;

  /**
   * Create a new command processor
   * @param gameState Current game state
   */
  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.validator = new CommandValidator(gameState);

    // Initialize combat manager if in combat
    if (gameState.combatState?.active) {
      this.initializeCombatManager();
    }
  }

  /**
   * Initialize the combat manager with required dependencies
   */
  private initializeCombatManager(): void {
    // Create required managers
    const enemyManager = new EnemyManager();
    const spellEffectManager = new SpellEffectManager();
    const spellcastingManager = new SpellcastingManager(spellEffectManager);
    const inventoryManager = new InventoryManager();
    const itemUsageManager = new ItemUsageManager(inventoryManager);
    
    // Create a placeholder AI service
    const aiService = {} as AIService;
    
    this.combatManager = new CombatManager(
      enemyManager,
      spellEffectManager,
      spellcastingManager,
      itemUsageManager,
      aiService
    );
  }

  /**
   * Process a command string entered by the player
   * @param commandStr The command string to process
   * @returns A command result with message and any state changes
   */
  async processCommand(commandStr: string | undefined | null): Promise<CommandResult> {
    // Handle undefined or null input
    if (commandStr === undefined || commandStr === null) {
      return { message: "Please enter a command." };
    }
    
    // Trim the command and convert to lowercase
    const input = commandStr.trim().toLowerCase();
    
    // Skip empty commands
    if (!input) {
      return { message: "Please enter a command. Type 'help' for a list of available commands." };
    }

    // Check if we're in combat
    if (this.gameState.combatState?.active) {
      return this.processCombatCommand(input);
    }

    // Extract the command and arguments
    const parts = input.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1).join(' ').trim(); // Ensure args are trimmed
    
    // Process the command based on the first word
    switch (command) {
      case 'look':
      case 'examine':
      case 'x':
      case 'l':
        return this.handleLook(args);
      
      case 'go':
      case 'move':
      case 'walk':
      case 'north':
      case 'south':
      case 'east':
      case 'west':
      case 'up':
      case 'down':
      case 'n':
      case 's':
      case 'e':
      case 'w':
      case 'u':
      case 'd':
        // If command is a direction, use that as the argument
        const arg = (command === 'go' || command === 'move' || command === 'walk') ? args : command;
        return this.handleMove(arg);
      
      case 'talk':
      case 'speak':
        return this.handleTalk(args);
      
      case 'attack':
      case 'fight':
        return this.handleAttack(args);
      
      case 'inventory':
      case 'items':
      case 'i':
        return this.handleInventory();
      
      case 'take':
      case 'get':
      case 'pickup':
        return this.handleTake(args);
      
      case 'drop':
        return this.handleDrop(args);
      
      case 'use':
        return this.handleUse(args);
      
      case 'equip':
        return this.handleEquip(args);
      
      case 'unequip':
        return this.handleUnequip(args);
      
      case 'stats':
      case 'character':
        return this.handleStats();
      
      case 'rest':
      case 'sleep':
        return this.handleRest();
      
      case 'quests':
      case 'journal':
        return this.handleQuests();
      
      case 'help':
      case '?':
        return this.handleHelp();
      
      case 'save':
        return this.handleSave(args);
      
      case 'load':
        return this.handleLoad(args);
      
      case 'saves':
      case 'listsaves':
        return this.handleListSaves(args);
      
      case 'delete':
      case 'deletesave':
        return this.handleDeleteSave(args);
      
      case 'exit':
      case 'quit':
        return { message: "Exiting game..." };
      
      // Default case for unrecognized commands
      default:
        // Check if this might be an abbreviated or misspelled command
        const suggestions = this.getSimilarCommandSuggestions(command);
        if (suggestions.length > 0) {
          return { 
            message: `Unknown command '${command}'. Did you mean: ${suggestions.join(', ')}?` 
          };
        }
        
        return { 
          message: `Unknown command '${command}'. Type 'help' for a list of available commands.` 
        };
    }
  }

  /**
   * Process a combat command
   * @param input The command string
   * @returns Command result
   */
  private processCombatCommand(input: string): CommandResult {
    // Ensure combat manager is initialized
    if (!this.combatManager) {
      this.initializeCombatManager();
    }

    // Check if it's the player's turn
    const combatState = this.gameState.combatState!;
    const currentTurn = combatState.currentTurn;
    const activeParticipant = combatState.initiativeOrder[currentTurn];
    
    if (!activeParticipant.combatant || !('isPlayer' in activeParticipant.combatant) || !activeParticipant.combatant.isPlayer) {
      return {
        message: `It's ${activeParticipant.combatant.name}'s turn, not yours.`
      };
    }

    // Process the combat command
    const parts = input.split(' ');
    const command = parts[0];
    const args = parts.slice(1).join(' ');

    switch (command) {
      case 'attack':
        return this.handleCombatAttack(args);
      
      case 'cast':
        return this.handleCombatCast(args);
      
      case 'use':
        return this.handleCombatUseItem(args);
      
      case 'dodge':
        return this.handleCombatDodge();
      
      case 'disengage':
        return this.handleCombatDisengage();
      
      case 'help':
        return {
          message: `
Combat Commands:
  attack [target] - Attack a target
  cast [spell] at [target] - Cast a spell at a target
  use [item] - Use an item
  dodge - Take the dodge action
  disengage - Take the disengage action
  help - Show this help message
          `.trim()
        };
      
      default:
        return {
          message: "Invalid combat command. Try 'help' for a list of commands."
        };
    }
  }

  /**
   * Handle combat attack command
   * @param args The target to attack
   * @returns Command result
   */
  private handleCombatAttack(args: string): CommandResult {
    // Implementation will be added later
    return {
      message: "Combat attack not yet implemented."
    };
  }

  /**
   * Handle combat cast spell command
   * @param args The spell and target
   * @returns Command result
   */
  private handleCombatCast(args: string): CommandResult {
    // Implementation will be added later
    return {
      message: "Combat spell casting not yet implemented."
    };
  }

  /**
   * Handle combat use item command
   * @param args The item to use
   * @returns Command result
   */
  private handleCombatUseItem(args: string): CommandResult {
    // Implementation will be added later
    return {
      message: "Combat item usage not yet implemented."
    };
  }

  /**
   * Handle combat dodge command
   * @returns Command result
   */
  private handleCombatDodge(): CommandResult {
    // Implementation will be added later
    return {
      message: "Combat dodge not yet implemented."
    };
  }

  /**
   * Handle combat disengage command
   * @returns Command result
   */
  private handleCombatDisengage(): CommandResult {
    // Implementation will be added later
    return {
      message: "Combat disengage not yet implemented."
    };
  }

  /**
   * Handle the 'look' command
   * @param args The arguments for the look command
   * @returns Command result
   */
  private handleLook(target?: string): CommandResult {
    // If no target specified, describe the current location
    if (!target) {
      const location = this.gameState.currentLocation;
      
      const description = [
        location.description,
        this.getExitsDescription(location),
        this.getNPCsDescription(location),
        this.getObjectsDescription(location)
      ].filter(Boolean).join('\n\n');
      
      return {
        message: description
      };
    }
    
    // Validate and find the target object
    const objectValidation = this.validator.validateLocationObject(target);
    
    // If we found an object, describe it
    if (objectValidation.isValid && objectValidation.entity) {
      const object = objectValidation.entity;
      return {
        message: object.description || `You see a ${object.name}.`
      };
    }
    
    // Check if it's an NPC
    const npcValidation = this.validator.validateNPC(target);
    
    if (npcValidation.isValid && npcValidation.entity) {
      const npc = npcValidation.entity;
      return {
        message: npc.description || `You see ${npc.name}.`
      };
    }
    
    // If not an object or NPC, return the validation error message
    return {
      message: objectValidation.errorMessage || `You don't see anything like that here.`
    };
  }

  /**
   * Handle movement commands
   * @param direction Direction to move
   * @returns Command result
   */
  private handleMove(direction?: string): CommandResult {
    // Validate the direction
    const validation = this.validator.validateExit(direction);
    
    if (!validation.isValid) {
      return {
        message: validation.errorMessage || "Which direction do you want to go?"
      };
    }
    
    const exit = validation.entity;
    const currentLocation = this.gameState.currentLocation;
    
    // Get the target location
    const targetLocation = this.gameState.locations?.get(exit.locationId);
    
    if (!targetLocation) {
      return {
        message: `Error: Cannot find the destination location (ID: ${exit.locationId}). Please report this issue.`
      };
    }
    
    // Mark the location as discovered
    targetLocation.isDiscovered = true;
    
    // Create a map with the updated location
    const updatedLocations = new Map(this.gameState.locations);
    updatedLocations.set(targetLocation.id, targetLocation);
    
    // Return the result with state changes
    return {
      message: `You move ${direction} to ${targetLocation.name}.\n\n${targetLocation.description}`,
      stateChanges: {
        currentLocation: targetLocation,
        locations: updatedLocations
      },
      triggeredEvents: [{
        type: 'PLAYER_MOVED',
        timestamp: Date.now(),
        description: `Player moved from ${currentLocation.name} to ${targetLocation.name}`,
        data: {
          fromLocationId: currentLocation.id,
          toLocationId: targetLocation.id,
          direction: direction
        }
      }],
      shouldSave: true
    };
  }

  /**
   * Handle talking to NPCs
   * @param target The NPC to talk to
   * @returns Command result
   */
  private handleTalk(target: string): CommandResult {
    if (!target) {
      return {
        message: "Talk to whom?"
      };
    }
    
    const npc = this.findNPCByName(target);
    
    if (!npc) {
      return {
        message: `There's no '${target}' here to talk to.`
      };
    }
    
    // If the NPC is hostile, they won't talk
    if (npc.attitude === NPCAttitude.Hostile) {
      return {
        message: `${npc.name} is hostile and won't talk to you!`,
        triggeredEvents: [{
          type: 'COMBAT_INITIATED',
          timestamp: Date.now(),
          description: `Combat initiated with ${npc.name} due to hostility`,
          data: {
            npcId: npc.id,
            reason: 'hostility'
          }
        }]
      };
    }
    
    // Get the NPC's greeting
    const greeting = npc.dialogue?.greeting || `${npc.name} doesn't seem interested in talking.`;
    
    // Get available topics
    let topicsMessage = '';
    if (npc.dialogue?.topics && npc.dialogue.topics.size > 0) {
      topicsMessage = '\n\nYou can ask about: ' + Array.from(npc.dialogue.topics.keys()).join(', ');
    }
    
    return {
      message: `${npc.name}: "${greeting}"${topicsMessage}`,
      triggeredEvents: [{
        type: 'PLAYER_TALKED_TO_NPC',
        timestamp: Date.now(),
        description: `Player talked to ${npc.name}`,
        data: { npcId: npc.id }
      }]
    };
  }

  /**
   * Handle attacking a target to initiate combat
   * @param target The target to attack
   * @returns Command result
   */
  private handleAttack(target: string): CommandResult {
    if (!target) {
      return {
        message: "Attack what? Specify a target."
      };
    }
    
    // Check if the target is an NPC in the current location
    const npc = this.findNPCByName(target);
    
    if (!npc) {
      return {
        message: `There's no '${target}' here to attack.`
      };
    }
    
    // Initialize combat manager if not already initialized
    if (!this.combatManager) {
      this.initializeCombatManager();
    }
    
    // Start combat with the NPC
    const player = this.gameState.player;
    const enemies = [npc];
    const location = this.gameState.currentLocation.id;
    
    try {
      // Create a new combat state
      const newCombatState: CombatState = {
        active: true,
        initiativeOrder: [
          { combatant: player, initiative: this.rollInitiative(player) },
          { combatant: npc, initiative: this.rollInitiative(npc) }
        ],
        currentTurn: 0,
        round: 1,
        playerCharacters: [player],
        hostileNPCs: [npc],
        alliedNPCs: [],
        environmentalEffects: [],
        log: []
      };
      
      // Sort initiative order
      newCombatState.initiativeOrder.sort((a, b) => b.initiative - a.initiative);
      
      // Set current turn to the first participant
      newCombatState.currentTurn = 0;
      
      // Generate initiative order message
      const initiativeMessage = newCombatState.initiativeOrder
        .map(entry => `${entry.combatant.name}: ${entry.initiative}`)
        .join('\n');
      
      // Update game state with combat state
      this.gameState.combatState = newCombatState;
      this.gameState.inCombat = true;
      
      return {
        message: `You attack ${npc.name}! Combat begins!\n\nInitiative order:\n${initiativeMessage}\n\n${this.getCombatStatusMessage()}`,
        stateChanges: {
          combatState: newCombatState,
          inCombat: true
        },
        triggeredEvents: [{
          type: 'COMBAT_INITIATED',
          timestamp: Date.now(),
          description: `Player initiated combat with ${npc.name}`,
          data: {
            npcId: npc.id,
            reason: 'player_attack'
          }
        }],
        shouldSave: true
      };
    } catch (error: any) {
      console.error("Error starting combat:", error);
      return {
        message: `Error starting combat: ${error.message || "Unknown error"}`
      };
    }
  }
  
  /**
   * Roll initiative for a combatant
   * @param combatant The combatant to roll initiative for
   * @returns The initiative roll
   */
  private rollInitiative(combatant: Character | NPC): number {
    // Roll a d20
    const roll = Math.floor(Math.random() * 20) + 1;
    
    // Add dexterity modifier
    let modifier = 0;
    
    if ('abilityScores' in combatant && combatant.abilityScores?.dexterity) {
      // Access the modifier directly or calculate it from the value
      if (typeof combatant.abilityScores.dexterity === 'number') {
        modifier = Math.floor((combatant.abilityScores.dexterity - 10) / 2);
      } else if (combatant.abilityScores.dexterity.modifier !== undefined) {
        modifier = combatant.abilityScores.dexterity.modifier;
      } else if (combatant.abilityScores.dexterity.score !== undefined) {
        modifier = Math.floor((combatant.abilityScores.dexterity.score - 10) / 2);
      }
    } else if ('abilities' in combatant && combatant.abilities?.dexterity) {
      // Access the modifier directly or calculate it from the value
      if (typeof combatant.abilities.dexterity === 'number') {
        modifier = Math.floor((combatant.abilities.dexterity - 10) / 2);
      } else if (combatant.abilities.dexterity.modifier !== undefined) {
        modifier = combatant.abilities.dexterity.modifier;
      } else if (combatant.abilities.dexterity.score !== undefined) {
        modifier = Math.floor((combatant.abilities.dexterity.score - 10) / 2);
      }
    }
    
    return roll + modifier;
  }
  
  /**
   * Get a message describing the current combat status
   * @returns A string describing the current combat status
   */
  private getCombatStatusMessage(): string {
    if (!this.gameState.combatState?.active) {
      return "Not in combat.";
    }
    
    const currentTurn = this.gameState.combatState.currentTurn;
    const initiativeOrder = this.gameState.combatState.initiativeOrder;
    
    if (currentTurn < 0 || currentTurn >= initiativeOrder.length) {
      return "Error: Invalid current turn index.";
    }
    
    const activeParticipant = initiativeOrder[currentTurn].combatant;
    
    if ('isPlayer' in activeParticipant && activeParticipant.isPlayer) {
      return `It's your turn! What would you like to do?`;
    } else {
      return `It's ${activeParticipant.name}'s turn.`;
    }
  }
  
  /**
   * Handle inventory command
   * @returns Command result
   */
  private handleInventory(): CommandResult {
    const inventory = this.gameState.player.inventory;
    
    if (!inventory.items || inventory.items.length === 0) {
      return {
        message: "Your inventory is empty."
      };
    }
    
    let message = "Inventory:\n";
    
    // Group items by category instead of type
    const equipment = inventory.items.filter(item => item.category === ItemCategory.Weapon || 
                                                    item.category === ItemCategory.Armor || 
                                                    item.category === ItemCategory.Shield);
    const consumables = inventory.items.filter(item => item.category === ItemCategory.Consumable || 
                                                      item.category === ItemCategory.Potion);
    const questItems = inventory.items.filter(item => item.category === ItemCategory.QuestItem);
    const miscItems = inventory.items.filter(item => ![ItemCategory.Weapon, ItemCategory.Armor, 
                                                     ItemCategory.Shield, ItemCategory.Consumable, 
                                                     ItemCategory.Potion, ItemCategory.QuestItem]
                                                     .includes(item.category));
    
    // Add equipped items
    if (equipment.length > 0) {
      message += "\nEquipment:";
      equipment.forEach(item => {
        const equippedStatus = item.equipped ? " (equipped)" : "";
        message += `\n- ${item.name}${equippedStatus}`;
      });
    }
    
    // Add consumables with quantity check
    if (consumables.length > 0) {
      message += "\n\nConsumables:";
      consumables.forEach(item => {
        const quantityText = item.uses !== undefined ? ` (${item.uses} uses)` : "";
        message += `\n- ${item.name}${quantityText}`;
      });
    }
    
    // Add quest items
    if (questItems.length > 0) {
      message += "\n\nQuest Items:";
      questItems.forEach(item => {
        message += `\n- ${item.name}`;
      });
    }
    
    // Add miscellaneous items
    if (miscItems.length > 0) {
      message += "\n\nMiscellaneous:";
      miscItems.forEach(item => {
        const quantityText = item.uses !== undefined ? ` (${item.uses} uses)` : "";
        message += `\n- ${item.name}${quantityText}`;
      });
    }
    
    // Add money
    message += `\n\nMoney: ${inventory.gold} gold`;
    
    return {
      message,
      triggeredEvents: [{
        type: 'PLAYER_CHECKED_INVENTORY',
        timestamp: Date.now(),
        description: 'Player checked their inventory',
        data: {}
      }]
    };
  }

  /**
   * Handle taking items
   * @param itemName The item to take
   * @returns Command result
   */
  private handleTake(itemName?: string): CommandResult {
    // Validate the item parameter
    const validation = this.validator.validateLocationObject(itemName);
    
    if (!validation.isValid) {
      return {
        message: validation.errorMessage || "What do you want to take?"
      };
    }
    
    const object = validation.entity;
    
    // Check if the object can be taken
    if (!object.canTake) {
      return {
        message: `You can't take the ${object.name}.`
      };
    }
    
    // Add the item to the player's inventory
    const playerInventory = {...this.gameState.player.inventory};
    
    // Check if the player already has this item
    const existingItemIndex = playerInventory.items.findIndex(item => item.id === object.id);
    
    if (existingItemIndex !== -1) {
      // Increment the uses if it's a consumable
      if (playerInventory.items[existingItemIndex].category === ItemCategory.Consumable) {
        playerInventory.items[existingItemIndex].uses = 
          (playerInventory.items[existingItemIndex].uses || 1) + 1;
      }
    } else {
      // Add the item
      playerInventory.items.push({
        id: object.id,
        name: object.name,
        description: object.description || `A ${object.name}.`,
        weight: object.weight || 1,
        value: object.value || 0,
        category: object.category || ItemCategory.Misc,
        uses: object.category === ItemCategory.Consumable ? 1 : undefined
      });
    }
    
    // Remove the object from the location
    const currentLocation = {...this.gameState.currentLocation};
    if (currentLocation.objectsPresent) {
      currentLocation.objectsPresent = currentLocation.objectsPresent.filter(id => id !== object.id);
    }
    
    // Update the player character
    const player = {...this.gameState.player};
    player.inventory = playerInventory;
    
    return {
      message: `You take the ${object.name}.`,
      stateChanges: {
        player,
        currentLocation
      },
      shouldSave: true
    };
  }

  /**
   * Handle dropping items
   * @param itemName The item to drop
   * @returns Command result
   */
  private handleDrop(itemName: string): CommandResult {
    if (!itemName) {
      return {
        message: "Drop what?"
      };
    }
    
    // Find the item in the player's inventory
    const inventory = this.gameState.player.inventory;
    const itemIndex = inventory.items.findIndex(item => 
      item.name.toLowerCase() === itemName.toLowerCase()
    );
    
    if (itemIndex === -1) {
      return {
        message: `You don't have a ${itemName} in your inventory.`
      };
    }
    
    const item = inventory.items[itemIndex];
    
    // Check if the item is equipped
    if (item.equipped) {
      return {
        message: `You need to unequip the ${item.name} first.`
      };
    }
    
    // Remove one of the item from inventory
    const playerInventory = {...inventory};
    
    if (item.uses && item.uses > 1) {
      // Decrement uses
      playerInventory.items[itemIndex].uses = item.uses - 1;
    } else {
      // Remove the item
      playerInventory.items.splice(itemIndex, 1);
    }
    
    // Add the object to the location
    const currentLocation = {...this.gameState.currentLocation};
    if (!currentLocation.objectsPresent) {
      currentLocation.objectsPresent = [];
    }
    currentLocation.objectsPresent.push(item.id);
    
    // Update the player character
    const player = {...this.gameState.player};
    player.inventory = playerInventory;
    
    return {
      message: `You drop the ${item.name}.`,
      stateChanges: {
        player,
        currentLocation
      },
      triggeredEvents: [{
        type: 'PLAYER_DROPPED_ITEM',
        timestamp: Date.now(),
        description: `Player dropped ${item.name}`,
        data: { itemId: item.id }
      }],
      shouldSave: true
    };
  }

  /**
   * Handle using items
   * @param itemName The item to use
   * @returns Command result
   */
  private handleUse(itemName: string): CommandResult {
    if (!itemName) {
      return {
        message: "Use what?"
      };
    }
    
    // Find the item in the player's inventory
    const inventory = this.gameState.player.inventory;
    const itemIndex = inventory.items.findIndex(item => 
      item.name.toLowerCase().includes(itemName.toLowerCase())
    );
    
    if (itemIndex === -1) {
      return {
        message: `You don't have a ${itemName} in your inventory.`
      };
    }
    
    const item = inventory.items[itemIndex];
    
    // Check if the item can be used
    if (item.category !== ItemCategory.Consumable && !item.effects?.length) {
      return {
        message: `You can't use the ${item.name} like that.`
      };
    }
    
    // Handle consumable items
    if (item.category === ItemCategory.Consumable || item.category === ItemCategory.Potion) {
      // Process the effect of using the item
      let effectMessage = `You use the ${item.name}.`;
      let stateChanges: Partial<GameState> = {};
      
      // Apply healing effects if they exist
      if (item.effects?.some(effect => effect.type === 'healing')) {
        const player = {...this.gameState.player};
        const healingEffect = item.effects.find(effect => effect.type === 'healing');
        const healAmount = healingEffect ? parseInt(healingEffect.description) || 0 : 0;
        
        if (healAmount > 0) {
          // Calculate new hit points
          const newHitPoints = Math.min(
            player.hitPoints.current + healAmount,
            player.hitPoints.maximum
          );
          
          // Update player hit points
          player.hitPoints = {
            ...player.hitPoints,
            current: newHitPoints
          };
          
          effectMessage += ` You heal for ${healAmount} hit points.`;
          stateChanges.player = player;
        }
      }
      
      // Remove one use of the item
      const playerInventory = {...inventory};
      
      if (item.uses && item.uses > 1) {
        // Decrement uses
        playerInventory.items[itemIndex].uses = item.uses - 1;
      } else {
        // Remove the item
        playerInventory.items.splice(itemIndex, 1);
      }
      
      // Update the player character
      const player = stateChanges.player || {...this.gameState.player};
      player.inventory = playerInventory;
      stateChanges.player = player;
      
      return {
        message: effectMessage,
        stateChanges,
        triggeredEvents: [{
          type: 'PLAYER_USED_ITEM',
          timestamp: Date.now(),
          description: `Player used ${item.name}`,
          data: { itemId: item.id }
        }],
        shouldSave: true
      };
    }
    
    // Handle equipment with effects
    if (item.effects && item.effects.length > 0) {
      let effectMessage = `You use the ${item.name}.`;
      
      // Process each effect
      item.effects.forEach(effect => {
        effectMessage += ` ${effect.description}`;
      });
      
      return {
        message: effectMessage,
        triggeredEvents: [{
          type: 'PLAYER_USED_ITEM',
          timestamp: Date.now(),
          description: `Player used ${item.name}`,
          data: { itemId: item.id }
        }]
      };
    }
    
    return {
      message: `You're not sure how to use the ${item.name}.`
    };
  }

  /**
   * Handle equipping items
   * @param itemName The item to equip
   * @returns Command result
   */
  private handleEquip(itemName: string): CommandResult {
    if (!itemName) {
      return {
        message: "Equip what?"
      };
    }
    
    // Find the item in the player's inventory
    const inventory = this.gameState.player.inventory;
    const itemIndex = inventory.items.findIndex(item => 
      item.name.toLowerCase().includes(itemName.toLowerCase())
    );
    
    if (itemIndex === -1) {
      return {
        message: `You don't have a ${itemName} in your inventory.`
      };
    }
    
    const item = inventory.items[itemIndex];
    
    // Check if the item is already equipped
    if (item.equipped) {
      return {
        message: `The ${item.name} is already equipped.`
      };
    }
    
    // Check if the item is equippable
    if (![ItemCategory.Weapon, ItemCategory.Armor, ItemCategory.Shield].includes(item.category)) {
      return {
        message: `You can't equip the ${item.name}.`
      };
    }
    
    // Equip the item
    const playerInventory = {...inventory};
    playerInventory.items[itemIndex] = {
      ...item,
      equipped: true
    };
    
    // Update the player character
    const player = {...this.gameState.player};
    player.inventory = playerInventory;
    
    // Calculate new armor class if armor or shield
    if (item.category === ItemCategory.Armor || item.category === ItemCategory.Shield) {
      // Find the armor class bonus from the item
      const armorClassBonus = item.armorClass || 0;
      
      // Update player's armor class
      player.armorClass = Math.max(player.armorClass, 10 + armorClassBonus);
    }
    
    return {
      message: `You equip the ${item.name}.`,
      stateChanges: {
        player
      },
      triggeredEvents: [{
        type: 'PLAYER_EQUIPPED_ITEM',
        timestamp: Date.now(),
        description: `Player equipped ${item.name}`,
        data: { itemId: item.id }
      }],
      shouldSave: true
    };
  }

  /**
   * Handle unequipping items
   * @param itemName The item to unequip
   * @returns Command result
   */
  private handleUnequip(itemName: string): CommandResult {
    if (!itemName) {
      return {
        message: "Unequip what?"
      };
    }
    
    // Find the item in the player's inventory
    const inventory = this.gameState.player.inventory;
    const itemIndex = inventory.items.findIndex(item => 
      item.name.toLowerCase().includes(itemName.toLowerCase()) && item.equipped
    );
    
    if (itemIndex === -1) {
      return {
        message: `You don't have an equipped ${itemName}.`
      };
    }
    
    const item = inventory.items[itemIndex];
    
    // Unequip the item
    const playerInventory = {...inventory};
    playerInventory.items[itemIndex] = {
      ...item,
      equipped: false
    };
    
    // Update the player character
    const player = {...this.gameState.player};
    player.inventory = playerInventory;
    
    // Recalculate armor class if armor or shield
    if (item.category === ItemCategory.Armor || item.category === ItemCategory.Shield) {
      // Reset to base armor class
      player.armorClass = 10;
      
      // Add armor class from other equipped armor/shields
      playerInventory.items
        .filter(i => i.equipped && (i.category === ItemCategory.Armor || i.category === ItemCategory.Shield))
        .forEach(i => {
          player.armorClass += i.armorClass || 0;
        });
    }
    
    return {
      message: `You unequip the ${item.name}.`,
      stateChanges: {
        player
      },
      triggeredEvents: [{
        type: 'PLAYER_UNEQUIPPED_ITEM',
        timestamp: Date.now(),
        description: `Player unequipped ${item.name}`,
        data: { itemId: item.id }
      }],
      shouldSave: true
    };
  }

  /**
   * Handle character stats command
   * @returns Command result
   */
  private handleStats(): CommandResult {
    const player = this.gameState.player;
    
    let message = `
Character: ${player.name}
Race: ${player.race}
Class: ${player.class[0].name} (Level ${player.level})
Hit Points: ${player.hitPoints.current}/${player.hitPoints.maximum}
Armor Class: ${player.armorClass || 10}

Ability Scores:
STR: ${player.abilities.strength} (${Math.floor((player.abilities.strength - 10) / 2) >= 0 ? '+' : ''}${Math.floor((player.abilities.strength - 10) / 2)})
DEX: ${player.abilities.dexterity} (${Math.floor((player.abilities.dexterity - 10) / 2) >= 0 ? '+' : ''}${Math.floor((player.abilities.dexterity - 10) / 2)})
CON: ${player.abilities.constitution} (${Math.floor((player.abilities.constitution - 10) / 2) >= 0 ? '+' : ''}${Math.floor((player.abilities.constitution - 10) / 2)})
INT: ${player.abilities.intelligence} (${Math.floor((player.abilities.intelligence - 10) / 2) >= 0 ? '+' : ''}${Math.floor((player.abilities.intelligence - 10) / 2)})
WIS: ${player.abilities.wisdom} (${Math.floor((player.abilities.wisdom - 10) / 2) >= 0 ? '+' : ''}${Math.floor((player.abilities.wisdom - 10) / 2)})
CHA: ${player.abilities.charisma} (${Math.floor((player.abilities.charisma - 10) / 2) >= 0 ? '+' : ''}${Math.floor((player.abilities.charisma - 10) / 2)})
`.trim();
    
    return {
      message,
      triggeredEvents: [{
        type: 'PLAYER_CHECKED_STATS',
        data: {}
      }]
    };
  }

  /**
   * Handle rest command
   * @returns Command result
   */
  private handleRest(): CommandResult {
    const location = this.gameState.currentLocation;
    
    // Check if the location is safe for resting
    if (location.isHostile) {
      return {
        message: "It's not safe to rest here."
      };
    }
    
    // Restore hit points (short rest: 1/4 of missing HP)
    const player = {...this.gameState.player};
    const missingHp = player.hitPoints.maximum - player.hitPoints.current;
    const restoredHp = Math.floor(missingHp / 4);
    
    player.hitPoints = {
      ...player.hitPoints,
      current: player.hitPoints.current + restoredHp
    };
    
    // Advance game time (1 hour)
    const gameTime = {...this.gameState.gameTime};
    gameTime.hour = (gameTime.hour + 1) % 24;
    
    if (gameTime.hour === 0) {
      gameTime.day += 1;
    }
    
    // Update time of day
    if (gameTime.hour >= 5 && gameTime.hour < 12) {
      gameTime.timeOfDay = 'morning';
    } else if (gameTime.hour >= 12 && gameTime.hour < 17) {
      gameTime.timeOfDay = 'afternoon';
    } else if (gameTime.hour >= 17 && gameTime.hour < 21) {
      gameTime.timeOfDay = 'evening';
    } else {
      gameTime.timeOfDay = 'night';
    }
    
    return {
      message: `You rest for an hour. You recover ${restoredHp} hit points.`,
      stateChanges: {
        player,
        gameTime
      },
      triggeredEvents: [{
        type: 'PLAYER_RESTED',
        data: { 
          restoredHp,
          location: location.id 
        }
      }],
      shouldSave: true
    };
  }

  /**
   * Handle quests command
   * @returns Command result
   */
  private handleQuests(): CommandResult {
    const activeQuests = this.gameState.activeQuests;
    const completedQuests = this.gameState.completedQuests;
    
    if (activeQuests.length === 0 && completedQuests.length === 0) {
      return {
        message: "You don't have any quests in your journal."
      };
    }
    
    let message = "Journal:\n";
    
    // Active quests
    if (activeQuests.length > 0) {
      message += "\nActive Quests:";
      activeQuests.forEach(quest => {
        message += `\n- ${quest.name}: ${quest.description}`;
        
        // Show objectives
        if (quest.objectives && quest.objectives.length > 0) {
          message += "\n  Objectives:";
          quest.objectives.forEach(objective => {
            const statusIcon = objective.completed ? "✓" : "•";
            message += `\n  ${statusIcon} ${objective.description}`;
          });
        }
      });
    }
    
    // Completed quests
    if (completedQuests.length > 0) {
      message += "\n\nCompleted Quests:";
      completedQuests.forEach(quest => {
        message += `\n- ${quest.name}: ${quest.description} (Completed)`;
      });
    }
    
    return {
      message,
      triggeredEvents: [{
        type: 'PLAYER_CHECKED_QUESTS',
        data: {}
      }]
    };
  }

  /**
   * Handle help command
   * @returns Command result
   */
  private handleHelp(): CommandResult {
    const message = `
Available commands:
  look, l, examine [object/npc/direction] - Look around or examine something
  go, move [direction] - Move in a direction (north, south, east, west, up, down)
  talk, speak [npc] - Talk to an NPC
  inventory, i - Check your inventory
  take, get [item] - Pick up an item
  drop [item] - Drop an item
  use [item] - Use an item
  equip [item] - Equip an item
  unequip [item] - Unequip an item
  stats, character - View your character sheet
  rest - Rest to recover health and resources
  quests - View your active quests
  save [description] - Save your game
  load [number/id] - Load a saved game
  saves, listsaves - List available saves
  delete, deletesave [number/id] - Delete a saved game
  help - Show this help message
    `;
    
    return { message };
  }

  /**
   * Handle the save command
   * @param description Optional description for the save
   * @returns Command result
   */
  private async handleSave(description?: string): Promise<CommandResult> {
    try {
      // Initialize save manager if needed
      if (!saveManager) {
        return {
          message: "Error: Save system not initialized."
        };
      }
      
      // Save the game
      const result = await saveManager.saveGame(this.gameState, description);
      
      if (result.success) {
        return {
          message: result.message
        };
      } else {
        return {
          message: `Failed to save game: ${result.message}`
        };
      }
    } catch (error) {
      return {
        message: `Error saving game: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * Handle the load command
   * @param saveIdOrIndex The save ID or index to load
   * @returns Command result
   */
  private async handleLoad(saveIdOrIndex?: string): Promise<CommandResult> {
    try {
      // Initialize save manager if needed
      if (!saveManager) {
        return {
          message: "Error: Save system not initialized."
        };
      }
      
      // If no save ID provided, show available saves
      if (!saveIdOrIndex) {
        return this.handleListSaves();
      }
      
      // Check if this is a numeric index
      const index = parseInt(saveIdOrIndex);
      if (!isNaN(index)) {
        // Get available saves
        const saves = await saveManager.getAvailableSaves();
        
        // Check if index is valid
        if (index < 1 || index > saves.length) {
          return {
            message: `Invalid save index. Please use a number between 1 and ${saves.length}.`
          };
        }
        
        // Get the save ID from the index
        saveIdOrIndex = saves[index - 1].id;
      }
      
      // Load the game
      const result = await saveManager.loadGame(saveIdOrIndex);
      
      if (result.success && result.state) {
        return {
          message: result.message,
          stateChanges: result.state
        };
      } else {
        return {
          message: `Failed to load game: ${result.message}`
        };
      }
    } catch (error) {
      return {
        message: `Error loading game: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * Handle the list saves command
   * @param characterName Optional character name to filter by
   * @returns Command result
   */
  private async handleListSaves(characterName?: string): Promise<CommandResult> {
    try {
      // Initialize save manager if needed
      if (!saveManager) {
        return {
          message: "Error: Save system not initialized."
        };
      }
      
      // Get available saves
      const saves = await saveManager.getAvailableSaves(characterName);
      
      if (saves.length === 0) {
        return {
          message: characterName 
            ? `No saves found for character "${characterName}".`
            : "No saved games found."
        };
      }
      
      // Format the saves list
      let message = "Available saves:\n";
      saves.forEach((save, index) => {
        const date = new Date(save.timestamp).toLocaleString();
        message += `${index + 1}. ${save.characterName} (Level ${save.characterLevel}) - ${save.location} - ${date}\n`;
        if (save.description) {
          message += `   Description: ${save.description}\n`;
        }
      });
      
      message += "\nTo load a save, type 'load <number>' or 'load <save_id>'.";
      
      return { message };
    } catch (error) {
      return {
        message: `Error listing saves: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * Handle the delete save command
   * @param saveIdOrIndex The save ID or index to delete
   * @returns Command result
   */
  private async handleDeleteSave(saveIdOrIndex?: string): Promise<CommandResult> {
    try {
      // Initialize save manager if needed
      if (!saveManager) {
        return {
          message: "Error: Save system not initialized."
        };
      }
      
      // If no save ID provided, show available saves
      if (!saveIdOrIndex) {
        const listResult = await this.handleListSaves();
        return {
          message: listResult.message + "\n\nTo delete a save, type 'delete <number>' or 'delete <save_id>'."
        };
      }
      
      // Check if this is a numeric index
      const index = parseInt(saveIdOrIndex);
      if (!isNaN(index)) {
        // Get available saves
        const saves = await saveManager.getAvailableSaves();
        
        // Check if index is valid
        if (index < 1 || index > saves.length) {
          return {
            message: `Invalid save index. Please use a number between 1 and ${saves.length}.`
          };
        }
        
        // Get the save ID from the index
        const save = saves[index - 1];
        saveIdOrIndex = save.id;
        
        // Delete the save
        const success = await saveManager.deleteSave(saveIdOrIndex);
        
        if (success) {
          return {
            message: `Save "${save.description}" deleted successfully.`
          };
        } else {
          return {
            message: `Failed to delete save.`
          };
        }
      } else {
        // Delete the save by ID
        const success = await saveManager.deleteSave(saveIdOrIndex);
        
        if (success) {
          return {
            message: `Save deleted successfully.`
          };
        } else {
          return {
            message: `Failed to delete save. Save ID "${saveIdOrIndex}" not found.`
          };
        }
      }
    } catch (error) {
      return {
        message: `Error deleting save: ${(error as Error).message}`
      };
    }
  }

  /**
   * Get a description of the exits from a location
   * @param location The location
   * @returns Description of exits
   */
  private getExitsDescription(location: any): string {
    if (!location.exits || location.exits.length === 0) {
      return "There are no obvious exits.";
    }
    
    const exitDirections = location.exits.map((exit: any) => exit.direction);
    return `Exits: ${exitDirections.join(', ')}`;
  }

  /**
   * Get a description of NPCs in a location
   * @param location The location
   * @returns Description of NPCs
   */
  private getNPCsDescription(location: any): string {
    if (!location.npcsPresent || location.npcsPresent.length === 0) {
      return "There's no one else here.";
    }
    
    const npcs = location.npcsPresent.map((npcId: string) => {
      const npc = this.gameState.npcs.get(npcId);
      return npc ? npc.name : 'Unknown Person';
    });
    
    if (npcs.length === 1) {
      return `${npcs[0]} is here.`;
    } else {
      return `${npcs.slice(0, -1).join(', ')} and ${npcs[npcs.length - 1]} are here.`;
    }
  }

  /**
   * Get a description of objects in a location
   * @param location The location
   * @returns Description of objects
   */
  private getObjectsDescription(location: any): string {
    if (!location.objectsPresent || location.objectsPresent.length === 0) {
      return "There's nothing of interest here.";
    }
    
    const objects = location.objectsPresent.map((objectId: string) => {
      // We'd need a proper object repository to look up object details
      // For now, just use the ID as a name
      return objectId.replace(/_/g, ' ');
    });
    
    if (objects.length === 1) {
      return `You see a ${objects[0]}.`;
    } else {
      return `You see a ${objects.slice(0, -1).join(', ')} and a ${objects[objects.length - 1]}.`;
    }
  }

  /**
   * Find an NPC by name
   * @param name Name to search for
   * @returns The NPC or undefined
   */
  private findNPCByName(name: string): NPC | undefined {
    const currentLocation = this.gameState.currentLocation;
    
    if (!currentLocation.npcs || currentLocation.npcs.size === 0) {
      return undefined;
    }
    
    // Check each NPC in the location
    for (const [id, npc] of currentLocation.npcs) {
      if (npc.name.toLowerCase().includes(name.toLowerCase())) {
        return npc;
      }
    }
    
    return undefined;
  }

  /**
   * Find an object by name
   * @param name Name to search for
   * @returns The object or undefined
   */
  private findObjectByName(name: string): any {
    // Use the validator to find the object
    const validation = this.validator.validateLocationObject(name);
    return validation.isValid ? validation.entity : undefined;
  }

  /**
   * Find an exit by direction
   * @param direction Direction to search for
   * @returns The exit or undefined
   */
  private findExitByDirection(direction: string): any {
    const currentLocation = this.gameState.currentLocation;
    
    if (!currentLocation.exits || currentLocation.exits.length === 0) {
      return undefined;
    }
    
    // Clean up the direction for comparison
    direction = direction.toLowerCase().trim();
    
    // Check common direction abbreviations
    const normalizedDirection = direction === 'n' ? 'north' :
                                direction === 's' ? 'south' :
                                direction === 'e' ? 'east' :
                                direction === 'w' ? 'west' :
                                direction === 'u' ? 'up' :
                                direction === 'd' ? 'down' :
                                direction;
    
    // Find the exit
    return currentLocation.exits.find((exit: any) => 
      exit.direction.toLowerCase() === normalizedDirection
    );
  }

  /**
   * Get suggestions for similar commands
   */
  private getSimilarCommandSuggestions(input: string): string[] {
    const commands = [
      'look', 'examine', 'go', 'move', 'north', 'south', 'east', 'west',
      'talk', 'speak', 'inventory', 'take', 'get', 'drop', 'use',
      'equip', 'unequip', 'stats', 'rest', 'quests', 'help'
    ];
    
    // First check for direct prefix matches (e.g., "inv" for "inventory")
    const prefixMatches = commands.filter(cmd => cmd.startsWith(input));
    if (prefixMatches.length > 0) {
      return prefixMatches;
    }
    
    // Then check for similarity
    return commands
      .map(cmd => ({ command: cmd, similarity: this.getStringSimilarity(input, cmd) }))
      .filter(item => item.similarity > 0.6)
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => item.command)
      .slice(0, 3); // Return up to 3 suggestions
  }
  
  /**
   * Calculate string similarity for command suggestions
   */
  private getStringSimilarity(str1: string, str2: string): number {
    // Simple check for direct substrings
    if (str2.includes(str1) || str1.includes(str2)) {
      return 0.8;
    }
    
    const a = str1.toLowerCase();
    const b = str2.toLowerCase();
    
    if (a.length === 0 || b.length === 0) return 0;
    
    // Calculate Levenshtein distance
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill the matrix
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const maxLen = Math.max(a.length, b.length);
    const distance = matrix[a.length][b.length];
    
    // Calculate similarity score (1 - normalized distance)
    return 1 - (distance / maxLen);
  }
} 