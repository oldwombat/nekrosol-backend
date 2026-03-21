/**
 * energy.ts — Lazy energy regeneration.
 *
 * Energy regenerates over time but we never run background timers.
 * Instead we calculate the current value from the stored value and
 * the time elapsed since the last update. This happens on every request
 * that touches energy. Offline players cost zero compute.
 *
 * Frontend receives `lastEnergyUpdate` + `regenRateMs` and can calculate
 * the countdown to the next tick locally — no polling needed.
 */

import type { Payload } from 'payload'
import type { Player } from '../payload-types'

export const ENERGY_REGEN_INTERVAL_MS = 5 * 60 * 1000 // 1 energy per 5 minutes

export interface EnergyState {
  currentEnergy: number
  gainedSinceUpdate: number
  nextRegenAt: Date
}

/**
 * Pure calculation — no DB access. Given stored energy + last update time,
 * returns the authoritative current energy and when the next tick fires.
 */
export function calculateCurrentEnergy(
  storedEnergy: number,
  energyMax: number,
  lastUpdate: Date,
  now: Date = new Date(),
): EnergyState {
  const elapsedMs = now.getTime() - lastUpdate.getTime()
  const gained = Math.floor(elapsedMs / ENERGY_REGEN_INTERVAL_MS)
  const currentEnergy = Math.min(energyMax, storedEnergy + gained)

  const msIntoCurrentInterval = elapsedMs % ENERGY_REGEN_INTERVAL_MS
  const nextRegenAt = new Date(now.getTime() + (ENERGY_REGEN_INTERVAL_MS - msIntoCurrentInterval))

  return { currentEnergy, gainedSinceUpdate: gained, nextRegenAt }
}

/**
 * Reads the player from DB, calculates whether energy has regenerated since
 * lastEnergyUpdate, and writes back only if something changed.
 * Returns the up-to-date player record.
 */
export async function syncEnergyRegen(
  playerId: string | number,
  payload: Payload,
): Promise<Player> {
  const player = await payload.findByID({
    collection: 'players',
    id: playerId,
    overrideAccess: true,
  }) as Player

  const lastUpdate = player.lastEnergyUpdate
    ? new Date(player.lastEnergyUpdate as string)
    : new Date()

  const energyMax = (player.energyMax as number) ?? 10
  const currentStoredEnergy = (player.energy as number) ?? 0
  const { currentEnergy, gainedSinceUpdate } = calculateCurrentEnergy(
    currentStoredEnergy,
    energyMax,
    lastUpdate,
  )

  // Self-heal: if lastEnergyUpdate is missing but energy is below max,
  // initialise the regen clock so the frontend countdown can start.
  if (gainedSinceUpdate === 0) {
    if (!player.lastEnergyUpdate && currentStoredEnergy < energyMax) {
      return await payload.update({
        collection: 'players',
        id: playerId,
        data: { lastEnergyUpdate: new Date().toISOString() },
        overrideAccess: true,
      }) as Player
    }
    return player
  }

  const updated = await payload.update({
    collection: 'players',
    id: playerId,
    data: {
      energy: currentEnergy,
      lastEnergyUpdate: new Date().toISOString(),
    },
    overrideAccess: true,
  }) as Player

  return updated
}
