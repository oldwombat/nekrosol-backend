import { test, expect, request as playwrightRequest, type APIRequestContext } from '@playwright/test'
import {
  testPlayer,
  testPlayer2,
  seedTestPlayer,
  seedTestPlayerWithInventory,
  seedTestPlayer2,
  cleanupTestPlayer,
  cleanupTestPlayer2,
} from '../helpers/seedTestPlayer'

const BASE_URL = 'http://localhost:3000'
const LOGIN_URL = `${BASE_URL}/api/players/login`
const INVENTORY_URL = `${BASE_URL}/api/player-inventory`

async function loginPlayer(
  request: APIRequestContext,
  player: { email: string; password: string },
): Promise<void> {
  const res = await request.post(LOGIN_URL, {
    data: { email: player.email, password: player.password },
  })
  expect(res.status()).toBe(200)
}

test.describe('GET /api/player-inventory', () => {
  test.afterAll(async () => {
    await cleanupTestPlayer()
    await cleanupTestPlayer2()
  })

  test('returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get(INVENTORY_URL)
    expect(res.status()).toBe(401)
  })

  test('returns empty counts for player with no inventory', async ({ request }) => {
    await seedTestPlayer()
    await loginPlayer(request, testPlayer)
    const res = await request.get(INVENTORY_URL)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.counts).toEqual({})
    expect(body.items).toEqual([])
  })

  test('returns correct counts after items seeded', async ({ request }) => {
    await seedTestPlayerWithInventory([
      { itemKey: 'SPD-1', quantity: 3 },
      { itemKey: 'MED-1', quantity: 1 },
      { itemKey: 'RAD-X', quantity: 5 },
    ])
    await loginPlayer(request, testPlayer)
    const res = await request.get(INVENTORY_URL)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.counts['SPD-1']).toBe(3)
    expect(body.counts['MED-1']).toBe(1)
    expect(body.counts['RAD-X']).toBe(5)
    expect(body.items).toHaveLength(3)
  })

  test("player cannot access another player's inventory", async () => {
    // Seed player 1 with items, player 2 with nothing
    await seedTestPlayerWithInventory([{ itemKey: 'SPD-1', quantity: 10 }])
    await seedTestPlayer2()

    // Create a separate request context for player 2
    const ctx2 = await playwrightRequest.newContext()
    try {
      const loginRes = await ctx2.post(LOGIN_URL, {
        data: { email: testPlayer2.email, password: testPlayer2.password },
      })
      expect(loginRes.status()).toBe(200)

      // Player 2 can only see their own (empty) inventory
      const res = await ctx2.get(INVENTORY_URL)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.counts).toEqual({})
      expect(body.items).toEqual([])
    } finally {
      await ctx2.dispose()
    }
  })
})
