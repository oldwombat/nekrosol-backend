import type { Payload } from 'payload'

export type ActivityCategory = 'damage' | 'heal' | 'inventory' | 'info'

export type ActivityEntry = {
  subject: string
  body: string
  category: ActivityCategory
}

/**
 * Write one or more activity_log Messages for a player.
 * Used by player-actions route to record notable in-game events
 * (health damage, radiation exposure, inventory changes).
 *
 * Entries are stored as Messages with type: 'activity_log' and isRead: true
 * so they don't inflate the unread badge count but are visible in the log.
 */
export async function createActivityLog(
  playerId: string | number,
  payload: Payload,
  entries: ActivityEntry[],
): Promise<void> {
  for (const entry of entries) {
    await payload.create({
      collection: 'messages',
      data: {
        player: playerId,
        npcSlug: 'system',
        npcName: 'System',
        subject: entry.subject,
        body: entry.body,
        type: 'activity_log',
        isRead: true,
        metadata: { category: entry.category },
      },
      overrideAccess: true,
    })
  }
}

export type InventoryDelta = {
  itemKey: string
  quantity: number
  direction: 'add' | 'remove'
}

/**
 * Compute inventory deltas by comparing snapshot counts before and after
 * a player action. Returns only items that actually changed quantity.
 */
export function diffInventory(
  before: Record<string, number>,
  after: Record<string, number>,
): InventoryDelta[] {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
  const deltas: InventoryDelta[] = []
  for (const key of allKeys) {
    const prev = before[key] ?? 0
    const next = after[key] ?? 0
    const diff = next - prev
    if (diff > 0) deltas.push({ itemKey: key, quantity: diff, direction: 'add' })
    if (diff < 0) deltas.push({ itemKey: key, quantity: Math.abs(diff), direction: 'remove' })
  }
  return deltas
}
