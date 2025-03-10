/**
 * Quest Manager
 * 
 * Manages the creation, tracking, and completion of quests.
 * Works with the NPCManager to connect quests to NPCs.
 */

import { Quest, QuestObjective, QuestReward } from '../core/interfaces/quest';
import { Character } from '../core/interfaces/character';
import { AIService } from '../dm/ai-service';
import { NPC } from '../core/interfaces/npc';
import { Item } from '../core/interfaces/item';
import { NPCManager } from '../character/npc/npc-manager';
import { v4 as uuidv4 } from 'uuid';

export interface QuestCreationResult {
  success: boolean;
  quest?: Quest;
  error?: string;
}

export interface QuestUpdateResult {
  success: boolean;
  message: string;
  completed?: boolean;
  rewards?: QuestReward[];
}

export class QuestManager {
  private quests: Map<string, Quest>;
  private aiService: AIService;
  private player: Character;
  private npcManager?: NPCManager;
  
  constructor(player: Character, aiService: AIService) {
    this.quests = new Map();
    this.aiService = aiService;
    this.player = player;
  }
  
  /**
   * Connect this manager with the NPC manager for quest-NPC interactions
   */
  public connectNPCManager(npcManager: NPCManager): void {
    this.npcManager = npcManager;
  }
  
  /**
   * Create a new quest
   */
  public async createQuest(
    title: string,
    description: string,
    giver: string, // NPC ID
    objectives: Partial<QuestObjective>[],
    rewards: Partial<QuestReward>[],
    prerequisites?: string[]
  ): Promise<QuestCreationResult> {
    try {
      // Generate a unique ID
      const id = `quest-${uuidv4()}`;
      
      // Ensure objectives are properly formatted
      const completeObjectives = objectives.map(obj => ({
        id: obj.id || `objective-${uuidv4()}`,
        description: obj.description || 'Unnamed objective',
        type: obj.type || 'interact',
        target: obj.target || '',
        required: obj.required || 1,
        progress: obj.progress || 0,
        isCompleted: obj.isCompleted || false,
        location: obj.location,
        details: obj.details
      }));
      
      // Ensure rewards are properly formatted
      const completeRewards = rewards.map(reward => ({
        type: reward.type || 'gold',
        value: reward.value || 0,
        item: reward.item,
        faction: reward.faction,
        factionValue: reward.factionValue
      }));
      
      // Create the quest
      const quest: Quest = {
        id,
        title,
        description,
        giver,
        status: 'active',
        objectives: completeObjectives,
        rewards: completeRewards,
        prerequisites,
        followUpQuests: []
      };
      
      // Store the quest
      this.quests.set(id, quest);
      
      return {
        success: true,
        quest
      };
    } catch (error) {
      console.error('Error creating quest:', error);
      return {
        success: false,
        error: 'Failed to create quest'
      };
    }
  }
  
  /**
   * Generate a quest using AI
   */
  public async generateQuest(npc: NPC, difficulty: number = 1): Promise<QuestCreationResult> {
    try {
      // Build a prompt for quest generation
      const prompt = `
Generate a D&D quest that would be offered by ${npc.name}, a ${npc.race} ${npc.occupation || ''} with a ${npc.attitude} attitude.
The quest should be appropriate for a level ${this.player.level} ${this.player.class} character.

The quest should include:
1. A compelling title
2. A brief description (2-3 sentences)
3. 2-3 objectives that make sense for this NPC to ask for
4. Appropriate rewards

Format your response as a structured object with the following properties:
- title: The quest title
- description: Brief description of the quest
- objectives: Array of objective objects, each with:
  - description: What needs to be done
  - type: One of "kill", "collect", "interact", or "explore"
  - target: What or who is the target
  - required: How many are needed (number)
  - location: Where to find the target (optional)
- rewards: Array of reward objects, each with:
  - type: "gold", "item", or "experience"
  - value: Numerical value
  - itemName: Name of item (if type is "item")
`;

      // Generate the quest using AI
      const response = await this.aiService.generateCompletion(
        prompt,
        'quest',
        {
          systemPrompt: 'You are a quest designer for a D&D game. Create engaging, balanced quests appropriate for the player and NPC.',
          temperature: 0.7
        }
      );
      
      // Parse the AI response
      // Note: In a real implementation, you would need more robust parsing
      // and fallback mechanisms for unpredictable AI outputs
      let questData: any;
      try {
        // Try to extract a JSON object if it's wrapped in text
        const jsonMatch = response.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                          response.text.match(/\{[\s\S]*\}/);
        
        const jsonStr = jsonMatch ? jsonMatch[0] : response.text;
        questData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error('Error parsing AI quest response:', parseError);
        
        // Fallback to a simple quest if parsing fails
        questData = {
          title: "Task for Assistance",
          description: `${npc.name} needs your help with a simple task.`,
          objectives: [
            {
              description: "Complete the task",
              type: "interact",
              target: "target",
              required: 1,
              location: "nearby"
            }
          ],
          rewards: [
            {
              type: "gold",
              value: 50 * this.player.level
            }
          ]
        };
      }
      
      // Convert AI-generated data to quest objectives
      const objectives = (questData.objectives || []).map((obj: any) => ({
        id: `objective-${uuidv4()}`,
        description: obj.description || 'Unnamed objective',
        type: obj.type || 'interact',
        target: obj.target || '',
        required: obj.required || 1,
        progress: 0,
        isCompleted: false,
        location: obj.location,
        details: obj.details
      }));
      
      // Convert AI-generated data to quest rewards
      const rewards = (questData.rewards || []).map((reward: any) => {
        if (reward.type === 'item' && reward.itemName) {
          // Create an item for item rewards
          const item: Item = {
            id: `reward-item-${uuidv4()}`,
            name: reward.itemName,
            description: reward.itemDescription || `A reward from ${npc.name}'s quest.`,
            weight: 1,
            value: reward.value || 50,
            quantity: 1,
            isEquipped: false,
            type: 'misc', // Default to misc type
            properties: []
          };
          
          return {
            type: 'item',
            value: item.value,
            item
          };
        } else {
          // Gold or experience rewards
          return {
            type: reward.type || 'gold',
            value: reward.value || 50
          };
        }
      });
      
      // Create the quest
      return this.createQuest(
        questData.title || `${npc.name}'s Request`,
        questData.description || `A quest from ${npc.name}.`,
        npc.id,
        objectives,
        rewards
      );
    } catch (error) {
      console.error('Error generating quest:', error);
      return {
        success: false,
        error: 'Failed to generate quest'
      };
    }
  }
  
  /**
   * Get a quest by ID
   */
  public getQuest(id: string): Quest | undefined {
    return this.quests.get(id);
  }
  
  /**
   * Get all active quests
   */
  public getActiveQuests(): Quest[] {
    return Array.from(this.quests.values())
      .filter(quest => quest.status === 'active');
  }
  
  /**
   * Get all quests from a specific NPC
   */
  public getQuestsFromNPC(npcId: string): Quest[] {
    return Array.from(this.quests.values())
      .filter(quest => quest.giver === npcId);
  }
  
  /**
   * Update quest progress
   */
  public updateQuestProgress(
    questId: string,
    objectiveId: string,
    progress: number
  ): QuestUpdateResult {
    const quest = this.quests.get(questId);
    if (!quest) {
      return {
        success: false,
        message: `Quest ${questId} not found`
      };
    }
    
    // Find the objective
    const objective = quest.objectives.find(obj => obj.id === objectiveId);
    if (!objective) {
      return {
        success: false,
        message: `Objective ${objectiveId} not found in quest ${quest.title}`
      };
    }
    
    // Update progress
    objective.progress += progress;
    
    // Check if objective is completed
    if (objective.progress >= objective.required && !objective.isCompleted) {
      objective.isCompleted = true;
      objective.progress = objective.required; // Cap at required amount
    }
    
    // Check if all objectives are completed
    const allCompleted = quest.objectives.every(obj => obj.isCompleted);
    
    if (allCompleted && quest.status === 'active') {
      return this.completeQuest(questId);
    }
    
    return {
      success: true,
      message: `Updated progress for ${objective.description} in quest ${quest.title}`
    };
  }
  
  /**
   * Complete a quest
   */
  public completeQuest(questId: string): QuestUpdateResult {
    const quest = this.quests.get(questId);
    if (!quest) {
      return {
        success: false,
        message: `Quest ${questId} not found`
      };
    }
    
    // Check if all objectives are completed
    const allCompleted = quest.objectives.every(obj => obj.isCompleted);
    if (!allCompleted) {
      return {
        success: false,
        message: `Cannot complete quest ${quest.title} - not all objectives are completed`
      };
    }
    
    // Mark quest as completed
    quest.status = 'completed';
    
    // Notify the NPC about the completed quest
    if (this.npcManager && quest.giver) {
      this.npcManager.recordQuestCompleted(quest.giver, quest.id);
    }
    
    // Give rewards
    // In a full implementation, you would apply these rewards to the player
    
    // Check for follow-up quests
    if (quest.followUpQuests && quest.followUpQuests.length > 0) {
      // In a full implementation, you would make these quests available
    }
    
    return {
      success: true,
      message: `Completed quest: ${quest.title}`,
      completed: true,
      rewards: quest.rewards
    };
  }
  
  /**
   * Fail a quest
   */
  public failQuest(questId: string, reason: string): QuestUpdateResult {
    const quest = this.quests.get(questId);
    if (!quest) {
      return {
        success: false,
        message: `Quest ${questId} not found`
      };
    }
    
    // Mark quest as failed
    quest.status = 'failed';
    
    return {
      success: true,
      message: `Failed quest: ${quest.title} - ${reason}`
    };
  }
  
  /**
   * Accept a quest from an NPC
   */
  public acceptQuestFromNPC(npcId: string, questId?: string): Promise<QuestCreationResult> {
    if (!this.npcManager) {
      return Promise.resolve({
        success: false,
        error: 'NPC Manager not connected'
      });
    }
    
    const npc = this.npcManager.getNPC(npcId);
    if (!npc) {
      return Promise.resolve({
        success: false,
        error: `NPC with ID ${npcId} not found`
      });
    }
    
    // If quest ID is provided, check if it exists
    if (questId) {
      const existingQuest = this.quests.get(questId);
      if (existingQuest) {
        return Promise.resolve({
          success: true,
          quest: existingQuest
        });
      }
    }
    
    // Generate a new quest from this NPC
    return this.generateQuest(npc);
  }
  
  /**
   * Check if an action would update any quest objectives
   */
  public checkActionForQuestUpdates(
    action: string,
    targetType: string,
    targetId: string,
    count: number = 1
  ): void {
    // Check all active quests for matching objectives
    for (const quest of this.getActiveQuests()) {
      for (const objective of quest.objectives) {
        if (!objective.isCompleted && 
            objective.type === targetType && 
            objective.target === targetId) {
          // Update this objective
          this.updateQuestProgress(quest.id, objective.id, count);
        }
      }
    }
  }
  
  /**
   * Get quest details as a formatted string
   */
  public getQuestDetailsFormatted(questId: string): string {
    const quest = this.quests.get(questId);
    if (!quest) {
      return 'Quest not found';
    }
    
    // Format the quest details
    let details = `# ${quest.title}\n\n`;
    details += `${quest.description}\n\n`;
    
    details += `## Objectives\n`;
    for (const objective of quest.objectives) {
      const progressText = objective.isCompleted 
        ? '[Complete]' 
        : `[${objective.progress}/${objective.required}]`;
      details += `- ${progressText} ${objective.description}\n`;
      if (objective.location) {
        details += `  Location: ${objective.location}\n`;
      }
    }
    
    details += `\n## Rewards\n`;
    for (const reward of quest.rewards) {
      if (reward.type === 'gold') {
        details += `- ${reward.value} gold coins\n`;
      } else if (reward.type === 'experience') {
        details += `- ${reward.value} experience points\n`;
      } else if (reward.type === 'item' && reward.item) {
        details += `- ${reward.item.name}\n`;
      }
    }
    
    if (quest.giver && this.npcManager) {
      const npc = this.npcManager.getNPC(quest.giver);
      if (npc) {
        details += `\nQuest Giver: ${npc.name}\n`;
      }
    }
    
    return details;
  }
  
  /**
   * Save all quests
   */
  public saveQuests(): any[] {
    return Array.from(this.quests.values());
  }
  
  /**
   * Load quests from saved data
   */
  public loadQuests(data: any[]): void {
    this.quests.clear();
    
    // Load each quest
    for (const questData of data) {
      if (questData.id && questData.title) {
        this.quests.set(questData.id, questData as Quest);
      }
    }
  }
  
  /**
   * Apply quest rewards to a character
   */
  public applyQuestRewards(questId: string): boolean {
    const quest = this.quests.get(questId);
    if (!quest || quest.status !== 'completed') {
      return false;
    }
    
    // Apply each reward
    for (const reward of quest.rewards) {
      switch (reward.type) {
        case 'gold':
          // Add gold to character
          if (this.player.gold !== undefined) {
            this.player.gold += reward.value;
          }
          break;
          
        case 'experience':
          // Add experience to character
          if (this.player.experience !== undefined) {
            this.player.experience += reward.value;
          }
          break;
          
        case 'item':
          // Add item to character inventory
          if (reward.item && this.player.inventory) {
            this.player.inventory.items.push(reward.item);
          }
          break;
      }
    }
    
    return true;
  }
  
  /**
   * Track a quest-related event that might update objectives
   */
  public trackQuestEvent(
    eventType: string, 
    target: string,
    location: string,
    count: number = 1
  ): QuestUpdateResult[] {
    const results: QuestUpdateResult[] = [];
    
    // Check all active quests for matching objectives
    for (const quest of this.getActiveQuests()) {
      for (const objective of quest.objectives) {
        // Skip completed objectives
        if (objective.isCompleted) continue;
        
        // Check if this event matches the objective
        if (objective.type === eventType && objective.target === target) {
          // Check location if specified in the objective
          if (objective.location && objective.location !== location) {
            continue;
          }
          
          // Update the objective
          const result = this.updateQuestProgress(quest.id, objective.id, count);
          results.push(result);
        }
      }
    }
    
    return results;
  }
  
  /**
   * Get all available quests that a player can accept
   */
  public getAvailableQuests(): Quest[] {
    return Array.from(this.quests.values())
      .filter(quest => {
        // Check prerequisites
        if (quest.prerequisites && quest.prerequisites.length > 0) {
          const allPrereqsMet = quest.prerequisites.every(prereqId => {
            const prereq = this.quests.get(prereqId);
            return prereq && prereq.status === 'completed';
          });
          
          if (!allPrereqsMet) return false;
        }
        
        // Check expiry date
        if (quest.expiryDate && new Date() > quest.expiryDate) {
          return false;
        }
        
        // Only show quests that aren't already active or completed
        return quest.status !== 'active' && quest.status !== 'completed';
      });
  }
  
  /**
   * Check for completed objectives and update their status
   */
  public checkQuestCompletions(): QuestUpdateResult[] {
    const results: QuestUpdateResult[] = [];
    
    for (const quest of this.getActiveQuests()) {
      // Check if all objectives are completed
      const allCompleted = quest.objectives.every(obj => obj.isCompleted);
      
      if (allCompleted) {
        const result = this.completeQuest(quest.id);
        results.push(result);
      }
    }
    
    return results;
  }
} 