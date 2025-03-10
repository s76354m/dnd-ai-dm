// src/character/data/races.ts

import type { Race } from '../../core/types/index';
import { AbilityScores } from '../../core/interfaces';

export interface RaceData {
  name: Race;
  description: string;
  abilityScoreIncrease: Partial<AbilityScores>;
  age: {
    maturity: number;
    lifespan: number;
  };
  alignment: string;
  size: {
    height: {
      min: number;  // in inches
      max: number;
    };
    weight: {
      min: number;  // in pounds
      max: number;
    };
    category: 'Small' | 'Medium';
  };
  speed: number;
  languages: string[];
  traits: RacialTrait[];
  subraces?: SubraceData[];
}

export interface RacialTrait {
  name: string;
  description: string;
  effects?: {
    type: 'passive' | 'active';
    mechanics: string;
  };
}

export interface SubraceData {
  name: string;
  description: string;
  abilityScoreIncrease: Partial<AbilityScores>;
  traits: RacialTrait[];
}

export const races: Record<Race, RaceData> = {
  human: {
    name: 'human',
    description: 'Humans are the most adaptable and ambitious people among the common races. Their willingness to learn and their capacity for innovation makes them very versatile.',
    abilityScoreIncrease: {
      strength: { score: 1, modifier: 0 },
      dexterity: { score: 1, modifier: 0 },
      constitution: { score: 1, modifier: 0 },
      intelligence: { score: 1, modifier: 0 },
      wisdom: { score: 1, modifier: 0 },
      charisma: { score: 1, modifier: 0 }
    },
    age: {
      maturity: 18,
      lifespan: 80
    },
    alignment: 'Humans tend toward no particular alignment. The best and the worst are found among them.',
    size: {
      height: {
        min: 60,  // 5ft
        max: 78  // 6ft 6in
      },
      weight: {
        min: 130,
        max: 250
      },
      category: 'Medium'
    },
    speed: 30,
    languages: ['Common', 'One additional language of your choice'],
    traits: [
      {
        name: 'Extra Language',
        description: 'You can speak, read, and write Common and one extra language of your choice.',
        effects: {
          type: 'passive',
          mechanics: 'Gain one additional language of your choice'
        }
      },
      {
        name: 'Versatile',
        description: 'Humans are adaptable and diverse.',
        effects: {
          type: 'passive',
          mechanics: '+1 to all ability scores'
        }
      }
    ]
  },
  elf: {
    name: 'elf',
    description: 'Elves are a magical people of otherworldly grace, living in places of ethereal beauty.',
    abilityScoreIncrease: {
      dexterity: { score: 2, modifier: 1 }
    },
    age: {
      maturity: 100,
      lifespan: 750
    },
    alignment: 'Elves love freedom, variety, and self-expression, so they lean strongly toward the gentler aspects of chaos.',
    size: {
      height: {
        min: 60,  // 5ft
        max: 74   // 6ft 2in
      },
      weight: {
        min: 100,
        max: 180
      },
      category: 'Medium'
    },
    speed: 30,
    languages: ['Common', 'Elvish'],
    traits: [
      {
        name: 'Darkvision',
        description: 'You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light.',
        effects: {
          type: 'passive',
          mechanics: '60 ft. Darkvision'
        }
      },
      {
        name: 'Keen Senses',
        description: 'You have proficiency in the Perception skill.',
        effects: {
          type: 'passive',
          mechanics: 'Proficiency in Perception'
        }
      },
      {
        name: 'Fey Ancestry',
        description: 'You have advantage on saving throws against being charmed, and magic can\'t put you to sleep.',
        effects: {
          type: 'passive',
          mechanics: 'Advantage on charm saves, immune to magical sleep'
        }
      },
      {
        name: 'Trance',
        description: 'Elves don\'t need to sleep. Instead, they meditate deeply, remaining semiconscious, for 4 hours a day.',
        effects: {
          type: 'passive',
          mechanics: 'Rest in 4 hours instead of 8'
        }
      }
    ],
    subraces: [
      {
        name: 'High Elf',
        description: 'As a high elf, you have a keen mind and a mastery of at least the basics of magic.',
        abilityScoreIncrease: {
          intelligence: { score: 1, modifier: 0 }
        },
        traits: [
          {
            name: 'Elf Weapon Training',
            description: 'You have proficiency with the longsword, shortsword, shortbow, and longbow.',
            effects: {
              type: 'passive',
              mechanics: 'Proficiency with longsword, shortsword, shortbow, and longbow'
            }
          },
          {
            name: 'Cantrip',
            description: 'You know one cantrip of your choice from the wizard spell list.',
            effects: {
              type: 'passive',
              mechanics: 'Know one wizard cantrip'
            }
          },
          {
            name: 'Extra Language',
            description: 'You can speak, read, and write one extra language of your choice.',
            effects: {
              type: 'passive',
              mechanics: 'One additional language of your choice'
            }
          }
        ]
      }
    ]
  },
  dwarf: {
    name: 'dwarf',
    description: 'Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.',
    abilityScoreIncrease: {
      constitution: { score: 2, modifier: 1 }
    },
    age: {
      maturity: 50,
      lifespan: 350
    },
    alignment: 'Most dwarves are lawful, believing firmly in the benefits of a well-ordered society.',
    size: {
      height: {
        min: 48, // 4ft
        max: 60  // 5ft
      },
      weight: {
        min: 150,
        max: 220
      },
      category: 'Medium'
    },
    speed: 25,
    languages: ['Common', 'Dwarvish'],
    traits: [
      {
        name: 'Darkvision',
        description: 'You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light.',
        effects: {
          type: 'passive',
          mechanics: '60 ft. Darkvision'
        }
      },
      {
        name: 'Dwarven Resilience',
        description: 'You have advantage on saving throws against poison, and you have resistance against poison damage.',
        effects: {
          type: 'passive',
          mechanics: 'Advantage on poison saves, resistance to poison damage'
        }
      },
      {
        name: 'Dwarven Combat Training',
        description: 'You have proficiency with the battleaxe, handaxe, light hammer, and warhammer.',
        effects: {
          type: 'passive',
          mechanics: 'Proficiency with battleaxe, handaxe, light hammer, and warhammer'
        }
      },
      {
        name: 'Tool Proficiency',
        description: 'You gain proficiency with the artisan\'s tools of your choice: smith\'s tools, brewer\'s supplies, or mason\'s tools.',
        effects: {
          type: 'passive',
          mechanics: 'Proficiency with one type of artisan\'s tools'
        }
      },
      {
        name: 'Stonecunning',
        description: 'Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check.',
        effects: {
          type: 'passive',
          mechanics: 'Double proficiency on History checks related to stonework'
        }
      }
    ]
  },
  halfling: {
    name: 'halfling',
    description: 'The diminutive halflings survive in a world full of larger creatures by avoiding notice or, barring that, avoiding offense.',
    abilityScoreIncrease: {
      strength: { score: 0, modifier: 0 },
      dexterity: { score: 2, modifier: 1 },
      constitution: { score: 0, modifier: 0 },
      intelligence: { score: 0, modifier: 0 },
      wisdom: { score: 0, modifier: 0 },
      charisma: { score: 0, modifier: 0 }
    },
    age: {
      maturity: 20,
      lifespan: 120
    },
    alignment: 'Most halflings are lawful good. As a rule, they are good-hearted and kind, hate to see others in pain, and have no tolerance for oppression.',
    size: {
      height: {
        min: 32, // 2ft 8in
        max: 40  // 3ft 4in
      },
      weight: {
        min: 35,
        max: 45
      },
      category: 'Small'
    },
    speed: 25,
    languages: ['Common', 'Halfling'],
    traits: [
      {
        name: 'Lucky',
        description: 'When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.',
        effects: {
          type: 'passive',
          mechanics: 'Reroll 1s on d20 for attacks, ability checks, and saving throws'
        }
      },
      {
        name: 'Brave',
        description: 'You have advantage on saving throws against being frightened.',
        effects: {
          type: 'passive',
          mechanics: 'Advantage on saves against fear'
        }
      },
      {
        name: 'Halfling Nimbleness',
        description: 'You can move through the space of any creature that is of a size larger than yours.',
        effects: {
          type: 'passive',
          mechanics: 'Move through spaces of creatures larger than you'
        }
      }
    ]
  }
  // Additional races would be added here...
};