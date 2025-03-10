/**
 * Spell System Example
 * 
 * This example demonstrates how the D&D spell system works in the AI DM application,
 * including spell casting, spell effects, managing spell slots, and concentration.
 */

import { Character } from '../core/interfaces/character';
import { AbilityScores } from '../core/interfaces/character';
import { Spellbook, SpellcastingManager, createSpellbook, performConcentrationCheck } from '../magic/spellcasting';
import { initializeSpellLibrary } from '../magic/spell-library';
import { SpellRegistry } from '../magic/spell';
import { v4 as uuidv4 } from 'uuid';

// Create a mock character class for demonstration
interface MockClass {
  name: string;
  level?: number;
}

// Create a mock target class
interface MockTarget {
  id: string;
  name: string;
  type: string;
  hitPoints: {
    current: number;
    maximum: number;
  };
  abilityScores?: {
    strength: { value: number, modifier: number },
    dexterity: { value: number, modifier: number },
    constitution: { value: number, modifier: number },
    intelligence: { value: number, modifier: number },
    wisdom: { value: number, modifier: number },
    charisma: { value: number, modifier: number }
  };
  armorClass?: number;
}

/**
 * Run the spell system example
 */
export async function runSpellSystemExample(): Promise<void> {
  console.log('🧙‍♂️ D&D AI DM Spell System Example 🧙‍♂️');
  console.log('----------------------------------------\n');

  // Initialize the spell library
  initializeSpellLibrary();
  console.log('Spell library initialized.\n');

  // Create a wizard character
  const wizard = createWizardCharacter();
  console.log(`Created ${wizard.name}, level ${wizard.level} ${wizard.class.name}`);
  console.log(`Spell save DC: ${wizard.spellSaveDC}, Spell attack bonus: +${wizard.spellAttackBonus}`);
  
  // Create a spellcasting manager for the wizard
  const spellcastingManager = new SpellcastingManager(wizard);
  
  // Display available spell slots
  console.log(`Available spell slots: ${spellcastingManager.getSpellSlotsString()}\n`);
  
  // Create some targets
  const goblin = createTarget('goblin', 'humanoid', 7);
  const skeleton = createTarget('skeleton', 'undead', 13);
  const woodenDoor = createTarget('wooden door', 'object', 15);
  console.log(`Created targets: ${goblin.name}, ${skeleton.name}, and ${woodenDoor.name}\n`);
  
  // Example 1: Cast Fire Bolt at the goblin
  console.log('Example 1: Casting a cantrip (Fire Bolt)');
  console.log('---------------------------------------');
  const fireBoltResult = spellcastingManager.castSpell('Fire Bolt', 0, [goblin]);
  console.log(fireBoltResult.message);
  
  if (fireBoltResult.effectResults && fireBoltResult.effectResults.length > 0) {
    const effect = fireBoltResult.effectResults[0];
    if (effect.success) {
      console.log(`${effect.message}`);
      goblin.hitPoints.current -= effect.damage;
      console.log(`${goblin.name} has ${goblin.hitPoints.current}/${goblin.hitPoints.maximum} HP remaining.\n`);
    } else {
      console.log(`The attack missed!\n`);
    }
  }
  
  // Example 2: Cast Magic Missile at the skeleton
  console.log('Example 2: Casting a leveled spell (Magic Missile)');
  console.log('-----------------------------------------------');
  console.log(`Before casting: ${spellcastingManager.getSpellSlotsString()}`);
  
  const magicMissileResult = spellcastingManager.castSpell('Magic Missile', 1, [skeleton]);
  console.log(magicMissileResult.message);
  
  if (magicMissileResult.effectResults && magicMissileResult.effectResults.length > 0) {
    const effect = magicMissileResult.effectResults[0];
    if (effect.success) {
      console.log(`${effect.message}`);
      skeleton.hitPoints.current -= effect.damage;
      console.log(`${skeleton.name} has ${skeleton.hitPoints.current}/${skeleton.hitPoints.maximum} HP remaining.`);
    }
  }
  
  // Check spell slots after casting
  console.log(`After casting: ${spellcastingManager.getSpellSlotsString()}\n`);
  
  // Example 3: Cast Hold Person on a valid and invalid target
  console.log('Example 3: Spell targeting restrictions (Hold Person)');
  console.log('------------------------------------------------');
  
  const holdPersonGoblinResult = spellcastingManager.castSpell('Hold Person', 2, [goblin]);
  console.log(holdPersonGoblinResult.message);
  
  if (holdPersonGoblinResult.effectResults && holdPersonGoblinResult.effectResults.length > 0) {
    const effect = holdPersonGoblinResult.effectResults[0];
    console.log(`${effect.message}`);
    
    if (effect.success && effect.conditions) {
      console.log(`${goblin.name} is now affected by: ${effect.conditions.join(', ')}`);
    }
  }
  
  console.log('\nNow trying to cast Hold Person on an undead:');
  const holdPersonSkeletonResult = spellcastingManager.castSpell('Hold Person', 2, [skeleton]);
  console.log(holdPersonSkeletonResult.message);
  
  if (holdPersonSkeletonResult.effectResults && holdPersonSkeletonResult.effectResults.length > 0) {
    const effect = holdPersonSkeletonResult.effectResults[0];
    console.log(`${effect.message}\n`);
  }
  
  // Example 4: Concentration spell and concentration checks
  console.log('Example 4: Concentration mechanics');
  console.log('-------------------------------');
  console.log(`${wizard.name} is currently concentrating on: ${wizard.concentratingOn || 'nothing'}`);
  
  // Cast another concentration spell
  console.log('\nCasting another concentration spell (Hold Person) while already concentrating:');
  spellcastingManager.castSpell('Hold Person', 2, [goblin]);
  console.log(`${wizard.name} is now concentrating on: ${wizard.concentratingOn || 'nothing'}`);
  
  // Take damage and make concentration check
  const damageAmount = 12;
  console.log(`\n${wizard.name} takes ${damageAmount} damage! Making concentration check...`);
  const maintainsConcentration = performConcentrationCheck(wizard, damageAmount);
  
  if (maintainsConcentration) {
    console.log(`${wizard.name} maintains concentration on ${wizard.concentratingOn}!`);
  } else {
    console.log(`${wizard.name} loses concentration!`);
    console.log(`${wizard.name} is now concentrating on: ${wizard.concentratingOn || 'nothing'}\n`);
  }
  
  // Example 5: Spell slot usage and recovery
  console.log('Example 5: Spell slot management');
  console.log('-----------------------------');
  
  // Cast Fireball
  console.log('Casting Fireball (level 3 spell):');
  console.log(`Before casting: ${spellcastingManager.getSpellSlotsString()}`);
  
  const fireballResult = spellcastingManager.castSpell('Fireball', 3, [goblin, skeleton]);
  console.log(fireballResult.message);
  
  if (fireballResult.effectResults && fireballResult.effectResults.length > 0) {
    // We'll just look at the first effect result since both targets would get the same damage roll
    const effect = fireballResult.effectResults[0];
    if (effect.success) {
      console.log(`The fireball deals ${effect.damage} ${effect.damageType} damage!`);
    }
  }
  
  console.log(`After casting: ${spellcastingManager.getSpellSlotsString()}`);
  
  // Take a short rest
  console.log('\nTaking a short rest...');
  spellcastingManager.resetSpellSlots(false);
  console.log(`After short rest: ${spellcastingManager.getSpellSlotsString()}`);
  
  // Take a long rest
  console.log('\nTaking a long rest...');
  spellcastingManager.resetSpellSlots(true);
  console.log(`After long rest: ${spellcastingManager.getSpellSlotsString()}\n`);
  
  // Example 6: Upcast a spell
  console.log('Example 6: Upcasting a spell');
  console.log('--------------------------');
  console.log('Casting Magic Missile as a 3rd level spell:');
  
  const upcastMagicMissileResult = spellcastingManager.castSpell('Magic Missile', 3, [skeleton]);
  console.log(upcastMagicMissileResult.message);
  
  if (upcastMagicMissileResult.effectResults && upcastMagicMissileResult.effectResults.length > 0) {
    const effect = upcastMagicMissileResult.effectResults[0];
    if (effect.success) {
      console.log(`${effect.message}\n`);
    }
  }
  
  console.log('Spell System Example completed!');
}

/**
 * Create a sample wizard character
 */
function createWizardCharacter(): any {
  // Create ability scores first
  const abilityScores = {
    strength: { score: 8, modifier: -1 },
    dexterity: { score: 14, modifier: 2 },
    constitution: { score: 12, modifier: 1 },
    intelligence: { score: 16, modifier: 3 },
    wisdom: { score: 10, modifier: 0 },
    charisma: { score: 12, modifier: 1 }
  };

  // Create wizard class
  const wizardClass = {
    name: 'Wizard',
    level: 5
  };
  
  // Temporary character for creating spellbook
  const tempCharacter = {
    class: wizardClass,
    level: 5,
    abilityScores: abilityScores
  };
  
  // Initialize spellbook with appropriate slots for a level 5 wizard
  const spellbook = createSpellbook(tempCharacter, 'intelligence');
  
  // Register and add known spells
  const registry = SpellRegistry.getInstance();
  
  // Add known spells to the spellbook
  spellbook.knownSpells = [
    registry.getSpellByName('Fire Bolt')!,
    registry.getSpellByName('Mage Hand')!,
    registry.getSpellByName('Prestidigitation')!,
    registry.getSpellByName('Magic Missile')!,
    registry.getSpellByName('Shield')!,
    registry.getSpellByName('Mage Armor')!,
    registry.getSpellByName('Hold Person')!,
    registry.getSpellByName('Scorching Ray')!,
    registry.getSpellByName('Fireball')!
  ];
  
  // Now create the character with the properly filled spellbook
  const character = {
    id: uuidv4(),
    name: 'Gandalf the Grey',
    class: wizardClass,
    level: 5,
    abilityScores: abilityScores,
    hitPoints: {
      current: 25,
      maximum: 25
    },
    armorClass: 12,
    proficiencyBonus: 3,
    spellbook: spellbook,
    spellSaveDC: 14,
    spellAttackBonus: 6,
    concentratingOn: null
  };
  
  // Print character info
  console.log(`\nCreated ${character.name}, level ${character.level} ${wizardClass.name}`);
  console.log(`Spell save DC: ${character.spellSaveDC}, Spell attack bonus: ${character.spellAttackBonus}`);
  
  // Create spellcasting manager
  const spellcastingManager = new SpellcastingManager(character);
  
  // Print available spell slots
  console.log(`Available spell slots: ${spellcastingManager.getSpellSlotsString()}`);
  
  return character;
}

/**
 * Create a mock target
 */
function createTarget(name: string, type: string, hp: number): MockTarget {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name: name.charAt(0).toUpperCase() + name.slice(1),
    type: type,
    hitPoints: {
      current: hp,
      maximum: hp
    },
    abilityScores: {
      strength: { value: 10, modifier: 0 },
      dexterity: { value: 12, modifier: 1 },
      constitution: { value: 10, modifier: 0 },
      intelligence: { value: 8, modifier: -1 },
      wisdom: { value: 8, modifier: -1 },
      charisma: { value: 8, modifier: -1 }
    },
    armorClass: 12
  };
}

// Run the example if this file is executed directly
if (require.main === module) {
  runSpellSystemExample().catch(console.error);
} 