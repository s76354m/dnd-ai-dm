# Social Dynamics System

This module provides a comprehensive system for simulating social interactions and information sharing between NPCs in the D&D AI DM application. It extends the NPC AI system to create a living, breathing world where NPCs form relationships, share knowledge, and engage in various social activities independent of player interaction.

## Core Components

The Social Dynamics System consists of the following major components:

### 1. Social Interaction System (`social-interaction.ts`)

The Social Interaction System enables NPCs to interact with each other based on:

- **Personality-driven interactions**: Different interaction types based on personality traits
- **Relationship-based behavior**: Interactions influenced by existing relationships
- **Location-based encounters**: NPCs in the same location can interact
- **Memory creation**: Important interactions create memories for both NPCs
- **Emotional impact**: Interactions affect emotional states
- **Goal advancement**: Cooperative interactions can advance NPC goals

### 2. Information Sharing System (`information-sharing.ts`)

The Information Sharing System models how knowledge spreads through the NPC social network:

- **Knowledge propagation**: Information flows through social connections
- **Rumor distortion**: Information can change as it spreads
- **Relationship-based sharing**: Closer relationships share more information
- **Faction-based secrets**: Some information stays within factions
- **Personality influence**: Traits like extraversion affect sharing probability
- **Information types**: Different categories (facts, rumors, secrets, etc.)

## Usage

### Setting Up the Social Dynamics System

```typescript
// Initialize core services
const memoryManager = new MemoryManager();
const relationshipTracker = new RelationshipTracker();
const behaviorSimulation = new BehaviorSimulation(/* ... */);
const dialogueSystem = new DialogueSystem(/* ... */);

// Create the social interaction system
const socialInteractionSystem = new SocialInteractionSystem(
  memoryManager,
  relationshipTracker,
  behaviorSimulation,
  dialogueSystem
);

// Create the information sharing system
const informationSharingSystem = new InformationSharingSystem(
  memoryManager,
  relationshipTracker,
  socialInteractionSystem
);
```

### Registering NPCs

```typescript
// Create an NPC with social information
const npc: SocialNPC = {
  id: 'npc_innkeeper',
  name: 'Greta',
  personality: {
    traits: {
      openness: 70,
      conscientiousness: 85,
      extraversion: 90,
      agreeableness: 80,
      neuroticism: 30
    },
    // Other personality properties...
  },
  knowledge: [
    'The old road is dangerous at night',
    'The mayor is planning to raise taxes',
    'The blacksmith is looking for a new apprentice'
  ],
  emotionalState: {
    // Emotional state properties...
  },
  currentLocation: 'village_inn',
  occupation: 'Innkeeper',
  faction: 'Village Merchants',
  goals: new Map(/* NPC goals */),
  schedule: []
};

// Register the NPC with the social interaction system
socialInteractionSystem.registerNPC(npc);
```

### Creating and Sharing Information

```typescript
// Create a new piece of information
const info = informationSharingSystem.createInformation(
  'A dragon was spotted in the northern mountains',
  InformationType.RUMOR,
  80, // Importance (0-100)
  70, // Truth value (0-100)
  'npc_hunter', // Source NPC
  ['northern_mountains', 'dragon'], // Relevant entities
  { minRelationship: 20 }, // Visibility restriction
  ['danger', 'monster', 'wilderness'] // Tags
);

// Add information to an NPC's knowledge
informationSharingSystem.addInformationToNPC('npc_innkeeper', info.id);

// Find NPCs who know about a specific entity
const knowledgeableNPCs = informationSharingSystem.findNPCsWithRelevantInformation('dragon', InformationType.THREAT);
```

### Updating the Social Systems

```typescript
// In the game loop, update the social systems with the passage of game time
function updateGameWorld(gameTimeMinutes: number, allNpcs: SocialNPC[]) {
  // Update social interactions
  socialInteractionSystem.updateSystem(gameTimeMinutes);
  
  // Update information sharing
  informationSharingSystem.updateSystem(gameTimeMinutes, allNpcs);
  
  // Other world updates...
}
```

## Social Interaction Types

The system supports various types of social interactions between NPCs:

- **Conversation**: Simple exchange of information
- **Trade**: Exchange of goods or services
- **Cooperation**: Working together toward a common goal
- **Competition**: Contest or rivalry
- **Conflict**: Disagreement or confrontation
- **Assistance**: One NPC helping another
- **Gift Giving**: Presenting a gift
- **Intimidation**: Using fear or threats
- **Persuasion**: Convincing another NPC
- **Deception**: Misleading another NPC
- **Entertainment**: Sharing fun activities
- **Mentoring**: Teaching or guiding
- **Romance**: Romantic interaction
- **Religious Activity**: Shared worship or ritual
- **Shared Meal**: Eating together

## Information Types

The system models different types of information that can spread through the world:

- **Fact**: Objectively true information
- **Opinion**: Subjective viewpoint
- **Rumor**: Unverified information that may be true or false
- **Secret**: Information intentionally kept hidden
- **Quest Hint**: Information relevant to a quest
- **Location**: Information about a place
- **Threat**: Information about a danger
- **Opportunity**: Information about a beneficial possibility
- **Gossip**: Information about other NPCs
- **History**: Historical information

## Integration with Other Systems

The Social Dynamics System integrates with the following core D&D AI DM systems:

- **Memory System**: Social interactions create memories for NPCs
- **Relationship System**: Interactions affect relationships between NPCs
- **Behavior Simulation**: Social activities can satisfy needs and advance goals
- **Dialogue System**: Knowledge gained through social networks influences dialogue
- **Faction System**: Faction membership affects information sharing and social dynamics

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
│    Memory Manager   │ │ Relationship Tracker│
└─────────┬───────────┘ └──────────┬─────────┘
          │                        │
┌─────────▼────────────────────────▼─────────┐
│             Social Dynamics System          │
├───────────────────┬───────────────────────┐│
│ Social Interaction│  Information Sharing  ││
│      System       │       System          ││
└───────────────────┴───────────────────────┘│
└─────────────────────────────────────────────┘
```

## Future Enhancements

Planned future enhancements for the Social Dynamics System:

1. **Group Dynamics**: Modeling interactions between groups of NPCs
2. **Cultural Influences**: Cultural factors affecting social norms and behaviors
3. **Social Events**: Scheduled gatherings like festivals, markets, and ceremonies
4. **Reputation System**: Public perception of NPCs based on actions and rumors
5. **Social Network Visualization**: Tools for visualizing NPC relationships and information flow
6. **LLM Integration**: Using AI to generate more nuanced social interactions and information distortion

## Developer Notes

- The social interaction system can generate significant numbers of interactions; consider performance optimization for large NPC populations
- Information sharing can create a complex web of knowledge; use the debugging tools to track information flow
- Consider implementing spatial partitioning to limit social interactions to NPCs in proximity
- The system is designed to be run periodically (e.g., every hour of game time) rather than every game tick
- Custom interaction types can be added by extending the `SocialInteractionType` enum 