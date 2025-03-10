// src/character/creation/creator.ts

import type { Race, Class, Background } from '../../core/types';
import {
  Character,
  AbilityScores,
  Item
} from '../../core/interfaces';
import { Spell } from '../../core/interfaces/character';
import { ItemCategory } from '../../core/interfaces/item';
import { EventEmitter } from 'events';
import { races } from '../data/races';
import { classes } from '../data/classes';
import { backgrounds } from '../data/backgrounds';
import * as readline from 'readline';
import { Interface } from 'readline';
import inquirer from 'inquirer';
import chalk from 'chalk';

// Constants for available character options
const RACES: Record<string, any> = races;
const CLASSES: Record<string, any> = classes;
const BACKGROUNDS: Record<string, any> = backgrounds;

// Add race descriptions
const RACE_DESCRIPTIONS = {
  human: {
    description: "Humans are the most adaptable and ambitious people among the common races. They have widely varying tastes, morals, and customs.",
    bonuses: "Ability Score Increase: +1 to all ability scores. Skills: Proficiency in one skill of your choice. Feat: One feat of your choice."
  },
  elf: {
    description: "Elves are a magical people of otherworldly grace, living in the world but not entirely part of it.",
    bonuses: "Ability Score Increase: +2 Dexterity. Darkvision: 60 feet. Fey Ancestry: Advantage on saves vs. charm, immune to magical sleep. Trance: 4 hour meditation instead of sleep."
  },
  dwarf: {
    description: "Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.",
    bonuses: "Ability Score Increase: +2 Constitution. Darkvision: 60 feet. Dwarven Resilience: Advantage on saves vs. poison, resistance to poison damage. Tool Proficiency: Smith's, brewer's, or mason's tools."
  },
  halfling: {
    description: "The comforts of home are the goals of most halflings' lives: a place to settle in peace and quiet, far from marauding monsters and clashing armies.",
    bonuses: "Ability Score Increase: +2 Dexterity. Lucky: Reroll 1s on attack rolls, ability checks, and saving throws. Brave: Advantage on saves vs. being frightened. Halfling Nimbleness: Can move through spaces of larger creatures."
  }
};

// Add class descriptions
const CLASS_DESCRIPTIONS = {
  fighter: {
    description: "Fighters share an unparalleled mastery with weapons and armor, and a thorough knowledge of the skills of combat.",
    features: "Fighting Style, Second Wind, Action Surge (at higher levels)",
    primaryAbilities: "Strength or Dexterity, Constitution",
    savingThrows: "Strength, Constitution",
    hitDie: "d10"
  },
  wizard: {
    description: "Wizards are supreme magic-users, defined and united as a class by the spells they cast.",
    features: "Spellcasting, Arcane Recovery, Arcane Tradition (at higher levels)",
    primaryAbilities: "Intelligence",
    savingThrows: "Intelligence, Wisdom",
    hitDie: "d6"
  },
  barbarian: {
    description: "For some, their rage springs from a communion with fierce animal spirits. Others draw from a roiling reservoir of anger at a world full of pain.",
    features: "Rage, Unarmored Defense, Reckless Attack (at higher levels)",
    primaryAbilities: "Strength, Constitution",
    savingThrows: "Strength, Constitution", 
    hitDie: "d12"
  },
  bard: {
    description: "Whether scholar, skald, or scoundrel, a bard weaves magic through words and music to inspire allies, demoralize foes, manipulate minds, create illusions, and even heal wounds.",
    features: "Spellcasting, Bardic Inspiration, Jack of All Trades (at higher levels)",
    primaryAbilities: "Charisma, Dexterity",
    savingThrows: "Dexterity, Charisma",
    hitDie: "d8"
  },
  cleric: {
    description: "Clerics are intermediaries between the mortal world and the distant planes of the gods. As varied as the gods they serve, clerics strive to embody the handiwork of their deities.",
    features: "Spellcasting, Divine Domain, Channel Divinity (at higher levels)",
    primaryAbilities: "Wisdom, Constitution",
    savingThrows: "Wisdom, Charisma",
    hitDie: "d8"
  },
  druid: {
    description: "Whether calling on the elemental forces of nature or emulating the creatures of the animal world, druids are an embodiment of nature's resilience, cunning, and fury.",
    features: "Spellcasting, Wild Shape, Druid Circle (at higher levels)",
    primaryAbilities: "Wisdom, Constitution",
    savingThrows: "Intelligence, Wisdom",
    hitDie: "d8"
  },
  monk: {
    description: "Monks are united in their ability to magically harness the energy that flows in their bodies. Whether channeled as a striking display of combat prowess or a subtler focus of defensive ability and speed.",
    features: "Martial Arts, Unarmored Defense, Ki (at higher levels)",
    primaryAbilities: "Dexterity, Wisdom",
    savingThrows: "Strength, Dexterity",
    hitDie: "d8"
  },
  paladin: {
    description: "Whether sworn before a god's altar and the witness of a priest, in a sacred glade before nature spirits and fey beings, or in a moment of desperation and grief with the dead as the only witness, a paladin's oath is a powerful bond.",
    features: "Divine Sense, Lay on Hands, Divine Smite (at higher levels)",
    primaryAbilities: "Strength, Charisma",
    savingThrows: "Wisdom, Charisma",
    hitDie: "d10"
  },
  ranger: {
    description: "Far from the bustle of cities and towns, amid the dense-packed trees of trackless forests and across wide and empty plains, rangers keep their unending watch.",
    features: "Favored Enemy, Natural Explorer, Fighting Style (at higher levels)",
    primaryAbilities: "Dexterity, Wisdom",
    savingThrows: "Strength, Dexterity",
    hitDie: "d10"
  },
  rogue: {
    description: "Rogues rely on skill, stealth, and their foes' vulnerabilities to get the upper hand in any situation. They have a knack for finding the solution to just about any problem.",
    features: "Expertise, Sneak Attack, Thieves' Cant, Cunning Action (at higher levels)",
    primaryAbilities: "Dexterity, Intelligence or Charisma",
    savingThrows: "Dexterity, Intelligence",
    hitDie: "d8"
  },
  sorcerer: {
    description: "Sorcerers carry a magical birthright conferred upon them by an exotic bloodline, some otherworldly influence, or exposure to unknown cosmic forces.",
    features: "Spellcasting, Sorcerous Origin, Font of Magic (at higher levels)",
    primaryAbilities: "Charisma, Constitution",
    savingThrows: "Constitution, Charisma",
    hitDie: "d6"
  },
  warlock: {
    description: "Warlocks are seekers of knowledge that lies hidden in the fabric of the multiverse. Through pacts made with mysterious beings of supernatural power, warlocks unlock magical effects both subtle and spectacular.",
    features: "Otherworldly Patron, Pact Magic, Eldritch Invocations (at higher levels)",
    primaryAbilities: "Charisma, Constitution",
    savingThrows: "Wisdom, Charisma",
    hitDie: "d8"
  }
};

// Add background descriptions
const BACKGROUND_DESCRIPTIONS = {
  acolyte: {
    description: "You have spent your life in the service of a temple to a specific god or pantheon of gods. You act as an intermediary between the realm of the holy and the mortal world.",
    proficiencies: "Skills: Insight, Religion. Languages: Two of your choice.",
    feature: "Shelter of the Faithful: You can perform religious ceremonies of your deity. You and your companions can receive free healing and care at an establishment of your faith."
  },
  criminal: {
    description: "You are an experienced criminal with a history of breaking the law. You have spent a lot of time among other criminals and still have contacts within the criminal underworld.",
    proficiencies: "Skills: Deception, Stealth. Tools: One type of gaming set, thieves' tools.",
    feature: "Criminal Contact: You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals."
  }
};

export type CreationStep =
  | 'init'
  | 'name'
  | 'race'
  | 'class'
  | 'abilities'
  | 'background'
  | 'equipment'
  | 'spells'
  | 'details'
  | 'review'
  | 'complete';

export interface CreationState {
  step: CreationStep;
  character: Partial<Character>;
  validationErrors: string[];
  isComplete: boolean;
  options?: any; // Options for the current step (e.g., available races, classes)
  descriptions?: any; // Descriptions for the current step's options
}

export interface AbilityPointAllocation {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  pointsRemaining: number;
}

export class CharacterCreator extends EventEmitter {
  protected state: CreationState;
  private stepOrder: CreationStep[];
  private pointBuy: AbilityPointAllocation;
  private readonly TOTAL_ABILITY_POINTS = 27;

  constructor() {
    super();
    this.stepOrder = [
      'init',
      'name',
      'race',
      'class',
      'abilities',
      'background',
      'equipment',
      'spells',
      'details',
      'review',
      'complete'
    ];
    this.state = {
      step: 'init',
      character: {
        inventory: {
          gold: 0,
          items: []
        },
        abilityScores: {
          strength: { score: 8, modifier: -1 },
          dexterity: { score: 8, modifier: -1 },
          constitution: { score: 8, modifier: -1 },
          intelligence: { score: 8, modifier: -1 },
          wisdom: { score: 8, modifier: -1 },
          charisma: { score: 8, modifier: -1 },
          // Keep short form for backward compatibility
          str: 8,
          dex: 8,
          con: 8,
          int: 8,
          wis: 8,
          cha: 8
        },
        hitPoints: { current: 0, maximum: 0 },
        level: 1,
        experiencePoints: 0,
        proficiencies: {
          skills: [],
          tools: [],
          armor: [],
          weapons: [],
          savingThrows: [],
          languages: []
        },
        spells: []
      },
      validationErrors: [],
      isComplete: false
    };
    
    // Initialize point buy system
    this.pointBuy = {
      str: 8,
      dex: 8,
      con: 8,
      int: 8,
      wis: 8,
      cha: 8,
      pointsRemaining: this.TOTAL_ABILITY_POINTS
    };
  }

  /**
   * Start the character creation process
   */
  public async start(): Promise<void> {
    this.state.step = 'name';
    this.emit('stepChange', this.state.step);
    return this.processCurrentStep();
  }

  /**
   * Process the current creation step
   */
  private async processCurrentStep(): Promise<void> {
    try {
      switch (this.state.step) {
        case 'name':
          await this.handleNameStep();
          break;
        case 'race':
          await this.handleRaceStep();
          break;
        case 'class':
          await this.handleClassStep();
          break;
        case 'abilities':
          await this.handleAbilitiesStep();
          break;
        case 'background':
          await this.handleBackgroundStep();
          break;
        case 'equipment':
          await this.handleEquipmentStep();
          break;
        case 'spells':
          await this.handleSpellsStep();
          break;
        case 'details':
          await this.handleDetailsStep();
          break;
        case 'review':
          await this.handleReviewStep();
          break;
        case 'complete':
          this.completeCreation();
          break;
        default:
          throw new Error(`Unknown step: ${this.state.step}`);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Move to the next step in character creation
   */
  public async nextStep(): Promise<void> {
    // Validate current step before proceeding
    if (!this.validateCurrentStep()) {
      this.emit('validationError', this.state.validationErrors);
      return;
    }
    
    const currentIndex = this.stepOrder.indexOf(this.state.step);
    if (currentIndex < this.stepOrder.length - 1) {
      this.state.step = this.stepOrder[currentIndex + 1];
      this.emit('stepChange', this.state.step);
      return this.processCurrentStep();
    }
  }

  /**
   * Move to the previous step in character creation
   */
  public async previousStep(): Promise<void> {
    const currentIndex = this.stepOrder.indexOf(this.state.step);
    if (currentIndex > 0) {
      this.state.step = this.stepOrder[currentIndex - 1];
      this.emit('stepChange', this.state.step);
      return this.processCurrentStep();
    }
  }

  /**
   * Update the character's name
   */
  private async handleNameStep(): Promise<void> {
    this.state.options = {
      placeholder: "Enter a name for your character",
      description: "Choose a name that fits the world and your character's personality."
    };
    
    this.emit('namePrompt', this.state.options);
  }

  /**
   * Handle race selection and apply racial traits
   */
  private async handleRaceStep(): Promise<void> {
    // Get available races with descriptions
    const raceOptions = Object.keys(RACES);
    const raceDescriptions: Record<string, string> = {};
    
    for (const race of raceOptions) {
      raceDescriptions[race] = RACES[race].description;
    }
    
    this.state.options = raceOptions;
    this.state.descriptions = raceDescriptions;
    
    this.emit('racePrompt', {
      options: raceOptions,
      descriptions: raceDescriptions
    });
  }

  /**
   * Handle class selection and apply class features
   */
  private async handleClassStep(): Promise<void> {
    // Get available classes with descriptions
    const classOptions = Object.keys(CLASSES);
    const classDescriptions: Record<string, string> = {};
    
    for (const className of classOptions) {
      classDescriptions[className] = CLASSES[className].description;
    }
    
    this.state.options = classOptions;
    this.state.descriptions = classDescriptions;
    
    this.emit('classPrompt', {
      options: classOptions,
      descriptions: classDescriptions
    });
  }

  /**
   * Handle ability score generation and assignment
   */
  private async handleAbilitiesStep(): Promise<void> {
    // Get racial ability score bonuses
    const racialBonuses = this.getRacialAbilityBonuses();
    
    // Get class ability score recommendations
    const recommendedAbilities = this.getClassAbilityRecommendations();
    
    this.state.options = {
      pointBuy: { ...this.pointBuy },
      racialBonuses,
      recommendedAbilities
    };
    
    this.emit('abilitiesPrompt', this.state.options);
  }

  /**
   * Handle background selection and apply background features
   */
  private async handleBackgroundStep(): Promise<void> {
    // Get available backgrounds with descriptions
    const backgroundOptions = Object.keys(BACKGROUNDS);
    const backgroundDescriptions: Record<string, string> = {};
    
    for (const background of backgroundOptions) {
      backgroundDescriptions[background] = BACKGROUNDS[background].description;
    }
    
    this.state.options = backgroundOptions;
    this.state.descriptions = backgroundDescriptions;
    
    this.emit('backgroundPrompt', {
      options: backgroundOptions,
      descriptions: backgroundDescriptions
    });
  }

  /**
   * Handle equipment selection and assignment
   */
  private async handleEquipmentStep(): Promise<void> {
    const defaultEquipment = this.getDefaultEquipment();
    
    this.state.options = {
      defaultEquipment,
      customOption: true
    };
    
    this.emit('equipmentPrompt', this.state.options);
  }

  /**
   * Handle spell selection for spellcasting classes
   */
  private async handleSpellsStep(): Promise<void> {
    // Check if the character has spellcasting
    if (!this.hasSpellcasting()) {
      // Skip spell selection for classes without spellcasting
      this.nextStep();
      return;
    }
    
    const characterClass = this.state.character.class as string;
    const characterLevel = this.state.character.level || 1;
    
    // Get available spells for the character's class and level
    const classData = CLASSES[characterClass];
    if (!classData || !classData.spellcasting) {
      // Skip spell selection if class doesn't have spellcasting data
      this.nextStep();
      return;
    }
    
    const availableSpells = this.getAvailableSpells(characterClass, characterLevel);
    
    let cantripsToSelect = 0;
    let spellsToSelect = 0;
    
    if (classData.spellcasting) {
      if (classData.spellcasting.cantripsKnown) {
        cantripsToSelect = classData.spellcasting.cantripsKnown[characterLevel - 1] || 0;
      }
      
      if (classData.spellcasting.spellsKnown) {
        spellsToSelect = classData.spellcasting.spellsKnown[characterLevel - 1] || 0;
      } else if (classData.spellcasting.spellsToSelect) {
        spellsToSelect = classData.spellcasting.spellsToSelect[characterLevel - 1] || 0;
      }
    }
      
    this.state.options = {
      availableSpells,
      cantripsToSelect,
      spellsToSelect,
      defaultSpells: this.getDefaultSpells()
    };
    
    this.emit('spellsPrompt', this.state.options);
  }

  /**
   * Handle character details like personality, appearance, backstory
   */
  private async handleDetailsStep(): Promise<void> {
    const background = this.state.character.background as string;
    const backgroundData = BACKGROUNDS[background];
    
    const personalityTraits = backgroundData?.personalityTraits?.suggestions || [];
    const ideals = backgroundData?.ideals?.suggestions || [];
    const bonds = backgroundData?.bonds?.suggestions || [];
    const flaws = backgroundData?.flaws?.suggestions || [];
    
    this.state.options = {
      personalityTraits,
      ideals,
      bonds,
      flaws,
      alignments: [
        'lawful good', 'neutral good', 'chaotic good',
        'lawful neutral', 'true neutral', 'chaotic neutral',
        'lawful evil', 'neutral evil', 'chaotic evil'
      ]
    };
    
    this.emit('detailsPrompt', this.state.options);
  }

  /**
   * Review the created character
   */
  private async handleReviewStep(): Promise<void> {
    // Calculate derived stats one last time
    this.calculateDerivedStats();
    
    // Present the character for review
    this.emit('reviewPrompt', this.state.character);
  }

  /**
   * Complete character creation
   */
  private completeCreation(): void {
      this.state.isComplete = true;
    this.emit('creationComplete', this.state.character);
  }

  /**
   * Calculate derived stats from character attributes
   */
  private calculateDerivedStats(character: Partial<Character> = this.state.character): void {
    // Calculate ability modifiers
    if (character.abilityScores) {
      // Short form properties
      const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      for (const ability of abilities) {
        const abilityKey = ability as keyof AbilityScores;
        const score = character.abilityScores[abilityKey] as number;
        
        if (score !== undefined) {
          const modifier = this.getAbilityModifier(score);
          
          // Set the corresponding long form property if it doesn't exist
          const longFormKey = this.getLongFormAbilityName(ability) as keyof AbilityScores;
          if (!character.abilityScores[longFormKey]) {
            (character.abilityScores[longFormKey] as any) = {
              score,
              modifier
            };
          }
        }
      }
    }
  }

  /**
   * Get the ability modifier for a given score
   */
  private getAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  /**
   * Get racial ability score bonuses
   */
  private getRacialAbilityBonuses(): Partial<AbilityScores> {
    const race = this.state.character.race as string;
    if (!race || !RACES[race]) {
      return {};
    }
    
    return RACES[race].abilityScoreIncrease || {};
  }

  /**
   * Get recommended ability scores for a class
   */
  private getClassAbilityRecommendations(): string[] {
    const characterClass = this.state.character.class as string;
    if (!characterClass || !CLASSES[characterClass]) {
      return [];
    }
    
    return CLASSES[characterClass].primaryAbilities || [];
  }

  /**
   * Get available spells for a class and level
   */
  private getAvailableSpells(className: string, level: number): Spell[] {
    // This would typically load spells from a data file
    // For now, return a dummy array
    return [];
  }

  /**
   * Check if the character has spellcasting abilities
   */
  private hasSpellcasting(): boolean {
    const characterClass = this.state.character.class as string;
    if (!characterClass || !CLASSES[characterClass]) {
      return false;
    }
    
    return !!CLASSES[characterClass].spellcasting;
  }

  /**
   * Validate the complete character
   */
  private validateCharacter(): boolean {
    this.state.validationErrors = [];
    
    // Validate required fields
    if (!this.state.character.name) {
      this.state.validationErrors.push('Character name is required');
    }
    
    if (!this.state.character.race) {
      this.state.validationErrors.push('Race is required');
    }
    
    if (!this.state.character.class) {
      this.state.validationErrors.push('Class is required');
    }
    
    if (!this.state.character.background) {
      this.state.validationErrors.push('Background is required');
    }
    
    if (!this.state.character.alignment) {
      this.state.validationErrors.push('Alignment is required');
    }
    
    // More specific validations could be added here
    
    return this.state.validationErrors.length === 0;
  }
  
  /**
   * Validate the current step's data
   */
  private validateCurrentStep(): boolean {
    this.state.validationErrors = [];
    
    switch (this.state.step) {
      case 'name':
        if (!this.state.character.name) {
          this.state.validationErrors.push('Character name is required');
        }
        break;
        
      case 'race':
        if (!this.state.character.race) {
          this.state.validationErrors.push('Race is required');
        }
        break;
        
      case 'class':
        if (!this.state.character.class) {
          this.state.validationErrors.push('Class is required');
        }
        break;
        
      case 'abilities':
        if (!this.state.character.abilityScores) {
          this.state.validationErrors.push('Ability scores are required');
        } else {
          const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
          for (const ability of abilities) {
            const abilityKey = ability as keyof AbilityScores;
            const score = this.state.character.abilityScores[abilityKey] as number;
            
            if (score === undefined || score < 3 || score > 18) {
              this.state.validationErrors.push(`Invalid ${ability.toUpperCase()} score`);
            }
          }
        }
        break;
        
      case 'background':
        if (!this.state.character.background) {
          this.state.validationErrors.push('Background is required');
        }
        break;
        
      case 'details':
        if (!this.state.character.alignment) {
          this.state.validationErrors.push('Alignment is required');
        }
        break;
        
      // Other steps may not have required validations
        
      case 'complete':
        return this.validateCharacter();
    }
    
    return this.state.validationErrors.length === 0;
  }

  /**
   * Handle errors that occur during character creation
   */
  private handleError(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    this.state.validationErrors.push(errorMessage);
    this.emit('error', {
      message: errorMessage,
      step: this.state.step
    });
    console.error(`Error during character creation (${this.state.step}):`, error);
  }
  
  /**
   * Set the character's name
   */
  public setName(name: string): void {
    if (!this.state.character) {
      this.state.character = {};
    }
    this.state.character.name = name;
  }
  
  /**
   * Set the character's race
   */
  public setRace(race: Race): void {
    if (!this.state.character) {
      this.state.character = {};
    }
    this.state.character.race = race;
    
    // If this were a full implementation, we would also apply racial traits
    // such as ability score bonuses, speed, etc.
  }
  
  /**
   * Set the character's class
   */
  public setClass(className: string): void {
    if (!className) {
      throw new Error('Class name is required');
    }
    
    // Convert to the Class type
    this.state.character.class = className as Class;
    
    // Initialize level if not set
    if (!this.state.character.level) {
      this.state.character.level = 1;
    }
    
    // Calculate proficiency bonus
    this.state.character.proficiencyBonus = this.calculateProficiencyBonus(this.state.character.level);
  }
  
  /**
   * Set the character's ability scores
   */
  public setAbilityScores(scores: AbilityScores): void {
    if (!this.state.character) {
      this.state.character = {};
    }
    this.state.character.abilityScores = scores;
  }
  
  /**
   * Set the character's background
   */
  public setBackground(background: string): void {
    if (!background) {
      throw new Error('Background is required');
    }
    
    // Convert to the Background type
    this.state.character.background = background as Background;
    
    // Initialize any background-specific properties
    // ...
  }
  
  /**
   * Add equipment to the character's inventory
   */
  public addEquipment(items: Item[]): void {
    if (!this.state.character) {
      this.state.character = {};
    }
    if (!this.state.character.inventory) {
      this.state.character.inventory = {
        gold: 0,
        items: []
      };
    }
    this.state.character.inventory.items.push(...items);
  }
  
  /**
   * Add spells to the character's spellbook
   */
  public addSpells(spells: Spell[]): void {
    if (!this.state.character) {
      this.state.character = {};
    }
    if (!this.state.character.spells) {
      this.state.character.spells = [];
    }
    this.state.character.spells.push(...spells);
  }
  
  /**
   * Set the character's personal details
   */
  public setCharacterDetails(details: {
    personality?: string,
    appearance?: string,
    backstory?: string
  }): void {
    if (!this.state.character) {
      this.state.character = {};
    }
    
    // Set personality traits
    if (details.personality) {
      if (!this.state.character.personality) {
        this.state.character.personality = { traits: [], ideals: [], bonds: [], flaws: [] };
      }
      this.state.character.personality.traits = [details.personality];
    }
    
    // Set appearance
    if (details.appearance) {
      // For MVP, we'll just store appearance as a string
      // In a full implementation, we'd parse this into age, height, weight, etc.
      this.state.character.appearance = { description: details.appearance } as any;
    }
    
    // Set backstory
    if (details.backstory) {
      this.state.character.backstory = details.backstory;
    }
  }
  
  /**
   * Get the current character
   */
  public getCharacter(): Partial<Character> {
    return this.state.character;
  }
  
  /**
   * Get the current state
   */
  public getState(): CreationState {
    return this.state;
  }

  /**
   * Start the character creation process
   */
  public startCreation(): void {
    this.reset();
    this.state.step = 'name';
    this.emit('stepChange', this.state.step);
    this.processCurrentStep();
  }

  /**
   * Reset the character creation process
   */
  public reset(): void {
    this.state = {
      step: 'init',
      character: {
        inventory: {
          gold: 0,
          items: []
        },
        abilityScores: {
          strength: { score: 8, modifier: -1 },
          dexterity: { score: 8, modifier: -1 },
          constitution: { score: 8, modifier: -1 },
          intelligence: { score: 8, modifier: -1 },
          wisdom: { score: 8, modifier: -1 },
          charisma: { score: 8, modifier: -1 },
          // Keep short form for backward compatibility
          str: 8,
          dex: 8,
          con: 8,
          int: 8,
          wis: 8,
          cha: 8
        },
        hitPoints: { current: 0, maximum: 0 },
        level: 1,
        experiencePoints: 0,
        proficiencies: {
          skills: [],
          tools: [],
          armor: [],
          weapons: [],
          savingThrows: [],
          languages: []
        },
        spells: []
      },
      validationErrors: [],
      isComplete: false
    };
    
    // Reset point buy system
    this.pointBuy = {
      str: 8,
      dex: 8,
      con: 8,
      int: 8,
      wis: 8,
      cha: 8,
      pointsRemaining: this.TOTAL_ABILITY_POINTS
    };
  }

  /**
   * Get the long form ability name from the short form
   */
  private getLongFormAbilityName(shortName: string): string {
    const abilityMap: Record<string, string> = {
      str: 'strength',
      dex: 'dexterity',
      con: 'constitution',
      int: 'intelligence',
      wis: 'wisdom',
      cha: 'charisma'
    };
    
    return abilityMap[shortName] || shortName;
  }

  /**
   * Public method to handle the current step in character creation
   * This is needed for the extending class to call the protected method
   */
  public handleCurrentStep(): void {
    this.processCurrentStep();
  }

  /**
   * Get default equipment based on class and background
   */
  private getDefaultEquipment(): Item[] {
    const characterClass = this.state.character.class as string;
    const background = this.state.character.background as string;
    
    const items: Item[] = [];
    
    // Add class equipment
    if (characterClass && CLASSES[characterClass]?.startingEquipment?.default) {
      for (const itemName of CLASSES[characterClass].startingEquipment.default) {
        items.push({
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: itemName,
          description: `Standard ${itemName}`,
          category: this.getItemType(itemName),
          weight: 1, // Default weight
          value: 0, // Default value
          properties: []
        });
      }
    }
    
    // Add background equipment
    if (background && BACKGROUNDS[background]?.equipment?.mandatory) {
      for (const itemName of BACKGROUNDS[background].equipment.mandatory) {
        items.push({
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: itemName,
          description: `Standard ${itemName}`,
          category: this.getItemType(itemName),
          weight: 1, // Default weight
          value: 0, // Default value
          properties: []
        });
      }
    }
    
    return items;
  }

  /**
   * Get the item type based on name (very simplified for MVP)
   */
  protected getItemType(itemName: string): ItemCategory {
    // Simple logic to determine item type based on name
    const lowercaseName = itemName.toLowerCase();
    
    if (lowercaseName.includes('sword') || 
        lowercaseName.includes('axe') || 
        lowercaseName.includes('bow') || 
        lowercaseName.includes('dagger') ||
        lowercaseName.includes('mace') ||
        lowercaseName.includes('staff') ||
        lowercaseName.includes('wand')) {
      return ItemCategory.Weapon;
    }
    
    if (lowercaseName.includes('armor') || 
        lowercaseName.includes('plate') || 
        lowercaseName.includes('mail') || 
        lowercaseName.includes('leather')) {
      return ItemCategory.Armor;
    }
    
    if (lowercaseName.includes('shield')) {
      return ItemCategory.Shield;
    }
    
    if (lowercaseName.includes('potion')) {
      return ItemCategory.Potion;
    }
    
    if (lowercaseName.includes('scroll')) {
      return ItemCategory.Scroll;
    }
    
    if (lowercaseName.includes('ring')) {
      return ItemCategory.Ring;
    }
    
    if (lowercaseName.includes('amulet') || lowercaseName.includes('necklace')) {
      return ItemCategory.Amulet;
    }
    
    if (lowercaseName.includes('tools') || lowercaseName.includes('kit')) {
      return ItemCategory.Tool;
    }
    
    if (lowercaseName.includes('clothes') || lowercaseName.includes('outfit') || lowercaseName.includes('robe')) {
      return ItemCategory.Clothing;
    }
    
    // Default to misc for other items
    return ItemCategory.Misc;
  }

  /**
   * Get default spells for the character
   */
  private getDefaultSpells(): Spell[] {
    const characterClass = this.state.character.class as string;
    const level = this.state.character.level || 1;
    
    // Skip if not a spellcasting class
    if (!this.hasSpellcasting()) {
      return [];
    }
    
    // For the MVP, we'll just return some example spells
    // In a full implementation, we'd load these from a data file
    
    const spells: Spell[] = [];
    
    if (characterClass === 'wizard') {
      // Example wizard cantrips
      spells.push({
        id: 'spell-1',
        name: 'Mage Hand',
        level: 0,
        school: 'Conjuration',
        castingTime: '1 action',
        range: '30 feet',
        components: {
          verbal: true,
          somatic: true,
          material: false
        },
        duration: '1 minute',
        description: 'A spectral, floating hand appears at a point you choose within range.',
        concentration: false,
        ritual: false
      });
      
      spells.push({
        id: 'spell-2',
        name: 'Fire Bolt',
        level: 0,
        school: 'Evocation',
        castingTime: '1 action',
        range: '120 feet',
        components: {
          verbal: true,
          somatic: true,
          material: false
        },
        duration: 'Instantaneous',
        description: 'You hurl a mote of fire at a creature or object within range.',
        concentration: false,
        ritual: false
      });
      
      // Example level 1 spells
      spells.push({
        id: 'spell-3',
        name: 'Magic Missile',
        level: 1,
        school: 'Evocation',
        castingTime: '1 action',
        range: '120 feet',
        components: {
          verbal: true,
          somatic: true,
          material: false
        },
        duration: 'Instantaneous',
        description: 'You create three glowing darts of magical force.',
        concentration: false,
        ritual: false
      });
      
      spells.push({
        id: 'spell-4',
        name: 'Shield',
        level: 1,
        school: 'Abjuration',
        castingTime: '1 reaction',
        range: 'Self',
        components: {
          verbal: true,
          somatic: true,
          material: false
        },
        duration: '1 round',
        description: 'An invisible barrier of magical force appears and protects you.',
        concentration: false,
        ritual: false
      });
    } else if (characterClass === 'cleric') {
      // Example cleric cantrips
      spells.push({
        id: 'spell-1',
        name: 'Sacred Flame',
        level: 0,
        school: 'Evocation',
        castingTime: '1 action',
        range: '60 feet',
        components: {
          verbal: true,
          somatic: true,
          material: false
        },
        duration: 'Instantaneous',
        description: 'Flame-like radiance descends on a creature that you can see within range.',
        concentration: false,
        ritual: false
      });
      
      spells.push({
        id: 'spell-2',
        name: 'Guidance',
        level: 0,
        school: 'Divination',
        castingTime: '1 action',
        range: 'Touch',
        components: {
          verbal: true,
          somatic: true,
          material: false
        },
        duration: 'Concentration, up to 1 minute',
        description: 'You touch one willing creature and they gain a d4 to one ability check of their choice.',
        concentration: true,
        ritual: false
      });
      
      // Example level 1 spells
      spells.push({
        id: 'spell-3',
        name: 'Cure Wounds',
        level: 1,
        school: 'Evocation',
        castingTime: '1 action',
        range: 'Touch',
        components: {
          verbal: true,
          somatic: true,
          material: false
        },
        duration: 'Instantaneous',
        description: 'A creature you touch regains hit points equal to 1d8 + your spellcasting ability modifier.',
        concentration: false,
        ritual: false
      });
      
      spells.push({
        id: 'spell-4',
        name: 'Bless',
        level: 1,
        school: 'Enchantment',
        castingTime: '1 action',
        range: '30 feet',
        components: {
          verbal: true,
          somatic: true,
          material: true,
          materials: 'A sprinkling of holy water'
        },
        duration: 'Concentration, up to 1 minute',
        description: 'You bless up to three creatures of your choice within range.',
        concentration: true,
        ritual: false
      });
    }
    
    return spells;
  }

  /**
   * Calculate the proficiency bonus based on character level
   */
  protected calculateProficiencyBonus(level: number): number {
    return Math.floor((level - 1) / 4) + 2;
  }

  /**
   * Create a character interactively using the provided readline interface
   * 
   * @param rl The readline interface to use for prompting the user
   * @returns A Promise that resolves to the created character
   */
  public async createCharacterInteractive(rl: Interface): Promise<Character> {
    // Use simple console.log instead of chalk and fancy characters
    console.log("==============================================");
    console.log("          D&D CHARACTER CREATION             ");
    console.log("==============================================");
    
    // Initialize character creation
    this.startCreation();
    
    // Character name using inquirer
    const { name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: "What is your character's name?",
        validate: (input) => input.trim().length > 0 ? true : 'Name cannot be empty'
      }
    ]);
    this.setName(name);
    
    // Race selection with descriptions shown BEFORE selection
    console.log("\n----------------- CHOOSE YOUR RACE -----------------");
    console.log("Each race provides different ability bonuses and special traits.\n");
    
    // Display all race descriptions before selection
    Object.keys(RACES).forEach(race => {
      console.log(`=== ${race.toUpperCase()} ===`);
      console.log(RACE_DESCRIPTIONS[race].description);
      console.log(RACE_DESCRIPTIONS[race].bonuses);
      console.log("");
    });
    
    const raceChoices = Object.keys(RACES).map(race => ({
      name: race.charAt(0).toUpperCase() + race.slice(1),
      value: race,
      short: race.charAt(0).toUpperCase() + race.slice(1)
    }));
    
    const { selectedRace } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedRace',
        message: 'Select your race:',
        choices: raceChoices,
        pageSize: 10
      }
    ]);
    
    // Confirm the selected race
    console.log(`\nYou selected: ${selectedRace.charAt(0).toUpperCase() + selectedRace.slice(1)}`);
    this.setRace(selectedRace as Race);
    
    // Class selection with descriptions shown BEFORE selection
    console.log("\n----------------- CHOOSE YOUR CLASS -----------------");
    console.log("Your class defines your character's capabilities, specialties, and style of play.\n");
    
    // Display all class descriptions before selection
    Object.keys(CLASSES).forEach(className => {
      console.log(`=== ${className.toUpperCase()} ===`);
      console.log(CLASS_DESCRIPTIONS[className].description);
      console.log(`Features: ${CLASS_DESCRIPTIONS[className].features}`);
      console.log(`Primary Abilities: ${CLASS_DESCRIPTIONS[className].primaryAbilities}`);
      console.log(`Hit Die: ${CLASS_DESCRIPTIONS[className].hitDie}`);
      console.log("");
    });
    
    const classChoices = Object.keys(CLASSES).map(className => ({
      name: className.charAt(0).toUpperCase() + className.slice(1),
      value: className,
      short: className.charAt(0).toUpperCase() + className.slice(1)
    }));
    
    const { selectedClass } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedClass',
        message: 'Select your class:',
        choices: classChoices,
        pageSize: 10
      }
    ]);
    
    // Confirm the selected class
    console.log(`\nYou selected: ${selectedClass.charAt(0).toUpperCase() + selectedClass.slice(1)}`);
    this.setClass(selectedClass);
    
    // Ability scores with descriptions and recommendations BEFORE selection
    console.log("\n----------------- ABILITY SCORES -----------------");
    console.log("Ability scores determine your character's strengths and weaknesses.");
    console.log("You have 27 points to allocate. All scores start at 8.");
    console.log("Cost: 9-13: 1 point each, 14: 2 points, 15: 3 points");
    
    // Explain all ability scores before allocation
    console.log("\nABILITY SCORE DESCRIPTIONS:");
    console.log("STRENGTH: Physical power, melee attacks, and carrying capacity");
    console.log("DEXTERITY: Agility, ranged attacks, initiative, and armor class");
    console.log("CONSTITUTION: Health, hit points, and resistance to poison/disease");
    console.log("INTELLIGENCE: Memory, reasoning, and wizard spellcasting");
    console.log("WISDOM: Perception, insight, and cleric/druid spellcasting");
    console.log("CHARISMA: Social influence, bard/sorcerer/warlock spellcasting");
    
    // Recommend abilities based on class
    console.log(`\nRecommended abilities for ${selectedClass.charAt(0).toUpperCase() + selectedClass.slice(1)}:`);
    console.log(CLASS_DESCRIPTIONS[selectedClass].primaryAbilities);
    
    const abilityNames = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];
    const abilityShortNames = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const abilityDescriptions = {
      str: "Physical power, melee attacks, and carrying capacity",
      dex: "Agility, ranged attacks, initiative, and armor class",
      con: "Health, hit points, and resistance to poison/disease",
      int: "Memory, reasoning, and wizard spellcasting",
      wis: "Perception, insight, and cleric/druid spellcasting",
      cha: "Social influence, bard/sorcerer/warlock spellcasting"
    };
    
    const scores: Record<string, number> = {};
    
    let pointsRemaining = 27;
    for (let i = 0; i < abilityNames.length; i++) {
      const name = abilityNames[i];
      const shortName = abilityShortNames[i];
      const baseScore = 8;
      
      console.log(`\n${name}: ${abilityDescriptions[shortName]}`);
      console.log(`Points remaining: ${pointsRemaining}`);
      
      const { score } = await inquirer.prompt([
        {
          type: 'number',
          name: 'score',
          message: `${name} (base: ${baseScore}):`,
          default: 8,
          validate: (input) => {
            if (input < 8) return 'Ability score cannot be less than 8';
            if (input > 15) return 'Ability score cannot be more than 15 at character creation';
            
            // Calculate points needed
            let pointsNeeded = 0;
            if (input > 8) {
              if (input <= 13) {
                pointsNeeded = input - 8;
              } else if (input === 14) {
                pointsNeeded = 5 + 2; // 5 for 9-13, plus 2 for 14
              } else if (input === 15) {
                pointsNeeded = 5 + 2 + 2; // 5 for 9-13, 2 for 14, 2 more for 15
              }
            }
            
            if (pointsNeeded > pointsRemaining) {
              return `Not enough points! You need ${pointsNeeded} but only have ${pointsRemaining} remaining.`;
            }
            
            return true;
          }
        }
      ]);
      
      // Calculate points used
      let pointsUsed = 0;
      if (score > 8) {
        if (score <= 13) {
          pointsUsed = score - 8;
        } else if (score === 14) {
          pointsUsed = 5 + 2; // 5 for 9-13, plus 2 for 14
        } else if (score === 15) {
          pointsUsed = 5 + 2 + 2; // 5 for 9-13, 2 for 14, 2 more for 15
        }
      }
      
      pointsRemaining -= pointsUsed;
      scores[shortName] = score;
      
      // Show the modifier
      const modifier = this.getAbilityModifier(score);
      const modifierText = modifier >= 0 ? `+${modifier}` : `${modifier}`;
      console.log(`${name} set to ${score} (Modifier: ${modifierText})`);
    }
    
    const abilityScores: AbilityScores = {
      strength: { score: scores.str, modifier: this.getAbilityModifier(scores.str) },
      dexterity: { score: scores.dex, modifier: this.getAbilityModifier(scores.dex) },
      constitution: { score: scores.con, modifier: this.getAbilityModifier(scores.con) },
      intelligence: { score: scores.int, modifier: this.getAbilityModifier(scores.int) },
      wisdom: { score: scores.wis, modifier: this.getAbilityModifier(scores.wis) },
      charisma: { score: scores.cha, modifier: this.getAbilityModifier(scores.cha) },
      // Keep short form for backward compatibility
      str: scores.str,
      dex: scores.dex,
      con: scores.con,
      int: scores.int,
      wis: scores.wis,
      cha: scores.cha
    };
    
    this.setAbilityScores(abilityScores);
    
    // Background selection with descriptions shown BEFORE selection
    console.log("\n----------------- CHOOSE YOUR BACKGROUND -----------------");
    console.log("Your background describes where you came from and your initial place in the world.\n");
    
    // Display all background descriptions before selection
    Object.keys(BACKGROUNDS).forEach(bg => {
      console.log(`=== ${bg.toUpperCase()} ===`);
      console.log(BACKGROUND_DESCRIPTIONS[bg].description);
      console.log(BACKGROUND_DESCRIPTIONS[bg].proficiencies);
      console.log(BACKGROUND_DESCRIPTIONS[bg].feature);
      console.log("");
    });
    
    const backgroundChoices = Object.keys(BACKGROUNDS).map(bg => ({
      name: bg.charAt(0).toUpperCase() + bg.slice(1),
      value: bg,
      short: bg.charAt(0).toUpperCase() + bg.slice(1)
    }));
    
    const { selectedBg } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedBg',
        message: 'Select your background:',
        choices: backgroundChoices,
        pageSize: 10
      }
    ]);
    
    // Confirm the selected background
    console.log(`\nYou selected: ${selectedBg.charAt(0).toUpperCase() + selectedBg.slice(1)}`);
    this.setBackground(selectedBg);
    
    // Add equipment based on class and background
    console.log("\n----------------- EQUIPMENT -----------------");
    const defaultEquipment = this.getDefaultEquipment();
    this.addEquipment(defaultEquipment);
    
    // Display equipment
    console.log("Starting Equipment:");
    defaultEquipment.forEach(item => {
      console.log(`- ${item.name}`);
    });
    
    // Add spells if applicable
    if (this.hasSpellcasting()) {
      console.log("\n----------------- SPELLS -----------------");
      const spells = this.getDefaultSpells();
      
      // Display available spells and let user choose
      const availableSpells = this.getAvailableSpells(selectedClass, 1);
      
      if (availableSpells.length > 0) {
        console.log(`Choose spells for your ${selectedClass}:`);
        
        const spellChoiceLimit = this.getSpellChoiceLimit(selectedClass);
        const cantripsLimit = this.getCantripsLimit(selectedClass);
        
        // Separate cantrips and level 1 spells
        const cantrips = availableSpells.filter(spell => spell.level === 0);
        const level1Spells = availableSpells.filter(spell => spell.level === 1);
        
        // Choose cantrips
        if (cantrips.length > 0 && cantripsLimit > 0) {
          console.log(`\nChoose ${cantripsLimit} cantrips:`);
          
          const { selectedCantrips } = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'selectedCantrips',
              message: `Select ${cantripsLimit} cantrips:`,
              choices: cantrips.map(spell => ({
                name: `${spell.name} - ${spell.description.substring(0, 60)}...`,
                value: spell
              })),
              validate: (answer) => {
                if (answer.length === cantripsLimit) return true;
                return `You must choose exactly ${cantripsLimit} cantrips.`;
              }
            }
          ]);
          
          // Add selected cantrips to the character
          selectedCantrips.forEach(spell => {
            this.addSpells([spell]);
          });
        }
        
        // Choose level 1 spells
        if (level1Spells.length > 0 && spellChoiceLimit > 0) {
          console.log(`\nChoose ${spellChoiceLimit} level 1 spells:`);
          
          const { selectedSpells } = await inquirer.prompt([
            {
              type: 'checkbox',
              name: 'selectedSpells',
              message: `Select ${spellChoiceLimit} level 1 spells:`,
              choices: level1Spells.map(spell => ({
                name: `${spell.name} - ${spell.description.substring(0, 60)}...`,
                value: spell
              })),
              validate: (answer) => {
                if (answer.length === spellChoiceLimit) return true;
                return `You must choose exactly ${spellChoiceLimit} level 1 spells.`;
              }
            }
          ]);
          
          // Add selected spells to the character
          selectedSpells.forEach(spell => {
            this.addSpells([spell]);
          });
        }
      } else {
        // If no spell choices available, add default spells
        this.addSpells(spells);
        
        console.log("Starting Spells:");
        spells.forEach(spell => {
          console.log(`- ${spell.name} (Level ${spell.level})`);
        });
      }
    }
    
    // Character details
    console.log("\n----------------- CHARACTER DETAILS -----------------");
    
    const { personality, appearance, backstory } = await inquirer.prompt([
      {
        type: 'input',
        name: 'personality',
        message: "Describe your character's personality traits:"
      },
      {
        type: 'input',
        name: 'appearance',
        message: "Describe your character's physical appearance:"
      },
      {
        type: 'input',
        name: 'backstory',
        message: "Provide a brief backstory:"
      }
    ]);
    
    this.setCharacterDetails({
      personality,
      appearance,
      backstory
    });
    
    // Complete creation
    this.completeCreation();
    
    console.log("\n✨ Character creation complete! ✨");
    
    // Display character summary
    const character = this.getCharacter() as Character;
    console.log("\n----------------- CHARACTER SUMMARY -----------------");
    console.log(`Name: ${character.name}`);
    console.log(`Race: ${character.race}`);
    console.log(`Class: ${character.class}`);
    console.log(`Background: ${character.background}`);
    
    console.log("\nAbility Scores:");
    Object.entries(character.abilityScores).forEach(([key, value]) => {
      if (typeof value === 'object' && value.score !== undefined) {
        const name = this.getLongFormAbilityName(key);
        if (name) {
          const modifier = value.modifier >= 0 ? `+${value.modifier}` : `${value.modifier}`;
          console.log(`${name}: ${value.score} (${modifier})`);
        }
      }
    });
    
    if (character.spells && character.spells.length > 0) {
      console.log("\nSpells:");
      character.spells.forEach(spell => {
        console.log(`- ${spell.name} (Level ${spell.level})`);
      });
    }
    
    return character;
  }

  /**
   * Get the number of cantrips a class can choose at level 1
   */
  private getCantripsLimit(className: string): number {
    switch (className) {
      case 'bard':
        return 2;
      case 'cleric':
        return 3;
      case 'druid':
        return 2;
      case 'sorcerer':
        return 4;
      case 'warlock':
        return 2;
      case 'wizard':
        return 3;
      default:
        return 0;
    }
  }

  /**
   * Get the number of spells a class can choose at level 1
   */
  private getSpellChoiceLimit(className: string): number {
    switch (className) {
      case 'bard':
        return 4;
      case 'cleric':
        return 2; // Plus domain spells
      case 'druid':
        return 2;
      case 'sorcerer':
        return 2;
      case 'warlock':
        return 2;
      case 'wizard':
        return 6;
      default:
        return 0;
    }
  }
}