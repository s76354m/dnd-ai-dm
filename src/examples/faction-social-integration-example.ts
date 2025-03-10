/**
 * faction-social-integration-example.ts
 * 
 * This example demonstrates how the Faction System and Social Dynamics System 
 * integrate to create complex NPC behaviors and interactions influenced by
 * faction dynamics, relationships, and world events.
 */

import { MemoryManager } from '../ai/memory/memory-manager';
import { RelationshipTracker } from '../ai/memory/relationship-tracker';
import { EnhancedContextManager } from '../ai/memory/enhanced-context-manager';
import { PersonalityModel } from '../ai/npc/personality-model';
import { DialogueSystem } from '../ai/npc/dialogue-system';
import { BehaviorSimulation, NeedType } from '../ai/npc/behavior-simulation';
import { SocialInteractionSystem, SocialNPC, SocialInteractionType } from '../ai/npc/social/social-interaction';
import { InformationSharingSystem, InformationType } from '../ai/npc/social/information-sharing';
import { FactionSocialIntegration } from '../ai/npc/social/faction-social-integration';
import { FactionSystem } from '../ai/world/faction/faction-system';
import { FactionManager } from '../ai/world/faction/faction-manager';
import { FactionEventSystem, FactionEvent } from '../ai/world/faction/faction-events';
import { ResourceManager } from '../ai/world/faction/resource-manager';
import { TerritoryManager } from '../ai/world/faction/territory-manager';
import { Faction, FactionGoal, FactionMember } from '../ai/world/faction/faction-types';
import { v4 as uuidv4 } from 'uuid';

// Set up core services
const memoryManager = new MemoryManager();
const relationshipTracker = new RelationshipTracker(memoryManager);
const contextManager = new EnhancedContextManager();
const personalityModel = new PersonalityModel(memoryManager, relationshipTracker);
const dialogueSystem = new DialogueSystem(personalityModel, memoryManager, relationshipTracker, contextManager);
const behaviorSimulation = new BehaviorSimulation(
  personalityModel as any, // Type casting for example simplicity
  memoryManager,
  relationshipTracker,
  dialogueSystem
);

// Set up social systems
const socialInteractionSystem = new SocialInteractionSystem(
  memoryManager,
  relationshipTracker,
  behaviorSimulation,
  dialogueSystem
);

const informationSharingSystem = new InformationSharingSystem(
  memoryManager,
  relationshipTracker,
  socialInteractionSystem
);

// Set up faction systems
const resourceManager = new ResourceManager();
const territoryManager = new TerritoryManager();
const factionEventSystem = new FactionEventSystem();
const factionManager = new FactionManager(resourceManager, territoryManager);
const factionSystem = new FactionSystem(
  factionManager,
  resourceManager,
  territoryManager,
  factionEventSystem
);

// Create the faction-social integration system
const factionSocialIntegration = new FactionSocialIntegration(
  memoryManager,
  relationshipTracker,
  socialInteractionSystem,
  informationSharingSystem,
  behaviorSimulation,
  factionSystem,
  factionManager,
  factionEventSystem,
  {
    debugMode: true
  }
);

// Initialize world time (in game minutes, starting at 9:00 AM)
let gameTime = 9 * 60;
behaviorSimulation.setGameTime(gameTime);

// Create some territories
territoryManager.createTerritory({
  id: 'territory_town_center',
  name: 'Town Center',
  type: 'urban',
  resources: [
    { type: 'gold', amount: 100 },
    { type: 'influence', amount: 300 }
  ],
  connections: []
});

territoryManager.createTerritory({
  id: 'territory_merchant_district',
  name: 'Merchant District',
  type: 'urban',
  resources: [
    { type: 'gold', amount: 500 },
    { type: 'goods', amount: 200 },
    { type: 'influence', amount: 150 }
  ],
  connections: ['territory_town_center']
});

territoryManager.createTerritory({
  id: 'territory_temple_district',
  name: 'Temple District',
  type: 'urban',
  resources: [
    { type: 'faith', amount: 400 },
    { type: 'influence', amount: 250 },
    { type: 'knowledge', amount: 150 }
  ],
  connections: ['territory_town_center']
});

// Connect territories
territoryManager.connectTerritories('territory_town_center', 'territory_merchant_district');
territoryManager.connectTerritories('territory_town_center', 'territory_temple_district');

// Create factions
const merchantGuild: Faction = {
  id: 'faction_merchant_guild',
  name: 'Merchant Guild',
  type: 'guild',
  description: 'A powerful association of merchants that controls trade in the region.',
  values: {
    wealth: 90,
    power: 70,
    freedom: 60,
    tradition: 40,
    knowledge: 50,
    honor: 30
  },
  resources: new Map([
    ['gold', 1000],
    ['goods', 500],
    ['influence', 200]
  ]),
  territories: ['territory_merchant_district'],
  leader: {
    id: 'npc_guildmaster',
    name: 'Guildmaster Torbin',
    role: 'leader',
    influence: 100,
    loyalty: 100
  },
  members: [],
  goals: [
    {
      id: 'goal_merchant_wealth',
      name: 'Increase Guild Wealth',
      description: 'Increase the guild\'s wealth through trade and taxation',
      type: 'wealth',
      progress: 0,
      priority: 8,
      deadline: gameTime + (30 * 24 * 60) // 30 days
    },
    {
      id: 'goal_merchant_expansion',
      name: 'Expand Influence',
      description: 'Expand the guild\'s influence to neighboring regions',
      type: 'expansion',
      progress: 0,
      priority: 6,
      deadline: gameTime + (60 * 24 * 60) // 60 days
    }
  ],
  relationships: new Map(),
  knowledge: [
    {
      content: 'The temple district is planning to increase tithes from merchants.',
      type: InformationType.SECRET,
      importance: 70,
      relevantEntities: ['faction_temple_order'],
      tags: ['economy', 'conflict']
    },
    {
      content: 'Guild treasurer Norrin has been skimming from guild coffers.',
      type: InformationType.SECRET,
      importance: 80,
      relevantEntities: ['npc_norrin'],
      tags: ['corruption', 'internal']
    }
  ]
};

const templeOrder: Faction = {
  id: 'faction_temple_order',
  name: 'Temple Order',
  type: 'religious',
  description: 'A devoted religious order that maintains the temples and provides spiritual guidance.',
  values: {
    faith: 90,
    tradition: 80,
    order: 70,
    honor: 60,
    knowledge: 50,
    wealth: 30
  },
  resources: new Map([
    ['faith', 800],
    ['influence', 300],
    ['gold', 300],
    ['knowledge', 400]
  ]),
  territories: ['territory_temple_district'],
  leader: {
    id: 'npc_highpriest',
    name: 'High Priest Elian',
    role: 'leader',
    influence: 100,
    loyalty: 100
  },
  members: [],
  goals: [
    {
      id: 'goal_temple_faith',
      name: 'Spread the Faith',
      description: 'Increase the number of followers in the region',
      type: 'religious',
      progress: 0,
      priority: 9,
      deadline: gameTime + (45 * 24 * 60) // 45 days
    },
    {
      id: 'goal_temple_knowledge',
      name: 'Preserve Ancient Knowledge',
      description: 'Collect and preserve ancient texts and artifacts',
      type: 'knowledge',
      progress: 0,
      priority: 7,
      deadline: gameTime + (90 * 24 * 60) // 90 days
    }
  ],
  relationships: new Map(),
  knowledge: [
    {
      content: 'An ancient artifact of great power is hidden somewhere in the region.',
      type: InformationType.SECRET,
      importance: 90,
      tags: ['artifact', 'magic', 'quest']
    },
    {
      content: 'The Merchant Guild is planning to levy new taxes on religious goods.',
      type: InformationType.RUMOR,
      importance: 65,
      relevantEntities: ['faction_merchant_guild'],
      tags: ['economy', 'conflict']
    }
  ]
};

// Register factions
factionManager.registerFaction(merchantGuild);
factionManager.registerFaction(templeOrder);

// Set initial faction relationships
factionManager.setFactionRelationship('faction_merchant_guild', 'faction_temple_order', 30); // Neutral-positive

// Create NPCs with personalities
function createMerchantNPC(name: string, role: string = 'member'): SocialNPC {
  return {
    id: `npc_merchant_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    personality: {
      traits: {
        openness: 50 + Math.floor(Math.random() * 30),
        conscientiousness: 60 + Math.floor(Math.random() * 30),
        extraversion: 60 + Math.floor(Math.random() * 30),
        agreeableness: 40 + Math.floor(Math.random() * 30),
        neuroticism: 30 + Math.floor(Math.random() * 30)
      },
      values: {
        wealth: 80 + Math.floor(Math.random() * 20),
        power: 60 + Math.floor(Math.random() * 30),
        freedom: 50 + Math.floor(Math.random() * 40),
        tradition: 30 + Math.floor(Math.random() * 40),
        knowledge: 40 + Math.floor(Math.random() * 30),
        security: 50 + Math.floor(Math.random() * 30)
      },
      emotionalState: {
        currentEmotions: [
          { type: 'neutral', intensity: 5 },
          { type: 'ambitious', intensity: 7 }
        ],
        mood: 'neutral',
        emotionalVolatility: 0.3
      },
      flaws: ['greedy'],
      behavioralPatterns: {
        decisiveness: 0.7,
        riskTolerance: 0.6,
        cooperativeness: 0.5,
        adaptability: 0.8,
        assertiveness: 0.7
      }
    },
    knowledge: [
      'The Merchant Guild controls all major trade in the region',
      'The Temple Order has been increasing its influence lately',
      'The market square is the best place to sell rare goods'
    ],
    emotionalState: {
      currentEmotions: [
        { type: 'neutral', intensity: 5 },
        { type: 'ambitious', intensity: 7 }
      ],
      mood: 'neutral',
      emotionalVolatility: 0.3
    },
    currentLocation: 'territory_merchant_district',
    occupation: 'Merchant',
    faction: 'faction_merchant_guild',
    goals: new Map(),
    schedule: []
  };
}

function createTempleNPC(name: string, role: string = 'member'): SocialNPC {
  return {
    id: `npc_priest_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    personality: {
      traits: {
        openness: 40 + Math.floor(Math.random() * 30),
        conscientiousness: 70 + Math.floor(Math.random() * 30),
        extraversion: 40 + Math.floor(Math.random() * 40),
        agreeableness: 60 + Math.floor(Math.random() * 30),
        neuroticism: 20 + Math.floor(Math.random() * 40)
      },
      values: {
        faith: 80 + Math.floor(Math.random() * 20),
        tradition: 70 + Math.floor(Math.random() * 20),
        order: 60 + Math.floor(Math.random() * 30),
        knowledge: 50 + Math.floor(Math.random() * 40),
        community: 60 + Math.floor(Math.random() * 30),
        wealth: 20 + Math.floor(Math.random() * 30)
      },
      emotionalState: {
        currentEmotions: [
          { type: 'serene', intensity: 8 },
          { type: 'dutiful', intensity: 7 }
        ],
        mood: 'positive',
        emotionalVolatility: 0.2
      },
      flaws: ['dogmatic'],
      behavioralPatterns: {
        decisiveness: 0.6,
        riskTolerance: 0.3,
        cooperativeness: 0.7,
        adaptability: 0.4,
        assertiveness: 0.5
      }
    },
    knowledge: [
      'The Temple Order serves as spiritual guides for the community',
      'Ancient texts in the temple library contain valuable knowledge',
      'Daily prayer in the main temple happens at dawn and dusk'
    ],
    emotionalState: {
      currentEmotions: [
        { type: 'serene', intensity: 8 },
        { type: 'dutiful', intensity: 7 }
      ],
      mood: 'positive',
      emotionalVolatility: 0.2
    },
    currentLocation: 'territory_temple_district',
    occupation: 'Priest',
    faction: 'faction_temple_order',
    goals: new Map(),
    schedule: []
  };
}

// Create NPCs
const merchantNPCs = [
  createMerchantNPC('Torbin', 'leader'),
  createMerchantNPC('Greta'),
  createMerchantNPC('Norrin', 'treasurer'),
  createMerchantNPC('Hilda'),
  createMerchantNPC('Viktor')
];

const templeNPCs = [
  createTempleNPC('Elian', 'leader'),
  createTempleNPC('Marius'),
  createTempleNPC('Saphira'),
  createTempleNPC('Thom'),
  createTempleNPC('Elara')
];

// Register NPCs with the social interaction system
[...merchantNPCs, ...templeNPCs].forEach(npc => {
  socialInteractionSystem.registerNPC(npc);
  
  // Register with behavior simulation
  behaviorSimulation.registerNPC(
    npc.id, 
    npc.currentLocation,
    {
      [NeedType.MONEY]: npc.faction === 'faction_merchant_guild' ? 60 : 40,
      [NeedType.SOCIAL]: 70,
      [NeedType.RESPECT]: 65
    }
  );
});

// Register NPCs with factions
merchantNPCs.forEach(npc => {
  factionSocialIntegration.registerNPCAsFactionMember(
    npc.id,
    'faction_merchant_guild',
    npc.name === 'Torbin' ? 'leader' : (npc.name === 'Norrin' ? 'treasurer' : 'member'),
    npc.name === 'Torbin' ? 100 : (npc.name === 'Norrin' ? 70 : 40),
    npc.name === 'Torbin' ? 100 : (npc.name === 'Norrin' ? 60 : 80)
  );
});

templeNPCs.forEach(npc => {
  factionSocialIntegration.registerNPCAsFactionMember(
    npc.id,
    'faction_temple_order',
    npc.name === 'Elian' ? 'leader' : 'acolyte',
    npc.name === 'Elian' ? 100 : 50,
    npc.name === 'Elian' ? 100 : 90
  );
});

console.log("\n=== Initial State ===");
console.log(`Game Time: Day 1, ${Math.floor(gameTime / 60)}:${gameTime % 60 < 10 ? '0' + (gameTime % 60) : gameTime % 60}`);
console.log(`Merchant Guild members: ${factionSocialIntegration.getFactionNPCs('faction_merchant_guild').length}`);
console.log(`Temple Order members: ${factionSocialIntegration.getFactionNPCs('faction_temple_order').length}`);
console.log(`Faction relationship: ${factionManager.getFactionRelationship('faction_merchant_guild', 'faction_temple_order')}`);

// Run a day simulation with social interactions
console.log("\n=== Simulating One Day of Social Interactions ===");

// Morning interactions (9 AM to 12 PM)
for (let hour = 0; hour < 3; hour++) {
  gameTime += 60; // Advance one hour
  behaviorSimulation.setGameTime(gameTime);
  
  // Update NPC states
  [...merchantNPCs, ...templeNPCs].forEach(npc => {
    behaviorSimulation.updateNPC(npc.id, gameTime);
  });
  
  // Update social systems
  socialInteractionSystem.updateSystem(gameTime);
  informationSharingSystem.updateSystem(gameTime, [...merchantNPCs, ...templeNPCs]);
  factionSocialIntegration.updateSystem(gameTime);
  
  if (hour === 1) {
    // Create a meeting between faction leaders at 11 AM
    console.log("\n--- Meeting between faction leaders ---");
    
    // Move the Temple leader to the Merchant district for a meeting
    const elianId = templeNPCs[0].id;
    const torbinId = merchantNPCs[0].id;
    
    behaviorSimulation.updateLocation(elianId, 'territory_merchant_district');
    
    // Simulate a social interaction
    const interaction = {
      primaryNpcId: torbinId,
      secondaryNpcId: elianId,
      interactionType: SocialInteractionType.NEGOTIATION,
      relationshipChange: 5,
      emotionalImpact: [{ emotion: 'respectful', intensity: 7 }],
      knowledgeShared: [
        'The Temple Order needs more resources for renovations',
        'The Merchant Guild is planning a trade fair next month'
      ],
      memoryCreated: true,
      timestamp: Date.now()
    };
    
    // Record the interaction in memory
    memoryManager.addMemory(torbinId, {
      id: `mem_meeting_${uuidv4()}`,
      type: 'social_interaction',
      content: `Met with ${templeNPCs[0].name} to discuss cooperation between our factions.`,
      emotionalResponse: { type: 'respectful', intensity: 7 },
      importance: 70,
      timestamp: Date.now(),
      entities: [elianId],
      location: 'territory_merchant_district',
      tags: ['meeting', 'diplomacy', 'faction']
    });
    
    memoryManager.addMemory(elianId, {
      id: `mem_meeting_${uuidv4()}`,
      type: 'social_interaction',
      content: `Met with ${merchantNPCs[0].name} to discuss resource sharing and temple renovations.`,
      emotionalResponse: { type: 'hopeful', intensity: 6 },
      importance: 70,
      timestamp: Date.now(),
      entities: [torbinId],
      location: 'territory_merchant_district',
      tags: ['meeting', 'diplomacy', 'faction']
    });
    
    // Apply faction-modified relationship changes
    const modifiedChange = factionSocialIntegration.modifyRelationshipChange(
      torbinId,
      elianId,
      interaction.relationshipChange,
      interaction.interactionType
    );
    
    // Update relationships
    relationshipTracker.modifyRelationship(torbinId, elianId, modifiedChange);
    relationshipTracker.modifyRelationship(elianId, torbinId, modifiedChange);
    
    console.log(`Relationship change between leaders: Original ${interaction.relationshipChange}, Modified ${modifiedChange}`);
    console.log(`New relationship: ${relationshipTracker.getRelationship(torbinId, elianId)}`);
    
    // Move the Temple leader back to the Temple district
    behaviorSimulation.updateLocation(elianId, 'territory_temple_district');
  }
}

// Afternoon - a faction event occurs (3 PM)
gameTime += 180; // Advance 3 hours to 3 PM
console.log("\n--- Faction Event: Trade Dispute ---");

// Create a faction event
const tradeDisputeEvent: FactionEvent = {
  id: `event_trade_dispute_${uuidv4()}`,
  factionId: 'faction_merchant_guild',
  type: 'conflict',
  name: 'Trade Dispute',
  description: 'The Merchant Guild has implemented new tariffs on religious goods, angering the Temple Order.',
  importance: 75,
  public: true,
  affectedFactionIds: ['faction_temple_order'],
  location: 'territory_merchant_district',
  timestamp: Date.now(),
  relationshipChanges: [
    {
      factionId1: 'faction_merchant_guild',
      factionId2: 'faction_temple_order',
      valueChange: -15
    }
  ],
  emotionalResponse: { type: 'angry', intensity: 7 },
  resourceChanges: [
    {
      factionId: 'faction_merchant_guild',
      resourceType: 'gold',
      amount: 50
    },
    {
      factionId: 'faction_temple_order',
      resourceType: 'gold',
      amount: -30
    }
  ],
  tags: ['economy', 'conflict', 'trade']
};

// Process the faction event
factionSocialIntegration.processFactionEvent(tradeDisputeEvent);

// Update faction relationship directly through faction manager
for (const change of tradeDisputeEvent.relationshipChanges) {
  factionManager.modifyFactionRelationship(
    change.factionId1,
    change.factionId2,
    change.valueChange
  );
}

// Update resource changes
for (const change of tradeDisputeEvent.resourceChanges) {
  const currentValue = resourceManager.getFactionResource(change.factionId, change.resourceType) || 0;
  resourceManager.setFactionResource(change.factionId, change.resourceType, currentValue + change.amount);
}

console.log(`Faction relationship after dispute: ${factionManager.getFactionRelationship('faction_merchant_guild', 'faction_temple_order')}`);

// Evening - information sharing and social interactions (6 PM to 9 PM)
gameTime += 180; // Advance 3 hours to 6 PM

// Update all systems with the new game time
behaviorSimulation.setGameTime(gameTime);
[...merchantNPCs, ...templeNPCs].forEach(npc => {
  behaviorSimulation.updateNPC(npc.id, gameTime);
});
socialInteractionSystem.updateSystem(gameTime);
informationSharingSystem.updateSystem(gameTime, [...merchantNPCs, ...templeNPCs]);
factionSocialIntegration.updateSystem(gameTime);

console.log("\n=== Information Spreading Analysis ===");

// Check which NPCs know about the trade dispute
const merchantsWithKnowledge = merchantNPCs.filter(npc => {
  const knowledge = informationSharingSystem.getNPCKnowledge(npc.id);
  return knowledge.some(info => info.content.includes('tariffs on religious goods'));
}).length;

const priestsWithKnowledge = templeNPCs.filter(npc => {
  const knowledge = informationSharingSystem.getNPCKnowledge(npc.id);
  return knowledge.some(info => info.content.includes('tariffs on religious goods'));
}).length;

console.log(`Merchants who know about the trade dispute: ${merchantsWithKnowledge}/${merchantNPCs.length}`);
console.log(`Temple members who know about the trade dispute: ${priestsWithKnowledge}/${templeNPCs.length}`);

// Final state - see how relationships have evolved
console.log("\n=== Final State ===");
console.log(`Game Time: Day 1, ${Math.floor(gameTime / 60)}:${gameTime % 60 < 10 ? '0' + (gameTime % 60) : gameTime % 60}`);
console.log(`Faction relationship: ${factionManager.getFactionRelationship('faction_merchant_guild', 'faction_temple_order')}`);

// Check cross-faction relationships
const crossFactionRelationships = [];
for (const merchantNPC of merchantNPCs) {
  for (const templeNPC of templeNPCs) {
    const relationship = relationshipTracker.getRelationship(merchantNPC.id, templeNPC.id);
    if (relationship !== undefined) {
      crossFactionRelationships.push({
        merchant: merchantNPC.name,
        priest: templeNPC.name,
        value: relationship
      });
    }
  }
}

console.log("\n=== Cross-Faction Relationships ===");
crossFactionRelationships.forEach(rel => {
  console.log(`${rel.merchant} -> ${rel.priest}: ${rel.value}`);
});

// Example of how faction goals influence NPC behavior
console.log("\n=== Faction Goal Influence on NPCs ===");
const merchantLeaderState = behaviorSimulation.getBehaviorState(merchantNPCs[0].id);
const templeLeaderState = behaviorSimulation.getBehaviorState(templeNPCs[0].id);

if (merchantLeaderState) {
  console.log(`Merchant Leader Goals: ${merchantLeaderState.goals.size}`);
  merchantLeaderState.goals.forEach((goal, id) => {
    console.log(`- ${goal.name} (Progress: ${goal.progress}%)`);
  });
}

if (templeLeaderState) {
  console.log(`Temple Leader Goals: ${templeLeaderState.goals.size}`);
  templeLeaderState.goals.forEach((goal, id) => {
    console.log(`- ${goal.name} (Progress: ${goal.progress}%)`);
  });
}

// Simulate potential player interactions with this world
console.log("\n=== Example Player Interaction ===");
console.log("Player asks the Merchant Guild Leader about the Temple Order");

// Generate a response based on relationships, faction status, and recent events
function generateFactionLeaderResponse(npcId: string, aboutFactionId: string): string {
  const npc = [...merchantNPCs, ...templeNPCs].find(n => n.id === npcId);
  const relationship = factionManager.getFactionRelationship(npc?.faction || '', aboutFactionId);
  const npcKnowledge = informationSharingSystem.getNPCKnowledge(npcId);
  const recentEvents = npcKnowledge.filter(k => 
    k.relevantEntities.includes(aboutFactionId) && 
    k.type === InformationType.FACT && 
    k.tags.includes('faction_event')
  );
  
  let response = '';
  
  if (relationship > 50) {
    response = `"The ${aboutFactionId === 'faction_merchant_guild' ? 'Merchant Guild' : 'Temple Order'} is a valuable ally. We have our differences, but we work together for the good of the town."`;
  } else if (relationship > 20) {
    response = `"We maintain cordial relations with the ${aboutFactionId === 'faction_merchant_guild' ? 'Merchant Guild' : 'Temple Order'}, though we don't always see eye to eye."`;
  } else if (relationship > -20) {
    response = `"The ${aboutFactionId === 'faction_merchant_guild' ? 'Merchant Guild' : 'Temple Order'}? We have our disagreements, especially lately."`;
  } else {
    response = `"I'd rather not discuss the ${aboutFactionId === 'faction_merchant_guild' ? 'Merchant Guild' : 'Temple Order'}. Our relationship has become... strained."`;
  }
  
  // Add reference to recent events if any
  if (recentEvents.length > 0) {
    response += ` "As you may have heard, ${recentEvents[0].content}"`;
  }
  
  return response;
}

const merchantLeaderResponse = generateFactionLeaderResponse(merchantNPCs[0].id, 'faction_temple_order');
console.log(`${merchantNPCs[0].name}: ${merchantLeaderResponse}`);

console.log("\nPlayer asks the Temple Order Leader about the Merchant Guild");
const templeLeaderResponse = generateFactionLeaderResponse(templeNPCs[0].id, 'faction_merchant_guild');
console.log(`${templeNPCs[0].name}: ${templeLeaderResponse}`);

console.log("\n=== Faction-Social Integration Example Complete ===");
console.log("The example demonstrates how faction dynamics influence NPC relationships,");
console.log("behavior, knowledge sharing, and interactions with the player."); 