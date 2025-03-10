# Combat System

## Overview

The Combat System is a core component of the D&D AI Dungeon Master, designed to handle all aspects of combat in accordance with D&D 5e rules. The system is built with modularity in mind, allowing for the proper management of turns, actions, reactions, conditions, and now targeting with line of sight and cover mechanics.

## Key Components

### Combat Effects

The Combat Effects system integrates status effects with combat mechanics, handling how conditions applied through spells and abilities affect participants during combat. This includes:

- Management of conditions like stunned, prone, paralyzed
- Tracking effect durations and expiration
- Saving throw opportunities to shake off effects

### Reaction System

The Reaction System allows combat participants to respond to specific triggers during combat, outside of their normal turn. This includes:

- Registration of reaction capabilities (e.g., a wizard with Counterspell)
- Processing of triggers like spellcasting or movement
- Resolution of reactions following D&D rules

### Targeting System

The Targeting System provides realistic targeting mechanics for spells and ranged attacks, now including:

- Line of sight calculations between participants
- Cover determination based on obstacles in the environment
- Distance calculations for range constraints
- Light level effects on visibility
- Targeting modifiers for invisible or obscured creatures

## Implementation Details

### Combat Participants

Combat participants are represented with properties like:

- Position coordinates in a 3D space
- Initiative value and modifier
- Hit points and maximum hit points
- Conditions and effects
- Visibility status (invisible, hidden)

### Combat State

The combat state tracks:

- All participants in the combat
- Current round and turn order
- Active status effects
- Combat environment including obstacles and light levels

### Status Effect Integration

The combat system interfaces with the Status Effect Manager to:

- Apply effects when spells hit or abilities are used
- Process duration at the beginning and end of turns
- Handle concentration checks when casters take damage
- Apply condition-based limitations on actions

### Reaction Handling

The Reaction system allows for:

- Counterspell reactions when spells are cast
- Shield spell reactions when attacked
- Opportunity attacks when creatures move
- Custom reaction types for class features

### Line of Sight and Cover

The targeting system provides:

- Dynamic calculation of cover based on obstacles
- AC bonuses and saving throw bonuses from cover
- Visibility checks based on light conditions
- Methods to find all valid targets for an action

## Specialized Reactions

### Counterspell

Allows spellcasters to interrupt another spellcaster as they cast a spell.

### Shield

Provides a defensive reaction when a creature is hit by an attack.

### Opportunity Attacks

Triggered when a creature moves out of an enemy's reach.

## Usage Examples

### Applying Combat Effects

```typescript
// Create a spell action with status effects
const spellAction = {
  actionType: 'spell',
  name: 'Hold Person',
  sourceId: 'caster1',
  targetIds: ['target1', 'target2'],
  statusEffects: [
    {
      type: ConditionType.Paralyzed,
      duration: { type: 'turns', value: 10 },
      savingThrow: { ability: 'wisdom', dc: 15, frequency: 'endOfTurn' }
    }
  ]
};

// Apply the spell action effects to the combat state
combatEffectsManager.applySpellActionEffects(spellAction, combatState);
```

### Working with Reactions

```typescript
// Register a reaction 
reactionManager.registerReaction({
  participantId: 'wizard1',
  type: ReactionTriggerType.SpellCast,
  name: 'Counterspell',
  condition: (trigger) => trigger.data.spellLevel <= 3,
  action: (trigger, state) => {
    console.log('Counterspell triggered!');
    return true; // Successfully countered
  }
});
```

### Checking Targeting and Cover

```typescript
// Check if a target is valid for a spell
const targetingResult = targetingSystem.checkTargeting(caster, target, spellRangeInFeet, environment);

if (targetingResult.isVisible && targetingResult.lineOfSight) {
  console.log('Valid target!');
  
  // Apply cover bonuses to AC or saving throws if needed
  if (targetingResult.coverType !== CoverType.None) {
    const acBonus = targetingSystem.getCoverACBonus(targetingResult.coverType);
    console.log(`Target has +${acBonus} AC from cover`);
  }
}
```

## Running Examples

The following npm scripts can be used to run examples:

```bash
# Run the combat effects example
npm run run:combat-effects

# Run the reaction system example
npm run run:reaction-example

# Run the targeting system example
npm run run:targeting
```

## Next Steps

1. **Implement additional targeting mechanics**:
   - Cone and line targeting for spells
   - Area-of-effect targeting that considers cover
   - Height advantages and disadvantages

2. **Enhance the environment system**:
   - Terrain effects on movement and combat
   - Weather conditions affecting visibility
   - Dynamic obstacle creation and destruction

3. **Add advanced visibility mechanics**:
   - Stealth and perception integration
   - Hidden and invisible creature detection
   - Magical darkness and fog effects

4. **Further reaction types**:
   - Absorb Elements for elemental damage
   - Feather Fall for falling conditions
   - Hellish Rebuke for damage responses

## Testing

The combat system components have corresponding tests in the `tests` directory. To run the tests:

```bash
npm test
``` 