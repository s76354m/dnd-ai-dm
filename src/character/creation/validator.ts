// src/character/creation/validator.ts

import { Character, AbilityScores } from '../../core/interfaces';
import type { Race, Class, Background } from '../../core/types';
import { races } from '../data/races';
import { classes } from '../data/classes';
import { backgrounds } from '../data/backgrounds';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export class CharacterValidator {
  /**
   * Validate the entire character
   */
  public static validateCharacter(character: Partial<Character>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    this.validateRequiredFields(character, errors);

    // Ability scores
    if (character.abilityScores) {
      this.validateAbilityScores(character.abilityScores, errors);
    }

    // Race-specific validation
    if (character.race) {
      this.validateRaceFeatures(character, errors);
    }

    // Class-specific validation
    if (character.class) {
      this.validateClassFeatures(character, errors);
    }

    // Background-specific validation
    if (character.background) {
      this.validateBackgroundFeatures(character, errors);
    }

    // Skills validation
    if (character.proficiencies?.skills) {
      this.validateSkills(character, errors);
    }

    // Equipment validation
    if (character.inventory) {
      this.validateEquipment(character, errors, warnings);
    }

    // Spells validation
    if (this.hasSpellcasting(character)) {
      this.validateSpells(character, errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate skills
   */
  private static validateSkills(
    character: Partial<Character>,
    errors: ValidationError[]
  ): void {
    const characterClass = character.class as Class;
    const background = character.background as Background;
    const classData = classes[characterClass];
    const backgroundData = backgrounds[background];

    if (!character.proficiencies?.skills) {
      errors.push({
        field: 'proficiencies.skills',
        message: 'Skills are required',
        code: 'MISSING_SKILLS'
      });
      return;
    }

    // Validate number of skills
    const expectedSkillCount = (classData.proficiencies.skills.number || 0) +
      (backgroundData?.skillProficiencies?.length || 0);

    if (character.proficiencies.skills.length !== expectedSkillCount) {
      errors.push({
        field: 'proficiencies.skills',
        message: `Character should have exactly ${expectedSkillCount} skill proficiencies`,
        code: 'INVALID_SKILL_COUNT'
      });
    }

    // Validate background skills
    const characterSkillNames = (character.proficiencies.skills || []).map(s => typeof s === 'string' ? s : s.name);
    for (const skill of backgroundData?.skillProficiencies ?? []) {
      if (!characterSkillNames.includes(skill)) {
        errors.push({
          field: 'proficiencies.skills',
          message: `Missing background skill proficiency: ${skill}`,
          code: 'MISSING_BACKGROUND_SKILL'
        });
      }
    }

    // Convert all skills to strings
    const skillNames = (character.proficiencies.skills || []).map(s => typeof s === 'string' ? s : s.name);

    // Filter skills that are not part of the background skill proficiencies
    const nonBackgroundSkills = skillNames.filter(
      skillName => !backgroundData?.skillProficiencies?.includes(skillName)
    );

    for (const skill of nonBackgroundSkills) {
      if (!classData.proficiencies.skills.choices.includes(skill)) {
        errors.push({
          field: 'proficiencies.skills',
          message: `Invalid class skill proficiency: ${skill}`,
          code: 'INVALID_CLASS_SKILL'
        });
      }
    }
  }

  /**
   * Validate equipment
   */
  private static validateEquipment(
    character: Partial<Character>,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const characterClass = character.class as Class;
    const background = character.background as Background;
    const classData = classes[characterClass];
    const backgroundData = backgrounds[background];

    if (!character.inventory) {
      errors.push({
        field: 'inventory',
        message: 'Equipment is required',
        code: 'MISSING_EQUIPMENT'
      });
      return;
    }

    // Validate starting equipment
    for (const item of backgroundData?.equipment?.mandatory ?? []) {
      if (!character.inventory.some(equipment => equipment.name === item)) {
        errors.push({
          field: 'inventory',
          message: `Missing background equipment: ${item}`,
          code: 'MISSING_BACKGROUND_EQUIPMENT'
        });
      }
    }

    // Check for class equipment options
    let hasRequiredClassEquipment = false;
    for (const option of classData.startingEquipment.options) {
      if (this.hasEquipmentOption(character.inventory, option.from)) {
        hasRequiredClassEquipment = true;
        break;
      }
    }

    if (!hasRequiredClassEquipment) {
      errors.push({
        field: 'inventory',
        message: 'Missing required class equipment option',
        code: 'MISSING_CLASS_EQUIPMENT'
      });
    }

    // Validate armor class
    this.validateArmorClass(character, errors);
  }

  /**
   * Validate spells
   */
  private static validateSpells(
    character: Partial<Character>,
    errors: ValidationError[]
  ): void {
    const characterClass = character.class as Class;
    const classData = classes[characterClass];

    if (!classData.spellcasting) {
      return;
    }

    if (!character.spells) {
      errors.push({
        field: 'spells',
        message: 'Spells are required for spellcasting classes',
        code: 'MISSING_SPELLS'
      });
      return;
    }

    const level = character.level || 1;
    const spellcasting = classData.spellcasting;

    // Validate cantrips
    if (spellcasting.cantripsKnown) {
      const expectedCantrips = spellcasting.cantripsKnown[level - 1];
      const actualCantrips = character.spells.filter(spell => spell.level === 0).length;

      if (actualCantrips !== expectedCantrips) {
        errors.push({
          field: 'spells',
          message: `Character should know ${expectedCantrips} cantrips`,
          code: 'INVALID_CANTRIP_COUNT'
        });
      }
    }

    // Validate spells known/prepared
    if (spellcasting.spellsKnown) {
      const expectedSpells = spellcasting.spellsKnown[level - 1];
      const actualSpells = character.spells.filter(spell => spell.level > 0).length;

      if (actualSpells !== expectedSpells) {
        errors.push({
          field: 'spells',
          message: `Character should know ${expectedSpells} spells`,
          code: 'INVALID_SPELL_COUNT'
        });
      }
    }
  }

  /**
   * Helper methods
   */
  private static hasSpellcasting(character: Partial<Character>): boolean {
    const characterClass = character.class as Class;
    const classData = classes[characterClass];
    return !!classData?.spellcasting;
  }

  private static getMaxHitDieValue(hitDie: string): number {
    return parseInt(hitDie.replace('d', ''));
  }

  private static hasEquipmentOption(
    inventory: { name: string }[],
    options: string[][]
  ): boolean {
    return options.some(option =>
      option.every(item =>
        inventory.some(equipment => equipment.name === item)
      )
    );
  }

  private static validateArmorClass(
    character: Partial<Character>,
    errors: ValidationError[]
  ): void {
    if (!character.armorClass) {
      errors.push({
        field: 'armorClass',
        message: 'Armor Class is required',
        code: 'MISSING_ARMOR_CLASS'
      });
      return;
    }

    // Calculate expected AC based on equipment and ability scores
    let baseAC = 10;
    const dexModifier = Math.floor((character.abilityScores?.dexterity || 10 - 10) / 2);

    // Add armor bonus if wearing armor
    const armor = character.inventory?.find(item =>
      item.name.toLowerCase().includes('armor') && item.isEquipped
    );

    if (armor) {
      // Calculate AC based on armor type
      // This is a simplified example - would need full armor data
      baseAC = 12; // Light armor base
    } else {
      baseAC += dexModifier;
    }

    // Add shield bonus
    const hasShield = character.inventory?.some(item =>
      item.name.toLowerCase().includes('shield') && item.isEquipped
    );

    if (hasShield) {
      baseAC += 2;
    }

    if (character.armorClass !== baseAC) {
      errors.push({
        field: 'armorClass',
        message: 'Armor Class calculation is incorrect',
        code: 'INVALID_ARMOR_CLASS'
      });
    }
  }

  static validateRequiredFields(character: Partial<Character>, errors: ValidationError[]): void {
    // Implementation logic here
  }

  static validateAbilityScores(abilityScores: any, errors: ValidationError[]): void {
    // Implementation logic here
  }

  static validateRaceFeatures(character: Partial<Character>, errors: ValidationError[]): void {
    // Implementation logic here
  }

  static validateClassFeatures(character: Partial<Character>, errors: ValidationError[]): void {
    // Implementation logic here
  }

  static validateBackgroundFeatures(character: Partial<Character>, errors: ValidationError[]): void {
    // Implementation logic here
  }
}