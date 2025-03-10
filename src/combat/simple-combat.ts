/**
 * Simple Combat System
 * 
 * A simplified version of the D&D combat system for the simple game application.
 * This provides basic combat mechanics without the full complexity of the D&D rules.
 */

import { SimpleAIService } from '../ai/simple-ai-service';

// Define the combat-related types
export interface SimpleCombatant {
  id: string;
  name: string;
  level?: number;
  armorClass: number;
  hitPoints: {
    current: number;
    maximum: number;
  };
  initiative: number;
  attacks: SimpleAttack[];
  isPlayer: boolean;
}

export interface SimpleAttack {
  name: string;
  hitBonus: number;
  damageDice: string; // e.g. "1d8"
  damageBonus: number;
  damageType: string;
  description: string;
}

export interface SimpleCombatState {
  inCombat: boolean;
  round: number;
  currentTurn: number;
  initiative: SimpleCombatant[];
  enemies: SimpleCombatant[];
}

export interface CombatActionResult {
  success: boolean;
  damage?: number;
  message: string;
  critical?: boolean;
}

/**
 * Roll a d20 with advantage, disadvantage, or normally
 * 
 * @param advantage Whether to roll with advantage
 * @param disadvantage Whether to roll with disadvantage
 * @returns The result of the d20 roll
 */
function rollD20(advantage = false, disadvantage = false): number {
  const roll1 = Math.floor(Math.random() * 20) + 1;
  
  // If neither advantage nor disadvantage, return the single roll
  if (!advantage && !disadvantage) {
    return roll1;
  }
  
  const roll2 = Math.floor(Math.random() * 20) + 1;
  
  // With advantage, take the higher roll
  if (advantage && !disadvantage) {
    return Math.max(roll1, roll2);
  }
  
  // With disadvantage, take the lower roll
  if (disadvantage && !advantage) {
    return Math.min(roll1, roll2);
  }
  
  // If both advantage and disadvantage, they cancel out
  return roll1;
}

/**
 * Roll damage dice of the specified type
 * 
 * @param damageDice The damage dice expression (e.g. "2d6")
 * @param critical Whether this is a critical hit
 * @returns The total damage
 */
function rollDamage(damageDice: string, critical = false): number {
  const [countStr, diceStr] = damageDice.split('d');
  let count = parseInt(countStr, 10);
  const sides = parseInt(diceStr, 10);
  
  // Double the number of dice on a critical hit
  if (critical) {
    count *= 2;
  }
  
  let damage = 0;
  for (let i = 0; i < count; i++) {
    damage += Math.floor(Math.random() * sides) + 1;
  }
  
  return damage;
}

/**
 * Simple Combat Manager that handles combat mechanics
 */
export class SimpleCombatManager {
  private state: SimpleCombatState;
  private aiService: SimpleAIService;
  
  /**
   * Create a new SimpleCombatManager
   * 
   * @param aiService The AI service to use for generating narrative descriptions
   */
  constructor(aiService: SimpleAIService) {
    this.aiService = aiService;
    this.state = {
      inCombat: false,
      round: 0,
      currentTurn: 0,
      initiative: [],
      enemies: []
    };
  }
  
  /**
   * Initialize combat with the specified player and enemies
   * 
   * @param player The player character
   * @param enemies The enemies to fight
   * @returns A description of the combat start
   */
  public initializeCombat(player: SimpleCombatant, enemies: SimpleCombatant[]): string {
    // Set up the combat state
    this.state.inCombat = true;
    this.state.round = 1;
    this.state.currentTurn = 0;
    this.state.enemies = [...enemies];
    
    // Roll initiative for all combatants
    const allCombatants = [player, ...enemies];
    this.state.initiative = allCombatants
      .map(c => ({
        ...c,
        initiative: rollD20() + (c.initiative || 0)
      }))
      .sort((a, b) => b.initiative - a.initiative);
    
    // Generate a description of the combat start
    const enemyNames = enemies.map(e => e.name).join(', ');
    
    return `Combat begins! You face ${enemyNames}.\n\n` +
      `Initiative order:\n` +
      this.state.initiative.map(c => `${c.name}: ${c.initiative}`).join('\n');
  }
  
  /**
   * Get the current state of combat
   * 
   * @returns The current combat state
   */
  public getCombatState(): SimpleCombatState {
    return { ...this.state };
  }
  
  /**
   * Get the active combatant who should take their turn
   * 
   * @returns The active combatant
   */
  public getActiveCombatant(): SimpleCombatant | null {
    if (!this.state.inCombat || this.state.initiative.length === 0) {
      return null;
    }
    
    return this.state.initiative[this.state.currentTurn];
  }
  
  /**
   * Check if combat is over
   * 
   * @returns Whether all enemies are defeated
   */
  public isEnemiesDefeated(): boolean {
    return this.state.enemies.every(e => e.hitPoints.current <= 0);
  }
  
  /**
   * Perform a player attack action
   * 
   * @param attackName The name of the attack to use
   * @param targetId The ID of the target
   * @param player The player character
   * @returns The result of the attack
   */
  public playerAttack(attackName: string, targetId: string, player: SimpleCombatant): CombatActionResult {
    // Find the target
    const target = this.state.enemies.find(e => e.id === targetId);
    if (!target) {
      return {
        success: false,
        message: "Target not found."
      };
    }
    
    // Check if target is already defeated
    if (target.hitPoints.current <= 0) {
      return {
        success: false,
        message: `${target.name} is already defeated.`
      };
    }
    
    // Find the attack
    const attack = player.attacks.find(a => a.name.toLowerCase() === attackName.toLowerCase());
    if (!attack) {
      return {
        success: false,
        message: `You don't have an attack called ${attackName}.`
      };
    }
    
    // Roll to hit
    const attackRoll = rollD20();
    const hitResult = attackRoll + attack.hitBonus;
    const isCritical = attackRoll === 20;
    const isCriticalFail = attackRoll === 1;
    
    // Check if the attack hits
    if (isCriticalFail) {
      return {
        success: false,
        message: `You roll a natural 1! Your ${attack.name} misses badly.`
      };
    }
    
    if (isCritical || hitResult >= target.armorClass) {
      // Roll damage
      const damageRoll = rollDamage(attack.damageDice, isCritical);
      const totalDamage = damageRoll + attack.damageBonus;
      
      // Apply damage
      target.hitPoints.current = Math.max(0, target.hitPoints.current - totalDamage);
      
      // Create result message
      const hitMessage = isCritical 
        ? `Critical hit! Your ${attack.name} strikes true.` 
        : `Your ${attack.name} hits (${hitResult} vs AC ${target.armorClass}).`;
      
      const damageMessage = `You deal ${totalDamage} ${attack.damageType} damage to ${target.name}.`;
      
      const statusMessage = target.hitPoints.current <= 0
        ? `${target.name} is defeated!`
        : `${target.name} has ${target.hitPoints.current}/${target.hitPoints.maximum} HP remaining.`;
      
      return {
        success: true,
        damage: totalDamage,
        critical: isCritical,
        message: `${hitMessage} ${damageMessage} ${statusMessage}`
      };
    } else {
      return {
        success: false,
        message: `Your ${attack.name} misses. (${hitResult} vs AC ${target.armorClass})`
      };
    }
  }
  
  /**
   * Perform an enemy attack action
   * 
   * @param enemy The enemy performing the attack
   * @param target The target of the attack
   * @returns The result of the attack
   */
  public enemyAttack(enemy: SimpleCombatant, target: SimpleCombatant): CombatActionResult {
    // Select a random attack
    const attackIndex = Math.floor(Math.random() * enemy.attacks.length);
    const attack = enemy.attacks[attackIndex];
    
    // Roll to hit
    const attackRoll = rollD20();
    const hitResult = attackRoll + attack.hitBonus;
    const isCritical = attackRoll === 20;
    const isCriticalFail = attackRoll === 1;
    
    // Check if the attack hits
    if (isCriticalFail) {
      return {
        success: false,
        message: `${enemy.name} rolls a natural 1! Their ${attack.name} misses badly.`
      };
    }
    
    if (isCritical || hitResult >= target.armorClass) {
      // Roll damage
      const damageRoll = rollDamage(attack.damageDice, isCritical);
      const totalDamage = damageRoll + attack.damageBonus;
      
      // Apply damage
      target.hitPoints.current = Math.max(0, target.hitPoints.current - totalDamage);
      
      // Create result message
      const hitMessage = isCritical 
        ? `Critical hit! ${enemy.name}'s ${attack.name} strikes true.` 
        : `${enemy.name}'s ${attack.name} hits (${hitResult} vs AC ${target.armorClass}).`;
      
      const damageMessage = `${enemy.name} deals ${totalDamage} ${attack.damageType} damage to you.`;
      
      const statusMessage = target.hitPoints.current <= 0
        ? `You are defeated!`
        : `You have ${target.hitPoints.current}/${target.hitPoints.maximum} HP remaining.`;
      
      return {
        success: true,
        damage: totalDamage,
        critical: isCritical,
        message: `${hitMessage} ${damageMessage} ${statusMessage}`
      };
    } else {
      return {
        success: false,
        message: `${enemy.name}'s ${attack.name} misses. (${hitResult} vs AC ${target.armorClass})`
      };
    }
  }
  
  /**
   * Process the next turn in combat
   * 
   * @param player The player character
   * @returns A message describing what happened this turn
   */
  public nextTurn(player: SimpleCombatant): string {
    if (!this.state.inCombat) {
      return "Not in combat.";
    }
    
    // Move to the next turn
    this.state.currentTurn = (this.state.currentTurn + 1) % this.state.initiative.length;
    
    // If we've gone through all combatants, increment the round
    if (this.state.currentTurn === 0) {
      this.state.round++;
      return `Round ${this.state.round} begins!`;
    }
    
    // Get the current combatant
    const current = this.getActiveCombatant();
    if (!current) {
      return "Error: No active combatant.";
    }
    
    return `It's ${current.name}'s turn.`;
  }
  
  /**
   * End combat
   * 
   * @param victory Whether the player won
   * @returns A message describing the end of combat
   */
  public endCombat(victory: boolean): string {
    this.state.inCombat = false;
    
    if (victory) {
      return "Victory! All enemies have been defeated.";
    } else {
      return "Defeat! You have been bested in combat.";
    }
  }
  
  /**
   * Generate a list of enemies based on the player's level and location
   * 
   * @param playerLevel The player's level
   * @param location The current location
   * @returns An array of enemies to fight
   */
  public generateEnemies(playerLevel: number, location: string): SimpleCombatant[] {
    // Define different enemy types for different locations
    const enemyTypes: Record<string, { name: string, level: number, armorClass: number, hp: number, attacks: SimpleAttack[] }[]> = {
      'cave entrance': [
        {
          name: 'Wolf',
          level: 1,
          armorClass: 13,
          hp: 11,
          attacks: [
            {
              name: 'Bite',
              hitBonus: 4,
              damageDice: '2d4',
              damageBonus: 2,
              damageType: 'piercing',
              description: 'A powerful bite with sharp teeth.'
            }
          ]
        },
        {
          name: 'Bandit',
          level: 1,
          armorClass: 12,
          hp: 11,
          attacks: [
            {
              name: 'Scimitar',
              hitBonus: 3,
              damageDice: '1d6',
              damageBonus: 1,
              damageType: 'slashing',
              description: 'A slash with a curved blade.'
            }
          ]
        }
      ],
      'inside cave': [
        {
          name: 'Giant Spider',
          level: 2,
          armorClass: 14,
          hp: 18,
          attacks: [
            {
              name: 'Bite',
              hitBonus: 5,
              damageDice: '1d8',
              damageBonus: 3,
              damageType: 'piercing',
              description: 'A venomous bite from sharp fangs.'
            }
          ]
        },
        {
          name: 'Skeleton',
          level: 2,
          armorClass: 13,
          hp: 15,
          attacks: [
            {
              name: 'Shortsword',
              hitBonus: 4,
              damageDice: '1d6',
              damageBonus: 2,
              damageType: 'piercing',
              description: 'A stab with a rusty shortsword.'
            },
            {
              name: 'Shortbow',
              hitBonus: 4,
              damageDice: '1d6',
              damageBonus: 2,
              damageType: 'piercing',
              description: 'A shot from a decrepit shortbow.'
            }
          ]
        }
      ],
      'forest clearing': [
        {
          name: 'Goblin',
          level: 1,
          armorClass: 15,
          hp: 10,
          attacks: [
            {
              name: 'Scimitar',
              hitBonus: 4,
              damageDice: '1d6',
              damageBonus: 2,
              damageType: 'slashing',
              description: 'A wild swing with a small scimitar.'
            }
          ]
        },
        {
          name: 'Wild Boar',
          level: 1,
          armorClass: 11,
          hp: 15,
          attacks: [
            {
              name: 'Tusk',
              hitBonus: 3,
              damageDice: '1d6',
              damageBonus: 1,
              damageType: 'slashing',
              description: 'A charge with sharp tusks.'
            }
          ]
        }
      ],
      'village': [
        {
          name: 'Thug',
          level: 2,
          armorClass: 12,
          hp: 20,
          attacks: [
            {
              name: 'Mace',
              hitBonus: 4,
              damageDice: '1d6',
              damageBonus: 2,
              damageType: 'bludgeoning',
              description: 'A heavy swing with a mace.'
            }
          ]
        }
      ]
    };
    
    // Get enemy types for the current location
    const locationEnemies = enemyTypes[location] || enemyTypes['forest clearing'];
    
    // Determine the number of enemies (1-2 based on player level)
    const enemyCount = Math.min(2, Math.max(1, Math.floor(Math.random() * 2) + 1));
    
    // Create the enemies
    const enemies: SimpleCombatant[] = [];
    for (let i = 0; i < enemyCount; i++) {
      // Pick a random enemy type for this location
      const enemyIndex = Math.floor(Math.random() * locationEnemies.length);
      const enemyTemplate = locationEnemies[enemyIndex];
      
      // Scale HP slightly based on player level
      const hpMultiplier = 1 + (playerLevel - 1) * 0.2;
      const maxHp = Math.floor(enemyTemplate.hp * hpMultiplier);
      
      // Create the enemy
      const enemy: SimpleCombatant = {
        id: `enemy-${i + 1}`,
        name: `${enemyTemplate.name}${enemyCount > 1 ? ` ${i + 1}` : ''}`,
        level: enemyTemplate.level,
        armorClass: enemyTemplate.armorClass,
        hitPoints: {
          current: maxHp,
          maximum: maxHp
        },
        initiative: 0, // Will be rolled during combat initialization
        attacks: [...enemyTemplate.attacks],
        isPlayer: false
      };
      
      enemies.push(enemy);
    }
    
    return enemies;
  }
} 