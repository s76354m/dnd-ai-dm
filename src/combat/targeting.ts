/**
 * D&D AI Dungeon Master - Targeting System
 * 
 * This module implements the targeting mechanics for the D&D combat system,
 * including line of sight calculations, cover determination, and target validation.
 * It handles position-based calculations, obstacle detection, and environmental factors.
 */

import { v4 as uuidv4 } from 'uuid';

// ========== Core Interfaces ==========

/**
 * Represents a 3D position in the game environment
 */
export interface Position {
  x: number;
  y: number;
  z: number;
}

/**
 * The different levels of cover a target can have
 */
export enum CoverType {
  None = 'None',
  Half = 'Half cover',
  ThreeQuarters = 'Three-quarters cover',
  Full = 'Full cover'
}

/**
 * The different types of obstacles in the environment
 */
export enum ObstacleType {
  Wall = 'Wall',
  Pillar = 'Pillar',
  Furniture = 'Furniture',
  LowWall = 'LowWall',
  Debris = 'Debris',
  Foliage = 'Foliage',
  MagicalBarrier = 'MagicalBarrier'
}

/**
 * Light levels in the environment that affect visibility
 */
export enum LightLevel {
  Bright = 'Bright light',
  Dim = 'Dim light',
  Darkness = 'Darkness'
}

/**
 * Terrain types that can affect movement and combat
 */
export enum TerrainType {
  Normal = 'Normal',
  Difficult = 'Difficult terrain',
  Hazardous = 'Hazardous terrain',
  Impassable = 'Impassable'
}

/**
 * An obstacle in the environment that can block line of sight or provide cover
 */
export interface Obstacle {
  id: string;
  name: string;
  position: Position;
  width: number;
  height: number;
  depth: number;
  type: ObstacleType;
  provides: CoverType;
  isDestructible?: boolean;
  hitPoints?: number;
}

/**
 * A complete combat environment with dimensions, obstacles, and conditions
 */
export interface CombatEnvironment {
  id: string;
  name: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  obstacles: Obstacle[];
  lightLevel: LightLevel;
  terrainMap?: Map<string, TerrainType>; // Position hash to terrain type
}

/**
 * Result of a targeting check between a source and target
 */
export interface TargetingResult {
  distance: number;
  lineOfSight: boolean;
  coverType: CoverType;
  isVisible: boolean;
  coveringObstacles: Obstacle[];
}

// ========== Core Functionality ==========

/**
 * The TargetingSystem class handles all targeting-related calculations
 * including line of sight, cover, and distance calculations.
 * Implemented as a singleton to ensure consistent targeting across the application.
 */
export class TargetingSystem {
  private static instance: TargetingSystem;
  
  private constructor() {
    // Private constructor for singleton pattern
  }
  
  /**
   * Get the singleton instance of the TargetingSystem
   */
  public static getInstance(): TargetingSystem {
    if (!TargetingSystem.instance) {
      TargetingSystem.instance = new TargetingSystem();
    }
    return TargetingSystem.instance;
  }
  
  /**
   * Calculate distance between two positions
   */
  public calculateDistance(source: Position, target: Position): number {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dz = target.z - source.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  /**
   * Check if target is within range
   */
  public isInRange(source: Position, target: Position, rangeInFeet: number): boolean {
    return this.calculateDistance(source, target) <= rangeInFeet;
  }
  
  /**
   * Determine if source has line of sight to target considering obstacles
   */
  public hasLineOfSight(source: Position, target: Position, obstacles: Obstacle[]): boolean {
    // Check each obstacle to see if it completely blocks line of sight
    for (const obstacle of obstacles) {
      if (this.lineIntersectsObstacle(source, target, obstacle)) {
        if (obstacle.provides === CoverType.Full) {
          return false;
        }
      }
    }
    return true;
  }
  
  /**
   * Check if a line between two positions intersects with an obstacle
   */
  public lineIntersectsObstacle(start: Position, end: Position, obstacle: Obstacle): boolean {
    // Calculate direction vector
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dz = end.z - start.z;
    
    // Define the obstacle boundaries
    const obstacleMinX = obstacle.position.x - obstacle.width / 2;
    const obstacleMaxX = obstacle.position.x + obstacle.width / 2;
    const obstacleMinY = obstacle.position.y - obstacle.depth / 2;
    const obstacleMaxY = obstacle.position.y + obstacle.depth / 2;
    const obstacleMinZ = obstacle.position.z;
    const obstacleMaxZ = obstacle.position.z + obstacle.height;
    
    // Parametric line equation sampling to detect intersection
    let t = 0;
    const step = 0.05; // Smaller step for more accurate detection
    while (t <= 1.0) {
      const pointX = start.x + t * dx;
      const pointY = start.y + t * dy;
      const pointZ = start.z + t * dz;
      
      if (pointX >= obstacleMinX && pointX <= obstacleMaxX &&
          pointY >= obstacleMinY && pointY <= obstacleMaxY &&
          pointZ >= obstacleMinZ && pointZ <= obstacleMaxZ) {
        return true;
      }
      
      t += step;
    }
    
    return false;
  }
  
  /**
   * Determine the level of cover a target has from a source's perspective
   */
  public determineCover(source: Position, target: Position, obstacles: Obstacle[]): CoverType {
    let highestCover = CoverType.None;
    
    for (const obstacle of obstacles) {
      if (this.lineIntersectsObstacle(source, target, obstacle)) {
        const coverProvided = obstacle.provides;
        
        // Update to highest cover level
        if (coverProvided === CoverType.Full) {
          return CoverType.Full;
        } else if (coverProvided === CoverType.ThreeQuarters && 
                   (highestCover === CoverType.None || highestCover === CoverType.Half)) {
          highestCover = CoverType.ThreeQuarters;
        } else if (coverProvided === CoverType.Half && highestCover === CoverType.None) {
          highestCover = CoverType.Half;
        }
      }
    }
    
    return highestCover;
  }
  
  /**
   * Check if target is visible accounting for light level and special conditions
   */
  public isVisible(source: any, target: any, environment: CombatEnvironment): boolean {
    // Always visible in bright light if not invisible
    if (environment.lightLevel === LightLevel.Bright && !target.isInvisible) {
      return true;
    }
    
    // Dim light requires perception check (simplified here)
    if (environment.lightLevel === LightLevel.Dim && !target.isInvisible) {
      // In a complete implementation, this would involve perception vs. stealth
      return true; // Simplified for now
    }
    
    // Darkness or invisible targets would require special senses
    if (environment.lightLevel === LightLevel.Darkness || target.isInvisible) {
      // Check for special senses like darkvision, truesight, etc.
      return source.hasDarkvision || source.hasTruesight || source.hasBlindsight;
    }
    
    return false;
  }
  
  /**
   * Comprehensive targeting check
   */
  public checkTargeting(
    source: any, 
    target: any, 
    rangeInFeet: number, 
    environment: CombatEnvironment
  ): TargetingResult {
    if (!source.position || !target.position) {
      return {
        distance: Infinity,
        lineOfSight: false,
        coverType: CoverType.Full,
        isVisible: false,
        coveringObstacles: []
      };
    }
    
    const distance = this.calculateDistance(source.position, target.position);
    const inRange = this.isInRange(source.position, target.position, rangeInFeet);
    
    // Get obstacles that might be in the way
    const coveringObstacles = environment.obstacles.filter(obstacle => 
      this.lineIntersectsObstacle(source.position, target.position, obstacle)
    );
    
    const hasLOS = this.hasLineOfSight(source.position, target.position, environment.obstacles);
    const cover = this.determineCover(source.position, target.position, environment.obstacles);
    const visible = this.isVisible(source, target, environment);
    
    return {
      distance,
      lineOfSight: hasLOS,
      coverType: cover,
      isVisible: inRange && hasLOS && visible && cover !== CoverType.Full,
      coveringObstacles
    };
  }
  
  /**
   * Get all valid targets from a list of potential targets
   */
  public getValidTargets(
    source: any,
    potentialTargets: any[],
    rangeInFeet: number,
    requiresLineOfSight: boolean,
    environment: CombatEnvironment
  ): any[] {
    return potentialTargets.filter(target => {
      if (target.id === source.id) {
        return false; // Can't target self (unless explicitly allowed)
      }
      
      const targetingResult = this.checkTargeting(source, target, rangeInFeet, environment);
      
      if (!requiresLineOfSight) {
        // Some spells don't require line of sight, just require being in range
        return targetingResult.distance <= rangeInFeet;
      }
      
      return targetingResult.isVisible;
    });
  }
  
  /**
   * Create a new combat environment
   */
  public createEnvironment(width: number, height: number, depth: number, name: string = 'Combat Area'): CombatEnvironment {
    return {
      id: uuidv4(),
      name,
      dimensions: {
        width,
        height,
        depth
      },
      obstacles: [],
      lightLevel: LightLevel.Bright
    };
  }
  
  /**
   * Create an obstacle to add to the environment
   */
  public createObstacle(
    name: string,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    type: ObstacleType,
    providedCover: CoverType,
    isDestructible: boolean = false,
    hitPoints: number = 0
  ): Obstacle {
    return {
      id: uuidv4(),
      name,
      position: { x, y, z },
      width,
      height,
      depth,
      type,
      provides: providedCover,
      isDestructible,
      hitPoints: isDestructible ? hitPoints : undefined
    };
  }
  
  /**
   * Get the AC bonus provided by a cover type
   */
  public getCoverACBonus(coverType: CoverType): number {
    switch (coverType) {
      case CoverType.Half:
        return 2;
      case CoverType.ThreeQuarters:
        return 5;
      case CoverType.Full:
        return Number.POSITIVE_INFINITY; // Can't be hit
      default:
        return 0;
    }
  }
  
  /**
   * Get the saving throw bonus provided by a cover type
   */
  public getCoverSavingThrowBonus(coverType: CoverType): number {
    switch (coverType) {
      case CoverType.Half:
        return 2;
      case CoverType.ThreeQuarters:
        return 5;
      case CoverType.Full:
        return Number.POSITIVE_INFINITY; // Auto succeed
      default:
        return 0;
    }
  }
}

// Export a default instance for ease of use
export default TargetingSystem.getInstance(); 