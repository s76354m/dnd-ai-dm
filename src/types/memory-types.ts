/**
 * Memory Type Definitions
 * 
 * This file contains type definitions related to NPC memory systems.
 */

import { Memory, MemoryImportance } from './npc-types';

// Re-export the Memory interface and MemoryImportance enum
export { Memory, MemoryImportance };

/**
 * Memory retrieval parameters
 */
export interface MemoryRetrievalParams {
  importance?: MemoryImportance;
  recency?: number; // How recent memories should be (in ms)
  associations?: string[]; // Tags or entities to search for
  limit?: number; // Maximum number of memories to retrieve
  minStrength?: number; // Minimum memory strength (0-1)
}

/**
 * Memory decay configuration
 */
export interface MemoryDecayConfig {
  baseDecayRate: number; // Base rate at which memories decay
  importanceMultipliers: Record<MemoryImportance, number>; // How importance affects decay
  emotionalSignificanceImpact: number; // How emotional significance affects decay
  recallBoost: number; // How much recalling boosts a memory's strength
}

/**
 * Default memory decay configuration
 */
export const DEFAULT_MEMORY_DECAY: MemoryDecayConfig = {
  baseDecayRate: 0.01, // 1% decay per day
  importanceMultipliers: {
    [MemoryImportance.TRIVIAL]: 2.0, // Trivial memories decay 2x faster
    [MemoryImportance.MINOR]: 1.5,
    [MemoryImportance.MODERATE]: 1.0, // Normal decay rate
    [MemoryImportance.SIGNIFICANT]: 0.5, // Half the decay rate
    [MemoryImportance.CRITICAL]: 0.1 // Very slow decay
  },
  emotionalSignificanceImpact: 0.5, // Reduction in decay rate based on emotional significance
  recallBoost: 0.2 // How much recalling boosts a memory's strength
};

/**
 * Extended memory with additional metadata
 */
export interface EnhancedMemory extends Memory {
  decayRate?: number; // Calculated decay rate for this memory
  lastModified?: number; // When the memory was last modified
  source?: string; // Source of the memory (observation, conversation, etc.)
  relatedMemories?: string[]; // IDs of related memories
  confidence?: number; // How confident the NPC is in this memory (0-1)
}

/**
 * Memory creation parameters
 */
export interface MemoryCreationParams {
  content: string;
  importance: MemoryImportance;
  associations?: string[];
  emotionalContext?: string[];
  initialStrength?: number;
  emotionalSignificance?: number;
  source?: string;
}

/**
 * Memory update parameters
 */
export interface MemoryUpdateParams {
  content?: string;
  importance?: MemoryImportance;
  associations?: string[];
  emotionalContext?: string[];
  strength?: number;
  emotionalSignificance?: number;
}

/**
 * Memory filter function type
 */
export type MemoryFilter = (memory: Memory) => boolean; 