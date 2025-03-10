import { Character } from '../core/interfaces';
import { calculateInventoryWeight } from '../items/inventory-manager';

/**
 * Generate a formatted display of character information
 * @param character The character to display
 * @returns Formatted character sheet
 */
export function displayCharacterStatus(character: Character): string {
  // Basic information
  let display = `
===== CHARACTER SHEET =====
Name: ${character.name || 'Unknown'}
Race: ${character.race?.name || 'Unknown'}
${character.subrace ? `Subrace: ${character.subrace.name}` : ''}
Class: ${character.class?.name || 'Unknown'} ${character.level ? `(Level ${character.level})` : ''}
${character.subclass ? `Subclass: ${character.subclass.name}` : ''}
Background: ${character.background?.name || 'Unknown'}
Alignment: ${character.alignment || 'Unknown'}

----- ABILITY SCORES -----
`;

  // Ability scores
  if (character.abilityScores) {
    // Display long form with modifiers if available
    if (character.abilityScores.strength) {
      display += `STR: ${character.abilityScores.strength.score} (${character.abilityScores.strength.modifier >= 0 ? '+' : ''}${character.abilityScores.strength.modifier})\n`;
      display += `DEX: ${character.abilityScores.dexterity.score} (${character.abilityScores.dexterity.modifier >= 0 ? '+' : ''}${character.abilityScores.dexterity.modifier})\n`;
      display += `CON: ${character.abilityScores.constitution.score} (${character.abilityScores.constitution.modifier >= 0 ? '+' : ''}${character.abilityScores.constitution.modifier})\n`;
      display += `INT: ${character.abilityScores.intelligence.score} (${character.abilityScores.intelligence.modifier >= 0 ? '+' : ''}${character.abilityScores.intelligence.modifier})\n`;
      display += `WIS: ${character.abilityScores.wisdom.score} (${character.abilityScores.wisdom.modifier >= 0 ? '+' : ''}${character.abilityScores.wisdom.modifier})\n`;
      display += `CHA: ${character.abilityScores.charisma.score} (${character.abilityScores.charisma.modifier >= 0 ? '+' : ''}${character.abilityScores.charisma.modifier})\n`;
    } else {
      // Fallback to short form
      display += `STR: ${character.abilityScores.str || 'Unknown'}\n`;
      display += `DEX: ${character.abilityScores.dex || 'Unknown'}\n`;
      display += `CON: ${character.abilityScores.con || 'Unknown'}\n`;
      display += `INT: ${character.abilityScores.int || 'Unknown'}\n`;
      display += `WIS: ${character.abilityScores.wis || 'Unknown'}\n`;
      display += `CHA: ${character.abilityScores.cha || 'Unknown'}\n`;
    }
  }

  display += `
----- COMBAT STATS -----
Hit Points: ${character.hitPoints?.current || 0}/${character.hitPoints?.maximum || 0}
${character.temporaryHitPoints ? `Temporary HP: ${character.temporaryHitPoints}` : ''}
Armor Class: ${character.armorClass || 0}
Initiative: ${character.initiative !== undefined ? (character.initiative >= 0 ? '+' : '') + character.initiative : '0'}
Speed: ${character.speed || 30} ft.
`;

  // Inventory
  if (character.inventory && character.inventory.length > 0) {
    display += `
----- INVENTORY -----
`;
    
    // Calculate total weight if the inventory manager is available
    try {
      const totalWeight = calculateInventoryWeight(character.inventory);
      display += `Total Weight: ${totalWeight} lbs.\n`;
    } catch (error) {
      // Inventory manager might not be fully implemented yet
    }
    
    // List items
    character.inventory.forEach(item => {
      display += `${item.name}${item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : ''}\n`;
    });
  }

  // Spells if the character can cast them
  if (character.spells && character.spells.length > 0) {
    display += `
----- SPELLS -----
`;
    
    // Organize spells by level
    const spellsByLevel: Record<number, string[]> = {};
    
    character.spells.forEach(spell => {
      if (!spellsByLevel[spell.level]) {
        spellsByLevel[spell.level] = [];
      }
      spellsByLevel[spell.level].push(spell.name);
    });
    
    // Display spells by level
    for (const level in spellsByLevel) {
      display += `Level ${level === '0' ? 'Cantrips' : level}:\n`;
      spellsByLevel[level].forEach(spellName => {
        display += `  ${spellName}\n`;
      });
    }
  }

  return display;
} 