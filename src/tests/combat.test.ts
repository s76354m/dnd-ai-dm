/**
 * Combat System Tests
 * 
 * Tests for the combat system, including turn management, initiative tracking,
 * attacks, spell casting, and item usage during combat.
 */

import { 
  CombatManager, 
  CombatStatus,
  CombatState,
  InitiativeEntry 
} from '../combat/combat-manager';
import { EnemyManager } from '../combat/enemy-manager';
import { SpellEffectManager } from '../combat/spell-effects';
import { SpellcastingManager } from '../character/spellcasting-manager';
import { ItemUsageManager, ItemUseContext } from '../character/item-usage-manager';
import { Character } from '../core/interfaces/character';
import { NPC } from '../core/interfaces/npc';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
jest.mock('../combat/enemy-manager');
jest.mock('../combat/spell-effects');
jest.mock('../character/spellcasting-manager');
jest.mock('../character/item-usage-manager');
jest.mock('../character/inventory');

describe('CombatManager', () => {
  // Setup test environment
  let enemyManager: jest.Mocked<EnemyManager>;
  let spellEffectManager: jest.Mocked<SpellEffectManager>;
  let spellcastingManager: jest.Mocked<SpellcastingManager>;
  let itemUsageManager: jest.Mocked<ItemUsageManager>;
  let combatManager: CombatManager;
  
  beforeEach(() => {
    // Initialize mocked dependencies
    enemyManager = new EnemyManager() as jest.Mocked<EnemyManager>;
    spellEffectManager = new SpellEffectManager() as jest.Mocked<SpellEffectManager>;
    spellcastingManager = new SpellcastingManager(spellEffectManager) as jest.Mocked<SpellcastingManager>;
    itemUsageManager = new ItemUsageManager({} as any) as jest.Mocked<ItemUsageManager>;
    
    // Setup mocks for getMonsterActions method
    (enemyManager.getMonsterActions as jest.Mock).mockImplementation((enemyId: string) => {
      if (enemyId.includes('goblin')) {
        return [
          {
            name: 'Scimitar',
            type: 'melee',
            toHit: 4,
            range: '5 ft.',
            target: 'one target',
            damage: {
              dice: '1d6',
              type: 'slashing',
              bonus: 2
            }
          }
        ];
      } else if (enemyId.includes('orc')) {
        return [
          {
            name: 'Greataxe',
            type: 'melee',
            toHit: 5,
            range: '5 ft.',
            target: 'one target',
            damage: {
              dice: '1d12',
              type: 'slashing',
              bonus: 3
            }
          },
          {
            name: 'Javelin',
            type: 'ranged',
            toHit: 5,
            range: '30/120 ft.',
            target: 'one target',
            damage: {
              dice: '1d6',
              type: 'piercing',
              bonus: 3
            }
          }
        ];
      }
      return [];
    });
    
    // Setup itemUsageManager mock for useItem
    (itemUsageManager.useItem as jest.Mock).mockImplementation(
      (characterId: string, itemId: string, targetId?: string, context?: ItemUseContext) => {
        return {
          success: true,
          message: `Used item ${itemId}`,
          effectApplied: true,
          healingDone: itemId.includes('healing') ? 8 : undefined,
          damageDone: itemId.includes('fire') ? 15 : undefined,
          itemConsumed: true
        };
      }
    );
    
    // Setup spellcastingManager mock for castSpell
    (spellcastingManager.castSpell as jest.Mock).mockImplementation(
      (casterId: string, spellName: string, level: number, targets: string[]) => {
        return {
          success: true,
          message: `Cast ${spellName} at level ${level}`,
          result: {
            success: true,
            message: `${spellName} was cast successfully`,
            targets: targets,
            appliedEffects: []
          }
        };
      }
    );
    
    // Initialize the CombatManager with mocked dependencies
    combatManager = new CombatManager(
      enemyManager,
      spellEffectManager,
      spellcastingManager,
      itemUsageManager
    );
  });
  
  test('should initialize combat with players and enemies', () => {
    // Create mock players and enemies
    const player1 = global.mockInterfaces.createMockCharacter();
    const player2 = global.mockInterfaces.createMockCharacter();
    const enemy1 = global.mockInterfaces.createMockNPC({ id: 'enemy-goblin-1' });
    const enemy2 = global.mockInterfaces.createMockNPC({ id: 'enemy-orc-1' });
    
    // Start combat
    const combatState = combatManager.startCombat(
      [player1, player2],
      [enemy1, enemy2],
      'forest-clearing',
      true, // Player initiated
      'medium'
    );
    
    // Verify combat state
    expect(combatState).toBeDefined();
    expect(combatState.status).toBe(CombatStatus.Preparing);
    expect(combatState.location).toBe('forest-clearing');
    expect(combatState.round).toBe(0);
    expect(combatState.initiativeOrder.length).toBe(4);
    
    // Check that enemies are marked as surprised since players initiated
    const enemyEntries = combatState.initiativeOrder.filter(entry => !entry.isPlayer);
    enemyEntries.forEach(entry => {
      expect(entry.conditions).toContain('surprised');
    });
  });
  
  test('should start a new round and track turn order', () => {
    // Create mock players and enemies
    const player = global.mockInterfaces.createMockCharacter();
    const enemy = global.mockInterfaces.createMockNPC();
    
    // Start combat
    combatManager.startCombat(
      [player],
      [enemy],
      'tavern',
      false,
      'easy'
    );
    
    // Start first round
    const round1State = combatManager.startNextRound();
    
    // Verify round state
    expect(round1State).toBeDefined();
    expect(round1State!.status).toBe(CombatStatus.Active);
    expect(round1State!.round).toBe(1);
    expect(round1State!.currentTurnIndex).toBe(0);
    
    // Get current participant
    const currentParticipant = combatManager.getCurrentParticipant();
    expect(currentParticipant).toBeDefined();
    
    // End current turn
    const nextParticipant = combatManager.endTurn();
    expect(nextParticipant).toBeDefined();
    expect(round1State!.currentTurnIndex).toBe(1);
    
    // End all turns in round
    combatManager.endTurn();
    
    // Start second round
    const round2State = combatManager.getCombatState();
    expect(round2State!.round).toBe(2);
    
    // Verify that 'surprised' condition is cleared after first round
    const initiativeEntries = round2State!.initiativeOrder;
    initiativeEntries.forEach(entry => {
      expect(entry.conditions).not.toContain('surprised');
    });
  });
  
  test('should handle attacks correctly', () => {
    // Create mock player and enemy
    const player = global.mockInterfaces.createMockCharacter();
    const enemy = global.mockInterfaces.createMockNPC({ id: 'enemy-goblin-1' });
    
    // Start combat
    combatManager.startCombat(
      [player],
      [enemy],
      'dungeon',
      false,
      'medium'
    );
    
    // Start first round
    combatManager.startNextRound();
    
    // Get combat state
    const combatState = combatManager.getCombatState()!;
    
    // Find player and enemy in initiative order
    const playerEntry = combatState.initiativeOrder.find(entry => entry.isPlayer)!;
    const enemyEntry = combatState.initiativeOrder.find(entry => !entry.isPlayer)!;
    
    // Set current turn to player
    combatState.currentTurnIndex = combatState.initiativeOrder.indexOf(playerEntry);
    
    // Perform attack
    const attackResult = combatManager.performAttack(
      playerEntry.participant.id,
      enemyEntry.participant.id
    );
    
    // Verify attack
    expect(attackResult).toBeDefined();
    expect(attackResult!.attacker).toBe(playerEntry.participant);
    expect(attackResult!.target).toBe(enemyEntry.participant);
    
    // Check that player's action was used
    expect(playerEntry.hasAction).toBe(false);
    
    // Check combat log for attack
    const combatLog = combatManager.getCombatLog();
    expect(combatLog.length).toBeGreaterThan(0);
    
    // Enemy's turn - try to attack when it's not their turn (should fail)
    const invalidAttack = combatManager.performAttack(
      enemyEntry.participant.id,
      playerEntry.participant.id
    );
    
    expect(invalidAttack).toBeNull();
  });
  
  test('should end combat when all enemies are defeated', () => {
    // Create mock player and enemy
    const player = global.mockInterfaces.createMockCharacter();
    const enemy = global.mockInterfaces.createMockNPC({ id: 'enemy-goblin-1' });
    
    // Start combat
    combatManager.startCombat(
      [player],
      [enemy],
      'cave',
      true,
      'easy'
    );
    
    // Start first round
    combatManager.startNextRound();
    
    // Get combat state
    const combatState = combatManager.getCombatState()!;
    
    // Find player and enemy in initiative order
    const playerEntry = combatState.initiativeOrder.find(entry => entry.isPlayer)!;
    const enemyEntry = combatState.initiativeOrder.find(entry => !entry.isPlayer)!;
    
    // Set current turn to player
    combatState.currentTurnIndex = combatState.initiativeOrder.indexOf(playerEntry);
    
    // Manually set enemy HP to 0 (to simulate defeating them)
    const enemy1 = enemyEntry.participant as NPC;
    enemy1.stats.hitPoints.current = 0;
    
    // Mark enemy as defeated
    enemyEntry.conditions.push('defeated');
    
    // Check if combat is over
    const isCombatOver = combatManager.isCombatOver();
    expect(isCombatOver).toBe(true);
    
    // Check combat state
    const finalCombatState = combatManager.getCombatState();
    expect(finalCombatState!.status).toBe(CombatStatus.Completed);
    expect(finalCombatState!.experienceAwarded).toBe(true);
  });
  
  test('should allow using items in combat', () => {
    // Create mock player and enemy
    const player = global.mockInterfaces.createMockCharacter();
    const enemy = global.mockInterfaces.createMockNPC({ id: 'enemy-goblin-1' });
    
    // Start combat
    combatManager.startCombat(
      [player],
      [enemy],
      'forest',
      false,
      'medium'
    );
    
    // Start first round
    combatManager.startNextRound();
    
    // Get combat state
    const combatState = combatManager.getCombatState()!;
    
    // Find player in initiative order
    const playerEntry = combatState.initiativeOrder.find(entry => entry.isPlayer)!;
    
    // Set current turn to player
    combatState.currentTurnIndex = combatState.initiativeOrder.indexOf(playerEntry);
    
    // Use a healing potion
    const useItemResult = combatManager.useItem(
      playerEntry.participant.id,
      'potion-healing-1'
    );
    
    // Verify item usage
    expect(useItemResult).toBe(true);
    expect(itemUsageManager.useItem).toHaveBeenCalledWith(
      playerEntry.participant.id,
      'potion-healing-1',
      undefined,
      ItemUseContext.Combat
    );
    
    // Check that player's action was used
    expect(playerEntry.hasAction).toBe(false);
    
    // Try to use another item when action is already used (should fail)
    const secondItemResult = combatManager.useItem(
      playerEntry.participant.id,
      'potion-fire-breath-1',
      enemy.id
    );
    
    expect(secondItemResult).toBe(false);
  });
  
  test('should allow casting spells in combat', () => {
    // Create mock player and enemy
    const player = global.mockInterfaces.createMockCharacter();
    const enemy = global.mockInterfaces.createMockNPC({ id: 'enemy-goblin-1' });
    
    // Start combat
    combatManager.startCombat(
      [player],
      [enemy],
      'wizard-tower',
      true,
      'medium'
    );
    
    // Start first round
    combatManager.startNextRound();
    
    // Get combat state
    const combatState = combatManager.getCombatState()!;
    
    // Find player in initiative order
    const playerEntry = combatState.initiativeOrder.find(entry => entry.isPlayer)!;
    
    // Set current turn to player
    combatState.currentTurnIndex = combatState.initiativeOrder.indexOf(playerEntry);
    
    // Cast a spell
    const castResult = combatManager.castSpell(
      playerEntry.participant.id,
      'Magic Missile',
      1,
      [enemy.id]
    );
    
    // Verify spell casting
    expect(castResult).toBe(true);
    expect(spellcastingManager.castSpell).toHaveBeenCalledWith(
      playerEntry.participant.id,
      'Magic Missile',
      1,
      [enemy.id]
    );
    
    // Check that player's action was used
    expect(playerEntry.hasAction).toBe(false);
    
    // Try to cast another spell when action is already used (should fail)
    const secondCastResult = combatManager.castSpell(
      playerEntry.participant.id,
      'Fireball',
      3,
      [enemy.id]
    );
    
    expect(secondCastResult).toBe(false);
  });
  
  test('should provide available actions based on current participant', () => {
    // Create mock player and enemy
    const player = global.mockInterfaces.createMockCharacter();
    const enemy = global.mockInterfaces.createMockNPC();
    
    // Start combat
    combatManager.startCombat(
      [player],
      [enemy],
      'arena',
      false,
      'hard'
    );
    
    // Start first round
    combatManager.startNextRound();
    
    // Get combat state
    const combatState = combatManager.getCombatState()!;
    
    // Find player in initiative order
    const playerEntry = combatState.initiativeOrder.find(entry => entry.isPlayer)!;
    
    // Set current turn to player
    combatState.currentTurnIndex = combatState.initiativeOrder.indexOf(playerEntry);
    
    // Get available actions
    const availableActions = combatManager.getAvailableActions();
    
    // Check that basic actions are available
    expect(availableActions).toContain('attack');
    expect(availableActions).toContain('dash');
    expect(availableActions).toContain('dodge');
    expect(availableActions).toContain('use_item');
    
    // Use an action
    playerEntry.hasAction = false;
    
    // Get available actions again
    const remainingActions = combatManager.getAvailableActions();
    
    // Should be empty since action was used
    expect(remainingActions.length).toBe(0);
  });
  
  test('should handle temporary effects in combat', () => {
    // Create mock player and enemy
    const player = global.mockInterfaces.createMockCharacter();
    const enemy = global.mockInterfaces.createMockNPC();
    
    // Start combat
    combatManager.startCombat(
      [player],
      [enemy],
      'enchanted-forest',
      false,
      'medium'
    );
    
    // Start first round
    combatManager.startNextRound();
    
    // Get combat state
    const combatState = combatManager.getCombatState()!;
    
    // Find player in initiative order
    const playerEntry = combatState.initiativeOrder.find(entry => entry.isPlayer)!;
    
    // Add temporary effect to player
    const effectId = uuidv4();
    const effect = {
      id: effectId,
      name: 'Blessed',
      description: '+1d4 to attack rolls and saving throws',
      duration: 10, // 10 rounds
      roundApplied: combatState.round,
      source: 'cleric-spell'
    };
    
    const addEffectResult = combatManager.addEffect(
      playerEntry.participant.id,
      effect
    );
    
    // Verify effect was added
    expect(addEffectResult).toBe(true);
    expect(playerEntry.temporaryEffects).toContain(effect);
    
    // Remove the effect
    const removeEffectResult = combatManager.removeEffect(
      playerEntry.participant.id,
      effectId
    );
    
    // Verify effect was removed
    expect(removeEffectResult).toBe(true);
    expect(playerEntry.temporaryEffects).not.toContain(effect);
  });
  
  test('should allow moving participants during combat', () => {
    // Create mock player and enemy
    const player = global.mockInterfaces.createMockCharacter();
    const enemy = global.mockInterfaces.createMockNPC();
    
    // Start combat
    combatManager.startCombat(
      [player],
      [enemy],
      'battlefield',
      true,
      'medium'
    );
    
    // Start first round
    combatManager.startNextRound();
    
    // Get combat state
    const combatState = combatManager.getCombatState()!;
    
    // Find player in initiative order
    const playerEntry = combatState.initiativeOrder.find(entry => entry.isPlayer)!;
    
    // Set current turn to player
    combatState.currentTurnIndex = combatState.initiativeOrder.indexOf(playerEntry);
    
    // Move player
    const moveResult = combatManager.moveParticipant(
      playerEntry.participant.id,
      20 // Move 20 feet
    );
    
    // Verify movement
    expect(moveResult).toBe(true);
    expect(playerEntry.hasMovement).toBe(false);
    
    // Try to move again (should fail)
    const secondMoveResult = combatManager.moveParticipant(
      playerEntry.participant.id,
      10
    );
    
    expect(secondMoveResult).toBe(false);
  });
}); 