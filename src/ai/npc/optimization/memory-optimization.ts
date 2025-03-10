/**
 * Memory Optimization System
 * 
 * This system implements various strategies to reduce memory usage, particularly for
 * large NPC populations and extensive historical data.
 * 
 * Key features:
 * - Object pooling for frequently created/destroyed objects
 * - Compressed historical data storage
 * - Memory-efficient data structures
 * - Configurable detail levels for different NPCs
 */

import { NPC } from '../../../character/npc';
import { Memory, MemoryImportance } from '../../../types/memory-types';
import { Emotion, Relationship, Behavior } from '../../../types/npc-types';

/**
 * Configuration options for memory optimization
 */
export interface MemoryOptimizationConfig {
    // Object pool sizes
    memoryPoolSize: number;
    emotionPoolSize: number;
    relationshipPoolSize: number;
    behaviorPoolSize: number;
    
    // Memory compression options
    compressMemoriesOlderThan: number; // Time in ms
    minImportanceForFullStorage: MemoryImportance;
    maxUncompressedMemoriesPerNPC: number;
    
    // Retention policies
    maxMemoriesPerNPC: number;
    maxEmotionsPerNPC: number;
    maxRelationshipsPerNPC: number;
}

/**
 * A compressed version of a memory object that uses less space
 */
export interface CompressedMemory {
    id: string;
    importanceLevel: MemoryImportance;
    createdAt: number;
    summary: string; // Condensed version of the memory content
    tags: string[];
    entityIds: string[]; // IDs of related entities
}

/**
 * A pool of reusable objects to prevent frequent allocation/deallocation
 */
export class ObjectPool<T> {
    private pool: T[] = [];
    private createFn: () => T;
    private resetFn: (obj: T) => void;
    private maxSize: number;
    
    constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize: number, maxSize: number) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }
    
    /**
     * Get an object from the pool, or create a new one if pool is empty
     */
    public acquire(): T {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return this.createFn();
    }
    
    /**
     * Return an object to the pool for reuse
     */
    public release(obj: T): void {
        this.resetFn(obj);
        if (this.pool.length < this.maxSize) {
            this.pool.push(obj);
        }
    }
    
    /**
     * Get the current size of the pool
     */
    public size(): number {
        return this.pool.length;
    }
    
    /**
     * Get the maximum size of the pool
     */
    public getMaxSize(): number {
        return this.maxSize;
    }
}

/**
 * Main class implementing memory optimization strategies
 */
export class MemoryOptimizationSystem {
    private config: MemoryOptimizationConfig;
    
    // Object pools for frequently used objects
    private memoryPool: ObjectPool<Memory>;
    private emotionPool: ObjectPool<Emotion>;
    private relationshipPool: ObjectPool<Relationship>;
    private behaviorPool: ObjectPool<Behavior>;
    
    // Maps to store compressed memories
    private compressedMemories: Map<string, Map<string, CompressedMemory>> = new Map();
    
    // Tracking which NPCs have memory optimization enabled
    private optimizedNPCs: Set<string> = new Set();
    
    constructor(config: MemoryOptimizationConfig) {
        this.config = config;
        
        // Initialize object pools
        this.memoryPool = new ObjectPool<Memory>(
            () => this.createDefaultMemory(),
            (obj) => this.resetMemory(obj),
            Math.min(50, config.memoryPoolSize), // Initial size
            config.memoryPoolSize
        );
        
        this.emotionPool = new ObjectPool<Emotion>(
            () => this.createDefaultEmotion(),
            (obj) => this.resetEmotion(obj),
            Math.min(50, config.emotionPoolSize),
            config.emotionPoolSize
        );
        
        this.relationshipPool = new ObjectPool<Relationship>(
            () => this.createDefaultRelationship(),
            (obj) => this.resetRelationship(obj),
            Math.min(50, config.relationshipPoolSize),
            config.relationshipPoolSize
        );
        
        this.behaviorPool = new ObjectPool<Behavior>(
            () => this.createDefaultBehavior(),
            (obj) => this.resetBehavior(obj),
            Math.min(50, config.behaviorPoolSize),
            config.behaviorPoolSize
        );
    }
    
    /**
     * Enable memory optimization for an NPC
     * @param npc The NPC to optimize
     */
    public enableForNPC(npc: NPC): void {
        if (this.optimizedNPCs.has(npc.id)) {
            return; // Already optimized
        }
        
        // Compress existing memories if needed
        this.compressOldMemories(npc);
        
        // Apply retention policies
        this.applyRetentionPolicies(npc);
        
        // Mark NPC as optimized
        this.optimizedNPCs.add(npc.id);
    }
    
    /**
     * Disable memory optimization for an NPC
     * @param npc The NPC to disable optimization for
     */
    public disableForNPC(npc: NPC): void {
        if (!this.optimizedNPCs.has(npc.id)) {
            return; // Not optimized
        }
        
        // Uncompress all memories
        this.uncompressAllMemories(npc);
        
        // Remove from optimized set
        this.optimizedNPCs.delete(npc.id);
    }
    
    /**
     * Create a new memory using the memory pool
     */
    public createMemory(
        content: string,
        importance: MemoryImportance,
        npcId: string,
        tags: string[] = [],
        relatedEntityIds: string[] = []
    ): Memory {
        // Get memory from pool
        const memory = this.memoryPool.acquire();
        
        // Set properties
        memory.id = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        memory.content = content;
        memory.importanceLevel = importance;
        memory.createdAt = Date.now();
        memory.lastRecalledAt = Date.now();
        memory.recallCount = 0;
        memory.npcId = npcId;
        memory.tags = [...tags];
        memory.relatedEntityIds = [...relatedEntityIds];
        memory.isDecayed = false;
        
        // If NPC is optimized, compress low importance memories immediately
        if (this.optimizedNPCs.has(npcId) && 
            importance < this.config.minImportanceForFullStorage) {
            return this.compressAndStoreMemory(memory);
        }
        
        return memory;
    }
    
    /**
     * Create a new emotion using the emotion pool
     */
    public createEmotion(type: string, intensity: number, source: string, npcId: string): Emotion {
        // Get emotion from pool
        const emotion = this.emotionPool.acquire();
        
        // Set properties
        emotion.type = type;
        emotion.intensity = intensity;
        emotion.source = source;
        emotion.createdAt = Date.now();
        emotion.duration = 0;
        
        return emotion;
    }
    
    /**
     * Create a new relationship using the relationship pool
     */
    public createRelationship(
        targetId: string,
        affinity: number,
        trust: number,
        familiarity: number
    ): Relationship {
        // Get relationship from pool
        const relationship = this.relationshipPool.acquire();
        
        // Set properties
        relationship.targetId = targetId;
        relationship.affinity = affinity;
        relationship.trust = trust;
        relationship.familiarity = familiarity;
        relationship.lastInteractionTime = Date.now();
        relationship.interactionCount = 0;
        relationship.tags = [];
        
        return relationship;
    }
    
    /**
     * Create a new behavior using the behavior pool
     */
    public createBehavior(
        id: string,
        name: string,
        category: string,
        priority: number
    ): Behavior {
        // Get behavior from pool
        const behavior = this.behaviorPool.acquire();
        
        // Set properties
        behavior.id = id;
        behavior.name = name;
        behavior.category = category;
        behavior.priority = priority;
        behavior.requiredResources = [];
        behavior.constraints = [];
        behavior.metadata = {};
        
        return behavior;
    }
    
    /**
     * Release a memory back to the pool
     */
    public releaseMemory(memory: Memory): void {
        this.memoryPool.release(memory);
    }
    
    /**
     * Release an emotion back to the pool
     */
    public releaseEmotion(emotion: Emotion): void {
        this.emotionPool.release(emotion);
    }
    
    /**
     * Release a relationship back to the pool
     */
    public releaseRelationship(relationship: Relationship): void {
        this.relationshipPool.release(relationship);
    }
    
    /**
     * Release a behavior back to the pool
     */
    public releaseBehavior(behavior: Behavior): void {
        this.behaviorPool.release(behavior);
    }
    
    /**
     * Get a compressed memory by ID
     */
    public getCompressedMemory(npcId: string, memoryId: string): CompressedMemory | undefined {
        const npcMemories = this.compressedMemories.get(npcId);
        if (npcMemories) {
            return npcMemories.get(memoryId);
        }
        return undefined;
    }
    
    /**
     * Get all compressed memories for an NPC
     */
    public getAllCompressedMemories(npcId: string): CompressedMemory[] {
        const npcMemories = this.compressedMemories.get(npcId);
        if (npcMemories) {
            return Array.from(npcMemories.values());
        }
        return [];
    }
    
    /**
     * Expand a compressed memory to a full memory (temporary, not from pool)
     */
    public expandCompressedMemory(compressedMemory: CompressedMemory): Memory {
        return {
            id: compressedMemory.id,
            content: `Compressed: ${compressedMemory.summary}`,
            importanceLevel: compressedMemory.importanceLevel,
            createdAt: compressedMemory.createdAt,
            lastRecalledAt: Date.now(),
            recallCount: 0,
            npcId: "",  // Must be set by caller
            tags: [...compressedMemory.tags],
            relatedEntityIds: [...compressedMemory.entityIds],
            isDecayed: true
        };
    }
    
    /**
     * Get memory optimization statistics
     */
    public getStatistics(): any {
        let totalCompressedMemories = 0;
        this.compressedMemories.forEach(npcMemories => {
            totalCompressedMemories += npcMemories.size;
        });
        
        return {
            optimizedNPCCount: this.optimizedNPCs.size,
            memoryPoolSize: this.memoryPool.size(),
            memoryPoolMaxSize: this.memoryPool.getMaxSize(),
            emotionPoolSize: this.emotionPool.size(),
            emotionPoolMaxSize: this.emotionPool.getMaxSize(),
            relationshipPoolSize: this.relationshipPool.size(),
            relationshipPoolMaxSize: this.relationshipPool.getMaxSize(),
            behaviorPoolSize: this.behaviorPool.size(),
            behaviorPoolMaxSize: this.behaviorPool.getMaxSize(),
            totalCompressedMemories
        };
    }
    
    /**
     * Run a maintenance cycle to optimize memory usage
     * @param npcs NPCs to process in this cycle
     */
    public runMaintenanceCycle(npcs: NPC[]): void {
        for (const npc of npcs) {
            if (this.optimizedNPCs.has(npc.id)) {
                // Compress old memories
                this.compressOldMemories(npc);
                
                // Apply retention policies
                this.applyRetentionPolicies(npc);
            }
        }
    }
    
    /**
     * Compress old memories for an NPC
     */
    private compressOldMemories(npc: NPC): void {
        const now = Date.now();
        const threshold = this.config.compressMemoriesOlderThan;
        const minImportance = this.config.minImportanceForFullStorage;
        
        // Track how many memories we keep uncompressed
        let uncompressedCount = 0;
        const memoriesToCompress: Memory[] = [];
        
        // Find memories to compress (old or low importance)
        for (const memory of npc.memories) {
            const age = now - memory.createdAt;
            
            if (
                (age > threshold || memory.importanceLevel < minImportance) &&
                uncompressedCount >= this.config.maxUncompressedMemoriesPerNPC
            ) {
                memoriesToCompress.push(memory);
            } else {
                uncompressedCount++;
            }
        }
        
        // Compress selected memories
        for (const memory of memoriesToCompress) {
            // Remove from NPC's memory array
            const index = npc.memories.indexOf(memory);
            if (index !== -1) {
                npc.memories.splice(index, 1);
                
                // Compress and store
                this.compressAndStoreMemory(memory);
                
                // Release original memory back to pool
                this.releaseMemory(memory);
            }
        }
    }
    
    /**
     * Apply retention policies to limit the number of objects per NPC
     */
    private applyRetentionPolicies(npc: NPC): void {
        // Limit memories
        if (npc.memories.length > this.config.maxMemoriesPerNPC) {
            // Sort by importance and recency
            npc.memories.sort((a, b) => {
                // First compare by importance
                if (a.importanceLevel !== b.importanceLevel) {
                    return b.importanceLevel - a.importanceLevel;
                }
                // Then by recency
                return b.lastRecalledAt - a.lastRecalledAt;
            });
            
            // Remove excess memories
            const excessMemories = npc.memories.splice(this.config.maxMemoriesPerNPC);
            
            // Compress important excess memories, discard others
            for (const memory of excessMemories) {
                if (memory.importanceLevel >= MemoryImportance.MODERATE) {
                    this.compressAndStoreMemory(memory);
                }
                this.releaseMemory(memory);
            }
        }
        
        // Limit emotions
        if (npc.emotions.length > this.config.maxEmotionsPerNPC) {
            // Sort by intensity and recency
            npc.emotions.sort((a, b) => {
                // First by intensity
                if (a.intensity !== b.intensity) {
                    return b.intensity - a.intensity;
                }
                // Then by recency
                return b.createdAt - a.createdAt;
            });
            
            // Remove excess emotions
            const excessEmotions = npc.emotions.splice(this.config.maxEmotionsPerNPC);
            
            // Release emotions back to pool
            for (const emotion of excessEmotions) {
                this.releaseEmotion(emotion);
            }
        }
        
        // Limit relationships
        if (npc.relationships.size > this.config.maxRelationshipsPerNPC) {
            // Convert to array for sorting
            const relationships = Array.from(npc.relationships.entries());
            
            // Sort by interaction recency
            relationships.sort((a, b) => b[1].lastInteractionTime - a[1].lastInteractionTime);
            
            // Keep only the most recent relationships
            const newRelationships = new Map<string, Relationship>();
            for (let i = 0; i < this.config.maxRelationshipsPerNPC; i++) {
                if (i < relationships.length) {
                    newRelationships.set(relationships[i][0], relationships[i][1]);
                }
            }
            
            // Release excess relationships
            for (let i = this.config.maxRelationshipsPerNPC; i < relationships.length; i++) {
                this.releaseRelationship(relationships[i][1]);
            }
            
            // Replace the NPC's relationships map
            npc.relationships = newRelationships;
        }
    }
    
    /**
     * Compress a memory and store it in the compressed storage
     */
    private compressAndStoreMemory(memory: Memory): Memory {
        // Create compressed version
        const compressed: CompressedMemory = {
            id: memory.id,
            importanceLevel: memory.importanceLevel,
            createdAt: memory.createdAt,
            summary: this.generateMemorySummary(memory.content),
            tags: [...memory.tags],
            entityIds: [...memory.relatedEntityIds]
        };
        
        // Store in compressed memories map
        if (!this.compressedMemories.has(memory.npcId)) {
            this.compressedMemories.set(memory.npcId, new Map<string, CompressedMemory>());
        }
        
        this.compressedMemories.get(memory.npcId)?.set(memory.id, compressed);
        
        // Return the original memory (possibly for continued use before release)
        return memory;
    }
    
    /**
     * Uncompress all memories for an NPC
     */
    private uncompressAllMemories(npc: NPC): void {
        const compressedNPCMemories = this.compressedMemories.get(npc.id);
        if (!compressedNPCMemories) {
            return;
        }
        
        // Expand compressed memories and add to NPC
        for (const compressed of compressedNPCMemories.values()) {
            const memory = this.expandCompressedMemory(compressed);
            memory.npcId = npc.id;
            npc.memories.push(memory);
        }
        
        // Remove from compressed storage
        this.compressedMemories.delete(npc.id);
    }
    
    /**
     * Generate a summary of memory content for compression
     */
    private generateMemorySummary(content: string): string {
        if (content.length <= 100) {
            return content;
        }
        
        // Simple summarization: truncate and add ellipsis
        return content.substring(0, 97) + '...';
    }
    
    /**
     * Create a default memory object
     */
    private createDefaultMemory(): Memory {
        return {
            id: '',
            content: '',
            importanceLevel: MemoryImportance.LOW,
            createdAt: 0,
            lastRecalledAt: 0,
            recallCount: 0,
            npcId: '',
            tags: [],
            relatedEntityIds: [],
            isDecayed: false
        };
    }
    
    /**
     * Reset a memory object for reuse
     */
    private resetMemory(memory: Memory): void {
        memory.id = '';
        memory.content = '';
        memory.importanceLevel = MemoryImportance.LOW;
        memory.createdAt = 0;
        memory.lastRecalledAt = 0;
        memory.recallCount = 0;
        memory.npcId = '';
        memory.tags = [];
        memory.relatedEntityIds = [];
        memory.isDecayed = false;
    }
    
    /**
     * Create a default emotion object
     */
    private createDefaultEmotion(): Emotion {
        return {
            type: '',
            intensity: 0,
            source: '',
            createdAt: 0,
            duration: 0
        };
    }
    
    /**
     * Reset an emotion object for reuse
     */
    private resetEmotion(emotion: Emotion): void {
        emotion.type = '';
        emotion.intensity = 0;
        emotion.source = '';
        emotion.createdAt = 0;
        emotion.duration = 0;
    }
    
    /**
     * Create a default relationship object
     */
    private createDefaultRelationship(): Relationship {
        return {
            targetId: '',
            affinity: 0,
            trust: 0,
            familiarity: 0,
            lastInteractionTime: 0,
            interactionCount: 0,
            tags: []
        };
    }
    
    /**
     * Reset a relationship object for reuse
     */
    private resetRelationship(relationship: Relationship): void {
        relationship.targetId = '';
        relationship.affinity = 0;
        relationship.trust = 0;
        relationship.familiarity = 0;
        relationship.lastInteractionTime = 0;
        relationship.interactionCount = 0;
        relationship.tags = [];
    }
    
    /**
     * Create a default behavior object
     */
    private createDefaultBehavior(): Behavior {
        return {
            id: '',
            name: '',
            category: '',
            priority: 0,
            requiredResources: [],
            constraints: [],
            metadata: {}
        };
    }
    
    /**
     * Reset a behavior object for reuse
     */
    private resetBehavior(behavior: Behavior): void {
        behavior.id = '';
        behavior.name = '';
        behavior.category = '';
        behavior.priority = 0;
        behavior.requiredResources = [];
        behavior.constraints = [];
        behavior.metadata = {};
    }
    
    /**
     * Create a default configuration
     */
    public static createDefaultConfig(): MemoryOptimizationConfig {
        return {
            memoryPoolSize: 1000,
            emotionPoolSize: 500,
            relationshipPoolSize: 500,
            behaviorPoolSize: 300,
            compressMemoriesOlderThan: 3600000, // 1 hour
            minImportanceForFullStorage: MemoryImportance.MODERATE,
            maxUncompressedMemoriesPerNPC: 50,
            maxMemoriesPerNPC: 100,
            maxEmotionsPerNPC: 10,
            maxRelationshipsPerNPC: 50
        };
    }
} 