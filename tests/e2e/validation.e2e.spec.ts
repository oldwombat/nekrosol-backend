import { test, expect } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config.js'
import {
  testPlayer,
  seedTestPlayer,
  cleanupTestPlayer,
} from '../helpers/seedTestPlayer'

const BASE_URL = 'http://localhost:3000'
const LOGIN_URL = `${BASE_URL}/api/players/login`
const LORE_URL = `${BASE_URL}/api/lore`

test.describe('displayName validation', () => {
  test.beforeEach(async () => {
    await seedTestPlayer()
  })

  test.afterAll(async () => {
    await cleanupTestPlayer()
  })

  test('rejects displayName longer than 32 characters with 400', async ({ request }) => {
    // Login
    const loginRes = await request.post(LOGIN_URL, {
      data: { email: testPlayer.email, password: testPlayer.password },
    })
    expect(loginRes.status()).toBe(200)

    // Get player ID from /me
    const meRes = await request.get(`${BASE_URL}/api/players/me`)
    expect(meRes.status()).toBe(200)
    const { user } = await meRes.json()

    // Attempt to set a 33-character displayName
    const longName = 'a'.repeat(33)
    const res = await request.patch(`${BASE_URL}/api/players/${user.id}`, {
      data: { displayName: longName },
    })
    expect(res.status()).toBe(400)
  })

  test('rejects displayName containing special characters (<script>) with 400', async ({ request }) => {
    // Login
    const loginRes = await request.post(LOGIN_URL, {
      data: { email: testPlayer.email, password: testPlayer.password },
    })
    expect(loginRes.status()).toBe(200)

    // Get player ID from /me
    const meRes = await request.get(`${BASE_URL}/api/players/me`)
    expect(meRes.status()).toBe(200)
    const { user } = await meRes.json()

    // Attempt to set a displayName with disallowed characters
    const res = await request.patch(`${BASE_URL}/api/players/${user.id}`, {
      data: { displayName: '<script>alert(1)</script>' },
    })
    expect(res.status()).toBe(400)
  })
})

test.describe('Lore visible:false access control', () => {
  let hiddenLoreId: string | number

  test.beforeAll(async () => {
    const payload = await getPayload({ config })
    const entry = await payload.create({
      collection: 'lore',
      data: {
        title: 'Secret Ministry Memo',
        content: 'This document is classified.',
        department: 'Ministry of Truth',
        visible: false,
        tags: [{ tag: 'classified' }],
      },
      overrideAccess: true,
    })
    hiddenLoreId = entry.id
  })

  test.afterAll(async () => {
    if (hiddenLoreId) {
      const payload = await getPayload({ config })
      await payload.delete({
        collection: 'lore',
        id: hiddenLoreId,
        overrideAccess: true,
      })
    }
  })

  test('unauthenticated request does not receive lore entries with visible:false', async ({ request }) => {
    const res = await request.get(LORE_URL)
    expect(res.status()).toBe(200)
    const body = await res.json()
    const ids = body.docs.map((doc: { id: string | number }) => String(doc.id))
    expect(ids).not.toContain(String(hiddenLoreId))
  })
})
