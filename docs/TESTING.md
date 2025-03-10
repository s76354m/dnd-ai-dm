# D&D AI DM Testing Documentation

This document outlines the testing infrastructure, patterns, and guidelines for the D&D AI DM project.

## Testing Infrastructure

The project uses Jest as the primary testing framework, with TypeScript support via ts-jest. The testing setup is designed to handle the complex type interfaces in the D&D AI DM codebase while providing a flexible and robust testing environment.

### Test Configuration Options

The project provides multiple test configuration options to support different testing scenarios:

1. **Standard Testing** (`npm test`): 
   - Uses the `jest.config.js` configuration file
   - Performs full type checking during tests
   - Best for catching type errors and ensuring type safety

2. **Fast Testing** (`npm run test:fast`):
   - Uses the `jest.skip-typecheck.config.js` configuration file
   - Skips type checking during tests using `isolatedModules: true` 
   - Significantly faster, but won't catch type errors
   - Recommended for rapid iteration during development

3. **Specialized Testing**:
   - `npm run test:character-creation` - Tests character creation specifically
   - `npm run integration-test` - Runs full integration tests
   - `npm run health-check` - Verifies system installation and configuration

When to use each option:
- Use `npm test` for final verification before commits
- Use `npm run test:fast` during active development for quicker feedback
- Use specialized test scripts when focusing on specific features

### Key Configuration Files

1. **jest.config.js**: The main Jest configuration file that defines test patterns, transformations, and other settings.
   ```javascript
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'node',
     transform: {
       '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }]
     },
     moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
     testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
     moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' },
     setupFilesAfterEnv: ['<rootDir>/src/tests/test-setup.ts'],
     testPathIgnorePatterns: ['/node_modules/', '/dist/'],
     clearMocks: true,
     collectCoverage: false
   };
   ```

2. **tsconfig.test.json**: A specialized TypeScript configuration for tests that relaxes some type constraints:
   ```json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "noImplicitAny": false,
       "strict": false,
       "strictNullChecks": false,
       "strictPropertyInitialization": false,
       "types": ["jest", "node"]
     },
     "include": ["src/**/*.ts", "src/**/*.tsx"],
     "exclude": ["node_modules"]
   }
   ```

3. **test-setup.ts**: Sets up global mocks, helper functions, and testing utilities:
   ```typescript
   // Provides mock implementations for complex interfaces
   global.mockInterfaces = {
     createMockCharacter: (overrides = {}) => ({...}),
     createMockItem: (overrides = {}) => ({...}),
     // ...other mock helpers
   };
   
   // Helper function and matcher extensions
   expect.extend({ toBeWithinRange: (received, floor, ceiling) => {...} });
   ```

### npm Scripts

The following npm scripts are available for testing:

- `npm test`: Run all tests
- `npm run test:debug`: Run tests with verbose output for debugging
- `npm run test:watch`: Run tests in watch mode (reruns when files change)
- `npm run test:coverage`: Run tests with coverage reporting
- `npm run integration-test`: Run end-to-end integration tests
- `npm run health-check`: Verify system installation and configuration

## Test Structure

Tests are organized by module/feature and stored in the `src/tests` directory. Each test file focuses on a specific component of the system:

1. **Unit Tests**: Tests for individual components and functions
   - **Combat Tests**: Tests for the combat system including initiative tracking, attack resolution, and turn management
   - **Character Tests**: Tests for character creation, leveling, and progression
   - **Quest Tests**: Tests for quest management and objective tracking
   - **World Tests**: Tests for location generation and management

2. **Integration Tests**: Tests for interactions between components
   - **Game Flow Tests**: Test the complete game flow from character creation to combat
   - **AI Service Tests**: Test the AI service integration with game mechanics

3. **Example Scripts**: Functional examples that demonstrate components
   - **Combat Example**: Demonstrates tactical AI and combat narration
   - **Quest Example**: Shows quest creation, tracking, and completion
   - **Location Example**: Illustrates location generation with NPCs and items
   - **Narrative Example**: Showcases AI-driven narrative generation

### Pattern for Test Files

Each test file follows a common structure:

```typescript
/**
 * [System] Tests
 * 
 * Description of what is being tested
 */

// Imports
import { ModuleUnderTest } from '../path/to/module';

// Mock dependencies if needed
jest.mock('../path/to/dependency');

// Test suite
describe('ModuleName', () => {
  // Setup shared test objects
  let moduleInstance;
  
  // Setup before each test
  beforeEach(() => {
    moduleInstance = new ModuleUnderTest();
  });
  
  // Individual tests
  test('should perform specific functionality', () => {
    // Arrange
    const input = {...};
    
    // Act
    const result = moduleInstance.method(input);
    
    // Assert
    expect(result).toBe(expectedOutput);
  });
});
```

## Mock Helpers

To simplify testing complex data structures, the project includes global mock helpers in `test-setup.ts`:

1. **createMockCharacter**: Creates a mock D&D character with customizable properties
2. **createMockGameState**: Creates a mock game state for testing
3. **createMockItem**: Creates a mock item with all required properties
4. **createMockNPC**: Creates a non-player character for testing
5. **createMockAIService**: Creates a mock AI service for testing without real API calls
6. **createMockLocation**: Creates a mock location with customizable properties
7. **createMockQuest**: Creates a mock quest for testing progression and rewards

These helpers address common type issues in tests and ensure consistent test data.

## Current State and Next Steps

### Working Components

- ✅ Basic Jest configuration
- ✅ TypeScript integration
- ✅ Mock helpers for complex objects
- ✅ Unit tests for core functionality
- ✅ Integration tests for game flow
- ✅ Example scripts for demonstrating features
- ✅ Health check system for verifying installation

### Future Improvements

1. **Expanded Test Coverage**: Add more comprehensive tests for all system components
2. **Performance Testing**: Implement tests for measuring system performance under load
3. **Automated UI Testing**: Add tests for the command processing interface
4. **Mock Refinement**: Enhance mock implementations to better simulate actual behavior
5. **Cross-platform Testing**: Verify functionality on different operating systems

## Examples and Features Testing

### Character System Testing

Test character creation, advancement, and trait application:

```typescript
test('should correctly apply racial traits', () => {
  // Arrange
  const character = createMockCharacter({ race: 'elf' });
  
  // Act
  const traits = character.getRacialTraits();
  
  // Assert
  expect(traits).toContainEqual(expect.objectContaining({ name: 'Darkvision' }));
});
```

### Combat System Testing

Test initiative tracking, action resolution, and tactical decisions:

```typescript
test('should correctly determine attack hit or miss', () => {
  // Arrange
  const attacker = createMockCharacter({ abilityScores: { strength: { score: 16, modifier: 3 } } });
  const defender = createMockNPC({ stats: { armorClass: 15 } });
  const combatManager = new CombatManager();
  
  // Force a dice roll of 10 for testing consistency
  jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
  
  // Act
  const result = combatManager.resolveAttack(attacker, defender, 'melee');
  
  // Assert
  expect(result.isHit).toBe(true); // 10 (roll) + 3 (STR) + 2 (prof) = 15, which equals AC 15
});
```

### AI Integration Testing

Test AI service response handling and error recovery:

```typescript
test('should use fallback when AI service fails', async () => {
  // Arrange
  const mockAIService = createMockAIService({ shouldFail: true });
  const narrativeGenerator = new NarrativeGenerator(mockAIService);
  
  // Act
  const description = await narrativeGenerator.generateLocationDescription('forest');
  
  // Assert
  expect(description).toContain('forest'); // Should contain fallback text
  expect(mockAIService.generateCompletion).toHaveBeenCalledTimes(3); // Should attempt 3 retries
});
```

### Quest System Testing

Test quest tracking, objectives, and rewards:

```typescript
test('should mark quest as completed when all objectives are finished', () => {
  // Arrange
  const quest = createMockQuest({
    objectives: [
      { id: 'obj1', type: 'kill', target: 'goblin', required: 3, progress: 3, isCompleted: true },
      { id: 'obj2', type: 'collect', target: 'herb', required: 2, progress: 2, isCompleted: true }
    ]
  });
  const questManager = new QuestManager(createMockGameState());
  questManager.quests.set(quest.id, quest);
  questManager.activeQuests.add(quest.id);
  
  // Act
  questManager.checkQuestCompletions();
  
  // Assert
  expect(questManager.getCompletedQuests()).toContainEqual(expect.objectContaining({ id: quest.id }));
});
```

## Best Practices

1. **Test Isolation**: Tests should not depend on each other or external state
2. **Descriptive Names**: Use clear, descriptive test names that explain what is being tested
3. **Mock Dependencies**: Use Jest's mocking capabilities to isolate the component under test
4. **Arrange-Act-Assert**: Follow this pattern in test cases for clarity
5. **Focus on Behavior**: Test the behavior of components, not implementation details
6. **Keep Tests Simple**: Tests should be easy to understand and maintain
7. **Test Edge Cases**: Include tests for edge cases and error conditions

## Running Tests

To run all tests:
```bash
npm test
```

To run specific tests:
```bash
npx jest src/tests/specific-test.ts
```

To run tests with debugging:
```bash
npm run test:debug
```

To run integration tests:
```bash
npm run integration-test
```

To check system health:
```bash
npm run health-check
```

## Conclusion

The testing infrastructure for D&D AI DM provides a comprehensive framework for ensuring the quality and reliability of the system. With a combination of unit tests, integration tests, and example scripts, we can verify that all components work as expected and interact correctly with each other. 