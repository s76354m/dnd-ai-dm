/**
 * Advanced Prompt Templates for DnD AI DM
 * 
 * Provides a comprehensive set of specialized prompt templates for 
 * different game aspects, with enhanced modularity and customization options.
 */

import { GameState } from '../../core/interfaces/game';
import { Character } from '../../core/interfaces/character';
import { Location } from '../../core/interfaces/location';
import { NPC } from '../../core/interfaces/npc';
import { CombatAction, ActionResult } from '../../core/interfaces/combat';
import { Spell } from '../../core/interfaces/spell';
import { Quest } from '../../core/interfaces/quest';

/**
 * Template component types
 */
export type PromptComponent = 
  | 'narrative'
  | 'combat'
  | 'location'
  | 'npc'
  | 'quest'
  | 'spell'
  | 'item'
  | 'exploration'
  | 'puzzle'
  | 'dialogue'
  | 'lore';

/**
 * Style options for prompt responses
 */
export interface StyleOptions {
  tone: 'heroic' | 'gritty' | 'comedic' | 'mysterious' | 'epic' | 'dramatic' | 'neutral' | 
        'warm' | 'cryptic' | 'cautious' | 'supportive' | 'sage' | 'harsh' | 'hesitant' |
        'stern' | 'academic' | 'refined' | 'simple' | 'quirky' | 'reserved' | 'whimsical' |
        'intense' | 'mystical' | 'hopeful' | 'disappointing' | 'triumphant' | 'somber' | 'tense';
  verbosity: 'concise' | 'moderate' | 'detailed' | 'balanced';
  language: 'simple' | 'standard' | 'elaborate' | 'archaic';
  perspective: 'second-person' | 'third-person' | 'omniscient';
  emphasisOn?: ('action' | 'description' | 'dialogue' | 'emotion' | 'sensation' | 'intrigue' | 
               'uncertainty' | 'information' | 'wisdom' | 'threats' | 'fear' | 'knowledge' | 
               'peculiarity' | 'restraint' | 'consequences' | 'tension' | 'setup' | 'resolution')[];
  pacing?: 'slow' | 'moderate' | 'quick' | 'frantic';
  detail?: 'low' | 'medium' | 'high';
  formality?: 'casual' | 'formal' | 'neutral';
  creativity?: number; // 0.0 - 1.0 scale for temperature
}

/**
 * Default style options
 */
export const DEFAULT_STYLE: StyleOptions = {
  tone: 'heroic',
  verbosity: 'moderate',
  language: 'standard',
  perspective: 'second-person',
  emphasisOn: ['action', 'description']
};

/**
 * Base interface for all prompt templates
 */
export interface AdvancedPromptTemplate {
  component: PromptComponent;
  systemPrompt: string;
  formatSystemPrompt: (style: StyleOptions) => string;
  generatePrompt: (...args: any[]) => string;
  examples?: string[];
  temperature: number;
  maxTokens?: number;
}

/**
 * Base abstract class for prompt templates
 */
export abstract class BasePromptTemplate implements AdvancedPromptTemplate {
  public component: PromptComponent;
  public systemPrompt: string;
  public examples: string[] = [];
  public temperature: number = 0.7;
  public maxTokens?: number;
  
  constructor(component: PromptComponent, systemPrompt: string, temperature?: number, maxTokens?: number) {
    this.component = component;
    this.systemPrompt = systemPrompt;
    if (temperature !== undefined) this.temperature = temperature;
    if (maxTokens !== undefined) this.maxTokens = maxTokens;
  }
  
  /**
   * Format the system prompt with style options
   */
  public formatSystemPrompt(style: StyleOptions): string {
    const styleGuidance = this.generateStyleGuidance(style);
    return `${this.systemPrompt}\n\n${styleGuidance}`;
  }
  
  /**
   * Abstract method to generate a prompt
   */
  public abstract generatePrompt(...args: any[]): string;
  
  /**
   * Generate style guidance based on style options
   */
  protected generateStyleGuidance(style: StyleOptions): string {
    const toneDescriptions: Record<string, string> = {
      'heroic': 'focus on courage, triumph, and noble deeds',
      'gritty': 'emphasize realism, hardship, and the harsh nature of the world',
      'comedic': 'incorporate humor, wit, and lighthearted moments',
      'mysterious': 'create an atmosphere of intrigue, secrets, and the unknown',
      'epic': 'employ grandiose language and focus on world-changing events',
      'dramatic': 'highlight emotional intensity and personal stakes',
      'neutral': 'maintain an objective, balanced perspective',
      'warm': 'convey friendliness, comfort, and welcoming atmosphere',
      'cryptic': 'speak in riddles, vague terms, and obscured meanings',
      'cautious': 'express hesitation, concern, and measured responses',
      'supportive': 'offer encouragement, validation, and assistance',
      'sage': 'impart wisdom, thoughtful reflection, and experience',
      'harsh': 'be direct, critical, and unforgiving in delivery',
      'hesitant': 'demonstrate uncertainty, fear, and reluctance',
      'stern': 'project authority, seriousness, and strict demeanor',
      'academic': 'use scholarly language, references, and analytical approach',
      'refined': 'employ elegant phrasing, courtesy, and sophisticated mannerisms',
      'simple': 'use straightforward language and uncomplicated concepts',
      'quirky': 'showcase eccentricity, unusual perspectives, and odd behaviors',
      'reserved': 'maintain emotional restraint, privacy, and limited expressiveness',
      'whimsical': 'incorporate playfulness, wonder, and childlike perspectives',
      'intense': 'use forceful language, strong emotions, and urgent delivery',
      'mystical': 'evoke wonder, supernatural elements, and spiritual significance',
      'hopeful': 'emphasize optimism, possibilities, and positive outcomes',
      'disappointing': 'convey letdown, failed expectations, and regret',
      'triumphant': 'celebrate victory, achievement, and overcoming challenges',
      'somber': 'express sadness, gravity, and seriousness',
      'tense': 'create anxiety, suspense, and anticipation'
    };
    
    const verbosityGuidance: Record<string, string> = {
      'concise': 'Use brief, impactful language. Prioritize action over description. Keep responses under 150 words when possible.',
      'moderate': 'Balance action and description. Include relevant details without being excessive. Aim for 150-300 words for most responses.',
      'detailed': 'Provide rich descriptions and thorough explanations. Elaborate on sensory details, emotions, and environment. Responses may exceed 300 words when appropriate.',
      'balanced': 'Maintain equilibrium between brevity and detail. Provide enough context for clarity while keeping the narrative moving. Aim for 200-250 words for most responses.'
    };
    
    const languageGuidance: Record<string, string> = {
      'simple': 'Use straightforward language and common vocabulary. Avoid complex sentence structures.',
      'standard': 'Employ varied vocabulary and sentence structures appropriate for fantasy literature.',
      'elaborate': 'Utilize sophisticated vocabulary, metaphors, and complex sentence structures.',
      'archaic': 'Incorporate archaic terms, formal speech patterns, and period-appropriate expressions.'
    };
    
    const perspectiveGuidance: Record<string, string> = {
      'second-person': 'Address the player directly as "you" to increase immersion.',
      'third-person': 'Refer to the player character by name or as "the adventurer" with third-person pronouns.',
      'omniscient': 'Present an all-knowing narrative that explores the thoughts and feelings of multiple characters.'
    };
    
    const emphasisGuidance: Record<string, string> = {
      'action': 'Prioritize describing what happens, with dynamic verbs and clear sequences of events.',
      'description': 'Emphasize sensory details about the environment, characters, and objects.',
      'dialogue': 'Focus on character speech, including tone, manner of speaking, and verbal reactions.',
      'emotion': 'Highlight the emotional states and reactions of characters.',
      'sensation': 'Emphasize physical sensations, from environmental conditions to pain, pleasure, and other bodily experiences.',
      'intrigue': 'Focus on mysteries, secrets, and hidden motivations.',
      'uncertainty': 'Emphasize doubt, questions, and unclear situations.',
      'information': 'Prioritize facts, knowledge, and useful data.',
      'wisdom': 'Highlight insights, life lessons, and philosophical perspectives.',
      'threats': 'Focus on dangers, risks, and intimidating elements.',
      'fear': 'Emphasize terror, anxiety, and psychological distress.',
      'knowledge': 'Showcase learning, academia, and intellectual pursuits.',
      'peculiarity': 'Highlight strange, unusual, and extraordinary elements.',
      'restraint': 'Emphasize control, discipline, and holding back.',
      'consequences': 'Focus on outcomes, results, and aftermath of actions.',
      'tension': 'Emphasize conflict, opposition, and mounting pressure.',
      'setup': 'Focus on establishing context, scene, and anticipation.',
      'resolution': 'Emphasize conclusions, resolutions, and tying up loose ends.'
    };
    
    const pacingGuidance: Record<string, string> = {
      'slow': 'Take time with descriptions and reflections. Allow moments to breathe and scenes to unfold gradually.',
      'moderate': 'Maintain steady progression with balanced attention to detail and forward momentum.',
      'quick': 'Move swiftly through events with concise descriptions and rapid transitions.',
      'frantic': 'Create a sense of urgency with short sentences, immediate action, and minimal pause for reflection.'
    };
    
    const detailGuidance: Record<string, string> = {
      'low': 'Focus on essential elements only. Minimize descriptive flourishes.',
      'medium': 'Include relevant sensory details and context that supports the narrative.',
      'high': 'Provide rich, layered descriptions with multiple sensory elements and nuanced observations.'
    };
    
    const formalityGuidance: Record<string, string> = {
      'casual': 'Use conversational language, contractions, and approachable phrasing.',
      'formal': 'Employ proper grammar, sophisticated vocabulary, and professional tone.',
      'neutral': 'Balance formality appropriate to the context without leaning strongly in either direction.'
    };
    
    let emphasisText = '';
    if (style.emphasisOn && style.emphasisOn.length > 0) {
      emphasisText = `Emphasize: ${style.emphasisOn.map(e => emphasisGuidance[e]).join(' ')}`;
    }
    
    let result = `STYLE GUIDANCE:
Tone: ${toneDescriptions[style.tone] || toneDescriptions['neutral']}
Verbosity: ${verbosityGuidance[style.verbosity] || verbosityGuidance['moderate']}
Language: ${languageGuidance[style.language] || languageGuidance['standard']}
Perspective: ${perspectiveGuidance[style.perspective] || perspectiveGuidance['second-person']}
${emphasisText}`;

    // Add optional style elements if provided
    if (style.pacing) {
      result += `\nPacing: ${pacingGuidance[style.pacing]}`;
    }
    
    if (style.detail) {
      result += `\nDetail Level: ${detailGuidance[style.detail]}`;
    }
    
    if (style.formality) {
      result += `\nFormality: ${formalityGuidance[style.formality]}`;
    }
    
    if (style.creativity !== undefined) {
      result += `\nCreativity: ${style.creativity <= 0.3 ? 'Low - stick to standard descriptions and conventional narrative.' : 
                               style.creativity <= 0.7 ? 'Moderate - balance conventional elements with creative flourishes.' : 
                               'High - employ unique, unexpected descriptions and narrative approaches.'}`;
    }
    
    return result;
  }
  
  /**
   * Add examples to the prompt template
   */
  public addExamples(examples: string[]): void {
    this.examples = [...this.examples, ...examples];
  }
  
  /**
   * Clear examples from the prompt template
   */
  public clearExamples(): void {
    this.examples = [];
  }
  
  /**
   * Format examples for inclusion in prompts
   */
  protected formatExamples(): string {
    if (this.examples.length === 0) return '';
    
    return `EXAMPLES:\n${this.examples.join('\n\n')}`;
  }
}

/**
 * Narrative prompt template for general game narration
 */
export class NarrativePromptTemplate extends BasePromptTemplate {
  constructor(customSystemPrompt?: string, temperature?: number, maxTokens?: number) {
    const systemPrompt = customSystemPrompt || `You are the narrative voice of a D&D game, serving as Dungeon Master.
Your task is to create vivid, immersive descriptions of events, locations, characters, and situations
that the players encounter throughout their adventure.

Guidelines:
- Maintain internal consistency with the established world and narrative.
- Balance descriptive language with forward momentum in the story.
- Evoke the appropriate emotional tone for the situation.
- Use all five senses in descriptions when appropriate.
- Respond to player actions in ways that acknowledge their agency while maintaining the world's integrity.
- Incorporate the consequences of previous player choices into your narration.
- When describing NPC reactions, ensure they align with established personalities.`;
    
    super('narrative', systemPrompt, temperature, maxTokens);
    
    this.addExamples([
      `Context: The party just defeated a group of goblins in a forest clearing.
Player Input: "I want to search the goblin bodies for valuables."
DM Response: As you sift through the grimy pockets of the fallen goblins, your fingers close around various trinkets - a handful of copper coins covered in an unidentifiable sticky substance, a small leather pouch containing three uncut gemstones that catch the dappled sunlight filtering through the forest canopy, and a curious silver key with an intricate pattern etched into its bow. One goblin wears a crude necklace fashioned from animal teeth and colorful feathers, which might fetch a decent price from the right collector. The metallic scent of blood mingles with the goblins' natural musk, making the task rather unpleasant, but your thoroughness has been rewarded.`
    ]);
  }
  
  public generatePrompt(
    playerInput: string, 
    context: string, 
    style: StyleOptions = DEFAULT_STYLE
  ): string {
    return `${this.formatExamples()}

NARRATIVE CONTEXT:
${context}

PLAYER INPUT:
${playerInput}

Based on the above context and player input, provide a narrative response as the Dungeon Master. Maintain consistency with previously established facts. Be creative yet plausible within the fantasy setting.`;
  }
}

/**
 * Combat prompt template for battle narration
 */
export class CombatPromptTemplate extends BasePromptTemplate {
  constructor(customSystemPrompt?: string, temperature?: number, maxTokens?: number) {
    const systemPrompt = customSystemPrompt || `You are narrating combat in a D&D game, serving as Dungeon Master.
Your task is to create dynamic, exciting descriptions of combat actions, their results, and their impact on the battlefield.

Guidelines:
- Describe combat actions vividly, showing rather than telling what happens.
- Incorporate tactical elements and positioning when relevant.
- Reflect the unique fighting styles of different characters and creatures.
- Vary your descriptions to avoid repetitive combat narration.
- Include realistic details about wounds, impacts, and the physical/emotional toll of battle.
- Highlight particularly impressive successes or disappointing failures.
- Maintain appropriate tension based on the stakes of the combat.
- Consider the environment and how it affects or is affected by the combat.`;
    
    super('combat', systemPrompt, temperature, maxTokens);
    
    this.addExamples([
      `Context: The player's fighter character is battling an ogre in a narrow canyon.
Action: Attack with longsword
Result: Hit for 12 damage
DM Response: You feint low, causing the ogre to drop its guard momentarily, then bring your longsword in a swift upward arc. The blade slices across the creature's torso, leaving a deep gash that seeps dark blood. The ogre roars in pain and stumbles back a step, momentarily pressed against the canyon wall. Its eyes narrow with renewed fury as it readies its club for a retaliatory strike.`
    ]);
  }
  
  public generatePrompt(
    action: any,
    result: any,
    context: string,
    style: StyleOptions = DEFAULT_STYLE
  ): string {
    // Use type assertion to access properties safely
    const actionType = (action.type || 'ATTACK').toUpperCase();
    
    // Safely access targets property, with fallback for targetIds
    let targets = '';
    if (action.targets && Array.isArray(action.targets)) {
      targets = action.targets.map((t: any) => t.name).join(', ');
    } else if (action.targetIds && Array.isArray(action.targetIds)) {
      targets = action.targetIds.join(', ');
    }
    
    const actionDetails = action.details || '';
    
    let resultText = result.success ? 'SUCCESS' : 'FAILURE';
    if (result.damage) resultText += `: ${result.damage} damage dealt`;
    if (result.healing) resultText += `: ${result.healing} healing provided`;
    if (result.conditionsApplied?.length) resultText += `: Applied ${result.conditionsApplied.join(', ')}`;
    if (result.reason) resultText += ` (${result.reason})`;
    
    // Safely access actor property
    let actorName = 'Unknown';
    if (action.actor && action.actor.name) {
      actorName = action.actor.name;
    } else if (action.actorId) {
      actorName = action.actorId;
    }
    
    return `${this.formatExamples()}

COMBAT CONTEXT:
${context}

CURRENT ACTION:
Actor: ${actorName}
Action Type: ${actionType}
Targets: ${targets}
Details: ${actionDetails}

RESULT:
${resultText}

Provide a vivid narration of this combat action and its outcome. Be specific about what happens physically, emphasize the drama and excitement of combat, and include details about positioning, environment, and character reactions.`;
  }
}

/**
 * Location prompt template for environment descriptions
 */
export class LocationPromptTemplate extends BasePromptTemplate {
  constructor(customSystemPrompt?: string, temperature?: number, maxTokens?: number) {
    const systemPrompt = customSystemPrompt || `You are describing locations in a D&D game, serving as Dungeon Master.
Your task is to create atmospheric, detailed descriptions of environments that the players can explore.

Guidelines:
- Engage all senses in your descriptions when appropriate (sight, sound, smell, touch, taste).
- Highlight key features that might be of interest to adventurers.
- Include subtle hints about dangers, treasures, or secrets when they exist.
- Establish the mood and atmosphere appropriate to the location.
- Consider the history and purpose of the location in your description.
- Describe how the location changes based on time of day, weather, or recent events.
- Balance between being informative and leaving room for player exploration.`;
    
    super('location', systemPrompt, temperature, maxTokens);
    
    this.addExamples([
      `Context: The party is entering a long-abandoned dwarven forge for the first time. Night is falling outside.
Location: Dwarven Forge
DM Response: You push open the massive stone doors, which grudgingly yield with a low groan that echoes through the mountain corridor. The dwarven forge opens before you, a cathedral of industry frozen in time. Massive anvils stand like monuments upon the stone floor, their once-polished surfaces now dulled by decades of dust. Great furnaces line the walls, their cold mouths gaping in silence where once they roared with magical flame. The ceiling arches high above, supported by columns carved to resemble mighty dwarven warriors. 

As twilight deepens outside, only thin shafts of fading blue light penetrate through narrow vents in the ceiling, casting long shadows across the floor. The air hangs heavy with the scents of old metal, cold ash, and the peculiar staleness of undisturbed space. A soft, irregular dripping sound comes from somewhere in the darkness to your right, where water has found its way through the mountain stone.

Workbenches cluttered with abandoned tools line the walls, while ore carts sit idle on rusted tracks that crisscross the floor. In the center of the forge stands an enormous hammer mechanism, suspended above a central anvil sized for the crafting of legendary weapons. The apparatus appears to be powered by an intricate system of gears and chains that disappear into channels in the walls and floor.

Despite the years of abandonment, you sense a residual warmth here, as if the stone itself remembers the heat of creation that once filled this space.`
    ]);
  }
  
  public generatePrompt(
    location: any,
    context: string,
    style: StyleOptions = DEFAULT_STYLE
  ): string {
    // Safely access properties
    const features = location.features && Array.isArray(location.features) 
      ? location.features.join(', ') 
      : 'None specified';
    
    const timeAndWeather = location.currentTimeAndWeather || 'Standard conditions';
    
    return `${this.formatExamples()}

LOCATION CONTEXT:
${context}

LOCATION:
Name: ${location.name}
Type: ${location.type}
Notable Features: ${features}
Time and Weather: ${timeAndWeather}
${location.description ? `Existing Description: ${location.description}` : ''}

Based on the provided information, generate a rich and evocative description of this location as the players encounter it. Include sensory details, points of interest, and atmosphere appropriate to the location type and context.`;
  }
}

/**
 * NPC dialogue prompt template
 */
export class NPCDialoguePromptTemplate extends BasePromptTemplate {
  constructor(customSystemPrompt?: string, temperature?: number, maxTokens?: number) {
    const systemPrompt = customSystemPrompt || `You are generating NPC dialogue in a D&D game, serving as Dungeon Master.
Your task is to create authentic, character-specific dialogue for non-player characters interacting with the players.

Guidelines:
- Maintain consistent speech patterns, vocabulary, and mannerisms for each NPC.
- Reflect the NPC's background, personality, intelligence, and emotional state in their dialogue.
- Include non-verbal cues and actions that accompany speech when appropriate.
- Ensure dialogue reveals information appropriate to the NPC's knowledge and willingness to share.
- Adapt responses based on the NPC's relationship with and attitude toward the player character.
- Consider cultural and regional differences in speech patterns.
- Balance between character authenticity and providing useful/interesting information to players.`;
    
    super('dialogue', systemPrompt, temperature, maxTokens);
    
    this.addExamples([
      `Context: The player is trying to get information about a local criminal from a nervous merchant who fears retaliation.
Player Input: "Tell me about Darian the Knife. I know he's been collecting 'protection' money from shops around here."
NPC: Eldrin the Merchant (Nervous, cautious, values his safety)
DM Response: Eldrin's eyes dart quickly to the shop entrance and back. He lowers his voice to barely above a whisper, leaning slightly over the counter. "I... I don't know what you're talking about," he says, though his trembling hands betray his words as he absently adjusts and readjusts a stack of fabric bolts. "Business is fine. No troubles here."

He swallows hard, then seems to notice a customer browsing nearby—though you suspect this customer is imaginary. "I'm sorry, but I have other patrons to attend to," he announces with artificial brightness. As he turns away, he mutters, almost imperceptibly, "The alley behind the Drunken Dragon at midnight. Not here. Never here." His shoulders remain tense as he busies himself with straightening merchandise that needs no straightening.`
    ]);
  }
  
  public generatePrompt(
    npc: any,
    playerInput: string,
    context: string,
    style: StyleOptions = DEFAULT_STYLE
  ): string {
    // Safely access properties 
    const currentMood = npc.currentMood || 'Neutral';
    const relationshipWithPlayer = npc.relationshipWithPlayer || 'Neutral';
    let knowledge = 'Standard for their role';
    
    if (npc.knowledge) {
      if (Array.isArray(npc.knowledge)) {
        knowledge = npc.knowledge.join(', ');
      } else if (npc.knowledge instanceof Map) {
        knowledge = Array.from(npc.knowledge.keys()).join(', ');
      } else {
        knowledge = String(npc.knowledge);
      }
    }
    
    return `${this.formatExamples()}

NPC CONTEXT:
${context}

NPC DETAILS:
Name: ${npc.name}
Race: ${npc.race}
Occupation: ${npc.occupation || 'Unknown'}
Personality: ${npc.personality || 'Not specified'}
Current Emotional State: ${currentMood}
Relationship with Player: ${relationshipWithPlayer}
Knowledge/Secrets: ${knowledge}

PLAYER INPUT:
${playerInput}

Generate a realistic dialogue response for this NPC, including appropriate speech patterns, mannerisms, and non-verbal cues. The response should reflect their personality, current emotional state, and relationship with the player.`;
  }
}

/**
 * Quest prompt template for quest generation
 */
export class QuestPromptTemplate extends BasePromptTemplate {
  constructor(customSystemPrompt?: string, temperature?: number, maxTokens?: number) {
    const systemPrompt = customSystemPrompt || `You are generating quests in a D&D game, serving as Dungeon Master.
Your task is to create compelling, multi-layered quests that provide meaningful challenges and advance the narrative.

Guidelines:
- Design quests with clear objectives but multiple potential approaches.
- Include interesting NPCs with understandable motivations.
- Balance combat, social interaction, and exploration elements.
- Create appropriate rewards that feel meaningful within the game world.
- Ensure quests have logical connections to the larger campaign when appropriate.
- Include potential complications or twists that can develop during the quest.
- Consider the moral complexity of the quest and opportunities for player choice.
- Design quest elements that highlight the strengths and interests of different player character types.`;
    
    super('quest', systemPrompt, temperature, maxTokens);
    
    this.addExamples([
      `Context: The party is in a coastal town that has been experiencing unusually violent storms recently.
Quest Type: Investigation with potential combat
Level Range: 3-5
DM Response: # The Tempest's Bargain

## Overview
A series of unnatural storms has been battering the coastal town of Saltmarsh, destroying fishing vessels and threatening the local economy. Townsfolk whisper of strange lights seen offshore during the worst squalls and of fishermen hearing haunting melodies carried on the wind.

## Quest Giver
**Harbormaster Eliza Stormsight** - A weathered half-elf with salt-white hair despite her middle age. She's pragmatic, respected, and increasingly desperate as the town's livelihood erodes with each passing storm.

## Objectives
1. Investigate the unnatural storms
2. Discover the source of the strange lights and melodies
3. End the threat to Saltmarsh and its fishing fleet

## Key Locations
- **Saltmarsh Harbor** - Where the quest begins and where evidence of the storms' destruction is most visible
- **The Wrecked Light** - A tavern frequented by sailors, rich with rumors and a hidden back room
- **Merfolk Atoll** - A rocky formation offshore where the party discovers an underwater entrance
- **The Sea Witch's Grotto** - An underwater cave system where the final confrontation occurs

## Important NPCs
- **Harbormaster Eliza Stormsight** - Quest giver, concerned for her town
- **"Barnacle" Bern** - An old sailor who survived an encounter with the sea witch, but his mind was partially broken
- **Coral** - A young merfolk scout who can become an ally if approached diplomatically
- **Nerissa the Sea Witch** - A water genasi outcast who has been summoning the storms

## The Truth
Nerissa the Sea Witch was once a respected member of a secret enclave of water genasi who lived in harmony with the merfolk. When humans from Saltmarsh overfished and polluted parts of the coast, she advocated for aggressive action against them. Exiled for her extremism, she has spent years developing a ritual that channels the elemental plane of water to create destructive storms. She believes she's protecting the ocean ecosystems, even if it means destroying Saltmarsh.

## Potential Approaches
1. **Combat Focus** - Fight through merfolk guards (potentially misled about the party's intentions), confront Nerissa directly
2. **Social Focus** - Negotiate with Coral and other merfolk, attempt to reason with Nerissa or find leverage to stop her
3. **Exploration Focus** - Discover ancient runes throughout the grotto that, when activated in sequence, can disrupt Nerissa's ritual

## Complications
- The next massive storm is brewing and will destroy Saltmarsh within 2-3 days
- Some merfolk genuinely support Nerissa's cause and aren't simply being manipulated
- "Barnacle" Bern's information is crucial but fragmented due to his mental state
- Nerissa possesses a powerful artifact, the Tempest Jewel, which must be contained rather than destroyed

## Rewards
- 150 gold pieces from the town's emergency fund
- Potion of Water Breathing (2)
- Cloak of the Manta Ray
- Reputation gain in Saltmarsh
- Possible alliance with the merfolk community
- Opportunity to decide the fate of the Tempest Jewel

## Moral Complexity
The party will need to grapple with the fact that Nerissa, while causing harm, has legitimate grievances. The fishermen of Saltmarsh have been damaging the underwater ecosystem. True resolution might require addressing both Nerissa's methods AND the behavior of the townspeople.`
    ]);
  }
  
  public generatePrompt(
    questParams: {
      type: string;
      levelRange: string;
      location: string;
      relatedFactions?: string[];
      suggestedLength?: string;
    },
    context: string,
    style: StyleOptions = DEFAULT_STYLE
  ): string {
    return `${this.formatExamples()}

QUEST CONTEXT:
${context}

QUEST PARAMETERS:
Type: ${questParams.type}
Level Range: ${questParams.levelRange}
Location: ${questParams.location}
${questParams.relatedFactions ? `Related Factions: ${questParams.relatedFactions.join(', ')}` : ''}
${questParams.suggestedLength ? `Suggested Length: ${questParams.suggestedLength}` : ''}

Generate a detailed quest with multiple approaches and moral complexity. Include a clear structure with objectives, NPCs, locations, potential complications, and appropriate rewards. The quest should fit naturally into the existing campaign world based on the provided context.`;
  }
}

/**
 * Spell effect prompt template
 */
export class SpellEffectPromptTemplate extends BasePromptTemplate {
  constructor(customSystemPrompt?: string, temperature?: number, maxTokens?: number) {
    const systemPrompt = customSystemPrompt || `You are describing spell effects in a D&D game, serving as Dungeon Master.
Your task is to create vivid, exciting descriptions of magical spells and their effects on the environment and creatures.

Guidelines:
- Describe the visual, auditory, and other sensory aspects of the spell being cast.
- Consider the spell's school of magic and how that influences its manifestation.
- Reflect the caster's personal style and relationship to magic when appropriate.
- Detail the impact on targets, environment, and bystanders.
- Ensure descriptions align with the spell's mechanical effects in the game.
- Vary descriptions based on spell power level, components used, and casting circumstances.
- Include reactions from those witnessing or affected by the spell when relevant.`;
    
    super('spell', systemPrompt, temperature, maxTokens);
    
    this.addExamples([
      `Context: A wizard is casting Fireball at a group of trolls in a narrow forest clearing during rainfall.
Spell: Fireball (3rd level Evocation)
Caster: Elwin the Wizard (specializes in fire magic)
Result: 27 fire damage, two trolls failed their saving throws, one succeeded
DM Response: Elwin extends his hand, revealing a tiny bead of orange-gold light dancing on his fingertip. With a few arcane words that seem to sizzle in the damp air, he flicks the bead toward the trolls. Time seems to slow as the mote of light arcs through the rain, leaving a trail of steam in its wake.

When it reaches the center of the troll group, the bead erupts with a thunderous roar into a massive sphere of golden flames that devours the oxygen around it. The explosion sends a shockwave through the clearing, momentarily pushing back the rainfall and creating a dome of dry space. The scent of sulfur and charred flesh overwhelms the petrichor of the forest.

Two of the trolls are engulfed completely, their agonized howls cutting through the blast as their flesh blackens and peels. The third troll, with surprising reflexes for such a lumbering creature, dives behind a large boulder, though its arm and shoulder still catch flame as it howls in pain.

As the conflagration subsides as quickly as it appeared, it leaves behind scorched earth in a perfect circle. The trees at the edge of the blast radius have their leaves singed, and several branches smolder despite the rain that now falls unimpeded once more. The trolls' regenerative abilities will soon begin to heal their wounds, but for now, they're in visible distress, their fear of fire evident in their wary, pained movements.`
    ]);
  }
  
  public generatePrompt(
    spell: any,
    caster: any,
    context: string,
    result: any,
    style: StyleOptions = DEFAULT_STYLE
  ): string {
    let resultText = '';
    if (result.damage) resultText += `Damage: ${result.damage}`;
    if (result.healing) resultText += `Healing: ${result.healing}`;
    if (result.savedTargets?.length) resultText += `\nTargets that saved: ${result.savedTargets.join(', ')}`;
    if (result.failedTargets?.length) resultText += `\nTargets that failed saves: ${result.failedTargets.join(', ')}`;
    
    // Safely access caster properties
    const casterClass = caster.class || caster.type || 'Unknown';
    const magicalStyle = caster.magicalTraits ? `Magical Style: ${caster.magicalTraits}` : '';
    
    return `${this.formatExamples()}

SPELL CONTEXT:
${context}

SPELL DETAILS:
Name: ${spell.name}
Level: ${spell.level}
School: ${spell.school}
Components: ${spell.components?.join(', ') || 'Unknown'}
Description: ${spell.description || 'Unknown'}

CASTER:
Name: ${caster.name}
Class: ${casterClass}
${magicalStyle}

RESULT:
${resultText}

Generate a vivid description of the spell being cast and its effects. Include sensory details, the physical manifestation of the magic, and its impact on targets and the environment.`;
  }
}

/**
 * Item description prompt template
 */
export class ItemPromptTemplate extends BasePromptTemplate {
  constructor(customSystemPrompt?: string, temperature?: number, maxTokens?: number) {
    const systemPrompt = customSystemPrompt || `You are describing items in a D&D game, serving as Dungeon Master.
Your task is to create evocative, detailed descriptions of items that players find, use, or purchase.

Guidelines:
- Describe the physical appearance, condition, and noteworthy features of the item.
- Include sensory details that convey the item's age, quality, and craftsmanship.
- For magical items, suggest subtle hints of their magical nature before identification.
- Consider the item's history and how it might be reflected in its appearance.
- Balance between flavor text and functional information.
- Adjust detail level based on the item's significance to the game.
- For weapons and armor, include details about weight, balance, and how they feel to wield.`;
    
    super('item', systemPrompt, temperature, maxTokens);
    
    this.addExamples([
      `Context: The player has just recovered an ancient sword from a barrow mound of a long-dead king.
Item: Longsword (magical, unidentified)
DM Response: You pull the sword from the stone hands of the barrow king's effigy. Despite centuries entombed in this damp chamber, the blade bears no tarnish or corrosion. It's a longsword of unusual design—the blade slightly curved, the fuller etched with elaborate knotwork patterns that seem to shift subtly in the torchlight. The crossguard is fashioned from a pale metal with a slight bluish sheen, extending outward in the shape of stylized raven's wings.

The grip is wrapped in leather that should have rotted away ages ago, yet remains supple and unworn. When you lift the weapon, it feels unusually lightweight and perfectly balanced. A small rune is visible on the pommel, partially obscured by age but clearly depicting a crescent moon.

As you hold the blade, you notice a faint hum emanating from it—so quiet you might imagine it—and the air around the edge of the blade seems slightly colder than it should be. Whatever enchantment this weapon holds, it has not diminished with the passing of its previous owner.`
    ]);
  }
  
  public generatePrompt(
    item: {
      name: string;
      type: string;
      rarity?: string;
      magical?: boolean;
      identified?: boolean;
      description?: string;
    },
    context: string,
    style: StyleOptions = DEFAULT_STYLE
  ): string {
    return `${this.formatExamples()}

ITEM CONTEXT:
${context}

ITEM DETAILS:
Name: ${item.name}
Type: ${item.type}
${item.rarity ? `Rarity: ${item.rarity}` : ''}
${item.magical !== undefined ? `Magical: ${item.magical ? 'Yes' : 'No'}` : ''}
${item.identified !== undefined ? `Identified: ${item.identified ? 'Yes' : 'No'}` : ''}
${item.description ? `Basic Description: ${item.description}` : ''}

Generate a rich, evocative description of this item as the player discovers or examines it. Include physical details, sensory information, and subtle hints about its properties and history.`;
  }
}

/**
 * Factory function to create prompt templates
 */
export function createPromptTemplate(
  component: PromptComponent,
  customSystemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): AdvancedPromptTemplate {
  switch (component) {
    case 'narrative':
      return new NarrativePromptTemplate(
        customSystemPrompt,
        temperature,
        maxTokens
      );
    case 'combat':
      return new CombatPromptTemplate(
        customSystemPrompt,
        temperature,
        maxTokens
      );
    case 'location':
      return new LocationPromptTemplate(
        customSystemPrompt,
        temperature,
        maxTokens
      );
    case 'npc':
    case 'dialogue':
      return new NPCDialoguePromptTemplate(
        customSystemPrompt,
        temperature,
        maxTokens
      );
    case 'quest':
      return new QuestPromptTemplate(
        customSystemPrompt,
        temperature,
        maxTokens
      );
    case 'spell':
      return new SpellEffectPromptTemplate(
        customSystemPrompt,
        temperature,
        maxTokens
      );
    case 'item':
      return new ItemPromptTemplate(
        customSystemPrompt,
        temperature,
        maxTokens
      );
    default:
      return new NarrativePromptTemplate(
        customSystemPrompt,
        temperature,
        maxTokens
      );
  }
}

/**
 * Factory class for creating prompt templates
 * Provides an object-oriented approach to template creation
 */
export class PromptTemplateFactory {
  /**
   * Create a prompt template
   */
  public static create(
    component: PromptComponent,
    customSystemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): AdvancedPromptTemplate {
    return createPromptTemplate(component, customSystemPrompt, temperature, maxTokens);
  }

  /**
   * Create a narrative prompt template
   */
  public static createNarrativeTemplate(
    customSystemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): NarrativePromptTemplate {
    return new NarrativePromptTemplate(customSystemPrompt, temperature, maxTokens);
  }

  /**
   * Create a combat prompt template
   */
  public static createCombatTemplate(
    customSystemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): CombatPromptTemplate {
    return new CombatPromptTemplate(customSystemPrompt, temperature, maxTokens);
  }

  /**
   * Create a location prompt template
   */
  public static createLocationTemplate(
    customSystemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): LocationPromptTemplate {
    return new LocationPromptTemplate(customSystemPrompt, temperature, maxTokens);
  }

  /**
   * Create an NPC dialogue prompt template
   */
  public static createNPCDialogueTemplate(
    customSystemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): NPCDialoguePromptTemplate {
    return new NPCDialoguePromptTemplate(customSystemPrompt, temperature, maxTokens);
  }

  /**
   * Create a quest prompt template
   */
  public static createQuestTemplate(
    customSystemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): QuestPromptTemplate {
    return new QuestPromptTemplate(customSystemPrompt, temperature, maxTokens);
  }

  /**
   * Create a spell effect prompt template
   */
  public static createSpellEffectTemplate(
    customSystemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): SpellEffectPromptTemplate {
    return new SpellEffectPromptTemplate(customSystemPrompt, temperature, maxTokens);
  }

  /**
   * Create an item prompt template
   */
  public static createItemTemplate(
    customSystemPrompt?: string,
    temperature?: number,
    maxTokens?: number
  ): ItemPromptTemplate {
    return new ItemPromptTemplate(customSystemPrompt, temperature, maxTokens);
  }
}

/**
 * Create a style options object with custom settings
 */
export function createStyle(
  options: Partial<StyleOptions> = {}
): StyleOptions {
  return { ...DEFAULT_STYLE, ...options };
}

export default {
  createPromptTemplate,
  createStyle,
  DEFAULT_STYLE,
  NarrativePromptTemplate,
  CombatPromptTemplate,
  LocationPromptTemplate,
  NPCDialoguePromptTemplate,
  QuestPromptTemplate,
  SpellEffectPromptTemplate,
  ItemPromptTemplate
}; 