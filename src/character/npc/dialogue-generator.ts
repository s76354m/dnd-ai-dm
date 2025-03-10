/**
 * Dialogue Generator
 * 
 * Uses AI to dynamically generate NPC dialogue based on personality, memory,
 * and context. This bridges the static dialogue tree system with dynamic AI responses.
 */

import { AIService } from '../../dm/ai-service';
import { NPC, NPCMemory, NPCPersonality } from '../../core/interfaces/npc';
import { DialogueNode, DialogueResponse } from '../../core/interfaces/quest';
import { Character } from '../../core/interfaces/character';
import { GameState } from '../../core/interfaces/game';

export class DialogueGenerator {
  private aiService: AIService;
  
  constructor(aiService: AIService) {
    this.aiService = aiService;
  }
  
  /**
   * Generate a dynamic dialogue node for an NPC
   * 
   * @param npc The NPC to generate dialogue for
   * @param player The player character
   * @param context The current game state/context
   * @param previousDialogue Previous conversation history (if any)
   * @param topic Optional topic to focus the dialogue on
   */
  public async generateDialogueNode(
    npc: NPC, 
    player: Character,
    context: Partial<GameState>,
    previousDialogue: string[] = [],
    topic?: string
  ): Promise<DialogueNode> {
    // Build the prompt for the AI
    const prompt = this.buildDialoguePrompt(npc, player, context, previousDialogue, topic);
    
    try {
      // Generate the dialogue text using AI
      const dialogueText = await this.aiService.generateNPCDialogue(npc, prompt);
      
      // Generate response options based on the dialogue and context
      const responses = await this.generateResponseOptions(npc, dialogueText, topic);
      
      // Create a unique ID for this dialogue node
      const nodeId = `dynamic-${npc.id}-${Date.now()}`;
      
      // Create the dialogue node
      const dialogueNode: DialogueNode = {
        id: nodeId,
        text: dialogueText,
        npcId: npc.id,
        responses,
        tags: topic ? [topic] : undefined
      };
      
      return dialogueNode;
    } catch (error) {
      console.error(`Error generating dialogue for ${npc.name}:`, error);
      
      // Fallback dialogue if AI generation fails
      return this.generateFallbackDialogue(npc, topic);
    }
  }
  
  /**
   * Build a detailed prompt for the AI to generate dialogue
   */
  private buildDialoguePrompt(
    npc: NPC,
    player: Character,
    context: Partial<GameState>,
    previousDialogue: string[],
    topic?: string
  ): string {
    // Include NPC information
    let prompt = `Generate dialogue for ${npc.name}, a ${npc.race} ${npc.occupation || ''}.\n\n`;
    
    // Add personality details if available
    if (npc.personality) {
      prompt += this.formatPersonalityPrompt(npc.personality);
    }
    
    // Add player information
    prompt += `The player character is ${player.name}, a level ${player.level} ${player.race} ${player.class}.\n\n`;
    
    // Add context about the location and time
    if (context.currentLocation) {
      prompt += `Current location: ${context.currentLocation.name}, ${context.currentLocation.description}\n`;
    }
    
    // Add relationship context if available
    if (npc.memory) {
      prompt += this.formatMemoryPrompt(npc.memory);
    }
    
    // Add conversation history
    if (previousDialogue.length > 0) {
      prompt += `\nRecent conversation:\n${previousDialogue.join('\n')}\n`;
    }
    
    // Add topic focus if specified
    if (topic) {
      prompt += `\nThe conversation is about: ${topic}\n`;
    }
    
    // Add instruction for the response format
    prompt += `\nRespond as ${npc.name} with a single coherent statement or question. Keep the response between 1-3 sentences. Make it sound natural and conversational while reflecting the character's personality and attitude.`;
    
    return prompt;
  }
  
  /**
   * Format NPC personality details for the prompt
   */
  private formatPersonalityPrompt(personality: NPCPersonality): string {
    let details = 'Personality traits:\n';
    
    details += `- Primary trait: ${personality.primaryTrait}\n`;
    details += `- Secondary trait: ${personality.secondaryTrait}\n`;
    
    if (personality.flaws.length > 0) {
      details += `- Flaws: ${personality.flaws.join(', ')}\n`;
    }
    
    if (personality.values.length > 0) {
      details += `- Values: ${personality.values.join(', ')}\n`;
    }
    
    if (personality.motivations.length > 0) {
      details += `- Motivations: ${personality.motivations.join(', ')}\n`;
    }
    
    if (personality.speechPattern) {
      details += `- Speech pattern: ${personality.speechPattern}\n`;
    }
    
    return details + '\n';
  }
  
  /**
   * Format NPC memory details for the prompt
   */
  private formatMemoryPrompt(memory: NPCMemory): string {
    let details = 'Relationship context:\n';
    
    // Format relationship as text
    let relationshipText = 'neutral toward';
    if (memory.relationship > 5) {
      relationshipText = 'very friendly toward';
    } else if (memory.relationship > 0) {
      relationshipText = 'friendly toward';
    } else if (memory.relationship < -5) {
      relationshipText = 'hostile toward';
    } else if (memory.relationship < 0) {
      relationshipText = 'unfriendly toward';
    }
    
    details += `- NPC is ${relationshipText} the player\n`;
    
    // Add context about previous interactions
    if (memory.interactionCount > 1) {
      details += `- This is interaction #${memory.interactionCount} with the player\n`;
    } else {
      details += `- This is the first time meeting the player\n`;
    }
    
    // Add quest context
    if (memory.questsGiven.length > 0) {
      details += `- Has given quests to the player in the past\n`;
    }
    
    if (memory.questsCompleted.length > 0) {
      details += `- Player has completed quests for this NPC\n`;
    }
    
    // Add significant memory events
    if (memory.playerActions.length > 0) {
      details += '- Memorable events:\n';
      
      // Get the 3 most significant/recent events
      const significantEvents = [...memory.playerActions]
        .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
        .slice(0, 3);
      
      for (const event of significantEvents) {
        details += `  * ${event.description} (${event.impact > 0 ? 'positive' : 'negative'} impact)\n`;
      }
    }
    
    return details + '\n';
  }
  
  /**
   * Generate response options for a dialogue node
   */
  private async generateResponseOptions(
    npc: NPC,
    dialogueText: string,
    topic?: string
  ): Promise<DialogueResponse[]> {
    try {
      // Base responses that are always available
      const baseResponses: DialogueResponse[] = [{
        id: `goodbye-${Date.now()}`,
        text: 'Goodbye.',
        nextNodeId: 'END',
        isGoodbye: true
      }];
      
      // Generate dynamic responses based on the dialogue
      const prompt = `
The NPC ${npc.name} just said: "${dialogueText}"

Generate 2-3 different response options that the player could say in reply. 
Each response should:
1. Be natural conversational dialogue (not narration)
2. Be different in tone/intent from the others
3. Be 1-2 sentences at most
4. Reflect different possible player approaches (friendly, neutral, or direct)
5. Be appropriate as a response to what the NPC just said

Format each response on a new line, just the dialogue text without labeling or numbering them.
`;
      
      // Call the AI service to generate responses
      const responseText = await this.aiService.generateResponseOptions(prompt);
      
      // Parse the responses
      const responseLines = responseText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && line.length < 100); // Filter out any weird formatting
      
      // Convert to DialogueResponse objects
      const dynamicResponses = responseLines.map((text, index) => ({
        id: `dynamic-response-${Date.now()}-${index}`,
        text,
        nextNodeId: `dynamic-followup-${npc.id}-${Date.now()}-${index}`,
        // Guesstimate the relationship effect based on the text sentiment
        relationshipEffect: this.estimateRelationshipEffect(text)
      }));
      
      // Combine base and dynamic responses
      return [...dynamicResponses, ...baseResponses];
    } catch (error) {
      console.error(`Error generating response options:`, error);
      
      // Fallback responses if generation fails
      return [
        {
          id: `fallback-positive-${Date.now()}`,
          text: 'That sounds interesting. Tell me more.',
          nextNodeId: `dynamic-followup-${npc.id}-${Date.now()}-0`,
          relationshipEffect: 1
        },
        {
          id: `fallback-neutral-${Date.now()}`,
          text: 'I understand.',
          nextNodeId: `dynamic-followup-${npc.id}-${Date.now()}-1`,
          relationshipEffect: 0
        },
        {
          id: `fallback-goodbye-${Date.now()}`,
          text: 'I should be going now.',
          nextNodeId: 'END',
          isGoodbye: true
        }
      ];
    }
  }
  
  /**
   * Estimate relationship effect of a response based on keywords
   * This is a very simple sentiment analysis
   */
  private estimateRelationshipEffect(text: string): number {
    const normalized = text.toLowerCase();
    
    // Positive keywords
    const positiveWords = [
      'thank', 'thanks', 'grateful', 'appreciate', 'help', 'amazing', 'wonderful', 
      'good', 'great', 'excellent', 'please', 'kind', 'happy', 'agree', 'friend'
    ];
    
    // Negative keywords
    const negativeWords = [
      'no', 'not', 'never', 'hate', 'stupid', 'idiot', 'fool', 'won\'t', 'can\'t',
      'refuse', 'leave', 'bad', 'terrible', 'awful', 'disagree', 'wrong'
    ];
    
    // Count occurrences
    const positiveCount = positiveWords.filter(word => normalized.includes(word)).length;
    const negativeCount = negativeWords.filter(word => normalized.includes(word)).length;
    
    // Calculate effect
    const baseEffect = positiveCount - negativeCount;
    
    // Clamp to reasonable values (-2 to +2)
    return Math.max(-2, Math.min(2, baseEffect));
  }
  
  /**
   * Generate a fallback dialogue node if AI generation fails
   */
  private generateFallbackDialogue(npc: NPC, topic?: string): DialogueNode {
    // Default greeting text based on NPC attitude
    let dialogueText = 'Hello there.';
    
    if (npc.attitude === 'friendly') {
      dialogueText = 'Hello! It\'s good to see you. What can I help you with today?';
    } else if (npc.attitude === 'hostile') {
      dialogueText = 'What do you want? Make it quick.';
    }
    
    // If there's a topic, add a relevant comment
    if (topic) {
      switch (topic) {
        case 'quest':
          dialogueText += ' I might have some work for you, if you\'re interested.';
          break;
        case 'rumor':
          dialogueText += ' I\'ve heard a few interesting things lately.';
          break;
        case 'shop':
          dialogueText += ' Looking to buy something?';
          break;
        default:
          dialogueText += ` You wanted to talk about ${topic}?`;
      }
    }
    
    // Simple responses
    const responses: DialogueResponse[] = [
      {
        id: `fallback-positive-${Date.now()}`,
        text: 'That sounds interesting. Tell me more.',
        nextNodeId: `dynamic-followup-${npc.id}-${Date.now()}-0`,
        relationshipEffect: 1
      },
      {
        id: `fallback-neutral-${Date.now()}`,
        text: 'I understand.',
        nextNodeId: `dynamic-followup-${npc.id}-${Date.now()}-1`,
        relationshipEffect: 0
      },
      {
        id: `fallback-goodbye-${Date.now()}`,
        text: 'I should be going now.',
        nextNodeId: 'END',
        isGoodbye: true
      }
    ];
    
    return {
      id: `fallback-${npc.id}-${Date.now()}`,
      text: dialogueText,
      npcId: npc.id,
      responses,
      tags: topic ? [topic, 'fallback'] : ['fallback']
    };
  }
} 