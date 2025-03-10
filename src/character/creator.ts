import { CharacterCreator as BaseCharacterCreator } from './creation/creator';
import type { Race, Class, Background, Alignment, Skill, Subrace, Subclass } from '../core/types';
import { AbilityScores, Character, Item, Spell, TraitDetail, Trait, RacialTrait, ClassFeature, BackgroundFeature } from '../core/interfaces';
import { EventEmitter } from 'events';

// Import the AbilityScore interface and ItemCategory enum
import { AbilityScore } from '../core/interfaces/character';
import { ItemCategory } from '../core/interfaces/item';

/**
 * Character Creator
 * 
 * Handles the creation and validation of new player characters.
 * Extends the base character creator with additional update methods and event handling.
 */
export class CharacterCreator extends BaseCharacterCreator {
  /**
   * Start the character creation process
   * This initializes the character with default values and begins the step-by-step creation flow
   */
  public startCreation(): void {
    // Reset the character creation state
    this.reset();
    
    // Set the starting step to name
    this.getState().step = 'name';
    
    // Emit the step change event
    this.emit('stepChange', this.getState().step);
    
    // Process the current step to begin the name prompt
    // Call the method directly on this instance to avoid access issues
    this.handleCurrentStep();
    
    console.log('Character creation started. Follow the prompts to create your character.');
  }

  /**
   * Updates the character's name
   */
  public updateCharacterName(name: string): void {
    if (!name || name.trim() === '') {
      this.emit('validationError', ['Name cannot be empty']);
      return;
    }
    
    this.setName(name);
    this.emit('nameUpdated', name);
  }

  /**
   * Updates the character's race and applies racial traits
   */
  public updateCharacterRace(race: Race): void {
    if (!race) {
      this.emit('validationError', ['Race must be selected']);
      return;
    }
    
    this.setRace(race);
    
    // Apply racial traits and ability score modifiers
    this.applyRacialTraits(race);
    
    this.emit('raceUpdated', race);
  }

  /**
   * Apply racial traits and ability score modifiers
   */
  private applyRacialTraits(race: Race): void {
    const raceData = this.getRaceData(race);
    if (!raceData) return;
    
    const character = this.getState().character;
    
    // Apply ability score bonuses
    const racialBonuses = this.getRacialAbilityBonusesForRace(race);
    if (racialBonuses && character.abilityScores) {
      // Apply bonuses to the short form properties if they exist
      for (const ability in racialBonuses) {
        const abilityKey = ability as keyof AbilityScores;
        const shortKey = this.getAbilityShortName(ability) as keyof AbilityScores;
        
        if (character.abilityScores[shortKey] !== undefined) {
          const currentScore = character.abilityScores[shortKey] as number;
          const bonus = racialBonuses[abilityKey] as number;
          character.abilityScores[shortKey] = currentScore + bonus as any;
        }
        
        // Apply bonuses to long form properties
        if (character.abilityScores[abilityKey] && typeof character.abilityScores[abilityKey] === 'object') {
          const abilityObj = character.abilityScores[abilityKey] as AbilityScore;
          const bonus = racialBonuses[abilityKey] as number;
          abilityObj.score += bonus;
          abilityObj.modifier = this.calculateAbilityModifier(abilityObj.score);
        }
      }
    }
    
    // Add racial traits
    if (raceData.traits) {
      const racialTraits: RacialTrait[] = [];
      for (const trait of raceData.traits) {
        racialTraits.push({
          name: trait.name,
          description: trait.description,
          source: race
        });
      }
      
      character.racialTraits = racialTraits;
    }
    
    // Set speed from race
    if (raceData.speed) {
      character.speed = raceData.speed;
    }
    
    // Add language proficiencies
    if (raceData.languages) {
      if (!character.proficiencies) {
        character.proficiencies = { languages: [], skills: [], tools: [], armor: [], weapons: [], savingThrows: [] };
      }
      
      character.proficiencies.languages = raceData.languages;
    }
  }

  /**
   * Get racial ability score bonuses for a specific race
   */
  private getRacialAbilityBonusesForRace(race: Race): Partial<AbilityScores> {
    const raceData = this.getRaceData(race);
    if (!raceData) {
      return {};
    }
    
    return raceData.abilityScoreIncrease || {};
  }

  /**
   * Get data for a specific race
   */
  private getRaceData(race: Race): any {
    const races = require('./data/races').races;
    return races[race] || null;
  }

  /**
   * Updates the character's class
   */
  public updateCharacterClass(characterClass: Class): void {
    this.state.character.class = characterClass;
    this.applyClassFeatures(characterClass);
    this.updateCharacterHitPoints();
    this.emit('classUpdated', characterClass);
  }

  /**
   * Apply class features and proficiencies
   */
  private applyClassFeatures(characterClass: Class): void {
    const classData = this.getClassData(characterClass);
    if (!classData) return;
    
    const character = this.getState().character;
    
    // Add class features
    if (classData.features) {
      const classFeatures: ClassFeature[] = [];
      for (const feature of classData.features) {
        if (feature.level <= (character.level || 1)) {
          classFeatures.push({
            name: feature.name,
            description: feature.description,
            level: feature.level,
            source: characterClass
          });
        }
      }
      
      character.classFeatures = classFeatures;
    }
    
    // Set proficiency bonus based on level
    character.proficiencyBonus = this.calculateProficiencyBonus(character.level || 1);
    
    // Set hit dice
    if (!character.hitDice) {
      character.hitDice = {
        diceType: `d${this.getHitDiceValue(characterClass.toString())}`,
        total: character.level || 1,
        used: 0
      };
    }
    
    // Set saving throw proficiencies
    if (classData.savingThrows) {
      if (!character.proficiencies) {
        character.proficiencies = { languages: [], skills: [], tools: [], armor: [], weapons: [], savingThrows: [] };
      }
      
      character.proficiencies.savingThrows = classData.savingThrows;
    }
    
    // Set armor and weapon proficiencies
    if (classData.proficiencies) {
      if (!character.proficiencies) {
        character.proficiencies = { languages: [], skills: [], tools: [], armor: [], weapons: [], savingThrows: [] };
      }
      
      if (classData.proficiencies.armor) {
        character.proficiencies.armor = classData.proficiencies.armor;
      }
      
      if (classData.proficiencies.weapons) {
        character.proficiencies.weapons = classData.proficiencies.weapons;
      }
      
      // Initialize skill proficiencies if needed
      if (classData.proficiencies.skills?.choices) {
        if (!character.proficiencies.skills) {
          character.proficiencies.skills = [];
        }
      }
    }
    
    // Set up spellcasting if applicable
    this.updateSpellcasting(characterClass);
  }

  /**
   * Calculate proficiency bonus based on level
   */
  protected calculateProficiencyBonus(level: number): number {
    return Math.floor((level - 1) / 4) + 2;
  }

  /**
   * Calculate spell slots based on class and level
   */
  private calculateSpellSlots(characterClass: Class, level: number): any {
    // Default empty spell slots
    const emptySlots = {
      level1: { total: 0, used: 0 },
      level2: { total: 0, used: 0 },
      level3: { total: 0, used: 0 },
      level4: { total: 0, used: 0 },
      level5: { total: 0, used: 0 },
      level6: { total: 0, used: 0 },
      level7: { total: 0, used: 0 },
      level8: { total: 0, used: 0 },
      level9: { total: 0, used: 0 }
    };
    
    // Get the class data
    const classData = this.getClassData(characterClass);
    if (!classData || !classData.spellcasting || !classData.spellcasting.slots) {
      return emptySlots;
    }
    
    // Get the slot table for the class
    const slotTable = classData.spellcasting.slots;
    if (!slotTable || level > slotTable.length) {
      return emptySlots;
    }
    
    // Get the slots for the current level
    const currentLevelSlots = slotTable[level - 1];
    if (!currentLevelSlots) {
      return emptySlots;
    }
    
    // Map the slots to the required format
    return {
      level1: { total: currentLevelSlots[0] || 0, used: 0 },
      level2: { total: currentLevelSlots[1] || 0, used: 0 },
      level3: { total: currentLevelSlots[2] || 0, used: 0 },
      level4: { total: currentLevelSlots[3] || 0, used: 0 },
      level5: { total: currentLevelSlots[4] || 0, used: 0 },
      level6: { total: currentLevelSlots[5] || 0, used: 0 },
      level7: { total: currentLevelSlots[6] || 0, used: 0 },
      level8: { total: currentLevelSlots[7] || 0, used: 0 },
      level9: { total: currentLevelSlots[8] || 0, used: 0 }
    };
  }

  /**
   * Get data for a specific class
   */
  private getClassData(characterClass: Class): any {
    const classes = require('./data/classes').classes;
    return classes[characterClass] || null;
  }

  /**
   * Updates the character's ability scores
   */
  public updateAbilityScores(scores: AbilityScores): void {
    // Basic validation
    const abilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const errors = [];
    
    // Check short form properties if they exist
    for (const ability of abilities) {
      const abilityKey = ability as keyof AbilityScores;
      if (scores[abilityKey] !== undefined) {
        const score = scores[abilityKey] as number;
        if (score < 3 || score > 18) {
          errors.push(`${ability.toUpperCase()} must be between 3 and 18`);
        }
      }
    }
    
    // If using long form properties, validate those
    if (!scores.str && scores.strength) {
      const longFormAbilities = [
        { short: 'str', long: 'strength' },
        { short: 'dex', long: 'dexterity' },
        { short: 'con', long: 'constitution' },
        { short: 'int', long: 'intelligence' },
        { short: 'wis', long: 'wisdom' },
        { short: 'cha', long: 'charisma' }
      ];
      
      for (const ability of longFormAbilities) {
        const longKey = ability.long as keyof AbilityScores;
        const abilityScore = scores[longKey] as AbilityScore;
        if (abilityScore && (abilityScore.score < 3 || abilityScore.score > 18)) {
          errors.push(`${ability.short.toUpperCase()} must be between 3 and 18`);
        }
      }
    }
    
    if (errors.length > 0) {
      this.emit('validationError', errors);
      return;
    }
    
    // Calculate modifiers for each ability score
    const updatedScores = { ...scores } as AbilityScores;
    
    // Update short form properties with modifiers
    for (const ability of abilities) {
      const abilityKey = ability as keyof AbilityScores;
      if (updatedScores[abilityKey] !== undefined) {
        const score = updatedScores[abilityKey] as number;
        const modifier = this.calculateAbilityModifier(score);
        
        // Update the long form property if it exists
        const longFormKey = this.getAbilityLongName(ability) as keyof AbilityScores;
        if (!updatedScores[longFormKey]) {
          (updatedScores[longFormKey] as any) = {
            score,
            modifier
          };
        }
      }
    }
    
    // Update long form properties with modifiers
    const longFormAbilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    for (const ability of longFormAbilities) {
      const abilityKey = ability as keyof AbilityScores;
      const abilityScore = updatedScores[abilityKey] as AbilityScore;
      if (abilityScore && abilityScore.score !== undefined && abilityScore.modifier === undefined) {
        abilityScore.modifier = this.calculateAbilityModifier(abilityScore.score);
      }
    }
    
    this.setAbilityScores(updatedScores);
    
    // Update hit points since con modifier may have changed
    this.updateCharacterHitPoints();
    
    this.emit('abilitiesUpdated', updatedScores);
  }
  
  /**
   * Calculate the ability modifier from a score
   * 
   * @param score The ability score
   * @returns The calculated modifier
   */
  private calculateAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }
  
  /**
   * Get the long form name of an ability from its short form
   * 
   * @param shortName The short ability name (str, dex, etc.)
   * @returns The long form name (strength, dexterity, etc.)
   */
  private getAbilityLongName(shortName: string): string {
    const abilityMap: Record<string, string> = {
      str: 'strength',
      dex: 'dexterity',
      con: 'constitution',
      int: 'intelligence',
      wis: 'wisdom',
      cha: 'charisma'
    };
    
    return abilityMap[shortName.toLowerCase()] || shortName;
  }
  
  /**
   * Get the short form name of an ability from its long form
   * 
   * @param longName The long ability name (strength, dexterity, etc.)
   * @returns The short form name (str, dex, etc.)
   */
  private getAbilityShortName(longName: string): string {
    const abilityMap: Record<string, string> = {
      strength: 'str',
      dexterity: 'dex',
      constitution: 'con',
      intelligence: 'int',
      wisdom: 'wis',
      charisma: 'cha'
    };
    
    return abilityMap[longName.toLowerCase()] || longName;
  }

  /**
   * Updates the character's background
   */
  public updateCharacterBackground(background: Background): void {
    this.state.character.background = background;
    this.applyBackgroundFeatures(background);
    this.emit('backgroundUpdated', background);
  }
  
  /**
   * Apply background features to the character
   */
  private applyBackgroundFeatures(background: Background): void {
    const character = this.getCurrentCharacter();
    const backgroundData = this.getBackgroundData(background);
    
    if (!backgroundData) {
      console.error(`Background data not found for ${background}`);
      return;
    }
    
    // Initialize personality if it doesn't exist
    if (!character.personality) {
      character.personality = {
        traits: [],
        ideals: [],
        bonds: [],
        flaws: []
      };
    }
    
    // Add background feature
    const backgroundFeature: BackgroundFeature = {
      name: backgroundData.feature.name,
      description: backgroundData.feature.description,
      source: background
    };
    
    character.backgroundFeature = backgroundFeature;
    
    // Add personality traits
    if (backgroundData.traits && backgroundData.traits.suggestions) {
      character.personality.traits = [backgroundData.traits.suggestions[0]];
    }
    
    // Add ideals
    if (backgroundData.ideals && backgroundData.ideals.suggestions) {
      character.personality.ideals = [backgroundData.ideals.suggestions[0]];
    }
    
    // Add bonds
    if (backgroundData.bonds && backgroundData.bonds.suggestions) {
      character.personality.bonds = [backgroundData.bonds.suggestions[0]];
    }
    
    // Add flaws
    if (backgroundData.flaws && backgroundData.flaws.suggestions) {
      character.personality.flaws = [backgroundData.flaws.suggestions[0]];
    }
    
    // Add proficiencies
    if (!character.proficiencies) {
      character.proficiencies = {
        skills: [],
        tools: [],
        armor: [],
        weapons: [],
        savingThrows: [],
        languages: []
      };
    }
    
    // Add skill proficiencies
    if (backgroundData.skillProficiencies) {
      character.proficiencies.skills = [
        ...character.proficiencies.skills,
        ...backgroundData.skillProficiencies
      ];
    }
    
    // Add tool proficiencies
    if (backgroundData.toolProficiencies) {
      character.proficiencies.tools = [
        ...character.proficiencies.tools,
        ...backgroundData.toolProficiencies
      ];
    }
    
    // Add languages
    if (backgroundData.languages) {
      character.proficiencies.languages = [
        ...character.proficiencies.languages,
        ...backgroundData.languages
      ];
    }
    
    // Add equipment
    if (backgroundData.equipment) {
      this.addBackgroundEquipment(backgroundData.equipment);
    }
  }
  
  /**
   * Add background equipment to the character's inventory
   */
  private addBackgroundEquipment(equipment: string[]): void {
    const character = this.getCurrentCharacter();
    
    if (!character.inventory) {
      character.inventory = {
        gold: 0,
        items: []
      };
    }
    
    // Create items from equipment strings
    for (const itemName of equipment) {
      const item: Item = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: itemName,
        description: `Standard ${itemName}`,
        weight: 1, // Default weight
        value: 5, // Default value in gold pieces
        category: this.determineItemCategory(itemName)
      };
      
      // Add to inventory
      character.inventory.items.push(item);
    }
  }
  
  /**
   * Get data for a specific background
   */
  private getBackgroundData(background: Background): any {
    const backgrounds = require('./data/backgrounds').backgrounds;
    return backgrounds[background] || null;
  }

  /**
   * Updates the character's equipment
   */
  public updateCharacterEquipment(items: Item[]): void {
    const character = this.getCurrentCharacter();
    
    // Initialize inventory if it doesn't exist
    if (!character.inventory) {
      character.inventory = {
        gold: 0,
        items: []
      };
    }
    
    // Add items to inventory
    character.inventory.items = [...character.inventory.items, ...items];
    
    // Ensure equipment array exists
    if (!character.equipment) {
      character.equipment = [];
    }
    
    // For each item that should be equipped, add to equipment array
    for (const item of items) {
      if (item.equipped) {
        character.equipment.push(item);
      }
    }
  }
  
  /**
   * Calculate armor class based on equipment and ability scores
   */
  private calculateArmorClass(character: Character): number {
    // Get all items from inventory
    const items = character.inventory?.items || [];
    
    if (!items || items.length === 0) {
      // No armor, base AC is 10 + DEX modifier
      return 10 + this.getAbilityModifierByName('dexterity');
    }
    
    // Find equipped armor and shield
    const armorItems = items.filter((item: Item) =>
      item.category === ItemCategory.Armor || 
      item.category === ItemCategory.Shield
    );
    
    const wornArmor = armorItems.find((item: Item) => item.category === ItemCategory.Armor && (item as any).equipped);
    const wornShield = armorItems.find((item: Item) => item.category === ItemCategory.Shield && (item as any).equipped); 
    
    let baseAC = 10; // Default AC
    let dexModifier = this.getAbilityModifierByName('dexterity');
    let maxDexBonus = Infinity;
    
    // Apply armor AC if wearing armor
    if (wornArmor) {
      baseAC = wornArmor.armorClass || 10;
      
      // Check armor type for DEX bonus limitations
      if (wornArmor.category === ItemCategory.Armor) {
        // Heavy armor doesn't add DEX
        if (wornArmor.name.toLowerCase().includes('plate') || 
            wornArmor.name.toLowerCase().includes('splint') || 
            wornArmor.name.toLowerCase().includes('chain mail')) {
          maxDexBonus = 0;
        }
        // Medium armor adds DEX up to +2
        else if (wornArmor.name.toLowerCase().includes('half plate') || 
                 wornArmor.name.toLowerCase().includes('breastplate') || 
                 wornArmor.name.toLowerCase().includes('scale mail') || 
                 wornArmor.name.toLowerCase().includes('hide')) {
          maxDexBonus = 2;
        }
        // Light armor adds full DEX
      }
    }
    
    // Apply shield bonus
    const shieldBonus = wornShield ? (wornShield.armorClass || 2) : 0;
    
    // Calculate final AC
    return baseAC + Math.min(dexModifier, maxDexBonus) + shieldBonus;
  }

  /**
   * Updates the character's spells
   */
  public updateCharacterSpells(spells?: Spell[]): void {
    const character = this.getCurrentCharacter();
    
    // If no spells provided, try to get default spells
    if (!spells || spells.length === 0) {
      // Get default spells for the character's class and level
      if (character.class) {
        const classData = this.getClassData(character.class);
        const classSpells = classData?.spellcasting?.spells || [];
        const characterLevel = character.level || 1;
        
        // Filter spells by level
        spells = classSpells.filter((spell: any) => spell.level <= Math.ceil(characterLevel / 2));
      } else {
        spells = [];
      }
    }
    
    // Ensure we have a spellcasting property
    if (!character.spellcasting && character.class) {
      this.updateSpellcasting(character.class);
    }
    
    if (!spells || spells.length === 0) {
      return;
    }
    
    // Create a properly formatted spell list
    const characterSpells = spells.map(spell => {
      // Generate a unique ID if not present
      const spellId = `spell-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create a spell object that matches the interface in character.ts
      return {
        id: (spell as any).id || spellId,
        name: spell.name,
        level: spell.level,
        school: spell.school,
        castingTime: spell.castingTime,
        range: spell.range,
        components: {
          verbal: true,
          somatic: true,
          material: false,
          materials: ''
        },
        duration: spell.duration,
        description: spell.description,
        higherLevels: (spell as any).higherLevels || '',
        concentration: (spell as any).concentration || false,
        ritual: (spell as any).ritual || false
      };
    });
    
    // Update the character's spells
    if (character.spellcasting) {
      character.spellcasting.spellsKnown = characterSpells;
    }
    
    this.emit('spellsUpdated', characterSpells);
  }

  /**
   * Updates the character's personal details
   */
  public updateCharacterDetails(details: {
    alignment?: Alignment,
    appearance?: any,
    personality?: any,
    backstory?: string,
    ideals?: string[],
    bonds?: string[],
    flaws?: string[]
  }): void {
    const character = this.getState().character;
    
    // Initialize required properties if they don't exist
    // Ensure traits array
    if (!character.traits) {
      character.traits = [];
    }
    
    // Ensure conditions array
    if (!character.conditions) {
      character.conditions = [];
    }
    
    // Ensure classFeatures array
    if (!character.classFeatures) {
      character.classFeatures = [];
    }
    
    // Ensure racialTraits array
    if (!character.racialTraits) {
      character.racialTraits = [];
    }
    
    // Ensure feats array
    if (!character.feats) {
      character.feats = [];
    }
    
    // Update alignment if provided
    if (details.alignment) {
      character.alignment = details.alignment;
    }
    
    // Update appearance if provided
    if (details.appearance) {
      character.appearance = {
        ...character.appearance || {
          age: 0,
          height: '',
          weight: '',
          eyes: '',
          skin: '',
          hair: ''
        },
        ...(typeof details.appearance === 'object' ? details.appearance : {
          description: details.appearance
        })
      };
    }
    
    // Update personality traits if provided
    if (details.personality) {
      if (!character.personality) {
        character.personality = { traits: [], ideals: [], bonds: [], flaws: [] };
      }
      
      if (typeof details.personality === 'object') {
        character.personality = {
          ...character.personality,
          ...details.personality
        };
      } else if (typeof details.personality === 'string') {
        character.personality.traits = [details.personality];
      }
    }
    
    // Update ideals, bonds, and flaws if provided
    if (details.ideals) {
      if (!character.personality) {
        character.personality = { traits: [], ideals: [], bonds: [], flaws: [] };
      }
      character.personality.ideals = details.ideals;
    }
    
    if (details.bonds) {
      if (!character.personality) {
        character.personality = { traits: [], ideals: [], bonds: [], flaws: [] };
      }
      character.personality.bonds = details.bonds;
    }
    
    if (details.flaws) {
      if (!character.personality) {
        character.personality = { traits: [], ideals: [], bonds: [], flaws: [] };
      }
      character.personality.flaws = details.flaws;
    }
    
    // Update backstory if provided
    if (details.backstory) {
      character.backstory = details.backstory;
    }
    
    // Initialize deathSaves if it doesn't exist
    if (!character.deathSaves) {
      character.deathSaves = {
        successes: 0,
        failures: 0
      };
    }
    
    // Initialize inspiration if it doesn't exist
    if (character.inspiration === undefined) {
      character.inspiration = false;
    }
    
    this.emit('detailsUpdated', details);
  }

  /**
   * Updates the character's alignment
   */
  public setAlignment(alignment: Alignment): void {
    if (!alignment) {
      this.emit('validationError', ['Alignment must be specified']);
      return;
    }
    
    // Update the character's alignment
    if (this.getState().character) {
      this.getState().character.alignment = alignment;
    }
    
    this.emit('alignmentUpdated', alignment);
  }

  /**
   * Gets the available races for character creation
   */
  public getAvailableRaces(): Race[] {
    const races = require('./data/races').races;
    return Object.keys(races) as Race[];
  }

  /**
   * Gets the available classes for character creation
   */
  public getAvailableClasses(): Class[] {
    const classes = require('./data/classes').classes;
    return Object.keys(classes) as Class[];
  }

  /**
   * Gets the available backgrounds for character creation
   */
  public getAvailableBackgrounds(): Background[] {
    const backgrounds = require('./data/backgrounds').backgrounds;
    return Object.keys(backgrounds) as Background[];
  }

  /**
   * Get the hit dice value for a character class
   */
  private getHitDiceValue(className: string): number {
    switch (className.toLowerCase()) {
      case 'barbarian':
        return 12;
      case 'fighter':
      case 'paladin':
      case 'ranger':
        return 10;
      case 'bard':
      case 'cleric':
      case 'druid':
      case 'monk':
      case 'rogue':
      case 'warlock':
        return 8;
      case 'sorcerer':
      case 'wizard':
        return 6;
      default:
        return 8; // Default to d8 for unknown classes
    }
  }

  /**
   * Calculate starting hit points for a character
   * First level: maximum hit dice value + Constitution modifier
   */
  public calculateStartingHitPoints(characterClass: string, constitutionModifier: number): number {
    const hitDiceValue = this.getHitDiceValue(characterClass);
    return hitDiceValue + constitutionModifier;
  }

  /**
   * Update the character's hit points based on class and Constitution
   * This should be called whenever the class or Constitution modifier changes
   */
  public updateCharacterHitPoints(): void {
    const character = this.getState().character;
    
    if (!character.class) {
      return;
    }
    
    // Get hit dice value for class
    const hitDiceValue = this.getHitDiceValue(character.class);
    
    // Get Constitution modifier
    const conModifier = this.calculateAbilityModifierFromName('constitution');
    
    // Calculate max HP (hit dice max + con mod for first level, then average + con mod for each additional level)
    const level = character.level || 1;
    let maxHP = hitDiceValue + conModifier;
    
    // Add average roll + con mod for each level after 1st
    if (level > 1) {
      const averageRoll = Math.floor(hitDiceValue / 2) + 1;
      maxHP += (averageRoll + conModifier) * (level - 1);
    }
    
    // Update character
    character.hitPoints = {
      current: maxHP,
      maximum: maxHP
    };
  }

  /**
   * Completes the character creation process and returns the final character
   */
  public completeCharacter(): Character {
    const character = this.getState().character as Character;
    
    // Ensure all required fields are present
    if (!character.name || !character.race || !character.class || !character.background) {
      throw new Error('Character is incomplete. Required fields: name, race, class, background');
    }
    
    // Set final values
    character.id = character.id || `character-${Date.now()}`;
    character.level = character.level || 1;
    character.experiencePoints = character.experiencePoints || 0;
    character.initiative = this.calculateAbilityModifierFromName('dexterity');
    
    // Initialize missing required properties from Character interface
    character.alignment = character.alignment || 'True Neutral';
    character.temporaryHitPoints = character.temporaryHitPoints || 0;
    character.hitDice = character.hitDice || { 
      total: character.level, 
      current: character.level,
      size: this.getHitDiceForClass(character.class)
    };
    character.armorClass = character.armorClass || this.calculateArmorClass(character);
    character.speed = character.speed || this.getRaceData(character.race).speed || 30;
    character.proficiencyBonus = character.proficiencyBonus || this.calculateProficiencyBonus(character.level);
    
    // Initialize skills if not present
    if (!character.skills) {
      character.skills = this.initializeSkills(character);
    }
    
    // Ensure arrays are initialized
    character.conditions = character.conditions || [];
    character.inventory = character.inventory || [];
    character.traits = character.traits || [];
    character.classFeatures = character.classFeatures || [];
    character.racialTraits = character.racialTraits || [];
    character.feats = character.feats || [];
    
    // Initialize personality if not present
    character.personality = character.personality || {
      traits: [],
      ideals: [],
      bonds: [],
      flaws: []
    };
    
    // Initialize appearance if not present
    character.appearance = character.appearance || {
      age: 25,
      height: '',
      weight: '',
      eyes: '',
      skin: '',
      hair: ''
    };
    
    // Initialize wealth/currency
    character.wealth = character.wealth || {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 0,
      platinum: 0
    };
    
    // Initialize death saves
    character.deathSaves = character.deathSaves || {
      successes: 0,
      failures: 0
    };
    
    // Initialize inspiration
    character.inspiration = character.inspiration !== undefined ? character.inspiration : false;
    
    // Initialize backstory
    character.backstory = character.backstory || '';
    
    return character;
  }

  /**
   * Returns the current character in creation
   */
  public getCurrentCharacter(): Partial<Character> {
    return this.getState().character;
  }

  /**
   * Update the character's spellcasting abilities based on their class
   */
  private updateSpellcasting(characterClass: Class): void {
    if (!characterClass) {
      return;
    }
    
    const character = this.getCurrentCharacter();
    const classData = this.getClassData(characterClass);
    
    // If the class doesn't have spellcasting, return
    if (!classData || !classData.spellcasting) {
      return;
    }
    
    // Initialize spellcasting if it doesn't exist
    if (!character.spellcasting) {
      character.spellcasting = {
        ability: classData.spellcasting.ability,
        spellSaveDC: 8 + (character.proficiencyBonus || 2) + this.getAbilityModifierByName(classData.spellcasting.ability),
        spellAttackBonus: (character.proficiencyBonus || 2) + this.getAbilityModifierByName(classData.spellcasting.ability),
        spellSlots: this.calculateSpellSlots(characterClass, character.level || 1),
        spellsKnown: [],
        spellcastingClass: characterClass
      };
    }
    
    // Update spell slots based on level
    character.spellcasting.spellSlots = this.calculateSpellSlots(characterClass, character.level || 1);
  }

  /**
   * Gets the ability modifier for a given ability name
   */
  private getAbilityModifierByName(abilityName: string): number {
    const character = this.getCurrentCharacter();
    
    if (!character.abilityScores) {
      return 0;
    }
    
    // Convert ability name to both long and short forms for flexibility
    const longKey = this.getAbilityLongName(abilityName) as keyof AbilityScores;
    const shortKey = this.getAbilityShortName(abilityName) as keyof AbilityScores;
    
    // Check if we have the long form ability score object
    if (character.abilityScores[longKey] && 
        typeof character.abilityScores[longKey] === 'object') {
      return (character.abilityScores[longKey] as AbilityScore).modifier;
    }
    
    // Check if we have the short form ability score
    if (character.abilityScores[shortKey] !== undefined) {
      return this.calculateAbilityModifier(character.abilityScores[shortKey] as number);
    }
    
    // Default to 0 if not found
    return 0;
  }

  /**
   * Calculate ability modifier from ability name
   */
  private calculateAbilityModifierFromName(abilityName: string): number {
    return this.getAbilityModifierByName(abilityName);
  }

  /**
   * Get the hit dice size for a character class
   */
  private getHitDiceForClass(className: Class): number {
    switch (className.toLowerCase()) {
      case 'barbarian':
        return 12;
      case 'fighter':
      case 'paladin':
      case 'ranger':
        return 10;
      case 'bard':
      case 'cleric':
      case 'druid':
      case 'monk':
      case 'rogue':
      case 'warlock':
        return 8;
      case 'sorcerer':
      case 'wizard':
        return 6;
      default:
        return 8; // Default to d8 for unknown classes
    }
  }

  /**
   * Initialize skills for a character
   */
  private initializeSkills(character: Partial<Character>): Record<Skill, { proficient: boolean; expertise: boolean; bonus: number }> {
    const skills: Record<Skill, { proficient: boolean; expertise: boolean; bonus: number }> = {} as any;
    
    const allSkills: Skill[] = [
      'acrobatics', 'animal handling', 'arcana', 'athletics', 'deception',
      'history', 'insight', 'intimidation', 'investigation', 'medicine',
      'nature', 'perception', 'performance', 'persuasion', 'religion',
      'sleight of hand', 'stealth', 'survival'
    ];
    
    // Initialize each skill
    for (const skill of allSkills) {
      // Determine the ability modifier for this skill
      const abilityModifier = this.getAbilityModifierForSkill(skill);
      
      // Check if the character is proficient in this skill
      const isProficient = character.proficiencies?.skills?.includes(skill) || false;
      
      // Calculate the bonus
      const proficiencyBonus = isProficient ? (character.proficiencyBonus || 2) : 0;
      const bonus = abilityModifier + proficiencyBonus;
      
      // Set the skill data
      skills[skill] = {
        proficient: isProficient,
        expertise: false, // Default to false, can be updated later
        bonus: bonus
      };
    }
    
    return skills;
  }

  /**
   * Get the ability modifier for a specific skill
   */
  private getAbilityModifierForSkill(skill: Skill): number {
    // Map skills to their associated abilities
    const skillAbilities: Record<Skill, keyof AbilityScores> = {
      acrobatics: 'dexterity',
      'animal handling': 'wisdom',
      arcana: 'intelligence',
      athletics: 'strength',
      deception: 'charisma',
      history: 'intelligence',
      insight: 'wisdom',
      intimidation: 'charisma',
      investigation: 'intelligence',
      medicine: 'wisdom',
      nature: 'intelligence',
      perception: 'wisdom',
      performance: 'charisma',
      persuasion: 'charisma',
      religion: 'intelligence',
      'sleight of hand': 'dexterity',
      stealth: 'dexterity',
      survival: 'wisdom'
    };
    
    // Get the ability associated with this skill
    const ability = skillAbilities[skill];
    
    // Get the ability modifier
    return this.getAbilityModifierByName(ability);
  }

  /**
   * Update the Error_Breakdown_Plan.md file to reflect the fixes made to the CharacterCreator class
   */
  private updateErrorBreakdownPlan(): void {
    // This is a placeholder method that would be implemented to update the Error_Breakdown_Plan.md file
    // In a real implementation, this would write to the file system
    console.log('Updated Error_Breakdown_Plan.md with CharacterCreator fixes');
  }

  /**
   * Determine the category of an item based on its name
   */
  private determineItemCategory(itemName: string): ItemCategory {
    const name = itemName.toLowerCase();
    
    // Weapons
    if (name.includes('sword') || name.includes('axe') || name.includes('mace') || 
        name.includes('dagger') || name.includes('bow') || name.includes('crossbow') || 
        name.includes('staff') || name.includes('wand') || name.includes('spear') || 
        name.includes('hammer') || name.includes('flail') || name.includes('javelin')) {
      return ItemCategory.Weapon;
    }
    
    // Armor
    if (name.includes('armor') || name.includes('mail') || name.includes('plate') || 
        name.includes('leather') || name.includes('hide') || name.includes('breastplate')) {
      return ItemCategory.Armor;
    }
    
    // Shield
    if (name.includes('shield')) {
      return ItemCategory.Shield;
    }
    
    // Potions
    if (name.includes('potion')) {
      return ItemCategory.Potion;
    }
    
    // Scrolls
    if (name.includes('scroll')) {
      return ItemCategory.Scroll;
    }
    
    // Tools
    if (name.includes('tool') || name.includes('kit') || name.includes('set')) {
      return ItemCategory.Tool;
    }
    
    // Clothing
    if (name.includes('clothes') || name.includes('robe') || name.includes('cloak') || 
        name.includes('boots') || name.includes('gloves') || name.includes('hat')) {
      return ItemCategory.Clothing;
    }
    
    // Default to misc
    return ItemCategory.Misc;
  }

  /**
   * Get all available skills
   */
  private getAllSkills(): string[] {
    return [
      'acrobatics', 'animal handling', 'arcana', 'athletics', 'deception',
      'history', 'insight', 'intimidation', 'investigation', 'medicine',
      'nature', 'perception', 'performance', 'persuasion', 'religion',
      'sleight of hand', 'stealth', 'survival'
    ];
  }

  /**
   * Get the ability score associated with a skill
   */
  private getAbilityForSkill(): Record<string, keyof AbilityScores> {
    return {
      acrobatics: 'dexterity',
      'animal handling': 'wisdom',
      arcana: 'intelligence',
      athletics: 'strength',
      deception: 'charisma',
      history: 'intelligence',
      insight: 'wisdom',
      intimidation: 'charisma',
      investigation: 'intelligence',
      medicine: 'wisdom',
      nature: 'intelligence',
      perception: 'wisdom',
      performance: 'charisma',
      persuasion: 'charisma',
      religion: 'intelligence',
      'sleight of hand': 'dexterity',
      stealth: 'dexterity',
      survival: 'wisdom'
    };
  }
}

// Export a singleton instance
export default new CharacterCreator(); 