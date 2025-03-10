/**
 * Saving Throw Example
 * 
 * This example demonstrates the saving throw mechanics for spells in the D&D AI DM system.
 * It shows how spells with saving throws are implemented and how they interact with
 * different types of creatures and resistances.
 */

import { v4 as uuidv4 } from 'uuid';
import { SpellRegistry, SavingThrowEffect, AbilityType, DamageType, ConditionType } from '../magic/spell';
import { SpellcastingManager } from '../magic/spellcasting';
import { makeSavingThrow, formatSavingThrowResult, SaveEffect } from '../magic/saving-throws';

/**
 * Run the saving throw example
 */
export async function runSavingThrowExample(): Promise<void> {
  console.log('🧙‍♂️ D&D AI DM Saving Throw Example 🧙‍♂️');
  console.log('----------------------------------------\n');
  
  // Set up our example spells
  setupExampleSpells();
  
  // Create a wizard character for spellcasting
  const wizard = createWizardCharacter();
  
  // Create different targets with various saving throw capabilities
  const goblin = createCreature('Goblin', 'humanoid', 7, {
    strength: { score: 8, modifier: -1 },
    dexterity: { score: 14, modifier: 2 },
    constitution: { score: 10, modifier: 0 },
    intelligence: { score: 10, modifier: 0 },
    wisdom: { score: 8, modifier: -1 },
    charisma: { score: 8, modifier: -1 }
  });

  const fireElemental = createCreature('Fire Elemental', 'elemental', 102, {
    strength: { score: 10, modifier: 0 },
    dexterity: { score: 17, modifier: 3 },
    constitution: { score: 16, modifier: 3 },
    intelligence: { score: 6, modifier: -2 },
    wisdom: { score: 10, modifier: 0 },
    charisma: { score: 7, modifier: -2 }
  }, {
    resistances: [DamageType.Bludgeoning, DamageType.Piercing, DamageType.Slashing],
    immunities: [DamageType.Fire, DamageType.Poison]
  });
  
  const ogre = createCreature('Ogre', 'giant', 59, {
    strength: { score: 19, modifier: 4 },
    dexterity: { score: 8, modifier: -1 },
    constitution: { score: 16, modifier: 3 },
    intelligence: { score: 5, modifier: -3 },
    wisdom: { score: 7, modifier: -2 },
    charisma: { score: 7, modifier: -2 }
  });
  
  const dwarf = createCreature('Dwarf Fighter', 'humanoid', 22, {
    strength: { score: 16, modifier: 3 },
    dexterity: { score: 12, modifier: 1 },
    constitution: { score: 16, modifier: 3 },
    intelligence: { score: 10, modifier: 0 },
    wisdom: { score: 12, modifier: 1 },
    charisma: { score: 9, modifier: -1 }
  }, {
    race: { name: 'Dwarf' },  // Dwarves have advantage on saving throws against poison
    savingThrowProficiencies: ['strength', 'constitution']  // Fighter saving throw proficiencies
  });
  
  // Create a spellcasting manager for our wizard
  const spellcasting = new SpellcastingManager(wizard);
  const registry = SpellRegistry.getInstance();

  // Example 1: Fireball (DEX Save) against multiple targets
  console.log('\nExample 1: Fireball (DEX Save, Half damage on success)');
  console.log('------------------------------------------------------');
  
  // Cast fireball on all creatures
  const targets = [goblin, fireElemental, ogre, dwarf];
  
  console.log(`${wizard.name} casts Fireball targeting multiple creatures!`);
  
  const fireball = registry.getSpellByName('Fireball');
  if (fireball) {
    for (const target of targets) {
      // Reset target HP for demonstration
      target.hitPoints.current = target.hitPoints.maximum;
      
      console.log(`\nTarget: ${target.name} (${target.hitPoints.current}/${target.hitPoints.maximum} HP)`);
      
      for (const effect of fireball.effects) {
        const result = effect.apply(target, wizard, 3);  // Level 3 spell
        console.log(result.message);
      }
    }
  } else {
    console.log('Error: Fireball spell not found');
  }
  
  // Example 2: Poison Spray (CON Save) against targets with different poison resistances
  console.log('\nExample 2: Poison Spray (CON Save, No damage on success)');
  console.log('-------------------------------------------------------');
  
  const poisonSpray = registry.getSpellByName('Poison Spray');
  if (poisonSpray) {
    // Reset HP
    for (const target of targets) {
      target.hitPoints.current = target.hitPoints.maximum;
    }
    
    for (const target of targets) {
      console.log(`\nTarget: ${target.name} (${target.hitPoints.current}/${target.hitPoints.maximum} HP)`);
      
      for (const effect of poisonSpray.effects) {
        const result = effect.apply(target, wizard, 0);  // Cantrip (level 0)
        console.log(result.message);
      }
    }
  } else {
    console.log('Error: Poison Spray spell not found');
  }
  
  // Example 3: Hold Person (WIS Save) for condition application
  console.log('\nExample 3: Hold Person (WIS Save, Paralyzes on fail)');
  console.log('---------------------------------------------------');
  
  const holdPerson = registry.getSpellByName('Hold Person');
  if (holdPerson) {
    // Clear any existing conditions
    for (const target of targets) {
      target.conditions = [];
    }
    
    for (const target of targets) {
      if (target.type !== 'humanoid') {
        console.log(`\nTarget: ${target.name} - Not a humanoid, spell has no effect.`);
        continue;
      }
      
      console.log(`\nTarget: ${target.name}`);
      
      for (const effect of holdPerson.effects) {
        const result = effect.apply(target, wizard, 2);  // Level 2 spell
        console.log(result.message);
      }
    }
  } else {
    console.log('Error: Hold Person spell not found');
  }
  
  // Example 4: Manual saving throw demonstration
  console.log('\nExample 4: Manual Saving Throw Demonstration');
  console.log('-------------------------------------------');
  
  const savingThrowResult = makeSavingThrow({
    target: dwarf,
    abilityType: AbilityType.Constitution,
    dc: 15,
    context: dwarf.name
  });
  
  console.log(formatSavingThrowResult(savingThrowResult));
  
  if (savingThrowResult.success) {
    console.log('The dwarf resists the effect thanks to their Constitution!');
  } else {
    console.log('Despite their hardy nature, the dwarf succumbs to the effect.');
  }
  
  console.log('\nSaving Throw Example completed!');
}

/**
 * Set up example spells in the registry
 */
function setupExampleSpells(): void {
  const registry = SpellRegistry.getInstance();
  
  // Register Fireball - a DEX save spell with half damage on success
  registry.registerSpell({
    id: uuidv4(),
    name: 'Fireball',
    level: 3,
    school: 'Evocation' as any,
    castingTime: { type: 'action', value: 1 },
    range: { type: 'ranged', distance: 150 },
    components: { verbal: true, somatic: true, material: true, materials: 'A tiny ball of bat guano and sulfur' },
    duration: { type: 'instantaneous' },
    description: 'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame.',
    higherLevels: 'When you cast this spell using a spell slot of 4th level or higher, the damage increases by 1d6 for each slot level above 3rd.',
    classes: ['Wizard', 'Sorcerer'],
    tags: ['damage', 'aoe'],
    concentration: false,
    ritual: false,
    areaOfEffect: { type: 'sphere', size: 20 },
    effects: [
      new SavingThrowEffect(
        AbilityType.Dexterity,
        SaveEffect.Half,
        {
          damageType: DamageType.Fire,
          damageFormula: '8d6',
          scaling: {
            higherLevel: 4,
            additionalDamage: '1d6'
          }
        }
      )
    ]
  });
  
  // Register Poison Spray - a CON save or die cantrip
  registry.registerSpell({
    id: uuidv4(),
    name: 'Poison Spray',
    level: 0,
    school: 'Conjuration' as any,
    castingTime: { type: 'action', value: 1 },
    range: { type: 'ranged', distance: 10 },
    components: { verbal: true, somatic: true, material: false },
    duration: { type: 'instantaneous' },
    description: 'You extend your hand toward a creature you can see within range and project a puff of noxious gas.',
    classes: ['Wizard', 'Sorcerer', 'Druid', 'Warlock'],
    tags: ['damage', 'poison'],
    concentration: false,
    ritual: false,
    effects: [
      new SavingThrowEffect(
        AbilityType.Constitution,
        SaveEffect.Negated,
        {
          damageType: DamageType.Poison,
          damageFormula: '1d12'
        }
      )
    ]
  });
  
  // Register Hold Person - a WIS save with condition effect
  registry.registerSpell({
    id: uuidv4(),
    name: 'Hold Person',
    level: 2,
    school: 'Enchantment' as any,
    castingTime: { type: 'action', value: 1 },
    range: { type: 'ranged', distance: 60 },
    components: { verbal: true, somatic: true, material: true, materials: 'A small, straight piece of iron' },
    duration: { type: 'concentration', time: 1, unit: 'minute' },
    description: 'Choose a humanoid that you can see within range. The target must succeed on a Wisdom saving throw or be paralyzed for the duration.',
    higherLevels: 'When you cast this spell using a spell slot of 3rd level or higher, you can target one additional humanoid for each slot level above 2nd.',
    classes: ['Wizard', 'Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock'],
    tags: ['control', 'debuff'],
    concentration: true,
    ritual: false,
    effects: [
      new SavingThrowEffect(
        AbilityType.Wisdom,
        SaveEffect.Negated,
        {
          condition: ConditionType.Paralyzed,
          conditionDuration: 10 // 10 rounds = 1 minute
        }
      )
    ]
  });
  
  console.log(`Spell Library initialized with 3 spells that use saving throws.`);
}

/**
 * Create a wizard character for the example
 */
function createWizardCharacter(): any {
  const abilityScores = {
    strength: { score: 8, modifier: -1 },
    dexterity: { score: 14, modifier: 2 },
    constitution: { score: 12, modifier: 1 },
    intelligence: { score: 18, modifier: 4 },  // Primary spellcasting ability
    wisdom: { score: 10, modifier: 0 },
    charisma: { score: 12, modifier: 1 }
  };
  
  const wizardClass = {
    name: 'Wizard',
    level: 7
  };
  
  const character = {
    id: uuidv4(),
    name: 'Merlin the Wise',
    class: wizardClass,
    level: 7,
    abilityScores: abilityScores,
    hitPoints: {
      current: 38,
      maximum: 38
    },
    armorClass: 12,
    proficiencyBonus: 3,
    spellSaveDC: 15,  // 8 + proficiency bonus (3) + intelligence modifier (4)
    spellAttackBonus: 7, // proficiency bonus (3) + intelligence modifier (4)
    concentratingOn: null
  };
  
  console.log(`Created ${character.name}, level ${character.level} ${wizardClass.name}`);
  console.log(`Spell save DC: ${character.spellSaveDC}, Spell attack bonus: +${character.spellAttackBonus}`);
  
  return character;
}

/**
 * Create a creature with specified attributes
 */
function createCreature(
  name: string, 
  type: string, 
  hp: number, 
  abilityScores: any,
  options?: {
    resistances?: DamageType[],
    immunities?: DamageType[],
    vulnerabilities?: DamageType[],
    conditionImmunities?: string[],
    savingThrowProficiencies?: string[],
    race?: { name: string },
    features?: Array<{ name: string }>
  }
): any {
  const creature = {
    id: uuidv4(),
    name,
    type,
    hitPoints: {
      current: hp,
      maximum: hp
    },
    abilityScores,
    armorClass: 10 + (abilityScores.dexterity?.modifier || 0),
    conditions: [],
    conditionDurations: {},
    resistances: options?.resistances || [],
    immunities: options?.immunities || [],
    vulnerabilities: options?.vulnerabilities || [],
    conditionImmunities: options?.conditionImmunities || [],
    savingThrowProficiencies: options?.savingThrowProficiencies || [],
    race: options?.race,
    features: options?.features || []
  };
  
  return creature;
}

// Run the example if this file is executed directly
if (require.main === module) {
  runSavingThrowExample();
} 