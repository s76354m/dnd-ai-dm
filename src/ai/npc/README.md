# Advanced NPC AI System

This module provides a comprehensive AI-powered system for creating dynamic and intelligent NPCs in the D&D AI DM application. The system combines several specialized components to create NPCs that have rich personalities, realistic behavior, memory of past events, and contextually appropriate dialogue.

## Core Components

The NPC AI system consists of the following major components:

### 1. Personality Model (`personality-model.ts`)

The personality model provides NPCs with rich, multi-faceted personalities based on:

- **Big Five personality traits**: Openness, Conscientiousness, Extraversion, Agreeableness, and Neuroticism
- **Core values**: Primary motivating values that drive decision-making
- **Emotional states**: Dynamic emotions that change based on interactions and events
- **Character flaws**: Specific weaknesses that create depth and narrative opportunities
- **Behavioral patterns**: Consistent tendencies that guide NPC responses

### 2. Dialogue System (`dialogue-system.ts`)

The dialogue system enables contextually appropriate NPC dialogue based on:

- **Personality-informed responses**: Dialogue that reflects the NPC's personality traits
- **Memory integration**: Incorporation of past interactions into conversations
- **Topic tracking**: Management of conversation topics for coherence
- **Emotional influence**: Dialogue tone adjustment based on emotional state
- **Relationship awareness**: Response adaptation based on relationship with the player

### 3. Behavior Simulation (`behavior-simulation.ts`)

The behavior simulation enables NPCs to act autonomously based on:

- **Need satisfaction**: Behaviors driven by various needs (physical, social, etc.)
- **Goal-directed action**: Progress toward short and long-term goals
- **Personality-aligned decisions**: Actions that align with personality traits
- **Scheduled activities**: Time-based behaviors following daily routines
- **Memory creation**: Recording of important actions and experiences

### 4. NPC System Integration (`npc-system-integration.ts`)

The integration layer unifies all NPC AI components, providing:

- **Simplified API**: Easy-to-use methods for creating and managing NPCs
- **Component coordination**: Seamless interaction between personality, dialogue, and behavior
- **Flexible configuration**: Options to enable/disable specific features
- **Central NPC management**: Tracking of all NPCs in the game world

## Usage

### Creating an NPC

```typescript
// Initialize core services
const memoryManager = new MemoryManager();
const relationshipTracker = new RelationshipTracker();
const contextManager = new EnhancedContextManager(aiService, memoryManager);

// Create the NPC system
const npcSystem = new NPCSystem(
  memoryManager,
  relationshipTracker,
  contextManager
);

// Register a new NPC
const npc = npcSystem.registerNPC(
  'npc_innkeeper',
  'Greta',
  'The owner of the Prancing Pony Inn, known for her hospitality and hearty meals.',
  'village_inn',
  {
    traits: {
      openness: 70,
      conscientiousness: 85,
      extraversion: 90,
      agreeableness: 80,
      neuroticism: 30
    },
    flaws: {
      primary: Flaw.PRIDE,
      severity: 40,
      triggerConditions: ['criticizing her cooking', 'insulting the inn']
    },
    values: {
      primary: Value.BENEVOLENCE,
      secondary: Value.TRADITION,
      valueHierarchy: new Map([
        [Value.BENEVOLENCE, 90],
        [Value.TRADITION, 85],
        [Value.SECURITY, 75]
      ])
    }
  },
  'Innkeeper',
  'Village Merchants'
);
```

### Generating Dialogue

```typescript
// Generate a dialogue response from an NPC
const npcResponse = await npcSystem.generateDialogue(
  'npc_innkeeper',
  'player_1',
  'Do you know anything about the abandoned castle to the north?',
  DialogueSituation.INFORMATION_SEEKING
);

console.log(`Innkeeper says: ${npcResponse}`);
```

### Setting NPC Knowledge and Topics

```typescript
// Add knowledge that the NPC can share with players
npcSystem.addNPCKnowledge(
  'npc_innkeeper',
  'The old road past the mill has been plagued by bandits recently.',
  70 // Importance (0-100)
);

// Add conversation topics the NPC is interested in discussing
npcSystem.addConversationTopic(
  'npc_innkeeper',
  'Local food specialties',
  60,  // Importance (0-100)
  95,  // Knowledge level (0-100)
  85   // Interest level (0-100)
);
```

### Creating Goals and Behaviors

```typescript
// Add a goal for the NPC
const goal = npcSystem.addGoal(
  'npc_innkeeper',
  'Prepare for the harvest festival',
  80,  // Priority (0-100)
  'All special meals must be prepared and the inn decorated',
  NeedType.ESTEEM  // Related need
);

// Add a custom behavior
const cookingBehavior: Behavior = {
  id: 'behavior_cooking',
  name: 'Cook Special Meal',
  description: 'Prepare a special meal for important guests',
  needsSatisfied: new Map([
    [NeedType.ESTEEM, 20],
    [NeedType.WEALTH, 10]
  ]),
  requiredResources: new Map([
    ['food_ingredients', 3]
  ]),
  duration: 60,  // Minutes
  cooldown: 240, // Minutes
  socialImpact: new Map()
};

npcSystem.addCustomBehavior('npc_innkeeper', cookingBehavior);
```

### Updating the Game World

```typescript
// Simulate game time passing and update all NPCs
npcSystem.updateNPCs(30); // 30 minutes of game time

// Update an NPC's location
npcSystem.updateNPCLocation('npc_innkeeper', 'village_square');

// Update an NPC's emotional state based on events
npcSystem.updateEmotionalState(
  'npc_innkeeper',
  Emotion.JOY,
  70,  // Intensity (0-100)
  'Received compliments on her cooking from customers'
);
```

## Complete Example

See the full example in `src/examples/npc-system-example.ts` for a comprehensive demonstration of the NPC AI system in action.

## System Integration

The NPC AI system integrates with the following core DnD-AI-DM systems:

- **Memory System**: NPCs create and recall memories of significant events
- **Relationship System**: NPCs track and update their relationships with players and other NPCs
- **Context Management**: NPCs use enhanced context management for coherent conversations
- **AI Service**: NPCs leverage the LLM for generating dialogue and reasoning about complex situations

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│               NPC System                    │
└───────────────┬─────────────┬───────────────┘
                │             │
┌───────────────▼─────┐ ┌─────▼───────────────┐
│  Personality Model  │ │   Dialogue System   │
└───────────────┬─────┘ └─────┬───────────────┘
                │             │
                │    ┌────────▼───────────┐
                └────►  Behavior System   │
                     └────────┬───────────┘
                              │
┌─────────────────────┐ ┌─────▼──────────────┐
│    AI Service       │ │   Memory Manager   │
└─────────────────────┘ └────────────────────┘
```

## Future Enhancements

Planned future enhancements for the NPC AI system:

1. **Social Dynamics**: NPC-to-NPC interactions and relationships
2. **Faction Systems**: NPCs acting based on faction goals and alliances
3. **Adaptive Learning**: NPCs that learn from player interactions over time
4. **Enhanced Scheduling**: More sophisticated daily routines with priorities
5. **Combat Tactics**: Integration with the combat system for tactical decision-making

## Developer Notes

- The memory and relationship systems are critical for NPC persistence
- NPCs can generate significant numbers of memories, so consider implementing memory compression or prioritization
- For larger games, consider implementing spatial partitioning to update only NPCs near the player
- The behavior simulation can be computationally intensive; update distant NPCs less frequently
- Custom behaviors are powerful for creating unique NPCs with special abilities

## Dependencies

- `memory-manager.ts`: Manages NPC memories
- `relationship-tracker.ts`: Tracks relationships between entities
- `enhanced-context-manager.ts`: Manages context for AI interactions
- `enhanced-ai-service.ts`: Provides AI capabilities through LLM integration 