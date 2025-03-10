/**
 * Spellcasting System Tests
 * 
 * Tests for the spellcasting system, including spell slot management,
 * spell preparation, spell casting, and spell effect application.
 */

import { 
  SpellcastingManager, 
  SpellSlotState 
} from '../character/spellcasting-manager';
import { SpellEffectManager, CombatSpell } from '../combat/spell-effects';
import { findSpellByName, SPELLS } from '../data/spells';
import { v4 as uuidv4 } from 'uuid';

// Mock the SpellEffectManager
jest.mock('../combat/spell-effects', () => {
  return {
    SpellEffectManager: jest.fn().mockImplementation(() => {
      const mockSpells = {
        'magic missile': {
          id: uuidv4(),
          name: 'Magic Missile',
          level: 1,
          school: 'Evocation',
          castingTime: '1 action',
          range: '120 feet',
          components: ['V', 'S'],
          duration: 'Instantaneous',
          description: 'You create three glowing darts of magical force.',
          target: 'multiple',
          effectType: 'damage',
          damageType: 'force',
          damageFormula: '3*(1d4+1)'
        },
        'fireball': {
          id: uuidv4(),
          name: 'Fireball',
          level: 3,
          school: 'Evocation',
          castingTime: '1 action',
          range: '150 feet',
          components: ['V', 'S', 'M'],
          duration: 'Instantaneous',
          description: 'A bright streak flashes from your pointing finger...',
          target: 'area',
          effectType: 'damage',
          damageType: 'fire',
          damageFormula: '8d6',
          areaOfEffect: { type: 'sphere', size: 20 }
        },
        'cure wounds': {
          id: uuidv4(),
          name: 'Cure Wounds',
          level: 1,
          school: 'Evocation',
          castingTime: '1 action',
          range: 'Touch',
          components: ['V', 'S'],
          duration: 'Instantaneous',
          description: 'A creature you touch regains hit points.',
          target: 'single',
          effectType: 'healing',
          healingFormula: '1d8+3'
        }
      };
      
      return {
        getSpell: jest.fn((spellName: string) => {
          return mockSpells[spellName.toLowerCase() as keyof typeof mockSpells];
        }),
        applySpellEffect: jest.fn((spell, caster, targets) => {
          return {
            success: true,
            message: `${spell.name} was cast successfully`,
            targets: targets,
            appliedEffects: []
          };
        })
      };
    })
  };
});

describe('SpellcastingManager', () => {
  // Setup test environment
  let spellEffectManager: jest.Mocked<SpellEffectManager>;
  let spellcastingManager: SpellcastingManager;
  const mockCharacterId = uuidv4();
  
  beforeEach(() => {
    // Initialize managers
    spellEffectManager = new SpellEffectManager() as jest.Mocked<SpellEffectManager>;
    spellcastingManager = new SpellcastingManager(spellEffectManager);
    
    // Initialize character spells and slots
    const maxSlots = {
      1: 4,  // 4 level 1 spell slots
      2: 3,  // 3 level 2 spell slots
      3: 2   // 2 level 3 spell slots
    };
    
    const knownSpellNames = [
      'Magic Missile',
      'Burning Hands',
      'Cure Wounds',
      'Shield',
      'Fireball'
    ];
    
    spellcastingManager.initializeCharacterSpells(
      mockCharacterId,
      maxSlots,
      knownSpellNames,
      true // Prepared caster
    );
    
    // Prepare some spells
    spellcastingManager.prepareSpell(mockCharacterId, 'Magic Missile', true);
    spellcastingManager.prepareSpell(mockCharacterId, 'Cure Wounds', true);
    spellcastingManager.prepareSpell(mockCharacterId, 'Fireball', true);
  });
  
  test('should initialize character spell slots correctly', () => {
    const slots = spellcastingManager.getSpellSlots(mockCharacterId);
    expect(slots).toBeDefined();
    
    if (slots) {
      expect(slots.get(1)?.max).toBe(4);
      expect(slots.get(1)?.used).toBe(0);
      expect(slots.get(2)?.max).toBe(3);
      expect(slots.get(3)?.max).toBe(2);
    }
  });
  
  test('should track known spells correctly', () => {
    const knownSpells = spellcastingManager.getKnownSpells(mockCharacterId);
    expect(knownSpells.length).toBe(5);
    
    const spellNames = knownSpells.map(spell => spell.name);
    expect(spellNames).toContain('Magic Missile');
    expect(spellNames).toContain('Burning Hands');
    expect(spellNames).toContain('Cure Wounds');
    expect(spellNames).toContain('Shield');
    expect(spellNames).toContain('Fireball');
  });
  
  test('should track prepared spells correctly', () => {
    const preparedSpells = spellcastingManager.getPreparedSpells(mockCharacterId);
    expect(preparedSpells.length).toBe(3);
    
    const preparedNames = preparedSpells.map(spell => spell.name);
    expect(preparedNames).toContain('Magic Missile');
    expect(preparedNames).toContain('Cure Wounds');
    expect(preparedNames).toContain('Fireball');
    expect(preparedNames).not.toContain('Shield');
  });
  
  test('should use and track spell slots when casting', () => {
    // Cast Magic Missile (1st level spell)
    const result1 = spellcastingManager.useSpellSlot(mockCharacterId, 1);
    expect(result1).toBe(true);
    
    // Check that a slot was used
    const slotsAfterCast = spellcastingManager.getSpellSlots(mockCharacterId);
    expect(slotsAfterCast?.get(1)?.used).toBe(1);
    
    // Cast using all level 1 slots
    spellcastingManager.useSpellSlot(mockCharacterId, 1);
    spellcastingManager.useSpellSlot(mockCharacterId, 1);
    spellcastingManager.useSpellSlot(mockCharacterId, 1);
    
    // Try to cast with no slots remaining
    const resultNoSlots = spellcastingManager.useSpellSlot(mockCharacterId, 1);
    expect(resultNoSlots).toBe(false);
    
    // Check final slot state
    const finalSlots = spellcastingManager.getSpellSlots(mockCharacterId);
    expect(finalSlots?.get(1)?.used).toBe(4);
    expect(finalSlots?.get(1)?.max).toBe(4);
  });
  
  test('should restore spell slots correctly', () => {
    // Use some slots
    spellcastingManager.useSpellSlot(mockCharacterId, 1);
    spellcastingManager.useSpellSlot(mockCharacterId, 1);
    spellcastingManager.useSpellSlot(mockCharacterId, 2);
    
    // Check used slots
    const slotsBeforeRestore = spellcastingManager.getSpellSlots(mockCharacterId);
    expect(slotsBeforeRestore?.get(1)?.used).toBe(2);
    expect(slotsBeforeRestore?.get(2)?.used).toBe(1);
    
    // Restore only level 1 slots
    spellcastingManager.restoreSpellSlots(mockCharacterId, [1]);
    
    // Check that level 1 slots were restored but level 2 remains used
    const slotsAfterPartialRestore = spellcastingManager.getSpellSlots(mockCharacterId);
    expect(slotsAfterPartialRestore?.get(1)?.used).toBe(0);
    expect(slotsAfterPartialRestore?.get(2)?.used).toBe(1);
    
    // Restore all slots
    spellcastingManager.restoreSpellSlots(mockCharacterId);
    
    // Check that all slots were restored
    const slotsAfterFullRestore = spellcastingManager.getSpellSlots(mockCharacterId);
    expect(slotsAfterFullRestore?.get(1)?.used).toBe(0);
    expect(slotsAfterFullRestore?.get(2)?.used).toBe(0);
    expect(slotsAfterFullRestore?.get(3)?.used).toBe(0);
  });
  
  test('should learn new spells correctly', () => {
    // Learn a new spell
    const learnResult = spellcastingManager.learnSpell(
      mockCharacterId,
      'Counterspell',
      true // Auto-prepare
    );
    
    expect(learnResult).toBe(true);
    
    // Check that spell was added to known and prepared spells
    const knownSpells = spellcastingManager.getKnownSpells(mockCharacterId);
    const knownNames = knownSpells.map(spell => spell.name);
    expect(knownNames).toContain('Counterspell');
    
    const preparedSpells = spellcastingManager.getPreparedSpells(mockCharacterId);
    const preparedNames = preparedSpells.map(spell => spell.name);
    expect(preparedNames).toContain('Counterspell');
  });
  
  test('should not allow casting unprepared spells', () => {
    // Unprepare a spell
    spellcastingManager.prepareSpell(mockCharacterId, 'Magic Missile', false);
    
    // Try to cast unprepared spell
    const castResult = spellcastingManager.castSpell(
      mockCharacterId,
      'Magic Missile',
      1,
      ['target-id']
    );
    
    expect(castResult.success).toBe(false);
    expect(castResult.message).toContain('not prepared');
  });
  
  test('should not allow casting without available spell slots', () => {
    // Use all level 1 slots
    spellcastingManager.useSpellSlot(mockCharacterId, 1);
    spellcastingManager.useSpellSlot(mockCharacterId, 1);
    spellcastingManager.useSpellSlot(mockCharacterId, 1);
    spellcastingManager.useSpellSlot(mockCharacterId, 1);
    
    // Try to cast with no slots remaining
    const castResult = spellcastingManager.castSpell(
      mockCharacterId,
      'Magic Missile',
      1,
      ['target-id']
    );
    
    expect(castResult.success).toBe(false);
    expect(castResult.message).toContain('No available spell slots');
  });
});

describe('SpellEffectManager', () => {
  let spellEffectManager: SpellEffectManager;
  
  beforeEach(() => {
    spellEffectManager = new SpellEffectManager();
  });
  
  test('should load basic spells', () => {
    const fireball = spellEffectManager.getSpell('fireball');
    expect(fireball).toBeDefined();
    
    if (fireball) {
      expect(fireball.name).toBe('Fireball');
      expect(fireball.level).toBe(3);
      expect(fireball.effectType).toBe('damage');
      expect(fireball.damageType).toBe('fire');
    }
  });
  
  test('should find spells case-insensitively', () => {
    const magicMissile = spellEffectManager.getSpell('magic missile');
    const MagicMissile = spellEffectManager.getSpell('Magic Missile');
    
    expect(magicMissile).toBeDefined();
    expect(MagicMissile).toBeDefined();
    expect(magicMissile).toEqual(MagicMissile);
  });
  
  test('should return undefined for unknown spells', () => {
    const unknownSpell = spellEffectManager.getSpell('unknown spell');
    expect(unknownSpell).toBeUndefined();
  });
});

describe('Spell Data', () => {
  test('should find spells by name', () => {
    const fireball = findSpellByName('Fireball');
    expect(fireball).toBeDefined();
    expect(fireball?.name).toBe('Fireball');
    expect(fireball?.level).toBe(3);
    
    const nonExistentSpell = findSpellByName('NonExistentSpell');
    expect(nonExistentSpell).toBeUndefined();
  });
  
  test('all spells should have required properties', () => {
    SPELLS.forEach(spell => {
      expect(spell.id).toBeDefined();
      expect(spell.name).toBeDefined();
      expect(spell.level).toBeGreaterThanOrEqual(0);
      expect(spell.school).toBeDefined();
      expect(spell.castingTime).toBeDefined();
      expect(spell.range).toBeDefined();
      expect(spell.components).toBeDefined();
      expect(spell.components.length).toBeGreaterThan(0);
      expect(spell.duration).toBeDefined();
      expect(spell.description).toBeDefined();
      expect(spell.target).toBeDefined();
      expect(spell.effectType).toBeDefined();
      expect(spell.concentration).toBeDefined();
      
      // Validate damage spells have damage information
      if (spell.effectType === 'damage') {
        expect(spell.damageType).toBeDefined();
        expect(spell.damageFormula).toBeDefined();
      }
      
      // Validate healing spells have healing information
      if (spell.effectType === 'healing') {
        expect(spell.healingFormula).toBeDefined();
      }
      
      // Validate area spells have area information
      if (spell.target === 'area') {
        expect(spell.areaOfEffect).toBeDefined();
        expect(spell.areaOfEffect?.type).toBeDefined();
        expect(spell.areaOfEffect?.size).toBeGreaterThan(0);
      }
    });
  });
}); 