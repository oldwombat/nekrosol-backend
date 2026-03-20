import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import type { Mission, Player } from '@/payload-types'
import { syncEnergyRegen } from '@/lib/energy'
import {
  canRunMission,
  executeMission,
  checkNewlyAvailableMissions,
  createMissionAvailableMessage,
} from '@/lib/mission-engine'
import { consumeInventoryItem, getPlayerInventory } from '@/lib/player-inventory'

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
 *   radiationTick: { decayed: number, damage: number },
 *   player: Player,
 *   inventoryCounts: Record<string, number>,
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

    // Sync energy regen before any checks
    const player = await syncEnergyRegen(user.id, payload) as Player

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

    // Check item costs before running (consume inventory items)
    const costs = Array.isArray(mission.costs) ? mission.costs as Array<{ type: string; itemKey?: string; quantity?: number }> : []
    const itemCosts = costs.filter((c) => c.type === 'item')
    for (const cost of itemCosts) {
      if (!cost.itemKey) continue
      const inventoryCheck = await getPlayerInventory(payload, player.id)
      const have = inventoryCheck.counts[cost.itemKey] ?? 0
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

    // Radiation tick: every action passively decays radiation by 1.
    // If radiation was > 80 before decay, radiation sickness deals -2 health.
    const postActionPlayer = result.playerAfter
    const postActionRadiation = postActionPlayer.radiation ?? 0
    const tickDamage: 0 | 2 = postActionRadiation > 80 ? 2 : 0
    const radiationTick = { decayed: 1, damage: tickDamage }

    const tickData: Record<string, number> = {
      radiation: Math.max(0, postActionRadiation - 1),
    }
    if (tickDamage > 0) {
      tickData.health = Math.max(0, (postActionPlayer.health ?? 0) - tickDamage)
    }

    const finalPlayer = await payload.update({
      collection: 'players',
      id: player.id,
      data: tickData,
      overrideAccess: true,
      depth: 0,
    }) as Player

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

    return Response.json({
      ok: true,
      action: actionSlug,
      rewardsSummary: result.rewardsSummary,
      statChanges: result.statChanges,
      radiationTick,
      player: finalPlayer,
      inventoryCounts: inventory.counts,
      newMessages,
    })
  } catch (error) {
    console.error('player-actions error', error)
    return Response.json({ error: 'Action failed' }, { status: 500 })
  }
}
