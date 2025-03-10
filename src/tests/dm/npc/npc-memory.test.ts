/**
 * NPC Memory System Tests
 * 
 * Tests for the NPC Memory System, which tracks NPC interactions with the player,
 * relationship status, knowledge, and other memory aspects.
 */

import { 
  NPCMemoryManager, 
  NPCMemory, 
  NPCInteraction, 
  NPCKnowledge
} from '../../../dm/npc/npc-memory';
import { GameState } from '../../../core/interfaces/game';
import { NPC } from '../../../core/interfaces/npc';

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
  
  const mockNPCs = [
    {
      id: 'npc-1',
      name: 'Innkeeper',
      description: 'A friendly innkeeper',
      personality: 'friendly',
      location: 'tavern-1',
      occupation: 'innkeeper',
      race: 'human',
      level: 3,
      stats: {},
      hitPoints: { current: 10, maximum: 10 },
      inventory: {},
      abilities: {},
      actions: []
    },
    {
      id: 'npc-2',
      name: 'Guard',
      description: 'A suspicious town guard',
      personality: 'suspicious',
      location: 'town-1',
      occupation: 'guard',
      race: 'human',
      level: 4,
      stats: {},
      hitPoints: { current: 15, maximum: 15 },
      inventory: {},
      abilities: {},
      actions: []
    },
    {
      id: 'npc-3',
      name: 'Merchant',
      description: 'A merchant selling various goods',
      personality: 'greedy but fair',
      location: 'market-1',
      occupation: 'merchant',
      race: 'human',
      level: 2,
      stats: {},
      hitPoints: { current: 8, maximum: 8 },
      inventory: {},
      abilities: {},
      actions: []
    }
  ];
  
  const npcs = new Map(mockNPCs.map(npc => [npc.id, npc]));
  
  return {
    player,
    currentLocation: tavern,
    npcs: npcs
  } as any;
};

describe('NPCMemoryManager', () => {
  // Test basic initialization
  test('initializes with default config when no options provided', () => {
    const memoryManager = new NPCMemoryManager();
    
    // Expect memory manager to be created with default values
    expect(memoryManager).toBeDefined();
  });
  
  test('initializes with custom options', () => {
    const customConfig = {
      maxInteractionHistory: 5,
      includeInteractionHistory: false,
      relationshipDecayRate: 0.2
    };
    
    const memoryManager = new NPCMemoryManager(customConfig);
    expect(memoryManager).toBeDefined();
  });
  
  // Test memory creation
  test('creates memory for an NPC', () => {
    const memoryManager = new NPCMemoryManager();
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    
    const memory = memoryManager.createMemory(npc);
    
    expect(memory).toBeDefined();
    expect(memory.npcId).toBe('npc-1');
    expect(memory.interactions).toHaveLength(0);
    expect(memory.knownFacts.length).toBeGreaterThan(0); // Should have some initial knowledge
    expect(memory.relationshipLevel).toBeGreaterThan(0); // Friendly NPCs start with positive relationship
  });
  
  test('generates appropriate initial knowledge based on occupation', () => {
    const memoryManager = new NPCMemoryManager();
    const gameState = createMockGameState();
    
    // Test innkeeper knowledge
    const innkeeper = gameState.npcs.get('npc-1');
    const innkeeperMemory = memoryManager.createMemory(innkeeper);
    
    const hasLocalGossip = innkeeperMemory.knownFacts.some(
      fact => fact.fact.toLowerCase().includes('gossip') || fact.fact.toLowerCase().includes('rumor')
    );
    
    expect(hasLocalGossip).toBe(true);
    
    // Test guard knowledge
    const guard = gameState.npcs.get('npc-2');
    const guardMemory = memoryManager.createMemory(guard);
    
    const hasSecurityInfo = guardMemory.knownFacts.some(
      fact => fact.fact.toLowerCase().includes('security') || fact.fact.toLowerCase().includes('threat')
    );
    
    expect(hasSecurityInfo).toBe(true);
  });
  
  test('determines initial relationship based on personality', () => {
    const memoryManager = new NPCMemoryManager();
    const gameState = createMockGameState();
    
    // Test friendly NPC
    const innkeeper = gameState.npcs.get('npc-1');
    const innkeeperMemory = memoryManager.createMemory(innkeeper);
    
    // Friendly NPCs should have positive relationship
    expect(innkeeperMemory.relationshipLevel).toBeGreaterThan(0);
    
    // Test suspicious NPC
    const guard = gameState.npcs.get('npc-2');
    const guardMemory = memoryManager.createMemory(guard);
    
    // Suspicious NPCs should have slightly negative or neutral relationship
    expect(guardMemory.relationshipLevel).toBeLessThanOrEqual(0);
  });
  
  // Test interaction recording
  test('records interactions between player and NPC', () => {
    const memoryManager = new NPCMemoryManager();
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    
    // Create memory first
    memoryManager.createMemory(npc);
    
    // Add an interaction
    memoryManager.addInteraction(
      npc.id,
      'Hello there, I\'m looking for a room.',
      'Welcome traveler! We have a room available for 5 gold per night.',
      ['lodging', 'greeting'],
      'friendly',
      1, // Positive impact
      gameState
    );
    
    // Check that the interaction was recorded
    const memory = memoryManager.getMemory(npc.id);
    expect(memory.interactions).toHaveLength(1);
    expect(memory.interactions[0].playerDialogue).toContain('looking for a room');
    expect(memory.interactions[0].npcResponse).toContain('Welcome traveler');
    expect(memory.relationshipLevel).toBeGreaterThan(0);
  });
  
  test('limits interaction history size', () => {
    const memoryManager = new NPCMemoryManager({ maxInteractionHistory: 2 });
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    
    // Create memory first
    memoryManager.createMemory(npc);
    
    // Add several interactions
    for (let i = 0; i < 5; i++) {
      memoryManager.addInteraction(
        npc.id,
        `Interaction ${i}`,
        `Response ${i}`,
        ['test'],
        'neutral',
        0,
        gameState
      );
    }
    
    // Check that only the most recent interactions are kept
    const memory = memoryManager.getMemory(npc.id);
    expect(memory.interactions).toHaveLength(2);
    expect(memory.interactions[0].playerDialogue).toBe('Interaction 3');
    expect(memory.interactions[1].playerDialogue).toBe('Interaction 4');
  });
  
  test('updates relationship based on interactions', () => {
    const memoryManager = new NPCMemoryManager();
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    
    // Create memory first
    const memory = memoryManager.createMemory(npc);
    const initialRelationship = memory.relationshipLevel;
    
    // Add a positive interaction
    memoryManager.addInteraction(
      npc.id,
      'You run a fine establishment here.',
      'Thank you kindly! I take pride in my tavern.',
      ['compliment', 'tavern'],
      'happy',
      2, // Strong positive impact
      gameState
    );
    
    // Check that relationship improved
    expect(memory.relationshipLevel).toBe(initialRelationship + 2);
    
    // Add a negative interaction
    memoryManager.addInteraction(
      npc.id,
      'Your ale tastes like horse piss.',
      'Well, I never! Perhaps you should drink elsewhere!',
      ['insult', 'ale'],
      'angry',
      -2, // Strong negative impact
      gameState
    );
    
    // Check that relationship decreased
    expect(memory.relationshipLevel).toBe(initialRelationship);
  });
  
  // Test knowledge management
  test('adds knowledge to an NPC\'s memory', () => {
    const memoryManager = new NPCMemoryManager();
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    
    // Create memory first
    memoryManager.createMemory(npc);
    
    // Add some knowledge
    memoryManager.addKnowledge(
      npc.id,
      'The mayor has been taking bribes from merchants',
      8, // Important
      true, // Secret
      4, // Somewhat unwilling to share
      ['mayor', 'crime', 'corruption'],
      'Overheard from two merchants'
    );
    
    // Check that the knowledge was added
    const memory = memoryManager.getMemory(npc.id);
    const addedKnowledge = memory.knownFacts.find(
      fact => fact.fact.includes('mayor') && fact.fact.includes('bribes')
    );
    
    expect(addedKnowledge).toBeDefined();
    expect(addedKnowledge.isSecret).toBe(true);
    expect(addedKnowledge.willingness).toBe(4);
    expect(addedKnowledge.subjects).toContain('corruption');
  });
  
  test('limits knowledge size and prioritizes important facts', () => {
    const memoryManager = new NPCMemoryManager({ maxKnownFacts: 3 });
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    
    // Create memory with no initial facts (for testing)
    const memory = memoryManager.createMemory(npc);
    memory.knownFacts = []; // Clear initial knowledge
    
    // Add some knowledge with varying importance
    memoryManager.addKnowledge(
      npc.id,
      'Fact 1 - low importance',
      2, // Low importance
      false,
      5,
      ['fact1']
    );
    
    memoryManager.addKnowledge(
      npc.id,
      'Fact 2 - medium importance',
      5, // Medium importance
      false,
      5,
      ['fact2']
    );
    
    memoryManager.addKnowledge(
      npc.id,
      'Fact 3 - high importance',
      9, // High importance
      false,
      5,
      ['fact3']
    );
    
    memoryManager.addKnowledge(
      npc.id,
      'Fact 4 - moderate importance',
      6, // Moderate importance
      false,
      5,
      ['fact4']
    );
    
    // Check that only the most important facts are kept
    expect(memory.knownFacts).toHaveLength(3);
    
    // The lowest importance fact should be dropped
    const hasFact1 = memory.knownFacts.some(fact => fact.fact.includes('Fact 1'));
    expect(hasFact1).toBe(false);
    
    // Higher importance facts should be kept
    const hasFact3 = memory.knownFacts.some(fact => fact.fact.includes('Fact 3'));
    expect(hasFact3).toBe(true);
  });
  
  // Test quest tracking
  test('tracks quests given and completed', () => {
    const memoryManager = new NPCMemoryManager();
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    
    // Create memory first
    memoryManager.createMemory(npc);
    
    // Add a quest
    memoryManager.addQuestGiven(npc.id, 'quest-1');
    
    // Check that the quest was added
    const memory = memoryManager.getMemory(npc.id);
    expect(memory.questsGiven).toContain('quest-1');
    expect(memory.questsCompleted).not.toContain('quest-1');
    
    // Complete the quest
    memoryManager.completeQuest(npc.id, 'quest-1');
    
    // Check that the quest is now marked as completed
    expect(memory.questsCompleted).toContain('quest-1');
    
    // Check that a notable event was added
    const questCompletionEvent = memory.notableEvents.find(
      event => event.event.includes('completed quest')
    );
    expect(questCompletionEvent).toBeDefined();
  });
  
  // Test relationship decay
  test('applies relationship decay over time', () => {
    const memoryManager = new NPCMemoryManager({ relationshipDecayRate: 0.5 });
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    
    // Create memory with a positive relationship
    const memory = memoryManager.createMemory(npc);
    memory.relationshipLevel = 5;
    memory.lastInteraction = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10); // 10 days ago
    
    // Update memories with time passed
    memoryManager.updateMemoriesWithTimePassed(gameState, 10); // 10 days
    
    // Check that relationship decayed
    expect(memory.relationshipLevel).toBeLessThan(5);
    expect(memory.relationshipLevel).toBeGreaterThanOrEqual(-5); // Should not decay below -5
  });
  
  // Test context building
  test('builds NPC context with relevant information', () => {
    const memoryManager = new NPCMemoryManager();
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    
    // Create memory and add some data
    memoryManager.createMemory(npc);
    
    // Add an interaction
    memoryManager.addInteraction(
      npc.id,
      'Do you know anything about the abandoned mine?',
      'Aye, dangerous place that is. Heard strange noises coming from there lately.',
      ['mine', 'danger'],
      'serious',
      0,
      gameState
    );
    
    // Add some knowledge
    memoryManager.addKnowledge(
      npc.id,
      'Strange lights have been seen around the abandoned mine at night',
      7, // Important
      false,
      8, // Willing to share
      ['mine', 'magic', 'mystery']
    );
    
    // Add a notable event
    memoryManager.addNotableEvent(npc.id, 'Player helped break up a bar fight');
    
    // Build context
    const context = memoryManager.buildNPCContext(npc.id, gameState);
    
    // Check that context contains key information
    expect(context).toContain('Innkeeper'); // NPC name
    expect(context).toContain('innkeeper'); // Occupation
    expect(context).toContain('abandoned mine'); // Knowledge
    expect(context).toContain('bar fight'); // Notable event
    expect(context).toContain('Relationship with Player'); // Relationship section
  });
  
  // Test player trait extraction
  test('extracts player traits from dialogue', () => {
    const memoryManager = new NPCMemoryManager();
    const gameState = createMockGameState();
    const npc = gameState.npcs.get('npc-1');
    
    // Create memory first
    memoryManager.createMemory(npc);
    
    // Add an interaction with player introduction
    memoryManager.addInteraction(
      npc.id,
      'Hello, I am Tordek, a dwarf fighter from the Iron Hills.',
      'Pleasure to meet you, Tordek.',
      ['greeting', 'introduction'],
      'friendly',
      1,
      gameState
    );
    
    // Check that player introduction was recognized
    const memory = memoryManager.getMemory(npc.id);
    expect(memory.playerIntroduced).toBe(true);
    expect(memory.playerTraits['name']).toBe('Tordek');
    
    // Add another interaction with more traits
    memoryManager.addInteraction(
      npc.id,
      'I seek the ancient artifact known as the Crown of Kings.',
      'That\'s quite the ambitious quest.',
      ['quest', 'artifact'],
      'impressed',
      0,
      gameState
    );
    
    // Check that goal was extracted
    expect(memory.playerTraits['goal']).toContain('Crown of Kings');
  });
  
  // Test memory clearing
  test('clears memory for a specific NPC', () => {
    const memoryManager = new NPCMemoryManager();
    const gameState = createMockGameState();
    
    // Create memories for multiple NPCs
    memoryManager.createMemory(gameState.npcs.get('npc-1'));
    memoryManager.createMemory(gameState.npcs.get('npc-2'));
    
    // Verify both memories exist
    expect(memoryManager.getMemory('npc-1')).toBeDefined();
    expect(memoryManager.getMemory('npc-2')).toBeDefined();
    
    // Clear one memory
    memoryManager.clearMemory('npc-1');
    
    // Check that only the specified memory was cleared
    expect(memoryManager.getMemory('npc-1')).toBeUndefined();
    expect(memoryManager.getMemory('npc-2')).toBeDefined();
  });
  
  test('clears all memories', () => {
    const memoryManager = new NPCMemoryManager();
    const gameState = createMockGameState();
    
    // Create memories for multiple NPCs
    memoryManager.createMemory(gameState.npcs.get('npc-1'));
    memoryManager.createMemory(gameState.npcs.get('npc-2'));
    
    // Verify memories exist
    expect(memoryManager.getNPCsWithMemory().length).toBe(2);
    
    // Clear all memories
    memoryManager.clearAllMemories();
    
    // Check that all memories were cleared
    expect(memoryManager.getNPCsWithMemory().length).toBe(0);
  });
}); 