/**
 * D&D AI Dungeon Master - Magic Targeting System
 * 
 * This module handles the targeting mechanics for spells and magical effects,
 * particularly area-of-effect spells like Fireball, Cone of Cold, and Lightning Bolt.
 * It integrates with the combat targeting system for line of sight and cover calculations.
 */

import { v4 as uuidv4 } from 'uuid';
import { CoverType } from '../combat/targeting';

// ======= Core Interfaces =======

/**
 * Represents a position in 2D or 3D space
 */
export interface Position {
  x: number;
  y: number;
  z?: number;
}

/**
 * An entity that can be targeted by spells or abilities
 */
export interface Targetable {
  id: string;
  name: string;
  position: Position;
  type?: string;
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
}

/**
 * Shapes for area of effect spells
 */
export enum AoeShape {
  Sphere = 'sphere',
  Cone = 'cone',
  Line = 'line',
  Cube = 'cube',
  Cylinder = 'cylinder'
}

/**
 * Area of effect definition for spells
 */
export interface AreaOfEffect {
  type: AoeShape;
  size: number; // Radius for sphere, length for line/cone, etc.
  width?: number; // For line and cube shapes
  origin?: 'self' | 'point'; // Where the area originates from
}

/**
 * Result of targeting calculations
 */
export interface TargetingResult {
  origin: Position;
  affectedArea: AreaOfEffect;
  validTargets: Targetable[];
  invalidTargets: Targetable[];
  targetsWithCover: Map<string, CoverType>;
}

// ======= Targeting Functions =======

/**
 * Calculate distance between two positions
 */
export function calculateDistance(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = (b.z || 0) - (a.z || 0);
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Find all targets within an area of effect
 */
export function findTargetsInArea(
  origin: Position,
  aoe: AreaOfEffect,
  potentialTargets: Targetable[],
  caster?: Targetable
): TargetingResult {
  const validTargets: Targetable[] = [];
  const invalidTargets: Targetable[] = [];
  const targetsWithCover = new Map<string, CoverType>();
  
  console.log(`\nfindTargetsInArea for ${aoe.type}:`)
  
  for (const target of potentialTargets) {
    // Skip the caster if they are in the list and the spell doesn't affect self
    if (caster && target.id === caster.id && aoe.origin !== 'self') {
      console.log(`SKIP CASTER: ${target.name} at (${target.position.x}, ${target.position.y})`);
      invalidTargets.push(target);
      continue;
    }
    
    const targetInArea = isInArea(origin, target.position, aoe);
    console.log(`TARGET CHECK: ${target.name} at (${target.position.x}, ${target.position.y}) - in area: ${targetInArea}`);
    
    if (targetInArea) {
      console.log(`ADDING TO VALID: ${target.name}`);
      validTargets.push(target);
      
      // Determine cover (in a real implementation, we would call the combat targeting system here)
      targetsWithCover.set(target.id, CoverType.None);
    } else {
      console.log(`ADDING TO INVALID: ${target.name}`);
      invalidTargets.push(target);
    }
  }
  
  // Debug the final results
  console.log(`\nFinal results for ${aoe.type}:`);
  console.log(`Valid targets (${validTargets.length}): ${validTargets.map(t => t.name).join(', ')}`);
  console.log(`Invalid targets (${invalidTargets.length}): ${invalidTargets.map(t => t.name).join(', ')}`);
  
  return {
    origin,
    affectedArea: aoe,
    validTargets,
    invalidTargets,
    targetsWithCover
  };
}

/**
 * Check if a position is within an area of effect
 */
export function isInArea(origin: Position, position: Position, aoe: AreaOfEffect): boolean {
  let result = false;
  
  switch (aoe.type) {
    case AoeShape.Sphere:
      // For a sphere, check if the position is within the radius
      result = calculateDistance(origin, position) <= aoe.size;
      break;
      
    case AoeShape.Cone:
      // For a cone, check if the position is within the cone angle and distance
      result = isInCone(origin, position, aoe.size);
      break;
      
    case AoeShape.Line:
      // For a line, check if the position is along the line and within the length
      result = isOnLine(origin, position, aoe.size, aoe.width || 5);
      break;
      
    case AoeShape.Cube:
      // For a cube, check if the position is within the cube dimensions
      result = isInCube(origin, position, aoe.size);
      break;
      
    case AoeShape.Cylinder:
      // For a cylinder, check if the position is within the radius and height
      result = isInCylinder(origin, position, aoe.size);
      break;
  }
  
  console.log(`isInArea for position (${position.x}, ${position.y}) with ${aoe.type}: ${result}`);
  return result;
}

/**
 * Check if a position is within a cone
 */
export function isInCone(origin: Position, position: Position, length: number): boolean {
  // Calculate distance to the target
  const distance = calculateDistance(origin, position);
  
  // If the target is beyond the cone's length, it's not in the cone
  if (distance > length) {
    return false;
  }
  
  // Calculate the angle between the target and the cone's central axis
  // Assume the cone points along the positive x-axis
  const dx = position.x - origin.x;
  const dy = position.y - origin.y;
  
  // Calculate the angle in radians
  const angle = Math.abs(Math.atan2(dy, dx));
  
  // A 60-degree cone has an angle of 30 degrees on each side of the central axis
  // 30 degrees = π/6 radians
  return angle <= Math.PI / 6;
}

/**
 * Check if a position is on a line
 */
export function isOnLine(origin: Position, position: Position, length: number, width: number): boolean {
  // For a line extending along the x-axis (east from the origin)
  
  // Check if the target's x-coordinate is within the line's length
  // For a line extending to the east, the target should have an x value between origin.x and origin.x + length
  const inLineDirection = position.x >= origin.x && position.x <= origin.x + length;
  
  // Check if the target is close enough to the line (within half the width)
  const perpendicularDistance = Math.abs(position.y - origin.y);
  const closeToLine = perpendicularDistance <= width / 2;
  
  console.log(`isOnLine debug for position (${position.x}, ${position.y}):
  - origin: (${origin.x}, ${origin.y})
  - length: ${length}, width: ${width}
  - inLineDirection: ${position.x} >= ${origin.x} && ${position.x} <= ${origin.x + length} = ${inLineDirection}
  - perpendicularDistance: ${perpendicularDistance}, width/2: ${width/2}
  - closeToLine: ${closeToLine}
  - result: ${inLineDirection && closeToLine}`);
  
  // Both conditions must be true for the target to be on the line
  return inLineDirection && closeToLine;
}

/**
 * Check if a position is within a cube
 */
export function isInCube(origin: Position, position: Position, size: number): boolean {
  // For simplicity, assume the cube is aligned with the coordinate axes
  const halfSize = size / 2;
  
  return Math.abs(position.x - origin.x) <= halfSize &&
         Math.abs(position.y - origin.y) <= halfSize &&
         Math.abs((position.z || 0) - (origin.z || 0)) <= halfSize;
}

/**
 * Check if a position is within a cylinder
 */
export function isInCylinder(origin: Position, position: Position, radius: number): boolean {
  // Calculate horizontal distance (ignore z-axis)
  const dx = position.x - origin.x;
  const dy = position.y - origin.y;
  const horizontalDistance = Math.sqrt(dx * dx + dy * dy);
  
  // If the horizontal distance is less than the radius, the point is within the cylinder
  // We're ignoring height for simplicity, but in a full implementation we would check z as well
  return horizontalDistance <= radius;
}

/**
 * Analyze a scene to find viable spell targeting points
 */
export function analyzeScene(
  caster: Targetable,
  potentialTargets: Targetable[],
  aoe: AreaOfEffect
): Map<string, number> {
  const targetScores = new Map<string, number>();
  
  // Loop through potential origin points in the scene
  // For demonstration, we'll just check a grid of points around the caster
  for (let x = caster.position.x - 30; x <= caster.position.x + 30; x += 10) {
    for (let y = caster.position.y - 30; y <= caster.position.y + 30; y += 10) {
      const originPoint: Position = { x, y, z: caster.position.z };
      
      // Skip points that are too far from the caster
      if (calculateDistance(caster.position, originPoint) > 150) {
        continue;
      }
      
      // Find targets that would be hit from this origin point
      const result = findTargetsInArea(originPoint, aoe, potentialTargets, caster);
      
      // Score this point based on how many targets would be hit
      const score = result.validTargets.length;
      
      // Save the score for this position
      const positionKey = `${x},${y}`;
      targetScores.set(positionKey, score);
    }
  }
  
  return targetScores;
}

/**
 * Format a targeting result for display
 */
export function formatTargetingResult(result: TargetingResult): string {
  console.log("DEBUG formatTargetingResult input:", {
    aoeType: result.affectedArea.type,
    validTargetsCount: result.validTargets.length,
    validTargets: result.validTargets.map(t => t.name),
    invalidTargetsCount: result.invalidTargets.length,
    invalidTargets: result.invalidTargets.map(t => t.name)
  });

  let output = `Area of Effect: ${result.affectedArea.type} with size ${result.affectedArea.size}\n`;
  output += `Origin point: (${result.origin.x}, ${result.origin.y})\n`;
  output += `Targets affected: ${result.validTargets.length}\n`;
  
  if (result.validTargets.length > 0) {
    output += "Targets in area:\n";
    result.validTargets.forEach(target => {
      const coverType = result.targetsWithCover.get(target.id) || CoverType.None;
      output += `- ${target.name} at (${target.position.x}, ${target.position.y})`;
      if (coverType !== CoverType.None) {
        output += ` with ${coverType}`;
      }
      output += "\n";
    });
  }
  
  if (result.invalidTargets.length > 0) {
    output += "\nTargets outside area:\n";
    result.invalidTargets.forEach(target => {
      output += `- ${target.name} at (${target.position.x}, ${target.position.y})\n`;
    });
  }
  
  return output;
}

/**
 * Check if a target is valid for a specific spell
 */
export function isValidTarget(target: any, spellTargetTypes?: string[]): boolean {
  if (!target) {
    return false;
  }
  
  // If no specific target types are specified, assume any target is valid
  if (!spellTargetTypes || spellTargetTypes.length === 0) {
    return true;
  }
  
  // Check if the target type matches any of the valid types
  if (target.type && spellTargetTypes.includes(target.type)) {
    return true;
  }
  
  // Special case for humanoids
  if (spellTargetTypes.includes('humanoid') && target.type === 'humanoid') {
    return true;
  }
  
  // Special case for undead
  if (spellTargetTypes.includes('!undead') && target.type === 'undead') {
    return false;
  }
  
  return false;
}

/**
 * Check if a spell can target a specific object
 */
export function canTargetObject(spellTargetsObjects: boolean, target: any): boolean {
  if (!spellTargetsObjects) {
    return false;
  }
  
  // Objects typically have a type of 'object'
  if (target.type === 'object') {
    return true;
  }
  
  // Some specific object types might be targetable
  const objectTypes = ['door', 'chest', 'lock', 'wall', 'structure'];
  if (target.type && objectTypes.includes(target.type.toLowerCase())) {
    return true;
  }
  
  return false;
} 