# Enhanced Context Management System

This directory contains the integration utilities for the enhanced context management system, which significantly improves the AI's ability to maintain coherent narratives, remember important events, track relationships, and provide scenario-specific responses.

## Key Components

The enhanced context management system consists of several specialized components:

1. **Memory Manager (`memory/memory-manager.ts`)**: Prioritizes and manages narrative memories with relevance scoring
2. **Relationship Tracker (`memory/relationship-tracker.ts`)**: Tracks interpersonal relationships and sentiment between characters
3. **Context Optimizer (`memory/context-optimizer.ts`)**: Optimizes context windows for different game scenarios 
4. **Prompt Template Manager (`prompts/prompt-templates.ts`)**: Provides specialized prompts for different game scenarios
5. **Enhanced Context Manager (`enhanced-context-manager.ts`)**: Integrates all these components

## Usage

### Basic Integration

```typescript
import { AIService } from '../ai-service-wrapper';
import { integrateEnhancedContext } from './integration/context-integration';
import { GameState } from '../core/interfaces/game';

// Create base AI service
const baseService = new AIService();

// Integrate enhanced context
const enhancedService = integrateEnhancedContext(baseService, {
  enableEnhancedContext: true,
  debug: true
});

// Update with game state when available
function updateGameState(gameState: GameState): void {
  updateContextWithGameState(enhancedService, gameState);
}

// Generate narrative with enhanced context
async function generateResponse(userInput: string): Promise<string> {
  return enhancedService.generateNarrative(userInput);
}
```

### Recording Important Narrative Events

```typescript
import { recordNarrativeMemory } from './integration/context-integration';

// Record important events (importance 1-10)
recordNarrativeMemory(
  enhancedService, 
  "The party defeated the dragon and recovered the ancient artifact.",
  8 // High importance
);

// Record routine events
recordNarrativeMemory(
  enhancedService,
  "The party rested at the tavern and bought supplies.",
  3 // Lower importance
);
```

### Tracking Character Relationships

```typescript
import { recordCharacterInteraction } from './integration/context-integration';

// Record a positive interaction
recordCharacterInteraction(
  enhancedService,
  "Player", // Initiator
  "Village Elder", // Target
  "HELP", // Interaction type
  "The player saved the elder's grandson from the wolves", // Description
  7 // Impact (1-10)
);

// Record a negative interaction
recordCharacterInteraction(
  enhancedService,
  "Player",
  "Shopkeeper",
  "THEFT",
  "The player stole goods from the shop",
  6 // Impact (1-10)
);
```

### Scenario-Specific Responses

The system automatically detects the current scenario (combat, social, exploration, etc.) but you can also set it explicitly:

```typescript
import { GameScenario } from '../memory/context-optimizer';

// Force combat scenario
enhancedService.setScenario(GameScenario.COMBAT);

// Generate combat-specific narrative
const combatNarrative = await enhancedService.generateNarrative(
  "I attack the orc with my sword"
);
```

### Memory Decay

For long-running campaigns, you can apply memory decay to simulate the passage of time:

```typescript
import { applyContextDecay } from './integration/context-integration';

// Apply decay during long rests or time skips
applyContextDecay(enhancedService);
```

## Configuration Options

The enhanced context system is highly configurable:

```typescript
const enhancedService = integrateEnhancedContext(baseService, {
  enableEnhancedContext: true,
  contextManagerConfig: {
    maxTotalTokens: 6000, // Larger context window
    enableMemoryPrioritization: true,
    enableRelationshipTracking: true,
    enableContextOptimization: true,
    enablePromptTemplates: true,
    debugMode: true
  },
  debug: true
});
```

## Benefits

- **Improved Narrative Coherence**: The AI remembers important plot points and character development
- **Dynamic Relationships**: NPCs remember their history with the player and react accordingly
- **Scenario-Aware Responses**: The AI provides appropriate responses based on the current game scenario
- **Optimized Context Windows**: Critical information is prioritized within token limits
- **Memory Prioritization**: Important events stay in context longer than routine ones

## Technical Details

The system uses relevance scoring, recency weighting, and importance factoring to determine what information to keep in context. It also includes specialized prompt templates for different game scenarios to guide the AI's responses.

For more information, see the individual component documentation in their respective files. 