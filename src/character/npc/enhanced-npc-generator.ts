/**
 * Enhanced NPC Generator
 * 
 * Generates NPCs with rich personalities and backstories using
 * advanced prompt templates for consistent and immersive character creation.
 */

import { v4 as uuidv4 } from 'uuid';
import { NPC, NPCPersonality, createDefaultNPCMemory, createDefaultPersonality } from '../../core/interfaces/npc';
import { AIService } from '../../dm/ai-service';
import { createPromptTemplate } from '../../dm/prompts/advanced-prompt-templates';
import { NPCDialoguePromptTemplate } from '../../dm/prompts/advanced-prompt-templates';
import { createStyle, StyleOptions } from '../../dm/prompts/advanced-prompt-templates';
import { DialogueNode } from '../../core/interfaces/quest';
import { appConfig } from '../../config';
import { Race } from '../../core/types';

export interface NPCGenerationOptions {
  name?: string;
  race?: Race;
  attitude?: 'friendly' | 'neutral' | 'hostile';
  occupation?: string;
  locationContext?: string;
  isQuestGiver?: boolean;
  personalityTraits?: string[];
  importance?: 'minor' | 'supporting' | 'major';
  knowledgeAreas?: string[];
  style?: Partial<StyleOptions>;
}

export class EnhancedNPCGenerator {
  private aiService: AIService;
  
  constructor(aiService: AIService) {
    this.aiService = aiService;
  }
  
  /**
   * Generate an NPC with advanced personality and dialogue options
   */
  public async generateNPC(options: NPCGenerationOptions): Promise<NPC> {
    // Create default options if not provided
    const fullOptions = this.createFullOptions(options);
    
    // Create a prompt template for NPC generation
    const promptTemplate = createPromptTemplate('npc') as NPCDialoguePromptTemplate;
    
    // Apply style options based on NPC importance and attitude
    const style = this.getNPCStyle(fullOptions);
    
    // Generate NPC description and personality with the advanced prompt template
    const npcContext = {
      name: fullOptions.name,
      race: fullOptions.race,
      attitude: fullOptions.attitude,
      occupation: fullOptions.occupation,
      location: fullOptions.locationContext,
      isQuestGiver: fullOptions.isQuestGiver,
      personalityTraits: fullOptions.personalityTraits,
      importance: fullOptions.importance
    };
    
    // Format the prompts using the template
    const userPrompt = promptTemplate.formatUserPrompt({
      npcContext,
      style
    });
    
    const systemPrompt = promptTemplate.formatSystemPrompt();
    
    // Call the AI service with the formatted prompts
    let npcData: Partial<NPC> = {};
    
    try {
      const response = await this.aiService.generateCompletion(
        userPrompt,
        'npc',
        {
          systemPrompt,
          temperature: style.creativity || appConfig.aiCreativity
        }
      );
      
      // Parse the AI response to extract NPC details
      npcData = this.parseNPCResponse(response.text, fullOptions);
    } catch (error) {
      console.warn('Failed to generate enhanced NPC, using fallback generation', error);
      npcData = this.createFallbackNPC(fullOptions);
    }
    
    // Create the final NPC object
    const npc: NPC = {
      id: uuidv4(),
      name: npcData.name || fullOptions.name,
      race: npcData.race || fullOptions.race,
      description: npcData.description || `A ${fullOptions.race} ${fullOptions.occupation || 'resident'}.`,
      attitude: npcData.attitude || fullOptions.attitude,
      isQuestGiver: fullOptions.isQuestGiver || false,
      dialogue: npcData.dialogue || this.createBasicDialogue(fullOptions),
      occupation: npcData.occupation || fullOptions.occupation,
      location: fullOptions.locationContext || 'unknown',
      personality: npcData.personality || createDefaultPersonality(fullOptions.attitude),
      memory: createDefaultNPCMemory(),
      knowledge: new Map(
        (fullOptions.knowledgeAreas || []).map(area => [area, Math.floor(Math.random() * 4) + 2])
      ),
      currentActivity: npcData.currentActivity || this.getDefaultActivity(fullOptions.occupation),
      traits: npcData.traits || fullOptions.personalityTraits || []
    };
    
    return npc;
  }
  
  /**
   * Generate appropriate dialogue options for an NPC based on context
   */
  public async generateContextualDialogue(
    npc: NPC, 
    context: string, 
    playerInput?: string
  ): Promise<DialogueNode[]> {
    // Create a dialogue prompt template
    const promptTemplate = createPromptTemplate('dialogue') as NPCDialoguePromptTemplate;
    
    // Create style based on NPC personality
    const style = this.getDialogueStyle(npc.personality);
    
    // Generate dialogue context
    const dialogueContext = {
      npc: {
        name: npc.name,
        race: npc.race,
        attitude: npc.attitude,
        occupation: npc.occupation,
        personality: npc.personality
      },
      situationContext: context,
      playerInput: playerInput || '',
      previousInteractions: npc.memory?.conversationHistory.slice(-3) || []
    };
    
    try {
      // Format the prompts using the template
      const userPrompt = promptTemplate.formatUserPrompt({
        dialogueContext,
        style
      });
      
      const systemPrompt = promptTemplate.formatSystemPrompt();
      
      // Call the AI service with the formatted prompts
      const response = await this.aiService.generateCompletion(
        userPrompt,
        'dialogue',
        {
          systemPrompt,
          temperature: style.creativity || appConfig.aiCreativity
        }
      );
      
      // Parse the response into dialogue nodes
      return this.parseDialogueResponse(response.text, npc);
      
    } catch (error) {
      console.warn('Failed to generate dialogue, using fallback dialogue', error);
      return this.createFallbackDialogue(npc, context);
    }
  }
  
  /**
   * Parse the AI response to extract NPC details
   */
  private parseNPCResponse(response: string, options: NPCGenerationOptions): Partial<NPC> {
    // Basic parsing for now - could be enhanced with more structured extraction
    // In a real implementation, this would parse a structured response from the AI
    const npcData: Partial<NPC> = {
      name: options.name,
      race: options.race,
      attitude: options.attitude,
      occupation: options.occupation
    };
    
    // Extract description if present
    const descriptionMatch = response.match(/Description:\s*([\s\S]*?)(?=\n\n|Personality:|$)/i);
    if (descriptionMatch && descriptionMatch[1]) {
      npcData.description = descriptionMatch[1].trim();
    }
    
    // Extract personality if present
    const personalityMatch = response.match(/Personality:\s*([\s\S]*?)(?=\n\n|Traits:|$)/i);
    if (personalityMatch && personalityMatch[1]) {
      const personalityText = personalityMatch[1].trim();
      npcData.personality = this.extractPersonality(personalityText, options.attitude);
    }
    
    // Extract traits if present
    const traitsMatch = response.match(/Traits:\s*([\s\S]*?)(?=\n\n|Activity:|$)/i);
    if (traitsMatch && traitsMatch[1]) {
      npcData.traits = traitsMatch[1].split(',').map(trait => trait.trim());
    }
    
    // Extract current activity if present
    const activityMatch = response.match(/Activity:\s*([\s\S]*?)(?=\n\n|$)/i);
    if (activityMatch && activityMatch[1]) {
      npcData.currentActivity = activityMatch[1].trim();
    }
    
    return npcData;
  }
  
  /**
   * Extract personality traits from text
   */
  private extractPersonality(personalityText: string, attitude: 'friendly' | 'neutral' | 'hostile'): NPCPersonality {
    // Default personality
    const defaultPersonality = createDefaultPersonality(attitude);
    
    // Try to extract primary and secondary traits
    const primaryMatch = personalityText.match(/primary trait:?\s*([A-Za-z]+)/i);
    const secondaryMatch = personalityText.match(/secondary trait:?\s*([A-Za-z]+)/i);
    
    // Try to extract flaws
    const flawsMatch = personalityText.match(/flaws:?\s*([\s\S]*?)(?=\n|values:|motivations:|$)/i);
    
    // Try to extract values
    const valuesMatch = personalityText.match(/values:?\s*([\s\S]*?)(?=\n|flaws:|motivations:|$)/i);
    
    // Try to extract motivations
    const motivationsMatch = personalityText.match(/motivations:?\s*([\s\S]*?)(?=\n|$)/i);
    
    // Create the personality object
    const personality: NPCPersonality = {
      primaryTrait: primaryMatch ? (primaryMatch[1].toLowerCase() as any) : defaultPersonality.primaryTrait,
      secondaryTrait: secondaryMatch ? (secondaryMatch[1].toLowerCase() as any) : defaultPersonality.secondaryTrait,
      flaws: defaultPersonality.flaws,
      values: defaultPersonality.values,
      motivations: defaultPersonality.motivations
    };
    
    // Parse flaws if found
    if (flawsMatch && flawsMatch[1]) {
      const flawsList = flawsMatch[1].split(',').map(f => f.trim().toLowerCase());
      personality.flaws = flawsList.filter(f => f.length > 0) as any[] || defaultPersonality.flaws;
    }
    
    // Parse values if found
    if (valuesMatch && valuesMatch[1]) {
      personality.values = valuesMatch[1].split(',').map(v => v.trim());
    }
    
    // Parse motivations if found
    if (motivationsMatch && motivationsMatch[1]) {
      personality.motivations = motivationsMatch[1].split(',').map(m => m.trim());
    }
    
    return personality;
  }
  
  /**
   * Parse the AI response to extract dialogue nodes
   */
  private parseDialogueResponse(response: string, npc: NPC): DialogueNode[] {
    // Basic parsing implementation - in a real system, this would be more sophisticated
    const dialogueNodes: DialogueNode[] = [];
    
    // Split by dialogue options
    const dialogueSections = response.split(/Option \d+:/);
    
    if (dialogueSections.length > 1) {
      // First section is the initial statement
      const initialText = dialogueSections[0].trim();
      
      if (initialText) {
        const initialNode: DialogueNode = {
          id: uuidv4(),
          text: initialText,
          responses: []
        };
        
        // Add response options
        for (let i = 1; i < dialogueSections.length; i++) {
          const responseText = dialogueSections[i].trim();
          if (responseText) {
            initialNode.responses?.push({
              id: uuidv4(),
              text: responseText
            });
          }
        }
        
        dialogueNodes.push(initialNode);
      }
    } else {
      // Single response without options
      dialogueNodes.push({
        id: uuidv4(),
        text: response.trim()
      });
    }
    
    return dialogueNodes;
  }
  
  /**
   * Create a fallback NPC when AI generation fails
   */
  private createFallbackNPC(options: NPCGenerationOptions): Partial<NPC> {
    return {
      name: options.name || `${options.race} ${options.occupation || 'NPC'}`,
      race: options.race,
      description: `A ${options.race} ${options.occupation || 'resident'} with a ${options.attitude} demeanor.`,
      attitude: options.attitude,
      occupation: options.occupation,
      personality: createDefaultPersonality(options.attitude),
      dialogue: this.createBasicDialogue(options),
      currentActivity: this.getDefaultActivity(options.occupation)
    };
  }
  
  /**
   * Create basic dialogue options for an NPC
   */
  private createBasicDialogue(options: NPCGenerationOptions): DialogueNode[] {
    const greetings: Record<string, string> = {
      friendly: `Hello there! How can I help you today?`,
      neutral: `Good day. What brings you here?`,
      hostile: `What do you want? Make it quick.`
    };
    
    const dialogue: DialogueNode = {
      id: uuidv4(),
      text: greetings[options.attitude || 'neutral'],
      responses: [
        {
          id: uuidv4(),
          text: `I'm just looking around.`
        },
        {
          id: uuidv4(),
          text: `Do you have any work that needs doing?`
        },
        {
          id: uuidv4(),
          text: `Tell me about yourself.`
        }
      ]
    };
    
    return [dialogue];
  }
  
  /**
   * Create fallback dialogue when AI generation fails
   */
  private createFallbackDialogue(npc: NPC, context: string): DialogueNode[] {
    const contextualResponses: Record<string, string> = {
      greeting: `${npc.attitude === 'friendly' ? 'Hello there!' : npc.attitude === 'hostile' ? 'What do you want?' : 'Greetings.'}`,
      quest: `I might have something you could help me with. Let me think about it.`,
      combat: `Let's not resort to violence here.`,
      information: `I don't know much about that, I'm afraid.`,
      trade: `I might have some items to trade, but nothing special.`
    };
    
    const responseText = contextualResponses[context] || `I don't have much to say about that.`;
    
    return [{
      id: uuidv4(),
      text: responseText,
      responses: [
        {
          id: uuidv4(),
          text: 'Goodbye.'
        }
      ]
    }];
  }
  
  /**
   * Get default style options based on NPC importance and attitude
   */
  private getNPCStyle(options: NPCGenerationOptions): StyleOptions {
    const importanceStyles: Record<string, Partial<StyleOptions>> = {
      'minor': {
        verbosity: 'concise',
        detail: 'low',
        creativity: 0.4
      },
      'supporting': {
        verbosity: 'balanced',
        detail: 'medium',
        creativity: 0.6
      },
      'major': {
        verbosity: 'detailed',
        detail: 'high',
        creativity: 0.8
      }
    };
    
    const attitudeStyles: Record<string, Partial<StyleOptions>> = {
      'friendly': {
        tone: 'warm'
      },
      'neutral': {
        tone: 'neutral'
      },
      'hostile': {
        tone: 'harsh'
      }
    };
    
    // Combine importance and attitude styles
    const baseStyle = {
      ...importanceStyles[options.importance || 'minor'],
      ...attitudeStyles[options.attitude || 'neutral']
    };
    
    // Apply custom style if provided
    return createStyle({
      ...baseStyle,
      ...options.style
    });
  }
  
  /**
   * Get dialogue style based on NPC personality
   */
  private getDialogueStyle(personality?: NPCPersonality): StyleOptions {
    if (!personality) {
      return createStyle({});
    }
    
    // Map personality traits to style options
    const traitStyles: Record<string, Partial<StyleOptions>> = {
      'friendly': { tone: 'warm', emphasis: 'emotion' },
      'mysterious': { tone: 'cryptic', emphasis: 'intrigue' },
      'suspicious': { tone: 'cautious', emphasis: 'uncertainty' },
      'helpful': { tone: 'supportive', emphasis: 'information' },
      'wise': { tone: 'sage', emphasis: 'wisdom', formality: 'formal' },
      'aggressive': { tone: 'harsh', emphasis: 'threats' },
      'timid': { tone: 'hesitant', emphasis: 'fear' },
      'gruff': { tone: 'stern', formality: 'casual' },
      'scholarly': { tone: 'academic', formality: 'formal', emphasis: 'knowledge' },
      'noble': { tone: 'refined', formality: 'formal' },
      'common': { tone: 'simple', formality: 'casual' },
      'eccentric': { tone: 'quirky', emphasis: 'peculiarity' },
      'stoic': { tone: 'reserved', emphasis: 'restraint' }
    };
    
    // Get styles for primary and secondary traits
    const primaryStyle = traitStyles[personality.primaryTrait] || {};
    const secondaryStyle = traitStyles[personality.secondaryTrait] || {};
    
    // Primary trait has more influence than secondary
    return createStyle({
      ...secondaryStyle,
      ...primaryStyle
    });
  }
  
  /**
   * Fill in default options for NPC generation
   */
  private createFullOptions(options: NPCGenerationOptions): NPCGenerationOptions {
    const races: Race[] = ['human', 'elf', 'dwarf', 'halfling'];
    const attitudes: ('friendly' | 'neutral' | 'hostile')[] = ['friendly', 'neutral', 'hostile'];
    const occupations = ['merchant', 'guard', 'farmer', 'innkeeper', 'blacksmith', 'mage', 'noble'];
    
    return {
      name: options.name || `NPC_${Math.floor(Math.random() * 1000)}`,
      race: options.race || races[Math.floor(Math.random() * races.length)],
      attitude: options.attitude || attitudes[Math.floor(Math.random() * attitudes.length)],
      occupation: options.occupation || occupations[Math.floor(Math.random() * occupations.length)],
      locationContext: options.locationContext || '',
      isQuestGiver: options.isQuestGiver !== undefined ? options.isQuestGiver : Math.random() > 0.7,
      personalityTraits: options.personalityTraits || [],
      importance: options.importance || 'minor',
      knowledgeAreas: options.knowledgeAreas || [],
      style: options.style || {}
    };
  }
  
  /**
   * Get a default activity based on occupation
   */
  private getDefaultActivity(occupation?: string): string {
    if (!occupation) return 'standing around';
    
    const activities: Record<string, string[]> = {
      'merchant': ['arranging wares', 'counting coins', 'haggling with a customer'],
      'guard': ['patrolling the area', 'standing at attention', 'inspecting weapons'],
      'farmer': ['tending crops', 'feeding animals', 'carrying produce'],
      'innkeeper': ['wiping down the counter', 'serving drinks', 'chatting with patrons'],
      'blacksmith': ['hammering metal', 'stoking the forge', 'examining a weapon'],
      'mage': ['reading a tome', 'mixing potions', 'practicing gestures'],
      'noble': ['examining documents', 'giving orders to servants', 'sipping wine']
    };
    
    const occupationActivities = activities[occupation] || ['going about their business'];
    return occupationActivities[Math.floor(Math.random() * occupationActivities.length)];
  }
} 