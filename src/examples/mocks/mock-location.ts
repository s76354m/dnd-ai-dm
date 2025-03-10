/**
 * Mock Location for examples
 */

import { MockNPC } from './mock-npc';

/**
 * A simplified mock of Location for examples
 */
export class MockLocation {
  public id: string;
  public name: string;
  public type: string;
  public region: string;
  public description: string;
  public detailedDescription: string;
  public npcsPresent: MockNPC[];
  public objects: {
    name: string;
    description: string;
    isInteractive: boolean;
  }[];
  public exits: {
    direction: string;
    destinationId: string | null;
    destinationName: string;
    description: string;
  }[];
  public ambience: {
    lighting: string;
    sounds: string[];
    smells: string[];
    mood: string;
    weather: string | null; // null if indoors
  };
  
  /**
   * Create a mock location with default values
   * 
   * @param name Location name
   * @param type Location type (tavern, forest, cave, etc.)
   * @param region Region name
   * @param description Brief description of the location
   */
  constructor(name: string, type: string, region: string, description: string) {
    this.id = `loc_${Math.random().toString(36).substring(2, 9)}`;
    this.name = name;
    this.type = type;
    this.region = region;
    this.description = description;
    
    // Generate a more detailed description based on the type
    this.detailedDescription = this.getDetailedDescription(type, description);
    
    // Default to empty NPCs array
    this.npcsPresent = [];
    
    // Generate default objects based on the type
    this.objects = this.getDefaultObjects(type);
    
    // Generate default exits based on the type
    this.exits = this.getDefaultExits(type);
    
    // Generate default ambience based on the type
    this.ambience = this.getDefaultAmbience(type);
  }
  
  /**
   * Generate a detailed description based on the location type
   */
  private getDetailedDescription(type: string, basicDescription: string): string {
    let details = '';
    
    switch (type.toLowerCase()) {
      case 'tavern':
        details = `${basicDescription} The establishment is filled with wooden tables and chairs, a long bar with stools runs along one wall. Bottles of various liquors are displayed behind the bar, and a staircase leads to rooms upstairs. A fireplace provides warmth and light to the main room.`;
        break;
      case 'forest':
        details = `${basicDescription} Towering trees create a canopy overhead, filtering the sunlight into dappled patterns on the forest floor. The ground is covered with fallen leaves, moss, and various undergrowth. Animal trails weave between the trees, and the sounds of wildlife can be heard in the distance.`;
        break;
      case 'cave':
        details = `${basicDescription} The stone walls are damp and cold to the touch. Stalactites hang from the ceiling, and stalagmites rise from the floor in some areas. The air is cool and has a slight earthy smell. Sounds echo slightly in the confined space.`;
        break;
      case 'shop':
        details = `${basicDescription} Shelves and display cases are filled with various goods for sale. A counter stands near the back where the shopkeeper conducts business. The space is organized but somewhat cramped, with items of all shapes and sizes competing for space.`;
        break;
      case 'temple':
        details = `${basicDescription} The space has a reverent atmosphere, with symbols of the deity displayed prominently. Benches or pews are arranged for worshippers, and an altar stands at the focal point. Candles or other appropriate light sources illuminate the space, and incense might fill the air.`;
        break;
      default:
        details = basicDescription;
    }
    
    return details;
  }
  
  /**
   * Generate default objects based on the location type
   */
  private getDefaultObjects(type: string): { name: string; description: string; isInteractive: boolean; }[] {
    const objects: { name: string; description: string; isInteractive: boolean; }[] = [];
    
    switch (type.toLowerCase()) {
      case 'tavern':
        objects.push(
          { name: 'Bar', description: 'A long wooden bar with a polished top and several stools.', isInteractive: true },
          { name: 'Fireplace', description: 'A stone fireplace with a crackling fire that provides warmth and light.', isInteractive: true },
          { name: 'Tables', description: 'Several wooden tables and chairs scattered throughout the room.', isInteractive: true },
          { name: 'Notice Board', description: 'A wooden board with various notices and job postings pinned to it.', isInteractive: true }
        );
        break;
      case 'forest':
        objects.push(
          { name: 'Trees', description: 'Tall trees with thick trunks and branches that reach toward the sky.', isInteractive: false },
          { name: 'Undergrowth', description: 'Bushes, ferns, and other plants that cover the forest floor.', isInteractive: true },
          { name: 'Stream', description: 'A small stream of clear water flowing through the forest.', isInteractive: true },
          { name: 'Fallen Log', description: 'A large fallen tree trunk covered in moss and fungi.', isInteractive: true }
        );
        break;
      case 'cave':
        objects.push(
          { name: 'Stalactites', description: 'Stone formations hanging from the ceiling like icicles.', isInteractive: false },
          { name: 'Stalagmites', description: 'Stone formations rising from the floor like spikes.', isInteractive: false },
          { name: 'Underground Pool', description: 'A small pool of dark, still water.', isInteractive: true },
          { name: 'Rock Formation', description: 'An unusual rock formation that catches the eye.', isInteractive: true }
        );
        break;
      case 'shop':
        objects.push(
          { name: 'Counter', description: 'A wooden counter where the shopkeeper conducts business.', isInteractive: true },
          { name: 'Shelves', description: 'Shelves filled with various goods for sale.', isInteractive: true },
          { name: 'Display Case', description: 'A glass case displaying more valuable or delicate items.', isInteractive: true },
          { name: 'Cash Box', description: 'A locked box where the shopkeeper keeps money.', isInteractive: false }
        );
        break;
      default:
        objects.push(
          { name: 'Generic Object', description: 'A nondescript object in the location.', isInteractive: true }
        );
    }
    
    return objects;
  }
  
  /**
   * Generate default exits based on the location type
   */
  private getDefaultExits(type: string): { direction: string; destinationId: string | null; destinationName: string; description: string; }[] {
    const exits: { direction: string; destinationId: string | null; destinationName: string; description: string; }[] = [];
    
    switch (type.toLowerCase()) {
      case 'tavern':
        exits.push(
          { direction: 'north', destinationId: null, destinationName: 'Street', description: 'The main door leading to the street outside.' },
          { direction: 'up', destinationId: null, destinationName: 'Second Floor', description: 'A wooden staircase leading to guest rooms on the second floor.' },
          { direction: 'east', destinationId: null, destinationName: 'Kitchen', description: 'A doorway leading to the kitchen area.' }
        );
        break;
      case 'forest':
        exits.push(
          { direction: 'north', destinationId: null, destinationName: 'Deeper Forest', description: 'The forest continues, becoming darker and more dense.' },
          { direction: 'south', destinationId: null, destinationName: 'Forest Edge', description: 'The forest thins out, suggesting an edge or clearing ahead.' },
          { direction: 'east', destinationId: null, destinationName: 'Forest Path', description: 'A narrow path winding through the trees.' },
          { direction: 'west', destinationId: null, destinationName: 'Rocky Terrain', description: 'The ground becomes more rocky and elevated.' }
        );
        break;
      case 'cave':
        exits.push(
          { direction: 'south', destinationId: null, destinationName: 'Cave Entrance', description: 'The entrance/exit of the cave, leading outside.' },
          { direction: 'north', destinationId: null, destinationName: 'Deeper Passage', description: 'A narrow passage leading deeper into the cave system.' }
        );
        break;
      default:
        exits.push(
          { direction: 'north', destinationId: null, destinationName: 'Outside', description: 'An exit leading outside.' }
        );
    }
    
    return exits;
  }
  
  /**
   * Generate default ambience based on the location type
   */
  private getDefaultAmbience(type: string): { lighting: string; sounds: string[]; smells: string[]; mood: string; weather: string | null; } {
    let ambience = {
      lighting: 'well-lit',
      sounds: ['ambient noise'],
      smells: ['fresh air'],
      mood: 'neutral',
      weather: null as string | null
    };
    
    switch (type.toLowerCase()) {
      case 'tavern':
        ambience = {
          lighting: 'warm, flickering light from the fireplace and candles',
          sounds: ['murmuring conversations', 'clinking of glasses', 'occasional laughter'],
          smells: ['roasting meat', 'freshly baked bread', 'ale and wine'],
          mood: 'cozy and welcoming',
          weather: null // indoors
        };
        break;
      case 'forest':
        ambience = {
          lighting: 'dappled sunlight filtering through the leaves',
          sounds: ['rustling leaves', 'chirping birds', 'distant animal calls'],
          smells: ['earthy scent of soil and vegetation', 'fresh air', 'pine needles'],
          mood: 'peaceful but watchful',
          weather: 'clear' // outdoors, can change
        };
        break;
      case 'cave':
        ambience = {
          lighting: 'dark, with only faint light from the entrance',
          sounds: ['dripping water', 'distant echoes', 'occasional creaking or settling'],
          smells: ['damp stone', 'earth', 'slight mustiness'],
          mood: 'mysterious and slightly ominous',
          weather: null // indoors/underground
        };
        break;
      case 'shop':
        ambience = {
          lighting: 'well-lit by windows during day, lanterns at night',
          sounds: ['creaking floorboards', 'jingling of coins', 'quiet conversations'],
          smells: ['various goods', 'dust', 'polish or oil'],
          mood: 'busy and commercial',
          weather: null // indoors
        };
        break;
    }
    
    return ambience;
  }
  
  /**
   * Add an NPC to the location
   */
  public addNPC(npc: MockNPC): void {
    this.npcsPresent.push(npc);
  }
  
  /**
   * Remove an NPC from the location
   */
  public removeNPC(npcId: string): boolean {
    const index = this.npcsPresent.findIndex(npc => npc.id === npcId);
    if (index >= 0) {
      this.npcsPresent.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Find an NPC at the location
   */
  public findNPC(npcName: string): MockNPC | undefined {
    return this.npcsPresent.find(npc => 
      npc.name.toLowerCase() === npcName.toLowerCase()
    );
  }
  
  /**
   * Add an object to the location
   */
  public addObject(
    name: string,
    description: string,
    isInteractive: boolean = true
  ): void {
    this.objects.push({
      name,
      description,
      isInteractive
    });
  }
  
  /**
   * Find an object at the location
   */
  public findObject(objectName: string): { name: string; description: string; isInteractive: boolean; } | undefined {
    return this.objects.find(obj => 
      obj.name.toLowerCase() === objectName.toLowerCase()
    );
  }
  
  /**
   * Add an exit to the location
   */
  public addExit(
    direction: string,
    destinationName: string,
    description: string,
    destinationId: string | null = null
  ): void {
    this.exits.push({
      direction,
      destinationId,
      destinationName,
      description
    });
  }
  
  /**
   * Find an exit from the location
   */
  public findExit(direction: string): { direction: string; destinationId: string | null; destinationName: string; description: string; } | undefined {
    return this.exits.find(exit => 
      exit.direction.toLowerCase() === direction.toLowerCase()
    );
  }
  
  /**
   * Update the weather (if applicable)
   */
  public setWeather(weather: string): void {
    this.ambience.weather = weather;
  }
  
  /**
   * Update the mood/atmosphere
   */
  public setMood(mood: string): void {
    this.ambience.mood = mood;
  }
} 