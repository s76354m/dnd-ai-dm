/**
 * Targeting System Example
 * 
 * This example demonstrates the line of sight and cover mechanics
 * implemented in the targeting system. It shows how obstacles affect
 * targeting for spells and ranged attacks during combat.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  CombatParticipant, 
  CombatState, 
  SpellAction,
  CombatEffectsManager
} from '../combat/combat-effects';
import {
  TargetingSystem,
  CombatEnvironment,
  ObstacleType,
  CoverType,
  LightLevel,
  TerrainType
} from '../combat/targeting';
import { ConditionType } from '../magic/spell';
import { StatusEffectManager } from '../magic/status-effects';

// Set up the combat participants with positions
const wizard: CombatParticipant = {
  id: uuidv4(),
  name: 'Wizard',
  initiative: 15,
  initiativeModifier: 2,
  isPlayer: true,
  hitPoints: {
    current: 30,
    maximum: 30
  },
  position: {
    x: 0,
    y: 0,
    z: 0
  }
};

const archer: CombatParticipant = {
  id: uuidv4(),
  name: 'Archer',
  initiative: 18,
  initiativeModifier: 3,
  isPlayer: true,
  hitPoints: {
    current: 35,
    maximum: 35
  },
  position: {
    x: 5,
    y: 5,
    z: 0
  }
};

const goblin1: CombatParticipant = {
  id: uuidv4(),
  name: 'Goblin 1',
  initiative: 12,
  initiativeModifier: 2,
  hitPoints: {
    current: 7,
    maximum: 7
  },
  position: {
    x: 20,
    y: 0,
    z: 0
  }
};

const goblin2: CombatParticipant = {
  id: uuidv4(),
  name: 'Goblin 2',
  initiative: 10,
  initiativeModifier: 2,
  hitPoints: {
    current: 7,
    maximum: 7
  },
  position: {
    x: 25,
    y: 10,
    z: 0
  }
};

const goblin3: CombatParticipant = {
  id: uuidv4(),
  name: 'Goblin 3',
  initiative: 8,
  initiativeModifier: 2,
  hitPoints: {
    current: 7,
    maximum: 7
  },
  position: {
    x: 30,
    y: -5,
    z: 0
  }
};

// Initialize combat state
const combatState: CombatState = {
  participants: [wizard, archer, goblin1, goblin2, goblin3],
  round: 1,
  currentParticipantIndex: 0,
  isActive: true
};

// Sort by initiative
combatState.participants.sort((a, b) => b.initiative - a.initiative);

// Initialize the targeting system
const targetingSystem = TargetingSystem.getInstance();

// Create a combat environment
const environment = targetingSystem.createEnvironment(50, 20, 50);

// Add obstacles to the environment
const pillar = targetingSystem.createObstacle(
  'Stone Pillar',
  15, // x
  0,  // y
  0,  // z
  5,  // width
  10, // height
  5,  // depth
  ObstacleType.Pillar,
  CoverType.ThreeQuarters
);

const lowWall = targetingSystem.createObstacle(
  'Low Wall',
  20, // x
  8,  // y
  0,  // z
  10, // width
  3,  // height
  1,  // depth
  ObstacleType.LowWall,
  CoverType.Half
);

const barrels = targetingSystem.createObstacle(
  'Barrels',
  28, // x
  -2, // y
  0,  // z
  3,  // width
  4,  // height
  3,  // depth
  ObstacleType.Furniture,
  CoverType.Half
);

// Add obstacles to environment
environment.obstacles.push(pillar, lowWall, barrels);

// Initialize the combat effects manager
const combatEffectsManager = CombatEffectsManager.getInstance();
combatEffectsManager.setEnvironment(environment);

// Function to display combat status
function displayCombatStatus(): void {
  console.log('\nCombat Status:');
  combatState.participants.forEach(participant => {
    console.log(`${participant.name}: ${participant.hitPoints.current}/${participant.hitPoints.maximum} HP`);
    
    // Display position
    if (participant.position) {
      console.log(`  Position: (${participant.position.x}, ${participant.position.y}, ${participant.position.z})`);
    }
    
    // Display active effects
    const statusEffectManager = StatusEffectManager.getInstance();
    const activeEffects = statusEffectManager.getActiveEffects(participant.id);
    if (activeEffects.length > 0) {
      console.log('  Active effects:');
      activeEffects.forEach(effect => {
        console.log(`    - ${effect.name}: ${effect.description}`);
      });
    }
  });
}

// Display targeting information
function displayTargetingInfo(source: CombatParticipant, target: CombatParticipant, range: number): void {
  console.log(`\nTargeting information from ${source.name} to ${target.name}:`);
  
  const targetingResult = targetingSystem.checkTargeting(source, target, range, environment);
  
  console.log(`  Distance: ${targetingResult.distance} feet`);
  console.log(`  Line of sight: ${targetingResult.lineOfSight ? 'Yes' : 'No'}`);
  console.log(`  Cover: ${targetingResult.coverType}`);
  console.log(`  Is valid target: ${targetingResult.isVisible ? 'Yes' : 'No'}`);
  
  if (targetingResult.coveringObstacles.length > 0) {
    console.log('  Obstacles in the way:');
    targetingResult.coveringObstacles.forEach(obstacle => {
      console.log(`    - ${obstacle.name} (${obstacle.provides} cover)`);
    });
  }
  
  // Calculate attack penalties
  if (targetingResult.coverType !== CoverType.None) {
    const acBonus = targetingSystem.getCoverACBonus(targetingResult.coverType);
    console.log(`  Attack penalty: Target gets +${acBonus} AC from cover`);
  }
}

// Function to calculate valid targets for a spell
function getValidSpellTargets(caster: CombatParticipant, spellRange: number, requiresLineOfSight: boolean): CombatParticipant[] {
  return targetingSystem.getValidTargets(
    caster,
    combatState.participants,
    spellRange,
    requiresLineOfSight,
    environment
  );
}

// ==========================
// Run the example simulation
// ==========================

console.log('=== Targeting System Example ===');
console.log('This example demonstrates line of sight and cover mechanics in combat.\n');

console.log('Environment setup:');
console.log(`- Dimensions: ${environment.dimensions.width}x${environment.dimensions.height}x${environment.dimensions.depth} feet`);
console.log(`- Light level: ${environment.lightLevel}`);
console.log(`- Obstacles: ${environment.obstacles.length}\n`);

// Display initial combat status
displayCombatStatus();

// ==========================
// Scenario 1: Wizard targeting goblins with Fireball (20-foot radius, 150-foot range)
// ==========================
console.log('\n=== Scenario 1: Fireball Targeting ===');
console.log('Wizard prepares to cast Fireball (150-foot range, requires line of sight)\n');

// Check all potential targets
console.log('Checking targeting for each goblin:');
displayTargetingInfo(wizard, goblin1, 150);
displayTargetingInfo(wizard, goblin2, 150);
displayTargetingInfo(wizard, goblin3, 150);

// Get valid targets for Fireball
const fireballTargets = getValidSpellTargets(wizard, 150, true);
console.log('\nValid targets for Fireball:');
fireballTargets.forEach(target => {
  console.log(`- ${target.name}`);
});

// Cast Fireball
if (fireballTargets.length > 0) {
  console.log('\nWizard casts Fireball!');
  
  const fireballSpell: SpellAction = {
    actionType: 'spell',
    name: 'Fireball',
    description: 'A bright streak flashes from your pointing finger to a point you choose and then blossoms with a low roar into an explosion of flame.',
    sourceId: wizard.id,
    targetIds: fireballTargets.map(t => t.id),
    statusEffects: [],
    spellLevel: 3,
    rangeInFeet: 150,
    requiresLineOfSight: true,
    savingThrow: {
      ability: 'dexterity',
      dc: 15
    }
  };
  
  // Process the spell
  combatEffectsManager.applySpellActionEffects(fireballSpell, combatState);
}

// ==========================
// Scenario 2: Archer targeting with ranged attack
// ==========================
console.log('\n=== Scenario 2: Archer\'s Ranged Attack ===');
console.log('Archer prepares to shoot arrows (80-foot range, requires line of sight)\n');

// Check all potential targets
console.log('Checking targeting for each goblin:');
displayTargetingInfo(archer, goblin1, 80);
displayTargetingInfo(archer, goblin2, 80);
displayTargetingInfo(archer, goblin3, 80);

// Get valid targets for bow attack
const bowTargets = getValidSpellTargets(archer, 80, true);
console.log('\nValid targets for bow attack:');
bowTargets.forEach(target => {
  console.log(`- ${target.name}`);
});

// ==========================
// Scenario 3: Move a goblin to demonstrate dynamic targeting
// ==========================
console.log('\n=== Scenario 3: Target Movement ===');
console.log('Goblin 1 moves behind the pillar to take cover\n');

// Move goblin1 behind the pillar
goblin1.position = {
  x: 15,
  y: -3,
  z: 0
};

console.log('Updated position:');
displayTargetingInfo(wizard, goblin1, 150);
displayTargetingInfo(archer, goblin1, 80);

// ==========================
// Scenario 4: Lighting changes
// ==========================
console.log('\n=== Scenario 4: Dim Light Conditions ===');
console.log('The light in the room dims, affecting visibility\n');

// Change light level to dim
environment.lightLevel = LightLevel.Dim;

// Create an invisibility effect
console.log('Goblin 3 casts Invisibility on itself');
goblin3.isInvisible = true;

// Check targeting against invisible goblin
console.log('\nChecking targeting against invisible goblin:');
displayTargetingInfo(wizard, goblin3, 150);

console.log('\nTargeting system example completed successfully.');

// Add a named export for the run function
export function run(): void {
  console.log('Running targeting system example...');
  // The code above is already executed when importing the file
}

// Maintain the default export for backward compatibility
export default {
  run
}; 