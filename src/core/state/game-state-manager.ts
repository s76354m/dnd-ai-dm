/**
 * Game State Manager
 * 
 * Responsible for managing the game state, handling state transitions,
 * and providing persistence capabilities.
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import * as path from 'path';

import { GameState } from '../interfaces/game';
import { Character } from '../interfaces/character';
import { Location } from '../interfaces/world';
import { NPC } from '../interfaces/npc';
import { Quest } from '../interfaces/quest';
import { GameEvent } from '../command-processor';

/**
 * Represents different modes the game can be in
 */
export enum GameMode {
  EXPLORATION = 'exploration',
  COMBAT = 'combat',
  DIALOGUE = 'dialogue',
  SHOPPING = 'shopping',
  MENU = 'menu',
  CHARACTER_SHEET = 'character_sheet',
  INVENTORY = 'inventory',
  REST = 'rest',
  TRAVEL = 'travel'
}

/**
 * State change event data
 */
export interface StateChangeEvent {
  previous: Partial<GameState>;
  current: GameState;
  changedProps: string[];
}

/**
 * Responsible for managing game state
 */
export class GameStateManager extends EventEmitter {
  private gameState: GameState;
  private gameMode: GameMode = GameMode.EXPLORATION;
  private saveDir: string = 'saves';
  private stateChangeHistory: StateChangeEvent[] = [];
  private maxHistorySize: number = 20;

  /**
   * Create a new GameStateManager
   * 
   * @param initialState Optional initial game state
   */
  constructor(initialState?: GameState) {
    super();
    
    if (initialState) {
      this.gameState = initialState;
    } else {
      this.gameState = this.createDefaultState();
    }
  }

  /**
   * Create a default game state
   */
  private createDefaultState(): GameState {
    // Create empty inventory with default values
    const defaultInventory = {
      gold: 0,
      items: [],
      maxWeight: 50, // Default carrying capacity
      currentWeight: 0
    };

    return {
      player: {
        id: `player-${Date.now()}`,
        name: 'New Character',
        race: 'human' as any, // This will be replaced during character creation
        class: 'fighter' as any, // This will be replaced during character creation
        background: 'soldier' as any, // This will be replaced during character creation
        alignment: 'True Neutral',
        level: 1,
        experiencePoints: 0,
        abilityScores: {
          strength: { score: 10, modifier: 0 },
          dexterity: { score: 10, modifier: 0 },
          constitution: { score: 10, modifier: 0 },
          intelligence: { score: 10, modifier: 0 },
          wisdom: { score: 10, modifier: 0 },
          charisma: { score: 10, modifier: 0 },
          // Short form for convenience
          str: 10,
          dex: 10,
          con: 10,
          int: 10,
          wis: 10,
          cha: 10
        },
        hitPoints: { current: 10, maximum: 10 },
        temporaryHitPoints: 0,
        hitDice: { total: 1, current: 1, size: 10 },
        armorClass: 10,
        initiative: 0,
        speed: 30,
        proficiencyBonus: 2,
        conditions: [],
        inventory: defaultInventory,
        skills: {} as any, // Will be initialized during character creation
        spells: [],
        statusEffects: [],
        traits: [],
        proficiencies: {
          languages: [],
          skills: [],
          tools: [],
          armor: [],
          weapons: [],
          savingThrows: []
        },
        classFeatures: [],
        racialTraits: [],
        feats: [],
        personality: {
          traits: [],
          ideals: [],
          bonds: [],
          flaws: []
        },
        appearance: {
          age: 25,
          height: '',
          weight: '',
          eyes: '',
          skin: '',
          hair: ''
        },
        wealth: {
          copper: 0,
          silver: 0,
          electrum: 0,
          gold: 10, // Start with some gold
          platinum: 0
        },
        backstory: '',
        inspiration: false,
        deathSaves: {
          successes: 0,
          failures: 0
        }
      } as Character,

      currentLocation: {
        id: 'starting-location',
        name: 'Unknown Location',
        description: 'You are in an unknown location.',
        connections: new Map(),
        npcs: [],
        items: [],
        isHostile: false,
        lighting: 'bright',
        terrain: 'normal',
        points_of_interest: []
      },

      locations: new Map(),
      npcs: new Map(),
      inventory: defaultInventory, // Same inventory reference as player
      quests: [],
      combatState: null,

      gameTime: {
        day: 1,
        hour: 12,
        minute: 0,
        timeOfDay: 'day',
        season: 'summer',
        year: 1,
        calendarSystem: 'standard'
      },

      worldState: {
        currentWeather: 'clear',
        events: [],
        factions: new Map(),
        globalFlags: new Map(), // For tracking world state changes
        discoveredLocations: new Set(['starting-location']),
        worldScale: 'regional',
        worldName: 'Untitled World'
      },

      sessionHistory: []
    };
  }

  /**
   * Get the current game state
   */
  public getState(): GameState {
    return { ...this.gameState };
  }

  /**
   * Set the game state (completely replaces the current state)
   */
  public setState(newState: GameState): void {
    const previousState = { ...this.gameState };
    this.gameState = { ...newState };
    
    // Track what changed for history and events
    const changedProps = this.getChangedProperties(previousState, this.gameState);
    
    // Add to state history
    this.addToStateHistory({
      previous: previousState,
      current: this.gameState,
      changedProps
    });
    
    // Emit state change event
    this.emit('stateChanged', this.gameState, changedProps);
  }

  /**
   * Get the current game mode
   */
  public getGameMode(): GameMode {
    return this.gameMode;
  }

  /**
   * Update the game state
   * 
   * @param changes Partial state changes to apply
   * @returns The updated game state
   */
  public updateState(changes: Partial<GameState>): GameState {
    if (!changes) return this.gameState;
    
    // Track changed properties for events
    const changedProps: string[] = [];
    
    // Create a shallow copy of the previous state for event emission
    const previousState: Partial<GameState> = { ...this.gameState };
    
    // Apply each change to the game state
    Object.keys(changes).forEach(key => {
      const typedKey = key as keyof GameState;
      if (changes[typedKey] !== undefined) {
        changedProps.push(key);
        (this.gameState as any)[typedKey] = changes[typedKey];
      }
    });
    
    // Only emit events if we have changes
    if (changedProps.length > 0) {
      // Add to state change history
      this.addToStateHistory({
        previous: previousState,
        current: this.gameState,
        changedProps
      });
      
      // Emit state change event
      this.emit('stateChanged', {
        previous: previousState,
        current: this.gameState,
        changedProps
      });
      
      // Emit specific events for certain state changes
      if (changedProps.includes('currentLocation')) {
        this.emit('locationChanged', {
          previous: previousState.currentLocation,
          current: this.gameState.currentLocation
        });
      }
      
      if (changedProps.includes('combatState')) {
        if (this.gameState.combatState?.isActive) {
          this.setGameMode(GameMode.COMBAT);
        } else if (this.gameMode === GameMode.COMBAT) {
          this.setGameMode(GameMode.EXPLORATION);
        }
      }
    }
    
    return this.gameState;
  }

  /**
   * Set the current game mode
   * 
   * @param mode The new game mode
   */
  public setGameMode(mode: GameMode): void {
    const previousMode = this.gameMode;
    this.gameMode = mode;
    
    this.emit('gameModeChanged', {
      previous: previousMode,
      current: mode
    });
    
    // Apply mode-specific state changes if needed
    switch (mode) {
      case GameMode.COMBAT:
        // Ensure combat state is initialized if not already
        if (!this.gameState.combatState?.isActive) {
          console.warn('Entered COMBAT mode but combatState is not active.');
        }
        break;
      case GameMode.DIALOGUE:
        // Could store which NPC we're talking to in a dialogueState property
        break;
      case GameMode.REST:
        // Apply resting state changes if needed
        break;
      default:
        break;
    }
  }

  /**
   * Add game event to session history
   * 
   * @param event The game event to add
   */
  public addEvent(event: GameEvent): void {
    if (!this.gameState.sessionHistory) {
      this.gameState.sessionHistory = [];
    }
    
    this.gameState.sessionHistory.push({
      ...event,
      timestamp: new Date().toISOString()
    });
    
    this.emit('eventAdded', event);
  }

  /**
   * Add state change to history
   * 
   * @param stateChange The state change to add
   */
  private addToStateHistory(stateChange: StateChangeEvent): void {
    this.stateChangeHistory.push(stateChange);
    
    // Keep history size manageable
    if (this.stateChangeHistory.length > this.maxHistorySize) {
      this.stateChangeHistory.shift();
    }
  }

  /**
   * Save the current game state to a file
   * 
   * @param filename Optional file name (defaults to auto-generated name)
   * @returns The path to the saved file
   */
  public async saveGame(filename?: string): Promise<string> {
    try {
      // Create saves directory if it doesn't exist
      const savesDir = path.join(process.cwd(), this.saveDir);
      await fs.mkdir(savesDir, { recursive: true });
      
      // Generate save file name based on character name and timestamp if not provided
      const saveFilename = filename || 
        `${this.gameState.player.name?.toLowerCase().replace(/\s+/g, '_') || 'unnamed'}_${Date.now()}.json`;
      
      const savePath = path.join(savesDir, saveFilename);
      
      // Create a sanitized version of the state for serialization
      const stateToSave = this.prepareStateForSerialization(this.gameState);
      
      // Serialize the game state to JSON
      const serialized = JSON.stringify(stateToSave, null, 2);
      
      // Write to file
      await fs.writeFile(savePath, serialized, 'utf8');
      
      // Maintain a list of recent saves by character
      await this.updateSavesList(saveFilename);
      
      this.emit('gameSaved', { path: savePath, filename: saveFilename });
      
      return savePath;
    } catch (error) {
      this.emit('error', { 
        type: 'SaveError', 
        message: `Error saving game state: ${(error as Error).message}` 
      });
      throw error;
    }
  }

  /**
   * Load a game state from a file
   * 
   * @param filename The filename to load
   * @returns The loaded game state
   */
  public async loadGame(filename: string): Promise<GameState> {
    try {
      const savePath = path.join(process.cwd(), this.saveDir, filename);
      const saveData = await fs.readFile(savePath, 'utf8');
      
      // Parse the save data
      const loadedState = JSON.parse(saveData) as GameState;
      
      // Restore Maps and other special objects
      const restoredState = this.restoreStateAfterDeserialization(loadedState);
      
      // Update our current state
      const previousState = { ...this.gameState };
      this.gameState = restoredState;
      
      // Emit game loaded event
      this.emit('gameLoaded', { 
        previous: previousState,
        current: this.gameState,
        path: savePath
      });
      
      return this.gameState;
    } catch (error) {
      this.emit('error', { 
        type: 'LoadError', 
        message: `Error loading game state: ${(error as Error).message}` 
      });
      throw error;
    }
  }

  /**
   * Update the list of recent saves for the current character
   * 
   * @param saveFilename The filename to add to the list
   */
  private async updateSavesList(saveFilename: string): Promise<void> {
    // Only update if we have a valid player name
    if (!this.gameState.player?.name) return;
    
    const playerName = this.gameState.player.name.toLowerCase().replace(/\s+/g, '_');
    const savesListPath = path.join(process.cwd(), this.saveDir, `${playerName}_saves.json`);
    
    let saves: string[] = [];
    
    try {
      // Try to read existing saves list
      const existingSaves = await fs.readFile(savesListPath, 'utf8');
      saves = JSON.parse(existingSaves);
    } catch (error) {
      // No existing saves file, that's okay
    }
    
    // Add new save and keep list manageable
    saves.unshift(saveFilename);
    if (saves.length > 10) {
      saves = saves.slice(0, 10);
    }
    
    await fs.writeFile(savesListPath, JSON.stringify(saves, null, 2), 'utf8');
  }

  /**
   * Get a list of all available saves for a character
   * 
   * @param characterName Optional character name (defaults to current player)
   * @returns List of save filenames
   */
  public async getAvailableSaves(characterName?: string): Promise<string[]> {
    try {
      // Use current player name if not specified
      const playerName = characterName || 
        (this.gameState.player?.name?.toLowerCase().replace(/\s+/g, '_') || '');
      
      if (!playerName) {
        return [];
      }
      
      const savesListPath = path.join(process.cwd(), this.saveDir, `${playerName}_saves.json`);
      
      try {
        const existingSaves = await fs.readFile(savesListPath, 'utf8');
        return JSON.parse(existingSaves);
      } catch (error) {
        // No existing saves file
        return [];
      }
    } catch (error) {
      this.emit('error', { 
        type: 'SavesListError', 
        message: `Error getting saves list: ${(error as Error).message}` 
      });
      return [];
    }
  }

  /**
   * Prepare the game state for serialization
   * Converts Maps and other special objects to serializable format
   * 
   * @param state The game state to prepare
   * @returns A serializable version of the state
   */
  private prepareStateForSerialization(state: GameState): any {
    const serializable = { ...state };
    
    // Convert locations Map to object
    if (state.locations instanceof Map) {
      serializable.locations = Object.fromEntries(state.locations);
    }
    
    // Convert npcs Map to object
    if (state.npcs instanceof Map) {
      serializable.npcs = Object.fromEntries(state.npcs);
    }
    
    // Convert location connections maps
    if (state.currentLocation?.connections instanceof Map) {
      serializable.currentLocation = {
        ...state.currentLocation,
        connections: Object.fromEntries(state.currentLocation.connections)
      };
    }
    
    // Convert locationRelationships if it's a Map
    if (state.locationRelationships instanceof Map) {
      serializable.locationRelationships = Object.fromEntries(state.locationRelationships);
    }
    
    return serializable;
  }

  /**
   * Restore special objects after deserialization
   * Converts objects back to Maps and other special types
   * 
   * @param state The deserialized state to restore
   * @returns The restored state with proper object types
   */
  private restoreStateAfterDeserialization(state: any): GameState {
    const restored = { ...state };
    
    // Restore locations Map
    if (restored.locations && !(restored.locations instanceof Map)) {
      restored.locations = new Map(Object.entries(restored.locations));
    }
    
    // Restore npcs Map
    if (restored.npcs && !(restored.npcs instanceof Map)) {
      restored.npcs = new Map(Object.entries(restored.npcs));
    }
    
    // Restore location connections map
    if (restored.currentLocation?.connections && !(restored.currentLocation.connections instanceof Map)) {
      restored.currentLocation = {
        ...restored.currentLocation,
        connections: new Map(Object.entries(restored.currentLocation.connections))
      };
    }
    
    // Restore locationRelationships if needed
    if (restored.locationRelationships && !(restored.locationRelationships instanceof Map) && 
        !Array.isArray(restored.locationRelationships)) {
      restored.locationRelationships = new Map(Object.entries(restored.locationRelationships));
    }
    
    // Restore any other special objects as needed
    
    return restored as GameState;
  }

  /**
   * Reset to a default state
   */
  public resetToDefault(): GameState {
    const previousState = { ...this.gameState };
    this.gameState = this.createDefaultState();
    
    this.emit('stateReset', {
      previous: previousState,
      current: this.gameState
    });
    
    return this.gameState;
  }

  /**
   * Recover from error state
   * 
   * @param error The error that occurred
   * @returns Whether recovery was successful
   */
  public recoverFromError(error: Error): boolean {
    try {
      // Log the error that occurred
      console.error('Attempting to recover from error:', error.message);
      
      // Make a backup of the current state before attempting recovery
      const backupState = this.prepareStateForSerialization(this.gameState);
      
      // Check if we have a valid player and location at minimum
      const hasValidPlayer = this.gameState.player && this.gameState.player.id;
      const hasValidLocation = this.gameState.currentLocation && this.gameState.currentLocation.id;
      
      // If the basic state is corrupt, reset to default
      if (!hasValidPlayer || !hasValidLocation) {
        console.warn('Critical game state corruption detected. Resetting to default state.');
        this.resetToDefault();
        return true;
      }
      
      // Try to fix combat state issues
      if (error.message.includes('combat') || error.stack?.includes('combat')) {
        console.log('Attempting to recover from combat-related error');
        this.gameState.combatState = null;
        this.setGameMode(GameMode.EXPLORATION);
        return true;
      }
      
      // Try to fix NPC-related issues
      if (error.message.includes('npc') || error.stack?.includes('npc')) {
        console.log('Attempting to recover from NPC-related error');
        // Ensure the npcs Map exists
        if (!this.gameState.npcs) {
          this.gameState.npcs = new Map();
        }
        return true;
      }
      
      // Try to fix inventory-related issues
      if (error.message.includes('inventory') || error.message.includes('item') || 
          error.stack?.includes('inventory') || error.stack?.includes('item')) {
        console.log('Attempting to recover from inventory-related error');
        // Ensure inventory exists with proper structure
        const defaultInventory = {
          gold: this.gameState.inventory?.gold || 0,
          items: this.gameState.inventory?.items || [],
          maxWeight: this.gameState.inventory?.maxWeight || 50,
          currentWeight: this.gameState.inventory?.currentWeight || 0
        };
        this.gameState.inventory = defaultInventory;
        return true;
      }
      
      // If we can't determine the error type, attempt a partial reset
      // Keep player data but reset the world
      console.warn('Attempting partial reset while preserving player data');
      const playerData = this.gameState.player;
      const defaultState = this.createDefaultState();
      this.gameState = {
        ...defaultState,
        player: playerData
      };
      
      // Emit recovery event
      this.emit('errorRecovery', {
        error: error.message,
        recoveryMethod: 'partialReset',
        success: true
      });
      
      return true;
    } catch (recoveryError) {
      console.error('Error recovery failed:', (recoveryError as Error).message);
      
      // Last resort: full reset
      try {
        this.resetToDefault();
        
        this.emit('errorRecovery', {
          error: error.message,
          recoveryMethod: 'fullReset',
          success: true
        });
        
        return true;
      } catch (criticalError) {
        console.error('Critical failure during error recovery:', (criticalError as Error).message);
        
        this.emit('errorRecovery', {
          error: error.message,
          recoveryMethod: 'failed',
          success: false
        });
        
        return false;
      }
    }
  }

  /**
   * Get the changed properties between two states
   */
  private getChangedProperties(previousState: Partial<GameState>, currentState: GameState): string[] {
    const changedProps: string[] = [];
    
    // Top-level properties comparison
    Object.keys(currentState).forEach(key => {
      if (JSON.stringify(previousState[key]) !== JSON.stringify(currentState[key])) {
        changedProps.push(key);
      }
    });
    
    return changedProps;
  }
}

// Export singleton instance
export const gameStateManager = new GameStateManager(); 