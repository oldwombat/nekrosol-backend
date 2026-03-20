import type { CollectionConfig } from 'payload'

type AccessRequest = {
  user?: { id?: string | number; collection?: string }
}

/**
 * PlayerMissionHistory — completed mission log per player.
 *
 * One record per mission completion (not per mission — players may complete
 * the same mission multiple times). Used by:
 *   - Trial requirement type `mission_completed_count` to check progress
 *   - Future analytics and anti-cheat
 *
 * Append-only: never UPDATE or DELETE records.
 * Written server-side by the mission engine after successful execution.
 */
export const PlayerMissionHistory: CollectionConfig = {
  slug: 'player-mission-history',
  admin: {
    useAsTitle: 'missionSlug',
    defaultColumns: ['player', 'missionSlug', 'completedAt'],
    description: 'Append-only log of completed missions per player. Used for Trial requirement checking.',
  },
  access: {
    // Players can read their own history; admins see all.
    read: ({ req }: { req: AccessRequest }) => {
      if (req.user?.collection === 'users') return true
      if (req.user?.collection === 'players') {
        return { player: { equals: req.user.id } }
      }
      return false
    },
    // All writes are server-side only (mission engine with overrideAccess).
    create: () => false,
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
      name: 'missionSlug',
      label: 'Mission Slug',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'completedAt',
      label: 'Completed At',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'outcome',
      type: 'json',
      required: false,
      admin: {
        description: 'Summary of what happened: { rewardsSummary: [...], statChanges: { energy: -2, credits: +15 } }',
      },
    },
  ],
  timestamps: true,
}
