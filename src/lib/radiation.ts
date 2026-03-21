/**
 * radiation.ts — Lazy radiation decay.
 *
 * Radiation decays over time but we never run background timers.
 * Instead we calculate the current value from the stored value and
 * the time elapsed since the last update. This happens on every request
 * that touches radiation. Offline players cost zero compute.
 *
 * Frontend receives `lastRadiationUpdate` + `decayRateMs` and can calculate
 * the countdown to the next decay tick locally — no polling needed.
 *
 * Radiation INCREASES from: patrol (+5), salvage (+8), reactor-search (+8).
 * Radiation DECREASES via: this passive decay (-1/hr), and RAD-X item consumption.
 */

import type { Payload } from 'payload'
import type { Player } from '../payload-types'

export const RADIATION_DECAY_INTERVAL_MS = 60 * 60 * 1000 // 1 radiation per hour

export interface RadiationState {
  currentRadiation: number
  decayedSinceUpdate: number
  nextDecayAt: Date
}

/**
 * Pure calculation — no DB access. Given stored radiation + last update time,
 * returns the authoritative current radiation and when the next decay tick fires.
 */
export function calculateRadiationDecay(
  storedRadiation: number,
  lastUpdate: Date,
  now: Date = new Date(),
): RadiationState {
  const elapsedMs = now.getTime() - lastUpdate.getTime()
  const decayed = Math.floor(elapsedMs / RADIATION_DECAY_INTERVAL_MS)
  const currentRadiation = Math.max(0, storedRadiation - decayed)

  const msIntoCurrentInterval = elapsedMs % RADIATION_DECAY_INTERVAL_MS
  const nextDecayAt = new Date(now.getTime() + (RADIATION_DECAY_INTERVAL_MS - msIntoCurrentInterval))

  return { currentRadiation, decayedSinceUpdate: decayed, nextDecayAt }
}

/**
 * Reads the player from DB, calculates whether radiation has decayed since
 * lastRadiationUpdate, and writes back only if something changed.
 * Returns the up-to-date player record.
 */
export async function syncRadiationDecay(
  playerId: string | number,
  payload: Payload,
): Promise<Player> {
  const player = await payload.findByID({
    collection: 'players',
    id: playerId,
    overrideAccess: true,
  }) as Player

  const currentStoredRadiation = (player.radiation as number) ?? 0

  // Nothing to do if player has no radiation.
  if (currentStoredRadiation <= 0) return player

  const lastUpdate = player.lastRadiationUpdate
    ? new Date(player.lastRadiationUpdate as string)
    : new Date()

  const { currentRadiation, decayedSinceUpdate } = calculateRadiationDecay(
    currentStoredRadiation,
    lastUpdate,
  )

  // Self-heal: if lastRadiationUpdate is missing but radiation > 0,
  // initialise the decay clock so the frontend countdown can start.
  if (decayedSinceUpdate === 0) {
    if (!player.lastRadiationUpdate) {
      return await payload.update({
        collection: 'players',
        id: playerId,
        data: { lastRadiationUpdate: new Date().toISOString() },
        overrideAccess: true,
      }) as Player
    }
    return player
  }

  const updated = await payload.update({
    collection: 'players',
    id: playerId,
    data: {
      radiation: currentRadiation,
      lastRadiationUpdate: new Date().toISOString(),
    },
    overrideAccess: true,
  }) as Player

  return updated
}
