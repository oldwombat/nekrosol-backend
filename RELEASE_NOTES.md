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

---

### Lazy Energy Regeneration — Architecture Deep Dive

#### Core Principle

Energy regenerates over time but **no background timers or cron jobs ever run**. The current energy value is always *calculated on demand* from two stored numbers:

```
DB stores:  { energy: 7, lastEnergyUpdate: "2026-03-20T12:00:00Z" }

At 12:17 — player runs a mission:
  elapsed   = 17 minutes
  gained    = floor(17 min / 5 min per tick) = 3
  effective = min(energyMax=10, 7 + 3) = 10
```

This means:
- **Offline players cost zero compute** — their energy "ticks" accumulate silently in the arithmetic.
- **No DB drift** — the authoritative value is always computed from the timestamp, never from a running counter.
- **Not cheatable** — the server always recalculates; client-side display is a mirror, not the source of truth.

#### Server-Side: `src/lib/energy.ts`

```
calculateCurrentEnergy(storedEnergy, energyMax, lastUpdate, now?)
  → { currentEnergy, gainedSinceUpdate, nextRegenAt }
```

Pure function — no DB access, no side effects. Safe to call anywhere for read-only display.

```
syncEnergyRegen(playerId, payload)
  → Player (up-to-date record)
```

Called at the top of every `POST /api/player-actions` handler before the mission executes. If `gained > 0`, writes the new energy + fresh `lastEnergyUpdate` timestamp back to the DB. If nothing changed, returns the player record unchanged (zero DB writes for online players rapidly clicking).

**Self-heal path**: if `lastEnergyUpdate` is null but `energy < energyMax`, `syncEnergyRegen` initialises the clock by writing `lastEnergyUpdate = now`. This handles players created before the field was added.

#### Regen Clock Initialisation: `POST /api/player-actions`

A new player starts with full energy (`energy = energyMax = 10`). Since they're full, `syncEnergyRegen` has nothing to do and correctly leaves `lastEnergyUpdate` null. When the player runs their first mission and energy drops to 9, the route explicitly sets `lastEnergyUpdate = now` if it's still null:

```typescript
// In player-actions/route.ts — after executeMission(), in the radiation tick update:
if (energyAfter < energyMax && !postActionPlayer.lastEnergyUpdate) {
  tickData.lastEnergyUpdate = new Date().toISOString()
}
```

This is the moment the regen clock starts — exactly when it needs to.

#### Client-Side: `hooks/use-energy-countdown.ts`

The frontend hook mirrors the server arithmetic exactly, running a `setInterval` every second:

```
storedEnergy + floor((now - lastEnergyUpdate) / 5min)  →  liveEnergy
5min - (elapsed % 5min)                                 →  msUntilNextTick → "M:SS" label
```

The hook returns:
- `liveEnergy` — displayed in `HomeStats` (updates every second, no polling)
- `regenLabel` — "⚡ next regen in 4:32" countdown displayed below the energy stat
- `secondsUntilRegen` — null when energy is at max (hides the label)

When the countdown reaches 0:00, `liveEnergy` increments by 1 (the next tick's math resolves). On the next real server interaction, `syncEnergyRegen` will confirm the new value and write it to the DB.

#### Data Flow Diagram

```
Player runs mission (POST /api/player-actions)
  │
  ├─ syncEnergyRegen()          ← recalculates + DB write if gained > 0
  │
  ├─ canRunMission()            ← checks requirements against synced energy
  │
  ├─ executeMission()           ← deducts energy cost
  │
  ├─ radiation tick + lastEnergyUpdate init (if first spend)
  │
  └─ returns { player: { energy, lastEnergyUpdate, ... } }
           │
           ▼
  Frontend receives updated player
  useEnergyCountdown(energy, energyMax, lastEnergyUpdate)
     setInterval(1s) → liveEnergy ticks up, label counts down
     At 0:00 → liveEnergy += 1, label resets to "5:00"
     (server confirms on next real action)
```

#### Why Not Polling?

Alternatives considered and rejected:
- **Polling** (`setInterval` → `GET /api/players/me` every N seconds): server load scales with active users, wakes up idle connections, introduces latency jitter in the countdown display.
- **Server-Sent Events / WebSocket push**: correct architecture for real-time, but adds infra complexity (connection management, reconnect logic) for a feature that is purely cosmetic — the number displayed is the same whether pushed or calculated.
- **Background job (cron)**: would require a separate runtime, DB write thrash for every online player, and still needs the "calculate on arrival" logic for offline players.

The lazy pattern is sufficient for energy because the source of truth only needs to be authoritative at action time, not between actions.

---

### Location Modal Pattern — World Tab (`nekrosol-frontend`)

#### Overview

When a player taps **Enter →** on a location card in the World tab, a **bottom-sheet modal** slides up over the current screen. The modal is fully self-contained — it owns its own loading state, API calls, and interactions. Closing it returns the player to the World tab with no navigation stack changes.

This is the established pattern for all location-specific interactions going forward (shops, NPCs, crafting benches, faction offices, etc.).

#### How It Works (`explore.tsx`)

**Location registry:**
```typescript
const LOCATION_RADIATION: Record<string, LocationRadiation> = { ... }
// Declares radiation level + flavour text per location slug

const SHOP_LOCATIONS = new Set(['blackglass-market'])
// Controls which locations render "Enter →" vs "Travel →" and show the 🛒 badge
```

**State in `WorldScreen`:**
```typescript
const [shopLocation, setShopLocation] = useState<string | null>(null)
// null = no modal open. A location slug = that location's modal is open.
```

**Location card button:**
```tsx
onPress={() => { if (hasShop) setShopLocation(location.id) }}
// "Enter →" opens modal. "Travel →" is a no-op placeholder for future travel mechanic.
```

**Modal mounting:**
```tsx
{activeLocation ? (
  <BlackglassShopModal
    locationName={activeLocation.name}
    visible={shopLocation !== null}
    onClose={() => setShopLocation(null)}
    palette={palette}
  />
) : null}
// Only mounted when a location is active. Unmounts fully on close (resets all internal state).
```

**Bottom-sheet shell (reuse this for all location modals):**
```tsx
<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
  <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
    <View style={{
      backgroundColor: palette.background,
      borderTopWidth: 1, borderTopColor: palette.tabIconDefault,
      borderTopLeftRadius: 16, borderTopRightRadius: 16,
      maxHeight: '80%', padding: 20, gap: 14,
    }}>
      {/* Header: title + live credit/stat display + ✕ close button */}
      {/* Optional feedback banner (success/error) */}
      {/* ScrollView content — item list, NPC dialogue, crafting UI, etc. */}
    </View>
  </View>
</Modal>
```

**Lazy loading — load once on first open, reset on close:**
```typescript
const [hasLoaded, setHasLoaded] = useState(false)
if (visible && !hasLoaded) { setHasLoaded(true); void loadContent() }
if (!visible && hasLoaded) { setHasLoaded(false) }
// Avoids loading until the player actually enters. Resets if they leave and come back.
```

#### Extending to New Locations

To add a new location with its own modal:

1. Add the location slug to the appropriate Set (e.g. `SHOP_LOCATIONS`, or a new `NPC_LOCATIONS`, `CRAFTING_LOCATIONS`)
2. Create a new `XxxModal` component following the bottom-sheet shell above
3. Add a `useState<string | null>(null)` for that location type's open state in `WorldScreen`
4. Mount the modal conditionally at the bottom of `WorldScreen` (same as `BlackglassShopModal`)
5. Wire the location card `onPress` to set the state

Each location type gets its own modal component. A single location can combine types (e.g. an NPC who also sells items) by composing content inside one modal rather than stacking modals.

#### Planned Location Interactions

| Location | Radiation | Planned Modal |
|----------|-----------|---------------|
| Blackglass Market | LOW 5% | ✅ Shop (SPD-1, MED-1, RAD-X, scrap, wire) |
| Dustline Tavern | LOW 5% | NPC dialogue, rumours, job board |
| Ember Bank | LOW 5% | Credit exchange, term deposits |
| Reactor District | MEDIUM 35% | Scavenging — item_chance loot table, radiation cost per search |

> **Radiation badge rule:** The % is ambient flavour only — no passive drain from browsing/visiting. Radiation costs only apply when actively performing an action at a location. Future locations (deep ruins, meltdown zones, etc.) will push into HIGH 75%+ territory.

---

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
- **Lazy energy regen — fully working**: `useEnergyCountdown` hook drives a live "⚡ next regen in M:SS" counter below the energy bar. Timer counts down to 0:00 then increments `liveEnergy` by 1, repeating every 5 minutes with zero server polling. See _Lazy Energy Regeneration — Architecture Deep Dive_ above for full technical detail.
- **Energy regen clock initialisation fix**: `lastEnergyUpdate` was never written to the DB for any existing player because `syncEnergyRegen` only initialises on `gained > 0` (never fires when full energy). Fixed in two places:
  1. `player-actions/route.ts` — sets `lastEnergyUpdate = now` the first time energy drops below max
  2. `energy.ts` `syncEnergyRegen` — self-heal: if `lastEnergyUpdate` is null and `energy < energyMax`, writes the timestamp regardless of `gained`
- **Energy display fix** — `useEnergyCountdown` returns `liveEnergy` (stored + elapsed ticks); `HomeStats` uses this for the displayed value so the energy number updates locally every tick without API polling
- NPC Messages tab — new `/messages` screen with inbox list and mark-as-read; unread badge on welcome line
- `home-auth.ts` refactored — `missions` + `unreadMessages` state added; `ActionType` coupling removed
- Locations card removed from Play tab (redundant with World tab)
- **CORS middleware** — `src/middleware.ts` added to inject `Access-Control-Allow-Origin` + `Access-Control-Allow-Credentials` on all custom game API routes (`/api/missions`, `/api/messages`, `/api/player-*`, `/api/shop`). Root cause of silent mission loading failure in Playwright browser context
- **Blackglass Market shop** — `GET /api/shop` returns item catalog; `POST /api/shop/purchase` validates credits, deducts, and adds to inventory with rollback on failure. `explore.tsx` "Enter →" button opens a bottom-sheet shop modal with buy buttons, live credit display, and purchase feedback
- Item seed (`src/seed/seedItems.ts`) — 5 items seeded idempotently on signup: SPD-1 (30₵), MED-1 (25₵), RAD-X (15₵), scrap-metal (3₵), wire-coil (5₵)
- 9/9 frontend Playwright tests passing (added Messages tab test; missions test uses live API data)

**Sprint 4 — Location Mechanics: ✅ COMPLETE**

New interactive location modals in the World tab + one-time tutorial mission system.

_Backend:_
- `BankDeposits` collection — term deposit schema (player, amount, interestRate, depositedAt, maturesAt, status)
- `PlayerNPCInteractions` collection — tracks which NPCs a player has spoken to (npcId, interactionCount)
- `GET /api/bank`, `POST /api/bank/deposit`, `POST /api/bank/withdraw` — full term deposit lifecycle; lazy maturity check (same zero-timer pattern as energy regen); one active deposit per player; no early withdrawal
- `POST /api/npc/interact` — upserts NPC interaction, returns dialogue + list of newly-unlocked missions; `NPC_CATALOGUE` contains Vex and The Broker
- `mission-engine.ts` — new `npc_interaction` visibility requirement type; pre-fetches all NPC interactions in one query to avoid N+1
- `missionDefinitions.ts` — 3 new missions: `reactor-search` (scavenging, radiation cost, probabilistic loot), `courier-run` (requires Vex interaction), `black-market-recon` (requires The Broker interaction)
- `seedItems.ts` — added `fuses` (8₵) and `reactor-core` (150₵)
- **`hideAfterCompletion` field** added to `Missions` collection — one-time missions that disappear from the player's list after first completion; `isMissionVisible()` checks mission history before returning true
- `spd-1`, `med-1`, `rad-x` marked `hideAfterCompletion: true` — tutorial missions that disappear once used
- **Tutorial welcome message** sent from Sal to every new player on signup (via `Players.ts` `afterOperation` hook) pointing them to Blackglass Market and the three consumable missions
- CORS middleware updated to cover `/api/bank` and `/api/npc`
- Migration `20260320_134811.ts` — adds `hide_after_completion` column to `missions` table
- `bank-npc.e2e.spec.ts` — 10 new E2E tests covering bank deposit/withdraw lifecycle and NPC interaction + mission unlock

_Frontend (`nekrosol-frontend/app/(tabs)/explore.tsx`):_
- `EmberBankModal` — term deposit UI: view terms, deposit credits, see active deposit with maturity countdown, withdraw when matured
- `DustlineTavernModal` — NPC interaction: talk to Vex or The Broker, receive dialogue, unlock hidden missions
- `ReactorDistrictModal` — scavenging: run `reactor-search` mission, see loot result + radiation gained
- Location card buttons updated: "Enter →" for shop, "Deposit →" for bank, "Talk →" for tavern, "Scavenge →" for reactor
- Typed badges per location: 🛒 Shop, 🏦 Bank, 💬 NPCs, ⚗ Scavenge
- Radiation levels corrected: Blackglass Market → LOW 5%, Reactor District → MEDIUM 35%
- **Mission modal removed** — clicking a mission in the list now selects it into the right panel instead of opening a modal overlay; right panel now also shows costs + rewards (previously modal-only)

**Sprint 5 — Tutorial Mission UX: 🔜 STILL PENDING**
- `hideAfterCompletion` surfaced in API response (`GET /api/missions`) and `LiveMission` type
- Tutorial missions (spd-1, med-1, rad-x): updated descriptions with step-by-step guidance ("Visit Blackglass Market → buy X → return and complete")
- "Complete Tutorial" button label instead of "Run Mission" for `hideAfterCompletion` missions
- Friendly locked state: "Purchase from Blackglass Market" hint instead of raw "Need 1x X in inventory"

---

### Sprint 6 — Radiation Decay, Skill XP & Titles ✅ COMPLETE

_Backend (`nekrosol-backend`):_
- **Removed per-action radiation tick** — radiation no longer decays by -1 on every player action; replaced entirely by the lazy passive decay pattern
- **`src/lib/radiation.ts`** — new lazy radiation decay module mirroring `energy.ts`: `calculateRadiationDecay()` (pure, no DB) + `syncRadiationDecay()` (DB write with self-heal); 1 rad per 60 minutes, floor 0
- `lastRadiationUpdate` timestamp field added to Players collection; `syncRadiationDecay` called at the top of `GET /api/missions` and `POST /api/player-actions` alongside `syncEnergyRegen`
- **Skill XP awards** added to missions with explicit thematic link — 6 missions now award +1 skill XP per run (escort/patrol → thug, salvage/reactor-search → scavenger, courier-run → pilot, black-market-recon → thief); energy costs raised +1 for each skill-awarding mission; `beg` unchanged (no XP, 1 energy)
- `displayTitle` field added to Players collection — optional text, player-chosen rank name from their earned prestige tiers
- **`POST /api/players/title`** — new endpoint; accepts `{ title: string }`; validates title against all ranks the player has legitimately earned (server-side computation from skill + prestige values); sets `displayTitle`; empty/null clears the title
- Migration `20260321_002131.ts` — adds `last_radiation_update` and `display_title` columns to `players` table

_Frontend (`nekrosol-frontend`):_
- **`hooks/use-radiation-countdown.ts`** — new hook mirroring `use-energy-countdown.ts`; returns `liveRadiation`, `decayLabel` (e.g. "☢ -1 in 45:00"); re-calculates every second
- `HomeStats.tsx` — radiation stat card now shows "☢ -1 in HH:MM" countdown label when radiation > 0; `liveRadiation` computed locally (same as `liveEnergy`)
- `PlayerProfile` type — added `lastRadiationUpdate` and `displayTitle` fields
- **Account screen** — added "Display Title" section: shows active title (or "None set"), lists all earned rank names as tappable chips; tap to activate, tap again to clear; calls `POST /api/players/title`; upgraded to `ScrollView` to accommodate extra content
- **Home tab** — player greeting now shows `‹displayTitle›` in italic after the display name when a title is set

---

## Known Gaps / Not Yet Built

- No rate limiting on player-actions
- No player-travel endpoint (locations are frontend-only display)
- Tutorial mission UX (step-by-step guidance, "Complete Tutorial" button) not yet implemented — see Sprint 5
- `GET /api/missions` endpoint has no dedicated E2E tests yet
- Lazy energy/radiation regen has no Vitest unit tests yet
- No E2E tests for trial/quest system yet

---

## Sprint 7 — Activity Log & Toast Notifications

_Backend (`nekrosol-backend`):_
- **Messages collection** — added `activity_log` type option alongside existing NPC message types
- **`src/lib/activity-log.ts`** — new helper: `createActivityLog(playerId, payload, entries[])` bulk-writes activity log Messages with `type: activity_log`, `npcSlug: system`, `isRead: true` (never inflates unread badge); `diffInventory(before, after)` pure fn computes inventory deltas from count snapshots
- **`POST /api/player-actions`** — snapshots inventory before consuming item costs; after mission execution, computes `inventoryDeltas` (added/removed items); writes `activity_log` Messages for: health damage, health restore, radiation exposure, inventory adds/removes (non-fatal, errors logged but don't fail the request); response now includes `inventoryDeltas: Array<{itemKey, quantity, direction}>` alongside existing `statChanges`

_Frontend (`nekrosol-frontend`):_
- **`hooks/use-toast-queue.tsx`** — `ToastProvider` React context + `useToasts()` hook; queue holds up to 3 toasts, auto-dismissed after 2.8s; each toast has a colour: `red` (damage/radiation gain), `green` (heal/energy regen/radiation decay), `blue` (inventory change)
- **`components/ToastOverlay.tsx`** — animated pill toasts rendered above all screens; fade in 150ms / hold 2.1s / fade out 500ms using `Animated` (no external libraries); positioned `bottom: 88` above the tab bar
- **`_layout.tsx`** — tab navigator wrapped in `ToastProvider`; `<ToastOverlay />` rendered as a sibling to `<Tabs>` so toasts appear on all tabs
- **`home-auth.ts`** — `onAction()` now dispatches toasts after each player action: health damage → red, health restore → green, radiation gain → red, inventory add → blue, inventory remove → blue
- **`use-energy-countdown.ts`** — fires a green toast when passive energy regen ticks (not on initial mount)
- **`use-radiation-countdown.ts`** — fires a green toast when passive radiation decay ticks (not on initial mount)
- **`lib/api.ts`** — `ActionResult` type updated to include `statChanges`, `rewardsSummary`, `inventoryDeltas`, `newMessages`; `NpcMessage.type` narrowed to a union including `activity_log`; `NpcMessage.metadata.category` typed as `damage | heal | inventory | info`
- **Messages tab** — "📋 Show Log / Hide Log" toggle (default: off); when off, `activity_log` messages are filtered out; when on, log entries appear with category-colour accent border (red/green/blue/grey), smaller padding, dimmer opacity; NPC/player messages unaffected
