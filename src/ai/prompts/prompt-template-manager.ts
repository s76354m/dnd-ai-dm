/**
 * Prompt Template Manager
 * 
 * This file provides utilities for managing prompt templates for different AI operations.
 * It supports loading from files, runtime modifications, and template rendering with variables.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Template categories/domains
 */
export type PromptCategory = 
  | 'narrative' 
  | 'combat' 
  | 'npc' 
  | 'worldgen'
  | 'character'
  | 'quest'
  | 'system';

/**
 * Template types for each category
 */
export interface PromptTemplateTypes {
  narrative: 'scene_description' | 'player_action_response' | 'world_reaction' | 'transition';
  combat: 'initialize' | 'turn_narration' | 'critical_hit' | 'critical_fail' | 'death' | 'victory';
  npc: 'dialogue' | 'reaction' | 'background' | 'motivation' | 'speech_pattern';
  worldgen: 'location' | 'item' | 'lore' | 'history' | 'rumor';
  character: 'introduction' | 'backstory' | 'motivation' | 'development';
  quest: 'hook' | 'objective' | 'complication' | 'resolution' | 'reward';
  system: 'error' | 'help' | 'welcome' | 'thinking' | 'instructions';
}

/**
 * Union of all prompt types across all categories
 */
export type PromptType = {
  [K in keyof PromptTemplateTypes]: `${K}.${PromptTemplateTypes[K]}`
}[keyof PromptTemplateTypes];

/**
 * Variables for template rendering
 */
export type TemplateVariables = Record<string, string | number | boolean | undefined | null | any[]>;

/**
 * Prompt template manager configuration
 */
export interface PromptTemplateManagerConfig {
  /** Base directory for prompt templates */
  templatesDir?: string;
  /** Fallback to built-in templates if file not found */
  useBuiltInFallback?: boolean;
  /** Whether to cache templates in memory */
  cacheTemplates?: boolean;
}

/**
 * Manages prompt templates for AI interactions
 */
export class PromptTemplateManager {
  private static instance: PromptTemplateManager;
  private templates: Map<string, string> = new Map();
  private config: PromptTemplateManagerConfig;
  
  // Built-in default templates as fallback
  private static readonly BUILT_IN_TEMPLATES: Record<PromptType, string> = {
    // Narrative templates
    'narrative.scene_description': 
      `Describe the following scene in vivid detail: {{scene}}. 
       Include sensory details and atmosphere. Current mood: {{mood}}.`,
    
    'narrative.player_action_response': 
      `The player character {{character}} has just {{action}} in {{location}}. 
       Describe the outcome and consequences of this action in the world.`,
    
    'narrative.world_reaction': 
      `Describe how the world and NPCs react to {{event}} that just occurred.
       Consider the following context: {{context}}.`,
    
    'narrative.transition': 
      `Create a transition from {{currentScene}} to {{nextScene}}.
       Time passing: {{timePassing}}. Important events: {{events}}.`,
    
    // Combat templates
    'combat.initialize': 
      `A battle is beginning between {{allies}} and {{enemies}} in {{location}}.
       Set the scene for this combat encounter, describing the initial positions and tension.`,
    
    'combat.turn_narration': 
      `{{actor}} uses {{action}} against {{target}}. 
       Result: {{result}}. Describe this combat action in exciting detail.`,
    
    'combat.critical_hit': 
      `{{actor}} has landed a CRITICAL HIT on {{target}} with {{attack}}, dealing {{damage}} damage! 
       Describe this devastating blow in vivid, cinematic detail.`,
    
    'combat.critical_fail': 
      `{{actor}} has CRITICALLY FAILED their {{action}}! 
       Describe this dramatic failure and its immediate consequences.`,
    
    'combat.death': 
      `{{character}} has fallen in battle due to {{cause}}. 
       Describe their final moments and the immediate reaction of allies.`,
    
    'combat.victory': 
      `The battle against {{enemies}} has ended in victory for the party.
       Describe the aftermath of battle, the state of the victors, and the scene that remains.`,
    
    // NPC templates
    'npc.dialogue': 
      `Generate dialogue for {{npc}}, a {{description}} responding to {{context}}.
       Their personality traits include: {{traits}}. Current mood: {{mood}}.`,
    
    'npc.reaction': 
      `{{npc}} is reacting to {{event}}. Given their personality ({{personality}}) 
       and current mood ({{mood}}), describe their reaction in detail.`,
    
    'npc.background': 
      `Create a background story for {{npc}}, a {{description}} from {{origin}}.
       Include key life events, motivations, and secrets.`,
    
    'npc.motivation': 
      `Explain the deep motivations of {{npc}} regarding {{subject}}.
       Consider their background: {{background}} and current goals: {{goals}}.`,
    
    'npc.speech_pattern': 
      `Develop a distinctive speech pattern for {{npc}}, a {{race}} {{occupation}} from {{region}}.
       Include vocabulary choices, verbal tics, accent notes, and speech mannerisms.`,
    
    // World generation templates
    'worldgen.location': 
      `Create a detailed description of {{locationName}}, a {{locationType}} in {{region}}.
       Include geographical features, notable structures, inhabitants, and atmosphere.`,
    
    'worldgen.item': 
      `Create a detailed description for {{itemName}}, a {{itemType}}.
       Include physical description, history, and any magical properties.`,
    
    'worldgen.lore': 
      `Generate lore about {{subject}} in the world.
       Include historical significance, common knowledge, and hidden truths.`,
    
    'worldgen.history': 
      `Create a historical account of {{event}} that occurred {{timeframe}} in {{location}}.
       Include causes, major figures involved, outcomes, and long-term significance.`,
    
    'worldgen.rumor': 
      `Generate {{rumorsCount}} rumors related to {{subject}} that the players might hear in {{location}}.
       Include a mix of true, partially true, and false information.`,
    
    // Character templates
    'character.introduction': 
      `Create an introduction for {{characterName}}, a {{race}} {{class}} with {{background}} background.
       Describe their appearance, demeanor, and initial impression they make.`,
    
    'character.backstory': 
      `Create a backstory for {{characterName}}, a {{race}} {{class}} from {{origin}}.
       Include formative experiences, key relationships, motivations, and secrets.`,
    
    'character.motivation': 
      `Explore the motivations of {{characterName}} regarding {{goal}}.
       Consider their background: {{background}} and personality traits: {{traits}}.`,
    
    'character.development': 
      `Suggest character development for {{characterName}} after experiencing {{event}}.
       How might this change them? Consider their current traits: {{traits}}.`,
    
    // Quest templates
    'quest.hook': 
      `Create a quest hook for a {{difficultyLevel}} quest involving {{theme}}.
       The hook should be presented by {{questGiver}} in {{location}}.`,
    
    'quest.objective': 
      `Define the main objective and possible approaches for a quest to {{objective}}.
       Include challenges, potential allies/enemies, and complications.`,
    
    'quest.complication': 
      `Create a complication for a quest where the party needs to {{objective}}.
       Current situation: {{situation}}. This complication should add depth and challenge.`,
    
    'quest.resolution': 
      `Create possible resolution scenarios for a quest where the party has {{currentSituation}}.
       Include at least three different possible outcomes with consequences.`,
    
    'quest.reward': 
      `Design appropriate rewards for a {{difficultyLevel}} quest where the party {{achievement}}.
       Include treasure, items, experience, and potential non-material rewards.`,
    
    // System templates
    'system.error': 
      `I apologize, but I've encountered an issue: {{errorMessage}}
       Let me try a different approach to help you with {{request}}.`,
    
    'system.help': 
      `Here are commands and options available to you as a player:
       
       {{commandsList}}
       
       What would you like to do?`,
    
    'system.welcome': 
      `Welcome to the world of {{worldName}}! I'll be your AI Dungeon Master for this adventure.
       
       {{worldDescription}}
       
       {{characterIntro}}
       
       What would you like to do first?`,
    
    'system.thinking': 
      `I'm considering how to handle {{situation}} in a way that's balanced, engaging, and consistent with D&D rules.
       Factors I'm considering: {{factors}}`,
    
    'system.instructions': 
      `You are an AI Dungeon Master for a D&D 5e game. Your goal is to provide an engaging, balanced, and immersive experience.
       
       Follow these principles:
       1. Keep the game moving and exciting
       2. Be fair but challenging
       3. Focus on player agency and choices
       4. Create vivid descriptions and memorable characters
       5. Balance combat, exploration, and social interaction
       
       Current campaign: {{campaign}}
       Current party: {{party}}
       
       Remember these house rules: {{houseRules}}`
  };
  
  /**
   * Get singleton instance
   */
  public static getInstance(config?: PromptTemplateManagerConfig): PromptTemplateManager {
    if (!PromptTemplateManager.instance) {
      PromptTemplateManager.instance = new PromptTemplateManager(config);
    }
    return PromptTemplateManager.instance;
  }
  
  /**
   * Private constructor - use getInstance() instead
   */
  private constructor(config?: PromptTemplateManagerConfig) {
    this.config = {
      templatesDir: path.join(process.cwd(), 'templates', 'prompts'),
      useBuiltInFallback: true,
      cacheTemplates: true,
      ...config
    };
    
    // Create templates directory if it doesn't exist
    if (!fs.existsSync(this.config.templatesDir!)) {
      fs.mkdirSync(this.config.templatesDir!, { recursive: true });
    }
  }
  
  /**
   * Get a template by type
   * 
   * @param type Template type
   * @returns Template string
   */
  public getTemplate(type: PromptType): string {
    // Check cache first
    if (this.templates.has(type)) {
      return this.templates.get(type)!;
    }
    
    // Try to load from file
    const template = this.loadTemplateFromFile(type);
    
    // Cache if enabled
    if (this.config.cacheTemplates && template) {
      this.templates.set(type, template);
    }
    
    return template;
  }
  
  /**
   * Render a template with variables
   * 
   * @param type Template type
   * @param variables Variables to render
   * @returns Rendered template
   */
  public renderTemplate(type: PromptType, variables: TemplateVariables = {}): string {
    const template = this.getTemplate(type);
    
    // Replace variables in template (format: {{variableName}})
    return template.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const value = variables[varName];
      return value !== undefined && value !== null ? String(value) : match;
    });
  }
  
  /**
   * Set or override a template
   * 
   * @param type Template type
   * @param template Template content
   * @param saveToFile Whether to save to file
   * @returns Success status
   */
  public setTemplate(type: PromptType, template: string, saveToFile = false): boolean {
    // Update cache
    this.templates.set(type, template);
    
    // Save to file if requested
    if (saveToFile) {
      return this.saveTemplateToFile(type, template);
    }
    
    return true;
  }
  
  /**
   * Load all templates from files
   */
  public loadAllTemplates(): void {
    // Clear cache
    this.templates.clear();
    
    // Get all prompt types from the built-in templates
    const types = Object.keys(PromptTemplateManager.BUILT_IN_TEMPLATES) as PromptType[];
    
    // Load each template
    for (const type of types) {
      this.getTemplate(type);
    }
  }
  
  /**
   * Export all templates to files
   * 
   * @returns Number of templates exported
   */
  public exportAllTemplates(): number {
    let exported = 0;
    
    // Get all prompt types from the built-in templates
    const types = Object.keys(PromptTemplateManager.BUILT_IN_TEMPLATES) as PromptType[];
    
    // Save each template
    for (const type of types) {
      const template = PromptTemplateManager.BUILT_IN_TEMPLATES[type];
      if (this.saveTemplateToFile(type, template)) {
        exported++;
      }
    }
    
    return exported;
  }
  
  /**
   * Load template from file
   * 
   * @param type Template type
   * @returns Template content
   */
  private loadTemplateFromFile(type: PromptType): string {
    try {
      // Split type into category and name
      const [category, name] = type.split('.');
      
      // Build file path
      const filePath = path.join(
        this.config.templatesDir!,
        category,
        `${name}.txt`
      );
      
      // Check if file exists
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
      
      // Fall back to built-in template if enabled
      if (this.config.useBuiltInFallback) {
        return PromptTemplateManager.BUILT_IN_TEMPLATES[type];
      }
      
      // No template found
      throw new Error(`Template not found: ${type}`);
    } catch (error) {
      console.error(`Error loading template ${type}:`, error);
      
      // Return built-in template if fallback is enabled
      if (this.config.useBuiltInFallback) {
        return PromptTemplateManager.BUILT_IN_TEMPLATES[type];
      }
      
      // Return empty string if no fallback
      return '';
    }
  }
  
  /**
   * Save template to file
   * 
   * @param type Template type
   * @param content Template content
   * @returns Success status
   */
  private saveTemplateToFile(type: PromptType, content: string): boolean {
    try {
      // Split type into category and name
      const [category, name] = type.split('.');
      
      // Build directory path
      const dirPath = path.join(this.config.templatesDir!, category);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Build file path
      const filePath = path.join(dirPath, `${name}.txt`);
      
      // Write template to file
      fs.writeFileSync(filePath, content, 'utf8');
      
      return true;
    } catch (error) {
      console.error(`Error saving template ${type}:`, error);
      return false;
    }
  }
  
  /**
   * Create a custom template on the fly (not saved to file)
   * 
   * @param content Template content
   * @param variables Variables to replace
   * @returns Rendered template
   */
  public createCustomTemplate(content: string, variables: TemplateVariables = {}): string {
    // Replace variables in template (format: {{variableName}})
    return content.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const value = variables[varName];
      return value !== undefined && value !== null ? String(value) : match;
    });
  }
  
  /**
   * Get all available template types
   * 
   * @returns Array of template types
   */
  public getAvailableTemplateTypes(): PromptType[] {
    return Object.keys(PromptTemplateManager.BUILT_IN_TEMPLATES) as PromptType[];
  }
  
  /**
   * Get all templates in a category
   * 
   * @param category Category to get templates for
   * @returns Record of template name to content
   */
  public getTemplatesByCategory(category: PromptCategory): Record<string, string> {
    const result: Record<string, string> = {};
    
    // Get all template types from the built-in templates
    const types = Object.keys(PromptTemplateManager.BUILT_IN_TEMPLATES) as PromptType[];
    
    // Filter by category and add to result
    for (const type of types) {
      if (type.startsWith(`${category}.`)) {
        const templateName = type.split('.')[1];
        result[templateName] = this.getTemplate(type);
      }
    }
    
    return result;
  }
} 