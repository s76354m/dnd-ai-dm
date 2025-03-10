/**
 * NPC Scheduler
 * 
 * Manages NPC schedules, tracking their daily routines and updating
 * their locations based on time of day. This creates a more dynamic world
 * where NPCs move around and perform different activities.
 */

import { NPC, NPCSchedule, ScheduleEntry } from '../../core/interfaces/npc';
import { NPCManager } from './npc-manager';
import { WorldManager } from '../../world/manager';
import { WORLD_CONFIG } from '../../world/index';
import { createDefaultSchedule, getScheduleForNPCType } from './default-schedules';
import { v4 as uuidv4 } from 'uuid';

export interface ScheduleUpdateResult {
  npcId: string;
  npcName: string;
  oldLocationId: string;
  newLocationId: string;
  activity: string;
  changed: boolean;
}

/**
 * Manages the scheduling system for NPCs, updating their locations and
 * activities based on the time of day
 */
export class NPCScheduler {
  private npcManager: NPCManager;
  private worldManager: WorldManager;
  private lastUpdateTime: number = 0; // Last time NPCs were updated (in game minutes)
  private activeNPCs: Set<string> = new Set(); // NPCs that are actively managed by the scheduler
  
  constructor(npcManager: NPCManager, worldManager: WorldManager) {
    this.npcManager = npcManager;
    this.worldManager = worldManager;
  }
  
  /**
   * Initialize an NPC with a schedule
   * @param npc The NPC to initialize
   * @param forcedLocations Optional map of location IDs that the NPC must visit in their schedule
   */
  public initializeNPCSchedule(npc: NPC, forcedLocations?: Map<number, string>): NPCSchedule {
    // If NPC already has a schedule, return it
    if (npc.schedule) {
      this.activeNPCs.add(npc.id);
      return npc.schedule;
    }
    
    // Create a default schedule based on NPC type/occupation
    let schedule: NPCSchedule;
    
    if (npc.occupation) {
      schedule = getScheduleForNPCType(npc.occupation, npc.location);
    } else {
      schedule = createDefaultSchedule(npc.location);
    }
    
    // Apply any forced locations
    if (forcedLocations) {
      for (const [hour, locationId] of forcedLocations.entries()) {
        // Find the schedule entry that covers this hour or create a new one
        const existingEntry = schedule.locations.find(
          loc => loc.startHour <= hour && loc.endHour > hour
        );
        
        if (existingEntry) {
          // Split the existing entry if needed
          if (existingEntry.startHour < hour) {
            // Create a new entry for the time before the forced location
            schedule.locations.push({
              locationId: existingEntry.locationId,
              startHour: existingEntry.startHour,
              endHour: hour,
              activity: existingEntry.activity
            });
          }
          
          if (existingEntry.endHour > hour + 1) {
            // Create a new entry for the time after the forced location
            schedule.locations.push({
              locationId: existingEntry.locationId,
              startHour: hour + 1,
              endHour: existingEntry.endHour,
              activity: existingEntry.activity
            });
          }
          
          // Update the existing entry to the forced location
          existingEntry.locationId = locationId;
          existingEntry.startHour = hour;
          existingEntry.endHour = hour + 1;
          existingEntry.activity = 'Special appointment';
        } else {
          // Just add a new entry
          schedule.locations.push({
            locationId,
            startHour: hour,
            endHour: hour + 1,
            activity: 'Special appointment'
          });
        }
      }
      
      // Sort the schedule by start hour
      schedule.locations.sort((a, b) => a.startHour - b.startHour);
    }
    
    // Update the NPC with the new schedule
    npc.schedule = schedule;
    this.activeNPCs.add(npc.id);
    
    return schedule;
  }
  
  /**
   * Update all NPC locations based on the current game time
   * @param currentTime The current game time in minutes
   * @returns A list of NPCs that changed locations
   */
  public updateNPCLocations(currentTime: number): ScheduleUpdateResult[] {
    const results: ScheduleUpdateResult[] = [];
    
    // Skip if there hasn't been a meaningful time change
    if (Math.abs(currentTime - this.lastUpdateTime) < 10) {
      return results;
    }
    
    // Update the last update time
    this.lastUpdateTime = currentTime;
    
    // Convert to hour of the day
    const hour = Math.floor(currentTime / WORLD_CONFIG.MINUTES_PER_HOUR) % WORLD_CONFIG.HOURS_PER_DAY;
    const dayOfWeek = Math.floor(currentTime / (WORLD_CONFIG.MINUTES_PER_HOUR * WORLD_CONFIG.HOURS_PER_DAY)) % 7;
    
    // Get all NPCs
    const npcs = this.npcManager.getAllNPCs();
    
    // Update each NPC's location based on their schedule
    for (const npc of npcs) {
      // Skip NPCs without schedules or that aren't actively managed
      if (!npc.schedule || !this.activeNPCs.has(npc.id)) {
        continue;
      }
      
      // Check if there's a weekly override for this day
      let locationId = npc.location;
      let activity = 'Resting';
      let changed = false;
      
      if (npc.schedule.weeklyOverrides && npc.schedule.weeklyOverrides.has(dayOfWeek)) {
        // Use the overridden location for this day
        const newLocationId = npc.schedule.weeklyOverrides.get(dayOfWeek);
        if (newLocationId && newLocationId !== npc.location) {
          locationId = newLocationId;
          activity = 'Special weekly activity';
          changed = true;
        }
      } else {
        // Find the scheduled location for this hour
        const scheduleEntry = npc.schedule.locations.find(
          loc => loc.startHour <= hour && loc.endHour > hour
        );
        
        if (scheduleEntry && scheduleEntry.locationId !== npc.location) {
          locationId = scheduleEntry.locationId;
          activity = scheduleEntry.activity;
          changed = true;
        }
      }
      
      // If the location changed, update the NPC
      if (changed) {
        const oldLocationId = npc.location;
        this.npcManager.updateNPCLocation(npc.id, locationId);
        
        // Also update the NPC's current activity
        npc.currentActivity = activity;
        
        results.push({
          npcId: npc.id,
          npcName: npc.name,
          oldLocationId,
          newLocationId: locationId,
          activity,
          changed: true
        });
      }
    }
    
    return results;
  }
  
  /**
   * Get the current activity for an NPC
   * @param npcId The NPC's ID
   * @param currentTime The current game time in minutes
   * @returns The current activity or undefined if none found
   */
  public getCurrentActivity(npcId: string, currentTime: number): ScheduleEntry | undefined {
    const npc = this.npcManager.getNPC(npcId);
    if (!npc || !npc.schedule) {
      return undefined;
    }
    
    // Check for special appointments first
    if (npc.specialAppointments && npc.specialAppointments.length > 0) {
      for (const appointment of npc.specialAppointments) {
        if (currentTime >= appointment.startTime && 
            (appointment.endTime === undefined || currentTime < appointment.endTime)) {
          return appointment;
        }
      }
    }
    
    // Convert to hour of the day
    const hour = Math.floor(currentTime / WORLD_CONFIG.MINUTES_PER_HOUR) % WORLD_CONFIG.HOURS_PER_DAY;
    const dayOfWeek = Math.floor(currentTime / (WORLD_CONFIG.MINUTES_PER_HOUR * WORLD_CONFIG.HOURS_PER_DAY)) % 7;
    
    // Check for weekly overrides
    if (npc.schedule.weeklyOverrides && npc.schedule.weeklyOverrides.has(dayOfWeek)) {
      const locationId = npc.schedule.weeklyOverrides.get(dayOfWeek)!;
      return {
        id: `weekly-${dayOfWeek}`,
        location: locationId,
        activity: 'Special weekly activity',
        startTime: 0, // Start of day
        endTime: WORLD_CONFIG.MINUTES_PER_DAY // End of day
      };
    }
    
    // Find the schedule entry for the current hour
    const scheduleEntry = npc.schedule.locations.find(
      loc => loc.startHour <= hour && loc.endHour > hour
    );
    
    if (scheduleEntry) {
      return {
        location: scheduleEntry.locationId,
        activity: scheduleEntry.activity,
        startTime: scheduleEntry.startHour * WORLD_CONFIG.MINUTES_PER_HOUR,
        endTime: scheduleEntry.endHour * WORLD_CONFIG.MINUTES_PER_HOUR
      };
    }
    
    // If no schedule found for this hour, return a default resting activity
    return {
      location: npc.location,
      activity: 'Resting',
      startTime: hour * WORLD_CONFIG.MINUTES_PER_HOUR,
      endTime: (hour + 1) * WORLD_CONFIG.MINUTES_PER_HOUR
    };
  }
  
  /**
   * Add a special appointment to an NPC's schedule
   * @param npcId The ID of the NPC
   * @param hour The hour of the appointment (0-23)
   * @param locationId The location ID for the appointment
   * @param activity The activity description
   */
  public addSpecialAppointment(npcId: string, hour: number, locationId: string, activity: string): boolean {
    const npc = this.npcManager.getNPC(npcId);
    if (!npc) {
      return false;
    }
    
    // Initialize the schedule if it doesn't exist
    if (!npc.schedule) {
      this.initializeNPCSchedule(npc);
    }
    
    // Find any existing schedule entry for this time
    const existingIndex = npc.schedule!.locations.findIndex(
      loc => loc.startHour <= hour && loc.endHour > hour
    );
    
    if (existingIndex >= 0) {
      // Replace the existing entry
      const existing = npc.schedule!.locations[existingIndex];
      
      // If the existing entry spans more than just the appointment hour, we need to split it
      if (existing.startHour < hour || existing.endHour > hour + 1) {
        // Remove the existing entry
        npc.schedule!.locations.splice(existingIndex, 1);
        
        // Add an entry for the time before the appointment, if any
        if (existing.startHour < hour) {
          npc.schedule!.locations.push({
            locationId: existing.locationId,
            startHour: existing.startHour,
            endHour: hour,
            activity: existing.activity
          });
        }
        
        // Add the appointment
        npc.schedule!.locations.push({
          locationId,
          startHour: hour,
          endHour: hour + 1,
          activity
        });
        
        // Add an entry for the time after the appointment, if any
        if (existing.endHour > hour + 1) {
          npc.schedule!.locations.push({
            locationId: existing.locationId,
            startHour: hour + 1,
            endHour: existing.endHour,
            activity: existing.activity
          });
        }
      } else {
        // Just update the existing entry
        existing.locationId = locationId;
        existing.activity = activity;
      }
    } else {
      // Add a new entry
      npc.schedule!.locations.push({
        locationId,
        startHour: hour,
        endHour: hour + 1,
        activity
      });
    }
    
    // Sort the schedule by start hour
    npc.schedule!.locations.sort((a, b) => a.startHour - b.startHour);
    
    // Convert this regular appointment to a special appointment in the new format
    if (!npc.specialAppointments) {
      npc.specialAppointments = [];
    }
    
    // Add a special appointment that overrides the regular schedule
    npc.specialAppointments.push({
      id: uuidv4(),
      location: locationId,
      activity,
      startTime: hour * WORLD_CONFIG.MINUTES_PER_HOUR,
      endTime: (hour + 1) * WORLD_CONFIG.MINUTES_PER_HOUR
    });
    
    return true;
  }
  
  /**
   * Create a special appointment for an NPC
   * @param npcId The NPC's ID
   * @param appointment The appointment to add
   * @returns Whether the appointment was successfully added
   */
  public createSpecialAppointment(npcId: string, appointment: ScheduleEntry): boolean {
    const npc = this.npcManager.getNPC(npcId);
    if (!npc) {
      return false;
    }
    
    // Initialize special appointments array if it doesn't exist
    if (!npc.specialAppointments) {
      npc.specialAppointments = [];
    }
    
    // Ensure the appointment has an ID
    if (!appointment.id) {
      appointment.id = uuidv4();
    }
    
    // Add the appointment
    npc.specialAppointments.push(appointment);
    
    // Sort appointments by start time
    npc.specialAppointments.sort((a, b) => a.startTime - b.startTime);
    
    // Update the NPC
    this.npcManager.updateNPC(npc);
    
    return true;
  }
  
  /**
   * Remove a special appointment
   * @param npcId The NPC's ID
   * @param appointmentId The appointment ID to remove
   * @returns Whether the appointment was successfully removed
   */
  public removeSpecialAppointment(npcId: string, appointmentId: string): boolean {
    const npc = this.npcManager.getNPC(npcId);
    if (!npc || !npc.specialAppointments) {
      return false;
    }
    
    const initialLength = npc.specialAppointments.length;
    npc.specialAppointments = npc.specialAppointments.filter(a => a.id !== appointmentId);
    
    // If no appointments were removed, return false
    if (npc.specialAppointments.length === initialLength) {
      return false;
    }
    
    // Update the NPC
    this.npcManager.updateNPC(npc);
    
    return true;
  }
} 