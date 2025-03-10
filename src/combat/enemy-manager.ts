/**
 * Enemy Manager
 * 
 * Handles the creation and management of enemy NPCs for combat encounters
 */

import { NPC } from '../core/interfaces/npc';
import { Race } from '../core/types';
import { v4 as uuidv4 } from 'uuid';
import { NPCStats } from '../core/interfaces/npc';
import * as fs from 'fs';
import * as path from 'path';
import { Monster } from '../core/interfaces/monster';
import { NPCAttitude } from '../core/interfaces/npc';

// Import monster data
import monsters from './data/monsters.json';

// Types of enemies that can be generated
export type EnemyType = string;

/**
 * Manages enemy NPCs for combat encounters
 */
export class EnemyManager {
  private monsters: Monster[] = [];

  constructor() {
    this.loadMonsters();
  }

  /**
   * Load monsters from data file
   */
  private loadMonsters(): void {
    try {
      this.monsters = monsters as Monster[];
      console.log(`Loaded ${this.monsters.length} monsters from data file`);
    } catch (error) {
      console.error('Error loading monster data:', error);
      this.monsters = [];
    }
  }
  
  /**
   * Create a new enemy NPC for combat
   */
  public createEnemy(
    type: EnemyType,
    level: number = 1,
    locationId: string = 'current'
  ): NPC {
    const monster = this.getMonsterById(type);
    if (!monster) {
      throw new Error(`Monster type not found: ${type}`);
    }
    
    // Generate a unique ID
    const id = `enemy-${type}-${uuidv4()}`;
    
    // Calculate HP based on level
    const hitPoints = monster.stats.hitPointsBase + 
      Math.floor(monster.stats.hitPointsPerLevel * Math.max(1, level / 2));
    
    // Create the enemy NPC
    const enemy: NPC = {
      id,
      name: monster.name,
      race: monster.type as Race, // Type assertion
      description: monster.description,
      attitude: NPCAttitude.Hostile,
      isQuestGiver: false,
      dialogue: [],
      location: locationId,
      stats: {
        level,
        abilityScores: monster.stats.abilityScores,
        armorClass: monster.stats.armorClass,
        hitPoints: hitPoints,
        speed: monster.stats.speed
      },
      traits: monster.traits.map(trait => trait.name)
    };
    
    return enemy;
  }
  
  /**
   * Generate a group of enemies
   */
  public createEnemyGroup(
    type: EnemyType,
    count: number,
    level: number = 1,
    locationId: string = 'current'
  ): NPC[] {
    const enemies: NPC[] = [];
    
    for (let i = 0; i < count; i++) {
      const enemy = this.createEnemy(type, level, locationId);
      
      // Add a number to the name if there are multiple enemies of the same type
      if (count > 1) {
        enemy.name = `${enemy.name} ${i + 1}`;
      }
      
      enemies.push(enemy);
    }
    
    return enemies;
  }
  
  /**
   * Get monster data by ID
   */
  private getMonsterById(id: string): Monster | undefined {
    return this.monsters.find(monster => monster.id === id);
  }
  
  /**
   * Get available enemy types
   */
  public getAvailableEnemyTypes(): EnemyType[] {
    return this.monsters.map(monster => monster.id);
  }
  
  /**
   * Create a random enemy
   */
  public createRandomEnemy(playerLevel: number, locationId: string = 'current'): NPC {
    const types = this.getAvailableEnemyTypes();
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    return this.createEnemy(randomType, playerLevel, locationId);
  }
  
  /**
   * Create a random group of enemies for an encounter
   */
  public createRandomEncounter(
    playerLevel: number,
    difficulty: 'easy' | 'medium' | 'hard' | 'deadly' = 'medium',
    locationId: string = 'current'
  ): NPC[] {
    // Determine number of enemies based on difficulty
    let minEnemies = 1;
    let maxEnemies = 2;
    
    switch (difficulty) {
      case 'easy':
        minEnemies = 1;
        maxEnemies = 2;
        break;
      case 'medium':
        minEnemies = 2;
        maxEnemies = 4;
        break;
      case 'hard':
        minEnemies = 3;
        maxEnemies = 6;
        break;
      case 'deadly':
        minEnemies = 4;
        maxEnemies = 8;
        break;
    }
    
    const numEnemies = Math.floor(Math.random() * (maxEnemies - minEnemies + 1)) + minEnemies;
    
    // Decide what types of enemies to include
    const availableTypes = this.getAvailableEnemyTypes();
    const selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    
    // Create the enemies
    return this.createEnemyGroup(selectedType, numEnemies, playerLevel, locationId);
  }

  /**
   * Get monster actions
   */
  public getMonsterActions(enemyId: string): any[] {
    const enemyType = enemyId.split('-')[1];
    const monster = this.getMonsterById(enemyType);
    
    if (!monster) {
      return [];
    }
    
    return monster.actions;
  }

  /**
   * Get monster trait descriptions
   */
  public getMonsterTraitDescriptions(enemyId: string): Record<string, string> {
    const enemyType = enemyId.split('-')[1];
    const monster = this.getMonsterById(enemyType);
    
    if (!monster) {
      return {};
    }
    
    const traitMap: Record<string, string> = {};
    monster.traits.forEach(trait => {
      traitMap[trait.name] = trait.description;
    });
    
    return traitMap;
  }

  /**
   * Get monster behavior
   */
  public getMonsterBehavior(enemyId: string): any {
    const enemyType = enemyId.split('-')[1];
    const monster = this.getMonsterById(enemyType);
    
    if (!monster) {
      return null;
    }
    
    return monster.behavior;
  }
} 