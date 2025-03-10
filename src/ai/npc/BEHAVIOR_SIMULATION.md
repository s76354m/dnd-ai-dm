# NPC Behavior Simulation System

## Overview
The Behavior Simulation System is a core component of our D&D AI Dungeon Master that simulates realistic NPC behaviors based on needs, goals, personality traits, and environmental factors. This system enables NPCs to exhibit believable patterns of behavior that evolve over time, creating a dynamic and immersive game world.

## Key Features

### 1. Need-Based Behavior Selection
- NPCs have multiple needs (hunger, thirst, rest, social, etc.) that decay over time
- Behaviors are selected based on which needs are most pressing and important
- Each need has configurable importance and decay rates for different NPC types

### 2. Goal-Oriented Actions
- NPCs can have multiple concurrent goals with different priorities
- Goals can depend on other goals, creating complex behavior chains
- Progress tracking for long-term goals across multiple game sessions
- Goal completion triggers narrative events and state changes

### 3. Time and Location Constraints
- Behaviors can be restricted to specific locations or time windows
- Time-of-day appropriate behaviors (sleeping at night, working during the day)
- Environmental factors affecting behavior selection
- Travel between locations with interruption of location-specific behaviors

### 4. Mood and Personality Integration
- Mood calculated from overall need satisfaction
- Personality traits influence behavior selection and execution
- Consistent behavior patterns based on NPC type and role
- Connection to dialogue system for coherent interactions

### 5. Narrative Generation
- Automatic generation of narrative descriptions for current behaviors
- Event creation based on significant behavior changes
- Integration with memory and relationship systems

## Technical Implementation

The system consists of several key components:

1. **Need Manager**: Tracks and updates multiple need types for each NPC
2. **Behavior Registry**: Catalogs available behaviors and their effects
3. **Goal Tracker**: Manages progress toward NPC objectives
4. **Scheduling System**: Handles time-based behavior triggers
5. **Narrative Interface**: Generates textual descriptions of behaviors

## Core Data Structures

### NeedType
An enumeration of different needs an NPC can have:
- Basic physiological needs (hunger, thirst, rest, safety)
- Social/psychological needs (social, respect, entertainment, achievement)
- Economic needs (money, resources)
- Professional needs (crafting, trading, adventuring)

### Need
Represents a specific need for an NPC with:
- Current satisfaction value (0-100)
- Importance multiplier
- Decay rate
- Last update timestamp

### Behavior
Defines a possible action an NPC can take:
- Needs satisfied by the behavior
- Location requirements
- Time window restrictions
- Resource requirements
- Duration and cooldown periods
- Interruptibility
- Narrative templates

### Goal
Represents a longer-term objective:
- Related needs
- Completion conditions
- Progress tracking
- Time constraints
- Dependencies on other goals
- Associated behaviors

### BehaviorState
Tracks the current state of an NPC:
- Current location and behavior
- Need satisfaction levels
- Active goals and progress
- Available behaviors
- Recent behavior history
- Current mood score

## Integration with Other Systems

The Behavior Simulation System integrates with:

1. **Personality Model**: Influences behavior selection based on personality traits
2. **Memory Manager**: Stores significant behaviors and experiences
3. **Relationship Tracker**: Updates relationships based on interactions
4. **Dialogue System**: Generates dialogue consistent with current behavior
5. **Context Manager**: Provides behavior context for AI narrative generation

## Usage Example

```typescript
// Create a behavior simulation instance
const behaviorSimulation = new BehaviorSimulation(
  personalityModel,
  memoryManager,
  relationshipTracker,
  dialogueSystem
);

// Register an NPC
const npcState = behaviorSimulation.registerNPC(
  'innkeeper',
  'tavern',
  initialNeeds,
  initialGoals,
  customBehaviors
);

// Update NPC state based on game time
behaviorSimulation.updateNPC('innkeeper', currentGameTime);

// Get narrative description of current behavior
const narrative = behaviorSimulation.generateBehaviorNarrative('innkeeper');
```

## Benefits for Game Experience

1. **Increased Immersion**: NPCs exhibit realistic, need-driven behaviors
2. **Dynamic World**: The game world feels alive with active NPCs
3. **Narrative Coherence**: NPCs maintain consistent behavior patterns
4. **Emergent Storytelling**: Complex interactions emerge from behavior rules
5. **Memory-Based Interactions**: NPCs remember and reference past behaviors

## Future Enhancements

1. **Emotional System**: More nuanced emotional states affecting behavior
2. **Social Dynamics**: Group behaviors and social influence mechanics
3. **Learning Patterns**: NPCs adapting behaviors based on experiences
4. **Procedural Routines**: Dynamic creation of daily routines
5. **Player Influence**: Player actions affecting NPC behavior patterns

---

The Behavior Simulation System represents a significant advancement in creating believable NPCs for our D&D AI Dungeon Master, allowing for emergent narrative and consistent characterization without manual scripting of NPC actions. 