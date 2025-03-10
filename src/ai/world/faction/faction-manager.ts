import { v4 as uuidv4 } from 'uuid';
import { FactionGoal, FactionRelationship, FactionState, FactionValue, Resource, Territory } from './faction-types';

/**
 * Manages all factions in the game world, their relationships, and territories
 */
export class FactionManager {
  private factions: Map<string, Faction> = new Map();
  private relationships: Map<string, FactionRelationship> = new Map();
  private globalEvents: string[] = [];

  /**
   * Creates a new faction in the world
   */
  public createFaction(name: string, values: FactionValue[], initialState?: Partial<FactionState>): Faction {
    const id = uuidv4();
    const faction = new Faction(id, name, values, initialState);
    this.factions.set(id, faction);
    return faction;
  }

  /**
   * Retrieves a faction by ID
   */
  public getFaction(id: string): Faction | undefined {
    return this.factions.get(id);
  }

  /**
   * Retrieves a faction by name
   */
  public getFactionByName(name: string): Faction | undefined {
    return Array.from(this.factions.values()).find(faction => faction.name === name);
  }

  /**
   * Gets all factions in the world
   */
  public getAllFactions(): Faction[] {
    return Array.from(this.factions.values());
  }

  /**
   * Establishes a relationship between two factions
   */
  public setRelationship(
    factionId1: string, 
    factionId2: string, 
    attitude: number, 
    status: 'allied' | 'neutral' | 'hostile' = 'neutral'
  ): FactionRelationship {
    const relationshipId = this.getRelationshipId(factionId1, factionId2);
    const relationship: FactionRelationship = {
      id: relationshipId,
      factionId1,
      factionId2,
      attitude, // -100 to 100 scale
      status,
      treaties: [],
      disputes: [],
      history: [{
        timestamp: Date.now(),
        event: `Relationship established with status: ${status}`,
        attitudeChange: 0
      }]
    };
    
    this.relationships.set(relationshipId, relationship);
    return relationship;
  }

  /**
   * Retrieves the relationship between two factions
   */
  public getRelationship(factionId1: string, factionId2: string): FactionRelationship | undefined {
    const relationshipId = this.getRelationshipId(factionId1, factionId2);
    return this.relationships.get(relationshipId);
  }

  /**
   * Updates a relationship between factions
   */
  public updateRelationship(
    factionId1: string,
    factionId2: string,
    changes: Partial<FactionRelationship>,
    eventDescription?: string
  ): FactionRelationship | undefined {
    const relationship = this.getRelationship(factionId1, factionId2);
    if (!relationship) return undefined;

    const attitudeChange = 
      changes.attitude !== undefined ? changes.attitude - relationship.attitude : 0;

    // Update relationship properties
    Object.assign(relationship, changes);

    // Add history entry if there's an event description
    if (eventDescription) {
      relationship.history.push({
        timestamp: Date.now(),
        event: eventDescription,
        attitudeChange
      });
    }

    return relationship;
  }

  /**
   * Records a global event that affects multiple factions
   */
  public recordGlobalEvent(description: string): void {
    this.globalEvents.push(description);
    
    // Factions might react to this event based on their values and goals
    this.factions.forEach(faction => {
      faction.processGlobalEvent(description);
    });
  }

  /**
   * Simulates faction actions and updates for a world tick
   */
  public simulateFactionTick(): void {
    // Allow each faction to take actions based on its goals and values
    this.factions.forEach(faction => {
      faction.takeTurnActions(this);
    });
    
    // Process relationship changes based on actions
    this.updateDynamicRelationships();
  }

  /**
   * Updates relationships based on faction actions and shared/opposing values
   */
  private updateDynamicRelationships(): void {
    // For each pair of factions, adjust relationships based on value alignment
    const factionArray = Array.from(this.factions.values());
    
    for (let i = 0; i < factionArray.length; i++) {
      for (let j = i + 1; j < factionArray.length; j++) {
        const faction1 = factionArray[i];
        const faction2 = factionArray[j];
        
        // Skip if these factions don't interact
        if (faction1.getState().isolation > 70 || faction2.getState().isolation > 70) {
          continue;
        }
        
        let relationship = this.getRelationship(faction1.id, faction2.id);
        
        // Create relationship if it doesn't exist
        if (!relationship) {
          relationship = this.setRelationship(faction1.id, faction2.id, 0);
        }
        
        // Adjust attitude based on shared values and goals
        const valueCompatibility = this.calculateValueCompatibility(faction1, faction2);
        const goalConflict = this.calculateGoalConflict(faction1, faction2);
        
        // Small incremental adjustment
        const attitudeAdjustment = (valueCompatibility - goalConflict) / 10;
        
        if (attitudeAdjustment !== 0) {
          this.updateRelationship(
            faction1.id, 
            faction2.id, 
            { 
              attitude: Math.max(-100, Math.min(100, relationship.attitude + attitudeAdjustment)) 
            },
            `Natural attitude adjustment: ${attitudeAdjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(attitudeAdjustment)}`
          );
        }
      }
    }
  }

  /**
   * Calculates how compatible the values of two factions are
   * Returns a number from 0 (completely incompatible) to 100 (perfectly aligned)
   */
  private calculateValueCompatibility(faction1: Faction, faction2: Faction): number {
    const values1 = faction1.getValues();
    const values2 = faction2.getValues();
    
    // Count shared values
    const sharedValues = values1.filter(v1 => 
      values2.some(v2 => v2.type === v1.type && Math.sign(v2.strength) === Math.sign(v1.strength))
    );
    
    // Count opposing values
    const opposingValues = values1.filter(v1 => 
      values2.some(v2 => v2.type === v1.type && Math.sign(v2.strength) !== Math.sign(v1.strength))
    );
    
    // Calculate score based on shared vs opposing values
    const totalValues = Math.max(values1.length, values2.length);
    if (totalValues === 0) return 50; // Neutral if no values
    
    return Math.round(50 + (50 * (sharedValues.length - opposingValues.length)) / totalValues);
  }

  /**
   * Calculates the degree of conflict between faction goals
   * Returns a number from 0 (no conflict) to 100 (complete conflict)
   */
  private calculateGoalConflict(faction1: Faction, faction2: Faction): number {
    const goals1 = faction1.getGoals();
    const goals2 = faction2.getGoals();
    
    let conflictScore = 0;
    
    // Check for territory conflicts
    const territoryClaims1 = goals1
      .filter(g => g.type === 'territory')
      .map(g => g.targetId);
    
    const territoryClaims2 = goals2
      .filter(g => g.type === 'territory')
      .map(g => g.targetId);
    
    // Count shared territory claims
    const sharedClaims = territoryClaims1.filter(id => territoryClaims2.includes(id));
    conflictScore += sharedClaims.length * 20; // Each shared territory is a significant conflict
    
    // Check for resource competition
    const resourceGoals1 = goals1.filter(g => g.type === 'resource');
    const resourceGoals2 = goals2.filter(g => g.type === 'resource');
    
    // Check if they're competing for the same scarce resources
    resourceGoals1.forEach(g1 => {
      if (resourceGoals2.some(g2 => g2.targetId === g1.targetId)) {
        conflictScore += 10;
      }
    });
    
    return Math.min(100, conflictScore);
  }

  /**
   * Creates a standardized ID for a relationship between two factions
   */
  private getRelationshipId(factionId1: string, factionId2: string): string {
    // Always sort IDs to ensure consistency regardless of parameter order
    return [factionId1, factionId2].sort().join('_');
  }
}

/**
 * Represents a faction in the game world with its own identity, values, and goals
 */
export class Faction {
  private state: FactionState;
  private values: FactionValue[];
  private goals: FactionGoal[] = [];
  private territories: Map<string, Territory> = new Map();
  private resources: Map<string, Resource> = new Map();
  private members: string[] = []; // NPC IDs that belong to this faction

  constructor(
    public readonly id: string,
    public readonly name: string,
    values: FactionValue[],
    initialState?: Partial<FactionState>
  ) {
    this.values = [...values];
    
    // Set default state values, overridden by any provided values
    this.state = {
      power: 50,
      wealth: 50,
      cohesion: 50,
      reputation: 50,
      influence: 50,
      isolation: 50,
      aggression: 50,
      corruption: 50,
      ...initialState
    };
  }

  /**
   * Gets the faction's current state
   */
  public getState(): FactionState {
    return { ...this.state };
  }

  /**
   * Updates the faction's state
   */
  public updateState(changes: Partial<FactionState>): void {
    // Apply changes with bounds checking
    Object.entries(changes).forEach(([key, value]) => {
      if (value !== undefined) {
        this.state[key as keyof FactionState] = Math.max(0, Math.min(100, value));
      }
    });
  }

  /**
   * Gets the faction's values
   */
  public getValues(): FactionValue[] {
    return [...this.values];
  }

  /**
   * Adds or updates a value for the faction
   */
  public setValue(value: FactionValue): void {
    const index = this.values.findIndex(v => v.type === value.type);
    if (index >= 0) {
      this.values[index] = value;
    } else {
      this.values.push(value);
    }
  }

  /**
   * Gets all current goals of the faction
   */
  public getGoals(): FactionGoal[] {
    return [...this.goals];
  }

  /**
   * Adds a new goal for the faction
   */
  public addGoal(goal: FactionGoal): void {
    this.goals.push(goal);
  }

  /**
   * Removes a goal from the faction
   */
  public removeGoal(goalId: string): boolean {
    const initialLength = this.goals.length;
    this.goals = this.goals.filter(g => g.id !== goalId);
    return this.goals.length < initialLength;
  }

  /**
   * Gets the territories controlled by this faction
   */
  public getTerritories(): Territory[] {
    return Array.from(this.territories.values());
  }

  /**
   * Adds a territory to this faction's control
   */
  public addTerritory(territory: Territory): void {
    this.territories.set(territory.id, territory);
  }

  /**
   * Gets the resources controlled by this faction
   */
  public getResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  /**
   * Adds a resource to this faction's control
   */
  public addResource(resource: Resource): void {
    this.resources.set(resource.id, resource);
  }

  /**
   * Gets all members (NPCs) of this faction
   */
  public getMembers(): string[] {
    return [...this.members];
  }

  /**
   * Adds a member (NPC) to this faction
   */
  public addMember(npcId: string): void {
    if (!this.members.includes(npcId)) {
      this.members.push(npcId);
    }
  }

  /**
   * Removes a member from this faction
   */
  public removeMember(npcId: string): boolean {
    const initialLength = this.members.length;
    this.members = this.members.filter(id => id !== npcId);
    return this.members.length < initialLength;
  }

  /**
   * Processes a global event and potentially takes action based on faction values and goals
   */
  public processGlobalEvent(eventDescription: string): void {
    // This would contain logic to analyze the event and potentially create new goals
    // or adjust faction state based on the event's impact on the faction's values
    
    // For now, it's a simplified placeholder implementation
    if (eventDescription.toLowerCase().includes('war')) {
      this.updateState({ aggression: this.state.aggression + 5 });
    }
    
    if (eventDescription.toLowerCase().includes('peace')) {
      this.updateState({ aggression: this.state.aggression - 5 });
    }
    
    // More advanced implementation would use NLP or pattern matching to extract
    // relevant details from the event description
  }

  /**
   * Allows the faction to take actions on its turn in the simulation
   */
  public takeTurnActions(factionManager: FactionManager): void {
    // Process each goal and take appropriate actions
    this.goals.forEach(goal => {
      switch (goal.type) {
        case 'territory':
          this.pursueTerritory(goal, factionManager);
          break;
        case 'resource':
          this.pursueResource(goal, factionManager);
          break;
        case 'alliance':
          this.pursueAlliance(goal, factionManager);
          break;
        case 'elimination':
          this.pursueElimination(goal, factionManager);
          break;
        // Add more goal types as needed
      }
    });
    
    // Natural state changes over time
    this.applyNaturalStateChanges();
  }

  /**
   * Apply small natural changes to state variables over time
   */
  private applyNaturalStateChanges(): void {
    // Example: Corruption tends to increase slightly if power is high
    if (this.state.power > 70 && this.state.corruption < 90) {
      this.updateState({ corruption: this.state.corruption + 1 });
    }
    
    // More examples of natural state evolution would go here
  }

  /**
   * Pursue a territory conquest or defense goal
   */
  private pursueTerritory(goal: FactionGoal, factionManager: FactionManager): void {
    // Implementation would depend on the specific game mechanics
    // This is a placeholder for the actual implementation
  }

  /**
   * Pursue a resource acquisition goal
   */
  private pursueResource(goal: FactionGoal, factionManager: FactionManager): void {
    // Implementation would depend on the specific game mechanics
    // This is a placeholder for the actual implementation
  }

  /**
   * Pursue an alliance with another faction
   */
  private pursueAlliance(goal: FactionGoal, factionManager: FactionManager): void {
    const targetFaction = factionManager.getFaction(goal.targetId);
    if (!targetFaction) return;
    
    const relationship = factionManager.getRelationship(this.id, goal.targetId);
    
    if (relationship) {
      // If attitude is positive but not allied yet, try to improve relations
      if (relationship.attitude > 50 && relationship.status !== 'allied') {
        factionManager.updateRelationship(
          this.id,
          goal.targetId,
          { 
            attitude: relationship.attitude + 5,
            status: relationship.attitude > 75 ? 'allied' : relationship.status
          },
          'Diplomatic overture to improve relations'
        );
      }
    } else {
      // Create new neutral relationship as a starting point
      factionManager.setRelationship(this.id, goal.targetId, 20, 'neutral');
    }
  }

  /**
   * Pursue elimination or weakening of an enemy faction
   */
  private pursueElimination(goal: FactionGoal, factionManager: FactionManager): void {
    const targetFaction = factionManager.getFaction(goal.targetId);
    if (!targetFaction) return;
    
    const relationship = factionManager.getRelationship(this.id, goal.targetId);
    
    if (relationship) {
      // Make relations worse if not already hostile
      if (relationship.status !== 'hostile') {
        factionManager.updateRelationship(
          this.id,
          goal.targetId,
          { 
            attitude: Math.max(-100, relationship.attitude - 10),
            status: relationship.attitude < -50 ? 'hostile' : relationship.status
          },
          'Taking aggressive stance against enemy'
        );
      }
      
      // If we're already hostile, could plan attacks or sabotage
      if (relationship.status === 'hostile') {
        // Logic for attacks would go here
        // This is a placeholder for the actual implementation
      }
    } else {
      // Create new hostile relationship
      factionManager.setRelationship(this.id, goal.targetId, -50, 'hostile');
    }
  }
} 