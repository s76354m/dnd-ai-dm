/**
 * Spatial Partitioning System
 * 
 * This system optimizes NPC interactions by dividing the game world into cells
 * and only processing interactions between NPCs that are in the same or adjacent cells.
 * 
 * Key features:
 * - Grid-based spatial partitioning
 * - Efficient neighbor queries
 * - Support for mobile entities with cell transitions
 * - Configurable cell sizes based on interaction types
 */

import { NPC } from '../../../character/npc';
import { Vector2D, BoundingBox } from '../../../types/spatial-types';

/**
 * Represents a cell in the spatial grid
 */
export interface SpatialCell {
    id: string;
    x: number;
    y: number;
    entities: Map<string, SpatialEntity>;
    boundingBox: BoundingBox;
}

/**
 * Represents an entity stored in the spatial partitioning system
 */
export interface SpatialEntity {
    id: string;
    position: Vector2D;
    radius: number; // Interaction radius
    type: 'npc' | 'player' | 'object';
    data: any; // Reference to the actual entity
}

/**
 * Configuration options for the spatial partitioning system
 */
export interface SpatialPartitioningConfig {
    cellSize: number; // Size of each cell in world units
    worldBounds: BoundingBox; // The bounds of the entire world
    interactionTypes: Map<string, number>; // Map of interaction types to their max distances
}

/**
 * Main class that implements spatial partitioning for efficient proximity queries
 */
export class SpatialPartitioningSystem {
    private grid: Map<string, SpatialCell> = new Map();
    private entities: Map<string, SpatialEntity> = new Map();
    private config: SpatialPartitioningConfig;
    
    // Cached results to avoid recalculating
    private cachedNeighborCells: Map<string, string[]> = new Map();
    
    constructor(config: SpatialPartitioningConfig) {
        this.config = config;
        this.initializeGrid();
    }
    
    /**
     * Initialize the grid cells based on world bounds and cell size
     */
    private initializeGrid() {
        const { worldBounds, cellSize } = this.config;
        
        // Calculate number of cells in each dimension
        const numCellsX = Math.ceil((worldBounds.max.x - worldBounds.min.x) / cellSize);
        const numCellsY = Math.ceil((worldBounds.max.y - worldBounds.min.y) / cellSize);
        
        // Create cells
        for (let x = 0; x < numCellsX; x++) {
            for (let y = 0; y < numCellsY; y++) {
                const cellId = this.getCellId(x, y);
                
                const cell: SpatialCell = {
                    id: cellId,
                    x: x,
                    y: y,
                    entities: new Map(),
                    boundingBox: {
                        min: {
                            x: worldBounds.min.x + (x * cellSize),
                            y: worldBounds.min.y + (y * cellSize)
                        },
                        max: {
                            x: worldBounds.min.x + ((x + 1) * cellSize),
                            y: worldBounds.min.y + ((y + 1) * cellSize)
                        }
                    }
                };
                
                this.grid.set(cellId, cell);
            }
        }
    }
    
    /**
     * Add an entity to the spatial partitioning system
     * @param entity The entity to add
     * @returns The added entity
     */
    public addEntity(entity: SpatialEntity): SpatialEntity {
        // Store the entity
        this.entities.set(entity.id, entity);
        
        // Add to appropriate cell
        const cellCoords = this.getCellCoordsForPosition(entity.position);
        const cellId = this.getCellId(cellCoords.x, cellCoords.y);
        
        const cell = this.grid.get(cellId);
        if (cell) {
            cell.entities.set(entity.id, entity);
        } else {
            console.warn(`Attempted to add entity to non-existent cell at ${cellCoords.x}, ${cellCoords.y}`);
        }
        
        return entity;
    }
    
    /**
     * Add an NPC to the spatial partitioning system
     * @param npc The NPC to add
     * @param position The NPC's position
     * @param interactionRadius Optional custom interaction radius
     * @returns The created spatial entity
     */
    public addNPC(npc: NPC, position: Vector2D, interactionRadius?: number): SpatialEntity {
        const entity: SpatialEntity = {
            id: npc.id,
            position: position,
            radius: interactionRadius || this.getDefaultInteractionRadius('npc'),
            type: 'npc',
            data: npc
        };
        
        return this.addEntity(entity);
    }
    
    /**
     * Update an entity's position in the spatial system
     * @param entityId The entity ID
     * @param newPosition The new position
     */
    public updateEntityPosition(entityId: string, newPosition: Vector2D): void {
        const entity = this.entities.get(entityId);
        if (!entity) {
            console.warn(`Attempted to update position of non-existent entity: ${entityId}`);
            return;
        }
        
        // Get current and new cell coordinates
        const oldCellCoords = this.getCellCoordsForPosition(entity.position);
        const newCellCoords = this.getCellCoordsForPosition(newPosition);
        
        // Check if entity is moving to a new cell
        if (oldCellCoords.x !== newCellCoords.x || oldCellCoords.y !== newCellCoords.y) {
            // Remove from old cell
            const oldCellId = this.getCellId(oldCellCoords.x, oldCellCoords.y);
            const oldCell = this.grid.get(oldCellId);
            if (oldCell) {
                oldCell.entities.delete(entityId);
            }
            
            // Add to new cell
            const newCellId = this.getCellId(newCellCoords.x, newCellCoords.y);
            const newCell = this.grid.get(newCellId);
            if (newCell) {
                newCell.entities.set(entityId, entity);
            }
        }
        
        // Update entity position
        entity.position = { ...newPosition };
    }
    
    /**
     * Remove an entity from the spatial partitioning system
     * @param entityId The ID of the entity to remove
     */
    public removeEntity(entityId: string): void {
        const entity = this.entities.get(entityId);
        if (!entity) return;
        
        // Remove from cell
        const cellCoords = this.getCellCoordsForPosition(entity.position);
        const cellId = this.getCellId(cellCoords.x, cellCoords.y);
        
        const cell = this.grid.get(cellId);
        if (cell) {
            cell.entities.delete(entityId);
        }
        
        // Remove from entities map
        this.entities.delete(entityId);
    }
    
    /**
     * Get all entities within a specified radius of a position
     * @param position The center position
     * @param radius The search radius
     * @param filterType Optional filter by entity type
     * @returns Array of entities within radius
     */
    public getEntitiesInRadius(position: Vector2D, radius: number, filterType?: 'npc' | 'player' | 'object'): SpatialEntity[] {
        const result: SpatialEntity[] = [];
        
        // Get all cells that could contain entities within the radius
        const cellsToCheck = this.getCellsInRadius(position, radius);
        
        // Check each entity in these cells
        for (const cellId of cellsToCheck) {
            const cell = this.grid.get(cellId);
            if (!cell) continue;
            
            // Check each entity in the cell
            for (const [_, entity] of cell.entities) {
                // Apply type filter if specified
                if (filterType && entity.type !== filterType) continue;
                
                // Check if within radius
                const distance = this.getDistance(position, entity.position);
                if (distance <= radius) {
                    result.push(entity);
                }
            }
        }
        
        return result;
    }
    
    /**
     * Get all NPCs within a specified radius of a position
     * @param position The center position
     * @param radius The search radius
     * @returns Array of NPCs within radius
     */
    public getNPCsInRadius(position: Vector2D, radius: number): NPC[] {
        const entities = this.getEntitiesInRadius(position, radius, 'npc');
        return entities.map(entity => entity.data as NPC);
    }
    
    /**
     * Get all entities in the same cell as the specified position
     * @param position The position to check
     * @param includeAdjacent Whether to include entities in adjacent cells
     * @param filterType Optional filter by entity type
     * @returns Array of entities in the cell(s)
     */
    public getEntitiesInCell(position: Vector2D, includeAdjacent: boolean = false, filterType?: 'npc' | 'player' | 'object'): SpatialEntity[] {
        const result: SpatialEntity[] = [];
        
        // Get the cell coordinates for the position
        const cellCoords = this.getCellCoordsForPosition(position);
        
        // Get cells to check (current cell and optionally adjacent cells)
        const cellsToCheck: string[] = [this.getCellId(cellCoords.x, cellCoords.y)];
        
        if (includeAdjacent) {
            const adjacentCells = this.getAdjacentCellIds(cellCoords.x, cellCoords.y);
            cellsToCheck.push(...adjacentCells);
        }
        
        // Collect entities from all cells
        for (const cellId of cellsToCheck) {
            const cell = this.grid.get(cellId);
            if (!cell) continue;
            
            // Apply filter if needed
            if (filterType) {
                for (const [_, entity] of cell.entities) {
                    if (entity.type === filterType) {
                        result.push(entity);
                    }
                }
            } else {
                // Add all entities from the cell
                cell.entities.forEach(entity => result.push(entity));
            }
        }
        
        return result;
    }
    
    /**
     * Get all possible interaction partners for an entity
     * @param entityId The entity ID
     * @param interactionType The type of interaction (matches to configured distances)
     * @returns Array of potential interaction partners
     */
    public getPotentialInteractionPartners(entityId: string, interactionType?: string): SpatialEntity[] {
        const entity = this.entities.get(entityId);
        if (!entity) return [];
        
        // Determine interaction radius
        let radius = entity.radius;
        if (interactionType && this.config.interactionTypes.has(interactionType)) {
            radius = this.config.interactionTypes.get(interactionType);
        }
        
        // Get entities within radius
        const nearbyEntities = this.getEntitiesInRadius(entity.position, radius, entity.type);
        
        // Filter out the original entity
        return nearbyEntities.filter(e => e.id !== entityId);
    }
    
    /**
     * Get potential NPC interaction partners for an NPC
     * @param npcId The NPC ID
     * @param interactionType Optional interaction type for distance
     * @returns Array of potential NPC partners
     */
    public getPotentialNPCInteractionPartners(npcId: string, interactionType?: string): NPC[] {
        const partners = this.getPotentialInteractionPartners(npcId, interactionType);
        return partners
            .filter(e => e.type === 'npc')
            .map(e => e.data as NPC);
    }
    
    /**
     * Check if two entities can interact with each other
     * @param entityId1 First entity ID
     * @param entityId2 Second entity ID
     * @param interactionType Optional interaction type for distance check
     * @returns Whether interaction is possible
     */
    public canEntitiesInteract(entityId1: string, entityId2: string, interactionType?: string): boolean {
        const entity1 = this.entities.get(entityId1);
        const entity2 = this.entities.get(entityId2);
        
        if (!entity1 || !entity2) return false;
        
        // Determine interaction radius
        let radius = Math.max(entity1.radius, entity2.radius);
        if (interactionType && this.config.interactionTypes.has(interactionType)) {
            radius = this.config.interactionTypes.get(interactionType);
        }
        
        // Check distance
        const distance = this.getDistance(entity1.position, entity2.position);
        return distance <= radius;
    }
    
    /**
     * Get all cells that could contain entities within a radius of a position
     * @param position The center position
     * @param radius The search radius
     * @returns Array of cell IDs
     */
    private getCellsInRadius(position: Vector2D, radius: number): string[] {
        // Get the cell coordinates for the center position
        const centerCellCoords = this.getCellCoordsForPosition(position);
        
        // Calculate how many cells the radius could span
        const cellSpan = Math.ceil(radius / this.config.cellSize);
        
        // Get all cell IDs in the area
        const cellIds: string[] = [];
        
        for (let xOffset = -cellSpan; xOffset <= cellSpan; xOffset++) {
            for (let yOffset = -cellSpan; yOffset <= cellSpan; yOffset++) {
                const x = centerCellCoords.x + xOffset;
                const y = centerCellCoords.y + yOffset;
                
                // Skip if out of bounds
                if (x < 0 || y < 0) continue;
                
                const cellId = this.getCellId(x, y);
                if (this.grid.has(cellId)) {
                    cellIds.push(cellId);
                }
            }
        }
        
        return cellIds;
    }
    
    /**
     * Get the cell coordinates for a world position
     * @param position The world position
     * @returns The cell coordinates
     */
    private getCellCoordsForPosition(position: Vector2D): { x: number, y: number } {
        const { worldBounds, cellSize } = this.config;
        
        // Calculate relative position within world bounds
        const relativeX = position.x - worldBounds.min.x;
        const relativeY = position.y - worldBounds.min.y;
        
        // Calculate cell coordinates
        const cellX = Math.floor(relativeX / cellSize);
        const cellY = Math.floor(relativeY / cellSize);
        
        return { x: cellX, y: cellY };
    }
    
    /**
     * Get the unique ID for a cell based on its coordinates
     * @param x The x coordinate
     * @param y The y coordinate
     * @returns The cell ID
     */
    private getCellId(x: number, y: number): string {
        return `${x},${y}`;
    }
    
    /**
     * Get adjacent cell IDs for a given cell
     * @param x The x coordinate
     * @param y The y coordinate
     * @returns Array of adjacent cell IDs
     */
    private getAdjacentCellIds(x: number, y: number): string[] {
        // Check cache first
        const cacheKey = `${x},${y}`;
        if (this.cachedNeighborCells.has(cacheKey)) {
            return this.cachedNeighborCells.get(cacheKey);
        }
        
        const adjacentCellIds: string[] = [];
        
        // Check all 8 adjacent cells
        for (let xOffset = -1; xOffset <= 1; xOffset++) {
            for (let yOffset = -1; yOffset <= 1; yOffset++) {
                // Skip the center cell
                if (xOffset === 0 && yOffset === 0) continue;
                
                const adjacentX = x + xOffset;
                const adjacentY = y + yOffset;
                
                // Skip if out of bounds
                if (adjacentX < 0 || adjacentY < 0) continue;
                
                const cellId = this.getCellId(adjacentX, adjacentY);
                if (this.grid.has(cellId)) {
                    adjacentCellIds.push(cellId);
                }
            }
        }
        
        // Cache result
        this.cachedNeighborCells.set(cacheKey, adjacentCellIds);
        
        return adjacentCellIds;
    }
    
    /**
     * Calculate distance between two positions
     * @param pos1 First position
     * @param pos2 Second position
     * @returns The distance
     */
    private getDistance(pos1: Vector2D, pos2: Vector2D): number {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Get the default interaction radius for an entity type
     * @param entityType The entity type
     * @returns The default radius
     */
    private getDefaultInteractionRadius(entityType: string): number {
        switch (entityType) {
            case 'npc':
                return 20; // Default NPC interaction radius
            case 'player':
                return 30; // Players can interact further
            case 'object':
                return 5; // Objects typically need closer interaction
            default:
                return 10; // Default fallback
        }
    }
    
    /**
     * Get statistics about the spatial partitioning system
     * @returns Object with statistics
     */
    public getStatistics(): any {
        let totalEntities = 0;
        let occupiedCells = 0;
        let maxEntitiesInCell = 0;
        
        this.grid.forEach(cell => {
            const entityCount = cell.entities.size;
            totalEntities += entityCount;
            
            if (entityCount > 0) {
                occupiedCells++;
            }
            
            maxEntitiesInCell = Math.max(maxEntitiesInCell, entityCount);
        });
        
        return {
            totalCells: this.grid.size,
            occupiedCells,
            occupiedCellsPercentage: (occupiedCells / this.grid.size) * 100,
            totalEntities,
            maxEntitiesInCell,
            averageEntitiesPerOccupiedCell: occupiedCells > 0 ? totalEntities / occupiedCells : 0
        };
    }
} 