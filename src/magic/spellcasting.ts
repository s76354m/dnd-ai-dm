/**
 * Spellcasting System
 * 
 * This file provides the core functionality for casting spells and managing spell slots
 * in the D&D AI DM system. It interfaces between characters, spells, and game state.
 */

import { Spell, SpellEffect, calculateSpellSaveDC, calculateSpellAttackBonus } from './spell';
import { SpellRegistry } from './spell';

/**
 * Interface for spell slot tracking
 */
export interface SpellSlots {
  // Maximum slots per level (index 0 = cantrips, which don't use slots)
  max: number[];
  // Currently available slots per level
  current: number[];
}

/**
 * Interface for character spellbook
 */
export interface Spellbook {
  // Spells known/prepared by the character
  knownSpells: Spell[];
  // Slots available for casting
  slots: SpellSlots;
  // The ability used for spellcasting (Intelligence, Wisdom, Charisma)
  spellcastingAbility: string;
}

/**
 * The result of a spell casting attempt
 */
export interface SpellCastingResult {
  success: boolean;
  message: string;
  effectResults?: any[];
  targetEffects?: Map<string, any[]>;
}

/**
 * Class managing spellcasting for characters
 */
export class SpellcastingManager {
  private character: any;
  private registry: SpellRegistry;

  constructor(character: any) {
    this.character = character;
    this.registry = SpellRegistry.getInstance();
  }

  /**
   * Cast a spell by name at a specific level
   */
  public castSpell(spellName: string, level: number, targets: any[]): SpellCastingResult {
    // Find the spell
    const spell = this.findSpellByName(spellName);
    if (!spell) {
      return {
        success: false,
        message: `You don't know the spell "${spellName}".`
      };
    }

    // Check if the spell can be cast at the requested level
    if (level < spell.level) {
      return {
        success: false,
        message: `You cannot cast ${spellName} at a level lower than ${spell.level}.`
      };
    }

    // For non-cantrips, check if the character has a spell slot available
    if (spell.level > 0) {
      if (!this.hasSpellSlotAvailable(level)) {
        return {
          success: false,
          message: `You don't have any level ${level} spell slots remaining.`
        };
      }
      
      // Use a spell slot
      this.useSpellSlot(level);
    }

    // Check if spell requires concentration and handle it
    if (spell.concentration) {
      this.breakConcentration();
      this.character.concentratingOn = spell.name;
    }

    // Apply spell effects to targets
    const targetEffects = new Map<string, any[]>();
    const effectResults = [];
    
    for (const target of targets) {
      // Skip invalid targets
      if (!target) continue;
      
      const effects = [];
      
      // Apply each effect of the spell
      for (const effect of spell.effects) {
        const result = this.applySpellEffect(effect, target, level);
        effects.push(result);
        effectResults.push(result);
      }
      
      targetEffects.set(target.id || target.name, effects);
    }

    // Generate success message
    return {
      success: true,
      message: `${this.character.name} casts ${spell.name}${level > spell.level ? ` at level ${level}` : ''}.`,
      effectResults,
      targetEffects
    };
  }

  /**
   * Find a spell the character knows by name
   */
  private findSpellByName(name: string): Spell | undefined {
    // First check if character knows this spell
    if (this.character.spellbook?.knownSpells) {
      const knownSpell = this.character.spellbook.knownSpells.find(
        (spell: Spell) => spell?.name?.toLowerCase() === name.toLowerCase()
      );
      
      if (knownSpell) {
        return knownSpell;
      }
    }
    
    // If not found in character's spellbook, try to find it in registry
    // (This is a fallback for testing and NPCs)
    return this.registry.getSpellByName(name);
  }

  /**
   * Check if the character has a spell slot of the specified level available
   */
  private hasSpellSlotAvailable(level: number): boolean {
    if (!this.character.spellbook?.slots) {
      return false;
    }
    
    return (
      level < this.character.spellbook.slots.current.length &&
      this.character.spellbook.slots.current[level] > 0
    );
  }

  /**
   * Use a spell slot of the specified level
   */
  private useSpellSlot(level: number): void {
    if (this.hasSpellSlotAvailable(level)) {
      this.character.spellbook.slots.current[level]--;
    }
  }

  /**
   * Break the character's concentration on any current spell
   */
  private breakConcentration(): void {
    if (this.character.concentratingOn) {
      console.log(`${this.character.name} breaks concentration on ${this.character.concentratingOn}.`);
      this.character.concentratingOn = null;
    }
  }

  /**
   * Apply a spell effect to a target
   */
  private applySpellEffect(effect: SpellEffect, target: any, level: number): any {
    return effect.apply(target, this.character, level);
  }

  /**
   * Get the spell save DC for this character
   */
  public getSpellSaveDC(): number {
    if (!this.character.spellbook?.spellcastingAbility) {
      return 10; // Default for NPCs without ability scores
    }
    
    const abilityKey = this.character.spellbook.spellcastingAbility.toLowerCase();
    const abilityScore = this.character.abilityScores?.[abilityKey]?.score || 10;
    
    return calculateSpellSaveDC(
      abilityScore,
      this.character.proficiencyBonus || 2
    );
  }

  /**
   * Get the spell attack bonus for this character
   */
  public getSpellAttackBonus(): number {
    if (!this.character.spellbook?.spellcastingAbility) {
      return 0; // Default for NPCs without ability scores
    }
    
    const abilityKey = this.character.spellbook.spellcastingAbility.toLowerCase();
    const abilityScore = this.character.abilityScores?.[abilityKey]?.score || 10;
    
    return calculateSpellAttackBonus(
      abilityScore,
      this.character.proficiencyBonus || 2
    );
  }

  /**
   * Reset spell slots after a rest
   * @param longRest - true for long rest, false for short rest
   */
  public resetSpellSlots(longRest: boolean): void {
    if (!this.character.spellbook?.slots) {
      return;
    }
    
    if (longRest) {
      // Long rest: reset all spell slots
      for (let i = 1; i < this.character.spellbook.slots.current.length; i++) {
        this.character.spellbook.slots.current[i] = this.character.spellbook.slots.max[i];
      }
    } else {
      // Short rest: certain classes regain some spell slots
      // For example, Warlocks regain all spell slots on a short rest
      const className = this.character.class?.name?.toLowerCase();
      if (className === 'warlock') {
        for (let i = 1; i < this.character.spellbook.slots.current.length; i++) {
          this.character.spellbook.slots.current[i] = this.character.spellbook.slots.max[i];
        }
      }
    }
  }

  /**
   * Initialize a character's spell slots based on their class and level
   */
  public static initializeSpellSlots(character: any): SpellSlots {
    // Default to all zeros
    const slots: SpellSlots = {
      max: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      current: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    };
    
    if (!character.class?.name) {
      return slots;
    }
    
    const className = character.class.name.toLowerCase();
    const level = character.level || 1;
    
    // Reference standard spell slot table from D&D 5e
    // This is per the Player's Handbook spell slot progression

    // Full casters: bard, cleric, druid, sorcerer, wizard
    if (['bard', 'cleric', 'druid', 'sorcerer', 'wizard'].includes(className)) {
      if (level >= 1) {
        slots.max[1] = 2;
      }
      if (level >= 2) {
        slots.max[1] = 3;
      }
      if (level >= 3) {
        slots.max[1] = 4;
        slots.max[2] = 2;
      }
      if (level >= 4) {
        slots.max[1] = 4;
        slots.max[2] = 3;
      }
      if (level >= 5) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 2;
      }
      if (level >= 6) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
      }
      if (level >= 7) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 1;
      }
      if (level >= 8) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 2;
      }
      if (level >= 9) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 3;
        slots.max[5] = 1;
      }
      if (level >= 10) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 3;
        slots.max[5] = 2;
      }
      if (level >= 11) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 3;
        slots.max[5] = 2;
        slots.max[6] = 1;
      }
      if (level >= 13) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 3;
        slots.max[5] = 2;
        slots.max[6] = 1;
        slots.max[7] = 1;
      }
      if (level >= 15) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 3;
        slots.max[5] = 2;
        slots.max[6] = 1;
        slots.max[7] = 1;
        slots.max[8] = 1;
      }
      if (level >= 17) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 3;
        slots.max[5] = 2;
        slots.max[6] = 1;
        slots.max[7] = 1;
        slots.max[8] = 1;
        slots.max[9] = 1;
      }
      if (level >= 18) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 3;
        slots.max[5] = 3;
        slots.max[6] = 1;
        slots.max[7] = 1;
        slots.max[8] = 1;
        slots.max[9] = 1;
      }
      if (level >= 19) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 3;
        slots.max[5] = 3;
        slots.max[6] = 2;
        slots.max[7] = 1;
        slots.max[8] = 1;
        slots.max[9] = 1;
      }
      if (level >= 20) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 3;
        slots.max[5] = 3;
        slots.max[6] = 2;
        slots.max[7] = 2;
        slots.max[8] = 1;
        slots.max[9] = 1;
      }
    }
    
    // Half casters: paladin, ranger
    else if (['paladin', 'ranger'].includes(className)) {
      // Half casters start getting spell slots at level 2
      if (level >= 2) {
        slots.max[1] = 2;
      }
      if (level >= 3) {
        slots.max[1] = 3;
      }
      if (level >= 5) {
        slots.max[1] = 4;
        slots.max[2] = 2;
      }
      if (level >= 7) {
        slots.max[1] = 4;
        slots.max[2] = 3;
      }
      if (level >= 9) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 2;
      }
      if (level >= 11) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
      }
      if (level >= 13) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 1;
      }
      if (level >= 15) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 2;
      }
      if (level >= 17) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 3;
        slots.max[5] = 1;
      }
      if (level >= 19) {
        slots.max[1] = 4;
        slots.max[2] = 3;
        slots.max[3] = 3;
        slots.max[4] = 3;
        slots.max[5] = 2;
      }
    }
    
    // Special case: Warlock
    else if (className === 'warlock') {
      // Warlocks have a different progression with fewer slots that recover on a short rest
      // Note: Warlocks use the same slot level for all spells
      if (level >= 1) {
        slots.max[1] = 1;
      }
      if (level >= 2) {
        slots.max[1] = 2;
      }
      if (level >= 11) {
        slots.max[1] = 0;
        slots.max[5] = 3;
      }
      if (level >= 17) {
        slots.max[1] = 0;
        slots.max[5] = 0;
        slots.max[7] = 4;
      }
      // Fix for levels 5-10, where they cast using 3rd level slots
      if (level >= 5 && level < 11) {
        slots.max[1] = 0;
        slots.max[3] = 2;
      }
      // For level 11-16, they cast using 5th level slots
      if (level >= 11 && level < 17) {
        slots.max[3] = 0;
        slots.max[5] = 3;
      }
    }
    
    // Initialize current slots to max
    for (let i = 0; i < slots.max.length; i++) {
      slots.current[i] = slots.max[i];
    }
    
    return slots;
  }

  /**
   * Get available spell slots as a formatted string
   */
  public getSpellSlotsString(): string {
    if (!this.character.spellbook?.slots) {
      return "No spell slots available";
    }
    
    const slots = this.character.spellbook.slots;
    const slotStrings = [];
    
    for (let i = 1; i < slots.current.length; i++) {
      if (slots.max[i] > 0) {
        slotStrings.push(`Level ${i}: ${slots.current[i]}/${slots.max[i]}`);
      }
    }
    
    return slotStrings.join(', ');
  }
}

/**
 * Create a simple spellbook for a character
 */
export function createSpellbook(character: any, spellcastingAbility: string = 'intelligence'): Spellbook {
  const slots = SpellcastingManager.initializeSpellSlots(character);
  
  return {
    knownSpells: [],
    slots,
    spellcastingAbility
  };
}

/**
 * Handle concentration checks when a character takes damage
 * @returns true if concentration is maintained, false if it's broken
 */
export function performConcentrationCheck(character: any, damageAmount: number): boolean {
  if (!character.concentratingOn) {
    return true; // Not concentrating, so no check needed
  }
  
  // Calculate DC (minimum 10, or half the damage taken, whichever is higher)
  const concentrationDC = Math.max(10, Math.floor(damageAmount / 2));
  
  // Roll a Constitution saving throw
  const constitutionMod = character.abilityScores?.constitution?.modifier || 0;
  const concentrationBonus = character.hasFeature?.('War Caster') ? 5 : 0; // War Caster feat gives advantage, simulated as +5
  
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + constitutionMod + concentrationBonus;
  
  if (total >= concentrationDC) {
    return true; // Concentration maintained
  } else {
    // Concentration broken
    character.concentratingOn = null;
    return false;
  }
} 