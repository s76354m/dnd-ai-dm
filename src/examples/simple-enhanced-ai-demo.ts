/**
 * Simple Enhanced AI Demo
 * 
 * This is a standalone example that demonstrates the core functionality
 * of the enhanced AI integration without requiring the entire codebase
 * to compile. It directly uses the AIService to generate content.
 */

import { AIService, AIResponse } from '../config/ai-service';
import { AIProvider, AIComponent } from '../config/ai-config';

// Simple implementation of a prompt template
interface PromptTemplate {
  formatPrompt(context: any): string;
}

class SimpleLocationTemplate implements PromptTemplate {
  formatPrompt(context: any): string {
    const { name, type, mood, terrain } = context;
    return `Generate a detailed description for a D&D location with the following characteristics:
Name: ${name}
Type: ${type}
Mood: ${mood}
Terrain: ${terrain}

The description should be vivid and evocative, suitable for a Dungeon Master to read to players.`;
  }
}

class SimpleNPCTemplate implements PromptTemplate {
  formatPrompt(context: any): string {
    const { name, race, occupation, personality } = context;
    return `Create a detailed NPC description for a D&D character with the following traits:
Name: ${name}
Race: ${race}
Occupation: ${occupation}
Personality: ${personality}

Include physical appearance, mannerisms, and a brief background.`;
  }
}

class SimpleCombatTemplate implements PromptTemplate {
  formatPrompt(context: any): string {
    const { attacker, defender, action, result } = context;
    return `Narrate the following combat action in a dramatic and vivid way:
Attacker: ${attacker}
Defender: ${defender}
Action: ${action}
Result: ${result}

The narration should be exciting and detailed, describing the movements, impacts, and reactions.`;
  }
}

// Simple enhanced content generator
class SimpleEnhancedGenerator {
  private aiService: AIService;
  private provider: AIProvider;
  
  constructor() {
    // Determine provider from environment
    this.provider = (process.env.AI_PROVIDER?.toLowerCase() === 'anthropic') 
      ? 'anthropic' as AIProvider 
      : 'openai' as AIProvider;
    
    console.log(`Using AI provider: ${this.provider}`);
    
    // Get API keys from environment
    const openaiKey = process.env.OPENAI_API_KEY || '';
    const anthropicKey = process.env.ANTHROPIC_API_KEY || '';
    
    if (this.provider === 'openai' && !openaiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    if (this.provider === 'anthropic' && !anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    
    // Get model configuration
    const temperature = parseFloat(process.env.AI_TEMPERATURE || '0.7');
    const maxTokens = parseInt(process.env.AI_MAX_TOKENS || '500', 10);
    const debug = process.env.AI_DEBUG === 'true';
    
    // Get OpenAI models
    const openaiDmModel = process.env.OPENAI_DM_MODEL || 'gpt-4o-mini';
    const openaiStoryModel = process.env.OPENAI_STORY_MODEL || 'gpt-4o-mini';
    const openaiNpcModel = process.env.OPENAI_NPC_MODEL || 'gpt-4o-mini';
    const openaiCombatModel = process.env.OPENAI_COMBAT_MODEL || 'gpt-4o-mini';
    const openaiQuestModel = process.env.OPENAI_QUEST_MODEL || 'gpt-4o-mini';
    
    // Get Anthropic models
    const anthropicDmModel = process.env.ANTHROPIC_DM_MODEL || 'claude-3-5-sonnet-latest';
    const anthropicStoryModel = process.env.ANTHROPIC_STORY_MODEL || 'claude-3-5-sonnet-latest';
    const anthropicNpcModel = process.env.ANTHROPIC_NPC_MODEL || 'claude-3-5-sonnet-latest';
    const anthropicCombatModel = process.env.ANTHROPIC_COMBAT_MODEL || 'claude-3-5-sonnet-latest';
    const anthropicQuestModel = process.env.ANTHROPIC_QUEST_MODEL || 'claude-3-5-sonnet-latest';
    
    // Initialize AI service with configuration
    this.aiService = new AIService({
      provider: this.provider,
      openai: {
        apiKey: openaiKey,
        organization: process.env.OPENAI_ORGANIZATION || '',
        models: {
          dm: openaiDmModel,
          story: openaiStoryModel,
          npc: openaiNpcModel,
          combat: openaiCombatModel,
          quest: openaiQuestModel
        },
        defaultModel: openaiDmModel
      },
      anthropic: {
        apiKey: anthropicKey,
        models: {
          dm: anthropicDmModel,
          story: anthropicStoryModel,
          npc: anthropicNpcModel,
          combat: anthropicCombatModel,
          quest: anthropicQuestModel
        },
        defaultModel: anthropicDmModel
      },
      temperature,
      maxTokens,
      debug
    });
    
    console.log(`AI service initialized with ${this.provider} provider`);
    console.log(`Using temperature: ${temperature}, maxTokens: ${maxTokens}`);
  }
  
  async generateLocation(context: any): Promise<string> {
    const template = new SimpleLocationTemplate();
    const prompt = template.formatPrompt(context);
    
    console.log('Sending location generation prompt to AI service...');
    
    try {
      const response = await this.aiService.generateCompletion(
        prompt,
        'story' as AIComponent,
        {
          temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
          maxTokens: parseInt(process.env.AI_MAX_TOKENS || '500', 10),
          systemPrompt: 'You are a skilled Dungeon Master creating vivid location descriptions for a D&D campaign.'
        }
      );
      
      console.log(`Response received from ${response.provider} model: ${response.model}`);
      if (response.tokenUsage) {
        console.log(`Token usage: ${JSON.stringify(response.tokenUsage)}`);
      }
      
      return response.text;
    } catch (error) {
      console.error('Error generating location:', error);
      return `A ${context.mood} ${context.type} with ${context.terrain} terrain.`;
    }
  }
  
  async generateNPC(context: any): Promise<string> {
    const template = new SimpleNPCTemplate();
    const prompt = template.formatPrompt(context);
    
    console.log('Sending NPC generation prompt to AI service...');
    
    try {
      const response = await this.aiService.generateCompletion(
        prompt,
        'npc' as AIComponent,
        {
          temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
          maxTokens: parseInt(process.env.AI_MAX_TOKENS || '500', 10),
          systemPrompt: 'You are a skilled Dungeon Master creating memorable NPCs for a D&D campaign.'
        }
      );
      
      console.log(`Response received from ${response.provider} model: ${response.model}`);
      if (response.tokenUsage) {
        console.log(`Token usage: ${JSON.stringify(response.tokenUsage)}`);
      }
      
      return response.text;
    } catch (error) {
      console.error('Error generating NPC:', error);
      return `A ${context.race} ${context.occupation} named ${context.name}.`;
    }
  }
  
  async generateCombatNarration(context: any): Promise<string> {
    const template = new SimpleCombatTemplate();
    const prompt = template.formatPrompt(context);
    
    console.log('Sending combat narration prompt to AI service...');
    
    try {
      const response = await this.aiService.generateCompletion(
        prompt,
        'combat' as AIComponent,
        {
          temperature: parseFloat(process.env.AI_TEMPERATURE || '0.8'),
          maxTokens: parseInt(process.env.AI_MAX_TOKENS || '300', 10),
          systemPrompt: 'You are a skilled Dungeon Master narrating exciting combat for a D&D campaign.'
        }
      );
      
      console.log(`Response received from ${response.provider} model: ${response.model}`);
      if (response.tokenUsage) {
        console.log(`Token usage: ${JSON.stringify(response.tokenUsage)}`);
      }
      
      return response.text;
    } catch (error) {
      console.error('Error generating combat narration:', error);
      return `${context.attacker} attacks ${context.defender} with ${context.action}.`;
    }
  }
}

// Example usage
async function runSimpleDemo() {
  try {
    console.log('Initializing Enhanced AI Generator...');
    const generator = new SimpleEnhancedGenerator();
    
    console.log('\n=== Enhanced Location Generation ===');
    console.log('Generating description for "The Silver Dragon Inn"...');
    const locationDescription = await generator.generateLocation({
      name: 'The Silver Dragon Inn',
      type: 'tavern',
      mood: 'cozy',
      terrain: 'urban'
    });
    console.log('\nResult:');
    console.log(locationDescription);
    console.log('\n');
    
    console.log('=== Enhanced NPC Generation ===');
    console.log('Generating description for "Durnan Bronzebottom"...');
    const npcDescription = await generator.generateNPC({
      name: 'Durnan Bronzebottom',
      race: 'dwarf',
      occupation: 'innkeeper',
      personality: 'gruff but kind-hearted'
    });
    console.log('\nResult:');
    console.log(npcDescription);
    console.log('\n');
    
    console.log('=== Enhanced Combat Narration ===');
    console.log('Generating combat narration...');
    const combatNarration = await generator.generateCombatNarration({
      attacker: 'Thordak the Barbarian',
      defender: 'Goblin Scout',
      action: 'greataxe attack',
      result: 'critical hit for 24 damage, killing the goblin'
    });
    console.log('\nResult:');
    console.log(combatNarration);
  } catch (error) {
    console.error('Error running demo:', error);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runSimpleDemo().catch(console.error);
}

export { SimpleEnhancedGenerator, runSimpleDemo }; 