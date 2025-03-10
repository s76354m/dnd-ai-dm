import { NPCPersonality } from './personality-model';
import { MemoryManager } from '../memory/memory-manager';
import { RelationshipTracker } from '../memory/relationship-tracker';
import { DialogueSystem } from './dialogue-system';
import { v4 as uuidv4 } from 'uuid';

/**
 * Represents the type of need an NPC can have
 */
export enum NeedType {
  // Basic physiological needs
  HUNGER = 'hunger',
  THIRST = 'thirst',
  REST = 'rest',
  SAFETY = 'safety',
  
  // Social/psychological needs
  SOCIAL = 'social',
  RESPECT = 'respect',
  ENTERTAINMENT = 'entertainment',
  ACHIEVEMENT = 'achievement',
  
  // Economic needs
  MONEY = 'money',
  RESOURCES = 'resources',
  
  // Professional needs
  CRAFTING = 'crafting',
  TRADING = 'trading',
  ADVENTURING = 'adventuring',
  
  // Custom need (for special NPC goals)
  CUSTOM = 'custom'
}

/**
 * Represents a need that an NPC has with its current value
 */
export interface Need {
  type: NeedType;
  currentValue: number; // 0-100, where 0 is fully depleted and 100 is fully satisfied
  importanceMultiplier: number; // How important this need is to the NPC (0.1-2.0)
  decayRate: number; // How quickly this need decays per hour
  lastUpdated: number; // Game time in minutes when this was last updated
}

/**
 * Represents a possible behavior that an NPC can engage in
 */
export interface Behavior {
  id: string;
  name: string;
  description: string;
  
  // What needs this behavior satisfies (need type and amount)
  satisfiesNeeds: Array<{ type: NeedType, amount: number }>;
  
  // Requirements for this behavior
  requiresLocation?: string | string[]; // Specific location(s) required
  requiresTime?: { // Time window when this can be performed
    startHour: number;
    endHour: number;
  };
  requiresResources?: Array<{ // Resources needed to perform
    type: string;
    amount: number;
  }>;
  
  // Behavior execution parameters
  durationMinutes: number; // How long this behavior takes
  cooldownMinutes: number; // Minimum time between performing this behavior
  interruptible: boolean; // Whether this behavior can be interrupted
  
  // Function to check if preconditions are met
  canPerform?: (npc: BehaviorState) => boolean;
  
  // Optional AI prompt template for generating narration of this behavior
  narrativeTemplate?: string;
}

/**
 * Represents a goal that an NPC wants to achieve
 */
export interface Goal {
  id: string;
  name: string;
  description: string;
  priority: number; // 1-10, with 10 being highest priority
  
  // The needs this goal is trying to satisfy
  relatedNeeds: NeedType[];
  
  // Completion criteria
  completionCondition: (npc: BehaviorState) => boolean;
  progress: number; // 0-100
  
  // Time constraints
  deadline?: number; // Game time in minutes
  created: number; // Game time in minutes when created
  
  // Behaviors that can help achieve this goal
  relevantBehaviors: string[]; // IDs of relevant behaviors
  
  // Dependencies on other goals
  dependsOn?: string[]; // IDs of goals that must be completed first
  
  // Current state
  active: boolean;
  completed: boolean;
}

/**
 * Represents the current state of an NPC's behavior
 */
export interface BehaviorState {
  npcId: string;
  
  // Current state
  currentLocation: string;
  currentBehavior?: Behavior;
  behaviorStartTime?: number; // Game time in minutes
  behaviorEndTime?: number; // Game time in minutes
  
  // Needs tracking
  needs: Map<NeedType, Need>;
  
  // Goals tracking
  goals: Map<string, Goal>;
  
  // Available behaviors
  availableBehaviors: Map<string, Behavior>;
  
  // History of recent behaviors
  recentBehaviors: Array<{
    behavior: Behavior;
    startTime: number;
    endTime: number;
    location: string;
  }>;
  
  // Current mood derived from need satisfaction
  moodScore: number; // 0-100
  
  // Schedule data
  dailyRoutine?: Map<number, Behavior>; // Hour -> default behavior
  
  // Last update time
  lastUpdated: number; // Game time in minutes
}

/**
 * Class that simulates NPC behaviors based on needs, goals, and personality
 */
export class BehaviorSimulation {
  private personalityModel: NPCPersonality;
  private memoryManager: MemoryManager;
  private relationshipTracker: RelationshipTracker;
  private dialogueSystem: DialogueSystem;
  
  // Track all managed NPCs
  private npcBehaviorStates: Map<string, BehaviorState> = new Map();
  
  // Track common behaviors available to all NPCs
  private commonBehaviors: Behavior[] = [];
  
  // Current game time in minutes
  private currentGameTime: number = 0;
  
  /**
   * Create a new behavior simulation system
   */
  constructor(
    personalityModel: NPCPersonality,
    memoryManager: MemoryManager,
    relationshipTracker: RelationshipTracker,
    dialogueSystem: DialogueSystem
  ) {
    this.personalityModel = personalityModel;
    this.memoryManager = memoryManager;
    this.relationshipTracker = relationshipTracker;
    this.dialogueSystem = dialogueSystem;
    
    // Initialize common behaviors
    this.initializeCommonBehaviors();
  }
  
  /**
   * Initialize common behaviors available to all NPCs
   */
  private initializeCommonBehaviors(): void {
    this.commonBehaviors = [
      // Rest behaviors
      {
        id: 'sleep',
        name: 'Sleep',
        description: 'Sleeping to recover energy',
        satisfiesNeeds: [{ type: NeedType.REST, amount: 60 }],
        durationMinutes: 480, // 8 hours
        cooldownMinutes: 960, // 16 hours
        interruptible: true,
        requiresTime: { startHour: 20, endHour: 6 }
      },
      {
        id: 'rest',
        name: 'Rest',
        description: 'Taking a short break',
        satisfiesNeeds: [
          { type: NeedType.REST, amount: 15 },
          { type: NeedType.ENTERTAINMENT, amount: 5 }
        ],
        durationMinutes: 30,
        cooldownMinutes: 120,
        interruptible: true
      },
      
      // Food and drink
      {
        id: 'eat_meal',
        name: 'Eat a meal',
        description: 'Eating a proper meal',
        satisfiesNeeds: [
          { type: NeedType.HUNGER, amount: 70 },
          { type: NeedType.SOCIAL, amount: 10 }
        ],
        durationMinutes: 45,
        cooldownMinutes: 240,
        interruptible: true,
        requiresTime: {
          startHour: 0,
          endHour: 23 // All day, but likely at meal times
        }
      },
      {
        id: 'drink',
        name: 'Have a drink',
        description: 'Drinking water or beverage',
        satisfiesNeeds: [{ type: NeedType.THIRST, amount: 60 }],
        durationMinutes: 10,
        cooldownMinutes: 120,
        interruptible: true
      },
      
      // Social behaviors
      {
        id: 'socialize',
        name: 'Socialize',
        description: 'Talking with others',
        satisfiesNeeds: [
          { type: NeedType.SOCIAL, amount: 40 },
          { type: NeedType.ENTERTAINMENT, amount: 20 }
        ],
        durationMinutes: 60,
        cooldownMinutes: 120,
        interruptible: true
      },
      
      // Work behaviors
      {
        id: 'work_generic',
        name: 'Work',
        description: 'Performing general work duties',
        satisfiesNeeds: [
          { type: NeedType.MONEY, amount: 30 },
          { type: NeedType.ACHIEVEMENT, amount: 20 }
        ],
        durationMinutes: 240,
        cooldownMinutes: 240,
        interruptible: true,
        requiresTime: { startHour: 8, endHour: 18 }
      },
      
      // Entertainment
      {
        id: 'entertainment',
        name: 'Entertainment',
        description: 'Enjoying entertainment',
        satisfiesNeeds: [{ type: NeedType.ENTERTAINMENT, amount: 50 }],
        durationMinutes: 120,
        cooldownMinutes: 240,
        interruptible: true
      }
    ];
  }
  
  /**
   * Register an NPC with the behavior simulation system
   */
  public registerNPC(
    npcId: string,
    location: string,
    initialNeeds?: Partial<Record<NeedType, number>>,
    initialGoals?: Partial<Goal>[],
    initialBehaviors?: Behavior[],
    initialMood?: number
  ): BehaviorState {
    // Create needs map with default values
    const needs = new Map<NeedType, Need>();
    
    // Set up basic needs with default values
    needs.set(NeedType.HUNGER, {
      type: NeedType.HUNGER,
      currentValue: initialNeeds?.HUNGER ?? 80,
      importanceMultiplier: 1.5,
      decayRate: 5, // 5% per hour
      lastUpdated: this.currentGameTime
    });
    
    needs.set(NeedType.THIRST, {
      type: NeedType.THIRST,
      currentValue: initialNeeds?.THIRST ?? 85,
      importanceMultiplier: 1.8,
      decayRate: 8, // 8% per hour
      lastUpdated: this.currentGameTime
    });
    
    needs.set(NeedType.REST, {
      type: NeedType.REST,
      currentValue: initialNeeds?.REST ?? 90,
      importanceMultiplier: 1.2,
      decayRate: 3, // 3% per hour
      lastUpdated: this.currentGameTime
    });
    
    needs.set(NeedType.SAFETY, {
      type: NeedType.SAFETY,
      currentValue: initialNeeds?.SAFETY ?? 95,
      importanceMultiplier: 1.7,
      decayRate: 1, // 1% per hour
      lastUpdated: this.currentGameTime
    });
    
    needs.set(NeedType.SOCIAL, {
      type: NeedType.SOCIAL,
      currentValue: initialNeeds?.SOCIAL ?? 70,
      importanceMultiplier: 1.0,
      decayRate: 4, // 4% per hour
      lastUpdated: this.currentGameTime
    });
    
    needs.set(NeedType.MONEY, {
      type: NeedType.MONEY,
      currentValue: initialNeeds?.MONEY ?? 50,
      importanceMultiplier: 1.1,
      decayRate: 2, // 2% per hour
      lastUpdated: this.currentGameTime
    });
    
    needs.set(NeedType.ENTERTAINMENT, {
      type: NeedType.ENTERTAINMENT,
      currentValue: initialNeeds?.ENTERTAINMENT ?? 65,
      importanceMultiplier: 0.8,
      decayRate: 3, // 3% per hour
      lastUpdated: this.currentGameTime
    });
    
    // Create available behaviors
    const availableBehaviors = new Map<string, Behavior>();
    
    // Add common behaviors
    this.commonBehaviors.forEach(behavior => {
      availableBehaviors.set(behavior.id, behavior);
    });
    
    // Add custom behaviors if provided
    if (initialBehaviors) {
      initialBehaviors.forEach(behavior => {
        availableBehaviors.set(behavior.id, behavior);
      });
    }
    
    // Create goals map
    const goals = new Map<string, Goal>();
    
    // Add initial goals if provided
    if (initialGoals) {
      initialGoals.forEach(goalData => {
        const goal: Goal = {
          id: goalData.id || `goal-${uuidv4()}`,
          name: goalData.name || 'Unnamed Goal',
          description: goalData.description || 'No description',
          priority: goalData.priority || 5,
          relatedNeeds: goalData.relatedNeeds || [],
          completionCondition: goalData.completionCondition || (() => false),
          progress: goalData.progress || 0,
          deadline: goalData.deadline,
          created: this.currentGameTime,
          relevantBehaviors: goalData.relevantBehaviors || [],
          dependsOn: goalData.dependsOn,
          active: goalData.active ?? true,
          completed: goalData.completed ?? false
        };
        
        goals.set(goal.id, goal);
      });
    }
    
    // Calculate initial mood based on need satisfaction
    const moodScore = initialMood ?? this.calculateMoodScore(needs);
    
    // Create behavior state
    const behaviorState: BehaviorState = {
      npcId,
      currentLocation: location,
      needs,
      goals,
      availableBehaviors,
      recentBehaviors: [],
      moodScore,
      lastUpdated: this.currentGameTime
    };
    
    // Store the behavior state
    this.npcBehaviorStates.set(npcId, behaviorState);
    
    return behaviorState;
  }
  
  /**
   * Calculate mood score based on need satisfaction
   */
  private calculateMoodScore(needs: Map<NeedType, Need>): number {
    let totalWeightedSatisfaction = 0;
    let totalWeight = 0;
    
    needs.forEach(need => {
      totalWeightedSatisfaction += need.currentValue * need.importanceMultiplier;
      totalWeight += need.importanceMultiplier;
    });
    
    return totalWeight > 0 ? totalWeightedSatisfaction / totalWeight : 50;
  }
  
  /**
   * Update an NPC's needs and behaviors based on elapsed time
   */
  public updateNPC(npcId: string, currentGameTime: number): void {
    const npc = this.npcBehaviorStates.get(npcId);
    if (!npc) return;
    
    // Calculate elapsed time since last update
    const elapsedMinutes = currentGameTime - npc.lastUpdated;
    if (elapsedMinutes <= 0) return;
    
    const elapsedHours = elapsedMinutes / 60;
    
    // Update current game time
    this.currentGameTime = currentGameTime;
    
    // Update needs based on elapsed time
    this.updateNeeds(npc, elapsedHours);
    
    // Check if current behavior is complete
    if (npc.currentBehavior && npc.behaviorEndTime && currentGameTime >= npc.behaviorEndTime) {
      this.completeBehavior(npc);
    }
    
    // If no current behavior, select a new one
    if (!npc.currentBehavior) {
      this.selectNextBehavior(npc);
    }
    
    // Update goals
    this.updateGoals(npc);
    
    // Recalculate mood
    npc.moodScore = this.calculateMoodScore(npc.needs);
    
    // Update last updated time
    npc.lastUpdated = currentGameTime;
  }
  
  /**
   * Update an NPC's needs based on elapsed time
   */
  private updateNeeds(npc: BehaviorState, elapsedHours: number): void {
    // Decay needs based on time passed
    npc.needs.forEach(need => {
      // Calculate decay amount
      const decayAmount = need.decayRate * elapsedHours;
      
      // Apply decay with floor of 0
      need.currentValue = Math.max(0, need.currentValue - decayAmount);
      
      // Update last updated time
      need.lastUpdated = this.currentGameTime;
    });
    
    // If NPC is performing a behavior, apply its effects
    if (npc.currentBehavior) {
      const fractionComplete = this.getBehaviorProgress(npc);
      
      // Apply partial need satisfaction based on progress
      npc.currentBehavior.satisfiesNeeds.forEach(({ type, amount }) => {
        const need = npc.needs.get(type);
        if (need) {
          // Apply proportional amount based on progress
          const satisfactionAmount = amount * fractionComplete;
          need.currentValue = Math.min(100, need.currentValue + satisfactionAmount);
        }
      });
    }
  }
  
  /**
   * Get the progress of the current behavior (0-1)
   */
  private getBehaviorProgress(npc: BehaviorState): number {
    if (!npc.currentBehavior || !npc.behaviorStartTime || !npc.behaviorEndTime) {
      return 0;
    }
    
    const totalDuration = npc.behaviorEndTime - npc.behaviorStartTime;
    const elapsed = this.currentGameTime - npc.behaviorStartTime;
    
    return Math.min(1, Math.max(0, elapsed / totalDuration));
  }
  
  /**
   * Complete the current behavior
   */
  private completeBehavior(npc: BehaviorState): void {
    if (!npc.currentBehavior || !npc.behaviorStartTime) return;
    
    // Add to recent behaviors
    npc.recentBehaviors.push({
      behavior: npc.currentBehavior,
      startTime: npc.behaviorStartTime,
      endTime: this.currentGameTime,
      location: npc.currentLocation
    });
    
    // Keep only the 10 most recent behaviors
    if (npc.recentBehaviors.length > 10) {
      npc.recentBehaviors.shift();
    }
    
    // Reset current behavior
    npc.currentBehavior = undefined;
    npc.behaviorStartTime = undefined;
    npc.behaviorEndTime = undefined;
  }
  
  /**
   * Select the next behavior for an NPC based on needs and goals
   */
  private selectNextBehavior(npc: BehaviorState): void {
    // Get all available behaviors
    const availableBehaviors = Array.from(npc.availableBehaviors.values());
    
    // Filter behaviors that can be performed now
    const validBehaviors = availableBehaviors.filter(behavior => {
      // Check if on cooldown
      const recentSameBehavior = npc.recentBehaviors.find(
        rb => rb.behavior.id === behavior.id && 
        (this.currentGameTime - rb.endTime) < behavior.cooldownMinutes
      );
      
      if (recentSameBehavior) return false;
      
      // Check location requirements
      if (behavior.requiresLocation) {
        if (Array.isArray(behavior.requiresLocation)) {
          if (!behavior.requiresLocation.includes(npc.currentLocation)) return false;
        } else if (behavior.requiresLocation !== npc.currentLocation) {
          return false;
        }
      }
      
      // Check time requirements
      if (behavior.requiresTime) {
        const currentHour = Math.floor((this.currentGameTime % 1440) / 60);
        const { startHour, endHour } = behavior.requiresTime;
        
        if (startHour < endHour) {
          if (currentHour < startHour || currentHour >= endHour) return false;
        } else {
          // Handles overnight ranges (e.g., 22-6)
          if (currentHour < startHour && currentHour >= endHour) return false;
        }
      }
      
      // Check custom preconditions
      if (behavior.canPerform && !behavior.canPerform(npc)) return false;
      
      return true;
    });
    
    if (validBehaviors.length === 0) return;
    
    // Score behaviors based on need satisfaction
    const scoredBehaviors = validBehaviors.map(behavior => {
      let score = 0;
      
      // Base score from need satisfaction
      behavior.satisfiesNeeds.forEach(({ type, amount }) => {
        const need = npc.needs.get(type);
        if (need) {
          // Higher score for more important and less satisfied needs
          const needScore = (100 - need.currentValue) * need.importanceMultiplier * (amount / 100);
          score += needScore;
        }
      });
      
      // Bonus score for behaviors that contribute to active goals
      npc.goals.forEach(goal => {
        if (goal.active && !goal.completed && goal.relevantBehaviors.includes(behavior.id)) {
          score += goal.priority * 10;
        }
      });
      
      return { behavior, score };
    });
    
    // Sort by score (highest first)
    scoredBehaviors.sort((a, b) => b.score - a.score);
    
    // Select the highest scoring behavior
    if (scoredBehaviors.length > 0 && scoredBehaviors[0].score > 0) {
      const selectedBehavior = scoredBehaviors[0].behavior;
      
      // Start the behavior
      npc.currentBehavior = selectedBehavior;
      npc.behaviorStartTime = this.currentGameTime;
      npc.behaviorEndTime = this.currentGameTime + selectedBehavior.durationMinutes;
    }
  }
  
  /**
   * Update goals for an NPC
   */
  private updateGoals(npc: BehaviorState): void {
    npc.goals.forEach(goal => {
      // Skip completed or inactive goals
      if (!goal.active || goal.completed) return;
      
      // Check for expired goals
      if (goal.deadline && this.currentGameTime > goal.deadline) {
        // Mark as inactive if deadline passed
        goal.active = false;
        return;
      }
      
      // Check dependencies
      if (goal.dependsOn && goal.dependsOn.length > 0) {
        const allDependenciesMet = goal.dependsOn.every(depId => {
          const depGoal = npc.goals.get(depId);
          return depGoal && depGoal.completed;
        });
        
        // Skip if dependencies not met
        if (!allDependenciesMet) return;
      }
      
      // Check completion condition
      if (goal.completionCondition(npc)) {
        goal.completed = true;
        goal.progress = 100;
        return;
      }
      
      // Update progress
      // This would need custom logic per goal type, simple implementation here
      if (npc.currentBehavior && goal.relevantBehaviors.includes(npc.currentBehavior.id)) {
        // Increase progress based on current behavior
        const progressIncrease = 5 * this.getBehaviorProgress(npc);
        goal.progress = Math.min(99, goal.progress + progressIncrease);
      }
    });
  }
  
  /**
   * Add a new goal for an NPC
   */
  public addGoal(
    npcId: string,
    name: string,
    description: string,
    priority: number,
    relatedNeeds: NeedType[],
    completionCondition: (npc: BehaviorState) => boolean,
    relevantBehaviors: string[] = [],
    deadline?: number,
    dependsOn?: string[]
  ): Goal | undefined {
    const npc = this.npcBehaviorStates.get(npcId);
    if (!npc) return undefined;
    
    const goal: Goal = {
      id: `goal-${uuidv4()}`,
      name,
      description,
      priority,
      relatedNeeds,
      completionCondition,
      progress: 0,
      deadline,
      created: this.currentGameTime,
      relevantBehaviors,
      dependsOn,
      active: true,
      completed: false
    };
    
    npc.goals.set(goal.id, goal);
    return goal;
  }
  
  /**
   * Add a new behavior for an NPC
   */
  public addBehavior(npcId: string, behavior: Behavior): boolean {
    const npc = this.npcBehaviorStates.get(npcId);
    if (!npc) return false;
    
    npc.availableBehaviors.set(behavior.id, behavior);
    return true;
  }
  
  /**
   * Update an NPC's location
   */
  public updateLocation(npcId: string, newLocation: string): void {
    const npc = this.npcBehaviorStates.get(npcId);
    if (!npc) return;
    
    // If behavior is not interruptible, don't change location
    if (npc.currentBehavior && !npc.currentBehavior.interruptible) {
      return;
    }
    
    // End current behavior if location-specific
    if (npc.currentBehavior && npc.currentBehavior.requiresLocation) {
      const locationReq = npc.currentBehavior.requiresLocation;
      const currentLocationValid = Array.isArray(locationReq) 
        ? locationReq.includes(newLocation)
        : locationReq === newLocation;
      
      if (!currentLocationValid) {
        this.completeBehavior(npc);
      }
    }
    
    npc.currentLocation = newLocation;
  }
  
  /**
   * Get the behavior state for an NPC
   */
  public getBehaviorState(npcId: string): BehaviorState | undefined {
    return this.npcBehaviorStates.get(npcId);
  }
  
  /**
   * Set the current game time
   */
  public setGameTime(gameTimeMinutes: number): void {
    this.currentGameTime = gameTimeMinutes;
  }
  
  /**
   * Get a behavior by ID
   */
  public getBehaviorById(behaviorId: string): Behavior | undefined {
    // Check common behaviors first
    const commonBehavior = this.commonBehaviors.find(b => b.id === behaviorId);
    if (commonBehavior) return commonBehavior;
    
    // Check all NPCs' custom behaviors
    for (const state of this.npcBehaviorStates.values()) {
      const behavior = state.availableBehaviors.get(behaviorId);
      if (behavior) return behavior;
    }
    
    return undefined;
  }
  
  /**
   * Generate a narrative description of an NPC's current behavior
   */
  public generateBehaviorNarrative(npcId: string): string {
    const npc = this.npcBehaviorStates.get(npcId);
    if (!npc || !npc.currentBehavior) {
      return "The NPC is idle.";
    }
    
    const { currentBehavior, moodScore } = npc;
    
    // If the behavior has a narrative template, use it
    if (currentBehavior.narrativeTemplate) {
      // This would ideally use the dialogue system to fill in the template
      return currentBehavior.narrativeTemplate
        .replace('{name}', npcId)
        .replace('{behavior}', currentBehavior.name)
        .replace('{location}', npc.currentLocation)
        .replace('{mood}', this.getMoodDescription(moodScore));
    }
    
    // Otherwise, generate a basic description
    return `${npcId} is ${currentBehavior.name.toLowerCase()} at ${npc.currentLocation}. They appear ${this.getMoodDescription(moodScore)}.`;
  }
  
  /**
   * Get a text description of mood based on score
   */
  private getMoodDescription(moodScore: number): string {
    if (moodScore >= 90) return "elated";
    if (moodScore >= 80) return "very happy";
    if (moodScore >= 70) return "happy";
    if (moodScore >= 60) return "content";
    if (moodScore >= 50) return "neutral";
    if (moodScore >= 40) return "discontented";
    if (moodScore >= 30) return "unhappy";
    if (moodScore >= 20) return "very unhappy";
    return "miserable";
  }
} 