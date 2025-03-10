/**
 * Example demonstrating the Spatial Partitioning system
 * 
 * This example shows how the Spatial Partitioning system can be used to efficiently:
 * 1. Find NPCs within interaction distance of each other
 * 2. Optimize social interaction computations
 * 3. Compare performance with and without spatial partitioning
 */

import { SpatialPartitioningSystem, SpatialPartitioningConfig } from '../ai/npc/optimization/spatial-partitioning';
import { Vector2D, BoundingBox } from '../types/spatial-types';
import { NPC } from '../character/npc';
import { PersonalityTrait, EmotionType, BehaviorCategory, BehaviorPriority } from '../types/npc-types';

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

// Utility to measure execution time
const measureTime = (fn: () => void): number => {
    const start = performance.now();
    fn();
    const end = performance.now();
    return end - start;
};

// Create sample world configuration
const createWorldConfig = (): SpatialPartitioningConfig => {
    return {
        cellSize: 50, // 50 units per cell
        worldBounds: {
            min: { x: 0, y: 0 },
            max: { x: 1000, y: 1000 }
        },
        interactionTypes: new Map([
            ['conversation', 10],
            ['trade', 5],
            ['combat', 20],
            ['greeting', 15]
        ])
    };
};

// Create a random position within the world bounds
const createRandomPosition = (bounds: BoundingBox): Vector2D => {
    return {
        x: bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
        y: bounds.min.y + Math.random() * (bounds.max.y - bounds.min.y)
    };
};

// Create a sample NPC
const createNPC = (id: string, name: string, personality: {[key in PersonalityTrait]?: number} = {}): NPC => {
    return {
        id,
        name,
        personality: {
            openness: personality.openness ?? Math.random(),
            conscientiousness: personality.conscientiousness ?? Math.random(),
            extraversion: personality.extraversion ?? Math.random(),
            agreeableness: personality.agreeableness ?? Math.random(),
            neuroticism: personality.neuroticism ?? Math.random()
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

// Find interaction partners without spatial partitioning (brute force)
const findInteractionPartnersBruteForce = (npcs: { npc: NPC, position: Vector2D }[], interactionRadius: number): Map<string, string[]> => {
    const partners = new Map<string, string[]>();
    
    for (let i = 0; i < npcs.length; i++) {
        const npc1 = npcs[i];
        const interactionPartners: string[] = [];
        
        for (let j = 0; j < npcs.length; j++) {
            if (i === j) continue;
            
            const npc2 = npcs[j];
            const dx = npc2.position.x - npc1.position.x;
            const dy = npc2.position.y - npc1.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= interactionRadius) {
                interactionPartners.push(npc2.npc.id);
            }
        }
        
        partners.set(npc1.npc.id, interactionPartners);
    }
    
    return partners;
};

// Run the example
async function runExample() {
    logHeader('Spatial Partitioning Example');
    
    // Setup world config
    logStep('1. Creating world configuration');
    const worldConfig = createWorldConfig();
    console.log('World size:', 
                `${worldConfig.worldBounds.max.x - worldConfig.worldBounds.min.x}x` + 
                `${worldConfig.worldBounds.max.y - worldConfig.worldBounds.min.y} units`);
    console.log('Cell size:', worldConfig.cellSize, 'units');
    
    // Initialize spatial system
    logStep('2. Initializing spatial partitioning system');
    const spatialSystem = new SpatialPartitioningSystem(worldConfig);
    
    // Generate NPCs
    logStep('3. Generating NPCs');
    const npcCount = 1000;
    console.log(`Generating ${npcCount} NPCs with random positions...`);
    const npcs = generateNPCs(npcCount, worldConfig.worldBounds);
    
    // Add NPCs to spatial system
    logStep('4. Adding NPCs to spatial system');
    for (const { npc, position } of npcs) {
        spatialSystem.addNPC(npc, position);
    }
    
    // Print statistics
    const stats = spatialSystem.getStatistics();
    console.log('\nSpatial system statistics:');
    console.log(`- Total cells: ${stats.totalCells}`);
    console.log(`- Occupied cells: ${stats.occupiedCells} (${stats.occupiedCellsPercentage.toFixed(2)}%)`);
    console.log(`- Total entities: ${stats.totalEntities}`);
    console.log(`- Max entities in a cell: ${stats.maxEntitiesInCell}`);
    console.log(`- Average entities per occupied cell: ${stats.averageEntitiesPerOccupiedCell.toFixed(2)}`);
    
    // Performance comparison: find all interaction partners
    logStep('5. Performance comparison');
    
    // Select a specific interaction type radius
    const interactionType = 'conversation';
    const interactionRadius = worldConfig.interactionTypes.get(interactionType) || 10;
    
    console.log(`Finding all NPCs that can interact with each other (radius: ${interactionRadius} units)`);
    
    // Brute force method (check all NPC pairs)
    console.log('\nWithout spatial partitioning (brute force):');
    const bruteForceTime = measureTime(() => {
        const partners = findInteractionPartnersBruteForce(npcs, interactionRadius);
        let totalPartners = 0;
        partners.forEach(p => totalPartners += p.length);
        console.log(`- Found ${totalPartners} possible interactions`);
        console.log(`- Average interactions per NPC: ${(totalPartners / npcCount).toFixed(2)}`);
    });
    console.log(`- Time taken: ${bruteForceTime.toFixed(2)}ms`);
    
    // Spatial partitioning method
    console.log('\nWith spatial partitioning:');
    const spatialTime = measureTime(() => {
        let totalPartners = 0;
        for (const { npc } of npcs) {
            const partners = spatialSystem.getPotentialNPCInteractionPartners(npc.id, interactionType);
            totalPartners += partners.length;
        }
        console.log(`- Found ${totalPartners} possible interactions`);
        console.log(`- Average interactions per NPC: ${(totalPartners / npcCount).toFixed(2)}`);
    });
    console.log(`- Time taken: ${spatialTime.toFixed(2)}ms`);
    
    // Performance improvement
    const improvement = ((bruteForceTime - spatialTime) / bruteForceTime) * 100;
    console.log(`\nPerformance improvement: ${improvement.toFixed(2)}%`);
    
    // Test position updates
    logStep('6. Testing position updates');
    
    const testNpc = npcs[0].npc;
    const oldPosition = { ...npcs[0].position };
    const newPosition = createRandomPosition(worldConfig.worldBounds);
    
    console.log(`Moving NPC ${testNpc.name} from (${oldPosition.x.toFixed(2)}, ${oldPosition.y.toFixed(2)}) to (${newPosition.x.toFixed(2)}, ${newPosition.y.toFixed(2)})`);
    
    // Get partners before move
    const partnersBefore = spatialSystem.getPotentialNPCInteractionPartners(testNpc.id, interactionType);
    console.log(`Partners before move: ${partnersBefore.length}`);
    
    // Update position
    spatialSystem.updateEntityPosition(testNpc.id, newPosition);
    
    // Get partners after move
    const partnersAfter = spatialSystem.getPotentialNPCInteractionPartners(testNpc.id, interactionType);
    console.log(`Partners after move: ${partnersAfter.length}`);
    
    // Summary
    logStep('Summary');
    console.log('The Spatial Partitioning system significantly improves performance by:');
    console.log('1. Reducing the number of distance calculations needed');
    console.log('2. Only checking NPCs in the same or adjacent cells');
    console.log('3. Efficiently handling position updates with cell transitions');
    console.log('\nThis optimization is crucial for:');
    console.log('- Large numbers of NPCs in the game world');
    console.log('- Frequently updating social interactions');
    console.log('- Dynamic movement and behavior systems');
}

// If this file is run directly, execute the example
if (require.main === module) {
    runExample()
        .then(() => console.log('\nExample completed successfully'))
        .catch(err => console.error('Error running example:', err));
} 