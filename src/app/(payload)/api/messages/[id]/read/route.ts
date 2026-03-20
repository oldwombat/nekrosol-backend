import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import type { Player } from '../../../../../../payload-types'

/**
 * POST /api/messages/[id]/read
 *
 * Marks a single message as read. Only the owning player can mark their messages.
 *
 * Response: { success: true }
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const payload = await getPayload({ config: configPromise })
    const headers = await getHeaders()

    const { user } = await payload.auth({ headers })
    if (!user || user.collection !== 'players') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const player = user as unknown as Player
    const { id } = await params

    // Find the message and verify ownership before updating
    const message = await payload.findByID({
      collection: 'messages',
      id,
      depth: 0,
      overrideAccess: true,
    })

    if (!message) {
      return Response.json({ error: 'Message not found' }, { status: 404 })
    }

    const ownerId =
      typeof message.player === 'object' ? message.player.id : message.player

    if (String(ownerId) !== String(player.id)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    await payload.update({
      collection: 'messages',
      id,
      data: { isRead: true },
      overrideAccess: true,
    })

    return Response.json({ success: true })
  } catch (err) {
    console.error('[messages read POST] error', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
