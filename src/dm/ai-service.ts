import { AIService as BaseAIService, AIResponse } from '../config/ai-service';
import { GameState } from '../core/interfaces/game';
import { NPC } from '../core/interfaces/npc';
import { appConfig } from '../config';

// DialogueNode interface for NPC conversations
interface DialogueNode {
  id: string;
  text: string;
  responses?: { id: string; text: string }[];
}

/**
 * Maximum number of retries for AI requests
 */
const MAX_RETRIES = 2;

/**
 * Delay between retries in milliseconds
 */
const RETRY_DELAY_MS = 1000;

/**
 * AI Service for the Dungeon Master
 * 
 * Extends the base AI service with game-specific functionality
 */
export class AIService extends BaseAIService {
  /**
   * Generate a narrative response based on the game state and user input
   */
  public async generateNarrative(gameState: GameState, playerInput: string): Promise<string> {
    const prompt = this.createNarrativePrompt(gameState, playerInput);
    
    try {
      const response = await this.retryOperation(() => 
        this.generateCompletion(
          prompt,
          'dm',
          {
            systemPrompt: 'You are a skilled Dungeon Master narrating a text-based D&D adventure. Provide vivid, immersive responses to player actions that move the story forward.',
            temperature: appConfig.aiCreativity
          }
        )
      );
      
      return response.text;
    } catch (error: any) {
      console.error('Error generating narrative:', error);
      return 'The DM ponders for a moment... (Error generating narrative)';
    }
  }
  
  /**
   * Create a prompt for narrative generation
   */
  private createNarrativePrompt(context: GameState, input: string): string {
    // Construct the prompt with relevant game state
    const currentLocation = context.currentLocation;
    const player = context.player;
    
    return `
Current situation:
- Location: ${currentLocation.name} (${currentLocation.description})
- Character: ${player.name}, Level ${player.level} ${player.race} ${player.class}
- Active quests: ${context.activeQuests.map(q => q.title).join(', ') || 'None'}
- NPCs present: ${currentLocation.npcs?.map(n => n.name).join(', ') || 'None'}

Story complexity level: ${appConfig.storyComplexity}

Player input: ${input}

Respond as the Dungeon Master narrating the results of this action or answering the player's question. Be descriptive and immersive.
`.trim();
  }
  
  /**
   * Generate dialogue for an NPC
   */
  public async generateDialogue(npc: NPC, context: string, playerInput: string): Promise<DialogueNode> {
    const prompt = `
Generate dialogue for an NPC with the following details:
- Name: ${npc.name}
- Description: ${npc.description}
- Race: ${npc.race}
- Attitude: ${npc.attitude}

Context: ${context}

Player says: "${playerInput}"

Respond with only the NPC's dialogue.
`.trim();
    
    try {
      const response = await this.retryOperation(() => 
        this.generateCompletion(
          prompt,
          'npc',
          {
            systemPrompt: 'You are an NPC in a D&D game. Respond in character with authentic dialogue that reflects your personality and role.',
            temperature: 0.8
          }
        )
      );
      
      // Check if this dialogue might be offering a quest
      const isQuestOffer = response.text.toLowerCase().includes('quest') || 
                           response.text.toLowerCase().includes('task') ||
                           response.text.toLowerCase().includes('mission') ||
                           response.text.toLowerCase().includes('help me');
      
      // Convert response to DialogueNode format
      return {
        id: `dialogue-${Date.now()}`,
        text: response.text,
        responses: isQuestOffer ? [
          { id: 'accept', text: 'Accept' },
          { id: 'decline', text: 'Decline' }
        ] : undefined
      };
    } catch (error: any) {
      console.error('Error generating dialogue:', error);
      return {
        id: 'error',
        text: `*${npc.name} seems unable to respond at the moment.*`,
        responses: [
          { id: 'retry', text: 'Try again' }
        ]
      };
    }
  }
  
  /**
   * Generate NPC dialogue based on personality and context
   * 
   * @param npc The NPC for which to generate dialogue
   * @param prompt A detailed prompt including personality and context
   * @returns The generated dialogue text
   */
  public async generateNPCDialogue(npc: NPC, prompt: string): Promise<string> {
    try {
      const response = await this.retryOperation(() => 
        this.generateCompletion(
          prompt,
          'npc',
          {
            systemPrompt: 'You are a character in a D&D game. Generate realistic, in-character dialogue that reflects the provided personality traits and context.',
            temperature: 0.8
          }
        )
      );
      
      // Clean up response to ensure it's just the dialogue
      let dialogue = response.text.trim();
      
      // If the response includes the NPC's name as a prefix or quotes, strip them out
      if (dialogue.startsWith(`${npc.name}:`)) {
        dialogue = dialogue.substring(npc.name.length + 1).trim();
      }
      
      // Remove surrounding quotes if present
      if ((dialogue.startsWith('"') && dialogue.endsWith('"')) || 
          (dialogue.startsWith('"') && dialogue.endsWith('"'))) {
        dialogue = dialogue.substring(1, dialogue.length - 1).trim();
      }
      
      return dialogue;
    } catch (error: any) {
      console.error('Error generating NPC dialogue:', error);
      throw new Error(`Failed to generate dialogue for ${npc.name}: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Generate response options for player dialogue
   * 
   * @param prompt The prompt explaining what response options are needed
   * @returns Text with each response option on a new line
   */
  public async generateResponseOptions(prompt: string): Promise<string> {
    try {
      const response = await this.retryOperation(() => 
        this.generateCompletion(
          prompt,
          'npc',
          {
            systemPrompt: 'You are generating dialogue options for a player in a D&D game. Create natural, conversational responses that give players meaningful choices.',
            temperature: 0.7
          }
        )
      );
      
      return response.text.trim();
    } catch (error: any) {
      console.error('Error generating response options:', error);
      throw new Error(`Failed to generate response options: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Generate a location description
   */
  public async generateLocationDescription(locationName: string, contextDetails: string[]): Promise<string> {
    const prompt = `
Create a vivid, atmospheric description of the following location: ${locationName}.

Additional context: ${contextDetails.join(', ')}

Description:
`.trim();
    
    try {
      const response = await this.retryOperation(() => 
        this.generateCompletion(
          prompt,
          'story',
          {
            systemPrompt: 'You are a descriptive fantasy writer creating rich, immersive location descriptions for a D&D game.',
            temperature: 0.7
          }
        )
      );
      
      return response.text;
    } catch (error: any) {
      console.error('Error generating location description:', error);
      // In case of failure, throw the error to let the caller handle it
      // The WorldGenerator will provide a fallback description
      throw new Error(`Failed to generate location description: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Generate a combat narration
   */
  public async generateCombatNarration(action: string, result: string, context: string): Promise<string> {
    const prompt = `
Narrate the following combat action in a vivid, exciting way:

Situation: ${context}
Action: ${action}
Result: ${result}

Narration:
`.trim();
    
    try {
      const response = await this.retryOperation(() => 
        this.generateCompletion(
          prompt,
          'combat',
          {
            systemPrompt: 'You are a combat narrator for a D&D game. Create exciting, cinematic descriptions of combat actions.',
            temperature: 0.8
          }
        )
      );
      
      return response.text;
    } catch (error: any) {
      console.error('Error generating combat narration:', error);
      return `${action}. ${result}`;
    }
  }
  
  /**
   * Generate a quest
   */
  public async generateQuest(playerLevel: number, playerClass: string, context: string): Promise<string> {
    const prompt = `
Generate a D&D quest appropriate for a level ${playerLevel} ${playerClass} character.

Context: ${context}

Quest requirements:
- Should be appropriate for the character's level
- Should have clear objectives and rewards
- Should fit thematically with the current location
- Should be completable within a single session
- Complexity level: ${appConfig.storyComplexity}

Format the quest with:
- A title
- A brief description
- 2-3 objectives
- Rewards (gold, items, experience)
- Any relevant NPCs

Quest:
`.trim();
    
    try {
      const response = await this.retryOperation(() => 
        this.generateCompletion(
          prompt,
          'quest',
          {
            systemPrompt: 'You are a quest designer for a D&D game. Create engaging, balanced quests appropriate for the player character.',
            temperature: 0.7
          }
        )
      );
      
      return response.text;
    } catch (error: any) {
      console.error('Error generating quest:', error);
      return `
# Simple Fetch Quest

A basic quest to retrieve a lost item.

## Objectives
- Find the lost item in a nearby location
- Return it to the quest giver

## Rewards
- 50 gold pieces
- 100 XP
`.trim();
    }
  }
  
  /**
   * Helper method to retry an operation with exponential backoff
   */
  private async retryOperation<T>(operation: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
    // Initialize lastError with a default Error
    let lastError: Error = new Error('Unknown error occurred');
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        // Handle unknown error type safely
        const errorMessage = error?.message || 'Unknown error';
        console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}):`, errorMessage);
        
        // Update lastError, ensuring it's an Error object
        if (error instanceof Error) {
          lastError = error;
        } else {
          lastError = new Error(errorMessage);
        }
        
        // Don't wait after the last attempt
        if (attempt < maxRetries) {
          // Exponential backoff with jitter
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all retries failed
    throw lastError;
  }
} 