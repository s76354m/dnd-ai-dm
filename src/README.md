# D&D AI Dungeon Master - Source Code Structure

## Overview

This directory contains the source code for the D&D AI Dungeon Master application. The application is built using TypeScript and follows a modular architecture with clear separation of concerns.

## Entry Points

- `index.ts` - The main consolidated entry point for the application
- `main.ts` - A simple wrapper that imports and runs the main function from index.ts

## Directory Structure

### Core System Components

- `/core` - Core game systems, state management, and interfaces
  - `/interfaces` - TypeScript interfaces defining data structures
  - `/state` - Game state management
  - `/types` - TypeScript type definitions
  - `command-processor.ts` - Processes player commands
  - `command-validator.ts` - Validates player commands
  - `engine.ts` - Game engine components
  - `event-system.ts` - Event handling system

### Game Systems

- `/ai` - AI-related systems for game narrative and NPC behavior
  - `/config` - AI configuration
  - `/interfaces` - AI system interfaces
  - `/integration` - Integration with AI providers
  - `/memory` - Memory systems for AI context management
  - `/npc` - NPC behavior systems
  - `/prompts` - Prompts for LLM interactions
  - `/providers` - AI provider implementations
  - `/world` - World generation with AI

- `/character` - Character creation and management
  - `/creation` - Character creation systems
  - `/utils` - Character utility functions

- `/combat` - Combat mechanics implementation
  - `targeting.ts` - Line of sight and targeting systems
  - `combat-manager.ts` - Combat flow management

- `/magic` - Magic and spellcasting systems

- `/world` - World management and generation

- `/dm` - Dungeon Master logic and rules enforcement

- `/quest` - Quest management and tracking

- `/items` - Item definitions and interactions
  - `/equipment` - Equipment management
  - `/loot` - Loot generation
  - `/economy` - Economic systems

### Utility and Data

- `/utils` - Utility functions and helpers
- `/data` - Static game data (races, classes, monsters, etc.)
- `/config` - Application configuration

### Testing

- `/tests` - Tests for the application components
  - `/ai` - AI system tests
  - `/combat` - Combat system tests
  - `/core` - Core system tests
  - `/integration` - Integration tests
  - `/utils` - Utility tests
  
## Data Flow

1. User input is captured in the main game loop (`index.ts`)
2. Commands are processed by the command processor
3. The command processor uses the AI system to interpret natural language
4. Game state is updated based on the command
5. AI generates narrative responses
6. The updated state and narrative are presented to the user

## Development Guidelines

1. Follow TypeScript best practices with strong typing
2. Each module should have a clear responsibility
3. Use interfaces to define data structures
4. Document public functions and interfaces
5. Write tests for critical functionality
6. Handle errors gracefully with informative messages

## Running the Application

To run the application, use:

```bash
npm start
```

To run with development features enabled:

```bash
npm run dev
```

To run specific tests:

```bash
npm test
``` 