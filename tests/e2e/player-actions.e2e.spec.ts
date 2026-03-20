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
const ACTION_URL = `${BASE_URL}/api/player-actions`

async function loginPlayer(request: APIRequestContext): Promise<void> {
  const res = await request.post(LOGIN_URL, {
    data: { email: testPlayer.email, password: testPlayer.password },
  })
  expect(res.status()).toBe(200)
}

test.describe('POST /api/player-actions', () => {
  test.beforeEach(async () => {
    await seedTestPlayer()
  })

  test.afterAll(async () => {
    await cleanupTestPlayer()
    await cleanupTestPlayer2()
  })

  test('returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post(ACTION_URL, { data: { action: 'BEG' } })
    expect(res.status()).toBe(401)
  })

  test('returns 400 for invalid action type', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'INVALID' } })
    expect(res.status()).toBe(400)
  })

  test('BEG: decreases energy by 1 and increases credits', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'BEG' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.action).toBe('beg')
    expect(body.player.energy).toBe(9)
    // gain is 1–5 so credits goes from 50 to 51–55
    expect(body.player.credits).toBeGreaterThanOrEqual(51)
    expect(body.player.credits).toBeLessThanOrEqual(55)
    expect(body.rewardsSummary.length).toBeGreaterThan(0)
  })

  test('BEG: returns 400 when energy is 0', async ({ request }) => {
    await seedTestPlayer({ energy: 0 })
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'BEG' } })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/energy/i)
  })

  test('SPD-1: restores energy to max when player has SPD-1 in inventory', async ({ request }) => {
    await seedTestPlayerWithInventory([{ itemKey: 'SPD-1', quantity: 2 }], { energy: 3 })
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'SPD-1' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.player.energy).toBe(10) // restored to energyMax
    expect(body.inventoryCounts['SPD-1']).toBe(1) // one consumed
  })

  test('SPD-1: returns 400 when no SPD-1 in inventory', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'SPD-1' } })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/SPD-1/i)
  })

  test('MED-1: restores health to max when player has MED-1 in inventory', async ({ request }) => {
    await seedTestPlayerWithInventory([{ itemKey: 'MED-1', quantity: 1 }], { health: 40 })
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'MED-1' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.player.health).toBe(100) // restored to healthMax
    expect(body.inventoryCounts['MED-1']).toBe(0) // consumed
  })

  test('MED-1: returns 400 when no MED-1 in inventory', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'MED-1' } })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/MED-1/i)
  })

  test('RAD-X: reduces radiation by 10 when player has RAD-X in inventory', async ({ request }) => {
    await seedTestPlayerWithInventory([{ itemKey: 'RAD-X', quantity: 3 }], { radiation: 50 })
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'RAD-X' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.player.radiation).toBe(39)
    expect(body.inventoryCounts['RAD-X']).toBe(2)
  })

  test('RAD-X: returns 400 when no RAD-X in inventory', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'RAD-X' } })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/RAD-X/i)
  })

  test('response includes inventoryCounts reflecting item consumption', async ({ request }) => {
    await seedTestPlayerWithInventory([
      { itemKey: 'SPD-1', quantity: 2 },
      { itemKey: 'MED-1', quantity: 1 },
    ])
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'SPD-1' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.inventoryCounts).toBeDefined()
    expect(body.inventoryCounts['SPD-1']).toBe(1)
    expect(body.inventoryCounts['MED-1']).toBe(1)
  })

  // --- ESCORT tests ---

  test('ESCORT: credits increase and energy decreases by 2', async ({ request }) => {
    await seedTestPlayer({ energy: 5, credits: 0 })
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'ESCORT' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.action).toBe('escort')
    // ESCORT gain is 10–20 credits
    expect(body.player.credits).toBeGreaterThanOrEqual(10)
    expect(body.player.credits).toBeLessThanOrEqual(20)
    expect(body.player.energy).toBe(3) // 5 - 2
    expect(body.radiationTick).toBeDefined()
    expect(typeof body.radiationTick.decayed).toBe('number')
    expect([0, 2]).toContain(body.radiationTick.damage)
  })

  test('ESCORT: returns 400 when energy is 0', async ({ request }) => {
    await seedTestPlayer({ energy: 0 })
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'ESCORT' } })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/energy/i)
  })

  test('ESCORT: running action for player 1 does not affect player 2', async ({ request }) => {
    await seedTestPlayer({ energy: 5, credits: 0 })
    await seedTestPlayer2({ energy: 5, credits: 100 })

    // Login and run ESCORT as player 1
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'ESCORT' } })
    expect(res.status()).toBe(200)

    // Verify player 2's stats are unchanged by logging in as player 2
    const ctx2 = await playwrightRequest.newContext()
    try {
      const loginRes = await ctx2.post(LOGIN_URL, {
        data: { email: testPlayer2.email, password: testPlayer2.password },
      })
      expect(loginRes.status()).toBe(200)
      const meRes = await ctx2.get(`${BASE_URL}/api/players/me`)
      expect(meRes.status()).toBe(200)
      const me = await meRes.json()
      expect(me.user.energy).toBe(5)
      expect(me.user.credits).toBe(100)
    } finally {
      await ctx2.dispose()
    }
  })

  // --- radiationTick tests ---

  test('BEG: response includes radiationTick with decayed and damage properties', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'BEG' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.radiationTick).toBeDefined()
    expect(typeof body.radiationTick.decayed).toBe('number')
    expect([0, 2]).toContain(body.radiationTick.damage)
  })

  // --- Radiation sickness tests ---

  test('Radiation sickness: high radiation (>80) deals 2 health damage on BEG', async ({ request }) => {
    await seedTestPlayer({ radiation: 90, health: 50, energy: 5 })
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'BEG' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.radiationTick.damage).toBe(2)
    expect(body.player.health).toBeLessThan(50)
  })

  test('Radiation sickness: low radiation (≤80) deals no health damage on BEG', async ({ request }) => {
    await seedTestPlayer({ radiation: 50, health: 50, energy: 5 })
    await loginPlayer(request)
    const res = await request.post(ACTION_URL, { data: { action: 'BEG' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.radiationTick.damage).toBe(0)
    expect(body.player.health).toBe(50)
  })
})
