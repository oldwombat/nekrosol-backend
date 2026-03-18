# Playwright E2E Tests — Nekrosol Backend

This document explains how our Playwright test suite is set up, how to run it, and how to write new tests. It's written for someone new to Playwright.

---

## What is Playwright?

Playwright is a browser and HTTP automation library. In this project we use it primarily to make **real HTTP requests against the running backend** and assert the responses are correct — no mocking, no fakes. If the server is broken, the tests fail.

We also have a small number of **browser tests** that open a real Chromium window and interact with the Payload admin panel.

---

## Running the Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run a single file
pnpm test:e2e tests/e2e/player-actions.e2e.spec.ts

# Run with a visible browser (useful for debugging UI tests)
pnpm test:e2e --headed

# Open the interactive UI mode (great for exploring failures)
pnpm exec playwright test --ui

# View the last HTML report (shows screenshots, traces, diffs)
pnpm exec playwright show-report
```

> **The backend server must be running** (`pnpm dev`) before you run tests, OR the `webServer` config in `playwright.config.ts` will start it for you automatically.

---

## Project Structure

```
tests/
├── e2e/                          # Test files (Playwright runs all *.spec.ts here)
│   ├── admin.e2e.spec.ts         # Admin panel UI tests (browser)
│   ├── frontend.e2e.spec.ts      # Smoke test — is the server alive?
│   ├── player-actions.e2e.spec.ts  # API tests for POST /api/player-actions
│   └── player-inventory.e2e.spec.ts # API tests for GET /api/player-inventory
└── helpers/
    ├── seedUser.ts               # Creates/destroys a test admin User
    ├── seedTestPlayer.ts         # Creates/destroys test Players + Inventory
    └── login.ts                  # Logs into the Payload admin panel via browser
```

---

## Configuration (`playwright.config.ts`)

Key settings to understand:

```ts
workers: 1
```
**Why 1 worker?** SQLite only allows one concurrent writer. If multiple test workers ran simultaneously they'd all try to seed/clean the database at the same time, causing `SQLITE_BUSY: database is locked` errors. Serial execution is fast enough (~8s for 19 tests).

```ts
retries: process.env.CI ? 2 : 0
```
On CI, flaky tests get 2 automatic retries. Locally you see failures immediately.

```ts
trace: 'on-first-retry'
```
When a test is retried, Playwright records a full trace (network, DOM snapshots, console). View it in the HTML report with `pnpm exec playwright show-report`.

```ts
webServer: { command: 'pnpm dev', reuseExistingServer: true, url: 'http://localhost:3000' }
```
If port 3000 is already serving when you run `pnpm test:e2e`, Playwright reuses it. If not, it starts `pnpm dev` and waits for the server to respond before running tests.

```ts
baseURL: 'http://localhost:3000'
```
Tests can use relative URLs like `page.goto('/admin')` instead of repeating the full URL everywhere.

---

## Seed Helpers

Seed helpers create and destroy test data using the **Payload Local API** — they bypass HTTP and write directly to the database. This is fine for test setup/teardown but should never be used in production routes.

### `seedUser.ts` — Admin test user

```ts
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

// testUser = { email: 'dev@payloadcms.com', password: 'test' }
await seedTestUser()    // deletes existing + creates fresh admin user
await cleanupTestUser() // deletes the test user
```

Used by: `admin.e2e.spec.ts`

### `seedTestPlayer.ts` — Game player test data

```ts
import {
  seedTestPlayer,
  seedTestPlayerWithInventory,
  seedTestPlayer2,
  cleanupTestPlayer,
  cleanupTestPlayer2,
  testPlayer,
  testPlayer2,
} from '../helpers/seedTestPlayer'

// Default player: credits:50, energy:10, health:100, radiation:0
await seedTestPlayer()

// Override specific stats (useful for testing edge cases)
await seedTestPlayer({ energy: 0 })   // player with no energy
await seedTestPlayer({ radiation: 90 }) // player nearly irradiated

// Seed player + inventory items in one call
await seedTestPlayerWithInventory([
  { itemKey: 'SPD-1', quantity: 2 },
  { itemKey: 'MED-1', quantity: 1 },
])

// A second independent player (for isolation tests)
await seedTestPlayer2()
```

All seed helpers use `overrideAccess: true` — they are admin-level operations that intentionally bypass collection access rules.

---

## Test Patterns

### Pattern 1: API test (no browser)

Used for `/api/player-actions` and `/api/player-inventory`. The `request` fixture is a lightweight HTTP client — no browser, just fetch-like calls.

```ts
import { test, expect, type APIRequestContext } from '@playwright/test'

// Helper: logs in a player and stores the session cookie in `request`
async function loginPlayer(request: APIRequestContext): Promise<void> {
  const res = await request.post('http://localhost:3000/api/players/login', {
    data: { email: testPlayer.email, password: testPlayer.password },
  })
  expect(res.status()).toBe(200)
  // Playwright automatically stores the Set-Cookie from this response
  // and sends it on all subsequent request.get/post calls in this test
}

test('BEG: decreases energy by 1 and increases credits', async ({ request }) => {
  await seedTestPlayer()         // fresh player in DB
  await loginPlayer(request)     // authenticate — cookie now held by `request`
  
  const res = await request.post('http://localhost:3000/api/player-actions', {
    data: { action: 'BEG' },
  })
  
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.player.energy).toBe(9)           // energy decreased
  expect(body.player.credits).toBeGreaterThanOrEqual(51) // credits increased
})
```

**Key insight about cookies**: Within a single test, the `request` fixture maintains cookie state. After `loginPlayer(request)` sets the session cookie, every subsequent `request.get()` / `request.post()` in the same test sends that cookie automatically. This is how the server knows which player is making the request.

Each test gets a **fresh** `request` context (fresh cookie jar), so tests are isolated by default.

### Pattern 2: Multiple independent sessions (cross-player isolation)

When you need to simulate two different logged-in players, create a second `APIRequestContext` manually:

```ts
import { request as playwrightRequest } from '@playwright/test'

test("player cannot access another player's inventory", async () => {
  await seedTestPlayer()   // player 1 with items
  await seedTestPlayer2()  // player 2 with no items

  // Create a completely separate HTTP context for player 2
  const ctx2 = await playwrightRequest.newContext()
  try {
    await ctx2.post(LOGIN_URL, { data: { email: testPlayer2.email, password: testPlayer2.password } })
    const res = await ctx2.get(INVENTORY_URL)
    // Player 2 should only see their own (empty) inventory
    expect((await res.json()).counts).toEqual({})
  } finally {
    await ctx2.dispose() // always clean up to avoid connection leaks
  }
})
```

### Pattern 3: Browser test (admin panel)

```ts
import { test, expect } from '@playwright/test'

test('can navigate to dashboard', async ({ page }) => {
  // page = a real Chromium browser tab
  await page.goto('/admin')                          // uses baseURL from config
  await expect(page).toHaveURL(/\/admin(\/login)?/) // URL assertion
  
  const emailField = page.locator('input[id="field-email"]')
  await expect(emailField).toBeVisible()             // element assertion
})
```

`page.locator()` finds elements by CSS selector, text, role, or label. Always `await expect(locator).toBeVisible()` rather than checking `.count()` — Playwright will auto-retry until the element appears or the timeout expires.

### Pattern 4: Lifecycle hooks

```ts
test.describe('POST /api/player-actions', () => {
  test.beforeEach(async () => {
    // Runs before EVERY test in this describe block
    // Ensures a known clean state for each test
    await seedTestPlayer()
  })

  test.afterAll(async () => {
    // Runs once after ALL tests in the block finish
    // Clean up test data so it doesn't pollute the DB
    await cleanupTestPlayer()
  })

  test('...', async ({ request }) => { /* ... */ })
})
```

Use `beforeEach` when each test needs a guaranteed fresh state. Use `afterAll` (not `afterEach`) to clean up — it's faster and you rarely need per-test cleanup.

---

## What Each Test File Covers

### `admin.e2e.spec.ts` — Admin panel navigation

| Test | What it checks |
|------|---------------|
| can navigate to dashboard | Login works; `/admin` renders the dashboard |
| can navigate to list view | `/admin/collections/users` renders a list |
| can navigate to edit view | `/admin/collections/users/create` renders a form |

These are **browser tests** — they open a real Chromium window.

### `frontend.e2e.spec.ts` — Server smoke test

| Test | What it checks |
|------|---------------|
| admin panel login page is reachable | Server is up; `/admin` returns a login form |

A minimal check that the server boots and responds at all.

### `player-actions.e2e.spec.ts` — Game action API

| Test | What it checks |
|------|---------------|
| returns 401 when unauthenticated | Auth guard works |
| returns 400 for invalid action | Input validation |
| BEG: decreases energy / increases credits | Core BEG mechanic |
| BEG: returns 400 when energy is 0 | Energy gate enforced |
| SPD-1: restores energy (with item) | Item consumption + stat restore |
| SPD-1: returns 400 (no item) | Item gate enforced |
| MED-1: restores health (with item) | Item consumption + stat restore |
| MED-1: returns 400 (no item) | Item gate enforced |
| RAD-X: reduces radiation (with item) | Item consumption + stat reduce |
| RAD-X: returns 400 (no item) | Item gate enforced |
| response includes inventoryCounts | Response shape correct after consumption |

### `player-inventory.e2e.spec.ts` — Inventory API

| Test | What it checks |
|------|---------------|
| returns 401 when unauthenticated | Auth guard works |
| returns empty counts for new player | Empty state correct |
| returns correct counts after seeding | Counts accurate |
| player cannot access another player's inventory | Cross-player isolation (each player only sees their own) |

---

## Writing a New Test

1. **Decide the type**: API test (`request` fixture) or browser test (`page` fixture)?
2. **Create the file**: `tests/e2e/my-feature.e2e.spec.ts`
3. **Seed state** in `beforeEach` if all tests need the same setup
4. **Login** if the endpoint requires auth: call `loginPlayer(request)` before the action
5. **Assert** both the HTTP status code AND the response body shape
6. **Clean up** in `afterAll`

### Template: new API test file

```ts
import { test, expect, type APIRequestContext } from '@playwright/test'
import { seedTestPlayer, cleanupTestPlayer, testPlayer } from '../helpers/seedTestPlayer'

const BASE = 'http://localhost:3000'

async function loginPlayer(request: APIRequestContext) {
  const res = await request.post(`${BASE}/api/players/login`, {
    data: { email: testPlayer.email, password: testPlayer.password },
  })
  expect(res.status()).toBe(200)
}

test.describe('POST /api/my-new-endpoint', () => {
  test.beforeEach(async () => { await seedTestPlayer() })
  test.afterAll(async () => { await cleanupTestPlayer() })

  test('returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post(`${BASE}/api/my-new-endpoint`, { data: {} })
    expect(res.status()).toBe(401)
  })

  test('happy path', async ({ request }) => {
    await loginPlayer(request)
    const res = await request.post(`${BASE}/api/my-new-endpoint`, { data: { foo: 'bar' } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})
```

---

## Known Issues / Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| `SQLITE_BUSY: database is locked` | Multiple Playwright workers writing to SQLite simultaneously | Always use `workers: 1` (already configured) |
| `401` after `loginPlayer()` | Player wasn't created (seed failed silently due to DB lock) | Ensure `workers: 1` and check seed helper error handling |
| Tests pass locally but fail on CI | Server not ready when tests start | `webServer.url` poll handles this; increase timeout if needed |
| Stale HTML report | Previous run's report shown | Run `pnpm exec playwright show-report` to open latest |

---

## Security Note on Seed Helpers

Seed helpers use `overrideAccess: true` to bypass collection-level access rules. This is correct — seeds are admin-level setup code, not player actions. **Never use `overrideAccess: true` in a real API route** — it would let any authenticated player bypass the access control checks.
