/**
 * Command Validator
 * 
 * Validates command parameters against the game state.
 */

import { GameState } from './interfaces/game';
import { Item } from './interfaces/item';
import { NPC } from './interfaces/npc';

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether the validation passed */
  isValid: boolean;
  /** Error message if validation failed */
  errorMessage?: string;
  /** The validated entity (item, NPC, etc.) if found */
  entity?: any;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Whether the parameter is required */
  required?: boolean;
  /** Minimum length for string parameters */
  minLength?: number;
  /** Maximum length for string parameters */
  maxLength?: number;
  /** Custom validation function */
  customValidator?: (value: any) => ValidationResult;
  /** Suggestion for missing required value */
  suggestion?: string;
  /** Whether to automatically try to normalize the value */
  autoNormalize?: boolean;
}

/**
 * Command validator
 */
export class CommandValidator {
  private gameState: GameState;

  /**
   * Create a new command validator
   * @param gameState Current game state
   */
  constructor(gameState: GameState) {
    this.gameState = gameState;
  }

  /**
   * Validate a required parameter
   * @param value Parameter value
   * @param paramName Name of the parameter for error messages
   * @param suggestion Optional suggestion for what the user should provide
   * @returns Validation result
   */
  validateRequired(value: string | undefined | null, paramName: string, suggestion?: string): ValidationResult {
    // Handle undefined or null
    if (value === undefined || value === null) {
      return {
        isValid: false,
        errorMessage: suggestion 
          ? `${paramName} is required. ${suggestion}`
          : `${paramName} is required.`
      };
    }
    
    // Handle empty string after trimming
    if (value.trim() === '') {
      return {
        isValid: false,
        errorMessage: suggestion 
          ? `${paramName} cannot be empty. ${suggestion}`
          : `${paramName} cannot be empty.`
      };
    }
    
    return { isValid: true };
  }

  /**
   * Normalize a parameter value by trimming and converting to lowercase
   * @param value Parameter value
   * @returns Normalized value or empty string if undefined/null
   */
  normalizeValue(value: string | undefined | null): string {
    if (value === undefined || value === null) {
      return '';
    }
    return value.toLowerCase().trim();
  }

  /**
   * Validate a string parameter
   * @param value Parameter value
   * @param options Validation options
   * @returns Validation result
   */
  validateString(value: string | undefined | null, options: ValidationOptions = {}): ValidationResult {
    // Handle undefined/null if required
    if ((value === undefined || value === null) && options.required) {
      return {
        isValid: false,
        errorMessage: options.suggestion 
          ? `Parameter is required. ${options.suggestion}`
          : 'Parameter is required.'
      };
    }
    
    // Handle undefined/null if not required
    if ((value === undefined || value === null) && !options.required) {
      return { isValid: true };
    }
    
    // Normalize if needed
    const normalizedValue = options.autoNormalize ? this.normalizeValue(value) : (value || '');
    
    // Check if empty and required
    if (options.required && normalizedValue === '') {
      return {
        isValid: false,
        errorMessage: options.suggestion 
          ? `Parameter cannot be empty. ${options.suggestion}`
          : 'Parameter cannot be empty.'
      };
    }

    // If not required and empty, it's valid
    if (!options.required && normalizedValue === '') {
      return { isValid: true };
    }

    // Check min length
    if (options.minLength && normalizedValue.length < options.minLength) {
      return {
        isValid: false,
        errorMessage: `Parameter must be at least ${options.minLength} characters.`
      };
    }

    // Check max length
    if (options.maxLength && normalizedValue.length > options.maxLength) {
      return {
        isValid: false,
        errorMessage: `Parameter cannot exceed ${options.maxLength} characters.`
      };
    }

    // Custom validation if provided
    if (options.customValidator) {
      return options.customValidator(normalizedValue);
    }

    return { isValid: true };
  }

  /**
   * Validate and find an item in the player's inventory
   * @param itemName Name of the item to find
   * @returns Validation result with the item if found
   */
  validateInventoryItem(itemName: string | undefined | null): ValidationResult {
    // Handle undefined/null
    if (itemName === undefined || itemName === null) {
      return {
        isValid: false,
        errorMessage: 'Please specify which item you want to use. For example: "use potion"'
      };
    }
    
    // Normalize the name
    const normalizedName = this.normalizeValue(itemName);
    
    // Check if parameter is provided (after normalization)
    if (normalizedName === '') {
      return {
        isValid: false,
        errorMessage: 'Please specify which item you want to use. For example: "use potion"'
      };
    }

    // Check if player has inventory
    if (!this.gameState.player?.inventory?.items) {
      return {
        isValid: false,
        errorMessage: 'Your inventory is empty.'
      };
    }

    // Find the item (use normalized name)
    const item = this.gameState.player.inventory.items.find(
      (item: Item) => item.name.toLowerCase().includes(normalizedName)
    );

    if (!item) {
      // Check for similar items to provide a suggestion
      const similarItems = this.gameState.player.inventory.items
        .filter((item: Item) => this.getSimilarity(item.name.toLowerCase(), normalizedName) > 0.5)
        .map((item: Item) => item.name);
      
      if (similarItems.length > 0) {
        return {
          isValid: false,
          errorMessage: `You don't have a '${itemName}' in your inventory. Did you mean: ${similarItems.join(', ')}?`
        };
      }
      
      return {
        isValid: false,
        errorMessage: `You don't have a '${itemName}' in your inventory.`
      };
    }

    return {
      isValid: true,
      entity: item
    };
  }

  /**
   * Validate and find an NPC in the current location
   * @param npcName Name of the NPC to find
   * @returns Validation result with the NPC if found
   */
  validateNPC(npcName: string | undefined | null): ValidationResult {
    // Handle undefined/null
    if (npcName === undefined || npcName === null) {
      return {
        isValid: false,
        errorMessage: 'Who do you want to talk to?'
      };
    }
    
    // Normalize the name
    const normalizedName = this.normalizeValue(npcName);
    
    // Check if parameter is provided (after normalization)
    if (normalizedName === '') {
      return {
        isValid: false,
        errorMessage: 'Who do you want to talk to?'
      };
    }

    // Check if location has NPCs
    const currentLocation = this.gameState.currentLocation;
    if (!currentLocation?.npcsPresent || currentLocation.npcsPresent.length === 0) {
      return {
        isValid: false,
        errorMessage: 'There is no one here to interact with.'
      };
    }

    // Find the NPC (use normalized name)
    const npcs = Array.from(this.gameState.npcs.values());
    const npc = npcs.find((n: NPC) => 
      currentLocation.npcsPresent.includes(n.id) && 
      n.name.toLowerCase().includes(normalizedName)
    );

    if (!npc) {
      // Check for similar NPCs to provide a suggestion
      const presentNpcs = npcs.filter((n: NPC) => currentLocation.npcsPresent.includes(n.id));
      const similarNpcs = presentNpcs
        .filter((n: NPC) => this.getSimilarity(n.name.toLowerCase(), normalizedName) > 0.5)
        .map((n: NPC) => n.name);
      
      if (similarNpcs.length > 0) {
        return {
          isValid: false,
          errorMessage: `There's no '${npcName}' here. Did you mean: ${similarNpcs.join(', ')}?`
        };
      }
      
      if (presentNpcs.length > 0) {
        const npcList = presentNpcs.map(n => n.name).join(', ');
        return {
          isValid: false,
          errorMessage: `There's no '${npcName}' here. Present characters: ${npcList}.`
        };
      }
      
      return {
        isValid: false,
        errorMessage: `There's no '${npcName}' here.`
      };
    }

    return {
      isValid: true,
      entity: npc
    };
  }

  /**
   * Validate and find an object in the current location
   * @param objectName Name of the object to find
   * @returns Validation result with the object if found
   */
  validateLocationObject(objectName: string | undefined | null): ValidationResult {
    // Handle undefined/null
    if (objectName === undefined || objectName === null) {
      return {
        isValid: false,
        errorMessage: 'What do you want to examine?'
      };
    }
    
    // Normalize the name
    const normalizedName = this.normalizeValue(objectName);
    
    // Check if parameter is provided (after normalization)
    if (normalizedName === '') {
      return {
        isValid: false,
        errorMessage: 'What do you want to examine?'
      };
    }

    // Check if location has objects
    const currentLocation = this.gameState.currentLocation;
    if (!currentLocation?.objectsPresent || currentLocation.objectsPresent.length === 0) {
      return {
        isValid: false,
        errorMessage: 'There are no objects here to interact with.'
      };
    }

    // Find the object (use normalized name)
    const objects = currentLocation.objects || [];
    const object = objects.find(obj => 
      obj.name.toLowerCase().includes(normalizedName)
    );

    if (!object) {
      // Check for similar objects to provide a suggestion
      const similarObjects = objects
        .filter(obj => this.getSimilarity(obj.name.toLowerCase(), normalizedName) > 0.5)
        .map(obj => obj.name);
      
      if (similarObjects.length > 0) {
        return {
          isValid: false,
          errorMessage: `There's no '${objectName}' here. Did you mean: ${similarObjects.join(', ')}?`
        };
      }
      
      if (objects.length > 0) {
        const objectList = objects.map(obj => obj.name).join(', ');
        return {
          isValid: false,
          errorMessage: `There's no '${objectName}' here. Visible objects: ${objectList}.`
        };
      }
      
      return {
        isValid: false,
        errorMessage: `There's no '${objectName}' here.`
      };
    }

    return {
      isValid: true,
      entity: object
    };
  }

  /**
   * Validate and find an exit in the current location
   * @param direction Direction to check for an exit
   * @returns Validation result with the exit if found
   */
  validateExit(direction: string | undefined | null): ValidationResult {
    // Handle undefined/null
    if (direction === undefined || direction === null) {
      return {
        isValid: false,
        errorMessage: 'Which direction do you want to go?'
      };
    }
    
    // Normalize the direction
    const normalizedDirection = this.normalizeValue(direction);
    
    // Check if parameter is provided (after normalization)
    if (normalizedDirection === '') {
      return {
        isValid: false,
        errorMessage: 'Which direction do you want to go?'
      };
    }

    // Check if location has exits
    const currentLocation = this.gameState.currentLocation;
    if (!currentLocation?.exits || currentLocation.exits.length === 0) {
      return {
        isValid: false,
        errorMessage: 'There are no exits from this location.'
      };
    }

    // Map common direction shortcuts
    const directionMap: Record<string, string> = {
      'n': 'north',
      's': 'south',
      'e': 'east',
      'w': 'west',
      'u': 'up',
      'd': 'down',
      'nw': 'northwest',
      'ne': 'northeast',
      'se': 'southeast',
      'sw': 'southwest'
    };

    // Normalize and map the direction
    const mappedDirection = directionMap[normalizedDirection] || normalizedDirection;

    // Find the exit
    const exit = currentLocation.exits.find(e => 
      e.direction.toLowerCase() === mappedDirection
    );

    if (!exit) {
      // List available exits as suggestion
      const availableExits = currentLocation.exits
        .map(e => e.direction.toLowerCase())
        .join(', ');
      
      return {
        isValid: false,
        errorMessage: `You can't go ${direction} from here. Available exits: ${availableExits}.`
      };
    }

    return {
      isValid: true,
      entity: exit
    };
  }
  
  /**
   * Calculate string similarity (Levenshtein distance based)
   * @param str1 First string
   * @param str2 Second string
   * @returns Similarity score (0-1)
   */
  private getSimilarity(str1: string, str2: string): number {
    // Calculate Levenshtein distance (edit distance)
    const a = str1.toLowerCase();
    const b = str2.toLowerCase();
    
    if (a.length === 0) return b.length === 0 ? 1 : 0;
    if (b.length === 0) return 0;
    
    // Simple substring check first
    if (a.includes(b) || b.includes(a)) {
      return 0.8;
    }
    
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