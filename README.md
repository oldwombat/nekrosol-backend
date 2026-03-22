# Nekrosol — Backend

Payload CMS 3 + Next.js App Router backend for **Nekrosol**, a browser-based text RPG set in a dying solar system.

## Stack

| Layer | Technology |
|-------|------------|
| CMS / API | [Payload CMS 3](https://payloadcms.com) |
| Framework | Next.js 15 App Router |
| Database | SQLite via `@payloadcms/db-sqlite` |
| Runtime | Node.js / pnpm |
| Tests | Playwright (E2E) + Vitest (integration) |

## Quick Start

```bash
pnpm install
cp .env.example .env   # set PAYLOAD_SECRET and DATABASE_URL
pnpm dev               # http://localhost:3000
```

Admin panel: `http://localhost:3000/admin`

## Collections

| Collection | Purpose |
|-----------|---------|
| `Players` | Auth-enabled player accounts with stats (credits, energy, health, radiation) and 12 skills |
| `Users` | Admin panel users |
| `Missions` | Data-driven mission definitions (costs, rewards, requirements, visibility rules) |
| `Messages` | NPC inbox (Sal + faction NPCs) + activity log entries |
| `PlayerMissionHistory` | Per-player mission completion log (feeds Trial requirement checks) |
| `Quests` | Prestige trial gates per skill (rename to `Trials` is planned) |
| `PlayerQuestProgress` | Per-player trial progress tracking |
| `Inventory` | Per-player item tracking (itemKey + quantity) |
| `BankDeposits` | Ember Bank term deposits with maturity dates |
| `PlayerNPCInteractions` | Tracks which NPCs a player has spoken with (controls mission unlocks) |
| `GameEvents` | Append-only event log |
| `Lore` | In-world lore entries (department, visibility, tags) |
| `Media` | File uploads |

## Player API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/players/me` | Current player session |
| `POST /api/players/login` | Login |
| `POST /api/players/logout` | Logout |
| `POST /api/players/create-first-user` | Signup |
| `POST /api/player-actions` | Run a mission (BEG, ESCORT, PATROL, SALVAGE, etc.) |
| `GET /api/player-inventory` | Player's inventory |
| `GET /api/missions` | All visible missions with availability status |
| `GET /api/messages` | NPC inbox + activity log |
| `POST /api/messages/[id]/read` | Mark message read |
| `GET /api/bank` | Current bank deposit (if any) |
| `POST /api/bank/deposit` | Create term deposit |
| `POST /api/bank/withdraw` | Withdraw matured deposit |
| `POST /api/npc/interact` | NPC dialogue + mission unlock |
| `GET /api/player-quests` | Player's trial (quest) progress |
| `POST /api/player-quests/[id]/complete` | Complete a trial |

## Key Library Files

| File | Purpose |
|------|---------|
| `src/lib/mission-engine.ts` | `isMissionVisible`, `canRunMission`, `executeMission`, NPC messaging |
| `src/lib/energy.ts` | Lazy energy regeneration (calculated at request time, no background timers) |
| `src/lib/player-inventory.ts` | `getPlayerInventory`, `consumeInventoryItem`, `addInventoryItem` |
| `src/lib/activity-log.ts` | `createActivityLog`, `diffInventory` — writes activity_log Messages entries |

## Commands

```bash
pnpm dev              # start dev server (port 3000)
pnpm build            # production build
pnpm start            # start production server
pnpm lint             # ESLint
pnpm test:int         # Vitest integration tests
pnpm test:e2e         # Playwright E2E tests
pnpm test             # all tests
pnpm generate:types   # regenerate src/payload-types.ts after schema changes
pnpm generate:importmap  # regenerate admin import map after adding components
pnpm payload migrate:create  # create a new migration
pnpm payload migrate         # apply pending migrations
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYLOAD_SECRET` | ✅ | Secret key for Payload (JWT signing etc.) |
| `DATABASE_URL` | ✅ | SQLite file path (e.g. `file:./nekrosol.db`) |
| `CORS_ORIGINS` | production | Comma-separated allowed origins |

## Git Workflow

All work happens on feature branches — never commit directly to `main`. See `AGENTS.md` for branch naming conventions.

## Docs

- [`RELEASE_NOTES.md`](./RELEASE_NOTES.md) — What's been built sprint by sprint
- [`ROADMAP.md`](./ROADMAP.md) — Upcoming features and backlog
- [`CHANGELOG.md`](./CHANGELOG.md) — Commit-level change log
- [`docs/VISION.md`](./docs/VISION.md) — Game design document
- [`docs/PLAYWRIGHT.md`](./docs/PLAYWRIGHT.md) — E2E test guide
