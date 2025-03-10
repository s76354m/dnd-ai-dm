/**
 * Example demonstrating the Memory Optimization system
 * 
 * This example shows how the Memory Optimization system:
 * 1. Reduces memory usage through object pooling
 * 2. Compresses historical data based on age and importance
 * 3. Enforces retention policies to limit object counts
 * 4. Improves performance for large NPC populations
 */

import { MemoryOptimizationSystem } from '../ai/npc/optimization/memory-optimization';
import { NPC } from '../character/npc';
import { Memory, MemoryImportance } from '../types/memory-types';
import { Emotion, Relationship } from '../types/npc-types';

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

// Utility to measure memory usage
const getMemoryUsage = (): { heapUsed: number, heapTotal: number } => {
    const memUsage = process.memoryUsage();
    return {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100 // MB
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

// Generate a set of NPCs
const generateNPCs = (count: number): NPC[] => {
    const npcs: NPC[] = [];
    
    for (let i = 0; i < count; i++) {
        const npcId = `npc-${i+1}`;
        const npcName = `NPC ${i+1}`;
        const npc = createNPC(npcId, npcName);
        npcs.push(npc);
    }
    
    return npcs;
};

// Generate a random memory content
const generateMemoryContent = (length: number = 100): string => {
    const text = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
    
    if (length <= text.length) {
        return text.substr(0, length);
    }
    
    // For longer contents, repeat the text
    let result = '';
    while (result.length < length) {
        result += text;
    }
    
    return result.substr(0, length);
};

// Generate memory importance
const generateMemoryImportance = (): MemoryImportance => {
    const rand = Math.random();
    if (rand < 0.1) {
        return MemoryImportance.CRITICAL;
    } else if (rand < 0.3) {
        return MemoryImportance.HIGH;
    } else if (rand < 0.6) {
        return MemoryImportance.MODERATE;
    } else {
        return MemoryImportance.LOW;
    }
};

// Generate memories for NPC without optimization
const generateUnoptimizedMemories = (npc: NPC, count: number): void => {
    for (let i = 0; i < count; i++) {
        const memoryContent = generateMemoryContent(200 + Math.floor(Math.random() * 300));
        const importance = generateMemoryImportance();
        
        const memory: Memory = {
            id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content: memoryContent,
            importanceLevel: importance,
            createdAt: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // Up to 7 days old
            lastRecalledAt: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000), // Up to 1 day ago
            recallCount: Math.floor(Math.random() * 10),
            npcId: npc.id,
            tags: ["example", "unoptimized"],
            relatedEntityIds: [],
            isDecayed: false
        };
        
        npc.memories.push(memory);
    }
};

// Generate emotions for NPC without optimization
const generateUnoptimizedEmotions = (npc: NPC, count: number): void => {
    const emotionTypes = ["joy", "sadness", "anger", "fear", "disgust", "surprise", "trust", "anticipation"];
    
    for (let i = 0; i < count; i++) {
        const emotion: Emotion = {
            type: emotionTypes[Math.floor(Math.random() * emotionTypes.length)],
            intensity: 0.1 + Math.random() * 0.9,
            source: `source_${Math.floor(Math.random() * 100)}`,
            createdAt: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000), // Up to 1 day old
            duration: Math.floor(Math.random() * 60 * 60 * 1000) // Up to 1 hour
        };
        
        npc.emotions.push(emotion);
    }
};

// Generate relationships for NPC without optimization
const generateUnoptimizedRelationships = (npc: NPC, count: number, allNpcs: NPC[]): void => {
    const otherNpcs = allNpcs.filter(n => n.id !== npc.id);
    
    for (let i = 0; i < Math.min(count, otherNpcs.length); i++) {
        const targetNpc = otherNpcs[i];
        
        const relationship: Relationship = {
            targetId: targetNpc.id,
            affinity: -1 + Math.random() * 2, // -1 to 1
            trust: -1 + Math.random() * 2,    // -1 to 1
            familiarity: Math.random(),       // 0 to 1
            lastInteractionTime: Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000), // Up to 7 days ago
            interactionCount: Math.floor(Math.random() * 50),
            tags: []
        };
        
        npc.relationships.set(targetNpc.id, relationship);
    }
};

// Run the example
async function runExample() {
    logHeader('Memory Optimization Example');
    
    // Initialize memory optimization system
    logStep('1. Initializing Memory Optimization System');
    const memoryOptSystem = new MemoryOptimizationSystem(
        MemoryOptimizationSystem.createDefaultConfig()
    );
    
    console.log('Default configuration:');
    console.log('- Memory pool size:', memoryOptSystem.getStatistics().memoryPoolMaxSize);
    console.log('- Emotion pool size:', memoryOptSystem.getStatistics().emotionPoolMaxSize);
    console.log('- Relationship pool size:', memoryOptSystem.getStatistics().relationshipPoolMaxSize);
    
    // Create NPCs
    const npcCount = 200;
    logStep(`2. Creating ${npcCount} NPCs`);
    const npcs = generateNPCs(npcCount);
    console.log(`Created ${npcs.length} NPCs`);
    
    // Initial memory usage
    const initialMemory = getMemoryUsage();
    console.log('Initial memory usage:', initialMemory.heapUsed, 'MB');
    
    // Generate data without optimization
    logStep('3. Generating data without optimization');
    
    console.log('Generating memories, emotions, and relationships for half of the NPCs...');
    const unoptimizedNpcs = npcs.slice(0, Math.floor(npcCount / 2));
    
    console.log(`Generating data for ${unoptimizedNpcs.length} unoptimized NPCs...`);
    
    for (const npc of unoptimizedNpcs) {
        // Each NPC gets 100 memories, 20 emotions, and 50 relationships
        generateUnoptimizedMemories(npc, 100);
        generateUnoptimizedEmotions(npc, 20);
        generateUnoptimizedRelationships(npc, 50, npcs);
    }
    
    // Memory usage after unoptimized generation
    const afterUnoptimizedMemory = getMemoryUsage();
    console.log('Memory usage after unoptimized generation:', afterUnoptimizedMemory.heapUsed, 'MB');
    console.log('Increase:', afterUnoptimizedMemory.heapUsed - initialMemory.heapUsed, 'MB');
    
    // Average memory per unoptimized NPC
    const memoryPerUnoptimizedNpc = (afterUnoptimizedMemory.heapUsed - initialMemory.heapUsed) / unoptimizedNpcs.length;
    console.log('Average memory per unoptimized NPC:', memoryPerUnoptimizedNpc.toFixed(2), 'MB');
    
    // Generate data with optimization
    logStep('4. Generating data with optimization');
    
    console.log('Generating memories, emotions, and relationships for the other half of NPCs using object pools...');
    const optimizedNpcs = npcs.slice(Math.floor(npcCount / 2));
    
    console.log(`Generating data for ${optimizedNpcs.length} optimized NPCs...`);
    
    // Enable optimization for these NPCs
    for (const npc of optimizedNpcs) {
        memoryOptSystem.enableForNPC(npc);
    }
    
    // Generate data using pooled objects
    for (const npc of optimizedNpcs) {
        // Each NPC gets 100 memories, 20 emotions, and 50 relationships
        for (let i = 0; i < 100; i++) {
            const memoryContent = generateMemoryContent(200 + Math.floor(Math.random() * 300));
            const importance = generateMemoryImportance();
            
            const memory = memoryOptSystem.createMemory(
                memoryContent,
                importance,
                npc.id,
                ["example", "optimized"],
                []
            );
            
            npc.memories.push(memory);
        }
        
        const emotionTypes = ["joy", "sadness", "anger", "fear", "disgust", "surprise", "trust", "anticipation"];
        for (let i = 0; i < 20; i++) {
            const emotion = memoryOptSystem.createEmotion(
                emotionTypes[Math.floor(Math.random() * emotionTypes.length)],
                0.1 + Math.random() * 0.9,
                `source_${Math.floor(Math.random() * 100)}`,
                npc.id
            );
            
            npc.emotions.push(emotion);
        }
        
        const otherNpcs = npcs.filter(n => n.id !== npc.id);
        for (let i = 0; i < Math.min(50, otherNpcs.length); i++) {
            const targetNpc = otherNpcs[i];
            
            const relationship = memoryOptSystem.createRelationship(
                targetNpc.id,
                -1 + Math.random() * 2, // -1 to 1
                -1 + Math.random() * 2, // -1 to 1
                Math.random()           // 0 to 1
            );
            
            npc.relationships.set(targetNpc.id, relationship);
        }
    }
    
    // Memory usage after optimized generation
    const afterOptimizedMemory = getMemoryUsage();
    console.log('Memory usage after optimized generation:', afterOptimizedMemory.heapUsed, 'MB');
    
    // Calculate the increase from the optimized NPCs only
    const optimizedIncrease = afterOptimizedMemory.heapUsed - afterUnoptimizedMemory.heapUsed;
    console.log('Increase from optimized NPCs:', optimizedIncrease, 'MB');
    
    // Average memory per optimized NPC
    const memoryPerOptimizedNpc = optimizedIncrease / optimizedNpcs.length;
    console.log('Average memory per optimized NPC:', memoryPerOptimizedNpc.toFixed(2), 'MB');
    
    // Memory saving percentage
    const memorySaving = (1 - (memoryPerOptimizedNpc / memoryPerUnoptimizedNpc)) * 100;
    console.log('Memory saving per NPC:', memorySaving.toFixed(2), '%');
    
    // Print object pool statistics
    const poolStats = memoryOptSystem.getStatistics();
    console.log('\nObject pool statistics:');
    console.log(`- Memory pool: ${poolStats.memoryPoolSize}/${poolStats.memoryPoolMaxSize}`);
    console.log(`- Emotion pool: ${poolStats.emotionPoolSize}/${poolStats.emotionPoolMaxSize}`);
    console.log(`- Relationship pool: ${poolStats.relationshipPoolSize}/${poolStats.relationshipPoolMaxSize}`);
    console.log(`- Compressed memories: ${poolStats.totalCompressedMemories}`);
    
    // Run compression
    logStep('5. Testing memory compression');
    console.log('Running maintenance cycle to compress old memories...');
    
    // Set some memories to be older to trigger compression
    for (const npc of optimizedNpcs) {
        if (npc.memories.length > 0) {
            // Set 80% of memories to be "old"
            const oldCount = Math.floor(npc.memories.length * 0.8);
            for (let i = 0; i < oldCount; i++) {
                // Set creation time to be 2 hours ago
                npc.memories[i].createdAt = Date.now() - (2 * 60 * 60 * 1000);
            }
        }
    }
    
    // Run the maintenance cycle
    memoryOptSystem.runMaintenanceCycle(optimizedNpcs);
    
    // Print compression results
    const afterCompressionStats = memoryOptSystem.getStatistics();
    console.log('\nAfter compression:');
    console.log(`- Total compressed memories: ${afterCompressionStats.totalCompressedMemories}`);
    console.log(`- Total optimized NPCs: ${afterCompressionStats.optimizedNPCCount}`);
    
    // Check memory counts for a sample NPC
    if (optimizedNpcs.length > 0) {
        const sampleNpc = optimizedNpcs[0];
        console.log(`\nSample NPC (${sampleNpc.name}):`)
        console.log(`- Uncompressed memories: ${sampleNpc.memories.length}`);
        console.log(`- Compressed memories: ${memoryOptSystem.getAllCompressedMemories(sampleNpc.id).length}`);
        console.log(`- Total memories: ${sampleNpc.memories.length + memoryOptSystem.getAllCompressedMemories(sampleNpc.id).length}`);
    }
    
    // Memory usage after compression
    const afterCompressionMemory = getMemoryUsage();
    console.log('\nMemory usage after compression:', afterCompressionMemory.heapUsed, 'MB');
    console.log('Change after compression:', afterCompressionMemory.heapUsed - afterOptimizedMemory.heapUsed, 'MB');
    
    // Release objects test
    logStep('6. Testing object release and reuse');
    
    // Select a sample NPC
    const releaseTestNpc = optimizedNpcs[0];
    
    // Count initial objects
    const initialMemoryCount = releaseTestNpc.memories.length;
    const initialEmotionCount = releaseTestNpc.emotions.length;
    const initialRelationshipCount = releaseTestNpc.relationships.size;
    
    console.log('Initial object counts:');
    console.log(`- Memories: ${initialMemoryCount}`);
    console.log(`- Emotions: ${initialEmotionCount}`);
    console.log(`- Relationships: ${initialRelationshipCount}`);
    
    // Get initial pool sizes
    const initialPoolStats = memoryOptSystem.getStatistics();
    
    // Release all memories
    console.log('\nReleasing all memories and emotions...');
    
    // Clone arrays since we'll be modifying them
    const memoriesToRelease = [...releaseTestNpc.memories];
    const emotionsToRelease = [...releaseTestNpc.emotions];
    
    for (const memory of memoriesToRelease) {
        // Remove from NPC
        const index = releaseTestNpc.memories.indexOf(memory);
        if (index !== -1) {
            releaseTestNpc.memories.splice(index, 1);
        }
        
        // Release back to pool
        memoryOptSystem.releaseMemory(memory);
    }
    
    for (const emotion of emotionsToRelease) {
        // Remove from NPC
        const index = releaseTestNpc.emotions.indexOf(emotion);
        if (index !== -1) {
            releaseTestNpc.emotions.splice(index, 1);
        }
        
        // Release back to pool
        memoryOptSystem.releaseEmotion(emotion);
    }
    
    // Check pool sizes after release
    const afterReleaseStats = memoryOptSystem.getStatistics();
    
    console.log('Pool sizes after release:');
    console.log(`- Memory pool: ${initialPoolStats.memoryPoolSize} → ${afterReleaseStats.memoryPoolSize}`);
    console.log(`- Emotion pool: ${initialPoolStats.emotionPoolSize} → ${afterReleaseStats.emotionPoolSize}`);
    
    // Create new objects from pool
    console.log('\nCreating new objects from pool...');
    
    // Create new memories
    for (let i = 0; i < initialMemoryCount; i++) {
        const memory = memoryOptSystem.createMemory(
            `Reused memory ${i+1}`,
            MemoryImportance.LOW,
            releaseTestNpc.id,
            ["example", "reused"],
            []
        );
        
        releaseTestNpc.memories.push(memory);
    }
    
    // Create new emotions
    for (let i = 0; i < initialEmotionCount; i++) {
        const emotion = memoryOptSystem.createEmotion(
            "joy",
            0.5,
            "reuse-test",
            releaseTestNpc.id
        );
        
        releaseTestNpc.emotions.push(emotion);
    }
    
    // Check pool sizes after reuse
    const afterReuseStats = memoryOptSystem.getStatistics();
    
    console.log('Pool sizes after reuse:');
    console.log(`- Memory pool: ${afterReleaseStats.memoryPoolSize} → ${afterReuseStats.memoryPoolSize}`);
    console.log(`- Emotion pool: ${afterReleaseStats.emotionPoolSize} → ${afterReuseStats.emotionPoolSize}`);
    
    // Summary
    logStep('Summary');
    console.log('The Memory Optimization system provides these benefits:');
    console.log(`1. Memory usage reduction: ~${memorySaving.toFixed(0)}% per NPC through object pooling`);
    console.log('2. Automatic compression of old and less important memories');
    console.log('3. Enforced retention policies to prevent unbounded growth');
    console.log('4. Efficient object reuse through pooling');
    console.log('\nThis optimization is crucial for:');
    console.log('- Games with large numbers of NPCs');
    console.log('- Long-running campaigns with extensive history');
    console.log('- Memory-constrained environments');
}

// If this file is run directly, execute the example
if (require.main === module) {
    runExample()
        .then(() => console.log('\nExample completed successfully'))
        .catch(err => console.error('Error running example:', err));
} 