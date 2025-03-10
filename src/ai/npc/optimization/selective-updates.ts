/**
 * Selective Updates System
 * 
 * This system optimizes NPC processing by selectively updating NPCs at different frequencies
 * based on their importance, distance from the player, and current activities.
 * 
 * Key features:
 * - Priority-based update scheduling
 * - Distance-based update frequency adjustment
 * - Activity-based update requirements
 * - Simplified simulation for distant NPCs
 */

import { NPC } from '../../../character/npc';
import { Vector2D } from '../../../types/spatial-types';
import { SpatialPartitioningSystem } from './spatial-partitioning';

/**
 * Update priority levels for NPCs
 */
export enum UpdatePriority {
    CRITICAL = 0,  // Updated every cycle (quest-critical NPCs, active combat participants)
    HIGH = 1,      // Updated frequently (NPCs near player, important faction leaders)
    MEDIUM = 2,    // Updated moderately (NPCs of moderate importance)
    LOW = 3,       // Updated infrequently (background NPCs)
    MINIMAL = 4    // Updated rarely (distant or inactive NPCs)
}

/**
 * Defines frequency of updates for each priority level
 */
export interface UpdateFrequencyConfig {
    [UpdatePriority.CRITICAL]: number; // Update every N cycles (usually 1)
    [UpdatePriority.HIGH]: number;
    [UpdatePriority.MEDIUM]: number;
    [UpdatePriority.LOW]: number;
    [UpdatePriority.MINIMAL]: number;
}

/**
 * Configuration for the selective updates system
 */
export interface SelectiveUpdateConfig {
    updateFrequency: UpdateFrequencyConfig;
    
    // Distance thresholds (in game world units)
    playerProximityThreshold: number; // Distance to be considered "near player"
    mediumDistanceThreshold: number;  // Distance to be considered "medium distance"
    farDistanceThreshold: number;     // Distance to be considered "far"
    
    // Special flags
    alwaysUpdateQuestNPCs: boolean;
    alwaysUpdateCombatants: boolean;
    alwaysUpdateFactionLeaders: boolean;
    
    // Detail level configuration based on distance
    detailLevels: {
        near: SimulationDetailLevel;
        medium: SimulationDetailLevel;
        far: SimulationDetailLevel;
        veryFar: SimulationDetailLevel;
    };
}

/**
 * Defines what aspects of NPCs are simulated at different detail levels
 */
export interface SimulationDetailLevel {
    updateEmotions: boolean;
    updateRelationships: boolean;
    updateMemories: boolean;
    updateNeeds: boolean;
    simulateInteractions: boolean;
    processActivity: boolean;
    randomEvents: boolean;
}

/**
 * Tracked state for an NPC in the selective update system
 */
export interface NPCUpdateState {
    npcId: string;
    priority: UpdatePriority;
    lastUpdated: number;
    detailLevel: SimulationDetailLevel;
    distanceToPlayer: number;
    skipCount: number;  // Number of times this NPC's update was skipped
}

/**
 * Main class that implements selective updates for NPCs
 */
export class SelectiveUpdateSystem {
    private config: SelectiveUpdateConfig;
    private spatialSystem: SpatialPartitioningSystem;
    private npcStates: Map<string, NPCUpdateState> = new Map();
    private currentCycle: number = 0;
    private playerPosition: Vector2D;
    private questNPCs: Set<string> = new Set();
    private combatantNPCs: Set<string> = new Set();
    private factionLeaders: Set<string> = new Set();
    
    constructor(config: SelectiveUpdateConfig, spatialSystem: SpatialPartitioningSystem, playerPosition: Vector2D) {
        this.config = config;
        this.spatialSystem = spatialSystem;
        this.playerPosition = playerPosition;
    }
    
    /**
     * Register an NPC with the selective update system
     * @param npc The NPC to register
     * @param isQuestNPC Whether this NPC is involved in active quests
     * @param isFactionLeader Whether this NPC is a faction leader
     */
    public registerNPC(npc: NPC, isQuestNPC: boolean = false, isFactionLeader: boolean = false): void {
        // Get NPC position from spatial system
        const npcEntity = this.spatialSystem.entities.get(npc.id);
        if (!npcEntity) {
            console.warn(`Cannot register NPC ${npc.id} for selective updates - not found in spatial system`);
            return;
        }
        
        const distanceToPlayer = this.calculateDistance(npcEntity.position, this.playerPosition);
        const priority = this.calculateInitialPriority(npc, distanceToPlayer, isQuestNPC, isFactionLeader);
        const detailLevel = this.getDetailLevelForDistance(distanceToPlayer);
        
        const updateState: NPCUpdateState = {
            npcId: npc.id,
            priority,
            lastUpdated: this.currentCycle,
            detailLevel,
            distanceToPlayer,
            skipCount: 0
        };
        
        this.npcStates.set(npc.id, updateState);
        
        // Register in special collections if needed
        if (isQuestNPC) {
            this.questNPCs.add(npc.id);
        }
        
        if (isFactionLeader) {
            this.factionLeaders.add(npc.id);
        }
    }
    
    /**
     * Mark an NPC as being in active combat
     * @param npcId The NPC ID
     * @param inCombat Whether the NPC is in combat
     */
    public setNPCCombatStatus(npcId: string, inCombat: boolean): void {
        if (inCombat) {
            this.combatantNPCs.add(npcId);
            
            // Update priority to CRITICAL
            const state = this.npcStates.get(npcId);
            if (state) {
                state.priority = UpdatePriority.CRITICAL;
            }
        } else {
            this.combatantNPCs.delete(npcId);
            
            // Recalculate priority
            this.updateNPCPriority(npcId);
        }
    }
    
    /**
     * Update the player's position
     * @param newPosition The new player position
     */
    public updatePlayerPosition(newPosition: Vector2D): void {
        this.playerPosition = newPosition;
        
        // Recalculate NPC distances and potentially update priorities
        for (const [npcId, state] of this.npcStates) {
            const npcEntity = this.spatialSystem.entities.get(npcId);
            if (!npcEntity) continue;
            
            const newDistance = this.calculateDistance(npcEntity.position, this.playerPosition);
            const oldDistance = state.distanceToPlayer;
            state.distanceToPlayer = newDistance;
            
            // Update detail level if distance category changed
            const oldDetailLevel = state.detailLevel;
            const newDetailLevel = this.getDetailLevelForDistance(newDistance);
            
            if (newDetailLevel !== oldDetailLevel) {
                state.detailLevel = newDetailLevel;
            }
            
            // Only recalculate priority if distance changed significantly
            if (Math.abs(newDistance - oldDistance) > 10) {
                this.updateNPCPriority(npcId);
            }
        }
    }
    
    /**
     * Gets the NPCs that should be updated in the current cycle
     * @returns Array of NPC IDs to update and their detail levels
     */
    public getNPCsToUpdate(): { npcId: string, detailLevel: SimulationDetailLevel }[] {
        const npcsToUpdate: { npcId: string, detailLevel: SimulationDetailLevel }[] = [];
        
        for (const [npcId, state] of this.npcStates) {
            const updateFrequency = this.config.updateFrequency[state.priority];
            
            // Check if it's time to update this NPC
            if ((this.currentCycle - state.lastUpdated) >= updateFrequency) {
                npcsToUpdate.push({
                    npcId: npcId,
                    detailLevel: state.detailLevel
                });
                
                // Update the last updated cycle
                state.lastUpdated = this.currentCycle;
                state.skipCount = 0;
            } else {
                state.skipCount++;
            }
        }
        
        return npcsToUpdate;
    }
    
    /**
     * Advance to the next update cycle
     */
    public advanceCycle(): void {
        this.currentCycle++;
    }
    
    /**
     * Get statistics about the selective update system
     * @returns Object with statistics
     */
    public getStatistics(): any {
        let priorityCounts = {
            [UpdatePriority.CRITICAL]: 0,
            [UpdatePriority.HIGH]: 0,
            [UpdatePriority.MEDIUM]: 0,
            [UpdatePriority.LOW]: 0,
            [UpdatePriority.MINIMAL]: 0
        };
        
        let totalSkips = 0;
        let maxSkips = 0;
        
        for (const state of this.npcStates.values()) {
            priorityCounts[state.priority]++;
            totalSkips += state.skipCount;
            maxSkips = Math.max(maxSkips, state.skipCount);
        }
        
        return {
            totalNPCs: this.npcStates.size,
            currentCycle: this.currentCycle,
            priorityCounts,
            questNPCs: this.questNPCs.size,
            combatantNPCs: this.combatantNPCs.size,
            factionLeaders: this.factionLeaders.size,
            totalSkips,
            averageSkips: this.npcStates.size > 0 ? totalSkips / this.npcStates.size : 0,
            maxSkips
        };
    }
    
    /**
     * Get the percentage of NPCs updated each cycle on average
     * @returns Percentage of NPCs updated per cycle
     */
    public getAverageUpdatePercentage(): number {
        let totalUpdateFrequency = 0;
        
        for (const state of this.npcStates.values()) {
            const frequency = this.config.updateFrequency[state.priority];
            totalUpdateFrequency += (1 / frequency);
        }
        
        return (totalUpdateFrequency / this.npcStates.size) * 100;
    }
    
    /**
     * Force an immediate update for a specific NPC
     * @param npcId The NPC ID to force update
     */
    public forceUpdate(npcId: string): void {
        const state = this.npcStates.get(npcId);
        if (state) {
            state.lastUpdated = this.currentCycle - this.config.updateFrequency[state.priority];
        }
    }
    
    /**
     * Calculate the initial priority for an NPC based on various factors
     * @param npc The NPC
     * @param distanceToPlayer Distance to player
     * @param isQuestNPC Whether this NPC is quest-critical
     * @param isFactionLeader Whether this NPC is a faction leader
     * @returns The calculated update priority
     */
    private calculateInitialPriority(
        npc: NPC, 
        distanceToPlayer: number,
        isQuestNPC: boolean,
        isFactionLeader: boolean
    ): UpdatePriority {
        // Quest NPCs, combatants, and nearby NPCs get highest priority
        if (
            (isQuestNPC && this.config.alwaysUpdateQuestNPCs) ||
            this.combatantNPCs.has(npc.id)
        ) {
            return UpdatePriority.CRITICAL;
        }
        
        // Faction leaders get high priority if configured
        if (isFactionLeader && this.config.alwaysUpdateFactionLeaders) {
            return UpdatePriority.HIGH;
        }
        
        // Distance-based priority
        if (distanceToPlayer <= this.config.playerProximityThreshold) {
            return UpdatePriority.HIGH;
        } else if (distanceToPlayer <= this.config.mediumDistanceThreshold) {
            return UpdatePriority.MEDIUM;
        } else if (distanceToPlayer <= this.config.farDistanceThreshold) {
            return UpdatePriority.LOW;
        } else {
            return UpdatePriority.MINIMAL;
        }
    }
    
    /**
     * Update an NPC's priority based on current state
     * @param npcId The NPC ID to update
     */
    private updateNPCPriority(npcId: string): void {
        const state = this.npcStates.get(npcId);
        if (!state) return;
        
        const npcEntity = this.spatialSystem.entities.get(npcId);
        if (!npcEntity) return;
        
        const npc = npcEntity.data as NPC;
        const isQuestNPC = this.questNPCs.has(npcId);
        const isFactionLeader = this.factionLeaders.has(npcId);
        
        state.priority = this.calculateInitialPriority(
            npc,
            state.distanceToPlayer,
            isQuestNPC,
            isFactionLeader
        );
    }
    
    /**
     * Get the appropriate detail level based on distance to player
     * @param distance Distance to player
     * @returns The detail level to use
     */
    private getDetailLevelForDistance(distance: number): SimulationDetailLevel {
        if (distance <= this.config.playerProximityThreshold) {
            return this.config.detailLevels.near;
        } else if (distance <= this.config.mediumDistanceThreshold) {
            return this.config.detailLevels.medium;
        } else if (distance <= this.config.farDistanceThreshold) {
            return this.config.detailLevels.far;
        } else {
            return this.config.detailLevels.veryFar;
        }
    }
    
    /**
     * Calculate distance between two positions
     * @param pos1 First position
     * @param pos2 Second position
     * @returns The distance
     */
    private calculateDistance(pos1: Vector2D, pos2: Vector2D): number {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Create a default configuration for the selective update system
     * @returns Default configuration
     */
    public static createDefaultConfig(): SelectiveUpdateConfig {
        return {
            updateFrequency: {
                [UpdatePriority.CRITICAL]: 1,    // Every cycle
                [UpdatePriority.HIGH]: 2,        // Every 2 cycles
                [UpdatePriority.MEDIUM]: 5,      // Every 5 cycles
                [UpdatePriority.LOW]: 10,        // Every 10 cycles
                [UpdatePriority.MINIMAL]: 20     // Every 20 cycles
            },
            
            playerProximityThreshold: 50,
            mediumDistanceThreshold: 150,
            farDistanceThreshold: 300,
            
            alwaysUpdateQuestNPCs: true,
            alwaysUpdateCombatants: true,
            alwaysUpdateFactionLeaders: true,
            
            detailLevels: {
                near: {
                    updateEmotions: true,
                    updateRelationships: true,
                    updateMemories: true,
                    updateNeeds: true,
                    simulateInteractions: true,
                    processActivity: true,
                    randomEvents: true
                },
                medium: {
                    updateEmotions: true,
                    updateRelationships: true,
                    updateMemories: true,
                    updateNeeds: true,
                    simulateInteractions: true,
                    processActivity: true,
                    randomEvents: false
                },
                far: {
                    updateEmotions: false,
                    updateRelationships: true,
                    updateMemories: false,
                    updateNeeds: true,
                    simulateInteractions: false,
                    processActivity: true,
                    randomEvents: false
                },
                veryFar: {
                    updateEmotions: false,
                    updateRelationships: false,
                    updateMemories: false,
                    updateNeeds: false,
                    simulateInteractions: false,
                    processActivity: true,
                    randomEvents: false
                }
            }
        };
    }
} 