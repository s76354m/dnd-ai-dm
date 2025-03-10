/**
 * Mock NPC for examples
 */

/**
 * A simplified mock of NPC for examples
 */
import { NPC, NPCAttitude } from '../../core/interfaces/npc';

export class MockNPC {
  public id: string;
  public name: string;
  public race: string;
  public occupation: string;
  public appearance: string;
  public personality: {
    traits: string[];
    currentMood: string;
    flaws: string[];
  };
  public motivation: string;
  public history: string;
  public knowledge: string[];
  public relationships: {
    npcId: string;
    name: string;
    relationship: string;
    attitude: NPCAttitude;
  }[];
  public stats: {
    hitPoints: {
      current: number;
      maximum: number;
    };
    armorClass: number;
    initiative: number;
  };
  
  /**
   * Create a mock NPC with default values
   * 
   * @param name NPC name
   * @param race NPC race
   * @param occupation NPC occupation
   * @param appearance Brief description of NPC appearance
   */
  constructor(name: string, race: string, occupation: string, appearance: string) {
    this.id = `npc_${Math.random().toString(36).substring(2, 9)}`;
    this.name = name;
    this.race = race;
    this.occupation = occupation;
    this.appearance = appearance;
    
    // Default personality
    this.personality = {
      traits: this.getDefaultTraits(),
      currentMood: 'neutral',
      flaws: ['Suspicious of strangers', 'Sometimes speaks without thinking']
    };
    
    // Default motivation based on occupation
    this.motivation = this.getDefaultMotivation(occupation);
    
    // Default backstory
    this.history = this.getDefaultHistory(race, occupation);
    
    // Default knowledge
    this.knowledge = this.getDefaultKnowledge(occupation);
    
    // Default relationships (empty to start)
    this.relationships = [];
    
    // Default stats
    this.stats = {
      hitPoints: {
        current: 8,
        maximum: 8
      },
      armorClass: 10,
      initiative: 0
    };
  }
  
  /**
   * Get default personality traits
   */
  private getDefaultTraits(): string[] {
    const allTraits = [
      'friendly', 'cautious', 'curious', 'determined', 'honest', 
      'brave', 'kind', 'wise', 'cheerful', 'reserved', 'observant'
    ];
    
    // Randomly select 2-3 traits
    const numTraits = 2 + Math.floor(Math.random() * 2);
    const traits: string[] = [];
    
    for (let i = 0; i < numTraits; i++) {
      const randomIndex = Math.floor(Math.random() * allTraits.length);
      traits.push(allTraits[randomIndex]);
      allTraits.splice(randomIndex, 1);
    }
    
    return traits;
  }
  
  /**
   * Get default motivation based on occupation
   */
  private getDefaultMotivation(occupation: string): string {
    switch (occupation.toLowerCase()) {
      case 'innkeeper':
        return 'To make a successful living by running a welcoming establishment';
      case 'blacksmith':
        return 'To create quality weapons and tools that will bring renown to their craft';
      case 'merchant':
        return 'To expand their business and discover rare goods to trade';
      case 'guard':
        return 'To protect the town and maintain order';
      case 'farmer':
        return 'To provide for their family and ensure a good harvest';
      case 'noble':
        return 'To increase their family\'s wealth, power, and status';
      case 'priest':
      case 'cleric':
        return 'To spread the teachings of their deity and help the faithful';
      case 'bard':
        return 'To collect and perform the greatest stories and songs in the realm';
      default:
        return 'To be successful in their chosen profession';
    }
  }
  
  /**
   * Get default history based on race and occupation
   */
  private getDefaultHistory(race: string, occupation: string): string {
    if (occupation.toLowerCase() === 'innkeeper') {
      return `A former adventurer who settled down to open an inn, using the tales of their exploits to entertain guests. Has lived in the area for about 15 years.`;
    } else if (occupation.toLowerCase() === 'blacksmith') {
      return `Learned the trade from their parent, and has been working as a smith for most of their life. Known for their craftsmanship throughout the region.`;
    } else if (race.toLowerCase() === 'elf') {
      return `Has lived for over a century, and has seen the rise and fall of several human generations. Carries the wisdom and traditions of their elven heritage.`;
    } else {
      return `A local resident who has worked as a ${occupation} for many years, well-respected in the community for their reliable service.`;
    }
  }
  
  /**
   * Get default knowledge based on occupation
   */
  private getDefaultKnowledge(occupation: string): string[] {
    const commonKnowledge = ['Local town gossip', 'Nearby landmarks'];
    
    switch (occupation.toLowerCase()) {
      case 'innkeeper':
        return [...commonKnowledge, 'Travelers\' tales', 'Quality of local breweries', 'Regional politics'];
      case 'blacksmith':
        return [...commonKnowledge, 'Weapon crafting', 'Armor maintenance', 'Mining locations', 'Metal quality'];
      case 'merchant':
        return [...commonKnowledge, 'Trade routes', 'Commodity prices', 'Regional economics', 'Foreign customs'];
      case 'guard':
        return [...commonKnowledge, 'Criminal activity', 'Town laws', 'Defense tactics', 'Local troublemakers'];
      case 'bard':
        return [...commonKnowledge, 'Ancient legends', 'Noble lineages', 'Cultural traditions', 'Popular songs'];
      default:
        return commonKnowledge;
    }
  }
  
  /**
   * Update the NPC's mood
   */
  public setMood(mood: string): void {
    this.personality.currentMood = mood;
  }
  
  /**
   * Add a relationship with another character/NPC
   */
  public addRelationship(
    npcId: string,
    name: string,
    relationship: string,
    attitude: NPCAttitude
  ): void {
    this.relationships.push({
      npcId,
      name,
      relationship,
      attitude
    });
  }
  
  /**
   * Add a piece of knowledge to the NPC
   */
  public addKnowledge(knowledge: string): void {
    if (!this.knowledge.includes(knowledge)) {
      this.knowledge.push(knowledge);
    }
  }
  
  /**
   * Damage the NPC
   */
  public takeDamage(amount: number): void {
    this.stats.hitPoints.current = Math.max(0, this.stats.hitPoints.current - amount);
  }
  
  /**
   * Heal the NPC
   */
  public heal(amount: number): void {
    this.stats.hitPoints.current = Math.min(
      this.stats.hitPoints.maximum, 
      this.stats.hitPoints.current + amount
    );
  }
  
  /**
   * Check if the NPC knows a particular character
   */
  public knowsCharacter(characterName: string): boolean {
    return this.relationships.some(rel => rel.name === characterName);
  }
  
  /**
   * Get the NPC's attitude toward a particular character
   */
  public getAttitudeToward(characterName: string): NPCAttitude | 'unknown' {
    const relationship = this.relationships.find(rel => rel.name === characterName);
    return relationship ? relationship.attitude : 'unknown';
  }
} 