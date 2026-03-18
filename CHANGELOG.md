# Changelog

All notable changes to the Nekrosol backend will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

### Added
- `addInventoryItem(payload, playerID, itemKey, quantity)` helper in `src/lib/player-inventory.ts` — upserts inventory rows, enabling all mission loot drops
- `ESCORT` mission action: costs 2 energy, earns 10–20 credits, 20% chance of −10 health combat damage
- Radiation tick on every player action: radiation passively decays −1 per action (min 0); if radiation > 80 before decay, health takes −2 radiation sickness damage
- `radiationTick: { decayed, damage }` included in all `/api/player-actions` responses for UI feedback
- `docs/VISION.md` — full game design document (premise, player fantasy, core loop, factions, art direction, design principles, release milestones)
- `docs/PLAYWRIGHT.md` — comprehensive Playwright guide for new users
- `CHANGELOG.md` — this file
- 19 Playwright E2E tests covering admin panel, player-actions (all 4 action types), and player-inventory (auth, isolation)
- `tests/helpers/seedTestPlayer.ts` with `seedTestPlayer`, `seedTestPlayerWithInventory`, `seedTestPlayer2` helpers

### Fixed
- CORS wildcard `*` removed from `payload.config.ts` — was allowing any origin to make credentialed requests
- Added `CORS_ORIGINS` env var for production origin injection
- `PAYLOAD_SECRET` and `DATABASE_URL` now throw immediately when missing (no more silent empty-string fallback)
- Playwright `workers` forced to 1 — prevents `SQLITE_BUSY` lock errors from parallel test workers

---

## [0.1.0] — Initial Development (backfilled from git history)

### Added

- Payload CMS 3 + Next.js App Router + SQLite (via `@payloadcms/db-sqlite`) initial setup
- `Users` collection with admin authentication
- `Players` collection with auth support; stats fields: `credits`, `energy`, `health`, `radiation`; 12 skills: `thug`, `thief`, `grifter`, `pilot`, `medic`, `hacker`, `technician`, `chemist`, `physicist`, `scavenger`, `mechanic`, `smuggler`
- `Lore` collection with `department`, `visible`, and `tags` fields
- `Media` collection for file uploads
- `Inventory` collection with per-player item tracking (`itemKey` + `quantity`); access rules scoped to owning player
- `POST /api/player-actions` endpoint supporting `BEG`, `SPD-1`, `MED-1`, `RAD-X` actions
- `GET /api/player-inventory` endpoint
- `src/lib/player-inventory.ts`: `getPlayerInventory` and `consumeInventoryItem` shared helpers
- Basic Playwright E2E test: admin panel navigation
- Basic Vitest integration test: users collection fetch
- `ROADMAP.md` with 19-item development plan across test coverage, game mechanics, frontend UI/UX, and architecture areas; includes Copilot CLI workflow guide with branch conventions and PR flow
- `docs/VISION.md` game design document
- `nextjs-app-router-patterns` Copilot skill installed

### Changed

- `Lore` collection: removed `owner` field, added `department` and `visible` fields
- Removed unused Copilot skills during skill install cleanup
