// src/character/data/backgrounds.ts

import type { Background } from '../../core/types/index';

export interface BackgroundFeature {
  name: string;
  description: string;
  mechanics?: string;
}

export interface CharacteristicTable {
  d8: string[];  // Array of 8 options for d8 roll
}

export interface BackgroundCharacteristics {
  personalityTraits: CharacteristicTable;
  ideals: {
    d6: Array<{
      name: string;
      description: string;
      alignment?: string;
    }>;
  };
  bonds: CharacteristicTable;
  flaws: CharacteristicTable;
}

export interface StartingEquipment {
  mandatory: string[];
  currency: {
    gold?: number;
    silver?: number;
    copper?: number;
  };
}

export interface BackgroundData {
  name: Background;
  description: string;
  skillProficiencies: string[];
  languageCount?: number;
  toolProficiencies?: string[];
  equipment: StartingEquipment;
  feature: BackgroundFeature;
  characteristics: BackgroundCharacteristics;
  suggestedCharacteristics?: string[];
  variants?: {
    name: string;
    description: string;
    changes: Partial<BackgroundData>;
  }[];
}

export const backgrounds: Partial<Record<Background, BackgroundData>> = {
  acolyte: {
    name: 'acolyte',
    description: 'You have spent your life in the service of a temple to a specific god or pantheon of gods. You act as an intermediary between the realm of the holy and the mortal world.',
    skillProficiencies: ['Insight', 'Religion'],
    languageCount: 2,
    equipment: {
      mandatory: [
        'A holy symbol',
        'A prayer book or prayer wheel',
        '5 sticks of incense',
        'Vestments',
        'A set of common clothes'
      ],
      currency: {
        gold: 15
      }
    },
    feature: {
      name: 'Shelter of the Faithful',
      description: 'As an acolyte, you command the respect of those who share your faith, and you can perform the religious ceremonies of your deity. You and your adventuring companions can expect to receive free healing and care at a temple, shrine, or other established presence of your faith, though you must provide any material components needed for spells. Those who share your religion will support you (but only you) at a modest lifestyle.',
      mechanics: 'Free healing and care at temples of your faith'
    },
    characteristics: {
      personalityTraits: {
        d8: [
          "I idolize a particular hero of my faith, and constantly refer to that person's deeds and example.",
          'I can find common ground between the fiercest enemies, empathizing with them and always working toward peace.',
          'I see omens in every event and action. The gods try to speak to us, we just need to listen.',
          'Nothing can shake my optimistic attitude.',
          'I quote (or misquote) sacred texts and proverbs in almost every situation.',
          'I am tolerant (or intolerant) of other faiths and respect (or condemn) the worship of other gods.',
          "I've enjoyed fine food, drink, and high society among my temple's elite. Rough living grates on me.",
          "I've spent so long in the temple that I have little practical experience dealing with people in the outside world.",
        ]
      },
      ideals: {
        d6: [
          {
            name: 'Tradition',
            description: 'The ancient traditions of worship and sacrifice must be preserved and upheld.',
            alignment: 'Lawful'
          },
          {
            name: 'Charity',
            description: 'I always try to help those in need, regardless of the personal cost.',
            alignment: 'Good'
          },
          {
            name: 'Power',
            description: "I hope to one day rise to the top of my faith's religious hierarchy.",
            alignment: 'Lawful'
          },
          {
            name: 'Faith',
            description: 'I trust that my deity will guide my actions. I have faith that if I work hard, things will go well.',
            alignment: 'Lawful'
          },
          {
            name: 'Aspiration',
            description: "I seek to prove myself worthy of my god's favor by matching my actions against their teachings.",
            alignment: 'Any'
          },
          {
            name: 'Independence',
            description: 'I am a free thinker who must prove their own beliefs through experience.',
            alignment: 'Chaotic'
          }
        ]
      },
      bonds: {
        d8: [
          'I would die to recover an ancient relic of my faith that was lost long ago.',
          'I will someday get revenge on the corrupt temple hierarchy who branded me a heretic.',
          'I owe my life to the priest who took me in when my parents died.',
          'Everything I do is for the common people.',
          'I will do anything to protect the temple where I served.',
          'I seek to preserve a sacred text that my enemies consider heretical and seek to destroy.',
          'I fleeced the wrong person and must work to ensure that this individual never crosses paths with me or those I care about.',
          'I owe a debt I can never repay to the person who showed me the truth.'
        ]
      },
      flaws: {
        d8: [
          'I judge others harshly, and myself even more severely.',
          "I put too much trust in those who wield power within my temple's hierarchy.",
          "My piety sometimes leads me to blindly trust those that profess faith in my god.",
          "I am inflexible in my thinking.",
          "I am suspicious of strangers and expect the worst of them.",
          "Once I pick a goal, I become obsessed with it to the detriment of everything else in my life.",
          "I can't resist a pretty face.",
          "I am slow to trust members of other religious organizations."
        ]
      }
    }
  },
  criminal: {
    name: 'criminal',
    description: 'You are an experienced criminal with a history of breaking the law. You have spent a lot of time among other criminals and still have contacts within the criminal underworld.',
    skillProficiencies: ['Deception', 'Stealth'],
    toolProficiencies: ['Thieves\' tools', 'One type of gaming set'],
    equipment: {
      mandatory: [
        'A crowbar',
        'A set of dark common clothes including a hood',
        'A gaming set'
      ],
      currency: {
        gold: 15
      }
    },
    feature: {
      name: 'Criminal Contact',
      description: 'You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.',
      mechanics: 'Reliable criminal contact for information and messaging'
    },
    characteristics: {
      personalityTraits: {
        d8: [
          "I always have a plan for what to do when things go wrong.",
          "I am always calm, no matter what the situation. I never raise my voice or let my emotions control me.",
          "The first thing I do in a new place is note the locations of everything valuable—or where such things could be hidden.",
          "I would rather make a new friend than a new enemy.",
          "I am incredibly slow to trust. Those who seem the fairest often have the most to hide.",
          "I don't pay attention to the risks in a situation. Never tell me the odds.",
          "The best way to get me to do something is to tell me I can't do it.",
          "I blow up at the slightest insult."
        ]
      },
      ideals: {
        d6: [
          {
            name: 'Honor',
            description: "I don't steal from others in the trade.",
            alignment: 'Lawful'
          },
          {
            name: 'Freedom',
            description: "Chains are meant to be broken, as are those who would forge them.",
            alignment: 'Chaotic'
          },
          {
            name: 'Charity',
            description: "I steal from the wealthy so that I can help people in need.",
            alignment: 'Good'
          },
          {
            name: 'Greed',
            description: "I will do whatever it takes to become wealthy.",
            alignment: 'Evil'
          },
          {
            name: 'People',
            description: "I'm loyal to my friends, not to any ideals, and everyone else can take a trip down the Styx for all I care.",
            alignment: 'Neutral'
          },
          {
            name: 'Redemption',
            description: "There's a spark of good in everyone.",
            alignment: 'Good'
          }
        ]
      },
      bonds: {
        d8: [
          "I'm trying to pay off an old debt I owe to a generous benefactor.",
          "My ill-gotten gains go to support my family.",
          "Something important was taken from me, and I aim to steal it back.",
          "I will become the greatest thief that ever lived.",
          "I'm guilty of a terrible crime. I hope I can redeem myself for it.",
          "Someone I loved died because of a mistake I made. That will never happen again.",
          "I owe everything to my mentor—a horrible person who's probably rotting in jail somewhere.",
          "I fleeced the wrong person and must work to ensure that this individual never crosses paths with me or those I care about."
        ]
      },
      flaws: {
        d8: [
          "When I see something valuable, I can't think about anything but how to steal it.",
          "When faced with a choice between money and my friends, I usually choose the money.",
          "If there's a plan, I'll forget it. If I don't forget it, I'll ignore it.",
          "I have a 'tell' that reveals when I'm lying.",
          "I turn tail and run when things look bad.",
          "An innocent person is in prison for a crime that I committed. I'm okay with that.",
          "I can't resist swindling people who are more powerful than me.",
          "I never can pass up a chance to pocket something shiny."
        ]
      }
    },
    variants: [
      {
        name: 'Spy',
        description: 'Although your capabilities are not much different from those of a burglar or smuggler, you learned and practiced them in a very different context: as an espionage agent.',
        changes: {
          description: 'You have spent your career spying on others, gathering intelligence, and navigating intrigue-laden circles of power.',
          feature: {
            name: 'Spy Contact',
            description: 'You have a reliable and trustworthy contact who acts as your liaison to a network of other spies. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.',
            mechanics: 'Reliable spy network contact for information and messaging'
          }
        }
      }
    ]
  },
  charlatan: {
    name: 'charlatan',
    description: 'You have always had a way with people. You know what makes them tick, you can tease out their hearts\' desires after a few minutes of conversation, and with a few leading questions you can read them like they were children\'s books.',
    skillProficiencies: ['Deception', 'Sleight of Hand'],
    toolProficiencies: ['Disguise kit', 'Forgery kit'],
    equipment: {
      mandatory: [
        'A set of fine clothes',
        'A disguise kit',
        'Tools of the con of your choice (ten stoppered bottles filled with colored liquid, a set of weighted dice, a deck of marked cards, or a signet ring of an imaginary duke)',
      ],
      currency: {
        gold: 15
      }
    },
    feature: {
      name: 'False Identity',
      description: 'You have created a second identity that includes documentation, established acquaintances, and disguises that allow you to assume that persona. Additionally, you can forge documents including official papers and personal letters, as long as you have seen an example of the kind of document or the handwriting you are trying to copy.',
      mechanics: 'Create false documentation and assume a second identity'
    },
    characteristics: {
      personalityTraits: {
        d8: [
          'I fall in and out of love easily, and am always pursuing someone.',
          'I have a joke for every occasion, especially occasions where humor is inappropriate.',
          'Flattery is my preferred trick for getting what I want.',
          'I\'m a born gambler who can\'t resist taking a risk for a potential payoff.',
          'I lie about almost everything, even when there\'s no good reason to.',
          'Sarcasm and insults are my weapons of choice.',
          'I keep multiple holy symbols on me and invoke whatever deity might come in useful at any given moment.',
          'I pocket anything I see that might have some value.'
        ]
      },
      ideals: {
        d6: [
          {
            name: 'Independence',
            description: 'I am a free spirit—no one tells me what to do.',
            alignment: 'Chaotic'
          },
          {
            name: 'Fairness',
            description: 'I never target people who can\'t afford to lose a few coins.',
            alignment: 'Lawful'
          },
          {
            name: 'Charity',
            description: 'I distribute the money I acquire to the people who really need it.',
            alignment: 'Good'
          },
          {
            name: 'Creativity',
            description: 'I never run the same con twice.',
            alignment: 'Chaotic'
          },
          {
            name: 'Friendship',
            description: 'Material goods come and go. Bonds of friendship last forever.',
            alignment: 'Good'
          },
          {
            name: 'Aspiration',
            description: 'I\'m determined to make something of myself.',
            alignment: 'Any'
          }
        ]
      },
      bonds: {
        d8: [
          'I fleeced the wrong person and must work to ensure that this individual never crosses paths with me or those I care about.',
          'I owe everything to my mentor—a horrible person who\'s probably rotting in jail somewhere.',
          'Somewhere out there, I have a child who doesn\'t know me. I\'m making the world better for him or her.',
          'I come from a noble family, and one day I\'ll reclaim my lands and title from those who stole them from me.',
          'A powerful person killed someone I love. Some day soon, I\'ll have my revenge.',
          'I swindled and ruined a person who didn\'t deserve it. I seek to atone for my misdeeds but might never be able to forgive myself.',
          'I\'m trying to pay off an old debt I owe to a generous benefactor.',
          'I\'ll do anything to protect the temple where I served.'
        ]
      },
      flaws: {
        d8: [
          'I can\'t resist a pretty face.',
          'I\'m always in debt. I spend my ill-gotten gains on decadent luxuries faster than I bring them in.',
          'I\'m convinced that no one could ever fool me the way I fool others.',
          'I\'m too greedy for my own good. I can\'t resist taking a risk if there\'s money involved.',
          'I can\'t resist swindling people who are more powerful than me.',
          'I hate to admit it and will hate myself for it, but I\'ll run and preserve my own hide if the going gets tough.',
          'When I see something valuable, I can\'t think about anything but how to steal it.',
          'An innocent person is in prison for a crime that I committed. I\'m okay with that.'
        ]
      }
    }
  },
  entertainer: {
    name: 'entertainer',
    description: 'You thrive in front of an audience. You know how to entrance them, entertain them, and even inspire them. Your poetics can stir the hearts of those who hear you, awakening grief or joy, laughter or anger.',
    skillProficiencies: ['Acrobatics', 'Performance'],
    toolProficiencies: ['Disguise kit', 'One type of musical instrument'],
    equipment: {
      mandatory: [
        'A musical instrument (one of your choice)',
        'The favor of an admirer (love letter, lock of hair, or trinket)',
        'A costume',
      ],
      currency: {
        gold: 15
      }
    },
    feature: {
      name: 'By Popular Demand',
      description: 'You can always find a place to perform, usually in an inn or tavern but possibly with a circus, at a theater, or even in a noble\'s court. At such a place, you receive free lodging and food of a modest or comfortable standard (depending on the quality of the establishment), as long as you perform each night. In addition, your performance makes you something of a local figure. When strangers recognize you in a town where you have performed, they typically take a liking to you.',
      mechanics: 'Free lodging and food at establishments where you perform'
    },
    characteristics: {
      personalityTraits: {
        d8: [
          'I know a story relevant to almost every situation.',
          'Whenever I come to a new place, I collect local rumors and spread gossip.',
          'I\'m a hopeless romantic, always searching for that "special someone."',
          'Nobody stays angry at me or around me for long, since I can defuse any amount of tension.',
          'I love a good insult, even one directed at me.',
          'I get bitter if I\'m not the center of attention.',
          'I\'ll settle for nothing less than perfection.',
          'I change my mood or my mind as quickly as I change key in a song.'
        ]
      },
      ideals: {
        d6: [
          {
            name: 'Beauty',
            description: 'When I perform, I make the world better than it was.',
            alignment: 'Good'
          },
          {
            name: 'Tradition',
            description: 'The stories, legends, and songs of the past must never be forgotten, for they teach us who we are.',
            alignment: 'Lawful'
          },
          {
            name: 'Creativity',
            description: 'The world is in need of new ideas and bold action.',
            alignment: 'Chaotic'
          },
          {
            name: 'Greed',
            description: 'I\'m only in it for the money and fame.',
            alignment: 'Evil'
          },
          {
            name: 'People',
            description: 'I like seeing the smiles on people\'s faces when I perform. That\'s all that matters.',
            alignment: 'Neutral'
          },
          {
            name: 'Honesty',
            description: 'Art should reflect the soul; it should come from within and reveal who we really are.',
            alignment: 'Any'
          }
        ]
      },
      bonds: {
        d8: [
          'My instrument is my most treasured possession, and it reminds me of someone I love.',
          'Someone stole my precious instrument, and someday I\'ll get it back.',
          'I want to be famous, whatever it takes.',
          'I seek to prove myself worthy of the love of someone who is beyond my social station.',
          'I will do anything to prove myself superior to my hated rival.',
          'I would do anything for the other members of my old troupe.',
          'I have a family, but I have no idea where they are. One day, I hope to see them again.',
          'I trained under a master who taught me everything I know, but who was also a tyrant.'
        ]
      },
      flaws: {
        d8: [
          'I\'ll do anything to win fame and renown.',
          'I\'m a sucker for a pretty face.',
          'A scandal prevents me from ever going home again. That kind of trouble seems to follow me around.',
          'I once satirized a noble who still wants my head. It was a mistake that I will likely repeat.',
          'I have trouble keeping my true feelings hidden. My sharp tongue lands me in trouble.',
          'Despite my best efforts, I am unreliable to my friends.',
          'I can\'t resist praising the beauty of something, especially with excessive detail.',
          'I can\'t help but pocket loose coins and other trinkets I come across.'
        ]
      }
    },
    variants: [
      {
        name: 'Gladiator',
        description: 'A gladiator is as much an entertainer as any minstrel or circus performer, trained to make the arts of combat into a spectacle the crowd can enjoy.',
        changes: {
          description: 'You are a gladiator who thrives in the arena, entertaining crowds with displays of martial prowess.',
          feature: {
            name: 'By Popular Demand (Gladiator)',
            description: 'As a gladiator, you can find a place to perform in any place that features combat for entertainment—perhaps a gladiatorial arena or secret pit fighting club. At such a place, you receive free lodging and food of a modest or comfortable standard (depending on the quality of the establishment), as long as you perform each night. Additionally, your bloody performances make you something of a local figure, and strangers typically recognize you in a town where you have performed, usually taking a liking to you.',
            mechanics: 'Free lodging and food at establishments where you can perform combat exhibitions'
          }
        }
      }
    ]
  },
  folkhero: {
    name: 'folkhero',
    description: 'You come from a humble social rank, but you are destined for so much more. Already the people of your home village regard you as their champion, and your destiny calls you to stand against the tyrants and monsters that threaten the common folk everywhere.',
    skillProficiencies: ['Animal Handling', 'Survival'],
    toolProficiencies: ['One type of artisan\'s tools', 'Vehicles (land)'],
    equipment: {
      mandatory: [
        'A set of artisan\'s tools (one of your choice)',
        'A shovel',
        'An iron pot',
        'A set of common clothes',
      ],
      currency: {
        gold: 10
      }
    },
    feature: {
      name: 'Rustic Hospitality',
      description: 'Since you come from the ranks of the common folk, you fit in among them with ease. You can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you, though they will not risk their lives for you.',
      mechanics: 'Find shelter among common folk who will hide you from the law or those searching for you'
    },
    characteristics: {
      personalityTraits: {
        d8: [
          'I judge people by their actions, not their words.',
          'If someone is in trouble, I\'m always ready to lend help.',
          'When I set my mind to something, I follow through no matter what gets in my way.',
          'I have a strong sense of fair play and always try to find the most equitable solution to arguments.',
          'I\'m confident in my own abilities and do what I can to instill confidence in others.',
          'Thinking is for other people. I prefer action.',
          'I misuse long words in an attempt to sound smarter.',
          'I get bored easily. When am I going to get on with my destiny?'
        ]
      },
      ideals: {
        d6: [
          {
            name: 'Respect',
            description: 'People deserve to be treated with dignity and respect.',
            alignment: 'Good'
          },
          {
            name: 'Fairness',
            description: 'No one should get preferential treatment before the law, and no one is above the law.',
            alignment: 'Lawful'
          },
          {
            name: 'Freedom',
            description: 'Tyrants must not be allowed to oppress the people.',
            alignment: 'Chaotic'
          },
          {
            name: 'Might',
            description: 'If I become strong, I can take what I want—what I deserve.',
            alignment: 'Evil'
          },
          {
            name: 'Sincerity',
            description: 'There\'s no good in pretending to be something I\'m not.',
            alignment: 'Neutral'
          },
          {
            name: 'Destiny',
            description: 'Nothing and no one can steer me away from my higher calling.',
            alignment: 'Any'
          }
        ]
      },
      bonds: {
        d8: [
          'I have a family, but I have no idea where they are. One day, I hope to see them again.',
          'I worked the land, I love the land, and I will protect the land.',
          'A proud noble once gave me a horrible beating, and I will take my revenge on any bully I encounter.',
          'My tools are symbols of my past life, and I carry them so that I will never forget my roots.',
          'I protect those who cannot protect themselves.',
          'I wish my childhood sweetheart had come with me to pursue my destiny.',
          'The tyrant who rules my land will stop at nothing to see me killed.',
          'I have an ancient text that holds terrible secrets that must not fall into the wrong hands.'
        ]
      },
      flaws: {
        d8: [
          'The tyrant who rules my land will stop at nothing to see me killed.',
          'I\'m convinced of the significance of my destiny, and blind to my shortcomings and the risk of failure.',
          'The people who knew me when I was young know my shameful secret, so I can never go home again.',
          'I have a weakness for the vices of the city, especially hard drink.',
          'Secretly, I believe that things would be better if I were a tyrant lording over the land.',
          'I have trouble trusting in my allies.',
          'I\'ll do anything to protect those who are weaker than I am.',
          'I can\'t resist helping people in need, even when it causes me harm.'
        ]
      }
    }
  },
  guildartisan: {
    name: 'guildartisan',
    description: 'You are a member of an artisan\'s guild, skilled in a particular field and closely associated with other artisans. You are a well-established part of the mercantile world, freed by talent and wealth from the constraints of a feudal social order.',
    skillProficiencies: ['Insight', 'Persuasion'],
    toolProficiencies: ['One type of artisan\'s tools'],
    languageCount: 1,
    equipment: {
      mandatory: [
        'A set of artisan\'s tools (one of your choice)',
        'A letter of introduction from your guild',
        'A set of traveler\'s clothes',
      ],
      currency: {
        gold: 15
      }
    },
    feature: {
      name: 'Guild Membership',
      description: 'As an established and respected member of a guild, you can rely on certain benefits that membership provides. Your fellow guild members will provide you with lodging and food if necessary, and pay for your funeral if needed. In some cities and towns, a guildhall offers a central place to meet other members of your profession and those who aid the guild\'s work. Guilds often wield tremendous political power. If you are accused of a crime, your guild will support you if a good case can be made for your innocence or the crime is justifiable. You can also gain access to powerful political figures through the guild, if you are a member in good standing.',
      mechanics: 'Access to guild resources, political support, and lodging assistance'
    },
    characteristics: {
      personalityTraits: {
        d8: [
          'I believe that anything worth doing is worth doing right. I can\'t help it—I\'m a perfectionist.',
          'I\'m a snob who looks down on those who can\'t appreciate fine art.',
          'I always want to know how things work and what makes people tick.',
          'I\'m full of witty aphorisms and have a proverb for every occasion.',
          'I\'m rude to people who lack my commitment to hard work and fair play.',
          'I like to talk at length about my profession.',
          'I don\'t part with my money easily and will haggle tirelessly to get the best deal possible.',
          'I\'m well known for my work, and I want to make sure everyone appreciates it. I\'m always taken aback when people haven\'t heard of me.'
        ]
      },
      ideals: {
        d6: [
          {
            name: 'Community',
            description: 'It is the duty of all civilized people to strengthen the bonds of community and the security of civilization.',
            alignment: 'Lawful'
          },
          {
            name: 'Generosity',
            description: 'My talents were given to me so that I could use them to benefit the world.',
            alignment: 'Good'
          },
          {
            name: 'Freedom',
            description: 'Everyone should be free to pursue his or her own livelihood.',
            alignment: 'Chaotic'
          },
          {
            name: 'Greed',
            description: 'I\'m only in it for the money.',
            alignment: 'Evil'
          },
          {
            name: 'People',
            description: 'I\'m committed to the people I care about, not to ideals.',
            alignment: 'Neutral'
          },
          {
            name: 'Aspiration',
            description: 'I work hard to be the best there is at my craft.',
            alignment: 'Any'
          }
        ]
      },
      bonds: {
        d8: [
          'The workshop where I learned my trade is the most important place in the world to me.',
          'I created a great work for someone, and then found them unworthy to receive it. I\'m still looking for someone worthy.',
          'I owe my guild a great debt for forging me into the person I am today.',
          'I pursue wealth to secure someone\'s love.',
          'One day I will return to my guild and prove that I am the greatest artisan of them all.',
          'I will get revenge on the evil forces that destroyed my place of business and ruined my livelihood.',
          'I seek to craft items of legendary power to preserve my legacy.',
          'My tools are symbols of my past life, and I carry them so that I will never forget my roots.'
        ]
      },
      flaws: {
        d8: [
          'I\'ll do anything to get my hands on something rare or priceless.',
          'I\'m quick to assume that someone is trying to cheat me.',
          'No one must ever learn that I once stole money from guild coffers.',
          'I\'m never satisfied with what I have—I always want more.',
          'I would kill to acquire a noble title.',
          'I\'m horribly jealous of anyone who can outshine my handiwork. Everywhere I go, I\'m surrounded by rivals.',
          'I am obsessed with how people see my work. I need to be respected at all costs.',
          'Despite my best efforts, I am unreliable to my friends.'
        ]
      }
    },
    variants: [
      {
        name: 'Guild Merchant',
        description: 'Instead of an artisan\'s guild, you might belong to a guild of traders, caravan masters, or shopkeepers.',
        changes: {
          description: 'You are a member of a merchant\'s guild, trading goods for a tidy profit and establishing your financial influence within the community.',
          toolProficiencies: ['Navigator\'s tools'],
          feature: {
            name: 'Guild Membership (Merchant)',
            description: 'As a member of a merchant guild, you have access to trading posts, markets, and guild halls throughout the realm. Your guild connections provide you with goods at favorable prices, information about market trends, and assistance when trading in new territories.',
            mechanics: 'Access to merchant guild resources, trade connections, and favorable pricing'
          }
        }
      }
    ]
  },
  hermit: {
    name: 'hermit',
    description: 'You lived in seclusion—either in a sheltered community such as a monastery, or entirely alone—for a formative part of your life. In your time apart from the clamor of society, you found quiet, solitude, and perhaps some of the answers you were looking for.',
    skillProficiencies: ['Medicine', 'Religion'],
    toolProficiencies: ['Herbalism kit'],
    languageCount: 1,
    equipment: {
      mandatory: [
        'A scroll case stuffed full of notes from your studies or prayers',
        'A winter blanket',
        'A set of common clothes',
        'An herbalism kit'
      ],
      currency: {
        gold: 5
      }
    },
    feature: {
      name: 'Discovery',
      description: 'The quiet seclusion of your extended hermitage gave you access to a unique and powerful discovery. The exact nature of this revelation depends on the nature of your seclusion. It might be a great truth about the cosmos, the deities, the powerful beings of the outer planes, or the forces of nature. It could be a site that no one else has ever seen. You might have uncovered a fact that has long been forgotten, or unearthed some relic of the past that could rewrite history.',
      mechanics: 'Access to a unique and powerful piece of knowledge or discovery'
    },
    characteristics: {
      personalityTraits: {
        d8: [
          'I\'ve been isolated for so long that I rarely speak, preferring gestures and the occasional grunt.',
          'I am utterly serene, even in the face of disaster.',
          'The leader of my community had something wise to say on every topic, and I am eager to share that wisdom.',
          'I feel tremendous empathy for all who suffer.',
          'I\'m oblivious to etiquette and social expectations.',
          'I connect everything that happens to me to a grand, cosmic plan.',
          'I often get lost in my own thoughts and contemplation, becoming oblivious to my surroundings.',
          'I am working on a grand philosophical theory and love sharing my ideas.'
        ]
      },
      ideals: {
        d6: [
          {
            name: 'Greater Good',
            description: 'My gifts are meant to be shared with all, not used for my own benefit.',
            alignment: 'Good'
          },
          {
            name: 'Logic',
            description: 'Emotions must not cloud our sense of what is right and true, or our logical thinking.',
            alignment: 'Lawful'
          },
          {
            name: 'Free Thinking',
            description: 'Inquiry and curiosity are the pillars of progress.',
            alignment: 'Chaotic'
          },
          {
            name: 'Power',
            description: 'Solitude and contemplation are paths toward mystical or magical power.',
            alignment: 'Evil'
          },
          {
            name: 'Live and Let Live',
            description: 'Meddling in the affairs of others only causes trouble.',
            alignment: 'Neutral'
          },
          {
            name: 'Self-Knowledge',
            description: 'If you know yourself, there\'s nothing left to know.',
            alignment: 'Any'
          }
        ]
      },
      bonds: {
        d8: [
          'Nothing is more important than the other members of my hermitage, order, or association.',
          'I entered seclusion to hide from the ones who might still be hunting me. I must someday confront them.',
          'I\'m still seeking the enlightenment I pursued in my seclusion, and it still eludes me.',
          'I entered seclusion because I loved someone I could not have.',
          'Should my discovery come to light, it could bring ruin to the world.',
          'My isolation gave me great insight into a great evil that only I can destroy.',
          'I will face any challenge to win the approval of my mentor.',
          'Now that I\'ve returned to the world, I enjoy its delights a little too much.'
        ]
      },
      flaws: {
        d8: [
          'Now that I\'ve returned to the world, I enjoy its delights a little too much.',
          'I harbor dark, bloodthirsty thoughts that my isolation and meditation failed to quell.',
          'I am dogmatic in my thoughts and philosophy.',
          'I let my need to win arguments overshadow friendships and harmony.',
          'I\'d risk too much to uncover a lost bit of knowledge.',
          'I like keeping secrets and won\'t share them with anyone.',
          'I am suspicious of strangers and expect the worst of them.',
          'I speak without really thinking through my words, invariably insulting others.'
        ]
      }
    }
  },
  noble: {
    name: 'noble',
    description: 'You understand wealth, power, and privilege. You carry a noble title, and your family owns land, collects taxes, and wields significant political influence. You might be a pampered aristocrat unfamiliar with work or discomfort, a former merchant just elevated to the nobility, or a disinherited scoundrel with a disproportionate sense of entitlement.',
    skillProficiencies: ['History', 'Persuasion'],
    toolProficiencies: ['One type of gaming set'],
    languageCount: 1,
    equipment: {
      mandatory: [
        'A set of fine clothes',
        'A signet ring',
        'A scroll of pedigree',
        'A purse'
      ],
      currency: {
        gold: 25
      }
    },
    feature: {
      name: 'Position of Privilege',
      description: 'Thanks to your noble birth, people are inclined to think the best of you. You are welcome in high society, and people assume you have the right to be wherever you are. The common folk make every effort to accommodate you and avoid your displeasure, and other people of high birth treat you as a member of the same social sphere. You can secure an audience with a local noble if you need to.',
      mechanics: 'Access to high society and preferential treatment'
    },
    characteristics: {
      personalityTraits: {
        d8: [
          'My eloquent flattery makes everyone I talk to feel like the most wonderful and important person in the world.',
          'The common folk love me for my kindness and generosity.',
          'No one could doubt by looking at my regal bearing that I am a cut above the unwashed masses.',
          'I take great pains to always look my best and follow the latest fashions.',
          'I don\'t like to get my hands dirty, and I won\'t be caught dead in unsuitable accommodations.',
          'Despite my noble birth, I do not place myself above other folk. We all have the same blood.',
          'My favor, once lost, is lost forever.',
          'If you do me an injury, I will crush you, ruin your name, and salt your fields.'
        ]
      },
      ideals: {
        d6: [
          {
            name: 'Respect',
            description: 'Respect is due to me because of my position, but all people regardless of station deserve to be treated with dignity.',
            alignment: 'Good'
          },
          {
            name: 'Responsibility',
            description: 'It is my duty to respect the authority of those above me, just as those below me must respect mine.',
            alignment: 'Lawful'
          },
          {
            name: 'Independence',
            description: 'I must prove that I can handle myself without the coddling of my family.',
            alignment: 'Chaotic'
          },
          {
            name: 'Power',
            description: 'If I can attain more power, no one will tell me what to do.',
            alignment: 'Evil'
          },
          {
            name: 'Family',
            description: 'Blood runs thicker than water.',
            alignment: 'Any'
          },
          {
            name: 'Noble Obligation',
            description: 'It is my duty to protect and care for the people beneath me.',
            alignment: 'Good'
          }
        ]
      },
      bonds: {
        d8: [
          'I will face any challenge to win the approval of my family.',
          'My house\'s alliance with another noble family must be sustained at all costs.',
          'Nothing is more important than the other members of my family.',
          'I am in love with the heir of a family that my family despises.',
          'My loyalty to my sovereign is unwavering.',
          'The common folk must see me as a hero of the people.',
          'I seek to bring honor to my family name.',
          'I must be worthy of the noble title that I have inherited.'
        ]
      },
      flaws: {
        d8: [
          'I secretly believe that everyone is beneath me.',
          'I hide a truly scandalous secret that could ruin my family forever.',
          'I too often hear veiled insults and threats in every word addressed to me, and I\'m quick to anger.',
          'I have an insatiable desire for carnal pleasures.',
          'In fact, the world does revolve around me.',
          'By my words and actions, I often bring shame to my family.',
          'I am overly suspicious of those not of my station, believing they always intend to rob or deceive me.',
          'Once someone questions my courage, I never back down no matter how dangerous the situation.'
        ]
      }
    },
    variants: [
      {
        name: 'Knight',
        description: 'You understand wealth, privilege, and obligation. You have been granted a noble title by the ruler who expects service in return.',
        changes: {
          description: 'As a knight, you have been granted a noble title and serve a sovereign, religious order, or noble family. Your title comes with military responsibilities and expectations of service.',
          feature: {
            name: 'Retainers',
            description: 'You have the service of three retainers loyal to your family. These retainers can be attendants or messengers, and one might be a majordomo. Your retainers are commoners who can perform mundane tasks for you, but they do not fight for you, will not follow you into obviously dangerous areas (such as dungeons), and will leave if they are frequently endangered or abused.',
            mechanics: 'Three loyal retainers who serve you'
          }
        }
      }
    ]
  },
  outlander: {
    name: 'outlander',
    description: 'You grew up in the wilds, far from civilization and the comforts of town and technology. You\'ve witnessed the migration of herds larger than forests, survived weather more extreme than any city-dweller could comprehend, and enjoyed the solitude of being the only thinking creature for miles in any direction.',
    skillProficiencies: ['Athletics', 'Survival'],
    toolProficiencies: ['One type of musical instrument'],
    languageCount: 1,
    equipment: {
      mandatory: [
        'A staff',
        'A hunting trap',
        'A trophy from an animal you killed',
        'A set of traveler\'s clothes',
      ],
      currency: {
        gold: 10
      }
    },
    feature: {
      name: 'Wanderer',
      description: 'You have an excellent memory for maps and geography, and you can always recall the general layout of terrain, settlements, and other features around you. In addition, you can find food and fresh water for yourself and up to five other people each day, provided that the land offers berries, small game, water, and so forth.',
      mechanics: 'Excellent memory for geography and ability to find food and water'
    },
    characteristics: {
      personalityTraits: {
        d8: [
          'I\'m driven by a wanderlust that led me away from home.',
          'I watch over my friends as if they were a litter of newborn pups.',
          'I once ran twenty-five miles without stopping to warn my clan of an approaching orc horde. I\'d do it again if I had to.',
          'I have a lesson for every situation, drawn from observing nature.',
          'I place no stock in wealthy or well-mannered folk. Money and manners won\'t save you from a hungry owlbear.',
          'I\'m always picking things up, absently fiddling with them, and sometimes accidentally breaking them.',
          'I feel far more comfortable around animals than people.',
          'I was, in fact, raised by wolves.'
        ]
      },
      ideals: {
        d6: [
          {
            name: 'Change',
            description: 'Life is like the seasons, in constant change, and we must change with it.',
            alignment: 'Chaotic'
          },
          {
            name: 'Greater Good',
            description: 'It is each person\'s responsibility to make the most happiness for the whole tribe.',
            alignment: 'Good'
          },
          {
            name: 'Honor',
            description: 'If I dishonor myself, I dishonor my whole clan.',
            alignment: 'Lawful'
          },
          {
            name: 'Might',
            description: 'The strongest are meant to rule.',
            alignment: 'Evil'
          },
          {
            name: 'Nature',
            description: 'The natural world is more important than all the constructs of civilization.',
            alignment: 'Neutral'
          },
          {
            name: 'Glory',
            description: 'I must earn glory in battle, for myself and my clan.',
            alignment: 'Any'
          }
        ]
      },
      bonds: {
        d8: [
          'My family, clan, or tribe is the most important thing in my life, even when they are far from me.',
          'An injury to the unspoiled wilderness of my home is an injury to me.',
          'I will bring terrible wrath down on the evildoers who destroyed my homeland.',
          'I am the last of my tribe, and it is up to me to ensure their names enter legend.',
          'I suffer awful visions of a coming disaster and will do anything to prevent it.',
          'It is my duty to provide children to sustain my tribe.',
          'My tribe was scattered following a great catastrophe. The survivors must be found and reunited.',
          'I feel a spiritual connection to a specific place in nature, and frequently return there.'
        ]
      },
      flaws: {
        d8: [
          'I am too enamored of ale, wine, and other intoxicants.',
          'There\'s no room for caution in a life lived to the fullest.',
          'I remember every insult I\'ve received and nurse a silent resentment toward anyone who\'s ever wronged me.',
          'I am slow to trust members of other races, tribes, and societies.',
          'Violence is my answer to almost any challenge.',
          'Don\'t expect me to save those who can\'t save themselves. It is nature\'s way that the strong thrive and the weak perish.',
          'I have a weakness for the wildness of nature and dislike being in towns or cities for more than a day or two.',
          'A severe wanderlust frequently leads me to distraction.'
        ]
      }
    }
  },
  sage: {
    name: 'sage',
    description: 'You spent years learning the lore of the multiverse. You scoured manuscripts, studied scrolls, and listened to the greatest experts on the subjects that interest you. Your efforts have made you a master in your fields of study.',
    skillProficiencies: ['Arcana', 'History'],
    languageCount: 2,
    equipment: {
      mandatory: [
        'A bottle of black ink',
        'A quill',
        'A small knife',
        'A letter from a dead colleague posing a question you have not yet been able to answer',
        'A set of common clothes',
      ],
      currency: {
        gold: 10
      }
    },
    feature: {
      name: 'Researcher',
      description: 'When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it. Usually, this information comes from a library, scriptorium, university, or a sage or other learned person or creature. Your DM might rule that the knowledge you seek is secreted away in an almost inaccessible place, or that it simply cannot be found. Unearthing the deepest secrets of the multiverse can require an adventure or even a whole campaign.',
      mechanics: 'Knowledge of where to find information you don\'t know'
    },
    characteristics: {
      personalityTraits: {
        d8: [
          'I use polysyllabic words that convey the impression of great erudition.',
          'I\'ve read every book in the world\'s greatest libraries—or I like to boast that I have.',
          'I\'m used to helping out those who aren\'t as smart as I am, and I patiently explain anything and everything to others.',
          'There\'s nothing I like more than a good mystery.',
          'I\'m willing to listen to every side of an argument before I make my own judgment.',
          'I... speak... slowly... when talking... to idiots,... which... almost... everyone... is... compared... to me.',
          'I am horribly, horribly awkward in social situations.',
          'I\'m convinced that people are always trying to steal my secrets.'
        ]
      },
      ideals: {
        d6: [
          {
            name: 'Knowledge',
            description: 'The path to power and self-improvement is through knowledge.',
            alignment: 'Neutral'
          },
          {
            name: 'Beauty',
            description: 'What is beautiful points us beyond itself toward what is true.',
            alignment: 'Good'
          },
          {
            name: 'Logic',
            description: 'Emotions must not cloud our logical thinking.',
            alignment: 'Lawful'
          },
          {
            name: 'No Limits',
            description: 'Nothing should fetter the infinite possibility inherent in all existence.',
            alignment: 'Chaotic'
          },
          {
            name: 'Power',
            description: 'Knowledge is the path to power and domination.',
            alignment: 'Evil'
          },
          {
            name: 'Self-Improvement',
            description: 'The goal of a life of study is the betterment of oneself.',
            alignment: 'Any'
          }
        ]
      },
      bonds: {
        d8: [
          'It is my duty to protect my students.',
          'I have an ancient text that holds terrible secrets that must not fall into the wrong hands.',
          'I work to preserve a library, university, scriptorium, or monastery.',
          'My life\'s work is a series of tomes related to a specific field of lore.',
          'I\'ve been searching my whole life for the answer to a certain question.',
          'I sold my soul for knowledge. I hope to do great deeds and win it back.',
          'I seek to uncover the secrets of a long-lost civilization.',
          'I have a rival who will stop at nothing to discredit my research and discoveries.'
        ]
      },
      flaws: {
        d8: [
          'I am easily distracted by the promise of information.',
          'Most people scream and run when they see a demon. I stop and take notes on its anatomy.',
          'Unlocking an ancient mystery is worth the price of a civilization.',
          'I overlook obvious solutions in favor of complicated ones.',
          'I speak without really thinking through my words, invariably insulting others.',
          'I can\'t keep a secret to save my life, or anyone else\'s.',
          'I am dogmatic in my thoughts and philosophy.',
          'I let my need to win arguments overshadow friendships and harmony.'
        ]
      }
    }
  },
  sailor: {
    name: 'sailor',
    description: 'You sailed on a seagoing vessel for years. In that time, you faced down mighty storms, monsters of the deep, and those who wanted to sink your craft to the bottomless depths. Your first love is the distant line of the horizon, but the time has come to try your hand at something new.',
    skillProficiencies: ['Athletics', 'Perception'],
    toolProficiencies: ['Navigator\'s tools', 'Vehicles (water)'],
    equipment: {
      mandatory: [
        'A belaying pin (club)',
        '50 feet of silk rope',
        'A lucky charm such as a rabbit foot or a small stone with a hole in the center',
        'A set of common clothes',
      ],
      currency: {
        gold: 10
      }
    },
    feature: {
      name: 'Ship\'s Passage',
      description: 'When you need to, you can secure free passage on a sailing ship for yourself and your adventuring companions. You might sail on the ship you served on, or another ship you have good relations with (perhaps one captained by a former crewmate). Because you\'re calling in a favor, you can\'t be certain of a schedule or route that will meet your every need. Your Dungeon Master will determine how long it takes to get where you need to go. In return for your free passage, you and your companions are expected to assist the crew during the voyage.',
      mechanics: 'Free passage on sailing ships for you and your companions'
    },
    characteristics: {
      personalityTraits: {
        d8: [
          'My friends know they can rely on me, no matter what.',
          'I work hard so that I can play hard when the work is done.',
          'I enjoy sailing into new ports and making new friends over a flagon of ale.',
          'I stretch the truth for the sake of a good story.',
          'To me, a tavern brawl is a nice way to get to know a new city.',
          'I never pass up a friendly wager.',
          'My language is as foul as an otyugh nest.',
          'I like a job well done, especially if I can convince someone else to do it.'
        ]
      },
      ideals: {
        d6: [
          {
            name: 'Respect',
            description: 'The thing that keeps a ship together is mutual respect between captain and crew.',
            alignment: 'Good'
          },
          {
            name: 'Fairness',
            description: 'We all do the work, so we all share in the rewards.',
            alignment: 'Lawful'
          },
          {
            name: 'Freedom',
            description: 'The sea is freedom—the freedom to go anywhere and do anything.',
            alignment: 'Chaotic'
          },
          {
            name: 'Mastery',
            description: 'I\'m a predator, and the other ships on the sea are my prey.',
            alignment: 'Evil'
          },
          {
            name: 'People',
            description: 'I\'m committed to my crewmates, not to ideals.',
            alignment: 'Neutral'
          },
          {
            name: 'Aspiration',
            description: 'Someday I\'ll own my own ship and chart my own destiny.',
            alignment: 'Any'
          }
        ]
      },
      bonds: {
        d8: [
          'I\'m loyal to my captain first, everything else second.',
          'The ship is most important—crewmates and captains come and go.',
          'I\'ll always remember my first ship.',
          'In a harbor town, I have a paramour whose eyes nearly stole me from the sea.',
          'I was cheated out of my fair share of the profits, and I want to get my due.',
          'Ruthless pirates murdered my captain and crewmates, plundered our ship, and left me to die. Vengeance will be mine.',
          'I lost everything to the sea once, and I will never let it happen again.',
          'The sea is my home, and I\'ll defend it against all threats.'
        ]
      },
      flaws: {
        d8: [
          'I follow orders, even if I think they\'re wrong.',
          'I\'ll say anything to avoid having to do extra work.',
          'Once someone questions my courage, I never back down no matter how dangerous the situation.',
          'Once I start drinking, it\'s hard for me to stop.',
          'I can\'t help but pocket loose coins and other trinkets I come across.',
          'My pride will probably lead to my destruction.',
          'I have a weakness for the vices of the city, especially hard drink.',
          'I stretch the truth for the sake of a good story.'
        ]
      }
    },
    variants: [
      {
        name: 'Pirate',
        description: 'You spent your youth under the sway of a dread pirate, a ruthless cutthroat who taught you how to survive in a world of sharks and savages.',
        changes: {
          description: 'You sailed the seas as a pirate, raiding ships and coastal towns for treasure and glory.',
          feature: {
            name: 'Bad Reputation',
            description: 'No matter where you go, people are afraid of you due to your reputation. When you are in a civilized settlement, you can get away with minor criminal offenses, such as refusing to pay for food at a tavern or breaking down doors at a local shop, since most people will not report your activity to the authorities.',
            mechanics: 'Intimidating reputation that allows you to get away with minor crimes'
          }
        }
      }
    ]
  },
  soldier: {
    // ... existing code ...
  },
  urchin: {
    name: 'urchin',
    description: 'You grew up on the streets alone, orphaned, and poor. You had no one to watch over you or to provide for you, so you learned to provide for yourself. You fought fiercely over food and kept a constant watch out for other desperate souls who might steal from you. You slept on rooftops and in alleyways, exposed to the elements, and endured sickness without the advantage of medicine or a place to recuperate. You\'ve survived despite all odds, and did so through cunning, strength, speed, or some combination of each.',
    skillProficiencies: ['Sleight of Hand', 'Stealth'],
    toolProficiencies: ['Disguise kit', 'Thieves\' tools'],
    equipment: {
      mandatory: [
        'A small knife',
        'A map of the city you grew up in',
        'A pet mouse',
        'A token to remember your parents by',
        'A set of common clothes',
      ],
      currency: {
        gold: 10
      }
    },
    feature: {
      name: 'City Secrets',
      description: 'You know the secret patterns and flow to cities and can find passages through the urban sprawl that others would miss. When you are not in combat, you (and companions you lead) can travel between any two locations in the city twice as fast as your speed would normally allow.',
      mechanics: 'Ability to navigate urban environments twice as fast'
    },
    characteristics: {
      personalityTraits: {
        d8: [
          'I hide scraps of food and trinkets away in my pockets.',
          'I ask a lot of questions.',
          'I like to squeeze into small places where no one else can get to me.',
          'I sleep with my back to a wall or tree, with everything I own wrapped in a bundle in my arms.',
          'I eat like a pig and have bad manners.',
          'I think anyone who\'s nice to me is hiding evil intent.',
          'I don\'t like to bathe.',
          'I bluntly say what other people are hinting at or hiding.'
        ]
      },
      ideals: {
        d6: [
          {
            name: 'Respect',
            description: 'All people, rich or poor, deserve respect.',
            alignment: 'Good'
          },
          {
            name: 'Community',
            description: 'We have to take care of each other, because no one else is going to do it.',
            alignment: 'Lawful'
          },
          {
            name: 'Change',
            description: 'The low are lifted up, and the high and mighty are brought down. Change is the nature of things.',
            alignment: 'Chaotic'
          },
          {
            name: 'Retribution',
            description: 'The rich need to be shown what life and death are like in the gutters.',
            alignment: 'Evil'
          },
          {
            name: 'People',
            description: 'I help the people who help me—that\'s what keeps us alive.',
            alignment: 'Neutral'
          },
          {
            name: 'Aspiration',
            description: 'I\'m going to prove that I\'m worthy of a better life.',
            alignment: 'Any'
          }
        ]
      },
      bonds: {
        d8: [
          'My town or city is my home, and I\'ll fight to defend it.',
          'I sponsor an orphanage to keep others from enduring what I was forced to endure.',
          'I owe my survival to another urchin who taught me to live on the streets.',
          'I owe a debt I can never repay to the person who took pity on me.',
          'I escaped my life of poverty by robbing an important person, and I\'m wanted for it.',
          'No one else should have to endure the hardships I\'ve been through.',
          'I have a sibling or close friend who depends on me for support.',
          'I return to my old neighborhood regularly to help those still trapped in poverty.'
        ]
      },
      flaws: {
        d8: [
          'If I\'m outnumbered, I will run away from a fight.',
          'Gold seems like a lot of money to me, and I\'ll do just about anything for more of it.',
          'I will never fully trust anyone other than myself.',
          'I\'d rather kill someone in their sleep than fight fair.',
          'It\'s not stealing if I need it more than someone else.',
          'People who can\'t take care of themselves get what they deserve.',
          'I can\'t resist taking a risk if there\'s money involved.',
          'I can\'t help but pocket loose coins and other trinkets I come across.'
        ]
      }
    }
  }
  // Additional backgrounds would be added here...
};