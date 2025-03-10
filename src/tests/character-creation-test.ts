/**
 * Character Creation Test
 * 
 * This script tests the character creation system to ensure it works correctly.
 */

import { CharacterCreator } from '../character/creator';
import { Character, AbilityScores, Item } from '../core/interfaces';
import readline from 'readline';

// Mock console.log to capture output
const originalConsoleLog = console.log;
const logs: string[] = [];

console.log = (message: any, ...optionalParams: any[]) => {
  logs.push(message.toString());
  originalConsoleLog(message, ...optionalParams);
};

// Create a readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for input
async function promptInput(prompt: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      resolve(answer);
    });
  });
}

// Test the character creator
async function testCharacterCreator() {
  console.log("Starting character creation test...");
  
  // Create a new character creator
  const creator = new CharacterCreator();
  
  // Set up event handlers
  creator.on('namePrompt', async () => {
    const name = await promptInput('Enter character name: ');
    creator.updateCharacterName(name);
    creator.nextStep();
  });
  
  creator.on('racePrompt', async (options) => {
    console.log('\nAvailable races:');
    options.options.forEach((race: string, index: number) => {
      console.log(`${index + 1}. ${race}`);
    });
    
    const selection = await promptInput('Choose a race (enter number): ');
    const raceIndex = parseInt(selection) - 1;
    
    if (raceIndex >= 0 && raceIndex < options.options.length) {
      const selectedRace = options.options[raceIndex];
      creator.updateCharacterRace(selectedRace as any);
      creator.nextStep();
    } else {
      console.log('Invalid selection. Please try again.');
    }
  });
  
  creator.on('classPrompt', async (options) => {
    console.log('\nAvailable classes:');
    options.options.forEach((className: string, index: number) => {
      console.log(`${index + 1}. ${className}`);
    });
    
    const selection = await promptInput('Choose a class (enter number): ');
    const classIndex = parseInt(selection) - 1;
    
    if (classIndex >= 0 && classIndex < options.options.length) {
      const selectedClass = options.options[classIndex];
      creator.updateCharacterClass(selectedClass as any);
      
      // Test our fixed hit points calculation
      const character = creator.getState().character;
      const charClass = character.class as any;
      const conModifier = character.abilityScores?.constitution?.modifier || 0;
      
      const hitPoints = creator.calculateStartingHitPoints(charClass, conModifier);
      console.log(`\nCalculated starting hit points: ${hitPoints}`);
      
      creator.updateCharacterHitPoints();
      console.log(`Character hit points: ${character.hitPoints?.current}/${character.hitPoints?.maximum}`);
      
      creator.nextStep();
    } else {
      console.log('Invalid selection. Please try again.');
    }
  });
  
  // Handle ability scores step (simplified for testing)
  creator.on('abilitiesPrompt', async () => {
    console.log('\nSetting default ability scores...');
    
    // Create default ability scores
    const abilityScores = {
      strength: { score: 14, modifier: 2 },
      dexterity: { score: 12, modifier: 1 },
      constitution: { score: 15, modifier: 2 },
      intelligence: { score: 10, modifier: 0 },
      wisdom: { score: 13, modifier: 1 },
      charisma: { score: 8, modifier: -1 }
    };
    
    creator.updateAbilityScores(abilityScores as any);
    creator.nextStep();
  });
  
  // Simplified handlers for remaining steps
  creator.on('backgroundPrompt', async () => {
    console.log('\nSkipping background selection for this test...');
    creator.updateCharacterBackground('acolyte' as any);
    creator.nextStep();
  });
  
  creator.on('equipmentPrompt', async () => {
    console.log('\nSkipping equipment selection for this test...');
    creator.updateCharacterEquipment([]);
    creator.nextStep();
  });
  
  creator.on('spellsPrompt', async () => {
    console.log('\nSkipping spell selection for this test...');
    creator.updateCharacterSpells([]);
    creator.nextStep();
  });
  
  creator.on('detailsPrompt', async () => {
    console.log('\nSkipping character details for this test...');
    creator.updateCharacterDetails({
      personality: 'Brave and bold',
      appearance: 'Tall with dark hair',
      backstory: 'Raised in a small village'
    });
    creator.nextStep();
  });
  
  creator.on('reviewPrompt', async () => {
    console.log('\nCharacter Creation Complete!\n');
    
    // Display the created character
    const character = creator.getState().character;
    console.log(`Name: ${character.name}`);
    console.log(`Race: ${(character.race as any)?.name || character.race}`);
    console.log(`Class: ${(character.class as any)?.name || character.class}`);
    console.log(`Hit Points: ${character.hitPoints?.current}/${character.hitPoints?.maximum}`);
    
    if (character.abilityScores) {
      console.log('\nAbility Scores:');
      console.log(`STR: ${character.abilityScores.strength?.score} (${character.abilityScores.strength?.modifier})`);
      console.log(`DEX: ${character.abilityScores.dexterity?.score} (${character.abilityScores.dexterity?.modifier})`);
      console.log(`CON: ${character.abilityScores.constitution?.score} (${character.abilityScores.constitution?.modifier})`);
      console.log(`INT: ${character.abilityScores.intelligence?.score} (${character.abilityScores.intelligence?.modifier})`);
      console.log(`WIS: ${character.abilityScores.wisdom?.score} (${character.abilityScores.wisdom?.modifier})`);
      console.log(`CHA: ${character.abilityScores.charisma?.score} (${character.abilityScores.charisma?.modifier})`);
    }
    
    creator.nextStep();
    rl.close();
  });
  
  // Start the character creation process
  creator.startCreation();
}

// Run the test
testCharacterCreator().catch(error => {
  console.error('Error in character creation test:', error);
  rl.close();
}); 