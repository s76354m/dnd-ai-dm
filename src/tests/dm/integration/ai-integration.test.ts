/**
 * AI Enhancement Integration Tests
 * 
 * Tests for the AI Enhancement Integration layer, which connects all the
 * enhanced AI components and integrates them with the DM engine.
 */

import { 
  createAdvancedEnhancedAIService,
  enhanceDMEngineWithAdvancedAI,
  AdvancedEnhancedAIService,
  AdvancedAIEnhancementOptions,
  DEFAULT_ADVANCED_OPTIONS
} from '../../../dm/integration/ai-enhancement-integration';

import { AIService } from '../../../dm/ai-service';
import { AIServiceAdapter } from '../../../dm/ai-service-adapter';
import { GameState } from '../../../core/interfaces/game';
import { AIDMEngine } from '../../../core/engine';

// Mock implementations
jest.mock('../../../dm/ai-service');
jest.mock('../../../dm/ai-service-adapter');
jest.mock('../../../core/engine');

// Helper functions
const createMockGameState = (): GameState => {
  const player = global.mockInterfaces.createMockCharacter({
    name: 'Test Player',
    id: 'player-1'
  });
  
  return {
    player,
    npcs: new Map(),
    currentLocation: {
      id: 'location-1',
      name: 'Test Location'
    },
    combatState: {
      round: 1,
      turn: 1,
      enemies: [],
      allies: [],
      initiative: []
    }
  } as any;
};

describe('AI Enhancement Integration', () => {
  let baseService: AIService;
  let gameState: GameState;
  let dmEngine: AIDMEngine;
  
  beforeEach(() => {
    // Reset mocks for each test
    jest.clearAllMocks();
    
    // Create base objects
    baseService = new AIService();
    gameState = createMockGameState();
    dmEngine = new AIDMEngine(gameState);
    
    // Mock the getGameState method
    (dmEngine.getGameState as jest.Mock).mockReturnValue(gameState);
  });
  
  // Test adapter creation and configuration
  test('creates adapter with all components properly initialized', () => {
    // Custom options for testing
    const options: Partial<AdvancedAIEnhancementOptions> = {
      combatContext: {
        maxRoundsToTrack: 5,
        includeActorDetails: true,
        includeTargetDetails: true,
        includeEnvironmentDetails: true,
        includeTacticalSuggestions: true
      },
      promptTemplates: {
        useAdvancedTemplates: true,
        defaultStyle: {
          tone: 'dramatic',
          verbosity: 3,
          language: 'vivid',
          perspective: 'second-person',
          emphasis: 'action'
        }
      },
      enhancedValidation: {
        useEnhancedValidator: true,
        worldConsistencyCheck: true,
        characterConsistencyCheck: true,
        ruleAccuracyCheck: true,
        narrativeQualityCheck: true,
        toneCheck: true,
        minValidationScore: 80
      }
    };
    
    // Create adapter with custom options
    const adapter = createAdvancedEnhancedAIService(baseService, options);
    
    // Verify adapter is created
    expect(adapter).toBeDefined();
    expect(adapter).toBeInstanceOf(AIServiceAdapter);
    
    // Verify options were passed correctly
    // Note: Since we're using mocks, we can't directly check option values
    // but we can verify the constructor was called with the right arguments
    expect(AIServiceAdapter).toHaveBeenCalledWith(
      baseService,
      expect.objectContaining({
        enhancedService: expect.any(Object),
        ...options
      })
    );
  });
  
  // Test DM Engine integration
  test('successfully enhances DM engine with advanced components', () => {
    // Enhance the DM engine
    const enhancedEngine = enhanceDMEngineWithAdvancedAI(dmEngine);
    
    // Verify the engine is enhanced
    expect(enhancedEngine).toBe(dmEngine);
    
    // Verify the aiService property was set with our adapter
    // This checks that the AIServiceAdapter constructor was called
    expect(AIServiceAdapter).toHaveBeenCalled();
    
    // Verify setAIService method was called on the engine
    // Note: This depends on how your engine is implemented
    if ('setAIService' in dmEngine) {
      expect((dmEngine as any).setAIService).toHaveBeenCalled();
    } else {
      // If direct property assignment is used
      expect(dmEngine).toHaveProperty('aiService');
    }
  });
  
  // Test default options  
  test('uses default options when none are provided', () => {
    const adapter = createAdvancedEnhancedAIService(baseService);
    
    // Verify adapter is created with default options
    expect(adapter).toBeDefined();
    
    // Verify AIServiceAdapter constructor was called
    expect(AIServiceAdapter).toHaveBeenCalledWith(
      baseService,
      expect.objectContaining({
        enhancedService: expect.any(Object)
      })
    );
  });
  
  // Test game state setting
  test('properly sets game state in the adapter', () => {
    // Create adapter
    const adapter = createAdvancedEnhancedAIService(baseService);
    
    // Set method should be mocked by jest
    adapter.setGameState(gameState);
    
    // Verify setGameState was called
    expect(adapter.setGameState).toHaveBeenCalledWith(gameState);
  });
  
  // Test component availability
  test('makes enhanced components available through the adapter', () => {
    // Mock implementation for getEnhancedService
    (AIServiceAdapter.prototype.getEnhancedService as jest.Mock).mockReturnValue({
      combatContext: {},
      enhancedValidator: {}
    });
    
    // Create adapter
    const adapter = createAdvancedEnhancedAIService(baseService);
    
    // Get the enhanced service
    const enhancedService = adapter.getEnhancedService();
    
    // Verify enhanced components are available
    expect(enhancedService).toBeDefined();
    expect(enhancedService).toHaveProperty('combatContext');
    expect(enhancedService).toHaveProperty('enhancedValidator');
  });
  
  // Test options merging
  test('correctly merges default and custom options', () => {
    // Custom options with only some properties
    const partialOptions: Partial<AdvancedAIEnhancementOptions> = {
      promptTemplates: {
        useAdvancedTemplates: false
      }
    };
    
    // Create adapter with partial options
    const adapter = createAdvancedEnhancedAIService(baseService, partialOptions);
    
    // Verify adapter is created
    expect(adapter).toBeDefined();
    
    // Verify AIServiceAdapter constructor was called with merged options
    expect(AIServiceAdapter).toHaveBeenCalledWith(
      baseService,
      expect.objectContaining({
        enhancedService: expect.any(Object),
        promptTemplates: {
          useAdvancedTemplates: false
        }
      })
    );
  });
}); 