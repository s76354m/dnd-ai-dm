/**
 * AIService interface
 * Defines the contract for AI service implementations
 */
export interface AIService {
  /**
   * Generate narrative text based on the provided context
   */
  generateNarrative(context: NarrativeContext): Promise<string>;

  /**
   * Determine an NPC's action based on their personality and the current context
   */
  resolveNPCAction(npc: NPC, context: ActionContext): Promise<NPCAction>;

  /**
   * Generate a new location with description and features
   */
  generateLocation(locationParams: LocationParams): Promise<Location>;

  /**
   * Create a new NPC with personality, dialogue, and behavior
   */
  createNPC(npcParams: NPCParams): Promise<NPC>;

  /**
   * Resolve an ambiguous player command into a specific game action
   */
  resolveAmbiguousCommand(command: string, context: GameState): Promise<ResolvedCommand>;

  /**
   * Generate a description of a spell's effect in the current context
   */
  describeSpellEffect(spell: Spell, context: SpellContext): Promise<string>;

  /**
   * Generate narrative text for a combat action and its result
   */
  generateCombatNarrative(action: CombatAction, result: ActionResult): Promise<string>;
}

/**
 * NarrativeContext interface
 * Contains all the context needed to generate narrative text
 */
export interface NarrativeContext {
  prompt: string;
  context: string;
  characters: Character[];
  location: Location;
  recentEvents: GameEvent[];
}

/**
 * ActionContext interface
 * Contains all the context needed to determine an NPC's action
 */
export interface ActionContext {
  gameState: GameState;
  playerAction: string;
  npcMemory: NPCMemory[];
  environmentFactors: EnvironmentFactor[];
}

/**
 * LocationParams interface
 * Parameters for generating a new location
 */
export interface LocationParams {
  locationType: LocationType;
  region: Region;
  importance: number; // 1-10 scale of location importance
  connectedTo: Location[];
  purpose: string;
}

/**
 * NPCParams interface
 * Parameters for creating a new NPC
 */
export interface NPCParams {
  role: NPCRole;
  importance: number; // 1-10 scale of NPC importance
  location: Location;
  faction: Faction | null;
  traits: string[];
}

/**
 * ResolvedCommand interface
 * The result of resolving an ambiguous player command
 */
export interface ResolvedCommand {
  intent: CommandIntent;
  targets: string[]; // IDs of targets
  parameters: Record<string, any>;
  confidence: number; // 0-1 scale of confidence in resolution
}

/**
 * SpellContext interface
 * Context for describing a spell effect
 */
export interface SpellContext {
  caster: Character;
  targets: Character[];
  location: Location;
  environmentFactors: EnvironmentFactor[];
  spellLevel: number;
}

/**
 * CombatAction interface
 * Represents an action taken in combat
 */
export interface CombatAction {
  actor: Character;
  actionType: ActionType;
  targets: Character[];
  weapon?: Item;
  spell?: Spell;
  ability?: Ability;
  rollResults: RollResult[];
}

/**
 * ActionResult interface
 * The result of a combat action
 */
export interface ActionResult {
  success: boolean;
  damage?: number;
  damageType?: DamageType;
  effectsApplied: Effect[];
  targetReactions: TargetReaction[];
}

// Placeholder types (to be implemented in separate files)
import { Character, GameState, Location, GameEvent } from '../../core/state/GameState';
export type NPC = any;
export type NPCAction = any;
export type NPCMemory = any;
export type EnvironmentFactor = any;
export type LocationType = any;
export type Region = any;
export type NPCRole = any;
export type Faction = any;
export type CommandIntent = any;
export type Spell = any;
export type ActionType = any;
export type Item = any;
export type Ability = any;
export type RollResult = any;
export type DamageType = any;
export type Effect = any;
export type TargetReaction = any; 