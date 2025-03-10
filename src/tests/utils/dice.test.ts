/**
 * Dice utilities tests
 */
import * as DiceUtils from '../../utils/dice';

describe('Dice Utilities', () => {
  // Store original Math.random
  const originalRandom = Math.random;
  
  // Mock Math.random for predictable results
  beforeEach(() => {
    // Set up a deterministic random function for testing
    let calls = 0;
    Math.random = jest.fn(() => {
      calls++;
      // Return sequence 0.5, 0.1, 0.9, 0.3, 0.7, etc.
      // This will give us dice rolls of:
      // For d20: 11, 3, 19, 7, 15, etc.
      // For d6: 4, 1, 6, 2, 5, etc.
      return [0.5, 0.1, 0.9, 0.3, 0.7][calls % 5];
    });
  });
  
  // Restore original Math.random
  afterEach(() => {
    Math.random = originalRandom;
  });
  
  describe('rollDie', () => {
    it('should roll a single die correctly', () => {
      expect(DiceUtils.rollDie(20)).toBe(11); // 0.5 * 20 + 1 = 11
      expect(DiceUtils.rollDie(6)).toBe(1);   // 0.1 * 6 + 1 = 1.6 => 1
      expect(DiceUtils.rollDie(10)).toBe(10); // 0.9 * 10 + 1 = 10
    });
    
    it('should throw an error for invalid die sizes', () => {
      expect(() => DiceUtils.rollDie(0)).toThrow(DiceUtils.DiceRollError);
      expect(() => DiceUtils.rollDie(-5)).toThrow(DiceUtils.DiceRollError);
      expect(() => DiceUtils.rollDie(3.5)).toThrow(DiceUtils.DiceRollError);
    });
  });
  
  describe('rollMultipleDice', () => {
    it('should roll multiple dice correctly', () => {
      const results = DiceUtils.rollMultipleDice(3, 6);
      expect(results).toHaveLength(3);
      expect(results).toEqual([4, 1, 6]); // Based on our mock random sequence
    });
    
    it('should enforce max dice count', () => {
      expect(() => 
        DiceUtils.rollMultipleDice(1000, 6, { maxDiceCount: 100 })
      ).toThrow(DiceUtils.DiceRollError);
    });
    
    it('should enforce max die size', () => {
      expect(() => 
        DiceUtils.rollMultipleDice(3, 2000, { maxDieSize: 1000 })
      ).toThrow(DiceUtils.DiceRollError);
    });
    
    it('should validate input parameters', () => {
      expect(() => DiceUtils.rollMultipleDice(0, 6)).toThrow(DiceUtils.DiceRollError);
      expect(() => DiceUtils.rollMultipleDice(-2, 6)).toThrow(DiceUtils.DiceRollError);
      expect(() => DiceUtils.rollMultipleDice(2, 0)).toThrow(DiceUtils.DiceRollError);
      expect(() => DiceUtils.rollMultipleDice(2.5, 6)).toThrow(DiceUtils.DiceRollError);
      expect(() => DiceUtils.rollMultipleDice(2, 6.7)).toThrow(DiceUtils.DiceRollError);
    });
  });
  
  describe('rollDice', () => {
    it('should parse and execute standard dice notation', () => {
      const result = DiceUtils.rollDice('2d6+3');
      expect(result.rolls).toEqual([4, 1]);
      expect(result.modifier).toBe(3);
      expect(result.total).toBe(8); // 4 + 1 + 3
      expect(result.meta.notation).toBe('2d6+3');
      expect(result.meta.numDice).toBe(2);
      expect(result.meta.dieSize).toBe(6);
    });
    
    it('should handle notation without a count (assumes 1)', () => {
      const result = DiceUtils.rollDice('d20');
      expect(result.rolls).toEqual([11]);
      expect(result.modifier).toBe(0);
      expect(result.total).toBe(11);
      expect(result.meta.numDice).toBe(1);
      expect(result.meta.dieSize).toBe(20);
    });
    
    it('should handle subtraction in notation', () => {
      const result = DiceUtils.rollDice('3d4-2');
      expect(result.rolls).toHaveLength(3);
      expect(result.modifier).toBe(-2);
      // Expected total depends on the mock random values
      const expectedTotal = result.rolls.reduce((sum, roll) => sum + roll, 0) - 2;
      expect(result.total).toBe(expectedTotal);
    });
    
    it('should provide debug information when requested', () => {
      const result = DiceUtils.rollDice('2d6+3', { debug: true });
      expect(result.meta.debug).toBeDefined();
      expect(result.meta.debug!.length).toBeGreaterThan(0);
      expect(result.meta.debug![0]).toContain('Processing dice notation');
    });
    
    it('should throw an error for invalid notation', () => {
      expect(() => DiceUtils.rollDice('invalid')).toThrow(DiceUtils.DiceRollError);
      expect(() => DiceUtils.rollDice('20')).toThrow(DiceUtils.DiceRollError);
      expect(() => DiceUtils.rollDice('dice')).toThrow(DiceUtils.DiceRollError);
      expect(() => DiceUtils.rollDice('')).toThrow(DiceUtils.DiceRollError);
    });
  });
  
  describe('rollD20Check', () => {
    it('should calculate ability checks correctly', () => {
      const result = DiceUtils.rollD20Check(3, 2);
      expect(result.roll).toBe(11);
      expect(result.modifier).toBe(5); // 3 + 2
      expect(result.total).toBe(16); // 11 + 5
      expect(result.success).toBe(true); // 16 > default DC 10
      expect(result.critical).toBeNull(); // 11 is not critical
    });
    
    it('should handle advantage correctly', () => {
      const result = DiceUtils.rollD20Check(0, 0, { advantage: true });
      expect(result.rolls).toEqual([11, 3]);
      expect(result.roll).toBe(11); // max of 11 and 3
      expect(result.success).toBe(true); // 11 > 10
    });
    
    it('should handle disadvantage correctly', () => {
      const result = DiceUtils.rollD20Check(0, 0, { disadvantage: true });
      expect(result.rolls).toEqual([11, 3]);
      expect(result.roll).toBe(3); // min of 11 and 3
      expect(result.success).toBe(false); // 3 < 10
    });
    
    it('should respect custom DC', () => {
      const result = DiceUtils.rollD20Check(3, 2, { dc: 20 });
      expect(result.total).toBe(16);
      expect(result.success).toBe(false); // 16 < 20
    });
    
    it('should detect critical success', () => {
      // Force a 20 roll
      Math.random = jest.fn(() => 0.95); // 0.95 * 20 + 1 = 20
      
      const result = DiceUtils.rollD20Check(0);
      expect(result.roll).toBe(20);
      expect(result.critical).toBe('success');
    });
    
    it('should detect critical failure', () => {
      // Force a 1 roll
      Math.random = jest.fn(() => 0); // 0 * 20 + 1 = 1
      
      const result = DiceUtils.rollD20Check(0);
      expect(result.roll).toBe(1);
      expect(result.critical).toBe('failure');
    });
    
    it('should respect custom critical thresholds', () => {
      // Use 19-20 as critical success and 1-2 as critical failure
      Math.random = jest.fn(() => 0.9); // 0.9 * 20 + 1 = 19
      
      const result = DiceUtils.rollD20Check(0, 0, {
        critical: { success: 19, failure: 2 }
      });
      expect(result.roll).toBe(19);
      expect(result.critical).toBe('success');
    });
  });
  
  describe('isValidDiceNotation', () => {
    it('should validate dice notation correctly', () => {
      expect(DiceUtils.isValidDiceNotation('2d6')).toBe(true);
      expect(DiceUtils.isValidDiceNotation('d20')).toBe(true);
      expect(DiceUtils.isValidDiceNotation('10d12+5')).toBe(true);
      expect(DiceUtils.isValidDiceNotation('4d8-3')).toBe(true);
      
      expect(DiceUtils.isValidDiceNotation('2d')).toBe(false);
      expect(DiceUtils.isValidDiceNotation('d')).toBe(false);
      expect(DiceUtils.isValidDiceNotation('20')).toBe(false);
      expect(DiceUtils.isValidDiceNotation('dice')).toBe(false);
      expect(DiceUtils.isValidDiceNotation('')).toBe(false);
    });
  });
  
  describe('calculateDiceProbabilities', () => {
    it('should calculate dice probabilities correctly', () => {
      const result = DiceUtils.calculateDiceProbabilities('3d6+2');
      
      expect(result.min).toBe(5); // 3 (minimum roll) + 2 (modifier)
      expect(result.max).toBe(20); // 18 (maximum roll) + 2 (modifier)
      expect(result.mean).toBeCloseTo(12.5); // (3 * 3.5) + 2 = 12.5
      expect(result.median).toBe(12); // Floor of (5 + 20) / 2
    });
    
    it('should handle simple notation', () => {
      const result = DiceUtils.calculateDiceProbabilities('d20');
      
      expect(result.min).toBe(1);
      expect(result.max).toBe(20);
      expect(result.mean).toBeCloseTo(10.5); // (20 + 1) / 2
      expect(result.median).toBe(10);
    });
    
    it('should throw errors for invalid notation', () => {
      expect(() => DiceUtils.calculateDiceProbabilities('invalid')).toThrow(DiceUtils.DiceRollError);
    });
  });
}); 