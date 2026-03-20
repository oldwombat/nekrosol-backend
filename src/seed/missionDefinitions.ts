/**
 * missionDefinitions.ts — seed data for the 7 core missions.
 *
 * All missions are data-driven and executed by src/lib/mission-engine.ts.
 *
 * costs:                  Cost[]
 * requirements:           Requirement[]
 * visibilityRequirements: Requirement[] | null (null = always visible)
 * rewards:                Reward[]
 *
 * For SPD-1, MED-1: restore to max uses a large stat_delta capped by the engine.
 * For RAD-X: direct stat_delta on radiation.
 */

export interface MissionDefinition {
  slug: string
  name: string
  description: string
  category: 'combat' | 'scavenging' | 'social' | 'criminal' | 'tech'
  primarySkill: string
  tier: number
  isActive: boolean
  costs: object[]
  requirements: object[]
  visibilityRequirements: object[] | null
  rewards: object[]
  npcSlug: string
  npcName: string
  availabilityMessage: string
  completionMessage: string
}

export const missionDefinitions: MissionDefinition[] = [
  {
    slug: 'beg',
    name: 'Beg for Credits',
    description:
      'Swallow your pride and work the street corner. Spare change adds up. Eventually.',
    category: 'social',
    primarySkill: 'grifter',
    tier: 1,
    isActive: true,
    costs: [{ type: 'energy', amount: 1 }],
    requirements: [{ type: 'stat_min', stat: 'energy', value: 1 }],
    visibilityRequirements: null,
    rewards: [{ type: 'credits', min: 1, max: 5 }],
    npcSlug: 'sal',
    npcName: 'Sal',
    availabilityMessage:
      "Everyone starts somewhere. The street corner is yours if you want it — won't make you rich but it'll keep the lights on.",
    completionMessage:
      "Credits are credits. Don't let anyone tell you different.",
  },
  {
    slug: 'spd-1',
    name: 'Use SPD-1 Stimpak',
    description:
      'Inject a SPD-1 combat stimpak. Synthetic adrenaline floods your system — energy fully restored.',
    category: 'tech',
    primarySkill: 'medic',
    tier: 1,
    isActive: true,
    costs: [{ type: 'item', itemKey: 'SPD-1', quantity: 1 }],
    requirements: [{ type: 'item_in_inventory', itemKey: 'SPD-1', quantity: 1 }],
    visibilityRequirements: null,
    // Large delta — engine caps at energyMax automatically
    rewards: [{ type: 'stat_delta', stat: 'energy', amount: 1000 }],
    npcSlug: 'sal',
    npcName: 'Sal',
    availabilityMessage:
      "Got your hands on some SPD-1? Smart move. Use it when you need a full tank in a hurry.",
    completionMessage: 'Clean hit. Feel that? That\'s synthetic adrenaline doing its job.',
  },
  {
    slug: 'med-1',
    name: 'Use MED-1 Medpack',
    description:
      'Apply a MED-1 field medpack. Biofoam seals the wounds — health fully restored.',
    category: 'tech',
    primarySkill: 'medic',
    tier: 1,
    isActive: true,
    costs: [{ type: 'item', itemKey: 'MED-1', quantity: 1 }],
    requirements: [{ type: 'item_in_inventory', itemKey: 'MED-1', quantity: 1 }],
    visibilityRequirements: null,
    // Large delta — engine caps at healthMax automatically
    rewards: [{ type: 'stat_delta', stat: 'health', amount: 1000 }],
    npcSlug: 'sal',
    npcName: 'Sal',
    availabilityMessage:
      "MED-1 in your kit. Good. Don't wait until you're bleeding out to use it.",
    completionMessage: 'Biofoam does its thing. You\'re patched up.',
  },
  {
    slug: 'rad-x',
    name: 'Use RAD-X Treatment',
    description:
      'Administer a RAD-X chelation treatment. Reduces radiation by 10 points.',
    category: 'tech',
    primarySkill: 'chemist',
    tier: 1,
    isActive: true,
    costs: [{ type: 'item', itemKey: 'RAD-X', quantity: 1 }],
    requirements: [{ type: 'item_in_inventory', itemKey: 'RAD-X', quantity: 1 }],
    visibilityRequirements: null,
    rewards: [{ type: 'stat_delta', stat: 'radiation', amount: -10 }],
    npcSlug: 'sal',
    npcName: 'Sal',
    availabilityMessage:
      "Radiation's the slow killer out here. RAD-X in your kit means you've got options.",
    completionMessage:
      'Chelation cycle complete. Watch your exposure — that stuff adds up.',
  },
  {
    slug: 'escort',
    name: 'Escort Run',
    description:
      "Bodyguard work for a cargo convoy through the outer districts. Pays 10–20 credits. There's always a chance someone tries something.",
    category: 'combat',
    primarySkill: 'thug',
    tier: 2,
    isActive: true,
    costs: [{ type: 'energy', amount: 2 }],
    requirements: [
      { type: 'stat_min', stat: 'energy', value: 2 },
      { type: 'stat_min', stat: 'health', value: 10 },
    ],
    visibilityRequirements: null,
    rewards: [
      { type: 'credits', min: 10, max: 20 },
      { type: 'stat_chance', stat: 'health', amount: -10, probability: 0.2 },
    ],
    npcSlug: 'sal',
    npcName: 'Sal',
    availabilityMessage:
      "Convoy work. You stay close, you keep trouble away, you get paid. Simple. The convoy runs at 0200.",
    completionMessage:
      "Convoy made it. Credits hit your account. Don't spend it all at once.",
  },
  {
    slug: 'patrol',
    name: 'Patrol the Wastes',
    description:
      'Walk the outer perimeter. Radiation exposure is part of the job. Scavengers leave things behind.',
    category: 'combat',
    primarySkill: 'thug',
    tier: 2,
    isActive: true,
    costs: [{ type: 'energy', amount: 2 }],
    requirements: [{ type: 'stat_min', stat: 'energy', value: 2 }],
    visibilityRequirements: null,
    rewards: [
      { type: 'stat_delta', stat: 'radiation', amount: 5 },
      { type: 'item_chance', itemKey: 'rad-x', probability: 0.3, quantity: 1 },
    ],
    npcSlug: 'sal',
    npcName: 'Sal',
    availabilityMessage:
      "Outer perimeter needs walking. It's dirty work but the wastes give back sometimes — if you know where to look.",
    completionMessage:
      "Perimeter's clear. The wastes took their cut of you. You took yours back.",
  },
  {
    slug: 'salvage',
    name: 'Salvage Run',
    description:
      'Pick through the ruins of the old industrial district. Radiation is heavy. The components are worth it.',
    category: 'scavenging',
    primarySkill: 'scavenger',
    tier: 2,
    isActive: true,
    costs: [{ type: 'energy', amount: 3 }],
    requirements: [{ type: 'stat_min', stat: 'energy', value: 3 }],
    visibilityRequirements: null,
    rewards: [
      { type: 'stat_delta', stat: 'radiation', amount: 8 },
      { type: 'item_chance', itemKey: 'scrap-metal', probability: 0.6, quantity: 2 },
      { type: 'item_chance', itemKey: 'wire-coil', probability: 0.4, quantity: 1 },
    ],
    npcSlug: 'sal',
    npcName: 'Sal',
    availabilityMessage:
      "Industrial ruins are heavy with rads but the pickings are good. You look like someone who can take the exposure. Interested?",
    completionMessage:
      "You came back. Good. What you found is worth something — if you can find a buyer.",
  },
]
