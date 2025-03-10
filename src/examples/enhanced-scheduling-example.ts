/**
 * enhanced-scheduling-example.ts
 * 
 * This example demonstrates how the Enhanced Scheduling System integrates with
 * faction systems, social dynamics, and NPC behavior to create realistic daily
 * routines and events.
 */

import { MemoryManager } from '../ai/memory/memory-manager';
import { RelationshipTracker } from '../ai/memory/relationship-tracker';
import { EnhancedContextManager } from '../ai/memory/enhanced-context-manager';
import { PersonalityModel } from '../ai/npc/personality-model';
import { DialogueSystem } from '../ai/npc/dialogue-system';
import { BehaviorSimulation, NeedType } from '../ai/npc/behavior-simulation';
import { SocialInteractionSystem, SocialNPC } from '../ai/npc/social/social-interaction';
import { FactionSystem } from '../ai/world/faction/faction-system';
import { FactionManager } from '../ai/world/faction/faction-manager';
import { TerritoryManager } from '../ai/world/faction/territory-manager';
import { ResourceManager } from '../ai/world/faction/resource-manager';
import { FactionEventSystem } from '../ai/world/faction/faction-events';
import { Faction } from '../ai/world/faction/faction-types';
import { EnhancedSchedulingSystem, GameTime, convertToGameTime } from '../ai/npc/schedule/enhanced-scheduling-system';
import { v4 as uuidv4 } from 'uuid';

// Initialize core systems
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
const socialInteractionSystem = new SocialInteractionSystem(
  memoryManager,
  relationshipTracker,
  behaviorSimulation,
  dialogueSystem
);

// Initialize faction systems
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

// Initialize enhanced scheduling system
const schedulingSystem = new EnhancedSchedulingSystem(
  behaviorSimulation,
  socialInteractionSystem,
  factionSystem,
  factionManager,
  territoryManager,
  {
    debugMode: true,
    socialEventProbability: 0.5 // Higher probability for demonstration purposes
  }
);

// Helper function to format time
function formatGameTime(time: GameTime): string {
  return `Day ${time.day + 1}, ${time.hour < 10 ? '0' + time.hour : time.hour}:${time.minute < 10 ? '0' + time.minute : time.minute}`;
}

// Helper function to create NPC with faction membership
function createNPC(name: string, occupation: string, location: string, factionId?: string): SocialNPC {
  return {
    id: `npc_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    personality: {
      traits: {
        openness: 40 + Math.floor(Math.random() * 40),
        conscientiousness: 40 + Math.floor(Math.random() * 40),
        extraversion: 40 + Math.floor(Math.random() * 40),
        agreeableness: 40 + Math.floor(Math.random() * 40),
        neuroticism: 20 + Math.floor(Math.random() * 30)
      },
      values: {
        tradition: 20 + Math.floor(Math.random() * 60),
        power: 20 + Math.floor(Math.random() * 60),
        security: 30 + Math.floor(Math.random() * 50),
        achievement: 30 + Math.floor(Math.random() * 50),
        stimulation: 30 + Math.floor(Math.random() * 50)
      },
      emotionalState: {
        currentEmotions: [
          { type: 'neutral', intensity: 5 }
        ],
        mood: 'neutral',
        emotionalVolatility: 0.3
      },
      flaws: Math.random() > 0.5 ? ['stubborn'] : ['impatient'],
      behavioralPatterns: {
        decisiveness: 0.3 + Math.random() * 0.6,
        riskTolerance: 0.3 + Math.random() * 0.6,
        cooperativeness: 0.3 + Math.random() * 0.6,
        adaptability: 0.3 + Math.random() * 0.6,
        assertiveness: 0.3 + Math.random() * 0.6
      }
    },
    knowledge: [
      `${name} is a ${occupation} living in the region`,
      `${name} has worked as a ${occupation} for many years`
    ],
    emotionalState: {
      currentEmotions: [
        { type: 'neutral', intensity: 5 }
      ],
      mood: 'neutral',
      emotionalVolatility: 0.3
    },
    currentLocation: location,
    occupation,
    faction: factionId,
    goals: new Map(),
    schedule: []
  };
}

// Setup territories in the town
console.log("\n=== Setting up Town Territories ===");

territoryManager.createTerritory({
  id: 'town_square',
  name: 'Town Square',
  type: 'urban',
  resources: [
    { type: 'influence', amount: 100 }
  ],
  connections: []
});

territoryManager.createTerritory({
  id: 'merchant_district',
  name: 'Merchant District',
  type: 'urban',
  resources: [
    { type: 'gold', amount: 300 },
    { type: 'goods', amount: 200 }
  ],
  connections: ['town_square']
});

territoryManager.createTerritory({
  id: 'craftsman_district',
  name: 'Craftsman District',
  type: 'urban',
  resources: [
    { type: 'goods', amount: 250 },
    { type: 'labor', amount: 300 }
  ],
  connections: ['town_square', 'merchant_district']
});

territoryManager.createTerritory({
  id: 'noble_quarter',
  name: 'Noble Quarter',
  type: 'urban',
  resources: [
    { type: 'gold', amount: 500 },
    { type: 'influence', amount: 400 }
  ],
  connections: ['town_square']
});

territoryManager.createTerritory({
  id: 'tavern_district',
  name: 'Tavern District',
  type: 'urban',
  resources: [
    { type: 'gold', amount: 150 },
    { type: 'information', amount: 200 }
  ],
  connections: ['town_square', 'merchant_district']
});

// Connect territories
territoryManager.connectTerritories('town_square', 'merchant_district');
territoryManager.connectTerritories('town_square', 'craftsman_district');
territoryManager.connectTerritories('town_square', 'noble_quarter');
territoryManager.connectTerritories('town_square', 'tavern_district');
territoryManager.connectTerritories('merchant_district', 'craftsman_district');
territoryManager.connectTerritories('merchant_district', 'tavern_district');

console.log(`Created ${Object.keys(territoryManager.getAllTerritories()).length} territories in the town`);

// Setup factions
console.log("\n=== Setting up Town Factions ===");

// Merchant Guild
const merchantGuild: Faction = {
  id: 'merchant_guild',
  name: 'Merchant Guild',
  type: 'guild',
  description: 'Organization of merchants that controls trade in the town',
  values: {
    wealth: 90,
    power: 70,
    freedom: 60,
    tradition: 40,
    knowledge: 50
  },
  resources: new Map([
    ['gold', 1000],
    ['goods', 500],
    ['influence', 300]
  ]),
  territories: ['merchant_district'],
  leader: {
    id: 'npc_guildmaster',
    name: 'Guildmaster Adria',
    role: 'leader',
    influence: 100,
    loyalty: 100
  },
  members: [],
  goals: [
    {
      id: 'goal_increase_trade',
      name: 'Increase Trade',
      description: 'Increase trade volume with neighboring towns',
      type: 'economic',
      progress: 0,
      priority: 8,
      deadline: null
    }
  ],
  relationships: new Map(),
  knowledge: []
};

// Crafters Union
const craftersUnion: Faction = {
  id: 'crafters_union',
  name: 'Crafters Union',
  type: 'guild',
  description: 'Association of artisans and crafters who make the town\'s goods',
  values: {
    quality: 80,
    tradition: 70,
    community: 65,
    freedom: 50,
    wealth: 40
  },
  resources: new Map([
    ['gold', 600],
    ['goods', 800],
    ['labor', 700],
    ['influence', 200]
  ]),
  territories: ['craftsman_district'],
  leader: {
    id: 'npc_craftmaster',
    name: 'Craftmaster Torben',
    role: 'leader',
    influence: 100,
    loyalty: 100
  },
  members: [],
  goals: [
    {
      id: 'goal_quality_standards',
      name: 'Maintain Quality Standards',
      description: 'Ensure all crafted goods meet the union\'s high standards',
      type: 'service',
      progress: 0,
      priority: 9,
      deadline: null
    }
  ],
  relationships: new Map(),
  knowledge: []
};

// Noble House
const nobleHouse: Faction = {
  id: 'house_silverwood',
  name: 'House Silverwood',
  type: 'noble',
  description: 'Aristocratic family that has ruled the town for generations',
  values: {
    tradition: 90,
    power: 85,
    honor: 75,
    wealth: 70,
    community: 40
  },
  resources: new Map([
    ['gold', 2000],
    ['influence', 1000],
    ['knowledge', 500]
  ]),
  territories: ['noble_quarter'],
  leader: {
    id: 'npc_lord_silverwood',
    name: 'Lord Edric Silverwood',
    role: 'leader',
    influence: 100,
    loyalty: 100
  },
  members: [],
  goals: [
    {
      id: 'goal_maintain_order',
      name: 'Maintain Order',
      description: 'Ensure the town remains peaceful and prosperous',
      type: 'governance',
      progress: 0,
      priority: 10,
      deadline: null
    }
  ],
  relationships: new Map(),
  knowledge: []
};

// Register factions
factionManager.registerFaction(merchantGuild);
factionManager.registerFaction(craftersUnion);
factionManager.registerFaction(nobleHouse);

// Set initial faction relationships
factionManager.setFactionRelationship('merchant_guild', 'crafters_union', 60); // Cooperative
factionManager.setFactionRelationship('merchant_guild', 'house_silverwood', 70); // Respectful
factionManager.setFactionRelationship('crafters_union', 'house_silverwood', 50); // Neutral-positive

console.log(`Created ${factionManager.getAllFactionIds().length} factions in the town`);

// Create NPCs
console.log("\n=== Creating NPCs ===");

// Merchant Guild NPCs
const merchantNPCs = [
  createNPC('Adria', 'Guildmaster', 'merchant_district', 'merchant_guild'),
  createNPC('Marcus', 'Merchant', 'merchant_district', 'merchant_guild'),
  createNPC('Lena', 'Treasurer', 'merchant_district', 'merchant_guild'),
  createNPC('Tomas', 'Merchant', 'merchant_district', 'merchant_guild'),
  createNPC('Gwen', 'Merchant', 'merchant_district', 'merchant_guild')
];

// Crafters Union NPCs
const crafterNPCs = [
  createNPC('Torben', 'Craftmaster', 'craftsman_district', 'crafters_union'),
  createNPC('Elena', 'Blacksmith', 'craftsman_district', 'crafters_union'),
  createNPC('Finn', 'Carpenter', 'craftsman_district', 'crafters_union'),
  createNPC('Olivia', 'Weaver', 'craftsman_district', 'crafters_union'),
  createNPC('Rowan', 'Potter', 'craftsman_district', 'crafters_union')
];

// Noble House NPCs
const nobleNPCs = [
  createNPC('Lord Edric', 'Nobleman', 'noble_quarter', 'house_silverwood'),
  createNPC('Lady Elara', 'Noblewoman', 'noble_quarter', 'house_silverwood'),
  createNPC('Ser Roland', 'House Guard', 'noble_quarter', 'house_silverwood'),
  createNPC('Steward Morris', 'Steward', 'noble_quarter', 'house_silverwood'),
  createNPC('Baroness Lydia', 'Noblewoman', 'noble_quarter', 'house_silverwood')
];

// Independent NPCs (not affiliated with any faction)
const independentNPCs = [
  createNPC('Barkeep Dorian', 'Tavern Owner', 'tavern_district'),
  createNPC('Minstrel Jaskier', 'Musician', 'tavern_district'),
  createNPC('Guard Captain Bryce', 'Town Guard', 'town_square'),
  createNPC('Priestess Miriam', 'Clergy', 'town_square'),
  createNPC('Farmer Gil', 'Farmer', 'town_square')
];

// Register all NPCs
const allNPCs = [
  ...merchantNPCs, 
  ...crafterNPCs, 
  ...nobleNPCs, 
  ...independentNPCs
];

console.log(`Created ${allNPCs.length} NPCs in the town`);

// Register NPCs with systems
console.log("\n=== Registering NPCs with Systems ===");

for (const npc of allNPCs) {
  // Register with social interaction system
  socialInteractionSystem.registerNPC(npc);
  
  // Register with behavior simulation
  behaviorSimulation.registerNPC(
    npc.id,
    npc.currentLocation,
    {
      [NeedType.MONEY]: Math.floor(Math.random() * 40 + 40),
      [NeedType.SOCIAL]: Math.floor(Math.random() * 40 + 40),
      [NeedType.HUNGER]: Math.floor(Math.random() * 40 + 40),
      [NeedType.REST]: Math.floor(Math.random() * 40 + 40),
      [NeedType.RESPECT]: Math.floor(Math.random() * 40 + 40)
    }
  );
  
  // Register with scheduling system
  schedulingSystem.registerNPC(npc.id, npc.currentLocation);
}

// Register NPCs with factions
for (const npc of merchantNPCs) {
  const role = npc.name === 'Adria' ? 'leader' : (npc.name === 'Lena' ? 'treasurer' : 'member');
  const influence = npc.name === 'Adria' ? 100 : (npc.name === 'Lena' ? 80 : 40 + Math.floor(Math.random() * 30));
  const loyalty = npc.name === 'Adria' ? 100 : 60 + Math.floor(Math.random() * 40);
  
  factionManager.addFactionMember('merchant_guild', {
    id: npc.id,
    name: npc.name,
    role,
    influence,
    loyalty
  });
}

for (const npc of crafterNPCs) {
  const role = npc.name === 'Torben' ? 'leader' : 'craftsman';
  const influence = npc.name === 'Torben' ? 100 : 40 + Math.floor(Math.random() * 30);
  const loyalty = npc.name === 'Torben' ? 100 : 70 + Math.floor(Math.random() * 30);
  
  factionManager.addFactionMember('crafters_union', {
    id: npc.id,
    name: npc.name,
    role,
    influence,
    loyalty
  });
}

for (const npc of nobleNPCs) {
  const role = npc.name === 'Lord Edric' ? 'leader' : 
               (npc.name === 'Lady Elara' ? 'family' : 
               (npc.name === 'Ser Roland' ? 'guard' : 
               (npc.name === 'Steward Morris' ? 'steward' : 'family')));
  const influence = npc.name === 'Lord Edric' ? 100 : 
                   (npc.name === 'Lady Elara' ? 90 : 
                   (npc.name === 'Steward Morris' ? 70 : 40 + Math.floor(Math.random() * 30)));
  const loyalty = npc.name === 'Lord Edric' ? 100 : 80 + Math.floor(Math.random() * 20);
  
  factionManager.addFactionMember('house_silverwood', {
    id: npc.id,
    name: npc.name,
    role,
    influence,
    loyalty
  });
}

// Set up initial relationships
for (let i = 0; i < allNPCs.length; i++) {
  for (let j = i + 1; j < allNPCs.length; j++) {
    const npc1 = allNPCs[i];
    const npc2 = allNPCs[j];
    
    // Set higher base relationship for members of same faction
    let baseRelationship = 0;
    if (npc1.faction && npc1.faction === npc2.faction) {
      baseRelationship = 40 + Math.floor(Math.random() * 30); // 40-70 for same faction
    } else if (npc1.faction && npc2.faction) {
      // Use faction relationship as a base for cross-faction relationships
      const factionRelationship = factionManager.getFactionRelationship(npc1.faction, npc2.faction);
      if (factionRelationship !== undefined) {
        baseRelationship = Math.floor(factionRelationship / 2) + Math.floor(Math.random() * 20) - 10; // Varied but influenced by faction relations
      }
    } else {
      baseRelationship = 10 + Math.floor(Math.random() * 40); // 10-50 for others
    }
    
    // Adjust for personality compatibility
    const compatibilityBonus = Math.floor(Math.random() * 20) - 10; // -10 to +10
    
    // Set bidirectional relationship
    const finalRelationship = Math.max(0, Math.min(100, baseRelationship + compatibilityBonus));
    relationshipTracker.setRelationship(npc1.id, npc2.id, finalRelationship);
    relationshipTracker.setRelationship(npc2.id, npc1.id, finalRelationship);
  }
}

// Initialize game time (start at 8:00 AM)
const initialGameTime = 8 * 60; // 8:00 AM in minutes
schedulingSystem.setGameTime(initialGameTime);
behaviorSimulation.setGameTime(initialGameTime);

console.log(`\nInitial game time: ${formatGameTime(schedulingSystem.getGameTime())}`);

// Schedule faction work routines
console.log("\n=== Scheduling Faction Work and Activities ===");
for (const factionId of factionManager.getAllFactionIds()) {
  schedulingSystem.scheduleFactionWork(factionId);
  console.log(`Scheduled work for ${factionId} members`);
}

// Schedule a faction meeting for the Merchant Guild
const meetingId = schedulingSystem.scheduleFactionMeeting(
  'merchant_guild',
  'Trade Planning Meeting',
  'Weekly meeting to discuss trade routes and pricing',
  schedulingSystem.getGameTime().day,
  16, // 4 PM
  120 // 2 hours
);

if (meetingId) {
  console.log(`Scheduled Merchant Guild meeting: ${meetingId}`);
}

// Schedule a crafting demonstration for the Crafters Union
const craftEventId = schedulingSystem.createFactionEvent(
  'crafters_union',
  'Crafting Demonstration',
  'Public demonstration of crafting techniques',
  'town_square', // Location
  (schedulingSystem.getGameTime().day * 24 * 60) + 14 * 60, // 2 PM
  180, // 3 hours
  65, // Priority
  ['leader', 'craftsman'], // Required roles
  [], // Optional roles
  ['public', 'demonstration', 'trade']
);

if (craftEventId) {
  console.log(`Scheduled Crafters Union demonstration: ${craftEventId}`);
}

// Schedule a feast for House Silverwood
const feastId = schedulingSystem.createFactionEvent(
  'house_silverwood',
  'Silverwood Spring Feast',
  'Annual feast hosted by House Silverwood for town notables',
  'noble_quarter',
  (schedulingSystem.getGameTime().day * 24 * 60) + 19 * 60, // 7 PM
  240, // 4 hours
  80, // Priority
  ['leader', 'family'], // Required roles
  ['steward'], // Optional roles
  ['feast', 'social', 'high_society']
);

if (feastId) {
  console.log(`Scheduled House Silverwood feast: ${feastId}`);
}

// Create a social gathering at the tavern
const tavernEventId = schedulingSystem.createSocialEvent(
  independentNPCs[0].id, // Barkeep Dorian
  'Evening Gathering at Golden Tankard',
  'A casual evening of drinks, music, and socializing',
  (schedulingSystem.getGameTime().day * 24 * 60) + 20 * 60, // 8 PM
  180 // 3 hours
);

if (tavernEventId) {
  console.log(`Scheduled tavern social gathering: ${tavernEventId}`);
}

// Simulate a day of activities
console.log("\n=== Simulating a Day of NPC Activities ===");

// Function to report on NPCs' current activities
function reportCurrentActivities(time: GameTime): void {
  console.log(`\n--- Time: ${formatGameTime(time)} ---`);
  
  const activeNPCs: {npc: SocialNPC, activity: string, location: string}[] = [];
  
  for (const npc of allNPCs) {
    const currentActivity = schedulingSystem.getCurrentActivity(npc.id);
    const currentLocation = schedulingSystem.getNPCLocation(npc.id);
    
    if (currentActivity) {
      activeNPCs.push({
        npc,
        activity: currentActivity.name,
        location: currentLocation
      });
    }
  }
  
  // Group by location
  const locationGroups = new Map<string, {npc: SocialNPC, activity: string}[]>();
  for (const {npc, activity, location} of activeNPCs) {
    if (!locationGroups.has(location)) {
      locationGroups.set(location, []);
    }
    locationGroups.get(location)!.push({npc, activity});
  }
  
  // Report by location
  for (const [location, activities] of locationGroups.entries()) {
    console.log(`\nLocation: ${territoryManager.getTerritory(location)?.name || location}`);
    for (const {npc, activity} of activities) {
      console.log(`- ${npc.name}: ${activity}`);
    }
  }
}

// Simulate 12 hours in 2-hour increments
let currentTime = initialGameTime;
for (let hour = 0; hour < 12; hour += 2) {
  // Advance time by 2 hours
  currentTime += 120;
  
  // Update systems
  schedulingSystem.updateSystem(currentTime);
  behaviorSimulation.setGameTime(currentTime);
  
  // Update NPCs
  for (const npc of allNPCs) {
    behaviorSimulation.updateNPC(npc.id, currentTime);
  }
  
  // Report on current activities
  reportCurrentActivities(convertToGameTime(currentTime));
  
  // If it's 4 PM (16:00), show details about the merchant meeting
  if (convertToGameTime(currentTime).hour === 16) {
    console.log("\n--- Details about Merchant Guild Meeting ---");
    
    // Find merchant guild meeting participants
    const meetingActivity = merchantNPCs
      .map(npc => schedulingSystem.getCurrentActivity(npc.id))
      .find(activity => activity?.name === 'Trade Planning Meeting');
    
    if (meetingActivity) {
      console.log(`Meeting: ${meetingActivity.name}`);
      console.log(`Description: ${meetingActivity.description}`);
      console.log(`Location: ${meetingActivity.location}`);
      console.log(`Duration: ${meetingActivity.duration / 60} hours`);
      
      if (meetingActivity.related?.npcIds && meetingActivity.related.npcIds.length > 0) {
        console.log(`Participants: ${meetingActivity.related.npcIds.length + 1}`);
        
        // Create social interactions between participants during the meeting
        const primaryNpcId = meetingActivity.npcId;
        for (const secondaryNpcId of meetingActivity.related.npcIds) {
          const interaction = socialInteractionSystem.createInteraction(
            primaryNpcId,
            secondaryNpcId,
            SocialInteractionType.COOPERATION,
            meetingActivity.location
          );
          
          if (interaction) {
            console.log(`- Interaction between ${primaryNpcId} and ${secondaryNpcId}`);
            console.log(`  Relationship change: ${interaction.relationshipChange}`);
            
            // Update relationship
            relationshipTracker.modifyRelationship(
              primaryNpcId,
              secondaryNpcId,
              interaction.relationshipChange
            );
          }
        }
      }
    }
  }
  
  // If it's 8 PM (20:00), show details about the tavern gathering
  if (convertToGameTime(currentTime).hour === 20) {
    console.log("\n--- Details about Tavern Gathering ---");
    
    // Count participants from each faction
    const participantsByFaction = new Map<string, number>();
    participantsByFaction.set('merchant_guild', 0);
    participantsByFaction.set('crafters_union', 0);
    participantsByFaction.set('house_silverwood', 0);
    participantsByFaction.set('independent', 0);
    
    // Count participants in tavern district
    for (const npc of allNPCs) {
      if (schedulingSystem.getNPCLocation(npc.id) === 'tavern_district') {
        const faction = npc.faction || 'independent';
        participantsByFaction.set(faction, (participantsByFaction.get(faction) || 0) + 1);
        
        // Create interactions between this NPC and others at the tavern
        const others = allNPCs.filter(other => 
          other.id !== npc.id && 
          schedulingSystem.getNPCLocation(other.id) === 'tavern_district'
        );
        
        if (others.length > 0) {
          // Select a random other NPC to interact with
          const other = others[Math.floor(Math.random() * others.length)];
          
          const interaction = socialInteractionSystem.createInteraction(
            npc.id,
            other.id,
            SocialInteractionType.SOCIALIZING,
            'tavern_district'
          );
          
          if (interaction) {
            console.log(`- Interaction between ${npc.name} and ${other.name}`);
            console.log(`  Relationship change: ${interaction.relationshipChange}`);
            
            // Update relationship
            relationshipTracker.modifyRelationship(
              npc.id,
              other.id,
              interaction.relationshipChange
            );
          }
        }
      }
    }
    
    console.log("Participants by faction:");
    for (const [faction, count] of participantsByFaction.entries()) {
      console.log(`- ${faction}: ${count}`);
    }
  }
}

// Final report
console.log("\n=== Final Status after One Day ===");

// Analyze relationship changes
console.log("\n--- Relationship Changes ---");
let improvementCount = 0;
let deteriorationCount = 0;

for (let i = 0; i < allNPCs.length; i++) {
  for (let j = i + 1; j < allNPCs.length; j++) {
    const npc1 = allNPCs[i];
    const npc2 = allNPCs[j];
    const relationship = relationshipTracker.getRelationship(npc1.id, npc2.id);
    
    if (relationship !== undefined) {
      // Detect significant changes (more than 5 points)
      const forwardRelationship = relationshipTracker.getRelationship(npc1.id, npc2.id);
      const reverseRelationship = relationshipTracker.getRelationship(npc2.id, npc1.id);
      
      if (forwardRelationship !== undefined && reverseRelationship !== undefined) {
        const averageRelationship = (forwardRelationship + reverseRelationship) / 2;
        
        if (averageRelationship > 80) {
          console.log(`Strong relationship between ${npc1.name} and ${npc2.name}: ${averageRelationship.toFixed(1)}`);
          improvementCount++;
        } else if (averageRelationship < 20) {
          console.log(`Poor relationship between ${npc1.name} and ${npc2.name}: ${averageRelationship.toFixed(1)}`);
          deteriorationCount++;
        }
      }
    }
  }
}

console.log(`\nSignificant relationship improvements: ${improvementCount}`);
console.log(`Significant relationship deteriorations: ${deteriorationCount}`);

// Report on NPCs' need states
console.log("\n--- NPC Need States ---");
for (const npc of allNPCs) {
  const needState = behaviorSimulation.getNeedState(npc.id);
  if (needState) {
    // Calculate overall satisfaction (average of all needs)
    const needValues = Object.values(needState);
    const averageSatisfaction = needValues.reduce((sum, val) => sum + val, 0) / needValues.length;
    
    console.log(`${npc.name}: ${averageSatisfaction.toFixed(1)}% satisfaction`);
    
    // Log any critically low needs
    for (const [needType, value] of Object.entries(needState)) {
      if (value < 30) {
        console.log(`  - Low ${needType}: ${value.toFixed(1)}%`);
      }
    }
  }
}

// Report on faction members' loyalty
console.log("\n--- Faction Member Loyalty ---");
for (const factionId of factionManager.getAllFactionIds()) {
  const faction = factionManager.getFaction(factionId);
  if (faction) {
    console.log(`\n${faction.name}:`);
    
    const members = factionManager.getFactionMembers(factionId);
    if (members) {
      for (const member of members) {
        console.log(`- ${member.name} (${member.role}): Loyalty ${member.loyalty}`);
      }
    }
  }
}

console.log("\n=== Simulation Complete ==="); 