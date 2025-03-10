/**
 * AI-Enhanced Combat Example
 * 
 * Demonstrates a complete combat encounter with:
 * - AI-driven tactical decision making for enemies
 * - Enhanced narrative descriptions of combat actions
 * - Integrated combat system with full turn resolution
 */

import { createCombatSystem } from '../combat';
import { AIService } from '../dm/ai-service';
import { Character } from '../core/interfaces/character';
import { Location } from '../core/interfaces/location';
import { NPC } from '../core/interfaces/npc';
import * as readline from 'readline';
import { createApiKeyManager } from '../ai/config/api-key-manager';
import { createAIServiceWrapper } from '../ai/ai-service-wrapper';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Sample player character
const player: Character = {
  id: 'player-1',
  name: 'Tharion',
  level: 3,
  experience: 900,
  race: 'elf',
  class: [{ name: 'fighter', level: 3 }],
  background: 'soldier',
  alignment: 'neutral good',
  personality: {
    traits: ['brave', 'cautious'],
    ideals: ['protect the innocent'],
    bonds: ['sworn to protect my village'],
    flaws: ['overconfident in battle']
  },
  abilityScores: {
    strength: { score: 16, modifier: 3 },
    dexterity: { score: 14, modifier: 2 },
    constitution: { score: 15, modifier: 2 },
    intelligence: { score: 10, modifier: 0 },
    wisdom: { score: 12, modifier: 1 },
    charisma: { score: 8, modifier: -1 }
  },
  hitPoints: {
    current: 28,
    maximum: 28
  },
  armorClass: 16,
  proficiencyBonus: 2,
  speed: 30,
  proficiencies: ['simple weapons', 'martial weapons', 'shields', 'medium armor'],
  equipment: [
    {
      id: 'item-1',
      name: 'Longsword',
      type: 'weapon',
      damage: '1d8',
      properties: ['versatile', 'slashing', 'weapon'],
      weight: 3,
      value: 15,
      isEquipped: true,
      description: 'A well-crafted longsword with the crest of a local guild'
    },
    {
      id: 'item-2',
      name: 'Shield',
      type: 'armor',
      armorClass: 2,
      properties: ['shield'],
      weight: 6,
      value: 10,
      isEquipped: true,
      description: 'A sturdy wooden shield reinforced with iron'
    },
    {
      id: 'item-3',
      name: 'Chain Shirt',
      type: 'armor',
      armorClass: 13,
      properties: ['medium armor'],
      weight: 20,
      value: 50,
      isEquipped: true,
      description: 'A shirt of interlocking metal rings worn under clothing'
    }
  ]
};

// Sample location
const forestClearing: Location = {
  id: 'location-forest-clearing',
  name: 'Forest Clearing',
  description: 'A small clearing in the dense forest, with dappled sunlight filtering through the leaves above.',
  terrain: 'forest',
  lighting: 'dim light',
  specialFeatures: ['fallen log', 'small stream', 'moss-covered rocks'],
  environmentalFactors: ['light breeze', 'bird sounds'],
  connections: []
};

// Function to prompt user
const prompt = (question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
};

// Main function to run the example
async function runAICombatExample() {
  console.log('\n===== AI-ENHANCED COMBAT EXAMPLE =====\n');
  console.log('This example demonstrates the AI-driven tactical decision making and enhanced narration for combat encounters.');
  console.log('You will see how NPCs make intelligent decisions based on their traits and the combat situation.');
  
  // Initialize the AI service
  try {
    // Create API key manager
    const apiKeyManager = createApiKeyManager({ preferEnvVars: true });
    
    // If no API keys set, prompt for them
    if (!apiKeyManager.hasApiKey('openai')) {
      const apiKey = await prompt('Enter your OpenAI API key: ');
      apiKeyManager.setApiKey('openai', apiKey);
    }
    
    // Create AI service wrapper
    const aiServiceWrapper = createAIServiceWrapper({
      defaultProvider: 'openai',
      keyManager: apiKeyManager
    });
    
    // Create the game AI service
    const aiService = new AIService();
    
    // Initialize the combat system
    const combatSystem = createCombatSystem(player, aiService);
    
    // Set up the encounter
    console.log('\nYou find yourself in a forest clearing when suddenly you hear rustling in the bushes...');
    console.log('Three goblins emerge, weapons drawn!');
    
    // Create the enemies
    const enemies = combatSystem.enemyManager.createEnemyGroup('goblin', 3, 1, 'location-forest-clearing');
    
    // Customize the enemies slightly for variety
    enemies[0].name = 'Goblin Scout';
    enemies[0].description = 'A nimble goblin with a short bow and dagger.';
    
    enemies[1].name = 'Goblin Warrior';
    enemies[1].description = 'A muscular goblin brandishing a rusty scimitar.';
    
    enemies[2].name = 'Goblin Shaman';
    enemies[2].description = 'A hunched goblin with crude tribal markings and a gnarled staff.';
    
    // Start the combat
    const combatState = combatSystem.combatManager.startCombat(
      [player],
      enemies,
      forestClearing.name,
      false,
      'medium'
    );
    
    // Get enhanced narration for combat start
    const startNarration = await combatSystem.enhancedNarration.narrateRoundStart({
      combatState,
      location: forestClearing,
      round: 1,
      tension: 'moderate'
    });
    
    console.log('\n' + startNarration + '\n');
    
    // Run through 3 rounds of combat (simplified for the example)
    for (let round = 1; round <= 3; round++) {
      console.log(`\n===== ROUND ${round} =====\n`);
      
      // Process each participant's turn
      for (let i = 0; i < combatState.initiativeOrder.length; i++) {
        const entry = combatState.initiativeOrder[i];
        const participant = entry.participant;
        
        // Set current turn
        combatSystem.combatManager.setCurrentTurn(i);
        
        // Skip defeated or unconscious participants
        if (entry.conditions.includes('defeated') || entry.conditions.includes('unconscious')) {
          console.log(`${participant.name} is unable to act.`);
          continue;
        }
        
        console.log(`\n${participant.name}'s turn:`);
        
        if (entry.isPlayer) {
          // For player turn, ask for action
          const action = await prompt('What would you like to do? (attack/defend/item/end): ');
          
          if (action.toLowerCase().startsWith('attack')) {
            // List enemies
            console.log('\nEnemies:');
            const validTargets = enemies.filter(enemy => 
              enemy.stats.hitPoints.current > 0
            );
            
            validTargets.forEach((enemy, index) => {
              console.log(`${index + 1}. ${enemy.name} (${enemy.stats.hitPoints.current}/${enemy.stats.hitPoints.maximum} HP)`);
            });
            
            if (validTargets.length === 0) {
              console.log('No valid targets!');
              continue;
            }
            
            // Ask for target
            const targetIndex = parseInt(await prompt('Attack which enemy? (number): '), 10) - 1;
            
            if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= validTargets.length) {
              console.log('Invalid target selection!');
              continue;
            }
            
            // Perform attack
            const attackResult = combatSystem.combatManager.performAttack(
              player.id,
              validTargets[targetIndex].id
            );
            
            if (attackResult) {
              // Get enhanced narration for the attack
              const actionDetails = {
                actionType: 'attack',
                actor: player,
                targets: [validTargets[targetIndex]],
                result: attackResult,
                damageDealt: attackResult.damage,
                isSuccessful: attackResult.isHit,
                isCritical: attackResult.isCritical
              };
              
              const attackNarration = await combatSystem.enhancedNarration.narrateAction(
                actionDetails,
                {
                  combatState,
                  location: forestClearing,
                  round,
                  tension: 'moderate'
                }
              );
              
              console.log('\n' + attackNarration + '\n');
            } else {
              console.log('Attack failed due to an error!');
            }
          } else if (action.toLowerCase().startsWith('defend')) {
            console.log('You take a defensive stance, ready to counter any attacks.');
            // Would implement actual defending mechanics in a full system
          } else if (action.toLowerCase().startsWith('item')) {
            console.log('You have no usable items at this time.');
            // Would implement item usage in a full system
          } else {
            console.log('You hold your position, watching the enemies carefully.');
          }
        } else {
          // For NPC turn, use the AI tactical decision-making
          await combatSystem.combatManager.processNPCTurn(participant.id, forestClearing);
          
          // Get the last combat log entry
          const combatLog = combatSystem.combatManager.getCombatLog();
          const lastLogEntry = combatLog[combatLog.length - 1];
          
          // Enhanced narration for the NPC action
          // In a real system, this would use the actual action details
          const actionDetails = {
            actionType: 'attack',
            actor: participant as NPC,
            targets: [player],
            isSuccessful: true // Simplified for example
          };
          
          const npcActionNarration = await combatSystem.enhancedNarration.narrateAction(
            actionDetails,
            {
              combatState,
              location: forestClearing,
              round,
              tension: round === 3 ? 'high' : 'moderate'
            }
          );
          
          console.log('\n' + npcActionNarration + '\n');
        }
        
        // Check if combat is over
        if (combatSystem.combatManager.isCombatOver()) {
          break;
        }
      }
      
      // Check if combat is over after the round
      if (combatSystem.combatManager.isCombatOver()) {
        break;
      }
      
      // End the round
      combatSystem.combatManager.endRound();
      
      // Pause between rounds
      await prompt('\nPress Enter to continue to the next round...');
    }
    
    // Combat conclusion
    let outcome: 'victory' | 'defeat' = 'victory';
    
    // Determine outcome
    const allEnemiesDefeated = enemies.every(enemy => enemy.stats.hitPoints.current <= 0);
    if (allEnemiesDefeated) {
      outcome = 'victory';
    } else if (player.hitPoints.current <= 0) {
      outcome = 'defeat';
    }
    
    // Get enhanced narration for combat end
    const endNarration = await combatSystem.enhancedNarration.narrateCombatEnd(
      {
        combatState,
        location: forestClearing,
        round: combatState.round,
        tension: 'low'
      },
      outcome
    );
    
    console.log('\n' + endNarration + '\n');
    
    console.log('\n===== COMBAT EXAMPLE COMPLETED =====\n');
    console.log('This example demonstrated:');
    console.log('1. AI-driven tactical decision making for NPCs');
    console.log('2. Enhanced narrative descriptions of combat actions');
    console.log('3. Complete integration of the combat system with the AI services');
    
  } catch (error) {
    console.error('Error in AI Combat Example:', error);
  } finally {
    rl.close();
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runAICombatExample().catch(error => {
    console.error('Fatal error in combat example:', error);
    process.exit(1);
  });
}

export { runAICombatExample }; 