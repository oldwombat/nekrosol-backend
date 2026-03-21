import type { CollectionConfig } from 'payload'

type AccessRequest = {
  user?: { id?: string | number; collection?: string }
}

const SKILL_OPTIONS = [
  { label: 'Thug', value: 'thug' },
  { label: 'Thief', value: 'thief' },
  { label: 'Grifter', value: 'grifter' },
  { label: 'Pilot', value: 'pilot' },
  { label: 'Medic', value: 'medic' },
  { label: 'Hacker', value: 'hacker' },
  { label: 'Technician', value: 'technician' },
  { label: 'Chemist', value: 'chemist' },
  { label: 'Physicist', value: 'physicist' },
  { label: 'Scavenger', value: 'scavenger' },
  { label: 'Mechanic', value: 'mechanic' },
  { label: 'Smuggler', value: 'smuggler' },
]

/**
 * Missions — master catalog of all playable missions.
 *
 * Missions are data records executed by src/lib/mission-engine.ts.
 * Each mission defines costs, requirements, visibility rules, and rewards
 * as JSON arrays of typed handler objects — no bespoke code per mission.
 *
 * costs:                  [{type:'energy', amount:2}]
 * requirements:           [{type:'stat_min', stat:'energy', value:2}]
 * visibilityRequirements: [{type:'stat_min', stat:'hacker', value:20}] | null (always visible)
 * rewards:                [{type:'credits', min:10, max:20}, {type:'item_chance', itemKey:'rad-x', probability:0.3, quantity:1}]
 *
 * Cost types:    energy | credits | health | item
 * Req types:     stat_min | stat_max | mission_completed_count | item_in_inventory
 * Reward types:  credits | stat_delta | item_chance | item_guaranteed
 */
export const Missions: CollectionConfig = {
  slug: 'missions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'primarySkill', 'tier', 'isActive'],
    description: 'Master catalog of all playable missions. Edit costs, rewards and requirements here.',
  },
  access: {
    read: () => true,
    create: ({ req }: { req: AccessRequest }) => req.user?.collection === 'users',
    update: ({ req }: { req: AccessRequest }) => req.user?.collection === 'users',
    delete: ({ req }: { req: AccessRequest }) => req.user?.collection === 'users',
  },
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Machine-readable ID used in player-actions (e.g. patrol, escort, beg).' },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      admin: { description: 'Flavour text shown to the player.' },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: [
        { label: 'Combat', value: 'combat' },
        { label: 'Scavenging', value: 'scavenging' },
        { label: 'Social', value: 'social' },
        { label: 'Criminal', value: 'criminal' },
        { label: 'Tech', value: 'tech' },
      ],
    },
    {
      name: 'primarySkill',
      label: 'Primary Skill',
      type: 'select',
      required: true,
      options: SKILL_OPTIONS,
      admin: { description: 'Skill this mission develops XP for (once skill XP is implemented).' },
    },
    {
      name: 'tier',
      type: 'number',
      required: true,
      defaultValue: 1,
      min: 1,
      max: 5,
      admin: {
        description:
          'Complexity band (1 = beginner, 5 = endgame). ' +
          'Used alongside visibilityRequirements to gate content narratively.',
      },
    },
    {
      name: 'isActive',
      label: 'Active',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Inactive missions are hidden from all players regardless of visibility rules.' },
    },
    {
      name: 'hideAfterCompletion',
      label: 'Hide After Completion',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'One-time missions: once the player completes this mission, it disappears from their list permanently. ' +
          'Used for tutorial missions delivered via NPC messages.',
      },
    },
    {
      name: 'costs',
      type: 'json',
      required: false,
      admin: {
        description:
          'Array of cost objects deducted when the mission runs. ' +
          'Examples: [{type:"energy",amount:2}] [{type:"credits",amount:10}] [{type:"health",amount:5}]',
      },
    },
    {
      name: 'requirements',
      type: 'json',
      required: false,
      admin: {
        description:
          'Conditions the player must meet to run the mission (shown as locked hint if unmet). ' +
          'Examples: [{type:"stat_min",stat:"energy",value:2}] [{type:"mission_completed_count",missionSlug:"patrol",count:3}]',
      },
    },
    {
      name: 'visibilityRequirements',
      label: 'Visibility Requirements',
      type: 'json',
      required: false,
      admin: {
        description:
          'Conditions to even show this mission in the player list. ' +
          'Leave empty to always show. ' +
          'Examples: [{type:"stat_min",stat:"hacker",value:20}] [{type:"mission_completed_count",missionSlug:"beg",count:1}]',
      },
    },
    {
      name: 'rewards',
      type: 'json',
      required: false,
      admin: {
        description:
          'Rewards granted on mission completion. ' +
          'Examples: [{type:"credits",min:10,max:20}] [{type:"stat_delta",stat:"radiation",amount:5}] [{type:"item_chance",itemKey:"rad-x",probability:0.3,quantity:1}]',
      },
    },
    {
      name: 'dependencies',
      type: 'relationship',
      relationTo: 'missions',
      hasMany: true,
      required: false,
      admin: {
        description: 'Missions that must be completed at least once before this mission becomes visible.',
      },
    },
    {
      name: 'npcSlug',
      label: 'NPC Slug',
      type: 'text',
      required: false,
      defaultValue: 'sal',
      admin: {
        description: 'Which NPC persona sends the availability/completion message (e.g. sal, pit-boss, ghost).',
      },
    },
    {
      name: 'npcName',
      label: 'NPC Display Name',
      type: 'text',
      required: false,
      defaultValue: 'Sal',
      admin: { description: 'Display name of the NPC (denormalised for message rendering speed).' },
    },
    {
      name: 'availabilityMessage',
      label: 'Availability Message',
      type: 'textarea',
      required: false,
      admin: { description: 'What the NPC says when this mission first becomes available to the player.' },
    },
    {
      name: 'completionMessage',
      label: 'Completion Message',
      type: 'textarea',
      required: false,
      admin: { description: 'What the NPC says when the player completes this mission for the first time.' },
    },
  ],
}
