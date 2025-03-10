/**
 * Character Module
 * 
 * Exports character progression, inventory management, and equipment systems
 */

export * from './progression';
export { default as characterProgression } from './progression';

export * from './inventory';
export { default as inventoryManager } from './inventory';

export * from './equipment';
export { default as equipmentManager } from './equipment';

// Export character creation
export * from './creator';
import { CharacterCreator } from './creator';
export { CharacterCreator };

// Export a singleton instance for backward compatibility
const characterCreator = new CharacterCreator();
export { characterCreator }; 