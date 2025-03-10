/**
 * Default NPC Schedules
 * 
 * Provides default schedules for NPCs based on their occupation or type.
 * These schedules determine where NPCs are at different times of day.
 */

import { NPCSchedule } from '../../core/interfaces/npc';

/**
 * Create a default generic schedule with home as the primary location
 * @param homeLocationId The NPC's home location ID
 */
export function createDefaultSchedule(homeLocationId: string): NPCSchedule {
  return {
    locations: [
      // Sleep during night hours
      {
        locationId: homeLocationId,
        startHour: 0, // Midnight
        endHour: 7,   // 7 AM
        activity: 'Sleeping'
      },
      // Morning activities
      {
        locationId: homeLocationId,
        startHour: 7,  // 7 AM
        endHour: 9,    // 9 AM
        activity: 'Morning routine'
      },
      // Daytime activities
      {
        locationId: homeLocationId,
        startHour: 9,   // 9 AM
        endHour: 18,    // 6 PM
        activity: 'Daily activities'
      },
      // Evening activities
      {
        locationId: homeLocationId,
        startHour: 18,  // 6 PM
        endHour: 22,    // 10 PM
        activity: 'Evening relaxation'
      },
      // Back to sleep
      {
        locationId: homeLocationId,
        startHour: 22,  // 10 PM
        endHour: 24,    // Midnight
        activity: 'Preparing for sleep'
      }
    ]
  };
}

/**
 * Create a schedule based on the NPC's occupation
 * @param occupation The NPC's occupation or type
 * @param homeLocationId The NPC's primary location ID
 */
export function getScheduleForNPCType(occupation: string, homeLocationId: string): NPCSchedule {
  // Normalize the occupation string for easier matching
  const normalizedOccupation = occupation.toLowerCase().trim();
  
  // Return a specific schedule based on occupation
  switch (normalizedOccupation) {
    case 'innkeeper':
    case 'bartender':
    case 'tavern keeper':
      return createInnkeeperSchedule(homeLocationId);
      
    case 'merchant':
    case 'shopkeeper':
    case 'vendor':
      return createMerchantSchedule(homeLocationId);
      
    case 'guard':
    case 'town guard':
    case 'city guard':
    case 'watchman':
      return createGuardSchedule(homeLocationId);
      
    case 'farmer':
      return createFarmerSchedule(homeLocationId);
      
    case 'blacksmith':
    case 'smith':
      return createBlacksmithSchedule(homeLocationId);
      
    case 'priest':
    case 'cleric':
    case 'temple keeper':
      return createPriestSchedule(homeLocationId);
      
    case 'noble':
    case 'aristocrat':
      return createNobleSchedule(homeLocationId);
      
    case 'beggar':
    case 'homeless':
      return createBeggarSchedule(homeLocationId);
      
    case 'traveler':
    case 'visitor':
      return createTravelerSchedule(homeLocationId);
      
    // Add more occupation types as needed
      
    default:
      // For unknown occupations, use a generic schedule
      return createDefaultSchedule(homeLocationId);
  }
}

/**
 * Create a schedule for an innkeeper or tavern owner
 */
function createInnkeeperSchedule(tavernId: string): NPCSchedule {
  // Assume innkeeper lives at the tavern
  const homeId = tavernId;
  
  return {
    locations: [
      // Late night at the tavern
      {
        locationId: tavernId,
        startHour: 0,  // Midnight
        endHour: 2,    // 2 AM
        activity: 'Serving late night patrons'
      },
      // Sleep
      {
        locationId: homeId,
        startHour: 2,   // 2 AM
        endHour: 6,     // 6 AM
        activity: 'Sleeping'
      },
      // Morning preparations
      {
        locationId: tavernId,
        startHour: 6,   // 6 AM
        endHour: 10,    // 10 AM
        activity: 'Preparing the tavern, cooking breakfast'
      },
      // Serving lunch
      {
        locationId: tavernId,
        startHour: 10,  // 10 AM
        endHour: 15,    // 3 PM
        activity: 'Serving patrons'
      },
      // Afternoon break
      {
        locationId: homeId,
        startHour: 15,  // 3 PM
        endHour: 17,    // 5 PM
        activity: 'Taking a short break'
      },
      // Dinner and evening rush
      {
        locationId: tavernId,
        startHour: 17,  // 5 PM
        endHour: 24,    // Midnight
        activity: 'Serving dinner and drinks'
      }
    ]
  };
}

/**
 * Create a schedule for a merchant or shopkeeper
 */
function createMerchantSchedule(shopId: string): NPCSchedule {
  // Assume merchant has a home different from the shop
  // For simplicity, we'll just append "_home" to the shop ID
  const homeId = `${shopId}_home`;
  
  return {
    locations: [
      // Sleep at home
      {
        locationId: homeId,
        startHour: 0,   // Midnight
        endHour: 7,     // 7 AM
        activity: 'Sleeping'
      },
      // Morning preparations
      {
        locationId: shopId,
        startHour: 7,   // 7 AM
        endHour: 8,     // 8 AM
        activity: 'Opening the shop'
      },
      // Shop open
      {
        locationId: shopId,
        startHour: 8,   // 8 AM
        endHour: 12,    // Noon
        activity: 'Attending to customers'
      },
      // Lunch break
      {
        locationId: homeId,
        startHour: 12,  // Noon
        endHour: 13,    // 1 PM
        activity: 'Lunch break'
      },
      // Afternoon shop
      {
        locationId: shopId,
        startHour: 13,  // 1 PM
        endHour: 18,    // 6 PM
        activity: 'Attending to customers'
      },
      // Closing up
      {
        locationId: shopId,
        startHour: 18,  // 6 PM
        endHour: 19,    // 7 PM
        activity: 'Closing the shop'
      },
      // Evening at home
      {
        locationId: homeId,
        startHour: 19,  // 7 PM
        endHour: 24,    // Midnight
        activity: 'Relaxing at home'
      }
    ]
  };
}

/**
 * Create a schedule for a town guard
 */
function createGuardSchedule(guardPostId: string): NPCSchedule {
  // Guards typically have barracks or a home
  const barracksId = `${guardPostId}_barracks`;
  
  // Create two different shifts for guards
  const morningShift = Math.random() > 0.5;
  
  if (morningShift) {
    // Morning to evening shift
    return {
      locations: [
        // Sleep at barracks
        {
          locationId: barracksId,
          startHour: 0,   // Midnight
          endHour: 6,     // 6 AM
          activity: 'Sleeping'
        },
        // Preparing for duty
        {
          locationId: barracksId,
          startHour: 6,   // 6 AM
          endHour: 7,     // 7 AM
          activity: 'Preparing for duty'
        },
        // Morning patrol
        {
          locationId: guardPostId,
          startHour: 7,   // 7 AM
          endHour: 12,    // Noon
          activity: 'Patrolling'
        },
        // Lunch break
        {
          locationId: barracksId,
          startHour: 12,  // Noon
          endHour: 13,    // 1 PM
          activity: 'Lunch break'
        },
        // Afternoon patrol
        {
          locationId: guardPostId,
          startHour: 13,  // 1 PM
          endHour: 18,    // 6 PM
          activity: 'Patrolling'
        },
        // Evening activities
        {
          locationId: barracksId,
          startHour: 18,  // 6 PM
          endHour: 24,    // Midnight
          activity: 'Off duty'
        }
      ]
    };
  } else {
    // Evening to night shift
    return {
      locations: [
        // Sleep during day
        {
          locationId: barracksId,
          startHour: 0,   // Midnight
          endHour: 6,     // 6 AM
          activity: 'On duty - night patrol'
        },
        // End of shift
        {
          locationId: barracksId,
          startHour: 6,   // 6 AM
          endHour: 7,     // 7 AM
          activity: 'End of shift'
        },
        // Sleep during day
        {
          locationId: barracksId,
          startHour: 7,   // 7 AM
          endHour: 15,    // 3 PM
          activity: 'Sleeping'
        },
        // Evening activities
        {
          locationId: barracksId,
          startHour: 15,  // 3 PM
          endHour: 18,    // 6 PM
          activity: 'Off duty'
        },
        // Preparing for night shift
        {
          locationId: barracksId,
          startHour: 18,  // 6 PM
          endHour: 19,    // 7 PM
          activity: 'Preparing for duty'
        },
        // Night patrol
        {
          locationId: guardPostId,
          startHour: 19,  // 7 PM
          endHour: 24,    // Midnight
          activity: 'On duty - night patrol'
        }
      ]
    };
  }
}

/**
 * Create a schedule for a farmer
 */
function createFarmerSchedule(farmId: string): NPCSchedule {
  // Assume farmer's home is at the farm
  const homeId = farmId;
  
  // Create a market ID for selling produce
  const marketId = 'market_square';
  
  return {
    locations: [
      // Sleep at home
      {
        locationId: homeId,
        startHour: 0,   // Midnight
        endHour: 5,     // 5 AM
        activity: 'Sleeping'
      },
      // Early morning farm work
      {
        locationId: farmId,
        startHour: 5,   // 5 AM
        endHour: 12,    // Noon
        activity: 'Tending to crops and animals'
      },
      // Lunch break
      {
        locationId: homeId,
        startHour: 12,  // Noon
        endHour: 13,    // 1 PM
        activity: 'Lunch break'
      },
      // Market day - only on day 2 (Tuesday)
      {
        locationId: marketId,
        startHour: 13,  // 1 PM
        endHour: 16,    // 4 PM
        activity: 'Selling produce at the market'
      },
      // Afternoon farm work
      {
        locationId: farmId,
        startHour: 13,  // 1 PM
        endHour: 19,    // 7 PM
        activity: 'Afternoon farm work'
      },
      // Evening at home
      {
        locationId: homeId,
        startHour: 19,  // 7 PM
        endHour: 21,    // 9 PM
        activity: 'Dinner and relaxation'
      },
      // Early to bed
      {
        locationId: homeId,
        startHour: 21,  // 9 PM
        endHour: 24,    // Midnight
        activity: 'Sleeping'
      }
    ],
    // Tuesday is market day
    weeklyOverrides: new Map([
      [2, marketId] // Day 2 (Tuesday) at the market
    ])
  };
}

/**
 * Create a schedule for a blacksmith
 */
function createBlacksmithSchedule(smithyId: string): NPCSchedule {
  // Assume the blacksmith lives at or near the smithy
  const homeId = `${smithyId}_home`;
  
  return {
    locations: [
      // Sleep at home
      {
        locationId: homeId,
        startHour: 0,   // Midnight
        endHour: 6,     // 6 AM
        activity: 'Sleeping'
      },
      // Morning preparations
      {
        locationId: smithyId,
        startHour: 6,   // 6 AM
        endHour: 7,     // 7 AM
        activity: 'Lighting the forge'
      },
      // Morning work
      {
        locationId: smithyId,
        startHour: 7,   // 7 AM
        endHour: 12,    // Noon
        activity: 'Forging and smithing'
      },
      // Lunch break
      {
        locationId: homeId,
        startHour: 12,  // Noon
        endHour: 13,    // 1 PM
        activity: 'Lunch break'
      },
      // Afternoon work
      {
        locationId: smithyId,
        startHour: 13,  // 1 PM
        endHour: 18,    // 6 PM
        activity: 'Forging and smithing'
      },
      // Closing up
      {
        locationId: smithyId,
        startHour: 18,  // 6 PM
        endHour: 19,    // 7 PM
        activity: 'Cleaning up the smithy'
      },
      // Evening at home
      {
        locationId: homeId,
        startHour: 19,  // 7 PM
        endHour: 24,    // Midnight
        activity: 'Relaxing at home'
      }
    ]
  };
}

/**
 * Create a schedule for a priest or temple keeper
 */
function createPriestSchedule(templeId: string): NPCSchedule {
  // Assume the priest lives at or near the temple
  const quartersId = `${templeId}_quarters`;
  
  return {
    locations: [
      // Sleep at quarters
      {
        locationId: quartersId,
        startHour: 0,   // Midnight
        endHour: 5,     // 5 AM
        activity: 'Sleeping'
      },
      // Early morning prayers
      {
        locationId: templeId,
        startHour: 5,   // 5 AM
        endHour: 7,     // 7 AM
        activity: 'Morning prayers'
      },
      // Morning temple duties
      {
        locationId: templeId,
        startHour: 7,   // 7 AM
        endHour: 12,    // Noon
        activity: 'Temple duties and services'
      },
      // Midday meal and brief rest
      {
        locationId: quartersId,
        startHour: 12,  // Noon
        endHour: 13,    // 1 PM
        activity: 'Midday meal'
      },
      // Afternoon services
      {
        locationId: templeId,
        startHour: 13,  // 1 PM
        endHour: 17,    // 5 PM
        activity: 'Counseling and temple services'
      },
      // Evening prayers
      {
        locationId: templeId,
        startHour: 17,  // 5 PM
        endHour: 19,    // 7 PM
        activity: 'Evening prayers'
      },
      // Evening study
      {
        locationId: quartersId,
        startHour: 19,  // 7 PM
        endHour: 22,    // 10 PM
        activity: 'Study and reflection'
      },
      // Sleep
      {
        locationId: quartersId,
        startHour: 22,  // 10 PM
        endHour: 24,    // Midnight
        activity: 'Sleeping'
      }
    ],
    // Special services on day 0 (Sunday)
    weeklyOverrides: new Map([
      [0, templeId] // Day 0 (Sunday) at the temple all day
    ])
  };
}

/**
 * Create a schedule for a noble or aristocrat
 */
function createNobleSchedule(mansionId: string): NPCSchedule {
  // Nobles typically stay within their estate
  const studyId = `${mansionId}_study`;
  const gardenId = `${mansionId}_garden`;
  const hallId = `${mansionId}_hall`;
  
  return {
    locations: [
      // Sleep in mansion
      {
        locationId: mansionId,
        startHour: 0,   // Midnight
        endHour: 8,     // 8 AM
        activity: 'Sleeping'
      },
      // Morning routine
      {
        locationId: mansionId,
        startHour: 8,   // 8 AM
        endHour: 10,    // 10 AM
        activity: 'Morning routine and breakfast'
      },
      // Business affairs
      {
        locationId: studyId,
        startHour: 10,  // 10 AM
        endHour: 13,    // 1 PM
        activity: 'Attending to business affairs'
      },
      // Midday meal
      {
        locationId: mansionId,
        startHour: 13,  // 1 PM
        endHour: 14,    // 2 PM
        activity: 'Midday meal'
      },
      // Afternoon leisure
      {
        locationId: gardenId,
        startHour: 14,  // 2 PM
        endHour: 17,    // 5 PM
        activity: 'Leisure activities'
      },
      // Evening preparations
      {
        locationId: mansionId,
        startHour: 17,  // 5 PM
        endHour: 19,    // 7 PM
        activity: 'Preparing for dinner'
      },
      // Dinner and entertainment
      {
        locationId: hallId,
        startHour: 19,  // 7 PM
        endHour: 22,    // 10 PM
        activity: 'Dinner and entertainment'
      },
      // Retiring for the night
      {
        locationId: mansionId,
        startHour: 22,  // 10 PM
        endHour: 24,    // Midnight
        activity: 'Retiring for the night'
      }
    ]
  };
}

/**
 * Create a schedule for a beggar or homeless person
 */
function createBeggarSchedule(homeLocationId: string): NPCSchedule {
  // Beggars typically spend time in public areas
  const marketId = 'market_square';
  const tavernId = 'tavern';
  const streetsId = 'town_streets';
  
  return {
    locations: [
      // Sleep in secluded area
      {
        locationId: streetsId,
        startHour: 0,   // Midnight
        endHour: 6,     // 6 AM
        activity: 'Sleeping in a sheltered spot'
      },
      // Morning begging
      {
        locationId: marketId,
        startHour: 6,   // 6 AM
        endHour: 12,    // Noon
        activity: 'Begging in the marketplace'
      },
      // Midday break
      {
        locationId: streetsId,
        startHour: 12,  // Noon
        endHour: 14,    // 2 PM
        activity: 'Finding food and resting'
      },
      // Afternoon begging
      {
        locationId: marketId,
        startHour: 14,  // 2 PM
        endHour: 18,    // 6 PM
        activity: 'Begging in the marketplace'
      },
      // Evening near tavern
      {
        locationId: tavernId,
        startHour: 18,  // 6 PM
        endHour: 22,    // 10 PM
        activity: 'Begging from tavern patrons'
      },
      // Finding shelter for the night
      {
        locationId: streetsId,
        startHour: 22,  // 10 PM
        endHour: 24,    // Midnight
        activity: 'Finding shelter for the night'
      }
    ]
  };
}

/**
 * Create a schedule for a traveler or visitor
 */
function createTravelerSchedule(innId: string): NPCSchedule {
  // Travelers typically stay at an inn and explore
  const marketId = 'market_square';
  const tavernId = 'tavern';
  const templeId = 'temple';
  
  return {
    locations: [
      // Sleep at inn
      {
        locationId: innId,
        startHour: 0,   // Midnight
        endHour: 8,     // 8 AM
        activity: 'Sleeping at the inn'
      },
      // Morning at inn
      {
        locationId: innId,
        startHour: 8,   // 8 AM
        endHour: 10,    // 10 AM
        activity: 'Having breakfast and planning the day'
      },
      // Morning exploring
      {
        locationId: marketId,
        startHour: 10,  // 10 AM
        endHour: 14,    // 2 PM
        activity: 'Exploring the marketplace'
      },
      // Afternoon activities
      {
        locationId: templeId,
        startHour: 14,  // 2 PM
        endHour: 17,    // 5 PM
        activity: 'Visiting local attractions'
      },
      // Evening meal
      {
        locationId: tavernId,
        startHour: 17,  // 5 PM
        endHour: 21,    // 9 PM
        activity: 'Dining and drinking at the tavern'
      },
      // Return to inn
      {
        locationId: innId,
        startHour: 21,  // 9 PM
        endHour: 24,    // Midnight
        activity: 'Returning to the inn for the night'
      }
    ]
  };
} 