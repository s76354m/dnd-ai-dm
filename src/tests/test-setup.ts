/**
 * Test Setup File
 * 
 * This file runs before all tests and sets up global mocks, helper functions,
 * and other testing utilities.
 */

import { v4 as uuidv4 } from 'uuid';
import * as TestHarness from './test-harness';

// Export all test harness functions for use in tests
export const {
  createTestCharacter,
  createTestItem,
  createTestUsableItem,
  createTestNPC,
  createTestSpell,
  createTestCombatSpell,
  createMockInventoryManager,
  createMockSpellEffectManager,
  createMockEnemyManager,
  createTestCombatEffect,
  setupMockDiceRolls
} = TestHarness;

// Add test harness functions to global object for easy access
global.testHarness = TestHarness;

// Create and add mockInterfaces object for older tests that use this interface
global.mockInterfaces = {
  createMockCharacter: TestHarness.createTestCharacter,
  createMockItem: TestHarness.createTestItem,
  createMockUsableItem: TestHarness.createTestUsableItem,
  createMockNPC: TestHarness.createTestNPC,
  createMockSpell: TestHarness.createTestSpell,
  createMockInventoryManager: TestHarness.createMockInventoryManager,
  createMockSpellEffectManager: TestHarness.createMockSpellEffectManager,
  createMockEnemyManager: TestHarness.createMockEnemyManager
};

// Add global Jest matchers if needed
expect.extend({
  // Custom matcher example
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  // Check if an array contains any elements that match a predicate
  toContainWhere(received, predicate) {
    const pass = Array.isArray(received) && received.some(predicate);
    if (pass) {
      return {
        message: () => `expected array not to contain any elements matching the predicate`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected array to contain at least one element matching the predicate`,
        pass: false,
      };
    }
  }
});

// Set up mock console methods to suppress unwanted logs during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Only display logs if the test is run with --verbose flag
if (!process.env.VERBOSE_TESTS) {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Restore console methods after tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Helper to mock dice rolls - shorthand for test harness function
global.mockDice = (values: number[]) => TestHarness.setupMockDiceRolls(values);

// Type definitions for global objects
declare global {
  // eslint-disable-next-line no-var
  var testHarness: typeof TestHarness;
  var mockDice: (values: number[]) => () => void;
  var mockInterfaces: {
    createMockCharacter: typeof TestHarness.createTestCharacter;
    createMockItem: typeof TestHarness.createTestItem;
    createMockUsableItem: typeof TestHarness.createTestUsableItem;
    createMockNPC: typeof TestHarness.createTestNPC;
    createMockSpell: typeof TestHarness.createTestSpell;
    createMockInventoryManager: typeof TestHarness.createMockInventoryManager;
    createMockSpellEffectManager: typeof TestHarness.createMockSpellEffectManager;
    createMockEnemyManager: typeof TestHarness.createMockEnemyManager;
  };
  
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toContainWhere(predicate: (item: any) => boolean): R;
    }
  }
} 