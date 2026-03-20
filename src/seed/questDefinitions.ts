/**
 * Quest definitions — all 48 prestige quests (12 skills × 4 prestige levels).
 *
 * All quests use requirementType: 'click' for MVP.
 * Future sprints will upgrade specific quests to mission_count, item_consume,
 * stat_threshold, or puzzle types without changing this seed structure.
 */

export type QuestDefinition = {
  skill: string
  prestigeLevel: number
  title: string
  description: string
  requirementType: 'click' | 'mission_count' | 'item_consume' | 'stat_threshold' | 'puzzle'
  requirementData?: Record<string, unknown>
}

export const questDefinitions: QuestDefinition[] = [
  // ── THUG ────────────────────────────────────────────────────────────────────
  {
    skill: 'thug', prestigeLevel: 1,
    title: 'Survive the Pit',
    description: 'Every fighter has their first real test. Step into the Pit and walk out breathing. That\'s all anyone asks of a Brawler.',
    requirementType: 'click',
  },
  {
    skill: 'thug', prestigeLevel: 2,
    title: 'Iron Initiation',
    description: 'Pain is a teacher. You\'ve taken enough hits to know how to read them. Prove you can take a beating and keep swinging.',
    requirementType: 'click',
  },
  {
    skill: 'thug', prestigeLevel: 3,
    title: 'The Gauntlet',
    description: 'Run the Gauntlet — five opponents, one after the other, no rest between. Survivors get a new name.',
    requirementType: 'click',
  },
  {
    skill: 'thug', prestigeLevel: 4,
    title: 'Last One Standing',
    description: 'There is no ceremony. No referee. The Juggernaut is whoever is still upright when everyone else stops moving.',
    requirementType: 'click',
  },

  // ── THIEF ───────────────────────────────────────────────────────────────────
  {
    skill: 'thief', prestigeLevel: 1,
    title: 'Ghost Protocol',
    description: 'Get in, take what you need, leave nothing behind. Not even a shadow.',
    requirementType: 'click',
  },
  {
    skill: 'thief', prestigeLevel: 2,
    title: 'The Clean Take',
    description: 'Amateurs grab and run. Professionals leave the scene cleaner than they found it.',
    requirementType: 'click',
  },
  {
    skill: 'thief', prestigeLevel: 3,
    title: 'Shadowrun',
    description: 'The job is simple: cross the most surveilled block in Nekrosol, take the package, disappear.',
    requirementType: 'click',
  },
  {
    skill: 'thief', prestigeLevel: 4,
    title: 'Phantom Exit',
    description: 'The heist that made the news. The thief was never identified. Three witnesses said they saw no one.',
    requirementType: 'click',
  },

  // ── GRIFTER ─────────────────────────────────────────────────────────────────
  {
    skill: 'grifter', prestigeLevel: 1,
    title: 'The Long Con',
    description: 'Patience is the only tool a Hustler has. Set the hook early. Reel them in slow.',
    requirementType: 'click',
  },
  {
    skill: 'grifter', prestigeLevel: 2,
    title: 'Mark the Crowd',
    description: 'Twenty marks, twenty different stories, none of them true. You didn\'t even break a sweat.',
    requirementType: 'click',
  },
  {
    skill: 'grifter', prestigeLevel: 3,
    title: 'The Rigged Game',
    description: 'You didn\'t just win — you designed a game where winning was the only possible outcome.',
    requirementType: 'click',
  },
  {
    skill: 'grifter', prestigeLevel: 4,
    title: 'Architect\'s Gambit',
    description: 'The most dangerous con is the one where the mark believes they\'re running it.',
    requirementType: 'click',
  },

  // ── PILOT ───────────────────────────────────────────────────────────────────
  {
    skill: 'pilot', prestigeLevel: 1,
    title: 'Freighter Run',
    description: 'Nobody asks questions about cargo when the pilot delivers on time.',
    requirementType: 'click',
  },
  {
    skill: 'pilot', prestigeLevel: 2,
    title: 'Hot Zone Transit',
    description: 'Through the Ember Corridor with a full hold, no transponder, and a radiation storm rolling in.',
    requirementType: 'click',
  },
  {
    skill: 'pilot', prestigeLevel: 3,
    title: 'No Transponder',
    description: 'Three patrol vessels. One route. Zero electronic signatures. The cargo gets through.',
    requirementType: 'click',
  },
  {
    skill: 'pilot', prestigeLevel: 4,
    title: 'Ghost Flight',
    description: 'You landed in a zone that doesn\'t exist, off-loaded a shipment that was never logged, and left before sunrise.',
    requirementType: 'click',
  },

  // ── MEDIC ───────────────────────────────────────────────────────────────────
  {
    skill: 'medic', prestigeLevel: 1,
    title: 'Field Surgery',
    description: 'No sterile room. No equipment. Just what\'s in the kit and what you know.',
    requirementType: 'click',
  },
  {
    skill: 'medic', prestigeLevel: 2,
    title: 'Triage Protocol',
    description: 'Four patients. One hour. One of them shouldn\'t have made it. They all did.',
    requirementType: 'click',
  },
  {
    skill: 'medic', prestigeLevel: 3,
    title: 'Mass Casualty',
    description: 'The Reactor District attack left eighteen wounded. You worked for eleven hours straight.',
    requirementType: 'click',
  },
  {
    skill: 'medic', prestigeLevel: 4,
    title: 'Miracle Protocol',
    description: 'The patient had no pulse for four minutes. The chart said incompatible with life. You disagreed.',
    requirementType: 'click',
  },

  // ── HACKER ──────────────────────────────────────────────────────────────────
  {
    skill: 'hacker', prestigeLevel: 1,
    title: 'Crack the Grid',
    description: 'The city\'s power grid has a back door. Find it. Use it. Don\'t get traced.',
    requirementType: 'click',
  },
  {
    skill: 'hacker', prestigeLevel: 2,
    title: 'Logic Bomb',
    description: 'Plant it deep. Set the trigger. Walk away before it detonates. They\'ll never find the source.',
    requirementType: 'click',
  },
  {
    skill: 'hacker', prestigeLevel: 3,
    title: 'Zero-Day',
    description: 'You found a vulnerability in Enklave\'s core OS that their team missed for three years. What you do with it is up to you.',
    requirementType: 'click',
  },
  {
    skill: 'hacker', prestigeLevel: 4,
    title: 'Null Pointer',
    description: 'You didn\'t just break in. You made them think their own systems had failed. No trace. No attribution. Nothing.',
    requirementType: 'click',
  },

  // ── TECHNICIAN ──────────────────────────────────────────────────────────────
  {
    skill: 'technician', prestigeLevel: 1,
    title: 'System Override',
    description: 'The relay was supposed to be offline for a week. You had it running in four hours with components from three different machines.',
    requirementType: 'click',
  },
  {
    skill: 'technician', prestigeLevel: 2,
    title: 'Hot Patch',
    description: 'The system can\'t go offline. You work on live hardware, mid-cycle, without triggering a single alert.',
    requirementType: 'click',
  },
  {
    skill: 'technician', prestigeLevel: 3,
    title: 'Forge Protocol',
    description: 'Fabricate a functioning relay unit from scavenged parts. No schematic. No room for error.',
    requirementType: 'click',
  },
  {
    skill: 'technician', prestigeLevel: 4,
    title: 'Sage Architecture',
    description: 'You designed something that shouldn\'t work, according to every engineer who\'s looked at it. It works.',
    requirementType: 'click',
  },

  // ── CHEMIST ─────────────────────────────────────────────────────────────────
  {
    skill: 'chemist', prestigeLevel: 1,
    title: 'Synthesis Trial',
    description: 'Your first batch. The formula is untested. You run it anyway.',
    requirementType: 'click',
  },
  {
    skill: 'chemist', prestigeLevel: 2,
    title: 'Volatile Batch',
    description: 'High radiation, volatile compounds, unstable environment. A lesser chemist would have walked away.',
    requirementType: 'click',
  },
  {
    skill: 'chemist', prestigeLevel: 3,
    title: 'Toxic Mastery',
    description: 'You\'ve synthesized compounds that most chemists have only read about. Under field conditions.',
    requirementType: 'click',
  },
  {
    skill: 'chemist', prestigeLevel: 4,
    title: 'Plague Formula',
    description: 'The formula exists in your head and nowhere else. Handle it accordingly.',
    requirementType: 'click',
  },

  // ── PHYSICIST ───────────────────────────────────────────────────────────────
  {
    skill: 'physicist', prestigeLevel: 1,
    title: 'Void Calculation',
    description: 'Standard models don\'t apply here. You derive the answer from first principles while the radiation counter climbs.',
    requirementType: 'click',
  },
  {
    skill: 'physicist', prestigeLevel: 2,
    title: 'Entropy Probe',
    description: 'Map the decay patterns around Reactor District. The data makes no sense by conventional physics. Good.',
    requirementType: 'click',
  },
  {
    skill: 'physicist', prestigeLevel: 3,
    title: 'Resonance Test',
    description: 'You need sustained exposure to observe the resonance phenomenon. The readings will be worth it.',
    requirementType: 'click',
  },
  {
    skill: 'physicist', prestigeLevel: 4,
    title: 'Entropist\'s Trial',
    description: 'Step into the void. Measure what cannot be measured. Return with proof of what should not exist.',
    requirementType: 'click',
  },

  // ── SCAVENGER ───────────────────────────────────────────────────────────────
  {
    skill: 'scavenger', prestigeLevel: 1,
    title: 'Wreck Dive',
    description: 'The wreck has been picked over for years. You find things others missed.',
    requirementType: 'click',
  },
  {
    skill: 'scavenger', prestigeLevel: 2,
    title: 'Deep Salvage',
    description: 'Below the surface level, past the easy scores, where the radiation gets thick and the tunnels get narrow.',
    requirementType: 'click',
  },
  {
    skill: 'scavenger', prestigeLevel: 3,
    title: 'Wraith Circuit',
    description: 'Move through the most dangerous salvage zone in Nekrosol. Come back with something no one else would touch.',
    requirementType: 'click',
  },
  {
    skill: 'scavenger', prestigeLevel: 4,
    title: 'Dust Prophecy',
    description: 'You can read a ruin like a book. What broke it. What\'s still worth taking. What will last.',
    requirementType: 'click',
  },

  // ── MECHANIC ────────────────────────────────────────────────────────────────
  {
    skill: 'mechanic', prestigeLevel: 1,
    title: 'Field Repair',
    description: 'The vehicle is running when it shouldn\'t be. The engine is wrong when it should have seized. You fixed it.',
    requirementType: 'click',
  },
  {
    skill: 'mechanic', prestigeLevel: 2,
    title: 'Jury Rig',
    description: 'No parts, no time, no second chances. The machine runs or people die.',
    requirementType: 'click',
  },
  {
    skill: 'mechanic', prestigeLevel: 3,
    title: 'Iron Calibration',
    description: 'Precision work on hardware that hasn\'t been maintained in a decade. Every tolerance matters.',
    requirementType: 'click',
  },
  {
    skill: 'mechanic', prestigeLevel: 4,
    title: 'Sage Overhaul',
    description: 'You didn\'t just fix it. You made it better than it was when it left the factory.',
    requirementType: 'click',
  },

  // ── SMUGGLER ────────────────────────────────────────────────────────────────
  {
    skill: 'smuggler', prestigeLevel: 1,
    title: 'Dark Transit',
    description: 'The cargo doesn\'t exist. The route doesn\'t exist. Neither do you.',
    requirementType: 'click',
  },
  {
    skill: 'smuggler', prestigeLevel: 2,
    title: 'Cold Trail',
    description: 'Through a checkpoint with active scanners and a payload that would end your career if found.',
    requirementType: 'click',
  },
  {
    skill: 'smuggler', prestigeLevel: 3,
    title: 'Ghost Manifest',
    description: 'The paperwork is perfect. The cargo is anything but. The inspectors wave you through.',
    requirementType: 'click',
  },
  {
    skill: 'smuggler', prestigeLevel: 4,
    title: 'Shadow Network',
    description: 'You\'re not moving cargo anymore. You\'re running the infrastructure that everyone else relies on.',
    requirementType: 'click',
  },
]
