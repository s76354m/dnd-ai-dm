/**
 * Command interfaces for the D&D AI DM project
 * These interfaces define the structure of commands processed by the system
 */

/**
 * Represents a command that has been resolved by the AI
 * This includes the original command, the action to take, and any targets or parameters
 */
export interface ResolvedCommand {
  original: string;           // The original command text
  action: string;             // The resolved action (move, attack, interact, etc.)
  target?: string;            // The primary target of the action
  parameters?: Record<string, any>; // Additional parameters for the action
  direction?: string;         // Direction for movement commands
  item?: string;              // Item for use/equip commands
  spell?: string;             // Spell for cast commands
  ability?: string;           // Ability for check commands
  skill?: string;             // Skill for check commands
}

/**
 * Result of a command execution
 */
export interface CommandResult {
  /** Message to display to the player */
  message: string;
  
  /** Whether the game should exit */
  shouldExit?: boolean;
  
  /** Whether the game should save */
  shouldSave?: boolean;
  
  /** Events triggered by this command */
  triggeredEvents?: GameEvent[];
  
  /** Changes to the game state (for loading saves) */
  stateChanges?: GameState;
} 