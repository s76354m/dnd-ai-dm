/**
 * Character Creation Example
 * 
 * This file demonstrates how to implement the character creation flow
 * with proper event handlers for the CharacterCreator events.
 */

import { characterCreator } from '../character';
import { Character } from '../core/interfaces';
import { Race } from '../core/types';

// Example input function - in a real application, this would use a proper UI framework
async function promptInput(message: string): Promise<string> {
  // This is a mock function. In a real application, this would prompt the user for input.
  console.log(message);
  return new Promise((resolve) => {
    // In a real application, this would wait for user input.
    // For this example, we're just returning a placeholder value.
    setTimeout(() => resolve("Example Input"), 500);
  });
}

// Example selection function - in a real application, this would use a proper UI framework
async function promptSelection<T>(message: string, options: T[]): Promise<T> {
  // This is a mock function. In a real application, this would display options and get a selection.
  console.log(message);
  console.log('Options:', options);
  return new Promise((resolve) => {
    // In a real application, this would wait for user selection.
    // For this example, we're just returning the first option.
    setTimeout(() => resolve(options[0]), 500);
  });
}

// Initialize the character creation process
async function startCharacterCreation(): Promise<Character> {
  return new Promise((resolve) => {
    // Event handlers for each step of the character creation process

    // Handle name prompt
    characterCreator.on('namePrompt', async (options) => {
      console.log('Starting name step...');
      const name = await promptInput(options.placeholder || 'Enter your character name:');
      characterCreator.updateCharacterName(name);
    });

    // Handle race prompt
    characterCreator.on('racePrompt', async (options) => {
      console.log('Starting race step...');
      const races = characterCreator.getAvailableRaces();
      
      // Display race options and descriptions
      console.log('Available races:');
      for (const race of races) {
        console.log(`- ${race}: ${options.descriptions[race]}`);
      }
      
      const raceSelection = await promptSelection('Choose your race:', races);
      characterCreator.updateCharacterRace(raceSelection);
    });

    // Handle class prompt
    characterCreator.on('classPrompt', async (options) => {
      console.log('Starting class step...');
      const classes = characterCreator.getAvailableClasses();
      
      // Display class options and descriptions
      console.log('Available classes:');
      for (const className of classes) {
        console.log(`- ${className}: ${options.descriptions[className]}`);
      }
      
      const classSelection = await promptSelection('Choose your class:', classes);
      characterCreator.updateCharacterClass(classSelection);
    });

    // Handle abilities prompt
    characterCreator.on('abilitiesPrompt', async (options) => {
      console.log('Starting abilities step...');
      
      // In a real application, this would display a UI for assigning ability scores
      console.log('Point Buy System:');
      console.log(`- Total Points: ${options.totalPoints}`);
      console.log(`- Racial Bonuses: ${JSON.stringify(options.racialBonuses)}`);
      console.log(`- Recommended for your class: ${options.classRecommendations.join(', ')}`);
      
      // For this example, we'll just use default values
      const abilityScores = {
        // Full form properties
        strength: { score: 10, modifier: 0 },
        dexterity: { score: 14, modifier: 2 },
        constitution: { score: 12, modifier: 1 },
        intelligence: { score: 10, modifier: 0 },
        wisdom: { score: 12, modifier: 1 },
        charisma: { score: 8, modifier: -1 },
        
        // Short form properties for compatibility
        str: 10,
        dex: 14,
        con: 12,
        int: 10,
        wis: 12,
        cha: 8
      };
      
      characterCreator.updateAbilityScores(abilityScores);
    });

    // Handle background prompt
    characterCreator.on('backgroundPrompt', async (options) => {
      console.log('Starting background step...');
      const backgrounds = characterCreator.getAvailableBackgrounds();
      
      // Display background options and descriptions
      console.log('Available backgrounds:');
      for (const background of backgrounds) {
        console.log(`- ${background}: ${options.descriptions[background]}`);
      }
      
      const backgroundSelection = await promptSelection('Choose your background:', backgrounds);
      characterCreator.updateCharacterBackground(backgroundSelection);
    });

    // Handle equipment prompt
    characterCreator.on('equipmentPrompt', async (options) => {
      console.log('Starting equipment step...');
      
      // In a real application, this would display a UI for selecting equipment
      console.log('Class Equipment Options:');
      console.log(`- Default Equipment: ${JSON.stringify(options.classEquipment)}`);
      console.log(`- Choices: ${JSON.stringify(options.equipmentChoices)}`);
      
      // For this example, we'll just use the default equipment
      characterCreator.updateCharacterEquipment(options.classEquipment || []);
    });

    // Handle spells prompt
    characterCreator.on('spellsPrompt', async (options) => {
      console.log('Starting spells step...');
      
      // Only relevant for spellcasting classes
      if (options) {
        console.log(`Spells Known: ${options.spellsKnown}`);
        console.log(`Cantrips Known: ${options.cantripsKnown}`);
        
        // In a real application, this would display a UI for selecting spells
        const availableSpells = options.availableSpells || [];
        
        // For this example, we'll just select the first few spells
        const selectedSpells = availableSpells.slice(0, options.spellsKnown + options.cantripsKnown);
        characterCreator.updateCharacterSpells(selectedSpells);
      } else {
        console.log('Your class does not have spellcasting abilities.');
      }
    });

    // Handle details prompt
    characterCreator.on('detailsPrompt', async (options) => {
      console.log('Starting details step...');
      
      // In a real application, this would display a UI for entering character details
      console.log('Character Details:');
      if (options.traits) {
        console.log('Suggested Traits:');
        console.log(`- Personality: ${options.traits.personality.join(', ')}`);
        console.log(`- Ideals: ${options.traits.ideals.join(', ')}`);
        console.log(`- Bonds: ${options.traits.bonds.join(', ')}`);
        console.log(`- Flaws: ${options.traits.flaws.join(', ')}`);
      }
      
      // For this example, we'll use placeholders
      const details = {
        personality: "Brave and cautious, always planning ahead.",
        appearance: "Tall with dark hair and a scar across the left cheek.",
        backstory: "Grew up in a small village, trained by a retired adventurer."
      };
      
      characterCreator.updateCharacterDetails(details);
    });

    // Handle review prompt
    characterCreator.on('reviewPrompt', async (options) => {
      console.log('Reviewing character...');
      
      // In a real application, this would display a summary of the character
      console.log('Character Summary:');
      console.log(JSON.stringify(options.character, null, 2));
      
      if (options.validationErrors && options.validationErrors.length > 0) {
        console.log('Validation Errors:');
        for (const error of options.validationErrors) {
          console.log(`- ${error}`);
        }
      } else {
        console.log('Character is valid and ready for adventure!');
        // Move to completion
        characterCreator.nextStep();
      }
    });

    // Handle completion
    characterCreator.on('complete', (character) => {
      console.log('Character creation complete!');
      resolve(character as Character);
    });

    // Handle validation errors
    characterCreator.on('validationError', (errors) => {
      console.error('Validation Errors:');
      for (const error of errors) {
        console.error(`- ${error}`);
      }
    });

    // Start the character creation process
    console.log('Starting character creation...');
    characterCreator.start();
  });
}

// Example usage
async function main() {
  try {
    console.log('Welcome to the D&D Character Creator!');
    const character = await startCharacterCreation();
    console.log('Your new character:');
    console.log(JSON.stringify(character, null, 2));
  } catch (error) {
    console.error('Error creating character:', error);
  }
}

// Uncomment to run the example
// main();

export { startCharacterCreation }; 