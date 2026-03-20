# Nekrosol Backend — Release Notes

A human-readable summary of what has been built and what the codebase currently does.
For a commit-level changelog see [CHANGELOG.md](./CHANGELOG.md).

---

## Current Codebase State

### Stack
- **Payload CMS 3** + **Next.js 15 App Router**
- **SQLite** via `@payloadcms/db-sqlite` (local dev: `nekrosol.db`)
- **TypeScript** strict mode throughout
- **Playwright** E2E tests + **Vitest** integration tests

### Collections

| Collection | Purpose |
|------------|---------|
| `Players` | Player accounts, core stats, 12 skills (0–100 each), 12 prestige levels (0–4 each), `energy` + `lastEnergyUpdate` for lazy regen, access-controlled per player |
| `Inventory` | Per-player item holdings (`itemKey` + `quantity`), race-safe atomic updates |
| `Items` | Master item catalog (`key`, `name`, `description`, `category`, `maxStack`, `effects`, `value`) |
| `Users` | Admin accounts for Payload admin panel |
| `Lore` | In-world lore entries with `visible` access gate |
| `Media` | File uploads |
| `GameEvents` | Append-only event log: `action_taken`, `prestige_completed`, `quest_completed`, `item_acquired`, `item_consumed`, `skill_xp_gained` |
| `Quests` | 48 prestige trial definitions (12 skills × 4 levels). All currently `requirementType: 'click'` for MVP |
| `PlayerQuestProgress` | Per-player trial status: `locked` → `available` → `completed`. Pre-created on player signup |
| `Missions` | Data-driven mission templates: costs, requirements, visibilityRequirements, rewards, dependencies, NPC messages |
| `Messages` | NPC inbox — Sal + faction NPCs. Created by mission engine on state changes |
| `PlayerMissionHistory` | Per-player completed mission log — feeds Trial `mission_count` requirement checks |

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/player-actions` | POST | Execute missions by slug (`beg`, `escort`, `spd-1`, etc.). Data-driven via mission engine — no hardcoded handlers. Applies radiation tick, records `PlayerMissionHistory`, triggers NPC messages on newly available missions. |
| `/api/missions` | GET | All visible missions for authenticated player with live availability status + `unreadMessages` count |
| `/api/messages` | GET | NPC inbox — Sal + faction NPCs (unread first) |
| `/api/messages/[id]/read` | POST | Mark a message as read |
| `/api/player-prestige` | POST | Prestige a skill: requires skill === 100 **and** prestige Trial completed. Increments `*Prestige`, resets skill to 1. Max prestige 4. |
| `/api/player-inventory` | GET | Returns player inventory as `{ items, counts }` |
| `/api/player-quests` | GET | Returns all 48 Trial progress entries for authenticated player |
| `/api/player-quests/[id]/complete` | POST | Complete a Trial (MVP: `click` type only). Logs `quest_completed` event. |
| `/api/players/me` | GET | Returns full player profile including all stats, skills, prestige levels, energy + `lastEnergyUpdate` |
| `/api/players/login` | POST | Player login |
| `/api/players/logout` | POST | Player logout |
| `/api/players` | POST | Player signup — pre-seeds all 48 Trial progress rows + all 7 Mission catalog records |

### Shared Lib (`src/lib/`)

| File | Exports |
|------|---------|
| `player-inventory.ts` | `getPlayerInventory`, `consumeInventoryItem`, `addInventoryItem` |
| `mission-engine.ts` | `isMissionVisible`, `canRunMission`, `executeMission`, `checkNewlyAvailableMissions`, `createMissionAvailableMessage` |
| `energy.ts` | `calculateCurrentEnergy` (pure), `syncEnergyRegen` (DB write) — lazy regen, no background timers |

### Mission Engine (Sprint 2)

- **Data-driven missions**: 7 missions seeded (`beg`, `spd-1`, `med-1`, `rad-x`, `escort`, `patrol`, `salvage`) as `Missions` collection records with costs, requirements, rewards, visibility rules, and NPC messaging config
- **Generic engine** in `src/lib/mission-engine.ts` handles all reward types: `credits`, `stat_delta`, `stat_chance` (probabilistic), `item_chance`, `item_guaranteed`
- **Two-layer filtering**: `visibilityRequirements` (hide entirely) + `requirements` (show locked) — Tier 1 missions visible to all, Tier 2+ gated by stat threshold
- **NPC inbox**: `Messages` collection. Sal messages player when missions become newly available after each action
- **`PlayerMissionHistory`**: Every completed mission is logged — feeds future Trial `mission_count` requirement type
- **Lazy energy regen**: No background timers. `calculateCurrentEnergy()` computes regen from `lastEnergyUpdate` on every request. Frontend receives `lastEnergyUpdate` + `regenRateMs` to render countdowns locally

### Infra

- **Port**: Backend runs on **port 3000** (default Next.js port). Start with `pnpm dev`. If port 3000 is stuck by a zombie process, kill it with `lsof -i :3000 -t | xargs kill` then restart.
- **Playwright**: All test configs and helpers use `localhost:3000`

### Prestige Trial System

- 48 Trials defined (12 skills × 4 prestige levels), seeded on first run
- Trial progress pre-created for every new player at signup
- Prestige endpoint validates Trial completion before allowing prestige
- All Trials currently `requirementType: 'click'` (MVP — player taps to complete)
- Future requirement types planned: `mission_count`, `item_consume`, `stat_threshold`, `puzzle`

### Skill System
- 12 skills: Thug, Thief, Grifter, Pilot, Medic, Hacker, Technician, Chemist, Physicist, Scavenger, Mechanic, Smuggler
- Each skill caps at **100** per prestige level
- **5 prestige levels** (0–4) per skill = **500 total investment** per skill
- Prestige resets skill to 1 and advances to the next rank name (see frontend rank definitions)

### Security
- CORS locked to specific origins (no wildcard)
- `PAYLOAD_SECRET` and `DATABASE_URL` throw on missing (no silent fallback)
- Player routes validate `user.collection === 'players'`
- Inventory access scoped to owning player

### Test Coverage
- **28 Playwright E2E tests** (all green, port 3000) — admin panel, player-actions (mission engine), player-inventory, validation, lore access control
- **1 Vitest integration test** — users collection
- **9 Playwright E2E tests in `nekrosol-frontend`** (all green, port 8081) — auth flow, live missions, stats, Messages tab navigation

---

## What's Planned Next

See [plan.md](./plan.md) for the full prioritised implementation backlog.

**Immediate remaining from Sprint 1 — Prestige Trials:**
1. Schema migration (run `pnpm dev` and accept drizzle push for `*Prestige` columns)
2. E2E tests for trial/quest endpoints

**Sprint 2 — Mission Engine & NPC Messaging: ✅ COMPLETE**
All 28 backend E2E tests green on port 3000.

**Sprint 3 — Frontend Integration: ✅ COMPLETE**
- `GET /api/missions` wired — `HomeMissions.tsx` now uses live data from backend; hardcoded `missionItems` removed
- Energy countdown — `useEnergyCountdown` hook drives a live "⚡ next regen in M:SS" counter below the energy bar
- NPC Messages tab — new `/messages` screen with inbox list and mark-as-read; unread badge on welcome line
- `home-auth.ts` refactored — `missions` + `unreadMessages` state added; `ActionType` coupling removed
- Locations card removed from Play tab (redundant with World tab)
- **CORS middleware** — `src/middleware.ts` added to inject `Access-Control-Allow-Origin` + `Access-Control-Allow-Credentials` on all custom game API routes (`/api/missions`, `/api/messages`, `/api/player-*`). Root cause of silent mission loading failure in Playwright browser context
- 9/9 frontend Playwright tests passing (added Messages tab test; missions test uses live API data)

**Sprint 4 — Backlog (see plan.md):**
- `missions-api-tests` — E2E for `GET /api/missions`
- `energy-regen-tests` — Vitest unit tests for `calculateCurrentEnergy`
- `skill-xp-awards` — Award skill XP on mission completion
- `trial-type-mission-count` — Wire `mission_count` trial requirement to `PlayerMissionHistory`

---

## Known Gaps / Not Yet Built

- No skill XP awards from missions (skills stay at 0 until manually set in admin)
- No rate limiting on player-actions
- No shop/market endpoint
- No player-travel endpoint (locations are frontend-only display)
- `displayTitle` field (player-chosen prestige rank as public title) not yet added
- `GET /api/missions` endpoint exists but has no E2E tests yet
- Lazy energy regen has no Vitest unit tests yet
- Schema migration for `*Prestige` columns pending (run `pnpm dev` and accept drizzle push)
- No E2E tests for trial/quest system yet
