import { GameState, ResolvedCommand, Location } from '../core/interfaces';
// Mock imports for now - these will need to be implemented or replaced
const aiService = {
  generateNarrative: async (context: any) => {
    return `Generated narrative based on context`;
  }
};

/**
 * Process a movement command
 * @param command The resolved movement command
 * @param gameState Current game state
 * @returns Result of the movement
 */
export async function processMove(
  command: ResolvedCommand, 
  gameState: GameState
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  // Check if in combat
  if (gameState.combatState) {
    return {
      message: "You can't move to a different location while in combat!",
      shouldSave: false
    };
  }
  
  // Get the direction from the command
  const direction = command.direction?.toLowerCase();
  
  // Check if the direction is valid
  if (!direction || !gameState.currentLocation.connections || !gameState.currentLocation.connections.has(direction)) {
    return {
      message: `You can't go ${direction || 'that way'} from here.`,
      shouldSave: false
    };
  }
  
  // Get the destination location ID
  const destinationId = gameState.currentLocation.connections.get(direction);
  
  // Load or generate the destination location
  const destination = await getLocation(destinationId, gameState);
  
  if (!destination) {
    return {
      message: "You can't go that way right now.",
      shouldSave: false
    };
  }
  
  // Generate a narrative for entering the new location
  let narrative: string;
  try {
    // Add context for the narrative
    const context = {
      type: 'movement',
      direction,
      previousLocation: gameState.currentLocation.name,
      newLocation: destination.name,
      timeOfDay: gameState.gameTime?.timeOfDay || 'day',
      weather: gameState.worldState?.currentWeather || 'clear'
    };
    narrative = await aiService.generateNarrative(context);
  } catch (error) {
    // Fallback message if narrative generation fails
    narrative = `You travel ${direction} and arrive at ${destination.name}.\n\n${destination.description}`;
  }
  
  // Update the game state
  return {
    message: `You move ${direction} to ${destination.name}.\n\n${destination.description}`,
    stateChanges: {
      currentLocation: destination,
      sessionHistory: gameState.sessionHistory ? 
        [...gameState.sessionHistory, {
          type: 'movement',
          from: gameState.currentLocation.id,
          to: destination.id,
          timestamp: Date.now()
        }] : 
        [{
          type: 'movement',
          from: gameState.currentLocation.id,
          to: destination.id,
          timestamp: Date.now()
        }]
    },
    shouldSave: true
  };
}

/**
 * Get a location by ID
 * @param locationId ID of the location to retrieve
 * @param gameState Current game state
 * @returns The location object or null if not found
 */
async function getLocation(locationId: string | undefined, gameState: GameState): Promise<Location | null> {
  if (!locationId) {
    return null;
  }
  
  // Check if the location is already in the game state
  if (gameState.locations && gameState.locations.has(locationId)) {
    return gameState.locations.get(locationId) || null;
  }
  
  // Check if the location is in the world state
  if (gameState.worldState && 
      typeof gameState.worldState === 'object' && 
      'locations' in gameState.worldState && 
      typeof gameState.worldState.locations === 'object' && 
      locationId in (gameState.worldState.locations as Record<string, Location>)) {
    return (gameState.worldState.locations as Record<string, Location>)[locationId];
  }
  
  // Create a basic town map if it doesn't exist
  if (!gameState.locations || gameState.locations.size === 0) {
    // Create the town square
    const townSquare: Location = {
      id: 'town_square',
      name: 'Town Square',
      description: 'The bustling center of the town, with a fountain in the middle.',
      type: 'town',
      connections: new Map([
        ['north', 'castle_gate'],
        ['south', 'starting_tavern'],
        ['east', 'market_district'],
        ['west', 'residential_district']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    };
    
    // Create the market district
    const marketDistrict: Location = {
      id: 'market_district',
      name: 'Market District',
      description: 'Stalls and shops line the streets, selling various goods.',
      type: 'town',
      connections: new Map([
        ['west', 'town_square'],
        ['south', 'alchemist_shop']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    };
    
    // Create the castle gate
    const castleGate: Location = {
      id: 'castle_gate',
      name: 'Castle Gate',
      description: 'The imposing gate of the castle looms before you, guarded by alert sentries.',
      type: 'castle',
      connections: new Map([
        ['south', 'town_square'],
        ['north', 'castle_courtyard']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    };
    
    // Create the residential district
    const residentialDistrict: Location = {
      id: 'residential_district',
      name: 'Residential District',
      description: 'Quiet streets lined with homes of various sizes.',
      type: 'town',
      connections: new Map([
        ['east', 'town_square']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    };
    
    // Create the alchemist shop
    const alchemistShop: Location = {
      id: 'alchemist_shop',
      name: 'Alchemist Shop',
      description: 'Bubbling potions and strange ingredients fill this cramped shop.',
      type: 'shop',
      connections: new Map([
        ['north', 'market_district']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'dim',
      terrain: 'urban'
    };
    
    // Create the castle courtyard
    const castleCourtyard: Location = {
      id: 'castle_courtyard',
      name: 'Castle Courtyard',
      description: 'A well-maintained courtyard inside the castle walls.',
      type: 'castle',
      connections: new Map([
        ['south', 'castle_gate'],
        ['north', 'throne_room']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    };
    
    // Create the throne room
    const throneRoom: Location = {
      id: 'throne_room',
      name: 'Throne Room',
      description: 'The opulent throne room of the ruler, with high ceilings and fine tapestries.',
      type: 'castle',
      connections: new Map([
        ['south', 'castle_courtyard']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    };
  }
  
  // For MVP, use predefined locations instead of generating them
  // In a full implementation, we would use AI to generate locations
  return getHardcodedLocation(locationId);
}

/**
 * Get a predefined location by ID
 * @param locationId ID of the location
 * @returns The location object or null if not found
 */
function getHardcodedLocation(locationId: string): Location | null {
  // Define some basic locations for the MVP
  const predefinedLocations: Record<string, Location> = {
    'town_square': {
      id: 'town_square',
      name: 'Town Square',
      description: 'The bustling center of the town, with a fountain in the middle.',
      type: 'town',
      connections: new Map([
        ['north', 'castle_gate'],
        ['south', 'starting_tavern'],
        ['east', 'market_district'],
        ['west', 'residential_district']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    },
    'market_district': {
      id: 'market_district',
      name: 'Market District',
      description: 'Stalls and shops line the streets, selling various goods.',
      type: 'town',
      connections: new Map([
        ['west', 'town_square'],
        ['south', 'alchemist_shop']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    },
    'castle_gate': {
      id: 'castle_gate',
      name: 'Castle Gate',
      description: 'The imposing gate of the castle looms before you, guarded by alert sentries.',
      type: 'castle',
      connections: new Map([
        ['south', 'town_square'],
        ['north', 'castle_courtyard']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    },
    'residential_district': {
      id: 'residential_district',
      name: 'Residential District',
      description: 'Quiet streets lined with homes of various sizes.',
      type: 'town',
      connections: new Map([
        ['east', 'town_square']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    },
    'alchemist_shop': {
      id: 'alchemist_shop',
      name: 'Alchemist\'s Shop',
      description: 'Bubbling potions and strange ingredients fill this cramped shop.',
      type: 'shop',
      connections: new Map([
        ['north', 'market_district']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'dim',
      terrain: 'urban'
    },
    'castle_courtyard': {
      id: 'castle_courtyard',
      name: 'Castle Courtyard',
      description: 'A well-maintained courtyard inside the castle walls.',
      type: 'castle',
      connections: new Map([
        ['south', 'castle_gate'],
        ['north', 'throne_room']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    },
    'throne_room': {
      id: 'throne_room',
      name: 'Throne Room',
      description: 'The opulent throne room of the ruler, with high ceilings and fine tapestries.',
      type: 'castle',
      connections: new Map([
        ['south', 'castle_courtyard']
      ]),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    }
  };
  
  return predefinedLocations[locationId] || null;
} 