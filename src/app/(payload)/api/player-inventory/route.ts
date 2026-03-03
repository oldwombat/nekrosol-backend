import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import { getPlayerInventory } from '@/lib/player-inventory'

export const GET = async () => {
  try {
    const payload = await getPayload({ config: configPromise })
    const headers = await getHeaders()
    const { user } = await payload.auth({ headers })

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.collection !== 'players') {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const inventory = await getPlayerInventory(payload, user.id)

    return Response.json({
      ok: true,
      counts: inventory.counts,
      items: inventory.docs,
    })
  } catch (error) {
    console.error('player-inventory error', error)
    return Response.json({ error: 'Unable to load inventory' }, { status: 500 })
  }
}
