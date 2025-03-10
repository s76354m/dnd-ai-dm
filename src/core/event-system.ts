/**
 * Event System
 * 
 * Handles processing game events and notifying interested systems.
 * This provides a centralized way to respond to game events.
 */

import { AIDMEngine } from './engine';
import { GameEvent } from './interfaces/events';
import { gameStateManager } from './state';

/**
 * Interface for event handlers
 */
export interface EventHandler {
  /**
   * Handle an event
   * @param event The event to handle
   * @param engine The DM engine
   */
  handleEvent(event: GameEvent, engine: AIDMEngine): Promise<void>;
}

/**
 * Main event system for processing game events
 */
export class EventSystem {
  private engine: AIDMEngine;
  private handlers: Map<string, EventHandler[]>;

  /**
   * Create a new event system
   * @param engine The DM engine
   */
  constructor(engine: AIDMEngine) {
    this.engine = engine;
    this.handlers = new Map();
  }

  /**
   * Register an event handler for a specific event type
   * @param eventType Type of event to handle
   * @param handler Handler to register
   */
  registerHandler(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  /**
   * Process a list of game events
   * @param events Events to process
   */
  async processEvents(events: GameEvent[]): Promise<void> {
    for (const event of events) {
      await this.processEvent(event);
    }
  }

  /**
   * Process a single game event
   * @param event Event to process
   */
  private async processEvent(event: GameEvent): Promise<void> {
    // Add the event to the game state's session history
    gameStateManager.addEvent(event);

    // Log the event for debugging
    console.log(`Processing event: ${event.type}`);

    // Find handlers for this event type
    const handlers = this.handlers.get(event.type) || [];

    // Call all handlers for this event type
    for (const handler of handlers) {
      try {
        await handler.handleEvent(event, this.engine);
      } catch (error) {
        console.error(`Error handling event ${event.type}:`, error);
      }
    }

    // Handle standard event types
    switch (event.type) {
      case 'PLAYER_MOVED':
        await this.handlePlayerMovedEvent(event);
        break;
      
      case 'PLAYER_TALKED_TO_NPC':
        await this.handlePlayerTalkedToNPCEvent(event);
        break;
      
      case 'COMBAT_INITIATED':
        await this.handleCombatInitiatedEvent(event);
        break;
      
      case 'QUEST_UPDATED':
        await this.handleQuestUpdatedEvent(event);
        break;
      
      case 'PLAYER_RESTED':
        await this.handlePlayerRestedEvent(event);
        break;
    }
  }

  /**
   * Handle player moved event
   * @param event The player moved event
   */
  private async handlePlayerMovedEvent(event: GameEvent): Promise<void> {
    // Check if the player has discovered a new location
    const gameState = gameStateManager.getState();
    const newLocationId = event.data.toLocationId;
    const location = gameState.locations.get(newLocationId);

    if (location && !location.isDiscovered) {
      // Mark the location as discovered
      location.isDiscovered = true;

      // Update the locations map
      const locations = new Map(gameState.locations);
      locations.set(newLocationId, location);

      // Update the game state
      gameStateManager.updateState({
        locations
      });
    }

    // Check for NPCs in the new location that react to player entry
    if (location && location.npcsPresent) {
      for (const npcId of location.npcsPresent) {
        const npc = gameState.npcs.get(npcId);
        
        if (npc && npc.isHostile) {
          // Hostile NPC detected - trigger combat
          await this.processEvent({
            type: 'COMBAT_INITIATED',
            data: {
              npcId,
              reason: 'player_entered_location'
            }
          });
          break;
        }
      }
    }
  }

  /**
   * Handle player talked to NPC event
   * @param event The player talked to NPC event
   */
  private async handlePlayerTalkedToNPCEvent(event: GameEvent): Promise<void> {
    // Placeholder for NPC interaction processing
    console.log(`Player talked to NPC: ${event.data.npcId}`);
  }

  /**
   * Handle combat initiated event
   * @param event The combat initiated event
   */
  private async handleCombatInitiatedEvent(event: GameEvent): Promise<void> {
    // Get the game state
    const gameState = gameStateManager.getState();
    
    // Check if already in combat
    if (gameState.combatState?.isActive) {
      return;
    }

    // Get the NPC information
    const npcId = event.data.npcId;
    const npc = gameState.npcs.get(npcId);

    if (!npc) {
      console.error(`Cannot find NPC with ID: ${npcId}`);
      return;
    }

    // Create combat participants
    const player = gameState.player;
    const participants = [
      {
        id: player.id,
        name: player.name,
        isPlayer: true,
        initiative: Math.floor(Math.random() * 20) + 1 + Math.floor((player.abilities.dexterity - 10) / 2),
        healthCurrent: player.hitPoints.current,
        healthMax: player.hitPoints.maximum,
        armorClass: player.armorClass || 10,
        position: 0,
        conditions: []
      },
      {
        id: npc.id,
        name: npc.name,
        isPlayer: false,
        initiative: Math.floor(Math.random() * 20) + 1 + 2, // Assuming +2 DEX modifier for NPC
        healthCurrent: npc.healthPoints?.current || 20,
        healthMax: npc.healthPoints?.maximum || 20,
        armorClass: npc.armorClass || 12,
        position: 1,
        conditions: []
      }
    ];

    // Sort participants by initiative, highest first
    participants.sort((a, b) => b.initiative - a.initiative);

    // Create combat state
    const combatState = {
      isActive: true,
      participants,
      activeParticipantIndex: 0,
      round: 1,
      turnOrder: participants.map(p => p.id),
      reason: event.data.reason
    };

    // Update the game state
    gameStateManager.updateState({
      combatState
    });

    // Set the game mode to COMBAT
    gameStateManager.setGameMode('COMBAT');

    // Announce the combat beginning
    console.log(`Combat initiated with ${npc.name}!`);
    console.log(`Initiative order: ${participants.map(p => `${p.name} (${p.initiative})`).join(', ')}`);
    console.log(`${participants[0].name} goes first.`);
  }

  /**
   * Handle quest updated event
   * @param event The quest updated event
   */
  private async handleQuestUpdatedEvent(event: GameEvent): Promise<void> {
    // Placeholder for quest update processing
    console.log(`Quest updated: ${event.data.questId}`);
  }

  /**
   * Handle player rested event
   * @param event The player rested event
   */
  private async handlePlayerRestedEvent(event: GameEvent): Promise<void> {
    // Placeholder for rest processing
    console.log(`Player rested at location: ${event.data.location}`);
    console.log(`Restored ${event.data.restoredHp} hit points.`);
  }
} 