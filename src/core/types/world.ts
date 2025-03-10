/**
 * World Types
 * 
 * Types related to world conditions, weather, time, and seasons.
 */

/**
 * Weather conditions in the game world
 */
export type Weather = 
  | 'clear' 
  | 'cloudy' 
  | 'overcast' 
  | 'fog' 
  | 'light rain' 
  | 'heavy rain' 
  | 'thunderstorm' 
  | 'snow' 
  | 'blizzard' 
  | 'hail' 
  | 'sleet'
  | 'sandstorm'
  | 'ash'
  | 'hurricane'
  | 'tornado';

/**
 * Time of day in the game world
 */
export type TimeOfDay = 
  | 'dawn' 
  | 'morning' 
  | 'midday' 
  | 'afternoon' 
  | 'dusk' 
  | 'evening' 
  | 'night' 
  | 'midnight';

/**
 * Seasons in the game world
 */
export type Season = 
  | 'spring' 
  | 'summer' 
  | 'autumn' 
  | 'winter'; 