// src/character/creation/feature-manager.ts

import type { Race, Class, Background } from '../../core/types';
import { Character, AbilityScores } from '../../core/interfaces';
import { races } from '../data/races';
import { classes } from '../data/classes';
import { backgrounds } from '../data/backgrounds';
import type { Trait, TraitDetail } from '../../core/interfaces/character';
import type { Item } from '../../core/interfaces/item';

export interface FeatureApplication {
  success: boolean;
  character: Character;
  errors: string[];
}

export class FeatureManager {
  /**
   * Apply racial features to a character
   */
  public static applyRacialFeatures(
    character: Partial<Character>,
    race: Race
  ): FeatureApplication {
    const errors: string[] = [];
    const raceData = races[race];

    if (!raceData) {
      return {
        success: false,
        character: character as Character,
        errors: ['Invalid race selected']
      };
    }

    try {
      // Apply ability score increases
      character.abilityScores = this.applyAbilityScoreIncreases(
        character.abilityScores || this.getDefaultAbilityScores(),
        raceData.abilityScoreIncrease
      );

      // Apply speed
      character.speed = raceData.speed;

      // Apply size category
      // character.size = raceData.size.category;

      // Add languages
      // character.languages = raceData.languages;

      // Add racial traits
      character.traits = [
        ...(character.traits || []),
        ...raceData.traits.map(trait => ({
          name: trait.name,
          source: race,
          description: trait.description,
          mechanics: trait.effects?.mechanics
        }))
      ] as Trait[];

      return {
        success: true,
        character: character as Character,
        errors
      };
    } catch (error) {
      return {
        success: false,
        character: character as Character,
        errors: [error instanceof Error ? error.message : 'Unknown error applying racial features']
      };
    }
  }

  /**
   * Apply class features to a character
   */
  public static applyClassFeatures(
    character: Partial<Character>,
    characterClass: Class,
    level: number = 1
  ): FeatureApplication {
    const errors: string[] = [];
    const classData = classes[characterClass];

    if (!classData) {
      return {
        success: false,
        character: character as Character,
        errors: ['Invalid class selected']
      };
    }

    try {
      // Apply hit points
      if (level === 1) {
        const constitutionModifier = this.getAbilityModifier(
          character.abilityScores?.constitution || 10
        );
        character.hitPoints = this.getMaxHitDieValue(classData.hitDie) + constitutionModifier;
        character.maxHitPoints = character.hitPoints;
      }

      // Apply proficiencies
      character.proficiencies = {
        armor: classData.proficiencies.armor || [],
        tools: classData.proficiencies.tools || [],
        savingThrows: classData.proficiencies.savingThrows || [],
        skills: []
      };

      // Apply features
      const levelFeatures = classData.features.filter(feature => feature.level <= level);
      character.classFeatures = levelFeatures.map(feature => ({
        name: feature.name,
        source: characterClass,
        description: feature.description,
        mechanics: feature.mechanics?.mechanics
      }));

      // Apply spellcasting if applicable
      if (classData.spellcasting && level >= 1) {
        character.spellcasting = {
          ability: classData.spellcasting.ability,
          class: characterClass,
          level: level,
          spellSlots: this.getSpellSlots(classData.spellcasting, level)
        };
      }

      return {
        success: true,
        character: character as Character,
        errors
      };
    } catch (error) {
      return {
        success: false,
        character: character as Character,
        errors: [error instanceof Error ? error.message : 'Unknown error applying class features']
      };
    }
  }

  /**
   * Apply background features to a character
   */
  public static applyBackgroundFeatures(
    character: Partial<Character>,
    background: Background
  ): FeatureApplication {
    const errors: string[] = [];
    const backgroundData = backgrounds[background];

    if (!backgroundData) {
      return {
        success: false,
        character: character as Character,
        errors: ['Invalid background selected']
      };
    }

    try {
      // Apply skill proficiencies
      character.proficiencies = {
        ...(character.proficiencies || {}),
        skills: [
          ...(character.proficiencies?.skills || []),
          ...backgroundData.skillProficiencies
        ]
      };

      // Apply tool proficiencies
      if (backgroundData.toolProficiencies) {
        character.proficiencies.tools = [
          ...(character.proficiencies?.tools || []),
          ...backgroundData.toolProficiencies
        ];
      }

      // Add languages
      if (backgroundData.languageCount) {
        // Languages will be chosen during character creation
        character.languagesCount = (character.languagesCount || 0) + backgroundData.languageCount;
      }

      // Add background feature
      character.backgroundFeature = {
        name: backgroundData.feature.name,
        source: background,
        description: backgroundData.feature.description,
        mechanics: backgroundData.feature.mechanics
      } as TraitDetail;

      // Add equipment
      character.equipment = [
        ...(character.equipment || []),
        ...backgroundData.equipment.mandatory.map(item => ({
          name: item,
          quantity: 1,
          isEquipped: false
        }) as Item)
      ] as Item[];

      // Add starting wealth
      character.wealth = {
        ...(character.wealth || {}),
        ...backgroundData.equipment.currency
      };

      return {
        success: true,
        character: character as Character,
        errors
      };
    } catch (error) {
      return {
        success: false,
        character: character as Character,
        errors: [error instanceof Error ? error.message : 'Unknown error applying background features']
      };
    }
  }

  // Helper methods

  private static getDefaultAbilityScores(): AbilityScores {
    return {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    };
  }

  private static applyAbilityScoreIncreases(
    baseScores: AbilityScores,
    increases: Partial<AbilityScores>
  ): AbilityScores {
    const newScores = { ...baseScores };
    for (const [ability, increase] of Object.entries(increases)) {
      newScores[ability as keyof AbilityScores] += increase;
    }
    return newScores;
  }

  private static getAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  private static getMaxHitDieValue(hitDie: string): number {
    return parseInt(hitDie.replace('d', ''));
  }

  private static getSpellSlots(spellcasting: any, level: number): { [key: number]: number } {
    const slots: { [key: number]: number } = {};
    for (let i = 1; i <= 9; i++) {
      if (spellcasting.spellSlots[i]) {
        slots[i] = spellcasting.spellSlots[i][level - 1];
      }
    }
    return slots;
  }
}