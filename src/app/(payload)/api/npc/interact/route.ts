import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import type { Mission, Player, PlayerNpcInteraction } from '@/payload-types'
import { isMissionVisible } from '@/lib/mission-engine'

/** NPC definitions — name and dialogue keyed by npcId */
const NPC_CATALOGUE: Record<string, { name: string; dialogue: string }> = {
  'vex': {
    name: 'Vex',
    dialogue:
      "Vex doesn't look up when you approach. \"Courier work. No questions, no trackers, no heroics. Pay's fair if you don't do anything stupid.\" She slides a data chip across the table. \"Routes are on there. Come back when it's done.\"",
  },
  'the-broker': {
    name: 'The Broker',
    dialogue:
      'The Broker studies you for a long moment before speaking. "I have eyes on a deal. I need your eyes too — different faces, different angles." He names the location and time. "You\'ll know what to look for when you see it. Report back." He doesn\'t say what happens if you don\'t.',
  },
}

/**
 * POST /api/npc/interact
 *
 * Body: { npcId: string }
 *
 * Records the interaction (upsert), returns NPC dialogue + any missions newly
 * made visible by this interaction.
 */
export const POST = async (request: Request) => {
  try {
    const payload = await getPayload({ config: configPromise })
    const headers = await getHeaders()
    const { user } = await payload.auth({ headers })

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.collection !== 'players') return Response.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => null)
    const npcId = body?.npcId as string | undefined

    if (!npcId) return Response.json({ error: 'npcId is required' }, { status: 400 })

    const npcDef = NPC_CATALOGUE[npcId]
    if (!npcDef) {
      return Response.json({ error: `Unknown NPC: ${npcId}` }, { status: 404 })
    }

    const player = await payload.findByID({
      collection: 'players',
      id: user.id,
      depth: 0,
      overrideAccess: true,
    }) as Player

    // Upsert interaction record
    const existing = await payload.find({
      collection: 'player-npc-interactions',
      where: {
        and: [
          { player: { equals: user.id } },
          { npcId: { equals: npcId } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    let interactionCount: number
    if (existing.totalDocs > 0) {
      const record = existing.docs[0] as PlayerNpcInteraction
      interactionCount = ((record.interactionCount as number) ?? 1) + 1
      await payload.update({
        collection: 'player-npc-interactions',
        id: record.id,
        data: { interactionCount },
        overrideAccess: true,
      })
    } else {
      interactionCount = 1
      await payload.create({
        collection: 'player-npc-interactions',
        data: {
          player: user.id,
          npcId,
          firstInteractionAt: new Date().toISOString(),
          interactionCount: 1,
        },
        overrideAccess: true,
      })
    }

    // Find missions newly unlocked by this interaction
    const allMissions = await payload.find({
      collection: 'missions',
      where: { isActive: { equals: true } },
      limit: 500,
      depth: 0,
      overrideAccess: true,
    })

    const unlockedMissions: { id: string; name: string }[] = []

    for (const mission of allMissions.docs as Mission[]) {
      const visReqs = (mission.visibilityRequirements ?? []) as Array<{ type: string; npcId?: string }>
      const hasThisNpc = visReqs.some((r) => r.type === 'npc_interaction' && r.npcId === npcId)
      if (!hasThisNpc) continue

      const visible = await isMissionVisible(player, mission, payload)
      if (visible) {
        unlockedMissions.push({ id: mission.slug as string, name: mission.name as string })
      }
    }

    return Response.json({
      ok: true,
      npcId,
      npc: { id: npcId, name: npcDef.name },
      dialogue: npcDef.dialogue,
      interactionCount,
      unlockedMissions,
    })
  } catch (err) {
    console.error('[POST /api/npc/interact]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
