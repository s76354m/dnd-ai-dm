/**
 * Combat AI Integration Example
 * 
 * This example demonstrates how the Combat AI Integration system enhances
 * tactical combat decisions with personality traits, emotional states,
 * and faction relationships. It shows how different NPCs make varied
 * combat decisions based on their individual characteristics.
 */

import { v4 as uuidv4 } from 'uuid';
import { CombatAIIntegration } from '../ai/npc/combat-ai-integration';
import { BehaviorSimulation } from '../ai/npc/behavior-simulation';
import { FactionSocialIntegration } from '../ai/npc/social/faction-social-integration';
import { FactionManager } from '../ai/world/faction/faction-manager';
import { FactionSystem } from '../ai/world/faction/faction-system';
import { RelationshipTracker } from '../ai/memory/relationship-tracker';
import { MemoryManager } from '../ai/memory/memory-manager';
import { TacticalAI } from '../combat/tactical-ai';
import { PersonalityTraits, Emotion, CoreValues, Value } from '../ai/npc/personality-model';
import { NPC } from '../core/interfaces/npc';
import { CombatState, InitiativeEntry } from '../combat/combat-types';
import { EnemyManager } from '../combat/enemy-manager';
import { AIService } from '../dm/ai-service';

// Mock AI Service for example
class MockAIService implements Partial<AIService> {
  async generateText(_prompt: string): Promise<string> {
    return "AI generated response";
  }
}

// Create example NPCs with distinct personalities
function createExampleNPCs(): NPC[] {
  return [
    // Aggressive warrior from the Crimson Blade faction
    {
      id: uuidv4(),
      name: "Gorn Ironfist",
      type: "humanoid",
      race: "dwarf",
      class: "fighter",
      level: 5,
      description: "A stout dwarf warrior with a fiery temper and battle scars across his face.",
      abilities: {
        strength: 18,
        dexterity: 12,
        constitution: 16,
        intelligence: 8,
        wisdom: 10,
        charisma: 8
      },
      currentHealth: 45,
      maxHealth: 45,
      armorClass: 18,
      initiative: 1,
      status: "alive",
      equipment: {},
      inventory: {},
      spells: {},
      features: {
        battleAxe: "Skilled with battleaxe, deals 1d8+4 damage",
        shieldBash: "Can bash with shield as bonus action, stunning target on DC 14 Strength save"
      }
    },
    
    // Cautious mage from the Arcane College faction
    {
      id: uuidv4(),
      name: "Elara Windwhisper",
      type: "humanoid",
      race: "elf",
      class: "wizard",
      level: 5,
      description: "A slender elven mage with calculating eyes and flowing silver hair.",
      abilities: {
        strength: 8,
        dexterity: 16,
        constitution: 12,
        intelligence: 18,
        wisdom: 14,
        charisma: 10
      },
      currentHealth: 30,
      maxHealth: 30,
      armorClass: 13,
      initiative: 3,
      status: "alive",
      equipment: {},
      inventory: {},
      spells: {
        fireball: "3rd level evocation, 8d6 fire damage in 20ft radius",
        shield: "1st level abjuration, +5 AC until next turn",
        magicMissile: "1st level evocation, 3 darts that each deal 1d4+1 force damage"
      },
      features: {
        arcaneRecovery: "Can recover spell slots during a short rest"
      }
    },
    
    // Protective cleric from the Temple of Light faction
    {
      id: uuidv4(),
      name: "Brother Tomas",
      type: "humanoid",
      race: "human",
      class: "cleric",
      level: 5,
      description: "A kindly human cleric with a serene smile and simple robes adorned with sun symbols.",
      abilities: {
        strength: 12,
        dexterity: 10,
        constitution: 14,
        intelligence: 12,
        wisdom: 18,
        charisma: 14
      },
      currentHealth: 38,
      maxHealth: 38,
      armorClass: 16,
      initiative: 0,
      status: "alive",
      equipment: {},
      inventory: {},
      spells: {
        cureLightWounds: "1st level evocation, heals 1d8+4 hit points",
        bless: "1st level enchantment, adds 1d4 to attack rolls and saving throws",
        guidingBolt: "1st level evocation, 4d6 radiant damage and grants advantage on next attack"
      },
      features: {
        channelDivinity: "Can turn undead or restore health"
      }
    },
    
    // Reckless rogue from the Shadowhand Guild faction
    {
      id: uuidv4(),
      name: "Vex Nightshade",
      type: "humanoid",
      race: "tiefling",
      class: "rogue",
      level: 5,
      description: "A grinning tiefling with sharp horns and a penchant for danger.",
      abilities: {
        strength: 10,
        dexterity: 18,
        constitution: 12,
        intelligence: 14,
        wisdom: 10,
        charisma: 16
      },
      currentHealth: 32,
      maxHealth: 32,
      armorClass: 15,
      initiative: 4,
      status: "alive",
      equipment: {},
      inventory: {},
      spells: {},
      features: {
        sneakAttack: "Deals extra 3d6 damage when has advantage",
        evasion: "Takes no damage on successful Dexterity saves",
        uncannyDodge: "Can use reaction to halve damage from an attack"
      }
    }
  ];
}

// Create personality traits for example NPCs
function createExamplePersonalities(npcs: NPC[]): Record<string, PersonalityTraits> {
  const personalities: Record<string, PersonalityTraits> = {};
  
  // Gorn: Low openness, high conscientiousness, high extraversion, low agreeableness, high neuroticism
  personalities[npcs[0].id] = {
    openness: 30,
    conscientiousness: 75,
    extraversion: 80,
    agreeableness: 25,
    neuroticism: 70
  };
  
  // Elara: High openness, high conscientiousness, low extraversion, medium agreeableness, low neuroticism
  personalities[npcs[1].id] = {
    openness: 85,
    conscientiousness: 80,
    extraversion: 30,
    agreeableness: 50,
    neuroticism: 25
  };
  
  // Brother Tomas: Medium openness, high conscientiousness, medium extraversion, high agreeableness, low neuroticism
  personalities[npcs[2].id] = {
    openness: 55,
    conscientiousness: 80,
    extraversion: 60,
    agreeableness: 90,
    neuroticism: 20
  };
  
  // Vex: High openness, low conscientiousness, high extraversion, medium agreeableness, medium-high neuroticism
  personalities[npcs[3].id] = {
    openness: 75,
    conscientiousness: 30,
    extraversion: 85,
    agreeableness: 45,
    neuroticism: 65
  };
  
  return personalities;
}

// Create emotional states for example NPCs
function createExampleEmotionalStates(npcs: NPC[]): Record<string, any> {
  const emotionalStates: Record<string, any> = {};
  
  // Gorn: Angry
  emotionalStates[npcs[0].id] = {
    dominantEmotion: Emotion.ANGER,
    intensity: 75,
    secondaryEmotions: new Map([[Emotion.PRIDE, 40]]),
    triggers: new Map([["combat started", 70]]),
    duration: 5
  };
  
  // Elara: Calculating (using TRUST as proxy for calm confidence)
  emotionalStates[npcs[1].id] = {
    dominantEmotion: Emotion.TRUST,
    intensity: 60,
    secondaryEmotions: new Map([[Emotion.FEAR, 20]]),
    triggers: new Map([["analyzing battle situation", 50]]),
    duration: 10
  };
  
  // Brother Tomas: Compassionate (using BENEVOLENCE as proxy)
  emotionalStates[npcs[2].id] = {
    dominantEmotion: Emotion.TRUST,
    intensity: 80,
    secondaryEmotions: new Map([[Emotion.JOY, 50]]),
    triggers: new Map([["seeing allies in need", 75]]),
    duration: 15
  };
  
  // Vex: Excited (using JOY as proxy for thrill-seeking)
  emotionalStates[npcs[3].id] = {
    dominantEmotion: Emotion.JOY,
    intensity: 85,
    secondaryEmotions: new Map([[Emotion.SURPRISE, 60]]),
    triggers: new Map([["dangerous situation", 80]]),
    duration: 7
  };
  
  return emotionalStates;
}

// Create core values for example NPCs
function createExampleCoreValues(npcs: NPC[]): Record<string, CoreValues> {
  const coreValues: Record<string, CoreValues> = {};
  
  // Gorn: Values power and tradition
  coreValues[npcs[0].id] = {
    primary: Value.POWER,
    secondary: Value.TRADITION,
    valueHierarchy: new Map([
      [Value.POWER, 85],
      [Value.TRADITION, 75],
      [Value.ACHIEVEMENT, 70],
      [Value.SECURITY, 60],
      [Value.SELF_DIRECTION, 40],
      [Value.BENEVOLENCE, 30],
      [Value.HEDONISM, 25],
      [Value.UNIVERSALISM, 15]
    ])
  };
  
  // Elara: Values achievement and self-direction
  coreValues[npcs[1].id] = {
    primary: Value.ACHIEVEMENT,
    secondary: Value.SELF_DIRECTION,
    valueHierarchy: new Map([
      [Value.ACHIEVEMENT, 90],
      [Value.SELF_DIRECTION, 85],
      [Value.UNIVERSALISM, 65],
      [Value.SECURITY, 60],
      [Value.TRADITION, 50],
      [Value.POWER, 40],
      [Value.BENEVOLENCE, 35],
      [Value.HEDONISM, 20]
    ])
  };
  
  // Brother Tomas: Values benevolence and universalism
  coreValues[npcs[2].id] = {
    primary: Value.BENEVOLENCE,
    secondary: Value.UNIVERSALISM,
    valueHierarchy: new Map([
      [Value.BENEVOLENCE, 95],
      [Value.UNIVERSALISM, 85],
      [Value.TRADITION, 70],
      [Value.CONFORMITY, 65],
      [Value.SECURITY, 55],
      [Value.SELF_DIRECTION, 40],
      [Value.ACHIEVEMENT, 30],
      [Value.POWER, 15],
      [Value.HEDONISM, 10]
    ])
  };
  
  // Vex: Values stimulation and hedonism
  coreValues[npcs[3].id] = {
    primary: Value.STIMULATION,
    secondary: Value.HEDONISM,
    valueHierarchy: new Map([
      [Value.STIMULATION, 90],
      [Value.HEDONISM, 85],
      [Value.SELF_DIRECTION, 75],
      [Value.ACHIEVEMENT, 60],
      [Value.POWER, 50],
      [Value.UNIVERSALISM, 35],
      [Value.BENEVOLENCE, 30],
      [Value.TRADITION, 20],
      [Value.SECURITY, 15]
    ])
  };
  
  return coreValues;
}

// Create a mock combat state for the example
function createMockCombatState(npcs: NPC[]): CombatState {
  // Create enemy NPCs
  const enemies: NPC[] = [
    {
      id: uuidv4(),
      name: "Orc Berserker",
      type: "humanoid",
      race: "orc",
      class: "barbarian",
      level: 4,
      description: "A muscular orc with tusks and rage in its eyes",
      abilities: {
        strength: 16,
        dexterity: 12,
        constitution: 16,
        intelligence: 8,
        wisdom: 10,
        charisma: 8
      },
      currentHealth: 40,
      maxHealth: 40,
      armorClass: 14,
      initiative: 1,
      status: "alive",
      equipment: {},
      inventory: {},
      spells: {},
      features: {}
    },
    {
      id: uuidv4(),
      name: "Goblin Archer",
      type: "humanoid",
      race: "goblin",
      class: "ranger",
      level: 3,
      description: "A small, nimble goblin with a shortbow",
      abilities: {
        strength: 8,
        dexterity: 16,
        constitution: 12,
        intelligence: 10,
        wisdom: 12,
        charisma: 8
      },
      currentHealth: 24,
      maxHealth: 24,
      armorClass: 13,
      initiative: 3,
      status: "alive",
      equipment: {},
      inventory: {},
      spells: {},
      features: {}
    },
    {
      id: uuidv4(),
      name: "Dark Acolyte",
      type: "humanoid",
      race: "human",
      class: "warlock",
      level: 4,
      description: "A robed human with glowing sigils on their skin",
      abilities: {
        strength: 10,
        dexterity: 14,
        constitution: 14,
        intelligence: 12,
        wisdom: 12,
        charisma: 16
      },
      currentHealth: 32,
      maxHealth: 32,
      armorClass: 12,
      initiative: 2,
      status: "alive",
      equipment: {},
      inventory: {},
      spells: {},
      features: {}
    }
  ];
  
  // Create initiative order
  const initiativeOrder: InitiativeEntry[] = [
    { id: npcs[3].id, name: npcs[3].name, initiative: npcs[3].initiative, isPlayer: false, hasGone: false },
    { id: npcs[1].id, name: npcs[1].name, initiative: npcs[1].initiative, isPlayer: false, hasGone: false },
    { id: enemies[2].id, name: enemies[2].name, initiative: enemies[2].initiative, isPlayer: false, hasGone: false },
    { id: enemies[1].id, name: enemies[1].name, initiative: enemies[1].initiative, isPlayer: false, hasGone: false },
    { id: npcs[0].id, name: npcs[0].name, initiative: npcs[0].initiative, isPlayer: false, hasGone: false },
    { id: enemies[0].id, name: enemies[0].name, initiative: enemies[0].initiative, isPlayer: false, hasGone: false },
    { id: npcs[2].id, name: npcs[2].name, initiative: npcs[2].initiative, isPlayer: false, hasGone: false }
  ];
  
  // Create complete combat state
  const combatState: CombatState = {
    id: uuidv4(),
    active: true,
    round: 1,
    turn: 0,
    initiativeOrder,
    combatants: [...npcs, ...enemies],
    location: {
      id: uuidv4(),
      name: "Forest Clearing",
      description: "A small clearing in the forest with tall trees surrounding it",
      connections: [],
      objects: [],
      creatures: []
    },
    conditions: new Map(),
    logs: [],
    metadata: {
      difficulty: "medium",
      terrain: "forest",
      lighting: "daylight",
      weather: "clear",
      specialFeatures: ["fallen trees", "rocky outcroppings", "shallow stream"]
    }
  };
  
  return combatState;
}

// Mock relationship data
function createMockRelationships(npcs: NPC[], enemies: NPC[]): Map<string, Map<string, number>> {
  const relationships = new Map<string, Map<string, number>>();
  
  // Set up relationships among NPCs (teammates)
  npcs.forEach(npc => {
    const npcRelationships = new Map<string, number>();
    
    npcs.forEach(other => {
      if (npc.id !== other.id) {
        // Default relationship among team members is positive (0.6)
        npcRelationships.set(other.id, 0.6);
      }
    });
    
    // Set up relationships with enemies (negative)
    enemies.forEach(enemy => {
      npcRelationships.set(enemy.id, -0.7);
    });
    
    relationships.set(npc.id, npcRelationships);
  });
  
  // Add some special relationships
  
  // Gorn dislikes Elara (faction rivalry)
  relationships.get(npcs[0].id)?.set(npcs[1].id, 0.2);
  
  // Tomas especially likes Elara (they worked together before)
  relationships.get(npcs[2].id)?.set(npcs[1].id, 0.8);
  
  // Vex has a rivalry with Gorn
  relationships.get(npcs[3].id)?.set(npcs[0].id, 0.3);
  
  // Elara has studied the Dark Acolyte's order and has special concern
  relationships.get(npcs[1].id)?.set(enemies[2].id, -0.9);
  
  return relationships;
}

// Mock BehaviorSimulation class for the example
class MockBehaviorSimulation implements Partial<BehaviorSimulation> {
  private personalities: Record<string, PersonalityTraits>;
  private emotionalStates: Record<string, any>;
  private coreValues: Record<string, CoreValues>;
  
  constructor(
    personalities: Record<string, PersonalityTraits>,
    emotionalStates: Record<string, any>,
    coreValues: Record<string, CoreValues>
  ) {
    this.personalities = personalities;
    this.emotionalStates = emotionalStates;
    this.coreValues = coreValues;
  }
  
  getPersonalityProvider(): Record<string, PersonalityTraits> {
    return this.personalities;
  }
  
  getEmotionalStateProvider(): Record<string, any> {
    return this.emotionalStates;
  }
  
  getCoreValuesProvider(): Record<string, CoreValues> {
    return this.coreValues;
  }
}

// Mock TacticalAI class for the example
class MockTacticalAI implements Partial<TacticalAI> {
  makeDecision(context: any): any {
    // Simple mock decision based on NPC class
    const npc = context.npc;
    const possibleTargets = context.possibleTargets || [];
    
    // Default decision
    const decision = {
      actionName: "attack",
      actionType: "melee",
      targetId: possibleTargets.length > 0 ? possibleTargets[0].id : undefined,
      reasoning: "Default tactical decision based on available targets",
      fallbackAction: "dodge",
      movementIntention: "approach"
    };
    
    // Class-specific decisions
    if (npc.class === "fighter") {
      decision.actionName = "melee_attack";
      decision.reasoning = "Direct melee attack is most effective for fighter class";
    } else if (npc.class === "wizard") {
      decision.actionName = "cast_spell";
      decision.actionType = "spell";
      decision.reasoning = "Spellcasting provides range and area effect advantages";
    } else if (npc.class === "cleric") {
      // Check if any allies are injured
      const injuredAllies = context.allyStatus.healthStatuses.injured + context.allyStatus.healthStatuses.critical;
      if (injuredAllies > 0) {
        decision.actionName = "heal_ally";
        decision.actionType = "spell";
        decision.reasoning = "Priority to heal injured allies";
      } else {
        decision.actionName = "support_spell";
        decision.actionType = "spell";
        decision.reasoning = "Support allies with beneficial spells";
      }
    } else if (npc.class === "rogue") {
      decision.actionName = "sneak_attack";
      decision.actionType = "melee";
      decision.reasoning = "Position for maximum sneak attack damage";
      decision.movementIntention = "flank";
    }
    
    return decision;
  }
}

// Run the example
export async function runCombatAIIntegrationExample() {
  // Create NPCs and combat state
  const npcs = createExampleNPCs();
  const personalities = createExamplePersonalities(npcs);
  const emotionalStates = createExampleEmotionalStates(npcs);
  const coreValues = createExampleCoreValues(npcs);
  const combatState = createMockCombatState(npcs);
  const enemies = combatState.combatants.filter(c => !npcs.find(n => n.id === c.id));
  
  // Setup relationship tracking
  const relationshipData = createMockRelationships(npcs, enemies);
  const mockRelationshipTracker: RelationshipTracker = {
    getRelationshipStrength: (source: string, target: string) => {
      return relationshipData.get(source)?.get(target) || 0;
    },
    // Add other required methods with empty implementations for mock
    updateRelationship: () => {},
    getRelationships: () => new Map(),
    getAllRelationships: () => relationshipData
  } as any;
  
  // Setup memory manager with mock implementation
  const mockMemoryManager: MemoryManager = {
    getMemoriesAbout: () => [],
    // Add other required methods with empty implementations for mock
    addMemory: () => {},
    getMemories: () => [],
    getAllMemories: () => []
  } as any;
  
  // Setup behavior simulation with mock implementation
  const mockBehaviorSimulation = new MockBehaviorSimulation(
    personalities,
    emotionalStates,
    coreValues
  );
  
  // Setup tactical AI with mock implementation
  const mockAIService = new MockAIService() as AIService;
  const mockEnemyManager = {} as EnemyManager;
  const mockTacticalAI = new MockTacticalAI() as TacticalAI;
  
  // Create mock faction system components
  const mockFactionManager = {} as FactionManager;
  const mockFactionSystem = {} as FactionSystem;
  const mockFactionSocialIntegration = {} as FactionSocialIntegration;
  
  // Create the Combat AI Integration system
  const combatAIIntegration = new CombatAIIntegration(
    mockTacticalAI,
    mockBehaviorSimulation as BehaviorSimulation,
    mockFactionSocialIntegration,
    mockFactionManager,
    mockRelationshipTracker,
    mockMemoryManager
  );
  
  console.log("=== Combat AI Integration Example ===");
  console.log("Demonstrating how different NPC personalities affect combat decisions\n");
  
  // Test each NPC's combat style preferences
  for (const npc of npcs) {
    const combatStyle = combatAIIntegration.getCombatStylePreference(npc.id);
    
    console.log(`\n${npc.name} (${npc.class}) Combat Style:`);
    console.log(`- Aggression: ${combatStyle.aggression}/100`);
    console.log(`- Risk Tolerance: ${combatStyle.riskTolerance}/100`);
    console.log(`- Tactical Complexity: ${combatStyle.tacticalComplexity}/100`);
    console.log(`- Self-Preservation: ${combatStyle.selfPreservation}/100`);
    console.log(`- Ally Protection: ${combatStyle.allyProtection}/100`);
    console.log(`- Target Preference: ${combatStyle.targetPreference}`);
    
    // Make a combat decision for this NPC
    const decision = combatAIIntegration.makePersonalityEnhancedDecision(npc, combatState);
    
    console.log(`\nCombat Decision for ${npc.name}:`);
    console.log(`- Action: ${decision.actionName} (${decision.actionType})`);
    console.log(`- Target: ${decision.targetId ? combatState.combatants.find(c => c.id === decision.targetId)?.name : 'None'}`);
    console.log(`- Reasoning: ${decision.reasoning}`);
    console.log(`- Movement: ${decision.movementIntention}`);
    
    if (decision.alternativeActions && decision.alternativeActions.length > 0) {
      console.log("- Considered alternatives:");
      decision.alternativeActions.forEach(alt => {
        console.log(`  * ${alt.action} - Rejected because: ${alt.reasonRejected}`);
      });
    }
    
    console.log("\n-------------------------------------------");
  }
  
  console.log("\nExample complete!");
}

// Auto-run the example if this file is executed directly
if (require.main === module) {
  runCombatAIIntegrationExample().catch(console.error);
} 