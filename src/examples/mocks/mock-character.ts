/**
 * Mock Character for examples
 */

import { Inventory } from '../../core/interfaces/character';
import { Item } from '../../core/interfaces/item';

/**
 * A simplified mock of Character for examples
 */
export class MockCharacter {
  public id: string;
  public name: string;
  public race: string;
  public class: { name: string; level: number }[];
  public background: string;
  public alignment: string;
  public abilities: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  public hitPoints: {
    current: number;
    maximum: number;
  };
  public appearance: string;
  public backstory: string;
  public inventory: Inventory;
  
  /**
   * Create a mock character with default values
   * 
   * @param name Character name
   * @param race Character race
   * @param className Character class name
   */
  constructor(name: string, race: string, className: string) {
    this.id = `char_${Math.random().toString(36).substring(2, 9)}`;
    this.name = name;
    this.race = race;
    this.class = [{ name: className, level: 1 }];
    this.background = 'Soldier';
    this.alignment = 'Neutral Good';
    
    // Default ability scores
    this.abilities = {
      strength: 14,
      dexterity: 12,
      constitution: 13,
      intelligence: 10,
      wisdom: 11,
      charisma: 10
    };
    
    // Default hit points based on class
    let maxHp = 0;
    if (className === 'Fighter') {
      maxHp = 10 + this.getAbilityModifier('constitution');
    } else if (className === 'Wizard' || className === 'Sorcerer') {
      maxHp = 6 + this.getAbilityModifier('constitution');
    } else if (className === 'Rogue' || className === 'Bard') {
      maxHp = 8 + this.getAbilityModifier('constitution');
    } else {
      maxHp = 8 + this.getAbilityModifier('constitution');
    }
    
    this.hitPoints = {
      current: maxHp,
      maximum: maxHp
    };
    
    // Default appearance and backstory
    this.appearance = this.getDefaultAppearance(race);
    this.backstory = this.getDefaultBackstory(race, className);
    
    // Default inventory
    const defaultItems = this.getDefaultInventory(className);
    this.inventory = {
      gold: 15,
      items: defaultItems.map(itemName => ({ 
        id: `item_${Math.random().toString(36).substring(2, 9)}`,
        name: itemName,
        description: `Standard ${itemName.toLowerCase()}`
      }))
    };
  }
  
  /**
   * Get ability modifier from ability score
   */
  public getAbilityModifier(ability: string): number {
    const score = this.abilities[ability as keyof typeof this.abilities] || 10;
    return Math.floor((score - 10) / 2);
  }
  
  /**
   * Get default appearance based on race
   */
  private getDefaultAppearance(race: string): string {
    switch (race) {
      case 'Human':
        return 'An average height human with brown hair and determined eyes.';
      case 'Dwarf':
        return 'A stout dwarf with a thick beard, braided intricately, and deep-set eyes.';
      case 'Elf':
        return 'A graceful elf with pointed ears, angular features, and alert eyes.';
      case 'Halfling':
        return 'A small halfling with curly hair, bright eyes, and a quick smile.';
      default:
        return 'A person of average height and build with no distinct features.';
    }
  }
  
  /**
   * Get default backstory based on race and class
   */
  private getDefaultBackstory(race: string, className: string): string {
    if (race === 'Dwarf' && className === 'Fighter') {
      return 'Born in the mountain holds, trained in the ancient fighting traditions of the dwarven people. Seeking glory and treasure to bring honor to their clan.';
    } else if (race === 'Elf' && (className === 'Wizard' || className === 'Sorcerer')) {
      return 'Raised among the ancient libraries of the elven kingdoms, studying the arcane arts and magical traditions passed down through generations.';
    } else {
      return 'A traveler seeking adventure and fortune, having left their homeland to explore the wider world and make a name for themselves.';
    }
  }
  
  /**
   * Get default inventory based on class
   */
  private getDefaultInventory(className: string): string[] {
    switch (className.toLowerCase()) {
      case 'fighter':
        return ['Longsword', 'Shield', 'Chain Mail', 'Backpack', 'Bedroll', 'Rations (5)'];
      case 'wizard':
        return ['Spellbook', 'Staff', 'Component Pouch', 'Backpack', 'Scholar\'s Pack'];
      case 'rogue':
        return ['Shortsword', 'Shortbow', 'Leather Armor', 'Thieves\' Tools', 'Backpack'];
      case 'cleric':
        return ['Mace', 'Scale Mail', 'Shield', 'Holy Symbol', 'Backpack', 'Healer\'s Kit'];
      default:
        return ['Dagger', 'Backpack', 'Bedroll', 'Rations (3)', 'Waterskin'];
    }
  }
  
  /**
   * Damage the character
   */
  public takeDamage(amount: number): void {
    this.hitPoints.current = Math.max(0, this.hitPoints.current - amount);
  }
  
  /**
   * Heal the character
   */
  public heal(amount: number): void {
    this.hitPoints.current = Math.min(this.hitPoints.maximum, this.hitPoints.current + amount);
  }
  
  /**
   * Add an item to inventory
   */
  public addItem(item: string): void {
    const newItem: Item = {
      id: `item_${Math.random().toString(36).substring(2, 9)}`,
      name: item,
      description: `Standard ${item.toLowerCase()}`
    };
    this.inventory.items.push(newItem);
  }
  
  /**
   * Remove an item from inventory
   */
  public removeItem(itemName: string): boolean {
    const index = this.inventory.items.findIndex(i => i.name === itemName);
    if (index >= 0) {
      this.inventory.items.splice(index, 1);
      return true;
    }
    return false;
  }
} 