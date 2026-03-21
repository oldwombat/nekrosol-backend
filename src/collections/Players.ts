import type { CollectionConfig } from 'payload'
import { seedQuests } from '../seed/seedQuests'
import { seedMissions } from '../seed/seedMissions'
import { seedItems } from '../seed/seedItems'

type AccessRequest = {
  user?: {
    id?: string | number
    collection?: string
  }
}

export const Players: CollectionConfig = {
  slug: 'players',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  access: {
    // Allow public signup from the app.
    create: () => true,
    // Players can read/update their own profile; admin users can read/update all.
    read: ({ req }: { req: AccessRequest }) => {
      if (req.user?.collection === 'users') return true;
      if (req.user?.collection === 'players') {
        return {
          id: {
            equals: req.user.id,
          },
        };
      }
      return false;
    },
    update: ({ req }: { req: AccessRequest }) => {
      if (req.user?.collection === 'users') return true;
      if (req.user?.collection === 'players') {
        return {
          id: {
            equals: req.user.id,
          },
        };
      }
      return false;
    },
    delete: ({ req }: { req: AccessRequest }) => req.user?.collection === 'users',
  },
  fields: [
    // Email added by default
    {
      name: 'displayName',
      label: 'Display Name',
      type: 'text',
      required: false,
      minLength: 2,
      maxLength: 32,
      validate: (value: string | null | undefined) => {
        if (!value) return true
        if (value.length < 2) return 'Display name must be at least 2 characters.'
        if (value.length > 32) return 'Display name must be at most 32 characters.'
        if (!/^[a-zA-Z0-9 _-]+$/.test(value)) {
          return 'Display name may only contain letters, numbers, spaces, underscores, and hyphens.'
        }
        return true
      },
    },
    {
      name: 'credits',
      label: 'Credits',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'creditsMax',
      label: 'Credits Max',
      type: 'number',
      required: true,
      defaultValue: 1000000,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'energy',
      label: 'Energy',
      type: 'number',
      required: true,
      defaultValue: 10,
      min: 0,
    },
    {
      name: 'energyMax',
      label: 'Energy Max',
      type: 'number',
      required: true,
      defaultValue: 10,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'lastEnergyUpdate',
      label: 'Last Energy Update',
      type: 'date',
      required: false,
      admin: {
        readOnly: true,
        description: 'Timestamp of last energy regen sync. Used for lazy energy regeneration calculation.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'health',
      label: 'Health',
      type: 'number',
      required: true,
      defaultValue: 100,
      min: 0,
    },
    {
      name: 'healthMax',
      label: 'Health Max',
      type: 'number',
      required: true,
      defaultValue: 100,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'radiation',
      label: 'Radiation',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'radiationMax',
      label: 'Radiation Max',
      type: 'number',
      required: true,
      defaultValue: 100,
      min: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'lastRadiationUpdate',
      label: 'Last Radiation Update',
      type: 'date',
      required: false,
      admin: {
        readOnly: true,
        description: 'Timestamp of last radiation decay sync. Used for lazy radiation decay calculation.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    // Skills: capped at 100 per prestige level. At 100, player may prestige (resets to 1, increments *Prestige).
    { name: 'thug',        label: 'Thug',        type: 'number', required: true, defaultValue: 0, min: 0, max: 100 },
    { name: 'thief',       label: 'Thief',       type: 'number', required: true, defaultValue: 0, min: 0, max: 100 },
    { name: 'grifter',     label: 'Grifter',     type: 'number', required: true, defaultValue: 0, min: 0, max: 100 },
    { name: 'pilot',       label: 'Pilot',       type: 'number', required: true, defaultValue: 0, min: 0, max: 100 },
    { name: 'medic',       label: 'Medic',       type: 'number', required: true, defaultValue: 0, min: 0, max: 100 },
    { name: 'hacker',      label: 'Hacker',      type: 'number', required: true, defaultValue: 0, min: 0, max: 100 },
    { name: 'technician',  label: 'Technician',  type: 'number', required: true, defaultValue: 0, min: 0, max: 100 },
    { name: 'chemist',     label: 'Chemist',     type: 'number', required: true, defaultValue: 0, min: 0, max: 100 },
    { name: 'physicist',   label: 'Physicist',   type: 'number', required: true, defaultValue: 0, min: 0, max: 100 },
    { name: 'scavenger',   label: 'Scavenger',   type: 'number', required: true, defaultValue: 0, min: 0, max: 100 },
    { name: 'mechanic',    label: 'Mechanic',    type: 'number', required: true, defaultValue: 0, min: 0, max: 100 },
    { name: 'smuggler',    label: 'Smuggler',    type: 'number', required: true, defaultValue: 0, min: 0, max: 100 },
    // Prestige levels (0 = never prestiged, 4 = max). Incremented by POST /api/player-prestige.
    // Not required (nullable in DB) so drizzle can ADD COLUMN without recreating the table.
    // Treat null as 0 in all game logic — defaultValue ensures new signups get 0.
    { name: 'thugPrestige',       label: 'Thug Prestige',       type: 'number', defaultValue: 0, min: 0, max: 4, admin: { readOnly: true } },
    { name: 'thiefPrestige',      label: 'Thief Prestige',      type: 'number', defaultValue: 0, min: 0, max: 4, admin: { readOnly: true } },
    { name: 'grifterPrestige',    label: 'Grifter Prestige',    type: 'number', defaultValue: 0, min: 0, max: 4, admin: { readOnly: true } },
    { name: 'pilotPrestige',      label: 'Pilot Prestige',      type: 'number', defaultValue: 0, min: 0, max: 4, admin: { readOnly: true } },
    { name: 'medicPrestige',      label: 'Medic Prestige',      type: 'number', defaultValue: 0, min: 0, max: 4, admin: { readOnly: true } },
    { name: 'hackerPrestige',     label: 'Hacker Prestige',     type: 'number', defaultValue: 0, min: 0, max: 4, admin: { readOnly: true } },
    { name: 'technicianPrestige', label: 'Technician Prestige', type: 'number', defaultValue: 0, min: 0, max: 4, admin: { readOnly: true } },
    { name: 'chemistPrestige',    label: 'Chemist Prestige',    type: 'number', defaultValue: 0, min: 0, max: 4, admin: { readOnly: true } },
    { name: 'physicistPrestige',  label: 'Physicist Prestige',  type: 'number', defaultValue: 0, min: 0, max: 4, admin: { readOnly: true } },
    { name: 'scavengerPrestige',  label: 'Scavenger Prestige',  type: 'number', defaultValue: 0, min: 0, max: 4, admin: { readOnly: true } },
    { name: 'mechanicPrestige',   label: 'Mechanic Prestige',   type: 'number', defaultValue: 0, min: 0, max: 4, admin: { readOnly: true } },
    { name: 'smugglerPrestige',   label: 'Smuggler Prestige',   type: 'number', defaultValue: 0, min: 0, max: 4, admin: { readOnly: true } },
    {
      name: 'displayTitle',
      label: 'Display Title',
      type: 'text',
      required: false,
      admin: {
        description: 'Player-chosen rank title shown on their profile. Must be a rank the player has earned.',
      },
    },
    {
      name: 'role',
      label: 'Role',
      type: 'text',
      defaultValue: 'player',
      required: true,
      admin: {
        readOnly: true,
        hidden: true,
      },
    },
  ],
  hooks: {
    afterOperation: [
      async ({ operation, result, req }) => {
        if (operation !== 'create') return result

        const payload = req.payload
        const playerId = result?.id
        if (!playerId) return result

        try {
          // Ensure all quest, mission, and item definitions exist (idempotent)
          await seedQuests(payload)
          await seedMissions(payload)
          await seedItems(payload)

          // Fetch all quests to create progress rows
          const allQuests = await payload.find({
            collection: 'quests',
            limit: 100,
            overrideAccess: true,
          })

          for (const quest of allQuests.docs) {
            // Prestige level 1 quests are immediately available; higher levels are locked
            const status = quest.prestigeLevel === 1 ? 'available' : 'locked'
            await payload.create({
              collection: 'player-quest-progress',
              data: {
                player: playerId,
                quest: quest.id,
                status,
              },
              overrideAccess: true,
            })
          }

          payload.logger.info(`[Players] Created ${allQuests.docs.length} quest progress rows for player ${playerId}`)

          // Send tutorial messages introducing the three consumable item missions
          const tutorialMessages = [
            {
              subject: 'Welcome to Nekrosol',
              body: "You made it. The city doesn't care about you — but I do, a little. Head to Blackglass Market when you need supplies. SPD-1 Stimpaks refill your energy, MED-1 Medpacks patch you up, and RAD-X handles radiation exposure. Buy some, use them — your mission list will show you how. Stay alive out there.",
            },
          ]

          for (const msg of tutorialMessages) {
            await payload.create({
              collection: 'messages',
              data: {
                player: playerId,
                npcSlug: 'sal',
                npcName: 'Sal',
                subject: msg.subject,
                body: msg.body,
                type: 'general',
                isRead: false,
              },
              overrideAccess: true,
            })
          }

          payload.logger.info(`[Players] Sent tutorial messages to player ${playerId}`)
        } catch (err) {
          payload.logger.error(`[Players] Failed to create quest progress for player ${playerId}: ${err}`)
        }

        return result
      },
    ],
  },
}
