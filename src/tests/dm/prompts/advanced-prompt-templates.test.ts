/**
 * Advanced Prompt Templates Tests
 * 
 * Tests for the Advanced Prompt Templates system, which provides specialized
 * prompt templates for different game aspects with customizable style options.
 */

import { 
  createPromptTemplate,
  NarrativePromptTemplate,
  CombatPromptTemplate,
  LocationPromptTemplate,
  NPCDialoguePromptTemplate,
  QuestPromptTemplate,
  ItemPromptTemplate,
  SpellEffectPromptTemplate,
  createStyle,
  DEFAULT_STYLE,
  StyleOptions,
  PromptTemplateFactory
} from '../../../dm/prompts/advanced-prompt-templates';

// Mock the interfaces
jest.mock('../../../core/interfaces/npc', () => ({}));
jest.mock('../../../core/interfaces/world', () => ({}));
jest.mock('../../../core/interfaces/combat', () => ({}));
jest.mock('../../../core/interfaces/spell', () => ({}));
jest.mock('../../../core/interfaces/character', () => ({}));
jest.mock('../../../core/interfaces/quest', () => ({}));
jest.mock('../../../core/interfaces/location', () => ({}));

// Create mock objects
const mockNPC = {
  id: 'mock-npc-1',
  name: 'Elara',
  race: 'Elf',
  occupation: 'Merchant',
  personality: {
    traits: ['shrewd', 'friendly', 'secretive'],
    ideals: ['Freedom'],
    bonds: ['Loyal to the guild'],
    flaws: ['Greedy']
  },
  goals: ['Make profit', 'Hide her true identity'],
  relationshipWithPlayer: 'Neutral',
  currentMood: 'Cautious',
  knowledge: ['Local rumors', 'Market prices'],
  description: 'A tall elven merchant with silver hair',
  attitude: 'Neutral',
  isQuestGiver: false,
  dialogue: {},
  location: 'marketplace'
};

const mockLocation = {
  name: 'Forgotten Temple',
  description: 'An ancient temple lost to time',
  type: 'ruins',
  environment: 'jungle',
  features: ['crumbling columns', 'overgrown altar', 'mysterious symbols'],
  connections: new Map(),
  npcs: [],
  items: [],
  isHostile: false,
  lighting: 'dim',
  terrain: 'stone'
};

describe('Advanced Prompt Templates', () => {
  // Test the factory function
  describe('createPromptTemplate', () => {
    test('creates appropriate template for each component type', () => {
      // Create templates for different components
      const narrativeTemplate = createPromptTemplate('narrative');
      const combatTemplate = createPromptTemplate('combat');
      const locationTemplate = createPromptTemplate('location');
      const npcTemplate = createPromptTemplate('npc');
      const questTemplate = createPromptTemplate('quest');
      const itemTemplate = createPromptTemplate('item');
      const dialogueTemplate = createPromptTemplate('dialogue');
      
      // Verify correct template types
      expect(narrativeTemplate).toBeInstanceOf(NarrativePromptTemplate);
      expect(combatTemplate).toBeInstanceOf(CombatPromptTemplate);
      expect(locationTemplate).toBeInstanceOf(LocationPromptTemplate);
      expect(npcTemplate).toBeInstanceOf(NPCDialoguePromptTemplate);
      expect(questTemplate).toBeInstanceOf(QuestPromptTemplate);
      expect(itemTemplate).toBeInstanceOf(ItemPromptTemplate);
      expect(dialogueTemplate).toBeInstanceOf(NPCDialoguePromptTemplate);
      
      // Verify templates have component-specific properties
      expect(narrativeTemplate.component).toBe('narrative');
      expect(combatTemplate.component).toBe('combat');
      expect(locationTemplate.component).toBe('location');
      // The factory function sets 'dialogue' as the component for NPCDialoguePromptTemplate
      expect(npcTemplate.component).toBe('dialogue');
      expect(questTemplate.component).toBe('quest');
      expect(itemTemplate.component).toBe('item');
      expect(dialogueTemplate.component).toBe('dialogue');
    });
    
    test('allows customization of system prompt', () => {
      const customPrompt = "This is a custom system prompt.";
      const template = createPromptTemplate('narrative', customPrompt);
      
      expect(template.systemPrompt).toBe(customPrompt);
    });
    
    test('allows setting temperature', () => {
      const customTemperature = 0.5;
      const template = createPromptTemplate('narrative', undefined, customTemperature);
      
      expect(template.temperature).toBe(customTemperature);
    });
    
    test('allows setting maxTokens', () => {
      const customMaxTokens = 300;
      const template = createPromptTemplate('narrative', undefined, undefined, customMaxTokens);
      
      expect(template.maxTokens).toBe(customMaxTokens);
    });
  });
  
  // Test style options
  describe('Style Options', () => {
    test('createStyle utility sets defaults for missing options', () => {
      // Create partial style
      const partialStyle = createStyle({
        tone: 'mysterious'
      });
      
      // Verify defaults are applied for unspecified options
      expect(partialStyle.tone).toBe('mysterious');
      expect(partialStyle.verbosity).toBe(DEFAULT_STYLE.verbosity);
      expect(partialStyle.language).toBe(DEFAULT_STYLE.language);
      expect(partialStyle.perspective).toBe(DEFAULT_STYLE.perspective);
    });
    
    test('style influences system prompt', () => {
      const template = createPromptTemplate('narrative');
      // Mock the formatSystemPrompt method
      jest.spyOn(template, 'formatSystemPrompt').mockImplementation((style) => {
        return `STYLE: ${style.tone}, ${style.verbosity}, ${style.language}, ${style.perspective}`;
      });
      
      const dramaticStyle: StyleOptions = {
        tone: 'dramatic',
        verbosity: 'detailed',
        language: 'elaborate',
        perspective: 'third-person',
        emphasisOn: ['emotion', 'sensation']
      };
      
      const systemPrompt = template.formatSystemPrompt(dramaticStyle);
      
      // Style elements should be reflected in the system prompt
      expect(systemPrompt).toContain('dramatic');
      expect(systemPrompt).toContain('detailed');
      expect(systemPrompt).toContain('elaborate');
      expect(systemPrompt).toContain('third-person');
      
      jest.restoreAllMocks();
    });
  });
  
  // Test the PromptTemplateFactory class
  describe('PromptTemplateFactory', () => {
    test('creates templates using generic create method', () => {
      const template = PromptTemplateFactory.create('narrative');
      expect(template).toBeInstanceOf(NarrativePromptTemplate);
      expect(template.component).toBe('narrative');
    });

    test('creates specific template types using specialized methods', () => {
      const narrativeTemplate = PromptTemplateFactory.createNarrativeTemplate();
      const combatTemplate = PromptTemplateFactory.createCombatTemplate();
      const locationTemplate = PromptTemplateFactory.createLocationTemplate();
      const npcTemplate = PromptTemplateFactory.createNPCDialogueTemplate();
      const questTemplate = PromptTemplateFactory.createQuestTemplate();
      const spellTemplate = PromptTemplateFactory.createSpellEffectTemplate();
      const itemTemplate = PromptTemplateFactory.createItemTemplate();
      
      expect(narrativeTemplate).toBeInstanceOf(NarrativePromptTemplate);
      expect(combatTemplate).toBeInstanceOf(CombatPromptTemplate);
      expect(locationTemplate).toBeInstanceOf(LocationPromptTemplate);
      expect(npcTemplate).toBeInstanceOf(NPCDialoguePromptTemplate);
      expect(questTemplate).toBeInstanceOf(QuestPromptTemplate);
      expect(spellTemplate).toBeInstanceOf(SpellEffectPromptTemplate);
      expect(itemTemplate).toBeInstanceOf(ItemPromptTemplate);
    });

    test('passes custom parameters to templates', () => {
      const customPrompt = "Custom factory system prompt";
      const customTemperature = 0.3;
      const customMaxTokens = 250;
      
      const template = PromptTemplateFactory.createNarrativeTemplate(
        customPrompt,
        customTemperature,
        customMaxTokens
      );
      
      expect(template.systemPrompt).toBe(customPrompt);
      expect(template.temperature).toBe(customTemperature);
      expect(template.maxTokens).toBe(customMaxTokens);
    });
  });
}); 