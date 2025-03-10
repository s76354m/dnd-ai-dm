/**
 * Adaptive Learning System
 * 
 * This system enables NPCs and factions to learn from and adapt to past experiences,
 * modifying their behavior patterns based on outcomes and successes/failures.
 * 
 * Key features include:
 * - Behavior pattern modification based on outcomes
 * - Success/failure tracking for different strategies
 * - Faction adaptation to player actions and world events
 * - Dynamic faction goal adjustment based on resources and competition
 * - NPC specialization based on successful activities
 */

import { NPC } from '../../character/npc';
import { Behavior, BehaviorCategory } from './behavior-simulation';
import { FactionManager } from './social/faction-manager';
import { MemoryManager } from '../memory/memory-manager';
import { OutcomeType, BehaviorOutcome } from '../../types/behavior-types';
import { GameEvent, EventType } from '../../world/event-system';
import { FactionGoal, FactionGoalStatus } from '../../types/faction-types';

// Configuration constants
const LEARNING_RATE = 0.1; // Base rate at which behavior preferences adjust
const MEMORY_DECAY_RATE = 0.05; // Rate at which old outcomes matter less
const MIN_OUTCOMES_FOR_ADAPTATION = 3; // Minimum outcomes needed before adaptation
const MAX_OUTCOME_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
const OUTCOME_WEIGHT_DECAY = 0.8; // Weight multiplier per age period
const OUTCOME_AGE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// Behavior success tracking
interface BehaviorSuccess {
    behaviorId: string;
    category: BehaviorCategory;
    successes: number;
    failures: number;
    totalOutcomes: number;
    lastOutcome: OutcomeType;
    lastOutcomeTimestamp: number;
    successRate: number;
    outcomes: BehaviorOutcome[];
}

// NPC specialization tracking
interface NPCSpecialization {
    category: BehaviorCategory;
    proficiency: number; // 0-1 scale
    lastImproved: number;
}

// Faction strategy adaptation
interface FactionStrategy {
    name: string;
    description: string;
    targetGoals: string[]; // IDs of goals this strategy applies to
    behaviorPreferences: {
        [key in BehaviorCategory]?: number; // -1 to 1 modifier for behavior category
    };
    resourceAllocation: {
        [key: string]: number; // Percentage allocation to different resources
    };
    successRate: number;
    timesAttempted: number;
    lastAttempted: number;
    active: boolean;
}

/**
 * Main class that implements adaptive learning for NPCs and factions
 */
export class AdaptiveLearningSystem {
    private factionManager: FactionManager;
    private memoryManager: MemoryManager;
    private npcBehaviorSuccess: Map<string, Map<string, BehaviorSuccess>> = new Map();
    private npcSpecializations: Map<string, NPCSpecialization[]> = new Map();
    private factionStrategies: Map<string, FactionStrategy[]> = new Map();
    private goalAdaptations: Map<string, Map<string, number>> = new Map();
    
    constructor(factionManager: FactionManager, memoryManager: MemoryManager) {
        this.factionManager = factionManager;
        this.memoryManager = memoryManager;
    }
    
    /**
     * Record an outcome for an NPC's behavior
     * @param npc The NPC who performed the behavior
     * @param behavior The behavior performed
     * @param outcome The outcome type (success, failure, mixed)
     * @param details Additional outcome details
     */
    public recordBehaviorOutcome(
        npc: NPC, 
        behavior: Behavior, 
        outcome: OutcomeType, 
        details: string
    ): void {
        // Get or create behavior success tracking for this NPC
        if (!this.npcBehaviorSuccess.has(npc.id)) {
            this.npcBehaviorSuccess.set(npc.id, new Map());
        }
        
        const npcBehaviors = this.npcBehaviorSuccess.get(npc.id);
        
        // Get or create tracking for this specific behavior
        if (!npcBehaviors.has(behavior.id)) {
            npcBehaviors.set(behavior.id, {
                behaviorId: behavior.id,
                category: behavior.category,
                successes: 0,
                failures: 0,
                totalOutcomes: 0,
                lastOutcome: null,
                lastOutcomeTimestamp: 0,
                successRate: 0,
                outcomes: []
            });
        }
        
        const behaviorTracking = npcBehaviors.get(behavior.id);
        
        // Record the outcome
        const timestamp = Date.now();
        
        behaviorTracking.lastOutcome = outcome;
        behaviorTracking.lastOutcomeTimestamp = timestamp;
        behaviorTracking.totalOutcomes++;
        
        // Update success/failure counters
        if (outcome === OutcomeType.SUCCESS) {
            behaviorTracking.successes++;
        } else if (outcome === OutcomeType.FAILURE) {
            behaviorTracking.failures++;
        } else if (outcome === OutcomeType.MIXED) {
            behaviorTracking.successes += 0.5;
            behaviorTracking.failures += 0.5;
        }
        
        // Calculate success rate
        behaviorTracking.successRate = behaviorTracking.successes / behaviorTracking.totalOutcomes;
        
        // Add to outcome history
        behaviorTracking.outcomes.push({
            outcome,
            timestamp,
            details
        });
        
        // Limit outcome history to prevent excessive memory use
        if (behaviorTracking.outcomes.length > 20) {
            behaviorTracking.outcomes.shift();
        }
        
        // Update specializations if this was a successful outcome
        if (outcome === OutcomeType.SUCCESS || outcome === OutcomeType.MIXED) {
            this.updateNPCSpecialization(npc.id, behavior.category);
        }
        
        // If NPC is in a faction, update faction strategy success tracking
        const npcFaction = this.factionManager.getNPCFaction(npc.id);
        if (npcFaction) {
            this.updateFactionStrategySuccess(npcFaction.id, behavior, outcome);
        }
    }
    
    /**
     * Adjust behavior preferences based on past outcomes
     * @param npc The NPC to adjust preferences for
     * @param behaviors List of available behaviors
     * @returns Modified behaviors with adjusted preferences
     */
    public adjustBehaviorsByLearning(npc: NPC, behaviors: Behavior[]): Behavior[] {
        // Clone behaviors to avoid modifying originals
        const adjustedBehaviors = behaviors.map(b => ({ ...b }));
        
        // Skip if no learning data available
        if (!this.npcBehaviorSuccess.has(npc.id)) {
            return adjustedBehaviors;
        }
        
        const npcBehaviors = this.npcBehaviorSuccess.get(npc.id);
        
        // Apply adjustments to each behavior
        adjustedBehaviors.forEach(behavior => {
            let preferenceModifier = 0;
            
            // 1. Apply exact behavior history if available
            if (npcBehaviors.has(behavior.id)) {
                const tracking = npcBehaviors.get(behavior.id);
                if (tracking.totalOutcomes >= MIN_OUTCOMES_FOR_ADAPTATION) {
                    // Calculate time-weighted success rate
                    const weightedSuccessRate = this.calculateTimeWeightedSuccessRate(tracking);
                    
                    // Adjust preference based on success rate (more successful = more preferred)
                    // Scale to -0.4 to +0.4 range
                    preferenceModifier += (weightedSuccessRate - 0.5) * 0.8; 
                }
            }
            
            // 2. Apply category-based learning from similar behaviors
            const categorySuccess = this.calculateCategorySuccessRate(npc.id, behavior.category);
            if (categorySuccess !== null) {
                // Adjust by category success but with less weight than exact behavior
                preferenceModifier += (categorySuccess - 0.5) * 0.4;
            }
            
            // 3. Apply specialization bonuses
            const specialization = this.getSpecialization(npc.id, behavior.category);
            if (specialization) {
                preferenceModifier += specialization.proficiency * 0.3;
            }
            
            // 4. Apply faction strategy preferences if applicable
            const npcFaction = this.factionManager.getNPCFaction(npc.id);
            if (npcFaction) {
                const activeStrategies = this.getActiveFactionStrategies(npcFaction.id);
                for (const strategy of activeStrategies) {
                    if (strategy.behaviorPreferences[behavior.category]) {
                        preferenceModifier += strategy.behaviorPreferences[behavior.category] * 0.2;
                    }
                }
            }
            
            // Apply the total modifier to behavior metadata
            behavior.metadata = behavior.metadata || {};
            behavior.metadata.learningPreference = preferenceModifier;
            
            // Boost or reduce priority based on learning
            // This is intentionally subtle to avoid overriding other systems
            behavior.metadata.adaptiveReasoning = this.generateAdaptiveReasoning(npc.id, behavior);
        });
        
        return adjustedBehaviors;
    }
    
    /**
     * Process faction adaptation to a major event
     * @param event The event to adapt to
     */
    public processFactionAdaptation(event: GameEvent): void {
        // Determine which factions need to adapt
        const affectedFactionIds: string[] = [];
        
        // Add directly affected factions
        if (event.sourceFactionId) affectedFactionIds.push(event.sourceFactionId);
        if (event.targetFactionId) affectedFactionIds.push(event.targetFactionId);
        
        // Process adaptations for each affected faction
        affectedFactionIds.forEach(factionId => {
            const faction = this.factionManager.getFaction(factionId);
            if (!faction) return;
            
            // 1. Adjust goals based on event
            this.adjustFactionGoals(faction, event);
            
            // 2. Adjust strategies based on event
            this.adjustFactionStrategies(faction, event);
            
            // 3. Create new strategies if needed
            if (this.shouldCreateNewStrategy(faction, event)) {
                this.createFactionStrategy(faction, event);
            }
        });
    }
    
    /**
     * Generate strategy recommendations for a faction based on learning
     * @param factionId The faction ID
     * @returns Array of strategy recommendations
     */
    public generateStrategyRecommendations(factionId: string): string[] {
        const recommendations: string[] = [];
        const faction = this.factionManager.getFaction(factionId);
        if (!faction) return recommendations;
        
        // 1. Check if current strategies are working
        const activeStrategies = this.getActiveFactionStrategies(factionId);
        const activeStrategySuccessRates = activeStrategies.map(s => s.successRate);
        const averageActiveSuccessRate = activeStrategySuccessRates.length > 0 
            ? activeStrategySuccessRates.reduce((sum, rate) => sum + rate, 0) / activeStrategySuccessRates.length
            : 0;
        
        if (averageActiveSuccessRate < 0.4) {
            recommendations.push(`Current strategies are underperforming (${(averageActiveSuccessRate * 100).toFixed(1)}% success rate). Consider trying alternative approaches.`);
        }
        
        // 2. Check if there are better strategies
        const inactiveStrategies = this.getInactiveFactionStrategies(factionId);
        const betterStrategies = inactiveStrategies.filter(s => s.successRate > averageActiveSuccessRate + 0.1);
        
        if (betterStrategies.length > 0) {
            betterStrategies.forEach(strategy => {
                recommendations.push(`Strategy "${strategy.name}" has historically performed better (${(strategy.successRate * 100).toFixed(1)}% success rate). Consider activating it.`);
            });
        }
        
        // 3. Check resource allocation
        const resourceImbalances = this.checkResourceAllocationImbalances(faction);
        recommendations.push(...resourceImbalances);
        
        // 4. Check goal feasibility
        const goalFeasibility = this.checkGoalFeasibility(faction);
        recommendations.push(...goalFeasibility);
        
        return recommendations;
    }
    
    /**
     * Generate an after-action report for an NPC based on their learning
     * @param npcId The NPC ID
     * @returns Report string
     */
    public generateNPCLearningReport(npcId: string): string {
        if (!this.npcBehaviorSuccess.has(npcId)) {
            return "No learning data available for this NPC.";
        }
        
        const behaviors = this.npcBehaviorSuccess.get(npcId);
        const specializations = this.getSpecializations(npcId);
        
        let report = "ADAPTIVE LEARNING REPORT\n";
        report += "=====================\n\n";
        
        // Add specializations
        report += "Specializations:\n";
        if (specializations.length === 0) {
            report += "- No specializations developed yet\n";
        } else {
            specializations.sort((a, b) => b.proficiency - a.proficiency);
            specializations.forEach(spec => {
                report += `- ${spec.category}: ${(spec.proficiency * 100).toFixed(1)}% proficiency\n`;
            });
        }
        
        // Add behavior success rates
        report += "\nBehavior Performance:\n";
        const behaviorArray = Array.from(behaviors.values());
        if (behaviorArray.length === 0) {
            report += "- No behavior data recorded yet\n";
        } else {
            behaviorArray.sort((a, b) => b.successRate - a.successRate);
            behaviorArray.slice(0, 5).forEach(behavior => {
                report += `- ${behavior.behaviorId}: ${(behavior.successRate * 100).toFixed(1)}% success rate (${behavior.totalOutcomes} attempts)\n`;
            });
        }
        
        // Add learning insights
        report += "\nLearning Insights:\n";
        
        const topCategory = this.getTopPerformingCategory(npcId);
        if (topCategory) {
            report += `- Most successful in ${topCategory.category} actions (${(topCategory.successRate * 100).toFixed(1)}% success rate)\n`;
        }
        
        const worstCategory = this.getWorstPerformingCategory(npcId);
        if (worstCategory && worstCategory.totalOutcomes >= MIN_OUTCOMES_FOR_ADAPTATION) {
            report += `- Struggles with ${worstCategory.category} actions (${(worstCategory.successRate * 100).toFixed(1)}% success rate)\n`;
        }
        
        // Add adaptive recommendations
        report += "\nRecommendations:\n";
        const recommendations = this.generateNPCRecommendations(npcId);
        if (recommendations.length === 0) {
            report += "- Insufficient data for recommendations\n";
        } else {
            recommendations.forEach(rec => {
                report += `- ${rec}\n`;
            });
        }
        
        return report;
    }
    
    // SPECIALIZED METHODS
    
    /**
     * Check if a faction should adapt a goal based on an event
     * @param factionId The faction ID
     * @param goalId The goal ID
     * @param event The event
     * @returns Whether the goal should be adapted
     */
    public shouldAdaptGoal(factionId: string, goalId: string, event: GameEvent): boolean {
        const faction = this.factionManager.getFaction(factionId);
        if (!faction) return false;
        
        const goal = faction.goals.find(g => g.id === goalId);
        if (!goal) return false;
        
        // Check if this event is relevant to the goal
        if (event.type === EventType.RESOURCE_LOSS && goal.resourceRequirements) {
            return true;
        }
        
        if (event.type === EventType.ALLIANCE_FORMED && goal.type === 'diplomatic') {
            return true;
        }
        
        if (event.type === EventType.ATTACK && goal.type === 'territorial') {
            return true;
        }
        
        if (event.type === EventType.MEMBER_DEATH && goal.type === 'protection') {
            return true;
        }
        
        // Check if goal has been consistently failing
        if (this.getGoalAdaptationPressure(factionId, goalId) > 0.7) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Reset learning data for an NPC (for testing or special events)
     * @param npcId The NPC ID to reset
     */
    public resetNPCLearning(npcId: string): void {
        this.npcBehaviorSuccess.delete(npcId);
        this.npcSpecializations.delete(npcId);
    }
    
    // HELPER METHODS
    
    /**
     * Update an NPC's specialization in a behavior category
     * @param npcId The NPC ID
     * @param category The behavior category
     */
    private updateNPCSpecialization(npcId: string, category: BehaviorCategory): void {
        if (!this.npcSpecializations.has(npcId)) {
            this.npcSpecializations.set(npcId, []);
        }
        
        const specializations = this.npcSpecializations.get(npcId);
        let specialization = specializations.find(s => s.category === category);
        
        if (!specialization) {
            specialization = {
                category,
                proficiency: 0.1,
                lastImproved: Date.now()
            };
            specializations.push(specialization);
        } else {
            // Increase proficiency with diminishing returns
            const currentProficiency = specialization.proficiency;
            const improvementRate = Math.max(0.005, 0.05 * (1 - currentProficiency));
            specialization.proficiency = Math.min(1.0, currentProficiency + improvementRate);
            specialization.lastImproved = Date.now();
        }
    }
    
    /**
     * Calculate time-weighted success rate for a behavior
     * @param tracking The behavior success tracking
     * @returns Weighted success rate
     */
    private calculateTimeWeightedSuccessRate(tracking: BehaviorSuccess): number {
        const now = Date.now();
        let weightedSuccesses = 0;
        let weightedTotal = 0;
        
        for (const outcomeRecord of tracking.outcomes) {
            const ageMs = now - outcomeRecord.timestamp;
            
            // Skip very old outcomes
            if (ageMs > MAX_OUTCOME_AGE_MS) continue;
            
            // Calculate weight based on age
            const agePeriods = Math.floor(ageMs / OUTCOME_AGE_PERIOD_MS);
            const weight = Math.pow(OUTCOME_WEIGHT_DECAY, agePeriods);
            
            // Add weighted outcome
            if (outcomeRecord.outcome === OutcomeType.SUCCESS) {
                weightedSuccesses += weight;
                weightedTotal += weight;
            } else if (outcomeRecord.outcome === OutcomeType.FAILURE) {
                weightedTotal += weight;
            } else if (outcomeRecord.outcome === OutcomeType.MIXED) {
                weightedSuccesses += weight * 0.5;
                weightedTotal += weight;
            }
        }
        
        if (weightedTotal === 0) return 0.5; // Default to neutral if no data
        return weightedSuccesses / weightedTotal;
    }
    
    /**
     * Calculate overall success rate for a behavior category
     * @param npcId The NPC ID
     * @param category The behavior category
     * @returns Success rate or null if insufficient data
     */
    private calculateCategorySuccessRate(npcId: string, category: BehaviorCategory): number | null {
        if (!this.npcBehaviorSuccess.has(npcId)) return null;
        
        const behaviors = this.npcBehaviorSuccess.get(npcId);
        const categoryBehaviors = Array.from(behaviors.values())
            .filter(b => b.category === category);
        
        if (categoryBehaviors.length === 0) return null;
        
        const totalOutcomes = categoryBehaviors.reduce((sum, b) => sum + b.totalOutcomes, 0);
        if (totalOutcomes < MIN_OUTCOMES_FOR_ADAPTATION) return null;
        
        const totalSuccesses = categoryBehaviors.reduce((sum, b) => sum + b.successes, 0);
        return totalSuccesses / totalOutcomes;
    }
    
    /**
     * Get an NPC's specialization in a category
     * @param npcId The NPC ID
     * @param category The behavior category
     * @returns Specialization or undefined
     */
    private getSpecialization(npcId: string, category: BehaviorCategory): NPCSpecialization | undefined {
        if (!this.npcSpecializations.has(npcId)) return undefined;
        return this.npcSpecializations.get(npcId).find(s => s.category === category);
    }
    
    /**
     * Get all specializations for an NPC
     * @param npcId The NPC ID
     * @returns Array of specializations
     */
    private getSpecializations(npcId: string): NPCSpecialization[] {
        if (!this.npcSpecializations.has(npcId)) return [];
        return [...this.npcSpecializations.get(npcId)];
    }
    
    /**
     * Update faction strategy success tracking
     * @param factionId The faction ID
     * @param behavior The behavior
     * @param outcome The outcome
     */
    private updateFactionStrategySuccess(
        factionId: string, 
        behavior: Behavior, 
        outcome: OutcomeType
    ): void {
        if (!this.factionStrategies.has(factionId)) return;
        
        const strategies = this.factionStrategies.get(factionId);
        const activeStrategies = strategies.filter(s => s.active);
        
        // Update success rates for active strategies
        activeStrategies.forEach(strategy => {
            strategy.timesAttempted++;
            strategy.lastAttempted = Date.now();
            
            // Only count behaviors that align with the strategy
            if (strategy.behaviorPreferences[behavior.category] > 0) {
                // Update success rate with exponential moving average
                const alpha = 0.1; // Weight for new data
                if (outcome === OutcomeType.SUCCESS) {
                    strategy.successRate = (1 - alpha) * strategy.successRate + alpha * 1.0;
                } else if (outcome === OutcomeType.FAILURE) {
                    strategy.successRate = (1 - alpha) * strategy.successRate + alpha * 0.0;
                } else if (outcome === OutcomeType.MIXED) {
                    strategy.successRate = (1 - alpha) * strategy.successRate + alpha * 0.5;
                }
            }
        });
    }
    
    /**
     * Get active strategies for a faction
     * @param factionId The faction ID
     * @returns Array of active strategies
     */
    private getActiveFactionStrategies(factionId: string): FactionStrategy[] {
        if (!this.factionStrategies.has(factionId)) return [];
        return this.factionStrategies.get(factionId).filter(s => s.active);
    }
    
    /**
     * Get inactive strategies for a faction
     * @param factionId The faction ID
     * @returns Array of inactive strategies
     */
    private getInactiveFactionStrategies(factionId: string): FactionStrategy[] {
        if (!this.factionStrategies.has(factionId)) return [];
        return this.factionStrategies.get(factionId).filter(s => !s.active);
    }
    
    /**
     * Adjust faction goals based on an event
     * @param faction The faction
     * @param event The event
     */
    private adjustFactionGoals(faction: any, event: GameEvent): void {
        faction.goals.forEach((goal: FactionGoal) => {
            // Skip completed goals
            if (goal.status === FactionGoalStatus.COMPLETED) return;
            
            // Record adaptation pressure
            this.recordGoalAdaptationPressure(faction.id, goal.id, event);
            
            // Check if adaptation threshold reached
            if (this.shouldAdaptGoal(faction.id, goal.id, event)) {
                // Modify goal based on event and past performance
                this.modifyFactionGoal(faction, goal, event);
            }
        });
    }
    
    /**
     * Record adaptation pressure for a goal
     * @param factionId The faction ID
     * @param goalId The goal ID
     * @param event The event
     */
    private recordGoalAdaptationPressure(factionId: string, goalId: string, event: GameEvent): void {
        if (!this.goalAdaptations.has(factionId)) {
            this.goalAdaptations.set(factionId, new Map());
        }
        
        const factionGoals = this.goalAdaptations.get(factionId);
        
        // Initialize if needed
        if (!factionGoals.has(goalId)) {
            factionGoals.set(goalId, 0);
        }
        
        let currentPressure = factionGoals.get(goalId);
        
        // Adjust pressure based on event
        const faction = this.factionManager.getFaction(factionId);
        const goal = faction.goals.find((g: FactionGoal) => g.id === goalId);
        
        if (!goal) return;
        
        // Resource loss events increase pressure on resource-dependent goals
        if (event.type === EventType.RESOURCE_LOSS && event.targetFactionId === factionId && goal.resourceRequirements) {
            currentPressure += 0.2;
        }
        
        // Attacks increase pressure on territorial goals
        if (event.type === EventType.ATTACK && goal.type === 'territorial') {
            if (event.targetFactionId === factionId) {
                currentPressure += 0.25; // Being attacked
            } else if (event.sourceFactionId === factionId) {
                // If attack was successful, reduce pressure; if failed, increase it
                // Would need outcome information here
                currentPressure += 0.1; // Placeholder
            }
        }
        
        // Member deaths increase pressure on protection goals
        if (event.type === EventType.MEMBER_DEATH && event.targetFactionId === factionId && goal.type === 'protection') {
            currentPressure += 0.3;
        }
        
        // Cap pressure between 0 and 1
        currentPressure = Math.max(0, Math.min(1, currentPressure));
        
        // Update pressure
        factionGoals.set(goalId, currentPressure);
    }
    
    /**
     * Get the adaptation pressure for a goal
     * @param factionId The faction ID
     * @param goalId The goal ID
     * @returns Adaptation pressure (0-1)
     */
    private getGoalAdaptationPressure(factionId: string, goalId: string): number {
        if (!this.goalAdaptations.has(factionId)) return 0;
        
        const factionGoals = this.goalAdaptations.get(factionId);
        if (!factionGoals.has(goalId)) return 0;
        
        return factionGoals.get(goalId);
    }
    
    /**
     * Modify a faction goal based on events and performance
     * @param faction The faction
     * @param goal The goal to modify
     * @param event The triggering event
     */
    private modifyFactionGoal(faction: any, goal: FactionGoal, event: GameEvent): void {
        // This is a placeholder - actual implementation would be more complex
        // and would modify the goal based on the specific event and faction values
        
        // For now, we'll reset the adaptation pressure after adaptation
        if (!this.goalAdaptations.has(faction.id)) return;
        
        const factionGoals = this.goalAdaptations.get(faction.id);
        if (factionGoals.has(goal.id)) {
            factionGoals.set(goal.id, 0);
        }
    }
    
    /**
     * Adjust faction strategies based on an event
     * @param faction The faction
     * @param event The event
     */
    private adjustFactionStrategies(faction: any, event: GameEvent): void {
        // Placeholder for strategy adjustment logic
        // This would modify existing strategies based on event outcomes
    }
    
    /**
     * Determine if a new strategy should be created
     * @param faction The faction
     * @param event The event
     * @returns Whether a new strategy should be created
     */
    private shouldCreateNewStrategy(faction: any, event: GameEvent): boolean {
        // Placeholder logic for determining when to create new strategies
        return false;
    }
    
    /**
     * Create a new faction strategy
     * @param faction The faction
     * @param event The event
     */
    private createFactionStrategy(faction: any, event: GameEvent): void {
        // Placeholder for strategy creation logic
    }
    
    /**
     * Check for resource allocation imbalances
     * @param faction The faction
     * @returns Array of recommendation strings
     */
    private checkResourceAllocationImbalances(faction: any): string[] {
        // Placeholder for resource allocation checks
        return [];
    }
    
    /**
     * Check goal feasibility
     * @param faction The faction
     * @returns Array of recommendation strings
     */
    private checkGoalFeasibility(faction: any): string[] {
        // Placeholder for goal feasibility checks
        return [];
    }
    
    /**
     * Generate adaptive reasoning for a behavior
     * @param npcId The NPC ID
     * @param behavior The behavior
     * @returns Reasoning string
     */
    private generateAdaptiveReasoning(npcId: string, behavior: Behavior): string {
        if (!this.npcBehaviorSuccess.has(npcId)) {
            return "No prior experience with this action.";
        }
        
        const npcBehaviors = this.npcBehaviorSuccess.get(npcId);
        
        // Check specific behavior history
        if (npcBehaviors.has(behavior.id)) {
            const tracking = npcBehaviors.get(behavior.id);
            if (tracking.totalOutcomes >= MIN_OUTCOMES_FOR_ADAPTATION) {
                const successRate = tracking.successRate;
                if (successRate > 0.7) {
                    return `Has had great success with this approach (${(successRate * 100).toFixed(0)}% success rate).`;
                } else if (successRate > 0.5) {
                    return `Has moderate success with this approach (${(successRate * 100).toFixed(0)}% success rate).`;
                } else if (successRate < 0.3) {
                    return `Has struggled with this approach in the past (only ${(successRate * 100).toFixed(0)}% success rate).`;
                }
            }
        }
        
        // Check category success
        const categorySuccess = this.calculateCategorySuccessRate(npcId, behavior.category);
        if (categorySuccess !== null) {
            if (categorySuccess > 0.7) {
                return `Excels at ${behavior.category} actions (${(categorySuccess * 100).toFixed(0)}% success rate).`;
            } else if (categorySuccess < 0.3) {
                return `Generally struggles with ${behavior.category} actions (${(categorySuccess * 100).toFixed(0)}% success rate).`;
            }
        }
        
        // Check specialization
        const specialization = this.getSpecialization(npcId, behavior.category);
        if (specialization && specialization.proficiency > 0.5) {
            return `Has developed significant skill in ${behavior.category} activities (${(specialization.proficiency * 100).toFixed(0)}% proficiency).`;
        }
        
        return "Has insufficient experience to evaluate this action.";
    }
    
    /**
     * Get the top performing behavior category for an NPC
     * @param npcId The NPC ID
     * @returns Top category info or null
     */
    private getTopPerformingCategory(npcId: string): { category: BehaviorCategory, successRate: number } | null {
        if (!this.npcBehaviorSuccess.has(npcId)) return null;
        
        const behaviors = this.npcBehaviorSuccess.get(npcId);
        const behaviorArray = Array.from(behaviors.values());
        
        // Group by category
        const categoryStats: Map<BehaviorCategory, { successes: number, totalOutcomes: number }> = new Map();
        
        behaviorArray.forEach(behavior => {
            if (!categoryStats.has(behavior.category)) {
                categoryStats.set(behavior.category, { successes: 0, totalOutcomes: 0 });
            }
            
            const stats = categoryStats.get(behavior.category);
            stats.successes += behavior.successes;
            stats.totalOutcomes += behavior.totalOutcomes;
        });
        
        // Find top category
        let topCategory: BehaviorCategory | null = null;
        let topSuccessRate = 0;
        let minOutcomes = MIN_OUTCOMES_FOR_ADAPTATION;
        
        categoryStats.forEach((stats, category) => {
            if (stats.totalOutcomes >= minOutcomes) {
                const successRate = stats.successes / stats.totalOutcomes;
                if (successRate > topSuccessRate) {
                    topSuccessRate = successRate;
                    topCategory = category;
                }
            }
        });
        
        if (topCategory === null) return null;
        
        return {
            category: topCategory,
            successRate: topSuccessRate
        };
    }
    
    /**
     * Get the worst performing behavior category for an NPC
     * @param npcId The NPC ID
     * @returns Worst category info or null
     */
    private getWorstPerformingCategory(npcId: string): { category: BehaviorCategory, successRate: number, totalOutcomes: number } | null {
        if (!this.npcBehaviorSuccess.has(npcId)) return null;
        
        const behaviors = this.npcBehaviorSuccess.get(npcId);
        const behaviorArray = Array.from(behaviors.values());
        
        // Group by category
        const categoryStats: Map<BehaviorCategory, { successes: number, totalOutcomes: number }> = new Map();
        
        behaviorArray.forEach(behavior => {
            if (!categoryStats.has(behavior.category)) {
                categoryStats.set(behavior.category, { successes: 0, totalOutcomes: 0 });
            }
            
            const stats = categoryStats.get(behavior.category);
            stats.successes += behavior.successes;
            stats.totalOutcomes += behavior.totalOutcomes;
        });
        
        // Find worst category
        let worstCategory: BehaviorCategory | null = null;
        let worstSuccessRate = 1;
        let worstOutcomes = 0;
        let minOutcomes = MIN_OUTCOMES_FOR_ADAPTATION;
        
        categoryStats.forEach((stats, category) => {
            if (stats.totalOutcomes >= minOutcomes) {
                const successRate = stats.successes / stats.totalOutcomes;
                if (successRate < worstSuccessRate) {
                    worstSuccessRate = successRate;
                    worstCategory = category;
                    worstOutcomes = stats.totalOutcomes;
                }
            }
        });
        
        if (worstCategory === null) return null;
        
        return {
            category: worstCategory,
            successRate: worstSuccessRate,
            totalOutcomes: worstOutcomes
        };
    }
    
    /**
     * Generate recommendations for an NPC based on learning
     * @param npcId The NPC ID
     * @returns Array of recommendation strings
     */
    private generateNPCRecommendations(npcId: string): string[] {
        const recommendations: string[] = [];
        
        // 1. Recommend leveraging strengths
        const topCategory = this.getTopPerformingCategory(npcId);
        if (topCategory && topCategory.successRate > 0.7) {
            recommendations.push(`Continue favoring ${topCategory.category} actions where you excel.`);
        }
        
        // 2. Recommend addressing weaknesses
        const worstCategory = this.getWorstPerformingCategory(npcId);
        if (worstCategory && worstCategory.successRate < 0.3 && worstCategory.totalOutcomes >= MIN_OUTCOMES_FOR_ADAPTATION) {
            recommendations.push(`Consider training or assistance with ${worstCategory.category} actions where you struggle.`);
        }
        
        // 3. Recommend based on specializations
        const specializations = this.getSpecializations(npcId);
        const highProficiency = specializations.filter(s => s.proficiency > 0.7);
        
        if (highProficiency.length > 0) {
            recommendations.push(`Leverage your specialized skills in ${highProficiency.map(s => s.category).join(', ')}.`);
        }
        
        // 4. Recommend faction alignment
        const npcFaction = this.factionManager.getNPCFaction(npcId);
        if (npcFaction) {
            recommendations.push(`Align your actions with your faction's current active strategies.`);
        }
        
        return recommendations;
    }
} 