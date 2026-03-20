import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

/**
 * GET /api/player-quests
 *
 * Returns all quest progress rows for the authenticated player,
 * with quest details populated.
 *
 * Response: { quests: PlayerQuestProgress[] }
 */
export async function GET() {
  try {
    const payload = await getPayload({ config: configPromise })
    const headers = await getHeaders()

    const { user } = await payload.auth({ headers })
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const progress = await payload.find({
      collection: 'player-quest-progress',
      where: { player: { equals: player.id } },
      limit: 100,
      depth: 1, // populate quest details
      overrideAccess: true,
    })

    return Response.json({ quests: progress.docs })
  } catch (err) {
    console.error('[player-quests GET] error', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
