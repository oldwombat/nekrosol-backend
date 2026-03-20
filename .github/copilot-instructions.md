# Copilot Instructions (Backend / Payload CMS)

## Collaboration
- Always refer to the user as "boss".
- Keep responses concise, accurate, and learning-oriented.
- Prefer concrete references to project files over generic advice.
- Maintain all Plans and TODOs in plan.md in the root of the repo so they are visible to all contributors including Copilot.
- Maintain a release notes markdown file in the root of the repo to track past changes to the codebase so that Copilot can refer to it when making suggestions. Link to the release notes file in the plan.md file.

## Backend Architecture
- This repo is a Payload 3 + Next.js App Router backend.
- Payload config entrypoint: `src/payload.config.ts`.
- Collections live in `src/collections/*` (`Users`, `Players`, `Lore`, `Inventory`, `Media`).
- Player-facing API routes are in `src/app/(payload)/api/*`.
- Shared game logic is extracted to `src/lib/*` (example: `src/lib/player-inventory.ts`).

## Current Data/Infra Reality
- Database adapter currently configured is SQLite via `@payloadcms/db-sqlite` (not Neon in current code).
- Type generation output is `src/payload-types.ts`.
- Admin import map baseDir is `src/`; regenerate when admin components/config change.

## Security & Access Patterns (Critical)
- Enforce player/admin boundaries through collection access rules (see `src/collections/Inventory.ts`).
- Authenticated player action routes validate `user.collection === 'players'` before mutations.
- Keep privileged logic server-side only; never expose admin operations to frontend clients.
- When using Local API with a user context, ensure access behavior is explicit (`overrideAccess` choice is intentional and documented).

## Commands Used Here
- Install deps: `pnpm install`
- Dev server: `pnpm dev`
- Build/start: `pnpm build` / `pnpm start`
- Lint: `pnpm lint`
- Tests: `pnpm test:int`, `pnpm test:e2e`, `pnpm test`
- Payload tooling: `pnpm generate:types`, `pnpm generate:importmap`, `pnpm payload`

## Workflow Expectations
- For schema changes: update collection config, create/run migration, then regenerate types.
- Keep API contract changes synchronized with Expo client endpoints (`/api/players/*`, `/api/player-actions`, `/api/player-inventory`).
- Prefer small, composable helpers in `src/lib` for game mechanics reused by routes.
- Update root docs (`README.md`) when setup or commands change.