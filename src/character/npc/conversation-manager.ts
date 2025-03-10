/**
 * Conversation Manager
 * 
 * Manages interactions between the player and NPCs, handling dialogue state,
 * memory, and conversation history.
 */

import { Character } from '../../core/interfaces/character';
import { 
  NPC, 
  NPCMemory, 
  DialogueHistoryEntry,
  NPCMemoryEvent, 
  createDefaultNPCMemory 
} from '../../core/interfaces/npc';
import { 
  DialogueNode, 
  DialogueResponse, 
  DialogueRequirement,
  DialogueCondition,
  ConversationState,
  DialogueSkillCheck,
  SkillCheckResult,
  DialogueHistoryItem
} from '../../core/interfaces/quest';
import { AIService } from '../../dm/ai-service';
import { Ability } from '../../core/types';
import { Item } from '../../core/interfaces/item';

export interface DialogueResult {
  text: string;
  availableResponses: DialogueResponse[];
  skillCheck?: DialogueSkillCheck;
  conversationEnded: boolean;
  relationshipChange?: number;
  questAccepted?: string;
  questRefused?: string;
  itemsReceived?: Item[];
}

/**
 * The ConversationManager handles all dialogue interactions with NPCs
 * including memory of previous conversations and tracking dialogue state
 */
export class ConversationManager {
  private player: Character;
  private aiService: AIService;
  private activeConversations: Map<string, ConversationState>; // npcId -> conversation state
  private npcMemories: Map<string, NPCMemory>; // npcId -> memory
  
  constructor(player: Character, aiService: AIService) {
    this.player = player;
    this.aiService = aiService;
    this.activeConversations = new Map();
    this.npcMemories = new Map();
  }
  
  /**
   * Start a new conversation with an NPC
   */
  public async startConversation(npc: NPC): Promise<DialogueResult> {
    // Initialize or retrieve memory for this NPC
    if (!this.npcMemories.has(npc.id)) {
      this.npcMemories.set(npc.id, createDefaultNPCMemory());
    }
    const memory = this.npcMemories.get(npc.id)!;
    
    // Update memory for this interaction
    memory.interactionCount++;
    memory.lastInteraction = new Date();
    
    // Find an appropriate starting dialogue node
    const startingNode = this.findStartingNode(npc, memory);
    
    // Create a new conversation state
    const conversationState: ConversationState = {
      npcId: npc.id,
      currentNodeId: startingNode.id,
      history: [],
      startTime: new Date(),
      topicsDiscovered: [],
      skillChecksAttempted: [],
      relationshipChange: 0,
      status: 'active'
    };
    
    // Store the conversation state
    this.activeConversations.set(npc.id, conversationState);
    
    // Add this dialogue to the history
    const historyItem: DialogueHistoryItem = {
      nodeId: startingNode.id,
      npcText: startingNode.text,
      timestamp: new Date()
    };
    conversationState.history.push(historyItem);
    
    // If this dialogue reveals a topic, add it to discovered topics
    if (startingNode.revealsTopic) {
      conversationState.topicsDiscovered.push(startingNode.revealsTopic);
    }
    
    // Update the NPC memory with this conversation
    this.updateMemoryWithDialogue(npc.id, 'greeting', startingNode.text);
    
    // Filter available responses based on requirements
    const availableResponses = this.filterAvailableResponses(npc, startingNode.responses);
    
    // Return the dialogue result
    return {
      text: startingNode.text,
      availableResponses,
      skillCheck: startingNode.skillCheck,
      conversationEnded: false,
      relationshipChange: 0
    };
  }
  
  /**
   * Select a response in the current dialogue
   */
  public async selectResponse(
    npc: NPC, 
    responseId: string
  ): Promise<DialogueResult> {
    // Get the active conversation
    const conversationState = this.activeConversations.get(npc.id);
    if (!conversationState) {
      throw new Error(`No active conversation with NPC ${npc.id}`);
    }
    
    // Find the current dialogue node
    const currentNode = this.findDialogueNodeById(npc, conversationState.currentNodeId);
    if (!currentNode) {
      throw new Error(`Dialogue node ${conversationState.currentNodeId} not found`);
    }
    
    // Find the selected response
    const selectedResponse = currentNode.responses.find(r => r.id === responseId);
    if (!selectedResponse) {
      throw new Error(`Response ${responseId} not found in dialogue node ${currentNode.id}`);
    }
    
    // Update the dialogue history with the player's response
    const lastHistoryItem = conversationState.history[conversationState.history.length - 1];
    lastHistoryItem.playerResponse = {
      id: selectedResponse.id,
      text: selectedResponse.text
    };
    
    // Update relationship based on the response
    if (selectedResponse.relationshipEffect) {
      this.updateNPCRelationship(npc.id, selectedResponse.relationshipEffect);
      conversationState.relationshipChange += selectedResponse.relationshipEffect;
    }
    
    // Process any immediate actions from the response
    let conversationEnded = false;
    let questAccepted: string | undefined = undefined;
    let questRefused: string | undefined = undefined;
    const itemsReceived: Item[] = [];
    
    if (selectedResponse.isQuestAccept && currentNode.questId) {
      questAccepted = currentNode.questId;
      this.recordQuestGiven(npc.id, currentNode.questId);
    }
    
    if (selectedResponse.isQuestRefuse && currentNode.questId) {
      questRefused = currentNode.questId;
    }
    
    if (selectedResponse.isGoodbye) {
      conversationEnded = true;
      conversationState.status = 'completed';
    }
    
    if (selectedResponse.action) {
      const actionResult = this.processDialogueAction(npc, selectedResponse.action);
      if (actionResult.items) {
        itemsReceived.push(...actionResult.items);
      }
    }
    
    // If the conversation hasn't ended, find the next dialogue node
    let nextNode: DialogueNode | null = null;
    let skillCheckResult: SkillCheckResult | null = null;
    
    if (!conversationEnded) {
      // Check if there's a skill check to perform
      if (currentNode.skillCheck) {
        skillCheckResult = this.performSkillCheck(
          currentNode.skillCheck,
          selectedResponse.skillCheckModifier || 0
        );
        
        conversationState.skillChecksAttempted.push(skillCheckResult);
        
        if (skillCheckResult.success) {
          if (skillCheckResult.critical && currentNode.skillCheck.criticalSuccessNodeId) {
            nextNode = this.findDialogueNodeById(npc, currentNode.skillCheck.criticalSuccessNodeId);
          } else {
            nextNode = this.findDialogueNodeById(npc, currentNode.skillCheck.successNodeId);
          }
        } else {
          if (skillCheckResult.critical && currentNode.skillCheck.criticalFailureNodeId) {
            nextNode = this.findDialogueNodeById(npc, currentNode.skillCheck.criticalFailureNodeId);
          } else {
            nextNode = this.findDialogueNodeById(npc, currentNode.skillCheck.failureNodeId);
          }
        }
      } else {
        // Regular dialogue flow, get the next node
        nextNode = this.findDialogueNodeById(npc, selectedResponse.nextNodeId);
      }
      
      // If no valid next node, end the conversation
      if (!nextNode) {
        conversationEnded = true;
        conversationState.status = 'completed';
      } else {
        // Update conversation state with next node
        conversationState.currentNodeId = nextNode.id;
        
        // Add this dialogue to the history
        const historyItem: DialogueHistoryItem = {
          nodeId: nextNode.id,
          npcText: nextNode.text,
          timestamp: new Date()
        };
        conversationState.history.push(historyItem);
        
        // If this dialogue reveals a topic, add it to discovered topics
        if (nextNode.revealsTopic && !conversationState.topicsDiscovered.includes(nextNode.revealsTopic)) {
          conversationState.topicsDiscovered.push(nextNode.revealsTopic);
        }
        
        // Update the NPC memory with this conversation
        this.updateMemoryWithDialogue(npc.id, 'response', nextNode.text);
      }
    }
    
    // If conversation ended, update memory with the full conversation
    if (conversationEnded) {
      this.finalizeConversation(npc.id, conversationState);
    }
    
    // Return the dialogue result
    return {
      text: nextNode ? nextNode.text : "The conversation has ended.",
      availableResponses: nextNode ? this.filterAvailableResponses(npc, nextNode.responses) : [],
      skillCheck: nextNode?.skillCheck,
      conversationEnded,
      relationshipChange: selectedResponse.relationshipEffect || 0,
      questAccepted,
      questRefused,
      itemsReceived: itemsReceived.length > 0 ? itemsReceived : undefined
    };
  }
  
  /**
   * Perform a skill check for dialogue
   */
  private performSkillCheck(
    skillCheck: DialogueSkillCheck,
    modifier: number
  ): SkillCheckResult {
    // Roll a d20
    const roll = Math.floor(Math.random() * 20) + 1;
    
    // Get the ability modifier
    const abilityScore = this.player.abilityScores[skillCheck.ability];
    const abilityModifier = Math.floor((abilityScore - 10) / 2);
    
    // Calculate total with modifiers
    const total = roll + abilityModifier + modifier;
    
    // Determine success
    const success = total >= skillCheck.difficultyClass;
    
    // Check for critical success/failure
    const critical = roll === 1 || roll === 20;
    
    return {
      type: skillCheck.type,
      ability: skillCheck.ability,
      difficultyClass: skillCheck.difficultyClass,
      roll,
      total,
      success,
      critical
    };
  }
  
  /**
   * Filter dialogue responses based on requirements
   */
  private filterAvailableResponses(
    npc: NPC,
    responses: DialogueResponse[]
  ): DialogueResponse[] {
    return responses.filter(response => {
      if (!response.requirements) {
        return true;
      }
      
      return response.requirements.every(req => this.checkRequirement(npc, req));
    });
  }
  
  /**
   * Check if a dialogue requirement is met
   */
  private checkRequirement(npc: NPC, requirement: DialogueRequirement): boolean {
    const memory = this.npcMemories.get(npc.id);
    
    switch (requirement.type) {
      case 'item':
        // Check if player has the required item
        return this.player.inventory.some(item => 
          item.id === requirement.target && item.quantity >= requirement.value
        );
        
      case 'quest':
        // Check quest status
        return this.playerHasQuest(requirement.target);
        
      case 'skill':
        // Check skill proficiency
        return this.playerHasSkill(requirement.target);
        
      case 'ability':
        // Check ability score
        const abilityScore = this.player.abilityScores[requirement.target as Ability];
        return abilityScore >= requirement.value;
        
      case 'faction':
        // Check faction reputation (not implemented yet)
        return true;
        
      case 'topic':
        // Check if the topic has been discovered
        if (!memory) return false;
        return memory.knownTopics.has(requirement.target) && 
               (memory.knownTopics.get(requirement.target) || 0) >= requirement.value;
        
      default:
        return true;
    }
  }
  
  /**
   * Find the appropriate starting dialogue node for an NPC
   */
  private findStartingNode(npc: NPC, memory: NPCMemory): DialogueNode {
    const firstInteraction = memory.interactionCount === 1;
    
    // For first interaction, find an introduction node
    if (firstInteraction) {
      // Try to find a node tagged as introduction
      const introNode = npc.dialogue.find(node => 
        node.tags && node.tags.includes('introduction')
      );
      
      if (introNode) {
        return introNode;
      }
    }
    
    // For repeat interactions, find a greeting node
    const greetingNodes = npc.dialogue.filter(node => 
      node.tags && node.tags.includes('greeting')
    );
    
    if (greetingNodes.length > 0) {
      // Pick a greeting based on relationship value if available
      const relationship = memory.relationship;
      
      if (relationship > 5) {
        // Look for friendly greeting
        const friendlyGreeting = greetingNodes.find(node => 
          node.tags && node.tags.includes('friendly')
        );
        if (friendlyGreeting) return friendlyGreeting;
      } else if (relationship < -5) {
        // Look for hostile greeting
        const hostileGreeting = greetingNodes.find(node => 
          node.tags && node.tags.includes('hostile')
        );
        if (hostileGreeting) return hostileGreeting;
      }
      
      // Use any greeting if no specific one matches
      return greetingNodes[0];
    }
    
    // Default to first dialogue node if no appropriate one found
    if (npc.dialogue.length > 0) {
      return npc.dialogue[0];
    }
    
    // If no dialogue nodes exist, create a generic one
    return {
      id: 'generic-greeting',
      text: `Hello there, ${this.player.name}. What can I do for you?`,
      npcId: npc.id,
      responses: [
        {
          id: 'generic-goodbye',
          text: 'Nothing, just saying hello.',
          nextNodeId: 'generic-end',
          isGoodbye: true
        }
      ]
    };
  }
  
  /**
   * Find a dialogue node by its ID
   */
  private findDialogueNodeById(npc: NPC, nodeId: string): DialogueNode | null {
    const node = npc.dialogue.find(n => n.id === nodeId);
    return node || null;
  }
  
  /**
   * Update NPC memory with a new dialogue exchange
   */
  private updateMemoryWithDialogue(
    npcId: string,
    context: string,
    npcText: string,
    playerResponse?: string
  ): void {
    const memory = this.npcMemories.get(npcId);
    if (!memory) return;
    
    // Add to conversation history
    const historyEntry: DialogueHistoryEntry = {
      timestamp: new Date(),
      npcResponse: npcText,
      playerStatement: playerResponse || '',
      context
    };
    
    memory.conversationHistory.push(historyEntry);
    
    // Limit history size to prevent excessive memory usage
    if (memory.conversationHistory.length > 10) {
      memory.conversationHistory = memory.conversationHistory.slice(-10);
    }
  }
  
  /**
   * Update the relationship value with an NPC
   */
  private updateNPCRelationship(npcId: string, change: number): void {
    const memory = this.npcMemories.get(npcId);
    if (!memory) return;
    
    // Update relationship score, keeping it within bounds
    memory.relationship = Math.max(-10, Math.min(10, memory.relationship + change));
    
    // Add a memory event if the change is significant
    if (Math.abs(change) >= 2) {
      const event: NPCMemoryEvent = {
        date: new Date(),
        type: 'conversation',
        description: change > 0 
          ? 'Said something that greatly pleased the NPC' 
          : 'Said something that greatly displeased the NPC',
        impact: change
      };
      
      memory.playerActions.push(event);
    }
  }
  
  /**
   * Record that an NPC has given a quest to the player
   */
  private recordQuestGiven(npcId: string, questId: string): void {
    const memory = this.npcMemories.get(npcId);
    if (!memory) return;
    
    if (!memory.questsGiven.includes(questId)) {
      memory.questsGiven.push(questId);
      
      // Add a memory event
      const event: NPCMemoryEvent = {
        date: new Date(),
        type: 'quest',
        description: 'Gave a quest to the player',
        impact: 1
      };
      
      memory.playerActions.push(event);
    }
  }
  
  /**
   * Record that the player has completed a quest for an NPC
   */
  public recordQuestCompleted(npcId: string, questId: string): void {
    const memory = this.npcMemories.get(npcId);
    if (!memory) return;
    
    if (!memory.questsCompleted.includes(questId)) {
      memory.questsCompleted.push(questId);
      
      // Add a memory event
      const event: NPCMemoryEvent = {
        date: new Date(),
        type: 'quest',
        description: 'Completed a quest for the NPC',
        impact: 3 // Significant positive impact
      };
      
      memory.playerActions.push(event);
      
      // Update relationship
      this.updateNPCRelationship(npcId, 3);
    }
  }
  
  /**
   * Finalize a conversation and update NPC memory
   */
  private finalizeConversation(npcId: string, conversation: ConversationState): void {
    // Update relationship based on total change during conversation
    if (conversation.relationshipChange !== 0) {
      // This is already tracked during the conversation, no need to update again
    }
    
    // Mark the conversation as completed
    conversation.status = 'completed';
    
    // Clear from active conversations
    this.activeConversations.delete(npcId);
  }
  
  /**
   * Process a dialogue action
   */
  private processDialogueAction(npc: NPC, action: any): { items?: Item[] } {
    // This would handle things like giving items, updating quests, etc.
    // Simplified implementation for now
    return { items: [] };
  }
  
  /**
   * Check if player has a quest
   */
  private playerHasQuest(questId: string): boolean {
    // This would check the player's active quests
    // Simplified implementation for now
    return false;
  }
  
  /**
   * Check if player has a skill
   */
  private playerHasSkill(skillName: string): boolean {
    // This would check if the player is proficient in a skill
    // Simplified implementation for now
    return true;
  }
  
  /**
   * Get the memory for an NPC
   */
  public getNPCMemory(npcId: string): NPCMemory | null {
    return this.npcMemories.get(npcId) || null;
  }
  
  /**
   * Get dialogue history with an NPC
   */
  public getDialogueHistory(npcId: string): DialogueHistoryEntry[] {
    const memory = this.npcMemories.get(npcId);
    return memory ? memory.conversationHistory : [];
  }
  
  /**
   * Check if there's an active conversation with an NPC
   */
  public hasActiveConversation(npcId: string): boolean {
    return this.activeConversations.has(npcId);
  }
  
  /**
   * End a conversation early
   */
  public endConversation(npcId: string): void {
    const conversation = this.activeConversations.get(npcId);
    if (conversation) {
      conversation.status = 'interrupted';
      this.finalizeConversation(npcId, conversation);
    }
  }
} 