import { v4 as uuidv4 } from 'uuid';
import { FactionManager } from './faction-manager';
import { FactionDispute, FactionRelationship, FactionTreaty } from './faction-types';

/**
 * Type definitions for diplomatic interactions
 */

export type DiplomaticActionType = 
  | 'propose_treaty'
  | 'break_treaty'
  | 'declare_war'
  | 'sue_for_peace'
  | 'form_alliance'
  | 'break_alliance'
  | 'trade_agreement'
  | 'demand_tribute'
  | 'give_gift'
  | 'insult'
  | 'praise'
  | 'threaten'
  | 'diplomatic_mission';

export interface DiplomaticAction {
  id: string;
  type: DiplomaticActionType;
  sourceFactionId: string;
  targetFactionId: string;
  description: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'executed';
  expiresAt?: number;
  terms?: Record<string, any>;
  response?: {
    message: string;
    timestamp: number;
  };
}

/**
 * Types of diplomatic messages that can be sent
 */
export type DiplomaticMessageType =
  | 'greeting'
  | 'demand'
  | 'request'
  | 'warning'
  | 'threat'
  | 'apology'
  | 'praise'
  | 'insult'
  | 'offer'
  | 'refusal'
  | 'acceptance';

export interface DiplomaticMessage {
  id: string;
  type: DiplomaticMessageType;
  sourceFactionId: string;
  targetFactionId: string;
  content: string;
  timestamp: number;
  requiresResponse: boolean;
  responded: boolean;
  relatedActionId?: string;
}

/**
 * Manages diplomatic interactions between factions
 */
export class FactionDiplomacySystem {
  private actions: Map<string, DiplomaticAction> = new Map();
  private messages: Map<string, DiplomaticMessage> = new Map();
  private factionManager: FactionManager;
  
  constructor(factionManager: FactionManager) {
    this.factionManager = factionManager;
  }
  
  /**
   * Creates a new diplomatic action between factions
   */
  public createDiplomaticAction(
    type: DiplomaticActionType,
    sourceFactionId: string,
    targetFactionId: string,
    description: string,
    terms?: Record<string, any>,
    expiresAt?: number
  ): DiplomaticAction {
    const id = uuidv4();
    
    const action: DiplomaticAction = {
      id,
      type,
      sourceFactionId,
      targetFactionId,
      description,
      timestamp: Date.now(),
      status: 'pending',
      expiresAt,
      terms
    };
    
    this.actions.set(id, action);
    return action;
  }
  
  /**
   * Sends a diplomatic message between factions
   */
  public sendDiplomaticMessage(
    type: DiplomaticMessageType,
    sourceFactionId: string,
    targetFactionId: string,
    content: string,
    requiresResponse: boolean = false,
    relatedActionId?: string
  ): DiplomaticMessage {
    const id = uuidv4();
    
    const message: DiplomaticMessage = {
      id,
      type,
      sourceFactionId,
      targetFactionId,
      content,
      timestamp: Date.now(),
      requiresResponse,
      responded: false,
      relatedActionId
    };
    
    this.messages.set(id, message);
    return message;
  }
  
  /**
   * Gets a diplomatic action by ID
   */
  public getDiplomaticAction(id: string): DiplomaticAction | undefined {
    return this.actions.get(id);
  }
  
  /**
   * Gets a diplomatic message by ID
   */
  public getDiplomaticMessage(id: string): DiplomaticMessage | undefined {
    return this.messages.get(id);
  }
  
  /**
   * Gets all diplomatic actions between two factions
   */
  public getActionsBetweenFactions(faction1Id: string, faction2Id: string): DiplomaticAction[] {
    return Array.from(this.actions.values())
      .filter(action => 
        (action.sourceFactionId === faction1Id && action.targetFactionId === faction2Id) ||
        (action.sourceFactionId === faction2Id && action.targetFactionId === faction1Id)
      );
  }
  
  /**
   * Gets all diplomatic messages between two factions
   */
  public getMessagesBetweenFactions(faction1Id: string, faction2Id: string): DiplomaticMessage[] {
    return Array.from(this.messages.values())
      .filter(message => 
        (message.sourceFactionId === faction1Id && message.targetFactionId === faction2Id) ||
        (message.sourceFactionId === faction2Id && message.targetFactionId === faction1Id)
      );
  }
  
  /**
   * Gets all pending diplomatic actions for a faction
   */
  public getPendingActionsForFaction(factionId: string): DiplomaticAction[] {
    return Array.from(this.actions.values())
      .filter(action => 
        action.targetFactionId === factionId && 
        action.status === 'pending'
      );
  }
  
  /**
   * Gets all unanswered messages for a faction
   */
  public getUnansweredMessagesForFaction(factionId: string): DiplomaticMessage[] {
    return Array.from(this.messages.values())
      .filter(message => 
        message.targetFactionId === factionId && 
        message.requiresResponse && 
        !message.responded
      );
  }
  
  /**
   * Accepts a diplomatic action
   */
  public acceptDiplomaticAction(actionId: string, responseMessage?: string): boolean {
    const action = this.actions.get(actionId);
    if (!action || action.status !== 'pending') {
      return false;
    }
    
    action.status = 'accepted';
    
    if (responseMessage) {
      action.response = {
        message: responseMessage,
        timestamp: Date.now()
      };
    }
    
    this.actions.set(actionId, action);
    
    // Execute the diplomatic action based on its type
    this.executeDiplomaticAction(action);
    
    return true;
  }
  
  /**
   * Rejects a diplomatic action
   */
  public rejectDiplomaticAction(actionId: string, responseMessage?: string): boolean {
    const action = this.actions.get(actionId);
    if (!action || action.status !== 'pending') {
      return false;
    }
    
    action.status = 'rejected';
    
    if (responseMessage) {
      action.response = {
        message: responseMessage,
        timestamp: Date.now()
      };
    }
    
    this.actions.set(actionId, action);
    
    // Apply relationship penalties for rejection if applicable
    this.applyRejectionConsequences(action);
    
    return true;
  }
  
  /**
   * Responds to a diplomatic message
   */
  public respondToMessage(
    messageId: string, 
    responseType: DiplomaticMessageType,
    content: string
  ): DiplomaticMessage | undefined {
    const message = this.messages.get(messageId);
    if (!message || !message.requiresResponse || message.responded) {
      return undefined;
    }
    
    // Mark original message as responded
    message.responded = true;
    this.messages.set(messageId, message);
    
    // Create response message
    return this.sendDiplomaticMessage(
      responseType,
      message.targetFactionId,
      message.sourceFactionId,
      content,
      false,
      message.relatedActionId
    );
  }
  
  /**
   * Executes an accepted diplomatic action
   */
  private executeDiplomaticAction(action: DiplomaticAction): void {
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    // Apply relationship changes and execute action effects
    switch (action.type) {
      case 'propose_treaty':
        this.executeTreatyProposal(action);
        break;
        
      case 'break_treaty':
        this.executeTreatyBreaking(action);
        break;
        
      case 'declare_war':
        this.executeWarDeclaration(action);
        break;
        
      case 'sue_for_peace':
        this.executePeaceOffer(action);
        break;
        
      case 'form_alliance':
        this.executeAllianceFormation(action);
        break;
        
      case 'break_alliance':
        this.executeAllianceBreaking(action);
        break;
        
      case 'trade_agreement':
        this.executeTradeAgreement(action);
        break;
        
      case 'demand_tribute':
        this.executeTributeDemand(action);
        break;
        
      case 'give_gift':
        this.executeGiftGiving(action);
        break;
        
      case 'insult':
        this.executeInsult(action);
        break;
        
      case 'praise':
        this.executePraise(action);
        break;
        
      case 'threaten':
        this.executeThreat(action);
        break;
        
      case 'diplomatic_mission':
        this.executeDiplomaticMission(action);
        break;
    }
    
    // Mark as executed after processing
    action.status = 'executed';
    this.actions.set(action.id, action);
  }
  
  /**
   * Applies consequences for rejecting a diplomatic action
   */
  private applyRejectionConsequences(action: DiplomaticAction): void {
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    let attitudeChange = 0;
    
    // Determine attitude change based on action type
    switch (action.type) {
      case 'propose_treaty':
      case 'trade_agreement':
        attitudeChange = -5;
        break;
        
      case 'form_alliance':
        attitudeChange = -10;
        break;
        
      case 'sue_for_peace':
        attitudeChange = -15;
        break;
        
      case 'demand_tribute':
        attitudeChange = -2; // Minor penalty for rejecting demands
        break;
        
      case 'threaten':
        attitudeChange = -20; // Major penalty for ignoring threats
        break;
        
      default:
        attitudeChange = -3;
    }
    
    // Apply the attitude change
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (relationship) {
      this.factionManager.updateRelationship(
        sourceId,
        targetId,
        { attitude: relationship.attitude + attitudeChange },
        `Rejected diplomatic action: ${action.type}`
      );
    }
  }
  
  /**
   * Executes a treaty proposal
   */
  private executeTreatyProposal(action: DiplomaticAction): void {
    if (!action.terms || !action.terms.treatyType) return;
    
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (!relationship) return;
    
    // Create the treaty
    const treaty: FactionTreaty = {
      id: uuidv4(),
      type: action.terms.treatyType,
      title: action.terms.title || `Treaty of ${action.terms.treatyType}`,
      description: action.terms.description || `Treaty between factions`,
      terms: action.terms.terms || '',
      startDate: Date.now(),
      endDate: action.terms.endDate,
      active: true
    };
    
    // Add treaty to relationship
    relationship.treaties.push(treaty);
    
    // Update relationship attitude
    const attitudeChange = 10; // Treaty formation improves relations
    
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { 
        attitude: relationship.attitude + attitudeChange,
        treaties: relationship.treaties
      },
      `Treaty established: ${treaty.title}`
    );
  }
  
  /**
   * Executes breaking a treaty
   */
  private executeTreatyBreaking(action: DiplomaticAction): void {
    if (!action.terms || !action.terms.treatyId) return;
    
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (!relationship) return;
    
    // Find the treaty
    const treatyIndex = relationship.treaties.findIndex(t => t.id === action.terms?.treatyId);
    if (treatyIndex === -1) return;
    
    // Deactivate the treaty
    relationship.treaties[treatyIndex].active = false;
    relationship.treaties[treatyIndex].endDate = Date.now();
    
    // Update relationship attitude
    const attitudeChange = -15; // Breaking treaties harms relations
    
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { 
        attitude: relationship.attitude + attitudeChange,
        treaties: relationship.treaties
      },
      `Treaty broken: ${relationship.treaties[treatyIndex].title}`
    );
    
    // Possibly create a dispute
    const dispute: FactionDispute = {
      id: uuidv4(),
      type: 'historical',
      title: 'Treaty Violation',
      description: `Broken treaty: ${relationship.treaties[treatyIndex].title}`,
      severity: 5,
      startDate: Date.now(),
      resolved: false
    };
    
    relationship.disputes.push(dispute);
    
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { disputes: relationship.disputes },
      `Dispute created over broken treaty`
    );
  }
  
  /**
   * Executes a war declaration
   */
  private executeWarDeclaration(action: DiplomaticAction): void {
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (!relationship) return;
    
    // Set relationship to hostile
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { 
        attitude: -80, // War means extremely negative relations
        status: 'hostile'
      },
      `War declared by ${sourceId} against ${targetId}`
    );
    
    // Create a dispute
    const dispute: FactionDispute = {
      id: uuidv4(),
      type: 'historical',
      title: 'State of War',
      description: action.description || 'Open conflict between factions',
      severity: 10, // Maximum severity
      startDate: Date.now(),
      resolved: false
    };
    
    relationship.disputes.push(dispute);
    
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { disputes: relationship.disputes },
      `War dispute created`
    );
    
    // Deactivate any peace treaties
    relationship.treaties
      .filter(t => t.active && (t.type === 'peace' || t.type === 'non_aggression'))
      .forEach(t => {
        t.active = false;
        t.endDate = Date.now();
      });
    
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { treaties: relationship.treaties },
      `Peace treaties invalidated due to war`
    );
  }
  
  /**
   * Executes a peace offer
   */
  private executePeaceOffer(action: DiplomaticAction): void {
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (!relationship) return;
    
    // Create peace treaty
    const treaty: FactionTreaty = {
      id: uuidv4(),
      type: 'peace',
      title: action.terms?.title || 'Peace Agreement',
      description: action.terms?.description || 'Cessation of hostilities between factions',
      terms: action.terms?.terms || 'Both sides agree to cease all hostile actions',
      startDate: Date.now(),
      endDate: action.terms?.endDate,
      active: true
    };
    
    relationship.treaties.push(treaty);
    
    // Update relationship
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { 
        attitude: Math.max(-30, relationship.attitude + 30), // Improve but may still be negative
        status: 'neutral',
        treaties: relationship.treaties
      },
      `Peace established between ${sourceId} and ${targetId}`
    );
    
    // Resolve war disputes if they exist
    relationship.disputes
      .filter(d => d.type === 'historical' && d.title === 'State of War' && !d.resolved)
      .forEach(d => {
        d.resolved = true;
        d.resolvedDate = Date.now();
      });
    
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { disputes: relationship.disputes },
      `War dispute resolved with peace treaty`
    );
  }
  
  /**
   * Executes alliance formation
   */
  private executeAllianceFormation(action: DiplomaticAction): void {
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (!relationship) return;
    
    // Create alliance treaty
    const treaty: FactionTreaty = {
      id: uuidv4(),
      type: 'alliance',
      title: action.terms?.title || 'Alliance Agreement',
      description: action.terms?.description || 'Formal alliance between factions',
      terms: action.terms?.terms || 'Both parties agree to mutual aid and defense',
      startDate: Date.now(),
      endDate: action.terms?.endDate,
      active: true
    };
    
    relationship.treaties.push(treaty);
    
    // Update relationship
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { 
        attitude: Math.min(100, relationship.attitude + 20), // Improve up to max
        status: 'allied',
        treaties: relationship.treaties
      },
      `Alliance formed between ${sourceId} and ${targetId}`
    );
  }
  
  /**
   * Executes breaking an alliance
   */
  private executeAllianceBreaking(action: DiplomaticAction): void {
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (!relationship) return;
    
    // Find alliance treaties
    const allianceTreaties = relationship.treaties
      .filter(t => t.active && t.type === 'alliance');
    
    if (allianceTreaties.length === 0) return;
    
    // Deactivate alliance treaties
    allianceTreaties.forEach(t => {
      t.active = false;
      t.endDate = Date.now();
    });
    
    // Update relationship
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { 
        attitude: relationship.attitude - 25, // Major penalty
        status: 'neutral',
        treaties: relationship.treaties
      },
      `Alliance broken by ${sourceId}`
    );
    
    // Create a dispute
    const dispute: FactionDispute = {
      id: uuidv4(),
      type: 'historical',
      title: 'Broken Alliance',
      description: action.description || 'Alliance was unilaterally terminated',
      severity: 7,
      startDate: Date.now(),
      resolved: false
    };
    
    relationship.disputes.push(dispute);
    
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { disputes: relationship.disputes },
      `Dispute created over broken alliance`
    );
  }
  
  /**
   * Executes trade agreement
   */
  private executeTradeAgreement(action: DiplomaticAction): void {
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (!relationship) return;
    
    // Create trade treaty
    const treaty: FactionTreaty = {
      id: uuidv4(),
      type: 'trade',
      title: action.terms?.title || 'Trade Agreement',
      description: action.terms?.description || 'Trade agreement between factions',
      terms: action.terms?.terms || 'Both parties agree to favorable trade terms',
      startDate: Date.now(),
      endDate: action.terms?.endDate,
      active: true
    };
    
    relationship.treaties.push(treaty);
    
    // Update relationship
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { 
        attitude: relationship.attitude + 10, // Moderate improvement
        treaties: relationship.treaties
      },
      `Trade agreement established between ${sourceId} and ${targetId}`
    );
    
    // Update faction wealth statistics (would be implemented in a complete system)
    // Would interact with the resource management system
  }
  
  /**
   * Executes tribute demand
   */
  private executeTributeDemand(action: DiplomaticAction): void {
    // Implementation would depend on resource system integration
    console.log(`Tribute demand executed: ${action.description}`);
  }
  
  /**
   * Executes gift giving
   */
  private executeGiftGiving(action: DiplomaticAction): void {
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (!relationship) return;
    
    // Calculate attitude improvement based on gift value
    const giftValue = action.terms?.value || 5;
    const attitudeImprovement = Math.min(15, giftValue / 2);
    
    // Update relationship
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { attitude: relationship.attitude + attitudeImprovement },
      `Gift given from ${sourceId} to ${targetId}`
    );
  }
  
  /**
   * Executes an insult
   */
  private executeInsult(action: DiplomaticAction): void {
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (!relationship) return;
    
    // Update relationship
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { attitude: relationship.attitude - 10 },
      `Insult delivered from ${sourceId} to ${targetId}: ${action.description}`
    );
  }
  
  /**
   * Executes praise
   */
  private executePraise(action: DiplomaticAction): void {
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (!relationship) return;
    
    // Update relationship
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { attitude: relationship.attitude + 5 },
      `Praise delivered from ${sourceId} to ${targetId}: ${action.description}`
    );
  }
  
  /**
   * Executes a threat
   */
  private executeThreat(action: DiplomaticAction): void {
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (!relationship) return;
    
    // Update relationship
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { attitude: relationship.attitude - 15 },
      `Threat delivered from ${sourceId} to ${targetId}: ${action.description}`
    );
  }
  
  /**
   * Executes a diplomatic mission
   */
  private executeDiplomaticMission(action: DiplomaticAction): void {
    const sourceId = action.sourceFactionId;
    const targetId = action.targetFactionId;
    
    const relationship = this.factionManager.getRelationship(sourceId, targetId);
    if (!relationship) return;
    
    // Calculate success based on current relationship and quality of mission
    const quality = action.terms?.quality || 5;
    const baseImprovement = 5 + quality;
    
    // More effective if relations are already decent
    const effectiveImprovement = relationship.attitude > 0
      ? baseImprovement * 1.5
      : baseImprovement;
    
    // Update relationship
    this.factionManager.updateRelationship(
      sourceId,
      targetId,
      { attitude: relationship.attitude + effectiveImprovement },
      `Diplomatic mission from ${sourceId} to ${targetId}: ${action.description}`
    );
  }
  
  /**
   * Processes pending diplomatic actions that might have expired
   */
  public processPendingActions(): void {
    const now = Date.now();
    
    Array.from(this.actions.values())
      .filter(action => 
        action.status === 'pending' && 
        action.expiresAt && 
        action.expiresAt < now
      )
      .forEach(action => {
        action.status = 'expired';
        this.actions.set(action.id, action);
        
        // Apply minor penalty for letting offer expire
        const relationship = this.factionManager.getRelationship(
          action.sourceFactionId, 
          action.targetFactionId
        );
        
        if (relationship) {
          this.factionManager.updateRelationship(
            action.sourceFactionId,
            action.targetFactionId,
            { attitude: relationship.attitude - 3 },
            `Diplomatic offer expired: ${action.type}`
          );
        }
      });
  }
  
  /**
   * AI helper method to determine appropriate diplomatic actions
   * based on current relationship status
   */
  public suggestDiplomaticActions(factionId: string): DiplomaticActionType[] {
    const faction = this.factionManager.getFaction(factionId);
    if (!faction) return [];
    
    const suggestions: DiplomaticActionType[] = [];
    const relationships = this.factionManager.getAllFactions()
      .filter(f => f.id !== factionId)
      .map(f => {
        const rel = this.factionManager.getRelationship(factionId, f.id);
        return { 
          factionId: f.id, 
          relationship: rel || { 
            attitude: 0, 
            status: 'neutral', 
            treaties: [], 
            disputes: [],
            history: []
          } 
        };
      });
    
    for (const { factionId: targetId, relationship } of relationships) {
      // Different suggestions based on attitude
      if (relationship.attitude < -50) {
        // Very negative - consider war or threats
        if (relationship.status !== 'hostile') {
          suggestions.push('declare_war');
        } else {
          suggestions.push('threaten');
        }
      } else if (relationship.attitude < -20) {
        // Negative - consider minor hostilities
        suggestions.push('threaten');
        suggestions.push('insult');
      } else if (relationship.attitude < 20) {
        // Neutral - consider trade or diplomatic mission
        suggestions.push('diplomatic_mission');
        suggestions.push('trade_agreement');
      } else if (relationship.attitude < 50) {
        // Positive - consider alliance
        suggestions.push('form_alliance');
        suggestions.push('propose_treaty');
      } else {
        // Very positive - deepen alliance
        suggestions.push('give_gift');
        suggestions.push('praise');
      }
      
      // Special cases based on status
      if (relationship.status === 'hostile') {
        suggestions.push('sue_for_peace');
      }
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
  }
} 