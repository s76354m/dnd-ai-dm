# Enhanced Scheduling System

The Enhanced Scheduling System manages NPC daily routines, activities, and events, integrating with faction systems and social dynamics to create realistic time-based behaviors in the D&D world.

## Overview

This system allows NPCs to have realistic daily schedules, participate in events, and interact with other NPCs based on their location and activities. It connects with other systems to create a cohesive simulation where:

- NPCs follow daily routines based on their needs and faction roles
- Multiple NPCs can participate in events like meetings and social gatherings
- Social interactions occur naturally when NPCs are co-located
- Faction dynamics influence scheduling (meetings, work, special events)
- Territory and location affect movement and scheduling decisions

## Core Components

### Game Time Management

The system uses a unified time representation measured in total minutes:
- Day cycles (24 hour periods)
- Time conversion utilities between total minutes and structured time objects
- Support for recurring schedules (daily, weekly, monthly)

### Activity Management

Activities are the building blocks of an NPC's schedule:
- Individual tasks with specific start times and durations
- Priority-based scheduling with conflict resolution
- Need impact tracking (how activities affect NPC needs)
- Location-specific scheduling with movement tracking
- Default activities (sleep, meals) automatically generated

### Event Coordination

Events involve multiple NPCs participating in a shared activity:
- Role-based participation (organizer, required, optional)
- Faction-based event generation
- Social event creation based on relationships
- Territory-aware event scheduling

### Faction Integration

The system integrates with factions to:
- Schedule work activities based on faction roles
- Create faction meetings and special events
- Prioritize activities based on faction hierarchy
- Coordinate movements within faction territories

### Social Dynamics Integration

Integration with social systems allows:
- Automatic social interaction creation when NPCs share activities
- Relationship-based social event generation
- Need-based socialization opportunities
- Faction relationship influences on cross-faction activities

## Key Features

### Priority-Based Scheduling

Activities are assigned priorities (0-100) to determine what happens when scheduling conflicts occur:
- Higher priority activities override lower priority ones
- Essential activities (sleep, faction duties) have higher base priorities
- Priority can be modified by NPC needs and faction roles

### Recurring Activity Generation

The system supports recurring activities with different frequencies:
- Daily activities like meals and sleep
- Weekly schedules like faction meetings
- Special events with custom scheduling

### Location Awareness

NPCs are tracked by location and move between territories:
- Location constraints for activities and events
- Travel time between non-adjacent territories
- Co-location detection for social interactions
- Territory-specific activities based on resources and features

### Dynamic Event Generation

Events can be created dynamically based on:
- NPC relationships (social gatherings)
- Faction needs (meetings, work sessions)
- Special occasions (celebrations, ceremonies)
- Random occurrences with configurable probabilities

## Usage Examples

### Basic NPC Registration and Scheduling

```typescript
// Register an NPC with the scheduling system
schedulingSystem.registerNPC('npc_blacksmith', 'town_forge');

// Schedule a specific activity
schedulingSystem.scheduleActivity({
  id: 'forge_swords_123',
  npcId: 'npc_blacksmith',
  name: 'Forge Swords',
  description: 'Creating swords for the town guard',
  location: 'town_forge',
  startTime: (day * 24 * 60) + (10 * 60), // 10:00 AM on specified day
  duration: 240, // 4 hours
  priority: 70,
  needs: {
    [NeedType.MONEY]: { impact: 40 },
    [NeedType.REST]: { impact: -20 }
  }
});
```

### Faction-Based Scheduling

```typescript
// Schedule work for all members of a faction
schedulingSystem.scheduleFactionWork('blacksmith_guild');

// Create a faction meeting
schedulingSystem.scheduleFactionMeeting(
  'blacksmith_guild',
  'Monthly Planning Meeting',
  'Discussion of guild quotas and resource allocation',
  currentDay,
  17, // 5 PM
  120 // 2 hours
);
```

### Creating Multi-NPC Events

```typescript
// Create a social gathering
schedulingSystem.createSocialEvent(
  'npc_innkeeper', // organizer
  'Evening Gathering at the Prancing Pony',
  'A relaxed evening of music, food, and drinks',
  (day * 24 * 60) + (19 * 60), // 7:00 PM
  180 // 3 hours
);

// Create a custom event with specific participants
const event = {
  id: 'town_festival_123',
  name: 'Harvest Festival',
  description: 'Annual celebration of the harvest',
  location: 'town_square',
  organizer: 'town_council',
  startTime: (day * 24 * 60) + (12 * 60), // Noon
  duration: 720, // 12 hours
  participants: [
    { npcId: 'npc_mayor', role: 'organizer', confirmed: true },
    { npcId: 'npc_guard_captain', role: 'required', confirmed: true },
    // Add more participants...
  ],
  factionIds: ['town_council', 'merchants_guild'],
  priority: 90,
  tags: ['festival', 'public', 'annual'],
  public: true
};

schedulingSystem.scheduleEvent(event);
```

### Checking NPC Current Activities

```typescript
// Get an NPC's current activity
const currentActivity = schedulingSystem.getCurrentActivity('npc_blacksmith');
if (currentActivity) {
  console.log(`${currentActivity.name} at ${currentActivity.location}`);
  
  // Get other NPCs involved in the same activity
  if (currentActivity.related?.npcIds) {
    console.log(`With: ${currentActivity.related.npcIds.join(', ')}`);
  }
}

// Get all activities for an NPC
const allActivities = schedulingSystem.getNPCActivities('npc_blacksmith');
```

## Integration with Other Systems

### Behavior Simulation

The scheduling system works with the behavior simulation system to:
- Update NPC needs based on activities
- Influence behavior selection based on current schedule
- Trigger reactions to schedule changes

### Social Interaction System

Integration with the social system allows:
- Creation of social interactions during shared activities
- Relationship changes from activity participation
- Knowledge sharing during events

### Faction System

The faction connection enables:
- Role-based duty assignment
- Faction goals influencing priorities
- Cross-faction event coordination

## Implementation Details

The Enhanced Scheduling System is implemented in:
- `src/ai/npc/schedule/enhanced-scheduling-system.ts`

Example usage can be found in:
- `src/examples/enhanced-scheduling-example.ts`

The system is designed to be performance-conscious with:
- Efficient data structures for quick lookups
- Selective updates for active time periods
- Configurable options for tuning behavior 