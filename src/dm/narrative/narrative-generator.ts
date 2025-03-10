/**
 * Narrative Generator
 * 
 * This module handles the generation of narrative content for the game,
 * including scene descriptions, character interactions, and storytelling.
 */

import { AIService, AIServiceResponse } from '../../ai/ai-service-wrapper';
import { PromptType, TemplateVariables } from '../../ai/prompts/prompt-template-manager';
import { Character } from '../../character/character';
import { GameState } from '../../core/state/game-state';
import { Location } from '../../world/location';
import { NPC } from '../../world/npcs/npc';

/**
 * Options for narrative generation
 */
export interface NarrativeOptions {
  /** Temperature setting (0-1, higher = more creative) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Whether to include sensory details */
  includeSensoryDetails?: boolean;
  /** Narrative style (descriptive, concise, dramatic, etc.) */
  style?: 'descriptive' | 'concise' | 'dramatic' | 'humorous';
  /** Narrative tone (serious, light, mysterious, etc.) */
  tone?: 'serious' | 'light' | 'mysterious' | 'tense' | 'whimsical';
}

/**
 * Context for scene description
 */
export interface SceneContext {
  /** The location being described */
  location: Location;
  /** Time of day */
  timeOfDay: string;
  /** Weather conditions */
  weather: string;
  /** Characters present in the scene */
  charactersPresent: (Character | NPC)[];
  /** Notable objects in the scene */
  notableObjects?: string[];
  /** Recent events that affected the scene */
  recentEvents?: string[];
  /** Atmosphere or mood of the scene */
  mood?: string;
}

/**
 * Context for action response
 */
export interface ActionContext {
  /** The character performing the action */
  character: Character;
  /** The action being performed */
  action: string;
  /** The location where the action occurs */
  location: Location;
  /** The target of the action (if any) */
  target?: Character | NPC | string;
  /** Result of any dice rolls */
  diceResults?: {
    type: string;
    value: number;
    success?: boolean;
  }[];
}

/**
 * Context for dialogue generation
 */
export interface DialogueContext {
  /** The speaker */
  speaker: Character | NPC;
  /** The listener(s) */
  listeners: (Character | NPC)[];
  /** The topic of conversation */
  topic: string;
  /** Speaker's attitude toward listeners */
  attitude?: 'friendly' | 'hostile' | 'neutral' | 'cautious';
  /** Previous statements in conversation */
  previousStatements?: string[];
  /** Information the speaker wants to convey */
  information?: string;
  /** Whether the speaker is hiding something */
  hasHiddenAgenda?: boolean;
}

/**
 * Generates narrative content for the game
 */
export class NarrativeGenerator {
  private aiService: AIService;
  private gameState: GameState;
  private conversationHistory: Map<string, string[]> = new Map();
  private maxHistoryLength = 10;
  
  /**
   * Create a new narrative generator
   * 
   * @param aiService The AI service to use
   * @param gameState The current game state
   */
  constructor(aiService: AIService, gameState: GameState) {
    this.aiService = aiService;
    this.gameState = gameState;
  }
  
  /**
   * Generate a scene description
   * 
   * @param context Scene context
   * @param options Generation options
   * @returns Generated description
   */
  public async describeScene(
    context: SceneContext,
    options: NarrativeOptions = {}
  ): Promise<string> {
    // Prepare template variables
    const variables: TemplateVariables = {
      scene: this.formatLocationDescription(context.location),
      timeOfDay: context.timeOfDay,
      weather: context.weather,
      characters: this.formatCharactersPresent(context.charactersPresent),
      objects: context.notableObjects?.join(', ') || '',
      events: context.recentEvents?.join(', ') || '',
      mood: context.mood || 'neutral'
    };
    
    // Add options as variables
    if (options.style) {
      variables.style = options.style;
    }
    
    if (options.tone) {
      variables.tone = options.tone;
    }
    
    if (options.includeSensoryDetails !== undefined) {
      variables.includeSensoryDetails = options.includeSensoryDetails;
    }
    
    // Generate description
    const response = await this.aiService.generateFromTemplate(
      'narrative.scene_description',
      variables,
      {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      }
    );
    
    return response.content;
  }
  
  /**
   * Generate a response to a player action
   * 
   * @param context Action context
   * @param options Generation options
   * @returns Generated response
   */
  public async respondToAction(
    context: ActionContext,
    options: NarrativeOptions = {}
  ): Promise<string> {
    // Prepare template variables
    const variables: TemplateVariables = {
      character: context.character.name,
      action: context.action,
      location: context.location.name,
      target: this.formatActionTarget(context.target),
      diceResults: context.diceResults ? JSON.stringify(context.diceResults) : undefined
    };
    
    // Add options as variables
    if (options.style) {
      variables.style = options.style;
    }
    
    if (options.tone) {
      variables.tone = options.tone;
    }
    
    // Generate response
    const response = await this.aiService.generateFromTemplate(
      'narrative.player_action_response',
      variables,
      {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      }
    );
    
    return response.content;
  }
  
  /**
   * Generate NPC dialogue
   * 
   * @param context Dialogue context
   * @param options Generation options
   * @returns Generated dialogue
   */
  public async generateDialogue(
    context: DialogueContext,
    options: NarrativeOptions = {}
  ): Promise<string> {
    // Get NPC or character details
    const speaker = context.speaker;
    const isNPC = 'personality' in speaker && 'motivation' in speaker;
    
    // Prepare template variables
    const variables: TemplateVariables = {
      npc: speaker.name,
      description: isNPC ? this.getNPCDescription(speaker as NPC) : `${speaker.race} ${speaker.class[0].name}`,
      context: context.topic,
      traits: isNPC ? (speaker as NPC).personality.traits.join(', ') : 'unknown',
      mood: isNPC ? (speaker as NPC).personality.currentMood : 'neutral',
      listeners: context.listeners.map(l => l.name).join(', '),
      attitude: context.attitude || 'neutral',
      previousStatements: context.previousStatements?.join('\n') || '',
      information: context.information || '',
      hasHiddenAgenda: context.hasHiddenAgenda || false
    };
    
    // Generate dialogue
    const response = await this.aiService.generateFromTemplate(
      'npc.dialogue',
      variables,
      {
        temperature: options.temperature || 0.7, // Dialogue benefits from some creativity
        maxTokens: options.maxTokens
      }
    );
    
    // Update conversation history
    this.updateConversationHistory(speaker.name, response.content);
    
    return response.content;
  }
  
  /**
   * Generate world reaction to an event
   * 
   * @param event The event description
   * @param gameContext Additional game context
   * @param options Generation options
   * @returns Generated reaction
   */
  public async generateWorldReaction(
    event: string,
    gameContext: string,
    options: NarrativeOptions = {}
  ): Promise<string> {
    // Prepare template variables
    const variables: TemplateVariables = {
      event,
      context: gameContext
    };
    
    // Generate reaction
    const response = await this.aiService.generateFromTemplate(
      'narrative.world_reaction',
      variables,
      {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      }
    );
    
    return response.content;
  }
  
  /**
   * Generate a scene transition
   * 
   * @param currentScene Current scene description
   * @param nextScene Next scene description
   * @param timePassing Description of time passing
   * @param events Important events during transition
   * @param options Generation options
   * @returns Generated transition
   */
  public async generateTransition(
    currentScene: string,
    nextScene: string,
    timePassing: string,
    events: string[] = [],
    options: NarrativeOptions = {}
  ): Promise<string> {
    // Prepare template variables
    const variables: TemplateVariables = {
      currentScene,
      nextScene,
      timePassing,
      events: events.join(', ')
    };
    
    // Generate transition
    const response = await this.aiService.generateFromTemplate(
      'narrative.transition',
      variables,
      {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      }
    );
    
    return response.content;
  }
  
  /**
   * Generate lore about a subject
   * 
   * @param subject The subject to generate lore about
   * @param options Generation options
   * @returns Generated lore
   */
  public async generateLore(
    subject: string,
    options: NarrativeOptions = {}
  ): Promise<string> {
    // Prepare template variables
    const variables: TemplateVariables = {
      subject
    };
    
    // Generate lore
    const response = await this.aiService.generateFromTemplate(
      'worldgen.lore',
      variables,
      {
        temperature: options.temperature || 0.6,
        maxTokens: options.maxTokens || 800 // Lore can be longer
      }
    );
    
    return response.content;
  }
  
  /**
   * Generate a custom narrative using a prompt template
   * 
   * @param promptType The prompt template type
   * @param variables Template variables
   * @param options Generation options
   * @returns Generated narrative
   */
  public async generateCustomNarrative(
    promptType: PromptType,
    variables: TemplateVariables,
    options: NarrativeOptions = {}
  ): Promise<string> {
    // Generate using the specified template
    const response = await this.aiService.generateFromTemplate(
      promptType,
      variables,
      {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      }
    );
    
    return response.content;
  }
  
  /**
   * Generate a narrative response based on a custom prompt
   * 
   * @param customPrompt The custom prompt
   * @param variables Variables to use in the prompt
   * @param options Generation options
   * @returns Generated narrative
   */
  public async generateFromCustomPrompt(
    customPrompt: string,
    variables: TemplateVariables = {},
    options: NarrativeOptions = {}
  ): Promise<string> {
    // Generate using a custom prompt
    const response = await this.aiService.generateFromCustomTemplate(
      customPrompt,
      variables,
      {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      }
    );
    
    return response.content;
  }
  
  /**
   * Update the conversation history for an NPC
   * 
   * @param npcName The NPC's name
   * @param statement The statement to add
   */
  private updateConversationHistory(npcName: string, statement: string): void {
    // Get history or create new one
    let history = this.conversationHistory.get(npcName) || [];
    
    // Add new statement
    history.push(statement);
    
    // Trim if too long
    if (history.length > this.maxHistoryLength) {
      history = history.slice(history.length - this.maxHistoryLength);
    }
    
    // Update history
    this.conversationHistory.set(npcName, history);
  }
  
  /**
   * Get conversation history for an NPC
   * 
   * @param npcName The NPC's name
   * @returns Array of statements
   */
  public getConversationHistory(npcName: string): string[] {
    return this.conversationHistory.get(npcName) || [];
  }
  
  /**
   * Clear conversation history for an NPC
   * 
   * @param npcName The NPC's name
   */
  public clearConversationHistory(npcName: string): void {
    this.conversationHistory.delete(npcName);
  }
  
  /**
   * Format location description for templates
   * 
   * @param location The location
   * @returns Formatted description
   */
  private formatLocationDescription(location: Location): string {
    return `${location.name}, a ${location.type} in ${location.region}. ${location.description}`;
  }
  
  /**
   * Format characters present for templates
   * 
   * @param characters Characters present
   * @returns Formatted character list
   */
  private formatCharactersPresent(characters: (Character | NPC)[]): string {
    if (characters.length === 0) {
      return 'No one is present';
    }
    
    return characters.map(char => {
      if ('personality' in char && 'motivation' in char) {
        // Is an NPC
        return `${char.name}, a ${this.getNPCDescription(char as NPC)}`;
      } else {
        // Is a player character
        return `${char.name}, a ${char.race} ${char.class[0].name}`;
      }
    }).join('; ');
  }
  
  /**
   * Format action target for templates
   * 
   * @param target The target of an action
   * @returns Formatted target
   */
  private formatActionTarget(target?: Character | NPC | string): string {
    if (!target) {
      return 'nothing in particular';
    }
    
    if (typeof target === 'string') {
      return target;
    }
    
    if ('personality' in target && 'motivation' in target) {
      // Is an NPC
      return `${target.name}, a ${this.getNPCDescription(target as NPC)}`;
    } else {
      // Is a player character
      return `${target.name}, a ${target.race} ${target.class[0].name}`;
    }
  }
  
  /**
   * Get a description of an NPC
   * 
   * @param npc The NPC
   * @returns NPC description
   */
  private getNPCDescription(npc: NPC): string {
    return `${npc.race} ${npc.occupation} with ${npc.appearance}`;
  }
} 