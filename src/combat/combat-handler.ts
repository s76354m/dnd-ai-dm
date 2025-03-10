import { GameState, ResolvedCommand, CombatParticipant } from '../types';
import { processBasicAttack, nextCombatTurn } from './combat-basics';
import { aiService } from '../ai/services/ai-service';

/**
 * Process a combat command
 * @param command The resolved combat command
 * @param gameState Current game state
 * @returns Result of the combat action
 */
export async function processCombatCommand(
  command: ResolvedCommand, 
  gameState: GameState
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  // Check if in combat
  if (!gameState.combatState) {
    return {
      message: "You're not in combat right now.",
      shouldSave: false
    };
  }
  
  // Get the current active participant
  const activeParticipant = gameState.combatState.participants[gameState.combatState.activeParticipantIndex];
  
  // Check if it's the player's turn
  if (!activeParticipant.isPlayer) {
    return {
      message: `It's not your turn! It's ${activeParticipant.name}'s turn.`,
      shouldSave: false
    };
  }
  
  // Process based on the combat action
  switch (command.action) {
    case 'attack':
      return processCombatAttack(command, gameState);
    
    case 'cast':
      return processCombatSpell(command, gameState);
    
    case 'dodge':
      return processCombatDodge(gameState);
    
    case 'disengage':
      return processCombatDisengage(gameState);
    
    case 'end':
      return processEndTurn(gameState);
    
    default:
      return {
        message: "Invalid combat action. Try 'attack', 'cast', 'dodge', or 'disengage'.",
        shouldSave: false
      };
  }
}

/**
 * Process a combat attack action
 * @param command The attack command
 * @param gameState Current game state
 * @returns Result of the attack
 */
async function processCombatAttack(
  command: ResolvedCommand, 
  gameState: GameState
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  // Check if a target is specified
  if (!command.target) {
    return {
      message: "Who do you want to attack?",
      shouldSave: false
    };
  }
  
  // Find the target among the enemies
  const targetEnemy = gameState.combatState.enemies.find(enemy => 
    enemy.name.toLowerCase().includes(command.target.toLowerCase())
  );
  
  if (!targetEnemy) {
    return {
      message: `There's no ${command.target} to attack.`,
      shouldSave: false
    };
  }
  
  // Process the attack
  const attackResult = processBasicAttack(gameState.player, targetEnemy);
  
  // Prepare message
  let message = attackResult.message;
  
  // Enhanced narrative for attack, if AI is available
  try {
    const narrativeDescription = await aiService.generateCombatNarrative(
      gameState.player.name,
      targetEnemy.name,
      "attack",
      attackResult.hit ? `hit for ${attackResult.damage} damage` : "missed"
    );
    
    message = narrativeDescription;
  } catch (error) {
    console.log("Couldn't generate enhanced combat narrative, using fallback");
  }
  
  // Check if the target was defeated
  if (targetEnemy.hitPoints.current <= 0) {
    // Process enemy defeat
    return processCombatVictory(gameState, message);
  }
  
  // Advance to next turn
  const turnResult = nextCombatTurn(gameState.combatState);
  
  return {
    message: `${message}\n\n${turnResult.message}`,
    stateChanges: {
      combatState: turnResult.updatedState
    },
    shouldSave: true
  };
}

/**
 * Process a combat spell action
 * @param command The spell command
 * @param gameState Current game state
 * @returns Result of the spell
 */
async function processCombatSpell(
  command: ResolvedCommand, 
  gameState: GameState
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  // For MVP, implement a simplified spell system
  // In a full implementation, this would handle different spells with various effects
  return {
    message: "Spell casting is not implemented in this MVP version.",
    shouldSave: false
  };
}

/**
 * Process a combat dodge action
 * @param gameState Current game state
 * @returns Result of the dodge
 */
async function processCombatDodge(
  gameState: GameState
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  // Apply dodge effect (advantage on DEX saves, attacks have disadvantage)
  // For MVP, we'll just add a condition to the player
  gameState.player.conditions = gameState.player.conditions || [];
  gameState.player.conditions.push({
    name: 'Dodge',
    duration: 1, // Lasts until the player's next turn
    effects: ['Incoming attacks have disadvantage']
  });
  
  // Generate dodge narrative
  let message: string;
  try {
    message = await aiService.generateCombatNarrative(
      gameState.player.name,
      "",
      "dodge",
      "prepares defensively"
    );
  } catch (error) {
    message = "You take the Dodge action, focusing entirely on avoiding attacks.";
  }
  
  // Advance to next turn
  const turnResult = nextCombatTurn(gameState.combatState);
  
  return {
    message: `${message}\n\n${turnResult.message}`,
    stateChanges: {
      combatState: turnResult.updatedState,
      player: gameState.player
    },
    shouldSave: true
  };
}

/**
 * Process a combat disengage action
 * @param gameState Current game state
 * @returns Result of the disengage
 */
async function processCombatDisengage(
  gameState: GameState
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  // For MVP, disengage will simply end combat
  // In a full implementation, this would allow for more strategic combat retreats
  
  let message: string;
  try {
    message = await aiService.generateNarrative({
      type: 'combat_end',
      result: 'disengage',
      player: gameState.player,
      location: gameState.currentLocation,
      enemies: gameState.combatState.enemies
    });
  } catch (error) {
    message = "You successfully disengage from combat and your opponents don't pursue.";
  }
  
  return {
    message,
    stateChanges: {
      combatState: null, // End combat
      sessionHistory: [
        ...gameState.sessionHistory,
        {
          type: 'combat_end',
          timestamp: new Date().toISOString(),
          details: {
            result: 'disengage',
            enemiesDefeated: 0
          }
        }
      ]
    },
    shouldSave: true
  };
}

/**
 * Process the end of a player's turn
 * @param gameState Current game state
 * @returns Result of ending the turn
 */
async function processEndTurn(
  gameState: GameState
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  // Advance to next turn
  const turnResult = nextCombatTurn(gameState.combatState);
  
  // If the next turn is an enemy, process their action
  const nextParticipant = gameState.combatState.participants[turnResult.updatedState.activeParticipantIndex];
  if (!nextParticipant.isPlayer) {
    // Process enemy turn (will be implemented in the next section)
    return processEnemyTurn(nextParticipant, gameState, turnResult.updatedState);
  }
  
  return {
    message: turnResult.message,
    stateChanges: {
      combatState: turnResult.updatedState
    },
    shouldSave: true
  };
}

/**
 * Process an enemy's turn in combat
 * @param enemy The enemy participant
 * @param gameState Current game state
 * @param updatedCombatState The updated combat state
 * @returns Result of the enemy's action
 */
async function processEnemyTurn(
  enemy: CombatParticipant,
  gameState: GameState,
  updatedCombatState: any
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  // Find the enemy NPC
  const npc = gameState.npcs.get(enemy.id);
  if (!npc) {
    // If NPC not found, skip turn
    const skipResult = nextCombatTurn(updatedCombatState);
    return {
      message: `${enemy.name}'s turn is skipped.\n\n${skipResult.message}`,
      stateChanges: {
        combatState: skipResult.updatedState
      },
      shouldSave: true
    };
  }
  
  // For MVP, enemies always attack the player
  const attackResult = processBasicAttack(npc, gameState.player);
  
  // Prepare message
  let message = attackResult.message;
  
  // Enhanced narrative for attack, if AI is available
  try {
    const narrativeDescription = await aiService.generateCombatNarrative(
      npc.name,
      gameState.player.name,
      "attack",
      attackResult.hit ? `hit for ${attackResult.damage} damage` : "missed"
    );
    
    message = narrativeDescription;
  } catch (error) {
    console.log("Couldn't generate enhanced combat narrative, using fallback");
  }
  
  // Check if player was defeated
  if (gameState.player.hitPoints.current <= 0) {
    return processCombatDefeat(gameState, message);
  }
  
  // Advance to next turn
  const turnResult = nextCombatTurn(updatedCombatState);
  
  return {
    message: `${message}\n\n${turnResult.message}`,
    stateChanges: {
      combatState: turnResult.updatedState,
      player: gameState.player
    },
    shouldSave: true
  };
}

/**
 * Process combat victory
 * @param gameState Current game state
 * @param initialMessage Message to prepend
 * @returns Result of the victory
 */
async function processCombatVictory(
  gameState: GameState,
  initialMessage: string
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  // Remove defeated enemies
  const remainingEnemies = gameState.combatState.enemies.filter(enemy => 
    enemy.hitPoints.current > 0
  );
  
  // Check if all enemies are defeated
  if (remainingEnemies.length === 0) {
    // Combat is over - victory!
    let victoryMessage: string;
    try {
      victoryMessage = await aiService.generateNarrative({
        type: 'combat_end',
        result: 'victory',
        player: gameState.player,
        location: gameState.currentLocation,
        enemies: gameState.combatState.enemies
      });
    } catch (error) {
      victoryMessage = "You've defeated all your enemies!";
    }
    
    // Calculate XP reward (simple calculation for MVP)
    const xpGained = gameState.combatState.enemies.reduce((total, enemy) => 
      total + (enemy.level * 25), 0
    );
    
    // Award XP to player
    gameState.player.experience += xpGained;
    
    return {
      message: `${initialMessage}\n\n${victoryMessage}\n\nYou gained ${xpGained} experience!`,
      stateChanges: {
        combatState: null, // End combat
        player: gameState.player,
        sessionHistory: [
          ...gameState.sessionHistory,
          {
            type: 'combat_end',
            timestamp: new Date().toISOString(),
            details: {
              result: 'victory',
              enemiesDefeated: gameState.combatState.enemies.length,
              experienceGained: xpGained
            }
          }
        ]
      },
      shouldSave: true
    };
  } else {
    // Some enemies still remain - update combat state
    const updatedCombatState = {
      ...gameState.combatState,
      enemies: remainingEnemies,
      // Update participants list to remove defeated enemies
      participants: gameState.combatState.participants.filter(p => 
        remainingEnemies.some(e => e.id === p.id)
      )
    };
    
    return {
      message: `Combat continues!`,
      stateChanges: {
        combatState: updatedCombatState
      },
      shouldSave: true
    };
  }
} 