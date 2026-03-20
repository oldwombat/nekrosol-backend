import type { CollectionConfig } from 'payload'

type AccessRequest = {
  user?: { id?: string | number; collection?: string }
}

/**
 * Messages — in-game NPC inbox.
 *
 * Created server-side when meaningful game events occur:
 *   - A mission becomes newly available for the player
 *   - A prestige Trial is completed (faction NPC introduction)
 *   - Combat / theft results (future PvP)
 *
 * Initial NPC: "Sal" (fixer persona).
 * Faction NPCs added as skills develop (Pit Boss, Ghost, Crow, etc.)
 *
 * Never create/update/delete directly from the client — server-side only
 * via Local API (overrideAccess: true from route handlers).
 */
export const Messages: CollectionConfig = {
  slug: 'messages',
  admin: {
    useAsTitle: 'subject',
    defaultColumns: ['npcName', 'subject', 'type', 'isRead', 'createdAt'],
    description: 'NPC inbox messages. Created by the server when game events occur.',
  },
  access: {
    // Players can only read their own messages; admins see all.
    read: ({ req }: { req: AccessRequest }) => {
      if (req.user?.collection === 'users') return true
      if (req.user?.collection === 'players') {
        return { player: { equals: req.user.id } }
      }
      return false
    },
    // All writes are server-side only (route handlers with overrideAccess).
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
      name: 'npcSlug',
      label: 'NPC Slug',
      type: 'text',
      required: true,
      defaultValue: 'sal',
      admin: { description: 'Machine-readable NPC identifier (e.g. sal, pit-boss, ghost, crow).' },
    },
    {
      name: 'npcName',
      label: 'NPC Name',
      type: 'text',
      required: true,
      defaultValue: 'Sal',
      admin: { description: 'Display name for the NPC sender.' },
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'general',
      options: [
        { label: 'Mission Available', value: 'mission_available' },
        { label: 'Trial Completed', value: 'trial_completed' },
        { label: 'Faction Intro', value: 'faction_intro' },
        { label: 'Combat Result', value: 'combat_result' },
        { label: 'General', value: 'general' },
      ],
    },
    {
      name: 'isRead',
      label: 'Read',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    {
      name: 'metadata',
      type: 'json',
      required: false,
      admin: {
        description: 'Optional context data. E.g. { missionSlug: "patrol" } or { questId: "abc123" }',
      },
    },
  ],
  timestamps: true,
}
