/**
 * Simple Area of Effect Targeting Example
 * 
 * This example demonstrates the area-of-effect targeting mechanics
 * without relying on the full spell system implementation.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Position, 
  Targetable, 
  findTargetsInArea, 
  formatTargetingResult, 
  AoeShape, 
  AreaOfEffect 
} from '../magic/targeting';

/**
 * Run the simple AoE targeting example
 */
export async function run(): Promise<void> {
  console.log('🔥 D&D AI DM Simple Area of Effect Targeting Example 🔥');
  console.log('----------------------------------------------------\n');
  
  // Create a wizard character for casting spells
  const wizard = createCaster('Wizard', 'Gandalf');
  
  // Create a set of enemies at various positions
  const enemies = createEnemies();
  
  // Print the initial combat scene
  printCombatScene(enemies, wizard);
  
  // Example 1: Fireball (20-foot radius sphere)
  console.log('\nExample 1: Fireball (20-foot radius sphere)');
  console.log('------------------------------------------');
  
  // User selects a target point for the fireball
  const fireballTargetPoint: Position = { x: 15, y: 15 };
  console.log(`${wizard.name} aims a Fireball at position (${fireballTargetPoint.x}, ${fireballTargetPoint.y})`);
  
  // Define fireball area of effect
  const fireballAoe: AreaOfEffect = {
    type: AoeShape.Sphere,
    size: 40 // 40 feet diameter = 20 feet radius
  };
  
  // Find targets in the fireball's area
  const fireballResult = findTargetsInArea(
    fireballTargetPoint,
    fireballAoe,
    enemies,
    wizard
  );
  
  // Print the results
  console.log(`\n${formatTargetingResult(fireballResult)}`);
  
  // Example 2: Cone of Cold (60-foot cone)
  console.log('\nExample 2: Cone of Cold (60-foot cone)');
  console.log('-------------------------------------');
  
  // User aims the cone in a specific direction
  const coneOrigin: Position = { x: 0, y: 0 }; // The wizard's position
  console.log(`${wizard.name} aims a Cone of Cold from position (${coneOrigin.x}, ${coneOrigin.y}) facing northeast`);
  
  // Define cone of cold area of effect
  const coneAoe: AreaOfEffect = {
    type: AoeShape.Cone,
    size: 60
  };
  
  // Find targets in the cone's area
  const coneResult = findTargetsInArea(
    coneOrigin,
    coneAoe,
    enemies,
    wizard
  );
  
  // Print the results
  console.log(`\n${formatTargetingResult(coneResult)}`);
  
  // Example 3: Lightning Bolt (100-foot line)
  console.log('\nExample 3: Lightning Bolt (100-foot line)');
  console.log('----------------------------------------');
  
  // User aims the lightning bolt in a specific direction
  const lineOrigin: Position = { x: 0, y: 0 }; // The wizard's position
  console.log(`${wizard.name} casts Lightning Bolt from position (${lineOrigin.x}, ${lineOrigin.y}) extending east`);
  
  // Define lightning bolt area of effect
  const lineAoe: AreaOfEffect = {
    type: AoeShape.Line,
    size: 100,
    width: 5
  };
  
  // Debug information about targets
  console.log("\nTarget positions relative to line:");
  
  // Manually check each enemy
  const troll = enemies.find(e => e.name === 'Troll');
  if (troll) {
    console.log(`Troll position: x=${troll.position.x}, y=${troll.position.y}`);
    const inLineDirection = troll.position.x >= lineOrigin.x && troll.position.x <= lineOrigin.x + lineAoe.size;
    const closeToLine = Math.abs(troll.position.y - lineOrigin.y) <= (lineAoe.width || 5) / 2;
    console.log(`Troll in line: ${inLineDirection}, close to line: ${closeToLine}, should hit: ${inLineDirection && closeToLine}`);
  }
  
  const bandit = enemies.find(e => e.name === 'Bandit');
  if (bandit) {
    console.log(`Bandit position: x=${bandit.position.x}, y=${bandit.position.y}`);
    const inLineDirection = bandit.position.x >= lineOrigin.x && bandit.position.x <= lineOrigin.x + lineAoe.size;
    const closeToLine = Math.abs(bandit.position.y - lineOrigin.y) <= (lineAoe.width || 5) / 2;
    const shouldHit = inLineDirection && closeToLine;
    console.log(`Bandit line calculation: 
    - inLineDirection: ${bandit.position.x} >= ${lineOrigin.x} && ${bandit.position.x} <= ${lineOrigin.x + lineAoe.size} = ${inLineDirection}
    - closeToLine: Math.abs(${bandit.position.y} - ${lineOrigin.y}) <= ${(lineAoe.width || 5) / 2} = ${closeToLine}
    - shouldHit: ${shouldHit}`);
    console.log(`Bandit in line: ${inLineDirection}, close to line: ${closeToLine}, should hit: ${shouldHit}`);
  }
  
  // Find targets in the line's area
  const lineResult = findTargetsInArea(
    lineOrigin,
    lineAoe,
    enemies,
    wizard
  );
  
  // Manual debug output for lineResult
  console.log("\nManual debug of lineResult:");
  console.log(`validTargets count: ${lineResult.validTargets.length}`);
  if (lineResult.validTargets.length > 0) {
    console.log("Valid targets:");
    lineResult.validTargets.forEach(t => console.log(`- ${t.name} at (${t.position.x}, ${t.position.y})`));
  }
  console.log(`invalidTargets count: ${lineResult.invalidTargets.length}`);
  if (lineResult.invalidTargets.length > 0) {
    console.log("Invalid targets:");
    lineResult.invalidTargets.forEach(t => console.log(`- ${t.name} at (${t.position.x}, ${t.position.y})`));
  }
  
  // Print the results
  console.log(`\n${formatTargetingResult(lineResult)}`);
  
  console.log('\nArea of Effect Targeting Example completed!');
  
  // Add a small delay to ensure all output is displayed
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Create a character for casting spells
 */
function createCaster(className: string, name: string): Targetable {
  return {
    id: uuidv4(),
    name,
    position: { x: 0, y: 0 },
    type: 'humanoid'
  };
}

/**
 * Create a set of enemies at various positions
 */
function createEnemies(): Targetable[] {
  return [
    createEnemy('Goblin', 'humanoid', { x: 10, y: 10 }),
    createEnemy('Orc', 'humanoid', { x: 15, y: 20 }),
    createEnemy('Troll', 'giant', { x: 30, y: 5 }),
    createEnemy('Hobgoblin', 'humanoid', { x: 20, y: 15 }),
    createEnemy('Skeleton', 'undead', { x: 5, y: 25 }),
    createEnemy('Zombie', 'undead', { x: 25, y: 25 }),
    createEnemy('Dragon Wyrmling', 'dragon', { x: 40, y: 40 }),
    createEnemy('Bandit', 'humanoid', { x: 40, y: 10 }),
    createEnemy('Kobold', 'humanoid', { x: 50, y: 2 }) // This enemy is close enough to the line to be hit
  ];
}

/**
 * Create an enemy with the specified position
 */
function createEnemy(name: string, type: string, position: Position): Targetable {
  return {
    id: uuidv4(),
    name,
    position,
    type
  };
}

/**
 * Print the combat scene
 */
function printCombatScene(enemies: Targetable[], caster: Targetable): void {
  console.log('Combat Scene:');
  console.log(`- ${caster.name} (${caster.type}) at position (${caster.position.x}, ${caster.position.y})`);
  
  console.log('\nEnemies:');
  enemies.forEach(enemy => {
    console.log(`- ${enemy.name} (${enemy.type}) at position (${enemy.position.x}, ${enemy.position.y})`);
  });
}

// If this file is run directly, execute the example
if (require.main === module) {
  run().catch(console.error);
} 