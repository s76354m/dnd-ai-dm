/**
 * Game Loop Example
 * 
 * This example demonstrates a complete flow from character creation
 * to game loop with command processing and event handling.
 */

import { characterCreator } from '../character';
import { initializeGame } from '../app';
import { AIDMEngine } from '../core/engine';
import { Character, AbilityScores } from '../core/interfaces';
import { Race, Class, Background } from '../core/types';
import { convertToFullAbilityScores } from '../character/utils/ability-score-utils';
import * as readline from 'readline';

// Import race, class, and background data
import { races } from '../character/data/races';
import { classes } from '../character/data/classes';
import { backgrounds } from '../character/data/backgrounds';

// Create a readline interface for input/output in this example
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for input
function promptInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

// Alias for backward compatibility
const prompt = promptInput;

/**
 * Create a character using the character creator
 */
async function createCharacter(): Promise<Character> {
  console.log("=== Character Creation ===");
  
  // Set up event handlers for character creation
  characterCreator.on('namePrompt', async () => {
    const name = await prompt('Enter your character name: ');
    characterCreator.updateCharacterName(name);
  });
  
  characterCreator.on('racePrompt', async () => {
    // Display race selection
    console.log('\nSelect your character race:');
    const raceOptions = Object.keys(races);
    raceOptions.forEach((race, index) => {
      console.log(`${index + 1}. ${race}`);
    });
    
    const raceChoice = await prompt('Enter race number: ');
    const race = raceOptions[parseInt(raceChoice) - 1];
    
    // No need to extract name from race since it's already a string
    characterCreator.updateCharacterRace(race);
  });
  
  characterCreator.on('classPrompt', async () => {
    // Display class selection
    console.log('\nSelect your character class:');
    const classOptions = Object.keys(classes);
    classOptions.forEach((charClass, index) => {
      console.log(`${index + 1}. ${charClass}`);
    });
    
    const classChoice = await promptInput('Enter class number: ');
    const charClass = classOptions[parseInt(classChoice) - 1];
    
    // No need to extract name from class since it's already a string
    characterCreator.updateCharacterClass(charClass);
  });
  
  characterCreator.on('abilitiesPrompt', async () => {
    console.log('Rolling abilities...');
    
    // Create ability scores using the utility function
    const shortFormScores = {
      str: 15,
      dex: 14,
      con: 13, 
      int: 12,
      wis: 10,
      cha: 8
    };
    
    const abilityScores = convertToFullAbilityScores(shortFormScores);
    
    console.log('Your ability scores:');
    console.log(`Strength: ${abilityScores.strength.score} (${abilityScores.strength.modifier > 0 ? '+' : ''}${abilityScores.strength.modifier})`);
    console.log(`Dexterity: ${abilityScores.dexterity.score} (${abilityScores.dexterity.modifier > 0 ? '+' : ''}${abilityScores.dexterity.modifier})`);
    console.log(`Constitution: ${abilityScores.constitution.score} (${abilityScores.constitution.modifier > 0 ? '+' : ''}${abilityScores.constitution.modifier})`);
    console.log(`Intelligence: ${abilityScores.intelligence.score} (${abilityScores.intelligence.modifier > 0 ? '+' : ''}${abilityScores.intelligence.modifier})`);
    console.log(`Wisdom: ${abilityScores.wisdom.score} (${abilityScores.wisdom.modifier > 0 ? '+' : ''}${abilityScores.wisdom.modifier})`);
    console.log(`Charisma: ${abilityScores.charisma.score} (${abilityScores.charisma.modifier > 0 ? '+' : ''}${abilityScores.charisma.modifier})`);
    
    const accept = await prompt('Accept these scores? (yes/no): ');
    
    if (accept.toLowerCase() === 'yes') {
      characterCreator.updateCharacterAbilities(abilityScores);
    } else {
      // In a real implementation, we'd roll new scores
      console.log('Please roll again.');
      characterCreator.emit('abilitiesPrompt');
    }
  });
  
  characterCreator.on('backgroundPrompt', async () => {
    // Display background selection
    console.log('\nSelect your character background:');
    const backgroundOptions = Object.keys(backgrounds);
    backgroundOptions.forEach((background, index) => {
      console.log(`${index + 1}. ${background}`);
    });
    
    const backgroundChoice = await promptInput('Enter background number: ');
    const background = backgroundOptions[parseInt(backgroundChoice) - 1];
    
    // No need to extract name from background since it's already a string
    characterCreator.updateCharacterBackground(background);
  });
  
  characterCreator.on('equipmentPrompt', async () => {
    // For this example, we'll use default equipment
    console.log('Using default equipment based on class and background.');
    // Pass an empty array to use default equipment
    characterCreator.updateCharacterEquipment([]);
  });
  
  characterCreator.on('spellsPrompt', async () => {
    // For this example, we'll use default spells if the class has spellcasting
    console.log('Selecting default spells based on class.');
    // Pass an empty array to use default spells
    characterCreator.updateCharacterSpells([]);
  });
  
  characterCreator.on('detailsPrompt', async () => {
    // Prompt for personality traits
    console.log('\nDescribe your character:');
    const appearance = await promptInput('Appearance: ');
    const backstory = await promptInput('Backstory: ');
    const personalityTraits = await promptInput('Personality traits: ');
    const alignmentValue = await promptInput('Alignment (e.g., Lawful Good): ');
    
    // Update character details
    characterCreator.updateCharacterDetails({
      appearance,
      backstory,
      personality: personalityTraits
    });
    
    // Set alignment separately
    characterCreator.updateCharacterAlignment(alignmentValue);
  });
  
  characterCreator.on('finalizePrompt', async () => {
    // Display character summary
    const character = characterCreator.getCurrentCharacter();
    
    console.log('\nCharacter Summary:');
    console.log(`Name: ${character.name}`);
    console.log(`Race: ${character.race || 'Not selected'}`);
    console.log(`Class: ${character.class || 'Not selected'}`);
    console.log(`Background: ${character.background || 'Not selected'}`);
    console.log(`Alignment: ${character.alignment || 'Not specified'}`);
    
    const confirm = await promptInput('\nConfirm character? (yes/no): ');
    
    if (confirm.toLowerCase() === 'yes') {
      characterCreator.completeCharacter();
    } else {
      // In a real implementation, we'd allow editing specific parts
      console.log('Starting over...');
      characterCreator.reset();
      characterCreator.startCreation();
    }
  });
  
  // Create a promise that resolves when the character is complete
  return new Promise<Character>((resolve) => {
    characterCreator.on('complete', (character: Character) => {
      resolve(character);
    });
    
    // Start character creation
    characterCreator.startCreation();
  });
}

/**
 * Demonstrate the game loop with the created character
 */
async function demonstrateGameLoop(): Promise<void> {
  console.log('Starting game loop demonstration...');
  
  // Create a simple character for demonstration
  const character = await createCharacter();
  
  if (!character) {
    console.log('Character creation was cancelled.');
    return;
  }
  
  // Display the character
  displayCharacter(character);
  
  // Simple game loop
  let running = true;
  
  while (running) {
    console.log('\nWhat would you like to do?');
    console.log('1. View character');
    console.log('2. Explore');
    console.log('3. Talk to NPC');
    console.log('4. Exit');
    
    const choice = await promptInput('Enter your choice: ');
    
    switch (choice) {
      case '1':
        displayCharacter(character);
        break;
      case '2':
        console.log('You explore the area and find nothing of interest.');
        break;
      case '3':
        console.log('There are no NPCs nearby to talk to.');
        break;
      case '4':
        console.log('Exiting game loop...');
        running = false;
        break;
      default:
        console.log('Invalid choice. Please try again.');
    }
  }
  
  // Close readline interface
  rl.close();
}

/**
 * Main function to run the example
 */
async function main(): Promise<void> {
  console.log('=== D&D Character Creation and Game Loop Example ===');
  
  const choice = await promptInput('Choose an option:\n1. Create a character\n2. Demonstrate game loop\n> ');
  
  if (choice === '1') {
    const character = await createCharacter();
    if (character) {
      console.log('\nCharacter created successfully!');
      displayCharacter(character);
    }
  } else if (choice === '2') {
    await demonstrateGameLoop();
  } else {
    console.log('Invalid choice. Exiting...');
  }
  
  rl.close();
}

// Run the example
main();

export { createCharacter, demonstrateGameLoop };

function displayCharacter(character: Partial<Character>): void {
  console.log('\n=== Character Sheet ===');
  console.log(`Name: ${character.name || 'Not specified'}`);
  console.log(`Race: ${character.race || 'Not selected'}`);
  console.log(`Class: ${character.class || 'Not selected'}`);
  console.log(`Background: ${character.background || 'Not selected'}`);
  console.log(`Alignment: ${character.alignment || 'Not specified'}`);
  
  if (character.abilityScores) {
    console.log('\nAbility Scores:');
    console.log(`STR: ${character.abilityScores.strength?.score || character.abilityScores.str || 0}`);
    console.log(`DEX: ${character.abilityScores.dexterity?.score || character.abilityScores.dex || 0}`);
    console.log(`CON: ${character.abilityScores.constitution?.score || character.abilityScores.con || 0}`);
    console.log(`INT: ${character.abilityScores.intelligence?.score || character.abilityScores.int || 0}`);
    console.log(`WIS: ${character.abilityScores.wisdom?.score || character.abilityScores.wis || 0}`);
    console.log(`CHA: ${character.abilityScores.charisma?.score || character.abilityScores.cha || 0}`);
  }
  
  console.log('\nPersonality:');
  if (character.personality) {
    if (typeof character.personality === 'string') {
      console.log(`Traits: ${character.personality}`);
    } else {
      console.log(`Traits: ${character.personality.traits?.join(', ') || 'None'}`);
      console.log(`Ideals: ${character.personality.ideals?.join(', ') || 'None'}`);
      console.log(`Bonds: ${character.personality.bonds?.join(', ') || 'None'}`);
      console.log(`Flaws: ${character.personality.flaws?.join(', ') || 'None'}`);
    }
  } else {
    console.log('No personality details specified.');
  }
} 