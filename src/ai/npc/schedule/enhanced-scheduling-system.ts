/**
 * enhanced-scheduling-system.ts
 * 
 * An advanced scheduling system for NPCs that integrates with faction territories,
 * social dynamics, and behavioral patterns to create realistic daily routines
 * and special events.
 */

import { BehaviorSimulation, NeedType } from '../behavior-simulation';
import { SocialInteractionSystem, SocialInteractionType } from '../social/social-interaction';
import { FactionSystem } from '../../world/faction/faction-system';
import { FactionManager } from '../../world/faction/faction-manager';
import { TerritoryManager } from '../../world/faction/territory-manager';
import { v4 as uuidv4 } from 'uuid';

/**
 * Represents a specific time in the game world
 */
export interface GameTime {
  day: number;
  hour: number;
  minute: number;
  totalMinutes: number;
}

/**
 * Converts total minutes to a structured GameTime object
 */
export function convertToGameTime(totalMinutes: number): GameTime {
  const day = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const hour = Math.floor(remainingMinutes / 60);
  const minute = remainingMinutes % 60;
  
  return { day, hour, minute, totalMinutes };
}

/**
 * Represents a scheduled activity for an NPC
 */
export interface ScheduledActivity {
  id: string;
  npcId: string;
  name: string;
  description: string;
  location: string;
  startTime: number; // in total minutes
  duration: number; // in minutes
  priority: number; // 0-100, higher is more important
  repeating?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'once';
    dayOfWeek?: number; // 0-6, 0 = Sunday
    dayOfMonth?: number; // 1-30
  };
  related?: {
    npcIds?: string[]; // other NPCs involved
    factionId?: string; // related faction
    tags: string[]; // descriptive tags
  };
  needs?: {
    [key in NeedType]?: {
      impact: number; // positive or negative impact on this need
    };
  };
  completed?: boolean;
  socialInteractionType?: SocialInteractionType;
}

/**
 * Represents an event that involves multiple NPCs
 */
export interface ScheduledEvent {
  id: string;
  name: string;
  description: string;
  location: string;
  organizer: string; // NPC or faction ID
  startTime: number;
  duration: number;
  participants: {
    npcId: string;
    role: 'organizer' | 'required' | 'optional';
    confirmed: boolean;
  }[];
  factionIds: string[];
  priority: number;
  repeating?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'once';
    dayOfWeek?: number;
    dayOfMonth?: number;
    month?: number;
  };
  tags: string[];
  public: boolean; // whether the event is known to non-participants
}

/**
 * Configuration options for the Enhanced Scheduling System
 */
export interface EnhancedSchedulingOptions {
  debugMode?: boolean;
  maxConcurrentActivities?: number;
  maxEventsPerDay?: number;
  socialEventProbability?: number; // 0-1, chance for social events to be created
  workHourStart?: number; // hour for work to typically start
  workHourEnd?: number; // hour for work to typically end
  minSleepHours?: number; // minimum hours NPCs should sleep
  travelSpeedMinutesPerRegion?: number; // minutes it takes to travel between adjacent regions
}

/**
 * Default configuration for the Enhanced Scheduling System
 */
const DEFAULT_OPTIONS: EnhancedSchedulingOptions = {
  debugMode: false,
  maxConcurrentActivities: 2,
  maxEventsPerDay: 3,
  socialEventProbability: 0.3,
  workHourStart: 8,
  workHourEnd: 18,
  minSleepHours: 6,
  travelSpeedMinutesPerRegion: 30
};

/**
 * Manages NPC schedules and coordinates activities and events,
 * integrating with the faction system and social dynamics
 */
export class EnhancedSchedulingSystem {
  private gameTime: number = 0; // total minutes elapsed
  private npcActivities: Map<string, ScheduledActivity[]> = new Map();
  private npcLocations: Map<string, string> = new Map();
  private scheduledEvents: Map<string, ScheduledEvent> = new Map();
  private recurringActivities: ScheduledActivity[] = [];
  private recurringEvents: ScheduledEvent[] = [];
  private options: EnhancedSchedulingOptions;
  
  constructor(
    private behaviorSimulation: BehaviorSimulation,
    private socialInteractionSystem: SocialInteractionSystem,
    private factionSystem: FactionSystem,
    private factionManager: FactionManager,
    private territoryManager: TerritoryManager,
    options: Partial<EnhancedSchedulingOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Sets the current game time
   */
  public setGameTime(totalMinutes: number): void {
    this.gameTime = totalMinutes;
    this.processDueActivities();
  }
  
  /**
   * Gets the current game time
   */
  public getGameTime(): GameTime {
    return convertToGameTime(this.gameTime);
  }
  
  /**
   * Registers an NPC with the scheduling system
   */
  public registerNPC(npcId: string, initialLocation: string): void {
    if (!this.npcActivities.has(npcId)) {
      this.npcActivities.set(npcId, []);
      this.npcLocations.set(npcId, initialLocation);
      
      // Create basic recurring activities like sleep
      this.createDefaultActivities(npcId);
    }
  }
  
  /**
   * Creates default recurring activities for an NPC (sleep, meals, etc.)
   */
  private createDefaultActivities(npcId: string): void {
    // Create sleep activity (10 PM to 6 AM)
    const sleepActivity: ScheduledActivity = {
      id: `sleep_${npcId}_${uuidv4()}`,
      npcId,
      name: 'Sleep',
      description: 'Resting for the night',
      location: this.npcLocations.get(npcId) || 'unknown',
      startTime: 22 * 60, // 10 PM
      duration: 8 * 60, // 8 hours
      priority: 90,
      repeating: {
        frequency: 'daily'
      },
      needs: {
        [NeedType.REST]: { impact: 80 }
      },
      tags: ['basic', 'rest']
    };
    
    // Create meal activities
    const breakfastActivity: ScheduledActivity = {
      id: `breakfast_${npcId}_${uuidv4()}`,
      npcId,
      name: 'Breakfast',
      description: 'Morning meal',
      location: this.npcLocations.get(npcId) || 'unknown',
      startTime: 7 * 60, // 7 AM
      duration: 30, // 30 minutes
      priority: 70,
      repeating: {
        frequency: 'daily'
      },
      needs: {
        [NeedType.HUNGER]: { impact: 50 }
      },
      tags: ['basic', 'meal']
    };
    
    const lunchActivity: ScheduledActivity = {
      id: `lunch_${npcId}_${uuidv4()}`,
      npcId,
      name: 'Lunch',
      description: 'Midday meal',
      location: this.npcLocations.get(npcId) || 'unknown',
      startTime: 12 * 60, // 12 PM
      duration: 60, // 60 minutes
      priority: 70,
      repeating: {
        frequency: 'daily'
      },
      needs: {
        [NeedType.HUNGER]: { impact: 60 },
        [NeedType.SOCIAL]: { impact: 20 }
      },
      tags: ['basic', 'meal']
    };
    
    const dinnerActivity: ScheduledActivity = {
      id: `dinner_${npcId}_${uuidv4()}`,
      npcId,
      name: 'Dinner',
      description: 'Evening meal',
      location: this.npcLocations.get(npcId) || 'unknown',
      startTime: 18 * 60, // 6 PM
      duration: 60, // 60 minutes
      priority: 75,
      repeating: {
        frequency: 'daily'
      },
      needs: {
        [NeedType.HUNGER]: { impact: 70 },
        [NeedType.SOCIAL]: { impact: 30 }
      },
      tags: ['basic', 'meal']
    };
    
    this.recurringActivities.push(sleepActivity, breakfastActivity, lunchActivity, dinnerActivity);
  }
  
  /**
   * Schedules a new activity for an NPC
   */
  public scheduleActivity(activity: ScheduledActivity): boolean {
    // Check if NPC is registered
    if (!this.npcActivities.has(activity.npcId)) {
      if (this.options.debugMode) {
        console.warn(`Cannot schedule activity for unregistered NPC: ${activity.npcId}`);
      }
      return false;
    }
    
    // Check for time conflicts
    if (this.hasTimeConflict(activity)) {
      if (this.options.debugMode) {
        console.warn(`Activity scheduling conflict for NPC ${activity.npcId} at time ${activity.startTime}`);
      }
      return false;
    }
    
    // Add to activities list
    const activities = this.npcActivities.get(activity.npcId) || [];
    activities.push(activity);
    this.npcActivities.set(activity.npcId, activities);
    
    // If repeating, add to recurring activities
    if (activity.repeating && activity.repeating.frequency !== 'once') {
      this.recurringActivities.push(activity);
    }
    
    if (this.options.debugMode) {
      console.log(`Scheduled activity for ${activity.npcId}: ${activity.name}`);
    }
    
    return true;
  }
  
  /**
   * Schedules a new event involving multiple NPCs
   */
  public scheduleEvent(event: ScheduledEvent): boolean {
    // Validate event
    if (event.participants.length === 0) {
      if (this.options.debugMode) {
        console.warn(`Cannot schedule event with no participants: ${event.name}`);
      }
      return false;
    }
    
    // Check if the event's location exists
    if (!this.territoryManager.getTerritory(event.location)) {
      if (this.options.debugMode) {
        console.warn(`Cannot schedule event in non-existent location: ${event.location}`);
      }
      return false;
    }
    
    // Create activities for each participant
    let allScheduled = true;
    for (const participant of event.participants) {
      const activity: ScheduledActivity = {
        id: `event_${event.id}_${participant.npcId}`,
        npcId: participant.npcId,
        name: event.name,
        description: event.description,
        location: event.location,
        startTime: event.startTime,
        duration: event.duration,
        priority: participant.role === 'organizer' ? event.priority + 10 : event.priority,
        repeating: event.repeating ? {
          frequency: event.repeating.frequency as any,
          dayOfWeek: event.repeating.dayOfWeek,
          dayOfMonth: event.repeating.dayOfMonth
        } : undefined,
        related: {
          npcIds: event.participants.map(p => p.npcId).filter(id => id !== participant.npcId),
          factionId: event.factionIds.length > 0 ? event.factionIds[0] : undefined,
          tags: [...event.tags, 'event']
        },
        socialInteractionType: SocialInteractionType.SOCIAL_GATHERING
      };
      
      // Try to schedule for this participant
      const success = this.scheduleActivity(activity);
      if (!success && participant.role !== 'optional') {
        allScheduled = false;
      }
    }
    
    if (allScheduled || event.participants.filter(p => p.role !== 'optional').every(p => p.confirmed)) {
      this.scheduledEvents.set(event.id, event);
      
      // If repeating, add to recurring events
      if (event.repeating && event.repeating.frequency !== 'once') {
        this.recurringEvents.push(event);
      }
      
      if (this.options.debugMode) {
        console.log(`Scheduled event: ${event.name} with ${event.participants.length} participants`);
      }
      
      return true;
    }
    
    // If we couldn't schedule for required participants, cancel the event
    if (this.options.debugMode) {
      console.warn(`Failed to schedule event: ${event.name} due to conflicts with required participants`);
    }
    
    // Remove any activities we did manage to schedule
    for (const participant of event.participants) {
      const activities = this.npcActivities.get(participant.npcId) || [];
      const filteredActivities = activities.filter(a => a.id !== `event_${event.id}_${participant.npcId}`);
      this.npcActivities.set(participant.npcId, filteredActivities);
    }
    
    return false;
  }
  
  /**
   * Checks if an activity conflicts with existing activities
   */
  private hasTimeConflict(activity: ScheduledActivity): boolean {
    const activities = this.npcActivities.get(activity.npcId) || [];
    const activityEnd = activity.startTime + activity.duration;
    
    // Check for time overlap with existing activities
    for (const existing of activities) {
      const existingEnd = existing.startTime + existing.duration;
      
      // If either activity starts during the other one
      if ((activity.startTime >= existing.startTime && activity.startTime < existingEnd) ||
          (existing.startTime >= activity.startTime && existing.startTime < activityEnd)) {
        
        // If the new activity has higher priority, we'll replace the existing one
        if (activity.priority > existing.priority) {
          this.cancelActivity(existing.id);
          return false;
        }
        
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Cancels a scheduled activity
   */
  public cancelActivity(activityId: string): boolean {
    let found = false;
    
    // Search through all NPCs' activities
    for (const [npcId, activities] of this.npcActivities.entries()) {
      const updatedActivities = activities.filter(a => {
        if (a.id === activityId) {
          found = true;
          return false;
        }
        return true;
      });
      
      this.npcActivities.set(npcId, updatedActivities);
    }
    
    // Also remove from recurring if it's there
    this.recurringActivities = this.recurringActivities.filter(a => a.id !== activityId);
    
    return found;
  }
  
  /**
   * Cancels a scheduled event
   */
  public cancelEvent(eventId: string): boolean {
    const event = this.scheduledEvents.get(eventId);
    if (!event) {
      return false;
    }
    
    // Cancel all related activities
    for (const participant of event.participants) {
      this.cancelActivity(`event_${eventId}_${participant.npcId}`);
    }
    
    // Remove from events and recurring events
    this.scheduledEvents.delete(eventId);
    this.recurringEvents = this.recurringEvents.filter(e => e.id !== eventId);
    
    return true;
  }
  
  /**
   * Gets all activities for an NPC
   */
  public getNPCActivities(npcId: string): ScheduledActivity[] {
    return this.npcActivities.get(npcId) || [];
  }
  
  /**
   * Gets an NPC's current activity
   */
  public getCurrentActivity(npcId: string): ScheduledActivity | null {
    const activities = this.npcActivities.get(npcId) || [];
    
    // Find activities that are currently active
    const currentActivities = activities.filter(a => {
      const isTimeMatch = a.startTime <= this.gameTime && (a.startTime + a.duration) > this.gameTime;
      const isActiveDay = true; // Simplified - in a full implementation we'd check if it's the right day for recurring activities
      
      return isTimeMatch && isActiveDay;
    });
    
    // Return the highest priority one
    if (currentActivities.length > 0) {
      return currentActivities.sort((a, b) => b.priority - a.priority)[0];
    }
    
    return null;
  }
  
  /**
   * Gets an NPC's current location
   */
  public getNPCLocation(npcId: string): string {
    return this.npcLocations.get(npcId) || 'unknown';
  }
  
  /**
   * Updates an NPC's location
   */
  public updateNPCLocation(npcId: string, location: string): void {
    this.npcLocations.set(npcId, location);
    this.behaviorSimulation.updateLocation(npcId, location);
  }
  
  /**
   * Creates a faction-based event
   */
  public createFactionEvent(
    factionId: string,
    name: string,
    description: string,
    location: string,
    startTime: number,
    duration: number,
    priority: number = 50,
    requiredRoles: string[] = ['leader'],
    optionalRoles: string[] = [],
    tags: string[] = []
  ): string | null {
    // Get faction members
    const members = this.factionManager.getFactionMembers(factionId);
    if (!members || members.length === 0) {
      return null;
    }
    
    // Organize participants by role
    const participants: ScheduledEvent['participants'] = [];
    
    // Add required role members
    for (const role of requiredRoles) {
      const matchingMembers = members.filter(m => m.role === role);
      for (const member of matchingMembers) {
        participants.push({
          npcId: member.id,
          role: role === 'leader' ? 'organizer' : 'required',
          confirmed: false
        });
      }
    }
    
    // Add optional role members
    for (const role of optionalRoles) {
      const matchingMembers = members.filter(m => m.role === role);
      for (const member of matchingMembers) {
        participants.push({
          npcId: member.id,
          role: 'optional',
          confirmed: false
        });
      }
    }
    
    if (participants.length === 0) {
      return null;
    }
    
    // Create the event
    const eventId = `faction_event_${uuidv4()}`;
    const event: ScheduledEvent = {
      id: eventId,
      name,
      description,
      location,
      organizer: factionId,
      startTime,
      duration,
      participants,
      factionIds: [factionId],
      priority,
      tags: [...tags, 'faction'],
      public: true
    };
    
    const scheduled = this.scheduleEvent(event);
    return scheduled ? eventId : null;
  }
  
  /**
   * Creates a social event between NPCs who have positive relationships
   */
  public createSocialEvent(
    organizerNpcId: string,
    name: string,
    description: string,
    startTime: number,
    duration: number
  ): string | null {
    // Get the organizer's location
    const location = this.getNPCLocation(organizerNpcId);
    if (!location || location === 'unknown') {
      return null;
    }
    
    // Find NPCs with positive relationships to the organizer
    const relationships = this.socialInteractionSystem.getRelationships(organizerNpcId);
    const participants: ScheduledEvent['participants'] = [{
      npcId: organizerNpcId,
      role: 'organizer',
      confirmed: true
    }];
    
    // Add NPCs with positive relationships who are in the same or adjacent territories
    for (const [npcId, relationshipValue] of relationships) {
      if (relationshipValue >= 40) { // Only invite NPCs with reasonably positive relationships
        const npcLocation = this.getNPCLocation(npcId);
        
        if (npcLocation === location || this.territoryManager.getConnectedTerritories(location).includes(npcLocation)) {
          participants.push({
            npcId,
            role: 'optional',
            confirmed: false
          });
          
          // Limit to a reasonable number of participants
          if (participants.length >= 8) {
            break;
          }
        }
      }
    }
    
    if (participants.length <= 1) {
      return null; // No other participants
    }
    
    // Determine faction associations
    const npcFactions = new Map<string, string>();
    for (const participant of participants) {
      const factionMemberships = this.factionManager.getNPCFactionMemberships(participant.npcId);
      if (factionMemberships && factionMemberships.length > 0) {
        npcFactions.set(participant.npcId, factionMemberships[0].factionId);
      }
    }
    
    // Count faction representation
    const factionCounts = new Map<string, number>();
    for (const factionId of npcFactions.values()) {
      factionCounts.set(factionId, (factionCounts.get(factionId) || 0) + 1);
    }
    
    // Sort factions by representation
    const factionIds = Array.from(factionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    // Create the event
    const eventId = `social_event_${uuidv4()}`;
    const event: ScheduledEvent = {
      id: eventId,
      name,
      description,
      location,
      organizer: organizerNpcId,
      startTime,
      duration,
      participants,
      factionIds,
      priority: 60, // Medium-high priority for social events
      tags: ['social', 'gathering'],
      public: true
    };
    
    const scheduled = this.scheduleEvent(event);
    return scheduled ? eventId : null;
  }
  
  /**
   * Processes scheduled activities due at the current game time
   */
  private processDueActivities(): void {
    const gameTimeObj = this.getGameTime();
    
    // Process recurring activities (daily/weekly/monthly)
    this.generateRecurringInstancesForDay(gameTimeObj.day);
    
    // Update all NPCs with their current activities
    for (const [npcId, activities] of this.npcActivities.entries()) {
      const currentActivity = this.getCurrentActivity(npcId);
      
      if (currentActivity) {
        // Update NPC location to match activity location if needed
        const currentLocation = this.getNPCLocation(npcId);
        if (currentLocation !== currentActivity.location) {
          this.updateNPCLocation(npcId, currentActivity.location);
          
          if (this.options.debugMode) {
            console.log(`NPC ${npcId} moved to ${currentActivity.location} for activity: ${currentActivity.name}`);
          }
        }
        
        // Process social interactions for activities with other NPCs
        if (currentActivity.related?.npcIds && currentActivity.related.npcIds.length > 0) {
          this.processSocialInteraction(currentActivity);
        }
        
        // Update NPC needs based on activity
        if (currentActivity.needs) {
          this.updateNPCNeeds(npcId, currentActivity);
        }
      }
    }
  }
  
  /**
   * Generates instances of recurring activities and events for a specific day
   */
  private generateRecurringInstancesForDay(day: number): void {
    // Process only if we haven't already processed this day
    const dayStart = day * 24 * 60;
    const dayEnd = (day + 1) * 24 * 60;
    
    // Generate instances from recurring activities
    for (const template of this.recurringActivities) {
      // Skip if a matching activity already exists for this day
      const existingActivities = this.npcActivities.get(template.npcId) || [];
      const alreadyScheduled = existingActivities.some(a => 
        a.name === template.name && 
        a.startTime >= dayStart && 
        a.startTime < dayEnd
      );
      
      if (!alreadyScheduled) {
        const dayOffset = template.repeating?.frequency === 'daily' ? 0 : (day % 7);
        const startTimeForDay = dayStart + (template.startTime % (24 * 60));
        
        // Weekly activities check for day match
        if (template.repeating?.frequency !== 'weekly' || template.repeating?.dayOfWeek === dayOffset) {
          const activity: ScheduledActivity = {
            ...template,
            id: `${template.id}_day${day}`,
            startTime: startTimeForDay
          };
          
          this.scheduleActivity(activity);
        }
      }
    }
    
    // Generate instances from recurring events
    for (const template of this.recurringEvents) {
      const eventExists = Array.from(this.scheduledEvents.values()).some(e => 
        e.name === template.name && 
        e.startTime >= dayStart && 
        e.startTime < dayEnd
      );
      
      if (!eventExists) {
        const dayOffset = template.repeating?.frequency === 'daily' ? 0 : (day % 7);
        const startTimeForDay = dayStart + (template.startTime % (24 * 60));
        
        // Weekly events check for day match
        if (template.repeating?.frequency !== 'weekly' || template.repeating?.dayOfWeek === dayOffset) {
          const event: ScheduledEvent = {
            ...template,
            id: `${template.id}_day${day}`,
            startTime: startTimeForDay
          };
          
          this.scheduleEvent(event);
        }
      }
    }
    
    // Create spontaneous social events with some probability
    if (Math.random() < this.options.socialEventProbability!) {
      this.generateSpontaneousSocialEvent(day);
    }
  }
  
  /**
   * Creates a spontaneous social event for the current day
   */
  private generateSpontaneousSocialEvent(day: number): void {
    // Pick a random NPC to be the organizer
    const allNpcs = Array.from(this.npcActivities.keys());
    if (allNpcs.length <= 1) {
      return;
    }
    
    const organizerNpcId = allNpcs[Math.floor(Math.random() * allNpcs.length)];
    
    // Determine the event time (evening, after work hours)
    const dayStart = day * 24 * 60;
    const eveningStart = dayStart + (this.options.workHourEnd! + 1) * 60;
    const duration = 120 + Math.floor(Math.random() * 60); // 2-3 hours
    
    // Generate event name and description
    const eventTypes = ['gathering', 'dinner', 'drinks', 'meeting', 'celebration'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    const name = `Informal ${eventType}`;
    const description = `A social ${eventType} organized by ${organizerNpcId}`;
    
    // Create the social event
    this.createSocialEvent(
      organizerNpcId,
      name,
      description,
      eveningStart,
      duration
    );
  }
  
  /**
   * Processes social interactions for activities with multiple NPCs
   */
  private processSocialInteraction(activity: ScheduledActivity): void {
    if (!activity.related?.npcIds || activity.related.npcIds.length === 0) {
      return;
    }
    
    // Only create interactions periodically, not every time this is called
    if (Math.random() > 0.3) {
      return;
    }
    
    const primaryNpcId = activity.npcId;
    
    // Check if all involved NPCs are at the same location
    for (const secondaryNpcId of activity.related.npcIds) {
      const secondaryLocation = this.getNPCLocation(secondaryNpcId);
      
      if (secondaryLocation === activity.location) {
        // Determine interaction type based on activity or default to socializing
        const interactionType = activity.socialInteractionType || SocialInteractionType.SOCIALIZING;
        
        // Create a social interaction between these NPCs
        this.socialInteractionSystem.createInteraction(
          primaryNpcId,
          secondaryNpcId,
          interactionType,
          activity.location
        );
        
        if (this.options.debugMode) {
          console.log(`Created social interaction between ${primaryNpcId} and ${secondaryNpcId} at ${activity.location}`);
        }
      }
    }
  }
  
  /**
   * Updates NPC needs based on activity
   */
  private updateNPCNeeds(npcId: string, activity: ScheduledActivity): void {
    if (!activity.needs) {
      return;
    }
    
    // Apply need changes to the NPC
    for (const [needType, impact] of Object.entries(activity.needs)) {
      this.behaviorSimulation.modifyNeed(npcId, needType as NeedType, impact.impact);
      
      if (this.options.debugMode) {
        console.log(`Modified ${npcId}'s ${needType} by ${impact.impact} from activity ${activity.name}`);
      }
    }
  }
  
  /**
   * Creates faction-based scheduled work for NPCs based on their faction roles
   */
  public scheduleFactionWork(factionId: string): void {
    const members = this.factionManager.getFactionMembers(factionId);
    if (!members || members.length === 0) {
      return;
    }
    
    const faction = this.factionManager.getFaction(factionId);
    if (!faction) {
      return;
    }
    
    // Get faction territories
    const territories = faction.territories || [];
    if (territories.length === 0) {
      return;
    }
    
    // Determine primary work location (usually first territory)
    const primaryLocation = territories[0];
    
    // Create work schedules based on NPC roles
    for (const member of members) {
      let workName = 'Regular duties';
      let workDescription = 'Performing regular faction duties';
      let workLocation = primaryLocation;
      let workDuration = 8 * 60; // 8 hours
      let workPriority = 60;
      
      // Customize based on role
      switch (member.role) {
        case 'leader':
          workName = 'Leadership duties';
          workDescription = `Leading the ${faction.name}`;
          workPriority = 80;
          break;
        case 'treasurer':
          workName = 'Financial management';
          workDescription = `Managing finances for the ${faction.name}`;
          workPriority = 75;
          break;
        case 'guard':
          workName = 'Guard duty';
          workDescription = `Protecting ${faction.name} interests`;
          workPriority = 70;
          // Guards might rotate through territories
          if (territories.length > 1) {
            workLocation = territories[Math.floor(Math.random() * territories.length)];
          }
          break;
        default:
          // Standard work schedule
          break;
      }
      
      // Create recurring work activity
      const workActivity: ScheduledActivity = {
        id: `work_${member.id}_${uuidv4()}`,
        npcId: member.id,
        name: workName,
        description: workDescription,
        location: workLocation,
        startTime: this.options.workHourStart! * 60, // Start at work hour start
        duration: workDuration,
        priority: workPriority,
        repeating: {
          frequency: 'daily'
        },
        related: {
          factionId,
          npcIds: [], // Will be populated with colleagues at same location
          tags: ['work', 'faction', 'duty']
        },
        needs: {
          [NeedType.MONEY]: { impact: 30 },
          [NeedType.RESPECT]: { impact: 20 },
          [NeedType.REST]: { impact: -10 }
        }
      };
      
      // Schedule the activity
      this.scheduleActivity(workActivity);
    }
    
    // Update related NPCs for work activities at same locations
    for (const [npcId, activities] of this.npcActivities.entries()) {
      const workActivities = activities.filter(a => 
        a.name.includes('duties') || 
        a.name.includes('management') || 
        a.name.includes('Guard duty')
      );
      
      for (const workActivity of workActivities) {
        if (workActivity.related?.factionId === factionId) {
          // Find other NPCs working at same location
          const colleagueIds = members
            .filter(m => m.id !== npcId)
            .filter(m => {
              const memberActivities = this.npcActivities.get(m.id) || [];
              return memberActivities.some(a => 
                a.location === workActivity.location && 
                a.startTime === workActivity.startTime
              );
            })
            .map(m => m.id);
          
          // Update related NPCs
          workActivity.related!.npcIds = colleagueIds;
        }
      }
    }
  }
  
  /**
   * Creates a faction meeting event
   */
  public scheduleFactionMeeting(
    factionId: string,
    name: string = 'Faction Meeting',
    description: string = 'Regular meeting of faction members',
    day: number = this.getGameTime().day,
    hour: number = 16, // 4 PM default
    duration: number = 120 // 2 hours default
  ): string | null {
    const faction = this.factionManager.getFaction(factionId);
    if (!faction) {
      return null;
    }
    
    // Get primary territory
    const location = faction.territories && faction.territories.length > 0 
      ? faction.territories[0] 
      : 'unknown';
      
    if (location === 'unknown') {
      return null;
    }
    
    // Calculate start time
    const startTime = (day * 24 * 60) + (hour * 60);
    
    // Create the faction event
    return this.createFactionEvent(
      factionId,
      name,
      description,
      location,
      startTime,
      duration,
      70, // Higher priority
      ['leader', 'treasurer'], // Required roles
      ['member', 'guard'], // Optional roles
      ['meeting', 'official']
    );
  }
  
  /**
   * Updates the scheduling system
   */
  public updateSystem(currentGameTime: number): void {
    this.setGameTime(currentGameTime);
    
    // Process any newly active schedules
    this.processDueActivities();
    
    // Process faction-related scheduling if needed
    // This would be done periodically, not every update
    if (currentGameTime % (24 * 60) === 0) { // At the start of each day
      // Schedule faction work for all factions
      for (const factionId of this.factionManager.getAllFactionIds()) {
        this.scheduleFactionWork(factionId);
        
        // 50% chance to schedule a faction meeting
        if (Math.random() > 0.5) {
          this.scheduleFactionMeeting(
            factionId,
            'Weekly Planning Meeting',
            `Weekly planning meeting for ${this.factionManager.getFaction(factionId)?.name || 'the faction'}`,
            this.getGameTime().day + Math.floor(Math.random() * 7) // Schedule in next 7 days
          );
        }
      }
    }
  }
} 