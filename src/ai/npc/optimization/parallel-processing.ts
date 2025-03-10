/**
 * Parallel Processing System
 * 
 * This system optimizes NPC processing by distributing workloads across worker threads,
 * taking advantage of multi-core processors for improved performance.
 * 
 * Key features:
 * - Dynamic worker pool management
 * - Task-based parallelism for NPC updates
 * - Communication protocol between main thread and workers
 * - Automatic workload balancing
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { NPC } from '../../../character/npc';
import { SimulationDetailLevel } from './selective-updates';
import * as path from 'path';
import * as os from 'os';

/**
 * Types of tasks that can be processed by workers
 */
export enum TaskType {
    NPC_UPDATE = 'npc_update',
    BATCH_MEMORY_DECAY = 'batch_memory_decay',
    BATCH_EMOTION_UPDATE = 'batch_emotion_update',
    BATCH_RELATIONSHIP_UPDATE = 'batch_relationship_update',
    WORLD_PARTITION_UPDATE = 'world_partition_update'
}

/**
 * Task to be processed by a worker
 */
export interface WorkerTask {
    id: string;
    type: TaskType;
    data: any;
    priority: number;
}

/**
 * Result returned from worker after task completion
 */
export interface WorkerResult {
    taskId: string;
    success: boolean;
    data: any;
    error?: string;
    processingTime: number;
}

/**
 * Configuration for the parallel processing system
 */
export interface ParallelProcessingConfig {
    // Worker management
    maxWorkers: number;
    minWorkers: number;
    idleWorkerTimeout: number; // ms
    
    // Task management
    maxQueueSize: number;
    taskTimeoutMs: number;
    
    // NPC Batching
    npcBatchSize: number;
    
    // Performance monitoring
    performanceLoggingEnabled: boolean;
    performanceLoggingInterval: number; // ms
}

/**
 * Main class that manages the worker pool and distributes tasks
 */
export class ParallelProcessingSystem {
    private config: ParallelProcessingConfig;
    private workers: Map<number, Worker> = new Map();
    private availableWorkers: Set<number> = new Set();
    private busyWorkers: Map<number, { taskId: string, startTime: number }> = new Map();
    private taskQueue: WorkerTask[] = [];
    private taskCallbacks: Map<string, { resolve: Function, reject: Function, timeoutId: NodeJS.Timeout }> = new Map();
    private isShuttingDown: boolean = false;
    private performanceStats: {
        totalTasks: number;
        completedTasks: number;
        failedTasks: number;
        totalProcessingTime: number;
        taskTypeStats: Map<string, { count: number, totalTime: number }>;
    };
    private performanceLoggingInterval: NodeJS.Timeout | null = null;
    
    constructor(config: ParallelProcessingConfig) {
        this.config = config;
        
        // Initialize performance tracking
        this.performanceStats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            totalProcessingTime: 0,
            taskTypeStats: new Map()
        };
        
        // Initialize minimum workers
        this.initializeWorkers(this.config.minWorkers);
        
        // Start performance logging if enabled
        if (this.config.performanceLoggingEnabled) {
            this.performanceLoggingInterval = setInterval(() => {
                this.logPerformanceStats();
            }, this.config.performanceLoggingInterval);
        }
    }
    
    /**
     * Initialize worker threads
     * @param count Number of workers to initialize
     */
    private initializeWorkers(count: number): void {
        const currentWorkerCount = this.workers.size;
        const workersToAdd = Math.max(0, count - currentWorkerCount);
        
        for (let i = 0; i < workersToAdd; i++) {
            const workerId = currentWorkerCount + i;
            this.createWorker(workerId);
        }
    }
    
    /**
     * Create a new worker thread
     * @param workerId ID for the new worker
     */
    private createWorker(workerId: number): void {
        const worker = new Worker(path.join(__dirname, 'worker.js'), {
            workerData: { workerId }
        });
        
        worker.on('message', (result: WorkerResult) => {
            this.handleWorkerResult(workerId, result);
        });
        
        worker.on('error', (error) => {
            console.error(`Worker ${workerId} error:`, error);
            this.handleWorkerFailure(workerId);
        });
        
        worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`Worker ${workerId} exited with code ${code}`);
            }
            this.workers.delete(workerId);
            this.availableWorkers.delete(workerId);
            this.busyWorkers.delete(workerId);
            
            // Recreate worker if not shutting down
            if (!this.isShuttingDown) {
                this.createWorker(workerId);
            }
        });
        
        this.workers.set(workerId, worker);
        this.availableWorkers.add(workerId);
    }
    
    /**
     * Submit an NPC update task to be processed in parallel
     * @param npc The NPC to update
     * @param detailLevel The detail level for this update
     * @param priority Task priority (lower number = higher priority)
     * @returns Promise that resolves with the updated NPC
     */
    public updateNPC(npc: NPC, detailLevel: SimulationDetailLevel, priority: number = 1): Promise<NPC> {
        return this.submitTask({
            id: `npc_update_${npc.id}_${Date.now()}`,
            type: TaskType.NPC_UPDATE,
            data: {
                npc: this.serializeNPC(npc),
                detailLevel
            },
            priority
        });
    }
    
    /**
     * Submit a batch update for multiple NPCs
     * @param npcs NPCs to update
     * @param detailLevel The detail level for these updates
     * @param priority Task priority (lower number = higher priority)
     * @returns Promise that resolves with the updated NPCs
     */
    public updateNPCBatch(npcs: NPC[], detailLevel: SimulationDetailLevel, priority: number = 1): Promise<NPC[]> {
        // Split into batches
        const batches: NPC[][] = [];
        for (let i = 0; i < npcs.length; i += this.config.npcBatchSize) {
            batches.push(npcs.slice(i, i + this.config.npcBatchSize));
        }
        
        // Submit each batch as a task
        const promises = batches.map((batch, index) => {
            return this.submitTask({
                id: `npc_batch_${index}_${Date.now()}`,
                type: TaskType.NPC_UPDATE,
                data: {
                    npcs: batch.map(npc => this.serializeNPC(npc)),
                    detailLevel
                },
                priority
            });
        });
        
        // Wait for all batches to complete
        return Promise.all(promises).then(results => {
            // Flatten the results
            return results.flat();
        });
    }
    
    /**
     * Process memory decay for a batch of NPCs
     * @param npcs NPCs whose memories need to be decayed
     * @param decayFactor The decay factor to apply
     * @param priority Task priority
     * @returns Promise that resolves with the updated NPCs
     */
    public processMemoryDecay(npcs: NPC[], decayFactor: number, priority: number = 2): Promise<NPC[]> {
        return this.submitTask({
            id: `memory_decay_${Date.now()}`,
            type: TaskType.BATCH_MEMORY_DECAY,
            data: {
                npcs: npcs.map(npc => this.serializeNPC(npc)),
                decayFactor
            },
            priority
        });
    }
    
    /**
     * Process emotion updates for a batch of NPCs
     * @param npcs NPCs whose emotions need to be updated
     * @param deltaTime Time elapsed since last update
     * @param priority Task priority
     * @returns Promise that resolves with the updated NPCs
     */
    public processEmotionUpdates(npcs: NPC[], deltaTime: number, priority: number = 2): Promise<NPC[]> {
        return this.submitTask({
            id: `emotion_update_${Date.now()}`,
            type: TaskType.BATCH_EMOTION_UPDATE,
            data: {
                npcs: npcs.map(npc => this.serializeNPC(npc)),
                deltaTime
            },
            priority
        });
    }
    
    /**
     * Update relationships for a group of NPCs
     * @param npcs NPCs whose relationships need to be updated
     * @param socialFactors Factors affecting relationship changes
     * @param priority Task priority
     * @returns Promise that resolves with the updated NPCs
     */
    public processRelationshipUpdates(
        npcs: NPC[], 
        socialFactors: any, 
        priority: number = 2
    ): Promise<NPC[]> {
        return this.submitTask({
            id: `relationship_update_${Date.now()}`,
            type: TaskType.BATCH_RELATIONSHIP_UPDATE,
            data: {
                npcs: npcs.map(npc => this.serializeNPC(npc)),
                socialFactors
            },
            priority
        });
    }
    
    /**
     * Update a specific world partition
     * @param partitionId The partition ID
     * @param entities Entities in the partition
     * @param priority Task priority
     * @returns Promise that resolves with updated partition data
     */
    public updateWorldPartition(partitionId: string, entities: any[], priority: number = 3): Promise<any> {
        return this.submitTask({
            id: `partition_update_${partitionId}_${Date.now()}`,
            type: TaskType.WORLD_PARTITION_UPDATE,
            data: {
                partitionId,
                entities
            },
            priority
        });
    }
    
    /**
     * Submit a task to be processed by a worker
     * @param task The task to process
     * @returns Promise that resolves with the task result
     */
    private submitTask(task: WorkerTask): Promise<any> {
        this.performanceStats.totalTasks++;
        
        // Initialize task type statistics if needed
        if (!this.performanceStats.taskTypeStats.has(task.type)) {
            this.performanceStats.taskTypeStats.set(task.type, { count: 0, totalTime: 0 });
        }
        this.performanceStats.taskTypeStats.get(task.type)!.count++;
        
        return new Promise((resolve, reject) => {
            // Create a timeout for this task
            const timeoutId = setTimeout(() => {
                this.handleTaskTimeout(task.id);
            }, this.config.taskTimeoutMs);
            
            // Store the callbacks
            this.taskCallbacks.set(task.id, { resolve, reject, timeoutId });
            
            // Add task to queue
            this.taskQueue.push(task);
            
            // Sort queue by priority
            this.taskQueue.sort((a, b) => a.priority - b.priority);
            
            // Ensure we have enough workers
            this.ensureWorkerCapacity();
            
            // Process next task if workers are available
            this.processNextTask();
        });
    }
    
    /**
     * Ensure we have enough workers to handle current workload
     */
    private ensureWorkerCapacity(): void {
        // If queue is getting full, add more workers (up to max)
        if (this.taskQueue.length > this.availableWorkers.size * 2) {
            const neededWorkers = Math.min(
                this.config.maxWorkers, 
                this.workers.size + Math.ceil(this.taskQueue.length / 2)
            );
            
            if (neededWorkers > this.workers.size) {
                this.initializeWorkers(neededWorkers);
            }
        }
    }
    
    /**
     * Process the next task in the queue
     */
    private processNextTask(): void {
        if (this.taskQueue.length === 0 || this.availableWorkers.size === 0) {
            return;
        }
        
        // Get the next task
        const task = this.taskQueue.shift()!;
        
        // Get an available worker
        const workerId = Array.from(this.availableWorkers)[0];
        this.availableWorkers.delete(workerId);
        
        // Mark worker as busy
        this.busyWorkers.set(workerId, { 
            taskId: task.id, 
            startTime: Date.now() 
        });
        
        // Send task to worker
        const worker = this.workers.get(workerId)!;
        worker.postMessage({ task });
    }
    
    /**
     * Handle a result received from a worker
     * @param workerId The worker ID
     * @param result The task result
     */
    private handleWorkerResult(workerId: number, result: WorkerResult): void {
        const { taskId, success, data, error, processingTime } = result;
        
        // Update performance stats
        this.performanceStats.taskTypeStats.get(this.getTaskTypeById(taskId))!.totalTime += processingTime;
        this.performanceStats.totalProcessingTime += processingTime;
        
        if (success) {
            this.performanceStats.completedTasks++;
        } else {
            this.performanceStats.failedTasks++;
        }
        
        // Get task callbacks
        const callbacks = this.taskCallbacks.get(taskId);
        if (callbacks) {
            // Clear timeout
            clearTimeout(callbacks.timeoutId);
            
            // Resolve or reject
            if (success) {
                callbacks.resolve(data);
            } else {
                callbacks.reject(new Error(error || 'Unknown error'));
            }
            
            // Remove callbacks
            this.taskCallbacks.delete(taskId);
        }
        
        // Mark worker as available
        this.busyWorkers.delete(workerId);
        this.availableWorkers.add(workerId);
        
        // Process next task
        this.processNextTask();
        
        // Check if we have too many idle workers
        this.manageIdleWorkers();
    }
    
    /**
     * Handle a worker failure
     * @param workerId The worker ID
     */
    private handleWorkerFailure(workerId: number): void {
        // Check if worker was busy
        const busyData = this.busyWorkers.get(workerId);
        if (busyData) {
            const { taskId } = busyData;
            
            // Reject the task
            const callbacks = this.taskCallbacks.get(taskId);
            if (callbacks) {
                clearTimeout(callbacks.timeoutId);
                callbacks.reject(new Error(`Worker ${workerId} failed`));
                this.taskCallbacks.delete(taskId);
            }
            
            // Update stats
            this.performanceStats.failedTasks++;
        }
        
        // Remove worker
        this.workers.delete(workerId);
        this.availableWorkers.delete(workerId);
        this.busyWorkers.delete(workerId);
        
        // Create a new worker
        if (!this.isShuttingDown) {
            this.createWorker(workerId);
        }
    }
    
    /**
     * Handle a task timeout
     * @param taskId The task ID
     */
    private handleTaskTimeout(taskId: string): void {
        // Find which worker is processing this task
        const workerId = this.findWorkerByTaskId(taskId);
        
        if (workerId !== null) {
            // Terminate the worker (it will be recreated)
            console.warn(`Task ${taskId} timed out on worker ${workerId}, terminating worker`);
            const worker = this.workers.get(workerId);
            if (worker) {
                worker.terminate();
            }
            
            // Worker failure handler will reject the task
        } else {
            // Task is still in queue, remove it
            const index = this.taskQueue.findIndex(task => task.id === taskId);
            if (index !== -1) {
                this.taskQueue.splice(index, 1);
            }
            
            // Reject the task
            const callbacks = this.taskCallbacks.get(taskId);
            if (callbacks) {
                callbacks.reject(new Error(`Task ${taskId} timed out in queue`));
                this.taskCallbacks.delete(taskId);
            }
            
            // Update stats
            this.performanceStats.failedTasks++;
        }
    }
    
    /**
     * Find which worker is processing a task
     * @param taskId The task ID
     * @returns The worker ID or null if not found
     */
    private findWorkerByTaskId(taskId: string): number | null {
        for (const [workerId, data] of this.busyWorkers.entries()) {
            if (data.taskId === taskId) {
                return workerId;
            }
        }
        return null;
    }
    
    /**
     * Get task type by task ID
     * @param taskId The task ID
     * @returns The task type
     */
    private getTaskTypeById(taskId: string): TaskType {
        // Extract task type from ID (format: type_id_timestamp)
        const parts = taskId.split('_');
        if (parts[0] === 'npc' && parts[1] === 'batch') {
            return TaskType.NPC_UPDATE;
        } else if (parts[0] === 'npc' && parts[1] === 'update') {
            return TaskType.NPC_UPDATE;
        } else if (parts[0] === 'memory' && parts[1] === 'decay') {
            return TaskType.BATCH_MEMORY_DECAY;
        } else if (parts[0] === 'emotion' && parts[1] === 'update') {
            return TaskType.BATCH_EMOTION_UPDATE;
        } else if (parts[0] === 'relationship' && parts[1] === 'update') {
            return TaskType.BATCH_RELATIONSHIP_UPDATE;
        } else if (parts[0] === 'partition' && parts[1] === 'update') {
            return TaskType.WORLD_PARTITION_UPDATE;
        }
        
        // Default
        return TaskType.NPC_UPDATE;
    }
    
    /**
     * Manage idle workers (terminate if too many)
     */
    private manageIdleWorkers(): void {
        // If we have more than minWorkers and some are idle for too long, terminate them
        if (this.workers.size > this.config.minWorkers && this.availableWorkers.size > this.config.minWorkers) {
            const excessWorkers = this.workers.size - this.config.minWorkers;
            const workersToTerminate = Math.min(excessWorkers, this.availableWorkers.size - this.config.minWorkers);
            
            if (workersToTerminate > 0) {
                // Get the workers to terminate
                const idleWorkers = Array.from(this.availableWorkers).slice(0, workersToTerminate);
                
                // Terminate them
                for (const workerId of idleWorkers) {
                    const worker = this.workers.get(workerId);
                    if (worker) {
                        console.log(`Terminating idle worker ${workerId}`);
                        worker.terminate();
                        this.workers.delete(workerId);
                        this.availableWorkers.delete(workerId);
                    }
                }
            }
        }
    }
    
    /**
     * Log performance statistics
     */
    private logPerformanceStats(): void {
        const now = new Date().toISOString();
        console.log(`[${now}] === Parallel Processing Performance Stats ===`);
        console.log(`Total tasks: ${this.performanceStats.totalTasks}`);
        console.log(`Completed tasks: ${this.performanceStats.completedTasks}`);
        console.log(`Failed tasks: ${this.performanceStats.failedTasks}`);
        console.log(`Total processing time: ${this.performanceStats.totalProcessingTime.toFixed(2)}ms`);
        console.log(`Average processing time: ${(this.performanceStats.totalProcessingTime / this.performanceStats.completedTasks).toFixed(2)}ms`);
        console.log(`Current workers: ${this.workers.size} (${this.availableWorkers.size} available, ${this.busyWorkers.size} busy)`);
        console.log(`Queue size: ${this.taskQueue.length}`);
        
        console.log('Task type statistics:');
        this.performanceStats.taskTypeStats.forEach((stats, type) => {
            console.log(`- ${type}: ${stats.count} tasks, avg time: ${(stats.totalTime / stats.count).toFixed(2)}ms`);
        });
        
        console.log('===============================================');
    }
    
    /**
     * Serialize an NPC for sending to worker
     * @param npc The NPC to serialize
     * @returns Serialized NPC data
     */
    private serializeNPC(npc: NPC): any {
        // Create a deep copy
        const serialized = JSON.parse(JSON.stringify(npc));
        
        // Convert Maps to arrays of key-value pairs
        serialized.needs = Array.from(npc.needs.entries());
        serialized.relationships = Array.from(npc.relationships.entries());
        serialized.stats = Array.from(npc.stats.entries());
        
        return serialized;
    }
    
    /**
     * Deserialize NPC data received from worker
     * @param data Serialized NPC data
     * @returns Deserialized NPC
     */
    public static deserializeNPC(data: any): NPC {
        const npc: NPC = {
            ...data,
            needs: new Map(data.needs),
            relationships: new Map(data.relationships),
            stats: new Map(data.stats)
        };
        
        return npc;
    }
    
    /**
     * Shutdown the parallel processing system
     */
    public shutdown(): void {
        this.isShuttingDown = true;
        
        // Clear performance logging interval
        if (this.performanceLoggingInterval) {
            clearInterval(this.performanceLoggingInterval);
        }
        
        // Reject all pending tasks
        for (const [taskId, callbacks] of this.taskCallbacks.entries()) {
            clearTimeout(callbacks.timeoutId);
            callbacks.reject(new Error('System is shutting down'));
        }
        this.taskCallbacks.clear();
        this.taskQueue = [];
        
        // Terminate all workers
        for (const [workerId, worker] of this.workers.entries()) {
            worker.terminate();
        }
        this.workers.clear();
        this.availableWorkers.clear();
        this.busyWorkers.clear();
    }
    
    /**
     * Get system statistics
     */
    public getStatistics(): any {
        return {
            totalWorkers: this.workers.size,
            availableWorkers: this.availableWorkers.size,
            busyWorkers: this.busyWorkers.size,
            queueSize: this.taskQueue.length,
            totalTasks: this.performanceStats.totalTasks,
            completedTasks: this.performanceStats.completedTasks,
            failedTasks: this.performanceStats.failedTasks,
            totalProcessingTime: this.performanceStats.totalProcessingTime,
            averageProcessingTime: this.performanceStats.completedTasks > 0 
                ? this.performanceStats.totalProcessingTime / this.performanceStats.completedTasks 
                : 0,
            taskTypeStats: Object.fromEntries(this.performanceStats.taskTypeStats)
        };
    }
    
    /**
     * Create a default configuration
     */
    public static createDefaultConfig(): ParallelProcessingConfig {
        const cpuCount = os.cpus().length;
        
        return {
            maxWorkers: cpuCount,
            minWorkers: Math.max(1, Math.floor(cpuCount / 2)),
            idleWorkerTimeout: 30000, // 30 seconds
            maxQueueSize: 1000,
            taskTimeoutMs: 10000, // 10 seconds
            npcBatchSize: 20,
            performanceLoggingEnabled: true,
            performanceLoggingInterval: 60000 // 1 minute
        };
    }
} 