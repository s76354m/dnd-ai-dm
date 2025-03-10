/**
 * Engine Interfaces
 * 
 * Defines the core interfaces for the D&D AI Dungeon Master engine.
 */

import { GameState } from './game';
import { Character } from './character';
import { NPC } from './npc';
import { Location } from './location';
import { CombatState } from './combat';
import { Quest } from './quest';

/**
 * Core Dungeon Master Engine interface
 */
export interface DMEngine {
  // Game state management
  getGameState(): GameState;
  updateGameState(updates: Partial<GameState>): void;
  saveGame(filename?: string): Promise<boolean>;
  loadGame(saveId: string): Promise<boolean>;
  
  // Narrative generation
  generateResponse(context: GameState, input: string): Promise<string>;
  describeLocation(location: Location): Promise<string>;
  
  // Command processing
  processCommand(command: string): Promise<any>;
  
  // Combat handling
  initiateCombat(hostiles: NPC[]): CombatState;
  endCombat(): void;
  nartateCombat(state: CombatState): string;
  
  // NPC management
  generateNPC(type: string): NPC;
  getNPCResponse(npc: NPC, input: string): Promise<string>;
  
  // Quest management
  generateQuest(difficulty: string): Quest;
  completeQuestObjective(questId: string, objectiveId: string): void;
  
  // Player actions
  handlePlayerAction(action: string): Promise<string>;
}

/**
 * Engine state for tracking DM operations
 */
export interface DMEngineState {
  initialized: boolean;
  processingCommand: boolean;
  lastCommandTime: number;
  lastResponseTime: number;
  errorCount: number;
  currentMode: 'exploration' | 'combat' | 'dialogue' | 'rest';
  activeNPC: string | null;
  activeQuest: string | null;
  debugMode: boolean;
  performanceMetrics: {
    averageResponseTime: number;
    commandCount: number;
    tokenUsage: number;
  };
}

/**
 * Events emitted by the DM engine
 */
export interface DMEngineEvent {
  type: 'command' | 'response' | 'combat' | 'npc' | 'quest' | 'error' | 'save' | 'load';
  timestamp: number;
  data: any;
}