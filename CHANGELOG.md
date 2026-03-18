# Changelog

All notable changes to the Nekrosol backend will be documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

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
