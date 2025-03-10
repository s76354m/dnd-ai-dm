// src/character/data/classes.ts

import type { Class } from '../../core/types';
import { AbilityScores } from '../../core/interfaces';

// Define our own DiceType since the import isn't working
type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100';

export interface ClassFeature {
  name: string;
  level: number;
  description: string;
  mechanics?: {
    type: 'passive' | 'active';
    resourceType?: 'perRest' | 'perDay' | 'permanent';
    uses?: number;
    mechanics: string;
  };
}

export interface SpellcastingFeature {
  ability: keyof AbilityScores;
  spellsKnown?: number[];  // by level
  cantripsKnown?: number[];  // by level
  spellSlots: {
    1: number[];  // by level
    2: number[];
    3: number[];
    4: number[];
    5: number[];
    6: number[];
    7: number[];
    8: number[];
    9: number[];
  };
  ritual?: boolean;
  spellcastingFocus?: string[];
}

export interface ClassProficiencies {
  armor?: string[];
  weapons?: string[];
  tools?: string[];
  savingThrows: (keyof AbilityScores)[];
  skills: {
    number: number;
    choices: string[];
  };
}

export interface StartingEquipment {
  mandatory: string[];
  options: {
    choose: number;
    from: string[][];
  }[];
}

export interface ClassData {
  name: Class;
  description: string;
  hitDie: DiceType;
  primaryAbility: (keyof AbilityScores)[];
  savingThrowProficiencies: (keyof AbilityScores)[];
  proficiencies: ClassProficiencies;
  startingEquipment: StartingEquipment;
  features: ClassFeature[];
  spellcasting?: SpellcastingFeature;
  subclassLevel: number;
  subclassTitle: string;
}

export const classes: Partial<Record<Class, ClassData>> = {
  fighter: {
    name: 'fighter',
    description: 'Fighters share an unparalleled mastery with weapons and armor, and a thorough knowledge of the skills of combat.',
    hitDie: 'd10',
    primaryAbility: ['strength', 'dexterity'],
    savingThrowProficiencies: ['strength', 'constitution'],
    proficiencies: {
      armor: ['light', 'medium', 'heavy', 'shields'],
      weapons: ['simple', 'martial'],
      savingThrows: ['strength', 'constitution'],
      skills: {
        number: 2,
        choices: [
          'Acrobatics',
          'Animal Handling',
          'Athletics',
          'History',
          'Insight',
          'Intimidation',
          'Perception',
          'Survival'
        ]
      }
    },
    startingEquipment: {
      mandatory: [
        'Explorer\'s Pack'
      ],
      options: [
        {
          choose: 1,
          from: [
            ['Chain mail', 'Leather armor, longbow, 20 arrows'],
          ]
        },
        {
          choose: 1,
          from: [
            ['Martial weapon and a shield'],
            ['Two martial weapons']
          ]
        },
        {
          choose: 1,
          from: [
            ['Light crossbow, 20 bolts'],
            ['Two handaxes']
          ]
        }
      ]
    },
    features: [
      {
        name: 'Fighting Style',
        level: 1,
        description: 'You adopt a particular style of fighting as your specialty.',
        mechanics: {
          type: 'passive',
          resourceType: 'permanent',
          mechanics: 'Choose one fighting style: Archery, Defense, Dueling, Great Weapon Fighting, Protection, or Two-Weapon Fighting'
        }
      },
      {
        name: 'Second Wind',
        level: 1,
        description: 'You have a limited well of stamina that you can draw on to protect yourself from harm.',
        mechanics: {
          type: 'active',
          resourceType: 'perRest',
          uses: 1,
          mechanics: 'Bonus action to regain 1d10 + fighter level hit points'
        }
      }
    ],
    subclassLevel: 3,
    subclassTitle: 'Martial Archetype'
  },
  // Placeholder entries for other classes to satisfy TypeScript
  // These would be filled out with complete data in a full implementation
  wizard: {
    name: 'wizard',
    description: 'Wizards are scholarly magic-users capable of manipulating the structures of reality.',
    hitDie: 'd6',
    primaryAbility: ['intelligence'],
    savingThrowProficiencies: ['intelligence', 'wisdom'],
    proficiencies: {
      armor: [],
      weapons: ['dagger', 'dart', 'sling', 'quarterstaff', 'light crossbow'],
      savingThrows: ['intelligence', 'wisdom'],
      skills: {
        number: 2,
        choices: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Religion']
      }
    },
    startingEquipment: {
      mandatory: ['Spellbook', 'Component pouch'],
      options: [
        {
          choose: 1,
          from: [
            ['Quarterstaff'],
            ['Dagger']
          ]
        },
        {
          choose: 1,
          from: [
            ['Scholar\'s Pack'],
            ['Explorer\'s Pack']
          ]
        }
      ]
    },
    features: [],
    spellcasting: {
      ability: 'intelligence',
      spellsKnown: [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44],
      cantripsKnown: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      spellSlots: {
        1: [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        2: [0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        3: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        4: [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        5: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3],
        6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
        7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
        9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
      },
      ritual: true,
      spellcastingFocus: ['Arcane focus']
    },
    subclassLevel: 2,
    subclassTitle: 'Arcane Tradition'
  },
  barbarian: {
    name: 'barbarian',
    description: 'For barbarians, rage is a power that fuels not just a battle frenzy but also uncanny reflexes, resilience, and feats of strength.',
    hitDie: 'd12',
    primaryAbility: ['strength'],
    savingThrowProficiencies: ['strength', 'constitution'],
    proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple', 'martial'],
      savingThrows: ['strength', 'constitution'],
      skills: {
        number: 2,
        choices: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival']
      }
    },
    startingEquipment: {
      mandatory: ['Explorer\'s Pack'],
      options: []
    },
    features: [],
    subclassLevel: 3,
    subclassTitle: 'Primal Path'
  },
  bard: {
    name: 'bard',
    description: 'The bard is a master of song, speech, and the magic they contain.',
    hitDie: 'd8',
    primaryAbility: ['charisma'],
    savingThrowProficiencies: ['dexterity', 'charisma'],
    proficiencies: {
      armor: ['light'],
      weapons: ['simple', 'hand crossbow', 'longsword', 'rapier', 'shortsword'],
      savingThrows: ['dexterity', 'charisma'],
      skills: {
        number: 3,
        choices: ['Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 'Deception', 'History', 'Insight', 'Intimidation', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Performance', 'Persuasion', 'Religion', 'Sleight of Hand', 'Stealth', 'Survival']
      }
    },
    startingEquipment: {
      mandatory: [],
      options: []
    },
    features: [],
    spellcasting: {
      ability: 'charisma',
      spellSlots: {
        1: [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        2: [0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        3: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        4: [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        5: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3],
        6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
        7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
        9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
      },
      cantripsKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      spellsKnown: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22]
    },
    subclassLevel: 3,
    subclassTitle: 'Bardic College'
  },
  cleric: {
    name: 'cleric',
    description: 'Clerics are intermediaries between the mortal world and the distant planes of the gods.',
    hitDie: 'd8',
    primaryAbility: ['wisdom'],
    savingThrowProficiencies: ['wisdom', 'charisma'],
    proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple'],
      savingThrows: ['wisdom', 'charisma'],
      skills: {
        number: 2,
        choices: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion']
      }
    },
    startingEquipment: {
      mandatory: [],
      options: []
    },
    features: [],
    spellcasting: {
      ability: 'wisdom',
      spellSlots: {
        1: [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        2: [0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        3: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        4: [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        5: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3],
        6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
        7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
        9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
      },
      cantripsKnown: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
    },
    subclassLevel: 1,
    subclassTitle: 'Divine Domain'
  },
  druid: {
    name: 'druid',
    description: 'Druids revere nature above all, gaining their spells and other magical powers from the force of nature itself.',
    hitDie: 'd8',
    primaryAbility: ['wisdom'],
    savingThrowProficiencies: ['intelligence', 'wisdom'],
    proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: ['club', 'dagger', 'dart', 'javelin', 'mace', 'quarterstaff', 'scimitar', 'sickle', 'sling', 'spear'],
      savingThrows: ['intelligence', 'wisdom'],
      skills: {
        number: 2,
        choices: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival']
      }
    },
    startingEquipment: {
      mandatory: [],
      options: []
    },
    features: [],
    spellcasting: {
      ability: 'wisdom',
      spellSlots: {
        1: [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        2: [0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        3: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        4: [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        5: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3],
        6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
        7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
        9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
      },
      cantripsKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
    },
    subclassLevel: 2,
    subclassTitle: 'Druid Circle'
  },
  monk: {
    name: 'monk',
    description: 'Monks are masters of martial arts, using their bodies as weapons.',
    hitDie: 'd8',
    primaryAbility: ['dexterity', 'wisdom'],
    savingThrowProficiencies: ['strength', 'dexterity'],
    proficiencies: {
      armor: [],
      weapons: ['simple', 'shortsword'],
      savingThrows: ['strength', 'dexterity'],
      skills: {
        number: 2,
        choices: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth']
      }
    },
    startingEquipment: {
      mandatory: [],
      options: []
    },
    features: [],
    subclassLevel: 3,
    subclassTitle: 'Monastic Tradition'
  },
  paladin: {
    name: 'paladin',
    description: 'Paladins are warriors bound to sacred oaths, combining martial prowess with divine power.',
    hitDie: 'd10',
    primaryAbility: ['strength', 'charisma'],
    savingThrowProficiencies: ['wisdom', 'charisma'],
    proficiencies: {
      armor: ['light', 'medium', 'heavy', 'shields'],
      weapons: ['simple', 'martial'],
      savingThrows: ['wisdom', 'charisma'],
      skills: {
        number: 2,
        choices: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion']
      }
    },
    startingEquipment: {
      mandatory: [],
      options: []
    },
    features: [],
    spellcasting: {
      ability: 'charisma',
      spellSlots: {
        1: [0, 0, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        2: [0, 0, 0, 0, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        3: [0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        4: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 3],
        5: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2],
        6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }
    },
    subclassLevel: 3,
    subclassTitle: 'Sacred Oath'
  },
  ranger: {
    name: 'ranger',
    description: 'Rangers specialize in hunting the monsters that threaten the edges of civilization.',
    hitDie: 'd10',
    primaryAbility: ['dexterity', 'wisdom'],
    savingThrowProficiencies: ['strength', 'dexterity'],
    proficiencies: {
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple', 'martial'],
      savingThrows: ['strength', 'dexterity'],
      skills: {
        number: 3,
        choices: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival']
      }
    },
    startingEquipment: {
      mandatory: [],
      options: []
    },
    features: [],
    spellcasting: {
      ability: 'wisdom',
      spellSlots: {
        1: [0, 0, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        2: [0, 0, 0, 0, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        3: [0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        4: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 3],
        5: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2],
        6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      spellsKnown: [0, 0, 3, 4, 4, 5, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13]
    },
    subclassLevel: 3,
    subclassTitle: 'Ranger Archetype'
  },
  rogue: {
    name: 'rogue',
    description: 'Rogues rely on skill, stealth, and their foes\' vulnerabilities to get the upper hand in any situation.',
    hitDie: 'd8',
    primaryAbility: ['dexterity'],
    savingThrowProficiencies: ['dexterity', 'intelligence'],
    proficiencies: {
      armor: ['light'],
      weapons: ['simple', 'hand crossbow', 'longsword', 'rapier', 'shortsword'],
      savingThrows: ['dexterity', 'intelligence'],
      skills: {
        number: 4,
        choices: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Performance', 'Persuasion', 'Sleight of Hand', 'Stealth']
      }
    },
    startingEquipment: {
      mandatory: [],
      options: []
    },
    features: [],
    subclassLevel: 3,
    subclassTitle: 'Roguish Archetype'
  },
  sorcerer: {
    name: 'sorcerer',
    description: 'Sorcerers carry a magical birthright conferred upon them by an exotic bloodline.',
    hitDie: 'd6',
    primaryAbility: ['charisma'],
    savingThrowProficiencies: ['constitution', 'charisma'],
    proficiencies: {
      armor: [],
      weapons: ['dagger', 'dart', 'sling', 'quarterstaff', 'light crossbow'],
      savingThrows: ['constitution', 'charisma'],
      skills: {
        number: 2,
        choices: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion']
      }
    },
    startingEquipment: {
      mandatory: [],
      options: []
    },
    features: [],
    spellcasting: {
      ability: 'charisma',
      spellSlots: {
        1: [2, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        2: [0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        3: [0, 0, 0, 0, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        4: [0, 0, 0, 0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        5: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3],
        6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2],
        7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 2],
        8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1],
        9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1]
      },
      spellsKnown: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
      cantripsKnown: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]
    },
    subclassLevel: 1,
    subclassTitle: 'Sorcerous Origin'
  },
  warlock: {
    name: 'warlock',
    description: 'Warlocks are seekers of knowledge who form pacts with otherworldly beings of power.',
    hitDie: 'd8',
    primaryAbility: ['charisma'],
    savingThrowProficiencies: ['wisdom', 'charisma'],
    proficiencies: {
      armor: ['light'],
      weapons: ['simple'],
      savingThrows: ['wisdom', 'charisma'],
      skills: {
        number: 2,
        choices: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion']
      }
    },
    startingEquipment: {
      mandatory: [],
      options: []
    },
    features: [],
    spellcasting: {
      ability: 'charisma',
      spellSlots: {
        1: [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4],
        2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        3: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        4: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        5: [0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4],
        6: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2],
        8: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        9: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      },
      spellsKnown: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
      cantripsKnown: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
    },
    subclassLevel: 1,
    subclassTitle: 'Otherworldly Patron'
  }
};