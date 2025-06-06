/**
 * Context Optimizer
 * 
 * This system optimizes the AI context window by selecting the most relevant
 * information, summarizing lengthy contexts, and managing token budgets.
 */

import { MemoryManager, MemoryType, MemoryItem } from './memory-manager';
import { RelationshipTracker } from './relationship-tracker';
import { GameState } from '../../core/interfaces/game';

/**
 * Context window section
 */
export interface ContextSection {
  name: string;
  content: string;
  priority: number;  // 1-10, higher = more important
  tokenCount: number;
  category: string;
}

/**
 * Context optimization configuration
 */
export interface ContextOptimizerConfig {
  maxTotalTokens: number;       // Maximum tokens for entire context
  summaryThreshold: number;     // Number of tokens at which to summarize
  reservedTokens: Record<string, number>;  // Tokens reserved for each section
  sectionPriorities: Record<string, number>;  // Priority for each section
  scenarioSpecificBoosts: Record<string, Record<string, number>>;  // Boost priorities in specific scenarios
}

/**
 * Game scenario type for context optimization
 */
export enum GameScenario {
  COMBAT = 'combat',
  SOCIAL = 'social',
  EXPLORATION = 'exploration',
  PUZZLE = 'puzzle',
  SHOPPING = 'shopping',
  QUEST = 'quest',
  REST = 'rest',
  TRAVEL = 'travel'
}

/**
 * Context window sections
 */
export enum ContextSectionType {
  PLAYER_INFO = 'player_info',
  LOCATION = 'location',
  ACTIVE_NPCS = 'active_npcs',
  RECENT_EVENTS = 'recent_events',
  RELATIONSHIPS = 'relationships',
  QUESTS = 'quests',
  WORLD_STATE = 'world_state',
  SYSTEM_INSTRUCTIONS = 'system_instructions',
  RULES_REFERENCE = 'rules_reference'
}

/**
 * Manages and optimizes AI context windows
 */
export class ContextOptimizer {
  private memoryManager: MemoryManager;
  private relationshipTracker: RelationshipTracker;
  private config: ContextOptimizerConfig;
  private currentScenario: GameScenario = GameScenario.EXPLORATION;
  
  constructor(
    memoryManager: MemoryManager, 
    relationshipTracker: RelationshipTracker,
    config?: Partial<ContextOptimizerConfig>
  ) {
    this.memoryManager = memoryManager;
    this.relationshipTracker = relationshipTracker;
    
    // Default configuration
    this.config = {
      maxTotalTokens: 4000,
      summaryThreshold: 500,
      reservedTokens: {
        [ContextSectionType.PLAYER_INFO]: 300,
        [ContextSectionType.LOCATION]: 300,
        [ContextSectionType.ACTIVE_NPCS]: 500,
        [ContextSectionType.RECENT_EVENTS]: 1000,
        [ContextSectionType.RELATIONSHIPS]: 500,
        [ContextSectionType.QUESTS]: 500,
        [ContextSectionType.WORLD_STATE]: 300,
        [ContextSectionType.SYSTEM_INSTRUCTIONS]: 500,
        [ContextSectionType.RULES_REFERENCE]: 200
      },
      sectionPriorities: {
        [ContextSectionType.PLAYER_INFO]: 9,
        [ContextSectionType.LOCATION]: 8,
        [ContextSectionType.ACTIVE_NPCS]: 7,
        [ContextSectionType.RECENT_EVENTS]: 10,
        [ContextSectionType.RELATIONSHIPS]: 6,
        [ContextSectionType.QUESTS]: 7,
        [ContextSectionType.WORLD_STATE]: 5,
        [ContextSectionType.SYSTEM_INSTRUCTIONS]: 10,
        [ContextSectionType.RULES_REFERENCE]: 4
      },
      scenarioSpecificBoosts: {
        [GameScenario.COMBAT]: {
          [ContextSectionType.RULES_REFERENCE]: 3,
          [ContextSectionType.PLAYER_INFO]: 1
        },
        [GameScenario.SOCIAL]: {
          [ContextSectionType.RELATIONSHIPS]: 4,
          [ContextSectionType.ACTIVE_NPCS]: 2
        },
        [GameScenario.EXPLORATION]: {
          [ContextSectionType.LOCATION]: 2,
          [ContextSectionType.WORLD_STATE]: 2
        },
        [GameScenario.QUEST]: {
          [ContextSectionType.QUESTS]: 3,
          [ContextSectionType.RELATIONSHIPS]: 1
        }
      },
      ...config
    };
  }
  
  /**
   * Set the current game scenario for context optimization
   */
  public setScenario(scenario: GameScenario): void {
    this.currentScenario = scenario;
  }
  
  /**
   * Detect the current scenario based on game state
   */
  public detectScenario(gameState: GameState): GameScenario {
    // Is the player in combat?
    if (gameState.combatState && gameState.combatState.active) {
      return GameScenario.COMBAT;
    }
    
    // Is the player in a shop?
    if (gameState.currentLocation.tags?.includes('shop')) {
      return GameScenario.SHOPPING;
    }
    
    // Is the player resting?
    if (gameState.currentAction === 'rest') {
      return GameScenario.REST;
    }
    
    // Is the player traveling?
    if (gameState.currentAction === 'travel') {
      return GameScenario.TRAVEL;
    }
    
    // Is the player in a conversation with NPCs?
    if (gameState.currentAction === 'talk' || gameState.dialogue?.active) {
      return GameScenario.SOCIAL;
    }
    
    // Is the player solving a puzzle?
    if (gameState.currentLocation.tags?.includes('puzzle')) {
      return GameScenario.PUZZLE;
    }
    
    // Is the player focused on a quest?
    if (gameState.currentAction === 'quest') {
      return GameScenario.QUEST;
    }
    
    // Default to exploration
    return GameScenario.EXPLORATION;
  }
  
  /**
   * Build a complete optimized context window for the current game state
   */
  public buildOptimizedContext(gameState: GameState): string {
    // Detect scenario if not explicitly set
    if (!this.currentScenario) {
      this.currentScenario = this.detectScenario(gameState);
    }
    
    // Build sections
    const sections: ContextSection[] = [
      this.buildPlayerInfoSection(gameState),
      this.buildLocationSection(gameState),
      this.buildActiveNPCsSection(gameState),
      this.buildRecentEventsSection(gameState),
      this.buildRelationshipsSection(gameState),
      this.buildQuestsSection(gameState),
      this.buildWorldStateSection(gameState),
      this.buildSystemInstructionsSection(gameState),
      this.buildRulesReferenceSection(gameState)
    ];
    
    // Apply scenario-specific priority boosts
    this.applyScenarioBoosts(sections);
    
    // Sort sections by priority (higher first)
    sections.sort((a, b) => b.priority - a.priority);
    
    // Calculate current token count
    const totalTokens = sections.reduce((sum, section) => sum + section.tokenCount, 0);
    
    // If we're over the limit, trim sections
    if (totalTokens > this.config.maxTotalTokens) {
      this.trimSectionsToFit(sections);
    }
    
    // Format and return the final context
    return this.formatContextSections(sections);
  }
  
  /**
   * Apply scenario-specific priority boosts to context sections
   */
  private applyScenarioBoosts(sections: ContextSection[]): void {
    const boosts = this.config.scenarioSpecificBoosts[this.currentScenario];
    if (!boosts) return;
    
    for (const section of sections) {
      if (boosts[section.name]) {
        section.priority += boosts[section.name];
      }
    }
  }
  
  /**
   * Trim sections to fit within token limit while respecting priorities
   */
  private trimSectionsToFit(sections: ContextSection[]): void {
    // Calculate how many tokens we need to trim
    const totalTokens = sections.reduce((sum, section) => sum + section.tokenCount, 0);
    const excessTokens = totalTokens - this.config.maxTotalTokens;
    
    if (excessTokens <= 0) return;
    
    // Sort by priority (lower first, so we trim least important first)
    sections.sort((a, b) => a.priority - b.priority);
    
    let tokensToTrim = excessTokens;
    
    // First pass: try to trim sections without going below their reserved tokens
    for (let i = 0; i < sections.length && tokensToTrim > 0; i++) {
      const section = sections[i];
      const reservedTokens = this.config.reservedTokens[section.name] || 0;
      
      // How much can we trim from this section?
      const maxTrimFromSection = Math.max(0, section.tokenCount - reservedTokens);
      
      if (maxTrimFromSection > 0) {
        // Trim either what we need or what's available, whichever is less
        const tokensToTrimFromSection = Math.min(tokensToTrim, maxTrimFromSection);
        section.tokenCount -= tokensToTrimFromSection;
        tokensToTrim -= tokensToTrimFromSection;
        
        // Summarize the section content if it's been trimmed significantly
        if (tokensToTrimFromSection > this.config.summaryThreshold) {
          section.content = this.summarizeSection(section.content, section.tokenCount);
        } else {
          // Just trim the content proportionally
          section.content = this.trimContent(section.content, 
            (section.tokenCount + tokensToTrimFromSection) / section.tokenCount);
        }
      }
    }
    
    // If we still need to trim more, we'll have to go below reserved tokens
    // Second pass: proportionally reduce all sections
    if (tokensToTrim > 0) {
      const remainingTokens = sections.reduce((sum, section) => sum + section.tokenCount, 0);
      
      for (let i = 0; i < sections.length && tokensToTrim > 0; i++) {
        const section = sections[i];
        
        // Calculate how much to trim proportionally
        const sectionProportion = section.tokenCount / remainingTokens;
        const tokensToTrimFromSection = Math.ceil(tokensToTrim * sectionProportion);
        
        // Don't trim to zero
        const actualTrim = Math.min(tokensToTrimFromSection, section.tokenCount - 10);
        
        if (actualTrim > 0) {
          section.tokenCount -= actualTrim;
          tokensToTrim -= actualTrim;
          
          // Summarize or trim the section
          if (actualTrim > this.config.summaryThreshold) {
            section.content = this.summarizeSection(section.content, section.tokenCount);
          } else {
            section.content = this.trimContent(section.content, 
              (section.tokenCount + actualTrim) / section.tokenCount);
          }
        }
      }
    }
    
    // Resort by priority (higher first) for final output
    sections.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Summarize section content to fit within token count
   */
  private summarizeSection(content: string, targetTokens: number): string {
    // This would ideally use an LLM to summarize the content
    // For now, we'll use a simpler approach
    
    // Split into paragraphs
    const paragraphs = content.split('\n\n');
    
    if (paragraphs.length <= 1) {
      // Can't summarize a single paragraph easily, just truncate
      return this.trimContent(content, targetTokens / this.estimateTokenCount(content));
    }
    
    // Keep first and last paragraph, summarize middle if multiple paragraphs
    let summary = paragraphs[0] + '\n\n';
    
    if (paragraphs.length > 2) {
      summary += `[${paragraphs.length - 2} additional paragraphs summarized]\n\n`;
    }
    
    summary += paragraphs[paragraphs.length - 1];
    
    // If still too long, trim proportionally
    if (this.estimateTokenCount(summary) > targetTokens) {
      return this.trimContent(summary, targetTokens / this.estimateTokenCount(summary));
    }
    
    return summary;
  }
  
  /**
   * Trim content to fit proportion of original
   */
  private trimContent(content: string, proportion: number): string {
    if (proportion >= 1) return content;
    
    // Split into words
    const words = content.split(' ');
    
    // Calculate how many words to keep
    const wordsToKeep = Math.ceil(words.length * proportion);
    
    // Keep beginning and end, trim middle
    if (wordsToKeep < words.length) {
      // Keep at least 1/3 from beginning and 1/3 from end
      const keepFromBeginning = Math.ceil(wordsToKeep / 2);
      const keepFromEnd = wordsToKeep - keepFromBeginning;
      
      const beginning = words.slice(0, keepFromBeginning).join(' ');
      const end = words.slice(words.length - keepFromEnd).join(' ');
      
      return `${beginning} [...] ${end}`;
    }
    
    return content;
  }
  
  /**
   * Format context sections into a single string
   */
  private formatContextSections(sections: ContextSection[]): string {
    return sections
      .map(section => `## ${this.formatSectionName(section.name)}\n${section.content}`)
      .join('\n\n');
  }
  
  /**
   * Format section name for display
   */
  private formatSectionName(name: string): string {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Build player info section
   */
  private buildPlayerInfoSection(gameState: GameState): ContextSection {
    const player = gameState.player;
    
    let content = `Name: ${player.name}\n`;
    content += `Race: ${player.race}\n`;
    content += `Class: ${player.class.join(', ')}\n`;
    content += `Level: ${player.level}\n`;
    content += `HP: ${player.hp.current}/${player.hp.max}\n`;
    content += `Abilities: STR ${player.abilities.str}, DEX ${player.abilities.dex}, `;
    content += `CON ${player.abilities.con}, INT ${player.abilities.int}, `;
    content += `WIS ${player.abilities.wis}, CHA ${player.abilities.cha}\n`;
    
    if (player.spellcasting) {
      content += `\nSpellcasting: ${player.spellcasting.ability.toUpperCase()} based caster\n`;
      content += `Prepared spells: ${player.spellcasting.prepared.join(', ')}\n`;
    }
    
    content += `\nEquipment: ${player.equipment.join(', ')}\n`;
    content += `\nPersonality: ${player.personality.trait}\n`;
    content += `Ideal: ${player.personality.ideal}\n`;
    content += `Bond: ${player.personality.bond}\n`;
    content += `Flaw: ${player.personality.flaw}\n`;
    
    return {
      name: ContextSectionType.PLAYER_INFO,
      content,
      priority: this.config.sectionPriorities[ContextSectionType.PLAYER_INFO],
      tokenCount: this.estimateTokenCount(content),
      category: 'character'
    };
  }
  
  /**
   * Build location section
   */
  private buildLocationSection(gameState: GameState): ContextSection {
    const location = gameState.currentLocation;
    
    let content = `Name: ${location.name}\n`;
    content += `Description: ${location.description}\n`;
    
    if (location.tags && location.tags.length > 0) {
      content += `Tags: ${location.tags.join(', ')}\n`;
    }
    
    content += `\nExits: ${Object.entries(location.exits)
      .map(([direction, locationId]) => `${direction} to ${locationId}`)
      .join(', ')}\n`;
    
    if (location.objects && location.objects.length > 0) {
      content += `\nObjects in location: ${location.objects
        .map(obj => obj.name)
        .join(', ')}\n`;
    }
    
    // Add environment conditions if available
    if (gameState.worldState) {
      content += `\nTime: ${gameState.worldState.timeOfDay}\n`;
      content += `Weather: ${gameState.worldState.weather}\n`;
      content += `Light: ${gameState.worldState.lighting}\n`;
    }
    
    return {
      name: ContextSectionType.LOCATION,
      content,
      priority: this.config.sectionPriorities[ContextSectionType.LOCATION],
      tokenCount: this.estimateTokenCount(content),
      category: 'environment'
    };
  }
  
  /**
   * Build active NPCs section
   */
  private buildActiveNPCsSection(gameState: GameState): ContextSection {
    // Get NPCs in current location
    const npcsInLocation = gameState.npcs.filter(
      npc => npc.locationId === gameState.currentLocation.id
    );
    
    let content = '';
    
    if (npcsInLocation.length === 0) {
      content = 'No NPCs present in this location.';
    } else {
      content = `${npcsInLocation.length} NPCs present:\n\n`;
      
      npcsInLocation.forEach(npc => {
        content += `Name: ${npc.name}\n`;
        content += `Race: ${npc.race}\n`;
        content += `Occupation: ${npc.occupation}\n`;
        content += `Disposition: ${npc.disposition}\n`;
        
        // Add relationship summary if available
        try {
          const relationship = this.relationshipTracker.generateRelationshipSummary(
            gameState.player.name, npc.name
          );
          content += `Relationship: ${relationship}\n`;
        } catch (error) {
          // Relationship system might not be initialized yet
          content += `Relationship: Unknown\n`;
        }
        
        content += `Description: ${npc.description}\n\n`;
      });
    }
    
    return {
      name: ContextSectionType.ACTIVE_NPCS,
      content,
      priority: this.config.sectionPriorities[ContextSectionType.ACTIVE_NPCS],
      tokenCount: this.estimateTokenCount(content),
      category: 'character'
    };
  }
  
  /**
   * Build recent events section
   */
  private buildRecentEventsSection(gameState: GameState): ContextSection {
    let content = '';
    
    try {
      // Get recent events from memory manager
      const optimizedContext = this.memoryManager.getOptimizedContext(gameState);
      content = optimizedContext || 'No recent events recorded.';
    } catch (error) {
      // Memory manager might not be initialized
      content = 'Recent events unavailable.';
      
      // Fall back to history if available
      if (gameState.history && gameState.history.length > 0) {
        content = 'Recent history:\n\n';
        content += gameState.history.slice(-10).join('\n\n');
      }
    }
    
    return {
      name: ContextSectionType.RECENT_EVENTS,
      content,
      priority: this.config.sectionPriorities[ContextSectionType.RECENT_EVENTS],
      tokenCount: this.estimateTokenCount(content),
      category: 'narrative'
    };
  }
  
  /**
   * Build relationships section
   */
  private buildRelationshipsSection(gameState: GameState): ContextSection {
    let content = '';
    
    try {
      // Get all relationships for the player
      const playerRelationships = this.relationshipTracker.getRelationshipsForEntity(
        gameState.player.name
      );
      
      if (playerRelationships.length === 0) {
        content = 'No established relationships.';
      } else {
        content = `${playerRelationships.length} established relationships:\n\n`;
        
        // Sort by relationship strength (strongest first)
        playerRelationships.sort((a, b) => Math.abs(b.strength) - Math.abs(a.strength));
        
        // Only include top 5 relationships to save tokens
        playerRelationships.slice(0, 5).forEach(rel => {
          const otherEntity = rel.entity1 === gameState.player.name ? rel.entity2 : rel.entity1;
          
          const summary = this.relationshipTracker.generateRelationshipSummary(
            gameState.player.name, otherEntity
          );
          
          content += `${summary}\n\n`;
        });
        
        if (playerRelationships.length > 5) {
          content += `[${playerRelationships.length - 5} additional relationships not shown]`;
        }
      }
    } catch (error) {
      // Relationship tracker might not be initialized
      content = 'Relationship information unavailable.';
    }
    
    return {
      name: ContextSectionType.RELATIONSHIPS,
      content,
      priority: this.config.sectionPriorities[ContextSectionType.RELATIONSHIPS],
      tokenCount: this.estimateTokenCount(content),
      category: 'character'
    };
  }
  
  /**
   * Build quests section
   */
  private buildQuestsSection(gameState: GameState): ContextSection {
    let content = '';
    
    const activeQuests = gameState.quests.filter(q => q.status === 'active');
    
    if (activeQuests.length === 0) {
      content = 'No active quests.';
    } else {
      content = `${activeQuests.length} active quests:\n\n`;
      
      activeQuests.forEach(quest => {
        content += `Name: ${quest.name}\n`;
        content += `Description: ${quest.description}\n`;
        content += `Giver: ${quest.giver}\n`;
        
        if (quest.objectives && quest.objectives.length > 0) {
          content += 'Objectives:\n';
          quest.objectives.forEach(obj => {
            const status = obj.completed ? '✓' : '○';
            content += `- ${status} ${obj.description}\n`;
          });
        }
        
        content += '\n';
      });
    }
    
    return {
      name: ContextSectionType.QUESTS,
      content,
      priority: this.config.sectionPriorities[ContextSectionType.QUESTS],
      tokenCount: this.estimateTokenCount(content),
      category: 'narrative'
    };
  }
  
  /**
   * Build world state section
   */
  private buildWorldStateSection(gameState: GameState): ContextSection {
    let content = '';
    
    if (!gameState.worldState) {
      content = 'World state information unavailable.';
    } else {
      content = 'Current world state:\n\n';
      
      content += `Region: ${gameState.worldState.region}\n`;
      content += `Time: ${gameState.worldState.timeOfDay}\n`;
      content += `Date: ${gameState.worldState.date}\n`;
      content += `Weather: ${gameState.worldState.weather}\n`;
      
      if (gameState.worldState.events && gameState.worldState.events.length > 0) {
        content += '\nActive world events:\n';
        gameState.worldState.events.forEach(event => {
          content += `- ${event.name}: ${event.description}\n`;
        });
      }
      
      if (gameState.worldState.factions && gameState.worldState.factions.length > 0) {
        content += '\nRelevant factions:\n';
        gameState.worldState.factions.slice(0, 3).forEach(faction => {
          content += `- ${faction.name}: ${faction.disposition} toward player\n`;
        });
      }
    }
    
    return {
      name: ContextSectionType.WORLD_STATE,
      content,
      priority: this.config.sectionPriorities[ContextSectionType.WORLD_STATE],
      tokenCount: this.estimateTokenCount(content),
      category: 'environment'
    };
  }
  
  /**
   * Build system instructions section
   */
  private buildSystemInstructionsSection(gameState: GameState): ContextSection {
    // These are instructions for the AI about how to respond
    const content = `
You are the D&D AI Dungeon Master. Your role is to:

1. Narrate the game world and NPCs in an engaging, descriptive manner
2. Role-play NPCs with consistent personalities and motivations
3. Adjudicate rules fairly and consistently based on D&D 5th Edition
4. Manage combat encounters with tactical considerations
5. Respond to player actions with appropriate consequences
6. Maintain narrative coherence and campaign continuity
7. Adapt the story based on player choices
8. Create memorable character interactions
9. Balance challenge with player enjoyment

Current scenario: ${this.formatScenarioName(this.currentScenario)}

Keep your responses in character as the Dungeon Master. Be descriptive and engaging, but concise enough to maintain game flow.
`.trim();
    
    return {
      name: ContextSectionType.SYSTEM_INSTRUCTIONS,
      content,
      priority: this.config.sectionPriorities[ContextSectionType.SYSTEM_INSTRUCTIONS],
      tokenCount: this.estimateTokenCount(content),
      category: 'system'
    };
  }
  
  /**
   * Build rules reference section
   */
  private buildRulesReferenceSection(gameState: GameState): ContextSection {
    // Include relevant rules based on current scenario
    let content = 'Relevant D&D 5e rules:\n\n';
    
    switch (this.currentScenario) {
      case GameScenario.COMBAT:
        content += `
- Combat sequence: Roll initiative, take turns in initiative order
- On turn: Move, action, bonus action, free interaction
- Attack: d20 + ability + prof vs AC, damage on hit
- Spells: Check components, range, saving throws
- Advantage/disadvantage: Roll 2d20, take highest/lowest
`.trim();
        break;
        
      case GameScenario.SOCIAL:
        content += `
- Persuasion: CHA check to convince NPCs
- Deception: CHA check to mislead NPCs
- Intimidation: CHA check to influence through threats
- Insight: WIS check to detect lies or read intentions
- NPC attitudes: Hostile, unfriendly, indifferent, friendly, helpful
`.trim();
        break;
        
      case GameScenario.EXPLORATION:
        content += `
- Perception: WIS check to notice things
- Investigation: INT check to search and deduce
- Survival: WIS check for tracking and navigation
- Travel pace: Fast (no stealth), normal, slow (stealth possible)
- Environmental hazards: Extreme weather, difficult terrain, etc.
`.trim();
        break;
        
      default:
        content += `
- Ability checks: d20 + ability + proficiency if applicable
- Saving throws: d20 + ability + proficiency if applicable
- Advantage/disadvantage: Roll 2d20, take highest/lowest
- Short rest: 1+ hours, spend Hit Dice to heal
- Long rest: 8 hours, restore HP, some abilities, and spell slots
`.trim();
        break;
    }
    
    return {
      name: ContextSectionType.RULES_REFERENCE,
      content,
      priority: this.config.sectionPriorities[ContextSectionType.RULES_REFERENCE],
      tokenCount: this.estimateTokenCount(content),
      category: 'system'
    };
  }
  
  /**
   * Format scenario name for display
   */
  private formatScenarioName(scenario: GameScenario): string {
    return scenario
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  /**
   * Estimate token count for a string
   * This is a simple approximation (4 chars ≈ 1 token)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
} 