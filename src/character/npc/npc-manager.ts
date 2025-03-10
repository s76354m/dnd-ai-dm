/**
 * NPC Manager
 * 
 * Manages all NPCs in the game world, including their creation, updating,
 * persistence, and relationships with the player.
 */

import { NPC, NPCMemory, NPCPersonality, createDefaultNPCMemory, createDefaultPersonality } from '../../core/interfaces/npc';
import { AIService } from '../../dm/ai-service';
import { DialogueGenerator } from './dialogue-generator';
import { ConversationManager } from './conversation-manager';
import { Character } from '../../core/interfaces/character';
import { Race } from '../../core/types';
import { GameState } from '../../core/interfaces/game';
import { v4 as uuidv4 } from 'uuid';
import { DialogueNode, DialogueResponse } from '../../core/interfaces/quest';
import { Quest } from '../../core/interfaces/quest';

// Optional import for QuestManager if available
let QuestManager: any;
try {
  QuestManager = require('../../quest/quest-manager').QuestManager;
} catch (e) {
  // Quest manager not available, will use alternative methods
}

export class NPCManager {
  private npcs: Map<string, NPC>;
  private aiService: AIService;
  private dialogueGenerator: DialogueGenerator;
  private conversationManager: ConversationManager;
  private player: Character;
  private questManager?: any; // QuestManager if available
  
  constructor(player: Character, aiService: AIService) {
    this.npcs = new Map();
    this.aiService = aiService;
    this.player = player;
    this.dialogueGenerator = new DialogueGenerator(aiService);
    this.conversationManager = new ConversationManager(player, aiService);
  }
  
  /**
   * Connect this manager with a quest manager for integrated functionality
   */
  public connectQuestManager(questManager: any): void {
    this.questManager = questManager;
  }
  
  /**
   * Initialize with predefined NPCs
   */
  public initializeWithNPCs(npcs: NPC[]): void {
    for (const npc of npcs) {
      // Ensure NPCs have all required fields
      const completeNPC = this.completeNPC(npc);
      this.npcs.set(completeNPC.id, completeNPC);
    }
  }
  
  /**
   * Create a new NPC
   */
  public createNPC(
    name: string,
    race: Race,
    description: string,
    attitude: 'friendly' | 'neutral' | 'hostile',
    locationId: string,
    isQuestGiver: boolean = false,
    occupation?: string,
    additionalTraits?: string[]
  ): NPC {
    // Generate a unique ID
    const id = `npc-${uuidv4()}`;
    
    // Create the NPC
    const npc: NPC = {
      id,
      name,
      race,
      description,
      attitude,
      isQuestGiver,
      occupation,
      location: locationId,
      dialogue: [],
      memory: createDefaultNPCMemory(),
      personality: createDefaultPersonality(attitude),
      traits: additionalTraits || []
    };
    
    // Store the NPC
    this.npcs.set(id, npc);
    
    return npc;
  }
  
  /**
   * Get an NPC by ID
   */
  public getNPC(id: string): NPC | undefined {
    return this.npcs.get(id);
  }
  
  /**
   * Get all NPCs in a location
   */
  public getNPCsInLocation(locationId: string): NPC[] {
    return Array.from(this.npcs.values())
      .filter(npc => npc.location === locationId);
  }
  
  /**
   * Generate dialogue for an NPC
   */
  public async generateDialogue(
    npcId: string,
    gameState: Partial<GameState>,
    topic?: string
  ): Promise<any> { // Using 'any' for simplicity, would be DialogueNode in implementation
    const npc = this.npcs.get(npcId);
    if (!npc) {
      throw new Error(`NPC with ID ${npcId} not found`);
    }
    
    // Get previous dialogue if any
    const previousDialogue = this.getDialogueHistory(npcId);
    
    // Generate dynamic dialogue
    return this.dialogueGenerator.generateDialogueNode(
      npc,
      this.player,
      gameState,
      previousDialogue,
      topic
    );
  }
  
  /**
   * Start a conversation with an NPC
   */
  public async startConversation(npcId: string): Promise<any> {
    const npc = this.npcs.get(npcId);
    if (!npc) {
      throw new Error(`NPC with ID ${npcId} not found`);
    }
    
    return this.conversationManager.startConversation(npc);
  }
  
  /**
   * Select a response in a conversation with an NPC
   */
  public async selectDialogueResponse(npcId: string, responseId: string): Promise<any> {
    const npc = this.npcs.get(npcId);
    if (!npc) {
      throw new Error(`NPC with ID ${npcId} not found`);
    }
    
    return this.conversationManager.selectResponse(npc, responseId);
  }
  
  /**
   * End a conversation with an NPC
   */
  public endConversation(npcId: string): void {
    this.conversationManager.endConversation(npcId);
  }
  
  /**
   * Get conversation history with an NPC
   */
  private getDialogueHistory(npcId: string): string[] {
    const memory = this.conversationManager.getNPCMemory(npcId);
    if (!memory) return [];
    
    // Convert history entries to strings
    return memory.conversationHistory.map(entry => 
      `${entry.playerStatement ? 'Player: ' + entry.playerStatement + '\n' : ''}${entry.npcResponse ? 'NPC: ' + entry.npcResponse : ''}`
    );
  }
  
  /**
   * Update an NPC's location
   */
  public updateNPCLocation(npcId: string, locationId: string): void {
    const npc = this.npcs.get(npcId);
    if (npc) {
      npc.location = locationId;
    }
  }
  
  /**
   * Record that the player completed a quest for an NPC
   */
  public recordQuestCompleted(npcId: string, questId: string): void {
    this.conversationManager.recordQuestCompleted(npcId, questId);
    
    // Also update the NPC's dialogue to reflect quest completion
    this.addQuestCompletionDialogue(npcId, questId);
  }
  
  /**
   * Add quest completion dialogue to an NPC
   */
  private async addQuestCompletionDialogue(npcId: string, questId: string): Promise<void> {
    const npc = this.npcs.get(npcId);
    if (!npc) return;
    
    // Get the quest from quest manager if available
    let questTitle = 'your quest';
    let questDescription = 'the task I asked of you';
    
    if (this.questManager) {
      const quest = this.questManager.getQuest(questId);
      if (quest) {
        questTitle = quest.title;
        questDescription = quest.description;
      }
    }
    
    // Create a completion dialogue node
    const completionNode: DialogueNode = {
      id: `quest-completion-${questId}-${Date.now()}`,
      text: `Thank you for completing ${questTitle}! I am grateful for your help with ${questDescription}.`,
      npcId: npc.id,
      responses: [
        {
          id: `thanks-${Date.now()}`,
          text: 'You\'re welcome.',
          nextNodeId: 'END',
          relationshipEffect: 1,
          isGoodbye: true
        },
        {
          id: `reward-${Date.now()}`,
          text: 'What about my reward?',
          nextNodeId: 'END',
          relationshipEffect: -1,
          isGoodbye: true
        }
      ],
      tags: ['quest_completion', questId],
      emotion: 'grateful'
    };
    
    // Add the dialogue node to the NPC
    npc.dialogue.push(completionNode);
  }
  
  /**
   * Check if the NPC has a quest available
   */
  public hasAvailableQuest(npcId: string): boolean {
    const npc = this.npcs.get(npcId);
    if (!npc || !npc.isQuestGiver) {
      return false;
    }
    
    // If quest manager is available, use it to check
    if (this.questManager) {
      // Check if this NPC has any active quests
      const npcQuests = this.questManager.getQuestsFromNPC(npcId);
      const hasActiveQuest = npcQuests.some(q => q.status === 'active');
      
      // If there are no active quests, NPC can offer a new one
      return !hasActiveQuest;
    }
    
    // Default to true for quest givers without quest manager
    return npc.isQuestGiver;
  }
  
  /**
   * Offer a quest from an NPC to the player
   */
  public async offerQuest(npcId: string): Promise<any> {
    const npc = this.npcs.get(npcId);
    if (!npc) {
      throw new Error(`NPC with ID ${npcId} not found`);
    }
    
    if (!npc.isQuestGiver) {
      return {
        success: false,
        message: `${npc.name} doesn't have any quests to offer.`
      };
    }
    
    // If quest manager is available, use it to generate a quest
    if (this.questManager) {
      const questResult = await this.questManager.generateQuest(npc);
      
      if (questResult.success && questResult.quest) {
        // Create dialogue for the quest
        await this.createQuestOfferDialogue(npc, questResult.quest);
        
        return {
          success: true,
          quest: questResult.quest,
          message: `${npc.name} offers you a quest: ${questResult.quest.title}`
        };
      }
    }
    
    // Fallback if quest manager isn't available
    return {
      success: false,
      message: `${npc.name} seems like they want to offer you a quest, but they haven't worked out the details yet.`
    };
  }
  
  /**
   * Create dialogue for offering a quest
   */
  private async createQuestOfferDialogue(npc: NPC, quest: Quest): Promise<void> {
    // Create a quest offer dialogue node
    const offerNode: DialogueNode = {
      id: `quest-offer-${quest.id}`,
      text: `I need your help with something important. ${quest.description} Would you be willing to help me?`,
      npcId: npc.id,
      responses: [
        {
          id: `accept-${quest.id}`,
          text: 'I\'ll help you.',
          nextNodeId: `quest-accepted-${quest.id}`,
          isQuestAccept: true
        },
        {
          id: `decline-${quest.id}`,
          text: 'Sorry, I\'m busy right now.',
          nextNodeId: `quest-declined-${quest.id}`,
          isQuestRefuse: true
        },
        {
          id: `more-info-${quest.id}`,
          text: 'Tell me more about this task.',
          nextNodeId: `quest-details-${quest.id}`
        }
      ],
      tags: ['quest_offer', quest.id],
      isQuestRelevant: true,
      questId: quest.id
    };
    
    // Create a quest accepted node
    const acceptedNode: DialogueNode = {
      id: `quest-accepted-${quest.id}`,
      text: `Thank you! This means a lot to me. The task is simple: ${this.formatQuestObjectives(quest)}`,
      npcId: npc.id,
      responses: [
        {
          id: `accepted-goodbye-${quest.id}`,
          text: 'I\'ll get right on it.',
          nextNodeId: 'END',
          isGoodbye: true
        }
      ],
      tags: ['quest_accepted', quest.id],
      isQuestRelevant: true,
      questId: quest.id
    };
    
    // Create a quest declined node
    const declinedNode: DialogueNode = {
      id: `quest-declined-${quest.id}`,
      text: 'I understand. Perhaps another time then.',
      npcId: npc.id,
      responses: [
        {
          id: `declined-goodbye-${quest.id}`,
          text: 'Goodbye.',
          nextNodeId: 'END',
          isGoodbye: true
        }
      ],
      tags: ['quest_declined', quest.id]
    };
    
    // Create a quest details node
    const detailsNode: DialogueNode = {
      id: `quest-details-${quest.id}`,
      text: `Here's what you need to know: ${quest.description} ${this.formatQuestObjectives(quest)} ${this.formatQuestRewards(quest)}`,
      npcId: npc.id,
      responses: [
        {
          id: `details-accept-${quest.id}`,
          text: 'I\'ll take the quest.',
          nextNodeId: `quest-accepted-${quest.id}`,
          isQuestAccept: true
        },
        {
          id: `details-decline-${quest.id}`,
          text: 'I\'ll pass for now.',
          nextNodeId: `quest-declined-${quest.id}`,
          isQuestRefuse: true
        }
      ],
      tags: ['quest_details', quest.id],
      isQuestRelevant: true,
      questId: quest.id
    };
    
    // Add all these nodes to the NPC's dialogue
    npc.dialogue.push(offerNode, acceptedNode, declinedNode, detailsNode);
  }
  
  /**
   * Format quest objectives for dialogue
   */
  private formatQuestObjectives(quest: Quest): string {
    if (!quest.objectives || quest.objectives.length === 0) {
      return 'There are no specific objectives.';
    }
    
    return 'You need to ' + quest.objectives.map(obj => 
      `${obj.description}${obj.location ? ` in ${obj.location}` : ''}`
    ).join(', and ') + '.';
  }
  
  /**
   * Format quest rewards for dialogue
   */
  private formatQuestRewards(quest: Quest): string {
    if (!quest.rewards || quest.rewards.length === 0) {
      return 'I\'ll be very grateful for your help.';
    }
    
    const rewardTexts = quest.rewards.map(reward => {
      if (reward.type === 'gold') {
        return `${reward.value} gold coins`;
      } else if (reward.type === 'experience') {
        return 'valuable experience';
      } else if (reward.type === 'item' && reward.item) {
        return reward.item.name;
      }
      return 'a reward';
    });
    
    return `In return, I'll give you ${rewardTexts.join(' and ')}.`;
  }
  
  /**
   * Check if NPC has a completed quest from the player
   */
  public hasCompletedQuest(npcId: string): boolean {
    const npc = this.npcs.get(npcId);
    if (!npc) return false;
    
    const memory = this.conversationManager.getNPCMemory(npcId);
    if (!memory) return false;
    
    // Check if there are completed quests that haven't been acknowledged
    return memory.questsCompleted.length > 0;
  }
  
  /**
   * Generate a random NPC for a location
   */
  public async generateRandomNPC(
    locationId: string,
    type: 'merchant' | 'quest_giver' | 'citizen' | 'guard' | 'traveler'
  ): Promise<NPC> {
    // Default values based on type
    let name = 'Random NPC';
    let description = 'A nondescript individual.';
    let attitude: 'friendly' | 'neutral' | 'hostile' = 'neutral';
    let isQuestGiver = false;
    let occupation = '';
    let race: Race = 'human';
    
    // Set defaults based on type
    switch (type) {
      case 'merchant':
        name = this.generateRandomName();
        description = 'A shrewd merchant looking to make a profit.';
        attitude = 'neutral';
        occupation = 'Merchant';
        break;
        
      case 'quest_giver':
        name = this.generateRandomName();
        description = 'Someone with a task that needs completing.';
        attitude = 'friendly';
        isQuestGiver = true;
        break;
        
      case 'citizen':
        name = this.generateRandomName();
        description = 'A local resident going about their day.';
        attitude = Math.random() > 0.7 ? 'friendly' : 'neutral';
        break;
        
      case 'guard':
        name = this.generateRandomName();
        description = 'A vigilant guard keeping watch over the area.';
        attitude = 'neutral';
        occupation = 'Guard';
        break;
        
      case 'traveler':
        name = this.generateRandomName();
        description = 'A weary traveler passing through.';
        attitude = 'neutral';
        occupation = 'Traveler';
        break;
    }
    
    // Generate the NPC
    const npc = this.createNPC(
      name,
      race,
      description,
      attitude,
      locationId,
      isQuestGiver,
      occupation
    );
    
    return npc;
  }
  
  /**
   * Generate a random name
   */
  private generateRandomName(): string {
    const firstNames = [
      'Alaric', 'Brenna', 'Cedric', 'Doria', 'Elric', 'Fiona', 'Gareth', 'Hilda',
      'Idris', 'Jora', 'Kavin', 'Lina', 'Marwyn', 'Nessa', 'Osric', 'Petra',
      'Quincy', 'Rowena', 'Sylas', 'Talia', 'Urien', 'Verna', 'Wilmar', 'Xenia'
    ];
    
    const lastNames = [
      'Ambrose', 'Blackwood', 'Coldwater', 'Duskwalker', 'Emberforge', 'Fairwind',
      'Grimthorn', 'Harrowheart', 'Ironwood', 'Jewelcutter', 'Knightley', 'Lowkeeper',
      'Mossbrook', 'Nightshade', 'Oakenheart', 'Proudfoot', 'Quicksilver', 'Ravenwood',
      'Silverhand', 'Thornfield', 'Underhill', 'Valekeeper', 'Whitehorn', 'Yelloweye'
    ];
    
    // Random selection
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    // 70% chance to have a last name
    return Math.random() > 0.3 ? `${firstName} ${lastName}` : firstName;
  }
  
  /**
   * Fill in any missing required fields in an NPC
   */
  private completeNPC(npc: Partial<NPC>): NPC {
    // Ensure the NPC has an ID
    const id = npc.id || `npc-${uuidv4()}`;
    
    // Create a complete NPC with defaults for missing fields
    const completeNPC: NPC = {
      id,
      name: npc.name || 'Unknown',
      race: npc.race || 'human',
      description: npc.description || 'No description available.',
      attitude: npc.attitude || 'neutral',
      isQuestGiver: npc.isQuestGiver || false,
      dialogue: npc.dialogue || [],
      location: npc.location || 'unknown',
      occupation: npc.occupation,
      inventory: npc.inventory,
      stats: npc.stats,
      schedule: npc.schedule,
      memory: npc.memory || createDefaultNPCMemory(),
      personality: npc.personality || createDefaultPersonality(npc.attitude || 'neutral'),
      knowledge: npc.knowledge,
      faction: npc.faction,
      traits: npc.traits || []
    };
    
    return completeNPC;
  }
  
  /**
   * Get all NPCs in the game world
   */
  public getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values());
  }
  
  /**
   * Get all quest givers in a location
   */
  public getQuestGiversInLocation(locationId: string): NPC[] {
    return this.getNPCsInLocation(locationId)
      .filter(npc => npc.isQuestGiver);
  }
  
  /**
   * Save all NPC data
   */
  public saveNPCs(): any {
    // Convert to serializable format
    return Array.from(this.npcs.entries())
      .map(([id, npc]) => this.serializeNPC(npc));
  }
  
  /**
   * Convert an NPC to a serializable format
   */
  private serializeNPC(npc: NPC): any {
    // Deep copy to prevent modifying the original
    const serialized = { ...npc };
    
    // Convert maps to arrays of entries for serialization
    if (npc.memory?.knownTopics) {
      serialized.memory = {
        ...npc.memory,
        knownTopics: Array.from(npc.memory.knownTopics.entries())
      };
    }
    
    if (npc.knowledge) {
      serialized.knowledge = Array.from(npc.knowledge.entries());
    }
    
    if (npc.schedule?.weeklyOverrides) {
      serialized.schedule = {
        ...npc.schedule,
        weeklyOverrides: Array.from(npc.schedule.weeklyOverrides.entries())
      };
    }
    
    return serialized;
  }
  
  /**
   * Load NPCs from serialized data
   */
  public loadNPCs(data: any[]): void {
    this.npcs.clear();
    
    for (const serializedNPC of data) {
      const npc = this.deserializeNPC(serializedNPC);
      this.npcs.set(npc.id, npc);
    }
  }
  
  /**
   * Convert serialized data back to an NPC
   */
  private deserializeNPC(data: any): NPC {
    // Deep copy to prevent modifying the original
    const npc: any = { ...data };
    
    // Convert arrays back to maps
    if (npc.memory?.knownTopics && Array.isArray(npc.memory.knownTopics)) {
      npc.memory.knownTopics = new Map(npc.memory.knownTopics);
    }
    
    if (npc.knowledge && Array.isArray(npc.knowledge)) {
      npc.knowledge = new Map(npc.knowledge);
    }
    
    if (npc.schedule?.weeklyOverrides && Array.isArray(npc.schedule.weeklyOverrides)) {
      npc.schedule.weeklyOverrides = new Map(npc.schedule.weeklyOverrides);
    }
    
    return npc as NPC;
  }
  
  /**
   * Update an NPC with new data
   * @param npc The updated NPC object
   */
  public updateNPC(npc: NPC): void {
    if (!npc || !npc.id) {
      throw new Error('Cannot update NPC: Invalid NPC or missing ID');
    }
    
    this.npcs.set(npc.id, npc);
  }
  
  /**
   * Get NPCs by a specific faction
   * @param faction The faction name
   */
  public getNPCsByFaction(faction: string): NPC[] {
    return this.getAllNPCs().filter(npc => npc.faction === faction);
  }
  
  /**
   * Initialize relationships between NPCs in a location
   * @param locationId The location ID
   */
  public initializeNPCRelationships(locationId: string): void {
    const npcs = this.getNPCsInLocation(locationId);
    
    // Skip if fewer than 2 NPCs
    if (npcs.length < 2) {
      return;
    }
    
    // Initialize relationships between all NPCs in the location
    for (let i = 0; i < npcs.length; i++) {
      const npc1 = npcs[i];
      
      // Make sure npc1 has a relationships array
      if (!npc1.relationships) {
        npc1.relationships = [];
      }
      
      for (let j = i + 1; j < npcs.length; j++) {
        const npc2 = npcs[j];
        
        // Make sure npc2 has a relationships array
        if (!npc2.relationships) {
          npc2.relationships = [];
        }
        
        // Skip if relationship already exists
        if (npc1.relationships.some(r => r.npcId === npc2.id) ||
            npc2.relationships.some(r => r.npcId === npc1.id)) {
          continue;
        }
        
        // Create initial relationship values based on occupation compatibility
        let initialValue = Math.floor(Math.random() * 40) - 10; // -10 to +29
        
        // Adjust based on occupation compatibility
        if (this.areOccupationsCompatible(npc1.occupation, npc2.occupation)) {
          initialValue += 20; // Boost for compatible occupations
        }
        
        // Adjust based on faction relationship
        if (npc1.faction && npc2.faction) {
          if (npc1.faction === npc2.faction) {
            initialValue += 15; // Same faction bonus
          } else if (this.areFactionsFriendly(npc1.faction, npc2.faction)) {
            initialValue += 5; // Friendly factions bonus
          } else if (this.areFactionsHostile(npc1.faction, npc2.faction)) {
            initialValue -= 25; // Hostile factions penalty
          }
        }
        
        // Cap values to valid range
        initialValue = Math.max(-75, Math.min(75, initialValue));
        
        // Create relationship type based on value
        const type = this.getRelationshipType(initialValue);
        
        // Add reciprocal relationships
        npc1.relationships.push({
          npcId: npc2.id,
          value: initialValue,
          type,
          lastInteraction: Date.now()
        });
        
        // Add slight randomness to the reciprocal relationship
        const reciprocalValue = initialValue + Math.floor(Math.random() * 11) - 5;
        
        npc2.relationships.push({
          npcId: npc1.id,
          value: Math.max(-75, Math.min(75, reciprocalValue)),
          type: this.getRelationshipType(reciprocalValue),
          lastInteraction: Date.now()
        });
        
        // Update both NPCs
        this.updateNPC(npc1);
        this.updateNPC(npc2);
      }
    }
  }
  
  /**
   * Determine if two occupations are compatible
   */
  private areOccupationsCompatible(occupation1?: string, occupation2?: string): boolean {
    if (!occupation1 || !occupation2) {
      return false;
    }
    
    // Simple compatibility check based on common pairs
    const compatiblePairs: Record<string, string[]> = {
      'merchant': ['blacksmith', 'farmer', 'tailor', 'jeweler', 'innkeeper'],
      'blacksmith': ['merchant', 'guard', 'adventurer'],
      'guard': ['guard', 'captain', 'noble'],
      'noble': ['noble', 'advisor', 'servant'],
      'farmer': ['farmer', 'merchant', 'miller'],
      'innkeeper': ['merchant', 'cook', 'bard'],
      'priest': ['acolyte', 'noble', 'healer']
    };
    
    const norm1 = occupation1.toLowerCase().trim();
    const norm2 = occupation2.toLowerCase().trim();
    
    return (compatiblePairs[norm1] && compatiblePairs[norm1].includes(norm2)) ||
           (compatiblePairs[norm2] && compatiblePairs[norm2].includes(norm1));
  }
  
  /**
   * Check if two factions are friendly
   */
  private areFactionsFriendly(faction1: string, faction2: string): boolean {
    // Sample faction relationships - in a real implementation, this would be data-driven
    const friendlyFactions: Record<string, string[]> = {
      'town guard': ['merchants guild', 'nobility'],
      'merchants guild': ['town guard', 'travelers'],
      'nobility': ['town guard', 'temple'],
      'temple': ['nobility', 'commoners'],
      'commoners': ['temple', 'travelers'],
      'travelers': ['merchants guild', 'commoners']
    };
    
    const norm1 = faction1.toLowerCase().trim();
    const norm2 = faction2.toLowerCase().trim();
    
    return (friendlyFactions[norm1] && friendlyFactions[norm1].includes(norm2)) ||
           (friendlyFactions[norm2] && friendlyFactions[norm2].includes(norm1));
  }
  
  /**
   * Check if two factions are hostile
   */
  private areFactionsHostile(faction1: string, faction2: string): boolean {
    // Sample faction relationships - in a real implementation, this would be data-driven
    const hostileFactions: Record<string, string[]> = {
      'town guard': ['bandits', 'thieves guild'],
      'bandits': ['town guard', 'merchants guild', 'nobility'],
      'thieves guild': ['town guard', 'nobility'],
      'nobility': ['bandits', 'thieves guild'],
      'cultists': ['temple', 'town guard']
    };
    
    const norm1 = faction1.toLowerCase().trim();
    const norm2 = faction2.toLowerCase().trim();
    
    return (hostileFactions[norm1] && hostileFactions[norm1].includes(norm2)) ||
           (hostileFactions[norm2] && hostileFactions[norm2].includes(norm1));
  }
  
  /**
   * Get relationship type based on value
   */
  private getRelationshipType(value: number): string {
    if (value <= -75) return 'enemy';
    if (value <= -30) return 'disliked';
    if (value <= -10) return 'unfriendly';
    if (value < 10) return 'neutral';
    if (value < 30) return 'friendly';
    if (value < 75) return 'friend';
    return 'close friend';
  }
  
  /**
   * Get all relationships for an NPC
   * @param npcId The NPC's ID
   * @returns A list of NPCs and their relationships with the specified NPC
   */
  public getNPCRelationships(npcId: string): {npc: NPC, relationship: NPCRelationship}[] {
    const npc = this.getNPC(npcId);
    if (!npc || !npc.relationships) {
      return [];
    }
    
    return npc.relationships
      .map(r => {
        const otherNpc = this.getNPC(r.npcId);
        return otherNpc ? { npc: otherNpc, relationship: r } : null;
      })
      .filter((r): r is {npc: NPC, relationship: NPCRelationship} => r !== null);
  }
} 