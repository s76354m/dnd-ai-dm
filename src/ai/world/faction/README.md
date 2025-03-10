# Faction System for D&D AI Dungeon Master

## Overview

The Faction System is a comprehensive framework that simulates the behavior, interactions, and evolution of factions within a D&D world. It enables the AI Dungeon Master to create a living, breathing world where various organizations compete, cooperate, and respond to player actions.

## Key Features

- **Dynamic Faction Behavior**: Factions make autonomous decisions based on their values, goals, and current state.
- **Territory Management**: Factions control territories and seek to expand their influence.
- **Resource System**: Resources can be gathered, traded, and fought over.
- **Diplomatic Relations**: Factions form alliances, declare wars, and negotiate treaties.
- **Event System**: World events can affect multiple factions simultaneously.
- **Goal-Oriented Actions**: Factions pursue customizable goals that drive their behavior.

## Architecture

The Faction System is built with a modular architecture:

1. **FactionSystem**: The main entry point that integrates all components.
2. **FactionManager**: Manages faction creation, relationships, and basic operations.
3. **TerritoryManager**: Handles territory creation, connections, and control.
4. **ResourceManager**: Manages resources and their distribution.
5. **FactionEventSystem**: Processes events that affect factions.
6. **FactionDiplomacySystem**: Handles diplomatic interactions between factions.
7. **FactionSimulationSystem**: Controls the simulation of faction behavior over time.

## Data Models

- **Faction**: Represents a faction with state values, goals, values, territories, and resources.
- **Territory**: Represents a location that can be controlled by factions.
- **Resource**: Represents valuable assets that factions can control.
- **FactionRelationship**: Tracks the relationship between two factions.
- **FactionGoal**: Defines objectives that factions pursue.
- **FactionValue**: Represents core values that influence faction behavior.

## Using the Faction System

### Basic Usage

```typescript
// Import the main system
import { FactionSystem } from './faction-system';

// Create and initialize a new faction system
const factionSystem = new FactionSystem();
factionSystem.initialize('medium'); // 'small', 'medium', or 'large' world

// Start the simulation
factionSystem.startSimulation();

// Get the current world state
const worldState = factionSystem.getWorldState();

// Create a custom event
factionSystem.createEvent(
  'Dragon Attack',
  'A dragon has attacked the capital city',
  [faction1.id, faction2.id]
);

// Get detailed information about a specific faction
const factionReport = factionSystem.getFactionReport(factionId);
```

### Creating Custom Factions

```typescript
// Create a new faction with values
const faction = factionSystem.createFaction(
  'The Iron Circle',
  [
    { type: 'power', strength: 80 },
    { type: 'wealth', strength: 60 },
    { type: 'honor', strength: -40 }
  ],
  {
    power: 70,
    wealth: 60,
    cohesion: 50
  }
);

// Set a goal for the faction
factionSystem.setFactionGoal(
  faction.id,
  'territory',
  'Conquer Mountain Pass',
  'Take control of the strategic mountain pass',
  8,
  territoryId
);
```

### Diplomatic Actions

```typescript
// Create a diplomatic action
const action = factionSystem.diplomacySystem.createDiplomaticAction(
  'propose_treaty',
  sourceFactionId,
  targetFactionId,
  'Proposal for a trade treaty',
  {
    treatyType: 'trade',
    title: 'Eastern Trade Agreement',
    terms: 'Both parties agree to reduce tariffs on goods'
  }
);

// Accept or reject a diplomatic action
factionSystem.diplomacySystem.acceptDiplomaticAction(actionId);
factionSystem.diplomacySystem.rejectDiplomaticAction(actionId);
```

## Integration with Game World

The Faction System is designed to integrate with the rest of the D&D AI DM system:

- **For Narrative Generation**: Use faction relationships and current events to inform NPC behavior and quest generation.
- **For Player Actions**: When players interact with factions, update the faction system accordingly.
- **For World Evolution**: Periodic simulation ticks allow the world to evolve even when players aren't directly involved.

## Example Implementations

See the `/examples` directory for sample implementations:

- `faction-system-example.ts`: Basic usage of the Faction System
- `faction-narrative-generation.ts`: Using the Faction System for narrative generation
- `faction-player-interaction.ts`: Integrating player actions with the Faction System

## Conclusion

The Faction System provides a powerful foundation for creating a dynamic, evolving world for D&D campaigns. By simulating the behavior of various factions, it enables the AI Dungeon Master to create more realistic and engaging narratives that respond to player actions and evolve over time. 