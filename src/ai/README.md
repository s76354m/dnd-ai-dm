# AI Integration Module

## Overview

The AI Integration module provides a comprehensive framework for integrating large language models (LLMs) into the D&D AI Dungeon Master application. This module handles API key management, provider integration, template management, and high-level services for generating narrative content.

## Architecture

The AI Integration module is organized into several key components:

```
src/ai/
├── interfaces/             # Core interfaces for AI services
├── providers/              # Provider-specific implementations
│   ├── openai/             # OpenAI integration
│   └── anthropic/          # Anthropic integration
├── config/                 # Configuration management
├── prompts/                # Prompt template system
└── ai-service-wrapper.ts   # High-level service wrapper
```

## Key Components

### AI Service Wrapper

The `AIService` class is the main entry point for AI functionality in the application. It provides a high-level interface for generating text using templates or custom prompts, with features like caching and error recovery.

```typescript
// Get the AI service instance
const aiService = await AIService.getInstance();

// Generate text from a template
const response = await aiService.generateFromTemplate(
  'narrative.scene_description',
  { scene: 'forest clearing', mood: 'peaceful' }
);

// Generate text from a custom prompt
const customResponse = await aiService.generate(
  'Describe a battle between a dragon and a knight'
);
```

### Provider System

The provider system allows for easy switching between different AI providers like OpenAI and Anthropic, with a consistent interface:

```typescript
// The factory creates the appropriate provider based on configuration
const provider = ProviderFactory.createProvider({
  provider: 'openai',
  openai: {
    apiKey: 'your-api-key',
    defaultModel: 'gpt-4'
  }
});

// All providers implement the same interface
const response = await provider.generateText('Your prompt here', {
  temperature: 0.7,
  maxTokens: 500
});
```

### Prompt Template System

The prompt template system manages templates for different types of AI prompts, with variable substitution:

```typescript
// Get the template manager
const templateManager = PromptTemplateManager.getInstance();

// Render a template with variables
const renderedPrompt = templateManager.renderTemplate(
  'narrative.scene_description',
  { scene: 'forest clearing', mood: 'peaceful' }
);

// Create a custom template on the fly
const customTemplate = templateManager.createCustomTemplate(
  'Describe {{location}} during {{timeOfDay}}',
  { location: 'castle', timeOfDay: 'sunset' }
);
```

### Configuration Management

The configuration system manages AI settings and securely stores API keys:

```typescript
// Get the config manager
const configManager = AIConfigManager.getInstance();

// Update configuration
configManager.updateConfig({
  provider: 'anthropic',
  defaultModels: {
    dm: 'claude-2'
  }
});

// Set API key
await configManager.setApiKey('anthropic', 'your-api-key');
```

## Setup and Usage

### Setting Up API Keys

Before using the AI features, you need to set up API keys for the providers you want to use:

```bash
# Run the setup utility
npm run setup-ai-keys
```

This will guide you through the process of setting up API keys for OpenAI and/or Anthropic.

### Running the Narrative Example

To see the AI narrative generation in action, run the narrative example:

```bash
npm run narrative-example
```

This will demonstrate scene descriptions, NPC dialogue, and action responses using the AI service.

## Customizing Templates

The prompt templates can be customized by:

1. Exporting the built-in templates to files
2. Modifying the template files in the `templates/prompts` directory
3. Adding new templates for specific use cases

```typescript
// Export all templates to files
const templateManager = PromptTemplateManager.getInstance();
const exportedCount = templateManager.exportAllTemplates();
console.log(`Exported ${exportedCount} templates`);
```

## Error Handling

The AI service includes error handling and retry logic for robustness:

1. Connection issues to the AI providers are automatically retried
2. Token limits are handled gracefully
3. Configuration errors are reported with clear messages
4. API key issues provide guidance for resolution

## Extending with New Providers

To add a new AI provider:

1. Implement the `AIProvider` interface for the new provider
2. Add the provider type to `ProviderType` in `provider-factory.ts`
3. Update the `ProviderFactoryConfig` interface
4. Add the new provider to the `createProvider` method

## Security Considerations

The AI module implements several security best practices:

1. API keys are stored securely using encryption
2. Environment variables are supported for CI/CD environments
3. API keys are never exposed in logs or error messages
4. Configuration is stored in the user's home directory, not the application directory 