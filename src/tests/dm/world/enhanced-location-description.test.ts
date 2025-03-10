/**
 * Enhanced Location Description Generator Tests
 * 
 * Tests for the Enhanced Location Description Generator, which uses the
 * Location Context Manager and other AI components to generate rich,
 * contextual location descriptions.
 */

import { 
  generateEnhancedLocationDescription,
  generateLocationTransition
} from '../../../dm/world/enhanced-location-description';
import { LocationContext } from '../../../dm/context/location-context';
import { AIServiceAdapter } from '../../../dm/ai-service-adapter';
import { GameState } from '../../../core/interfaces/game';
import { Location } from '../../../core/interfaces/location';

// Mock the AIServiceAdapter
jest.mock('../../../dm/ai-service-adapter');

// Set up mock implementations
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Mock generateLocationDescription
  (AIServiceAdapter.prototype.generateLocationDescription as jest.Mock).mockImplementation(
    (location, isFirstVisit) => {
      return Promise.resolve(
        `This is ${location.name}. ${isFirstVisit ? 'You haven\'t been here before.' : 'You\'ve been here before.'} ` +
        `${location.description || ''} You notice that the walls are made of stone. There is a door to the north.`
      );
    }
  );
  
  // Mock getEnhancedService
  (AIServiceAdapter.prototype.getEnhancedService as jest.Mock).mockImplementation(() => {
    return {
      // Mock LocationContext
      locationContext: new LocationContext(),
      
      // Mock enhanced methods
      generateWithComponent: jest.fn().mockImplementation((component, data) => {
        if (component === 'location') {
          return Promise.resolve(
            `Enhanced description of ${data.location.name}. ${data.isFirstVisit ? 'First visit!' : `Visit #${data.location.visitCount + 1}`} ` +
            `You see that there are intricate carvings on the walls. You notice a hidden alcove in the corner.`
          );
        } else if (component === 'transition') {
          return Promise.resolve(
            `You travel from ${data.fromLocation.name} to ${data.toLocation.name}. ` +
            `The journey takes you through winding paths. ${data.isFirstVisit ? 'You\'ve never been to this destination before.' : 'You recognize this place from your previous visits.'}`
          );
        }
        return Promise.resolve(`Generic description for component: ${component}`);
      }),
      
      validateResponse: jest.fn().mockImplementation((response, component, context) => {
        // Simple mock validation that just accepts everything
        return {
          isValid: true,
          score: 90,
          issues: [],
          suggestedImprovements: [],
          component
        };
      }),
      
      setLocationContext: jest.fn()
    };
  });
});

// Mock data and helpers
const createMockGameState = (): GameState => {
  const player = global.mockInterfaces.createMockCharacter({
    name: 'Test Player',
    id: 'player-1'
  });
  
  const town = {
    id: 'town-1',
    name: 'Riverdale',
    description: 'A peaceful town by the river, known for its fishing industry.',
    type: 'settlement'
  };
  
  const tavern = {
    id: 'tavern-1',
    name: 'The Rusty Anchor',
    description: 'A cozy tavern frequented by local fishermen, with a warm hearth and the smell of ale.',
    type: 'establishment'
  };
  
  return {
    player,
    currentLocation: tavern,
    locations: new Map([
      ['town-1', town],
      ['tavern-1', tavern]
    ]),
    locationRelationships: [
      {
        fromId: 'town-1',
        toId: 'tavern-1',
        type: 'connects',
        description: 'A cobblestone street leads from the town square to the tavern.',
        travelTime: '5 minutes',
        difficulty: 'easy'
      }
    ]
  } as any;
};

describe('Enhanced Location Description Generator', () => {
  // Test enhanced location description generation
  test('generates enhanced descriptions for locations', async () => {
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    const aiService = new AIServiceAdapter(null, {});
    
    // Generate a description
    const description = await generateEnhancedLocationDescription(
      tavern,
      gameState,
      aiService,
      true // isFirstVisit
    );
    
    // Verify the enhanced service was used
    expect(aiService.getEnhancedService).toHaveBeenCalled();
    
    // Verify generateWithComponent was called with the right parameters
    const enhancedService = aiService.getEnhancedService();
    expect(enhancedService.generateWithComponent).toHaveBeenCalledWith(
      'location',
      expect.objectContaining({
        location: expect.objectContaining({
          id: tavern.id,
          name: tavern.name
        }),
        isFirstVisit: true
      })
    );
    
    // Verify the description contains the expected content
    expect(description).toContain('Enhanced description');
    expect(description).toContain('Rusty Anchor');
    expect(description).toContain('First visit!');
    expect(description).toContain('intricate carvings');
  });
  
  test('falls back to standard method if enhanced methods unavailable', async () => {
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    const aiService = new AIServiceAdapter(null, {});
    
    // Modify the mock to simulate absence of enhanced methods
    (aiService.getEnhancedService as jest.Mock).mockImplementationOnce(() => ({
      locationContext: new LocationContext()
      // No generateWithComponent method
    }));
    
    // Generate a description
    const description = await generateEnhancedLocationDescription(
      tavern,
      gameState,
      aiService,
      true // isFirstVisit
    );
    
    // Verify the fallback method was used
    expect(aiService.generateLocationDescription).toHaveBeenCalled();
    
    // Verify the description contains the expected content
    expect(description).toContain('This is The Rusty Anchor');
    expect(description).toContain('You haven\'t been here before');
  });
  
  test('validates and potentially regenerates responses', async () => {
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    const aiService = new AIServiceAdapter(null, {});
    
    // Modify the mock to simulate validation issues
    const mockValidateResponse = jest.fn().mockReturnValue({
      isValid: false,
      score: 60,
      issues: [{ type: 'quality', severity: 'medium', description: 'Lacks sensory details' }],
      suggestedImprovements: ['Add more sensory details'],
      component: 'location'
    });
    
    const mockRegenerateResponse = jest.fn().mockResolvedValue(
      'Improved description with more sensory details. The air is thick with the smell of ale and smoke.'
    );
    
    (aiService.getEnhancedService as jest.Mock).mockImplementationOnce(() => ({
      locationContext: new LocationContext(),
      generateWithComponent: jest.fn().mockResolvedValue('Initial description with issues.'),
      validateResponse: mockValidateResponse,
      regenerateResponse: mockRegenerateResponse
    }));
    
    // Generate a description
    const description = await generateEnhancedLocationDescription(
      tavern,
      gameState,
      aiService,
      false // not first visit
    );
    
    // Verify validation was performed
    expect(mockValidateResponse).toHaveBeenCalled();
    
    // Verify regeneration was attempted
    expect(mockRegenerateResponse).toHaveBeenCalled();
    
    // Verify the improved description was returned
    expect(description).toContain('Improved description');
    expect(description).toContain('smell of ale and smoke');
  });
  
  // Test location transition generation
  test('generates transition descriptions between locations', async () => {
    const gameState = createMockGameState();
    const town = gameState.locations.get('town-1');
    const tavern = gameState.currentLocation;
    const aiService = new AIServiceAdapter(null, {});
    
    // Generate a transition description
    const description = await generateLocationTransition(
      town,
      tavern,
      gameState,
      aiService
    );
    
    // Verify the enhanced service was used
    expect(aiService.getEnhancedService).toHaveBeenCalled();
    
    // Verify generateWithComponent was called with the right parameters
    const enhancedService = aiService.getEnhancedService();
    expect(enhancedService.generateWithComponent).toHaveBeenCalledWith(
      'transition',
      expect.objectContaining({
        fromLocation: town,
        toLocation: tavern,
        isFirstVisit: true // First visit according to mock locationContext
      })
    );
    
    // Verify the description contains the expected content
    expect(description).toContain('You travel from Riverdale to The Rusty Anchor');
    expect(description).toContain('winding paths');
    expect(description).toContain('never been to this destination before');
  });
  
  test('falls back to basic transition description if enhanced methods unavailable', async () => {
    const gameState = createMockGameState();
    const town = gameState.locations.get('town-1');
    const tavern = gameState.currentLocation;
    const aiService = new AIServiceAdapter(null, {});
    
    // Modify the mock to simulate absence of enhanced methods
    (aiService.getEnhancedService as jest.Mock).mockImplementationOnce(() => ({
      locationContext: new LocationContext()
      // No generateWithComponent method
    }));
    
    // Generate a transition description
    const description = await generateLocationTransition(
      town,
      tavern,
      gameState,
      aiService
    );
    
    // Verify the description contains the expected content
    expect(description).toContain('You travel from Riverdale to The Rusty Anchor');
    // Should be the basic fallback description
    expect(description).not.toContain('winding paths');
  });
  
  // Test detail extraction
  test('extracts and adds details from generated descriptions', async () => {
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    const aiService = new AIServiceAdapter(null, {});
    
    // Create a locationContext spy
    const locationContext = new LocationContext();
    const addLocationDetailSpy = jest.spyOn(locationContext, 'addLocationDetail');
    
    // Modify the mock to use our spy
    (aiService.getEnhancedService as jest.Mock).mockImplementationOnce(() => ({
      locationContext: locationContext,
      generateWithComponent: jest.fn().mockResolvedValue(
        'The tavern is busy tonight. You notice a strange symbol carved into the bar. ' +
        'There is a group of sailors in the corner discussing a recent voyage.'
      )
    }));
    
    // Generate a description
    await generateEnhancedLocationDescription(
      tavern,
      gameState,
      aiService,
      false
    );
    
    // Verify details were extracted and added
    expect(addLocationDetailSpy).toHaveBeenCalledTimes(2);
    expect(addLocationDetailSpy).toHaveBeenCalledWith(
      tavern.id,
      expect.stringContaining('notice a strange symbol')
    );
    expect(addLocationDetailSpy).toHaveBeenCalledWith(
      tavern.id,
      expect.stringContaining('There is a group of sailors')
    );
  });
  
  // Test error handling
  test('handles errors gracefully', async () => {
    const gameState = createMockGameState();
    const tavern = gameState.currentLocation;
    const aiService = new AIServiceAdapter(null, {});
    
    // Modify the mock to throw an error
    (aiService.getEnhancedService as jest.Mock).mockImplementationOnce(() => {
      throw new Error('AI service unavailable');
    });
    
    // Generate a description - should not throw
    const description = await generateEnhancedLocationDescription(
      tavern,
      gameState,
      aiService,
      false
    );
    
    // Verify a fallback description was returned
    expect(description).toContain('Rusty Anchor');
    expect(description).toContain('You\'ve been here before');
  });
}); 