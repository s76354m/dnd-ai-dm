/**
 * Enhanced Location Description Generator
 * 
 * Generates rich, contextual location descriptions using
 * the Location Context Manager and other AI enhancements.
 */

import { Location } from '../../core/interfaces/location';
import { GameState } from '../../core/interfaces/game';
import { AIServiceAdapter } from '../ai-service-adapter';
import { LocationContext } from '../context/location-context';
import { PromptComponent } from '../prompts/advanced-prompt-templates';

/**
 * Generates an enhanced location description
 * 
 * @param location The location to describe
 * @param gameState Current game state
 * @param aiService AI service adapter with enhanced capabilities
 * @param isFirstVisit Whether this is the player's first visit to the location
 * @returns A rich, contextual location description
 */
export async function generateEnhancedLocationDescription(
  location: Location,
  gameState: GameState,
  aiService: AIServiceAdapter,
  isFirstVisit: boolean = false
): Promise<string> {
  try {
    // Access the enhanced AI service
    const enhancedService = aiService.getEnhancedService();
    
    // Get or create the location context manager
    let locationContext: LocationContext;
    
    if (enhancedService.locationContext) {
      // Use existing context manager
      locationContext = enhancedService.locationContext;
    } else {
      // Create a new context manager
      locationContext = new LocationContext();
      
      // Store it in the enhanced service if possible
      if (typeof enhancedService.setLocationContext === 'function') {
        enhancedService.setLocationContext(locationContext);
      }
    }
    
    // Get visit count to determine if this is actually the first visit
    // (override the parameter if we have history data)
    const visitCount = locationContext.getVisitCount(location.id);
    const actualIsFirstVisit = visitCount === 0;
    
    // If this is a first visit (according to our history), record it
    if (actualIsFirstVisit) {
      locationContext.addLocationVisit(location, gameState);
    }
    
    // Build context string for the location
    const contextString = locationContext.buildLocationContext(location.id, gameState);
    
    // Prepare location data for the prompt
    const locationData = {
      ...location,
      isFirstVisit: actualIsFirstVisit,
      visitCount: visitCount
    };
    
    // Generate the location description using the enhanced AI service
    let description: string;
    
    // Use the specialized component if available
    if (typeof enhancedService.generateWithComponent === 'function') {
      description = await enhancedService.generateWithComponent(
        'location' as PromptComponent,
        {
          location: locationData,
          context: contextString,
          isFirstVisit: actualIsFirstVisit
        }
      );
    } else {
      // Fall back to the standard method
      description = await aiService.generateLocationDescription(location, actualIsFirstVisit);
    }
    
    // Validate the description if that capability is available
    if (typeof enhancedService.validateResponse === 'function') {
      const validationResult = enhancedService.validateResponse(
        description,
        'location',
        contextString
      );
      
      // If there are issues and we have the capability to fix them
      if (!validationResult.isValid && typeof enhancedService.regenerateResponse === 'function') {
        description = await enhancedService.regenerateResponse(
          description,
          'location',
          contextString,
          validationResult.issues
        );
      }
    }
    
    // Add this visit to the location history if it wasn't a first visit
    if (!actualIsFirstVisit) {
      locationContext.addLocationVisit(location, gameState);
    }
    
    // Extract and add key details from the generated description
    extractAndAddLocationDetails(description, location.id, locationContext);
    
    return description;
  } catch (error) {
    console.error('Error generating enhanced location description:', error);
    
    // Fall back to basic description
    return location.description || 
      `You see ${location.name}. ${isFirstVisit ? "You haven't been here before." : "You've been here before."}`;
  }
}

/**
 * Generate a description for the transition between locations
 * 
 * @param fromLocation Source location
 * @param toLocation Destination location
 * @param gameState Current game state
 * @param aiService AI service adapter with enhanced capabilities
 * @returns A description of the journey between locations
 */
export async function generateLocationTransition(
  fromLocation: Location,
  toLocation: Location,
  gameState: GameState,
  aiService: AIServiceAdapter
): Promise<string> {
  try {
    // Access the enhanced AI service
    const enhancedService = aiService.getEnhancedService();
    
    // Get or create the location context manager
    let locationContext: LocationContext;
    
    if (enhancedService.locationContext) {
      // Use existing context manager
      locationContext = enhancedService.locationContext;
    } else {
      // Create a new context manager
      locationContext = new LocationContext();
      
      // Store it in the enhanced service if possible
      if (typeof enhancedService.setLocationContext === 'function') {
        enhancedService.setLocationContext(locationContext);
      }
    }
    
    // Build context string for the transition
    const contextString = locationContext.generateLocationTransitionContext(
      fromLocation.id, 
      toLocation.id, 
      gameState
    );
    
    // Determine if this is a first visit to the destination
    const isFirstVisit = !locationContext.hasVisited(toLocation.id);
    
    // Generate the transition description using the enhanced AI service
    let description: string;
    
    // Use the specialized component if available
    if (typeof enhancedService.generateWithComponent === 'function') {
      description = await enhancedService.generateWithComponent(
        'transition' as PromptComponent,
        {
          fromLocation,
          toLocation,
          context: contextString,
          isFirstVisit
        }
      );
    } else {
      // Fall back to a more basic approach
      // This would be enhanced in a real implementation
      description = `You travel from ${fromLocation.name} to ${toLocation.name}.`;
    }
    
    return description;
  } catch (error) {
    console.error('Error generating location transition:', error);
    
    // Fall back to basic description
    return `You travel from ${fromLocation.name} to ${toLocation.name}.`;
  }
}

/**
 * Extract key details from a location description and add them to the context
 * 
 * @param description The generated location description
 * @param locationId The location ID
 * @param locationContext The location context manager
 */
function extractAndAddLocationDetails(
  description: string,
  locationId: string,
  locationContext: LocationContext
): void {
  // This is a simple implementation - in a real system, you might
  // use more sophisticated NLP techniques to extract key details
  
  // Split into sentences
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Look for sentences that describe details of the location
  const detailIndicators = [
    'you notice', 'you see', 'there is', 'there are',
    'the room has', 'the area has', 'featuring', 'contains',
    'adorned with', 'decorated with'
  ];
  
  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase().trim();
    
    // Check if this sentence contains an indicator of a location detail
    if (detailIndicators.some(indicator => sentenceLower.includes(indicator))) {
      // Found a potential detail - clean it up
      const detail = sentence.trim().replace(/^[,\s]+|[,\s]+$/g, '') + '.';
      
      // Add it to the location context
      locationContext.addLocationDetail(locationId, detail);
    }
  }
}

export default {
  generateEnhancedLocationDescription,
  generateLocationTransition
}; 