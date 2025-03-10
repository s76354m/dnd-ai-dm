# DnD-AI-DM

An advanced TypeScript application that leverages large language models (LLMs) and structured data systems to create a fully automated Dungeon Master for Dungeons & Dragons campaigns.

## Project Overview

DnD-AI-DM provides a complete text-based D&D experience without requiring a human Dungeon Master, handling all aspects of gameplay including:

- Narrative generation
- Combat resolution
- Character management
- World simulation

## Features

### Character Management System
- Strong typing for character attributes
- Comprehensive validation for character creation
- Race, class, and background implementation with proper D&D rules
- Personality traits integration with narrative generation

### AI-Powered Game World System
- Context window optimization for continuous narrative
- Procedural location generation with AI-enhanced descriptions
- NPC system with persistent memory of player interactions
- Quest management with narrative consistency

### Combat System Architecture
- Initiative management with proper D&D rules
- Action economy implementation (action, bonus action, reaction)
- Condition tracking system for status effects
- AI-driven enemy tactical decision making

### Spellcasting System Implementation
- Comprehensive spell effect implementation
- Resource management for spell slots and components
- Area-of-effect calculation with target identification
- Dynamic spell effect narration based on context

### Item and Equipment System
- Inventory management with encumbrance rules
- Equipment system with attribute modifications
- Magical item implementation with proper effects
- Item interaction with resource consumption

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key (or other LLM provider)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/dnd-ai-dm.git
   cd dnd-ai-dm
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with your API keys:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. Build the project:
   ```
   npm run build
   ```

### Usage

Start the application:
```
npm start
```

For development with hot-reloading:
```
npm run dev
```

## Project Structure

```
dnd-ai-dm/
├── src/
│   ├── character/           # Character creation and management
│   ├── world/               # World and location management
│   ├── combat/              # Combat system
│   ├── magic/               # Spellcasting system
│   ├── items/               # Item and equipment system
│   ├── ai/                  # AI integration
│   ├── core/                # Core game engine
│   ├── utils/               # Utility functions
│   ├── data/                # Game data
│   ├── persistence/         # Save/load functionality
│   ├── ui/                  # User interface
│   └── index.ts             # Application entry point
├── test/                    # Test files
├── dist/                    # Compiled JavaScript
└── ...
```

## Testing

Run all tests:
```
npm test
```

Run specific test suites:
```
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Dungeons & Dragons is a trademark of Wizards of the Coast LLC
- This project is not affiliated with or endorsed by Wizards of the Coast 