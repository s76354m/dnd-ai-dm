/**
 * Status Effects Example
 * 
 * This file demonstrates the usage of the status effect system 
 * in the DND AI DM project.
 */

import { StatusEffectManager, formatEffectDescription } from '../magic/status-effects';
import { ConditionType } from '../magic/spell';

// Sample character/monster IDs for demonstration
const WIZARD_ID = 'char_wizard_001';
const FIGHTER_ID = 'char_fighter_002';
const GOBLIN_ID = 'mon_goblin_001';
const ORC_ID = 'mon_orc_002';

// Initialize the status effect manager
const effectManager = StatusEffectManager.getInstance();

// Function to simulate a combat round
function simulateCombatRound(round: number): void {
  console.log(`\n=== ROUND ${round} ===`);
  
  // Process start of round effects
  console.log("\n> Processing start of round effects");
  processTargetEffects('roundStart');
  
  // Simulate character turns
  simulateCharacterTurn(WIZARD_ID, round);
  simulateCharacterTurn(FIGHTER_ID, round);
  simulateCharacterTurn(GOBLIN_ID, round);
  simulateCharacterTurn(ORC_ID, round);
  
  // Process end of round effects
  console.log("\n> Processing end of round effects");
  processTargetEffects('roundEnd');
  
  // Process effect durations
  console.log("\n> Processing effect durations");
  effectManager.processEffectDurations();
}

// Function to process effects for all targets
function processTargetEffects(phase: 'startOfTurn' | 'endOfTurn' | 'roundStart' | 'roundEnd'): void {
  [WIZARD_ID, FIGHTER_ID, GOBLIN_ID, ORC_ID].forEach(targetId => {
    effectManager.processSavingThrows(targetId, phase);
  });
}

// Function to simulate a character's turn
function simulateCharacterTurn(characterId: string, round: number): void {
  console.log(`\n--- ${getCharacterName(characterId)}'s Turn ---`);
  
  // Process start of turn effects
  effectManager.processSavingThrows(characterId, 'startOfTurn');
  
  // Skip turn if stunned or paralyzed
  if (effectManager.hasCondition(characterId, ConditionType.Stunned) ||
      effectManager.hasCondition(characterId, ConditionType.Paralyzed)) {
    console.log(`${getCharacterName(characterId)} is unable to act!`);
    
    // Process end of turn effects
    effectManager.processSavingThrows(characterId, 'endOfTurn');
    return;
  }
  
  // Simulate actions based on character/monster
  switch(characterId) {
    case WIZARD_ID:
      if (round === 1) {
        // Cast Hold Person on Goblin
        console.log(`${getCharacterName(WIZARD_ID)} casts Hold Person on ${getCharacterName(GOBLIN_ID)}!`);
        effectManager.applyEffect({
          name: 'Hold Person',
          type: ConditionType.Paralyzed,
          description: "Target is paralyzed (cannot move or speak, automatically fails STR and DEX saves)",
          source: WIZARD_ID,
          target: GOBLIN_ID,
          duration: { type: 'concentration', value: 10, unit: 'round' },
          save: { 
            frequency: 'endOfTurn', 
            abilityType: 'WIS', 
            dc: 15, 
            onSuccess: 'removeEffect' 
          },
          tags: ['magical', 'spell']
        });
      } else if (round === 2) {
        // Take damage and check concentration
        console.log(`${getCharacterName(WIZARD_ID)} takes 14 damage from an attack!`);
        effectManager.checkConcentration(WIZARD_ID, 14);
      } else {
        console.log(`${getCharacterName(WIZARD_ID)} casts Firebolt.`);
      }
      break;
      
    case FIGHTER_ID:
      if (round === 1) {
        console.log(`${getCharacterName(FIGHTER_ID)} attacks ${getCharacterName(ORC_ID)}.`);
      } else if (round === 2) {
        // Apply frightened condition to Orc
        console.log(`${getCharacterName(FIGHTER_ID)} uses Menacing Attack on ${getCharacterName(ORC_ID)}!`);
        effectManager.applyEffect({
          name: 'Menacing Attack',
          type: ConditionType.Frightened,
          description: "Target is frightened (disadvantage on ability checks, cannot willingly move closer to source)",
          source: FIGHTER_ID,
          target: ORC_ID,
          duration: { type: 'timed', value: 1, unit: 'round' },
          save: { 
            frequency: 'endOfTurn', 
            abilityType: 'WIS', 
            dc: 14, 
            onSuccess: 'removeEffect' 
          },
          tags: ['battle master', 'maneuver']
        });
      } else {
        console.log(`${getCharacterName(FIGHTER_ID)} uses Second Wind to heal.`);
      }
      break;
      
    case GOBLIN_ID:
      if (!effectManager.hasCondition(GOBLIN_ID, ConditionType.Paralyzed)) {
        console.log(`${getCharacterName(GOBLIN_ID)} attacks ${getCharacterName(FIGHTER_ID)}.`);
      }
      break;
      
    case ORC_ID:
      if (effectManager.hasCondition(ORC_ID, ConditionType.Frightened)) {
        console.log(`${getCharacterName(ORC_ID)} is frightened of ${getCharacterName(FIGHTER_ID)} and attacks with disadvantage.`);
      } else if (round === 3) {
        // Apply poisoned condition to Wizard
        console.log(`${getCharacterName(ORC_ID)} hits ${getCharacterName(WIZARD_ID)} with a poisoned blade!`);
        effectManager.applyEffect({
          name: 'Poison',
          type: ConditionType.Poisoned,
          description: "Target is poisoned (has disadvantage on attack rolls and ability checks)",
          source: ORC_ID,
          target: WIZARD_ID,
          duration: { type: 'timed', value: 3, unit: 'round' },
          save: { 
            frequency: 'startOfTurn', 
            abilityType: 'CON', 
            dc: 13, 
            onSuccess: 'removeEffect' 
          },
          modifiers: { 'attack': -2 },
          tags: ['poison']
        });
      } else {
        console.log(`${getCharacterName(ORC_ID)} attacks ${getCharacterName(WIZARD_ID)}.`);
      }
      break;
  }
  
  // Process end of turn effects
  effectManager.processSavingThrows(characterId, 'endOfTurn');
  
  // Print all active effects on this character
  const activeEffects = effectManager.getActiveEffects(characterId);
  if (activeEffects.length > 0) {
    console.log(`Current effects on ${getCharacterName(characterId)}:`);
    activeEffects.forEach(effect => {
      console.log(`- ${formatEffectDescription(effect)}`);
    });
  }
}

// Utility function to get character/monster name
function getCharacterName(id: string): string {
  switch(id) {
    case WIZARD_ID: return "Wizard";
    case FIGHTER_ID: return "Fighter";
    case GOBLIN_ID: return "Goblin";
    case ORC_ID: return "Orc";
    default: return "Unknown";
  }
}

// Main execution
console.log("=== Status Effect System Example ===\n");
console.log("This example demonstrates various status effects in combat rounds.\n");

// Run 3 rounds of combat
for (let round = 1; round <= 3; round++) {
  simulateCombatRound(round);
}

// Summary of effects at the end
console.log("\n=== Final Status Effect Summary ===");
[WIZARD_ID, FIGHTER_ID, GOBLIN_ID, ORC_ID].forEach(characterId => {
  const effects = effectManager.getActiveEffects(characterId);
  console.log(`\n${getCharacterName(characterId)}: ${effects.length} active effect(s)`);
  effects.forEach(effect => {
    console.log(`- ${formatEffectDescription(effect)}`);
  });
});

console.log("\nStatus effect example completed successfully."); 