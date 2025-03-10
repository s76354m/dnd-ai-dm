/**
 * Game Integration Example
 * 
 * This file demonstrates how to integrate the enhanced context management system
 * into a simple game loop for more coherent narrative experiences.
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
 * A simplified version of a game loop using the enhanced context system
 */
async function gameIntegrationExample() {
  console.log('Starting Game Integration Example...');
  
  // ==== INITIALIZATION ====
  
  // Create base AI service
  const baseService = new AIService();
  
  // Create enhanced service with context management
  const enhancedService = integrateEnhancedContext(baseService, {
    enableEnhancedContext: true,
    debug: true
  });
  
  // Initialize game state (in a real game, you might load from save file)
  const gameState: Partial<GameState> = {
    player: {
      name: 'Thorin',
      race: 'Dwarf',
      class: [{name: 'Fighter', level: 5}],
      // Other player properties...
    },
    currentLocation: {
      id: 'town-square',
      name: 'Riversend Town Square',
      description: 'The bustling heart of the small town of Riversend.'
    },
    npcs: [
      {
        id: 'npc-mayor',
        name: 'Mayor Gundren',
        locationId: 'town-square',
      },
      {
        id: 'npc-guard',
        name: 'Guard Captain Harrick',
        locationId: 'town-square',
      }
    ],
    quests: [
      {
        id: 'quest-bandits',
        title: 'Bandit Trouble',
        description: 'Clear out the bandits that have been terrorizing the trade routes.',
        giver: 'Mayor Gundren',
        status: 'active'
      }
    ]
  } as GameState;
  
  // Initialize context with game state
  updateContextWithGameState(enhancedService, gameState as GameState);
  
  // ==== SIMULATED GAME SESSION ====
  
  // Simulate game start - record introductory context
  console.log('\n--- GAME SESSION START ---\n');
  recordNarrativeMemory(
    enhancedService,
    "The player arrived in the small town of Riversend to find it troubled by bandits attacking merchant caravans.",
    7 // Important context
  );
  
  // Generate initial scene description
  const initialDescription = await enhancedService.generateLocationDescription(
    gameState.currentLocation,
    true // First visit
  );
  
  console.log(initialDescription);
  console.log('\n--- Player enters town square ---\n');
  
  // Simulate player-NPC interaction
  console.log('> I approach the mayor and ask about the bandit problem\n');
  
  // Generate NPC dialogue with context awareness
  const mayorDialogue = await enhancedService.generateNPCDialogue(
    gameState.npcs![0], // Mayor
    "I've heard there's a bandit problem. How can I help?",
    []
  );
  
  console.log(`Mayor Gundren: "${mayorDialogue}"\n`);
  
  // Record this interaction in the relationship tracker
  recordCharacterInteraction(
    enhancedService,
    gameState.player!.name,
    "Mayor Gundren",
    "QUEST_ACCEPT",
    "The player agreed to help solve the bandit problem",
    5 // Moderate impact
  );
  
  // Player makes a second interaction to test memory of the first
  console.log('> I ask the mayor where the bandits were last seen\n');
  
  const followUpDialogue = await enhancedService.generateNPCDialogue(
    gameState.npcs![0], // Mayor
    "Where were the bandits last seen?",
    [
      { player: "I've heard there's a bandit problem. How can I help?", npc: mayorDialogue }
    ]
  );
  
  console.log(`Mayor Gundren: "${followUpDialogue}"\n`);
  
  // Simulate a scene change - player leaves town
  console.log('\n--- Player leaves town to hunt bandits ---\n');
  
  // Update game state with new location
  gameState.currentLocation = {
    id: 'forest-road',
    name: 'East Forest Road',
    description: 'A winding dirt road through the dense forest east of Riversend.'
  };
  
  // Update context with new game state
  updateContextWithGameState(enhancedService, gameState as GameState);
  
  // Generate new location description
  const roadDescription = await enhancedService.generateLocationDescription(
    gameState.currentLocation,
    true // First visit
  );
  
  console.log(roadDescription);
  
  // Record new narrative memory
  recordNarrativeMemory(
    enhancedService,
    "The player found signs of a recent bandit attack - broken wagon parts and blood stains on the road.",
    6
  );
  
  // Simulate detecting bandits - switch to combat scenario
  console.log('\n--- Bandits ambush the player ---\n');
  
  // Set the scenario explicitly to combat
  enhancedService.setScenario(GameScenario.COMBAT);
  
  // Generate combat narrative with appropriate tone
  const combatStart = await enhancedService.generateNarrative(
    "I spot movement in the trees as bandits prepare to ambush me."
  );
  
  console.log(combatStart);
  
  // Simulate a combat action
  console.log('\n> I draw my battleaxe and charge at the nearest bandit\n');
  
  const combatAction = {
    actor: gameState.player,
    type: 'attack',
    weapon: 'battleaxe',
    target: { name: 'Bandit Thug', id: 'bandit-1' }
  };
  
  const combatResult = {
    success: true,
    damage: 12,
    critical: false
  };
  
  const combatNarrative = await enhancedService.generateCombatNarrative(
    combatAction,
    combatResult
  );
  
  console.log(combatNarrative);
  
  // Record this significant combat event
  recordNarrativeMemory(
    enhancedService,
    "The player defeated the bandit leader in combat, causing the remaining bandits to flee.",
    8 // Important event
  );
  
  // Simulate combat end - switch back to exploration
  enhancedService.setScenario(GameScenario.EXPLORATION);
  
  console.log('\n--- After the battle ---\n');
  
  // Generate post-combat narrative
  const postCombat = await enhancedService.generateNarrative(
    "I search the bodies of the fallen bandits for clues about their hideout."
  );
  
  console.log(postCombat);
  
  // Simulate a long rest - apply memory decay
  console.log('\n--- Player rests for the night ---\n');
  applyContextDecay(enhancedService);
  
  // Return to town with news
  console.log('\n--- Player returns to town the next day ---\n');
  
  // Update game state
  gameState.currentLocation = {
    id: 'town-square',
    name: 'Riversend Town Square',
    description: 'The bustling heart of the small town of Riversend.'
  };
  
  // Update context with game state
  updateContextWithGameState(enhancedService, gameState as GameState);
  
  // Generate narrative with memory of previous events
  const returnNarrative = await enhancedService.generateNarrative(
    "I return to the town square to report to the mayor about defeating the bandits."
  );
  
  console.log(returnNarrative);
  
  // Final NPC interaction - notice the relationship changes
  console.log('\n> I approach the mayor to report my success\n');
  
  const finalDialogue = await enhancedService.generateNPCDialogue(
    gameState.npcs![0], // Mayor
    "I've dealt with the bandits. Their leader won't be troubling you anymore.",
    []
  );
  
  console.log(`Mayor Gundren: "${finalDialogue}"\n`);
  
  // Record final interaction
  recordCharacterInteraction(
    enhancedService,
    gameState.player!.name,
    "Mayor Gundren",
    "QUEST_COMPLETE",
    "The player successfully eliminated the bandit threat",
    8 // High impact - completed an important task
  );
  
  console.log('\n--- GAME SESSION END ---\n');
  console.log('Game Integration Example Complete!');
}

// Run the example if this file is executed directly
if (require.main === module) {
  gameIntegrationExample().catch(error => {
    console.error('Error in game integration example:', error);
  });
}

export { gameIntegrationExample }; 