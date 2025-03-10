/**
 * World Manager
 * 
 * This class manages the game world, handling player movement between locations,
 * tracking world state, and coordinating with the World Generator to create new areas.
 */

import { Location } from '../core/interfaces/world';
import { Character } from '../core/interfaces/character';
import { AIService } from '../dm/ai-service';
import { WorldGenerator, LocationTemplate, TerrainType } from './generator';
import chalk from 'chalk';
import { EventEmitter } from 'events';

// Event types for the World Manager
export interface WorldEvents {
  timeAdvanced: (newTime: number, minutesAdvanced: number) => void;
  locationChanged: (newLocation: Location, oldLocation: Location) => void;
  weatherChanged: (newWeather: string, oldWeather: string) => void;
}

export class WorldManager extends EventEmitter {
  private worldGenerator: WorldGenerator;
  private currentLocation: Location;
  private discoveredLocations: Set<string>;
  private player: Character;
  private timeOfDay: string;
  private worldTime: number; // In minutes
  private weather: string;
  
  constructor(aiService: AIService, player: Character) {
    super(); // Initialize EventEmitter
    this.worldGenerator = new WorldGenerator(aiService);
    this.discoveredLocations = new Set<string>();
    this.player = player;
    this.currentLocation = {} as Location; // Will be initialized in initializeWorld
    this.timeOfDay = 'day';
    this.worldTime = 9 * 60; // Start at 9:00 AM
    this.weather = 'clear';
  }
  
  /**
   * Initialize the world with a starting area
   */
  public async initializeWorld(): Promise<Location> {
    console.log(chalk.yellow('Generating world...'));
    this.currentLocation = await this.worldGenerator.generateStartingArea();
    this.markLocationAsDiscovered(this.currentLocation.name);
    console.log(chalk.green('World initialized with starting area.'));
    return this.currentLocation;
  }
  
  /**
   * Get the current location
   */
  public getCurrentLocation(): Location {
    return this.currentLocation;
  }
  
  /**
   * Move to a location in a specific direction
   */
  public async moveToDirection(direction: string): Promise<{success: boolean, message: string}> {
    // Check if the direction is valid for the current location
    if (!this.currentLocation.connections.has(direction)) {
      return {
        success: false,
        message: `You cannot go ${direction} from here.`
      };
    }
    
    // Get the name of the target location
    const targetLocationName = this.currentLocation.connections.get(direction) as string;
    
    // Try to get the location if it already exists
    let targetLocation = this.worldGenerator.getLocation(targetLocationName);
    
    // If the location doesn't exist yet, generate it
    if (!targetLocation) {
      console.log(chalk.yellow(`Generating new location: ${targetLocationName}`));
      
      // Determine the type of location based on name
      let locationType: string = 'town_square';
      let terrain: TerrainType = 'urban';
      
      if (targetLocationName.toLowerCase().includes('market')) {
        locationType = 'market';
      } else if (targetLocationName.toLowerCase().includes('inn') || 
                 targetLocationName.toLowerCase().includes('tavern')) {
        locationType = 'tavern';
      } else if (targetLocationName.toLowerCase().includes('temple') || 
                 targetLocationName.toLowerCase().includes('shrine')) {
        locationType = 'temple';
      } else if (targetLocationName.toLowerCase().includes('forest')) {
        locationType = 'forest';
        terrain = 'forest';
      } else if (targetLocationName.toLowerCase().includes('shop') || 
                 targetLocationName.toLowerCase().includes('store')) {
        locationType = 'shop';
      }
      
      // Create a template for the new location
      const template: Partial<LocationTemplate> = {
        name: targetLocationName,
        type: locationType as any,
        terrain: terrain,
        lighting: this.timeOfDay === 'night' ? 'dark' : this.timeOfDay === 'dusk' ? 'dim' : 'bright',
        mood: 'peaceful', // Default mood
        time: this.timeOfDay as any,
        weather: this.weather as any
      };
      
      // Generate connections back to the current location
      const oppositeDirection = this.getOppositeDirection(direction);
      const connections = new Map<string, string>();
      connections.set(oppositeDirection, this.currentLocation.name);
      
      // Generate the new location
      targetLocation = await this.worldGenerator.generateLocation(template, connections);
    }
    
    // Store the old location for the event
    const oldLocation = this.currentLocation;
    
    // Update the current location
    this.currentLocation = targetLocation;
    this.markLocationAsDiscovered(targetLocation.name);
    
    // Emit location changed event
    this.emit('locationChanged', targetLocation, oldLocation);
    
    // Pass some time when traveling (10 minutes)
    this.advanceTime(10);
    
    return {
      success: true,
      message: `You travel ${direction} to ${targetLocation.name}.`
    };
  }
  
  /**
   * Move to a specific location by name
   */
  public async moveToLocation(locationName: string): Promise<{success: boolean, message: string}> {
    // Check if the location is connected to the current location
    let direction: string | null = null;
    
    for (const [dir, name] of this.currentLocation.connections.entries()) {
      if (name.toLowerCase() === locationName.toLowerCase()) {
        direction = dir;
        break;
      }
    }
    
    if (!direction) {
      return {
        success: false,
        message: `You don't see a way to ${locationName} from here.`
      };
    }
    
    return this.moveToDirection(direction);
  }
  
  /**
   * Get the opposite direction
   */
  private getOppositeDirection(direction: string): string {
    const opposites: Record<string, string> = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'up': 'down',
      'down': 'up',
      'in': 'out',
      'out': 'in'
    };
    
    return opposites[direction] || 'back';
  }
  
  /**
   * Mark a location as discovered
   */
  private markLocationAsDiscovered(locationName: string): void {
    this.discoveredLocations.add(locationName.toLowerCase());
  }
  
  /**
   * Check if a location has been discovered
   */
  public isLocationDiscovered(locationName: string): boolean {
    return this.discoveredLocations.has(locationName.toLowerCase());
  }
  
  /**
   * Get all discovered locations
   */
  public getDiscoveredLocations(): string[] {
    return Array.from(this.discoveredLocations);
  }
  
  /**
   * Advance the world time by a number of minutes
   */
  public advanceTime(minutes: number): void {
    const oldTime = this.worldTime;
    const oldTimeOfDay = this.timeOfDay;
    const oldWeather = this.weather;
    
    this.worldTime += minutes;
    
    // Update time of day
    const hour = Math.floor(this.worldTime / 60) % 24;
    
    if (hour >= 5 && hour < 8) {
      this.timeOfDay = 'dawn';
    } else if (hour >= 8 && hour < 18) {
      this.timeOfDay = 'day';
    } else if (hour >= 18 && hour < 21) {
      this.timeOfDay = 'dusk';
    } else {
      this.timeOfDay = 'night';
    }
    
    // Update location lighting based on time of day
    if (this.currentLocation.terrain !== 'underground') {
      this.currentLocation.lighting = this.timeOfDay === 'night' ? 'dark' : 
                                       this.timeOfDay === 'dusk' ? 'dim' : 'bright';
    }
    
    // Potentially change weather (very simple for now)
    if (minutes > 60 && Math.random() < 0.2) {
      const weatherTypes = ['clear', 'cloudy', 'rainy', 'foggy'];
      const newWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
      
      if (newWeather !== this.weather) {
        this.weather = newWeather;
        // Emit weather changed event
        this.emit('weatherChanged', this.weather, oldWeather);
      }
    }
    
    // Emit time advanced event
    this.emit('timeAdvanced', this.worldTime, minutes);
  }
  
  /**
   * Get the current world time in minutes
   */
  public getWorldTime(): number {
    return this.worldTime;
  }
  
  /**
   * Get a formatted string of the current time
   */
  public getCurrentTimeString(): string {
    const hour = Math.floor(this.worldTime / 60) % 24;
    const minute = this.worldTime % 60;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    
    const timeString = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
    return `${timeString} (${this.timeOfDay}, ${this.weather})`;
  }
  
  /**
   * Generate a description of the current location with time and weather context
   */
  public async getEnhancedLocationDescription(): Promise<string> {
    // Get the base description
    let description = this.currentLocation.description;
    
    // Add time and weather context
    description += `\n\nIt is ${this.getCurrentTimeString()}.`;
    
    // Add contextual details based on time and weather
    if (this.timeOfDay === 'night') {
      description += ' The darkness casts long shadows, and the stars twinkle overhead.';
    } else if (this.timeOfDay === 'dawn') {
      description += ' The first rays of morning light cast a gentle glow over everything.';
    } else if (this.timeOfDay === 'dusk') {
      description += ' The sun is setting, painting the sky in shades of gold and crimson.';
    }
    
    if (this.weather === 'rainy') {
      description += ' Raindrops patter against surfaces, creating a soothing rhythm.';
    } else if (this.weather === 'foggy') {
      description += ' A thick fog obscures distant objects, giving everything a mysterious appearance.';
    } else if (this.weather === 'cloudy') {
      description += ' Gray clouds hang low in the sky, threatening rain.';
    }
    
    // Add information about exits and NPCs
    description += this.getExitsDescription();
    description += this.getNPCsDescription();
    
    return description;
  }
  
  /**
   * Generate a description of the exits from the current location
   */
  private getExitsDescription(): string {
    if (this.currentLocation.connections.size === 0) {
      return '\n\nThere are no obvious exits.';
    }
    
    const exits = Array.from(this.currentLocation.connections.entries())
      .map(([direction, name]) => `${direction} to ${name}`);
    
    return `\n\nExits: ${exits.join(', ')}.`;
  }
  
  /**
   * Generate a description of the NPCs in the current location
   */
  private getNPCsDescription(): string {
    if (!this.currentLocation.npcs || this.currentLocation.npcs.length === 0) {
      return '\n\nThere is no one else here.';
    }
    
    const npcNames = this.currentLocation.npcs.map(npc => npc.name);
    
    if (npcNames.length === 1) {
      return `\n\n${npcNames[0]} is here.`;
    } else if (npcNames.length === 2) {
      return `\n\n${npcNames[0]} and ${npcNames[1]} are here.`;
    } else {
      const lastNPC = npcNames.pop();
      return `\n\n${npcNames.join(', ')}, and ${lastNPC} are here.`;
    }
  }
  
  /**
   * Create a new location connected to the current location
   */
  public async createConnectedLocation(
    name: string,
    direction: string,
    template: Partial<LocationTemplate>
  ): Promise<Location> {
    // Set the name
    template.name = name;
    
    // Create connections to the current location
    const oppositeDirection = this.getOppositeDirection(direction);
    const connections = new Map<string, string>();
    connections.set(oppositeDirection, this.currentLocation.name);
    
    // Generate the new location
    const newLocation = await this.worldGenerator.generateLocation(template, connections);
    
    // Connect the current location to the new location
    this.currentLocation.connections.set(direction, name);
    
    return newLocation;
  }
  
  /**
   * Update the player reference
   */
  public updatePlayer(player: Character): void {
    this.player = player;
  }
} 