/**
 * Save Manager
 * 
 * Handles saving and loading game states, including listing available saves
 * and managing save metadata.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { GameState } from '../core/interfaces/game';

/**
 * Save metadata interface
 */
export interface SaveMetadata {
  id: string;
  filename: string;
  characterName: string;
  characterLevel: number;
  location: string;
  timestamp: number;
  dateFormatted: string;
  description: string;
}

/**
 * Save result interface
 */
export interface SaveResult {
  success: boolean;
  message: string;
  path?: string;
  metadata?: SaveMetadata;
  error?: Error;
}

/**
 * Load result interface
 */
export interface LoadResult {
  success: boolean;
  message: string;
  state?: GameState;
  metadata?: SaveMetadata;
  error?: Error;
}

/**
 * Save Manager class
 * Handles all persistence operations for the game
 */
export class SaveManager extends EventEmitter {
  private saveDir: string;
  private metadataFile: string;
  private metadataMap: Map<string, SaveMetadata> = new Map();
  
  /**
   * Create a new SaveManager
   * @param saveDir Directory to store saves (relative to cwd)
   */
  constructor(saveDir: string = 'saves') {
    super();
    this.saveDir = saveDir;
    this.metadataFile = path.join(saveDir, 'metadata.json');
  }
  
  /**
   * Initialize the save manager
   * Creates necessary directories and loads metadata
   * @param saveDir Optional custom save directory path
   */
  public async initialize(saveDir?: string): Promise<void> {
    try {
      // Update save directory if provided
      if (saveDir) {
        this.saveDir = saveDir;
        this.metadataFile = path.join(saveDir, 'metadata.json');
      }
      
      // Create saves directory if it doesn't exist
      await fs.mkdir(this.saveDir, { recursive: true });
      
      // Load metadata if it exists
      await this.loadMetadataFile();
      
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { 
        type: 'InitializationError', 
        message: `Error initializing save manager: ${(error as Error).message}` 
      });
      throw error;
    }
  }
  
  /**
   * Save a game state
   * @param state The game state to save
   * @param description Optional description of the save
   * @returns Save result
   */
  public async saveGame(state: GameState, description?: string): Promise<SaveResult> {
    try {
      // Create saves directory if it doesn't exist
      await fs.mkdir(this.saveDir, { recursive: true });
      
      // Generate save file name based on character name and timestamp
      const timestamp = Date.now();
      const dateFormatted = new Date(timestamp).toISOString().replace(/:/g, '-').split('.')[0];
      const saveId = `save_${timestamp}`;
      const saveFilename = `${state.player.name?.toLowerCase().replace(/\s+/g, '_') || 'unnamed'}_${timestamp}.json`;
      const savePath = path.join(this.saveDir, saveFilename);
      
      // Create a sanitized version of the state for serialization
      const stateToSave = this.prepareStateForSerialization(state);
      
      // Serialize the game state to JSON
      const serialized = JSON.stringify(stateToSave, null, 2);
      
      // Write to file
      await fs.writeFile(savePath, serialized, 'utf8');
      
      // Create metadata
      const metadata: SaveMetadata = {
        id: saveId,
        filename: saveFilename,
        characterName: state.player.name || 'Unknown',
        characterLevel: state.player.level || 1,
        location: state.currentLocation?.name || 'Unknown',
        timestamp,
        dateFormatted,
        description: description || `${state.player.name} at ${state.currentLocation?.name || 'Unknown'}`
      };
      
      // Update metadata
      this.metadataMap.set(saveId, metadata);
      await this.saveMetadataFile();
      
      this.emit('gameSaved', { path: savePath, metadata });
      
      return {
        success: true,
        message: `Game saved successfully as "${metadata.description}"`,
        path: savePath,
        metadata
      };
    } catch (error) {
      const result: SaveResult = {
        success: false,
        message: `Error saving game: ${(error as Error).message}`,
        error: error as Error
      };
      
      this.emit('error', { 
        type: 'SaveError', 
        message: result.message
      });
      
      return result;
    }
  }
  
  /**
   * Load a game state by ID or filename
   * @param idOrFilename The save ID or filename to load
   * @returns Load result
   */
  public async loadGame(idOrFilename: string): Promise<LoadResult> {
    try {
      // Determine if this is an ID or filename
      let filename = idOrFilename;
      let metadata: SaveMetadata | undefined;
      
      if (idOrFilename.startsWith('save_')) {
        // This is an ID
        metadata = this.metadataMap.get(idOrFilename);
        if (!metadata) {
          return {
            success: false,
            message: `Save with ID "${idOrFilename}" not found`
          };
        }
        filename = metadata.filename;
      } else {
        // This is a filename, find the metadata
        for (const [_, meta] of this.metadataMap.entries()) {
          if (meta.filename === idOrFilename) {
            metadata = meta;
            break;
          }
        }
      }
      
      const savePath = path.join(this.saveDir, filename);
      const saveData = await fs.readFile(savePath, 'utf8');
      
      // Parse the save data
      const loadedState = JSON.parse(saveData) as GameState;
      
      // Restore Maps and other special objects
      const restoredState = this.restoreStateAfterDeserialization(loadedState);
      
      this.emit('gameLoaded', { 
        state: restoredState,
        path: savePath,
        metadata
      });
      
      return {
        success: true,
        message: metadata 
          ? `Loaded save "${metadata.description}" from ${metadata.dateFormatted}` 
          : `Game loaded successfully`,
        state: restoredState,
        metadata
      };
    } catch (error) {
      const result: LoadResult = {
        success: false,
        message: `Error loading game: ${(error as Error).message}`,
        error: error as Error
      };
      
      this.emit('error', { 
        type: 'LoadError', 
        message: result.message
      });
      
      return result;
    }
  }
  
  /**
   * Get a list of available saves
   * @param characterName Optional character name to filter by
   * @returns Array of save metadata
   */
  public async getAvailableSaves(characterName?: string): Promise<SaveMetadata[]> {
    try {
      // Load metadata if it hasn't been loaded yet
      if (this.metadataMap.size === 0) {
        await this.loadMetadataFile();
      }
      
      // Convert metadata map to array
      let saves = Array.from(this.metadataMap.values());
      
      // Filter by character name if provided
      if (characterName) {
        const normalizedName = characterName.toLowerCase();
        saves = saves.filter(save => 
          save.characterName.toLowerCase().includes(normalizedName)
        );
      }
      
      // Sort by timestamp (newest first)
      saves.sort((a, b) => b.timestamp - a.timestamp);
      
      return saves;
    } catch (error) {
      this.emit('error', { 
        type: 'MetadataError', 
        message: `Error getting available saves: ${(error as Error).message}` 
      });
      
      return [];
    }
  }
  
  /**
   * Delete a save by ID or filename
   * @param idOrFilename The save ID or filename to delete
   * @returns True if the save was deleted successfully
   */
  public async deleteSave(idOrFilename: string): Promise<boolean> {
    try {
      // Determine if this is an ID or filename
      let filename = idOrFilename;
      let saveId = idOrFilename;
      
      if (idOrFilename.startsWith('save_')) {
        // This is an ID
        const metadata = this.metadataMap.get(idOrFilename);
        if (!metadata) {
          return false;
        }
        filename = metadata.filename;
      } else {
        // This is a filename, find the metadata
        for (const [id, meta] of this.metadataMap.entries()) {
          if (meta.filename === idOrFilename) {
            saveId = id;
            break;
          }
        }
      }
      
      const savePath = path.join(this.saveDir, filename);
      
      // Delete the save file
      await fs.unlink(savePath);
      
      // Remove from metadata
      this.metadataMap.delete(saveId);
      await this.saveMetadataFile();
      
      this.emit('saveDeleted', { id: saveId });
      
      return true;
    } catch (error) {
      this.emit('error', { 
        type: 'DeleteError', 
        message: `Error deleting save: ${(error as Error).message}` 
      });
      
      return false;
    }
  }
  
  /**
   * Ensure the save directory exists
   */
  private async ensureSaveDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.saveDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create save directory: ${(error as Error).message}`);
    }
  }
  
  /**
   * Load save metadata from file
   */
  private async loadMetadataFile(): Promise<void> {
    try {
      // Check if metadata file exists
      try {
        await fs.access(this.metadataFile);
      } catch (error) {
        // Metadata file doesn't exist, create an empty one
        this.metadataMap = new Map();
        await this.saveMetadataFile();
        return;
      }
      
      // Read metadata file
      const data = await fs.readFile(this.metadataFile, 'utf8');
      
      // Parse metadata
      const parsed = JSON.parse(data);
      
      // Convert to Map
      this.metadataMap = new Map(Object.entries(parsed));
    } catch (error) {
      this.emit('error', { 
        type: 'MetadataError', 
        message: `Error loading metadata: ${(error as Error).message}` 
      });
      
      // Initialize with empty metadata
      this.metadataMap = new Map();
    }
  }
  
  /**
   * Save metadata to file
   */
  private async saveMetadataFile(): Promise<void> {
    try {
      // Convert Map to object
      const metadataObj = Object.fromEntries(this.metadataMap);
      
      // Serialize to JSON
      const serialized = JSON.stringify(metadataObj, null, 2);
      
      // Write to file
      await fs.writeFile(this.metadataFile, serialized, 'utf8');
    } catch (error) {
      this.emit('error', { 
        type: 'MetadataError', 
        message: `Error saving metadata: ${(error as Error).message}` 
      });
    }
  }
  
  /**
   * Prepares the game state for serialization
   * @param state The game state to prepare
   * @returns A serializable version of the game state
   */
  private prepareStateForSerialization(state: GameState): any {
    // Create a deep copy of the state
    const serializedState = JSON.parse(JSON.stringify(state, (key, value) => {
      // Convert Maps to arrays of key-value pairs
      if (value instanceof Map) {
        return {
          __type: 'Map',
          data: Array.from(value.entries())
        };
      }
      return value;
    }));
    
    return serializedState;
  }
  
  /**
   * Restores the game state after deserialization
   * @param state The deserialized game state
   * @returns The restored game state
   */
  private restoreStateAfterDeserialization(state: any): GameState {
    // Recursively process the state to restore Maps
    const processValue = (value: any): any => {
      if (value === null || value === undefined) {
        return value;
      }
      
      if (Array.isArray(value)) {
        return value.map(item => processValue(item));
      }
      
      if (typeof value === 'object') {
        // Check if this is a serialized Map
        if (value.__type === 'Map' && Array.isArray(value.data)) {
          return new Map(value.data.map(([k, v]: [any, any]) => [k, processValue(v)]));
        }
        
        // Process regular objects
        const result: any = {};
        for (const key in value) {
          result[key] = processValue(value[key]);
        }
        return result;
      }
      
      return value;
    };
    
    return processValue(state) as GameState;
  }
}

// Create a singleton instance of the SaveManager
export const saveManager = new SaveManager(); 