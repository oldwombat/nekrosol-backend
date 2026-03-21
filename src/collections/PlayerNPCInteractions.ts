import type { CollectionConfig } from 'payload'

const adminOnly = ({ req }: { req: { user?: { collection?: string } | null } }): boolean =>
  req.user?.collection === 'users'

/**
 * PlayerNPCInteractions — tracks which NPCs a player has spoken to.
 *
 * Used by the mission visibility engine: missions with a visibilityRequirement
 * of type 'npc_interaction' are hidden until the player has talked to the
 * specified NPC. Once talked to, the missions surface in the player's list
 * permanently.
 */
export const PlayerNPCInteractions: CollectionConfig = {
  slug: 'player-npc-interactions',
  admin: {
    useAsTitle: 'npcId',
    defaultColumns: ['player', 'npcId', 'firstInteractionAt', 'interactionCount'],
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
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
      name: 'npcId',
      type: 'text',
      required: true,
      index: true,
      admin: { description: "NPC identifier slug, e.g. 'vex', 'the-broker', 'sal'" },
    },
    {
      name: 'firstInteractionAt',
      type: 'date',
      required: true,
    },
    {
      name: 'interactionCount',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: { description: 'Total number of times this player has talked to this NPC' },
    },
  ],
  timestamps: true,
}
