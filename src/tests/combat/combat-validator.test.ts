/**
 * Tests for Combat Validator
 * 
 * Tests validation functions for combat actions, targets, and other combat-related functionality.
 */

import { CombatValidator, ValidationResult } from '../../combat/combat-validator';
import { 
  CombatState, 
  CombatStatus, 
  InitiativeEntry,
  ActionType 
} from '../../combat/combat-manager';
import { Character } from '../../core/interfaces/character';
import { NPC } from '../../core/interfaces/npc';

// Create mocks
const mockCharacter: Partial<Character> = {
  id: 'player-1',
  name: 'Test Player',
  hitPoints: { current: 20, maximum: 30 },
  abilityScores: {
    strength: { score: 14, modifier: 2, savingThrow: 2 },
    dexterity: { score: 12, modifier: 1, savingThrow: 1 },
    constitution: { score: 16, modifier: 3, savingThrow: 3 },
    intelligence: { score: 10, modifier: 0, savingThrow: 0 },
    wisdom: { score: 8, modifier: -1, savingThrow: -1 },
    charisma: { score: 14, modifier: 2, savingThrow: 2 }
  },
  equipment: [
    {
      id: 'weapon-1',
      name: 'Longsword',
      type: 'weapon',
      isEquipped: true,
      properties: ['weapon', 'melee', 'slashing', 'versatile'],
      weight: 3
    }
  ],
  spells: [
    {
      id: 'spell-1',
      name: 'Magic Missile',
      level: 1,
      school: 'evocation',
      castingTime: '1 action',
      range: '120 feet',
      components: 'V, S',
      duration: 'Instantaneous',
      description: 'You create three glowing darts of magical force.'
    }
  ],
  inventory: {
    gold: 50,
    items: [
      {
        id: 'potion-1',
        name: 'Healing Potion',
        type: 'potion',
        properties: ['usable', 'consumable', 'healing'],
        weight: 0.5
      }
    ]
  },
  speed: 30,
  proficiencyBonus: 2
};

const mockNPC: Partial<NPC> = {
  id: 'enemy-goblin-1',
  name: 'Goblin Scout',
  race: 'goblin',
  stats: {
    abilityScores: {
      strength: { score: 8, modifier: -1 },
      dexterity: { score: 14, modifier: 2 },
      constitution: { score: 10, modifier: 0 },
      intelligence: { score: 10, modifier: 0 },
      wisdom: { score: 8, modifier: -1 },
      charisma: { score: 8, modifier: -1 }
    },
    hitPoints: { current: 7, maximum: 7 },
    armorClass: 15,
    speed: 30
  },
  attitude: 'hostile',
  description: 'A small, nimble goblin scout with a bow and shortsword.'
};

// Create mock initiative entries
const mockPlayerEntry: InitiativeEntry = {
  participant: mockCharacter as Character,
  initiative: 15,
  isPlayer: true,
  hasAction: true,
  hasBonusAction: true,
  hasReaction: true,
  hasMovement: true,
  conditions: [],
  temporaryEffects: []
};

const mockEnemyEntry: InitiativeEntry = {
  participant: mockNPC as NPC,
  initiative: 12,
  isPlayer: false,
  hasAction: true,
  hasBonusAction: true,
  hasReaction: true,
  hasMovement: true,
  conditions: [],
  temporaryEffects: []
};

const mockDefeatedEnemyEntry: InitiativeEntry = {
  participant: {...mockNPC, id: 'enemy-goblin-2', name: 'Defeated Goblin'} as NPC,
  initiative: 8,
  isPlayer: false,
  hasAction: false,
  hasBonusAction: false,
  hasReaction: false,
  hasMovement: false,
  conditions: ['defeated'],
  temporaryEffects: []
};

// Create mock combat state
const mockCombatState: CombatState = {
  id: 'combat-1',
  status: CombatStatus.Active,
  round: 1,
  initiativeOrder: [mockPlayerEntry, mockEnemyEntry, mockDefeatedEnemyEntry],
  currentTurnIndex: 0, // Player's turn
  combatLog: ['Combat has started.'],
  startTime: Date.now(),
  location: 'Forest Clearing',
  encounterDifficulty: 'medium',
  isPlayerInitiated: true,
  experienceAwarded: false
};

describe('CombatValidator', () => {
  let validator: CombatValidator;
  
  beforeEach(() => {
    validator = new CombatValidator();
  });
  
  describe('validateActiveCombat', () => {
    it('should return invalid for null combat state', () => {
      const result = validator.validateActiveCombat(null);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('No active combat encounter');
    });
    
    it('should return invalid for non-active combat', () => {
      const inactiveCombat = { ...mockCombatState, status: CombatStatus.Completed };
      const result = validator.validateActiveCombat(inactiveCombat);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Combat is not active');
    });
    
    it('should return valid for active combat', () => {
      const result = validator.validateActiveCombat(mockCombatState);
      expect(result.isValid).toBe(true);
    });
  });
  
  describe('validateParticipant', () => {
    it('should return invalid for empty participant ID', () => {
      const result = validator.validateParticipant('', mockCombatState);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('No participant ID provided');
    });
    
    it('should return invalid for non-existent participant', () => {
      const result = validator.validateParticipant('non-existent', mockCombatState);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('not found in combat');
    });
    
    it('should return valid with participant for existing ID', () => {
      const result = validator.validateParticipant('player-1', mockCombatState);
      expect(result.isValid).toBe(true);
      expect(result.entity).toBe(mockPlayerEntry);
    });
  });
  
  describe('validateParticipantTurn', () => {
    it('should return invalid if not the participant\'s turn', () => {
      const result = validator.validateParticipantTurn('enemy-goblin-1', mockCombatState);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('not');
      expect(result.errorMessage).toContain('turn');
    });
    
    it('should return valid if it is the participant\'s turn', () => {
      const result = validator.validateParticipantTurn('player-1', mockCombatState);
      expect(result.isValid).toBe(true);
      expect(result.entity).toBe(mockPlayerEntry);
    });
    
    it('should propagate validation errors from validateParticipant', () => {
      const result = validator.validateParticipantTurn('non-existent', mockCombatState);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('not found in combat');
    });
  });
  
  describe('validateTarget', () => {
    it('should return invalid for empty target ID', () => {
      const result = validator.validateTarget('', mockCombatState);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('No target ID provided');
    });
    
    it('should return invalid for non-existent target', () => {
      const result = validator.validateTarget('non-existent', mockCombatState);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('not found in combat');
    });
    
    it('should return invalid for defeated targets', () => {
      const result = validator.validateTarget('enemy-goblin-2', mockCombatState);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('already defeated');
    });
    
    it('should return valid with target for valid target', () => {
      const result = validator.validateTarget('enemy-goblin-1', mockCombatState);
      expect(result.isValid).toBe(true);
      expect(result.entity).toBe(mockEnemyEntry);
    });
  });
  
  describe('validateAction', () => {
    it('should return invalid if participant has already used their action', () => {
      const noActionEntry = { ...mockPlayerEntry, hasAction: false };
      const result = validator.validateAction(noActionEntry, ActionType.Attack);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('already used their action');
    });
    
    it('should return valid if participant has an action available', () => {
      const result = validator.validateAction(mockPlayerEntry, ActionType.Attack);
      expect(result.isValid).toBe(true);
    });
    
    it('should validate spell casting capabilities', () => {
      // Test player with spells can cast
      const result = validator.validateAction(mockPlayerEntry, ActionType.Cast);
      expect(result.isValid).toBe(true);
      
      // Test player without spells cannot cast
      const noSpellsPlayer = { 
        ...mockPlayerEntry, 
        participant: { ...mockCharacter, spells: [] } as Character 
      };
      const noSpellsResult = validator.validateAction(noSpellsPlayer, ActionType.Cast);
      expect(noSpellsResult.isValid).toBe(false);
      expect(noSpellsResult.errorMessage).toContain('doesn\'t have any spells');
      
      // Test NPC without spellcasting cannot cast
      const noSpellsNPC = {
        ...mockEnemyEntry,
        participant: { ...mockNPC, spellcasting: undefined } as NPC
      };
      const noSpellsNPCResult = validator.validateAction(noSpellsNPC, ActionType.Cast);
      expect(noSpellsNPCResult.isValid).toBe(false);
      expect(noSpellsNPCResult.errorMessage).toContain('can\'t cast spells');
    });
  });
  
  describe('validateAttack', () => {
    it('should return invalid if attacker cannot perform an attack', () => {
      const noActionEntry = { ...mockPlayerEntry, hasAction: false };
      const result = validator.validateAttack(noActionEntry, mockEnemyEntry);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('already used their action');
    });
    
    it('should validate specified weapon attacks', () => {
      // Valid weapon
      const result = validator.validateAttack(mockPlayerEntry, mockEnemyEntry, 'Longsword');
      expect(result.isValid).toBe(true);
      
      // Invalid weapon
      const invalidWeaponResult = validator.validateAttack(mockPlayerEntry, mockEnemyEntry, 'Greatsword');
      expect(invalidWeaponResult.isValid).toBe(false);
      expect(invalidWeaponResult.errorMessage).toContain('doesn\'t have Greatsword equipped');
    });
    
    it('should validate basic attack without specifying weapon', () => {
      const result = validator.validateAttack(mockPlayerEntry, mockEnemyEntry);
      expect(result.isValid).toBe(true);
    });
  });
  
  describe('validateSpell', () => {
    it('should return invalid if caster cannot cast spells', () => {
      const noActionEntry = { ...mockPlayerEntry, hasAction: false };
      const result = validator.validateSpell(noActionEntry, 'Magic Missile', 1, ['enemy-goblin-1'], mockCombatState);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('already used their action');
    });
    
    it('should validate known spells', () => {
      // Known spell
      const result = validator.validateSpell(mockPlayerEntry, 'Magic Missile', 1, ['enemy-goblin-1'], mockCombatState);
      expect(result.isValid).toBe(true);
      
      // Unknown spell
      const unknownSpellResult = validator.validateSpell(mockPlayerEntry, 'Fireball', 3, ['enemy-goblin-1'], mockCombatState);
      expect(unknownSpellResult.isValid).toBe(false);
      expect(unknownSpellResult.errorMessage).toContain('doesn\'t know the spell Fireball');
    });
    
    it('should validate spell levels', () => {
      // Invalid level (negative)
      const negativeLevelResult = validator.validateSpell(mockPlayerEntry, 'Magic Missile', -1, ['enemy-goblin-1'], mockCombatState);
      expect(negativeLevelResult.isValid).toBe(false);
      expect(negativeLevelResult.errorMessage).toContain('Invalid spell level');
      
      // Invalid level (too high)
      const highLevelResult = validator.validateSpell(mockPlayerEntry, 'Magic Missile', 10, ['enemy-goblin-1'], mockCombatState);
      expect(highLevelResult.isValid).toBe(false);
      expect(highLevelResult.errorMessage).toContain('Invalid spell level');
    });
    
    it('should validate spell targets', () => {
      // Invalid target
      const invalidTargetResult = validator.validateSpell(mockPlayerEntry, 'Magic Missile', 1, ['non-existent'], mockCombatState);
      expect(invalidTargetResult.isValid).toBe(false);
      expect(invalidTargetResult.errorMessage).toContain('not found in combat');
      
      // Defeated target
      const defeatedTargetResult = validator.validateSpell(mockPlayerEntry, 'Magic Missile', 1, ['enemy-goblin-2'], mockCombatState);
      expect(defeatedTargetResult.isValid).toBe(false);
      expect(defeatedTargetResult.errorMessage).toContain('already defeated');
      
      // Valid target
      const validTargetResult = validator.validateSpell(mockPlayerEntry, 'Magic Missile', 1, ['enemy-goblin-1'], mockCombatState);
      expect(validTargetResult.isValid).toBe(true);
    });
  });
  
  describe('validateItem', () => {
    it('should return invalid if user cannot use items', () => {
      const noActionEntry = { ...mockPlayerEntry, hasAction: false };
      const result = validator.validateItem(noActionEntry, 'potion-1', undefined, mockCombatState);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('already used their action');
    });
    
    it('should validate item existence', () => {
      // Existing item
      const result = validator.validateItem(mockPlayerEntry, 'potion-1', undefined, mockCombatState);
      expect(result.isValid).toBe(true);
      
      // Non-existent item
      const nonExistentResult = validator.validateItem(mockPlayerEntry, 'non-existent-item', undefined, mockCombatState);
      expect(nonExistentResult.isValid).toBe(false);
      expect(nonExistentResult.errorMessage).toContain('doesn\'t have that item');
    });
    
    it('should validate item usability', () => {
      // Test with a non-usable item
      const playerWithNonUsableItem = {
        ...mockPlayerEntry,
        participant: {
          ...mockCharacter,
          inventory: {
            gold: 50,
            items: [
              {
                id: 'non-usable-1',
                name: 'Iron Key',
                type: 'key',
                properties: ['key'],
                weight: 0.1
              }
            ]
          }
        } as Character
      };
      
      const nonUsableResult = validator.validateItem(playerWithNonUsableItem, 'non-usable-1', undefined, mockCombatState);
      expect(nonUsableResult.isValid).toBe(false);
      expect(nonUsableResult.errorMessage).toContain('cannot be used in combat');
    });
    
    it('should validate item targets if provided', () => {
      // Invalid target
      const invalidTargetResult = validator.validateItem(mockPlayerEntry, 'potion-1', 'non-existent', mockCombatState);
      expect(invalidTargetResult.isValid).toBe(false);
      expect(invalidTargetResult.errorMessage).toContain('not found in combat');
      
      // Defeated target
      const defeatedTargetResult = validator.validateItem(mockPlayerEntry, 'potion-1', 'enemy-goblin-2', mockCombatState);
      expect(defeatedTargetResult.isValid).toBe(false);
      expect(defeatedTargetResult.errorMessage).toContain('already defeated');
      
      // Valid target
      const validTargetResult = validator.validateItem(mockPlayerEntry, 'potion-1', 'enemy-goblin-1', mockCombatState);
      expect(validTargetResult.isValid).toBe(true);
    });
  });
  
  describe('validateMovement', () => {
    it('should return invalid if participant has already used their movement', () => {
      const noMovementEntry = { ...mockPlayerEntry, hasMovement: false };
      const result = validator.validateMovement(noMovementEntry, 15);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('already used their movement');
    });
    
    it('should validate movement distance', () => {
      // Zero or negative distance
      const negativeDistanceResult = validator.validateMovement(mockPlayerEntry, 0);
      expect(negativeDistanceResult.isValid).toBe(false);
      expect(negativeDistanceResult.errorMessage).toContain('must be positive');
      
      // Exceeding maximum speed
      const excessiveDistanceResult = validator.validateMovement(mockPlayerEntry, 40);
      expect(excessiveDistanceResult.isValid).toBe(false);
      expect(excessiveDistanceResult.errorMessage).toContain('exceeds speed');
      
      // Valid distance
      const validDistanceResult = validator.validateMovement(mockPlayerEntry, 25);
      expect(validDistanceResult.isValid).toBe(true);
    });
  });
}); 