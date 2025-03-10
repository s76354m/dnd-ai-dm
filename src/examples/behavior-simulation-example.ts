import { MemoryManager } from '../ai/memory/memory-manager';
import { RelationshipTracker } from '../ai/memory/relationship-tracker';
import { EnhancedContextManager } from '../ai/memory/enhanced-context-manager';
import { PersonalityModel } from '../ai/npc/personality-model';
import { DialogueSystem } from '../ai/npc/dialogue-system';
import { BehaviorSimulation, NeedType, Goal, Behavior, BehaviorState } from '../ai/npc/behavior-simulation';

/**
 * This example demonstrates how to use the Behavior Simulation system
 * to create realistic NPC behaviors and schedules
 */

// Set up the required systems
const memoryManager = new MemoryManager();
const relationshipTracker = new RelationshipTracker(memoryManager);
const contextManager = new EnhancedContextManager();
const personalityModel = new PersonalityModel(memoryManager, relationshipTracker);
const dialogueSystem = new DialogueSystem(personalityModel, memoryManager, relationshipTracker, contextManager);

// Create the behavior simulation system
const behaviorSimulation = new BehaviorSimulation(
  personalityModel as any, // Type casting for the example
  memoryManager,
  relationshipTracker,
  dialogueSystem
);

// Custom behavior example for an innkeeper
const serveCustomers: Behavior = {
  id: 'serve_customers',
  name: 'Serve Customers',
  description: 'Serving food and drinks to patrons of the inn',
  satisfiesNeeds: [
    { type: NeedType.MONEY, amount: 40 },
    { type: NeedType.SOCIAL, amount: 25 },
    { type: NeedType.ACHIEVEMENT, amount: 15 }
  ],
  requiresLocation: 'tavern_main_hall',
  requiresTime: { startHour: 10, endHour: 22 },
  durationMinutes: 180, // 3 hours
  cooldownMinutes: 60,  // 1 hour cooldown
  interruptible: true,
  narrativeTemplate: '{name} is busy serving patrons at {location}. They look {mood} as they work quickly behind the bar.'
};

// Custom behavior for a blacksmith
const forgingItems: Behavior = {
  id: 'forge_items',
  name: 'Forge Items',
  description: 'Crafting weapons and armor at the forge',
  satisfiesNeeds: [
    { type: NeedType.MONEY, amount: 35 },
    { type: NeedType.ACHIEVEMENT, amount: 40 },
    { type: NeedType.CRAFTING, amount: 70 }
  ],
  requiresLocation: 'blacksmith_forge',
  requiresTime: { startHour: 8, endHour: 18 },
  durationMinutes: 240, // 4 hours
  cooldownMinutes: 120, // 2 hours cooldown
  interruptible: false,
  narrativeTemplate: '{name} is hard at work at {location}, hammering molten metal into shape. They appear {mood} with their progress.'
};

// Set up game time (9:00 AM)
const currentGameTime = 9 * 60;
behaviorSimulation.setGameTime(currentGameTime);

// Create an innkeeper NPC
const innkeeperState = behaviorSimulation.registerNPC(
  'innkeeper',
  'tavern_main_hall',
  {
    [NeedType.MONEY]: 40,
    [NeedType.REST]: 65,
    [NeedType.SOCIAL]: 85
  },
  undefined,
  [serveCustomers]
);

// Create a goal for the innkeeper to buy new supplies
const innkeeperGoal: Goal = {
  id: 'buy_supplies',
  name: 'Buy New Supplies',
  description: 'Purchase new food and drink supplies for the tavern',
  priority: 7,
  relatedNeeds: [NeedType.MONEY, NeedType.RESOURCES],
  completionCondition: (npc: BehaviorState) => {
    // In a real implementation, this would check if the NPC has visited the market
    // and spent money to buy supplies
    return false; // Always incomplete for this example
  },
  progress: 0,
  created: currentGameTime,
  deadline: currentGameTime + (3 * 24 * 60), // 3 days from now
  relevantBehaviors: ['go_to_market'],
  active: true,
  completed: false
};

// Add going to market behavior
const goToMarket: Behavior = {
  id: 'go_to_market',
  name: 'Go to Market',
  description: 'Visiting the town market to buy supplies',
  satisfiesNeeds: [
    { type: NeedType.RESOURCES, amount: 60 },
    { type: NeedType.SOCIAL, amount: 20 }
  ],
  requiresLocation: 'town_market',
  requiresTime: { startHour: 8, endHour: 17 },
  durationMinutes: 120, // 2 hours
  cooldownMinutes: 720, // 12 hours cooldown
  interruptible: true
};

// Add the behavior and goal to the innkeeper
behaviorSimulation.addBehavior('innkeeper', goToMarket);
innkeeperState.goals.set(innkeeperGoal.id, innkeeperGoal);

// Create a blacksmith NPC
const blacksmithState = behaviorSimulation.registerNPC(
  'blacksmith',
  'blacksmith_forge',
  {
    [NeedType.MONEY]: 60,
    [NeedType.REST]: 70,
    [NeedType.CRAFTING]: 30
  },
  undefined,
  [forgingItems]
);

// Create a goal for the blacksmith to complete a special order
const blacksmithGoal: Goal = {
  id: 'special_order',
  name: 'Complete Special Order',
  description: 'Forge a masterwork sword for the town guard captain',
  priority: 8,
  relatedNeeds: [NeedType.MONEY, NeedType.ACHIEVEMENT, NeedType.CRAFTING],
  completionCondition: (npc: BehaviorState) => {
    // In a real implementation, this would check if the blacksmith has spent
    // enough time forging and has the required materials
    return npc.recentBehaviors.filter(rb => rb.behavior.id === 'forge_items').length >= 3;
  },
  progress: 0,
  created: currentGameTime,
  deadline: currentGameTime + (5 * 24 * 60), // 5 days from now
  relevantBehaviors: ['forge_items'],
  active: true,
  completed: false
};

// Add the goal to the blacksmith
blacksmithState.goals.set(blacksmithGoal.id, blacksmithGoal);

// Simulate advancing time by 2 hours
console.log("=== Initial State ===");
console.log(`Innkeeper: ${behaviorSimulation.generateBehaviorNarrative('innkeeper')}`);
console.log(`Blacksmith: ${behaviorSimulation.generateBehaviorNarrative('blacksmith')}`);

// Advance time by 2 hours (11:00 AM)
const newGameTime = currentGameTime + 120;
behaviorSimulation.updateNPC('innkeeper', newGameTime);
behaviorSimulation.updateNPC('blacksmith', newGameTime);

console.log("\n=== After 2 Hours ===");
console.log(`Innkeeper: ${behaviorSimulation.generateBehaviorNarrative('innkeeper')}`);
console.log(`Blacksmith: ${behaviorSimulation.generateBehaviorNarrative('blacksmith')}`);

// Simulate the innkeeper moving to the market
console.log("\n=== Innkeeper goes to market ===");
behaviorSimulation.updateLocation('innkeeper', 'town_market');
behaviorSimulation.updateNPC('innkeeper', newGameTime + 10);
console.log(`Innkeeper: ${behaviorSimulation.generateBehaviorNarrative('innkeeper')}`);

// Advance time by 4 more hours (3:00 PM)
const lateAfternoonTime = newGameTime + 240;
behaviorSimulation.updateNPC('innkeeper', lateAfternoonTime);
behaviorSimulation.updateNPC('blacksmith', lateAfternoonTime);

console.log("\n=== Late Afternoon ===");
console.log(`Innkeeper: ${behaviorSimulation.generateBehaviorNarrative('innkeeper')}`);
console.log(`Blacksmith: ${behaviorSimulation.generateBehaviorNarrative('blacksmith')}`);

// Check blacksmith's goal progress
const blacksmithSpecialOrderGoal = blacksmithState.goals.get(blacksmithGoal.id);
console.log(`\nBlacksmith's special order progress: ${blacksmithSpecialOrderGoal?.progress}%`);

// Advance several days to see if the blacksmith completes the goal
// In a real game, this would be handled by the game loop
console.log("\n=== Simulating Several Days ===");
for (let day = 1; day <= 3; day++) {
  const dayStartTime = currentGameTime + (day * 24 * 60);
  
  // Morning update
  behaviorSimulation.updateNPC('blacksmith', dayStartTime + 180); // 9 AM on day X
  
  // Afternoon update
  behaviorSimulation.updateNPC('blacksmith', dayStartTime + 420); // 3 PM on day X
  
  // Evening update
  behaviorSimulation.updateNPC('blacksmith', dayStartTime + 660); // 9 PM on day X
  
  console.log(`Day ${day}: Blacksmith's special order progress: ${blacksmithState.goals.get(blacksmithGoal.id)?.progress}%`);
  console.log(`Day ${day} evening: ${behaviorSimulation.generateBehaviorNarrative('blacksmith')}`);
  
  if (blacksmithState.goals.get(blacksmithGoal.id)?.completed) {
    console.log(`\nThe blacksmith has completed the special order on day ${day}!`);
    break;
  }
}

// Example of how this system integrates with the dialogue system
console.log("\n=== Dialogue Integration Example ===");
console.log("When talking to NPCs, their current behavior, needs and goals would influence their dialogue:");
console.log("Player: 'Hello blacksmith, how are you today?'");

const blacksmithMood = blacksmithState.moodScore;
const blacksmithBehavior = blacksmithState.currentBehavior;
const isBlacksmithBusy = blacksmithBehavior && !blacksmithBehavior.interruptible;
const hasCompletedSpecialOrder = blacksmithState.goals.get(blacksmithGoal.id)?.completed;

// Simulate dialogue response based on behavior state
let response = "Blacksmith: ";
if (isBlacksmithBusy) {
  response += `"Can't talk now, I'm in the middle of some delicate work. Come back later."`;
} else if (hasCompletedSpecialOrder) {
  response += `"I'm doing excellent! Just finished a masterwork sword for the captain. It's some of my finest work."`;
} else if (blacksmithMood < 40) {
  response += `"Tired and overworked. I've got this special order sword that's giving me trouble."`;
} else {
  response += `"Doing well enough. Working on a special sword for the captain. It's coming along."`;
}

console.log(response);

// Example of how the behavior system would integrate with a full game loop
function gameLoop() {
  // 1. Update game time
  const gameTime = currentGameTime; // This would be tracked by the main game engine
  
  // 2. Update all NPCs
  // This would loop through all registered NPCs
  behaviorSimulation.updateNPC('innkeeper', gameTime);
  behaviorSimulation.updateNPC('blacksmith', gameTime);
  
  // 3. Generate narrative events based on NPC behaviors
  // This would be used to create dynamic world events
  const innkeeperNarrative = behaviorSimulation.generateBehaviorNarrative('innkeeper');
  const blacksmithNarrative = behaviorSimulation.generateBehaviorNarrative('blacksmith');
  
  // 4. Update AI context with behavior information
  // This ensures the AI's generated content is consistent with NPC states
  // contextManager.addContextEntry({
  //   type: 'npc_state',
  //   content: `Innkeeper: ${innkeeperNarrative}. Blacksmith: ${blacksmithNarrative}.`,
  //   relevance: 0.8
  // });
  
  // 5. Schedule next update
  // setTimeout(gameLoop, 1000); // Update every second in real-time
}

console.log("\n=== Behavior Simulation Complete ===");
console.log("The behavior simulation system successfully manages NPC needs, goals, and activities.");
console.log("It can be integrated with the dialogue system and game loop to create realistic, dynamic NPCs."); 