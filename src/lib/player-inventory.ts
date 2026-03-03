type InventoryDoc = {
  id: number | string
  itemKey?: string | null
  quantity?: number | null
}

type InventoryCounts = Record<string, number>

const asNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const toCounts = (docs: InventoryDoc[]): InventoryCounts => {
  const counts: InventoryCounts = {}

  for (const doc of docs) {
    if (doc.itemKey) {
      counts[doc.itemKey] = asNumber(doc.quantity, 0)
    }
  }

  return counts
}

export const getPlayerInventory = async (payload: any, playerID: number | string) => {
  const existing = await payload.find({
    collection: 'inventory',
    where: {
      player: {
        equals: playerID,
      },
    },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })

  const docs = [...(existing.docs as InventoryDoc[])]

  return {
    docs,
    counts: toCounts(docs),
  }
}

export const consumeInventoryItem = async (
  payload: any,
  playerID: number | string,
  itemKey: string,
) => {
  const { docs } = await getPlayerInventory(payload, playerID)
  const item = docs.find((doc) => doc.itemKey === itemKey)

  if (!item) {
    return { ok: false as const, error: `No ${itemKey} items left` }
  }

  const currentQuantity = asNumber(item.quantity, 0)

  if (currentQuantity < 1) {
    return { ok: false as const, error: `No ${itemKey} items left` }
  }

  await payload.update({
    collection: 'inventory',
    id: item.id,
    data: {
      quantity: currentQuantity - 1,
    },
    depth: 0,
    overrideAccess: true,
  })

  const refreshed = await getPlayerInventory(payload, playerID)

  return {
    ok: true as const,
    counts: refreshed.counts,
  }
}
