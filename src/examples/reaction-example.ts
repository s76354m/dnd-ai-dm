/**
 * Reaction System Example
 * 
 * This example demonstrates the reaction system in combat, focusing on
 * Counterspell, Shield, and opportunity attacks.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  CombatParticipant, 
  CombatState, 
  SpellAction,
  processReactionTriggers
} from '../combat/combat-effects';
import { 
  ReactionManager,
  ReactionTrigger,
  ReactionTriggerType,
  createCounterspellReaction,
  createShieldReaction,
  createOpportunityAttackReaction,
  createSpellCastTrigger,
  createAttackTrigger,
  createMovementTrigger
} from '../combat/reactions';
import { ConditionType } from '../magic/spell';
import { StatusEffectManager } from '../magic/status-effects';

// Set up the combat participants
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

const enemyMage: CombatParticipant = {
  id: uuidv4(),
  name: 'Enemy Mage',
  initiative: 12,
  initiativeModifier: 1,
  hitPoints: {
    current: 25,
    maximum: 25
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

const orc: CombatParticipant = {
  id: uuidv4(),
  name: 'Orc',
  initiative: 10,
  initiativeModifier: 0,
  hitPoints: {
    current: 15,
    maximum: 15
  }
};

// Initialize combat state
const combatState: CombatState = {
  participants: [wizard, enemyMage, fighter, orc],
  round: 1,
  currentParticipantIndex: 0,
  isActive: true
};

// Sort by initiative
combatState.participants.sort((a, b) => b.initiative - a.initiative);

// Initialize the reaction manager
const reactionManager = ReactionManager.getInstance();

// Register reactions for each participant
// Wizard has Counterspell prepared
const wizardCounterspell = createCounterspellReaction(wizard, 3);
reactionManager.registerReaction(wizardCounterspell);

// Enemy mage also has Counterspell
const enemyCounterspell = createCounterspellReaction(enemyMage, 3);
reactionManager.registerReaction(enemyCounterspell);

// Fighter has Shield spell (from Eldritch Knight subclass)
const fighterShield = createShieldReaction(fighter);
reactionManager.registerReaction(fighterShield);

// All melee combatants have opportunity attacks
const fighterOpportunityAttack = createOpportunityAttackReaction(fighter);
reactionManager.registerReaction(fighterOpportunityAttack);

const orcOpportunityAttack = createOpportunityAttackReaction(orc);
reactionManager.registerReaction(orcOpportunityAttack);

// Function to display combat status
function displayCombatStatus(): void {
  console.log('\nCombat Status:');
  combatState.participants.forEach(participant => {
    console.log(`${participant.name}: ${participant.hitPoints.current}/${participant.hitPoints.maximum} HP`);
    
    // Display if reaction is available
    const reactionAvailable = !reactionManager.hasUsedReaction(participant.id);
    console.log(`  Reaction ${reactionAvailable ? 'available' : 'used'}`);
    
    // Display active effects
    const statusEffectManager = StatusEffectManager.getInstance();
    const activeEffects = statusEffectManager.getActiveEffects(participant.id);
    if (activeEffects.length > 0) {
      console.log('  Active effects:');
      activeEffects.forEach(effect => {
        console.log(`    - ${effect.name}: ${effect.description}`);
      });
    }
  });
}

// Scenario 1: Wizard casts Fireball, Enemy Mage attempts to counterspell
console.log('=== Scenario 1: Counterspell ===');
console.log('Wizard casts Fireball targeting the Enemy Mage and Orc');

// Create the Fireball spell action
const fireballSpell: SpellAction = {
  actionType: 'spell',
  name: 'Fireball',
  description: 'A bright streak flashes from your pointing finger to a point you choose and then blossoms with a low roar into an explosion of flame.',
  sourceId: wizard.id,
  targetIds: [enemyMage.id, orc.id],
  statusEffects: []
};

// Create a spell cast trigger for the Fireball
const fireballTrigger = createSpellCastTrigger(
  { ...fireballSpell, spellLevel: 3 },
  wizard,
  [enemyMage, orc]
);

// Check for eligible reactors
const eligibleReactors = reactionManager.getEligibleReactors(fireballTrigger, combatState);
console.log('Eligible reactors for Counterspell:', eligibleReactors.map(id => 
  combatState.participants.find(p => p.id === id)?.name
).join(', '));

// Process the reactions (Enemy Mage will attempt to Counterspell)
const executedReactions = reactionManager.processPendingTriggers(combatState);
console.log(`Executed reactions: ${executedReactions.length}`);

// If not countered, apply damage from Fireball
if (executedReactions.length === 0 || executedReactions.every(id => 
    reactionManager.reactionRegistry.get(id)?.name !== 'Counterspell')) {
  console.log('Fireball explodes! Both Enemy Mage and Orc take 8d6 fire damage.');
  // Simplified damage calculation (average of 8d6 = 28)
  const damage = 28;
  
  // Apply damage to targets
  enemyMage.hitPoints.current = Math.max(0, enemyMage.hitPoints.current - damage);
  orc.hitPoints.current = Math.max(0, orc.hitPoints.current - damage);
  
  console.log(`Enemy Mage takes ${damage} fire damage`);
  console.log(`Orc takes ${damage} fire damage`);
}

// Update combat status
displayCombatStatus();

// Reset for scenario 2
reactionManager.resetAllReactions();

// Scenario 2: Orc attacks Fighter, Fighter uses Shield
console.log('\n=== Scenario 2: Shield Spell ===');
console.log('Orc attacks Fighter with its greataxe');

// Create an attack trigger
const attackData = {
  attackRoll: 15,
  attackBonus: 5,
  damage: 10,
  damageType: 'slashing'
};

const orcAttackTrigger = createAttackTrigger(orc, fighter, attackData);

// Check for eligible reactors
const shieldReactors = reactionManager.getEligibleReactors(orcAttackTrigger, combatState);
console.log('Eligible reactors for Shield:', shieldReactors.map(id => 
  combatState.participants.find(p => p.id === id)?.name
).join(', '));

// Process the reactions (Fighter might use Shield)
const shieldReactions = reactionManager.processPendingTriggers(combatState);

// If Fighter didn't use Shield or if the attack still hits, apply damage
let shieldUsed = false;
for (const reactionId of shieldReactions) {
  const reaction = reactionManager.reactionRegistry.get(reactionId);
  if (reaction && reaction.name === 'Shield') {
    shieldUsed = true;
    break;
  }
}

if (!shieldUsed) {
  console.log('Fighter takes the hit!');
  fighter.hitPoints.current = Math.max(0, fighter.hitPoints.current - attackData.damage);
  console.log(`Fighter takes ${attackData.damage} slashing damage`);
} else {
  // Check if attack still hits with Shield (+5 AC)
  const fighterAC = 18; // Base AC
  const shieldAC = fighterAC + 5;
  
  const totalAttackRoll = attackData.attackRoll + attackData.attackBonus;
  if (totalAttackRoll >= shieldAC) {
    console.log(`Even with Shield, the attack hits (${totalAttackRoll} vs AC ${shieldAC})!`);
    fighter.hitPoints.current = Math.max(0, fighter.hitPoints.current - attackData.damage);
    console.log(`Fighter takes ${attackData.damage} slashing damage`);
  } else {
    console.log(`Shield blocks the attack! (${totalAttackRoll} vs AC ${shieldAC})`);
  }
}

// Update combat status
displayCombatStatus();

// Reset for scenario 3
reactionManager.resetAllReactions();

// Scenario 3: Enemy Mage moves away from Fighter, triggering opportunity attack
console.log('\n=== Scenario 3: Opportunity Attack ===');
console.log('Enemy Mage moves away from the Fighter');

// Create movement data (simplified)
const movementData = {
  fromPosition: { x: 0, y: 0 },
  toPosition: { x: 30, y: 0 },
  movingAwayFrom: [fighter.id]
};

// Create a movement trigger
const movementTrigger = createMovementTrigger(
  enemyMage, 
  [fighter], 
  movementData
);

// Check for eligible reactors
const movementReactors = reactionManager.getEligibleReactors(movementTrigger, combatState);
console.log('Eligible reactors for opportunity attack:', movementReactors.map(id => 
  combatState.participants.find(p => p.id === id)?.name
).join(', '));

// Process the reactions
const opportunityReactions = reactionManager.processPendingTriggers(combatState);
console.log(`Executed opportunity attacks: ${opportunityReactions.length}`);

// Update combat status
displayCombatStatus();

console.log('\nReaction system example completed successfully.');

// Export for module loading
export default {
  run: () => {
    console.log('Reaction example run complete');
  }
}; 