/**
 * social-dynamics-example.ts
 * 
 * This example demonstrates how to use the Social Dynamics System to create
 * a living world where NPCs interact with each other and share information
 * independently of player actions.
 */

import { MemoryManager, Memory } from '../ai/core/memory-manager';
import { RelationshipTracker } from '../ai/core/relationship-tracker';
import { NPCPersonality, Emotion, EmotionalState, Value, Flaw } from '../ai/npc/personality-model';
import { DialogueSystem } from '../ai/npc/dialogue-system';
import { BehaviorSimulation, Goal, NeedType, Behavior } from '../ai/npc/behavior-simulation';
import { SocialInteractionSystem, SocialNPC, SocialInteractionType } from '../ai/npc/social/social-interaction';
import { InformationSharingSystem, InformationType, Information } from '../ai/npc/social/information-sharing';

// Mock implementations for dependencies
class MockMemoryManager extends MemoryManager {
  constructor() {
    super();
  }

  addMemory(memory: Memory): void {
    console.log(`[Memory] Added: "${memory.content}" for ${memory.entityId}`);
  }

  getMemories(entityId: string): Memory[] {
    return [];
  }
}

class MockRelationshipTracker extends RelationshipTracker {
  private relationships: Map<string, number> = new Map();

  constructor() {
    super();
  }

  getRelationship(entity1Id: string, entity2Id: string): { value: number } | null {
    const key = this.getRelationshipKey(entity1Id, entity2Id);
    const value = this.relationships.get(key) || 0;
    return { value };
  }

  adjustRelationship(entity1Id: string, entity2Id: string, change: number): void {
    const key = this.getRelationshipKey(entity1Id, entity2Id);
    const currentValue = this.relationships.get(key) || 0;
    const newValue = Math.max(-100, Math.min(100, currentValue + change));
    this.relationships.set(key, newValue);
    
    console.log(`[Relationship] ${entity1Id} ↔ ${entity2Id}: ${currentValue} → ${newValue} (${change > 0 ? '+' : ''}${change})`);
  }

  private getRelationshipKey(id1: string, id2: string): string {
    return [id1, id2].sort().join('_');
  }
}

// Create a simple emotional state for NPCs
function createEmotionalState(dominantEmotion: Emotion = Emotion.NEUTRAL): EmotionalState {
  return {
    currentEmotions: [
      { emotion: dominantEmotion, intensity: 60 },
      { emotion: Emotion.NEUTRAL, intensity: 40 }
    ],
    emotionalHistory: [],
    emotionalBaseline: {
      [Emotion.JOY]: 50,
      [Emotion.SADNESS]: 50,
      [Emotion.ANGER]: 50,
      [Emotion.FEAR]: 50,
      [Emotion.DISGUST]: 50,
      [Emotion.SURPRISE]: 50,
      [Emotion.TRUST]: 50,
      [Emotion.ANTICIPATION]: 50,
      [Emotion.NEUTRAL]: 50
    },
    lastUpdate: Date.now()
  };
}

// Create a simple personality for an NPC
function createPersonality(
  openness: number,
  conscientiousness: number,
  extraversion: number,
  agreeableness: number,
  neuroticism: number
): NPCPersonality {
  return {
    traits: {
      openness,
      conscientiousness,
      extraversion,
      agreeableness,
      neuroticism
    },
    values: {
      primary: Value.BENEVOLENCE,
      secondary: Value.TRADITION,
      valueHierarchy: new Map([
        [Value.BENEVOLENCE, 80],
        [Value.TRADITION, 70],
        [Value.SECURITY, 60]
      ])
    },
    flaws: {
      primary: Flaw.PRIDE,
      severity: 40,
      triggerConditions: ['being disrespected', 'challenged authority']
    },
    emotionalState: createEmotionalState()
  };
}

// Create a simple goal for an NPC
function createGoal(id: string, description: string, priority: number, needType: NeedType): Goal {
  return {
    id,
    description,
    priority,
    progress: 0,
    subgoals: [],
    relatedNeed: needType,
    completionCriteria: `Complete ${description}`,
    active: true
  };
}

// Run the social dynamics example
async function runSocialDynamicsExample() {
  console.log("=== D&D AI DM: Social Dynamics System Example ===\n");
  
  // Create mock dependencies
  const memoryManager = new MockMemoryManager();
  const relationshipTracker = new MockRelationshipTracker();
  
  // These are placeholders - in a real implementation, these would be actual instances
  const behaviorSimulation = {} as BehaviorSimulation;
  const dialogueSystem = {} as DialogueSystem;
  
  // Create the social systems
  const socialInteractionSystem = new SocialInteractionSystem(
    memoryManager,
    relationshipTracker,
    behaviorSimulation,
    dialogueSystem,
    { debugMode: true }
  );
  
  const informationSharingSystem = new InformationSharingSystem(
    memoryManager,
    relationshipTracker,
    socialInteractionSystem,
    { debugMode: true }
  );
  
  console.log("Created social dynamics systems");
  
  // Create some NPCs with different personalities and goals
  
  // The innkeeper - friendly, talkative, knows a lot about local gossip
  const innkeeper: SocialNPC = {
    id: 'npc_innkeeper',
    name: 'Greta',
    personality: createPersonality(60, 80, 85, 75, 30),
    knowledge: [
      'The old road is dangerous at night',
      'The mayor is planning to raise taxes',
      'The blacksmith is looking for a new apprentice'
    ],
    emotionalState: createEmotionalState(Emotion.JOY),
    currentLocation: 'village_inn',
    occupation: 'Innkeeper',
    faction: 'Village Merchants',
    goals: new Map([
      ['goal_1', createGoal('goal_1', 'Prepare for the harvest festival', 80, NeedType.ESTEEM)]
    ]),
    schedule: []
  };
  
  // The blacksmith - reserved, hardworking, respected
  const blacksmith: SocialNPC = {
    id: 'npc_blacksmith',
    name: 'Tormund',
    personality: createPersonality(40, 90, 30, 60, 20),
    knowledge: [
      'The mine has a new vein of iron',
      'The guard captain needs new weapons',
      'Strange noises have been heard from the old tower'
    ],
    emotionalState: createEmotionalState(Emotion.NEUTRAL),
    currentLocation: 'village_inn', // Currently at the inn
    occupation: 'Blacksmith',
    faction: 'Village Merchants',
    goals: new Map([
      ['goal_1', createGoal('goal_1', 'Find a new apprentice', 70, NeedType.SOCIAL)]
    ]),
    schedule: []
  };
  
  // The hunter - observant, independent, knows about wilderness
  const hunter: SocialNPC = {
    id: 'npc_hunter',
    name: 'Elara',
    personality: createPersonality(70, 65, 50, 60, 40),
    knowledge: [
      'Wolves have been spotted near the northern farms',
      'The forest has good hunting this season',
      'Strange tracks were found near the old ruins'
    ],
    emotionalState: createEmotionalState(Emotion.ANTICIPATION),
    currentLocation: 'village_inn', // Also at the inn
    occupation: 'Hunter',
    faction: 'Wilderness Guides',
    goals: new Map([
      ['goal_1', createGoal('goal_1', 'Track the source of strange noises', 90, NeedType.KNOWLEDGE)]
    ]),
    schedule: []
  };
  
  // The village guard - dutiful, alert, concerned with security
  const guard: SocialNPC = {
    id: 'npc_guard',
    name: 'Marcus',
    personality: createPersonality(30, 75, 60, 50, 45),
    knowledge: [
      'The night watch reported strange lights in the sky',
      'The eastern gate needs repairs',
      'Bandits have been spotted on the trade road'
    ],
    emotionalState: createEmotionalState(Emotion.TRUST),
    currentLocation: 'village_square', // Not at the inn initially
    occupation: 'Guard',
    faction: 'Village Guard',
    goals: new Map([
      ['goal_1', createGoal('goal_1', 'Increase village security', 85, NeedType.SAFETY)]
    ]),
    schedule: []
  };
  
  // Register NPCs with the social interaction system
  socialInteractionSystem.registerNPC(innkeeper);
  socialInteractionSystem.registerNPC(blacksmith);
  socialInteractionSystem.registerNPC(hunter);
  socialInteractionSystem.registerNPC(guard);
  
  console.log("\nRegistered 4 NPCs with the system");
  
  // Set up some initial relationships
  relationshipTracker.adjustRelationship('npc_innkeeper', 'npc_blacksmith', 60); // Good friends
  relationshipTracker.adjustRelationship('npc_innkeeper', 'npc_hunter', 40); // Friendly acquaintances
  relationshipTracker.adjustRelationship('npc_blacksmith', 'npc_hunter', 20); // Know each other
  relationshipTracker.adjustRelationship('npc_guard', 'npc_innkeeper', 50); // Good relationship
  relationshipTracker.adjustRelationship('npc_guard', 'npc_blacksmith', 45); // Respect each other
  relationshipTracker.adjustRelationship('npc_guard', 'npc_hunter', 10); // Neutral
  
  console.log("\nEstablished initial relationships between NPCs");
  
  // Create some information in the world
  const dragonRumor = informationSharingSystem.createInformation(
    'A dragon was spotted in the northern mountains',
    InformationType.RUMOR,
    80, // Importance
    70, // Truth value (partially true)
    'npc_hunter', // Source
    ['northern_mountains', 'dragon'], // Relevant entities
    undefined, // No visibility restriction
    ['danger', 'monster', 'wilderness'] // Tags
  );
  
  const banditSecret = informationSharingSystem.createInformation(
    'The bandits on the trade road are led by the mayor\'s cousin',
    InformationType.SECRET,
    90, // Importance
    100, // Truth value (true)
    'npc_guard', // Source
    ['bandits', 'mayor', 'trade_road'], // Relevant entities
    { minRelationship: 70 }, // Only share with close friends
    ['conspiracy', 'crime', 'politics'] // Tags
  );
  
  const festivalFact = informationSharingSystem.createInformation(
    'The harvest festival will feature a bardic competition this year',
    InformationType.FACT,
    60, // Importance
    100, // Truth value (true)
    'npc_innkeeper', // Source
    ['harvest_festival', 'village'], // Relevant entities
    undefined, // No visibility restriction
    ['event', 'entertainment', 'community'] // Tags
  );
  
  console.log("\nCreated initial information in the world");
  
  // Simulate the passage of time and NPC interactions
  console.log("\n=== Simulating Day 1 ===");
  
  // Move the guard to the inn for evening interactions
  console.log("\nGuard Marcus arrives at the inn for the evening");
  socialInteractionSystem.updateNPC('npc_guard', { currentLocation: 'village_inn' });
  
  // Update the social systems - this will process potential interactions
  console.log("\nUpdating social systems (1 hour of game time)...");
  socialInteractionSystem.updateSystem(60); // 60 minutes of game time
  
  // Get all NPCs for information sharing
  const allNpcs = [innkeeper, blacksmith, hunter, guard];
  informationSharingSystem.updateSystem(60, allNpcs);
  
  // Simulate specific interactions for demonstration
  console.log("\n=== Simulating Day 2 ===");
  
  // Create a new piece of information - a threat
  const goblinThreat = informationSharingSystem.createInformation(
    'Goblins have been raiding farms to the west',
    InformationType.THREAT,
    85, // Importance
    100, // Truth value (true)
    'npc_hunter', // Source
    ['goblins', 'western_farms'], // Relevant entities
    undefined, // No visibility restriction
    ['danger', 'monster', 'raid'] // Tags
  );
  
  console.log("\nUpdating social systems (2 hours of game time)...");
  socialInteractionSystem.updateSystem(120); // 120 minutes of game time
  informationSharingSystem.updateSystem(120, allNpcs);
  
  // Check who knows about the goblin threat
  const knowledgeableNPCs = informationSharingSystem.findNPCsWithRelevantInformation('goblins');
  console.log("\nNPCs who know about the goblin threat:");
  knowledgeableNPCs.forEach(npcId => {
    const npc = allNpcs.find(n => n.id === npcId);
    if (npc) {
      console.log(`- ${npc.name} (${npc.occupation})`);
    }
  });
  
  // Simulate the guard taking action based on the information
  if (knowledgeableNPCs.includes('npc_guard')) {
    console.log("\nGuard Marcus decides to organize a patrol to investigate the goblin threat");
    
    // Create a new goal for the guard
    const patrolGoal = createGoal(
      'goal_patrol',
      'Organize a patrol to investigate goblin raids',
      95, // High priority
      NeedType.DUTY
    );
    
    // Update the guard's goals
    guard.goals.set(patrolGoal.id, patrolGoal);
    socialInteractionSystem.updateNPC('npc_guard', { goals: guard.goals });
    
    // Create a cooperation opportunity
    console.log("\nGuard Marcus asks for volunteers to join the patrol");
    
    // This would trigger cooperative interactions in a full implementation
  }
  
  console.log("\n=== Simulating Day 3 ===");
  
  // Create a distorted rumor based on the goblin threat
  const exaggeratedThreat = informationSharingSystem.createInformation(
    'An army of goblins is preparing to attack the village',
    InformationType.RUMOR,
    95, // Very important
    30, // Low truth value (exaggerated)
    'npc_innkeeper', // Source (the innkeeper heard and exaggerated)
    ['goblins', 'village', 'attack'], // Relevant entities
    undefined, // No visibility restriction
    ['danger', 'monster', 'attack', 'panic'] // Tags
  );
  
  console.log("\nUpdating social systems (3 hours of game time)...");
  socialInteractionSystem.updateSystem(180); // 180 minutes of game time
  informationSharingSystem.updateSystem(180, allNpcs);
  
  // Check the spread of the exaggerated rumor
  const panickedNPCs = informationSharingSystem.findNPCsWithRelevantInformation('attack');
  console.log("\nNPCs who have heard the exaggerated rumor about a goblin army:");
  panickedNPCs.forEach(npcId => {
    const npc = allNpcs.find(n => n.id === npcId);
    if (npc) {
      console.log(`- ${npc.name} (${npc.occupation})`);
    }
  });
  
  console.log("\n=== Social Dynamics Simulation Complete ===");
  console.log("\nThis example demonstrated how NPCs can:");
  console.log("1. Form relationships that affect their interactions");
  console.log("2. Share information based on those relationships");
  console.log("3. Create and propagate rumors that may distort over time");
  console.log("4. Take actions based on information they receive");
  console.log("5. Form goals in response to world events");
}

// Run the example
runSocialDynamicsExample().catch(console.error);

export { runSocialDynamicsExample }; 