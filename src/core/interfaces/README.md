# Core Interfaces

This directory contains TypeScript interfaces that define the data models for the D&D AI Dungeon Master application. These interfaces ensure type safety and consistency across the codebase.

## Key Data Models

### Game State

The `GameState` interface in `game.ts` represents the complete state of the game, including:
- Player character data
- Current location
- NPCs
- Quest state
- Inventory
- Combat state
- Game time and world state

### Character

The `Character` interface in `character.ts` defines the structure of player characters, including:
- Core attributes (strength, dexterity, etc.)
- Race and class features
- Hit points and hit dice
- Proficiencies
- Spells and abilities
- Inventory

### Combat

Combat-related interfaces are split between:
- `combat.ts` - Core combat state and mechanics
- `combat-extensions.ts` - Additional combat data models for more advanced mechanics

### Location

The `Location` interface in `location.ts` defines the structure of locations in the game world, including:
- Description and environment
- Connected locations
- NPCs present
- Items present
- Environmental conditions

### NPCs

The `NPC` interface in `npc.ts` defines non-player characters including:
- Basic attributes
- Personality traits
- Dialog options
- Relationships with the player

### Items

Item-related interfaces are split between:
- `item.ts` - Basic item structure
- `magical-item.ts` - Magical items with special properties

### Quests

The `Quest` interface in `quest.ts` defines the structure of quests, including:
- Objectives
- Rewards
- State (active, completed, failed)
- Related NPCs and locations

## Usage

Interfaces are re-exported from the `index.ts` file, allowing imports to be simplified throughout the codebase:

```typescript
// Import from the consolidated export
import { Character, GameState, Location } from '../core/interfaces';

// Instead of importing from individual files
// import { Character } from '../core/interfaces/character';
// import { GameState } from '../core/interfaces/game';
// import { Location } from '../core/interfaces/location';
```

## Naming Conventions

- Interface names are singular nouns (`Character`, `Location`)
- Extended interfaces use descriptive suffixes (`CombatantStatus`, `LocationDescription`)
- Utility types use descriptive names (`LightingLevel`, `TerrainType`)

## Future Improvements

- Add JSDoc documentation to all interface properties
- Create more specialized subtypes for complex game mechanics
- Add validation functions for each interface
- Create type guards for better runtime type checking 