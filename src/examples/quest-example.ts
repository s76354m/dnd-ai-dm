import { GameState } from '../core/interfaces';
import { QuestManager } from '../world/quest-manager';
import { QuestStatus } from '../core/interfaces';
import { ProgressionManager } from '../character/progression';
import { Class, Background, Alignment } from '../core/types';

// Define the QuestStatus enum (since we don't have direct access to it)
enum QuestStatus {
  Available = 'available',
  Active = 'active',
  Completed = 'completed',
  Failed = 'failed'
}

// Create a simple mock game state for the example
const createMockGameState = (): GameState => {
  const gameState = {
    player: {
      id: 'player-1',
      name: 'Adventurer',
      race: 'human',
      class: 'fighter' as Class,
      background: 'soldier' as Background,
      alignment: 'neutral good' as Alignment,
      level: 1,
      experiencePoints: 0,
      abilityScores: {
        strength: { score: 14, modifier: 2 },
        dexterity: { score: 12, modifier: 1 },
        constitution: { score: 13, modifier: 1 },
        intelligence: { score: 10, modifier: 0 },
        wisdom: { score: 11, modifier: 0 },
        charisma: { score: 8, modifier: -1 }
      },
      hitPoints: {
        current: 12,
        maximum: 12
      },
      temporaryHitPoints: 0,
      hitDice: {
        diceType: 'd10',
        total: 1,
        used: 0
      },
      armorClass: 11,
      initiative: 1,
      speed: 30,
      proficiencyBonus: 2,
      skills: {
        acrobatics: { proficient: false, expertise: false, bonus: 1 },
        'animal handling': { proficient: false, expertise: false, bonus: 0 },
        arcana: { proficient: false, expertise: false, bonus: 0 },
        athletics: { proficient: true, expertise: false, bonus: 4 },
        deception: { proficient: false, expertise: false, bonus: -1 },
        history: { proficient: false, expertise: false, bonus: 0 },
        insight: { proficient: false, expertise: false, bonus: 0 },
        intimidation: { proficient: true, expertise: false, bonus: 1 },
        investigation: { proficient: false, expertise: false, bonus: 0 },
        medicine: { proficient: false, expertise: false, bonus: 0 },
        nature: { proficient: false, expertise: false, bonus: 0 },
        perception: { proficient: false, expertise: false, bonus: 0 },
        performance: { proficient: false, expertise: false, bonus: -1 },
        persuasion: { proficient: false, expertise: false, bonus: -1 },
        religion: { proficient: false, expertise: false, bonus: 0 },
        'sleight of hand': { proficient: false, expertise: false, bonus: 1 },
        stealth: { proficient: false, expertise: false, bonus: 1 },
        survival: { proficient: true, expertise: false, bonus: 2 }
      },
      conditions: [],
      inventory: [],
      traits: [],
      proficiencies: {
        skills: [],
        tools: [],
        armor: [],
        weapons: [],
        savingThrows: [],
        languages: []
      },
      classFeatures: [],
      racialTraits: [],
      backgroundFeature: {
        name: 'Military Rank',
        description: 'You have a military rank from your career as a soldier.',
        source: 'soldier' as Background
      },
      feats: [],
      personality: {
        traits: [],
        ideals: [],
        bonds: [],
        flaws: []
      },
      equipment: [],
      wealth: {
        copper: 0,
        silver: 0,
        electrum: 0,
        gold: 10,
        platinum: 0
      },
      appearance: {
        age: 30,
        height: '6\'0"',
        weight: '180 lbs',
        eyes: 'brown',
        skin: 'tan',
        hair: 'black'
      },
      backstory: '',
      inspiration: false,
      deathSaves: {
        successes: 0,
        failures: 0
      },
      // Custom property for progression manager
      progression: undefined as any
    },
    currentLocation: {
      id: 'town-square',
      name: 'Town Square',
      description: 'The bustling center of the town.',
      type: 'town',
      connections: new Map(),
      npcs: [],
      items: [],
      isHostile: false,
      lighting: 'bright' as 'bright' | 'dim' | 'dark',
      terrain: 'urban'
    },
    locations: new Map(),
    activeQuests: [],
    completedQuests: [],
    npcs: new Map(),
    combatState: undefined,
    gameTime: {
      day: 1,
      hour: 12,
      minute: 0,
      timeOfDay: 'day' as 'day' | 'dawn' | 'dusk' | 'night'
    },
    worldState: {
      currentWeather: 'clear'
    },
    sessionHistory: []
  };
  
  return gameState;
};

// Main function to run the quest example
const runQuestExample = () => {
  console.log('=== D&D AI DM Quest System Example ===\n');
  
  // Create a mock game state
  const gameState = createMockGameState();
  
  // Create a progression manager for the player
  const progressionManager = new ProgressionManager(gameState.player);
  (gameState.player as any).progression = progressionManager;
  
  // Create a quest manager
  const questManager = new QuestManager(gameState);
  
  // Set up event listeners for quest events
  questManager.on('questCreated', (event) => {
    console.log(`New quest created: "${event.quest.title}"`);
  });
  
  questManager.on('questAccepted', (event) => {
    console.log(`Quest accepted: "${event.quest.title}"`);
  });
  
  questManager.on('questUpdated', (event) => {
    console.log(`Quest "${event.quest.title}" updated:`);
    console.log(`  Objective: ${event.objective.description}`);
    console.log(`  Progress: ${event.objective.progress}/${event.objective.target}`);
  });
  
  questManager.on('questCompleted', (event) => {
    console.log(`Quest completed: "${event.quest.title}"`);
  });
  
  questManager.on('rewardsApplied', (event) => {
    console.log('Rewards applied:');
    event.rewards.forEach((reward: any) => {
      if (reward.type === 'experience') {
        console.log(`  XP: ${reward.value}`);
      } else if (reward.type === 'gold') {
        console.log(`  Gold: ${reward.value}`);
      } else if (reward.type === 'item') {
        console.log(`  Item: ${reward.item.name}`);
      }
    });
    console.log(`Player now has ${gameState.player.experiencePoints} XP and ${gameState.player.wealth.gold} gold.`);
  });
  
  // Create a simple quest
  console.log('\n--- Creating a simple rat extermination quest ---');
  const ratQuest = questManager.createQuest(
    'Rat Problem',
    'The innkeeper has asked you to clear out rats from the cellar.',
    [
      {
        id: 'rat-kill-objective',
        type: 'kill',
        description: 'Kill rats in the cellar',
        target: 'rat',
        location: 'inn-cellar',
        progress: 0,
        required: 5,
        isCompleted: false
      }
    ],
    [
      { type: 'experience', value: 100 },
      { type: 'gold', value: 10 }
    ],
    1,
    'Innkeeper Jorgen',
    'Prancing Pony Inn'
  );
  
  // Accept the quest
  console.log('\n--- Accepting the quest ---');
  questManager.acceptQuest(ratQuest.id);
  
  // Simulate killing some rats
  console.log('\n--- Simulating quest progress ---');
  console.log('Player encounters rats in the cellar...');
  
  // First rat
  console.log('\nPlayer kills a rat!');
  questManager.trackQuestEvent('kill', 'rat', 'inn-cellar', 1);
  
  // Two more rats
  console.log('\nPlayer kills two more rats!');
  questManager.trackQuestEvent('kill', 'rat', 'inn-cellar', 2);
  
  // Let's see our current progress
  const updatedQuest = questManager.getQuest(ratQuest.id);
  console.log(`\nCurrent progress: ${updatedQuest?.objectives[0].progress}/${updatedQuest?.objectives[0].target} rats`);
  
  // Kill the last rats
  console.log('\nPlayer kills final rats!');
  questManager.trackQuestEvent('kill', 'rat', 'inn-cellar', 2);
  
  // Create a more complex quest
  console.log('\n\n--- Creating a more complex quest ---');
  const deliveryQuest = questManager.createQuest(
    'Important Delivery',
    'Deliver a package to the mayor and collect herbs along the way.',
    [
      {
        id: 'deliver-package-objective',
        type: 'interact',
        description: 'Deliver the package to Mayor Wilkins',
        target: 'package',
        location: 'town-hall',
        progress: 0,
        required: 1,
        isCompleted: false
      },
      {
        id: 'collect-herbs-objective',
        type: 'collect',
        description: 'Collect healing herbs along the forest path',
        target: 'herb',
        location: 'forest-path',
        progress: 0,
        required: 3,
        isCompleted: false
      }
    ],
    [
      { type: 'experience', value: 150 },
      { type: 'gold', value: 15 },
      { 
        type: 'item', 
        value: 50,
        item: {
          id: 'healing-potion',
          name: 'Healing Potion',
          description: 'A small vial of red liquid that heals wounds.',
          type: 'potion',
          value: 50,
          weight: 0.5,
          quantity: 1,
          isEquipped: false,
          properties: []
        }
      }
    ],
    2,
    'Merchant Greta',
    'Town Market'
  );
  
  // Accept the quest
  console.log('\n--- Accepting the delivery quest ---');
  questManager.acceptQuest(deliveryQuest.id);
  
  // Simulate collecting herbs
  console.log('\n--- Collecting herbs on the forest path ---');
  questManager.trackQuestEvent('collect', 'herb', 'forest-path', 3);
  
  // Simulate delivering the package
  console.log('\n--- Delivering the package to the mayor ---');
  questManager.trackQuestEvent('deliver', 'package', 'town-hall', 1);
  
  // Show completed quests
  console.log('\n--- Completed Quests ---');
  const completedQuests = questManager.getCompletedQuests();
  completedQuests.forEach(quest => {
    console.log(`- ${quest.title} (Completed)`);
    console.log(`  Rewards: ${quest.rewards.map((r: any) => {
      if (r.type === 'experience') return `${r.value} XP`;
      if (r.type === 'gold') return `${r.value} gold`;
      if (r.type === 'item') return r.item?.name;
      return '';
    }).join(', ')}`);
  });
  
  // Final player status
  console.log('\n--- Final Player Status ---');
  console.log(`Player: ${gameState.player.name}`);
  console.log(`Level: ${gameState.player.level}`);
  console.log(`XP: ${gameState.player.experiencePoints}`);
  console.log(`Gold: ${gameState.player.wealth.gold}`);
  console.log(`Items: ${gameState.player.equipment.map(item => item.name).join(', ')}`);
  
  console.log('\n=== Quest System Example Complete ===');
};

// Run the example
runQuestExample();