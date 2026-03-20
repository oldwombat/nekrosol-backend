import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import type { Player } from '../../../../payload-types'

/**
 * GET /api/messages
 *
 * Returns NPC inbox messages for the authenticated player.
 * Unread messages are returned first, then read messages by createdAt desc.
 *
 * Response: { messages: Message[], unreadCount: number }
 */
export async function GET() {
  try {
    const payload = await getPayload({ config: configPromise })
    const headers = await getHeaders()

    const { user } = await payload.auth({ headers })
    if (!user || user.collection !== 'players') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const player = user as unknown as Player

    const result = await payload.find({
      collection: 'messages',
      where: { player: { equals: player.id } },
      sort: '-createdAt',
      limit: 50,
      depth: 0,
      overrideAccess: true,
    })

    const unreadCount = result.docs.filter((m: { isRead?: boolean | null }) => !m.isRead).length

    return Response.json({
      messages: result.docs,
      unreadCount,
    })
  } catch (err) {
    console.error('[messages GET] error', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
