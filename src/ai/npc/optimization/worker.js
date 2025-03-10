/**
 * Worker Thread Implementation for Parallel Processing
 * 
 * This worker script handles NPC and world update tasks in a separate thread,
 * allowing the main application to distribute workloads across multiple CPU cores.
 * 
 * The worker receives tasks via the message event, processes them, and returns
 * results back to the main thread.
 */

const { parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');

// Import task type enum locally to match the main thread
const TaskType = {
    NPC_UPDATE: 'npc_update',
    BATCH_MEMORY_DECAY: 'batch_memory_decay',
    BATCH_EMOTION_UPDATE: 'batch_emotion_update',
    BATCH_RELATIONSHIP_UPDATE: 'batch_relationship_update',
    WORLD_PARTITION_UPDATE: 'world_partition_update'
};

// Worker initialization
const workerId = workerData.workerId;
console.log(`Worker ${workerId} initialized`);

// Listen for messages from the main thread
parentPort.on('message', async (message) => {
    const { task } = message;
    
    if (!task || !task.id || !task.type) {
        sendErrorResult(null, 'Invalid task format');
        return;
    }
    
    // Process the task
    try {
        const startTime = performance.now();
        const result = await processTask(task);
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        // Send successful result
        sendSuccessResult(task.id, result, processingTime);
    } catch (error) {
        sendErrorResult(task.id, error.message || 'Unknown error in worker');
    }
});

/**
 * Process a task based on its type
 * @param {Object} task The task to process
 * @returns {Promise<any>} The result of the task
 */
async function processTask(task) {
    switch (task.type) {
        case TaskType.NPC_UPDATE:
            return processNPCUpdate(task.data);
            
        case TaskType.BATCH_MEMORY_DECAY:
            return processMemoryDecay(task.data);
            
        case TaskType.BATCH_EMOTION_UPDATE:
            return processEmotionUpdate(task.data);
            
        case TaskType.BATCH_RELATIONSHIP_UPDATE:
            return processRelationshipUpdate(task.data);
            
        case TaskType.WORLD_PARTITION_UPDATE:
            return processWorldPartitionUpdate(task.data);
            
        default:
            throw new Error(`Unknown task type: ${task.type}`);
    }
}

/**
 * Process an NPC update task
 * @param {Object} data Task data containing NPC and update parameters
 * @returns {Object} Updated NPC
 */
async function processNPCUpdate(data) {
    // Check if we're processing a single NPC or a batch
    if (data.npc) {
        // Single NPC update
        const npc = deserializeNPC(data.npc);
        const detailLevel = data.detailLevel;
        
        // Update NPC based on detail level
        switch (detailLevel) {
            case 'HIGH':
                // Full update: update all aspects of the NPC
                updateNeeds(npc);
                updateEmotions(npc);
                updateRelationships(npc);
                updateGoals(npc);
                updateMemories(npc);
                updateBehaviors(npc);
                break;
                
            case 'MEDIUM':
                // Medium update: update core aspects only
                updateNeeds(npc);
                updateEmotions(npc);
                updateGoals(npc);
                break;
                
            case 'LOW':
                // Low update: minimal updates
                updateNeeds(npc);
                break;
        }
        
        return serializeNPC(npc);
    } else if (data.npcs) {
        // Batch update
        const updatedNpcs = [];
        
        for (const npcData of data.npcs) {
            const npc = deserializeNPC(npcData);
            const detailLevel = data.detailLevel;
            
            // Same logic as above but for each NPC in batch
            switch (detailLevel) {
                case 'HIGH':
                    updateNeeds(npc);
                    updateEmotions(npc);
                    updateRelationships(npc);
                    updateGoals(npc);
                    updateMemories(npc);
                    updateBehaviors(npc);
                    break;
                    
                case 'MEDIUM':
                    updateNeeds(npc);
                    updateEmotions(npc);
                    updateGoals(npc);
                    break;
                    
                case 'LOW':
                    updateNeeds(npc);
                    break;
            }
            
            updatedNpcs.push(serializeNPC(npc));
        }
        
        return updatedNpcs;
    }
    
    throw new Error('Invalid NPC update data format');
}

/**
 * Process memory decay for a batch of NPCs
 * @param {Object} data Task data with NPCs and decay factor
 * @returns {Array} Updated NPCs
 */
async function processMemoryDecay(data) {
    const { npcs, decayFactor } = data;
    const updatedNpcs = [];
    
    for (const npcData of npcs) {
        const npc = deserializeNPC(npcData);
        
        // Apply memory decay to each memory
        if (npc.memories && Array.isArray(npc.memories)) {
            for (const memory of npc.memories) {
                // Decay memory strength based on emotional significance and time
                if (memory.strength !== undefined) {
                    // More significant memories decay slower
                    const decayRate = decayFactor * (1 - (memory.emotionalSignificance || 0) * 0.5);
                    memory.strength = Math.max(0, memory.strength - decayRate);
                }
            }
            
            // Remove memories that have decayed completely
            npc.memories = npc.memories.filter(memory => memory.strength > 0.1);
        }
        
        updatedNpcs.push(serializeNPC(npc));
    }
    
    return updatedNpcs;
}

/**
 * Process emotion updates for a batch of NPCs
 * @param {Object} data Task data with NPCs and time delta
 * @returns {Array} Updated NPCs
 */
async function processEmotionUpdate(data) {
    const { npcs, deltaTime } = data;
    const updatedNpcs = [];
    
    for (const npcData of npcs) {
        const npc = deserializeNPC(npcData);
        
        // Update each emotion's intensity
        if (npc.emotions && Array.isArray(npc.emotions)) {
            for (const emotion of npc.emotions) {
                if (emotion.intensity !== undefined) {
                    // Emotions naturally decay over time
                    // Higher persistence emotions decay slower
                    const decayRate = (deltaTime / 1000) * (1 - (emotion.persistence || 0.5));
                    emotion.intensity = Math.max(0, emotion.intensity - decayRate);
                }
            }
            
            // Remove emotions that have decayed to negligible levels
            npc.emotions = npc.emotions.filter(emotion => emotion.intensity > 0.1);
        }
        
        updatedNpcs.push(serializeNPC(npc));
    }
    
    return updatedNpcs;
}

/**
 * Process relationship updates for a batch of NPCs
 * @param {Object} data Task data with NPCs and social factors
 * @returns {Array} Updated NPCs
 */
async function processRelationshipUpdate(data) {
    const { npcs, socialFactors } = data;
    const updatedNpcs = [];
    
    // Map of NPCs by ID for easy lookup during relationship updates
    const npcMap = new Map();
    const deserializedNpcs = [];
    
    // First pass: deserialize and build lookup map
    for (const npcData of npcs) {
        const npc = deserializeNPC(npcData);
        npcMap.set(npc.id, npc);
        deserializedNpcs.push(npc);
    }
    
    // Second pass: update relationships
    for (const npc of deserializedNpcs) {
        // Process each relationship
        for (const [targetId, relationship] of npc.relationships.entries()) {
            // Skip if target NPC isn't in our batch
            if (!npcMap.has(targetId)) continue;
            
            // Apply social factors to relationship
            if (socialFactors?.factionInfluence && 
                npc.faction && 
                npcMap.get(targetId).faction) {
                
                // Get faction relationships
                const factionRelation = socialFactors.factionRelations?.[npc.faction]?.[npcMap.get(targetId).faction];
                
                if (factionRelation !== undefined) {
                    // Adjust relationship based on faction relations
                    const factionInfluence = socialFactors.factionInfluence;
                    relationship.trust += factionRelation.trustModifier * factionInfluence;
                    relationship.respect += factionRelation.respectModifier * factionInfluence;
                    
                    // Clamp values to valid range
                    relationship.trust = Math.max(-1, Math.min(1, relationship.trust));
                    relationship.respect = Math.max(-1, Math.min(1, relationship.respect));
                }
            }
            
            // Apply other social factors as needed
            if (socialFactors?.recentEvents) {
                for (const event of socialFactors.recentEvents) {
                    if (event.participants.includes(npc.id) && 
                        event.participants.includes(targetId)) {
                        
                        // Apply event's relationship impacts
                        if (event.relationshipImpact) {
                            relationship.trust += event.relationshipImpact.trust || 0;
                            relationship.respect += event.relationshipImpact.respect || 0;
                            
                            // Clamp values
                            relationship.trust = Math.max(-1, Math.min(1, relationship.trust));
                            relationship.respect = Math.max(-1, Math.min(1, relationship.respect));
                        }
                    }
                }
            }
        }
        
        updatedNpcs.push(serializeNPC(npc));
    }
    
    return updatedNpcs;
}

/**
 * Process a world partition update
 * @param {Object} data Partition data and entities
 * @returns {Object} Updated partition data
 */
async function processWorldPartitionUpdate(data) {
    const { partitionId, entities } = data;
    
    // Process interactions between entities in this partition
    const updatedEntities = [];
    
    for (const entity of entities) {
        if (entity.type === 'npc') {
            // For NPCs, update based on environment and other entities
            const npc = deserializeNPC(entity);
            
            // Update NPC based on environmental factors in this partition
            updateNPCFromEnvironment(npc, data);
            
            // Check for interactions with other entities
            for (const otherEntity of entities) {
                if (otherEntity.id !== entity.id) {
                    processInteraction(npc, otherEntity);
                }
            }
            
            updatedEntities.push(serializeNPC(npc));
        } else {
            // For other entity types, just pass through for now
            updatedEntities.push(entity);
        }
    }
    
    return {
        partitionId,
        entities: updatedEntities,
        lastUpdated: Date.now()
    };
}

/**
 * Send a successful result back to main thread
 * @param {string} taskId The task ID
 * @param {any} data The result data
 * @param {number} processingTime Time taken to process the task
 */
function sendSuccessResult(taskId, data, processingTime) {
    parentPort.postMessage({
        taskId,
        success: true,
        data,
        processingTime
    });
}

/**
 * Send an error result back to main thread
 * @param {string} taskId The task ID
 * @param {string} error Error message
 */
function sendErrorResult(taskId, error) {
    parentPort.postMessage({
        taskId,
        success: false,
        error,
        processingTime: 0
    });
}

// Helper functions for NPC updates

/**
 * Update NPC needs based on time and environment
 * @param {Object} npc The NPC to update
 */
function updateNeeds(npc) {
    for (const [need, value] of npc.needs.entries()) {
        // Needs naturally increase over time at different rates
        let decayRate = 0.01;
        
        // Different needs decay at different rates
        switch (need) {
            case 'hunger':
                decayRate = 0.02;
                break;
            case 'thirst': 
                decayRate = 0.03;
                break;
            case 'rest':
                decayRate = 0.01;
                break;
            case 'social':
                decayRate = 0.005;
                break;
            default:
                decayRate = 0.01;
        }
        
        // Update the need
        npc.needs.set(need, Math.min(1, value + decayRate));
    }
}

/**
 * Update NPC emotions based on needs and recent events
 * @param {Object} npc The NPC to update
 */
function updateEmotions(npc) {
    if (!npc.emotions || !Array.isArray(npc.emotions)) {
        npc.emotions = [];
    }
    
    // Check needs and generate emotions
    let highestNeed = { type: null, value: 0 };
    
    for (const [need, value] of npc.needs.entries()) {
        if (value > highestNeed.value) {
            highestNeed = { type: need, value };
        }
    }
    
    // Generate emotions based on needs
    if (highestNeed.value > 0.8) {
        // Critical need generates negative emotions
        switch (highestNeed.type) {
            case 'hunger':
                addOrUpdateEmotion(npc, 'irritation', 0.7);
                break;
            case 'thirst':
                addOrUpdateEmotion(npc, 'discomfort', 0.7);
                break;
            case 'rest':
                addOrUpdateEmotion(npc, 'fatigue', 0.8);
                break;
            case 'social':
                addOrUpdateEmotion(npc, 'loneliness', 0.6);
                break;
        }
    }
    
    // Process emotional decay (already handled in batch emotion updates, 
    // but we do it here too for individual updates)
    for (let i = npc.emotions.length - 1; i >= 0; i--) {
        const emotion = npc.emotions[i];
        // Emotions naturally decay
        emotion.intensity *= 0.95;
        
        // Remove emotions below threshold
        if (emotion.intensity < 0.1) {
            npc.emotions.splice(i, 1);
        }
    }
}

/**
 * Add or update an emotion
 * @param {Object} npc The NPC
 * @param {string} type Emotion type
 * @param {number} intensity Emotion intensity
 */
function addOrUpdateEmotion(npc, type, intensity) {
    const existingEmotion = npc.emotions.find(e => e.type === type);
    
    if (existingEmotion) {
        // Update existing emotion, taking the higher intensity
        existingEmotion.intensity = Math.max(existingEmotion.intensity, intensity);
        // Refresh timestamp
        existingEmotion.timestamp = Date.now();
    } else {
        // Add new emotion
        npc.emotions.push({
            type,
            intensity,
            timestamp: Date.now(),
            persistence: 0.5 // Default persistence
        });
    }
}

/**
 * Update NPC relationships (for individual updates)
 * @param {Object} npc The NPC to update
 */
function updateRelationships(npc) {
    // This is a simplified version as the full logic requires access to other NPCs
    // that would be handled in the batch relationship update
    
    // Decay relationship values slightly to represent natural forgetting
    for (const [targetId, relationship] of npc.relationships.entries()) {
        // Very slight natural decay in relationships when no interactions occur
        const decay = 0.001;
        
        relationship.trust = Math.max(-1, Math.min(1, relationship.trust * (1 - decay)));
        relationship.respect = Math.max(-1, Math.min(1, relationship.respect * (1 - decay)));
    }
}

/**
 * Update NPC goals
 * @param {Object} npc The NPC to update
 */
function updateGoals(npc) {
    if (!npc.goals || !Array.isArray(npc.goals)) {
        npc.goals = [];
        return;
    }
    
    // Check if we need to create new goals based on needs
    let highestNeed = { type: null, value: 0 };
    
    for (const [need, value] of npc.needs.entries()) {
        if (value > 0.7 && value > highestNeed.value) {
            highestNeed = { type: need, value };
        }
    }
    
    // Create a goal to address the highest need
    if (highestNeed.type && highestNeed.value > 0.7) {
        // Check if we already have a goal for this need
        const hasNeedGoal = npc.goals.some(goal => 
            goal.type === 'satisfy_need' && goal.data?.needType === highestNeed.type
        );
        
        if (!hasNeedGoal) {
            // Add a new goal
            npc.goals.push({
                id: `goal_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                type: 'satisfy_need',
                priority: highestNeed.value, // Priority based on need level
                data: {
                    needType: highestNeed.type
                },
                status: 'active',
                createdAt: Date.now()
            });
        }
    }
    
    // Update existing goals
    for (const goal of npc.goals) {
        // Check completion conditions
        if (goal.type === 'satisfy_need' && goal.data?.needType) {
            const needValue = npc.needs.get(goal.data.needType) || 0;
            
            // If need is now below threshold, complete the goal
            if (needValue < 0.3) {
                goal.status = 'completed';
                goal.completedAt = Date.now();
            }
        }
        
        // Update priority based on time for non-completed goals
        if (goal.status === 'active') {
            // Goals get more urgent as time passes
            const ageInHours = (Date.now() - goal.createdAt) / (1000 * 60 * 60);
            goal.priority = Math.min(1, goal.priority + (ageInHours * 0.01));
        }
    }
    
    // Remove completed goals after a time
    const now = Date.now();
    npc.goals = npc.goals.filter(goal => 
        goal.status !== 'completed' || 
        (now - goal.completedAt) < (24 * 60 * 60 * 1000) // Keep completed goals for 24 hours
    );
    
    // Sort goals by priority
    npc.goals.sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Update NPC memories
 * @param {Object} npc The NPC to update
 */
function updateMemories(npc) {
    if (!npc.memories || !Array.isArray(npc.memories)) {
        npc.memories = [];
        return;
    }
    
    // Memory decay is handled in batch processing
    // Here we just sort by significance
    npc.memories.sort((a, b) => 
        (b.strength || 0) * (b.emotionalSignificance || 1) - 
        (a.strength || 0) * (a.emotionalSignificance || 1)
    );
}

/**
 * Update NPC behaviors
 * @param {Object} npc The NPC to update
 */
function updateBehaviors(npc) {
    // Determine current behavior based on goals, emotions, and needs
    if (!npc.activeBehavior) {
        npc.activeBehavior = { type: 'idle', startTime: Date.now() };
    }
    
    // Check if high-priority goal should change behavior
    if (npc.goals && npc.goals.length > 0 && npc.goals[0].status === 'active') {
        const topGoal = npc.goals[0];
        
        if (topGoal.type === 'satisfy_need') {
            // Change behavior based on need
            switch (topGoal.data?.needType) {
                case 'hunger':
                    if (npc.activeBehavior.type !== 'seeking_food') {
                        npc.activeBehavior = { 
                            type: 'seeking_food', 
                            startTime: Date.now(), 
                            goalId: topGoal.id 
                        };
                    }
                    break;
                case 'thirst':
                    if (npc.activeBehavior.type !== 'seeking_water') {
                        npc.activeBehavior = { 
                            type: 'seeking_water', 
                            startTime: Date.now(), 
                            goalId: topGoal.id 
                        };
                    }
                    break;
                case 'rest':
                    if (npc.activeBehavior.type !== 'seeking_rest') {
                        npc.activeBehavior = { 
                            type: 'seeking_rest', 
                            startTime: Date.now(), 
                            goalId: topGoal.id 
                        };
                    }
                    break;
                case 'social':
                    if (npc.activeBehavior.type !== 'seeking_social') {
                        npc.activeBehavior = { 
                            type: 'seeking_social', 
                            startTime: Date.now(), 
                            goalId: topGoal.id 
                        };
                    }
                    break;
            }
        }
    }
    
    // Check if current behavior has been active too long
    const behaviorDuration = Date.now() - npc.activeBehavior.startTime;
    if (behaviorDuration > 30 * 60 * 1000) { // 30 minutes
        // Switch to idle occasionally to prevent getting stuck
        npc.activeBehavior = { type: 'idle', startTime: Date.now() };
    }
}

/**
 * Process interaction between NPC and another entity
 * @param {Object} npc The NPC
 * @param {Object} entity The entity to interact with
 */
function processInteraction(npc, entity) {
    // Simple placeholder for interaction logic
    if (entity.type === 'npc') {
        // NPC to NPC interaction
        // Update relationship if it exists
        if (npc.relationships.has(entity.id)) {
            // Just a slight random fluctuation for now
            const relationship = npc.relationships.get(entity.id);
            const smallChange = (Math.random() - 0.5) * 0.01;
            relationship.trust = Math.max(-1, Math.min(1, relationship.trust + smallChange));
        }
    } else if (entity.type === 'resource') {
        // NPC to resource interaction
        if (entity.resourceType === 'food' && npc.activeBehavior.type === 'seeking_food') {
            // NPC found food, satisfy hunger need
            npc.needs.set('hunger', Math.max(0, (npc.needs.get('hunger') || 0) - 0.3));
            
            // Change behavior
            npc.activeBehavior = { type: 'idle', startTime: Date.now() };
            
            // Create a memory
            if (npc.memories) {
                npc.memories.push({
                    id: `memory_${Date.now()}`,
                    type: 'resource_interaction',
                    description: `Found food at location (${entity.position.x}, ${entity.position.y})`,
                    timestamp: Date.now(),
                    strength: 0.6,
                    emotionalSignificance: 0.5
                });
            }
        }
    }
}

/**
 * Update NPC based on environmental factors
 * @param {Object} npc The NPC
 * @param {Object} data The partition data
 */
function updateNPCFromEnvironment(npc, data) {
    // Placeholder for environmental effects
    // These could be things like weather, temperature, etc.
    
    // Example: If the partition has a weather property
    if (data.weather) {
        switch (data.weather) {
            case 'rain':
                // Rain affects mood and stamina
                addOrUpdateEmotion(npc, 'discomfort', 0.3);
                npc.stats.set('stamina', Math.max(0, (npc.stats.get('stamina') || 0) - 0.1));
                break;
                
            case 'sunny':
                // Sunny weather improves mood
                addOrUpdateEmotion(npc, 'contentment', 0.4);
                break;
                
            case 'storm':
                // Storms cause fear
                addOrUpdateEmotion(npc, 'fear', 0.5);
                npc.stats.set('stamina', Math.max(0, (npc.stats.get('stamina') || 0) - 0.2));
                break;
        }
    }
}

/**
 * Deserialize NPC data
 * @param {Object} data Serialized NPC data
 * @returns {Object} Deserialized NPC
 */
function deserializeNPC(data) {
    return {
        ...data,
        needs: new Map(data.needs || []),
        relationships: new Map(data.relationships || []),
        stats: new Map(data.stats || [])
    };
}

/**
 * Serialize NPC for sending back to main thread
 * @param {Object} npc The NPC to serialize
 * @returns {Object} Serialized NPC
 */
function serializeNPC(npc) {
    const serialized = JSON.parse(JSON.stringify(npc));
    
    // Convert Maps to arrays
    serialized.needs = Array.from(npc.needs.entries());
    serialized.relationships = Array.from(npc.relationships.entries());
    serialized.stats = Array.from(npc.stats.entries());
    
    return serialized;
} 