import type { CollectionConfig } from 'payload'

/**
 * Quests — master catalog of all prestige quests.
 *
 * There are 48 quests: 12 skills × 4 prestige levels (1–4).
 * Seeded via src/seed/questDefinitions.ts on first run.
 *
 * requirementType drives future quest logic:
 *   click          — no requirements, player just accepts the quest (MVP default)
 *   mission_count  — requirementData: { action: ActionType, count: number }
 *   item_consume   — requirementData: { itemKey: string, quantity: number }
 *   stat_threshold — requirementData: { stat: string, min?: number, max?: number }
 *   puzzle         — requirementData: { puzzleId: string }
 */
export const Quests: CollectionConfig = {
  slug: 'quests',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'skill', 'prestigeLevel', 'requirementType'],
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.collection === 'users',
    update: ({ req }) => req.user?.collection === 'users',
    delete: ({ req }) => req.user?.collection === 'users',
  },
  fields: [
    {
      name: 'skill',
      type: 'select',
      required: true,
      index: true,
      options: [
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
      ],
    },
    {
      name: 'prestigeLevel',
      label: 'Prestige Level',
      type: 'number',
      required: true,
      index: true,
      min: 1,
      max: 4,
      admin: { description: 'Which prestige unlock this quest gates (1 = first prestige, 4 = final).' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'requirementType',
      label: 'Requirement Type',
      type: 'select',
      required: true,
      defaultValue: 'click',
      options: [
        { label: 'Click (MVP — no requirements)', value: 'click' },
        { label: 'Mission Count', value: 'mission_count' },
        { label: 'Item Consume', value: 'item_consume' },
        { label: 'Stat Threshold', value: 'stat_threshold' },
        { label: 'Puzzle', value: 'puzzle' },
      ],
    },
    {
      name: 'requirementData',
      label: 'Requirement Data',
      type: 'json',
      required: false,
      admin: {
        description:
          'Shape depends on requirementType. Leave empty for click quests. ' +
          'mission_count: { action, count } | item_consume: { itemKey, quantity } | ' +
          'stat_threshold: { stat, min?, max? } | puzzle: { puzzleId }',
      },
    },
  ],
}
