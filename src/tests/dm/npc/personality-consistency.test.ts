/**
 * NPC Personality Consistency Tracker Tests
 * 
 * Tests for the NPC Personality Consistency Tracker, which ensures NPCs
 * maintain consistent personalities throughout the game.
 */

import { 
  NPCPersonalityConsistencyTracker,
  PersonalityTrait,
  PersonalityContradiction,
  PersonalityValidationResult
} from '../../../dm/npc/personality-consistency';
import { NPC } from '../../../core/interfaces/npc';
import { NPCAttitude } from '../../../core/interfaces/npc';

// Mock NPC data for testing
const createMockNPC = (id: string, name: string, personality: string): NPC => {
  return {
    id,
    name,
    personality,
    // Add other required properties
    location: 'test-location',
    occupation: 'test',
    race: 'human',
    stats: {
      level: 1,
      hitPoints: { current: 10, maximum: 10 },
      abilityScores: {} as any,
      armorClass: 10
    },
    inventory: [] as any,
    description: 'A test NPC',
    attitude: NPCAttitude.Neutral,
    isQuestGiver: false,
    dialogue: [],
    conditions: [],
    faction: 'neutral'
  };
};

describe('NPCPersonalityConsistencyTracker', () => {
  // Test basic initialization
  test('initializes with default options when none provided', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    expect(tracker).toBeDefined();
  });
  
  test('initializes with custom options', () => {
    const customOptions = {
      minConfidenceThreshold: 5,
      maxTraitsPerNPC: 5,
      enableAutomaticTraitExtraction: false
    };
    
    const tracker = new NPCPersonalityConsistencyTracker(customOptions);
    expect(tracker).toBeDefined();
  });
  
  // Test trait management
  test('adds a trait to an NPC', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    const npcId = 'npc-1';
    
    // Add a trait
    const added = tracker.addTrait(
      npcId,
      'friendly',
      'Is generally kind to strangers',
      6,
      'Greeted the player with a warm smile.'
    );
    
    // Verify trait was added
    expect(added).toBe(true);
    
    const traits = tracker.getTraits(npcId);
    expect(traits).toHaveLength(1);
    expect(traits[0].trait).toBe('friendly');
    expect(traits[0].confidence).toBe(6);
    expect(traits[0].examples).toContain('Greeted the player with a warm smile.');
  });
  
  test('updates confidence when adding an existing trait', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    const npcId = 'npc-1';
    
    // Add a trait
    tracker.addTrait(npcId, 'friendly', 'Is kind to everyone', 5);
    
    // Add the same trait again
    tracker.addTrait(npcId, 'friendly', 'Updated description', 3, 'New example');
    
    // Verify trait was updated
    const traits = tracker.getTraits(npcId);
    expect(traits).toHaveLength(1);
    expect(traits[0].confidence).toBe(6); // Increased by 1
    expect(traits[0].examples).toContain('New example');
  });
  
  test('handles contradictory traits correctly', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    const npcId = 'npc-1';
    
    // Add a trait
    tracker.addTrait(npcId, 'friendly', 'Is kind to everyone', 8);
    
    // Try to add a contradictory trait with lower confidence
    const added = tracker.addTrait(npcId, 'hostile', 'Is mean to people', 3);
    
    // Verify contradictory trait was not added
    expect(added).toBe(false);
    const traits = tracker.getTraits(npcId);
    expect(traits).toHaveLength(1);
    expect(traits[0].trait).toBe('friendly');
    
    // Now add a contradictory trait with higher confidence
    const addedHigher = tracker.addTrait(npcId, 'hostile', 'Is actually quite mean', 10);
    
    // Verify it was added and caused a contradiction
    expect(addedHigher).toBe(true);
    const updatedTraits = tracker.getTraits(npcId);
    expect(updatedTraits.length).toBeGreaterThan(0);
    
    // The friendly trait should now have a contradiction count
    const friendlyTrait = updatedTraits.find(t => t.trait === 'friendly');
    if (friendlyTrait) {
      expect(friendlyTrait.contradictions).toBe(1);
    }
  });
  
  test('limits the number of traits per NPC', () => {
    const tracker = new NPCPersonalityConsistencyTracker({ maxTraitsPerNPC: 3 });
    const npcId = 'npc-1';
    
    // Add more traits than the limit
    tracker.addTrait(npcId, 'friendly', 'Description 1', 3);
    tracker.addTrait(npcId, 'intelligent', 'Description 2', 5);
    tracker.addTrait(npcId, 'brave', 'Description 3', 7);
    tracker.addTrait(npcId, 'patient', 'Description 4', 8);
    
    // Verify that only the limit of traits are kept
    const traits = tracker.getTraits(npcId);
    expect(traits).toHaveLength(3);
    
    // The lowest confidence trait should have been removed
    const hasFriendly = traits.some(t => t.trait === 'friendly');
    expect(hasFriendly).toBe(false);
    
    // Higher confidence traits should be kept
    const hasPatient = traits.some(t => t.trait === 'patient');
    expect(hasPatient).toBe(true);
  });
  
  // Test trait extraction
  test('extracts traits from personality description', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    const npcId = 'npc-1';
    
    // Extract traits from a personality description
    tracker.extractTraitsFromPersonalityDescription(
      npcId,
      'A kind and friendly merchant who is known for being honest in all her dealings.'
    );
    
    // Verify traits were extracted
    const traits = tracker.getTraits(npcId);
    
    // Should find 'friendly' and 'honest'
    expect(traits.length).toBeGreaterThan(0);
    
    const hasFriendly = traits.some(t => t.trait === 'friendly');
    const hasHonest = traits.some(t => t.trait === 'honest');
    
    expect(hasFriendly).toBe(true);
    expect(hasHonest).toBe(true);
  });
  
  test('extracts traits from dialogue', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    
    // Extract traits from dialogue
    const extractedTraits = tracker.extractTraitsFromDialogue(
      'npc-1',
      'The guard glares at you suspiciously. "State your business or move along. I don\'t have time for idle chatter."'
    );
    
    // Should find 'hostile' and possibly 'cautious'
    expect(extractedTraits).toContain('hostile');
  });
  
  test('updates traits from NPC dialogue automatically', () => {
    const tracker = new NPCPersonalityConsistencyTracker({ enableAutomaticTraitExtraction: true });
    const npc = createMockNPC('npc-1', 'Guard', 'stern and disciplined');
    
    // Update traits based on dialogue
    tracker.updateTraitsFromDialogue(
      npc.id,
      npc,
      'The guard straightens his posture and speaks firmly. "The captain expects discipline from all visitors. Follow the rules and we\'ll have no problems."'
    );
    
    // Verify traits were updated
    const traits = tracker.getTraits(npc.id);
    expect(traits.length).toBeGreaterThan(0);
  });
  
  // Test dialogue validation
  test('validates consistent dialogue correctly', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    const npcId = 'npc-1';
    
    // Add a 'friendly' trait
    tracker.addTrait(npcId, 'friendly', 'Is kind to everyone', 8);
    
    // Validate a consistent dialogue
    const validationResult = tracker.validateDialogue(
      npcId,
      'The innkeeper smiles warmly. "Welcome to our humble establishment! Can I offer you a room or perhaps a hot meal?"'
    );
    
    // Should be valid with no contradictions
    expect(validationResult.isConsistent).toBe(true);
    expect(validationResult.contradictions).toHaveLength(0);
    expect(validationResult.score).toBe(100);
  });
  
  test('detects contradictory dialogue', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    const npcId = 'npc-1';
    
    // Add a 'friendly' trait
    tracker.addTrait(npcId, 'friendly', 'Is kind to everyone', 8);
    
    // Validate a contradictory dialogue
    const validationResult = tracker.validateDialogue(
      npcId,
      'The innkeeper refuses to help you find a room. "I\'m busy. Figure it out yourself."'
    );
    
    // Should detect the contradiction
    expect(validationResult.isConsistent).toBe(false);
    expect(validationResult.contradictions.length).toBeGreaterThan(0);
    expect(validationResult.score).toBeLessThan(100);
    
    // Check that the contradiction references the correct trait
    expect(validationResult.contradictions[0].trait).toBe('friendly');
  });
  
  test('detects behavioral contradictions', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    const npcId = 'npc-1';
    
    // Add a 'friendly' trait
    tracker.addTrait(npcId, 'friendly', 'Is helpful and welcoming', 8);
    
    // Validate dialogue with contradictory behavior
    const validationResult = tracker.validateDialogue(
      npcId,
      'The innkeeper refuses to help you find a room. "I\'m busy. Figure it out yourself."'
    );
    
    // Should detect the contradiction
    expect(validationResult.isConsistent).toBe(false);
    expect(validationResult.contradictions.length).toBeGreaterThan(0);
    
    // Check that there's a suggestion for improvement
    expect(validationResult.suggestedRevisions.length).toBeGreaterThan(0);
  });
  
  test('handles validation with no established traits', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    const npcId = 'npc-1';
    
    // Validate without any traits
    const validationResult = tracker.validateDialogue(
      npcId,
      'The stranger nods silently.'
    );
    
    // Should be considered consistent (no traits to contradict)
    expect(validationResult.isConsistent).toBe(true);
    expect(validationResult.score).toBe(100);
  });
  
  test('generates consistent response suggestions', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    const npcId = 'npc-1';
    
    // Add traits
    tracker.addTrait(npcId, 'friendly', 'Is warm and welcoming', 8, 'Always greets visitors with a smile.');
    
    // Create contradictions
    const contradictions: PersonalityContradiction[] = [
      {
        trait: 'friendly',
        severity: 'high',
        contradiction: 'Dialogue exhibits "hostile" behavior, which contradicts the established "friendly" trait',
        suggestion: 'Revise to be more welcoming and less threatening.'
      }
    ];
    
    // Generate suggestion
    const suggestion = tracker.generateConsistentResponseSuggestion(
      npcId,
      'Get out of my tavern, you filthy rat!',
      contradictions
    );
    
    // Check that suggestion references the traits and contradictions
    expect(suggestion).toContain('friendly');
    expect(suggestion).toContain('Established traits');
    expect(suggestion).toContain('Contradictions found');
    expect(suggestion).toContain('Suggestions for improvement');
  });
  
  // Test memory management
  test('clears traits for a specific NPC', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    
    // Add traits for multiple NPCs
    tracker.addTrait('npc-1', 'friendly', 'Description', 5);
    tracker.addTrait('npc-2', 'intelligent', 'Description', 5);
    
    // Clear traits for one NPC
    tracker.clearTraits('npc-1');
    
    // Verify only one NPC's traits were cleared
    expect(tracker.getTraits('npc-1')).toHaveLength(0);
    expect(tracker.getTraits('npc-2')).toHaveLength(1);
  });
  
  test('clears all NPC traits', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    
    // Add traits for multiple NPCs
    tracker.addTrait('npc-1', 'friendly', 'Description', 5);
    tracker.addTrait('npc-2', 'intelligent', 'Description', 5);
    
    // Clear all traits
    tracker.clearAllTraits();
    
    // Verify all traits were cleared
    expect(tracker.getNPCsWithTraits()).toHaveLength(0);
  });
  
  test('lists NPCs with traits', () => {
    const tracker = new NPCPersonalityConsistencyTracker();
    
    // Add traits for multiple NPCs
    tracker.addTrait('npc-1', 'friendly', 'Description', 5);
    tracker.addTrait('npc-2', 'intelligent', 'Description', 5);
    tracker.addTrait('npc-3', 'brave', 'Description', 5);
    
    // Get list of NPCs with traits
    const npcsWithTraits = tracker.getNPCsWithTraits();
    
    // Verify list contains all NPCs
    expect(npcsWithTraits).toHaveLength(3);
    expect(npcsWithTraits).toContain('npc-1');
    expect(npcsWithTraits).toContain('npc-2');
    expect(npcsWithTraits).toContain('npc-3');
  });
}); 