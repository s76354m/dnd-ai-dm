/**
 * Combat Context Manager Tests
 * 
 * Tests for the Combat Context Manager, which tracks and contextualizes combat actions
 * to provide rich context for AI-generated combat narratives.
 */

import { CombatContext } from '../../../dm/context/combat-context';
import { GameState } from '../../../core/interfaces/game';
import { CombatAction, ActionResult } from '../../../core/interfaces/combat';

// Mock data and helpers
const createMockGameState = (): GameState => {
  const player = global.mockInterfaces.createMockCharacter({
    name: 'Test Player',
    id: 'player-1',
    abilityScores: {
      strength: { score: 16, modifier: 3 },
      dexterity: { score: 14, modifier: 2 },
      constitution: { score: 14, modifier: 2 },
      intelligence: { score: 12, modifier: 1 },
      wisdom: { score: 10, modifier: 0 },
      charisma: { score: 8, modifier: -1 }
    }
  });
  
  const enemy = global.mockInterfaces.createMockNPC({
    name: 'Test Enemy',
    id: 'enemy-1',
    race: 'Orc',
    occupation: 'Warrior'
  });
  
  // Return minimal game state needed for testing
  return {
    player,
    npcs: new Map([['enemy-1', enemy]]),
    combatState: {
      round: 1,
      turn: 1,
      enemies: [enemy],
      allies: [],
      initiative: [
        { id: 'player-1', initiative: 18 },
        { id: 'enemy-1', initiative: 12 }
      ],
      environment: 'A dimly lit dungeon with stone walls and a damp floor.',
      currentActorId: 'player-1'
    },
    currentLocation: {
      id: 'dungeon-1',
      name: 'Dark Dungeon',
      description: 'A dark and foreboding dungeon with stone walls and flickering torches.'
    }
  } as any; // Using any to avoid needing to implement the full GameState interface
};

const createMockAction = (type: string, actorId: string, targetIds: string[]): CombatAction => {
  return {
    type,
    actorId,
    targetIds,
    weaponId: 'longsword-1',
    isAOE: false,
    isCritical: false
  } as any;
};

const createMockResult = (success: boolean, damage: number, effects: string[] = []): ActionResult => {
  return {
    success,
    damage,
    effects,
    message: 'Attack hits for ' + damage + ' damage.'
  } as any;
};

describe('CombatContext', () => {
  // Test basic initialization
  test('initializes with default config when no options provided', () => {
    const context = new CombatContext();
    
    // Expect context to be created with default values
    expect(context).toBeDefined();
    
    // Verify default config using a simple combat action
    const gameState = createMockGameState();
    const action = createMockAction('attack', 'player-1', ['enemy-1']);
    const result = createMockResult(true, 8);
    
    context.addAction(1, 1, action, result, gameState);
    
    // Build context string to check defaults are applied
    const contextString = context.buildContextString(1, 1, action, gameState);
    
    // Verify basic structure is present
    expect(contextString).toContain('Combat Round: 1');
    expect(contextString).toContain('Current Actor: Test Player');
    expect(contextString).toContain('Current Action: attack');
  });
  
  // Test action recording
  test('correctly adds and retrieves combat actions', () => {
    const context = new CombatContext();
    const gameState = createMockGameState();
    
    // Add multiple actions
    const playerAction = createMockAction('attack', 'player-1', ['enemy-1']);
    const playerResult = createMockResult(true, 8);
    
    const enemyAction = createMockAction('attack', 'enemy-1', ['player-1']);
    const enemyResult = createMockResult(true, 5);
    
    // Add actions for different rounds/turns
    context.addAction(1, 1, playerAction, playerResult, gameState);
    context.addAction(1, 2, enemyAction, enemyResult, gameState);
    
    // Round 2
    context.addAction(2, 1, playerAction, createMockResult(false, 0), gameState);
    
    // Check context string for round 1
    const round1Context = context.buildContextString(1, 2, enemyAction, gameState);
    
    // Verify round 1 context
    expect(round1Context).toContain('Combat Round: 1');
    expect(round1Context).toContain('Current Actor: Test Enemy');
    expect(round1Context).toContain('Previous Action: Test Player attacked Test Enemy');
    
    // Check context string for round 2
    const round2Context = context.buildContextString(2, 1, playerAction, gameState);
    
    // Verify round 2 context contains round 1 history
    expect(round2Context).toContain('Round 1 Summary');
    expect(round2Context).toContain('Test Player attacked Test Enemy');
    expect(round2Context).toContain('Test Enemy attacked Test Player');
  });
  
  // Test round tracking
  test('limits action history to maxRoundsToTrack', () => {
    const context = new CombatContext({ maxRoundsToTrack: 2 });
    const gameState = createMockGameState();
    const action = createMockAction('attack', 'player-1', ['enemy-1']);
    const result = createMockResult(true, 8);
    
    // Add actions for 3 rounds
    context.addAction(1, 1, action, result, gameState);
    context.addAction(2, 1, action, result, gameState);
    context.addAction(3, 1, action, result, gameState);
    
    // Check context string for round 3
    const contextString = context.buildContextString(3, 1, action, gameState);
    
    // Should include round 2 but not round 1
    expect(contextString).toContain('Round 2 Summary');
    expect(contextString).not.toContain('Round 1 Summary');
  });
  
  // Test context building
  test('builds context string with specified details', () => {
    const context = new CombatContext({
      includeActorDetails: true,
      includeTargetDetails: true,
      includeEnvironmentalDetails: true,
      includeTacticalSuggestions: false
    });
    
    const gameState = createMockGameState();
    const action = createMockAction('attack', 'player-1', ['enemy-1']);
    const result = createMockResult(true, 8);
    
    context.addAction(1, 1, action, result, gameState);
    
    const contextString = context.buildContextString(1, 1, action, gameState);
    
    // Verify actor details
    expect(contextString).toContain('Actor Details');
    expect(contextString).toContain('Name: Test Player');
    
    // Verify target details
    expect(contextString).toContain('Target Details');
    expect(contextString).toContain('Name: Test Enemy');
    
    // Verify environment details
    expect(contextString).toContain('Combat Environment');
    expect(contextString).toContain('A dimly lit dungeon');
    
    // Verify tactical suggestions are not included
    expect(contextString).not.toContain('Tactical Considerations');
  });
  
  // Test environmental factors
  test('includes environmental descriptions when available', () => {
    const context = new CombatContext({ includeEnvironmentalDetails: true });
    const gameState = createMockGameState();
    
    // Initialize combatState if it's null
    if (!gameState.combatState) {
      gameState.combatState = {
        round: 1,
        turnOrder: ['player-1', 'enemy-1'],
        currentTurn: 0,
        participants: new Map(),
        isActive: true,
        environmentalEffects: [],
        participantEntities: [],
        logs: []
      };
    }
    
    // Update game state with rich environment description
    gameState.combatState.environment = 'A rocky cliff face with crumbling edges. Strong winds make ranged attacks difficult, and loose rocks provide potential environmental hazards.';
    
    const action = createMockAction('attack', 'player-1', ['enemy-1']);
    const result = createMockResult(true, 8);
    
    context.addAction(1, 1, action, result, gameState);
    
    const contextString = context.buildContextString(1, 1, action, gameState);
    
    // Verify environment details
    expect(contextString).toContain('Combat Environment');
    expect(contextString).toContain('A rocky cliff face');
    expect(contextString).toContain('Strong winds');
  });
  
  // Test tactical suggestions
  test('generates tactical suggestions when enabled', () => {
    const context = new CombatContext({ includeTacticalSuggestions: true });
    const gameState = createMockGameState();
    const action = createMockAction('attack', 'player-1', ['enemy-1']);
    const result = createMockResult(true, 8);
    
    context.addAction(1, 1, action, result, gameState);
    
    // Initialize combatState if it's null
    if (!gameState.combatState) {
      gameState.combatState = {
        round: 1,
        turnOrder: ['player-1', 'enemy-1'],
        currentTurn: 0,
        participants: new Map(),
        isActive: true,
        environmentalEffects: [],
        participantEntities: [],
        logs: []
      };
    }
    
    // Add positions for testing
    gameState.combatState.positions = {
      'player-1': { x: 0, y: 0, z: 0 },
      'enemy-1': { x: 5, y: 0, z: 0 }
    };
    
    // Add condition to enemy
    const enemy = gameState.npcs.get('enemy-1');
    if (enemy) {
      enemy.conditions = [{ name: 'wounded', duration: 2 }];
    }
    
    const contextString = context.buildContextString(1, 1, action, gameState);
    
    // Verify tactical suggestions are included
    expect(contextString).toContain('Tactical Considerations');
  });
  
  // Edge cases
  test('handles missing gameState gracefully', () => {
    const context = new CombatContext();
    const action = createMockAction('attack', 'player-1', ['enemy-1']);
    
    // Verify no error when building context with undefined gameState
    const contextString = context.buildContextString(1, 1, action, undefined);
    
    // Should return a basic context string without crashing
    expect(contextString).toContain('Combat Round: 1');
    expect(contextString).toContain('Current Action: attack');
  });
  
  test('handles invalid action data gracefully', () => {
    const context = new CombatContext();
    const gameState = createMockGameState();
    
    // Create action with invalid actor and target
    const invalidAction = createMockAction('attack', 'nonexistent-actor', ['nonexistent-target']);
    const result = createMockResult(true, 8);
    
    context.addAction(1, 1, invalidAction, result, gameState);
    
    // Should not crash when building context with invalid references
    const contextString = context.buildContextString(1, 1, invalidAction, gameState);
    
    // Should still contain basic information
    expect(contextString).toContain('Combat Round: 1');
    expect(contextString).toContain('Current Action: attack');
  });

  // Test with minimal context
  test('handles minimal context gracefully', () => {
    const context = new CombatContext();
    const action = createMockAction('attack', 'player-1', ['enemy-1']);
    const result = createMockResult(true, 8);
    
    // Create a minimal game state
    const gameState = createMockGameState();
    
    // Call with a valid GameState object instead of undefined
    const contextString = context.buildContextString(1, 1, action, gameState);
    
    // Should still generate some context
    expect(contextString.length).toBeGreaterThan(0);
    expect(contextString).toContain('Combat Round: 1');
  });
}); 