# D&D AI Dungeon Master - Architecture Reference

## Architecture Overview

The D&D AI Dungeon Master project follows a modular architecture with clear separation of concerns. This document outlines the key architectural decisions, component organization, and best practices for maintaining and extending the codebase.

## Core Design Principles

1. **Modularity**: Each component has a well-defined responsibility
2. **Type Safety**: TypeScript interfaces define clear data contracts
3. **Extensibility**: Systems are designed to be extended without modifying existing code
4. **Testability**: Components can be tested in isolation
5. **AI Integration**: LLM capabilities are integrated throughout the system

## Directory Structure

The source code is organized into the following directory structure:

```
src/
├── ai/            # AI integration and language model interactions
├── character/     # Character creation and management
├── combat/        # Combat mechanics and resolution
├── config/        # Application configuration
├── core/          # Core game systems and data models
├── dm/            # Dungeon Master logic
├── items/         # Item definitions and interactions
├── magic/         # Magic and spellcasting systems
├── quest/         # Quest management
├── tests/         # Test suites
├── types/         # Global TypeScript types
├── utils/         # Utility functions
└── world/         # World generation and management
```

## Main Entry Points

- `index.ts` - The main consolidated entry point for the application
- `main.ts` - A simple wrapper around index.ts

## Key Components

### Core Systems

- **Game State Management**: `core/state/game-state-manager.ts`
  - Central state management for the entire application
  - Handles state updates and transitions
  - Maintains game history

- **Event System**: `core/event-system.ts`
  - Pub/sub system for loose coupling between components
  - Allows components to react to game events without direct dependencies

- **Command Processing**: `core/command-processor.ts`
  - Interprets natural language commands
  - Validates commands against game rules
  - Routes commands to appropriate handlers

### AI Integration

- **AI Service**: `ai/ai-service-interface.ts`
  - Abstract interface for AI provider interactions
  - Implementations for different LLM providers

- **Context Management**: `ai/enhanced-context-manager.ts`
  - Manages context window for AI interactions
  - Optimizes prompt construction

- **Command Interpretation**: `ai/command-interpreter.ts`
  - Uses AI to interpret ambiguous player commands
  - Maps natural language to game actions

### Game Mechanics

- **Character System**: `character/`
  - Character creation and progression
  - Ability score management
  - Class features and racial traits

- **Combat System**: `combat/`
  - Turn-based combat mechanics
  - Attack resolution
  - Status effect tracking

- **Magic System**: `magic/`
  - Spell management
  - Magical effects
  - Spell slots and casting

- **World Management**: `world/`
  - Location generation
  - NPC management
  - Environmental conditions

## Data Flow

1. Player input is received in the game loop (`index.ts`)
2. Commands are processed by the command processor (`core/command-processor.ts`)
3. AI assists in interpreting commands if needed (`ai/command-interpreter.ts`)
4. Commands are validated against game rules (`core/command-validator.ts`)
5. Valid commands update the game state (`core/state/game-state-manager.ts`)
6. The updated state triggers events (`core/event-system.ts`)
7. Components react to events and update their internal state
8. AI generates narrative responses based on the updated state
9. The updated narrative and game state are presented to the player

## Recent Architectural Improvements

As part of the recent consolidation effort, we've made the following improvements:

1. **Consolidated Entry Points**:
   - Removed redundant alpha/test versions (`alpha-mvp.ts`, `app-alpha.ts`, `simple-main.ts`)
   - Consolidated functionality into `index.ts`
   - Simplified `main.ts` to be a thin wrapper

2. **Interface Consolidation**:
   - Merged redundant interfaces (`game.ts` and `game-state.ts`)
   - Combined extended interfaces with their base interfaces
   - Removed empty files (`combat-ext.ts`, `events.ts`)
   - Updated imports throughout the codebase

3. **Improved Documentation**:
   - Added README files to key directories
   - Created this architecture reference
   - Added JSDoc comments to key functions

4. **Test Organization**:
   - Moved test files into appropriate test directories
   - Standardized test file naming
   - Improved test harnesses

## Best Practices for Further Development

1. **Adding New Features**:
   - Place new code in the appropriate module directory
   - Create interfaces in `core/interfaces` for new data structures
   - Add appropriate tests in the `tests` directory
   - Update documentation as needed

2. **Modifying Existing Features**:
   - Prefer extending existing interfaces over modifying them
   - Use the event system for cross-component communication
   - Update tests to reflect changes

3. **AI Integration**:
   - Use the abstract AI service interface for provider independence
   - Optimize context window usage for better AI responses
   - Include fallback mechanisms for when AI is unavailable

4. **Performance Considerations**:
   - Minimize redundant state updates
   - Use memoization for expensive calculations
   - Optimize AI calls by batching related queries

## Planned Architectural Improvements

1. **State Management**:
   - Implement a more robust state management system
   - Add transactional state updates with rollback capabilities
   - Improve serialization for saved games

2. **AI Integration**:
   - Better error handling for AI service failures
   - Implement local fallback models for offline play
   - Add fine-tuning capabilities for improved responses

3. **Testing**:
   - Increase test coverage across all components
   - Add performance benchmarks
   - Implement automated integration tests

4. **Documentation**:
   - Generate API documentation from JSDoc comments
   - Create architectural diagrams
   - Add more examples of component interactions 