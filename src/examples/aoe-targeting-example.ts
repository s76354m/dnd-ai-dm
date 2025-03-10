/**
 * Area of Effect Targeting Example
 * 
 * This example demonstrates the area-of-effect targeting mechanics for spells
 * in the D&D AI DM system. It shows how spells with different AoE shapes
 * affect multiple targets in a combat scenario.
 */

import { v4 as uuidv4 } from 'uuid';
import { Position, Targetable, findTargetsInArea, analyzeScene, formatTargetingResult, AoeShape } from '../magic/targeting';
import { AreaOfEffect, SpellRegistry, SavingThrowEffect, AbilityType, DamageType } from '../magic/spell';
import { SaveEffect } from '../magic/saving-throws';

/**
 * Run the area-of-effect targeting example
 */
export async function runAoeTargetingExample(): Promise<void> {
  console.log('🔥 D&D AI DM Area of Effect Targeting Example 🔥');
  console.log('------------------------------------------------\n');
  
  // Create a wizard character for casting spells
  const wizard = createCaster('Wizard', 'Gandalf');
  
  // Create a set of enemies at various positions
  const combatScene = createCombatScene();
  
  // Register AoE spells
  setupAoeSpells();
  
  // Print the initial combat scene
  printCombatScene(combatScene, wizard);
  
  // Example 1: Fireball (20-foot radius sphere)
  console.log('\nExample 1: Fireball (20-foot radius sphere)');
  console.log('------------------------------------------');
  
  // User selects a target point for the fireball
  const fireballTargetPoint: Position = { x: 15, y: 15 };
  console.log(`${wizard.name} aims a Fireball at position (${fireballTargetPoint.x}, ${fireballTargetPoint.y})`);
  
  // Get fireball spell and its area of effect
  const fireball = SpellRegistry.getInstance().getSpellByName('Fireball');
  if (fireball && fireball.areaOfEffect) {
    // Find targets in the fireball's area
    const targetingResult = findTargetsInArea(
      fireballTargetPoint,
      fireball.areaOfEffect,
      combatScene.enemies,
      wizard
    );
    
    // Print the results
    console.log(`\n${formatTargetingResult(targetingResult)}`);
    
    // Apply the spell effect to each valid target
    if (targetingResult.validTargets.length > 0) {
      console.log("\nApplying Fireball effects:");
      
      for (const target of targetingResult.validTargets) {
        for (const effect of fireball.effects) {
          // Apply the spell effect
          const result = effect.apply(target, wizard, 3);
          console.log(`- ${result.message}`);
        }
      }
    }
  } else {
    console.log('Fireball spell or its area of effect not found');
  }
  
  // Example 2: Cone of Cold (60-foot cone)
  console.log('\nExample 2: Cone of Cold (60-foot cone)');
  console.log('-------------------------------------');
  
  // User aims the cone in a specific direction
  const coneOrigin: Position = { x: 0, y: 0 }; // The wizard's position
  console.log(`${wizard.name} aims a Cone of Cold from position (${coneOrigin.x}, ${coneOrigin.y}) facing northeast`);
  
  // Get cone of cold spell
  const coneOfCold = SpellRegistry.getInstance().getSpellByName('Cone of Cold');
  if (coneOfCold && coneOfCold.areaOfEffect) {
    // Find targets in the cone's area
    const targetingResult = findTargetsInArea(
      coneOrigin,
      coneOfCold.areaOfEffect,
      combatScene.enemies,
      wizard
    );
    
    // Print the results
    console.log(`\n${formatTargetingResult(targetingResult)}`);
    
    // Apply the spell effect to each valid target
    if (targetingResult.validTargets.length > 0) {
      console.log("\nApplying Cone of Cold effects:");
      
      for (const target of targetingResult.validTargets) {
        for (const effect of coneOfCold.effects) {
          // Apply the spell effect
          const result = effect.apply(target, wizard, 5);
          console.log(`- ${result.message}`);
        }
      }
    }
  } else {
    console.log('Cone of Cold spell or its area of effect not found');
  }
  
  // Example 3: Lightning Bolt (100-foot line)
  console.log('\nExample 3: Lightning Bolt (100-foot line)');
  console.log('----------------------------------------');
  
  // User aims the lightning bolt in a specific direction
  const lineOrigin: Position = { x: 0, y: 0 }; // The wizard's position
  console.log(`${wizard.name} casts Lightning Bolt from position (${lineOrigin.x}, ${lineOrigin.y}) extending east`);
  
  // Get lightning bolt spell
  const lightningBolt = SpellRegistry.getInstance().getSpellByName('Lightning Bolt');
  if (lightningBolt && lightningBolt.areaOfEffect) {
    console.log(`Lightning Bolt AOE type: ${lightningBolt.areaOfEffect.type}, size: ${lightningBolt.areaOfEffect.size}`);
    
    // Debug information about targets
    console.log("\nTarget positions relative to line:");
    console.log(`Total enemies: ${combatScene.enemies.length}`);
    
    // Manually check each enemy
    const troll = combatScene.enemies.find(e => e.name === 'Troll');
    if (troll && troll.position) {
      console.log(`Troll position: x=${troll.position.x}, y=${troll.position.y}`);
      const inLineDirection = troll.position.x >= lineOrigin.x && troll.position.x <= lineOrigin.x + lightningBolt.areaOfEffect.size;
      const closeToLine = Math.abs(troll.position.y - lineOrigin.y) <= 5;
      console.log(`Troll in line: ${inLineDirection}, close to line: ${closeToLine}, should hit: ${inLineDirection && closeToLine}`);
    }
    
    const bandit = combatScene.enemies.find(e => e.name === 'Bandit');
    if (bandit && bandit.position) {
      console.log(`Bandit position: x=${bandit.position.x}, y=${bandit.position.y}`);
      const inLineDirection = bandit.position.x >= lineOrigin.x && bandit.position.x <= lineOrigin.x + lightningBolt.areaOfEffect.size;
      const closeToLine = Math.abs(bandit.position.y - lineOrigin.y) <= 5;
      console.log(`Bandit in line: ${inLineDirection}, close to line: ${closeToLine}, should hit: ${inLineDirection && closeToLine}`);
    }
    
    // Find targets in the line's area
    const targetingResult = findTargetsInArea(
      lineOrigin,
      lightningBolt.areaOfEffect,
      combatScene.enemies,
      wizard
    );
    
    // Print the results
    console.log(`\n${formatTargetingResult(targetingResult)}`);
    
    // Apply the spell effect to each valid target
    if (targetingResult.validTargets.length > 0) {
      console.log("\nApplying Lightning Bolt effects:");
      
      for (const target of targetingResult.validTargets) {
        for (const effect of lightningBolt.effects) {
          // Apply the spell effect
          const result = effect.apply(target, wizard, 3);
          console.log(`- ${result.message}`);
        }
      }
    } else {
      console.log("No targets were hit by the Lightning Bolt.");
    }
  } else {
    console.log('Lightning Bolt spell or its area of effect not found');
  }
  
  console.log('\nArea of Effect Targeting Example completed!');
  
  // Add a small delay to ensure all output is displayed
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Create a character for casting spells
 */
function createCaster(className: string, name: string): Targetable {
  const caster: Targetable & any = {
    id: uuidv4(),
    name,
    type: 'humanoid',
    class: { name: className },
    position: { x: 0, y: 0 },
    spellSaveDC: 15,
    abilityScores: {
      intelligence: { score: 18, modifier: 4 }
    }
  };
  
  return caster;
}

/**
 * Create a combat scene with enemies positioned in a meaningful way
 */
function createCombatScene(): { enemies: (Targetable & any)[] } {
  // Create enemies with specific positions on a virtual grid
  const enemies: (Targetable & any)[] = [
    createEnemy('Goblin', 'humanoid', { x: 10, y: 10 }),
    createEnemy('Orc', 'humanoid', { x: 15, y: 20 }),
    createEnemy('Troll', 'giant', { x: 30, y: 5 }),
    createEnemy('Hobgoblin', 'humanoid', { x: 20, y: 15 }),
    createEnemy('Skeleton', 'undead', { x: 5, y: 25 }),
    createEnemy('Zombie', 'undead', { x: 25, y: 25 }),
    createEnemy('Dragon Wyrmling', 'dragon', { x: 40, y: 40 }),
    createEnemy('Bandit', 'humanoid', { x: 40, y: 10 })
  ];
  
  return { enemies };
}

/**
 * Create an enemy with the specified position
 */
function createEnemy(name: string, type: string, position: Position): Targetable & any {
  return {
    id: uuidv4(),
    name,
    type,
    position,
    size: 'medium',
    hitPoints: {
      current: 30,
      maximum: 30
    },
    abilityScores: {
      dexterity: { score: 12, modifier: 1 },
      constitution: { score: 12, modifier: 1 }
    }
  };
}

/**
 * Set up example area-of-effect spells
 */
function setupAoeSpells(): void {
  const registry = SpellRegistry.getInstance();
  
  // Register Fireball - 20ft radius sphere
  registry.registerSpell({
    id: uuidv4(),
    name: 'Fireball',
    level: 3,
    school: 'Evocation' as any,
    castingTime: { type: 'action', value: 1 },
    range: { type: 'ranged', distance: 150 },
    components: {
      verbal: true,
      somatic: true,
      material: true,
      materials: 'A tiny ball of bat guano and sulfur'
    },
    duration: { type: 'instantaneous' },
    description: 'A bright streak flashes from your pointing finger to a point you choose ' +
      'within range and then blossoms with a low roar into an explosion of flame.',
    areaOfEffect: { type: AoeShape.Sphere, size: 40 }, // 40 feet diameter = 20 feet radius
    effects: [
      new SavingThrowEffect({
        id: uuidv4(),
        damageType: DamageType.Fire,
        damageAmount: '8d6',
        ability: AbilityType.Dexterity,
        saveEffect: SaveEffect.Half,
        description: 'Each creature in a 20-foot-radius sphere centered on the point must make a Dexterity saving throw. ' +
          'A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.'
      })
    ]
  });
  
  // Register Cone of Cold - 60ft cone
  registry.registerSpell({
    id: uuidv4(),
    name: 'Cone of Cold',
    level: 5,
    school: 'Evocation' as any,
    castingTime: { type: 'action', value: 1 },
    range: { type: 'self' },
    components: {
      verbal: true,
      somatic: true,
      material: true,
      materials: 'A small crystal or glass cone'
    },
    duration: { type: 'instantaneous' },
    description: 'A blast of cold air erupts from your hands in a 60-foot cone.',
    areaOfEffect: { type: AoeShape.Cone, size: 60 },
    effects: [
      new SavingThrowEffect({
        id: uuidv4(),
        damageType: DamageType.Cold,
        damageAmount: '8d8',
        ability: AbilityType.Constitution,
        saveEffect: SaveEffect.Half,
        description: 'Each creature in the area must make a Constitution saving throw. ' +
          'A creature takes 8d8 cold damage on a failed save, or half as much damage on a successful one.'
      })
    ]
  });
  
  // Register Lightning Bolt - 100ft line
  registry.registerSpell({
    id: uuidv4(),
    name: 'Lightning Bolt',
    level: 3,
    school: 'Evocation' as any,
    castingTime: { type: 'action', value: 1 },
    range: { type: 'self' },
    components: {
      verbal: true,
      somatic: true,
      material: true,
      materials: 'A bit of fur and a rod of amber, crystal, or glass'
    },
    duration: { type: 'instantaneous' },
    description: 'A stroke of lightning forming a line 100 feet long and 5 feet wide blasts out from you ' +
      'in a direction you choose.',
    areaOfEffect: { type: AoeShape.Line, size: 100, width: 5 },
    effects: [
      new SavingThrowEffect({
        id: uuidv4(),
        damageType: DamageType.Lightning,
        damageAmount: '8d6',
        ability: AbilityType.Dexterity,
        saveEffect: SaveEffect.Half,
        description: 'Each creature in the line must make a Dexterity saving throw. ' +
          'A creature takes 8d6 lightning damage on a failed save, or half as much damage on a successful one.'
      })
    ]
  });
  
  console.log(`Area-of-Effect Spell Library initialized with 3 spells.`);
}

/**
 * Print the positions of all creatures in the combat scene
 */
function printCombatScene(scene: { enemies: Targetable[] }, caster: Targetable): void {
  console.log('Combat Scene Overview:');
  if (caster.position) {
    console.log(`- Caster: ${caster.name} at position (${caster.position.x}, ${caster.position.y})`);
  } else {
    console.log(`- Caster: ${caster.name} at unknown position`);
  }
  console.log('- Enemies:');
  
  for (const enemy of scene.enemies) {
    if (enemy.position) {
      console.log(`  * ${enemy.name} (${enemy.type || 'unknown type'}) at position (${enemy.position.x}, ${enemy.position.y})`);
    } else {
      console.log(`  * ${enemy.name} (${enemy.type || 'unknown type'}) at unknown position`);
    }
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runAoeTargetingExample();
} 