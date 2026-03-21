import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import type { Mission, Player } from '@/payload-types'
import { syncEnergyRegen } from '@/lib/energy'
import { syncRadiationDecay } from '@/lib/radiation'
import {
  canRunMission,
  executeMission,
  checkNewlyAvailableMissions,
  createMissionAvailableMessage,
} from '@/lib/mission-engine'
import { consumeInventoryItem, getPlayerInventory } from '@/lib/player-inventory'
import { createActivityLog, diffInventory, type ActivityEntry } from '@/lib/activity-log'

/**
 * POST /api/player-actions
 *
 * Execute a mission by slug. The action slug is looked up in the Missions
 * collection and executed by the generic mission engine.
 *
 * Body: { action: string }  — mission slug (case-insensitive, e.g. "patrol", "ESCORT")
 *
 * Response: {
 *   ok: true,
 *   action: string,
 *   rewardsSummary: string[],
 *   statChanges: Record<string, number>,
 *   player: Player,
 *   inventoryCounts: Record<string, number>,
 *   inventoryDeltas: Array<{ itemKey: string; quantity: number; direction: 'add' | 'remove' }>,
 *   newMessages: number,
 * }
 */
export const POST = async (request: Request) => {
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

    const body = await request.json().catch(() => null)
    const rawAction = body?.action as string | undefined

    if (!rawAction || typeof rawAction !== 'string') {
      return Response.json({ error: 'Missing action' }, { status: 400 })
    }

    // Normalize to lowercase for slug lookup
    const actionSlug = rawAction.toLowerCase()

    // Sync energy regen and radiation decay before any checks
    const player = await syncRadiationDecay(
      (await syncEnergyRegen(user.id, payload)).id,
      payload,
    ) as Player

    // Look up mission from the database
    const missionsResult = await payload.find({
      collection: 'missions',
      where: {
        and: [
          { slug: { equals: actionSlug } },
          { isActive: { equals: true } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    if (missionsResult.docs.length === 0) {
      return Response.json({ error: `Unknown action: ${rawAction}` }, { status: 400 })
    }

    const mission = missionsResult.docs[0] as Mission

    // Snapshot inventory before any changes so we can compute deltas later
    const preInventory = await getPlayerInventory(payload, player.id)
    const prevCounts = preInventory.counts

    // Check item costs before running (consume inventory items)
    const costs = Array.isArray(mission.costs) ? mission.costs as Array<{ type: string; itemKey?: string; quantity?: number }> : []
    const itemCosts = costs.filter((c) => c.type === 'item')
    for (const cost of itemCosts) {
      if (!cost.itemKey) continue
      const have = prevCounts[cost.itemKey] ?? 0
      if (have < (cost.quantity ?? 1)) {
        return Response.json({ error: `No ${cost.itemKey} items left` }, { status: 400 })
      }
    }

    // Check mission requirements
    const check = await canRunMission(player, mission, payload)
    if (!check.canRun) {
      const firstReason = check.blockedReasons[0]?.message ?? 'Requirements not met'
      return Response.json({ error: firstReason, blockedReasons: check.blockedReasons }, { status: 400 })
    }

    // Consume item costs from inventory
    for (const cost of itemCosts) {
      if (!cost.itemKey) continue
      const consumed = await consumeInventoryItem(payload, player.id, cost.itemKey)
      if (!consumed.ok) {
        return Response.json({ error: consumed.error }, { status: 400 })
      }
    }

    // Execute the mission (applies stat costs + rewards, records history)
    const result = await executeMission(player, mission, payload)

    const postActionPlayer = result.playerAfter

    // Apply any remaining housekeeping updates (energy regen clock init).
    // Radiation is now managed by the lazy syncRadiationDecay pattern — no per-action tick.
    const tickData: Record<string, number | string> = {}

    // Start the regen clock the first time energy drops below max.
    // Without this, lastEnergyUpdate stays null and the frontend countdown never runs.
    const energyAfter = (postActionPlayer.energy as number) ?? 0
    const energyMax = (postActionPlayer.energyMax as number) ?? 10
    if (energyAfter < energyMax && !postActionPlayer.lastEnergyUpdate) {
      tickData.lastEnergyUpdate = new Date().toISOString()
    }

    // Start the radiation decay clock the first time the player has radiation.
    const radiationAfter = (postActionPlayer.radiation as number) ?? 0
    if (radiationAfter > 0 && !postActionPlayer.lastRadiationUpdate) {
      tickData.lastRadiationUpdate = new Date().toISOString()
    }

    const finalPlayer = Object.keys(tickData).length > 0
      ? await payload.update({
          collection: 'players',
          id: player.id,
          data: tickData,
          overrideAccess: true,
          depth: 0,
        }) as Player
      : postActionPlayer as Player

    // Check for newly available missions and notify via NPC messages
    let newMessages = 0
    try {
      const allMissionsResult = await payload.find({
        collection: 'missions',
        where: { isActive: { equals: true } },
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })
      const allMissions = allMissionsResult.docs as Mission[]
      const newlyAvailable = await checkNewlyAvailableMissions(player, finalPlayer, allMissions, payload)

      for (const m of newlyAvailable) {
        await createMissionAvailableMessage(player.id, m, payload)
        newMessages++
      }
    } catch (notifyErr) {
      // Non-fatal — don't fail the action if notification creation fails
      console.error('[player-actions] notification error', notifyErr)
    }

    const inventory = await getPlayerInventory(payload, player.id)
    const inventoryDeltas = diffInventory(prevCounts, inventory.counts)

    // Write activity log entries for notable events (non-fatal)
    try {
      const sc = result.statChanges as Record<string, number>
      const logEntries: ActivityEntry[] = []

      if ((sc.health ?? 0) < 0) {
        logEntries.push({ subject: 'Health Damage', body: `${Math.abs(sc.health!)} health lost.`, category: 'damage' })
      }
      if ((sc.health ?? 0) > 0) {
        logEntries.push({ subject: 'Health Restored', body: `+${sc.health} health restored.`, category: 'heal' })
      }
      if ((sc.radiation ?? 0) > 0) {
        logEntries.push({ subject: 'Radiation Exposure', body: `Absorbed ${sc.radiation} radiation.`, category: 'damage' })
      }
      for (const delta of inventoryDeltas) {
        if (delta.direction === 'add') {
          logEntries.push({ subject: 'Item Acquired', body: `Received ${delta.quantity}× ${delta.itemKey}.`, category: 'inventory' })
        } else {
          logEntries.push({ subject: 'Item Consumed', body: `Used ${delta.quantity}× ${delta.itemKey}.`, category: 'inventory' })
        }
      }

      if (logEntries.length > 0) {
        await createActivityLog(player.id, payload, logEntries)
      }
    } catch (logErr) {
      console.error('[player-actions] activity log error', logErr)
    }

    return Response.json({
      ok: true,
      action: actionSlug,
      rewardsSummary: result.rewardsSummary,
      statChanges: result.statChanges,
      player: finalPlayer,
      inventoryCounts: inventory.counts,
      inventoryDeltas,
      newMessages,
    })
  } catch (error) {
    console.error('player-actions error', error)
    return Response.json({ error: 'Action failed' }, { status: 500 })
  }
}
