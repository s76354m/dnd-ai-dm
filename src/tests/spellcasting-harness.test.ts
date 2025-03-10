/**
 * Spellcasting System Tests with Harness
 * 
 * Tests for the spellcasting system, using the test harness to ensure
 * type-safety and proper test isolation.
 */

import { 
  SpellcastingManager, 
  SpellSlotState 
} from '../character/spellcasting-manager';
import { SpellEffectManager } from '../combat/spell-effects';
import { v4 as uuidv4 } from 'uuid';
import {
  createTestCharacter,
  createTestCombatSpell,
  createMockSpellEffectManager
} from './test-harness';

describe('SpellcastingManager with Test Harness', () => {
  // Setup test environment
  let spellEffectManager: ReturnType<typeof createMockSpellEffectManager>;
  let spellcastingManager: SpellcastingManager;
  const testCharacter = createTestCharacter({
    id: 'test-character-id',
    class: 'wizard' // Spellcasting class
  });
  
  beforeEach(() => {
    // Initialize managers with mocks
    spellEffectManager = createMockSpellEffectManager();
    spellcastingManager = new SpellcastingManager(spellEffectManager as unknown as SpellEffectManager);
    
    // Initialize character spells and slots
    const maxSlots = {
      1: 4, // 4 level 1 spell slots
      2: 3, // 3 level 2 spell slots
      3: 2  // 2 level 3 spell slots
    };
    
    const knownSpellNames = [
      'Magic Missile',
      'Burning Hands',
      'Cure Wounds',
      'Shield',
      'Fireball'
    ];
    
    // Add test spells to the spell effect manager
    spellEffectManager.addSpell(createTestCombatSpell({
      name: 'Burning Hands',
      level: 1,
      damageFormula: '3d6',
      target: 'area',
      areaOfEffect: { type: 'cone', size: 15 }
    }));
    
    spellEffectManager.addSpell(createTestCombatSpell({
      name: 'Shield',
      level: 1,
      effectType: 'buff',
      target: 'self',
      temporaryEffect: {
        name: 'Shield',
        description: '+5 AC until next turn',
        duration: 1
      }
    }));
    
    spellcastingManager.initializeCharacterSpells(
      testCharacter.id,
      maxSlots,
      knownSpellNames,
      true // Prepared caster
    );
    
    // Prepare some spells
    spellcastingManager.prepareSpell(testCharacter.id, 'Magic Missile', true);
    spellcastingManager.prepareSpell(testCharacter.id, 'Cure Wounds', true);
    spellcastingManager.prepareSpell(testCharacter.id, 'Fireball', true);
  });
  
  test('should initialize character spell slots correctly', () => {
    const slots = spellcastingManager.getSpellSlots(testCharacter.id);
    expect(slots).toBeDefined();
    
    if (slots) {
      expect(slots.get(1)?.max).toBe(4);
      expect(slots.get(1)?.used).toBe(0);
      expect(slots.get(2)?.max).toBe(3);
      expect(slots.get(3)?.max).toBe(2);
    }
  });
  
  test('should track known spells correctly', () => {
    const knownSpells = spellcastingManager.getKnownSpells(testCharacter.id);
    expect(knownSpells).toHaveLength(5);
    
    const spellNames = knownSpells.map(spell => spell.name);
    expect(spellNames).toContain('Magic Missile');
    expect(spellNames).toContain('Burning Hands');
    expect(spellNames).toContain('Cure Wounds');
    expect(spellNames).toContain('Shield');
    expect(spellNames).toContain('Fireball');
  });
  
  test('should track prepared spells correctly', () => {
    const preparedSpells = spellcastingManager.getPreparedSpells(testCharacter.id);
    expect(preparedSpells).toHaveLength(3);
    
    const preparedNames = preparedSpells.map(spell => spell.name);
    expect(preparedNames).toContain('Magic Missile');
    expect(preparedNames).toContain('Cure Wounds');
    expect(preparedNames).toContain('Fireball');
    expect(preparedNames).not.toContain('Shield');
  });
  
  test('should use and track spell slots when casting', () => {
    // Cast Magic Missile (1st level spell)
    const result1 = spellcastingManager.useSpellSlot(testCharacter.id, 1);
    expect(result1).toBe(true);
    
    // Check that a slot was used
    const slotsAfterCast = spellcastingManager.getSpellSlots(testCharacter.id);
    expect(slotsAfterCast?.get(1)?.used).toBe(1);
    
    // Cast using all level 1 slots
    spellcastingManager.useSpellSlot(testCharacter.id, 1);
    spellcastingManager.useSpellSlot(testCharacter.id, 1);
    spellcastingManager.useSpellSlot(testCharacter.id, 1);
    
    // Try to cast with no slots remaining
    const resultNoSlots = spellcastingManager.useSpellSlot(testCharacter.id, 1);
    expect(resultNoSlots).toBe(false);
    
    // Check final slot state
    const finalSlots = spellcastingManager.getSpellSlots(testCharacter.id);
    expect(finalSlots?.get(1)?.used).toBe(4);
    expect(finalSlots?.get(1)?.max).toBe(4);
  });
  
  test('should restore spell slots correctly', () => {
    // Use some slots
    spellcastingManager.useSpellSlot(testCharacter.id, 1);
    spellcastingManager.useSpellSlot(testCharacter.id, 1);
    spellcastingManager.useSpellSlot(testCharacter.id, 2);
    
    // Check used slots
    const slotsBeforeRestore = spellcastingManager.getSpellSlots(testCharacter.id);
    expect(slotsBeforeRestore?.get(1)?.used).toBe(2);
    expect(slotsBeforeRestore?.get(2)?.used).toBe(1);
    
    // Restore only level 1 slots
    spellcastingManager.restoreSpellSlots(testCharacter.id, [1]);
    
    // Check that level 1 slots were restored but level 2 remains used
    const slotsAfterPartialRestore = spellcastingManager.getSpellSlots(testCharacter.id);
    expect(slotsAfterPartialRestore?.get(1)?.used).toBe(0);
    expect(slotsAfterPartialRestore?.get(2)?.used).toBe(1);
    
    // Restore all slots
    spellcastingManager.restoreSpellSlots(testCharacter.id);
    
    // Check that all slots were restored
    const slotsAfterFullRestore = spellcastingManager.getSpellSlots(testCharacter.id);
    expect(slotsAfterFullRestore?.get(1)?.used).toBe(0);
    expect(slotsAfterFullRestore?.get(2)?.used).toBe(0);
    expect(slotsAfterFullRestore?.get(3)?.used).toBe(0);
  });
  
  test('should learn new spells correctly', () => {
    // Learn a new spell
    const learnResult = spellcastingManager.learnSpell(
      testCharacter.id,
      'Counterspell',
      true // Auto-prepare
    );
    
    expect(learnResult).toBe(true);
    
    // Check that spell was added to known and prepared spells
    const knownSpells = spellcastingManager.getKnownSpells(testCharacter.id);
    const knownNames = knownSpells.map(spell => spell.name);
    expect(knownNames).toContain('Counterspell');
    
    const preparedSpells = spellcastingManager.getPreparedSpells(testCharacter.id);
    const preparedNames = preparedSpells.map(spell => spell.name);
    expect(preparedNames).toContain('Counterspell');
  });
  
  test('should not allow casting unprepared spells', () => {
    // Unprepare a spell
    spellcastingManager.prepareSpell(testCharacter.id, 'Magic Missile', false);
    
    // Try to cast unprepared spell
    const castResult = spellcastingManager.castSpell(
      testCharacter.id,
      'Magic Missile',
      1,
      ['target-id']
    );
    
    expect(castResult.success).toBe(false);
    expect(castResult.message).toContain('not prepared');
  });
  
  test('should not allow casting without available spell slots', () => {
    // Use all level 1 slots
    spellcastingManager.useSpellSlot(testCharacter.id, 1);
    spellcastingManager.useSpellSlot(testCharacter.id, 1);
    spellcastingManager.useSpellSlot(testCharacter.id, 1);
    spellcastingManager.useSpellSlot(testCharacter.id, 1);
    
    // Try to cast with no slots remaining
    const castResult = spellcastingManager.castSpell(
      testCharacter.id,
      'Magic Missile',
      1,
      ['target-id']
    );
    
    expect(castResult.success).toBe(false);
    expect(castResult.message).toContain('No available spell slots');
  });
}); 