import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import type { Mission, Player } from '../../../../payload-types'
import { isMissionVisible, canRunMission } from '../../../../lib/mission-engine'
import { syncEnergyRegen } from '../../../../lib/energy'

/**
 * GET /api/missions
 *
 * Returns all missions visible to the authenticated player, with per-mission
 * availability status and blocked reasons.
 *
 * Visibility rules:
 *   - isActive: false  → hidden entirely
 *   - visibilityRequirements not met → hidden entirely
 *   - requirements not met → shown, available: false, with blockedReasons
 *   - all requirements met → available: true
 *
 * Also returns unreadMessages count for the frontend badge.
 *
 * Response: { missions: MissionWithStatus[], unreadMessages: number }
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

    // Sync energy regeneration before evaluating requirements
    const freshPlayer = await syncEnergyRegen(player.id, payload)

    // Fetch all active missions
    const missionsResult = await payload.find({
      collection: 'missions',
      where: { isActive: { equals: true } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })

    const allMissions = missionsResult.docs as Mission[]

    // Evaluate visibility and availability for each mission
    const missionsWithStatus = await Promise.all(
      allMissions.map(async (mission) => {
        const visible = await isMissionVisible(freshPlayer, mission, payload)
        if (!visible) return null

        const availabilityResult = await canRunMission(freshPlayer, mission, payload)

        return {
          id: mission.id,
          slug: mission.slug,
          name: mission.name,
          description: mission.description,
          category: mission.category,
          primarySkill: mission.primarySkill,
          tier: mission.tier,
          costs: mission.costs,
          rewards: mission.rewards,
          available: availabilityResult.canRun,
          blockedReasons: availabilityResult.canRun ? [] : availabilityResult.blockedReasons,
        }
      }),
    )

    const visibleMissions = missionsWithStatus.filter(Boolean)

    // Count unread messages for badge
    const unreadResult = await payload.find({
      collection: 'messages',
      where: {
        and: [
          { player: { equals: freshPlayer.id } },
          { isRead: { equals: false } },
        ],
      },
      limit: 0,
      overrideAccess: true,
    })

    return Response.json({
      missions: visibleMissions,
      unreadMessages: unreadResult.totalDocs,
    })
  } catch (err) {
    console.error('[missions GET] error', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
