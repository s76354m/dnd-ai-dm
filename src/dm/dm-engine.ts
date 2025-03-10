import { DMEngine } from '../core/interfaces/engine';
import { GameState } from '../core/interfaces/game';
import { Character } from '../core/interfaces/character';
import { NPC } from '../core/interfaces/npc';
import { Location } from '../core/interfaces/world';
import { CombatState } from '../core/interfaces/combat';
import { Quest, QuestObjective, QuestReward } from '../core/interfaces/quest';
import { AIService } from './ai-service';
import type { DMPersonality } from '../core/types';
import chalk from 'chalk';
import { appConfig } from '../config';
import { WorldManager } from '../world/manager';
import { NPCManager } from '../character/npc/npc-manager';
import { NPCScheduler } from '../character/npc/npc-scheduler';
import { QuestManager } from '../quest';
import { EncounterManager, Encounter } from '../combat';
import { createCombatSystem, startCombatWith } from '../combat';
import { NPCInteractionManager } from '../character/npc/npc-interaction';
import { NPCAttitude } from '../core/interfaces/npc';

/**
 * AI-powered Dungeon Master engine
 */
export class AIDungeonMaster implements DMEngine {
  private aiService: AIService;
  private gameState: GameState;
  private worldManager: WorldManager | null = null;
  private npcManager: NPCManager | null = null;
  private questManager: QuestManager | null = null;
  private encounterManager: EncounterManager | null = null;
  private npcScheduler: NPCScheduler | null = null;
  public personality: DMPersonality;
  private activeConversationNpcId: string | null = null;
  private npcInteractionManager: NPCInteractionManager;
  private lastInteractionProcessTime: number = 0;
  
  constructor(personality: DMPersonality = 'neutral') {
    this.aiService = new AIService();
    this.personality = personality;
    this.gameState = {
      player: {} as Character,  // Initialized in initializeGame
      currentLocation: {} as Location,
      activeQuests: [],
      npcs: []
    };
    
    console.log(chalk.cyan('AI Dungeon Master initialized'));
    console.log(chalk.gray(`Story complexity: ${appConfig.storyComplexity}`));
    console.log(chalk.gray(`AI creativity: ${appConfig.aiCreativity}`));
  }
  
  /**
   * Initialize the game with a player character
   */
  public async initializeGame(player: Character): Promise<void> {
    console.log(`Initializing AI Dungeon Master for ${player.name}...`);
    
    // Set the player
    this.gameState.player = player;
    
    // Create the managers
    this.worldManager = new WorldManager(this.aiService, player);
    this.npcManager = new NPCManager(player, this.aiService);
    this.questManager = new QuestManager(player, this.aiService);
    
    // Connect managers
    this.questManager.connectNPCManager(this.npcManager);
    this.npcManager.connectQuestManager(this.questManager);
    
    // Setup the combat system
    const combatSystem = createCombatSystem(player, this.aiService);
    this.encounterManager = combatSystem.encounterManager;
    
    // Create the NPC interaction manager
    const npcScheduler = new NPCScheduler(this.npcManager, this.worldManager);
    this.npcInteractionManager = new NPCInteractionManager(
      this.npcManager, 
      npcScheduler, 
      this.aiService
    );
    
    // Generate the starting location
    const startingLocation = await this.worldManager.initializeWorld();
    this.gameState.currentLocation = startingLocation;
    
    // Setup NPCs
    await this.initializeNPCsFromCurrentLocation();
    
    // Listen for time advancement
    this.worldManager.on('timeAdvanced', (newTime) => {
      this.updateNPCsWithTime(newTime);
    });
    
    // Listen for location changes
    this.worldManager.on('locationChanged', (newLocationId) => {
      this.initializeNPCsFromCurrentLocation();
    });
    
    console.log(chalk.green(`Game initialized for ${player.name}, a level ${player.level} ${player.race} ${player.class}`));
  }
  
  /**
   * Initialize NPCs from the current location
   */
  private async initializeNPCsFromCurrentLocation(): Promise<void> {
    const currentLocation = this.worldManager.getCurrentLocation();
    if (!currentLocation) return;
    
    // Initialize NPCs and their relationships
    this.npcManager.initializeNPCRelationships(currentLocation.id);
    
    // Process initial interactions
    const currentTime = this.worldManager.getCurrentTime();
    const interactions = await this.npcInteractionManager.processInteractions(currentTime, currentLocation.id);
    
    // Record the time we processed interactions
    this.lastInteractionProcessTime = currentTime;
  }
  
  /**
   * Update NPCs based on the new game time
   */
  private async updateNPCsWithTime(newTime: number): Promise<void> {
    // Only process interactions if significant time has passed (more than 15 minutes)
    if (Math.abs(newTime - this.lastInteractionProcessTime) >= 15) {
      const currentLocation = this.worldManager.getCurrentLocation();
      if (currentLocation) {
        // Process NPC interactions for the new time
        const interactions = await this.npcInteractionManager.processInteractions(newTime);
        
        // If any interactions were visible to the player, notify them
        const visibleInteractions = interactions.filter(i => i.isVisible);
        if (visibleInteractions.length > 0) {
          // In a real implementation, these would be shown to the player
          // For now, we'll just log them
          console.log('NPC interactions visible to player:');
          for (const interaction of visibleInteractions) {
            const npc1 = this.npcManager.getNPC(interaction.npc1Id);
            const npc2 = this.npcManager.getNPC(interaction.npc2Id);
            
            if (npc1 && npc2) {
              console.log(`${npc1.name} and ${npc2.name}: ${interaction.description}`);
            }
          }
        }
      }
      
      // Update the last interaction process time
      this.lastInteractionProcessTime = newTime;
    }
  }
  
  /**
   * Generate a response based on game state and user input
   */
  public async generateResponse(context: GameState, input: string): Promise<string> {
    try {
      return await this.aiService.generateNarrative(context, input);
    } catch (error) {
      console.error('Error generating response:', error);
      return 'The DM is pondering... (Error generating response)';
    }
  }
  
  /**
   * Process player commands
   */
  public async processCommand(command: string): Promise<string> {
    // Remove leading/trailing whitespace
    command = command.trim();
    
    // Check for empty command
    if (!command) {
      return "Please enter a command.";
    }
    
    // Convert to lowercase for case-insensitive matching
    const lowerCommand = command.toLowerCase();
    
    // Check if we're in combat
    if (this.encounterManager && this.encounterManager.hasActiveEncounter()) {
      return this.handleCombatCommand(command);
    }
    
    // Handle look command
    if (lowerCommand === 'look' || lowerCommand === 'l') {
      return this.handleLook();
    }
    
    // Handle movement commands
    if (lowerCommand.startsWith('go ') || 
        lowerCommand === 'north' || lowerCommand === 'n' ||
        lowerCommand === 'south' || lowerCommand === 's' ||
        lowerCommand === 'east' || lowerCommand === 'e' ||
        lowerCommand === 'west' || lowerCommand === 'w' ||
        lowerCommand === 'up' || lowerCommand === 'u' ||
        lowerCommand === 'down' || lowerCommand === 'd') {
      return this.handleMovement(lowerCommand);
    }
    
    // Handle talking to NPCs
    if (lowerCommand.startsWith('talk to ') || lowerCommand.startsWith('speak to ') || lowerCommand.startsWith('talk with ')) {
      const npcName = command.split(' ').slice(2).join(' ');
      return this.handleTalkToNPC(npcName);
    }
    
    // Handle examine commands
    if (lowerCommand.startsWith('examine ') || lowerCommand.startsWith('look at ') || lowerCommand.startsWith('inspect ')) {
      const target = command.split(' ').slice(1).join(' ');
      return this.handleExamine(target);
    }
    
    // Handle inventory commands
    if (lowerCommand === 'inventory' || lowerCommand === 'i') {
      return this.handleInventory();
    }
    
    // Handle time-related commands
    if (lowerCommand === 'time' || lowerCommand.startsWith('check time')) {
      return this.handleTimeCheck();
    }
    
    // Handle waiting/resting
    if (lowerCommand.startsWith('wait ') || lowerCommand === 'wait' || 
        lowerCommand.startsWith('rest ') || lowerCommand === 'rest') {
      const timeMatch = command.match(/(\d+)/);
      const hours = timeMatch ? parseInt(timeMatch[1]) : 1;
      return this.handleWait(hours);
    }
    
    // Handle help command
    if (lowerCommand === 'help' || lowerCommand === '?') {
      return this.handleHelp();
    }
    
    // Handle status command
    if (lowerCommand === 'status' || lowerCommand === 'stats') {
      return this.handleStatus();
    }
    
    // Handle quests command
    if (lowerCommand === 'quests' || lowerCommand === 'q') {
      return this.handleQuests();
    }
    
    // Handle attack/combat
    if (lowerCommand.startsWith('attack ') || lowerCommand.startsWith('fight ')) {
      const target = command.split(' ').slice(1).join(' ');
      return this.handleAttack(target);
    }
    
    // Handle checking NPC schedules
    if (lowerCommand.startsWith('schedule ')) {
      const npcName = command.split(' ').slice(1).join(' ');
      return this.handleScheduleCheck(npcName);
    }
    
    // Handle checking NPC relationships
    if (lowerCommand.startsWith('relationships ') || lowerCommand.startsWith('relation ')) {
      const npcName = command.split(' ').slice(1).join(' ');
      return this.handleRelationshipCheck(npcName);
    }
    
    // Handle observing NPC interactions
    if (lowerCommand === 'observe' || lowerCommand === 'watch') {
      return this.handleObserveInteractions();
    }
    
    // Handle asking about specific NPCs
    if (lowerCommand.startsWith('ask about ')) {
      const targetName = command.split(' ').slice(2).join(' ');
      return this.handleAskAbout(targetName);
    }
    
    // Handle gift giving to NPCs
    if (lowerCommand.startsWith('give ')) {
      // Parse "give [item] to [NPC]"
      const parts = command.split(' to ');
      if (parts.length !== 2) {
        return "Please use the format 'give [item] to [NPC]'.";
      }
      
      const itemName = parts[0].replace('give ', '').trim();
      const npcName = parts[1].trim();
      
      return this.handleGiveItem(itemName, npcName);
    }
    
    // Unknown command - use AI to generate a response
    return this.generateResponse(this.gameState, command);
  }
  
  /**
   * Handle checking NPC relationships
   */
  private handleRelationshipCheck(npcName: string): string {
    const currentLocation = this.worldManager.getCurrentLocation();
    if (!currentLocation) {
      return "You're not currently in a valid location.";
    }
    
    // Find the NPC by name
    const npcsInLocation = this.npcManager.getNPCsInLocation(currentLocation.id);
    const npc = npcsInLocation.find(n => 
      n.name.toLowerCase() === npcName.toLowerCase() || 
      n.name.toLowerCase().includes(npcName.toLowerCase())
    );
    
    if (!npc) {
      return `You don't see ${npcName} here.`;
    }
    
    // Check if the NPC has relationships
    if (!npc.relationships || npc.relationships.length === 0) {
      return `${npc.name} doesn't seem to have any notable relationships with other people in town.`;
    }
    
    // Get the relationships
    const relationships = this.npcManager.getNPCRelationships(npc.id);
    
    if (relationships.length === 0) {
      return `${npc.name} doesn't seem to have any notable relationships with other people in town.`;
    }
    
    // Format the relationships
    let result = `${npc.name}'s relationships:\n\n`;
    
    // Group by relationship type
    const grouped: Record<string, {npc: NPC, relationship: NPCRelationship}[]> = {};
    
    for (const rel of relationships) {
      if (!grouped[rel.relationship.type]) {
        grouped[rel.relationship.type] = [];
      }
      grouped[rel.relationship.type].push(rel);
    }
    
    // Add each group to the result
    for (const [type, rels] of Object.entries(grouped)) {
      result += `${type.charAt(0).toUpperCase() + type.slice(1)}:\n`;
      for (const rel of rels) {
        result += `- ${rel.npc.name} (${rel.npc.occupation || 'resident'})\n`;
      }
      result += '\n';
    }
    
    return result;
  }
  
  /**
   * Handle observing NPC interactions
   */
  private handleObserveInteractions(): string {
    const currentLocation = this.worldManager.getCurrentLocation();
    if (!currentLocation) {
      return "You're not currently in a valid location.";
    }
    
    // Get recent interactions in this location
    const interactions = this.npcInteractionManager.getRecentLocationInteractions(currentLocation.id);
    
    if (interactions.length === 0) {
      return "You don't notice any significant interactions between the people here at the moment.";
    }
    
    // Format the interactions
    let result = "As you observe the people around you, you notice:\n\n";
    
    for (const interaction of interactions) {
      const npc1 = this.npcManager.getNPC(interaction.npc1Id);
      const npc2 = this.npcManager.getNPC(interaction.npc2Id);
      
      if (npc1 && npc2) {
        result += `${interaction.description}\n\n`;
      }
    }
    
    return result;
  }
  
  /**
   * Handle asking about specific NPCs
   */
  private async handleAskAbout(targetName: string): Promise<string> {
    const currentLocation = this.worldManager.getCurrentLocation();
    if (!currentLocation) {
      return "You're not currently in a valid location.";
    }
    
    // Find the target NPC
    const npcsInLocation = this.npcManager.getNPCsInLocation(currentLocation.id);
    const targetNPC = npcsInLocation.find(n => 
      n.name.toLowerCase() === targetName.toLowerCase() || 
      n.name.toLowerCase().includes(targetName.toLowerCase())
    );
    
    if (!targetNPC) {
      return `You don't know anyone named ${targetName}.`;
    }
    
    // Check if we're in conversation with an NPC
    if (!this.activeConversationNpcId) {
      return `You need to be talking to someone before you can ask about ${targetName}.`;
    }
    
    const speakingNPC = this.npcManager.getNPC(this.activeConversationNpcId);
    if (!speakingNPC) {
      this.activeConversationNpcId = null;
      return "You're not currently in conversation with anyone.";
    }
    
    // Check if the speaking NPC has a relationship with the target NPC
    const relationship = speakingNPC.relationships?.find(r => r.npcId === targetNPC.id);
    
    // Generate an appropriate response based on whether they have a relationship
    try {
      // Create a prompt for the AI to generate a response
      const prompt = `${speakingNPC.name} is asked by the player about ${targetNPC.name}. ` +
                     `${speakingNPC.name} is a ${speakingNPC.occupation || 'resident'} and ` +
                     `${targetNPC.name} is a ${targetNPC.occupation || 'resident'}. `;
      
      // Add relationship context if available
      if (relationship) {
        prompt += `${speakingNPC.name} views ${targetNPC.name} as a '${relationship.type}' ` +
                 `with a relationship value of ${relationship.value} (-100 to 100 scale).`;
      } else {
        prompt += `${speakingNPC.name} doesn't seem to have a close relationship with ${targetNPC.name}.`;
      }
      
      // Add personality traits
      if (speakingNPC.personality) {
        prompt += ` ${speakingNPC.name} has a ${speakingNPC.personality.primaryTrait} personality.`;
      }
      
      prompt += ` Write a 1-3 sentence response as ${speakingNPC.name}, describing what they know or think about ${targetNPC.name}.`;
      
      // Generate the response
      const response = await this.aiService.generateText(prompt);
      
      // Add to conversation history
      if (speakingNPC.memory && speakingNPC.memory.conversationHistory) {
        speakingNPC.memory.conversationHistory.push({
          timestamp: new Date(),
          playerStatement: `Tell me about ${targetNPC.name}.`,
          npcResponse: response,
          context: 'asking about person'
        });
      }
      
      return `${speakingNPC.name}: ${response}`;
    } catch (error) {
      return `${speakingNPC.name} doesn't seem to want to talk about ${targetNPC.name} right now.`;
    }
  }
  
  /**
   * Handle giving an item to an NPC
   */
  private async handleGiveItem(itemName: string, npcName: string): Promise<string> {
    const currentLocation = this.worldManager.getCurrentLocation();
    if (!currentLocation) {
      return "You're not currently in a valid location.";
    }
    
    // Find the NPC
    const npcsInLocation = this.npcManager.getNPCsInLocation(currentLocation.id);
    const npc = npcsInLocation.find(n => 
      n.name.toLowerCase() === npcName.toLowerCase() || 
      n.name.toLowerCase().includes(npcName.toLowerCase())
    );
    
    if (!npc) {
      return `You don't see ${npcName} here.`;
    }
    
    // Check if the player has the item
    const item = this.gameState.player.inventory.items.find(i => 
      i.name.toLowerCase() === itemName.toLowerCase() || 
      i.name.toLowerCase().includes(itemName.toLowerCase())
    );
    
    if (!item) {
      return `You don't have ${itemName} in your inventory.`;
    }
    
    // Initialize memory if it doesn't exist
    if (!npc.memory) {
      npc.memory = createDefaultNPCMemory();
    }
    
    // Determine the impact on relationship based on item value and NPC preferences
    const baseImpact = Math.min(Math.max(Math.floor(item.value / 10), 1), 5);
    
    // Record the gift in NPC memory
    npc.memory.playerActions.push({
      date: new Date(),
      type: 'gift',
      description: `Gave ${item.name} as a gift`,
      impact: baseImpact
    });
    
    // Update relationship score
    npc.memory.relationship = Math.min(10, npc.memory.relationship + baseImpact);
    
    // Remove the item from player inventory
    this.gameState.player.inventory.items = this.gameState.player.inventory.items.filter(i => i !== item);
    
    // Add the item to NPC inventory
    if (!npc.inventory) {
      npc.inventory = {
        gold: 0,
        items: []
      };
    }
    npc.inventory.items.push(item);
    
    // Update the NPC
    this.npcManager.updateNPC(npc);
    
    // Generate an appropriate response
    try {
      // Create a prompt for the AI to generate a response
      const prompt = `${npc.name} (${npc.occupation || 'resident'}) is given a gift of ${item.name} by the player. ` +
                     `The gift is worth ${item.value} gold. ${npc.name} has a relationship score of ${npc.memory.relationship} ` +
                     `with the player (scale -10 to 10). `;
                     
      if (npc.personality) {
        prompt += `${npc.name} has a ${npc.personality.primaryTrait} personality. `;
      }
      
      prompt += `Write a 1-2 sentence response as ${npc.name}, showing their reaction to receiving this gift.`;
      
      // Generate the response
      const response = await this.aiService.generateText(prompt);
      
      return `You give ${item.name} to ${npc.name}.\n\n${npc.name}: ${response}`;
    } catch (error) {
      return `You give ${item.name} to ${npc.name}. They seem pleased with the gift.`;
    }
  }
  
  /**
   * Get the current game state
   */
  public getGameState(): GameState {
    return this.gameState;
  }
  
  /**
   * Describe a location
   */
  public async describeLocation(location: Location): Promise<string> {
    if (this.worldManager) {
      // Use the enhanced description from the world manager
      return await this.worldManager.getEnhancedLocationDescription();
    }
    
    // Fallback to basic description
    let description = `You are in ${location.name}. ${location.description}\n`;
    
    // Add exits
    if (location.connections.size > 0) {
      const exits = Array.from(location.connections.keys()).join(', ');
      description += `\nExits: ${exits}`;
    }
    
    // Add NPCs
    if (location.npcs && location.npcs.length > 0) {
      const npcsHere = location.npcs.map(npc => npc.name);
      
      if (npcsHere.length > 0) {
        description += `\n\nPresent here: ${npcsHere.join(', ')}`;
      }
    }
    
    return description;
  }
  
  /**
   * Narrate combat
   */
  public nartateCombat(state: CombatState): string {
    if (!this.encounterManager) {
      return 'The combat system is not initialized.';
    }
    
    // Get the narration from the encounter manager
    const narration = this.encounterManager.getCombatNarration();
    
    if (narration) {
      return narration;
    }
    
    // Fallback to basic description
    return 'Combat continues. Use "status" to see the current state.';
  }
  
  /**
   * Save the current game state
   */
  public async saveGame(): Promise<void> {
    // Implement save functionality
    console.log('Game saved.');
  }
  
  /**
   * Load a saved game state
   */
  public async loadGame(saveId: string): Promise<void> {
    // Implement load functionality
    console.log(`Loaded game: ${saveId}`);
  }
  
  /**
   * Generate an NPC of a specific type
   */
  public generateNPC(type: 'quest' | 'merchant' | 'enemy'): NPC {
    if (this.npcManager) {
      // Generate an NPC using the NPC manager
      return this.npcManager.generateRandomNPC(
        this.gameState.currentLocation.name,
        type === 'quest' ? 'quest_giver' : type === 'merchant' ? 'merchant' : 'traveler'
      ) as NPC;
    }
    
    // Fallback to basic NPC generation
    const templates = {
      quest: {
        name: 'Quest Giver',
        description: 'A mysterious figure with an important task',
        race: 'human' as const,
        attitude: NPCAttitude.Neutral,
        isQuestGiver: true
      },
      merchant: {
        name: 'Shopkeeper',
        description: 'A shrewd trader with various goods for sale',
        race: 'human' as const,
        attitude: NPCAttitude.Friendly,
        isQuestGiver: false
      },
      enemy: {
        name: 'Hostile Stranger',
        description: 'A menacing figure with hostile intentions',
        race: 'human' as const,
        attitude: NPCAttitude.Hostile,
        isQuestGiver: false
      }
    };

    const template = templates[type];
    
    return {
      id: `${type}-${Date.now()}`,
      name: template.name,
      description: template.description,
      race: template.race,
      attitude: template.attitude,
      isQuestGiver: template.isQuestGiver,
      dialogue: [],
      location: this.gameState.currentLocation.name
    };
  }
  
  /**
   * Update the game state based on a player action
   */
  public async handlePlayerAction(action: string): Promise<string> {
    return this.processCommand(action);
  }
} 