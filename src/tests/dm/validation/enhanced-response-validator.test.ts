/**
 * Enhanced Response Validator Tests
 * 
 * Tests for the Enhanced Response Validator, which ensures AI-generated 
 * responses maintain consistency, accuracy, and quality.
 */

import EnhancedResponseValidator, { 
  ValidationIssueType, 
  IssueSeverity,
  ValidationOptions,
  ValidationResult,
  ValidationIssue
} from '../../../dm/validation/enhanced-response-validator';

import { GameState } from '../../../core/interfaces/game';

// Helper functions
const createMockGameState = (): GameState => {
  const player = global.mockInterfaces.createMockCharacter({
    name: 'Thordak',
    id: 'player-1',
    race: 'Dragonborn',
    class: 'fighter',
    personality: {
      traits: ['brave', 'direct'],
      ideals: ['honor', 'glory'],
      bonds: ['sworn to protect my homeland'],
      flaws: ['stubborn', 'quick-tempered']
    }
  });
  
  const npc = global.mockInterfaces.createMockNPC({
    name: 'Elara',
    id: 'npc-1',
    race: 'Elf',
    occupation: 'Merchant',
    personality: 'Kind but shrewd negotiator with a mysterious past'
  });
  
  return {
    player,
    npcs: new Map([['npc-1', npc]]),
    currentLocation: {
      id: 'market-1',
      name: 'Rivertown Market',
      description: 'A bustling market by the river, full of merchants and shoppers.'
    },
    worldState: {
      currentWeather: 'Sunny with light clouds',
      timeOfDay: 'Midday',
      facts: new Map([
        ['king', 'King Aldric rules the kingdom of Valorin'],
        ['war', 'There is ongoing conflict with the orcs in the north'],
        ['rivertown', 'Rivertown is known for its fishing industry and trade']
      ])
    }
  } as any;
};

describe('EnhancedResponseValidator', () => {
  // Basic validator setup
  test('initializes with default options', () => {
    const validator = new EnhancedResponseValidator();
    expect(validator).toBeDefined();
  });
  
  test('initializes with custom options', () => {
    const options: Partial<ValidationOptions> = {
      worldConsistencyCheck: false,
      characterConsistencyCheck: true,
      ruleAccuracyCheck: true,
      minValidationScore: 80
    };
    
    const validator = new EnhancedResponseValidator(options);
    expect(validator).toBeDefined();
  });
  
  // Test validation categories
  test('detects world inconsistencies in responses', () => {
    const validator = new EnhancedResponseValidator({
      worldConsistencyCheck: true,
      characterConsistencyCheck: false,
      ruleAccuracyCheck: false,
      narrativeQualityCheck: false,
      toneCheck: false
    });
    
    const gameState = createMockGameState();
    validator.setGameState(gameState);
    
    // Response with an inconsistency about the king
    const response = "You arrive at Rivertown Market, a bustling place by the river. In the distance, you can see the castle where Queen Eleanora rules the kingdom of Valorin.";
    
    const result = validator.validate(response, 'narrative', 'You enter the market');
    
    // Should identify the inconsistency with the established world fact
    expect(result.isValid).toBe(false);
    expect(result.issues.some(issue => 
      issue.type === ValidationIssueType.WorldInconsistency
    )).toBe(true);
  });
  
  test('identifies character trait inconsistencies', () => {
    const validator = new EnhancedResponseValidator({
      worldConsistencyCheck: false,
      characterConsistencyCheck: true,
      ruleAccuracyCheck: false,
      narrativeQualityCheck: false,
      toneCheck: false
    });
    
    const gameState = createMockGameState();
    validator.setGameState(gameState);
    
    // Response with an inconsistency about the player character
    const response = "Thordak, usually a coward in the face of danger, decides to hide behind a market stall when he notices the commotion.";
    
    const result = validator.validate(response, 'narrative', 'What do I see in the market?');
    
    // Should identify the trait inconsistency
    expect(result.isValid).toBe(false);
    expect(result.issues.some(issue => 
      issue.type === ValidationIssueType.CharacterInconsistency &&
      issue.problematicText?.includes('coward')
    )).toBe(true);
  });
  
  test('flags rules violations in responses', () => {
    const validator = new EnhancedResponseValidator({
      worldConsistencyCheck: false,
      characterConsistencyCheck: false,
      ruleAccuracyCheck: true,
      narrativeQualityCheck: false,
      toneCheck: false
    });
    
    // Response with a D&D rule violation
    const response = "The wizard casts Fireball as a level 2 spell, dealing 8d6 fire damage to all creatures in the area.";
    
    const result = validator.validate(response, 'spell', 'The wizard casts Fireball');
    
    // Should identify the rule violation (Fireball is a level 3 spell, not level 2)
    expect(result.isValid).toBe(false);
    expect(result.issues.some(issue => 
      issue.type === ValidationIssueType.RuleViolation
    )).toBe(true);
  });
  
  test('evaluates narrative quality aspects', () => {
    const validator = new EnhancedResponseValidator({
      worldConsistencyCheck: false,
      characterConsistencyCheck: false,
      ruleAccuracyCheck: false,
      narrativeQualityCheck: true,
      toneCheck: false
    });
    
    // Response with repetitive language
    const response = "You enter the tavern. You see a bartender. You notice several patrons. You smell ale and smoke. You hear loud conversations.";
    
    const result = validator.validate(response, 'location', 'I enter the tavern');
    
    // Should identify narrative quality issues (repetitive sentence structure)
    expect(result.issues.some(issue => 
      issue.type === ValidationIssueType.NarrativeQuality
    )).toBe(true);
    
    // Should provide improvement suggestions
    expect(result.suggestedImprovements.length).toBeGreaterThan(0);
  });
  
  // Test scoring system
  test('calculates appropriate scores based on issues', () => {
    const validator = new EnhancedResponseValidator();
    
    // Create test issues of varying severity
    const mockIssues: ValidationIssue[] = [
      {
        type: ValidationIssueType.WorldInconsistency,
        severity: IssueSeverity.High,
        description: 'Test inconsistency'
      },
      {
        type: ValidationIssueType.NarrativeQuality,
        severity: IssueSeverity.Low,
        description: 'Test quality issue'
      }
    ];
    
    // Use a private method testing approach or test indirectly
    const mockResult: ValidationResult = {
      isValid: false,
      score: 0, // Will be calculated
      issues: mockIssues,
      suggestedImprovements: [],
      component: 'narrative'
    };
    
    // We can test the scoring indirectly by checking different responses
    const goodResponse = "The sun shines brightly on Rivertown Market as you approach. Merchants call out their wares, the scent of fresh bread wafts from a nearby stall, and the distant sound of the river provides a peaceful backdrop to the bustling activity.";
    
    const poorResponse = "You see the market. It has stalls. People are there. You can buy things. It's by a river.";
    
    const goodResult = validator.validate(goodResponse, 'location', 'I go to the market');
    const poorResult = validator.validate(poorResponse, 'location', 'I go to the market');
    
    // Good response should score higher than poor response
    expect(goodResult.score).toBeGreaterThan(poorResult.score);
  });
  
  // Test game state integration
  test('updates world facts from game state correctly', () => {
    const validator = new EnhancedResponseValidator();
    const gameState = createMockGameState();
    
    // Before setting game state
    // Add a fact manually
    validator.addWorldFact('test_fact', 'This is a test fact');
    
    // Set game state which should add more facts
    validator.setGameState(gameState);
    
    // Should now detect inconsistencies with facts from game state
    const response = "Queen Eleanora rules Valorin with an iron fist.";
    const result = validator.validate(response, 'narrative', 'Tell me about the ruler');
    
    // Should find inconsistency with the fact from game state
    expect(result.issues.some(issue => 
      issue.type === ValidationIssueType.WorldInconsistency &&
      issue.problematicText?.includes('Queen Eleanora')
    )).toBe(true);
  });
  
  // Component-specific validation
  test('applies appropriate validations for combat responses', () => {
    const validator = new EnhancedResponseValidator();
    
    // Response missing sensory details for combat
    const blandCombatResponse = "The fighter attacks the orc. The attack hits. The orc takes damage.";
    
    const result = validator.validate(blandCombatResponse, 'combat', 'The fighter attacks with his sword');
    
    // Should identify lack of sensory details or dynamic action
    expect(result.issues.some(issue => 
      issue.type === ValidationIssueType.NarrativeQuality
    )).toBe(true);
    
    // Response with good combat narration
    const goodCombatResponse = "The fighter's blade whistles through the air as he lunges forward, his steel finding its mark with a sickening thud. The orc howls in pain as blood sprays from the wound, staggering backward but remaining on its feet, its yellow eyes burning with rage.";
    
    const goodResult = validator.validate(goodCombatResponse, 'combat', 'The fighter attacks with his sword');
    
    // Should score much higher
    expect(goodResult.score).toBeGreaterThan(result.score + 10);
  });
  
  test('applies appropriate validations for location descriptions', () => {
    const validator = new EnhancedResponseValidator();
    
    // Response with only visual details
    const visualOnlyResponse = "The tavern is dimly lit with wooden tables and chairs. There are some patrons sitting around, and a bar at the far end of the room.";
    
    const result = validator.validate(visualOnlyResponse, 'location', 'I enter the tavern');
    
    // Should identify lack of sensory variety
    expect(result.issues.some(issue => 
      issue.type === ValidationIssueType.NarrativeQuality
    )).toBe(true);
    
    // Response with multiple sensory details
    const multisensoryResponse = "The tavern is dimly lit with wooden tables and chairs, the flickering candlelight casting long shadows across the room. The air is thick with the smell of ale, roasted meat, and pipe smoke. A bard's lute plays softly in the corner, nearly drowned out by the buzz of conversation and occasional bursts of laughter. The floorboards creak beneath your feet as you make your way past patrons who are heartily enjoying their drinks.";
    
    const goodResult = validator.validate(multisensoryResponse, 'location', 'I enter the tavern');
    
    // Should score higher due to sensory variety
    expect(goodResult.score).toBeGreaterThan(result.score + 10);
  });
  
  // Edge cases
  test('handles empty responses gracefully', () => {
    const validator = new EnhancedResponseValidator();
    
    const result = validator.validate('', 'narrative', 'What do I see?');
    
    // Should flag the empty response as invalid
    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(50);
  });
  
  test('handles missing context gracefully', () => {
    const validator = new EnhancedResponseValidator();
    
    const response = "You see a bustling market with various merchants selling their wares.";
    const result = validator.validate(response, 'narrative', '');
    
    // Should still validate the response even without context
    expect(result.score).toBeGreaterThan(0);
  });
  
  // Manual fact management
  test('allows adding and removing world facts', () => {
    const validator = new EnhancedResponseValidator();
    
    // Add a fact
    validator.addWorldFact('sky', 'The sky is blue');
    
    // Response that contradicts the fact
    let response = "You look up at the bright green sky overhead.";
    let result = validator.validate(response, 'narrative', 'I look at the sky');
    
    // Should identify the inconsistency
    expect(result.issues.some(issue => 
      issue.type === ValidationIssueType.WorldInconsistency
    )).toBe(true);
    
    // Remove the fact
    validator.removeWorldFact('sky');
    
    // Same response should now be valid
    result = validator.validate(response, 'narrative', 'I look at the sky');
    expect(result.issues.every(issue => 
      issue.type !== ValidationIssueType.WorldInconsistency
    )).toBe(true);
  });
  
  // Suggested correction
  test('suggests corrections for issues', () => {
    const validator = new EnhancedResponseValidator();
    const gameState = createMockGameState();
    validator.setGameState(gameState);
    
    // Response with multiple issues
    const problematicResponse = "Queen Eleanora rules Valorin. Thordak, the cowardly Dragonborn, hides behind a market stall. A wizard casts Fireball as a level 1 spell.";
    
    const result = validator.validate(problematicResponse, 'narrative', 'What do I see?');
    
    // Generate a suggested correction
    const correctedResponse = validator.suggestCorrection(problematicResponse, result.issues);
    
    // Corrected response should include annotations or fixes
    expect(correctedResponse).not.toBe(problematicResponse);
    expect(correctedResponse.length).toBeGreaterThan(problematicResponse.length);
  });
}); 