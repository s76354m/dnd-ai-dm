/**
 * Enhanced NPC Dialogue Generator Tests
 * 
 * Tests for the Enhanced NPC Dialogue Generator, which leverages the NPC Memory System
 * to generate contextually appropriate NPC responses.
 */

import { 
  generateEnhancedNPCDialogue,
  DialogueOptions,
  DialogueResult,
  DEFAULT_DIALOGUE_OPTIONS
} from '../../../dm/npc/enhanced-npc-dialogue';
import { NPCMemoryManager } from '../../../dm/npc/npc-memory';
import { AIServiceAdapter } from '../../../dm/ai-service-adapter';
import { GameState } from '../../../core/interfaces/game';
import { NPC } from '../../../core/interfaces/npc';

// Mock the AIServiceAdapter
jest.mock('../../../dm/ai-service-adapter');

// Set up mock implementations
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Mock generateNPCDialogue
  (AIServiceAdapter.prototype.generateNPCDialogue as jest.Mock).mockImplementation(
    (npc, playerInput) => {
      return Promise.resolve(
        `${npc.name} says, "That's an interesting question about ${playerInput.split(' ').slice(-1)[0]}. Let me think..."`
      );
    }
  );
  
  // Mock getEnhancedService
  (AIServiceAdapter.prototype.getEnhancedService as jest.Mock).mockImplementation(() => {
    return {
      // Mock methods
      generateWithComponent: jest.fn().mockImplementation((component, data) => {
        if (component === 'npc') {
          const relationshipLevel = data.relationshipLevel || 0;
          const tone = relationshipLevel > 5 ? 'friendly' : 
                      relationshipLevel < -5 ? 'hostile' : 'neutral';
          
          // Include JSON metadata with the response
          const response = `${data.npc.name} ${tone === 'friendly' ? 'smiles' : tone === 'hostile' ? 'scowls' : 'considers'} before responding. "I've heard about ${data.analyzedTopics[0] || 'that'}. What else would you like to know?"
          
          {"topics": ${JSON.stringify(data.analyzedTopics || ['general'])}, "emotionalTone": "${tone}", "relationshipImpact": ${tone === 'friendly' ? 1 : tone === 'hostile' ? -1 : 0}, "willShareKnowledge": ${tone !== 'hostile'}, "bodyLanguage": "${tone === 'friendly' ? 'smiles warmly' : tone === 'hostile' ? 'crosses arms defensively' : 'maintains a neutral expression'}"}`;
          
          return Promise.resolve(response);
        }
        return Promise.resolve(`Generic response for component: ${component}`);
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
      
      analyzePlayerDialogue: jest.fn().mockImplementation((input) => {
        // Simple mock analysis
        const topics = input.split(' ')
          .filter(word => word.length > 3)
          .map(word => word.toLowerCase());
        
        return {
          topics: topics.length > 0 ? topics : ['general'],
          sentiment: input.includes('thank') || input.includes('please') ? 'positive' : 
                     input.includes('hate') || input.includes('angry') ? 'negative' : 'neutral',
          intent: input.endsWith('?') ? 'question' : 
                  input.startsWith('hello') || input.startsWith('hi') ? 'greeting' : 'statement',
          mentionedEntities: []
        };
      }),
      
      // Memory management
      npcMemoryManager: new NPCMemoryManager(),
      setNPCMemoryManager: jest.fn()
    };
  });
});

// Mock data and helpers
const createMockGameState = (): GameState => {
  const player = global.mockInterfaces.createMockCharacter({
    name: 'Test Player',
    id: 'player-1'
  });
  
  const tavern = {
    id: 'tavern-1',
    name: 'The Rusty Anchor',
    description: 'A cozy tavern frequented by local fishermen, with a warm hearth and the smell of ale.',
    type: 'establishment'
  };
  
  const mockNPC = {
    id: 'npc-1',
    name: 'Tavern Keeper',
    description: 'A friendly tavern keeper',
    personality: 'friendly',
    location: 'tavern-1',
    occupation: 'tavern keeper',
    race: 'human',
    level: 3,
    attitude: 'friendly',
    isQuestGiver: false,
    dialogue: {
      greeting: 'Welcome to my tavern!',
      farewell: 'Come back soon!',
      topics: {
        'rumors': 'I\'ve heard there\'s treasure in the old mine.',
        'town': 'This town has been peaceful for generations.'
      }
    }
  };
  
  return {
    player,
    currentLocation: tavern,
    npcs: new Map([
      ['npc-1', mockNPC]
    ])
  } as any;
};

describe('Enhanced NPC Dialogue Generator', () => {
  // Test basic dialogue generation
  test('generates dialogue with default options', async () => {
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    const aiService = new AIServiceAdapter(null, {});
    
    // Generate dialogue
    const result = await generateEnhancedNPCDialogue(
      npc,
      'What can you tell me about the town?',
      gameState,
      aiService
    );
    
    // Verify the enhanced service was used
    expect(aiService.getEnhancedService).toHaveBeenCalled();
    
    // Verify the dialogue contains the expected content
    expect(result.response).toContain(npc.name);
    expect(result.topics).toContain('town');
    expect(result.emotionalTone).toBeDefined();
  });
  
  test('extracts metadata from formatted AI response', async () => {
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    const aiService = new AIServiceAdapter(null, {});
    
    // Generate dialogue
    const result = await generateEnhancedNPCDialogue(
      npc,
      'What do you know about dragons?',
      gameState,
      aiService
    );
    
    // Verify metadata was correctly extracted from the JSON in the response
    expect(result.topics).toContain('dragons');
    expect(result.emotionalTone).toBeDefined();
    expect(result.relationshipImpact).toBeDefined();
    expect(result.willShareKnowledge).toBeDefined();
    expect(result.bodyLanguage).toBeDefined();
    
    // Verify the response doesn't contain the JSON
    expect(result.response).not.toContain('{"topics":');
  });
  
  test('falls back to standard method if enhanced methods unavailable', async () => {
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    const aiService = new AIServiceAdapter(null, {});
    
    // Modify the mock to simulate absence of generateWithComponent method
    (aiService.getEnhancedService as jest.Mock).mockImplementationOnce(() => ({
      npcMemoryManager: new NPCMemoryManager(),
      analyzePlayerDialogue: jest.fn().mockResolvedValue({
        topics: ['fallback'],
        sentiment: 'neutral',
        intent: 'question',
        mentionedEntities: []
      })
      // No generateWithComponent method
    }));
    
    // Generate dialogue
    const result = await generateEnhancedNPCDialogue(
      npc,
      'What is the history of this place?',
      gameState,
      aiService
    );
    
    // Verify the fallback method was used
    expect(aiService.generateNPCDialogue).toHaveBeenCalled();
    
    // Verify the dialogue contains the expected content
    expect(result.response).toContain(npc.name);
    expect(result.response).toContain('history');
  });
  
  // Test integration with memory system
  test('updates NPC memory with interaction', async () => {
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    const aiService = new AIServiceAdapter(null, {});
    const memoryManager = new NPCMemoryManager();
    
    // Create memory for the NPC
    memoryManager.createMemory(npc);
    
    // Generate dialogue with the memory manager
    await generateEnhancedNPCDialogue(
      npc,
      'Have you heard any rumors lately?',
      gameState,
      aiService,
      memoryManager
    );
    
    // Check that the interaction was recorded in memory
    const memory = memoryManager.getMemory(npc.id);
    expect(memory.interactions).toHaveLength(1);
    expect(memory.interactions[0].playerDialogue).toContain('rumors');
  });
  
  test('creates memory if it doesn\'t exist', async () => {
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    const aiService = new AIServiceAdapter(null, {});
    const memoryManager = new NPCMemoryManager();
    
    // Generate dialogue (without pre-creating memory)
    await generateEnhancedNPCDialogue(
      npc,
      'Tell me about yourself.',
      gameState,
      aiService,
      memoryManager
    );
    
    // Check that memory was created automatically
    const memory = memoryManager.getMemory(npc.id);
    expect(memory).toBeDefined();
    expect(memory.npcId).toBe(npc.id);
  });
  
  // Test options
  test('respects dialogue options', async () => {
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    const aiService = new AIServiceAdapter(null, {});
    
    // Custom options
    const options: Partial<DialogueOptions> = {
      includeEmotionalResponse: false,
      includeBodyLanguage: false
    };
    
    // Modify the mock to check if options are passed through
    const generateWithComponentMock = jest.fn().mockResolvedValue('Test response');
    (aiService.getEnhancedService as jest.Mock).mockImplementationOnce(() => ({
      npcMemoryManager: new NPCMemoryManager(),
      analyzePlayerDialogue: jest.fn().mockResolvedValue({
        topics: ['test'],
        sentiment: 'neutral',
        intent: 'question',
        mentionedEntities: []
      }),
      generateWithComponent: generateWithComponentMock
    }));
    
    // Generate dialogue with custom options
    await generateEnhancedNPCDialogue(
      npc,
      'Test question?',
      gameState,
      aiService,
      undefined,
      options
    );
    
    // Verify options were passed to generateWithComponent
    expect(generateWithComponentMock).toHaveBeenCalledWith(
      'npc',
      expect.objectContaining({
        options: expect.objectContaining({
          includeEmotionalResponse: false,
          includeBodyLanguage: false
        })
      })
    );
  });
  
  // Test dialogue analysis
  test('analyzes player dialogue correctly', async () => {
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    const aiService = new AIServiceAdapter(null, {});
    
    // Modify the mock to expose the analyzed dialogue
    let capturedAnalysis;
    (aiService.getEnhancedService as jest.Mock).mockImplementationOnce(() => ({
      npcMemoryManager: new NPCMemoryManager(),
      analyzePlayerDialogue: jest.fn().mockImplementation((input) => {
        const analysis = {
          topics: ['treasure', 'map'],
          sentiment: 'positive',
          intent: 'question',
          mentionedEntities: ['Old Mountain']
        };
        capturedAnalysis = analysis;
        return Promise.resolve(analysis);
      }),
      generateWithComponent: jest.fn().mockResolvedValue('Response with analysis')
    }));
    
    // Generate dialogue
    await generateEnhancedNPCDialogue(
      npc,
      'Do you know anything about the treasure map to Old Mountain?',
      gameState,
      aiService
    );
    
    // Verify analysis was performed and used
    expect(capturedAnalysis).toBeDefined();
    expect(capturedAnalysis.topics).toContain('treasure');
    expect(capturedAnalysis.topics).toContain('map');
    expect(capturedAnalysis.intent).toBe('question');
    expect(capturedAnalysis.mentionedEntities).toContain('Old Mountain');
  });
  
  // Test error handling
  test('handles errors gracefully', async () => {
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    const aiService = new AIServiceAdapter(null, {});
    
    // Modify the mock to throw an error
    (aiService.getEnhancedService as jest.Mock).mockImplementationOnce(() => {
      throw new Error('AI service unavailable');
    });
    
    // Generate dialogue - should not throw
    const result = await generateEnhancedNPCDialogue(
      npc,
      'Will this break?',
      gameState,
      aiService
    );
    
    // Verify a fallback response was returned
    expect(result.response).toContain(npc.name);
    expect(result.response).toContain('not sure how to respond');
    expect(result.emotionalTone).toBe('confused');
  });
  
  // Test response validation and regeneration
  test('validates and potentially regenerates responses', async () => {
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    const aiService = new AIServiceAdapter(null, {});
    
    // Modify the mock to simulate validation issues
    const mockValidateResponse = jest.fn().mockReturnValue({
      isValid: false,
      score: 60,
      issues: [{ type: 'consistency', severity: 'medium', description: 'Response contradicts NPC traits' }],
      suggestedImprovements: ['Align response with NPC personality'],
      component: 'npc'
    });
    
    const mockRegenerateResponse = jest.fn().mockResolvedValue(
      'Improved response that fits the NPC personality better. {"emotionalTone": "thoughtful", "relationshipImpact": 0}'
    );
    
    (aiService.getEnhancedService as jest.Mock).mockImplementationOnce(() => ({
      npcMemoryManager: new NPCMemoryManager(),
      analyzePlayerDialogue: jest.fn().mockResolvedValue({
        topics: ['test'],
        sentiment: 'neutral',
        intent: 'question',
        mentionedEntities: []
      }),
      generateWithComponent: jest.fn().mockResolvedValue('Initial response with issues'),
      validateResponse: mockValidateResponse,
      regenerateResponse: mockRegenerateResponse
    }));
    
    // Generate dialogue
    const result = await generateEnhancedNPCDialogue(
      npc,
      'Tell me about your past.',
      gameState,
      aiService
    );
    
    // Verify validation was performed
    expect(mockValidateResponse).toHaveBeenCalled();
    
    // Verify regeneration was attempted
    expect(mockRegenerateResponse).toHaveBeenCalled();
    
    // Verify the improved response was parsed
    expect(result.response).toContain('Improved response');
    expect(result.emotionalTone).toBe('thoughtful');
  });
  
  // Test dialogue inference (when no JSON metadata)
  test('infers metadata from response when no JSON provided', async () => {
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    const aiService = new AIServiceAdapter(null, {});
    
    // Modify the mock to return response without JSON metadata
    (aiService.getEnhancedService as jest.Mock).mockImplementationOnce(() => ({
      npcMemoryManager: new NPCMemoryManager(),
      analyzePlayerDialogue: jest.fn().mockResolvedValue({
        topics: ['test'],
        sentiment: 'neutral',
        intent: 'question',
        mentionedEntities: []
      }),
      generateWithComponent: jest.fn().mockResolvedValue('Greta smiles warmly. "Of course I can help you with that. I\'ve lived in this town all my life and know everything about it."')
    }));
    
    // Generate dialogue
    const result = await generateEnhancedNPCDialogue(
      npc,
      'Can you tell me about the town\'s history?',
      gameState,
      aiService
    );
    
    // Verify metadata was inferred
    expect(result.emotionalTone).toBe('happy'); // From "smiles warmly"
    expect(result.bodyLanguage).toContain('smiles warmly');
    expect(result.topics.length).toBeGreaterThan(0);
  });
}); 