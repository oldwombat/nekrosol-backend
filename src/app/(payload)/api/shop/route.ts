import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import { seedItems } from '../../../../seed/seedItems'
import type { Item } from '../../../../payload-types'

/**
 * GET /api/shop
 *
 * Returns items available for purchase at the Blackglass Market (or any future location).
 * Optional query param: ?location=blackglass-market (reserved for future filtering).
 * All consumable and material items are currently available.
 */
export async function GET(req: Request): Promise<Response> {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user || user.collection !== 'players') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ensure items are seeded (idempotent)
  await seedItems(payload)

  const result = await payload.find({
    collection: 'items',
    limit: 100,
    overrideAccess: true,
    sort: 'name',
  })

  const items = result.docs.map((item: Item) => ({
    id: item.id,
    key: item.key,
    name: item.name,
    description: item.description ?? null,
    category: item.category,
    maxStack: item.maxStack,
    value: item.value ?? 0,
  }))

  return Response.json({ items })
}
