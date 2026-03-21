import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import type { Player } from '@/payload-types'

type SkillKey =
  | 'thug' | 'thief' | 'grifter' | 'pilot' | 'medic' | 'hacker'
  | 'technician' | 'chemist' | 'physicist' | 'scavenger' | 'mechanic' | 'smuggler'

const SKILL_KEYS: SkillKey[] = [
  'thug', 'thief', 'grifter', 'pilot', 'medic', 'hacker',
  'technician', 'chemist', 'physicist', 'scavenger', 'mechanic', 'smuggler',
]

// Must mirror home-data.ts skillRankTables exactly.
const SKILL_RANK_TABLES: Record<SkillKey, string[]> = {
  thug:        ['Scrapper', 'Brawler', 'Bruiser', 'Enforcer', 'Juggernaut'],
  thief:       ['Pickpocket', 'Prowler', 'Cutpurse', 'Shadowstep', 'Phantom'],
  grifter:     ['Hustler', 'Schemer', 'Con Artist', 'Mastermind', 'Architect'],
  pilot:       ['Joyrider', 'Freelancer', 'Ace', 'Vanguard', 'Ghost'],
  medic:       ['Patcher', 'Field Medic', 'Surgeon', 'Trauma Specialist', 'Miracle Worker'],
  hacker:      ['Script Kiddie', 'Logic Bomber', 'Zero-Day', 'Ghost Wire', 'Null Pointer'],
  technician:  ['Tinkerer', 'Rigger', 'Engineer', 'Artificer', 'Forge Sage'],
  chemist:     ['Mixer', 'Alchemist', 'Synthesist', 'Toxicologist', 'Plague Savant'],
  physicist:   ['Student', 'Researcher', 'Theorist', 'Radiomancer', 'Void Entropist'],
  scavenger:   ['Drifter', 'Scrounger', 'Salvager', 'Wraith Walker', 'Dust Prophet'],
  mechanic:    ['Grease Monkey', 'Wrenchhead', 'Machinist', 'Forge Hand', 'Iron Sage'],
  smuggler:    ['Mule', 'Runner', 'Operator', 'Ghost Liner', 'Shadow Broker'],
}

/** Returns the rank name a player has earned for a skill, or null if unranked. */
function getEarnedRank(player: Player, skill: SkillKey): string | null {
  const value = Number(player[skill] ?? 0)
  const prestige = Number(player[`${skill}Prestige` as keyof Player] ?? 0)
  if (value <= 0 && prestige <= 0) return null
  const tiers = SKILL_RANK_TABLES[skill]
  const tierIndex = Math.min(prestige, tiers.length - 1)
  return tiers[tierIndex]
}

/** Returns all rank names the player has currently earned (one per skill). */
function getAllEarnedRanks(player: Player): string[] {
  return SKILL_KEYS
    .map((skill) => getEarnedRank(player, skill))
    .filter((r): r is string => r !== null)
}

/**
 * POST /api/players/title
 *
 * Set the player's display title to an earned rank name.
 * Body: { title: string }
 *
 * The title must be one of the rank names the player has currently earned.
 * Pass an empty string or null to clear the title.
 *
 * Response: { ok: true, displayTitle: string | null }
 */
export async function POST(req: Request) {
  try {
    const payload = await getPayload({ config: configPromise })
    const headers = await getHeaders()

    const { user } = await payload.auth({ headers })
    if (!user || user.collection !== 'players') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const title: string | null = typeof body?.title === 'string' ? body.title.trim() : null

    // Allow clearing the title
    if (!title) {
      await payload.update({
        collection: 'players',
        id: user.id,
        data: { displayTitle: null },
        overrideAccess: true,
      })
      return Response.json({ ok: true, displayTitle: null })
    }

    const player = await payload.findByID({
      collection: 'players',
      id: user.id,
      overrideAccess: true,
    }) as Player

    const earnedRanks = getAllEarnedRanks(player)
    if (!earnedRanks.includes(title)) {
      return Response.json(
        { error: `Title "${title}" has not been earned. Earn it by advancing the relevant skill.` },
        { status: 400 },
      )
    }

    await payload.update({
      collection: 'players',
      id: user.id,
      data: { displayTitle: title },
      overrideAccess: true,
    })

    return Response.json({ ok: true, displayTitle: title })
  } catch (err) {
    console.error('[players/title POST] error', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
