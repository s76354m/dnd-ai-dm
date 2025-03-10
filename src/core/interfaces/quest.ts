// src/core/interfaces/quest.ts

import type { Item } from './item';
import type { Ability } from '../types';

export interface Quest {
  id: string;
  title: string;
  description: string;
  questGiver: string; // NPC ID
  objectives: QuestObjective[];
  rewards: QuestReward;
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  difficulty: number; // 1-10
  minLevel: number;
  expiration?: number; // Game time when quest expires
  relatedQuests: string[]; // IDs of related quests
  dialogueTree: DialogueNode[];
  notes: string[];
  tags: string[];
}

export interface QuestObjective {
  id: string;
  description: string;
  isCompleted: boolean;
  location?: string; // Location ID
  targetNpc?: string; // NPC ID
  targetItem?: string; // Item ID
  quantity?: number; // For collect/defeat objectives
  progress?: number; // Current progress 
}

export interface QuestReward {
  gold?: number;
  experience?: number;
  items?: string[]; // Item IDs
  reputation?: {
    faction: string;
    amount: number;
  }[];
  unlocks?: string[]; // IDs of quests or locations unlocked by completing this quest
}

/**
 * Enhanced dialogue node with more dynamic options and responses
 */
export interface DialogueNode {
  id: string;
  text: string;
  speakerName?: string;
  options: DialogueOption[];
}

export interface DialogueOption {
  text: string;
  nextNodeId: string;
  requirement?: {
    type: 'item' | 'ability' | 'skill' | 'quest' | 'reputation';
    id: string;
    value?: number;
  };
  consequence?: {
    type: 'quest' | 'item' | 'reputation' | 'knowledge';
    id: string;
    value: any;
  };
}

/**
 * Skill check for dialogue (e.g., persuasion, intimidation)
 */
export interface DialogueSkillCheck {
  ability: Ability;             // Which ability is tested
  difficultyClass: number;      // DC of the check
  type: 'persuasion' | 'intimidation' | 'deception' | 'insight'; // Type of check
  successNodeId: string;        // Dialogue node on success
  failureNodeId: string;        // Dialogue node on failure
  criticalSuccessNodeId?: string; // Optional node for natural 20
  criticalFailureNodeId?: string; // Optional node for natural 1
}

/**
 * Actions that can be triggered by dialogue
 */
export interface DialogueTrigger {
  type: 'quest' | 'item' | 'reputation' | 'combat' | 'shop' | 'teleport';
  value: string; // Quest ID, item ID, etc.
  data?: any;    // Additional data for the trigger
}

/**
 * Action performed when selecting a dialogue response
 */
export interface DialogueAction {
  type: 'giveItem' | 'removeItem' | 'giveQuest' | 'updateObjective' 
      | 'openShop' | 'openCrafting' | 'modifyRelationship' | 'teleport';
  data: any;
}

export interface DialogueRequirement {
  type: 'item' | 'quest' | 'skill' | 'ability' | 'faction' | 'topic';
  target: string;
  value: number;
  operator?: '=' | '>' | '<' | '>=' | '<='; // Default is >=
}

export interface DialogueCondition {
  type: 'quest' | 'item' | 'reputation' | 'time' | 'playerLevel' | 'relationship' | 'topic';
  value: string;
  operator: '=' | '>' | '<' | '>=' | '<=';
  target: number;
}

/**
 * Tracks the state of a conversation with an NPC
 */
export interface ConversationState {
  npcId: string;
  currentNodeId: string;
  history: DialogueHistoryItem[];
  startTime: Date;
  topicsDiscovered: string[];
  skillChecksAttempted: SkillCheckResult[];
  relationshipChange: number;
  status: 'active' | 'completed' | 'interrupted';
}

/**
 * A record of each dialogue exchange in a conversation
 */
export interface DialogueHistoryItem {
  nodeId: string;
  npcText: string;
  playerResponse?: {
    id: string;
    text: string;
  };
  timestamp: Date;
}

/**
 * Records the result of a skill check in dialogue
 */
export interface SkillCheckResult {
  type: string;
  ability: Ability;
  difficultyClass: number;
  roll: number;
  total: number;
  success: boolean;
  critical?: boolean;
}