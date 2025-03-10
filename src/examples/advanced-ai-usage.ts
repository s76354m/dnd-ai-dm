/**
 * Advanced AI Usage Example
 * 
 * This file demonstrates how to use the enhanced AI components:
 * - Combat Context Manager
 * - Advanced Prompt Templates
 * - Enhanced Response Validator
 */

import { AIDMEngine } from '../core/engine';
import { enhanceDMEngineWithAdvancedAI, DEFAULT_ADVANCED_OPTIONS } from '../dm/integration/ai-enhancement-integration';
import { GameState } from '../core/interfaces/game';

/**
 * Example: Set up a DM Engine with enhanced AI capabilities
 */
async function setupEnhancedDMEngine(gameState: GameState): Promise<AIDMEngine> {
  // Create a basic DM engine (using your existing implementation)
  const dmEngine = new AIDMEngine(gameState);
  
  // Configure the enhanced AI options
  const enhancementOptions = {
    ...DEFAULT_ADVANCED_OPTIONS,
    // Override defaults as needed
    combatContext: {
      ...DEFAULT_ADVANCED_OPTIONS.combatContext,
      maxRoundsToTrack: 5 // Remember more combat rounds
    },
    promptTemplates: {
      ...DEFAULT_ADVANCED_OPTIONS.promptTemplates,
      defaultStyle: {
        tone: 'dramatic', // More dramatic descriptions
        verbosity: 3,     // More detailed descriptions
        language: 'vivid',
        perspective: 'second-person',
        emphasis: 'action'
      }
    },
    enhancedValidation: {
      ...DEFAULT_ADVANCED_OPTIONS.enhancedValidation,
      minValidationScore: 80 // Higher quality threshold
    },
    debugMode: true // Enable debug logging
  };
  
  // Enhance the DM engine with advanced AI capabilities
  return enhanceDMEngineWithAdvancedAI(dmEngine, enhancementOptions);
}

/**
 * Example: Generate combat narrative with enhanced context
 */
async function generateEnhancedCombatNarrative(dmEngine: AIDMEngine, action: any, result: any): Promise<string> {
  // Get the AI service from the DM engine
  const aiService = (dmEngine as any).aiService;
  
  // The enhanced service is accessible through the adapter
  const enhancedService = aiService.getEnhancedService();
  
  // Generate combat narration with rich context
  return await enhancedService.generateCombatNarration(
    action,
    result,
    dmEngine.getGameState()
  );
}

/**
 * Example: Full combat flow with enhanced narrative
 */
async function runEnhancedCombatExample(gameState: GameState): Promise<void> {
  // Set up the enhanced DM engine
  const dmEngine = await setupEnhancedDMEngine(gameState);
  
  console.log('=== Enhanced Combat Example ===');
  
  // Simulate a combat sequence
  const combatActions = [
    {
      type: 'attack',
      actor: gameState.player,
      targets: [gameState.combatState?.enemies[0]],
      weapon: gameState.player.inventory.equipment.mainHand,
      isAOE: false,
      isCritical: false
    },
    {
      type: 'spell',
      actor: gameState.combatState?.enemies[0],
      targets: [gameState.player],
      spell: { name: 'Fireball', level: 3, damageType: 'fire' },
      isAOE: true,
      isCritical: false
    },
    {
      type: 'attack',
      actor: gameState.player,
      targets: [gameState.combatState?.enemies[0]],
      weapon: gameState.player.inventory.equipment.mainHand,
      isAOE: false,
      isCritical: true // Critical hit!
    }
  ];
  
  const actionResults = [
    { success: true, damage: 8, effects: [] },
    { success: true, damage: 15, effects: ['burning'] },
    { success: true, damage: 22, effects: [] }
  ];
  
  // Process each action and generate narrative
  for (let i = 0; i < combatActions.length; i++) {
    const action = combatActions[i];
    const result = actionResults[i];
    
    // Update the round and turn in the game state
    gameState.combatState!.round = Math.floor(i / 2) + 1;
    gameState.combatState!.turn = (i % 2) + 1;
    
    // Generate enhanced narration
    const narration = await generateEnhancedCombatNarrative(dmEngine, action, result);
    
    console.log(`\nRound ${gameState.combatState!.round}, Turn ${gameState.combatState!.turn}:`);
    console.log(narration);
  }
}

/**
 * Example: Using the enhanced validator
 */
async function validateResponse(dmEngine: AIDMEngine, response: string, component: string): Promise<void> {
  // Get the AI service from the DM engine
  const aiService = (dmEngine as any).aiService;
  
  // Access the enhanced service
  const enhancedService = aiService.getEnhancedService();
  
  // Access the validator (note: this assumes the validator is exposed via the service)
  const validator = enhancedService.enhancedValidator;
  
  // Validate the response
  const result = validator.validate(
    response,
    component,
    'Example context for validation'
  );
  
  console.log('=== Validation Result ===');
  console.log(`Valid: ${result.isValid}`);
  console.log(`Score: ${result.score}/100`);
  
  if (result.issues.length > 0) {
    console.log('\nIssues:');
    result.issues.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.severity}] ${issue.type}: ${issue.description}`);
      if (issue.problematicText) {
        console.log(`   Text: "${issue.problematicText}"`);
      }
      if (issue.suggestedFix) {
        console.log(`   Fix: ${issue.suggestedFix}`);
      }
    });
  }
  
  if (result.suggestedImprovements.length > 0) {
    console.log('\nSuggested Improvements:');
    result.suggestedImprovements.forEach((suggestion, index) => {
      console.log(`${index + 1}. ${suggestion}`);
    });
  }
}

/**
 * Main function to run the examples
 */
export async function runAdvancedAIExamples(gameState: GameState): Promise<void> {
  // Run the combat example
  await runEnhancedCombatExample(gameState);
  
  // Example for validation
  const dmEngine = await setupEnhancedDMEngine(gameState);
  
  const sampleResponse = `
  As you enter the ancient temple, the musty smell of centuries fills your nostrils.
  The walls are adorned with intricate carvings depicting battles between the gods.
  You notice a trap ahead - it looks like a pressure plate that might trigger
  darts from the walls. The wizard could easily cast levitate to avoid it, but
  given his low intelligence score of 35, he might not think of it.
  `;
  
  await validateResponse(dmEngine, sampleResponse, 'narrative');
}

export default {
  setupEnhancedDMEngine,
  generateEnhancedCombatNarrative,
  runEnhancedCombatExample,
  validateResponse,
  runAdvancedAIExamples
}; 