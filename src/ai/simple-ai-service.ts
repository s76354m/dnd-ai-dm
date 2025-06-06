/**
 * Simple AI Service
 * 
 * A simplified version of the AI service for development purposes.
 * This provides basic narrative generation and NPC interaction without requiring
 * a connection to a real AI service. It uses pre-defined templates and randomization
 * to generate responses.
 */


// Simple AI context to maintain continuity
interface SimpleAIContext {
  previousInteractions: string[];
  playerName: string;
  playerRace: string;
  playerClass: string;
  currentLocation: string;
  visitedLocations: string[];
  npcInteractions: Record<string, string[]>;
  maxContextSize: number;
}

// Response templates for different locations
const locationDescriptions: Record<string, string[]> = {
  'cave entrance': [
    "The cave entrance looms before you, a dark maw in the hillside. Moss clings to the rocks surrounding it, and a cool breeze whispers out from the darkness within.",
    "Standing at the mouth of the cave, you feel a slight chill in the air coming from inside. The entrance is framed by ancient-looking stones, some bearing faded carvings.",
    "The entrance to the cave is partially hidden by overgrown vines and shrubs. As you approach, you notice the ground has been disturbed recently, suggesting others have passed this way."
  ],
  'inside cave': [
    "The interior of the cave is cool and damp. Water drips somewhere in the darkness, creating echoing splashes. Your footsteps resonate off the stone walls.",
    "Stalactites hang from the ceiling of the cave, some reaching down almost to the floor. The air smells of earth and stone, and the temperature is noticeably cooler than outside.",
    "The cave opens into a wider chamber, with passages leading deeper into the darkness. Small crystals embedded in the walls catch what little light there is, creating a subtle shimmer."
  ],
  'forest clearing': [
    "Sunlight filters through the canopy of leaves, creating dappled patterns on the forest floor. The clearing is peaceful, with wildflowers dotting the lush grass.",
    "The forest clearing provides a welcome respite from the dense woods. Birds chirp overhead, and a small stream bubbles along the eastern edge of the open space.",
    "This natural clearing is ringed by ancient trees whose branches reach up to the sky. In the center, a circle of stones suggests this place once held significance to someone."
  ],
  'village': [
    "The small village consists of a cluster of wooden buildings with thatched roofs. Smoke rises from chimneys, and you can see people going about their daily business.",
    "Quaint cottages line the village's main dirt road. A blacksmith hammers away at an anvil, while children play with a dog nearby. The smell of fresh bread wafts from what must be the bakery.",
    "The village appears welcoming, with flower boxes decorating many of the windows. In the center stands a well where several villagers have gathered to chat. An old wooden sign points to an establishment called 'The Rusty Mug'."
  ]
};

// NPC names and traits
const npcTemplates = [
  { name: "Eldon", race: "human", profession: "innkeeper", trait: "curious" },
  { name: "Tharwen", race: "elf", profession: "hunter", trait: "reserved" },
  { name: "Grimmir", race: "dwarf", profession: "blacksmith", trait: "boisterous" },
  { name: "Lila", race: "halfling", profession: "baker", trait: "cheerful" },
  { name: "Morath", race: "human", profession: "guard", trait: "suspicious" },
  { name: "Sybil", race: "human", profession: "herbalist", trait: "wise" }
];

// Templates for NPC interactions
const npcDialogueTemplates: Record<string, string[]> = {
  "greeting": [
    "Greetings, traveler. Haven't seen you around these parts before.",
    "Well met! What brings you to our humble [LOCATION]?",
    "Oh, a [RACE] [CLASS]! We don't get many of your kind around here.",
    "Welcome to [LOCATION]. I'm [NAME], the local [PROFESSION]."
  ],
  "rumor": [
    "Have you heard about the strange lights seen in the hills to the north?",
    "They say the old cave has been home to some unusual activity lately.",
    "Word is that a band of goblins has been raiding farms on the outskirts.",
    "The village elder has been acting strangely since returning from the forest last week."
  ],
  "quest": [
    "Say, if you're not in a hurry, I could use help with something. Some [CREATURES] have been causing trouble, and I'd pay well for someone to deal with them.",
    "I've lost a [ITEM] that means a great deal to me. Last I had it was near [LOCATION]. I'd be grateful if you could keep an eye out for it.",
    "The road to the next town has become dangerous. If someone were to make it safer, the merchants would surely show their appreciation.",
    "I've heard rumors of an ancient [ITEM] hidden in a cave nearby. Someone with your skills might be able to find it."
  ]
};

// Creatures for random encounters and quests
const creatures = [
  "wolves", "goblins", "bandits", "giant spiders", "skeletons", "wild boars"
];

// Items for quests and rewards
const items = [
  "amulet", "ring", "sword", "map", "key", "book", "gemstone", "potion"
];

/**
 * Simple AI Service class
 */
export class SimpleAIService {
  private context: SimpleAIContext;

  private readonly actionResponses: Record<string, string[]> = {
    'move': [
      "You make your way carefully to the new location.",
      "You travel along the path, keeping an eye out for danger.",
      "Moving cautiously, you proceed to your destination.",
      "You journey forth, alert and ready for whatever awaits.",
      "With determined steps, you make your way forward."
    ],
    'search': [
      "You search the area carefully, looking for anything of interest.",
      "You examine your surroundings with a keen eye.",
      "You methodically investigate the area, checking for hidden objects.",
      "You scan the environment, searching for anything unusual.",
      "You look around attentively, hoping to find something valuable."
    ],
    'combat': [
      "You prepare yourself for battle, readying your weapons.",
      "You adopt a fighting stance, ready to face your enemies.",
      "You steel your nerves as you prepare to engage in combat.",
      "You draw your weapon, ready to face the threat before you.",
      "With practiced movements, you ready yourself for the coming fight."
    ],
    'talk': [
      "You approach and start a conversation.",
      "You speak in a friendly tone, hoping to gain information.",
      "You carefully choose your words as you begin speaking.",
      "You engage in conversation, watching for reactions.",
      "You introduce yourself and begin a dialogue."
    ]
  };

  private readonly weatherDescriptions: string[] = [
    "The sky is clear, with a gentle breeze providing relief from the sun's warmth.",
    "Dark clouds gather overhead, threatening rain at any moment.",
    "A light drizzle falls, creating a soothing patter on the leaves and ground.",
    "Fog clings to the ground, limiting visibility and creating an eerie atmosphere.",
    "The wind howls, bending trees and making travel difficult.",
    "Snow falls gently, covering the landscape in a pristine white blanket.",
    "The air is still and heavy with humidity, making it difficult to breathe.",
    "Lightning flashes in the distance, followed by the low rumble of thunder."
  ];

  private readonly timeDescriptions: Record<string, string[]> = {
    'morning': [
      "The morning sun casts long shadows as it climbs into the sky.",
      "Dew glistens on the grass in the early morning light.",
      "The air is crisp and fresh with the promise of a new day.",
      "Birds sing their morning songs as the world awakens."
    ],
    'afternoon': [
      "The sun is high in the sky, bathing everything in warm light.",
      "The heat of the afternoon sun bears down on the land.",
      "Shadows shorten as the sun reaches its zenith.",
      "The afternoon buzzes with activity as creatures go about their business."
    ],
    'evening': [
      "The setting sun paints the sky in hues of orange and pink.",
      "Long shadows stretch across the ground as the day comes to an end.",
      "The air begins to cool as the sun dips toward the horizon.",
      "The evening brings a sense of calm as daily activities wind down."
    ],
    'night': [
      "Stars twinkle in the dark sky, providing faint illumination.",
      "The moon casts an ethereal glow over the landscape.",
      "Darkness envelops the world, broken only by the light of the moon and stars.",
      "Nocturnal creatures stir as the night deepens."
    ]
  };

  /**
   * Create a new SimpleAIService
   * 
   * @param playerName The name of the player character
   * @param playerRace The race of the player character
   * @param playerClass The class of the player character
   */
  constructor(playerName?: string, playerRace?: string, playerClass?: string) {
    this.context = {
      previousInteractions: [],
      playerName: playerName || 'Adventurer',
      playerRace: playerRace || 'human',
      playerClass: playerClass || 'fighter',
      currentLocation: 'cave entrance',
      visitedLocations: ['cave entrance'],
      npcInteractions: {},
      maxContextSize: 10
    };
  }

  /**
   * Update the current location in the AI context
   * 
   * @param location The new current location
   */
  public updateLocation(location: string): void {
    if (!this.context.visitedLocations.includes(location)) {
      this.context.visitedLocations.push(location);
    }
    this.context.currentLocation = location;
  }

  /**
   * Generate a description for the current location
   * 
   * @returns A description of the current location
   */
  public generateLocationDescription(): string {
    const location = this.context.currentLocation;
    const descriptions = locationDescriptions[location] || ["You are in an unremarkable place."];
    
    // Get a random description for this location
    const randomIndex = Math.floor(Math.random() * descriptions.length);
    return descriptions[randomIndex];
  }

  /**
   * Generate a weather description based on current context
   * 
   * @returns A description of the current weather
   */
  public generateWeatherDescription(): string {
    return this.getRandomElement(this.weatherDescriptions);
  }

  /**
   * Generate a time description based on current context
   * 
   * @param timeOfDay The time of day (morning, afternoon, evening, night)
   * @returns A description of the time of day
   */
  public generateTimeDescription(timeOfDay: string): string {
    const descriptions = this.timeDescriptions[timeOfDay] || this.timeDescriptions['afternoon'];
    return this.getRandomElement(descriptions);
  }

  /**
   * Generate an NPC for the current location
   * 
   * @returns An NPC object
   */
  public generateNPC() {
    const randomIndex = Math.floor(Math.random() * npcTemplates.length);
    return { ...npcTemplates[randomIndex] };
  }

  /**
   * Generate dialogue for an NPC interaction
   * 
   * @param npcName The name of the NPC
   * @param npcProfession The profession of the NPC
   * @param interactionType The type of interaction (greeting, rumor, quest)
   * @returns The NPC's dialogue
   */
  public generateNPCDialogue(npcName: string, npcProfession: string, interactionType: 'greeting' | 'rumor' | 'quest'): string {
    const templates = npcDialogueTemplates[interactionType] || ["Hello there."];
    let randomIndex = Math.floor(Math.random() * templates.length);
    let dialogue = templates[randomIndex];
    
    // Replace placeholders with actual values
    dialogue = dialogue.replace('[NAME]', npcName);
    dialogue = dialogue.replace('[RACE]', this.context.playerRace);
    dialogue = dialogue.replace('[CLASS]', this.context.playerClass);
    dialogue = dialogue.replace('[LOCATION]', this.context.currentLocation);
    dialogue = dialogue.replace('[PROFESSION]', npcProfession);
    
    // Replace creature and item placeholders if present
    if (dialogue.includes('[CREATURES]')) {
      const creatureIndex = Math.floor(Math.random() * creatures.length);
      dialogue = dialogue.replace('[CREATURES]', creatures[creatureIndex]);
    }
    
    if (dialogue.includes('[ITEM]')) {
      const itemIndex = Math.floor(Math.random() * items.length);
      dialogue = dialogue.replace('[ITEM]', items[itemIndex]);
    }
    
    // Store this interaction in the context
    if (!this.context.npcInteractions[npcName]) {
      this.context.npcInteractions[npcName] = [];
    }
    this.context.npcInteractions[npcName].push(dialogue);
    
    // Maintain context size
    if (this.context.npcInteractions[npcName].length > this.context.maxContextSize) {
      this.context.npcInteractions[npcName].shift();
    }
    
    return dialogue;
  }

  /**
   * Generate a narrative response to a player action
   * 
   * @param action The action performed by the player
   * @returns A narrative description of the result
   */
  public generateActionResponse(action: string): string {
    const responses = this.actionResponses[action] || this.actionResponses['move'];
    const response = this.getRandomElement(responses);
    
    // Add this interaction to the context
    this.context.previousInteractions.push(`Player: ${action}`);
    this.context.previousInteractions.push(`AI: ${response}`);
    
    // Maintain context size
    while (this.context.previousInteractions.length > this.context.maxContextSize * 2) {
      this.context.previousInteractions.shift();
      this.context.previousInteractions.shift();
    }
    
    return response;
  }

  /**
   * Generate a combat encounter description
   * 
   * @returns A description of a random combat encounter
   */
  public generateCombatEncounter(): { enemy: string, description: string } {
    const enemies = [
      "wolf", "goblin", "bandit", "giant spider", "skeleton", "wild boar"
    ];
    
    const encounterTemplates = [
      "As you [ACTIVITY], a [ENEMY] suddenly appears, ready to attack!",
      "You hear a growl, and turn to see a [ENEMY] approaching with hostile intent.",
      "A [ENEMY] jumps out from hiding, catching you by surprise!",
      "You round a corner and come face to face with a [ENEMY]."
    ];
    
    const activities = [
      "make your way forward", 
      "examine your surroundings", 
      "rest for a moment", 
      "check your equipment"
    ];
    
    const enemyIndex = Math.floor(Math.random() * enemies.length);
    const enemy = enemies[enemyIndex];
    
    const templateIndex = Math.floor(Math.random() * encounterTemplates.length);
    let description = encounterTemplates[templateIndex];
    
    const activityIndex = Math.floor(Math.random() * activities.length);
    description = description.replace('[ACTIVITY]', activities[activityIndex]);
    description = description.replace('[ENEMY]', enemy);
    
    return { enemy, description };
  }

  /**
   * Generate a description of a found item
   * 
   * @returns A description of a random item discovery
   */
  public generateItemDiscovery(): { item: string, description: string } {
    const discoveryTemplates = [
      "While exploring, you notice something glinting in the [LOCATION]. It's a [ITEM]!",
      "As you [ACTIVITY], you discover a [ITEM] hidden nearby.",
      "You spot a [ITEM] that someone seems to have left behind.",
      "Partially buried in the [LOCATION], you find a [ITEM]."
    ];
    
    const discoveryLocations = [
      "dirt", "shadows", "corner", "undergrowth", "rubble"
    ];
    
    const activities = [
      "search the area", 
      "move some debris", 
      "look behind a rock", 
      "check a hidden alcove"
    ];
    
    const itemIndex = Math.floor(Math.random() * items.length);
    const item = items[itemIndex];
    
    const templateIndex = Math.floor(Math.random() * discoveryTemplates.length);
    let description = discoveryTemplates[templateIndex];
    
    const locationIndex = Math.floor(Math.random() * discoveryLocations.length);
    description = description.replace('[LOCATION]', discoveryLocations[locationIndex]);
    
    const activityIndex = Math.floor(Math.random() * activities.length);
    description = description.replace('[ACTIVITY]', activities[activityIndex]);
    
    description = description.replace('[ITEM]', item);
    
    return { item, description };
  }

  /**
   * Get a random element from an array
   * 
   * @param array The array to select from
   * @returns A random element from the array
   */
  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
} 