/**
 * mission-engine.ts — Generic data-driven mission rules engine.
 *
 * Missions are defined as data records in the Missions collection.
 * This engine interprets those records without any mission-specific code.
 *
 * Flow:
 *   1. isMissionVisible()     — should this mission appear in the player's list?
 *   2. canRunMission()        — can the player run it right now?
 *   3. executeMission()       — apply costs, resolve rewards, record history
 *   4. checkNewlyAvailable()  — after a state change, which missions just unlocked?
 *
 * Requirement types:  stat_min | stat_max | mission_completed_count | item_in_inventory
 * Cost types:         energy | credits | health | item
 * Reward types:       credits | stat_delta | item_chance | item_guaranteed
 */

import type { Payload } from 'payload'
import type { Mission, Player } from '../payload-types'
import { addInventoryItem, getPlayerInventory } from './player-inventory'

// ─── Typed rule shapes ────────────────────────────────────────────────────────

type StatName = keyof Pick<
  Player,
  | 'energy' | 'energyMax' | 'health' | 'healthMax'
  | 'credits' | 'creditsMax' | 'radiation' | 'radiationMax'
  | 'thug' | 'thief' | 'grifter' | 'pilot' | 'medic' | 'hacker'
  | 'technician' | 'chemist' | 'physicist' | 'scavenger' | 'mechanic' | 'smuggler'
>

export interface RequirementStatMin { type: 'stat_min'; stat: StatName; value: number }
export interface RequirementStatMax { type: 'stat_max'; stat: StatName; value: number }
export interface RequirementMissionCount { type: 'mission_completed_count'; missionSlug: string; count: number }
export interface RequirementItemInInventory { type: 'item_in_inventory'; itemKey: string; quantity: number }
export type Requirement =
  | RequirementStatMin
  | RequirementStatMax
  | RequirementMissionCount
  | RequirementItemInInventory

export interface CostEnergy { type: 'energy'; amount: number }
export interface CostCredits { type: 'credits'; amount: number }
export interface CostHealth { type: 'health'; amount: number }
export interface CostItem { type: 'item'; itemKey: string; quantity: number }
export type Cost = CostEnergy | CostCredits | CostHealth | CostItem

export interface RewardCredits { type: 'credits'; min: number; max: number }
export interface RewardStatDelta { type: 'stat_delta'; stat: StatName; amount: number }
export interface RewardStatChance { type: 'stat_chance'; stat: StatName; amount: number; probability: number }
export interface RewardItemChance { type: 'item_chance'; itemKey: string; probability: number; quantity: number }
export interface RewardItemGuaranteed { type: 'item_guaranteed'; itemKey: string; quantity: number }
export type Reward = RewardCredits | RewardStatDelta | RewardStatChance | RewardItemChance | RewardItemGuaranteed

export interface MissionResult {
  success: true
  rewardsSummary: string[]
  statChanges: Partial<Record<StatName, number>>
  itemsReceived: { itemKey: string; quantity: number }[]
  playerAfter: Player
}

export interface BlockedReason {
  type: string
  message: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJson<T>(raw: Mission['costs']): T[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw as T[]
}

function getStat(player: Player, stat: StatName): number {
  const val = player[stat]
  return typeof val === 'number' ? val : 0
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ─── Requirement checking ─────────────────────────────────────────────────────

async function checkRequirement(
  req: Requirement,
  player: Player,
  missionCountCache: Record<string, number>,
  inventoryCounts: Record<string, number>,
): Promise<BlockedReason | null> {
  switch (req.type) {
    case 'stat_min': {
      const current = getStat(player, req.stat)
      if (current < req.value) {
        return {
          type: req.type,
          message: `Need ${req.value} ${req.stat} (you have ${current})`,
        }
      }
      return null
    }

    case 'stat_max': {
      const current = getStat(player, req.stat)
      if (current > req.value) {
        return {
          type: req.type,
          message: `${req.stat} must be ≤ ${req.value} (you have ${current})`,
        }
      }
      return null
    }

    case 'mission_completed_count': {
      const count = missionCountCache[req.missionSlug] ?? 0
      if (count < req.count) {
        return {
          type: req.type,
          message: `Need to complete ${req.missionSlug} × ${req.count} (done ${count})`,
        }
      }
      return null
    }

    case 'item_in_inventory': {
      const have = inventoryCounts[req.itemKey] ?? 0
      if (have < req.quantity) {
        return {
          type: req.type,
          message: `Need ${req.quantity}× ${req.itemKey} in inventory (have ${have})`,
        }
      }
      return null
    }
  }
}

async function checkRequirements(
  requirements: Requirement[],
  player: Player,
  payload: Payload,
): Promise<BlockedReason[]> {
  const blocked: BlockedReason[] = []
  const missionCountCache: Record<string, number> = {}
  const { counts: inventoryCounts } = await getPlayerInventory(payload, player.id)

  // Pre-fetch mission counts for any mission_completed_count requirements (batch)
  const missionSlugsNeeded = requirements
    .filter((r): r is RequirementMissionCount => r.type === 'mission_completed_count')
    .map((r) => r.missionSlug)

  for (const slug of [...new Set(missionSlugsNeeded)]) {
    const result = await payload.find({
      collection: 'player-mission-history',
      where: { and: [{ player: { equals: player.id } }, { missionSlug: { equals: slug } }] },
      limit: 0,
      depth: 0,
      overrideAccess: true,
    })
    missionCountCache[slug] = result.totalDocs
  }

  for (const requirement of requirements) {
    const reason = await checkRequirement(requirement, player, missionCountCache, inventoryCounts)
    if (reason) blocked.push(reason)
  }

  return blocked
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Should this mission appear in the player's mission list at all?
 * When false, the mission is completely hidden (not even greyed-out).
 */
export async function isMissionVisible(
  player: Player,
  mission: Mission,
  payload: Payload,
): Promise<boolean> {
  if (!mission.isActive) return false

  const visReqs = parseJson<Requirement>(mission.visibilityRequirements)
  if (visReqs.length === 0) return true

  const blocked = await checkRequirements(visReqs, player, payload)
  return blocked.length === 0
}

/**
 * Can the player run this mission right now?
 * Returns { canRun: true } or { canRun: false, blockedReasons }.
 */
export async function canRunMission(
  player: Player,
  mission: Mission,
  payload: Payload,
): Promise<{ canRun: true } | { canRun: false; blockedReasons: BlockedReason[] }> {
  const requirements = parseJson<Requirement>(mission.requirements)
  const blocked = await checkRequirements(requirements, player, payload)

  if (blocked.length > 0) {
    return { canRun: false, blockedReasons: blocked }
  }
  return { canRun: true }
}

/**
 * Apply costs, resolve rewards, update player stats, record mission history.
 * Only call after canRunMission() confirms the player is eligible.
 */
export async function executeMission(
  player: Player,
  mission: Mission,
  payload: Payload,
): Promise<MissionResult> {
  const costs = parseJson<Cost>(mission.costs)
  const rewards = parseJson<Reward>(mission.rewards)

  const statChanges: Partial<Record<StatName, number>> = {}
  const itemsReceived: { itemKey: string; quantity: number }[] = []
  const rewardsSummary: string[] = []

  // ── Apply costs ──────────────────────────────────────────────────────────
  for (const cost of costs) {
    switch (cost.type) {
      case 'energy':
        statChanges.energy = (statChanges.energy ?? 0) - cost.amount
        break
      case 'credits':
        statChanges.credits = (statChanges.credits ?? 0) - cost.amount
        break
      case 'health':
        statChanges.health = (statChanges.health ?? 0) - cost.amount
        break
      case 'item':
        // Item costs are consumed from inventory separately (not in statChanges)
        break
    }
  }

  // ── Resolve rewards ───────────────────────────────────────────────────────
  for (const reward of rewards) {
    switch (reward.type) {
      case 'credits': {
        const amount = randInt(reward.min, reward.max)
        statChanges.credits = (statChanges.credits ?? 0) + amount
        rewardsSummary.push(`+${amount} credits`)
        break
      }
      case 'stat_delta': {
        statChanges[reward.stat] = (statChanges[reward.stat] ?? 0) + reward.amount
        const sign = reward.amount >= 0 ? '+' : ''
        rewardsSummary.push(`${sign}${reward.amount} ${reward.stat}`)
        break
      }
      case 'stat_chance': {
        if (Math.random() < reward.probability) {
          statChanges[reward.stat] = (statChanges[reward.stat] ?? 0) + reward.amount
          const sign = reward.amount >= 0 ? '+' : ''
          rewardsSummary.push(`${sign}${reward.amount} ${reward.stat}`)
        }
        break
      }
      case 'item_chance': {
        if (Math.random() < reward.probability) {
          itemsReceived.push({ itemKey: reward.itemKey, quantity: reward.quantity })
          rewardsSummary.push(`Found ${reward.quantity}× ${reward.itemKey}`)
        }
        break
      }
      case 'item_guaranteed': {
        itemsReceived.push({ itemKey: reward.itemKey, quantity: reward.quantity })
        rewardsSummary.push(`Received ${reward.quantity}× ${reward.itemKey}`)
        break
      }
    }
  }

  // ── Write stat changes ────────────────────────────────────────────────────
  const statUpdateData: Record<string, number> = {}
  for (const [stat, delta] of Object.entries(statChanges)) {
    if (delta === 0) continue
    const current = getStat(player, stat as StatName)
    const next = current + delta
    const maxStat = (stat + 'Max') as keyof Player
    const cap = typeof player[maxStat] === 'number' ? (player[maxStat] as number) : Infinity
    statUpdateData[stat] = Math.max(0, Math.min(next, cap))
  }

  const updatedPlayer = await payload.update({
    collection: 'players',
    id: player.id,
    data: statUpdateData,
    overrideAccess: true,
  }) as Player

  // ── Add inventory rewards ─────────────────────────────────────────────────
  for (const item of itemsReceived) {
    await addInventoryItem(payload, player.id, item.itemKey, item.quantity)
  }

  // ── Record mission history ────────────────────────────────────────────────
  await payload.create({
    collection: 'player-mission-history',
    data: {
      player: player.id,
      missionSlug: mission.slug,
      completedAt: new Date().toISOString(),
      outcome: { rewardsSummary, statChanges: statUpdateData },
    },
    overrideAccess: true,
  })

  return {
    success: true,
    rewardsSummary,
    statChanges,
    itemsReceived,
    playerAfter: updatedPlayer,
  }
}

/**
 * Compare player state before/after an action.
 * Returns missions that just became visible (for NPC message triggers).
 */
export async function checkNewlyAvailableMissions(
  playerBefore: Player,
  playerAfter: Player,
  allMissions: Mission[],
  payload: Payload,
): Promise<Mission[]> {
  const newlyAvailable: Mission[] = []

  for (const mission of allMissions) {
    const wasBefore = await isMissionVisible(playerBefore, mission, payload)
    const isNow = await isMissionVisible(playerAfter, mission, payload)
    if (!wasBefore && isNow) {
      newlyAvailable.push(mission)
    }
  }

  return newlyAvailable
}

/**
 * Create an NPC inbox message for a newly available mission.
 */
export async function createMissionAvailableMessage(
  playerId: number | string,
  mission: Mission,
  payload: Payload,
): Promise<void> {
  const body =
    mission.availabilityMessage ??
    `A new opportunity has opened up: ${mission.name}. Check your missions.`

  await payload.create({
    collection: 'messages',
    data: {
      player: playerId,
      npcSlug: mission.npcSlug ?? 'sal',
      npcName: mission.npcName ?? 'Sal',
      subject: `New job: ${mission.name}`,
      body,
      type: 'mission_available',
      isRead: false,
      metadata: { missionSlug: mission.slug },
    },
    overrideAccess: true,
    })
}
