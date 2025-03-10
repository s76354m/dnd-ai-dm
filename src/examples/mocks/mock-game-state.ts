/**
 * Mock GameState for examples
 */

import { MockLocation } from './mock-location';
import { MockCharacter } from './mock-character';
import { MockNPC } from './mock-npc';

/**
 * A simplified mock of GameState for examples
 */
export class MockGameState {
  public currentLocation: MockLocation;
  public player: MockCharacter;
  public npcs: MockNPC[];
  public gameTime: {
    day: number;
    hour: number;
    timeOfDay: string;
  };
  public weather: string;
  
  constructor() {
    // Create a default tavern location
    this.currentLocation = new MockLocation(
      'The Silver Tankard',
      'tavern',
      'Northbrook',
      'A cozy tavern with a roaring fireplace and the scent of fresh bread and ale in the air.'
    );
    
    // Create a default player character
    this.player = new MockCharacter('Thoren', 'Dwarf', 'Fighter');
    
    // Create some NPCs
    this.npcs = [
      new MockNPC('Elara', 'Elf', 'Innkeeper', 'slender build and silver-streaked hair'),
      new MockNPC('Gorm', 'Human', 'Blacksmith', 'broad shoulders and a thick beard'),
      new MockNPC('Lyra', 'Halfling', 'Bard', 'curly auburn hair and a mischievous smile')
    ];
    
    // Set default game time
    this.gameTime = {
      day: 1,
      hour: 18,
      timeOfDay: 'evening'
    };
    
    // Set default weather
    this.weather = 'clear';
  }
  
  /**
   * Get characters present at the current location
   */
  public getCharactersPresent(): (MockCharacter | MockNPC)[] {
    return [this.player, ...this.npcs];
  }
  
  /**
   * Get an NPC by name
   */
  public getNPC(name: string): MockNPC | undefined {
    return this.npcs.find(npc => npc.name === name);
  }
  
  /**
   * Update game time
   */
  public advanceTime(hours: number): void {
    this.gameTime.hour += hours;
    
    // Handle day change
    while (this.gameTime.hour >= 24) {
      this.gameTime.hour -= 24;
      this.gameTime.day += 1;
    }
    
    // Update time of day
    if (this.gameTime.hour >= 5 && this.gameTime.hour < 12) {
      this.gameTime.timeOfDay = 'morning';
    } else if (this.gameTime.hour >= 12 && this.gameTime.hour < 17) {
      this.gameTime.timeOfDay = 'afternoon';
    } else if (this.gameTime.hour >= 17 && this.gameTime.hour < 21) {
      this.gameTime.timeOfDay = 'evening';
    } else {
      this.gameTime.timeOfDay = 'night';
    }
  }
  
  /**
   * Change location
   */
  public changeLocation(location: MockLocation): void {
    this.currentLocation = location;
  }
  
  /**
   * Change weather
   */
  public setWeather(weather: string): void {
    this.weather = weather;
  }
} 