/**
 * Enhanced Location Generator
 * 
 * This module extends the base WorldGenerator with advanced prompt templates
 * for more dynamic and detailed location generation.
 */

import { Location } from '../core/interfaces/location';
import { NPC } from '../core/interfaces/npc';
import { AIService } from '../dm/ai-service';
import { createPromptTemplate } from '../dm/prompts/advanced-prompt-templates';
import { LocationPromptTemplate } from '../dm/prompts/advanced-prompt-templates';
import { createStyle, StyleOptions } from '../dm/prompts/advanced-prompt-templates';
import { LocationTemplate, WorldGenerator, WorldRegion } from './generator';
import { appConfig } from '../config';
import { NPCAttitude } from '../core/interfaces/npc';

export class EnhancedLocationGenerator extends WorldGenerator {
  constructor(aiService: AIService) {
    super(aiService);
  }

  /**
   * Get the current region name
   */
  public getCurrentRegion(): string {
    return this.currentRegion;
  }

  /**
   * Generate a location using advanced prompt templates for richer descriptions
   */
  public async generateEnhancedLocation(
    template: Partial<LocationTemplate>,
    styleOptions?: Partial<StyleOptions>,
    connections: Map<string, string> = new Map(),
    regionName: string = this.getCurrentRegion()
  ): Promise<Location> {
    // Get the region
    const region = this.getRegion(regionName);
    if (!region) {
      throw new Error(`Region ${regionName} does not exist`);
    }
    
    // Fill in missing template values with defaults
    const fullTemplate = this.completeTemplate(template, region);
    
    // Create a location prompt template with appropriate style
    const promptTemplate = createPromptTemplate('location') as LocationPromptTemplate;
    
    // Apply style options or use defaults based on location mood
    const style = this.getMoodBasedStyle(fullTemplate.mood, styleOptions);
    
    // Prepare context for location generation
    const locationContext = {
      name: fullTemplate.name,
      type: fullTemplate.type,
      terrain: fullTemplate.terrain,
      region: region.name,
      time: fullTemplate.time,
      weather: fullTemplate.weather,
      dangerLevel: region.dangerLevel,
      mood: fullTemplate.mood,
      isHostile: fullTemplate.isHostile
    };
    
    // Generate a description using the advanced prompt template
    let description: string;
    try {
      const prompt = promptTemplate.generatePrompt(locationContext, '', style);
      
      const systemPrompt = promptTemplate.formatSystemPrompt(style);
      
      // Call the AI service with the formatted prompts
      const response = await this.aiService.generateCompletion(
        prompt,
        'story',
        {
          systemPrompt,
          temperature: appConfig.aiCreativity
        }
      );
      
      description = response.text;
    } catch (error) {
      console.warn(`Failed to generate enhanced description for ${fullTemplate.name}, using fallback description`, error);
      // Use a simple description as fallback
      description = `A ${fullTemplate.mood} ${fullTemplate.type} with ${fullTemplate.terrain} terrain.`;
    }
    
    // Generate NPCs appropriate for this location
    const npcs = await this.generateNPCs(fullTemplate.type, region);
    
    // Generate items appropriate for this location
    const items = this.generateItems(fullTemplate.type);
    
    // Create the location
    const location: Location = {
      id: this.generateLocationId(fullTemplate.name),
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
    const locationId = this.generateLocationId(location.name);
    region.locations.set(locationId, location);
    
    // Update the region's location graph
    this.updateLocationGraph(locationId, connections, region);
    
    return location;
  }
  
  /**
   * Gets style options based on the location's mood
   */
  private getMoodBasedStyle(mood: string, customOptions?: Partial<StyleOptions>): StyleOptions {
    // Define mood-based default styles
    const moodStyles: Record<string, Partial<StyleOptions>> = {
      'peaceful': { 
        tone: 'neutral', 
        verbosity: 'detailed',
        language: 'standard',
        perspective: 'second-person'
      },
      'tense': { 
        tone: 'dramatic', 
        verbosity: 'concise',
        language: 'standard',
        perspective: 'second-person'
      },
      'dangerous': { 
        tone: 'gritty', 
        verbosity: 'detailed',
        language: 'standard',
        perspective: 'second-person'
      },
      'mysterious': { 
        tone: 'mysterious', 
        verbosity: 'detailed',
        language: 'standard',
        perspective: 'second-person'
      },
      'festive': { 
        tone: 'comedic', 
        verbosity: 'moderate',
        language: 'standard',
        perspective: 'second-person'
      },
      'abandoned': { 
        tone: 'dramatic', 
        verbosity: 'detailed',
        language: 'standard',
        perspective: 'second-person'
      },
      'sacred': { 
        tone: 'epic', 
        verbosity: 'moderate',
        language: 'standard',
        perspective: 'second-person'
      }
    };
    
    // Get mood-specific style or use default
    const baseStyle = moodStyles[mood] || {};
    
    // Merge with custom options if provided
    return createStyle({
      ...baseStyle,
      ...customOptions
    });
  }
  
  /**
   * Updates the location graph with new connections
   * This overrides the parent method to handle Map<string, string> connections
   */
  protected updateLocationGraph(locationId: string, connections: Map<string, string> | Record<string, string>, region: WorldRegion): void {
    // Call the parent method with the connections
    super.updateLocationGraph(locationId, connections, region);
  }
  
  /**
   * Generate a location ID from a name
   */
  private generateLocationId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Generate NPCs for a location
   */
  private async generateNPCs(locationType: string, region: WorldRegion): Promise<NPC[]> {
    const npcs: NPC[] = [];
    let numberOfNPCs = 0;
    
    // Determine the appropriate number of NPCs based on location type
    switch (locationType) {
      case 'town':
      case 'village':
      case 'city':
        numberOfNPCs = Math.floor(Math.random() * 3) + 3; // 3-5 NPCs
        break;
      case 'tavern':
      case 'inn':
      case 'shop':
        numberOfNPCs = Math.floor(Math.random() * 2) + 2; // 2-3 NPCs
        break;
      case 'temple':
      case 'guild':
        numberOfNPCs = Math.floor(Math.random() * 2) + 1; // 1-2 NPCs
        break;
      case 'wilderness':
      case 'forest':
      case 'mountain':
      case 'cave':
        numberOfNPCs = Math.floor(Math.random() * 2); // 0-1 NPCs
        break;
      case 'dungeon':
      case 'ruin':
        numberOfNPCs = 0; // No friendly NPCs in dungeons/ruins
        break;
      default:
        numberOfNPCs = Math.floor(Math.random() * 2); // 0-1 NPCs for unknown types
    }
    
    // Generate the NPCs
    for (let i = 0; i < numberOfNPCs; i++) {
      // Determine NPC type
      let npcType: string;
      const roll = Math.random();
      
      if (roll < 0.1 && (locationType === 'tavern' || locationType === 'inn')) {
        npcType = 'innkeeper';
      } else if (roll < 0.2 && (locationType === 'shop' || locationType === 'market')) {
        npcType = 'merchant';
      } else if (roll < 0.3 && (locationType === 'temple' || locationType === 'shrine')) {
        npcType = 'priest';
      } else if (roll < 0.4 && (locationType === 'guild' || locationType === 'academy')) {
        npcType = 'scholar';
      } else if (roll < 0.5 && locationType === 'barracks') {
        npcType = 'guard';
      } else if (roll < 0.7) {
        npcType = 'commoner';
      } else if (roll < 0.9) {
        npcType = 'traveler';
      } else {
        npcType = 'adventurer';
      }
      
      // Generate NPC attributes
      const npcId = `npc-${region.name.toLowerCase()}-${locationType}-${i}`;
      const races = ['human', 'elf', 'dwarf', 'halfling', 'gnome', 'half-elf', 'half-orc'];
      const race = races[Math.floor(Math.random() * races.length)];
      
      const attitudes = ['friendly', 'helpful', 'neutral', 'suspicious', 'gruff'];
      const attitude = attitudes[Math.floor(Math.random() * attitudes.length)];
      
      // Add more variety based on location type
      let isQuestGiver = false;
      if ((npcType === 'innkeeper' || npcType === 'merchant' || npcType === 'priest') && Math.random() < 0.5) {
        isQuestGiver = true;
      }
      
      // Create and return the NPC
      const npc: NPC = {
        id: npcId,
        name: await this.generateNPCName(race),
        race,
        occupation: npcType,
        description: `A ${attitude} ${race} ${npcType}`,
        attitude: attitude === 'friendly' ? NPCAttitude.Friendly : (attitude === 'suspicious' || attitude === 'gruff' ? NPCAttitude.Neutral : NPCAttitude.Hostile),
        isQuestGiver,
        dialogue: [],
        location: `${region.name.toLowerCase()}-${locationType}`,
        knowledge: new Map(this.generateDialogueTopics(npcType, locationType, region.name).map(topic => [topic, Math.floor(Math.random() * 4) + 1])),
        stats: {
          level: 1,
          hitPoints: { current: 10, maximum: 10 },
          armorClass: 10,
          abilityScores: {
            strength: { score: 10, modifier: 0 },
            dexterity: { score: 10, modifier: 0 },
            constitution: { score: 10, modifier: 0 },
            intelligence: { score: 10, modifier: 0 },
            wisdom: { score: 10, modifier: 0 },
            charisma: { score: 10, modifier: 0 }
          }
        }
      };
      
      npcs.push(npc);
    }
    
    return npcs;
  }

  /**
   * Generate a name for an NPC
   */
  private async generateNPCName(race: string): Promise<string> {
    // Simple name generation for basic implementation
    const firstNames: Record<string, string[]> = {
      'human': ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Elizabeth'],
      'elf': ['Aerith', 'Thranduil', 'Legolas', 'Galadriel', 'Elrond', 'Arwen', 'Celeborn'],
      'dwarf': ['Thorin', 'Balin', 'Dwalin', 'Gloin', 'Gimli', 'Bombur', 'Bofur', 'Durin'],
      'halfling': ['Bilbo', 'Frodo', 'Sam', 'Pippin', 'Merry', 'Rosie', 'Lobelia', 'Hamfast'],
      'gnome': ['Gimble', 'Zook', 'Fibblestib', 'Namfoodle', 'Zilyana', 'Glimmerbell'],
      'half-elf': ['Elarion', 'Thalien', 'Seliene', 'Varien', 'Aenwyn', 'Daeren', 'Melian'],
      'half-orc': ['Gruck', 'Thokk', 'Zarkhul', 'Morgha', 'Bruga', 'Durthu', 'Gralk']
    };
    
    const lastNames: Record<string, string[]> = {
      'human': ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis'],
      'elf': ['Silverleaf', 'Moonshadow', 'Starweaver', 'Nightbreeze', 'Sunstrider'],
      'dwarf': ['Stonehammer', 'Ironforge', 'Goldbeard', 'Rockseeker', 'Battlehammer'],
      'halfling': ['Baggins', 'Gamgee', 'Took', 'Brandybuck', 'Proudfoot', 'Goodbarrel'],
      'gnome': ['Tinkertop', 'Gearturner', 'Sparkspanner', 'Quickwit', 'Clockmender'],
      'half-elf': ['Evenwood', 'Halfelven', 'Starborn', 'Riverwind', 'Duskheart'],
      'half-orc': ['Wolfbane', 'Skullcrusher', 'Bonecrusher', 'Orcblood', 'Strongarm']
    };
    
    // Get random name for this race
    const raceFirstNames = firstNames[race] || firstNames.human;
    const raceLastNames = lastNames[race] || lastNames.human;
    
    const firstName = raceFirstNames[Math.floor(Math.random() * raceFirstNames.length)];
    const lastName = raceLastNames[Math.floor(Math.random() * raceLastNames.length)];
    
    return `${firstName} ${lastName}`;
  }
  
  /**
   * Generate basic dialogue topics for an NPC
   */
  private generateDialogueTopics(npcType: string, locationType: string, regionName: string): string[] {
    const topics: string[] = [];
    
    // Basic topics all NPCs know about
    topics.push('greetings', 'local_area');
    
    // Topics based on NPC type
    switch (npcType) {
      case 'innkeeper':
        topics.push('lodging', 'local_rumors', 'food_and_drink', 'recent_travelers');
        break;
      case 'merchant':
        topics.push('goods', 'prices', 'trade_routes', 'rare_items');
        break;
      case 'priest':
        topics.push('religion', 'blessing', 'local_spirits', 'healing');
        break;
      case 'scholar':
        topics.push('history', 'lore', 'magic', 'ancient_ruins');
        break;
      case 'guard':
        topics.push('security', 'local_laws', 'recent_crimes', 'threats');
        break;
      case 'commoner':
        topics.push('daily_life', 'local_gossip', 'weather', 'local_events');
        break;
      case 'traveler':
        topics.push('roads', 'distant_places', 'travel_dangers', 'strange_sights');
        break;
      case 'adventurer':
        topics.push('monsters', 'treasure', 'heroic_deeds', 'quests');
        break;
    }
    
    // Topics based on location type
    switch (locationType) {
      case 'tavern':
      case 'inn':
        topics.push('local_rumors', 'recent_visitors');
        break;
      case 'shop':
      case 'market':
        topics.push('local_economy', 'merchandise');
        break;
      case 'temple':
      case 'shrine':
        topics.push('local_deities', 'religious_customs');
        break;
      case 'wilderness':
      case 'forest':
      case 'mountain':
        topics.push('local_wildlife', 'natural_hazards', 'hidden_locations');
        break;
      case 'dungeon':
      case 'ruin':
        topics.push('dangers', 'treasure', 'ancient_history');
        break;
    }
    
    // Region-specific topics
    topics.push(`${regionName.toLowerCase()}_history`, `${regionName.toLowerCase()}_leader`);
    
    return [...new Set(topics)]; // Remove any duplicates
  }

  /**
   * Generate items for a location
   */
  private generateItems(locationType: string): any[] {
    const items = [];
    let numberOfItems = 0;
    
    // Determine the appropriate number of items based on location type
    switch (locationType) {
      case 'shop':
      case 'market':
        numberOfItems = Math.floor(Math.random() * 4) + 3; // 3-6 items
        break;
      case 'tavern':
      case 'inn':
        numberOfItems = Math.floor(Math.random() * 2) + 1; // 1-2 items
        break;
      case 'temple':
      case 'guild':
      case 'barracks':
        numberOfItems = Math.floor(Math.random() * 2) + 1; // 1-2 items
        break;
      case 'dungeon':
      case 'ruin':
      case 'cave':
        numberOfItems = Math.floor(Math.random() * 3); // 0-2 items
        break;
      default:
        numberOfItems = Math.floor(Math.random() * 2); // 0-1 items
    }
    
    // Common item templates
    const itemTemplates = [
      {
        name: 'Gold Coins',
        description: 'A small pouch of gold coins',
        type: 'treasure',
        value: () => Math.floor(Math.random() * 10) + 5, // 5-14 gold
        weight: 0.1
      },
      {
        name: 'Healing Potion',
        description: 'A small vial of red liquid that heals wounds',
        type: 'potion',
        value: () => 50,
        weight: 0.5
      },
      {
        name: 'Torch',
        description: 'A wooden torch that provides light',
        type: 'gear',
        value: () => 1,
        weight: 1
      },
      {
        name: 'Dagger',
        description: 'A simple metal dagger',
        type: 'weapon',
        value: () => 2,
        weight: 1
      },
      {
        name: 'Bread',
        description: 'A loaf of fresh bread',
        type: 'food',
        value: () => 0.2,
        weight: 0.5
      },
      {
        name: 'Rope',
        description: '50 feet of hempen rope',
        type: 'gear',
        value: () => 1,
        weight: 10
      },
      {
        name: 'Book',
        description: 'A leather-bound book with interesting information',
        type: 'gear',
        value: () => 25,
        weight: 5
      }
    ];
    
    // Generate location-specific items
    for (let i = 0; i < numberOfItems; i++) {
      // Select a random template based on location type
      let template;
      const roll = Math.random();
      
      if (locationType === 'shop' && roll < 0.7) {
        // Shops mostly have gear and supplies
        template = itemTemplates.find(t => t.type === 'gear' || t.type === 'food');
      } else if (locationType === 'tavern' && roll < 0.7) {
        // Taverns mostly have food and drink
        template = itemTemplates.find(t => t.type === 'food');
      } else if ((locationType === 'dungeon' || locationType === 'ruin') && roll < 0.7) {
        // Dungeons and ruins mostly have treasure or weapons
        template = itemTemplates.find(t => t.type === 'treasure' || t.type === 'weapon');
      } else if (locationType === 'temple' && roll < 0.7) {
        // Temples mostly have healing or specialty items
        template = itemTemplates.find(t => t.type === 'potion');
      } else {
        // Random item for other locations
        template = itemTemplates[Math.floor(Math.random() * itemTemplates.length)];
      }
      
      // If we didn't find a specific item, pick random
      if (!template) {
        template = itemTemplates[Math.floor(Math.random() * itemTemplates.length)];
      }
      
      // Create the item from the template
      const item = {
        id: `item-${locationType}-${i}`,
        name: template.name,
        description: template.description,
        type: template.type,
        value: template.value(),
        weight: template.weight,
        quantity: 1,
        isEquipped: false,
        properties: []
      };
      
      items.push(item);
    }
    
    return items;
  }
  
  /**
   * Completes a location template with default values
   * This overrides the parent method to add enhanced defaults
   */
  protected completeTemplate(template: Partial<LocationTemplate>, region: WorldRegion): LocationTemplate {
    // Call the parent method first to get basic defaults
    const baseTemplate = super.completeTemplate(template, region);
    
    // Add enhanced defaults
    return {
      ...baseTemplate,
      // Add any enhanced defaults here
    };
  }

  /**
   * Generate a name for a location based on its type
   */
  private generateName(locationType: string): string {
    const prefixes = {
      'town_square': ['Central', 'Market', 'Town', 'Village'],
      'tavern': ['The', 'Old', 'Silver', 'Golden'],
      'forest': ['Dark', 'Mystic', 'Ancient', 'Whispering'],
      'cave': ['Hidden', 'Deep', 'Crystal', 'Shadow'],
      'temple': ['Sacred', 'Ancient', 'Divine', 'Blessed']
    };
    
    const suffixes = {
      'town_square': ['Square', 'Plaza', 'Commons', 'Center'],
      'tavern': ['Tavern', 'Inn', 'Pub', 'Alehouse'],
      'forest': ['Forest', 'Woods', 'Grove', 'Thicket'],
      'cave': ['Cave', 'Cavern', 'Grotto', 'Hollow'],
      'temple': ['Temple', 'Shrine', 'Sanctuary', 'Chapel']
    };
    
    const typeKey = locationType as keyof typeof prefixes;
    const prefix = prefixes[typeKey] || ['Mysterious'];
    const suffix = suffixes[typeKey] || ['Place'];
    
    const randomPrefix = prefix[Math.floor(Math.random() * prefix.length)];
    const randomSuffix = suffix[Math.floor(Math.random() * suffix.length)];
    
    return `${randomPrefix} ${randomSuffix}`;
  }
} 