/**
 * Enhanced AI Integration Example
 * 
 * This file demonstrates how to integrate the enhanced context management system
 * with the game flow to get improved narrative coherence and NPC interactions.
 */

import { AIService } from '../ai/ai-service-wrapper';
import { EnhancedAIService } from '../ai/enhanced-ai-service';
import { GameState } from '../simple-main';
import { GameScenario } from '../ai/memory/context-optimizer';
import { 
  integrateEnhancedContext, 
  updateContextWithGameState,
  recordNarrativeMemory,
  recordCharacterInteraction,
  applyContextDecay
} from '../ai/integration/context-integration';

/**
 * Example of setting up and using the enhanced AI service
 */
async function enhancedAIExample() {
  console.log('Starting Enhanced AI Example...');
  
  // 1. Create a base AI service (you would use your existing one)
  const baseService = new AIService();
  console.log('Base AI service created');
  
  // 2. Integrate enhanced context management
  const enhancedService = integrateEnhancedContext(baseService, {
    enableEnhancedContext: true,
    contextManagerConfig: {
      maxTotalTokens: 4000,
      enableMemoryPrioritization: true,
      enableRelationshipTracking: true,
      enableContextOptimization: true,
      enablePromptTemplates: true,
      debugMode: true
    },
    debug: true
  });
  console.log('Enhanced AI service created with context management');
  
  // 3. Simulate a game state (you would use your actual game state)
  const mockGameState: Partial<GameState> = {
    player: {
      name: 'Thorin',
      race: 'Dwarf',
      class: [{name: 'Fighter', level: 5}],
      // Other player properties...
    },
    currentLocation: {
      id: 'tavern-1',
      name: 'The Prancing Pony',
      description: 'A cozy tavern with a roaring fire and the smell of ale in the air.'
      // Other location properties...
    },
    npcs: [
      {
        id: 'npc-1',
        name: 'Bartender Barliman',
        locationId: 'tavern-1',
        // Other NPC properties...
      },
      {
        id: 'npc-2',
        name: 'Mysterious Stranger',
        locationId: 'tavern-1',
        // Other NPC properties...
      }
    ],
    quests: [
      {
        id: 'quest-1',
        title: 'The Missing Shipment',
        description: 'Find the missing ale shipment that was ambushed on the east road.',
        giver: 'Bartender Barliman',
        status: 'active'
        // Other quest properties...
      }
    ]
  } as GameState;
  
  // 4. Update the context with the game state
  updateContextWithGameState(enhancedService, mockGameState as GameState);
  console.log('Game state updated in context manager');
  
  // 5. Record some narrative memories
  console.log('Recording narrative memories...');
  
  // Important story event
  recordNarrativeMemory(
    enhancedService, 
    "The player discovered that the ale shipment was stolen by a group of bandits hiding in the nearby caves.",
    8 // High importance
  );
  
  // Less important background detail
  recordNarrativeMemory(
    enhancedService,
    "The tavern was especially crowded tonight with travelers from the south.",
    3 // Lower importance
  );
  
  // 6. Record character interactions
  console.log('Recording character interactions...');
  
  // Positive interaction with the bartender
  recordCharacterInteraction(
    enhancedService,
    "Thorin", // Player name
    "Bartender Barliman", // NPC name
    "HELP", // Interaction type
    "Thorin agreed to help find the missing shipment of ale", 
    6 // Impact (1-10)
  );
  
  // Suspicious interaction with the stranger
  recordCharacterInteraction(
    enhancedService,
    "Thorin",
    "Mysterious Stranger",
    "CONVERSATION",
    "The stranger seemed evasive when asked about the bandits",
    4 // Medium impact
  );
  
  // 7. Generate narrative with enhanced context
  console.log('\nGenerating narrative responses with enhanced context...\n');
  
  // Normal exploration scenario (default)
  const narrativeResponse = await enhancedService.generateNarrative(
    "I want to ask the bartender more about the missing shipment."
  );
  
  console.log('Enhanced Narrative Response (Exploration scenario):');
  console.log('-------------------------------------------------');
  console.log(narrativeResponse);
  console.log('-------------------------------------------------\n');
  
  // Force a specific scenario (combat)
  enhancedService.setScenario(GameScenario.COMBAT);
  
  const combatResponse = await enhancedService.generateNarrative(
    "I draw my sword and prepare to attack the bandits guarding the cave entrance."
  );
  
  console.log('Enhanced Narrative Response (Combat scenario):');
  console.log('-------------------------------------------------');
  console.log(combatResponse);
  console.log('-------------------------------------------------\n');
  
  // 8. Simulate NPC dialogue with relationship awareness
  const dialogueResponse = await enhancedService.generateNPCDialogue(
    mockGameState.npcs![0], // Bartender
    "Do you know anything else about those bandits?",
    []
  );
  
  console.log('Enhanced NPC Dialogue (with relationship awareness):');
  console.log('-------------------------------------------------');
  console.log(`${mockGameState.npcs![0].name}: "${dialogueResponse}"`);
  console.log('-------------------------------------------------\n');
  
  // 9. Demonstrate memory decay (e.g., during a long rest)
  console.log('Applying memory and relationship decay (simulating time passage)...');
  applyContextDecay(enhancedService);
  
  console.log('\nEnhanced AI Example Complete!');
  console.log('In a real game, this enhanced service would be used for all AI interactions,');
  console.log('and the context would be continuously updated as the game progresses.');
}

// Run the example if this file is executed directly
if (require.main === module) {
  enhancedAIExample().catch(error => {
    console.error('Error in enhanced AI example:', error);
  });
}

export { enhancedAIExample }; 