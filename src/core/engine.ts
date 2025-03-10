import { GameEngine, DMEngine } from './interfaces/engine';
import { GameState } from './interfaces/game';
import { Location } from './interfaces/world';
import { Character } from './interfaces/character';
import type { DMPersonality } from './types';
import { CombatState } from './interfaces/combat';
import { NPC } from './interfaces/npc';
import { NPCAttitude } from './interfaces/npc';

export interface BaseDMEngine {
  personality: DMPersonality;
  // Add other properties and methods as required
}

export class AIDMEngine implements BaseDMEngine {
  private gameState!: GameState;
  personality: DMPersonality = 'neutral';

  /**
   * Create a new AI Dungeon Master engine
   * @param initialState Optional initial game state. If not provided, a new game state will be created when initializeGame is called
   */
  constructor(initialState?: GameState) {
    if (initialState) {
      this.gameState = initialState;
    }
  }

  /**
   * Get the current game state
   * @returns The current game state
   */
  getGameState(): GameState {
    return this.gameState;
  }

  async initializeGame(player: Character): Promise<void> {
    if (this.gameState) {
      // Game state already exists, just update the player
      this.gameState.player = player;
      
      // Check if the current location exists AND is properly initialized
      // We consider it properly initialized if it has an id property
      if (!this.gameState.currentLocation || !this.gameState.currentLocation.id) {
        console.log("Initializing starting location as it was empty or incomplete");
        this.gameState.currentLocation = this.generateStartingLocation();
      }
      
      return;
    }

    // Create locations
    const tavernLocation = this.generateStartingLocation();
    const villageSquare = this.generateVillageSquare();
    const marketplace = this.generateMarketplace();
    const blacksmith = this.generateBlacksmith();
    const temple = this.generateTemple();
    
    // Create a map of locations
    const locations = new Map<string, Location>();
    locations.set(tavernLocation.id, tavernLocation);
    locations.set(villageSquare.id, villageSquare);
    locations.set(marketplace.id, marketplace);
    locations.set(blacksmith.id, blacksmith);
    locations.set(temple.id, temple);
    
    // Initialize the game state with default values
    this.gameState = {
      player,
      currentLocation: tavernLocation,
      quests: [],
      inventory: {
        gold: 10,
        items: [],
        maxWeight: 50,
        currentWeight: 0
      },
      locations: locations,
      visitedLocations: [tavernLocation.id],
      npcs: new Map(),
      sessionHistory: [],
      inCombat: false
    };
  }

  private generateStartingLocation(): Location {
    // Create NPCs for the tavern
    const innkeeper: NPC = {
      id: 'npc-innkeeper',
      name: 'Eldon the Innkeeper',
      description: 'A portly man with a cheerful smile and ruddy complexion.',
      race: 'human',
      attitude: NPCAttitude.Friendly,
      isQuestGiver: true,
      dialogue: [
        {
          greeting: "Welcome to the Silver Tankard! What can I get for ya?",
          options: {
            "Tell me about this place": "The Silver Tankard's been in my family for three generations. Best ale in the region, if I do say so myself!",
            "Heard any rumors lately?": "Well, there's been talk of strange creatures in the woods to the east. And the old ruins north of town have been glowing at night, or so they say.",
            "I'm looking for work": "As it happens, I might have something. My cellar's got a rat problem that's gotten out of hand. Clear 'em out and there's 10 gold in it for you."
          }
        }
      ]
    };
    
    const bard: NPC = {
      id: 'npc-bard',
      name: 'Melody the Bard',
      description: 'A slender half-elf with a lute and a knowing smile.',
      race: 'half-elf',
      attitude: NPCAttitude.Friendly,
      isQuestGiver: false,
      dialogue: [
        {
          greeting: "Ah, a new face! Come to hear tales of adventure and wonder?",
          options: {
            "Play me a song": "With pleasure! *She strums her lute and begins a lively tune about a hero's journey*",
            "Tell me about yourself": "I travel far and wide collecting stories and songs. The best tales are found in the most unexpected places.",
            "What brings you here?": "I follow the coin and the stories. This tavern sits at a crossroads of trade and travelers - perfect for someone in my profession."
          }
        }
      ]
    };

    // Create the starting location
    return {
      id: 'starting-tavern',
      name: 'The Silver Tankard',
      description: 'A cozy tavern filled with the scent of hearty food and ale. The wooden beams overhead are darkened by years of smoke from the large fireplace. Patrons chat at tables while a bard plays softly in the corner.',
      connections: new Map([
        ['north', 'village-square'],
        ['east', 'market-street'],
        ['west', 'back-alley']
      ]),
      npcs: new Map([
        [innkeeper.id, innkeeper],
        [bard.id, bard]
      ]),
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban',
      detailedDescription: {
        overview: 'The Silver Tankard is the main gathering place in the village of Greenfield.',
        visualDetails: 'Oak tables and chairs fill the room, with a long bar along one wall. Lanterns cast a warm glow throughout.',
        soundDetails: 'The soft strumming of a lute mingles with conversation and occasional laughter.',
        smellDetails: 'The rich aroma of roasting meat and freshly baked bread fills the air, along with the scent of ale.',
        atmosphereDetails: 'The atmosphere is welcoming and lively, with villagers and travelers alike sharing stories.'
      }
    };
  }

  /**
   * Generate the village square location
   */
  private generateVillageSquare(): Location {
    // Create NPCs for the square
    const guard: NPC = {
      id: 'npc-guard',
      name: 'Village Guard',
      description: 'A stern-looking guard wearing chainmail and equipped with a spear.',
      race: 'human',
      attitude: NPCAttitude.Neutral,
      isQuestGiver: false,
      dialogue: [
        {
          greeting: "Keep the peace while you're here, traveler.",
          options: {
            "Tell me about this village": "Greenfield's a peaceful place. Keep it that way, and we'll get along just fine.",
            "Any trouble lately?": "Some reports of strange creatures in the woods to the east. Best stay clear unless you're looking for trouble.",
            "I'm looking for work": "Speak to the mayor if you're seeking official business, or check the notice board over there."
          }
        }
      ]
    };
    
    const child: NPC = {
      id: 'npc-child',
      name: 'Village Child',
      description: 'A young child playing with a wooden toy.',
      race: 'human',
      attitude: NPCAttitude.Friendly,
      isQuestGiver: false,
      dialogue: [
        {
          greeting: "Hello! Wanna play?",
          options: {
            "What are you playing?": "I'm a mighty knight fighting the dragon! My brother's the dragon.",
            "Have you seen anything unusual lately?": "I saw a strange light in the old ruins at night. Papa says I'm not supposed to go there.",
            "I have to go now": "Okay, bye!"
          }
        }
      ]
    };
    
    return {
      id: 'village-square',
      name: 'Greenfield Village Square',
      description: 'The heart of the village, with a central fountain and stone bench seating. A notice board stands near the northern path, covered with various announcements and requests.',
      connections: new Map([
        ['south', 'starting-tavern'],
        ['east', 'marketplace'],
        ['west', 'blacksmith'],
        ['north', 'temple']
      ]),
      npcs: new Map([
        [guard.id, guard],
        [child.id, child]
      ]),
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban',
      detailedDescription: {
        overview: 'The village square serves as the central gathering place for Greenfield.',
        visualDetails: 'A cobblestone square surrounds a circular fountain where water splashes gently. Several wooden benches provide seating for villagers.',
        soundDetails: 'The gentle sound of flowing water from the fountain mixes with distant conversations and occasional laughter.',
        smellDetails: 'The air is fresh with a hint of nearby flowers and bread from the bakery.',
        atmosphereDetails: 'The atmosphere is peaceful and welcoming, with villagers going about their daily business.'
      }
    };
  }

  /**
   * Generate the marketplace location
   */
  private generateMarketplace(): Location {
    // Create NPCs for the marketplace
    const merchant: NPC = {
      id: 'npc-merchant',
      name: 'Galen the Merchant',
      description: 'A well-dressed merchant with a friendly smile and keen eyes.',
      race: 'human',
      attitude: NPCAttitude.Friendly,
      isQuestGiver: true,
      dialogue: [
        {
          greeting: "Welcome, traveler! I have wares from across the realm. What catches your eye?",
          options: {
            "Show me what you have for sale": "I have fine clothes, tools, and supplies. What are you looking for specifically?",
            "Where do your goods come from?": "I travel the trade routes to the capital and back, bringing the finest goods I can find.",
            "I'm looking for something special": "Something special, you say? Well, I might have a rare item or two. For the right price, of course."
          }
        }
      ]
    };
    
    const farmwife: NPC = {
      id: 'npc-farmwife',
      name: 'Martha the Farmer',
      description: 'A sturdy woman with callused hands and a weathered face, selling fresh produce.',
      race: 'human',
      attitude: NPCAttitude.Friendly,
      isQuestGiver: false,
      dialogue: [
        {
          greeting: "Fresh vegetables! Get your fresh vegetables here!",
          options: {
            "These look delicious": "All grown on my family's farm just outside the village. Best soil in the region!",
            "How's the harvest this year?": "Good enough, though we've had some trouble with pests in the eastern fields. My husband thinks it's unnatural.",
            "I'm not interested": "No worries, friend. Come back if you change your mind."
          }
        }
      ]
    };
    
    return {
      id: 'marketplace',
      name: 'Greenfield Marketplace',
      description: 'A bustling marketplace with various stalls selling goods from food to crafts. Colorful awnings provide shade for merchants and customers alike.',
      connections: new Map([
        ['west', 'village-square']
      ]),
      npcs: new Map([
        [merchant.id, merchant],
        [farmwife.id, farmwife]
      ]),
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban',
      detailedDescription: {
        overview: 'The marketplace is the commercial center of Greenfield village.',
        visualDetails: 'Wooden stalls with colorful awnings line the edges of the square. Merchants display their wares on tables and shelves.',
        soundDetails: 'The air is filled with the sounds of bargaining, friendly greetings, and occasional announcements of special deals.',
        smellDetails: 'Aromas of fresh bread, spices, and fruits mingle together, creating a pleasant sensory experience.',
        atmosphereDetails: 'The marketplace buzzes with activity as villagers and travelers browse goods, haggle over prices, and exchange news.'
      }
    };
  }

  /**
   * Generate the blacksmith location
   */
  private generateBlacksmith(): Location {
    // Create NPC for the blacksmith
    const blacksmith: NPC = {
      id: 'npc-blacksmith',
      name: 'Thorden the Blacksmith',
      description: 'A burly dwarf with a thick beard, strong arms, and soot-covered apron.',
      race: 'dwarf',
      attitude: NPCAttitude.Neutral,
      isQuestGiver: true,
      dialogue: [
        {
          greeting: "Need something forged or repaired? You've come to the right place.",
          options: {
            "I need weapons or armor": "I can craft or repair whatever you need. Quality work isn't cheap, but it'll keep you alive.",
            "What's your best piece?": "Made a fine steel sword for the captain of the guard last month. Perfect balance, edge sharp enough to split a hair.",
            "Can you teach me smithing?": "Hah! I've been at the forge for fifty years, lad/lass. Not something you learn in an afternoon. But I suppose I could show you the basics... for a price."
          }
        }
      ]
    };
    
    return {
      id: 'blacksmith',
      name: "Thorden's Forge",
      description: 'A sweltering smithy with a roaring forge, anvils, and racks of weapons and armor in various stages of completion.',
      connections: new Map([
        ['east', 'village-square']
      ]),
      npcs: new Map([
        [blacksmith.id, blacksmith]
      ]),
      items: [],
      isHostile: false,
      lighting: 'dim',
      terrain: 'urban',
      detailedDescription: {
        overview: "Thorden's Forge is the only blacksmith shop in Greenfield, producing tools, weapons, and armor.",
        visualDetails: 'The forge glows orange at the center of the stone building. Tools hang from the walls, and partially completed metalwork sits on various surfaces.',
        soundDetails: 'The rhythmic clang of hammer on metal rings through the air, accompanied by the hiss of hot metal being quenched in water.',
        smellDetails: 'The strong scents of hot metal, coal smoke, and leather permeate everything.',
        atmosphereDetails: 'The forge has an industrious atmosphere, warm from the fire and alive with the sounds of creation.'
      }
    };
  }

  /**
   * Generate the temple location
   */
  private generateTemple(): Location {
    // Create NPC for the temple
    const priestess: NPC = {
      id: 'npc-priestess',
      name: 'High Priestess Elara',
      description: 'A serene elven woman in flowing silver robes with symbols of the moon goddess.',
      race: 'elf',
      attitude: NPCAttitude.Friendly,
      isQuestGiver: true,
      dialogue: [
        {
          greeting: "Selune's light upon you, traveler. How may I assist you today?",
          options: {
            "I seek healing": "The goddess provides healing to all who seek it. For a small donation to the temple, of course.",
            "Tell me about your goddess": "Selune is the goddess of the moon, stars, and navigation. She watches over travelers and those who work in the night, granting them her silvery light to guide their way.",
            "I sense darkness in these lands": "Your perception serves you well. Something disturbs the balance. The creatures in the forest have grown more aggressive, and I sense a malevolent presence in the old ruins to the north."
          }
        }
      ]
    };
    
    const acolyte: NPC = {
      id: 'npc-acolyte',
      name: 'Temple Acolyte',
      description: 'A young human in simple robes, dutifully attending to the temple.',
      race: 'human',
      attitude: NPCAttitude.Friendly,
      isQuestGiver: false,
      dialogue: [
        {
          greeting: "Welcome to the Temple of Selune. May I assist you?",
          options: {
            "What do you do here?": "I maintain the temple, assist with ceremonies, and learn from the High Priestess. One day, I hope to serve Selune as she does.",
            "How long have you been here?": "Three years now. My family sent me to serve when I started having prophetic dreams under the full moon.",
            "I'll speak to the High Priestess": "Of course. She's just over there."
          }
        }
      ]
    };
    
    return {
      id: 'temple',
      name: 'Temple of Selune',
      description: 'A beautiful stone temple with tall windows that allow moonlight to stream in at night. Silver symbols of the moon adorn the walls and columns.',
      connections: new Map([
        ['south', 'village-square']
      ]),
      npcs: new Map([
        [priestess.id, priestess],
        [acolyte.id, acolyte]
      ]),
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban',
      detailedDescription: {
        overview: 'The Temple of Selune serves as both a place of worship and a source of healing for the village.',
        visualDetails: 'Moonlight filters through stained glass windows depicting the phases of the moon. Silver and blue decorations adorn the altar.',
        soundDetails: 'Soft chanting and gentle music create a peaceful ambiance. Occasionally, a silver bell rings to mark the hours.',
        smellDetails: 'The scent of moonflower incense fills the air, creating a calming atmosphere.',
        atmosphereDetails: 'The temple radiates peace and tranquility, offering respite from the troubles of the world outside.'
      }
    };
  }

  async saveGame(): Promise<void> {
    // Placeholder implementation
  }

  async loadGame(saveId: string): Promise<void> {
    // Placeholder implementation
  }

  async generateResponse(context: GameState, input: string): Promise<string> {
    return `Response to: ${input}`;
  }

  describeLocation(): Promise<string> {
    // Get the current location and handle undefined case
    const location = this.gameState.currentLocation;
    if (!location) {
      return Promise.resolve("You find yourself in a mysterious void. (Error: Location not defined)");
    }
    
    // Check if there's a detailed description available
    if (location.detailedDescription) {
      const detailed = location.detailedDescription;
      return Promise.resolve(
        `${location.name}\n\n${detailed.overview}\n\n${detailed.visualDetails} ${detailed.soundDetails} ${detailed.smellDetails}\n\n${detailed.atmosphereDetails}`
      );
    }
    
    // Fall back to basic description if detailed is not available
    return Promise.resolve(location.description || "You are in an unremarkable place.");
  }

  nartateCombat(state: CombatState): string {
    return 'Combat narration';
  }

  handlePlayerAction(action: string): Promise<string> {
    return Promise.resolve(`Handling action: ${action}`);
  }

  generateNPC(): NPC {
    return {
      id: `npc-${Date.now()}`,
      name: 'Generic NPC',
      description: 'A mysterious stranger',
      race: 'human',
      attitude: NPCAttitude.Neutral,
      isQuestGiver: false,
      dialogue: [
        {
          greeting: "Hello there.",
          options: {
            "Who are you?": "Just a passerby, like yourself.",
            "What do you do here?": "I mind my own business. You should try it sometime.",
            "Goodbye": "Farewell."
          }
        }
      ]
    };
  }

  async processCommand(command: string): Promise<string> {
    return `DM Response to: ${command}`;
  }

  private generateHero(): Character {
    return {
      name: "Hero",
      race: "Human",
      class: "Fighter",
      level: 1,
      hitPoints: 10,
      maxHitPoints: 10,
      abilityScores: {
        strength: 12,
        dexterity: 10,
        constitution: 14,
        intelligence: 8,
        wisdom: 10,
        charisma: 10
      }
    };
  }
} 