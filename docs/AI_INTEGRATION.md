# AI Integration in D&D AI Dungeon Master

## Introduction

The D&D AI Dungeon Master application integrates large language models (LLMs) to power the narrative aspects of the game. This document provides an overview of the AI integration architecture, components, and usage patterns.

## Architecture Overview

The AI system is designed with the following principles:

1. **Modularity**: Different AI providers can be swapped in and out
2. **Abstraction**: High-level interfaces hide the complexity of AI interactions
3. **Security**: API keys are stored securely and never exposed
4. **Performance**: Caching and optimization reduce unnecessary API calls
5. **Resilience**: Error handling and recovery mechanisms ensure robustness

## Setup Instructions

### Prerequisites

Before you can use the real AI service, you need:

1. An API key for OpenAI or Anthropic (or both)
2. Node.js 16 or higher
3. npm or yarn package manager

### Configuration Steps

1. **Install Dependencies**

   Make sure you have all the required dependencies installed:

   ```bash
   npm install
   ```

2. **Configure Environment Variables**

   Copy the `.env.example` file to `.env`:

   ```bash
   cp .env.example .env
   ```

3. **Set Up API Keys**

   Edit the `.env` file and add your API keys:

   ```
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4

   # Anthropic Configuration
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ANTHROPIC_MODEL=claude-3-opus-20240229
   ```

   Alternatively, use the built-in setup script:

   ```bash
   npm run setup-ai-keys
   ```

4. **Test Your Configuration**

   Run the test script to verify your API keys are working correctly:

   ```bash
   npm run test:api-keys
   ```

## Core Components

### AI Service Layer

The `AIService` class is the main entry point for AI functionality in the application. It provides methods for generating text using templates or custom prompts.

Key features:
- Template-based generation for consistent outputs
- Response caching to reduce API calls
- Error handling and automatic retries
- Token usage tracking
- Configuration management

### Provider System

The provider system abstracts away the differences between various LLM providers:

- `OpenAIProvider`: Integrates with OpenAI's GPT models
- `AnthropicProvider`: Integrates with Anthropic's Claude models
- `MockProvider`: A local fallback for testing without API calls

Each provider implements the common `AIProvider` interface, making them interchangeable.

### Context Management

The `EnhancedContextManager` handles:

- Context window management to prevent exceeding token limits
- Relevance ranking of past interactions
- Memory decay for older information
- State summarization for efficient context usage

### Command Interpretation

The `CommandInterpreter` uses AI to parse natural language commands into structured actions:

- Maps natural language to game commands
- Handles ambiguous inputs
- Supports context-aware command resolution
- Falls back to simpler pattern matching when needed

## Components Implemented

### 1. Environment Configuration System
- Created `src/utils/env-loader.ts` to handle loading environment variables from `.env` files
- Implemented a singleton pattern for consistent access to configuration
- Added validation for required API keys and configuration values
- Created typed interfaces for configuration access
- Implemented fallback to default values when environment variables are missing

### 2. Real AI Service Implementation
- Created `src/ai/real-ai-service.ts` to integrate with OpenAI and Anthropic
- Implemented methods for:
  - Natural language command interpretation
  - Location description generation
  - NPC dialogue generation
  - Action narrative generation
  - Combat narrative generation
- Added proper error handling with fallbacks to simpler implementations
- Implemented context management for narrative consistency

### 3. Command Interpreter Enhancement
- Updated `src/ai/command-interpreter.ts` to support both SimpleAIService and RealAIService
- Implemented async/await pattern for API calls
- Added fallback to local interpretation when API calls fail
- Enhanced local interpretation with more sophisticated pattern matching

## Usage Examples

### Basic Text Generation

```typescript
import { AIService } from './ai/ai-service';

// Create an instance with default configuration
const aiService = new AIService();

// Generate a simple response
const response = await aiService.generateText('Describe a dark forest at midnight');
console.log(response);
```

### Template-Based Generation

```typescript
import { AIService } from './ai/ai-service';
import { TemplateType } from './ai/types';

const aiService = new AIService();

// Generate text using a predefined template
const description = await aiService.generateFromTemplate(
  TemplateType.LOCATION_DESCRIPTION,
  {
    locationName: 'The Misty Cavern',
    locationType: 'cave',
    atmosphere: 'mysterious and damp',
    pointsOfInterest: ['stalactites', 'underground pool', 'strange carvings']
  }
);
```

### NPC Dialogue Generation

```typescript
import { AIService } from './ai/ai-service';
import { NPCPersonality } from './core/interfaces';

const aiService = new AIService();

// NPC personality definition
const personality: NPCPersonality = {
  traits: {
    openness: 0.8,
    conscientiousness: 0.3,
    extraversion: 0.9,
    agreeableness: 0.2,
    neuroticism: 0.7
  },
  background: 'Former soldier turned tavern keeper',
  goals: ['Protect the village', 'Make enough gold to retire'],
  secrets: ['Knows the location of a hidden treasure']
};

// Generate dialogue based on NPC personality and context
const dialogue = await aiService.generateNPCDialogue(
  'Barkeep',
  personality,
  'The player asks about rumors of a dragon in the nearby mountains',
  ['The barkeep has heard rumors from travelers', 'The barkeep is concerned about village safety']
);
```

## Error Handling

The AI integration includes robust error handling:

1. **Request Failures**: Automatically retries failed requests with exponential backoff
2. **API Key Issues**: Provides clear error messages for authentication problems
3. **Context Limitations**: Handles context overflow by summarizing or truncating as needed
4. **Fallback Chain**: Falls back to simpler models or mock responses when primary models fail

Example:

```typescript
try {
  const response = await aiService.generateText('Complex prompt...');
  console.log(response);
} catch (error) {
  if (error instanceof AIServiceError) {
    // Handle specific AI service errors
    console.error(`AI Error (${error.code}): ${error.message}`);
    
    // Use fallback if available
    if (error.fallbackResponse) {
      console.log(`Using fallback: ${error.fallbackResponse}`);
    }
  } else {
    // Handle other errors
    console.error('Unexpected error:', error);
  }
}
```

## Performance Optimization

### Caching

The AI service includes a caching system to avoid redundant API calls:

```typescript
// With caching enabled (default)
const aiService = new AIService({ enableCaching: true });

// First call to the API
const response1 = await aiService.generateText('Tell me about dragons');

// This will use the cached response instead of making a new API call
const response2 = await aiService.generateText('Tell me about dragons');
```

### Batching

For multiple related queries, use batching to reduce API calls:

```typescript
const results = await aiService.batchGenerate([
  'Describe a forest',
  'Describe a mountain',
  'Describe a river'
]);
```

## Troubleshooting

### Common Issues and Solutions

1. **API Key Not Working**
   - Verify the key is correctly set in the `.env` file
   - Check for whitespace or extra characters in the key
   - Ensure you have sufficient credits/quota with the provider

2. **Slow Response Times**
   - Check your internet connection
   - Consider using a smaller model for faster responses
   - Ensure prompt templates are optimized for efficiency

3. **Poor Quality Responses**
   - Review prompt templates for clarity and structure
   - Adjust temperature settings (lower for more deterministic outputs)
   - Consider using a more capable model for complex tasks

4. **Rate Limiting Errors**
   - Implement request queuing and delays between requests
   - Use the built-in rate limiting features of the AI service
   - Consider upgrading your API tier with the provider

## Support and Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference)
- Project Discord: [Join our community](https://discord.gg/dndaidm) 