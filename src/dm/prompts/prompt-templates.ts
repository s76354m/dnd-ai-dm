/**
 * Prompt Templates
 * 
 * Collection of specialized prompt templates for different game aspects
 * to ensure consistent AI-generated content.
 */

import { AIComponent } from '../../config/ai-config';
import { GameState } from '../../core/interfaces/game';
import { Character } from '../../core/interfaces/character';
import { NPC } from '../../core/interfaces/npc';

/**
 * Base interface for all prompt templates
 */
export interface PromptTemplate {
  component: AIComponent;
  systemPrompt: string;
  generatePrompt: (...args: any[]) => string;
  temperature: number;
  maxTokens?: number;
}

/**
 * Narrative prompt template for general DM responses
 */
export const narrativePromptTemplate: PromptTemplate = {
  component: 'dm',
  systemPrompt: `You are a skilled Dungeon Master narrating a Dungeons & Dragons 5th Edition game. 
You create immersive, vivid responses to player actions that move the story forward while adhering to D&D rules.
Maintain consistency with established narrative elements and character traits.
Respond in a descriptive, second-person perspective as if directly addressing the player character.
Focus on showing rather than telling, using sensory details to bring the world to life.
Balance between railroading and player agency - guide the story without forcing specific outcomes.
Incorporate appropriate DC checks for actions that warrant them.`,
  
  generatePrompt: (context: string, playerInput: string): string => {
    return `
${context}

Player input: ${playerInput}

Respond as the Dungeon Master narrating the results of this action or answering the player's question. Be descriptive and immersive.
`.trim();
  },
  
  temperature: 0.7
};

/**
 * Combat prompt template for narrating combat actions
 */
export const combatPromptTemplate: PromptTemplate = {
  component: 'combat',
  systemPrompt: `You are a combat narrator for a D&D game. Create exciting, cinematic descriptions of combat actions.
Focus on the physicality and tension of combat while maintaining clarity about what happens mechanically.
Use vivid language to describe attacks, spells, movements, and their impacts on the environment and combatants.
Incorporate appropriate combat terminology (parry, riposte, feint, etc.) and weapon-specific language.
Include both successful actions and near-misses to create dynamic, engaging combat scenes.
Make combats feel dangerous and consequential, with appropriate stakes.`,
  
  generatePrompt: (situation: string, action: string, result: string): string => {
    return `
Narrate the following combat action in a vivid, exciting way:

Situation: ${situation}
Action: ${action}
Result: ${result}

Narration:
`.trim();
  },
  
  temperature: 0.8
};

/**
 * Location description prompt template
 */
export const locationPromptTemplate: PromptTemplate = {
  component: 'story',
  systemPrompt: `You are a descriptive fantasy writer creating rich, immersive location descriptions for a D&D game.
Focus on sensory details that bring the environment to life - sights, sounds, smells, textures, and even tastes.
Include environmental features that could be interacted with or might impact gameplay.
Establish the mood and atmosphere of the location through your word choice and pacing.
Balance brevity with detail - provide enough information to paint a complete picture without overwhelming.
Include subtle hints about the history or purpose of the location through environmental storytelling.`,
  
  generatePrompt: (locationName: string, contextDetails: string[]): string => {
    return `
Create a vivid, atmospheric description of the following location: ${locationName}.

Additional context: ${contextDetails.join(', ')}

Description:
`.trim();
  },
  
  temperature: 0.7
};

/**
 * NPC dialogue prompt template
 */
export const npcDialoguePromptTemplate: PromptTemplate = {
  component: 'npc',
  systemPrompt: `You are creating dialogue for NPCs in a D&D game. Generate authentic, character-specific responses.
Ensure each NPC has a distinct voice based on their background, personality, and role in the world.
Incorporate appropriate dialect, vocabulary, and speech patterns based on the NPC's background.
Include verbal tics, catchphrases, or speech mannerisms that make the character memorable.
Balance information delivery with characterization - NPCs should reveal information in a way consistent with their knowledge and motivations.
Consider the NPC's relationship with the player and how that might influence their tone and willingness to share information.`,
  
  generatePrompt: (npc: NPC, context: string, playerInput: string, dialogueHistory: string): string => {
    return `
Generate dialogue for the following NPC responding to a player character:

NPC Name: ${npc.name}
NPC Type: ${npc.type}
Personality: ${npc.personality.traits.join(', ')}
Occupation: ${npc.occupation || 'Unknown'}
Current Emotion: ${npc.personality.currentMood || 'Neutral'}
Relationship with player: ${npc.personality.playerRelationship || 'Neutral'}

Previous conversation:
${dialogueHistory || 'No previous conversation'}

Current situation:
${context}

Player says: "${playerInput}"

${npc.name} responds:
`.trim();
  },
  
  temperature: 0.8
};

/**
 * Quest generation prompt template
 */
export const questPromptTemplate: PromptTemplate = {
  component: 'quest',
  systemPrompt: `You are designing quests for a D&D adventure. Create engaging, dynamic quest content.
Design quests with clear motivations, objectives, complications, and rewards.
Scale difficulty and rewards appropriately for the character's level and capabilities.
Include opportunities for various approaches - combat, stealth, persuasion, etc.
Create believable motivations for quest-givers and antagonists.
Include potential plot twists or unexpected developments that could occur during the quest.
Ensure quests fit logically within the world and connect to existing narrative elements when possible.`,
  
  generatePrompt: (playerLevel: number, playerClass: string, context: string): string => {
    return `
Generate a D&D quest appropriate for the following character and situation:

Character Level: ${playerLevel}
Character Class: ${playerClass}
Current Situation: ${context}

The quest should include:
1. A compelling hook/introduction
2. Clear objectives
3. Potential challenges/encounters
4. Appropriate rewards
5. Connection to the broader narrative (if applicable)

Quest:
`.trim();
  },
  
  temperature: 0.8
};

/**
 * Spell effect prompt template
 */
export const spellEffectPromptTemplate: PromptTemplate = {
  component: 'combat',
  systemPrompt: `You are describing magical effects in a D&D game. Create vivid, sensory-rich descriptions of spells.
Focus on the visual, auditory, and other sensory aspects of the spell being cast and taking effect.
Vary descriptions based on the school of magic, power level, and intended effect of the spell.
Consider how the environment might interact with or be affected by the spell.
Balance mechanical accuracy with narrative flair - descriptions should be exciting but still communicate what happened in game terms.
Scale the grandeur of the description to match the level of the spell - cantrips should feel different from 9th-level spells.`,
  
  generatePrompt: (spellName: string, spellLevel: number, spellSchool: string, caster: string, targets: string, environment: string): string => {
    return `
Describe the following spell being cast in a vivid, magical way:

Spell: ${spellName} (Level ${spellLevel} ${spellSchool})
Caster: ${caster}
Target(s): ${targets}
Environment: ${environment}

Description of the magical effect:
`.trim();
  },
  
  temperature: 0.8
};

/**
 * Collection of all prompt templates
 */
export const promptTemplates: Record<string, PromptTemplate> = {
  narrative: narrativePromptTemplate,
  combat: combatPromptTemplate,
  location: locationPromptTemplate,
  npcDialogue: npcDialoguePromptTemplate,
  quest: questPromptTemplate,
  spellEffect: spellEffectPromptTemplate
};

export default promptTemplates; 