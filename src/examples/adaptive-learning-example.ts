/**
 * Adaptive Learning System Example
 * 
 * This example demonstrates how the Adaptive Learning System enables NPCs and factions
 * to learn from past experiences and adapt their behavior patterns.
 */

import { NPC } from '../character/npc';
import { AdaptiveLearningSystem } from '../ai/npc/adaptive-learning';
import { FactionManager } from '../ai/npc/social/faction-manager';
import { MemoryManager } from '../ai/memory/memory-manager';
import { Behavior, BehaviorCategory, BehaviorPriority } from '../ai/npc/behavior-simulation';
import { OutcomeType } from '../types/behavior-types';
import { EventType, GameEvent } from '../world/event-system';
import { FactionGoalStatus } from '../types/faction-types';

// Setup test utilities
const logHeader = (title: string) => {
    console.log('\n' + '='.repeat(80));
    console.log(`${title}`);
    console.log('='.repeat(80) + '\n');
};

const logStep = (text: string) => {
    console.log(`\n> ${text}`);
    console.log('-'.repeat(60));
};

// Create necessary systems
const factionManager = new FactionManager();
const memoryManager = new MemoryManager();
const adaptiveLearningSystem = new AdaptiveLearningSystem(factionManager, memoryManager);

// Create factions
const woodlandFaction = factionManager.createFaction({
    name: 'Woodland Alliance',
    description: 'Forest dwellers who protect the natural balance',
    values: [
        { name: 'freedom', strength: 0.8 },
        { name: 'tradition', strength: 0.6 }
    ],
    goals: [
        {
            id: 'goal1',
            name: 'Defend the Ancient Grove',
            description: 'Protect the ancient grove from Imperial logging operations',
            type: 'territorial',
            priority: 0.9,
            status: FactionGoalStatus.IN_PROGRESS,
            progress: 0.3,
            resourceRequirements: {
                warriors: 20,
                supplies: 50
            }
        },
        {
            id: 'goal2',
            name: 'Build Alliance with Mountain Clans',
            description: 'Establish formal alliance with the Mountain Clans',
            type: 'diplomatic',
            priority: 0.7,
            status: FactionGoalStatus.IN_PROGRESS,
            progress: 0.5
        }
    ]
});

const imperialFaction = factionManager.createFaction({
    name: 'Imperial Legion',
    description: 'Organized military force expanding their territory',
    values: [
        { name: 'ambition', strength: 0.8 },
        { name: 'loyalty', strength: 0.6 }
    ],
    goals: [
        {
            id: 'goal3',
            name: 'Establish Logging Outpost',
            description: 'Build a logging outpost in the ancient grove',
            type: 'territorial',
            priority: 0.8,
            status: FactionGoalStatus.IN_PROGRESS,
            progress: 0.4,
            resourceRequirements: {
                soldiers: 15,
                gold: 100,
                workers: 30
            }
        }
    ]
});

// Set faction relationships
factionManager.setFactionRelationship(woodlandFaction.id, imperialFaction.id, 'enemy');

// Create NPCs for testing
const createNPC = (id: string, name: string, factionId: string): NPC => {
    const npc: NPC = {
        id,
        name,
        race: 'human',
        class: 'warrior',
        level: 5,
        abilities: {
            strength: 12,
            dexterity: 12,
            constitution: 12,
            intelligence: 12,
            wisdom: 12,
            charisma: 12
        },
        hitPoints: { current: 30, maximum: 30 },
        emotionalState: { activeEmotions: [] },
        inventory: [],
        equipment: {},
        gold: 0,
        experience: 0,
        skills: {},
        features: [],
        spellcasting: { spellSlots: {}, preparedSpells: [], knownSpells: [] },
        personality: { traits: [], ideals: [], bonds: [], flaws: [] },
        background: 'soldier',
        alignment: 'neutral'
    };
    
    // Add to faction
    factionManager.addNPCToFaction(npc.id, factionId);
    
    return npc;
};

// Create rangers of different experience levels
const leywoodRanger = createNPC('ranger1', 'Leywood', woodlandFaction.id);
const thistleRanger = createNPC('ranger2', 'Thistle', woodlandFaction.id);
const rookieRanger = createNPC('ranger3', 'Oakhart', woodlandFaction.id);

// Create imperial soldiers
const imperialCaptain = createNPC('imperial1', 'Captain Ironhelm', imperialFaction.id);
const imperialScout = createNPC('imperial2', 'Scout Fleetfoot', imperialFaction.id);

// Create test behaviors
const createBehavior = (id: string, name: string, category: BehaviorCategory, priority: BehaviorPriority): Behavior => ({
    id,
    name,
    category,
    priority,
    conditions: [],
    effects: [],
    metadata: {}
});

// Create a set of behaviors for testing
const archery = createBehavior('archery', 'Fire Arrows', BehaviorCategory.AGGRESSIVE, BehaviorPriority.MEDIUM);
const ambush = createBehavior('ambush', 'Set Ambush', BehaviorCategory.AGGRESSIVE, BehaviorPriority.HIGH);
const tracking = createBehavior('tracking', 'Track Enemy', BehaviorCategory.CURIOUS, BehaviorPriority.MEDIUM);
const retreat = createBehavior('retreat', 'Strategic Retreat', BehaviorCategory.DEFENSIVE, BehaviorPriority.LOW);
const negotiate = createBehavior('negotiate', 'Negotiate Terms', BehaviorCategory.COOPERATIVE, BehaviorPriority.LOW);
const celebrate = createBehavior('celebrate', 'Celebrate Victory', BehaviorCategory.RECREATIONAL, BehaviorPriority.BACKGROUND);

// Define behaviors for test
const rangerBehaviors = [archery, ambush, tracking, retreat, negotiate, celebrate];

// Simulate behavior outcomes
function simulateOutcomes(npc: NPC, behavior: Behavior, numTrials: number, successRate: number): void {
    for (let i = 0; i < numTrials; i++) {
        const roll = Math.random();
        let outcome: OutcomeType;
        
        if (roll < successRate) {
            outcome = OutcomeType.SUCCESS;
        } else if (roll < successRate + 0.2) {
            outcome = OutcomeType.MIXED;
        } else {
            outcome = OutcomeType.FAILURE;
        }
        
        adaptiveLearningSystem.recordBehaviorOutcome(
            npc, 
            behavior, 
            outcome, 
            `Trial ${i+1}: ${outcome === OutcomeType.SUCCESS ? 'Successful' : outcome === OutcomeType.MIXED ? 'Mixed results' : 'Failed'}`
        );
    }
}

// Function to display behavior preferences
function displayBehaviorPreferences(npc: NPC, behaviors: Behavior[]): void {
    console.log(`${npc.name}'s Behavior Preferences:`);
    
    const adjustedBehaviors = adaptiveLearningSystem.adjustBehaviorsByLearning(npc, behaviors);
    
    adjustedBehaviors.forEach(behavior => {
        console.log(`  ${behavior.name} (${behavior.category}): ${behavior.priority}`);
        if (behavior.metadata && behavior.metadata.learningPreference) {
            const preference = behavior.metadata.learningPreference;
            const sign = preference > 0 ? '+' : '';
            console.log(`    Learning preference: ${sign}${preference.toFixed(2)}`);
        }
        if (behavior.metadata && behavior.metadata.adaptiveReasoning) {
            console.log(`    Reasoning: ${behavior.metadata.adaptiveReasoning}`);
        }
    });
}

// Create a game event
function createGameEvent(type: EventType, description: string, source?: string, target?: string): GameEvent {
    return {
        id: `event_${Date.now()}`,
        type,
        description,
        timestamp: Date.now(),
        location: { x: 100, y: 100 },
        sourceFactionId: source,
        targetFactionId: target,
        involvedNPCs: [],
        metadata: {}
    };
}

async function runExample() {
    logHeader('ADAPTIVE LEARNING SYSTEM EXAMPLE');
    
    // SCENARIO 1: Behavior Learning from Past Outcomes
    logStep('Scenario 1: Behavior Learning from Past Outcomes');
    
    console.log('Simulating past experiences for Leywood (experienced ranger)...');
    // Leywood is good at archery and tracking, but not great at negotiation
    simulateOutcomes(leywoodRanger, archery, 10, 0.8);
    simulateOutcomes(leywoodRanger, tracking, 8, 0.9);
    simulateOutcomes(leywoodRanger, ambush, 5, 0.6);
    simulateOutcomes(leywoodRanger, retreat, 3, 0.7);
    simulateOutcomes(leywoodRanger, negotiate, 4, 0.3);
    
    console.log('\nSimulating past experiences for Thistle (specialized in ambushes)...');
    // Thistle excels at ambushes but is average at other skills
    simulateOutcomes(thistleRanger, archery, 6, 0.5);
    simulateOutcomes(thistleRanger, tracking, 5, 0.6);
    simulateOutcomes(thistleRanger, ambush, 12, 0.9);
    simulateOutcomes(thistleRanger, retreat, 4, 0.7);
    simulateOutcomes(thistleRanger, negotiate, 2, 0.4);
    
    console.log('\nOakhart is a rookie with minimal experience');
    // Oakhart is new and has little experience
    simulateOutcomes(rookieRanger, archery, 2, 0.4);
    simulateOutcomes(rookieRanger, tracking, 1, 0.5);
    
    // Display adjusted behavior preferences
    console.log('\nExperienced Ranger Behavior Preferences:');
    displayBehaviorPreferences(leywoodRanger, rangerBehaviors);
    
    console.log('\nAmbush Specialist Behavior Preferences:');
    displayBehaviorPreferences(thistleRanger, rangerBehaviors);
    
    console.log('\nRookie Ranger Behavior Preferences:');
    displayBehaviorPreferences(rookieRanger, rangerBehaviors);
    
    // SCENARIO 2: Developing Specializations
    logStep('Scenario 2: Developing Specializations Over Time');
    
    console.log('Simulating additional training sessions for Oakhart focused on archery...');
    
    // Day 1 of training - some failures
    console.log('\nDay 1 of archery training:');
    simulateOutcomes(rookieRanger, archery, 5, 0.4);
    displayBehaviorPreferences(rookieRanger, [archery]);
    
    // Day 5 of training - improvement
    console.log('\nDay 5 of archery training:');
    simulateOutcomes(rookieRanger, archery, 10, 0.6);
    displayBehaviorPreferences(rookieRanger, [archery]);
    
    // Day 10 of training - significant improvement
    console.log('\nDay 10 of archery training:');
    simulateOutcomes(rookieRanger, archery, 15, 0.8);
    displayBehaviorPreferences(rookieRanger, [archery]);
    
    // Generate a learning report
    console.log('\nLearning Report for Oakhart after training:');
    console.log(adaptiveLearningSystem.generateNPCLearningReport('ranger3'));
    
    // SCENARIO 3: Faction Goal Adaptation
    logStep('Scenario 3: Faction Goal Adaptation to Events');
    
    console.log('Initial faction goals:');
    console.log('Woodland Alliance:', woodlandFaction.goals.map(g => `${g.name} (${g.progress * 100}% complete)`));
    console.log('Imperial Legion:', imperialFaction.goals.map(g => `${g.name} (${g.progress * 100}% complete)`));
    
    console.log('\nSimulating a series of events affecting faction goals...');
    
    // Event 1: Imperial attack on Woodland territory
    const attackEvent = createGameEvent(
        EventType.ATTACK,
        'Imperial forces attack woodland outpost',
        imperialFaction.id,
        woodlandFaction.id
    );
    
    console.log('\nEvent: Imperial forces attack woodland outpost');
    adaptiveLearningSystem.processFactionAdaptation(attackEvent);
    
    // Event 2: Resource loss for woodland faction
    const resourceLossEvent = createGameEvent(
        EventType.RESOURCE_LOSS,
        'Woodland Alliance suffers resource shortage after wildfire',
        null,
        woodlandFaction.id
    );
    
    console.log('\nEvent: Woodland Alliance suffers resource shortage after wildfire');
    adaptiveLearningSystem.processFactionAdaptation(resourceLossEvent);
    
    // Event 3: Member death in Woodland Alliance
    const memberDeathEvent = createGameEvent(
        EventType.MEMBER_DEATH,
        'Woodland Alliance ranger killed in Imperial ambush',
        imperialFaction.id,
        woodlandFaction.id
    );
    
    console.log('\nEvent: Woodland Alliance ranger killed in Imperial ambush');
    adaptiveLearningSystem.processFactionAdaptation(memberDeathEvent);
    
    // Check adaptation pressure on goals
    console.log('\nAdaptation pressure on Woodland territorial goal:');
    console.log(`Pressure: ${adaptiveLearningSystem.shouldAdaptGoal(woodlandFaction.id, 'goal1', attackEvent) ? 'High (should adapt)' : 'Low (no adaptation needed)'}`);
    
    // SCENARIO 4: Strategy Recommendations
    logStep('Scenario 4: Strategy Recommendations Based on Learning');
    
    const recommendations = adaptiveLearningSystem.generateStrategyRecommendations(woodlandFaction.id);
    
    console.log('Strategy recommendations for Woodland Alliance:');
    if (recommendations.length === 0) {
        console.log('No specific recommendations yet - insufficient data.');
    } else {
        recommendations.forEach((rec, i) => {
            console.log(`${i + 1}. ${rec}`);
        });
    }
    
    logHeader('EXAMPLE COMPLETE');
}

// Run the example
runExample().catch(console.error);