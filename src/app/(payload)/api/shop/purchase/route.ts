import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import { addInventoryItem } from '../../../../../lib/player-inventory'
import type { Player } from '../../../../../payload-types'

/**
 * POST /api/shop/purchase
 *
 * Purchase one or more units of an item from the Blackglass Market.
 * Body: { itemKey: string, quantity: number }
 *
 * Validates:
 *  - Player is authenticated
 *  - Item exists in the catalog
 *  - Quantity is valid (1 ≤ qty ≤ item.maxStack)
 *  - Player has enough credits (qty × item.value)
 *
 * On success: deducts credits, adds to inventory, returns updated credits + inventory counts.
 */
export async function POST(req: Request): Promise<Response> {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user || user.collection !== 'players') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { itemKey?: string; quantity?: number }
  try {
    body = (await req.json()) as { itemKey?: string; quantity?: number }
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { itemKey, quantity = 1 } = body

  if (!itemKey || typeof itemKey !== 'string') {
    return Response.json({ error: 'itemKey is required' }, { status: 400 })
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return Response.json({ error: 'quantity must be a positive integer' }, { status: 400 })
  }

  // Fetch item from catalog
  const itemResult = await payload.find({
    collection: 'items',
    where: { key: { equals: itemKey } },
    limit: 1,
    overrideAccess: true,
  })

  if (itemResult.totalDocs === 0) {
    return Response.json({ error: `Item '${itemKey}' not found` }, { status: 404 })
  }

  const item = itemResult.docs[0]
  const unitPrice = item.value ?? 0

  if (quantity > (item.maxStack ?? 99)) {
    return Response.json(
      { error: `Cannot buy more than ${item.maxStack} at once` },
      { status: 400 },
    )
  }

  const totalCost = unitPrice * quantity

  // Fetch player to check credits
  const player = (await payload.findByID({
    collection: 'players',
    id: user.id,
    overrideAccess: true,
  })) as Player

  const currentCredits = (player.credits as number) ?? 0

  if (currentCredits < totalCost) {
    return Response.json(
      {
        error: `Not enough credits (need ${totalCost}, have ${currentCredits})`,
        creditsNeeded: totalCost,
        creditsHave: currentCredits,
      },
      { status: 400 },
    )
  }

  // Deduct credits
  await payload.update({
    collection: 'players',
    id: user.id,
    data: { credits: currentCredits - totalCost },
    overrideAccess: true,
  })

  // Add item to inventory
  const inventoryResult = await addInventoryItem(payload, user.id, itemKey, quantity)

  if (!inventoryResult.ok) {
    // Roll back credit deduction on inventory failure
    await payload.update({
      collection: 'players',
      id: user.id,
      data: { credits: currentCredits },
      overrideAccess: true,
    })
    return Response.json({ error: 'Failed to update inventory' }, { status: 500 })
  }

  return Response.json({
    ok: true,
    purchased: { itemKey, quantity, totalCost },
    credits: currentCredits - totalCost,
    inventory: inventoryResult.counts,
  })
}
