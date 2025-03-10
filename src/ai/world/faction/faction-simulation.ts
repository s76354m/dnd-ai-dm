import { v4 as uuidv4 } from 'uuid';
import { FactionManager } from './faction-manager';
import { FactionEventSystem } from './faction-events';
import { FactionDiplomacySystem } from './faction-diplomacy';
import { ResourceManager } from './resource-manager';
import { TerritoryManager } from './territory-manager';
import { Faction, FactionGoal, FactionState } from './faction-types';

/**
 * Simulation settings for factions
 */
export interface FactionSimulationSettings {
  /** How often (in ms) the simulation ticks */
  tickInterval: number;
  
  /** How dramatic state changes are (0-2, where 1 is normal) */
  volatility: number;
  
  /** Aggressiveness of AI decisions (0-2, where 1 is normal) */
  aggressiveness: number;
  
  /** How much factions focus on achieving goals vs. opportunistic actions */
  goalFocus: number;
  
  /** How much random events influence the simulation */
  randomEventFrequency: number;
  
  /** Whether advanced diplomacy options are available */
  enableAdvancedDiplomacy: boolean;
  
  /** Whether factions can form alliances and coalitions */
  enableAlliances: boolean;
  
  /** Whether resource management is active */
  enableResourceManagement: boolean;
}

/**
 * Default simulation settings
 */
export const DEFAULT_SIMULATION_SETTINGS: FactionSimulationSettings = {
  tickInterval: 86400000, // 24 hours in ms
  volatility: 1,
  aggressiveness: 1,
  goalFocus: 1,
  randomEventFrequency: 1,
  enableAdvancedDiplomacy: true,
  enableAlliances: true,
  enableResourceManagement: true
};

/**
 * Simulation action types
 */
export type SimulationActionType = 
  | 'expand_territory'
  | 'improve_economy'
  | 'strengthen_military'
  | 'diplomatic_action'
  | 'pursue_goal'
  | 'internal_development'
  | 'react_to_event';

/**
 * Records a simulation action taken by a faction
 */
export interface SimulationAction {
  id: string;
  factionId: string;
  type: SimulationActionType;
  description: string;
  timestamp: number;
  effects: {
    stateChanges?: Partial<FactionState>;
    relationshipChanges?: {
      factionId: string;
      attitudeChange: number;
    }[];
    territoryChanges?: string[];
    resourceChanges?: string[];
    otherEffects?: string[];
  };
}

/**
 * Manages the simulation of faction behavior over time
 */
export class FactionSimulationSystem {
  private factionManager: FactionManager;
  private eventSystem: FactionEventSystem;
  private diplomacySystem: FactionDiplomacySystem;
  private resourceManager?: ResourceManager;
  private territoryManager?: TerritoryManager;
  
  private settings: FactionSimulationSettings;
  private isRunning: boolean = false;
  private tickIntervalId?: NodeJS.Timeout;
  
  private simulationActions: Map<string, SimulationAction> = new Map();
  private simulationTime: number = 0; // Game time elapsed in ms
  private realTimeMultiplier: number = 1; // How much faster game time moves vs real time
  
  constructor(
    factionManager: FactionManager,
    eventSystem: FactionEventSystem,
    diplomacySystem: FactionDiplomacySystem,
    settings: Partial<FactionSimulationSettings> = {},
    resourceManager?: ResourceManager,
    territoryManager?: TerritoryManager
  ) {
    this.factionManager = factionManager;
    this.eventSystem = eventSystem;
    this.diplomacySystem = diplomacySystem;
    this.resourceManager = resourceManager;
    this.territoryManager = territoryManager;
    
    this.settings = {
      ...DEFAULT_SIMULATION_SETTINGS,
      ...settings
    };
  }
  
  /**
   * Starts the simulation
   */
  public start(realTimeMultiplier: number = 1): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.realTimeMultiplier = realTimeMultiplier;
    
    // Calculate the real-time interval based on multiplier
    const realTimeInterval = this.settings.tickInterval / this.realTimeMultiplier;
    
    this.tickIntervalId = setInterval(() => {
      this.simulationTick();
    }, realTimeInterval);
    
    console.log(`Faction simulation started with time multiplier: ${realTimeMultiplier}x`);
  }
  
  /**
   * Stops the simulation
   */
  public stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = undefined;
    }
    
    console.log('Faction simulation stopped');
  }
  
  /**
   * Updates simulation settings
   */
  public updateSettings(settings: Partial<FactionSimulationSettings>): void {
    this.settings = {
      ...this.settings,
      ...settings
    };
    
    // If running, restart with new settings
    if (this.isRunning) {
      const currentMultiplier = this.realTimeMultiplier;
      this.stop();
      this.start(currentMultiplier);
    }
  }
  
  /**
   * Get all simulation actions
   */
  public getSimulationActions(): SimulationAction[] {
    return Array.from(this.simulationActions.values());
  }
  
  /**
   * Get simulation actions for a faction
   */
  public getActionsForFaction(factionId: string): SimulationAction[] {
    return Array.from(this.simulationActions.values())
      .filter(action => action.factionId === factionId);
  }
  
  /**
   * Get current simulation time
   */
  public getSimulationTime(): number {
    return this.simulationTime;
  }
  
  /**
   * Run a single simulation tick manually
   */
  public simulationTick(): void {
    // Update simulation time
    this.simulationTime += this.settings.tickInterval;
    
    // Process each faction
    const factions = this.factionManager.getAllFactions();
    
    // Process global events
    this.processGlobalEvents();
    
    // Process pending diplomatic actions
    this.diplomacySystem.processPendingActions();
    
    // Process faction actions
    for (const faction of factions) {
      this.processFactionTurn(faction);
    }
    
    // Update dynamic relationships between factions
    this.factionManager.simulateFactionTick();
    
    console.log(`Simulation tick completed at time: ${new Date(this.simulationTime).toISOString()}`);
  }
  
  /**
   * Process global events that affect multiple factions
   */
  private processGlobalEvents(): void {
    // Determine if a random event should occur based on frequency setting
    if (Math.random() < 0.1 * this.settings.randomEventFrequency) {
      const event = this.eventSystem.generateRandomEvent();
      if (event) {
        console.log(`Random event generated: ${event.name}`);
        this.eventSystem.resolveEvent(event.id);
      }
    }
  }
  
  /**
   * Process a turn for a single faction
   */
  private processFactionTurn(faction: Faction): void {
    // Calculate action points based on faction state
    const actionPoints = this.calculateActionPoints(faction);
    
    // Determine faction focus areas
    const focusAreas = this.determineFocusAreas(faction);
    
    // Process each focus area
    for (let i = 0; i < actionPoints && i < focusAreas.length; i++) {
      const focusArea = focusAreas[i];
      const action = this.executeActionForFocusArea(faction, focusArea);
      
      if (action) {
        this.simulationActions.set(action.id, action);
      }
    }
    
    // Update faction state after turn
    faction.applyNaturalStateChanges();
  }
  
  /**
   * Calculate how many actions a faction can take in a turn
   */
  private calculateActionPoints(faction: Faction): number {
    const state = faction.getState();
    
    // Base action points
    let actionPoints = 1;
    
    // Additional points based on power and efficiency
    if (state.power > 70) actionPoints++;
    if (state.cohesion > 60) actionPoints++;
    
    // Reduction for corrupt or isolated factions
    if (state.corruption > 70) actionPoints--;
    if (state.isolation > 80) actionPoints--;
    
    // Ensure at least 1 action point
    return Math.max(1, actionPoints);
  }
  
  /**
   * Determine what areas the faction should focus on this turn
   */
  private determineFocusAreas(faction: Faction): SimulationActionType[] {
    const state = faction.getState();
    const goals = faction.getGoals();
    const focusAreas: SimulationActionType[] = [];
    
    // Priority to goals if setting is high
    if (this.settings.goalFocus > 0.7 && goals.length > 0) {
      focusAreas.push('pursue_goal');
    }
    
    // Add focus areas based on faction state
    if (state.power < 40) {
      focusAreas.push('strengthen_military');
    }
    
    if (state.wealth < 30) {
      focusAreas.push('improve_economy');
    }
    
    if (state.influence < 50 && state.isolation < 70) {
      focusAreas.push('diplomatic_action');
    }
    
    if (state.cohesion < 40 || state.corruption > 60) {
      focusAreas.push('internal_development');
    }
    
    // Add expansion if aggressive and strong
    if (this.settings.aggressiveness > 0.8 && state.power > 60) {
      focusAreas.push('expand_territory');
    }
    
    // Always add goal pursuit if not already added
    if (!focusAreas.includes('pursue_goal') && goals.length > 0) {
      focusAreas.push('pursue_goal');
    }
    
    // Add diplomatic action if not already added and if enabled
    if (!focusAreas.includes('diplomatic_action') && this.settings.enableAdvancedDiplomacy) {
      focusAreas.push('diplomatic_action');
    }
    
    // Shuffle array to introduce some randomness in priority
    return this.shuffleArray(focusAreas);
  }
  
  /**
   * Execute an action for a given focus area
   */
  private executeActionForFocusArea(
    faction: Faction, 
    focusArea: SimulationActionType
  ): SimulationAction | null {
    switch (focusArea) {
      case 'pursue_goal':
        return this.executePursueGoal(faction);
      
      case 'expand_territory':
        return this.executeExpandTerritory(faction);
        
      case 'improve_economy':
        return this.executeImproveEconomy(faction);
        
      case 'strengthen_military':
        return this.executeStrengthenMilitary(faction);
        
      case 'diplomatic_action':
        return this.executeDiplomaticAction(faction);
        
      case 'internal_development':
        return this.executeInternalDevelopment(faction);
        
      case 'react_to_event':
        return this.executeReactToEvent(faction);
        
      default:
        return null;
    }
  }
  
  /**
   * Execute an action to pursue a high-priority goal
   */
  private executePursueGoal(faction: Faction): SimulationAction | null {
    const goals = faction.getGoals()
      .sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)
    
    if (goals.length === 0) return null;
    
    const goal = goals[0]; // Get highest priority goal
    
    // Handle different goal types
    let description = '';
    let effects: SimulationAction['effects'] = {};
    
    switch (goal.type) {
      case 'territory':
        if (this.territoryManager && goal.targetId) {
          const territory = this.territoryManager.getTerritory(goal.targetId);
          if (territory) {
            description = `Pursuing territorial expansion into ${territory.name}`;
            effects = {
              stateChanges: { power: -5, wealth: -3 },
              territoryChanges: [goal.targetId]
            };
            
            // Update goal progress
            const updatedGoal = { ...goal, progress: Math.min(100, goal.progress + 10) };
            faction.removeGoal(goal.id);
            faction.addGoal(updatedGoal);
          }
        }
        break;
        
      case 'resource':
        if (this.resourceManager && goal.targetId) {
          const resource = this.resourceManager.getResource(goal.targetId);
          if (resource) {
            description = `Seeking to acquire ${resource.name} resources`;
            effects = {
              stateChanges: { wealth: -2 },
              resourceChanges: [goal.targetId]
            };
            
            // Update goal progress
            const updatedGoal = { ...goal, progress: Math.min(100, goal.progress + 15) };
            faction.removeGoal(goal.id);
            faction.addGoal(updatedGoal);
          }
        }
        break;
        
      case 'alliance':
        if (goal.targetId) {
          const targetFaction = this.factionManager.getFaction(goal.targetId);
          if (targetFaction) {
            description = `Working toward an alliance with ${targetFaction.name}`;
            effects = {
              relationshipChanges: [{ 
                factionId: goal.targetId, 
                attitudeChange: 5 
              }]
            };
            
            // Try to improve relations through diplomatic channels
            if (this.settings.enableAdvancedDiplomacy) {
              this.diplomacySystem.createDiplomaticAction(
                'diplomatic_mission',
                faction.id,
                goal.targetId,
                `Diplomatic mission to improve relations`,
                { quality: 8 }
              );
            }
            
            // Update goal progress
            const relationship = this.factionManager.getRelationship(faction.id, goal.targetId);
            if (relationship) {
              const progressIncrement = relationship.attitude > 50 ? 20 : 10;
              const updatedGoal = { 
                ...goal, 
                progress: Math.min(100, goal.progress + progressIncrement) 
              };
              faction.removeGoal(goal.id);
              faction.addGoal(updatedGoal);
            }
          }
        }
        break;
        
      case 'elimination':
        if (goal.targetId) {
          const targetFaction = this.factionManager.getFaction(goal.targetId);
          if (targetFaction) {
            description = `Taking actions against ${targetFaction.name}`;
            effects = {
              stateChanges: { power: -3, aggression: 5 },
              relationshipChanges: [{ 
                factionId: goal.targetId, 
                attitudeChange: -10 
              }]
            };
            
            // Take hostile diplomatic action if appropriate
            if (this.settings.enableAdvancedDiplomacy && 
                this.settings.aggressiveness > 0.7) {
              const relationship = this.factionManager.getRelationship(faction.id, goal.targetId);
              if (relationship && relationship.status !== 'hostile') {
                this.diplomacySystem.createDiplomaticAction(
                  'threaten',
                  faction.id,
                  goal.targetId,
                  `Threat of force against ${targetFaction.name}`
                );
              }
            }
            
            // Update goal progress based on target's weakening
            const targetState = targetFaction.getState();
            const progressIncrement = targetState.power < 40 ? 15 : 5;
            
            const updatedGoal = { 
              ...goal, 
              progress: Math.min(100, goal.progress + progressIncrement) 
            };
            faction.removeGoal(goal.id);
            faction.addGoal(updatedGoal);
          }
        }
        break;
        
      default:
        description = `Working toward goal: ${goal.title}`;
        effects = {
          otherEffects: [`Progress on ${goal.title} increased`]
        };
        
        // Generic progress update
        const updatedGoal = { ...goal, progress: Math.min(100, goal.progress + 10) };
        faction.removeGoal(goal.id);
        faction.addGoal(updatedGoal);
    }
    
    if (!description) return null;
    
    return this.createSimulationAction(
      faction.id,
      'pursue_goal',
      description,
      effects
    );
  }
  
  /**
   * Execute an action to expand territory
   */
  private executeExpandTerritory(faction: Faction): SimulationAction | null {
    if (!this.territoryManager) return null;
    
    const state = faction.getState();
    const currentTerritories = faction.getTerritories();
    
    // Find potential territories to expand into
    let potentialTerritories = [];
    
    if (currentTerritories.length > 0) {
      // Look for adjacent territories
      for (const territory of currentTerritories) {
        const neighbors = this.territoryManager.getNeighbors(territory.id);
        potentialTerritories.push(...neighbors);
      }
    } else {
      // If no territories, look for unclaimed ones
      potentialTerritories = this.territoryManager.getAllTerritories()
        .filter(t => t.controlLevel < 50);
    }
    
    // Filter out already controlled territories
    potentialTerritories = potentialTerritories.filter(t => 
      !currentTerritories.some(ct => ct.id === t.id)
    );
    
    if (potentialTerritories.length === 0) return null;
    
    // Pick a territory based on strategic value
    potentialTerritories.sort((a, b) => b.strategic_value - a.strategic_value);
    
    const targetTerritory = potentialTerritories[0];
    
    // Attempt to expand
    const expansionSuccess = Math.random() < (state.power / 100) * this.settings.volatility;
    
    let description: string;
    let effects: SimulationAction['effects'];
    
    if (expansionSuccess) {
      description = `Successfully expanded into ${targetTerritory.name}`;
      effects = {
        stateChanges: { 
          power: -5, 
          wealth: -3, 
          influence: 3 
        },
        territoryChanges: [targetTerritory.id]
      };
      
      // Add territory to faction
      faction.addTerritory(targetTerritory);
      
    } else {
      description = `Failed attempt to expand into ${targetTerritory.name}`;
      effects = {
        stateChanges: { 
          power: -8, 
          wealth: -5, 
          reputation: -2 
        }
      };
    }
    
    return this.createSimulationAction(
      faction.id,
      'expand_territory',
      description,
      effects
    );
  }
  
  /**
   * Execute an action to improve economy
   */
  private executeImproveEconomy(faction: Faction): SimulationAction | null {
    const state = faction.getState();
    
    // Calculate success chance
    const successChance = 0.7 + (state.cohesion / 200) - (state.corruption / 200);
    const success = Math.random() < successChance;
    
    let description: string;
    let effects: SimulationAction['effects'];
    
    if (success) {
      const wealthIncrease = 5 + Math.floor(Math.random() * 5);
      
      description = `Economic reforms successfully implemented`;
      effects = {
        stateChanges: { 
          wealth: wealthIncrease, 
          power: 2, 
          influence: 1 
        }
      };
    } else {
      description = `Economic reforms failed to produce desired results`;
      effects = {
        stateChanges: { 
          wealth: -2, 
          cohesion: -3
        }
      };
    }
    
    return this.createSimulationAction(
      faction.id,
      'improve_economy',
      description,
      effects
    );
  }
  
  /**
   * Execute an action to strengthen military
   */
  private executeStrengthenMilitary(faction: Faction): SimulationAction | null {
    const state = faction.getState();
    
    // Calculate resource cost
    const wealthCost = 5 + Math.floor(Math.random() * 5);
    
    // Check if faction can afford it
    if (state.wealth < wealthCost + 10) {
      return this.createSimulationAction(
        faction.id,
        'strengthen_military',
        `Military buildup cancelled due to insufficient resources`,
        {
          otherEffects: [`Military buildup cancelled`]
        }
      );
    }
    
    // Calculate power increase
    const powerIncrease = 5 + Math.floor(Math.random() * 5);
    
    // Military buildup also increases aggression and potentially decreases cohesion
    let cohesionChange = 0;
    if (state.cohesion < 40) {
      cohesionChange = -2; // Low cohesion factions suffer from military focus
    }
    
    const description = `Military forces strengthened through training and recruitment`;
    const effects: SimulationAction['effects'] = {
      stateChanges: { 
        power: powerIncrease, 
        wealth: -wealthCost, 
        aggression: 2,
        cohesion: cohesionChange
      }
    };
    
    return this.createSimulationAction(
      faction.id,
      'strengthen_military',
      description,
      effects
    );
  }
  
  /**
   * Execute a diplomatic action
   */
  private executeDiplomaticAction(faction: Faction): SimulationAction | null {
    if (!this.settings.enableAdvancedDiplomacy) return null;
    
    const state = faction.getState();
    const otherFactions = this.factionManager.getAllFactions()
      .filter(f => f.id !== faction.id);
    
    if (otherFactions.length === 0) return null;
    
    // Pick a target faction
    const targetIndex = Math.floor(Math.random() * otherFactions.length);
    const targetFaction = otherFactions[targetIndex];
    
    // Get suggested actions based on relationship
    const suggestedActions = this.diplomacySystem.suggestDiplomaticActions(faction.id);
    
    if (suggestedActions.length === 0) return null;
    
    // Pick a suggested action with some randomness
    const actionIndex = Math.floor(Math.random() * suggestedActions.length);
    const actionType = suggestedActions[actionIndex];
    
    // Create diplomatic action
    const relationship = this.factionManager.getRelationship(faction.id, targetFaction.id);
    const currentAttitude = relationship ? relationship.attitude : 0;
    
    let description = `Diplomatic action ${actionType} taken toward ${targetFaction.name}`;
    let diplomaticActionDescription = '';
    
    switch (actionType) {
      case 'propose_treaty':
        diplomaticActionDescription = `Proposed non-aggression treaty with ${targetFaction.name}`;
        break;
        
      case 'form_alliance':
        diplomaticActionDescription = `Proposed formal alliance with ${targetFaction.name}`;
        break;
        
      case 'trade_agreement':
        diplomaticActionDescription = `Proposed trade agreement with ${targetFaction.name}`;
        break;
        
      case 'diplomatic_mission':
        diplomaticActionDescription = `Sent diplomatic mission to improve relations with ${targetFaction.name}`;
        break;
        
      case 'threaten':
        diplomaticActionDescription = `Issued threat against ${targetFaction.name}`;
        break;
        
      case 'give_gift':
        diplomaticActionDescription = `Sent gifts to ${targetFaction.name}`;
        break;
        
      default:
        diplomaticActionDescription = `Engaged in ${actionType} with ${targetFaction.name}`;
    }
    
    // Create the diplomatic action in the diplomacy system
    this.diplomacySystem.createDiplomaticAction(
      actionType,
      faction.id,
      targetFaction.id,
      diplomaticActionDescription
    );
    
    // Record the simulation action
    return this.createSimulationAction(
      faction.id,
      'diplomatic_action',
      description,
      {
        relationshipChanges: [{ 
          factionId: targetFaction.id, 
          attitudeChange: 0 // Actual change will happen when action is executed
        }],
        otherEffects: [diplomaticActionDescription]
      }
    );
  }
  
  /**
   * Execute internal development actions
   */
  private executeInternalDevelopment(faction: Faction): SimulationAction | null {
    const state = faction.getState();
    
    // Determine focus area - cohesion or anti-corruption
    const needsAntiCorruption = state.corruption > 50;
    const needsCohesion = state.cohesion < 50;
    
    let description: string;
    let effects: SimulationAction['effects'];
    
    if (needsAntiCorruption && (needsCohesion === false || Math.random() < 0.6)) {
      // Focus on anti-corruption
      const corruptionReduction = 5 + Math.floor(Math.random() * 5);
      
      description = `Anti-corruption measures implemented within the faction`;
      effects = {
        stateChanges: { 
          corruption: -corruptionReduction, 
          wealth: -3, 
          cohesion: 2
        }
      };
    } else {
      // Focus on cohesion
      const cohesionIncrease = 5 + Math.floor(Math.random() * 5);
      
      description = `Internal unity building initiatives implemented`;
      effects = {
        stateChanges: { 
          cohesion: cohesionIncrease, 
          wealth: -2, 
          isolation: 2 // Focusing inward increases isolation slightly
        }
      };
    }
    
    return this.createSimulationAction(
      faction.id,
      'internal_development',
      description,
      effects
    );
  }
  
  /**
   * Execute a reaction to a recent event
   */
  private executeReactToEvent(faction: Faction): SimulationAction | null {
    // Get recent events affecting this faction
    const recentEvents = this.eventSystem.getEventsByFaction(faction.id)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (recentEvents.length === 0) {
      return null;
    }
    
    const mostRecentEvent = recentEvents[0];
    
    // Skip if event is too old (more than 2 ticks ago)
    if (this.simulationTime - mostRecentEvent.timestamp > this.settings.tickInterval * 2) {
      return null;
    }
    
    let description = `Responded to event: ${mostRecentEvent.name}`;
    let effects: SimulationAction['effects'] = {
      otherEffects: [`Response to ${mostRecentEvent.name}`]
    };
    
    // Add state changes based on event type
    if (mostRecentEvent.name.includes('Disaster')) {
      effects.stateChanges = {
        cohesion: 3, // Disasters often unite people
        wealth: -2  // But cost resources to address
      };
    } else if (mostRecentEvent.name.includes('Economic')) {
      effects.stateChanges = {
        wealth: 2,  // Economic opportunities 
        corruption: 1 // But might increase corruption
      };
    } else if (mostRecentEvent.name.includes('Political')) {
      effects.stateChanges = {
        influence: 2,
        cohesion: -1 // Political changes can be divisive
      };
    }
    
    return this.createSimulationAction(
      faction.id,
      'react_to_event',
      description,
      effects
    );
  }
  
  /**
   * Create a simulation action record
   */
  private createSimulationAction(
    factionId: string,
    type: SimulationActionType,
    description: string,
    effects: SimulationAction['effects']
  ): SimulationAction {
    const id = uuidv4();
    
    const action: SimulationAction = {
      id,
      factionId,
      type,
      description,
      timestamp: this.simulationTime,
      effects
    };
    
    // Apply state changes if any
    if (effects.stateChanges) {
      const faction = this.factionManager.getFaction(factionId);
      if (faction) {
        faction.updateState(effects.stateChanges);
      }
    }
    
    // Apply relationship changes if any
    if (effects.relationshipChanges) {
      for (const change of effects.relationshipChanges) {
        const relationship = this.factionManager.getRelationship(factionId, change.factionId);
        if (relationship && change.attitudeChange !== 0) {
          this.factionManager.updateRelationship(
            factionId,
            change.factionId,
            { attitude: relationship.attitude + change.attitudeChange },
            description
          );
        }
      }
    }
    
    return action;
  }
  
  /**
   * Helper function to shuffle an array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
} 