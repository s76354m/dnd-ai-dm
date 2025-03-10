import { EventEmitter } from 'events';
import { Character } from '../core/interfaces/character';
import { GameState } from '../core/interfaces/game';
import { Quest as CoreQuest, QuestObjective, QuestReward } from '../core/interfaces/quest';
import { v4 as uuidv4 } from 'uuid';

// Define the QuestStatus enum
export enum QuestStatus {
  Available = 'available',
  Active = 'active',
  Completed = 'completed',
  Failed = 'failed'
}

// Extended Quest interface with additional properties
export interface Quest extends Omit<CoreQuest, 'status'> {
  level: number;
  location?: string;
  dateCreated: Date;
  dateUpdated: Date;
  dateCompleted: Date | null;
  status: QuestStatus;
}

/**
 * Manages quest creation, tracking, and completion
 */
export class QuestManager extends EventEmitter {
  private quests: Map<string, Quest> = new Map();
  private activeQuests: Set<string> = new Set();
  private completedQuests: Set<string> = new Set();
  private gameState: GameState;

  constructor(gameState: GameState) {
    super();
    this.gameState = gameState;
  }

  /**
   * Create a new quest
   */
  public createQuest(
    title: string,
    description: string,
    objectives: QuestObjective[],
    rewards: QuestReward[],
    level: number,
    giver?: string,
    location?: string
  ): Quest {
    const questId = `quest-${uuidv4().substring(0, 8)}`;
    
    const quest: Quest = {
      id: questId,
      title,
      description,
      objectives: objectives.map(obj => ({
        ...obj,
        progress: 0,
        isCompleted: false
      })),
      rewards,
      level,
      giver: giver || 'unknown',
      location,
      status: QuestStatus.Available as any,
      dateCreated: new Date(),
      dateUpdated: new Date(),
      dateCompleted: null
    };
    
    this.quests.set(questId, quest);
    
    this.emit('questCreated', {
      quest,
      gameState: this.gameState
    });
    
    return quest;
  }

  /**
   * Get a quest by ID
   */
  public getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId);
  }

  /**
   * Get all quests
   */
  public getAllQuests(): Quest[] {
    return Array.from(this.quests.values());
  }

  /**
   * Get available quests (not accepted or completed)
   */
  public getAvailableQuests(): Quest[] {
    return this.getAllQuests().filter(
      quest => quest.status === QuestStatus.Available as any
    );
  }

  /**
   * Get active quests (accepted but not completed)
   */
  public getActiveQuests(): Quest[] {
    return this.getAllQuests().filter(
      quest => quest.status === QuestStatus.Active as any
    );
  }

  /**
   * Get completed quests
   */
  public getCompletedQuests(): Quest[] {
    return this.getAllQuests().filter(
      quest => quest.status === QuestStatus.Completed as any
    );
  }

  /**
   * Accept a quest
   */
  public acceptQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    
    if (!quest || quest.status !== QuestStatus.Available as any) {
      return false;
    }
    
    quest.status = QuestStatus.Active as any;
    quest.dateUpdated = new Date();
    this.activeQuests.add(questId);
    
    this.emit('questAccepted', {
      quest,
      gameState: this.gameState
    });
    
    return true;
  }

  /**
   * Update quest objective progress
   */
  public updateObjectiveProgress(
    questId: string,
    objectiveIndex: number,
    progress: number
  ): boolean {
    const quest = this.quests.get(questId);
    
    if (!quest || quest.status !== QuestStatus.Active as any) {
      return false;
    }
    
    const objective = quest.objectives[objectiveIndex];
    
    if (!objective) {
      return false;
    }
    
    // Update progress
    objective.progress += progress;
    
    // Check if objective is completed
    if (objective.progress >= objective.required) {
      objective.isCompleted = true;
      objective.progress = objective.required; // Cap at required
    }
    
    quest.dateUpdated = new Date();
    
    // Check if all objectives are completed
    const allCompleted = quest.objectives.every((obj: QuestObjective) => obj.isCompleted);
    
    if (allCompleted) {
      this.completeQuest(questId);
    } else {
      this.emit('questUpdated', {
        quest,
        objective,
        gameState: this.gameState
      });
    }
    
    return true;
  }

  /**
   * Complete a quest
   */
  public completeQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    
    if (!quest || quest.status !== QuestStatus.Active as any) {
      return false;
    }
    
    // Mark quest as completed
    quest.status = QuestStatus.Completed as any;
    quest.dateCompleted = new Date();
    quest.dateUpdated = new Date();
    
    // Update tracking sets
    this.activeQuests.delete(questId);
    this.completedQuests.add(questId);
    
    // Apply rewards
    this.applyQuestRewards(questId);
    
    this.emit('questCompleted', {
      quest,
      gameState: this.gameState
    });
    
    return true;
  }

  /**
   * Apply rewards for a completed quest
   */
  public applyQuestRewards(questId: string): void {
    const quest = this.quests.get(questId);
    
    if (!quest || quest.status !== QuestStatus.Completed as any) {
      return;
    }
    
    const character = this.gameState.player;
    
    for (const reward of quest.rewards) {
      switch (reward.type) {
        case 'experience':
          // Award XP to character
          if ((character as any).progression) {
            (character as any).progression.awardXP(
              reward.value,
              'quest',
              `Completed quest: ${quest.title}`
            );
          } else {
            character.experiencePoints += reward.value;
          }
          break;
          
        case 'gold':
          // Add gold to character wealth
          if (character.wealth) {
            character.wealth.gold += reward.value;
          }
          break;
          
        case 'item':
          // Add item to character equipment
          if (reward.item) {
            if (character.equipment) {
              character.equipment.push(reward.item);
            }
          }
          break;
          
        // Custom case for reputation (not in the core interface)
        case 'reputation' as any:
          // Update faction reputation
          if (reward.faction) {
            // In a full implementation, update faction reputation
            console.log(`Reputation with ${reward.faction} increased by ${reward.factionValue || reward.value}`);
          }
          break;
      }
    }
    
    this.emit('rewardsApplied', {
      quest,
      rewards: quest.rewards,
      character,
      gameState: this.gameState
    });
  }

  /**
   * Track an event that might progress quests
   */
  public trackQuestEvent(
    eventType: string,
    target: string,
    location: string,
    count: number = 1
  ): void {
    // Get all active quests
    const activeQuests = this.getActiveQuests();
    
    for (const quest of activeQuests) {
      // Check each objective
      quest.objectives.forEach((objective: QuestObjective, index: number) => {
        // Skip already completed objectives
        if (objective.isCompleted) {
          return;
        }
        
        // Check if this event matches the objective
        if (
          objective.type === eventType &&
          (objective.target === target || !objective.target) &&
          (!objective.location || objective.location === location)
        ) {
          // Update progress
          this.updateObjectiveProgress(quest.id, index, count);
        }
      });
    }
  }

  /**
   * Abandon a quest
   */
  public abandonQuest(questId: string): boolean {
    const quest = this.quests.get(questId);
    
    if (!quest || quest.status !== QuestStatus.Active as any) {
      return false;
    }
    
    quest.status = QuestStatus.Failed as any;
    quest.dateUpdated = new Date();
    this.activeQuests.delete(questId);
    
    this.emit('questAbandoned', {
      quest,
      gameState: this.gameState
    });
    
    return true;
  }

  /**
   * Check if all active quests have completed objectives
   */
  public checkQuestCompletions(): void {
    for (const questId of this.activeQuests) {
      const quest = this.quests.get(questId);
      
      if (!quest) continue;
      
      // Check if all objectives are completed
      const allCompleted = quest.objectives.every((obj: QuestObjective) => obj.isCompleted);
      
      if (allCompleted) {
        this.completeQuest(questId);
      }
    }
  }

  /**
   * Load quests from saved data
   */
  public loadQuests(questData: any[]): void {
    this.quests.clear();
    this.activeQuests.clear();
    this.completedQuests.clear();
    
    for (const data of questData) {
      this.quests.set(data.id, {
        ...data,
        dateCreated: new Date(data.dateCreated),
        dateUpdated: new Date(data.dateUpdated),
        dateCompleted: data.dateCompleted ? new Date(data.dateCompleted) : null
      });
      
      // Update tracking sets
      if (data.status === QuestStatus.Active as any) {
        this.activeQuests.add(data.id);
      } else if (data.status === QuestStatus.Completed as any) {
        this.completedQuests.add(data.id);
      }
    }
    
    this.emit('questsLoaded', {
      quests: this.getAllQuests(),
      gameState: this.gameState
    });
  }

  /**
   * Get quests data for saving
   */
  public getQuestsData(): any[] {
    return this.getAllQuests();
  }
} 