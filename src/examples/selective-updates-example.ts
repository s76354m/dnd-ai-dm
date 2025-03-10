/**
 * Example demonstrating the Selective Updates system
 * 
 * This example shows how the Selective Updates system:
 * 1. Prioritizes NPCs based on distance and importance
 * 2. Updates different NPCs at different frequencies
 * 3. Adjusts detail levels based on distance
 * 4. Achieves significant performance improvements
 */

import { 
    SelectiveUpdateSystem, 
    UpdatePriority, 
    SimulationDetailLevel 
} from '../ai/npc/optimization/selective-updates';
import { SpatialPartitioningSystem } from '../ai/npc/optimization/spatial-partitioning';
import { Vector2D, BoundingBox } from '../types/spatial-types';
import { NPC } from '../character/npc';

// Log formatting helpers
const logHeader = (title: string) => {
    console.log('\n' + '='.repeat(80));
    console.log(`${title.toUpperCase()}`);
    console.log('='.repeat(80));
};

const logStep = (text: string) => {
    console.log('\n' + '-'.repeat(40));
    console.log(text);
    console.log('-'.repeat(40));
};

// Create a random position within the world bounds
const createRandomPosition = (bounds: BoundingBox): Vector2D => {
    return {
        x: bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
        y: bounds.min.y + Math.random() * (bounds.max.y - bounds.min.y)
    };
};

// Create a sample NPC
const createNPC = (id: string, name: string): NPC => {
    return {
        id,
        name,
        personality: {
            openness: Math.random(),
            conscientiousness: Math.random(),
            extraversion: Math.random(),
            agreeableness: Math.random(),
            neuroticism: Math.random()
        },
        emotions: [],
        memories: [],
        needs: new Map(),
        behaviors: [],
        relationships: new Map(),
        factionId: null,
        inventory: [],
        stats: new Map(),
        currentActivity: null
    };
};

// Simulate updating an NPC with time measurement
const simulateNPCUpdate = (npc: NPC, detailLevel: SimulationDetailLevel): number => {
    const startTime = performance.now();
    
    // Simulate the time it takes to update an NPC based on detail level
    // More features enabled = more processing time
    
    // Calculate base update time (in ms)
    let processingTime = 0.1; // Base processing time
    
    // Add time for each feature that's enabled
    if (detailLevel.updateEmotions) processingTime += 0.2;
    if (detailLevel.updateRelationships) processingTime += 0.3;
    if (detailLevel.updateMemories) processingTime += 0.4;
    if (detailLevel.updateNeeds) processingTime += 0.2;
    if (detailLevel.simulateInteractions) processingTime += 0.5;
    if (detailLevel.processActivity) processingTime += 0.3;
    if (detailLevel.randomEvents) processingTime += 0.4;
    
    // Simulate the processing by sleeping
    const sleepUntil = startTime + processingTime;
    while (performance.now() < sleepUntil) {
        // Busy wait to simulate processing
    }
    
    return performance.now() - startTime;
};

// Generate a set of NPCs with random positions
const generateNPCs = (count: number, worldBounds: BoundingBox): { npc: NPC, position: Vector2D }[] => {
    const npcs: { npc: NPC, position: Vector2D }[] = [];
    
    for (let i = 0; i < count; i++) {
        const npcId = `npc-${i+1}`;
        const npcName = `NPC ${i+1}`;
        const npc = createNPC(npcId, npcName);
        const position = createRandomPosition(worldBounds);
        
        npcs.push({ npc, position });
    }
    
    return npcs;
};

// Run the example
async function runExample() {
    logHeader('Selective Updates Example');
    
    // Set up the world configuration
    logStep('1. Setting up the world');
    const worldBounds: BoundingBox = {
        min: { x: 0, y: 0 },
        max: { x: 1000, y: 1000 }
    };
    
    const spatialConfig = {
        cellSize: 50,
        worldBounds,
        interactionTypes: new Map([
            ['conversation', 10],
            ['trade', 5],
            ['combat', 20]
        ])
    };
    
    // Initialize spatial system
    const spatialSystem = new SpatialPartitioningSystem(spatialConfig);
    
    // Set player position (center of world)
    const playerPosition: Vector2D = { x: 500, y: 500 };
    
    // Generate NPCs
    logStep('2. Generating NPCs');
    const npcCount = 1000;
    console.log(`Generating ${npcCount} NPCs with random positions...`);
    const npcs = generateNPCs(npcCount, worldBounds);
    
    // Add NPCs to spatial system
    for (const { npc, position } of npcs) {
        spatialSystem.addNPC(npc, position);
    }
    
    // Create selective update system
    logStep('3. Initializing selective update system');
    const updateConfig = SelectiveUpdateSystem.createDefaultConfig();
    const updateSystem = new SelectiveUpdateSystem(updateConfig, spatialSystem, playerPosition);
    
    // Register NPCs with the selective update system
    console.log(`Registering ${npcCount} NPCs with the selective update system...`);
    
    // Assign some NPCs as quest NPCs and faction leaders
    const questNPCs = new Set<string>();
    const factionLeaders = new Set<string>();
    
    // Make 5% of NPCs quest-related
    const questNPCCount = Math.floor(npcCount * 0.05);
    for (let i = 0; i < questNPCCount; i++) {
        const randomIndex = Math.floor(Math.random() * npcCount);
        questNPCs.add(npcs[randomIndex].npc.id);
    }
    
    // Make 1% of NPCs faction leaders
    const factionLeaderCount = Math.floor(npcCount * 0.01);
    for (let i = 0; i < factionLeaderCount; i++) {
        const randomIndex = Math.floor(Math.random() * npcCount);
        factionLeaders.add(npcs[randomIndex].npc.id);
    }
    
    // Register all NPCs
    for (const { npc } of npcs) {
        const isQuestNPC = questNPCs.has(npc.id);
        const isFactionLeader = factionLeaders.has(npc.id);
        updateSystem.registerNPC(npc, isQuestNPC, isFactionLeader);
    }
    
    // Mark a few NPCs as being in combat
    const combatNPCCount = 10;
    for (let i = 0; i < combatNPCCount; i++) {
        const randomIndex = Math.floor(Math.random() * npcCount);
        updateSystem.setNPCCombatStatus(npcs[randomIndex].npc.id, true);
    }
    
    // Print initial statistics
    logStep('4. Initial statistics');
    const initialStats = updateSystem.getStatistics();
    console.log(`Total NPCs: ${initialStats.totalNPCs}`);
    console.log(`Quest NPCs: ${initialStats.questNPCs}`);
    console.log(`Faction Leaders: ${initialStats.factionLeaders}`);
    console.log(`Combatants: ${initialStats.combatantNPCs}`);
    console.log('\nPriority distribution:');
    console.log(`- Critical: ${initialStats.priorityCounts[UpdatePriority.CRITICAL]}`);
    console.log(`- High: ${initialStats.priorityCounts[UpdatePriority.HIGH]}`);
    console.log(`- Medium: ${initialStats.priorityCounts[UpdatePriority.MEDIUM]}`);
    console.log(`- Low: ${initialStats.priorityCounts[UpdatePriority.LOW]}`);
    console.log(`- Minimal: ${initialStats.priorityCounts[UpdatePriority.MINIMAL]}`);
    
    console.log(`\nAverage NPCs updated per cycle: ${updateSystem.getAverageUpdatePercentage().toFixed(2)}%`);
    
    // Run several update cycles and measure performance
    logStep('5. Running update cycles');
    const cyclesToRun = 20;
    console.log(`Running ${cyclesToRun} update cycles...`);
    
    let totalUpdates = 0;
    let totalUpdateTime = 0;
    
    // Track which NPCs get updated in each cycle
    const updateCounts = new Map<string, number>();
    npcs.forEach(({ npc }) => updateCounts.set(npc.id, 0));
    
    // Run the cycles
    for (let cycle = 0; cycle < cyclesToRun; cycle++) {
        console.log(`\nCycle ${cycle + 1}:`);
        
        // Get NPCs to update in this cycle
        const startTime = performance.now();
        const npcsToUpdate = updateSystem.getNPCsToUpdate();
        
        console.log(`Updating ${npcsToUpdate.length} NPCs (${(npcsToUpdate.length / npcCount * 100).toFixed(2)}% of total)`);
        
        // Update each NPC
        for (const { npcId, detailLevel } of npcsToUpdate) {
            const npc = npcs.find(n => n.npc.id === npcId)?.npc;
            if (npc) {
                const updateTime = simulateNPCUpdate(npc, detailLevel);
                totalUpdateTime += updateTime;
                
                // Increment update count for this NPC
                const currentCount = updateCounts.get(npcId) || 0;
                updateCounts.set(npcId, currentCount + 1);
            }
        }
        
        totalUpdates += npcsToUpdate.length;
        
        // Calculate time
        const cycleTime = performance.now() - startTime;
        console.log(`Cycle completed in ${cycleTime.toFixed(2)}ms`);
        
        // Advance to next cycle
        updateSystem.advanceCycle();
        
        // Player movement simulation (every 5 cycles)
        if (cycle % 5 === 4) {
            // Move player to a random position
            const newPlayerPosition = createRandomPosition(worldBounds);
            console.log(`Moving player from (${playerPosition.x.toFixed(0)}, ${playerPosition.y.toFixed(0)}) to (${newPlayerPosition.x.toFixed(0)}, ${newPlayerPosition.y.toFixed(0)})`);
            
            playerPosition.x = newPlayerPosition.x;
            playerPosition.y = newPlayerPosition.y;
            
            // Update player position in the system
            updateSystem.updatePlayerPosition(playerPosition);
        }
    }
    
    // Print update statistics
    logStep('6. Final statistics');
    const finalStats = updateSystem.getStatistics();
    
    console.log(`Total updates performed: ${totalUpdates}`);
    console.log(`Average updates per cycle: ${(totalUpdates / cyclesToRun).toFixed(2)}`);
    console.log(`Total update time: ${totalUpdateTime.toFixed(2)}ms`);
    console.log(`Average update time per NPC: ${(totalUpdateTime / totalUpdates).toFixed(3)}ms`);
    
    console.log('\nUpdate frequency by priority:');
    const updateFreqByPriority = new Map<UpdatePriority, number[]>();
    
    for (const { npc } of npcs) {
        const updateCount = updateCounts.get(npc.id) || 0;
        const state = updateSystem.getStatistics().priorityCounts;
        const priority = Object.keys(state).find(
            p => npc.id in state[p]
        ) as unknown as UpdatePriority;
        
        if (!updateFreqByPriority.has(priority)) {
            updateFreqByPriority.set(priority, []);
        }
        updateFreqByPriority.get(priority)?.push(updateCount);
    }
    
    for (const [priority, counts] of updateFreqByPriority.entries()) {
        const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length;
        console.log(`- ${UpdatePriority[priority]}: ${avg.toFixed(2)} updates per NPC`);
    }
    
    console.log('\nNPC update distribution:');
    const updateFrequencies = Array.from(updateCounts.values());
    const maxUpdates = Math.max(...updateFrequencies);
    const minUpdates = Math.min(...updateFrequencies);
    const avgUpdates = updateFrequencies.reduce((sum, count) => sum + count, 0) / updateFrequencies.length;
    
    console.log(`- Min updates: ${minUpdates}`);
    console.log(`- Max updates: ${maxUpdates}`);
    console.log(`- Average updates: ${avgUpdates.toFixed(2)}`);
    
    // Calculate performance comparison with naive approach
    logStep('7. Performance comparison');
    
    // Naive approach would update all NPCs every cycle
    const naiveUpdates = npcCount * cyclesToRun;
    const naiveUpdateTime = naiveUpdates * 2.0; // Assume 2ms per full update
    
    console.log('Naive approach (update all NPCs every cycle):');
    console.log(`- Total updates: ${naiveUpdates}`);
    console.log(`- Estimated update time: ${naiveUpdateTime.toFixed(2)}ms`);
    
    console.log('\nSelective update approach:');
    console.log(`- Total updates: ${totalUpdates}`);
    console.log(`- Total update time: ${totalUpdateTime.toFixed(2)}ms`);
    
    const updateReduction = ((naiveUpdates - totalUpdates) / naiveUpdates) * 100;
    const timeReduction = ((naiveUpdateTime - totalUpdateTime) / naiveUpdateTime) * 100;
    
    console.log('\nPerformance improvement:');
    console.log(`- Update count reduction: ${updateReduction.toFixed(2)}%`);
    console.log(`- Update time reduction: ${timeReduction.toFixed(2)}%`);
    
    // Summary
    logStep('Summary');
    console.log('The Selective Updates system significantly improves performance by:');
    console.log('1. Prioritizing important NPCs and those near the player');
    console.log('2. Updating distant NPCs less frequently');
    console.log('3. Using simplified simulation for distant NPCs');
    console.log('4. Dynamically adjusting priorities as the player moves');
    console.log('\nThis optimization is crucial for:');
    console.log('- Worlds with large numbers of NPCs');
    console.log('- Real-time game performance');
    console.log('- Maintaining responsiveness for player-adjacent content');
}

// If this file is run directly, execute the example
if (require.main === module) {
    runExample()
        .then(() => console.log('\nExample completed successfully'))
        .catch(err => console.error('Error running example:', err));
} 