# Enhanced Context Management Examples

This directory contains example files that demonstrate how to use the enhanced context management system. These examples show how the system improves narrative coherence, tracks relationships, optimizes context windows, and provides scenario-specific responses.

## Available Examples

### Enhanced AI Example (`enhanced-ai-example.ts`)

A simple example that demonstrates the core features of the enhanced context management system:
- Memory prioritization
- Relationship tracking
- Scenario-specific prompts
- Context optimization

Run this example to see a quick demonstration of these features:

```bash
npx ts-node src/examples/enhanced-ai-example.ts
```

### Game Integration Example (`game-integration-example.ts`)

A more comprehensive example that simulates a simple game session, demonstrating how to:
- Integrate the enhanced context system into a game loop
- Update context as the game state changes
- Record important narrative events and interactions
- Apply memory decay during time skips
- Switch between different game scenarios (exploration, combat, etc.)

Run this example to see how the system enhances a game session:

```bash
npx ts-node src/examples/game-integration-example.ts
```

## Key Features Demonstrated

1. **Memory Prioritization**: Important narrative events are remembered longer than routine ones.
2. **Relationship Tracking**: NPCs remember their history with the player and respond accordingly.
3. **Scenario Detection**: The system automatically detects the current game scenario.
4. **Context Optimization**: Token budgets are dynamically allocated based on the current scenario.
5. **Specialized Prompts**: Different scenarios use tailored prompts for appropriate responses.
6. **Memory Decay**: Less important memories fade over time, simulating realistic memory.

## Integration with Existing Code

To integrate these enhancements with your existing codebase:

1. Replace direct usage of the base AI service with the enhanced service:

```typescript
// Before
const aiService = new AIService();
const response = await aiService.generateNarrative(input);

// After
const baseService = new AIService();
const enhancedService = integrateEnhancedContext(baseService);
const response = await enhancedService.generateNarrative(input);
```

2. Update the context when the game state changes:

```typescript
// Update context whenever game state changes
function onGameStateChange(newState: GameState) {
  updateContextWithGameState(enhancedService, newState);
}
```

3. Record important narrative events and interactions:

```typescript
// After important story events
recordNarrativeMemory(
  enhancedService,
  "The dragon revealed the ancient prophecy to the player",
  8 // High importance (1-10)
);

// After NPC interactions
recordCharacterInteraction(
  enhancedService,
  playerName,
  npcName,
  "BETRAYAL",
  "The NPC revealed they were working for the villain all along",
  9 // Very high impact
);
```

4. Apply decay during time skips:

```typescript
// During long rests or significant time passage
function onLongRest() {
  applyContextDecay(enhancedService);
}
```

For more detailed usage information, see the [integration README](/src/ai/integration/README.md). 