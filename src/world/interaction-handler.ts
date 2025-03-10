import { GameState, ResolvedCommand, NPC } from '../core/interfaces';
// Mock imports for now - these will need to be implemented or replaced
const aiService = {
  generateNPCResponse: async (npc: NPC, playerInput: string, context: any) => {
    return { response: `${npc.name} responds to "${playerInput}"` };
  },
  generateNarrative: async (context: any) => {
    return `Generated narrative based on context: ${context.type || 'general'}`;
  },
  generateNPCDialogue: async (npcId: string, gameState: GameState) => {
    const npc = gameState.npcs.get(npcId);
    return `Dialogue from ${npc?.name || 'NPC'}: Welcome, traveler!`;
  }
};

const initializeCombat = (player: any, enemies: any[], location: any) => {
  return { 
    message: "Combat initialized", 
    combatState: { 
      round: 1, 
      participants: new Map(),
      turnOrder: [],
      currentTurn: 0,
      active: true,
      effects: []
    } 
  };
};

/**
 * Process an interaction command
 * @param command The resolved interaction command
 * @param gameState Current game state
 * @returns Result of the interaction
 */
export async function processInteraction(
  command: ResolvedCommand, 
  gameState: GameState
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  // Check if there's a target for the interaction
  if (!command.target) {
    return {
      message: "Who do you want to interact with?",
      shouldSave: false
    };
  }
  
  // Get the NPC from the game state
  let npc: NPC | undefined;
  
  if (typeof command.target === 'string') {
    // Try to find the NPC by ID first
    npc = gameState.npcs.get(command.target);
    
    // If not found, try to find by name (case-insensitive)
    if (!npc) {
      npc = Array.from(gameState.npcs.values()).find(
        n => n.name.toLowerCase() === command.target?.toLowerCase()
      );
    }
  }
  
  if (!npc) {
    return {
      message: `There is no one named "${command.target}" here.`,
      shouldSave: false
    };
  }
  
  // Process based on the interaction type
  switch (command.action) {
    case 'talk':
      return processTalkInteraction(npc, gameState);
    
    case 'attack':
      return processAttackInteraction(npc, gameState);
    
    case 'examine':
      return processExamineInteraction(npc, gameState);
    
    default:
      // For other interactions, generate a generic response
      try {
        const narrative = await aiService.generateNarrative({
          type: 'npc_interaction',
          npc: npc,
          player: gameState.player,
          location: gameState.currentLocation,
          action: command.action || 'interact'
        });
        
        return {
          message: narrative,
          shouldSave: false
        };
      } catch (error) {
        return {
          message: `You interact with ${npc.name} but nothing interesting happens.`,
          shouldSave: false
        };
      }
  }
}

/**
 * Find an NPC in the current location by name or ID
 * @param targetName The name or ID of the NPC to find
 * @param gameState Current game state
 * @returns The NPC object or null if not found
 */
function findNPCInLocation(targetName: string, gameState: GameState): NPC | null {
  // Get the list of NPCs in the current location
  const npcsInLocation = gameState.currentLocation.npcs || [];
  
  // Normalize the target name for case-insensitive comparison
  const normalizedTarget = targetName.toLowerCase();
  
  // Find the first NPC whose name contains the target string
  for (const npcEntry of npcsInLocation) {
    let npc: NPC | undefined;
    
    if (typeof npcEntry === 'string') {
      // If the entry is a string (NPC ID), get the NPC from the game state
      npc = gameState.npcs.get(npcEntry);
    } else {
      // If the entry is already an NPC object, use it directly
      npc = npcEntry;
    }
    
    if (npc && npc.name.toLowerCase().includes(normalizedTarget)) {
      return npc;
    }
  }
  
  return null;
}

/**
 * Process a talk interaction with an NPC
 * @param npc The NPC to talk to
 * @param gameState Current game state
 * @returns Result of the interaction
 */
async function processTalkInteraction(
  npc: NPC, 
  gameState: GameState
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  // Check if the NPC is friendly
  if (npc.attitude === 'hostile') {
    return {
      message: `${npc.name} doesn't seem interested in talking.`,
      shouldSave: false
    };
  }
  
  try {
    // Generate dialogue using the AI
    const dialogue = await aiService.generateNPCDialogue(npc.id, gameState);
    
    // Add the interaction to session history
    const updatedHistory = gameState.sessionHistory ? 
      [...gameState.sessionHistory, {
        type: 'dialogue',
        timestamp: new Date().toISOString(),
        details: {
          npcId: npc.id,
          npcName: npc.name
        }
      }] : 
      [{
        type: 'dialogue',
        timestamp: new Date().toISOString(),
        details: {
          npcId: npc.id,
          npcName: npc.name
        }
      }];
    
    return {
      message: dialogue,
      stateChanges: {
        sessionHistory: updatedHistory
      },
      shouldSave: true
    };
  } catch (error) {
    // If AI generation fails, fall back to predefined dialogue
    const dialogueIndex = Math.floor(Math.random() * npc.dialogue.length);
    return {
      message: `${npc.name}: "${npc.dialogue[dialogueIndex]}"`,
      shouldSave: false
    };
  }
}

/**
 * Process an attack interaction with an NPC
 * @param npc The NPC to attack
 * @param gameState Current game state
 * @returns Result of the interaction
 */
async function processAttackInteraction(
  npc: NPC, 
  gameState: GameState
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  // Check if already in combat
  if (gameState.combatState) {
    return {
      message: "You're already in combat!",
      shouldSave: false
    };
  }
  
  let narrative: string;
  
  try {
    // Generate combat initiation narrative
    narrative = await aiService.generateNarrative({
      type: 'combat_initiation',
      player: gameState.player,
      npc: npc,
      location: gameState.currentLocation
    });
  } catch (error) {
    // Fallback narrative
    narrative = `You prepare to attack ${npc.name}!`;
  }
  
  // Check if the NPC is hostile
  if (npc.attitude === 'hostile') {
    // If the NPC is hostile, initiate combat
    const combatState = initializeCombat(gameState.player, [npc], gameState.currentLocation);
    
    return {
      message: `${npc.name} is hostile and attacks you!`,
      stateChanges: {
        combatState: combatState.combatState as any // Type assertion to avoid complex type issues
      },
      shouldSave: true
    };
  }
  
  // Initialize combat with the NPC
  const result = initializeCombat(gameState.player, [npc], gameState.currentLocation);
  
  return {
    message: `${narrative}\n\n${result.message}`,
    stateChanges: {
      combatState: result.combatState as any // Type assertion to avoid complex type issues
    },
    shouldSave: true
  };
}

/**
 * Get a message describing the start of combat
 * @param combatState The new combat state
 * @returns Formatted combat start message
 */
function getCombatStartMessage(combatState: any): string {
  let message = `Combat begins! Initiative order:\n`;
  
  combatState.participants.forEach((participant: any, index: number) => {
    message += `${index + 1}. ${participant.name}: ${participant.initiative}\n`;
  });
  
  message += `\n${combatState.participants[0].name} acts first!`;
  
  return message;
}

/**
 * Process an examine interaction with an NPC
 * @param npc The NPC to examine
 * @param gameState Current game state
 * @returns Result of the interaction
 */
async function processExamineInteraction(
  npc: NPC, 
  gameState: GameState
): Promise<{ message: string; stateChanges?: Partial<GameState>; shouldSave?: boolean }> {
  try {
    // Generate a description of the NPC
    const description = await aiService.generateNarrative({
      type: 'npc_description',
      npc: npc,
      player: gameState.player,
      location: gameState.currentLocation
    });
    
    return {
      message: description,
      shouldSave: false
    };
  } catch (error) {
    // Fallback description
    return {
      message: `You examine ${npc.name}. ${npc.description}`,
      shouldSave: false
    };
  }
} 