# D&D AI Dungeon Master

An AI-powered Dungeon Master for text-based D&D campaigns. This project leverages large language models to create a fully automated Dungeon Master experience.

## Project Overview

DnD-AI-DM is an advanced TypeScript application that leverages large language models (LLMs) and structured data systems to create a fully automated Dungeon Master for Dungeons & Dragons campaigns. This system provides a complete text-based D&D experience without requiring a human Dungeon Master, handling all aspects of gameplay including narrative generation, combat resolution, character management, and world simulation.

## Getting Started

### Prerequisites

- Node.js 16 or higher
- npm or yarn package manager
- An API key for OpenAI or Anthropic (for AI features)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/dnd-ai-dm.git
   cd dnd-ai-dm
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Then edit the `.env` file to add your API keys.

4. Build the project:
   ```bash
   npm run build
   ```

5. Start the application:
   ```bash
   npm start
   ```

## Project Structure

- `/src` - Source code
  - `/ai` - AI integration and language model interactions
  - `/character` - Character management
  - `/combat` - Combat system
  - `/core` - Core game systems
  - `/world` - World generation and management
- `/dist` - Compiled JavaScript output
- `/docs` - Project documentation
- `/config` - Configuration files

## Testing

The project includes a comprehensive test suite using Jest with TypeScript support.

### Running Tests

- Run all tests:
  ```bash
  npm test
  ```

- Run tests with faster performance (skips type checking):
  ```bash
  npm run test:fast
  ```

- Run tests with coverage report:
  ```bash
  npm run test:coverage
  ```

- Run specific feature tests:
  ```bash
  npm run test:character-creation
  npm run integration-test
  ```

### Configuration Files

- `jest.config.js` - Main Jest configuration file with full type checking
- `jest.skip-typecheck.config.js` - Jest configuration that skips type checking for faster tests
- `tsconfig.json` - Main TypeScript configuration
- `tsconfig.test.json` - TypeScript configuration specific to tests

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- [Project Plan](docs/PROJECT_PLAN.md) - Detailed project plan with phases and timelines
- [AI Integration](docs/AI_INTEGRATION.md) - Details about the AI integration
- [Testing](docs/TESTING.md) - Information about testing approach and tools
- [Architecture](docs/ARCHITECTURE.md) - Technical architecture overview

## Scripts

```bash
# Start the application
npm start

# Build the application
npm run build

# Run in development mode
npm run dev

# Set up AI keys
npm run setup-ai-keys

# Run specific examples
npm run narrative-example
npm run combat-example
npm run quest-example
```

## License

MIT

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details.

## Current Status

We have been focused on implementing the combat system, with the following components now operational:

### Combat System

1. **Combat Effects** - Integration of status effects with combat mechanics
2. **Reaction System** - Handling reactions like Counterspell and Shield during combat
3. **Targeting System** - Implementing line of sight, cover, and targeting mechanics

## Running Examples

The project includes several example scripts that demonstrate different aspects of the system:

```bash
# Run the combat effects example
npm run run:combat-effects

# Run the reaction system example
npm run run:reaction-example

# Run the targeting system example (simplified version)
npm run run:simple-targeting

# Run all examples sequentially (Note: Some examples may require additional setup)
npm run run:all-examples
```

## Next Steps

1. **Advanced Targeting Mechanics**
   - Cone and line targeting
   - Area-of-effect targeting considering cover
   - Height advantages/disadvantages

2. **Environment System Enhancements**
   - Terrain effects on movement and combat
   - Weather conditions affecting visibility
   - Dynamic obstacle creation and destruction

3. **Visibility Mechanics**
   - Stealth and perception integration
   - Hidden and invisible creature detection
   - Magical darkness and fog effects

4. **Additional Reaction Types**
   - Absorb Elements for elemental damage
   - Feather Fall for falling conditions
   - Hellish Rebuke for damage responses

## Development

### Prerequisites

- Node.js (v14+)
- TypeScript
- NPM

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/dnd-ai-dm.git
cd dnd-ai-dm

# Install dependencies
npm install

# Run examples
npm run run:simple-targeting
```

## Project Structure

```
dnd-ai-dm/
├── src/
│   ├── character/           # Character creation and management
│   ├── world/               # World and location management
│   ├── combat/              # Combat system
│   │   ├── targeting.ts     # Line of sight and cover mechanics
│   │   ├── reactions.ts     # Reaction system
│   │   └── combat-effects.ts # Status effect integration
│   ├── magic/               # Spellcasting system
│   ├── items/               # Item and equipment system
│   ├── ai/                  # AI integration
│   ├── core/                # Core game engine
│   ├── utils/               # Utility functions
│   ├── data/                # Game data
│   ├── examples/            # Example scripts
│   └── index.ts             # Application entry point
└── package.json             # Dependencies and scripts
``` 