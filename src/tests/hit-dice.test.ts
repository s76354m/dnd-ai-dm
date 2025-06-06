/**
 * Tests for hit dice related calculations
 */

export function getHitDiceValue(characterClass: string): number {
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

  return hitDiceByClass[characterClass.toLowerCase()] ?? 8;
}

export function calculateStartingHitPoints(
  className: string,
  constitutionModifier: number
): number {
  const hitDice = getHitDiceValue(className);
  const startingHitPoints = hitDice + constitutionModifier;
  return Math.max(1, startingHitPoints);
}

describe('hit point calculation', () => {
  const cases = [
    { className: 'fighter', conMod: 3, expected: 13 },
    { className: 'wizard', conMod: 1, expected: 7 },
    { className: 'barbarian', conMod: 4, expected: 16 },
    { className: 'cleric', conMod: 2, expected: 10 },
    { className: 'rogue', conMod: 0, expected: 8 },
    { className: 'sorcerer', conMod: -1, expected: 5 },
    { className: 'warlock', conMod: -2, expected: 6 },
    { className: 'unknown', conMod: 2, expected: 10 },
    { className: 'fighter', conMod: -15, expected: 1 }
  ];

  test.each(cases)('$className with CON $conMod => $expected', ({ className, conMod, expected }) => {
    expect(calculateStartingHitPoints(className, conMod)).toBe(expected);
  });
});
