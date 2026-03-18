# Nekrosol — Development Roadmap

> **How this works with Copilot CLI:** Ask Copilot to work on any item below by referencing its title or the todo ID in brackets. Copilot will create a feature branch, implement the change, and open a draft PR for review. Merge the PR and the checkbox gets ticked. See [workflow notes](#copilot-cli-workflow) at the bottom.

---

## Current State (March 2026)

| Repo | Stack | Status |
|------|-------|--------|
| `nekrosol-backend` | Payload CMS 3 + Next.js + SQLite | ~10% test coverage · 4 actions live |
| `nekrosol-frontend` | Expo 54 + React Native + Expo Router | 0 tests · Explore tab is placeholder |

**Live actions:** `BEG` · `SPD-1` · `MED-1` · `RAD-X`  
**Stubbed (action: null):** Patrol · Salvage · Escort · all Locations · all Skills

---

## Area 1 — Test Coverage

### Backend
- [ ] **Playwright E2E tests for player-actions** `[tests-backend-player-actions]`  
  Unauthenticated → 401 · BEG earns credits & costs energy · BEG with 0 energy → 400 · SPD-1/MED-1/RAD-X with and without items · Needs `seedTestPlayer` helper.

- [ ] **Vitest integration tests for player-inventory lib** `[tests-backend-inventory-vitest]`  
  `getPlayerInventory` empty for new player · `consumeInventoryItem` decrements quantity · quantity=0 returns error.

### Frontend
- [ ] **Hook unit tests (useHomeAuth, useHomeInventory)** `[tests-frontend-hooks]`  
  Add Vitest + `@testing-library/react-hooks`. Test auth flow, inventory merge logic, action dispatch and state updates.

---

## Area 2 — Game Mechanics

- [ ] **`addInventoryItem` helper** `[mechanics-add-inventory-item]` ← *unblocks the three missions below*  
  Add `addInventoryItem(payload, playerID, itemKey, quantity)` to `src/lib/player-inventory.ts`. Upserts an inventory row; required for all loot/drop mechanics.

- [ ] **PATROL mission** `[mechanics-mission-patrol]` *(needs: addInventoryItem)*  
  Cost: 2 energy · Radiation +5 · 30% chance to loot 1× RAD-X. Add `PATROL` case to `player-actions/route.ts`.

- [ ] **SALVAGE mission** `[mechanics-mission-salvage]` *(needs: addInventoryItem)*  
  Cost: 3 energy · Radiation +8 · Random component drop.

- [ ] **ESCORT mission** `[mechanics-mission-escort]` *(needs: addInventoryItem)*  
  Cost: 2 energy · Earn 10–20 credits · 20% chance health −10 (combat damage).

- [ ] **Radiation tick** `[mechanics-radiation-tick]`  
  After every action: radiation naturally decays 1. If radiation > 80, health −2. Applied in `player-actions/route.ts` after resolving the main action.

- [ ] **Skill XP system** `[mechanics-skill-xp]` *(needs: PATROL mission)*  
  Add `skillXP` number fields to Players collection (one per skill). Grant XP on mission completion. Add migration + regenerate types.

---

## Area 3 — Frontend UI/UX

- [ ] **Replace Explore tab with World/Locations screen** `[frontend-replace-explore]`  
  Replace the Expo template placeholder with 4 location cards (Dustline Tavern, Ember Bank, Blackglass Market, Reactor District) showing name, summary, radiation badge, and a stub travel button.

- [ ] **Dedicated Inventory screen** `[frontend-inventory-screen]`  
  New `app/(tabs)/inventory.tsx` tab. FlatList of items with quantities. Inline use/equip actions. Empty state messaging.

- [ ] **Global auth context** `[frontend-auth-context]` ← *unblocks TopNav player info*  
  Move player state from `useHomeAuth` into a React context at `app/_layout.tsx` so all tabs share one session.

- [ ] **Enhanced stat bars** `[frontend-stat-bars]`  
  Radiation: orange/red gradient + pulse animation above 80%. Health: green→yellow→red by percentage. Energy: pip-style for 10-max. Credits: comma-formatted with animated counter.

- [ ] **Onboarding flow** `[frontend-onboarding]`  
  Welcome modal on first login (when `displayName` is empty). Step 1: choose display name. Step 2: brief lore intro. Persist dismissed state in AsyncStorage.

- [ ] **Mission detail modal** `[frontend-mission-modal]`  
  Tapping a mission opens a modal with full description, energy cost, reward preview, and Run Mission CTA. Update `home-data.ts` mission type with `energyCost` and `rewardHint`.

- [ ] **Player info in TopNav** `[frontend-topnav-player]` *(needs: auth context)*  
  Show `displayName` and credit balance in the header when authenticated.

---

## Area 4 — Architecture & Code Quality

- [ ] **Frontend API client module** `[arch-api-client]`  
  Create `nekrosol-frontend/lib/api.ts`. Replace scattered `fetch` calls across screens with typed functions. Single source for base URL, credentials, and error normalisation.

- [ ] **Tighten CORS config** `[arch-cors-tighten]`  
  Remove wildcard `*` from `payload.config.ts`. Set explicit allowed origins. Document in README.

- [ ] **Rate limiting on player-actions** `[arch-rate-limit]`  
  Add request-rate limiting to `POST /api/player-actions` (e.g. 20 req/min per player). Respond 429 when exceeded.

---

## Suggested First Sprint

Start here — independent tasks that deliver the most value fastest:

1. `tests-backend-player-actions` — confidence before adding more mechanics
2. `mechanics-add-inventory-item` — unblocks all three new missions
3. `frontend-replace-explore` — removes the Expo placeholder
4. `frontend-auth-context` — enables TopNav player info and cleaner code everywhere
5. `tests-frontend-hooks` — low-effort, high-confidence

---

## Copilot CLI Workflow

### One-time setup
```bash
brew install gh && gh auth login   # GitHub CLI auth
git remote -v                      # confirm both repos have a GitHub remote
```

### Feature branch + PR flow
Ask Copilot to work on any todo by referencing its title or `[id]`. Copilot will:
1. `git checkout -b feature/<slug>` off `main`
2. Implement the change with tests
3. Commit, push, and run `gh pr create --draft`
4. Report back what was done

You review the draft PR on GitHub, request changes if needed, approve, and merge.

### Branch naming conventions
| Type | Pattern | Example |
|------|---------|---------|
| Backend feature | `feature/backend-<slug>` | `feature/backend-mission-patrol` |
| Frontend feature | `feature/frontend-<slug>` | `feature/frontend-inventory-screen` |
| Tests | `feature/tests-<slug>` | `feature/tests-player-actions` |
| Bug fix | `fix/<slug>` | `fix/energy-underflow` |
| Schema/migration | `feature/schema-<slug>` | `feature/schema-skill-xp` |

### Tips
- **Be specific about scope** — "Add XP to skills" beats "improve game"
- **Reference existing patterns** — "Follow the pattern in `player-actions/route.ts`"
- **Always say "include tests"** otherwise Copilot may skip them
- **One concern per PR** — keeps reviews fast and merges clean
- **Chain work** — after a backend PR merges, say "now update the frontend to consume the new endpoint"
