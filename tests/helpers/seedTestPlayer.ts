import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

export const testPlayer = {
  email: 'testplayer@nekrosol.test',
  password: 'testpass123',
}

export const testPlayer2 = {
  email: 'testplayer2@nekrosol.test',
  password: 'testpass456',
}

type StatOverrides = {
  credits?: number
  energy?: number
  health?: number
  radiation?: number
}

async function deletePlayerAndInventory(payload: Awaited<ReturnType<typeof getPayload>>, email: string): Promise<void> {
  const existing = await payload.find({
    collection: 'players',
    where: { email: { equals: email } },
    overrideAccess: true,
    depth: 0,
  })

  for (const player of existing.docs) {
    // Delete dependent rows before deleting the player (NOT NULL FK constraints)
    await payload.delete({
      collection: 'player-quest-progress',
      where: { player: { equals: player.id } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'player-mission-history',
      where: { player: { equals: player.id } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'messages',
      where: { player: { equals: player.id } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'inventory',
      where: { player: { equals: player.id } },
      overrideAccess: true,
    })
    await payload.delete({
      collection: 'players',
      id: player.id,
      overrideAccess: true,
    })
  }
}

/**
 * Deletes any existing test player and creates a fresh one with default game stats.
 */
export async function seedTestPlayer(overrides: StatOverrides = {}): Promise<void> {
  const payload = await getPayload({ config })
  await deletePlayerAndInventory(payload, testPlayer.email)

  await payload.create({
    collection: 'players',
    data: {
      email: testPlayer.email,
      password: testPlayer.password,
      credits: overrides.credits ?? 50,
      energy: overrides.energy ?? 10,
      health: overrides.health ?? 100,
      radiation: overrides.radiation ?? 0,
    },
    overrideAccess: true,
  })
}

/**
 * Seeds the test player and populates their inventory with the given items.
 */
export async function seedTestPlayerWithInventory(
  items: Array<{ itemKey: string; quantity: number }>,
  overrides: StatOverrides = {},
): Promise<void> {
  const payload = await getPayload({ config })
  await deletePlayerAndInventory(payload, testPlayer.email)

  const player = await payload.create({
    collection: 'players',
    data: {
      email: testPlayer.email,
      password: testPlayer.password,
      credits: overrides.credits ?? 50,
      energy: overrides.energy ?? 10,
      health: overrides.health ?? 100,
      radiation: overrides.radiation ?? 0,
    },
    overrideAccess: true,
  })

  for (const item of items) {
    await payload.create({
      collection: 'inventory',
      data: {
        player: player.id,
        itemKey: item.itemKey,
        quantity: item.quantity,
      },
      overrideAccess: true,
    })
  }
}

/**
 * Deletes the test player and all their inventory records.
 */
export async function cleanupTestPlayer(): Promise<void> {
  const payload = await getPayload({ config })
  await deletePlayerAndInventory(payload, testPlayer.email)
}

/**
 * Deletes any existing second test player and creates a fresh one.
 */
export async function seedTestPlayer2(overrides: StatOverrides = {}): Promise<void> {
  const payload = await getPayload({ config })
  await deletePlayerAndInventory(payload, testPlayer2.email)

  await payload.create({
    collection: 'players',
    data: {
      email: testPlayer2.email,
      password: testPlayer2.password,
      credits: overrides.credits ?? 0,
      energy: overrides.energy ?? 10,
      health: overrides.health ?? 100,
      radiation: overrides.radiation ?? 0,
    },
    overrideAccess: true,
  })
}

/**
 * Deletes the second test player and all their inventory records.
 */
export async function cleanupTestPlayer2(): Promise<void> {
  const payload = await getPayload({ config })
  await deletePlayerAndInventory(payload, testPlayer2.email)
}
