/**
 * Spell Command Interpreter
 * 
 * This module handles the interpretation of natural language commands related to spellcasting.
 * It parses player input to identify spell names, targets, and spell levels for casting.
 */

import { SpellRegistry } from './spell';
import { SpellcastingManager, SpellCastingResult } from './spellcasting';
import { Character } from '../character/character';

/**
 * Class that interprets spell casting commands
 */
export class SpellCommandInterpreter {
  private character: Character;
  private spellcastingManager: SpellcastingManager;
  private registry: SpellRegistry;
  private gameState: any; // Ideally, this would be a properly typed GameState

  constructor(character: Character, gameState: any) {
    this.character = character;
    this.spellcastingManager = new SpellcastingManager(character);
    this.registry = SpellRegistry.getInstance();
    this.gameState = gameState;
  }

  /**
   * Process a spell casting command
   * @param command The natural language command from the player
   * @returns The result of the attempted spell casting
   */
  public processCommand(command: string): SpellCastingResult {
    // Convert to lowercase for easier matching
    const lowerCommand = command.toLowerCase();
    
    // Check if this is a spell-related command
    if (!this.isSpellCommand(lowerCommand)) {
      return {
        success: false,
        message: "That doesn't seem to be a spell casting command."
      };
    }

    // Extract the spell name from the command
    const spellName = this.extractSpellName(lowerCommand);
    if (!spellName) {
      return {
        success: false,
        message: "I couldn't identify which spell you want to cast. Try 'cast [spell name]'."
      };
    }

    // Check if the spell exists
    const spell = this.registry.getSpellByName(spellName);
    if (!spell) {
      return {
        success: false,
        message: `I couldn't find a spell named "${spellName}". Please check the spelling or try another spell.`
      };
    }

    // Extract the spell level if provided (for upcasting)
    const level = this.extractSpellLevel(lowerCommand, spell.level);

    // Extract targets from the command
    const targets = this.extractTargets(lowerCommand);
    if (targets.length === 0) {
      return {
        success: false,
        message: `Casting ${spellName} requires a target. Try 'cast ${spellName} at [target]'.`
      };
    }

    // Cast the spell with extracted parameters
    return this.spellcastingManager.castSpell(spellName, level, targets);
  }

  /**
   * Check if a command is related to spellcasting
   */
  private isSpellCommand(command: string): boolean {
    const spellKeywords = ['cast', 'use', 'spell', 'magic', 'cast a spell', 'use magic'];
    return spellKeywords.some(keyword => command.includes(keyword));
  }

  /**
   * Extract the spell name from a command
   */
  private extractSpellName(command: string): string | null {
    // Get all available spell names for matching
    const allSpells = this.registry.getAllSpells().map(spell => spell.name.toLowerCase());
    
    // Find the first spell name that appears in the command
    for (const spellName of allSpells) {
      if (command.includes(spellName)) {
        return spellName;
      }
    }

    // If no direct match, try to find keywords after "cast" or "use"
    const castMatch = command.match(/cast\s+(?:a\s+|the\s+)?([a-z\s]+)(?:at|on|to)/i);
    if (castMatch && castMatch[1]) {
      const potentialSpell = castMatch[1].trim();
      
      // Find the closest matching spell
      const closestMatch = this.findClosestSpellMatch(potentialSpell);
      if (closestMatch) {
        return closestMatch;
      }
    }

    return null;
  }

  /**
   * Find the closest matching spell name for a given input
   */
  private findClosestSpellMatch(input: string): string | null {
    const allSpells = this.registry.getAllSpells();
    
    // Simple fuzzy matching - find a spell that contains all the words from input
    const inputWords = input.toLowerCase().split(/\s+/);
    
    for (const spell of allSpells) {
      const spellName = spell.name.toLowerCase();
      if (inputWords.every(word => spellName.includes(word))) {
        return spell.name.toLowerCase();
      }
    }
    
    // If no match by all words, try to find a spell that contains most of the words
    for (const spell of allSpells) {
      const spellName = spell.name.toLowerCase();
      const matchCount = inputWords.filter(word => spellName.includes(word)).length;
      
      // If more than half the words match, consider it a match
      if (matchCount > inputWords.length / 2) {
        return spell.name.toLowerCase();
      }
    }
    
    return null;
  }

  /**
   * Extract the spell level for upcasting from a command
   */
  private extractSpellLevel(command: string, defaultLevel: number): number {
    // Check for "at level X" or "as a level X spell" patterns
    const levelMatch = command.match(/(?:at|as)\s+(?:a\s+)?(?:level|lvl)\s+(\d+)/i);
    if (levelMatch && levelMatch[1]) {
      const level = parseInt(levelMatch[1], 10);
      return isNaN(level) ? defaultLevel : level;
    }
    
    // Check for "using a Xth level slot" pattern
    const slotMatch = command.match(/using\s+(?:a\s+)?(\d+)(?:st|nd|rd|th)\s+level\s+slot/i);
    if (slotMatch && slotMatch[1]) {
      const level = parseInt(slotMatch[1], 10);
      return isNaN(level) ? defaultLevel : level;
    }
    
    return defaultLevel;
  }

  /**
   * Extract targets from a command
   */
  private extractTargets(command: string): any[] {
    const targets = [];
    
    // Extract target names after "at", "on", or "targeting"
    const targetMatch = command.match(/(?:at|on|targeting)\s+(?:the\s+)?([a-z\s,]+)(?:\.|\s|$)/i);
    if (targetMatch && targetMatch[1]) {
      // Split by commas and "and" to get multiple targets
      const targetNames = targetMatch[1].split(/,|\sand\s/).map(name => name.trim());
      
      // For each potential target name, find matching entities in the game state
      for (const name of targetNames) {
        const target = this.findTargetInGameState(name);
        if (target) {
          targets.push(target);
        }
      }
    }
    
    // If no specific targets found and we're in combat, try to target the nearest enemy
    if (targets.length === 0 && this.gameState.inCombat && this.gameState.enemies?.length > 0) {
      targets.push(this.gameState.enemies[0]);
    }
    
    return targets;
  }

  /**
   * Find a target in the game state by name
   */
  private findTargetInGameState(targetName: string): any | null {
    // Check for nearby NPCs
    if (this.gameState.npcs) {
      for (const npc of this.gameState.npcs) {
        if (npc.name.toLowerCase().includes(targetName.toLowerCase())) {
          return npc;
        }
      }
    }
    
    // Check for enemies in combat
    if (this.gameState.enemies) {
      for (const enemy of this.gameState.enemies) {
        if (enemy.name.toLowerCase().includes(targetName.toLowerCase())) {
          return enemy;
        }
      }
    }
    
    // Check for objects in the environment
    if (this.gameState.environment?.objects) {
      for (const object of this.gameState.environment.objects) {
        if (object.name.toLowerCase().includes(targetName.toLowerCase())) {
          return object;
        }
      }
    }
    
    // If no matches found but we're targeting "self", return the character
    if (["me", "myself", "self"].includes(targetName.toLowerCase())) {
      return this.character;
    }
    
    return null;
  }

  /**
   * Get a list of available spells that the character can cast
   */
  public getAvailableSpells(): string[] {
    if (!this.character.spellbook?.knownSpells) {
      return [];
    }
    
    return this.character.spellbook.knownSpells.map(spell => {
      const levelText = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
      return `${spell.name} (${levelText})`;
    });
  }

  /**
   * Get an overview of character's spellcasting capabilities
   */
  public getSpellcastingOverview(): string {
    if (!this.character.spellbook) {
      return `${this.character.name} cannot cast spells.`;
    }
    
    const spellsByLevel: { [key: string]: string[] } = {};
    
    // Group spells by level
    for (const spell of this.character.spellbook.knownSpells) {
      const levelKey = spell.level === 0 ? 'Cantrips' : `Level ${spell.level}`;
      if (!spellsByLevel[levelKey]) {
        spellsByLevel[levelKey] = [];
      }
      spellsByLevel[levelKey].push(spell.name);
    }
    
    // Format the output
    let output = `${this.character.name}'s Spellcasting:\n`;
    output += `Spellcasting Ability: ${this.character.spellbook.spellcastingAbility}\n`;
    output += `Spell Save DC: ${this.character.spellSaveDC}\n`;
    output += `Spell Attack Bonus: +${this.character.spellAttackBonus}\n`;
    output += `Available Spell Slots: ${this.spellcastingManager.getSpellSlotsString()}\n\n`;
    
    // Add spells by level
    for (const [level, spells] of Object.entries(spellsByLevel)) {
      output += `${level}: ${spells.join(', ')}\n`;
    }
    
    return output;
  }
} 