# D&D AI Dungeon Master - Setup Guide

Welcome to the D&D AI Dungeon Master! This guide will help you set up and start using the application to run your own AI-powered D&D campaigns.

## Table of Contents
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [API Key Configuration](#api-key-configuration)
- [Running the Application](#running-the-application)
- [Quick Start Guide](#quick-start-guide)
- [Troubleshooting](#troubleshooting)

## System Requirements

Before installing the D&D AI Dungeon Master, ensure your system meets the following requirements:

- **Node.js**: Version 16.x or higher
- **NPM**: Version 8.x or higher
- **Memory**: At least 4GB RAM
- **Disk Space**: 500MB free space
- **Operating System**: Windows 10/11, macOS (10.15+), or Linux
- **Internet Connection**: Required for AI service API calls

## Installation

Follow these steps to install the D&D AI Dungeon Master:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/dnd-ai-dm.git
   cd dnd-ai-dm
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Build the Application**

   ```bash
   npm run build
   ```

## API Key Configuration

The D&D AI Dungeon Master uses AI services to power its narrative generation and enemy decision-making. Currently, it supports the following providers:

- OpenAI (GPT models)
- Anthropic (Claude models)

You will need at least one API key to use these services.

### Setting Up Your API Keys

1. **Obtain API Keys**
   
   - For OpenAI: Sign up at [https://platform.openai.com](https://platform.openai.com) and create an API key.
   - For Anthropic: Sign up at [https://www.anthropic.com](https://www.anthropic.com) and request API access.

2. **Configure Keys Using the Setup Tool**

   Run the API key setup utility:
   
   ```bash
   npm run setup-ai-keys
   ```
   
   This interactive utility will guide you through the process of securely storing your API keys.

3. **Alternative: Environment Variables**

   You can also set up your API keys using environment variables:
   
   ```bash
   # For OpenAI
   export OPENAI_API_KEY=your_openai_key_here
   
   # For Anthropic
   export ANTHROPIC_API_KEY=your_anthropic_key_here
   ```
   
   On Windows, use `set` instead of `export`.

4. **Verify API Key Configuration**

   To ensure your API keys are correctly configured, run:
   
   ```bash
   npm run narrative-example
   ```
   
   This will generate a sample narrative to verify your AI service is working properly.

## Running the Application

There are several ways to start using the D&D AI Dungeon Master:

### Start a New Campaign

```bash
npm start
```

This will launch the main application, which will guide you through character creation and start a new campaign.

### Run the Combat Example

```bash
npm run combat-example
```

This will run a sample combat scenario that demonstrates the AI-enhanced tactical decision-making and narrative generation systems.

### Run the Narrative Example

```bash
npm run narrative-example
```

This will demonstrate the AI-powered narrative generation without starting a full game.

## Quick Start Guide

### Character Creation

When you start the application, you'll first create a character:

1. Enter your character's name when prompted
2. Select a race (e.g., human, elf, dwarf)
3. Choose a class (e.g., fighter, wizard, rogue)
4. Allocate ability scores
5. Select a background
6. Review and confirm your character

### Basic Commands

Once your game begins, you can use these commands:

- `look` or `look around`: Examine your surroundings
- `move [direction]`: Move in a direction (north, south, east, west)
- `talk to [npc]`: Initiate conversation with an NPC
- `examine [object]`: Look at something specific
- `inventory`: View your items
- `equip [item]`: Equip an item
- `attack [target]`: Initiate combat with a target
- `cast [spell] at [target]`: Cast a spell
- `use [item]`: Use an item
- `rest`: Rest to recover hit points
- `help`: Show available commands

### Combat Basics

During combat:

1. Initiative is rolled automatically
2. On your turn, you can take an action (attack, cast spell, use item)
3. Enemies will use AI to make tactical decisions
4. Combat continues until one side is defeated or flees

### Saving and Loading

- Your game automatically saves after significant events
- To manually save: use the `save` command
- To load a saved game: select "Continue Game" when starting the application

## Troubleshooting

### Common Issues

**Error: API key not configured**
- Make sure you've run `npm run setup-ai-keys` or set the appropriate environment variables

**Error: Could not connect to AI service**
- Check your internet connection
- Verify your API key is correct and has not expired
- Ensure you have sufficient API credits

**Game crashes during play**
- Check the error logs in `logs/error.log`
- Try updating to the latest version
- Ensure your system meets the minimum requirements

### Getting Help

If you encounter issues not covered in this guide:

1. Check the full documentation in the `docs` directory
2. Look for similar issues in the GitHub repository
3. Create a new issue with detailed information about the problem

## Additional Resources

- [Full Documentation](./README.md)
- [AI Integration Guide](./AI_INTEGRATION.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [D&D 5e SRD Reference](https://dnd.wizards.com/resources/systems-reference-document)

---

Thank you for using the D&D AI Dungeon Master! Enjoy your adventures! 