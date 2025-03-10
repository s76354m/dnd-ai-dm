import { v4 as uuidv4 } from 'uuid';
import { Territory } from './faction-types';

/**
 * Manages all territories in the game world
 */
export class TerritoryManager {
  private territories: Map<string, Territory> = new Map();
  
  /**
   * Creates a new territory in the world
   */
  public createTerritory(
    name: string,
    description: string,
    type: Territory['type'],
    options: Partial<Omit<Territory, 'id' | 'name' | 'description' | 'type'>> = {}
  ): Territory {
    const id = uuidv4();
    
    const territory: Territory = {
      id,
      name,
      description,
      type,
      controlLevel: options.controlLevel ?? 100,
      strategic_value: options.strategic_value ?? 5,
      economic_value: options.economic_value ?? 5,
      resources: options.resources ?? [],
      neighbors: options.neighbors ?? [],
      position: options.position,
      metadata: options.metadata
    };
    
    this.territories.set(id, territory);
    return territory;
  }
  
  /**
   * Gets a territory by ID
   */
  public getTerritory(id: string): Territory | undefined {
    return this.territories.get(id);
  }
  
  /**
   * Gets a territory by name
   */
  public getTerritoryByName(name: string): Territory | undefined {
    return Array.from(this.territories.values()).find(t => t.name === name);
  }
  
  /**
   * Gets all territories
   */
  public getAllTerritories(): Territory[] {
    return Array.from(this.territories.values());
  }
  
  /**
   * Gets all territories of a specific type
   */
  public getTerritoryByType(type: Territory['type']): Territory[] {
    return this.getAllTerritories().filter(t => t.type === type);
  }
  
  /**
   * Updates an existing territory
   */
  public updateTerritory(id: string, updates: Partial<Omit<Territory, 'id'>>): Territory | undefined {
    const territory = this.getTerritory(id);
    if (!territory) return undefined;
    
    // Apply updates
    Object.assign(territory, updates);
    
    return territory;
  }
  
  /**
   * Establishes a neighboring relationship between territories
   */
  public setNeighbors(territoryId1: string, territoryId2: string): boolean {
    const territory1 = this.getTerritory(territoryId1);
    const territory2 = this.getTerritory(territoryId2);
    
    if (!territory1 || !territory2) return false;
    
    // Add as neighbors if they aren't already
    if (!territory1.neighbors.includes(territoryId2)) {
      territory1.neighbors.push(territoryId2);
    }
    
    if (!territory2.neighbors.includes(territoryId1)) {
      territory2.neighbors.push(territoryId1);
    }
    
    return true;
  }
  
  /**
   * Gets all neighbors of a territory
   */
  public getNeighbors(territoryId: string): Territory[] {
    const territory = this.getTerritory(territoryId);
    if (!territory) return [];
    
    return territory.neighbors
      .map(id => this.getTerritory(id))
      .filter((t): t is Territory => t !== undefined);
  }
  
  /**
   * Adds a resource to a territory
   */
  public addResourceToTerritory(territoryId: string, resourceId: string): boolean {
    const territory = this.getTerritory(territoryId);
    if (!territory) return false;
    
    if (!territory.resources.includes(resourceId)) {
      territory.resources.push(resourceId);
    }
    
    return true;
  }
  
  /**
   * Removes a resource from a territory
   */
  public removeResourceFromTerritory(territoryId: string, resourceId: string): boolean {
    const territory = this.getTerritory(territoryId);
    if (!territory) return false;
    
    const initialLength = territory.resources.length;
    territory.resources = territory.resources.filter(id => id !== resourceId);
    
    return territory.resources.length < initialLength;
  }
  
  /**
   * Gets all territories within a certain distance of a territory
   * @param territoryId Starting territory ID
   * @param distance Maximum number of steps to take
   * @returns Array of territories within the specified distance
   */
  public getTerritoryInRange(territoryId: string, distance: number): Territory[] {
    const visited = new Set<string>();
    const result: Territory[] = [];
    const queue: { id: string; dist: number }[] = [{ id: territoryId, dist: 0 }];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Skip if already visited
      if (visited.has(current.id)) continue;
      visited.add(current.id);
      
      // Add to result if not the starting territory
      const territory = this.getTerritory(current.id);
      if (territory && current.id !== territoryId) {
        result.push(territory);
      }
      
      // If within range, add neighbors to queue
      if (current.dist < distance && territory) {
        for (const neighborId of territory.neighbors) {
          if (!visited.has(neighborId)) {
            queue.push({ id: neighborId, dist: current.dist + 1 });
          }
        }
      }
    }
    
    return result;
  }
  
  /**
   * Calculates the shortest path between two territories
   * Uses breadth-first search for unweighted graph
   */
  public findPath(startId: string, endId: string): Territory[] {
    if (startId === endId) {
      const territory = this.getTerritory(startId);
      return territory ? [territory] : [];
    }
    
    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];
    
    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      
      // Skip if already visited
      if (visited.has(id)) continue;
      visited.add(id);
      
      const territory = this.getTerritory(id);
      if (!territory) continue;
      
      // Check if we reached the destination
      if (id === endId) {
        return path.map(id => this.getTerritory(id)!);
      }
      
      // Add neighbors to queue
      for (const neighborId of territory.neighbors) {
        if (!visited.has(neighborId)) {
          queue.push({
            id: neighborId,
            path: [...path, neighborId]
          });
        }
      }
    }
    
    // No path found
    return [];
  }
  
  /**
   * Calculates the minimum control level a faction needs to have
   * over the territories to control a path between them
   */
  public calculatePathControlRequirement(startId: string, endId: string): number {
    const path = this.findPath(startId, endId);
    if (path.length === 0) return 0;
    
    // Find the minimum control level along the path
    return Math.min(...path.map(t => t.controlLevel));
  }
} 