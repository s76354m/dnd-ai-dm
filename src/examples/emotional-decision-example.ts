/**
 * Emotional Decision Model Example
 * 
 * This example demonstrates how the Emotional Decision Model affects NPC behavior 
 * and decision-making based on their emotional states, and illustrates emotional
 * contagion between NPCs.
 */

import { NPC } from '../character/npc';
import { EmotionType } from '../types/emotion-types';
import { EmotionalDecisionModel } from '../ai/npc/emotional-decision-model';
import { FactionManager } from '../ai/npc/social/faction-manager';
import { MemoryManager } from '../ai/memory/memory-manager';
import { RelationshipTracker } from '../ai/memory/relationship-tracker';
import { Behavior, BehaviorCategory, BehaviorPriority } from '../ai/npc/behavior-simulation';
import { EventType, GameEvent } from '../world/event-system';

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
const relationshipTracker = new RelationshipTracker();
const emotionalDecisionModel = new EmotionalDecisionModel(
    factionManager,
    memoryManager,
    relationshipTracker
);

// Setup test data

// Create factions with distinct values
const woodlandFaction = factionManager.createFaction({
    name: 'Woodland Alliance',
    description: 'Forest dwellers who protect the natural balance',
    values: [
        { name: 'freedom', strength: 0.8 },
        { name: 'tradition', strength: 0.6 }
    ]
});

const mountainFaction = factionManager.createFaction({
    name: 'Mountain Clans',
    description: 'Hardy mountain dwellers who value strength and honor',
    values: [
        { name: 'honor', strength: 0.9 },
        { name: 'loyalty', strength: 0.7 }
    ]
});

const imperialFaction = factionManager.createFaction({
    name: 'Imperial Legion',
    description: 'Organized military force expanding their territory',
    values: [
        { name: 'ambition', strength: 0.8 },
        { name: 'loyalty', strength: 0.6 }
    ]
});

// Set faction relationships
factionManager.setFactionRelationship(woodlandFaction.id, mountainFaction.id, 'ally');
factionManager.setFactionRelationship(woodlandFaction.id, imperialFaction.id, 'enemy');
factionManager.setFactionRelationship(mountainFaction.id, imperialFaction.id, 'rival');

// Create NPCs
const createNPC = (id: string, name: string, factionId: string, emotions: {type: EmotionType, intensity: number}[] = []): NPC => {
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
        emotionalState: {
            activeEmotions: emotions.map(e => ({
                type: e.type,
                intensity: e.intensity,
                sources: ['initial'],
                created: Date.now(),
                lastModified: Date.now()
            }))
        },
        // Add other required properties as needed
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

// Create some NPCs with initial emotional states
const eldrin = createNPC('npc1', 'Eldrin', woodlandFaction.id, [
    { type: EmotionType.JOY, intensity: 0.7 },
    { type: EmotionType.TRUST, intensity: 0.5 }
]);

const thorne = createNPC('npc2', 'Thorne', woodlandFaction.id, [
    { type: EmotionType.ANTICIPATION, intensity: 0.6 }
]);

const grimmir = createNPC('npc3', 'Grimmir', mountainFaction.id, [
    { type: EmotionType.ANGER, intensity: 0.4 },
    { type: EmotionType.TRUST, intensity: 0.3 }
]);

const valeria = createNPC('npc4', 'Valeria', imperialFaction.id, [
    { type: EmotionType.ANTICIPATION, intensity: 0.5 },
    { type: EmotionType.DISGUST, intensity: 0.3 }
]);

// Set up relationships
relationshipTracker.setRelationship('npc1', 'npc2', 0.8, 'CLOSE_FRIEND');
relationshipTracker.setRelationship('npc1', 'npc3', 0.5, 'ALLY');
relationshipTracker.setRelationship('npc1', 'npc4', -0.6, 'ENEMY');
relationshipTracker.setRelationship('npc2', 'npc3', 0.3, 'ACQUAINTANCE');
relationshipTracker.setRelationship('npc3', 'npc4', -0.2, 'RIVAL');

// Create sample behaviors for testing
const createSampleBehaviors = (): Behavior[] => [
    {
        id: 'b1',
        name: 'Attack Enemy',
        category: BehaviorCategory.AGGRESSIVE,
        priority: BehaviorPriority.MEDIUM,
        conditions: [],
        effects: [],
        metadata: {}
    },
    {
        id: 'b2',
        name: 'Trade Goods',
        category: BehaviorCategory.COOPERATIVE,
        priority: BehaviorPriority.LOW,
        conditions: [],
        effects: [],
        metadata: {}
    },
    {
        id: 'b3',
        name: 'Celebrate Victory',
        category: BehaviorCategory.RECREATIONAL,
        priority: BehaviorPriority.LOW,
        conditions: [],
        effects: [],
        metadata: {}
    },
    {
        id: 'b4',
        name: 'Fortify Position',
        category: BehaviorCategory.DEFENSIVE,
        priority: BehaviorPriority.MEDIUM,
        conditions: [],
        effects: [],
        metadata: {}
    },
    {
        id: 'b5',
        name: 'Scout Area',
        category: BehaviorCategory.CURIOUS,
        priority: BehaviorPriority.LOW,
        conditions: [],
        effects: [],
        metadata: {}
    }
];

// Create a sample event
const createAttackEvent = (sourceFactionId: string, targetFactionId: string): GameEvent => ({
    id: 'event1',
    type: EventType.ATTACK,
    description: 'An attack on a settlement',
    timestamp: Date.now(),
    location: { x: 100, y: 100 },
    sourceFactionId,
    targetFactionId,
    involvedNPCs: ['npc1', 'npc4'],
    metadata: {}
});

// Function to display NPC emotional state
const displayEmotionalState = (npc: NPC) => {
    console.log(`${npc.name}'s Emotional State:`);
    if (npc.emotionalState.activeEmotions.length === 0) {
        console.log('  No active emotions');
    } else {
        npc.emotionalState.activeEmotions.forEach(emotion => {
            console.log(`  ${EmotionType[emotion.type]}: ${(emotion.intensity * 100).toFixed(1)}% (sources: ${emotion.sources.join(', ')})`);
        });
    }
};

// Function to display behavior changes
const displayBehaviorChanges = (originalBehaviors: Behavior[], modifiedBehaviors: Behavior[]) => {
    console.log('Behavior Priority Changes:');
    for (let i = 0; i < originalBehaviors.length; i++) {
        const original = originalBehaviors[i];
        const modified = modifiedBehaviors[i];
        console.log(`  ${modified.name}: ${original.priority} → ${modified.priority} ${modified.metadata.emotionallyModified ? '[Emotionally modified]' : ''}`);
    }
};

// EXAMPLE SCENARIOS

async function runExample() {
    logHeader('EMOTIONAL DECISION MODEL EXAMPLE');
    
    // SCENARIO 1: Behavior Modification by Emotion
    logStep('Scenario 1: Behavior Modification by Emotion');
    
    console.log('Analyzing how Eldrin\'s joyful state affects his behavior choices...');
    displayEmotionalState(eldrin);
    
    const eldrinBehaviors = createSampleBehaviors();
    console.log('\nOriginal behavior priorities:');
    eldrinBehaviors.forEach(b => console.log(`  ${b.name}: ${b.priority}`));
    
    const modifiedBehaviors = emotionalDecisionModel.modifyBehaviorsByEmotion(eldrin, eldrinBehaviors);
    
    console.log('\nAfter emotional modification:');
    displayBehaviorChanges(eldrinBehaviors, modifiedBehaviors);
    
    console.log(`\nRisk Tolerance Modifier: ${emotionalDecisionModel.getEmotionalRiskTolerance(eldrin)}`);
    console.log(`Socialization Drive Modifier: ${emotionalDecisionModel.getEmotionalSocializationDrive(eldrin)}`);
    
    // SCENARIO 2: Emotional Contagion
    logStep('Scenario 2: Emotional Contagion between NPCs');
    
    console.log('Before emotional contagion:');
    displayEmotionalState(eldrin);
    displayEmotionalState(thorne);
    
    console.log('\nEldrin and Thorne meet (close friends in same faction)...');
    emotionalDecisionModel.processEmotionalContagion(eldrin, thorne, 1.0);
    
    console.log('\nAfter emotional contagion:');
    displayEmotionalState(eldrin);
    displayEmotionalState(thorne);
    
    // SCENARIO 3: Faction-wide Emotional Response
    logStep('Scenario 3: Faction-wide Emotional Response to Attack');
    
    // Create an attack event
    const attackEvent = createAttackEvent(imperialFaction.id, woodlandFaction.id);
    console.log(`Event: Imperial Legion attacks Woodland Alliance`);
    
    console.log('\nBefore event:');
    displayEmotionalState(eldrin);
    displayEmotionalState(thorne);
    
    // Process faction emotional response
    emotionalDecisionModel.processFactionEmotionalResponse(attackEvent, woodlandFaction.id);
    
    console.log('\nAfter Imperial attack on Woodland Alliance:');
    displayEmotionalState(eldrin);
    displayEmotionalState(thorne);
    
    // SCENARIO 4: Emotional Memory Formation
    logStep('Scenario 4: Emotional Memory Formation');
    
    console.log('Creating emotional memory for Eldrin about the attack...');
    const angerEmotion = eldrin.emotionalState.activeEmotions.find(e => e.type === EmotionType.ANGER);
    if (angerEmotion) {
        emotionalDecisionModel.createEmotionalMemory(eldrin, attackEvent, EmotionType.ANGER, angerEmotion.intensity);
        console.log('Memory created with importance:', angerEmotion.intensity * 1.5);
    } else {
        const fearEmotion = eldrin.emotionalState.activeEmotions.find(e => e.type === EmotionType.FEAR);
        if (fearEmotion) {
            emotionalDecisionModel.createEmotionalMemory(eldrin, attackEvent, EmotionType.FEAR, fearEmotion.intensity);
            console.log('Memory created with importance:', fearEmotion.intensity * 1.5);
        }
    }
    
    // SCENARIO 5: Cross-faction contagion with faction modifiers
    logStep('Scenario 5: Cross-faction Emotional Contagion');
    
    console.log('Before cross-faction contagion:');
    displayEmotionalState(eldrin); // Woodland
    displayEmotionalState(grimmir); // Mountain (ally faction)
    displayEmotionalState(valeria); // Imperial (enemy faction)
    
    console.log('\nEmotional contagion between allied faction members (Eldrin → Grimmir):');
    emotionalDecisionModel.processEmotionalContagion(eldrin, grimmir, 0.8);
    
    console.log('\nEmotional contagion between enemy faction members (Eldrin → Valeria):');
    emotionalDecisionModel.processEmotionalContagion(eldrin, valeria, 0.8);
    
    console.log('\nAfter cross-faction contagion:');
    displayEmotionalState(eldrin);
    displayEmotionalState(grimmir);
    displayEmotionalState(valeria);
    
    // SCENARIO 6: Changed behavior after emotional shifts
    logStep('Scenario 6: Behavior Changes After Emotional Events');
    
    console.log('Analyzing how the attack has changed Eldrin\'s behavior priorities...');
    const newEldrinBehaviors = createSampleBehaviors();
    const newModifiedBehaviors = emotionalDecisionModel.modifyBehaviorsByEmotion(eldrin, newEldrinBehaviors);
    
    displayBehaviorChanges(newEldrinBehaviors, newModifiedBehaviors);
    console.log(`\nNew Risk Tolerance: ${emotionalDecisionModel.getEmotionalRiskTolerance(eldrin)}`);
    console.log(`New Socialization Drive: ${emotionalDecisionModel.getEmotionalSocializationDrive(eldrin)}`);
    
    logHeader('EXAMPLE COMPLETE');
}

// Run the example
runExample().catch(console.error); 