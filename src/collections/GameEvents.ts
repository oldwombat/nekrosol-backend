import type { CollectionConfig } from 'payload'

/**
 * GameEvents — append-only audit log for all significant player actions.
 *
 * Rules:
 * - NEVER update or delete rows. Insert only.
 * - Indexed by player + eventType + createdAt for efficient quest-progress queries.
 * - eventData shape is typed per eventType (see EVENT_TYPES below).
 *
 * Event types:
 *   action_taken        { action: ActionType }
 *   prestige_completed  { skill: SkillKey, prestigeLevel: number }
 *   quest_completed     { questId: string, skill: SkillKey, prestigeLevel: number }
 *   item_acquired       { itemKey: string, quantity: number }
 *   item_consumed       { itemKey: string, quantity: number }
 *   skill_xp_gained     { skill: SkillKey, amount: number, source: string }
 */
export const GameEvents: CollectionConfig = {
  slug: 'game-events',
  admin: {
    useAsTitle: 'eventType',
    defaultColumns: ['player', 'eventType', 'createdAt'],
    description: 'Append-only event log. Never edit or delete rows.',
  },
  access: {
    // Only server-side (Local API) writes. No direct REST create/update/delete from clients.
    create: () => false,
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.collection === 'users') return true // admins can read all
      // Players can only read their own events
      return {
        player: { equals: req.user.id },
      }
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
      name: 'eventType',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Action Taken', value: 'action_taken' },
        { label: 'Prestige Completed', value: 'prestige_completed' },
        { label: 'Quest Completed', value: 'quest_completed' },
        { label: 'Item Acquired', value: 'item_acquired' },
        { label: 'Item Consumed', value: 'item_consumed' },
        { label: 'Skill XP Gained', value: 'skill_xp_gained' },
      ],
    },
    {
      name: 'eventData',
      type: 'json',
      required: false,
      admin: {
        description: 'Structured payload — shape depends on eventType.',
      },
    },
  ],
  timestamps: true,
}
