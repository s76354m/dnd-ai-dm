/**
 * Simple Targeting System Example
 * 
 * This is a simplified, self-contained example of targeting mechanics
 * for the D&D AI Dungeon Master project. It demonstrates basic concepts
 * of line of sight, distance calculation, and cover without dependencies
 * on other modules that might not be fully implemented yet.
 */

// Basic position interface
interface Position {
  x: number;
  y: number;
  z: number;
}

// Cover types
enum CoverType {
  None = 'None',
  Half = 'Half cover',
  ThreeQuarters = 'Three-quarters cover',
  Full = 'Full cover'
}

// Combat participant
interface Participant {
  id: string;
  name: string;
  position: Position;
  isInvisible?: boolean;
}

// Obstacle in the environment
interface Obstacle {
  name: string;
  position: Position;
  width: number;
  height: number;
  depth: number;
  coverType: CoverType;
}

// Environment
interface Environment {
  width: number;
  height: number;
  depth: number;
  obstacles: Obstacle[];
}

// Targeting result
interface TargetingResult {
  distance: number;
  lineOfSight: boolean;
  coverType: CoverType;
  isValidTarget: boolean;
  blockingObstacles: Obstacle[];
}

// Utility functions
function calculateDistance(source: Position, target: Position): number {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dz = target.z - source.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function isInRange(source: Position, target: Position, range: number): boolean {
  return calculateDistance(source, target) <= range;
}

function hasLineOfSight(source: Position, target: Position, obstacles: Obstacle[]): boolean {
  // Check each obstacle to see if it blocks line of sight
  for (const obstacle of obstacles) {
    if (lineIntersectsObstacle(source, target, obstacle)) {
      const coverProvided = obstacle.coverType;
      if (coverProvided === CoverType.Full) {
        return false;
      }
    }
  }
  return true;
}

function lineIntersectsObstacle(start: Position, end: Position, obstacle: Obstacle): boolean {
  // Simplified obstacle intersection check
  // In a real implementation, this would use ray casting or similar techniques
  
  // Calculate direction vector
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  
  // Check if line passes near the obstacle center
  const obstacleMinX = obstacle.position.x - obstacle.width / 2;
  const obstacleMaxX = obstacle.position.x + obstacle.width / 2;
  const obstacleMinY = obstacle.position.y - obstacle.depth / 2;
  const obstacleMaxY = obstacle.position.y + obstacle.depth / 2;
  const obstacleMinZ = obstacle.position.z;
  const obstacleMaxZ = obstacle.position.z + obstacle.height;
  
  // Basic line segment / box intersection test (simplified)
  // In a real implementation, this would be more sophisticated
  let t = 0;
  while (t <= 1.0) {
    const pointX = start.x + t * dx;
    const pointY = start.y + t * dy;
    const pointZ = start.z + t * dz;
    
    if (pointX >= obstacleMinX && pointX <= obstacleMaxX &&
        pointY >= obstacleMinY && pointY <= obstacleMaxY &&
        pointZ >= obstacleMinZ && pointZ <= obstacleMaxZ) {
      return true;
    }
    
    t += 0.1; // Check points along the line
  }
  
  return false;
}

function determineCover(source: Position, target: Position, obstacles: Obstacle[]): CoverType {
  let highestCover = CoverType.None;
  
  for (const obstacle of obstacles) {
    if (lineIntersectsObstacle(source, target, obstacle)) {
      const coverProvided = obstacle.coverType;
      
      // Update to highest cover level
      if (coverProvided === CoverType.Full) {
        return CoverType.Full;
      } else if (coverProvided === CoverType.ThreeQuarters && 
                 highestCover === CoverType.None || highestCover === CoverType.Half) {
        highestCover = CoverType.ThreeQuarters;
      } else if (coverProvided === CoverType.Half && 
                 highestCover === CoverType.None) {
        highestCover = CoverType.Half;
      }
    }
  }
  
  return highestCover;
}

function checkTargeting(
  source: Participant,
  target: Participant,
  range: number,
  environment: Environment
): TargetingResult {
  const distance = calculateDistance(source.position, target.position);
  const inRange = isInRange(source.position, target.position, range);
  
  // Get obstacles that might block line of sight
  const blockingObstacles = environment.obstacles.filter(obstacle => 
    lineIntersectsObstacle(source.position, target.position, obstacle)
  );
  
  const hasLOS = hasLineOfSight(source.position, target.position, environment.obstacles);
  const cover = determineCover(source.position, target.position, environment.obstacles);
  
  // Determine if this is a valid target
  const isValidTarget = inRange && hasLOS && cover !== CoverType.Full;
  
  return {
    distance,
    lineOfSight: hasLOS,
    coverType: cover,
    isValidTarget,
    blockingObstacles
  };
}

function getCoverACBonus(coverType: CoverType): number {
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

// Create example environment and participants
const wizard: Participant = {
  id: '1',
  name: 'Gandalf',
  position: { x: 0, y: 0, z: 0 }
};

const fighter: Participant = {
  id: '2',
  name: 'Aragorn',
  position: { x: 5, y: 5, z: 0 }
};

const goblin1: Participant = {
  id: '3',
  name: 'Goblin Scout',
  position: { x: 20, y: 0, z: 0 }
};

const goblin2: Participant = {
  id: '4',
  name: 'Goblin Archer',
  position: { x: 30, y: 15, z: 0 }
};

const goblin3: Participant = {
  id: '5',
  name: 'Goblin Shaman',
  position: { x: 25, y: -10, z: 0 },
  isInvisible: true
};

// Create environment with obstacles
const environment: Environment = {
  width: 50,
  height: 20,
  depth: 50,
  obstacles: [
    {
      name: 'Stone Pillar',
      position: { x: 15, y: 0, z: 0 },
      width: 3,
      height: 10,
      depth: 3,
      coverType: CoverType.ThreeQuarters
    },
    {
      name: 'Low Wall',
      position: { x: 25, y: 5, z: 0 },
      width: 10,
      height: 3,
      depth: 1,
      coverType: CoverType.Half
    },
    {
      name: 'Barrels',
      position: { x: 22, y: -5, z: 0 },
      width: 4,
      height: 4,
      depth: 4,
      coverType: CoverType.Half
    }
  ]
};

// Display function for targeting results
function displayTargetingInfo(source: Participant, target: Participant, range: number): void {
  console.log(`\nTargeting from ${source.name} to ${target.name}:`);
  
  const result = checkTargeting(source, target, range, environment);
  
  console.log(`  Distance: ${result.distance.toFixed(1)} feet`);
  console.log(`  Line of sight: ${result.lineOfSight ? 'Yes' : 'No'}`);
  console.log(`  Cover: ${result.coverType}`);
  console.log(`  Valid target: ${result.isValidTarget ? 'Yes' : 'No'}`);
  
  if (result.blockingObstacles.length > 0) {
    console.log('  Obstacles in the way:');
    result.blockingObstacles.forEach(obstacle => {
      console.log(`    - ${obstacle.name} (${obstacle.coverType})`);
    });
  }
  
  if (result.coverType !== CoverType.None) {
    const acBonus = getCoverACBonus(result.coverType);
    console.log(`  Cover effect: Target gets +${acBonus} AC from cover`);
  }
}

// Run the example
console.log('=== D&D AI Dungeon Master - Targeting System Example ===');
console.log('\nEnvironment:');
console.log(`  Dimensions: ${environment.width}x${environment.height}x${environment.depth} feet`);
console.log(`  Obstacles: ${environment.obstacles.length}`);

console.log('\nParticipants:');
[wizard, fighter, goblin1, goblin2, goblin3].forEach(p => {
  console.log(`  ${p.name} at position (${p.position.x}, ${p.position.y}, ${p.position.z})`);
  if (p.isInvisible) {
    console.log('    * Invisible');
  }
});

// Scenario 1: Wizard targeting goblins with Fireball (150-foot range)
console.log('\n=== Scenario 1: Fireball Targeting ===');
console.log('Wizard is preparing to cast Fireball (150-foot range)');

displayTargetingInfo(wizard, goblin1, 150);
displayTargetingInfo(wizard, goblin2, 150);
displayTargetingInfo(wizard, goblin3, 150);

// Scenario 2: Fighter targeting with melee weapon (5-foot range)
console.log('\n=== Scenario 2: Melee Targeting ===');
console.log('Fighter is preparing to attack with a sword (5-foot range)');

displayTargetingInfo(fighter, goblin1, 5);
displayTargetingInfo(fighter, wizard, 5);

// Scenario 3: Move goblin behind cover
console.log('\n=== Scenario 3: Taking Cover ===');
console.log('Goblin Scout moves behind the pillar');

// Move goblin1 behind the pillar
goblin1.position = { x: 15, y: -2, z: 0 };

displayTargetingInfo(wizard, goblin1, 150);

// Conclusion
console.log('\nTargeting example completed successfully!');

// Export a run function for external calls
export function run(): void {
  console.log('Targeting example run complete.');
}

export default { run }; 