/**
 * Parallel Processing Example
 * 
 * This example demonstrates the concept of parallel processing for NPC updates.
 * It uses a compatible approach to work with the current project structure.
 * 
 * The example:
 * 1. Creates a population of NPCs
 * 2. Updates them sequentially (single-threaded)
 * 3. Simulates updating them in parallel 
 * 4. Compares performance between the two approaches
 */

import { performance } from 'perf_hooks';
import { NPC, createNPC } from '../character/npc';
import { SimulationDetailLevel } from '../types';

// Simplified DetailLevel enum
enum DetailLevel {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

// Map from simplified DetailLevel to SimulationDetailLevel
function mapDetailLevel(level: DetailLevel): SimulationDetailLevel {
  switch(level) {
    case DetailLevel.HIGH:
      return {
        updateEmotions: true,
        updateRelationships: true,
        updateMemories: true,
        updateNeeds: true,
        simulateInteractions: true,
        processActivity: true,
        randomEvents: true
      };
    case DetailLevel.MEDIUM:
      return {
        updateEmotions: true,
        updateRelationships: false,
        updateMemories: false,
        updateNeeds: true,
        simulateInteractions: false,
        processActivity: true,
        randomEvents: false
      };
    case DetailLevel.LOW:
      return {
        updateEmotions: false,
        updateRelationships: false,
        updateMemories: false,
        updateNeeds: true,
        simulateInteractions: false,
        processActivity: false,
        randomEvents: false
      };
  }
}

/**
 * Create a sample NPC
 */
function createSampleNPC(id: string): NPC {
    return createNPC(id, `NPC_${id}`, {
        level: Math.floor(Math.random() * 10) + 1,
        faction: ['Merchants', 'Guards', 'Villagers', 'Outlaws'][Math.floor(Math.random() * 4)],
        // Add position as custom data
        position: {
            x: Math.random() * 1000,
            y: Math.random() * 1000,
            z: Math.random() * 100
        },
        needs: new Map([
            ['hunger', Math.random() * 0.5],
            ['thirst', Math.random() * 0.5],
            ['rest', Math.random() * 0.5],
            ['social', Math.random() * 0.5]
        ]),
        emotions: [
            {
                type: ['joy', 'sadness', 'anger', 'fear'][Math.floor(Math.random() * 4)],
                intensity: Math.random() * 0.7,
                timestamp: Date.now() - Math.random() * 3600000, // Up to 1 hour ago
                persistence: 0.3 + Math.random() * 0.4,
                source: 'initial'
            }
        ],
        stats: new Map([
            ['strength', 10 + Math.floor(Math.random() * 10)],
            ['dexterity', 10 + Math.floor(Math.random() * 10)],
            ['intelligence', 10 + Math.floor(Math.random() * 10)],
            ['charisma', 10 + Math.floor(Math.random() * 10)],
            ['stamina', 0.5 + Math.random() * 0.5]
        ])
    }) as NPC & { position: { x: number; y: number; z: number } };
}

/**
 * Create relationships between NPCs
 */
function createRelationships(npcs: NPC[], relationshipDensity: number = 0.1): void {
    for (const npc of npcs) {
        for (const otherNpc of npcs) {
            // Don't create relationship with self
            if (npc.id === otherNpc.id) continue;
            
            // Only create relationship with probability = relationshipDensity
            if (Math.random() > relationshipDensity) continue;
            
            // Create relationship
            if (npc.relationships instanceof Map) {
                npc.relationships.set(otherNpc.id, {
                    targetId: otherNpc.id,
                    affinity: (Math.random() * 2 - 1) * 0.5, // -0.5 to 0.5
                    trust: (Math.random() * 2 - 1) * 0.5, // -0.5 to 0.5
                    familiarity: Math.random() * 0.5, // 0 to 0.5
                    lastInteraction: Date.now() - Math.random() * 86400000 // Up to 1 day ago
                });
            }
        }
    }
}

/**
 * Add memories to NPCs
 */
function createMemories(npcs: NPC[], memoryCount: number = 5): void {
    const eventTypes = ['conversation', 'combat', 'trade', 'discovery', 'crafting'];
    const locations = ['tavern', 'market', 'forest', 'road', 'castle'];
    
    for (const npc of npcs) {
        const actualMemoryCount = Math.floor(Math.random() * memoryCount) + 1;
        
        if (!npc.memories) {
            npc.memories = [];
        }
        
        for (let i = 0; i < actualMemoryCount; i++) {
            const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            const location = locations[Math.floor(Math.random() * locations.length)];
            const daysAgo = Math.floor(Math.random() * 10) + 1;
            const timestamp = Date.now() - (daysAgo * 86400000);
            
            npc.memories.push({
                id: `memory_${npc.id}_${i}`,
                content: `Had a ${eventType} at the ${location} ${daysAgo} days ago`,
                importance: Math.floor(Math.random() * 5),
                created: timestamp,
                lastRecalled: timestamp,
                associations: [eventType, location],
                strength: 0.3 + Math.random() * 0.7,
                emotionalSignificance: Math.random() * 0.8
            });
        }
    }
}

/**
 * Sequential update of all NPCs (single-threaded)
 */
function updateNPCsSequentially(npcs: NPC[], detailLevel: DetailLevel): number {
    const startTime = performance.now();
    
    for (const npc of npcs) {
        updateNPC(npc, detailLevel);
    }
    
    return performance.now() - startTime;
}

/**
 * Update a single NPC (for sequential processing)
 */
function updateNPC(npc: NPC, detailLevel: DetailLevel): void {
    // Simulate CPU-intensive work
    switch (detailLevel) {
        case DetailLevel.HIGH:
            // Full update simulation
            updateNeeds(npc);
            simulateComplexComputation(5000); // Simulate complex processing
            updateEmotions(npc);
            updateGoals(npc);
            break;
            
        case DetailLevel.MEDIUM:
            // Medium update simulation
            updateNeeds(npc);
            simulateComplexComputation(2000);
            updateEmotions(npc);
            break;
            
        case DetailLevel.LOW:
            // Low update simulation
            updateNeeds(npc);
            simulateComplexComputation(500);
            break;
    }
}

/**
 * Simulate complex computation
 */
function simulateComplexComputation(iterations: number): void {
    // Just a dummy computation to simulate CPU load
    let result = 0;
    for (let i = 0; i < iterations; i++) {
        result += Math.sin(i) * Math.cos(i);
    }
}

/**
 * Update NPC needs (simplified)
 */
function updateNeeds(npc: NPC): void {
    for (const [need, value] of npc.needs.entries()) {
        // Simulate need increase over time
        npc.needs.set(need, Math.min(1, value + Math.random() * 0.05));
    }
}

/**
 * Update NPC emotions (simplified)
 */
function updateEmotions(npc: NPC): void {
    // Decay existing emotions
    for (const emotion of npc.emotions) {
        emotion.intensity *= 0.95;
    }
    
    // Filter out low intensity emotions
    npc.emotions = npc.emotions.filter(emotion => emotion.intensity > 0.1);
    
    // Possibly add a new emotion based on needs
    for (const [need, value] of npc.needs.entries()) {
        if (value > 0.8) {
            const emotionType = need === 'hunger' ? 'irritable' 
                : need === 'thirst' ? 'uncomfortable'
                : need === 'rest' ? 'tired'
                : 'lonely';
                
            const existingEmotion = npc.emotions.find(e => e.type === emotionType);
            
            if (existingEmotion) {
                existingEmotion.intensity = Math.max(existingEmotion.intensity, 0.7);
            } else {
                npc.emotions.push({
                    type: emotionType,
                    intensity: 0.7,
                    timestamp: Date.now(),
                    persistence: 0.5
                });
            }
            
            break; // Only handle the most pressing need
        }
    }
}

/**
 * Update NPC goals (simplified)
 */
function updateGoals(npc: NPC): void {
    // Remove completed goals
    npc.goals = npc.goals.filter(goal => goal.status !== 'completed');
    
    // Check if we need a new goal based on needs
    let highestNeed = { type: '', value: 0 };
    
    for (const [need, value] of npc.needs.entries()) {
        if (value > highestNeed.value) {
            highestNeed = { type: need, value };
        }
    }
    
    // Create a goal for the highest need if it's above threshold
    if (highestNeed.value > 0.7) {
        const hasNeedGoal = npc.goals.some(goal => 
            goal.type === 'satisfy_need' && goal.data?.needType === highestNeed.type
        );
        
        if (!hasNeedGoal) {
            npc.goals.push({
                id: `goal_${Date.now()}`,
                type: 'satisfy_need',
                priority: highestNeed.value,
                data: { needType: highestNeed.type },
                status: 'active',
                createdAt: Date.now()
            });
        }
    }
}

/**
 * Simulate parallel update of NPCs
 */
function simulateParallelUpdate(npcs: NPC[], detailLevel: DetailLevel, workerCount: number): number {
    const startTime = performance.now();
    
    // Simulate dividing the work among workers
    const batchSize = Math.ceil(npcs.length / workerCount);
    
    // Calculate the expected time (this is a simulation, so we're making an estimate)
    // In a real parallel system, the time would be roughly sequential time / worker count
    // plus some overhead for coordination
    
    // Let's simulate worker performance variance
    let maxWorkerTime = 0;
    
    for (let i = 0; i < workerCount; i++) {
        const startIdx = i * batchSize;
        const endIdx = Math.min(startIdx + batchSize, npcs.length);
        
        if (startIdx >= npcs.length) break;
        
        // Simulate this worker's processing time
        const batchNPCs = npcs.slice(startIdx, endIdx);
        
        // Calculate estimated time for this batch
        const singleNPCTime = getEstimatedTimeForDetailLevel(detailLevel);
        const workerVariance = 0.8 + Math.random() * 0.4; // 80% to 120% variance
        const workerTime = batchNPCs.length * singleNPCTime * workerVariance;
        
        // Keep track of the longest worker time (this will be our limiting factor)
        maxWorkerTime = Math.max(maxWorkerTime, workerTime);
    }
    
    // Add overhead for worker creation and coordination (typically 5-15%)
    const overhead = 1.1; // 10%
    const totalTime = maxWorkerTime * overhead;
    
    return totalTime;
}

/**
 * Get the estimated time to process one NPC at a given detail level
 */
function getEstimatedTimeForDetailLevel(detailLevel: DetailLevel): number {
    switch (detailLevel) {
        case DetailLevel.HIGH:
            return 5; // milliseconds
        case DetailLevel.MEDIUM:
            return 2;
        case DetailLevel.LOW:
            return 0.5;
        default:
            return 1;
    }
}

/**
 * Run the example
 */
async function runExample(): Promise<void> {
    console.log("=== Parallel Processing Example ===");
    
    // Configuration
    const npcCount = 1000;
    const relationshipDensity = 0.05; // 5% chance of relationship between any two NPCs
    const detailLevel = DetailLevel.MEDIUM;
    
    console.log(`Creating ${npcCount} NPCs...`);
    
    // Create NPCs
    const npcs: NPC[] = [];
    for (let i = 0; i < npcCount; i++) {
        npcs.push(createSampleNPC(`npc_${i}`));
    }
    
    // Create relationships between NPCs
    console.log(`Creating relationships with density ${relationshipDensity * 100}%...`);
    createRelationships(npcs, relationshipDensity);
    
    // Add memories
    console.log("Adding memories...");
    createMemories(npcs);
    
    // 1. Sequential update (single-threaded)
    console.log("\nStarting sequential (single-threaded) update...");
    const sequentialTime = updateNPCsSequentially(npcs, detailLevel);
    console.log(`Sequential update completed in ${sequentialTime.toFixed(2)}ms`);
    
    // 2. Simulated parallel update
    console.log("\nSimulating parallel updates with different worker counts...");
    
    const cpuCounts = [2, 4, 8, 16];
    
    for (const workerCount of cpuCounts) {
        const parallelTime = simulateParallelUpdate(npcs, detailLevel, workerCount);
        const speedup = sequentialTime / parallelTime;
        
        console.log(`With ${workerCount} workers: ${parallelTime.toFixed(2)}ms (${speedup.toFixed(2)}x speedup)`);
    }
    
    // Demonstrate task types that would benefit from parallel processing
    console.log("\nTask types that benefit from parallel processing:");
    console.log("1. NPC Updates - When processing many NPCs' state changes");
    console.log("2. Memory Decay - When applying decay to many NPCs' memories");
    console.log("3. Emotion Updates - When updating emotional states across populations");
    console.log("4. Relationship Updates - When processing relationship changes between NPCs");
    console.log("5. World Partition Updates - When processing interactions in different regions");
    
    console.log("\nParallel processing provides significant benefits when:");
    console.log("- The NPC population is large (500+ NPCs)");
    console.log("- Tasks can be divided into independent chunks (embarrassingly parallel)");
    console.log("- The system has multiple CPU cores available");
    console.log("- The workload per NPC is computationally intensive");
    
    console.log("\n=== Example Complete ===");
}

// Run the example if this file is executed directly
if (require.main === module) {
    runExample().catch(error => {
        console.error("Example failed:", error);
    });
}

export { runExample }; 