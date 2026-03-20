import type { CollectionConfig } from 'payload'

/**
 * PlayerQuestProgress — tracks each player's status on every quest.
 *
 * Rows are pre-created for all 48 quests when a player signs up
 * (via Players afterOperation hook in Players.ts).
 *
 * Status flow:
 *   locked     → player hasn't reached this prestige level yet
 *   available  → player is at the right prestige level to attempt this quest
 *   completed  → quest done; prestige endpoint will accept this skill/level
 */
export const PlayerQuestProgress: CollectionConfig = {
  slug: 'player-quest-progress',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['player', 'quest', 'status', 'completedAt'],
    description: 'One row per player × quest (48 rows per player).',
  },
  access: {
    create: () => false,
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.collection === 'users') return true
      return { player: { equals: req.user.id } }
    },
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'player',
      type: 'relationship',
      relationTo: 'players',
      required: true,
      index: true,
    },
    {
      name: 'quest',
      type: 'relationship',
      relationTo: 'quests',
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'locked',
      index: true,
      options: [
        { label: 'Locked', value: 'locked' },
        { label: 'Available', value: 'available' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    {
      name: 'progress',
      type: 'json',
      required: false,
      admin: {
        description: 'Partial completion data for mission_count / item_consume quests.',
      },
    },
    {
      name: 'completedAt',
      label: 'Completed At',
      type: 'date',
      required: false,
    },
  ],
  timestamps: true,
}
