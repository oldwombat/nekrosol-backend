# Nekrosol — Development Roadmap

> **How this works with Copilot CLI:** Ask Copilot to work on any item below by referencing its title or the todo ID in brackets. Copilot will create a feature branch, implement the change, and open a draft PR for review. Merge the PR and the checkbox gets ticked. See [workflow notes](#copilot-cli-workflow) at the bottom.

---

## Current State (March 2026)

| Repo | Stack | Status |
|------|-------|--------|
| `nekrosol-backend` | Payload CMS 3 + Next.js + SQLite | 19 E2E tests · 5 actions live · CORS hardened |
| `nekrosol-frontend` | Expo 54 + React Native + Expo Router | 16 unit tests · Locations screen · Mission modals |

**Live actions:** `BEG` · `SPD-1` · `MED-1` · `RAD-X` · `ESCORT`  
**Stubbed (action: null):** Patrol · Salvage · all Skills  
**Docs:** `docs/VISION.md` · `docs/PLAYWRIGHT.md` · `CHANGELOG.md`

---

## Area 1 — Test Coverage

### Backend
- [x] **Playwright E2E tests for player-actions** `[tests-backend-player-actions]`
- [x] **Playwright E2E tests for player-inventory** `[tests-backend-inventory-pw]`
- [x] **Vitest integration test** `[tests-backend-inventory-vitest]`

### Frontend
- [x] **Hook unit tests (useHomeAuth, useHomeInventory)** `[tests-frontend-hooks]` — 16 tests, all green

---

## Area 2 — Game Mechanics

- [x] **`addInventoryItem` helper** `[mechanics-add-inventory-item]`
- [ ] **PATROL mission** `[mechanics-mission-patrol]` *(needs: addInventoryItem ✅)*  
  Cost: 2 energy · Radiation +5 · 30% chance to loot 1× RAD-X.

- [ ] **SALVAGE mission** `[mechanics-mission-salvage]` *(needs: addInventoryItem ✅)*  
  Cost: 3 energy · Radiation +8 · Random component drop.

- [x] **ESCORT mission** `[mechanics-mission-escort]`  
  Cost: 2 energy · Earn 10–20 credits · 20% chance health −10.

- [x] **Radiation tick** `[mechanics-radiation-tick]`  
  Decay −1 per action. Health −2 if radiation > 80. Includes `radiationTick` in response.

- [ ] **Skill XP system** `[mechanics-skill-xp]` *(needs: PATROL mission)*  
  Add `skillXP` number fields to Players. Grant XP on mission completion.

---

## Area 3 — Frontend UI/UX

- [x] **Replace Explore tab with World/Locations screen** `[frontend-replace-explore]`
- [ ] **Dedicated Inventory screen** `[frontend-inventory-screen]`  
  New `app/(tabs)/inventory.tsx` tab with FlatList, inline use/equip, empty state.

- [ ] **Global auth context** `[frontend-auth-context]` ← *unblocks TopNav player info*  
  Move player state into React context at `app/_layout.tsx`.

- [ ] **Enhanced stat bars** `[frontend-stat-bars]`  
  Radiation pulse above 80%. Health colour gradient. Energy pips. Credits counter.

- [ ] **Onboarding flow** `[frontend-onboarding]`  
  Welcome modal on first login. Display name pick + lore intro. AsyncStorage dismiss.

- [x] **Mission detail modal** `[frontend-mission-modal]`  
  Tapping a mission opens modal with description, energy cost, reward, Run CTA.

- [ ] **Player info in TopNav** `[frontend-topnav-player]` *(needs: auth context)*  
  Show displayName and credits in header when authenticated.

---

## Area 4 — Architecture & Code Quality

- [x] **Frontend API client module** `[arch-api-client]` — `lib/api.ts` created
- [x] **Tighten CORS config** `[arch-cors-tighten]` — wildcard removed, CORS_ORIGINS env var
- [ ] **Rate limiting on player-actions** `[arch-rate-limit]`  
  20 req/min per player. 429 response when exceeded.

---

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

## Suggested Next Sprint

The natural sequence based on dependencies:

1. `mechanics-mission-patrol` + `mechanics-mission-salvage` — `addInventoryItem` is now done, these unblock skill XP
2. `frontend-auth-context` — enables TopNav player info and cleaner architecture
3. `frontend-stat-bars` — high visual impact, animations already available via reanimated
4. `frontend-inventory-screen` — dedicated tab is better UX than embedded list
5. `arch-rate-limit` — security hardening before any public release

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
