import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

type SkillKey =
  | 'thug' | 'thief' | 'grifter' | 'pilot' | 'medic' | 'hacker'
  | 'technician' | 'chemist' | 'physicist' | 'scavenger' | 'mechanic' | 'smuggler'

const SKILL_KEYS: SkillKey[] = [
  'thug', 'thief', 'grifter', 'pilot', 'medic', 'hacker',
  'technician', 'chemist', 'physicist', 'scavenger', 'mechanic', 'smuggler',
]

const MAX_PRESTIGE = 4

export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config: configPromise })
    const headers = await getHeaders()

    const { user } = await payload.auth({ headers })
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const skill = body?.skill as SkillKey | undefined

    if (!skill || !SKILL_KEYS.includes(skill)) {
      return Response.json({ error: 'Invalid skill key' }, { status: 400 })
    }

    const players = await payload.find({
      collection: 'players',
      where: { user: { equals: user.id } },
      limit: 1,
    })

    const player = players.docs[0]
    if (!player) {
      return Response.json({ error: 'Player not found' }, { status: 404 })
    }

    const currentValue = Number(player[skill] ?? 0)
    const prestigeKey = `${skill}Prestige` as keyof typeof player
    const currentPrestige = Number(player[prestigeKey] ?? 0)

    if (currentValue < 100) {
      return Response.json(
        { error: `${skill} must be 100 to prestige (currently ${currentValue})` },
        { status: 400 },
      )
    }

    if (currentPrestige >= MAX_PRESTIGE) {
      return Response.json(
        { error: `${skill} is already at max prestige (${MAX_PRESTIGE})` },
        { status: 400 },
      )
    }

    // Gate: check the player has completed the quest for this prestige level
    const targetPrestigeLevel = currentPrestige + 1
    const questForThisPrestige = await payload.find({
      collection: 'quests',
      where: {
        and: [
          { skill: { equals: skill } },
          { prestigeLevel: { equals: targetPrestigeLevel } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })

    const quest = questForThisPrestige.docs[0]
    if (quest) {
      const progressRows = await payload.find({
        collection: 'player-quest-progress',
        where: {
          and: [
            { player: { equals: player.id } },
            { quest: { equals: quest.id } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })

      const progress = progressRows.docs[0]
      if (!progress || progress.status !== 'completed') {
        return Response.json(
          {
            error: 'Prestige quest not completed',
            questId: progress?.id ?? null,
            questTitle: (quest as { title?: string }).title ?? null,
            hint: 'Complete the prestige quest for this skill before prestiging.',
          },
          { status: 403 },
        )
      }
    }

    const updated = await payload.update({
      collection: 'players',
      id: player.id,
      data: {
        [skill]: 1,
        [prestigeKey]: currentPrestige + 1,
      },
    })

    // Unlock the next prestige level's quest (if any)
    const nextPrestigeLevel = currentPrestige + 2
    if (nextPrestigeLevel <= MAX_PRESTIGE) {
      const nextQuest = await payload.find({
        collection: 'quests',
        where: {
          and: [
            { skill: { equals: skill } },
            { prestigeLevel: { equals: nextPrestigeLevel } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })

      if (nextQuest.docs[0]) {
        const nextProgressRows = await payload.find({
          collection: 'player-quest-progress',
          where: {
            and: [
              { player: { equals: player.id } },
              { quest: { equals: nextQuest.docs[0].id } },
            ],
          },
          limit: 1,
          overrideAccess: true,
        })

        if (nextProgressRows.docs[0]) {
          await payload.update({
            collection: 'player-quest-progress',
            id: nextProgressRows.docs[0].id,
            data: { status: 'available' },
            overrideAccess: true,
          })
        }
      }
    }

    // Log the prestige event
    await payload.create({
      collection: 'game-events',
      data: {
        player: player.id,
        eventType: 'prestige_completed',
        eventData: { skill, prestigeLevel: currentPrestige + 1 },
      },
      overrideAccess: true,
    })

    return Response.json({
      success: true,
      skill,
      prestige: currentPrestige + 1,
      player: updated,
    })
  } catch (err) {
    console.error('[player-prestige] error', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

