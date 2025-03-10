/**
 * Emotion Type Definitions
 * 
 * This file contains type definitions related to NPC emotions.
 */

import { EmotionType, Emotion } from './npc-types';

// Re-export the EmotionType and Emotion interface for use elsewhere
export { EmotionType, Emotion };

/**
 * Maps emotion types to their effects on behavior
 */
export interface EmotionBehaviorMapping {
  [key: string]: {
    socialImpact: number; // -1 to 1, how it affects social interactions
    riskTolerance: number; // -1 to 1, how it affects risk-taking behavior
    decisionSpeed: number; // -1 to 1, how it affects speed of decisions
    categoryModifiers: { [category: string]: number }; // How it affects specific behavior categories
  };
}

/**
 * Default emotion-behavior mappings
 */
export const DEFAULT_EMOTION_MAPPINGS: EmotionBehaviorMapping = {
  joy: {
    socialImpact: 0.7,
    riskTolerance: 0.3,
    decisionSpeed: 0.5,
    categoryModifiers: {
      social: 0.5,
      exploration: 0.3,
      recreational: 0.6
    }
  },
  sadness: {
    socialImpact: -0.5,
    riskTolerance: -0.3,
    decisionSpeed: -0.4,
    categoryModifiers: {
      social: -0.4,
      resting: 0.5
    }
  },
  anger: {
    socialImpact: -0.6,
    riskTolerance: 0.8,
    decisionSpeed: 0.7,
    categoryModifiers: {
      combat: 0.8,
      social: -0.5
    }
  },
  fear: {
    socialImpact: -0.7,
    riskTolerance: -0.8,
    decisionSpeed: -0.2,
    categoryModifiers: {
      survival: 0.8,
      combat: -0.6
    }
  },
  disgust: {
    socialImpact: -0.5,
    riskTolerance: -0.2,
    decisionSpeed: 0.1,
    categoryModifiers: {
      social: -0.5
    }
  },
  surprise: {
    socialImpact: 0.1,
    riskTolerance: 0.2,
    decisionSpeed: -0.3,
    categoryModifiers: {
      exploration: 0.4
    }
  },
  anticipation: {
    socialImpact: 0.3,
    riskTolerance: 0.2,
    decisionSpeed: 0.4,
    categoryModifiers: {
      exploration: 0.5,
      economic: 0.3
    }
  },
  trust: {
    socialImpact: 0.8,
    riskTolerance: 0.4,
    decisionSpeed: 0.2,
    categoryModifiers: {
      social: 0.7
    }
  },
  contentment: {
    socialImpact: 0.4,
    riskTolerance: -0.1,
    decisionSpeed: -0.2,
    categoryModifiers: {
      recreational: 0.5,
      resting: 0.6
    }
  },
  determination: {
    socialImpact: 0.2,
    riskTolerance: 0.5,
    decisionSpeed: 0.6,
    categoryModifiers: {
      professional: 0.7,
      economic: 0.5
    }
  }
}; 