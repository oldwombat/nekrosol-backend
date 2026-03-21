# Nekrosol Backend — Plan

See [RELEASE_NOTES.md](./RELEASE_NOTES.md) for a summary of what's currently built.

---

## Terminology

| Term | Meaning |
|------|---------|
| **Missions** | Core gameplay loop actions (BEG, ESCORT, PATROL, etc.) — spend energy, earn rewards |
| **Trials** | Prestige progression gates — complete a specific challenge to unlock the next prestige level for a skill |
| **Sal** | Initial NPC fixer persona. Sends messages when missions become available or significant events occur |

> **Note on code**: The Trials system is currently implemented under the slug `quests` / collection names `Quests` and `PlayerQuestProgress`. A rename to `trials` / `player-trial-progress` is planned but not yet prioritised — docs and this plan use the new terminology.

---

## Architecture Overview

```
Missions collection (data)          src/lib/mission-engine.ts
  costs, rewards, requirements   →  canRunMission() / executeMission()
  visibilityRequirements         →  isMissionVisible()

PlayerMissionHistory               feeds into
  per-player mission log         →  Trials requirement checks (mission_count type)

Trials / Quests collection          src/app/(payload)/api/player-quests/
  prestige gates per skill       →  complete/ endpoint validates requirement
  requirementType: click (MVP)       future: mission_count | item_consume | stat_threshold

Messages collection
  NPC inbox (Sal + faction NPCs) →  created by mission engine on state changes
```

---

## Sprint Status

### ✅ Sprint 1 — Prestige Trials Framework (DONE)

All backend work is complete. No outstanding todos except schema migration and tests.

| Task | Status |
|------|--------|
| `GameEvents` append-only collection | ✅ Done |
| `Quests` + `PlayerQuestProgress` collections | ✅ Done |
| 48 Trial definitions seeded (all `click` type for MVP) | ✅ Done |
| `GET /api/player-quests` + `POST /api/player-quests/[id]/complete` | ✅ Done |
| Prestige gated behind Trial completion | ✅ Done |
| Schema migration (drizzle push for `*Prestige` columns) | ⚠️ Pending — run `pnpm dev` and accept push |
| Tests for quest/trial endpoints | ❌ Not yet written |

---

### ✅ Sprint 2 — Mission Engine & NPC Messaging (DONE)

Replaces hardcoded mission handlers with a data-driven engine. Adds NPC inbox. **All done — 28/28 E2E tests passing.**

#### Why

The current `player-actions` route has a bespoke handler per action. This doesn't scale to hundreds of missions with different costs, requirements, rewards, and dependencies. We need missions defined as data records, executed by a generic engine.

#### New Collections

**`Missions`**
```
slug                  — text, unique, indexed (e.g. 'patrol', 'escort')
name                  — text
description           — textarea (flavour text)
category              — select: combat | scavenging | social | criminal | tech
primarySkill          — select (12 skills) — skill this mission develops XP for
tier                  — number 1–5 (controls visibility banding)
isActive              — checkbox (admin on/off toggle)
costs                 — json  [{type:'energy', amount:2}]
requirements          — json  [{type:'stat_min', stat:'energy', value:2}]
visibilityRequirements— json  [{type:'stat_min', stat:'hacker', value:20}] | null = always visible
rewards               — json  [{type:'credits', min:10, max:20}, {type:'item_chance', ...}]
dependencies          — relationship → Missions (hasMany) — must complete before this appears
npcSlug               — text (which NPC messages on availability: 'sal', 'pit-boss', etc.)
availabilityMessage   — textarea (what NPC says when mission first becomes available)
completionMessage     — textarea (what NPC says on first completion)
```

**`Messages`** (NPC inbox — "Sal" + faction NPCs)
```
player     — relationship → Players (indexed)
npcSlug    — text ('sal' | 'pit-boss' | 'ghost' | 'crow' | ...)
npcName    — text (display name, denormalised)
subject    — text
body       — textarea
type       — select: mission_available | quest_completed | combat_result | faction_intro | general
isRead     — checkbox, default false
metadata   — json ({ missionSlug?, questId?, etc. })
createdAt  — auto
```

**`PlayerMissionHistory`** (completed mission log — feeds Trial `mission_count` requirements)
```
player       — relationship → Players (indexed)
missionSlug  — text (indexed)
completedAt  — date
outcome      — json { rewardsSummary, statChanges }
```

#### New Library Files

**`src/lib/mission-engine.ts`**
```typescript
isMissionVisible(player, mission): boolean           // checks visibilityRequirements
canRunMission(player, mission): { canRun, blockedReasons }  // checks requirements
executeMission(player, mission, payload, req): MissionResult // applies costs + resolves rewards
checkNewlyAvailableMissions(before, after, missions): Mission[]  // used for NPC messages
```

**`src/lib/energy.ts`** (lazy regeneration — no background timers)
```typescript
// Stored: { energy: 4, lastEnergyUpdate: "2026-03-19T10:00:00" }
// On request: current = min(max, stored + floor(elapsed / 5min))
// Frontend receives lastEnergyUpdate + regenRateMs → calculates countdown locally

calculateCurrentEnergy(stored, max, lastUpdate): { currentEnergy, nextRegenAt }
syncEnergyRegen(playerId, payload, req): Promise<Player>
```

#### Visibility & Availability Rules

| Layer | Field | Effect |
|---|---|---|
| Hidden | `visibilityRequirements` not met | Mission absent from list entirely |
| Locked | `visibilityRequirements` met, `requirements` not | Shown greyed-out with unlock hint |
| Available | All requirements met | Shown active — player can run it |

Tier 1 missions have no visibility requirements → all players see them (intro to each skill's world).
Tier 2+ missions require a skill stat threshold to even appear → a new Thug never sees deep Hacker content.

#### NPC Messaging Flow

1. Player runs a mission → `player-actions` calls `executeMission()`
2. Engine compares player state before/after → `checkNewlyAvailableMissions()`
3. Any newly available missions trigger a `Messages` record: *"Sal: I've got a job that suits your current situation..."*
4. Response includes `{ newMessages: N }` → frontend shows badge
5. Later: quest completion, prestige, faction events all create messages via the same system

Initial NPC: **Sal** (genderless fixer). Faction NPCs added as skills develop:
- Thug → The Pit Boss · Hacker → Ghost · Smuggler → Crow · etc.

#### New API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/missions` | All visible missions for player with availability status + `unreadMessages` count |
| `GET /api/messages` | NPC inbox (unread first) |
| `POST /api/messages/[id]/read` | Mark message read |

#### Updated Endpoints

| Endpoint | Change |
|---|---|
| `POST /api/player-actions` | Looks up mission from `Missions` collection instead of hardcoded switch. Calls engine. Records `PlayerMissionHistory`. Triggers NPC messages on new availability. |

#### Sprint 2 Todos (ordered by dependency)

**Phase 1 — Schema**
- [x] `missions-collection` — `src/collections/Missions.ts`
- [x] `messages-collection` — `src/collections/Messages.ts`
- [x] `player-mission-history-collection` — `src/collections/PlayerMissionHistory.ts`
- [x] `payload-config-update` — Register 3 new collections, run `pnpm generate:types`

**Phase 2 — Library**
- [x] `energy-lib` — `src/lib/energy.ts` (lazy regen: calculate at request time)
- [x] `mission-engine-lib` — `src/lib/mission-engine.ts` (visibility, availability, execution, reward resolution, new-availability detection)

**Phase 3 — API**
- [x] `missions-api` — `GET /api/missions/route.ts`
- [x] `messages-api` — `GET /api/messages/route.ts` + `POST /api/messages/[id]/read/route.ts`
- [x] `player-actions-refactor` — Refactor to use engine + `PlayerMissionHistory` + NPC messages

**Phase 4 — Seed**
- [x] `missions-seed` — Seed BEG, SPD-1, MED-1, RAD-X, ESCORT, PATROL, SALVAGE as `Missions` records with correct costs/rewards/requirements
- [x] `sal-messages` — Add `npcSlug: 'sal'` + `availabilityMessage` to seeded missions

**Phase 5 — Tests**
- [x] `player-actions-engine-tests` — Updated existing tests + engine-specific cases (17/17 pass)
- [x] `port-fix` — Backend runs on port 3000 (default). If port 3000 gets stuck by a zombie process, kill it: `lsof -i :3000 -t | xargs kill`. All Playwright configs use `localhost:3000`. **28/28 E2E tests passing.**
- [ ] `missions-api-tests` — Playwright E2E for `GET /api/missions`
- [ ] `energy-regen-tests` — Vitest unit tests for lazy energy calculation
- [ ] `trial-endpoint-tests` — Playwright E2E for trial/quest endpoints (from Sprint 1)

---

## Seeded Mission Definitions (Reference)

| Slug | Tier | PrimarySkill | Costs | Rewards | VisibilityReq |
|------|------|---|---|---|---|
| `beg` | 1 | grifter | energy:1 | credits:1–5 | none |
| `spd-1` | 1 | medic | credits:10 | energy+3 | none |
| `med-1` | 1 | medic | credits:15 | health+30 | none |
| `rad-x` | 1 | chemist | credits:20 | radiation−20 | none |
| `escort` | 2 | thug/pilot | energy:2 | credits:10–20, 20%:health−10 | none |
| `patrol` | 2 | thug | energy:2 | radiation+5, 30%:rad-x×1 | none |
| `salvage` | 2 | scavenger | energy:3 | radiation+8, item_chance:component | none |

---

## All 48 Trial Definitions (Prestige Gates)

> Collection slug: `quests` · Rename to `trials` is a future cleanup task.

### Thug
| P | Title | Future Requirement Type |
|---|-------|-------------|
| 1 | Survive the Pit | mission_count: escort × 3 |
| 2 | Iron Initiation | stat_threshold: health ≤ 80 after action |
| 3 | The Gauntlet | mission_count: escort × 5 |
| 4 | Last One Standing | stat_threshold: health ≤ 20 |

### Thief
| P | Title | Future Requirement Type |
|---|-------|-------------|
| 1 | Ghost Protocol | stat_threshold: health unchanged |
| 2 | The Clean Take | item_count: any × 10 |
| 3 | Shadowrun | mission_count + stat combo |
| 4 | Phantom Exit | mission_count: any × 5 |

### Grifter
| P | Title | Future Requirement Type |
|---|-------|-------------|
| 1 | The Long Con | mission_count: beg × n |
| 2 | Mark the Crowd | mission_count: beg × 20 |
| 3 | The Rigged Game | stat_threshold: credits ≥ 500 |
| 4 | Architect's Gambit | stat_threshold: credits ≥ 1000 |

### Pilot
| P | Title | Future Requirement Type |
|---|-------|-------------|
| 1 | Freighter Run | mission_count: escort × 3 |
| 2 | Hot Zone Transit | mission_count + stat: radiation ≥ 50 |
| 3 | No Transponder | mission_count: escort × 5 |
| 4 | Ghost Flight | mission_count: escort × 8 |

### Medic
| P | Title | Future Requirement Type |
|---|-------|-------------|
| 1 | Field Surgery | item_consume: med-1 × 3 |
| 2 | Triage Protocol | stat_threshold: health ≤ 30 then med-1 |
| 3 | Mass Casualty | item_consume: med-1 × 5 |
| 4 | Miracle Protocol | stat_threshold: health ≤ 10 twice |

### Hacker
| P | Title | Future Requirement Type |
|---|-------|-------------|
| 1 | Crack the Grid | puzzle: decode cipher |
| 2 | Logic Bomb | puzzle: sequence puzzle |
| 3 | Zero-Day | puzzle: exploit chain |
| 4 | Null Pointer | puzzle: master cipher |

### Technician
| P | Title | Future Requirement Type |
|---|-------|-------------|
| 1 | System Override | puzzle: wiring puzzle |
| 2 | Hot Patch | item_consume: spd-1 × 2 + escort |
| 3 | Forge Protocol | item_consume: scrap × 5 |
| 4 | Sage Architecture | puzzle: engineering design |

### Chemist
| P | Title | Future Requirement Type |
|---|-------|-------------|
| 1 | Synthesis Trial | item_consume: rad-x × 2 |
| 2 | Volatile Batch | item_consume: rad-x × 3 + radiation ≥ 40 |
| 3 | Toxic Mastery | item_consume: rad-x × 5 |
| 4 | Plague Formula | item_consume: rad-x × 5 + med-1 × 3 |

### Physicist
| P | Title | Future Requirement Type |
|---|-------|-------------|
| 1 | Void Calculation | stat_threshold: radiation ≥ 80 |
| 2 | Entropy Probe | mission_count + radiation tracking |
| 3 | Resonance Test | stat_threshold: radiation sustained ≥ 70 |
| 4 | Entropist's Trial | stat_threshold: radiation ≥ 95 |

### Scavenger
| P | Title | Future Requirement Type |
|---|-------|-------------|
| 1 | Wreck Dive | item_count: any × 5 |
| 2 | Deep Salvage | item_count: specific × 3 |
| 3 | Wraith Circuit | mission_count: any × 3 + radiation ≥ 30 |
| 4 | Dust Prophecy | item_count: any × 20 |

### Mechanic
| P | Title | Future Requirement Type |
|---|-------|-------------|
| 1 | Field Repair | item_consume: spd-1 × 2 |
| 2 | Jury Rig | item_consume: spd-1 × 2 + escort |
| 3 | Iron Calibration | item_consume: scrap × 8 |
| 4 | Sage Overhaul | item_consume: spd-1 × 5 + scrap × 10 |

### Smuggler
| P | Title | Future Requirement Type |
|---|-------|-------------|
| 1 | Dark Transit | mission_count: escort × 2 |
| 2 | Cold Trail | mission_count: escort × 3 + radiation ≥ 30 |
| 3 | Ghost Manifest | mission_count: escort × 5 |
| 4 | Shadow Network | mission_count: escort × 8 |

---

## Sprint 3 — Frontend Integration ✅ COMPLETE

All tasks done. See RELEASE_NOTES.md for details.

---

## Sprint 4 — Location Mechanics ✅ COMPLETE

Interactive modals for all World tab locations + one-time tutorial mission system.

### Backend
- `BankDeposits` + `PlayerNPCInteractions` collections created and registered
- `GET /api/bank`, `POST /api/bank/deposit`, `POST /api/bank/withdraw` — lazy maturity, one deposit per player
- `POST /api/npc/interact` — dialogue + mission unlock (Vex → `courier-run`, The Broker → `black-market-recon`)
- `npc_interaction` visibility requirement type added to mission engine
- 3 new missions: `reactor-search`, `courier-run`, `black-market-recon`
- 2 new items: `fuses` (8₵), `reactor-core` (150₵)
- `hideAfterCompletion` field on Missions — `spd-1`, `med-1`, `rad-x` marked as one-time tutorial missions
- Tutorial welcome message from Sal sent to every new player on signup
- Migration `20260320_134811.ts` — `hide_after_completion` column added
- 10 new E2E tests in `bank-npc.e2e.spec.ts` (all green)

### Frontend (`nekrosol-frontend`)
- `EmberBankModal`, `DustlineTavernModal`, `ReactorDistrictModal` added to `explore.tsx`
- Location card buttons and badges updated per location type
- Radiation levels corrected: Blackglass Market LOW 5%, Reactor District MEDIUM 35%
- **Mission modal removed** — selection now drives the right panel only; right panel shows costs + rewards

---

## Sprint 5 — Tutorial Mission UX 🔜 NEXT

**The problem:** The three one-time tutorial missions (spd-1, med-1, rad-x) are now `hideAfterCompletion: true` and new players receive a Sal welcome message pointing them to Blackglass Market. However the mission UX doesn't guide them through the steps clearly:
- Locked state shows raw "Need 1x RAD-X in inventory (have 0)" — no hint where to buy it
- Available state shows "Run Mission" — doesn't communicate this is a tutorial task to complete
- Description text doesn't walk through the steps

### Goals
1. Surface `hideAfterCompletion` in `GET /api/missions` response and `LiveMission` frontend type
2. Update descriptions for `spd-1`, `med-1`, `rad-x` to be step-by-step guides (go to Market → buy → return)
3. Frontend: show **"Complete Tutorial"** button instead of "Run Mission" for `hideAfterCompletion` missions
4. Frontend: locked tutorial missions show a friendly hint ("Purchase from Blackglass Market") instead of the raw blocked reason

### Tasks
- [ ] `s5-api-expose-hide-flag` — Add `hideAfterCompletion` to missions API response + `LiveMission` type
- [ ] `s5-tutorial-descriptions` — Update spd-1/med-1/rad-x descriptions in `missionDefinitions.ts` + DB
- [ ] `s5-complete-tutorial-button` — Frontend: "Complete Tutorial" label for `hideAfterCompletion` missions when available
- [ ] `s5-locked-hint` — Frontend: show shop location hint for locked tutorial missions

---

## Backlog / Future Sprints

- [ ] `missions-api-tests` — Backend Playwright E2E for `GET /api/missions`
- [ ] `energy-regen-tests` — Vitest unit tests for `calculateCurrentEnergy` (pure function)
- [ ] `skill-xp-awards` — Award skill XP on mission completion (Thug/Pilot from escort, Grifter from beg, etc.)
- [ ] `trial-type-mission-count` — Wire `mission_count` trial requirement type to `PlayerMissionHistory` data
- [ ] `trial-type-item-consume` — Wire `item_consume` trial requirement type to `GameEvents` item_consumed log
- [ ] `trial-type-stat-threshold` — Wire `stat_threshold` trial requirement type to player stats at completion time
- [ ] `trial-type-puzzle` — Puzzle engine (cipher, wiring, sequence)
- [ ] `trials-rename` — Rename `quests` → `trials` collection slug + update all references
- [ ] `player-travel` — Location travel endpoint with radiation/energy costs
- [ ] `display-title` — `displayTitle` field on Players for chosen prestige rank title
- [ ] `rate-limiting` — Rate limit on player-actions (20 req/min per player)
- [ ] `turso-migration` — Switch DB adapter to Turso for production deploy
- [ ] `faction-npcs` — Additional NPC personas: Pit Boss (Thug), Ghost (Hacker), Crow (Smuggler), etc.
- [ ] `websocket-layer` — Ably/Pusher for real-time: PvP events, live chat, mission unlock push notifications
