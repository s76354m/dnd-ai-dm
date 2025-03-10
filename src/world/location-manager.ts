import { Location, GameState, NPC } from '../core/interfaces';
// Mock imports for now - these will need to be implemented or replaced
const aiService = {
  generateLocationDescription: async (location: Location, context: any) => {
    return `Enhanced description of ${location.name}`;
  }
};

/**
 * Generate a full description of the current location
 * @param location The location to describe
 * @param gameState Current game state for context
 * @returns Detailed location description
 */
export async function describeLocation(
  location: Location, 
  gameState: GameState
): Promise<string> {
  // Start with the basic description
  let description = `${location.name}\n`;
  description += '='.repeat(location.name.length) + '\n\n';
  description += `${location.description}\n\n`;
  
  // Add visible exits
  const exits = location.connections || new Map<string, string>();
  if (exits.size > 0) {
    description += 'Exits: ';
    description += Array.from(exits.keys()).join(', ');
    description += '\n\n';
  } else {
    description += 'There are no obvious exits.\n\n';
  }
  
  // Get NPCs present in the location
  const npcsPresent = location.npcs
    .map(npcId => {
      if (typeof npcId === 'string') {
        return gameState.npcs.get(npcId);
      }
      return npcId;
    })
    .filter(npc => npc !== undefined) as NPC[];
  
  if (npcsPresent.length > 0) {
    description += 'Characters present:\n';
    npcsPresent.forEach(npc => {
      description += `- ${npc!.name}: ${npc!.description}\n`;
    });
    description += '\n';
  }
  
  // Use AI to enhance the description if needed
  try {
    const enhancedDescription = await aiService.generateLocationDescription(location, {});
    
    return description + enhancedDescription;
  } catch (error) {
    console.error("Error generating enhanced location description:", error);
    return description;
  }
}

/**
 * Get a location by ID
 * @param locationId ID of the location to retrieve
 * @returns The location object or null if not found
 */
export function getLocationById(locationId: string): Location | null {
  // TODO: Implement location lookup from a database or file
  // For MVP, we'll return a placeholder location
  
  return {
    id: locationId,
    name: locationId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: `A place known as ${locationId.replace(/_/g, ' ')}.`,
    type: 'location',
    connections: new Map<string, string>(),
    npcs: [],
    items: [],
    isHostile: false,
    lighting: 'bright',
    terrain: 'urban'
  };
}

/**
 * Check if a move to a new location is valid
 * @param currentLocation Current location
 * @param direction Direction to move
 * @returns Whether the move is valid and the destination ID if it is
 */
export function checkValidMove(
  currentLocation: Location, 
  direction: string
): { valid: boolean; destinationId?: string } {
  const exits = currentLocation.connections || new Map<string, string>();
  
  if (exits.has(direction)) {
    return { valid: true, destinationId: exits.get(direction) };
  }
  
  return { valid: false };
}

/**
 * Generate a new location based on context
 * @param locationId The ID for the new location
 * @param locationType The type of location to generate
 * @param gameState Current game state for context
 * @returns A newly generated location
 */
export async function generateLocation(
  locationId: string,
  locationType: string,
  gameState: GameState
): Promise<Location> {
  // Try to get the location from the AI
  try {
    const context = {
      type: 'location_generation',
      custom: {
        locationType,
        currentLocation: gameState.currentLocation,
        timeOfDay: gameState.gameTime?.timeOfDay,
        weather: gameState.worldState?.currentWeather
      }
    };
    
    const aiDescription = await aiService.generateLocationDescription(gameState.currentLocation, context);
    
    return {
      id: locationId,
      name: locationId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: aiDescription,
      type: locationType,
      connections: new Map<string, string>(),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    };
  } catch (error) {
    console.error("Error generating location:", error);
    
    // Fallback to basic location
    return {
      id: locationId,
      name: locationId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `A ${locationType} that you've discovered.`,
      type: locationType,
      connections: new Map<string, string>(),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright',
      terrain: 'urban'
    };
  }
}

/**
 * Create an empty location with the given ID
 * @param locationId The ID for the new location
 * @returns A basic location object
 */
export function createEmptyLocation(locationId: string): Location {
  return {
    id: locationId,
    name: locationId.replace(/_/g, ' '),
    description: `A place known as ${locationId.replace(/_/g, ' ')}.`,
    type: 'location',
    connections: new Map<string, string>(),
    npcs: [],
    items: [],
    isHostile: false,
    lighting: 'bright',
    terrain: 'urban'
  };
} 