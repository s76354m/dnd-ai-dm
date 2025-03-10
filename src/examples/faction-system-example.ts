import { FactionSystem } from '../ai/world/faction/faction-system';

/**
 * Example demonstrating how to use the Faction System
 */

// Create a new faction system
const factionSystem = new FactionSystem({
  // Custom simulation settings
  tickInterval: 10000, // 10 seconds in ms (faster for demonstration)
  volatility: 1.2, // Slightly more dramatic changes
  aggressiveness: 1.1, // Slightly more aggressive AI
  randomEventFrequency: 1.5 // More random events
});

// Initialize the system with a small world
console.log('Initializing faction system...');
factionSystem.initialize('small');

// Get all factions
const worldState = factionSystem.getWorldState();
console.log(`Created ${worldState.factions.length} factions in the world:`);

// Print faction information
worldState.factions.forEach(faction => {
  console.log(`\n${faction.name}:`);
  console.log(`- Power: ${faction.getState().power}`);
  console.log(`- Wealth: ${faction.getState().wealth}`);
  console.log(`- Territories: ${worldState.territories[faction.id].length}`);
  console.log(`- Resources: ${worldState.resources[faction.id].length}`);
  
  // Print faction values
  console.log('- Core Values:');
  faction.getValues().forEach(value => {
    const sentiment = value.strength > 0 ? 'values' : 'opposes';
    console.log(`  * ${sentiment} ${value.type} (${value.strength})`);
  });
  
  // Print faction goals
  console.log('- Goals:');
  faction.getGoals().forEach(goal => {
    console.log(`  * ${goal.title} (Priority: ${goal.priority}, Progress: ${goal.progress}%)`);
  });
});

// Print relationship information
console.log('\nFaction Relationships:');
for (let i = 0; i < worldState.factions.length; i++) {
  for (let j = i + 1; j < worldState.factions.length; j++) {
    const faction1 = worldState.factions[i];
    const faction2 = worldState.factions[j];
    
    const relationship = factionSystem.factionManager.getRelationship(faction1.id, faction2.id);
    if (relationship) {
      console.log(`${faction1.name} and ${faction2.name}: ${relationship.attitude} (${relationship.status})`);
    }
  }
}

// Create a custom event affecting all factions
console.log('\nCreating a global event...');
const eventName = 'Mysterious Comet';
const eventDescription = 'A mysterious comet has appeared in the sky, causing strange phenomena throughout the world.';
factionSystem.createEvent(
  eventName,
  eventDescription,
  worldState.factions.map(f => f.id)
);
console.log(`Created event: ${eventName}`);

// Add a custom goal to the first faction
if (worldState.factions.length > 0) {
  const firstFaction = worldState.factions[0];
  const goalResult = factionSystem.setFactionGoal(
    firstFaction.id,
    'knowledge',
    'Study the Comet',
    'Investigate the mysterious comet to gain arcane knowledge',
    9
  );
  
  if (goalResult) {
    console.log(`\nAdded new goal to ${firstFaction.name}: ${goalResult.title}`);
  }
}

// Create a diplomatic action between the first two factions
if (worldState.factions.length >= 2) {
  const faction1 = worldState.factions[0];
  const faction2 = worldState.factions[1];
  
  console.log(`\nCreating diplomatic action between ${faction1.name} and ${faction2.name}...`);
  
  const action = factionSystem.diplomacySystem.createDiplomaticAction(
    'propose_treaty',
    faction1.id,
    faction2.id,
    `Proposal for a research treaty to study the comet`,
    {
      treatyType: 'research',
      title: 'Comet Research Treaty',
      description: 'A treaty to share knowledge about the mysterious comet',
      terms: 'Both factions agree to share all findings related to the comet'
    }
  );
  
  console.log(`Created diplomatic action: ${action.type} (${action.id})`);
  
  // Accept the diplomatic action
  console.log(`${faction2.name} accepts the treaty proposal`);
  factionSystem.diplomacySystem.acceptDiplomaticAction(
    action.id,
    `We are pleased to accept this proposal for mutual benefit`
  );
}

// Start the simulation
console.log('\nStarting faction simulation (5x real-time)...');
factionSystem.startSimulation(5);

// Run for a short time (in a real application, this would continue in the background)
setTimeout(() => {
  // Simulate several ticks manually to advance the simulation quickly
  for (let i = 0; i < 5; i++) {
    factionSystem.simulationSystem.simulationTick();
  }
  
  // Get a detailed report on the first faction
  if (worldState.factions.length > 0) {
    const firstFaction = worldState.factions[0];
    console.log(`\nDetailed report for ${firstFaction.name}:`);
    
    const report = factionSystem.getFactionReport(firstFaction.id);
    
    console.log(`Current state:`);
    console.log(`- Power: ${report.faction?.getState().power}`);
    console.log(`- Wealth: ${report.faction?.getState().wealth}`);
    console.log(`- Cohesion: ${report.faction?.getState().cohesion}`);
    console.log(`- Reputation: ${report.faction?.getState().reputation}`);
    
    console.log(`\nTerritories (${report.territories.length}):`);
    report.territories.forEach(t => {
      console.log(`- ${t.name} (${t.type})`);
    });
    
    console.log(`\nResources (${report.resources.length}):`);
    report.resources.forEach(r => {
      console.log(`- ${r.name}: ${r.quantity} units (${r.value_per_unit} value/unit)`);
    });
    
    console.log(`\nAlliances (${report.alliances.length}):`);
    report.alliances.forEach(id => {
      const ally = factionSystem.factionManager.getFaction(id);
      if (ally) {
        console.log(`- ${ally.name}`);
      }
    });
    
    console.log(`\nEnemies (${report.enemies.length}):`);
    report.enemies.forEach(id => {
      const enemy = factionSystem.factionManager.getFaction(id);
      if (enemy) {
        console.log(`- ${enemy.name}`);
      }
    });
    
    console.log(`\nRecent Actions:`);
    report.recentActions.forEach(action => {
      const date = new Date(action.timestamp).toISOString().split('T')[0];
      console.log(`- [${date}] ${action.type}: ${action.description}`);
    });
  }
  
  // Stop the simulation
  console.log('\nStopping simulation...');
  factionSystem.stopSimulation();
  
  // Serialize the state for saving
  const serializedState = factionSystem.serializeState();
  console.log(`\nSerialized faction system state (${serializedState.length} bytes)`);
  
  console.log('\nFaction system example complete!');
}, 5000); // Run for 5 seconds 