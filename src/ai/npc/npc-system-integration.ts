/**
 * NPC System Integration
 * 
 * This module integrates all NPC AI components:
 * - Personality Model: Manages NPC personality traits, values, and emotional states
 * - Dialogue System: Generates contextually appropriate dialogue
 * - Behavior Simulation: Enables autonomous behavior based on personality and needs
 * 
 * This provides a unified interface for creating and managing intelligent NPCs
 * in the D&D world.
 */

import { MemoryManager } from '../memory/memory-manager';
import { RelationshipTracker } from '../memory/relationship-tracker';
import { EnhancedContextManager } from '../enhanced-context-manager';
import { PersonalityModel, NPCPersonality, EmotionalState, Emotion } from './personality-model';
import { DialogueSystem, DialogueSituation } from './dialogue-system';
import {
  BehaviorSimulation,
  NeedType,
  Goal,
  Behavior,
  ScheduleEntry,
  BehaviorState
} from './behavior-simulation';

/**
 * Configuration for the NPC AI System
 */
export interface NPCSystemConfig {
  enableBehaviorSimulation: boolean;
  enableDialogueSystem: boolean;
  enableEmotionalChanges: boolean;
  enableRelationshipTracking: boolean;
  enableScheduling: boolean;
  debugMode: boolean;
}

/**
 * Default NPC system configuration
 */
const DEFAULT_CONFIG: NPCSystemConfig = {
  enableBehaviorSimulation: true,
  enableDialogueSystem: true,
  enableEmotionalChanges: true,
  enableRelationshipTracking: true,
  enableScheduling: true,
  debugMode: false
};

/**
 * Full NPC data structure with all AI components
 */
export interface AIEnabledNPC {
  id: string;
  name: string;
  description: string;
  personality: NPCPersonality;
  behaviorState?: BehaviorState;
  location: string;
  occupation?: string;
  faction?: string;
  conversationTopics: string[];
  importantKnowledge: string[];
  questsOffered: string[];
}

/**
 * Manages all NPC AI systems and provides a unified interface
 */
export class NPCSystem {
  private memoryManager: MemoryManager;
  private relationshipTracker: RelationshipTracker;
  private contextManager: EnhancedContextManager;
  private personalityModel: PersonalityModel;
  private dialogueSystem: DialogueSystem;
  private behaviorSimulation: BehaviorSimulation;
  private config: NPCSystemConfig;
  
  // Track all managed NPCs
  private npcs: Map<string, AIEnabledNPC> = new Map();
  
  /**
   * Create a new integrated NPC system
   */
  constructor(
    memoryManager: MemoryManager,
    relationshipTracker: RelationshipTracker,
    contextManager: EnhancedContextManager,
    config?: Partial<NPCSystemConfig>
  ) {
    this.memoryManager = memoryManager;
    this.relationshipTracker = relationshipTracker;
    this.contextManager = contextManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize subsystems
    this.personalityModel = new PersonalityModel(
      memoryManager,
      relationshipTracker
    );
    
    this.dialogueSystem = new DialogueSystem(
      this.personalityModel,
      memoryManager,
      relationshipTracker,
      contextManager
    );
    
    this.behaviorSimulation = new BehaviorSimulation(
      this.personalityModel,
      memoryManager,
      relationshipTracker,
      this.dialogueSystem
    );
  }
  
  /**
   * Register a new NPC with the system
   */
  public registerNPC(
    id: string,
    name: string,
    description: string,
    location: string,
    personalityTraits?: Partial<NPCPersonality>,
    occupation?: string,
    faction?: string
  ): AIEnabledNPC {
    // Create personality
    const personality = this.personalityModel.registerNPC(id, personalityTraits || {});
    
    // Register with behavior simulation if enabled
    let behaviorState;
    if (this.config.enableBehaviorSimulation) {
      behaviorState = this.behaviorSimulation.registerNPC(id, undefined, undefined, undefined, undefined, location);
    }
    
    // Create NPC data structure
    const npc: AIEnabledNPC = {
      id,
      name,
      description,
      personality,
      behaviorState,
      location,
      occupation,
      faction,
      conversationTopics: [],
      importantKnowledge: [],
      questsOffered: []
    };
    
    // Store NPC
    this.npcs.set(id, npc);
    
    return npc;
  }
  
  /**
   * Generate dialogue for an NPC responding to a player
   */
  public async generateDialogue(
    npcId: string,
    playerId: string,
    playerQuery: string,
    situation: DialogueSituation = DialogueSituation.CASUAL_GREETING,
    location?: string
  ): Promise<string> {
    const npc = this.npcs.get(npcId);
    if (!npc) {
      throw new Error(`NPC with ID ${npcId} not found`);
    }
    
    // Use current NPC location if none provided
    const currentLocation = location || npc.location;
    
    try {
      return await this.dialogueSystem.generateDialogue(
        npcId,
        playerId,
        playerQuery,
        situation,
        currentLocation
      );
    } catch (error) {
      console.error(`Error generating dialogue for NPC ${npcId}:`, error);
      // Fall back to a simple response if dialogue generation fails
      return `${npc.name} looks at you thoughtfully but doesn't respond immediately.`;
    }
  }
  
  /**
   * Update NPC state based on game time passing
   */
  public updateNPCs(gameTimeMinutes: number): void {
    if (!this.config.enableBehaviorSimulation) return;
    
    // Update each NPC's behavior simulation
    for (const npcId of this.npcs.keys()) {
      this.behaviorSimulation.updateNPC(npcId, gameTimeMinutes);
    }
  }
  
  /**
   * Update an NPC's emotional state
   */
  public updateEmotionalState(
    npcId: string,
    emotion: Emotion,
    intensity: number,
    trigger: string
  ): EmotionalState | undefined {
    if (!this.config.enableEmotionalChanges) return undefined;
    
    return this.personalityModel.updateEmotionalState(
      npcId,
      emotion,
      intensity,
      trigger
    );
  }
  
  /**
   * Add a knowledge fact to an NPC
   */
  public addNPCKnowledge(
    npcId: string,
    knowledge: string,
    importance: number = 50
  ): boolean {
    const npc = this.npcs.get(npcId);
    if (!npc) return false;
    
    // Add to important knowledge list
    if (!npc.importantKnowledge.includes(knowledge)) {
      npc.importantKnowledge.push(knowledge);
    }
    
    // Create a corresponding dialogue topic
    this.dialogueSystem.addNPCTopic(
      npcId,
      knowledge,
      importance,
      80, // High knowledge level
      50  // Neutral interest
    );
    
    return true;
  }
  
  /**
   * Add a conversation topic for an NPC
   */
  public addConversationTopic(
    npcId: string,
    topic: string,
    importance: number = 50,
    knowledgeLevel: number = 60,
    npcInterest: number = 50
  ): boolean {
    const npc = this.npcs.get(npcId);
    if (!npc) return false;
    
    // Add to conversation topics list
    if (!npc.conversationTopics.includes(topic)) {
      npc.conversationTopics.push(topic);
    }
    
    // Add as dialogue topic
    this.dialogueSystem.addNPCTopic(
      npcId,
      topic,
      importance,
      knowledgeLevel,
      npcInterest
    );
    
    return true;
  }
  
  /**
   * Add a goal for an NPC
   */
  public addGoal(
    npcId: string,
    description: string,
    priority: number,
    completionCriteria: string,
    relatedNeed?: NeedType,
    assignedBy?: string
  ): Goal | undefined {
    if (!this.config.enableBehaviorSimulation) return undefined;
    
    return this.behaviorSimulation.addGoal(
      npcId,
      description,
      priority,
      completionCriteria,
      relatedNeed,
      undefined, // No parent goal
      undefined, // No deadline
      assignedBy
    );
  }
  
  /**
   * Add a custom behavior for an NPC
   */
  public addCustomBehavior(
    npcId: string,
    behavior: Behavior
  ): boolean {
    if (!this.config.enableBehaviorSimulation) return false;
    
    return this.behaviorSimulation.addBehavior(npcId, behavior);
  }
  
  /**
   * Update an NPC's location
   */
  public updateNPCLocation(
    npcId: string,
    newLocation: string
  ): boolean {
    const npc = this.npcs.get(npcId);
    if (!npc) return false;
    
    // Update in NPC record
    npc.location = newLocation;
    
    // Update in behavior system if enabled
    if (this.config.enableBehaviorSimulation) {
      this.behaviorSimulation.updateLocation(npcId, newLocation);
    }
    
    return true;
  }
  
  /**
   * Get the current behavior state of an NPC
   */
  public getNPCBehaviorState(npcId: string): BehaviorState | undefined {
    if (!this.config.enableBehaviorSimulation) return undefined;
    
    return this.behaviorSimulation.getBehaviorState(npcId);
  }
  
  /**
   * Get an NPC by ID
   */
  public getNPC(npcId: string): AIEnabledNPC | undefined {
    return this.npcs.get(npcId);
  }
  
  /**
   * Get all NPCs in a specific location
   */
  public getNPCsByLocation(location: string): AIEnabledNPC[] {
    const result: AIEnabledNPC[] = [];
    
    for (const npc of this.npcs.values()) {
      if (npc.location === location) {
        result.push(npc);
      }
    }
    
    return result;
  }
  
  /**
   * Remove an NPC from the system
   */
  public removeNPC(npcId: string): boolean {
    return this.npcs.delete(npcId);
  }
} 