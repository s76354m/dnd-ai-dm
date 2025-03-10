import { v4 as uuidv4 } from 'uuid';
import { FactionManager } from './faction-manager';
import { TerritoryManager } from './territory-manager';
import { ResourceManager } from './resource-manager';
import { FactionEventSystem } from './faction-events';
import { FactionDiplomacySystem } from './faction-diplomacy';
import { FactionSimulationSystem, FactionSimulationSettings } from './faction-simulation';
import { Faction, FactionGoal, FactionState, FactionValue, Resource, Territory } from './faction-types';

/**
 * Main integration class for the faction system
 * This provides a unified API for interacting with all faction-related functionality
 */
export class FactionSystem {
  public readonly factionManager: FactionManager;
  public readonly territoryManager: TerritoryManager;
  public readonly resourceManager: ResourceManager;
  public readonly eventSystem: FactionEventSystem;
  public readonly diplomacySystem: FactionDiplomacySystem;
  public readonly simulationSystem: FactionSimulationSystem;
  
  private initialized: boolean = false;
  
  /**
   * Creates a new faction system with all components
   */
  constructor(simulationSettings?: Partial<FactionSimulationSettings>) {
    // Initialize all subsystems
    this.factionManager = new FactionManager();
    this.territoryManager = new TerritoryManager();
    this.resourceManager = new ResourceManager();
    
    // Initialize systems that depend on the managers
    this.eventSystem = new FactionEventSystem(this.factionManager);
    this.diplomacySystem = new FactionDiplomacySystem(this.factionManager);
    
    // Initialize the simulation system
    this.simulationSystem = new FactionSimulationSystem(
      this.factionManager,
      this.eventSystem,
      this.diplomacySystem,
      simulationSettings,
      this.resourceManager,
      this.territoryManager
    );
  }
  
  /**
   * Initializes the faction system with sample data for a new game
   */
  public initialize(worldSize: 'small' | 'medium' | 'large' = 'medium'): void {
    if (this.initialized) {
      console.warn('Faction system already initialized');
      return;
    }
    
    // Create territories based on world size
    this.createInitialTerritories(worldSize);
    
    // Create resources
    this.createInitialResources();
    
    // Create starter factions
    this.createInitialFactions(worldSize);
    
    this.initialized = true;
    console.log(`Faction system initialized with ${worldSize} world size`);
  }
  
  /**
   * Starts the faction simulation
   */
  public startSimulation(timeMultiplier: number = 1): void {
    if (!this.initialized) {
      console.warn('Cannot start simulation before initialization');
      return;
    }
    
    this.simulationSystem.start(timeMultiplier);
  }
  
  /**
   * Stops the faction simulation
   */
  public stopSimulation(): void {
    this.simulationSystem.stop();
  }
  
  /**
   * Creates a new faction
   */
  public createFaction(
    name: string, 
    values: FactionValue[], 
    initialState?: Partial<FactionState>
  ): Faction {
    return this.factionManager.createFaction(name, values, initialState);
  }
  
  /**
   * Creates a new territory
   */
  public createTerritory(
    name: string,
    description: string,
    type: Territory['type'],
    options?: Partial<Omit<Territory, 'id' | 'name' | 'description' | 'type'>>
  ): Territory {
    return this.territoryManager.createTerritory(name, description, type, options);
  }
  
  /**
   * Creates a new resource
   */
  public createResource(
    name: string,
    description: string,
    type: Resource['type'],
    rarity: Resource['rarity'],
    quantity: number,
    value_per_unit: number,
    territory_id?: string,
    metadata?: Record<string, any>
  ): Resource {
    return this.resourceManager.createResource(
      name, description, type, rarity, quantity, value_per_unit, territory_id, metadata
    );
  }
  
  /**
   * Assigns a territory to a faction
   */
  public assignTerritoryToFaction(territoryId: string, factionId: string): boolean {
    const territory = this.territoryManager.getTerritory(territoryId);
    const faction = this.factionManager.getFaction(factionId);
    
    if (!territory || !faction) {
      return false;
    }
    
    faction.addTerritory(territory);
    return true;
  }
  
  /**
   * Sets a goal for a faction
   */
  public setFactionGoal(
    factionId: string,
    type: FactionGoal['type'],
    title: string,
    description: string,
    priority: number,
    targetId?: string
  ): FactionGoal | null {
    const faction = this.factionManager.getFaction(factionId);
    if (!faction) {
      return null;
    }
    
    const goal: FactionGoal = {
      id: uuidv4(),
      type,
      title,
      description,
      priority,
      progress: 0,
      targetId
    };
    
    faction.addGoal(goal);
    return goal;
  }
  
  /**
   * Gets the current state of all factions
   */
  public getWorldState(): {
    factions: Faction[];
    territories: Record<string, Territory[]>;
    resources: Record<string, Resource[]>;
    relationships: Record<string, Record<string, number>>;
  } {
    const factions = this.factionManager.getAllFactions();
    const territories: Record<string, Territory[]> = {};
    const resources: Record<string, Resource[]> = {};
    const relationships: Record<string, Record<string, number>> = {};
    
    // Get territories for each faction
    for (const faction of factions) {
      territories[faction.id] = faction.getTerritories();
      
      // Initialize relationship record
      relationships[faction.id] = {};
      
      // Get resources for this faction
      resources[faction.id] = [];
      for (const territory of territories[faction.id]) {
        for (const resourceId of territory.resources) {
          const resource = this.resourceManager.getResource(resourceId);
          if (resource) {
            resources[faction.id].push(resource);
          }
        }
      }
      
      // Add directly controlled resources (not tied to territories)
      resources[faction.id].push(...faction.getResources());
    }
    
    // Get relationships between factions
    for (let i = 0; i < factions.length; i++) {
      for (let j = i + 1; j < factions.length; j++) {
        const factionId1 = factions[i].id;
        const factionId2 = factions[j].id;
        
        const relationship = this.factionManager.getRelationship(factionId1, factionId2);
        if (relationship) {
          relationships[factionId1][factionId2] = relationship.attitude;
          relationships[factionId2][factionId1] = relationship.attitude;
        }
      }
    }
    
    return {
      factions,
      territories,
      resources,
      relationships
    };
  }
  
  /**
   * Returns a faction report with detailed information
   */
  public getFactionReport(factionId: string): {
    faction: Faction | null;
    territories: Territory[];
    resources: Resource[];
    goals: FactionGoal[];
    alliances: string[];
    enemies: string[];
    recentActions: {
      type: string;
      description: string;
      timestamp: number;
    }[];
  } {
    const faction = this.factionManager.getFaction(factionId);
    
    if (!faction) {
      return {
        faction: null,
        territories: [],
        resources: [],
        goals: [],
        alliances: [],
        enemies: [],
        recentActions: []
      };
    }
    
    // Get territories and resources
    const territories = faction.getTerritories();
    const resources = faction.getResources();
    
    // Add resources from territories
    for (const territory of territories) {
      for (const resourceId of territory.resources) {
        const resource = this.resourceManager.getResource(resourceId);
        if (resource && !resources.some(r => r.id === resource.id)) {
          resources.push(resource);
        }
      }
    }
    
    // Get goals
    const goals = faction.getGoals();
    
    // Get alliances and enemies
    const alliances: string[] = [];
    const enemies: string[] = [];
    
    const otherFactions = this.factionManager.getAllFactions()
      .filter(f => f.id !== factionId);
    
    for (const otherFaction of otherFactions) {
      const relationship = this.factionManager.getRelationship(factionId, otherFaction.id);
      if (relationship) {
        if (relationship.status === 'allied') {
          alliances.push(otherFaction.id);
        } else if (relationship.status === 'hostile') {
          enemies.push(otherFaction.id);
        }
      }
    }
    
    // Get recent actions
    const recentActions = this.simulationSystem.getActionsForFaction(factionId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(action => ({
        type: action.type,
        description: action.description,
        timestamp: action.timestamp
      }));
    
    return {
      faction,
      territories,
      resources,
      goals,
      alliances,
      enemies,
      recentActions
    };
  }
  
  /**
   * Creates a random event affecting specific factions
   */
  public createEvent(
    name: string,
    description: string,
    affectedFactionIds: string[]
  ): void {
    // Create a simple event with state impacts
    const impacts = affectedFactionIds.map(factionId => ({
      type: 'state' as const,
      targetId: factionId,
      changes: {
        // Random small changes to various state attributes
        power: Math.floor(Math.random() * 10) - 5,
        wealth: Math.floor(Math.random() * 10) - 5,
        cohesion: Math.floor(Math.random() * 10) - 5
      },
      description: `Impact of ${name} on faction`
    }));
    
    const event = this.eventSystem.createEvent(
      name,
      description,
      affectedFactionIds,
      impacts
    );
    
    // Resolve the event immediately
    this.eventSystem.resolveEvent(event.id);
  }
  
  /**
   * Serializes the entire faction system state for saving
   */
  public serializeState(): string {
    const state = {
      factions: this.factionManager.getAllFactions(),
      territories: this.territoryManager.getAllTerritories(),
      resources: this.resourceManager.getAllResources(),
      simulationTime: this.simulationSystem.getSimulationTime()
    };
    
    return JSON.stringify(state);
  }
  
  /**
   * Deserializes and loads a saved faction system state
   */
  public deserializeState(serializedState: string): boolean {
    try {
      const state = JSON.parse(serializedState);
      
      // Reset current state
      this.initialized = false;
      
      // TODO: Implement full deserialization logic
      // This would require recreating all objects with their proper methods
      
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to deserialize faction system state:', error);
      return false;
    }
  }
  
  /**
   * Creates initial territories based on world size
   */
  private createInitialTerritories(worldSize: 'small' | 'medium' | 'large'): void {
    const territoryCount = {
      small: 10,
      medium: 20,
      large: 40
    }[worldSize];
    
    const territoryTypes: Territory['type'][] = [
      'city', 'fortress', 'village', 'wilderness', 'dungeon'
    ];
    
    const createdTerritories: Territory[] = [];
    
    // Create initial territories
    for (let i = 0; i < territoryCount; i++) {
      const typeIndex = Math.floor(Math.random() * territoryTypes.length);
      const type = territoryTypes[typeIndex];
      
      const name = `${type.charAt(0).toUpperCase() + type.slice(1)} ${i + 1}`;
      const description = `A ${type} in the game world`;
      
      const strategic_value = 1 + Math.floor(Math.random() * 10);
      const economic_value = 1 + Math.floor(Math.random() * 10);
      
      const territory = this.territoryManager.createTerritory(
        name,
        description,
        type,
        {
          strategic_value,
          economic_value,
          controlLevel: 100, // Fully controlled initially
          position: {
            x: Math.random() * 1000,
            y: Math.random() * 1000
          }
        }
      );
      
      createdTerritories.push(territory);
    }
    
    // Connect territories as neighbors
    for (let i = 0; i < createdTerritories.length; i++) {
      const territory = createdTerritories[i];
      
      // Connect to 2-4 neighbors
      const connectionCount = 2 + Math.floor(Math.random() * 3);
      
      for (let j = 0; j < connectionCount; j++) {
        // Pick a random territory that's not already connected
        let otherIndex = Math.floor(Math.random() * createdTerritories.length);
        
        // Avoid self-connections and existing connections
        let attempts = 0;
        while (
          otherIndex === i || 
          territory.neighbors.includes(createdTerritories[otherIndex].id)
        ) {
          otherIndex = Math.floor(Math.random() * createdTerritories.length);
          attempts++;
          if (attempts > 10) break; // Avoid infinite loop
        }
        
        if (attempts <= 10) {
          this.territoryManager.setNeighbors(
            territory.id, 
            createdTerritories[otherIndex].id
          );
        }
      }
    }
  }
  
  /**
   * Creates initial resources
   */
  private createInitialResources(): void {
    const resourceTypes: Resource['type'][] = ['gold', 'food', 'lumber', 'ore', 'magic', 'luxury'];
    const rarities: Resource['rarity'][] = ['common', 'uncommon', 'rare', 'very_rare', 'legendary'];
    
    // Get all territories
    const territories = this.territoryManager.getAllTerritories();
    
    // Create 1-3 resources for each territory
    for (const territory of territories) {
      const resourceCount = 1 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < resourceCount; i++) {
        const typeIndex = Math.floor(Math.random() * resourceTypes.length);
        const type = resourceTypes[typeIndex];
        
        const rarityIndex = Math.floor(Math.random() * 100);
        let rarity: Resource['rarity'];
        
        // Distribute rarity with decreasing probability
        if (rarityIndex < 50) rarity = 'common';
        else if (rarityIndex < 75) rarity = 'uncommon';
        else if (rarityIndex < 90) rarity = 'rare';
        else if (rarityIndex < 98) rarity = 'very_rare';
        else rarity = 'legendary';
        
        const quantity = {
          common: 100 + Math.floor(Math.random() * 900),
          uncommon: 50 + Math.floor(Math.random() * 150),
          rare: 20 + Math.floor(Math.random() * 80),
          very_rare: 5 + Math.floor(Math.random() * 15),
          legendary: 1 + Math.floor(Math.random() * 4)
        }[rarity];
        
        const value_per_unit = {
          common: 1 + Math.floor(Math.random() * 5),
          uncommon: 5 + Math.floor(Math.random() * 20),
          rare: 25 + Math.floor(Math.random() * 75),
          very_rare: 100 + Math.floor(Math.random() * 400),
          legendary: 500 + Math.floor(Math.random() * 2000)
        }[rarity];
        
        const name = `${rarity} ${type}`;
        const description = `A ${rarity} ${type} resource found in ${territory.name}`;
        
        const resource = this.resourceManager.createResource(
          name,
          description,
          type,
          rarity,
          quantity,
          value_per_unit,
          territory.id
        );
        
        // Add resource to territory
        this.territoryManager.addResourceToTerritory(territory.id, resource.id);
      }
    }
  }
  
  /**
   * Creates initial factions
   */
  private createInitialFactions(worldSize: 'small' | 'medium' | 'large'): void {
    const factionCount = {
      small: 3,
      medium: 5,
      large: 8
    }[worldSize];
    
    const factionNames = [
      'Northern Kingdom', 'Southern Empire', 'Eastern Clans', 
      'Western Republic', 'Mountain Tribes', 'Coastal Alliance',
      'Desert Nomads', 'Forest Enclave', 'Island Federation',
      'Underdark Coalition', 'Frontier Settlers', 'Central Dominion'
    ];
    
    const valueTypes: FactionValueType[] = [
      'honor', 'wealth', 'power', 'knowledge', 'tradition', 'progress',
      'order', 'freedom', 'loyalty', 'justice', 'mercy', 'nature',
      'artifice', 'community', 'individuality', 'spirituality'
    ];
    
    const territories = this.territoryManager.getAllTerritories();
    const territoriesPerFaction = Math.floor(territories.length / factionCount);
    
    // Create factions
    for (let i = 0; i < factionCount; i++) {
      // Select 3-5 random values for this faction
      const valueCount = 3 + Math.floor(Math.random() * 3);
      const values: FactionValue[] = [];
      
      const usedValueIndices = new Set<number>();
      
      for (let j = 0; j < valueCount; j++) {
        let valueIndex = Math.floor(Math.random() * valueTypes.length);
        
        // Avoid duplicates
        while (usedValueIndices.has(valueIndex)) {
          valueIndex = Math.floor(Math.random() * valueTypes.length);
        }
        
        usedValueIndices.add(valueIndex);
        
        // Random strength between -100 and 100
        const strength = Math.floor(Math.random() * 201) - 100;
        
        values.push({
          type: valueTypes[valueIndex],
          strength,
          description: `This faction ${strength > 0 ? 'values' : 'opposes'} ${valueTypes[valueIndex]}`
        });
      }
      
      // Create faction with balanced starting stats
      const faction = this.factionManager.createFaction(
        factionNames[i],
        values,
        {
          power: 40 + Math.floor(Math.random() * 30),
          wealth: 40 + Math.floor(Math.random() * 30),
          cohesion: 40 + Math.floor(Math.random() * 30),
          reputation: 40 + Math.floor(Math.random() * 30),
          influence: 40 + Math.floor(Math.random() * 30),
          isolation: Math.floor(Math.random() * 30),
          aggression: 20 + Math.floor(Math.random() * 60),
          corruption: Math.floor(Math.random() * 30)
        }
      );
      
      // Assign territories to this faction
      const startIdx = i * territoriesPerFaction;
      const endIdx = Math.min(startIdx + territoriesPerFaction, territories.length);
      
      for (let j = startIdx; j < endIdx; j++) {
        if (j < territories.length) {
          faction.addTerritory(territories[j]);
        }
      }
      
      // Add 1-2 initial goals
      const goalCount = 1 + Math.floor(Math.random() * 2);
      
      for (let j = 0; j < goalCount; j++) {
        const goalTypes: FactionGoalType[] = ['territory', 'resource', 'influence', 'wealth'];
        const goalType = goalTypes[Math.floor(Math.random() * goalTypes.length)];
        
        let title = '';
        let description = '';
        let targetId;
        
        switch (goalType) {
          case 'territory':
            // Find a territory not controlled by this faction
            const uncontrolledTerritories = territories.filter(
              t => !faction.getTerritories().some(ft => ft.id === t.id)
            );
            
            if (uncontrolledTerritories.length > 0) {
              const targetTerritory = uncontrolledTerritories[
                Math.floor(Math.random() * uncontrolledTerritories.length)
              ];
              
              title = `Conquer ${targetTerritory.name}`;
              description = `Gain control of ${targetTerritory.name}`;
              targetId = targetTerritory.id;
            } else {
              title = 'Expand Territory';
              description = 'Acquire new territories';
            }
            break;
            
          case 'resource':
            title = 'Acquire Resources';
            description = 'Increase resource control and production';
            break;
            
          case 'influence':
            title = 'Increase Influence';
            description = 'Become more influential in world affairs';
            break;
            
          case 'wealth':
            title = 'Amass Wealth';
            description = 'Build economic power';
            break;
        }
        
        if (title) {
          this.setFactionGoal(
            faction.id,
            goalType,
            title,
            description,
            5 + Math.floor(Math.random() * 6), // Priority 5-10
            targetId
          );
        }
      }
    }
    
    // Establish initial relationships between factions
    const factions = this.factionManager.getAllFactions();
    
    for (let i = 0; i < factions.length; i++) {
      for (let j = i + 1; j < factions.length; j++) {
        // Initial attitude ranges from -50 to 50
        const initialAttitude = Math.floor(Math.random() * 101) - 50;
        
        let status: 'allied' | 'neutral' | 'hostile';
        
        if (initialAttitude > 30) status = 'allied';
        else if (initialAttitude < -30) status = 'hostile';
        else status = 'neutral';
        
        this.factionManager.setRelationship(
          factions[i].id,
          factions[j].id,
          initialAttitude,
          status
        );
      }
    }
  }
}

// Type definition for faction value types (added for compatibility)
type FactionValueType = 
  | 'honor'
  | 'wealth'
  | 'power'
  | 'knowledge'
  | 'tradition'
  | 'progress'
  | 'order'
  | 'freedom'
  | 'loyalty'
  | 'justice'
  | 'mercy'
  | 'nature'
  | 'artifice'
  | 'community'
  | 'individuality'
  | 'spirituality'
  | 'practicality'
  | 'conquest'
  | 'peace'
  | 'secrecy'
  | 'openness'
  | string;
  
// Type definition for faction goal types (added for compatibility)
type FactionGoalType = 
  | 'territory'
  | 'resource'
  | 'alliance'
  | 'elimination'
  | 'influence'
  | 'wealth'
  | 'knowledge'
  | 'revenge'
  | 'protection'
  | 'ideology'
  | 'ritual'
  | string; 