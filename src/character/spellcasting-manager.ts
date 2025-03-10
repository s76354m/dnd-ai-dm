/**
 * Spellcasting Manager
 * 
 * Manages character spellcasting, including spell slots, prepared spells,
 * and spell effects. Integrates with the combat system for spell casting.
 */

import { Character } from '../core/interfaces/character';
import { Spell } from '../core/interfaces/spell';
import { CombatSpell, SpellEffectManager, SpellCastResult } from '../combat/spell-effects';
import { v4 as uuidv4 } from 'uuid';

/**
 * Structure for tracking spell slot usage
 */
export interface SpellSlotState {
  max: number;
  used: number;
}

/**
 * Structure for tracking prepared spells
 */
export interface PreparedSpell {
  spell: Spell;
  prepared: boolean;
}

/**
 * Class to manage character spellcasting
 */
export class SpellcastingManager {
  private spellEffectManager: SpellEffectManager;
  private characterSpells: Map<string, Map<string, PreparedSpell>> = new Map();
  private spellSlots: Map<string, Map<number, SpellSlotState>> = new Map();
  private spellData: Map<string, Spell> = new Map();
  
  constructor(spellEffectManager: SpellEffectManager) {
    this.spellEffectManager = spellEffectManager;
    this.loadSpellData();
  }
  
  /**
   * Load spell data from sources
   * @private
   */
  private loadSpellData(): void {
    try {
      // Load from file, API, or embedded data
      // For now, we'll initialize some example spells
      this.initializeBasicSpells();
      console.log(`Loaded ${this.spellData.size} spells`);
    } catch (error) {
      console.error('Error loading spell data:', error);
    }
  }
  
  /**
   * Initialize basic spell data
   * @private
   */
  private initializeBasicSpells(): void {
    // Sample spells for testing
    const basicSpells: Spell[] = [
      {
        name: 'Magic Missile',
        level: 1,
        school: 'Evocation',
        castingTime: '1 action',
        range: '120 feet',
        components: ['V', 'S'],
        duration: 'Instantaneous',
        description: 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4+1 force damage to its target.'
      },
      {
        name: 'Cure Wounds',
        level: 1,
        school: 'Evocation',
        castingTime: '1 action',
        range: 'Touch',
        components: ['V', 'S'],
        duration: 'Instantaneous',
        description: 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.'
      },
      {
        name: 'Burning Hands',
        level: 1,
        school: 'Evocation',
        castingTime: '1 action',
        range: 'Self (15-foot cone)',
        components: ['V', 'S'],
        duration: 'Instantaneous',
        description: 'As you hold your hands with thumbs touching and fingers spread, a thin sheet of flames shoots forth from your outstretched fingertips. Each creature in a 15-foot cone must make a Dexterity saving throw. A creature takes 3d6 fire damage on a failed save, or half as much damage on a successful one.'
      },
      {
        name: 'Fireball',
        level: 3,
        school: 'Evocation',
        castingTime: '1 action',
        range: '150 feet',
        components: ['V', 'S', 'M'],
        duration: 'Instantaneous',
        description: 'A bright streak flashes from your pointing finger to a point you choose within range and then blossoms with a low roar into an explosion of flame. Each creature in a 20-foot-radius sphere centered on that point must make a Dexterity saving throw. A target takes 8d6 fire damage on a failed save, or half as much damage on a successful one.'
      },
      {
        name: 'Shield',
        level: 1,
        school: 'Abjuration',
        castingTime: '1 reaction',
        range: 'Self',
        components: ['V', 'S'],
        duration: '1 round',
        description: 'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.'
      },
      {
        name: 'Counterspell',
        level: 3,
        school: 'Abjuration',
        castingTime: '1 reaction',
        range: '60 feet',
        components: ['S'],
        duration: 'Instantaneous',
        description: 'You attempt to interrupt a creature in the process of casting a spell. If the creature is casting a spell of 3rd level or lower, its spell fails and has no effect. If it is casting a spell of 4th level or higher, make an ability check using your spellcasting ability. The DC equals 10 + the spell\'s level. On a success, the creature\'s spell fails and has no effect.'
      }
    ];
    
    // Store in spell data map
    basicSpells.forEach(spell => {
      this.spellData.set(spell.name.toLowerCase(), spell);
    });
  }
  
  /**
   * Initialize a character's spellcasting 
   * @param characterId Character identifier
   * @param maxSlots Maximum spell slots by level
   * @param knownSpellNames Names of known spells
   * @param isPreparedCaster Whether the character is a prepared spellcaster
   */
  public initializeCharacterSpells(
    characterId: string,
    maxSlots: { [level: number]: number },
    knownSpellNames: string[],
    isPreparedCaster: boolean
  ): void {
    // Initialize spell slots
    const slotMap = new Map<number, SpellSlotState>();
    Object.entries(maxSlots).forEach(([level, max]) => {
      slotMap.set(parseInt(level), { max, used: 0 });
    });
    this.spellSlots.set(characterId, slotMap);
    
    // Initialize spells
    const spellMap = new Map<string, PreparedSpell>();
    knownSpellNames.forEach(spellName => {
      const spell = this.spellData.get(spellName.toLowerCase());
      if (spell) {
        spellMap.set(spellName.toLowerCase(), {
          spell,
          prepared: !isPreparedCaster // Auto-prepare if not a prepared caster
        });
      }
    });
    this.characterSpells.set(characterId, spellMap);
  }
  
  /**
   * Prepare or unprepare a spell
   * @param characterId Character identifier
   * @param spellName Name of the spell
   * @param prepare Whether to prepare or unprepare
   */
  public prepareSpell(characterId: string, spellName: string, prepare: boolean): boolean {
    const characterSpellMap = this.characterSpells.get(characterId);
    if (!characterSpellMap) return false;
    
    const spellEntry = characterSpellMap.get(spellName.toLowerCase());
    if (!spellEntry) return false;
    
    spellEntry.prepared = prepare;
    return true;
  }
  
  /**
   * Get all spells known by a character
   * @param characterId Character identifier
   */
  public getKnownSpells(characterId: string): Spell[] {
    const characterSpellMap = this.characterSpells.get(characterId);
    if (!characterSpellMap) return [];
    
    return Array.from(characterSpellMap.values()).map(entry => entry.spell);
  }
  
  /**
   * Get prepared spells for a character
   * @param characterId Character identifier
   */
  public getPreparedSpells(characterId: string): Spell[] {
    const characterSpellMap = this.characterSpells.get(characterId);
    if (!characterSpellMap) return [];
    
    return Array.from(characterSpellMap.values())
      .filter(entry => entry.prepared)
      .map(entry => entry.spell);
  }
  
  /**
   * Get available spell slots for a character
   * @param characterId Character identifier
   */
  public getSpellSlots(characterId: string): Map<number, SpellSlotState> | undefined {
    return this.spellSlots.get(characterId);
  }
  
  /**
   * Use a spell slot
   * @param characterId Character identifier
   * @param level Spell slot level
   */
  public useSpellSlot(characterId: string, level: number): boolean {
    const slotMap = this.spellSlots.get(characterId);
    if (!slotMap) return false;
    
    const slotState = slotMap.get(level);
    if (!slotState || slotState.used >= slotState.max) return false;
    
    slotState.used++;
    return true;
  }
  
  /**
   * Restore spell slots (e.g., after a long rest)
   * @param characterId Character identifier
   * @param levels Specific levels to restore (all if not specified)
   * @param amount Amount to restore (all if not specified)
   */
  public restoreSpellSlots(
    characterId: string,
    levels?: number[],
    amount?: number
  ): boolean {
    const slotMap = this.spellSlots.get(characterId);
    if (!slotMap) return false;
    
    if (!levels) {
      // Restore all spell slots
      slotMap.forEach(slotState => {
        slotState.used = 0;
      });
      return true;
    }
    
    // Restore specific levels
    levels.forEach(level => {
      const slotState = slotMap.get(level);
      if (slotState) {
        if (amount) {
          slotState.used = Math.max(0, slotState.used - amount);
        } else {
          slotState.used = 0;
        }
      }
    });
    
    return true;
  }
  
  /**
   * Learn a spell for a character
   * @param characterId Character identifier
   * @param spellName Name of the spell to learn
   * @param autoPreparе Whether to automatically prepare the spell
   */
  public learnSpell(characterId: string, spellName: string, autoPreparе: boolean = false): boolean {
    const spell = this.spellData.get(spellName.toLowerCase());
    if (!spell) {
      console.error(`Spell not found: ${spellName}`);
      return false;
    }
    
    let characterSpellMap = this.characterSpells.get(characterId);
    if (!characterSpellMap) {
      characterSpellMap = new Map<string, PreparedSpell>();
      this.characterSpells.set(characterId, characterSpellMap);
    }
    
    characterSpellMap.set(spellName.toLowerCase(), {
      spell,
      prepared: autoPreparе
    });
    
    return true;
  }
  
  /**
   * Cast a spell in combat
   * @param characterId Character identifier
   * @param spellName Name of the spell to cast
   * @param spellLevel Level at which to cast the spell
   * @param targets Target identifiers
   * @param targetPosition Position for area spells
   */
  public castSpell(
    characterId: string,
    spellName: string,
    spellLevel: number,
    targets: string[],
    targetPosition?: { x: number, y: number }
  ): { success: boolean, message: string, result?: SpellCastResult } {
    // Check if character knows the spell
    const characterSpellMap = this.characterSpells.get(characterId);
    if (!characterSpellMap) {
      return { success: false, message: 'Character not found' };
    }
    
    const spellEntry = characterSpellMap.get(spellName.toLowerCase());
    if (!spellEntry) {
      return { success: false, message: 'Spell not known' };
    }
    
    if (!spellEntry.prepared) {
      return { success: false, message: 'Spell not prepared' };
    }
    
    const spell = spellEntry.spell;
    
    // Check and use spell slot
    if (spell.level > 0) { // Cantrips don't use spell slots
      // Allow casting at a higher level
      const actualLevel = Math.max(spell.level, spellLevel);
      
      if (!this.useSpellSlot(characterId, actualLevel)) {
        return { success: false, message: `No available spell slots of level ${actualLevel}` };
      }
    }
    
    // Get combat spell from effect manager
    const combatSpell = this.spellEffectManager.getSpell(spellName.toLowerCase());
    if (!combatSpell) {
      return { success: false, message: 'Spell effect not implemented' };
    }
    
    // Cast the spell using the SpellEffectManager
    // This would require integration with combat system
    // For now, this is a placeholder
    
    return {
      success: true,
      message: `Successfully cast ${spellName}`,
      result: {
        success: true,
        message: `${spellName} was cast successfully`,
        targets: targets,
        appliedEffects: []
      }
    };
  }
  
  /**
   * Get all available spells in the system
   */
  public getAllSpells(): Spell[] {
    return Array.from(this.spellData.values());
  }
  
  /**
   * Get spells filtered by level
   * @param level Spell level
   */
  public getSpellsByLevel(level: number): Spell[] {
    return Array.from(this.spellData.values()).filter(spell => spell.level === level);
  }
  
  /**
   * Get a specific spell by name
   * @param spellName Name of the spell
   */
  public getSpellByName(spellName: string): Spell | undefined {
    return this.spellData.get(spellName.toLowerCase());
  }
}

/**
 * Create a spellcasting manager instance
 * @param spellEffectManager Spell effect manager
 */
export const createSpellcastingManager = (spellEffectManager: SpellEffectManager) => {
  return new SpellcastingManager(spellEffectManager);
}; 