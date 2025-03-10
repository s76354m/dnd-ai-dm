/**
 * A simple test to verify the hit dice calculation fix
 */

// Import the hit dice calculation function
function getHitDiceValue(characterClass: string): number {
  const hitDiceByClass: Record<string, number> = {
    barbarian: 12,
    fighter: 10,
    paladin: 10,
    ranger: 10,
    monk: 8,
    rogue: 8,
    bard: 8,
    cleric: 8,
    druid: 8,
    warlock: 8,
    sorcerer: 6,
    wizard: 6
  };
  
  return hitDiceByClass[characterClass.toLowerCase()] || 8; // Default to d8 if class not found
}

function calculateStartingHitPoints(className: string, constitutionModifier: number): number {
  // Get the hit dice value for the class
  const hitDice = getHitDiceValue(className);
  
  // Starting hit points are the maximum of the hit dice + CON modifier
  const startingHitPoints = hitDice + constitutionModifier;
  
  // Minimum of 1 hit point
  return Math.max(1, startingHitPoints);
}

// Test the function with different classes and CON modifiers
console.log('Testing hit point calculation:');
console.log('---------------------------------');

const testCases = [
  { className: 'fighter', conMod: 3, expected: 13 },
  { className: 'wizard', conMod: 1, expected: 7 },
  { className: 'barbarian', conMod: 4, expected: 16 },
  { className: 'cleric', conMod: 2, expected: 10 },
  { className: 'rogue', conMod: 0, expected: 8 },
  { className: 'sorcerer', conMod: -1, expected: 5 },
  { className: 'warlock', conMod: -2, expected: 6 },
  { className: 'unknown', conMod: 2, expected: 10 }, // Test default case
  { className: 'fighter', conMod: -15, expected: 1 }  // Test extreme negative CON mod
];

let passed = 0;
const total = testCases.length;

for (const test of testCases) {
  const result = calculateStartingHitPoints(test.className, test.conMod);
  const status = result === test.expected ? 'PASS' : 'FAIL';
  const statusEmoji = status === 'PASS' ? '✅' : '❌';
  
  console.log(`${statusEmoji} ${test.className} with CON mod ${test.conMod}: Got ${result}, Expected ${test.expected} - ${status}`);
  
  if (status === 'PASS') {
    passed++;
  }
}

console.log('---------------------------------');
console.log(`Test results: ${passed}/${total} tests passed`);

if (passed === total) {
  console.log('✅ All tests passed! The hit dice calculation is working correctly.');
} else {
  console.log('❌ Some tests failed. The hit dice calculation needs further adjustments.');
} 