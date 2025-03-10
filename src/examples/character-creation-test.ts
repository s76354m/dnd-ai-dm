/**
 * Character Creation Test
 * 
 * This file tests the fixed character creation system to ensure
 * all the type errors are resolved and the workflow functions correctly.
 */

import * as readline from 'readline';
import { CharacterCreator } from '../character/creator';
import { Character, AbilityScores } from '../core/interfaces';
import { Race, Class, Background, Alignment } from '../core/types';

// Create a readline interface for terminal input/output
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline.question
function promptInput(message: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      resolve(answer);
    });
  });
}

// Function to present a menu of options and get user selection
async function promptSelection<T>(message: string, options: T[]): Promise<T> {
  console.log(message);
  
  // Display options with numbers
  options.forEach((option, index) => {
    console.log(`${index + 1}. ${option}`);
  });
  
  // Get user selection
  const selection = await promptInput('Enter selection number: ');
  const selectionIndex = parseInt(selection, 10) - 1;
  
  // Validate selection
  if (isNaN(selectionIndex) || selectionIndex < 0 || selectionIndex >= options.length) {
    console.log('Invalid selection. Please try again.');
    return promptSelection(message, options);
  }
  
  return options[selectionIndex];
}

// Function to display a confirmation prompt
async function promptConfirmation(message: string): Promise<boolean> {
  const response = await promptInput(`${message} (y/n): `);
  return response.toLowerCase() === 'y' || response.toLowerCase() === 'yes';
}

// Main test function
async function testCharacterCreation(): Promise<void> {
  try {
    console.log('=== Character Creation Test ===');
    
    // Create a new CharacterCreator instance
    const creator = new CharacterCreator();
    
    // Set up event handlers
    creator.on('namePrompt', async (options) => {
      console.log('\n=== Name Step ===');
      console.log(options.description);
      
      const name = await promptInput(options.placeholder + ': ');
      creator.updateCharacterName(name);
      creator.nextStep();
    });
    
    creator.on('racePrompt', async (options) => {
      console.log('\n=== Race Step ===');
      
      // Display race descriptions
      console.log('Available races:');
      for (const race of options.options) {
        console.log(`- ${race}: ${options.descriptions[race]}`);
      }
      
      const raceSelection = await promptSelection<Race>('Choose your race:', options.options);
      creator.updateCharacterRace(raceSelection);
      creator.nextStep();
    });
    
    creator.on('classPrompt', async (options) => {
      console.log('\n=== Class Step ===');
      
      // Display class descriptions
      console.log('Available classes:');
      for (const className of options.options) {
        console.log(`- ${className}: ${options.descriptions[className]}`);
      }
      
      const classSelection = await promptSelection<Class>('Choose your class:', options.options);
      creator.updateCharacterClass(classSelection);
      creator.nextStep();
    });
    
    creator.on('abilitiesPrompt', async (options) => {
      console.log('\n=== Abilities Step ===');
      console.log('Recommended abilities for your class:', options.classRecommendations.join(', '));
      console.log('Racial ability bonuses:', JSON.stringify(options.racialBonuses));
      
      // For testing, just use predefined values
      console.log('Setting default ability scores for testing...');
      
      const abilityScores: AbilityScores = {
        strength: { score: 14, modifier: 2 },
        dexterity: { score: 12, modifier: 1 },
        constitution: { score: 13, modifier: 1 },
        intelligence: { score: 10, modifier: 0 },
        wisdom: { score: 11, modifier: 0 },
        charisma: { score: 10, modifier: 0 },
        
        // Short form for compatibility
        str: 14,
        dex: 12,
        con: 13,
        int: 10,
        wis: 11,
        cha: 10
      };
      
      creator.updateAbilityScores(abilityScores);
      creator.nextStep();
    });
    
    creator.on('backgroundPrompt', async (options) => {
      console.log('\n=== Background Step ===');
      
      // Display background descriptions
      console.log('Available backgrounds:');
      for (const background of options.options) {
        console.log(`- ${background}: ${options.descriptions[background]}`);
      }
      
      const backgroundSelection = await promptSelection<Background>('Choose your background:', options.options);
      creator.updateCharacterBackground(backgroundSelection);
      creator.nextStep();
    });
    
    creator.on('equipmentPrompt', async (options) => {
      console.log('\n=== Equipment Step ===');
      console.log('Using default class equipment...');
      
      // Just use the default equipment for testing
      creator.updateCharacterEquipment(options.classEquipment || []);
      creator.nextStep();
    });
    
    creator.on('spellsPrompt', async (options) => {
      console.log('\n=== Spells Step ===');
      
      if (!options) {
        console.log('Your class does not have spellcasting abilities.');
        creator.nextStep();
        return;
      }
      
      console.log(`You can select ${options.cantripsKnown} cantrips and ${options.spellsKnown} spells.`);
      
      // For testing, just continue without selecting spells
      creator.updateCharacterSpells([]);
      creator.nextStep();
    });
    
    creator.on('detailsPrompt', async (options) => {
      console.log('\n=== Character Details Step ===');
      
      const details = {
        personality: 'Cautious but curious, always eager to learn.',
        appearance: 'Average height with a lean build and alert eyes.',
        backstory: 'Grew up in a small village before venturing out to seek knowledge and adventure.',
        alignment: 'Neutral Good' as Alignment
      };
      
      creator.updateCharacterDetails(details);
      creator.setAlignment('Neutral Good' as Alignment);
      creator.nextStep();
    });
    
    creator.on('reviewPrompt', async (options) => {
      console.log('\n=== Character Review ===');
      
      // Display character summary
      const character = options.character;
      console.log(`Name: ${character.name}`);
      console.log(`Race: ${character.race}`);
      console.log(`Class: ${character.class}`);
      console.log(`Background: ${character.background}`);
      console.log(`Alignment: ${character.alignment}`);
      console.log('Ability Scores:');
      console.log(`  Strength: ${character.abilityScores.strength.score} (${character.abilityScores.strength.modifier >= 0 ? '+' : ''}${character.abilityScores.strength.modifier})`);
      console.log(`  Dexterity: ${character.abilityScores.dexterity.score} (${character.abilityScores.dexterity.modifier >= 0 ? '+' : ''}${character.abilityScores.dexterity.modifier})`);
      console.log(`  Constitution: ${character.abilityScores.constitution.score} (${character.abilityScores.constitution.modifier >= 0 ? '+' : ''}${character.abilityScores.constitution.modifier})`);
      console.log(`  Intelligence: ${character.abilityScores.intelligence.score} (${character.abilityScores.intelligence.modifier >= 0 ? '+' : ''}${character.abilityScores.intelligence.modifier})`);
      console.log(`  Wisdom: ${character.abilityScores.wisdom.score} (${character.abilityScores.wisdom.modifier >= 0 ? '+' : ''}${character.abilityScores.wisdom.modifier})`);
      console.log(`  Charisma: ${character.abilityScores.charisma.score} (${character.abilityScores.charisma.modifier >= 0 ? '+' : ''}${character.abilityScores.charisma.modifier})`);
      console.log(`Hit Points: ${character.hitPoints?.maximum || 0}`);
      
      // Check for validation errors
      if (options.validationErrors && options.validationErrors.length > 0) {
        console.log('\nValidation Errors:');
        options.validationErrors.forEach(error => console.log(`- ${error}`));
        
        // Offer to go back and fix errors
        const tryAgain = await promptConfirmation('Do you want to restart character creation?');
        if (tryAgain) {
          creator.startCreation();
          return;
        }
      }
      
      // Complete character creation
      creator.nextStep();
    });
    
    creator.on('complete', (character) => {
      console.log('\n=== Character Creation Complete! ===');
      console.log(`Your character ${character.name} is ready for adventure!`);
      
      // Display final character stats
      console.log(JSON.stringify(character, null, 2));
      
      // Close the readline interface
      rl.close();
    });
    
    creator.on('validationError', (errors) => {
      console.error('\nValidation Errors:');
      errors.forEach(error => console.error(`- ${error}`));
    });
    
    // Start character creation
    console.log('Starting character creation process...');
    creator.startCreation();
  } catch (error) {
    console.error('Error in character creation test:', error);
    rl.close();
  }
}

// Run the test if executed directly
if (require.main === module) {
  testCharacterCreation().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { testCharacterCreation }; 