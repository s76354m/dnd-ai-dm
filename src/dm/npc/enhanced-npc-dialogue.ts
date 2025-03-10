/**
 * Enhanced NPC Dialogue Generator
 * 
 * Generates rich, contextual NPC dialogue using the NPC Memory System
 * and other AI enhancements.
 */

import { NPC } from '../../core/interfaces/npc';
import { GameState } from '../../core/interfaces/game';
import { AIServiceAdapter } from '../ai-service-adapter';
import { NPCMemoryManager } from './npc-memory';
import { PromptComponent } from '../prompts/advanced-prompt-templates';
import { NPCPersonalityConsistencyTracker, PersonalityValidationResult } from './personality-consistency';

/**
 * Options for dialogue generation
 */
export interface DialogueOptions {
  includeEmotionalResponse: boolean;
  useMemoryForTopics: boolean;
  adjustForRelationship: boolean;
  respectSecrets: boolean;
  includeBodyLanguage: boolean;
  validatePersonalityConsistency: boolean;
  minPersonalityConsistencyScore: number;
  maxResponseLength?: number;
}

/**
 * Default dialogue options
 */
export const DEFAULT_DIALOGUE_OPTIONS: DialogueOptions = {
  includeEmotionalResponse: true,
  useMemoryForTopics: true,
  adjustForRelationship: true,
  respectSecrets: true,
  includeBodyLanguage: true,
  validatePersonalityConsistency: true,
  minPersonalityConsistencyScore: 70
};

/**
 * Result of dialogue generation, including metadata
 */
export interface DialogueResult {
  response: string;
  topics: string[];
  emotionalTone: string;
  relationshipImpact: number;
  willShareKnowledge: boolean;
  bodyLanguage?: string;
  personalityConsistencyScore?: number;
  personalityInconsistencies?: string[];
}

/**
 * Extracted topics and sentiment from player dialogue
 */
interface AnalyzedDialogue {
  topics: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  intent: 'question' | 'statement' | 'greeting' | 'farewell' | 'request' | 'threat';
  mentionedEntities: string[];
}

/**
 * Generate enhanced dialogue for an NPC in response to player input
 * 
 * @param npc The NPC who is speaking
 * @param playerInput Player's dialogue or question
 * @param gameState Current game state
 * @param aiService AI service adapter with enhanced capabilities
 * @param memoryManager NPC memory manager (or creates one if not provided)
 * @param personalityTracker Personality consistency tracker (or creates one if not provided)
 * @param options Dialogue generation options
 * @returns NPC's response with metadata
 */
export async function generateEnhancedNPCDialogue(
  npc: NPC,
  playerInput: string,
  gameState: GameState,
  aiService: AIServiceAdapter,
  memoryManager?: NPCMemoryManager,
  personalityTracker?: NPCPersonalityConsistencyTracker,
  options: Partial<DialogueOptions> = {}
): Promise<DialogueResult> {
  // Merge options with defaults
  const dialogueOptions: DialogueOptions = {
    ...DEFAULT_DIALOGUE_OPTIONS,
    ...options
  };
  
  try {
    // Access the enhanced AI service
    const enhancedService = aiService.getEnhancedService();
    
    // Get or create the NPC memory manager
    let npcMemoryManager: NPCMemoryManager;
    
    if (memoryManager) {
      npcMemoryManager = memoryManager;
    } else if (enhancedService.npcMemoryManager) {
      // Use existing memory manager from enhanced service
      npcMemoryManager = enhancedService.npcMemoryManager;
    } else {
      // Create a new memory manager
      npcMemoryManager = new NPCMemoryManager();
      
      // Store it in the enhanced service if possible
      if (typeof enhancedService.setNPCMemoryManager === 'function') {
        enhancedService.setNPCMemoryManager(npcMemoryManager);
      }
    }
    
    // Get or create the personality consistency tracker
    let consistencyTracker: NPCPersonalityConsistencyTracker;
    
    if (personalityTracker) {
      consistencyTracker = personalityTracker;
    } else if (enhancedService.personalityTracker) {
      // Use existing tracker from enhanced service
      consistencyTracker = enhancedService.personalityTracker;
    } else {
      // Create a new tracker
      consistencyTracker = new NPCPersonalityConsistencyTracker();
      
      // Store it in the enhanced service if possible
      if (typeof enhancedService.setPersonalityTracker === 'function') {
        enhancedService.setPersonalityTracker(consistencyTracker);
      }
    }
    
    // Analyze player input for topics and sentiment
    const analyzedInput = await analyzePlayerDialogue(playerInput, enhancedService);
    
    // Get or create memory for this NPC
    let memory = npcMemoryManager.getMemory(npc.id);
    
    if (!memory) {
      memory = npcMemoryManager.createMemory(npc);
    }
    
    // If this is the first interaction with the NPC and they have a personality,
    // extract initial personality traits
    if (npc.personality && consistencyTracker.getTraits(npc.id).length === 0) {
      consistencyTracker.extractTraitsFromPersonalityDescription(npc.id, npc.personality);
    }
    
    // Build context string for the NPC
    const contextString = npcMemoryManager.buildNPCContext(npc.id, gameState);
    
    // Add personality traits to context if available
    const personalityContext = buildPersonalityContext(npc.id, consistencyTracker);
    const fullContext = personalityContext 
      ? `${contextString}\n\n${personalityContext}` 
      : contextString;
    
    // Prepare additional data for the prompt
    const dialogueContext = {
      npc,
      playerInput,
      analyzedInput,
      memory,
      gameState,
      options: dialogueOptions,
      personalityTraits: consistencyTracker.getTraits(npc.id)
    };
    
    // Generate the dialogue using the enhanced AI service
    let dialogueResult: DialogueResult;
    
    // Use the specialized component if available
    if (typeof enhancedService.generateWithComponent === 'function') {
      const response = await enhancedService.generateWithComponent(
        'npc' as PromptComponent,
        {
          npc,
          playerInput,
          context: fullContext,
          analyzedTopics: analyzedInput.topics,
          playerIntent: analyzedInput.intent,
          relationshipLevel: memory.relationshipLevel,
          personalityTraits: consistencyTracker.getTraits(npc.id),
          options: dialogueOptions
        }
      );
      
      // Parse the response to extract metadata
      dialogueResult = parseDialogueResponse(response);
    } else {
      // Fall back to the standard method
      const response = await aiService.generateNPCDialogue(npc, playerInput);
      
      // Create a basic result with minimal metadata
      dialogueResult = {
        response,
        topics: analyzedInput.topics,
        emotionalTone: 'neutral',
        relationshipImpact: 0,
        willShareKnowledge: false
      };
    }
    
    // Validate against personality consistency if enabled
    if (dialogueOptions.validatePersonalityConsistency) {
      const personalityValidation = consistencyTracker.validateDialogue(
        npc.id, 
        dialogueResult.response
      );
      
      dialogueResult.personalityConsistencyScore = personalityValidation.score;
      
      if (personalityValidation.contradictions.length > 0) {
        dialogueResult.personalityInconsistencies = personalityValidation.contradictions.map(
          c => c.contradiction
        );
      }
      
      // If not consistent and we have the capability to regenerate
      if (!personalityValidation.isConsistent && 
          personalityValidation.score < dialogueOptions.minPersonalityConsistencyScore &&
          typeof enhancedService.regenerateResponse === 'function') {
        
        // Create a context with personality suggestions
        const personalitySuggestion = consistencyTracker.generateConsistentResponseSuggestion(
          npc.id,
          dialogueResult.response,
          personalityValidation.contradictions
        );
        
        const regenerationContext = `${fullContext}\n\n${personalitySuggestion}`;
        
        // Regenerate the response with personality suggestions
        const regeneratedResponse = await enhancedService.regenerateResponse(
          dialogueResult.response,
          'npc',
          regenerationContext,
          personalityValidation.contradictions.map(c => ({
            type: 'personality_inconsistency',
            severity: c.severity,
            description: c.contradiction
          }))
        );
        
        // Re-parse the regenerated response
        dialogueResult = parseDialogueResponse(regeneratedResponse);
        
        // Re-validate for metrics
        const revalidation = consistencyTracker.validateDialogue(
          npc.id, 
          dialogueResult.response
        );
        
        dialogueResult.personalityConsistencyScore = revalidation.score;
        dialogueResult.personalityInconsistencies = revalidation.contradictions.map(
          c => c.contradiction
        );
      }
    }
    
    // Validate the dialogue if that capability is available
    if (typeof enhancedService.validateResponse === 'function') {
      const validationResult = enhancedService.validateResponse(
        dialogueResult.response,
        'npc',
        fullContext
      );
      
      // If there are issues and we have the capability to fix them
      if (!validationResult.isValid && typeof enhancedService.regenerateResponse === 'function') {
        const regeneratedResponse = await enhancedService.regenerateResponse(
          dialogueResult.response,
          'npc',
          fullContext,
          validationResult.issues
        );
        
        // Re-parse the regenerated response
        dialogueResult = parseDialogueResponse(regeneratedResponse);
      }
    }
    
    // Record this interaction in the NPC's memory
    npcMemoryManager.addInteraction(
      npc.id,
      playerInput,
      dialogueResult.response,
      dialogueResult.topics,
      dialogueResult.emotionalTone,
      dialogueResult.relationshipImpact,
      gameState
    );
    
    // Update personality traits based on the dialogue
    consistencyTracker.updateTraitsFromDialogue(
      npc.id,
      npc,
      dialogueResult.response
    );
    
    return dialogueResult;
  } catch (error) {
    console.error('Error generating enhanced NPC dialogue:', error);
    
    // Fall back to a simple response
    return {
      response: `${npc.name} looks at you uncertainly. "I'm not sure how to respond to that."`,
      topics: [],
      emotionalTone: 'confused',
      relationshipImpact: 0,
      willShareKnowledge: false
    };
  }
}

/**
 * Analyze player dialogue to extract topics, sentiment, and intent
 * 
 * @param playerInput Player's dialogue
 * @param enhancedService Enhanced AI service
 * @returns Analysis of the dialogue
 */
async function analyzePlayerDialogue(
  playerInput: string,
  enhancedService: any
): Promise<AnalyzedDialogue> {
  // Default analysis
  const defaultAnalysis: AnalyzedDialogue = {
    topics: [],
    sentiment: 'neutral',
    intent: 'statement',
    mentionedEntities: []
  };
  
  try {
    // If the enhanced service has a dedicated method for dialogue analysis, use it
    if (typeof enhancedService.analyzePlayerDialogue === 'function') {
      return await enhancedService.analyzePlayerDialogue(playerInput);
    }
    
    // Otherwise, perform a simple analysis
    
    // Extract potential topics (simple implementation)
    const topics = extractTopics(playerInput);
    defaultAnalysis.topics = topics;
    
    // Determine sentiment (simple implementation)
    defaultAnalysis.sentiment = determineSentiment(playerInput);
    
    // Determine intent (simple implementation)
    defaultAnalysis.intent = determineIntent(playerInput);
    
    // Extract mentioned entities (simple implementation)
    defaultAnalysis.mentionedEntities = extractEntities(playerInput);
    
    return defaultAnalysis;
  } catch (error) {
    console.error('Error analyzing player dialogue:', error);
    return defaultAnalysis;
  }
}

/**
 * Extract topics from player input
 * 
 * @param playerInput Player's dialogue
 * @returns Array of potential topics
 */
function extractTopics(playerInput: string): string[] {
  // This is a simple implementation - in a real system, you might
  // use more sophisticated NLP techniques or AI to extract topics
  
  const topics: string[] = [];
  const input = playerInput.toLowerCase();
  
  // Check for common D&D topics
  const topicPatterns: Record<string, RegExp[]> = {
    'quest': [/quest/i, /mission/i, /task/i, /job/i],
    'combat': [/fight/i, /battle/i, /attack/i, /defeat/i, /kill/i],
    'information': [/know/i, /heard/i, /rumor/i, /tell me/i, /what.+about/i],
    'location': [/where/i, /place/i, /location/i, /town/i, /city/i, /dungeon/i],
    'item': [/item/i, /weapon/i, /armor/i, /potion/i, /scroll/i, /buy/i, /sell/i],
    'person': [/who/i, /person/i, /people/i, /someone/i, /man/i, /woman/i],
    'monster': [/monster/i, /creature/i, /beast/i, /dragon/i, /undead/i],
    'magic': [/magic/i, /spell/i, /enchant/i, /arcane/i, /wizard/i, /sorcerer/i],
    'religion': [/god/i, /deity/i, /temple/i, /pray/i, /cleric/i, /paladin/i],
    'history': [/history/i, /ancient/i, /legend/i, /story/i, /tale/i, /past/i]
  };
  
  // Check each topic pattern
  Object.entries(topicPatterns).forEach(([topic, patterns]) => {
    if (patterns.some(pattern => pattern.test(input))) {
      topics.push(topic);
    }
  });
  
  // Get nouns as potential specific topics
  const words = input.split(/\s+/);
  const commonWords = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'for', 'and', 'nor', 'but', 'or', 'yet', 'so', 'if', 'then', 'else', 'when', 'where', 'why', 'how', 'to']);
  
  words.forEach(word => {
    if (word.length > 3 && !commonWords.has(word)) {
      // Check if the word might be a noun (simple heuristic)
      if (!/^(i|you|he|she|it|we|they)$/i.test(word) && 
          !/^(am|is|are|was|were|be|been|have|has|had|do|does|did)$/i.test(word) &&
          !/^(can|could|will|would|shall|should|may|might|must)$/i.test(word)) {
        topics.push(word);
      }
    }
  });
  
  return [...new Set(topics)]; // Remove duplicates
}

/**
 * Determine sentiment of player input
 * 
 * @param playerInput Player's dialogue
 * @returns Sentiment classification
 */
function determineSentiment(playerInput: string): 'positive' | 'negative' | 'neutral' {
  const input = playerInput.toLowerCase();
  
  const positivePatterns = [
    /thank/i, /appreciat/i, /grateful/i, /glad/i, /happy/i, /pleased/i,
    /good/i, /great/i, /excellent/i, /wonderful/i, /amazing/i, /help/i,
    /friend/i, /ally/i, /please/i, /kind/i, /nice/i, /love/i
  ];
  
  const negativePatterns = [
    /hate/i, /dislike/i, /angry/i, /upset/i, /annoyed/i, /irritated/i,
    /bad/i, /terrible/i, /awful/i, /horrible/i, /useless/i, /stupid/i,
    /enemy/i, /foe/i, /threat/i, /attack/i, /kill/i, /hurt/i, /damn/i
  ];
  
  const positiveMatches = positivePatterns.filter(pattern => pattern.test(input)).length;
  const negativeMatches = negativePatterns.filter(pattern => pattern.test(input)).length;
  
  if (positiveMatches > negativeMatches) {
    return 'positive';
  } else if (negativeMatches > positiveMatches) {
    return 'negative';
  } else {
    return 'neutral';
  }
}

/**
 * Determine intent of player input
 * 
 * @param playerInput Player's dialogue
 * @returns Intent classification
 */
function determineIntent(playerInput: string): 'question' | 'statement' | 'greeting' | 'farewell' | 'request' | 'threat' {
  const input = playerInput.toLowerCase();
  
  // Check for questions
  if (/\?$/.test(input) || /^(what|where|when|who|why|how|can|could|would|will|do|does|did|is|are|am)/i.test(input)) {
    return 'question';
  }
  
  // Check for greetings
  if (/^(hello|hi|greetings|good (morning|afternoon|evening)|hey)/i.test(input)) {
    return 'greeting';
  }
  
  // Check for farewells
  if (/^(goodbye|farewell|bye|see you|until next time)/i.test(input)) {
    return 'farewell';
  }
  
  // Check for requests
  if (/^(please|could you|would you|can you|i need|i want|give me|tell me|show me)/i.test(input)) {
    return 'request';
  }
  
  // Check for threats
  if (/(threaten|kill|attack|hurt|destroy|punish|die|death)/i.test(input)) {
    return 'threat';
  }
  
  // Default to statement
  return 'statement';
}

/**
 * Extract entities mentioned in player input
 * 
 * @param playerInput Player's dialogue
 * @returns Array of potential entity names
 */
function extractEntities(playerInput: string): string[] {
  // This is a simple implementation - in a real system, you might
  // use more sophisticated NLP techniques or AI to extract entities
  
  const entities: string[] = [];
  
  // Look for capitalized words as potential names
  const nameRegex = /\b([A-Z][a-z]+)\b/g;
  const matches = playerInput.match(nameRegex);
  
  if (matches) {
    entities.push(...matches);
  }
  
  return entities;
}

/**
 * Parse a dialogue response from the AI to extract metadata
 * 
 * @param response Raw response from AI
 * @returns Structured dialogue result with metadata
 */
function parseDialogueResponse(response: string): DialogueResult {
  // Default values
  const result: DialogueResult = {
    response: response,
    topics: [],
    emotionalTone: 'neutral',
    relationshipImpact: 0,
    willShareKnowledge: false
  };
  
  try {
    // Check if the response has metadata in JSON format
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        // Try to parse the JSON metadata
        const metadata = JSON.parse(jsonMatch[0]);
        
        // Extract the actual dialogue from the response
        result.response = response.replace(jsonMatch[0], '').trim();
        
        // Apply metadata if available
        if (metadata.topics) result.topics = metadata.topics;
        if (metadata.emotionalTone) result.emotionalTone = metadata.emotionalTone;
        if (metadata.relationshipImpact !== undefined) {
          result.relationshipImpact = Number(metadata.relationshipImpact);
        }
        if (metadata.willShareKnowledge !== undefined) {
          result.willShareKnowledge = Boolean(metadata.willShareKnowledge);
        }
        if (metadata.bodyLanguage) result.bodyLanguage = metadata.bodyLanguage;
        
        return result;
      } catch (e) {
        // JSON parsing failed, treat the whole response as dialogue
        console.warn('Failed to parse dialogue metadata:', e);
      }
    }
    
    // If no JSON metadata found, attempt to infer some metadata from the response
    
    // Infer emotional tone
    const emotionalPatterns: Record<string, RegExp[]> = {
      'happy': [/smil(e|es|ing)/i, /laugh(s|ed|ing)?/i, /grin(s|ned|ning)?/i, /chuckl(e|es|ed|ing)/i],
      'sad': [/sigh(s|ed|ing)?/i, /frown(s|ed|ing)?/i, /tear(s|ed|ing)?/i, /sob(s|bed|bing)?/i],
      'angry': [/glare(s|ed|ing)?/i, /scowl(s|ed|ing)?/i, /growl(s|ed|ing)?/i, /snarl(s|ed|ing)?/i],
      'afraid': [/tremble(s|ed|ing)?/i, /shake(s|d|ing)?/i, /shiver(s|ed|ing)?/i, /cower(s|ed|ing)?/i],
      'surprised': [/gasp(s|ed|ing)?/i, /wide eyes/i, /startled/i, /jump(s|ed|ing)?/i],
      'thoughtful': [/ponder(s|ed|ing)?/i, /think(s|ing)?/i, /consider(s|ed|ing)?/i, /contemplat(e|es|ed|ing)/i],
      'suspicious': [/narrow(s|ed)? (his|her|their) eyes/i, /suspicious(ly)?/i, /distrust(s|ed|ing|ful)?/i]
    };
    
    for (const [emotion, patterns] of Object.entries(emotionalPatterns)) {
      if (patterns.some(pattern => pattern.test(response))) {
        result.emotionalTone = emotion;
        break;
      }
    }
    
    // Infer topics from the response
    result.topics = extractTopics(response);
    
    // Extract body language if present
    const bodyLanguageMatch = response.match(/([A-Z][^,.!?]*(?:gesture|nod|shake|cross|lean|stand|sit|step|look|glance|gaze)[^,.!?]*[,.!?])/i);
    if (bodyLanguageMatch) {
      result.bodyLanguage = bodyLanguageMatch[1].trim();
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing dialogue response:', error);
    result.response = response; // Use the full response as-is
    return result;
  }
}

/**
 * Build a context string for personality traits
 * 
 * @param npcId NPC ID
 * @param tracker Personality consistency tracker
 * @returns Formatted personality context string
 */
function buildPersonalityContext(
  npcId: string,
  tracker: NPCPersonalityConsistencyTracker
): string {
  const traits = tracker.getTraits(npcId);
  
  if (traits.length === 0) {
    return '';
  }
  
  const parts: string[] = [];
  parts.push('## Personality Traits');
  
  // Sort traits by confidence, highest first
  const sortedTraits = [...traits].sort((a, b) => b.confidence - a.confidence);
  
  // Add established traits (with sufficient confidence)
  const establishedTraits = sortedTraits.filter(t => t.confidence >= 3);
  
  if (establishedTraits.length > 0) {
    parts.push('Established traits:');
    establishedTraits.forEach(trait => {
      parts.push(`- ${trait.trait} (confidence: ${trait.confidence}): ${trait.description}`);
      if (trait.examples.length > 0) {
        parts.push(`  Example: "${trait.examples[0]}"`);
      }
    });
  }
  
  // Add potential traits (with lower confidence)
  const potentialTraits = sortedTraits.filter(t => t.confidence < 3);
  
  if (potentialTraits.length > 0) {
    parts.push('\nPotential traits (less certain):');
    potentialTraits.forEach(trait => {
      parts.push(`- ${trait.trait} (confidence: ${trait.confidence}): ${trait.description}`);
    });
  }
  
  return parts.join('\n');
}

export default {
  generateEnhancedNPCDialogue,
  DEFAULT_DIALOGUE_OPTIONS
}; 