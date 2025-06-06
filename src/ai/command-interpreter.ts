/**
 * Command Interpreter
 * 
 * This module processes natural language commands from the player and converts
 * them into structured commands that the game engine can understand.
 */

import { SimpleAIService } from './simple-ai-service';
import { RealAIService } from './real-ai-service';

import { CommandContext } from './enhanced-ai-service';
import { envLoader } from '../utils/env-loader';

export interface InterpretedCommand {
  type: string;
  action: string;
  target?: string;
  parameters?: Record<string, any>;
  originalInput: string;
  confidence: number;
}

export interface CommandMatch {
  command: string;
  confidence: number;
  parameters: Record<string, any>;
}

export class CommandInterpreter {
  private simpleAIService?: SimpleAIService;
  private realAIService?: RealAIService;
  private useRealAI: boolean;
  
  // Command patterns for matching natural language
  private readonly movementPatterns = [
    /go (?:to the |to |towards |toward |into the |into |in the |in |the |)?(\w+)/i,
    /move (?:to the |to |towards |toward |into the |into |in the |in |the |)?(\w+)/i,
    /walk (?:to the |to |towards |toward |into the |into |in the |in |the |)?(\w+)/i,
    /approach (?:the |to the |to |)?(\w+)/i,
    /enter (?:the |into the |into |)?(\w+)/i,
  ];
  
  private readonly searchPatterns = [
    /search (?:the |this |around |for |)?(.+)?/i,
    /look (?:around|for|at) (.+)?/i,
    /examine (?:the |this |around |)?(.+)?/i,
    /inspect (?:the |this |around |)?(.+)?/i,
    /investigate (?:the |this |around |)?(.+)?/i,
    /check (?:the |this |for |)?(.+)?/i,
    /scan (?:the |this |for |)?(.+)?/i,
    /explore (?:the |this |around |)?(.+)?/i,
  ];
  
  private readonly interactionPatterns = [
    /talk (?:to|with) (?:the |this |)?(.+)/i,
    /speak (?:to|with) (?:the |this |)?(.+)/i,
    /ask (?:the |this |)?(.+) about (.+)/i,
    /greet (?:the |this |)?(.+)/i,
    /interview (?:the |this |)?(.+)/i,
  ];
  
  private readonly combatPatterns = [
    /attack (?:the |this |)?(.+) with (?:my |the |)?(.+)/i,
    /hit (?:the |this |)?(.+) with (?:my |the |)?(.+)/i,
    /strike (?:the |this |)?(.+) with (?:my |the |)?(.+)/i,
    /cast (.+) (?:on|at) (?:the |this |)?(.+)/i,
    /use (.+) (?:on|against) (?:the |this |)?(.+)/i,
    /fight (?:the |this |)?(.+)?/i,
  ];
  
  private readonly itemPatterns = [
    /take (?:the |this |)?(.+)/i,
    /pick up (?:the |this |)?(.+)/i,
    /grab (?:the |this |)?(.+)/i,
    /get (?:the |this |)?(.+)/i,
    /use (?:the |this |)?(.+)/i,
    /equip (?:the |this |)?(.+)/i,
    /open (?:the |this |)?(.+)/i,
    /drink (?:the |this |)?(.+)/i,
    /eat (?:the |this |)?(.+)/i,
  ];
  
  constructor(aiService: SimpleAIService | RealAIService) {
    // Determine which type of AI service was provided
    if (aiService instanceof SimpleAIService) {
      this.simpleAIService = aiService;
      this.useRealAI = false;
    } else if (aiService instanceof RealAIService) {
      this.realAIService = aiService;
      this.useRealAI = true;
    } else {
      // Default to simple AI service if type is unknown
      this.simpleAIService = new SimpleAIService();
      this.useRealAI = false;
      console.warn('Unknown AI service type provided to CommandInterpreter. Using SimpleAIService as fallback.');
    }
    
    // Log which service we're using
    console.log(`CommandInterpreter initialized with ${this.useRealAI ? 'RealAIService' : 'SimpleAIService'}`);
  }
  
  /**
   * Interpret a natural language command
   * 
   * @param input The natural language command from the player
   * @param context The current command context
   * @returns The interpreted command with structured information
   */
  public async interpret(input: string, context: CommandContext): Promise<InterpretedCommand> {
    // Trim and normalize the input
    const normalizedInput = input.trim().toLowerCase();
    
    // Check if it's an exact match for a system command first
    const systemMatch = this.matchSystemCommand(normalizedInput);
    if (systemMatch.confidence > 0.8) {
      return {
        type: "system",
        action: systemMatch.command,
        parameters: systemMatch.parameters,
        originalInput: input,
        confidence: systemMatch.confidence
      };
    }
    
    // Try to match it with one of our command patterns
    const movementMatch = this.matchCommandType(normalizedInput, this.movementPatterns);
    if (movementMatch.confidence > 0.7) {
      return {
        type: "movement",
        action: "move",
        target: movementMatch.parameters.target,
        parameters: movementMatch.parameters,
        originalInput: input,
        confidence: movementMatch.confidence
      };
    }
    
    const searchMatch = this.matchCommandType(normalizedInput, this.searchPatterns);
    if (searchMatch.confidence > 0.7) {
      return {
        type: "search",
        action: "search",
        target: searchMatch.parameters.target,
        parameters: searchMatch.parameters,
        originalInput: input,
        confidence: searchMatch.confidence
      };
    }
    
    const interactionMatch = this.matchCommandType(normalizedInput, this.interactionPatterns);
    if (interactionMatch.confidence > 0.7) {
      return {
        type: "interaction",
        action: "talk",
        target: interactionMatch.parameters.target,
        parameters: interactionMatch.parameters,
        originalInput: input,
        confidence: interactionMatch.confidence
      };
    }
    
    const combatMatch = this.matchCommandType(normalizedInput, this.combatPatterns);
    if (combatMatch.confidence > 0.7) {
      return {
        type: "combat",
        action: "attack",
        target: combatMatch.parameters.target,
        parameters: combatMatch.parameters,
        originalInput: input,
        confidence: combatMatch.confidence
      };
    }
    
    const itemMatch = this.matchCommandType(normalizedInput, this.itemPatterns);
    if (itemMatch.confidence > 0.7) {
      return {
        type: "item",
        action: "use",
        target: itemMatch.parameters.target,
        parameters: itemMatch.parameters,
        originalInput: input,
        confidence: itemMatch.confidence
      };
    }
    
    // For anything else, use the appropriate AI service to interpret the command
    return this.aiInterpretation(input, context);
  }
  
  /**
   * Match system commands like "help", "inventory", etc.
   * 
   * @param input The normalized input string
   * @returns The matched command with confidence
   */
  private matchSystemCommand(input: string): CommandMatch {
    if (input === "help" || input === "h" || input === "?") {
      return { command: "help", confidence: 1, parameters: {} };
    }
    
    if (input === "inventory" || input === "i" || input === "items") {
      return { command: "inventory", confidence: 1, parameters: {} };
    }
    
    if (input === "character" || input === "stats" || input === "c") {
      return { command: "character", confidence: 1, parameters: {} };
    }
    
    if (input === "exit" || input === "quit" || input === "q") {
      return { command: "exit", confidence: 1, parameters: {} };
    }
    
    if (input === "rest" || input === "sleep" || input === "camp") {
      return { command: "rest", confidence: 1, parameters: {} };
    }
    
    return { command: "", confidence: 0, parameters: {} };
  }
  
  /**
   * Match a command with a set of patterns
   * 
   * @param input The normalized input string
   * @param patterns Array of regex patterns to try
   * @returns The matched command with confidence and parameters
   */
  private matchCommandType(input: string, patterns: RegExp[]): CommandMatch {
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        // Different patterns have different group structures
        if (pattern.toString().includes("with") && match[2]) {
          // Format: attack [target] with [weapon]
          return {
            command: pattern.toString().includes("cast") ? "cast" : "attack",
            confidence: 0.9,
            parameters: {
              target: match[1].trim(),
              tool: match[2].trim()
            }
          };
        } else if (match[1]) {
          // Most common case: command with a target
          return {
            command: this.getCommandFromPattern(pattern),
            confidence: 0.8,
            parameters: {
              target: match[1].trim()
            }
          };
        } else {
          // Command without a target
          return {
            command: this.getCommandFromPattern(pattern),
            confidence: 0.8,
            parameters: {}
          };
        }
      }
    }
    
    return { command: "", confidence: 0, parameters: {} };
  }
  
  /**
   * Get the base command from a pattern
   * 
   * @param pattern The regex pattern
   * @returns The base command
   */
  private getCommandFromPattern(pattern: RegExp): string {
    const patternStr = pattern.toString();
    
    if (patternStr.includes("move") || patternStr.includes("go") || patternStr.includes("approach")) {
      return "move";
    }
    
    if (patternStr.includes("search") || patternStr.includes("look") || patternStr.includes("examine")) {
      return "search";
    }
    
    if (patternStr.includes("talk") || patternStr.includes("speak") || patternStr.includes("ask")) {
      return "talk";
    }
    
    if (patternStr.includes("attack") || patternStr.includes("hit") || patternStr.includes("cast")) {
      return "attack";
    }
    
    if (patternStr.includes("take") || patternStr.includes("pick up") || patternStr.includes("grab")) {
      return "take";
    }
    
    if (patternStr.includes("use") || patternStr.includes("equip")) {
      return "use";
    }
    
    return "";
  }
  
  /**
   * Use AI to interpret a command that doesn't match any patterns
   * 
   * @param input The original input from the player
   * @param context The current command context
   * @returns The interpreted command
   */
  private async aiInterpretation(input: string, context: CommandContext): Promise<InterpretedCommand> {
    try {
      if (this.useRealAI && this.realAIService) {
        // Use the real AI service for interpretation
        return await this.realAIService.interpretCommand(input, context);
      } else if (this.simpleAIService) {
        // Use the simple AI service as fallback
        return this.localCommandInterpretation(input, context);
      } else {
        throw new Error('No AI service available for command interpretation');
      }
    } catch (error) {
      console.error('Error during AI interpretation:', error);
      
      // Fallback to local interpretation if AI fails
      return this.localCommandInterpretation(input, context);
    }
  }
  
  /**
   * Local command interpretation without using external AI
   * 
   * @param input The original input from the player
   * @param context The current command context
   * @returns The interpreted command
   */
  private localCommandInterpretation(input: string, context: CommandContext): InterpretedCommand {
    const normalizedInput = input.toLowerCase();
    
    // Check for common keywords to determine command type
    if (normalizedInput.includes('go') || normalizedInput.includes('move') || 
        normalizedInput.includes('walk') || normalizedInput.includes('travel')) {
      // Extract potential location from the command
      const words = normalizedInput.split(' ');
      const locationWords = words.filter(w => 
        w !== 'go' && w !== 'to' && w !== 'move' && w !== 'walk' && 
        w !== 'travel' && w !== 'the' && w !== 'towards' && w !== 'toward'
      );
      
      return {
        type: 'movement',
        action: 'move',
        target: locationWords.join(' '),
        parameters: { target: locationWords.join(' ') },
        originalInput: input,
        confidence: 0.6
      };
    }
    
    if (normalizedInput.includes('look') || normalizedInput.includes('search') || 
        normalizedInput.includes('examine') || normalizedInput.includes('inspect')) {
      // Extract what they're looking at/for
      const words = normalizedInput.split(' ');
      const targetWords = words.filter(w => 
        w !== 'look' && w !== 'at' && w !== 'search' && w !== 'for' && 
        w !== 'examine' && w !== 'inspect' && w !== 'the'
      );
      
      return {
        type: 'search',
        action: 'search',
        target: targetWords.join(' ') || 'around',
        parameters: { target: targetWords.join(' ') || 'around' },
        originalInput: input,
        confidence: 0.6
      };
    }
    
    if (normalizedInput.includes('talk') || normalizedInput.includes('speak') || 
        normalizedInput.includes('ask') || normalizedInput.includes('tell')) {
      // Try to find an NPC name in the command
      const npcNames = context.npcsPresent.map(npc => npc.name.toLowerCase());
      const words = normalizedInput.split(' ');
      
      let targetNPC = '';
      for (const word of words) {
        if (npcNames.some(name => name.includes(word) || word.includes(name))) {
          targetNPC = context.npcsPresent.find(
            npc => npc.name.toLowerCase().includes(word) || word.includes(npc.name.toLowerCase())
          )?.name || '';
          break;
        }
      }
      
      return {
        type: 'interaction',
        action: 'talk',
        target: targetNPC || 'someone',
        parameters: { target: targetNPC || 'someone' },
        originalInput: input,
        confidence: 0.5
      };
    }
    
    if (normalizedInput.includes('attack') || normalizedInput.includes('fight') || 
        normalizedInput.includes('hit') || normalizedInput.includes('kill')) {
      // Try to find an enemy name in the command
      const enemyNames = context.gameState.enemies.map(e => e.name.toLowerCase());
      const words = normalizedInput.split(' ');
      
      let targetEnemy = '';
      for (const word of words) {
        if (enemyNames.some(name => name.includes(word) || word.includes(name))) {
          targetEnemy = context.gameState.enemies.find(
            e => e.name.toLowerCase().includes(word) || word.includes(e.name.toLowerCase())
          )?.name || '';
          break;
        }
      }
      
      return {
        type: 'combat',
        action: 'attack',
        target: targetEnemy || 'enemy',
        parameters: { target: targetEnemy || 'enemy' },
        originalInput: input,
        confidence: 0.5
      };
    }
    
    // Default to unknown command with low confidence
    return {
      type: 'system',
      action: 'unknown',
      originalInput: input,
      confidence: 0.2
    };
  }
} 