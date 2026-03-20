import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

/**
 * POST /api/player-quests/[id]/complete
 *
 * Marks a quest progress row as completed.
 *
 * For 'click' type quests: completes immediately with no further checks.
 * For future quest types: will validate requirementData against GameEvents.
 *
 * Response: { success: true, questProgress: PlayerQuestProgress }
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getPayload({ config: configPromise })
    const headers = await getHeaders()

    const { user } = await payload.auth({ headers })
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: progressId } = await params

    const players = await payload.find({
      collection: 'players',
      where: { user: { equals: user.id } },
      limit: 1,
      overrideAccess: true,
    })

    const player = players.docs[0]
    if (!player) {
      return Response.json({ error: 'Player not found' }, { status: 404 })
    }

    // Load the progress row (depth 1 to get quest details)
    const progressRows = await payload.find({
      collection: 'player-quest-progress',
      where: {
        and: [
          { id: { equals: progressId } },
          { player: { equals: player.id } },
        ],
      },
      depth: 1,
      limit: 1,
      overrideAccess: true,
    })

    const progressRow = progressRows.docs[0]
    if (!progressRow) {
      return Response.json({ error: 'Quest progress not found' }, { status: 404 })
    }

    if (progressRow.status === 'completed') {
      return Response.json({ error: 'Quest already completed' }, { status: 400 })
    }

    if (progressRow.status === 'locked') {
      return Response.json({ error: 'Quest is locked' }, { status: 400 })
    }

    const quest = progressRow.quest as { id: string; requirementType: string; skill: string; prestigeLevel: number }

    // MVP: 'click' quests complete immediately.
    // Future: check GameEvents for mission_count, item_consume, stat_threshold, puzzle.
    if (quest.requirementType !== 'click') {
      return Response.json(
        { error: `Quest type '${quest.requirementType}' is not yet implemented` },
        { status: 501 },
      )
    }

    const updated = await payload.update({
      collection: 'player-quest-progress',
      id: progressRow.id,
      data: {
        status: 'completed',
        completedAt: new Date().toISOString(),
      },
      overrideAccess: true,
    })

    // Log the completion event
    await payload.create({
      collection: 'game-events',
      data: {
        player: player.id,
        eventType: 'quest_completed',
        eventData: {
          questId: quest.id,
          skill: quest.skill,
          prestigeLevel: quest.prestigeLevel,
        },
      },
      overrideAccess: true,
    })

    return Response.json({ success: true, questProgress: updated })
  } catch (err) {
    console.error('[player-quests complete] error', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
