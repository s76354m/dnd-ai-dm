/**
 * AI Narrative Example
 * 
 * This example demonstrates the AI service integration with the narrative generation system.
 * It shows how to use the AI service to generate scene descriptions, NPC dialogue, and action responses.
 */

import { AIService } from '../ai/ai-service-wrapper';
import { NarrativeGenerator, SceneContext, DialogueContext, ActionContext } from '../dm/narrative/narrative-generator';
import { MockGameState } from './mocks/mock-game-state';
import { MockCharacter } from './mocks/mock-character';
import { MockNPC } from './mocks/mock-npc';
import { MockLocation } from './mocks/mock-location';

/**
 * Main example function
 */
async function runNarrativeExample() {
  console.log('D&D AI Narrative Generation Example');
  console.log('=================================');
  
  try {
    // Initialize the AI service
    console.log('\nInitializing AI Service...');
    const aiService = await AIService.getInstance({ debug: true });
    
    if (!aiService.isInitialized()) {
      console.error('Failed to initialize AI service. Please check your API keys.');
      console.log('Run the API key setup utility to configure your API keys:');
      console.log('  npm run setup-ai-keys');
      return;
    }
    
    console.log(`Using AI provider: ${aiService.getProviderName()}`);
    
    // Create mock game state and characters
    const gameState = new MockGameState();
    const player = new MockCharacter('Thoren', 'Dwarf', 'Fighter');
    const npc = new MockNPC('Elara', 'Elf', 'Innkeeper', 'slender build and silver-streaked hair');
    const location = new MockLocation(
      'The Silver Tankard',
      'tavern',
      'Northbrook',
      'A cozy tavern with a roaring fireplace and the scent of fresh bread and ale in the air. ' +
      'Wooden tables are scattered throughout, and a polished bar stands along the back wall.'
    );
    
    // Initialize the narrative generator
    const narrativeGen = new NarrativeGenerator(aiService, gameState);
    
    // Example 1: Generate a scene description
    console.log('\n--- Scene Description Example ---');
    
    const sceneContext: SceneContext = {
      location: location,
      timeOfDay: 'evening',
      weather: 'rainy',
      charactersPresent: [player, npc],
      notableObjects: ['a mysterious map on one table', 'a broken sword hanging over the fireplace'],
      recentEvents: ['a loud argument between merchants'],
      mood: 'tense but welcoming'
    };
    
    console.log('Generating scene description...');
    const sceneDescription = await narrativeGen.describeScene(sceneContext, {
      style: 'descriptive',
      includeSensoryDetails: true
    });
    
    console.log('\nScene Description:');
    console.log(sceneDescription);
    
    // Example 2: Generate NPC dialogue
    console.log('\n--- NPC Dialogue Example ---');
    
    const dialogueContext: DialogueContext = {
      speaker: npc,
      listeners: [player],
      topic: 'recent bandit attacks on the road to Eastwatch',
      attitude: 'cautious',
      information: 'The bandits seem to be targeting merchants carrying specific cargo',
      hasHiddenAgenda: true
    };
    
    console.log('Generating NPC dialogue...');
    const dialogue = await narrativeGen.generateDialogue(dialogueContext, {
      tone: 'mysterious'
    });
    
    console.log('\nNPC Dialogue:');
    console.log(dialogue);
    
    // Example 3: Generate response to player action
    console.log('\n--- Action Response Example ---');
    
    const actionContext: ActionContext = {
      character: player,
      action: 'examines the mysterious map carefully, looking for hidden markings',
      location: location,
      target: 'the mysterious map',
      diceResults: [
        { type: 'investigation', value: 18, success: true }
      ]
    };
    
    console.log('Generating action response...');
    const actionResponse = await narrativeGen.respondToAction(actionContext, {
      style: 'dramatic'
    });
    
    console.log('\nAction Response:');
    console.log(actionResponse);
    
    // Example 4: Generate lore
    console.log('\n--- Lore Generation Example ---');
    
    console.log('Generating lore about "The Ancient Fortress of Karak-Dûm"...');
    const lore = await narrativeGen.generateLore('The Ancient Fortress of Karak-Dûm', {
      style: 'descriptive',
      tone: 'mysterious'
    });
    
    console.log('\nLore:');
    console.log(lore);
    
    // Example 5: Generate world reaction
    console.log('\n--- World Reaction Example ---');
    
    console.log('Generating world reaction...');
    const worldReaction = await narrativeGen.generateWorldReaction(
      'Thoren publicly accused the town mayor of corruption',
      'The town of Northbrook has been suffering from mysterious disappearances, and rumors suggest the mayor may be involved.',
      { tone: 'tense' }
    );
    
    console.log('\nWorld Reaction:');
    console.log(worldReaction);
    
    console.log('\nNarrative generation examples completed successfully!');
    
  } catch (error) {
    console.error('Error running narrative examples:', error);
  }
}

/**
 * Mock classes for the example
 */
namespace Mocks {
  export class MockGameState {
    public currentLocation: MockLocation;
    
    constructor() {
      this.currentLocation = new MockLocation(
        'The Silver Tankard',
        'tavern',
        'Northbrook',
        'A cozy tavern with a roaring fireplace.'
      );
    }
  }
  
  export class MockCharacter {
    public name: string;
    public race: string;
    public class: { name: string }[];
    
    constructor(name: string, race: string, className: string) {
      this.name = name;
      this.race = race;
      this.class = [{ name: className }];
    }
  }
  
  export class MockNPC {
    public name: string;
    public race: string;
    public occupation: string;
    public appearance: string;
    public personality: {
      traits: string[];
      currentMood: string;
    };
    public motivation: string;
    
    constructor(name: string, race: string, occupation: string, appearance: string) {
      this.name = name;
      this.race = race;
      this.occupation = occupation;
      this.appearance = appearance;
      this.personality = {
        traits: ['observant', 'cautious', 'kind'],
        currentMood: 'concerned'
      };
      this.motivation = 'To protect her patrons and maintain her tavern as a safe haven';
    }
  }
  
  export class MockLocation {
    public name: string;
    public type: string;
    public region: string;
    public description: string;
    
    constructor(name: string, type: string, region: string, description: string) {
      this.name = name;
      this.type = type;
      this.region = region;
      this.description = description;
    }
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runNarrativeExample().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
} 