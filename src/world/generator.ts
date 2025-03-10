/**
 * World Generator
 * 
 * This class handles the procedural generation of locations in the game world.
 * It creates interconnected locations with appropriate descriptions, NPCs, and items.
 */

import { Location } from '../core/interfaces/world';
import { NPC } from '../core/interfaces/npc';
import { AIService } from '../dm/ai-service';
import { Item } from '../core/interfaces/item';
import { NPCAttitude } from '../core/interfaces/npc';

export interface LocationTemplate {
  name: string;
  type: LocationType;
  terrain: TerrainType;
  lighting: LightingLevel;
  isHostile: boolean;
  mood: LocationMood;
  time?: TimeOfDay;
  weather?: WeatherCondition;
  npcTypes?: string[];
  itemTypes?: string[];
}

export type LocationType = 
  | 'tavern' 
  | 'shop' 
  | 'temple' 
  | 'castle' 
  | 'dungeon'
  | 'forest'
  | 'cave'
  | 'village'
  | 'town_square'
  | 'market'
  | 'road'
  | 'bridge'
  | 'river'
  | 'mountain'
  | 'coast';

export type TerrainType = 
  | 'urban' 
  | 'forest' 
  | 'mountain' 
  | 'desert'
  | 'swamp'
  | 'plains'
  | 'coastal'
  | 'underground';

export type LightingLevel = 
  | 'bright' 
  | 'dim' 
  | 'dark';

export type LocationMood = 
  | 'peaceful' 
  | 'tense' 
  | 'dangerous' 
  | 'mysterious'
  | 'festive'
  | 'abandoned'
  | 'sacred';

export type TimeOfDay = 
  | 'dawn' 
  | 'day' 
  | 'dusk' 
  | 'night';

export type WeatherCondition = 
  | 'clear' 
  | 'cloudy' 
  | 'rainy' 
  | 'stormy'
  | 'foggy'
  | 'snowy';

export interface WorldRegion {
  name: string;
  description: string;
  primaryTerrain: TerrainType;
  dangerLevel: number; // 1-10 scale
  locations: Map<string, Location>;
  locationsGraph: Map<string, Map<string, string>>; // Map of locationId to Map of direction to locationId
}

export class WorldGenerator {
  protected aiService: AIService;
  private regions: Map<string, WorldRegion>;
  protected currentRegion: string;
  
  constructor(aiService: AIService) {
    this.aiService = aiService;
    this.regions = new Map();
    this.currentRegion = 'starting_region';
    
    // Initialize the starting region
    this.regions.set('starting_region', {
      name: 'Evendale',
      description: 'A peaceful region with rolling hills, small forests, and a few scattered settlements.',
      primaryTerrain: 'urban',
      dangerLevel: 2,
      locations: new Map(),
      locationsGraph: new Map()
    });
  }
  
  /**
   * Generate a location based on a template
   */
  public async generateLocation(
    template: Partial<LocationTemplate>,
    connections: Map<string, string> = new Map(),
    regionName: string = this.currentRegion
  ): Promise<Location> {
    // Get the region
    const region = this.getRegion(regionName);
    if (!region) {
      throw new Error(`Region ${regionName} does not exist`);
    }
    
    // Fill in missing template values with defaults
    const fullTemplate = this.completeTemplate(template, region);
    
    // Generate a description
    let description: string;
    try {
      description = await this.generateLocationDescription(fullTemplate);
    } catch (error) {
      console.warn(`Failed to generate description for ${fullTemplate.name}, using fallback description`, error);
      description = `A ${fullTemplate.mood} ${fullTemplate.type} with ${fullTemplate.terrain} terrain.`;
    }
    
    // Generate NPCs appropriate for this location
    const npcs = await this.generateLocationNPCs(fullTemplate);
    
    // Generate items appropriate for this location
    const items = this.generateLocationItems(fullTemplate);
    
    // Create the location ID
    const locationId = this.getLocationId(fullTemplate.name);
    
    // Create the location
    const location: Location = {
      id: locationId,
      name: fullTemplate.name,
      description,
      connections,
      npcs,
      items,
      isHostile: fullTemplate.isHostile,
      lighting: fullTemplate.lighting,
      terrain: fullTemplate.terrain,
      type: fullTemplate.type,
      area: regionName
    };
    
    // Add the location to the region
    region.locations.set(locationId, location);
    
    // Update the region's location graph
    this.updateLocationGraph(locationId, connections, region);
    
    return location;
  }
  
  /**
   * Generate a fallback description when AI generation fails
   */
  private generateFallbackDescription(template: LocationTemplate, region: WorldRegion): string {
    // Basic description templates for different location types
    const descriptions: Record<LocationType, string> = {
      tavern: "A cozy establishment with wooden tables and a warm hearth. The smell of ale and freshly cooked food fills the air. Patrons chat quietly while a barmaid carries drinks to tables.",
      shop: "A small shop with shelves lined with various goods. The shopkeeper watches you from behind a worn wooden counter, ready to assist with your purchases.",
      temple: "A serene sanctuary dedicated to the gods. Candles flicker and incense perfumes the air. Devotees pray quietly and seek guidance from the priests.",
      castle: "An imposing stone fortress with high walls and sturdy towers. Guards patrol the battlements, and banners flutter in the breeze.",
      dungeon: "A dark and foreboding place with damp stone walls. The air is musty and cold, and strange sounds echo from the shadows.",
      forest: "A verdant woodland with towering trees and a thick canopy overhead. Sunlight filters through the leaves, creating patterns on the forest floor.",
      cave: "A natural rock formation with stalactites hanging from the ceiling. The air is cool and damp, and sounds echo strangely off the walls.",
      village: "A small settlement with modest homes and friendly residents. Children play in the streets while adults go about their daily chores.",
      town_square: "A bustling open area at the heart of the settlement. People gather to socialize, trade goods, and hear the latest news.",
      market: "A lively marketplace filled with vendors calling out their wares. Colorful stalls offer everything from fresh produce to exotic goods.",
      road: "A well-traveled path connecting important locations. The dirt is packed hard from countless feet and wagon wheels.",
      bridge: "A sturdy structure spanning a waterway. It allows safe passage across the water below.",
      river: "A flowing body of water that cuts through the landscape. The current moves steadily, carrying leaves and small debris downstream.",
      mountain: "A towering peak that dominates the horizon. The terrain is rocky and steep, challenging to traverse.",
      coast: "A meeting point between land and sea. Waves crash against the shore, and seabirds call overhead."
    };
    
    // Get the basic description for this type of location
    let baseDescription = descriptions[template.type] || "A nondescript location with nothing particularly notable about it.";
    
    // Add mood-specific details
    const moodDescriptions: Record<LocationMood, string> = {
      peaceful: "There's a sense of calm and safety here.",
      tense: "There's an underlying tension in the air that puts you on edge.",
      dangerous: "You sense danger here and feel the need to remain vigilant.",
      mysterious: "Something about this place feels enigmatic and full of secrets.",
      festive: "The atmosphere is celebratory and full of cheer.",
      abandoned: "This place appears to have been deserted for some time.",
      sacred: "There's a reverent atmosphere that inspires quiet contemplation."
    };
    
    baseDescription += " " + moodDescriptions[template.mood];
    
    // Add region context
    baseDescription += ` This is typical of ${region.name}, which is known for its ${region.description.toLowerCase()}`;
    
    return baseDescription;
  }
  
  /**
   * Generate a name for a location based on its type
   */
  private generateLocationName(locationType?: LocationType): string {
    // Simple name generation for now - this could be enhanced with AI
    const typeNames: Record<LocationType, string[]> = {
      tavern: ['The Prancing Pony', 'The Dragon\'s Rest', 'The Rusty Tankard'],
      shop: ['Grimwald\'s Goods', 'The Adventurer\'s Supply', 'Fine Wares'],
      temple: ['Temple of Light', 'Sanctuary of the Ancients', 'Sacred Shrine'],
      castle: ['Castle Blackstone', 'Highkeep Fortress', 'Dragonspire Castle'],
      dungeon: ['The Dark Depths', 'Forgotten Catacombs', 'The Forsaken Prison'],
      forest: ['The Whispering Woods', 'Emerald Forest', 'The Ancient Grove'],
      cave: ['Echo Cavern', 'The Dark Hollow', 'Crystal Cave'],
      village: ['Brookside', 'Meadowvale', 'Riverbend'],
      town_square: ['Town Square', 'Market Square', 'The Commons'],
      market: ['Merchant\'s Row', 'The Bazaar', 'Trading Post'],
      road: ['The King\'s Road', 'Forest Path', 'Mountain Trail'],
      bridge: ['Stone Bridge', 'Old Crossing', 'River Bridge'],
      river: ['The Silverflowd', 'Rushing River', 'Emerald Stream'],
      mountain: ['The Frostpeak', 'Thunder Mountain', 'The Craggy Heights'],
      coast: ['Rocky Shore', 'Sandy Beach', 'The Misty Coast']
    };
    
    const type = locationType || 'town_square';
    const names = typeNames[type];
    return names[Math.floor(Math.random() * names.length)];
  }
  
  /**
   * Generate NPCs for a location
   */
  protected async generateLocationNPCs(template: LocationTemplate): Promise<NPC[]> {
    const npcs: NPC[] = [];
    const locationId = this.getLocationId(template.name);
    
    // Different location types have different typical NPCs
    switch (template.type) {
      case 'tavern':
        npcs.push({
          id: `inn-keeper-${locationId}`,
          name: 'Innkeeper',
          race: 'human',
          description: 'A friendly innkeeper with a warm smile.',
          attitude: NPCAttitude.Friendly,
          isQuestGiver: true,
          dialogue: [],
          location: locationId
        });
        
        if (Math.random() > 0.5) {
          npcs.push({
            id: `bard-${Date.now()}`,
            name: 'Traveling Bard',
            race: 'elf',
            description: 'A slender elf strumming a lute in the corner.',
            attitude: NPCAttitude.Neutral,
            isQuestGiver: false,
            dialogue: [],
            location: locationId
          });
        }
        break;
        
      case 'shop':
        npcs.push({
          id: `merchant-${Date.now()}`,
          name: 'Merchant',
          race: 'human',
          description: 'A merchant selling various goods.',
          attitude: NPCAttitude.Neutral,
          isQuestGiver: false,
          dialogue: [],
          location: locationId
        });
        break;
        
      case 'temple':
        npcs.push({
          id: `priest-${Date.now()}`,
          name: 'Temple Priest',
          race: 'human',
          description: 'A solemn priest tending to the temple.',
          attitude: NPCAttitude.Friendly,
          isQuestGiver: true,
          dialogue: [],
          location: locationId
        });
        break;
        
      // Add more location types as needed
    }
    
    // Add random NPCs based on location mood
    if (template.mood === 'dangerous' || template.isHostile) {
      npcs.push({
        id: `bandit-${Date.now()}`,
        name: 'Bandit',
        race: 'human',
        description: 'A rough-looking bandit lurking in the shadows.',
        attitude: NPCAttitude.Hostile,
        isQuestGiver: false,
        dialogue: [],
        location: locationId
      });
    }
    
    return npcs;
  }
  
  /**
   * Generate items appropriate for this location
   */
  private generateLocationItems(template: LocationTemplate): Item[] {
    // Simple item generation based on location type
    const items: Item[] = [];
    
    // Add items based on location type
    switch (template.type) {
      case 'tavern':
        items.push({
          id: `mug-${Date.now()}`,
          name: 'Wooden Mug',
          description: 'A simple wooden mug for drinking ale.',
          weight: 0.5,
          value: 1,
          quantity: 1,
          type: 'misc',
          isEquipped: false,
          properties: []
        });
        break;
        
      case 'shop':
        items.push({
          id: `potion-${Date.now()}`,
          name: 'Health Potion',
          description: 'A small vial of red liquid that restores health.',
          weight: 0.1,
          value: 50,
          quantity: 1,
          type: 'potion',
          isEquipped: false,
          properties: ['healing', 'consumable']
        });
        break;
    }
    
    return items;
  }
  
  /**
   * Get a unique ID for a location based on its name
   */
  private getLocationId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
  
  /**
   * Create a new region
   */
  public createRegion(
    name: string,
    description: string,
    primaryTerrain: TerrainType,
    dangerLevel: number
  ): void {
    this.regions.set(name, {
      name,
      description,
      primaryTerrain,
      dangerLevel,
      locations: new Map(),
      locationsGraph: new Map()
    });
  }
  
  /**
   * Get a location by name
   */
  public getLocation(
    name: string,
    regionName: string = this.currentRegion
  ): Location | undefined {
    const region = this.regions.get(regionName);
    if (!region) return undefined;
    
    const locationId = this.getLocationId(name);
    return region.locations.get(locationId);
  }
  
  /**
   * Connect two locations with bidirectional paths
   */
  public connectLocations(
    locationA: string,
    locationB: string,
    directionAtoB: string,
    directionBtoA: string,
    regionName: string = this.currentRegion
  ): void {
    const region = this.regions.get(regionName);
    if (!region) return;
    
    const locationIdA = this.getLocationId(locationA);
    const locationIdB = this.getLocationId(locationB);
    
    const locA = region.locations.get(locationIdA);
    const locB = region.locations.get(locationIdB);
    
    if (!locA || !locB) return;
    
    // Add connections to the locations
    locA.connections.set(directionAtoB, locationB);
    locB.connections.set(directionBtoA, locationA);
    
    // Update the region's location graph
    const locAConnections = region.locationsGraph.get(locationIdA) || new Map();
    const locBConnections = region.locationsGraph.get(locationIdB) || new Map();
    
    locAConnections.set(directionAtoB, locationB);
    locBConnections.set(directionBtoA, locationA);
    
    region.locationsGraph.set(locationIdA, locAConnections);
    region.locationsGraph.set(locationIdB, locBConnections);
  }
  
  /**
   * Get all locations in a region
   */
  public getRegionLocations(regionName: string = this.currentRegion): Location[] {
    const region = this.regions.get(regionName);
    if (!region) return [];
    
    return Array.from(region.locations.values());
  }
  
  /**
   * Get a region by name
   */
  public getRegion(name: string): WorldRegion | undefined {
    return this.regions.get(name);
  }
  
  /**
   * Set the current region
   */
  public setCurrentRegion(name: string): void {
    if (this.regions.has(name)) {
      this.currentRegion = name;
    } else {
      throw new Error(`Region ${name} does not exist`);
    }
  }
  
  /**
   * Generate a world with a starting town
   */
  public async generateStartingArea(): Promise<Location> {
    // Create the town square
    const townSquare = await this.generateLocation({
      name: 'Town Square',
      type: 'town_square',
      terrain: 'urban',
      lighting: 'bright',
      isHostile: false,
      mood: 'peaceful'
    });
    
    // Create a tavern connected to the town square
    const tavern = await this.generateLocation({
      name: 'The Prancing Pony',
      type: 'tavern',
      terrain: 'urban',
      lighting: 'dim',
      isHostile: false,
      mood: 'peaceful'
    });
    
    // Create a market connected to the town square
    const market = await this.generateLocation({
      name: 'Market District',
      type: 'market',
      terrain: 'urban',
      lighting: 'bright',
      isHostile: false,
      mood: 'festive'
    });
    
    // Create connections between locations
    this.connectLocations(townSquare.name, tavern.name, 'south', 'north');
    this.connectLocations(townSquare.name, market.name, 'east', 'west');
    
    return tavern; // Return the starting location (tavern)
  }

  /**
   * Completes a location template with default values
   * @param template The partial location template
   * @param region The region context
   * @returns A complete location template
   */
  protected completeTemplate(template: Partial<LocationTemplate>, region: WorldRegion): LocationTemplate {
    return {
      name: template.name || `${region.name} Location`,
      type: template.type || 'wilderness',
      terrain: template.terrain || 'plains',
      lighting: template.lighting || 'bright',
      mood: template.mood || 'neutral',
      isHostile: template.isHostile || false,
      npcTypes: template.npcTypes || [],
      itemTypes: template.itemTypes || [],
      ...template
    } as LocationTemplate;
  }

  /**
   * Generates a description for a location
   * @param template The location template
   * @returns A description string
   */
  private async generateLocationDescription(template: LocationTemplate): Promise<string> {
    // Basic description generation
    return `A ${template.mood} ${template.type} with ${template.terrain} terrain and ${template.lighting} lighting.`;
  }

  /**
   * Updates the location graph for a region
   * @param locationId The ID of the location to add
   * @param connections The connections to other locations
   * @param region The region to update
   */
  protected updateLocationGraph(locationId: string, connections: Record<string, string> | Map<string, string>, region: WorldRegion): void {
    // Convert Map to Record if needed
    const connectionsRecord: Record<string, string> = {};
    
    if (connections instanceof Map) {
      connections.forEach((targetId, direction) => {
        connectionsRecord[direction] = targetId;
      });
    } else {
      Object.assign(connectionsRecord, connections);
    }
    
    // Add connections to the region's location graph
    if (!region.locationsGraph.has(locationId)) {
      region.locationsGraph.set(locationId, new Map<string, string>());
    }
    
    const locationConnections = region.locationsGraph.get(locationId)!;
    
    // Add each connection
    Object.entries(connectionsRecord).forEach(([direction, targetId]) => {
      locationConnections.set(direction, targetId);
      
      // Add reverse connection if it doesn't exist
      if (!region.locationsGraph.has(targetId)) {
        region.locationsGraph.set(targetId, new Map<string, string>());
      }
      
      const reverseDirection = this.getReverseDirection(direction);
      if (reverseDirection) {
        const targetConnections = region.locationsGraph.get(targetId)!;
        if (!targetConnections.has(reverseDirection)) {
          targetConnections.set(reverseDirection, locationId);
        }
      }
    });
  }
  
  /**
   * Gets the reverse direction for a given direction
   * @param direction The direction to reverse
   * @returns The reverse direction or null if not found
   */
  private getReverseDirection(direction: string): string | null {
    const directionPairs: Record<string, string> = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'up': 'down',
      'down': 'up',
      'in': 'out',
      'out': 'in'
    };
    
    return directionPairs[direction] || null;
  }
} 