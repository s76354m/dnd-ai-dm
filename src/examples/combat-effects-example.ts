/**
 * Combat Effects Integration Example
 * 
 * This example demonstrates how status effects integrate with the combat system,
 * including how effects impact initiative, actions, and saving throws.
 */

import { v4 as uuidv4 } from 'uuid';
import { CombatParticipant, CombatState, CombatEffectsManager, SpellAction, applySpellActionEffects, applyInitiativeModification, checkForReactionOpportunity } from '../combat/combat-effects';
import { ConditionType } from '../magic/spell';
import { StatusEffectManager } from '../magic/status-effects';

// Create some participants
const wizard: CombatParticipant = {
  id: uuidv4(),
  name: 'Wizard',
  initiative: 15,
  initiativeModifier: 2,
  isPlayer: true,
  hitPoints: {
    current: 30,
    maximum: 30
  }
};

const fighter: CombatParticipant = {
  id: uuidv4(),
  name: 'Fighter',
  initiative: 18,
  initiativeModifier: 3,
  isPlayer: true,
  hitPoints: {
    current: 45,
    maximum: 45
  }
};

const goblin1: CombatParticipant = {
  id: uuidv4(),
  name: 'Goblin 1',
  initiative: 12,
  initiativeModifier: 2,
  hitPoints: {
    current: 7,
    maximum: 7
  }
};

const goblin2: CombatParticipant = {
  id: uuidv4(),
  name: 'Goblin 2',
  initiative: 16,
  initiativeModifier: 2,
  hitPoints: {
    current: 7,
    maximum: 7
  }
};

const ogre: CombatParticipant = {
  id: uuidv4(),
  name: 'Ogre',
  initiative: 8,
  initiativeModifier: -1,
  hitPoints: {
    current: 59,
    maximum: 59
  }
};

// Initialize combat state
const combatState: CombatState = {
  participants: [wizard, fighter, goblin1, goblin2, ogre],
  round: 1,
  currentParticipantIndex: 0,
  isActive: true
};

// Get the combat effects manager
const combatEffects = CombatEffectsManager.getInstance();

// Function to display combat order
function displayCombatOrder(state: CombatState): void {
  console.log('\nCurrent Initiative Order:');
  state.participants.forEach((participant, index) => {
    const current = index === state.currentParticipantIndex ? '➤ ' : '  ';
    const hp = `(${participant.hitPoints.current}/${participant.hitPoints.maximum} HP)`;
    const conditions = [];
    
    if (participant.isIncapacitated) conditions.push('Incapacitated');
    if (participant.isParalyzed) conditions.push('Paralyzed');
    if (participant.isStunned) conditions.push('Stunned');
    if (participant.isProne) conditions.push('Prone');
    if (participant.isRestrained) conditions.push('Restrained');
    if (participant.isInvisible) conditions.push('Invisible');
    
    const conditionStr = conditions.length > 0 ? `[${conditions.join(', ')}]` : '';
    
    console.log(`${current}${participant.initiative}: ${participant.name} ${hp} ${conditionStr}`);
  });
}

// Function to simulate a round of combat
function simulateCombatRound(state: CombatState): void {
  console.log(`\n==========================================`);
  console.log(`ROUND ${state.round}`);
  console.log(`==========================================`);
  
  // Process round start effects
  combatEffects.processRoundStartEffects(state);
  
  // Display initial combat order
  displayCombatOrder(state);
  
  // Process each participant's turn
  for (let i = 0; i < state.participants.length; i++) {
    // Set current participant
    state.currentParticipantIndex = i;
    const currentParticipant = state.participants[i];
    
    console.log(`\n--- ${currentParticipant.name}'s Turn ---`);
    
    // Process start of turn effects
    combatEffects.processTurnStartEffects(currentParticipant);
    
    // Skip turn if participant cannot take actions
    if (!combatEffects.canTakeActions(currentParticipant)) {
      console.log(`${currentParticipant.name} is unable to take actions!`);
      combatEffects.processTurnEndEffects(currentParticipant);
      continue;
    }
    
    // Simulate different actions based on the participant and round
    simulateParticipantAction(currentParticipant, state);
    
    // Process end of turn effects
    combatEffects.processTurnEndEffects(currentParticipant);
  }
  
  // Process round end effects
  combatEffects.processRoundEndEffects(state);
  
  // Increment round
  state.round++;
}

// Function to simulate participant actions
function simulateParticipantAction(participant: CombatParticipant, state: CombatState): void {
  switch (participant.name) {
    case 'Wizard':
      if (state.round === 1) {
        console.log(`${participant.name} casts Sleep on the goblins.`);
        
        // Apply Sleep effect to Goblin 1
        const sleepSpell: SpellAction = {
          actionType: 'spell',
          name: 'Sleep',
          description: 'This spell sends creatures into a magical slumber.',
          sourceId: participant.id,
          targetIds: [goblin1.id],
          statusEffects: [{
            name: 'Sleep',
            type: ConditionType.Unconscious,
            description: 'Target is asleep (unconscious) until taking damage or someone uses an action to wake it.',
            duration: { 
              type: 'timed', 
              value: 1, 
              unit: 'minute' 
            },
            tags: ['magical', 'spell']
          }]
        };
        
        // Check for reactions (like Counterspell)
        const reactors = checkForReactionOpportunity(sleepSpell, state);
        if (reactors.length > 0) {
          console.log(`Potential reactions from: ${reactors.map(id => 
            state.participants.find(p => p.id === id)?.name
          ).join(', ')}`);
        } else {
          console.log(`No reaction opportunities.`);
        }
        
        // Apply the spell effects
        applySpellActionEffects(sleepSpell);
      } else if (state.round === 2) {
        console.log(`${participant.name} casts Slow on the ogre.`);
        
        // Apply Slow effect to Ogre
        const slowSpell: SpellAction = {
          actionType: 'spell',
          name: 'Slow',
          description: 'You alter time around up to six creatures, slowing their movement and actions.',
          sourceId: participant.id,
          targetIds: [ogre.id],
          statusEffects: [{
            name: 'Slowed',
            type: ConditionType.Restrained,
            description: "Target moves at half speed, -2 AC and Dex saves, can't use reactions, can only use action OR bonus action, not both.",
            duration: { 
              type: 'concentration', 
              value: 1, 
              unit: 'minute' 
            },
            save: {
              frequency: 'endOfTurn',
              abilityType: 'WIS',
              dc: 15,
              onSuccess: 'removeEffect'
            },
            modifiers: {
              'speed': -50, // 50% reduction
              'ac': -2,
              'dexSave': -2
            },
            tags: ['magical', 'spell']
          }]
        };
        
        // Apply the spell effects
        applySpellActionEffects(slowSpell);
        
        // Apply initiative modification from Slow
        applyInitiativeModification(state, ogre.id, -2, 'Slow spell');
      } else {
        console.log(`${participant.name} casts Fire Bolt at the ogre.`);
        
        // Simulate damage
        combatEffects.processDamageEffects(ogre, 8, 'fire');
      }
      break;
      
    case 'Fighter':
      if (state.round === 1) {
        console.log(`${participant.name} attacks the ogre.`);
        
        // Simulate damage
        combatEffects.processDamageEffects(ogre, 12, 'slashing');
      } else if (state.round === 2) {
        console.log(`${participant.name} uses Trip Attack on Goblin 2.`);
        
        // Apply Prone condition to Goblin 2
        const tripAttack: SpellAction = {
          actionType: 'ability',
          name: 'Trip Attack',
          description: 'Battle Master maneuver that knocks the target prone if it fails a save.',
          sourceId: participant.id,
          targetIds: [goblin2.id],
          statusEffects: [{
            name: 'Prone',
            type: ConditionType.Prone,
            description: 'Target is prone (disadvantage on attacks, melee attacks against it have advantage, ranged attacks have disadvantage).',
            duration: { type: 'permanent' },
            tags: ['battle master', 'maneuver']
          }]
        };
        
        // Apply the ability effects
        applySpellActionEffects(tripAttack);
        
        // Simulate damage
        combatEffects.processDamageEffects(goblin2, 7, 'slashing');
      } else {
        console.log(`${participant.name} attacks the ogre with Action Surge.`);
        
        // Simulate damage
        combatEffects.processDamageEffects(ogre, 20, 'slashing');
      }
      break;
      
    case 'Goblin 1':
      // If not asleep
      if (!participant.isIncapacitated) {
        console.log(`${participant.name} attacks the fighter.`);
        
        // Simulate damage
        combatEffects.processDamageEffects(fighter, 4, 'piercing');
      }
      break;
      
    case 'Goblin 2':
      if (participant.isProne) {
        console.log(`${participant.name} stands up from prone.`);
        
        // Remove prone condition
        const statusEffectManager = StatusEffectManager.getInstance();
        const proneEffects = statusEffectManager.getEffectsByType(participant.id, ConditionType.Prone);
        if (proneEffects.length > 0) {
          statusEffectManager.removeEffect(proneEffects[0].id);
        }
      } else {
        console.log(`${participant.name} attacks the wizard.`);
        
        // Simulate damage
        combatEffects.processDamageEffects(wizard, 5, 'piercing');
      }
      break;
      
    case 'Ogre':
      if (state.round === 1) {
        console.log(`${participant.name} attacks the fighter with its greatclub.`);
        
        // Simulate damage
        combatEffects.processDamageEffects(fighter, 13, 'bludgeoning');
      } else {
        // At this point ogre might be slowed
        console.log(`${participant.name}${participant.hasDisadvantage ? ' attacks with disadvantage' : ' attacks'}.`);
        
        // If affected by Slow, it's less effective
        const damageModifier = participant.hasDisadvantage ? 0.7 : 1; // 70% effectiveness when slowed
        const damage = Math.floor(10 * damageModifier);
        
        console.log(`${participant.name} attacks the wizard with its greatclub.`);
        
        // Simulate damage
        combatEffects.processDamageEffects(wizard, damage, 'bludgeoning');
      }
      break;
  }
}

// Main execution
console.log('=== Combat Effects Integration Example ===\n');
console.log('This example demonstrates how status effects integrate with the combat system.\n');

// Initial combat setup
console.log('Setting up combat...');

// Sort initial initiative order
combatState.participants.sort((a, b) => b.initiative - a.initiative);
combatState.currentParticipantIndex = 0;

// Apply initial combat effects
combatEffects.applyInitialCombatEffects(combatState);

// Simulate 3 rounds of combat
for (let i = 0; i < 3; i++) {
  simulateCombatRound(combatState);
}

// Display final status
console.log('\n=== Combat Summary ===');
displayCombatOrder(combatState);

// Display active effects on each participant
console.log('\n=== Active Effects ===');
const statusEffectManager = StatusEffectManager.getInstance();
combatState.participants.forEach(participant => {
  const effects = statusEffectManager.getActiveEffects(participant.id);
  console.log(`\n${participant.name}: ${effects.length} active effect(s)`);
  if (effects.length > 0) {
    effects.forEach(effect => {
      console.log(`- ${effect.name}: ${effect.description}`);
    });
  }
});

console.log('\nCombat effects example completed successfully.'); 