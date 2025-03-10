import { v4 as uuidv4 } from 'uuid';
import { Resource } from './faction-types';

/**
 * Manages all resources in the game world
 */
export class ResourceManager {
  private resources: Map<string, Resource> = new Map();
  
  /**
   * Creates a new resource in the world
   */
  public createResource(
    name: string,
    description: string,
    type: Resource['type'],
    rarity: Resource['rarity'],
    quantity: number,
    value_per_unit: number,
    territory_id?: string,
    metadata?: Record<string, any>
  ): Resource {
    const id = uuidv4();
    
    const resource: Resource = {
      id,
      name,
      description,
      type,
      rarity,
      quantity,
      value_per_unit,
      territory_id,
      metadata
    };
    
    this.resources.set(id, resource);
    return resource;
  }
  
  /**
   * Gets a resource by ID
   */
  public getResource(id: string): Resource | undefined {
    return this.resources.get(id);
  }
  
  /**
   * Gets a resource by name
   */
  public getResourceByName(name: string): Resource | undefined {
    return Array.from(this.resources.values()).find(r => r.name === name);
  }
  
  /**
   * Gets all resources
   */
  public getAllResources(): Resource[] {
    return Array.from(this.resources.values());
  }
  
  /**
   * Gets all resources of a specific type
   */
  public getResourcesByType(type: Resource['type']): Resource[] {
    return this.getAllResources().filter(r => r.type === type);
  }
  
  /**
   * Gets all resources of a specific rarity
   */
  public getResourcesByRarity(rarity: Resource['rarity']): Resource[] {
    return this.getAllResources().filter(r => r.rarity === rarity);
  }
  
  /**
   * Gets all resources in a specific territory
   */
  public getResourcesByTerritory(territoryId: string): Resource[] {
    return this.getAllResources().filter(r => r.territory_id === territoryId);
  }
  
  /**
   * Updates an existing resource
   */
  public updateResource(id: string, updates: Partial<Omit<Resource, 'id'>>): Resource | undefined {
    const resource = this.getResource(id);
    if (!resource) return undefined;
    
    // Apply updates
    Object.assign(resource, updates);
    
    return resource;
  }
  
  /**
   * Adjusts the quantity of a resource
   * @returns The new quantity or undefined if resource doesn't exist
   */
  public adjustQuantity(id: string, change: number): number | undefined {
    const resource = this.getResource(id);
    if (!resource) return undefined;
    
    resource.quantity = Math.max(0, resource.quantity + change);
    return resource.quantity;
  }
  
  /**
   * Sets a resource's location to a specific territory
   */
  public setResourceLocation(resourceId: string, territoryId: string | undefined): boolean {
    const resource = this.getResource(resourceId);
    if (!resource) return false;
    
    resource.territory_id = territoryId;
    return true;
  }
  
  /**
   * Splits a resource into two separate resources
   * @returns The newly created resource or undefined if the split failed
   */
  public splitResource(
    resourceId: string,
    splitQuantity: number, 
    newName?: string,
    newTerritoryId?: string
  ): Resource | undefined {
    const resource = this.getResource(resourceId);
    if (!resource || splitQuantity <= 0 || splitQuantity >= resource.quantity) {
      return undefined;
    }
    
    // Reduce the quantity of the original resource
    resource.quantity -= splitQuantity;
    
    // Create a new resource with the split quantity
    return this.createResource(
      newName ?? `${resource.name} (Split)`,
      resource.description,
      resource.type,
      resource.rarity,
      splitQuantity,
      resource.value_per_unit,
      newTerritoryId ?? resource.territory_id,
      resource.metadata ? { ...resource.metadata, split_from: resourceId } : { split_from: resourceId }
    );
  }
  
  /**
   * Combines multiple resources of the same type
   * @returns The combined resource or undefined if the combine failed
   */
  public combineResources(resourceIds: string[]): Resource | undefined {
    if (resourceIds.length < 2) return undefined;
    
    // Get all resources
    const resources = resourceIds
      .map(id => this.getResource(id))
      .filter((r): r is Resource => r !== undefined);
    
    if (resources.length !== resourceIds.length) return undefined;
    
    // Check if they're all the same type
    const firstType = resources[0].type;
    if (!resources.every(r => r.type === firstType)) return undefined;
    
    // Create the combined resource
    const totalQuantity = resources.reduce((sum, r) => sum + r.quantity, 0);
    const totalValue = resources.reduce((sum, r) => sum + (r.quantity * r.value_per_unit), 0);
    const avgValuePerUnit = totalValue / totalQuantity;
    
    // Use the rarity of the rarest resource
    const rarityOrder: Record<Resource['rarity'], number> = {
      'common': 1,
      'uncommon': 2,
      'rare': 3,
      'very_rare': 4,
      'legendary': 5
    };
    
    const highestRarity = resources.reduce((highest, r) => {
      return rarityOrder[r.rarity] > rarityOrder[highest.rarity] ? r : highest;
    }, resources[0]);
    
    // Create the new combined resource
    const combined = this.createResource(
      `Combined ${firstType}`,
      `A collection of combined ${firstType} resources.`,
      firstType,
      highestRarity.rarity,
      totalQuantity,
      avgValuePerUnit,
      resources[0].territory_id, // Use the territory of the first resource
      { combined_from: resourceIds }
    );
    
    // Remove the original resources
    for (const id of resourceIds) {
      this.resources.delete(id);
    }
    
    return combined;
  }
  
  /**
   * Calculates the total value of a resource
   */
  public calculateResourceValue(resourceId: string): number {
    const resource = this.getResource(resourceId);
    if (!resource) return 0;
    
    return resource.quantity * resource.value_per_unit;
  }
  
  /**
   * Calculates the total value of all resources in a territory
   */
  public calculateTerritoryResourceValue(territoryId: string): number {
    const resources = this.getResourcesByTerritory(territoryId);
    return resources.reduce((total, r) => total + this.calculateResourceValue(r.id), 0);
  }
} 