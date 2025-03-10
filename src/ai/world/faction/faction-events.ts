import { v4 as uuidv4 } from 'uuid';
import { Faction, FactionRelationship } from './faction-types';
import { FactionManager } from './faction-manager';

/**
 * Type definitions for events in the faction system
 */

export type EventImpactType = 'state' | 'relationship' | 'goal' | 'value' | 'territory' | 'resource';

export interface EventImpact {
  type: EventImpactType;
  targetId: string;
  changes: Record<string, number | boolean | string>;
  description: string;
}

export interface FactionEvent {
  id: string;
  name: string;
  description: string;
  timestamp: number;
  affectedFactions: string[];
  impacts: EventImpact[];
  resolved: boolean;
  metadata?: Record<string, any>;
}

/**
 * Manages world events that affect factions
 */
export class FactionEventSystem {
  private events: Map<string, FactionEvent> = new Map();
  private factionManager: FactionManager;
  
  constructor(factionManager: FactionManager) {
    this.factionManager = factionManager;
  }
  
  /**
   * Creates a new event affecting factions
   */
  public createEvent(
    name: string,
    description: string,
    affectedFactions: string[],
    impacts: EventImpact[],
    metadata?: Record<string, any>
  ): FactionEvent {
    const id = uuidv4();
    
    const event: FactionEvent = {
      id,
      name,
      description,
      timestamp: Date.now(),
      affectedFactions,
      impacts,
      resolved: false,
      metadata
    };
    
    this.events.set(id, event);
    return event;
  }
  
  /**
   * Gets an event by ID
   */
  public getEvent(id: string): FactionEvent | undefined {
    return this.events.get(id);
  }
  
  /**
   * Gets all events
   */
  public getAllEvents(): FactionEvent[] {
    return Array.from(this.events.values());
  }
  
  /**
   * Gets events affecting a specific faction
   */
  public getEventsByFaction(factionId: string): FactionEvent[] {
    return Array.from(this.events.values())
      .filter(event => event.affectedFactions.includes(factionId));
  }
  
  /**
   * Gets unresolved events
   */
  public getUnresolvedEvents(): FactionEvent[] {
    return Array.from(this.events.values())
      .filter(event => !event.resolved);
  }
  
  /**
   * Resolves an event by applying its impacts to affected factions
   */
  public resolveEvent(eventId: string): boolean {
    const event = this.events.get(eventId);
    if (!event || event.resolved) {
      return false;
    }
    
    // Apply impacts
    for (const impact of event.impacts) {
      this.applyEventImpact(impact, event);
    }
    
    // Mark as resolved
    event.resolved = true;
    this.events.set(eventId, event);
    
    // Notify factions about the event
    for (const factionId of event.affectedFactions) {
      const faction = this.factionManager.getFaction(factionId);
      if (faction) {
        faction.processGlobalEvent(event.description);
      }
    }
    
    return true;
  }
  
  /**
   * Applies a single event impact
   */
  private applyEventImpact(impact: EventImpact, event: FactionEvent): void {
    switch (impact.type) {
      case 'state':
        this.applyStateImpact(impact, event);
        break;
      case 'relationship':
        this.applyRelationshipImpact(impact, event);
        break;
      case 'goal':
        this.applyGoalImpact(impact, event);
        break;
      case 'value':
        this.applyValueImpact(impact, event);
        break;
      case 'territory':
        this.applyTerritoryImpact(impact, event);
        break;
      case 'resource':
        this.applyResourceImpact(impact, event);
        break;
    }
  }
  
  /**
   * Applies impacts to faction state
   */
  private applyStateImpact(impact: EventImpact, event: FactionEvent): void {
    const faction = this.factionManager.getFaction(impact.targetId);
    if (!faction) return;
    
    const stateChanges: Record<string, number> = {};
    
    for (const [key, value] of Object.entries(impact.changes)) {
      if (typeof value === 'number') {
        stateChanges[key] = value;
      }
    }
    
    if (Object.keys(stateChanges).length > 0) {
      faction.updateState(stateChanges);
    }
  }
  
  /**
   * Applies impacts to faction relationships
   */
  private applyRelationshipImpact(impact: EventImpact, event: FactionEvent): void {
    // Format of targetId: "faction1Id:faction2Id"
    const [factionId1, factionId2] = impact.targetId.split(':');
    if (!factionId1 || !factionId2) return;
    
    const attitudeChange = impact.changes.attitudeChange as number;
    if (typeof attitudeChange === 'number') {
      const relationship = this.factionManager.getRelationship(factionId1, factionId2);
      if (relationship) {
        this.factionManager.updateRelationship(
          factionId1,
          factionId2,
          { attitude: relationship.attitude + attitudeChange },
          event.description
        );
      } else {
        // Create new relationship if it doesn't exist
        this.factionManager.setRelationship(
          factionId1,
          factionId2,
          attitudeChange,
          'neutral'
        );
      }
    }
  }
  
  /**
   * Applies impacts to faction goals
   */
  private applyGoalImpact(impact: EventImpact, event: FactionEvent): void {
    const faction = this.factionManager.getFaction(impact.targetId.split(':')[0]);
    if (!faction) return;
    
    const goalId = impact.targetId.split(':')[1];
    const progressChange = impact.changes.progress as number;
    
    if (goalId && typeof progressChange === 'number') {
      const goals = faction.getGoals();
      const goal = goals.find(g => g.id === goalId);
      
      if (goal) {
        const updatedGoal = {
          ...goal,
          progress: Math.max(0, Math.min(100, goal.progress + progressChange))
        };
        
        faction.removeGoal(goalId);
        faction.addGoal(updatedGoal);
      }
    }
  }
  
  /**
   * Applies impacts to faction values
   */
  private applyValueImpact(impact: EventImpact, event: FactionEvent): void {
    const faction = this.factionManager.getFaction(impact.targetId.split(':')[0]);
    if (!faction) return;
    
    const valueType = impact.targetId.split(':')[1];
    const strengthChange = impact.changes.strength as number;
    
    if (valueType && typeof strengthChange === 'number') {
      const values = faction.getValues();
      const value = values.find(v => v.type === valueType);
      
      if (value) {
        const updatedValue = {
          ...value,
          strength: Math.max(-100, Math.min(100, value.strength + strengthChange))
        };
        
        faction.setValue(updatedValue);
      }
    }
  }
  
  /**
   * Applies impacts to territories
   */
  private applyTerritoryImpact(impact: EventImpact, event: FactionEvent): void {
    // This would need to integrate with the TerritoryManager
    // Implementation depends on how territories are managed
    console.log(`Territory impact applied: ${impact.description}`);
  }
  
  /**
   * Applies impacts to resources
   */
  private applyResourceImpact(impact: EventImpact, event: FactionEvent): void {
    // This would need to integrate with the ResourceManager
    // Implementation depends on how resources are managed
    console.log(`Resource impact applied: ${impact.description}`);
  }
  
  /**
   * Generates a random event based on the current world state
   */
  public generateRandomEvent(): FactionEvent | null {
    // Implementation for procedural event generation
    // This would ideally take into account faction relationships, territories, etc.
    // Simplified version as a placeholder
    
    const factions = this.factionManager.getAllFactions();
    if (factions.length < 2) return null;
    
    // Pick random factions to be affected
    const affectedIndices = this.getRandomIndices(factions.length, 
      Math.min(factions.length, 1 + Math.floor(Math.random() * 3)));
    
    const affectedFactions = affectedIndices.map(i => factions[i].id);
    
    // Create random event type
    const eventTypes = [
      'natural_disaster', 'economic_shift', 'political_upheaval', 
      'discovery', 'external_threat', 'cultural_event'
    ];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    // Build event details based on type
    let name, description;
    const impacts: EventImpact[] = [];
    
    switch (eventType) {
      case 'natural_disaster':
        name = 'Natural Disaster';
        description = `A natural disaster has struck the region, affecting ${affectedFactions.length} factions.`;
        // Add impacts to affected factions
        for (const factionId of affectedFactions) {
          impacts.push({
            type: 'state',
            targetId: factionId,
            changes: { wealth: -10, cohesion: 5 },
            description: 'Reduced wealth, increased cohesion as people unite in recovery'
          });
        }
        break;
        
      // Add more event types here
      default:
        name = 'Unexpected Event';
        description = `An unexpected event has occurred affecting ${affectedFactions.length} factions.`;
        for (const factionId of affectedFactions) {
          impacts.push({
            type: 'state',
            targetId: factionId,
            changes: { reputation: 5 },
            description: 'Minor reputation change due to event response'
          });
        }
    }
    
    return this.createEvent(name, description, affectedFactions, impacts);
  }
  
  /**
   * Helper function to get random indices for array selection
   */
  private getRandomIndices(max: number, count: number): number[] {
    const indices: number[] = [];
    while (indices.length < count) {
      const randomIndex = Math.floor(Math.random() * max);
      if (!indices.includes(randomIndex)) {
        indices.push(randomIndex);
      }
    }
    return indices;
  }
} 