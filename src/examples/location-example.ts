import { EnhancedLocationGenerator } from '../world/enhanced-location-generator';
import { WorldRegion } from '../world/generator';
import { AIService, AIResponse } from '../config/ai-service';
import { AIComponent } from '../config/ai-config';

// Create a mock AIService
class MockAIService extends AIService {
  constructor() {
    super();
  }
  
  // Override methods with mock implementations
  async generateCompletion(
    prompt: string,
    component: AIComponent = 'dm',
    options: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } = {}
  ): Promise<AIResponse> {
    return {
      text: `This is a mock description for ${component} generation with prompt: "${prompt.substring(0, 20)}..."`,
      model: 'mock-model',
      provider: 'openai'
    };
  }
  
  async generateNarrative(): Promise<string> {
    return "This is a mock narrative.";
  }
  
  createNarrativePrompt(): string {
    return "Mock narrative prompt";
  }
  
  async generateDialogue(): Promise<string> {
    return "This is mock dialogue.";
  }
  
  async generateNPCDialogue(): Promise<string> {
    return "This is mock NPC dialogue.";
  }
  
  async generateCombatNarration(): Promise<string> {
    return "This is a mock combat narration.";
  }
  
  async generateLocationDescription(): Promise<string> {
    return "This is a mock location description.";
  }
  
  async generateResponseOptions(): Promise<string> {
    return "This is a mock response options.";
  }
  
  async generateQuest(): Promise<string> {
    return "This is a mock quest.";
  }
  
  async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
  }
}

// Create sample regions for testing
const regions: WorldRegion[] = [
  {
    name: 'Green Valley',
    description: 'A lush green valley with rolling hills and small forests.',
    primaryTerrain: 'plains' as any,
    dangerLevel: 2,
    locations: new Map(),
    locationsGraph: new Map()
  },
  {
    name: 'Frostpeak Mountains',
    description: 'Towering snow-capped mountains with treacherous passes and hidden valleys.',
    primaryTerrain: 'mountain' as any,
    dangerLevel: 5,
    locations: new Map(),
    locationsGraph: new Map()
  },
  {
    name: 'Searing Desert',
    description: 'A vast, arid wasteland of sand dunes and scorched earth.',
    primaryTerrain: 'desert' as any,
    dangerLevel: 7,
    locations: new Map(),
    locationsGraph: new Map()
  }
];

// Main function to run the location generation example
const runLocationExample = async () => {
  console.log('=== D&D AI DM Location Generation Example ===\n');
  
  // Create the location generator with a mock AI service
  const locationGenerator = new EnhancedLocationGenerator(new MockAIService() as any);
  
  // Add the regions to the generator
  regions.forEach(region => {
    (locationGenerator as any).regions.set(region.name, region);
  });
  
  // Generate and display a variety of location types in different regions
  const locationTypes = [
    'town', 'village', 'city', 'tavern', 'inn', 'shop', 'temple', 'guild', 
    'forest', 'mountain', 'cave', 'dungeon', 'ruin'
  ];

  // Demonstrate a variety of locations
  for (let i = 0; i < 5; i++) {
    // Pick a random region and location type
    const region = regions[Math.floor(Math.random() * regions.length)];
    const locationType = locationTypes[Math.floor(Math.random() * locationTypes.length)];
    
    console.log(`\n--- Generating ${locationType} in ${region.name} ---`);
    
    // Generate the location with a proper template
    const location = await locationGenerator.generateLocation({
      type: locationType as any,
      name: `${region.name} ${locationType.charAt(0).toUpperCase() + locationType.slice(1)}`,
      isHostile: false,
      mood: 'peaceful',
      terrain: region.primaryTerrain,
      lighting: 'bright'
    }, new Map(), region.name);
    
    // Display the location details
    console.log(`Name: ${location.name}`);
    console.log(`Type: ${location.type}`);
    console.log(`Description: ${location.description}`);
    
    // Display NPCs
    if (location.npcs && location.npcs.length > 0) {
      console.log('\nNPCs:');
      location.npcs.forEach(npc => {
        console.log(`- ${npc.name} (${npc.race} ${npc.occupation}): ${npc.description}`);
        console.log(`  Attitude: ${npc.attitude}`);
        console.log(`  Quest Giver: ${npc.isQuestGiver ? 'Yes' : 'No'}`);
        console.log(`  Knowledge: ${npc.knowledge ? Array.from(npc.knowledge.keys()).join(', ') : 'None'}`);
      });
    } else {
      console.log('\nNPCs: None');
    }
    
    // Display Items
    if (location.items && location.items.length > 0) {
      console.log('\nItems:');
      location.items.forEach(item => {
        console.log(`- ${item.name} (${item.type}): ${item.description}`);
        console.log(`  Value: ${item.value} gold, Weight: ${item.weight} lbs`);
      });
    } else {
      console.log('\nItems: None');
    }
    
    // Display Connections instead of Exits
    if (location.connections && location.connections.size > 0) {
      console.log('\nConnections:');
      location.connections.forEach((locationId, direction) => {
        console.log(`- ${direction}: leads to ${locationId}`);
      });
    } else {
      console.log('\nConnections: None');
    }
    
    console.log('\n' + '='.repeat(50));
  }
  
  console.log('\n--- Generating a Town with Interconnected Locations ---');
  
  // Generate a town with multiple sub-locations
  const town = await locationGenerator.generateLocation({
    type: 'town' as any,
    name: 'Meadowbrook',
    isHostile: false,
    mood: 'peaceful',
    terrain: 'temperate' as any,
    lighting: 'bright'
  }, new Map(), regions[0].name);
  
  console.log(`\nTown Name: ${town.name}`);
  console.log(`Description: ${town.description}`);
  
  // Generate sub-locations for the town
  const subLocationTypes = ['tavern', 'shop', 'temple', 'guild'];
  const subLocations = [];
  
  for (const type of subLocationTypes) {
    console.log(`\nGenerating ${type} in ${town.name}...`);
    const subLocation = await locationGenerator.generateLocation({
      type: type as any,
      name: `${town.name} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      isHostile: false,
      mood: 'peaceful',
      terrain: 'temperate' as any,
      lighting: 'bright'
    }, new Map(), regions[0].name);
    
    subLocations.push(subLocation);
    
    console.log(`- ${subLocation.name} (${subLocation.type})`);
    console.log(`  Description: ${subLocation.description}`);
    
    if (subLocation.npcs && subLocation.npcs.length > 0) {
      console.log(`  Notable NPCs: ${subLocation.npcs.map(npc => npc.name).join(', ')}`);
    }
  }
  
  console.log('\n=== Location Generation Example Complete ===');
};

// Run the example
runLocationExample().catch(console.error); 