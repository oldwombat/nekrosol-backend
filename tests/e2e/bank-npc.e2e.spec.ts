import { test, expect, type APIRequestContext } from '@playwright/test'
import {
  testPlayer,
  seedTestPlayer,
  cleanupTestPlayer,
} from '../helpers/seedTestPlayer'

const BASE_URL = 'http://localhost:3000'
const LOGIN_URL = `${BASE_URL}/api/players/login`
const BANK_URL = `${BASE_URL}/api/bank`
const BANK_DEPOSIT_URL = `${BASE_URL}/api/bank/deposit`
const BANK_WITHDRAW_URL = `${BASE_URL}/api/bank/withdraw`
const NPC_URL = `${BASE_URL}/api/npc/interact`

async function loginPlayer(request: APIRequestContext): Promise<void> {
  const res = await request.post(LOGIN_URL, {
    data: { email: testPlayer.email, password: testPlayer.password },
  })
  expect(res.status()).toBe(200)
}

// ─── Ember Bank ───────────────────────────────────────────────────────────────

test.describe('Ember Bank API', () => {
  test.beforeEach(async () => {
    await seedTestPlayer()
  })

  test.afterAll(async () => {
    await cleanupTestPlayer()
  })

  test('GET /api/bank returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get(BANK_URL)
    expect(res.status()).toBe(401)
  })

  test('GET /api/bank returns terms and no active deposit for fresh player', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.get(BANK_URL)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.terms).toBeDefined()
    expect(Array.isArray(body.terms)).toBe(true)
    expect(body.terms.length).toBeGreaterThan(0)
    expect(body.terms[0]).toHaveProperty('id')
    expect(body.terms[0]).toHaveProperty('label')
    expect(body.terms[0]).toHaveProperty('interestRate')
    expect(body.activeDeposit).toBeNull()
    expect(typeof body.credits).toBe('number')
  })

  test('POST /api/bank/deposit returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post(BANK_DEPOSIT_URL, { data: { termId: '1h', amount: 100 } })
    expect(res.status()).toBe(401)
  })

  test('POST /api/bank/deposit creates a deposit and deducts credits', async ({ request }) => {
    await loginPlayer(request)

    // check starting credits (default 50)
    const bankBefore = await request.get(BANK_URL)
    const { credits: creditsBefore } = await bankBefore.json()

    const res = await request.post(BANK_DEPOSIT_URL, {
      data: { termId: '1h', amount: 100 },
    })
    // player starts with 50 credits — can't deposit 100
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/insufficient/i)

    // deposit within balance
    const depositAmount = Math.min(creditsBefore, 40)
    const res2 = await request.post(BANK_DEPOSIT_URL, {
      data: { termId: '1h', amount: depositAmount },
    })
    expect(res2.status()).toBe(200)
    const body2 = await res2.json()
    expect(body2.ok).toBe(true)
    expect(body2.deposit).toHaveProperty('maturesAt')
    expect(body2.creditsRemaining).toBe(creditsBefore - depositAmount)
  })

  test('POST /api/bank/deposit rejects a second deposit while one is active', async ({ request }) => {
    await loginPlayer(request)

    // Make first deposit
    const bankBefore = await request.get(BANK_URL)
    const { credits } = await bankBefore.json()
    const depositAmount = Math.min(credits, 10)

    const first = await request.post(BANK_DEPOSIT_URL, {
      data: { termId: '1h', amount: depositAmount },
    })
    expect(first.status()).toBe(200)

    // Attempt second
    const second = await request.post(BANK_DEPOSIT_URL, {
      data: { termId: '1h', amount: 5 },
    })
    expect(second.status()).toBe(400)
    const body = await second.json()
    expect(body.error).toMatch(/already have/i)
  })

  test('POST /api/bank/withdraw returns 400 when no active deposit', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.post(BANK_WITHDRAW_URL)
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/no active deposit/i)
  })

  test('POST /api/bank/withdraw returns 400 when deposit has not matured', async ({ request }) => {
    await loginPlayer(request)

    // Create a deposit
    const bankBefore = await request.get(BANK_URL)
    const { credits } = await bankBefore.json()
    await request.post(BANK_DEPOSIT_URL, {
      data: { termId: '1h', amount: Math.min(credits, 10) },
    })

    // Immediately try to withdraw
    const res = await request.post(BANK_WITHDRAW_URL)
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/not yet matured/i)
    expect(body.maturesAt).toBeDefined()
  })
})

// ─── NPC Interaction ──────────────────────────────────────────────────────────

test.describe('NPC Interaction API', () => {
  test.beforeEach(async () => {
    await seedTestPlayer()
  })

  test.afterAll(async () => {
    await cleanupTestPlayer()
  })

  test('POST /api/npc/interact returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post(NPC_URL, { data: { npcId: 'vex' } })
    expect(res.status()).toBe(401)
  })

  test('POST /api/npc/interact returns 400 for unknown NPC', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.post(NPC_URL, { data: { npcId: 'unknown-npc' } })
    expect(res.status()).toBe(404)
  })

  test('POST /api/npc/interact with Vex returns dialogue and records interaction', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.post(NPC_URL, { data: { npcId: 'vex' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.npcId).toBe('vex')
    expect(typeof body.dialogue).toBe('string')
    expect(body.dialogue.length).toBeGreaterThan(0)
    expect(body.interactionCount).toBe(1)
  })

  test('POST /api/npc/interact increments interactionCount on repeat visits', async ({ request }) => {
    await loginPlayer(request)
    await request.post(NPC_URL, { data: { npcId: 'vex' } })
    const res = await request.post(NPC_URL, { data: { npcId: 'vex' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.interactionCount).toBe(2)
  })

  test('POST /api/npc/interact with Vex unlocks courier-run mission', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.post(NPC_URL, { data: { npcId: 'vex' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.unlockedMissions)).toBe(true)
    const ids = body.unlockedMissions.map((m: { id: string }) => m.id)
    expect(ids).toContain('courier-run')
  })

  test('POST /api/npc/interact with the-broker unlocks black-market-recon mission', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.post(NPC_URL, { data: { npcId: 'the-broker' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    const ids = body.unlockedMissions.map((m: { id: string }) => m.id)
    expect(ids).toContain('black-market-recon')
  })
})
