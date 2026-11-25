# Dungeon Crawler Carl Manager — Project Plan

Last updated: November 25, 2026

## Goal

Build a standalone application where users host games as GM or join games as
players, then manage campaign-specific crawlers and run sessions together.
Preserve MVC-style separation. The reusable Nx monorepo remains paused.

## Current requirements

- Authentication opens a primary lobby with Host a Game and Join a Game.
- Both branches offer New Game and Existing Game.
- Hosting creates a campaign and assigns the active account as its GM.
- Each game has a unique Game Code that the GM shares with players.
- Joining validates that code against a game accepting players, adds membership,
  and routes the player to creation for that campaign.
- Reopening a joined game loads its saved crawler without resetting it. If
  creation was interrupted, it resumes creation instead.
- An account may host multiple games and join other games. Roles are per game.
- Players see only their own crawler in a selected game; its GM sees everyone.
- One crawler per account per campaign is the initial shared-storage limit.
- Players choose their initial Tutorial stats. Existing stats become GM-controlled
  after creation. Official Human crawlers use ten slots; Constitution determines
  the threshold per slot. Owners can spend level-up stat points only through
  the GM-authorized saferoom advancement workflow on Floor 3 or deeper.
- Owners and the GM can apply damage and healing. Stat edits preserve current
  health, clamp it to a lower maximum, and keep zero health at zero.
- Legacy browser saves are preserved; their import UI was removed in the current
  project. Shared game storage is the active workflow.

The Host / Join requirement replaces the previous single-campaign restriction,
manual GM bootstrap, and player account-ID entry flow. Multiple games are now
part of the active milestone, rather than deferred work.

## Status

| Area | Status |
| --- | --- |
| Standalone Next.js application and MVC organization | Complete |
| Crawler creation, health rules, browser save/load | Working and manually verified |
| Authentication | Signup, confirmation, sign-in, refresh, sign-out, and automated checks verified by the user |
| Campaign domain permissions | Installed and verified in the user's earlier build |
| Shared storage and owner-only visibility | Installed; user reports database setup and hosting work |
| Host / Join lobby and selected-game routing | Installed; checks passed and user reports it works |
| Level 1 Human Tutorial entry | User verified creation, persistence, health, visibility, and independent game instances |
| Saved account writeups | Three slots per account; user verified independence from game progress |
| GM game deletion | User verified deletion; subsequent deleted-game redirect fix reviewed from supplied commit |
| Inventory and equipment | User reports `npm run check` and all manual acceptance checks passed |
| Standard Mana Potions | User reports checks and manual acceptance passed |
| Campaign dashboard and sheet UI | User reports checks and manual acceptance passed |
| Inventory grid and inspector | User reports application checks and manual acceptance passed |
| Equipment bonuses, DR, and Hotlist | User reports application checks and manual acceptance passed |
| Sheet modals, inline editing, derived stats | User reports application checks/manual verification passed; stats Edit/Confirm keys fixed locally |
| Tracked effects and automatic updates | Implemented in 011–012; local/database/browser acceptance pending |
| Collapsible sheet and direct ability management | User reports application/manual verification passed |
| Typed defenses | Implemented in milestone 010; full local/database/browser acceptance pending |
| Learned abilities and advancement marks | Implemented in milestone 008; database execution and full local/browser acceptance pending |
| Effect templates and unified abilities | Implemented in milestone 013; user reports completion |
| Encounter tracker | Compact official Mob phases and optional PvP initiative implemented in 016; database and browser acceptance pending |
| GM-controlled level advancement | Implemented in milestone 015; full application checks and isolated SQL verification passed; hosted/browser acceptance pending |

The user confirmed the earlier authentication and lobby builds passed checks and
reported that the game/database flow worked after migrations were applied.
The official rulebooks and character sheet are now the rules reference.

The user confirmed Tutorial data persists, health tracking works, GM/player
visibility is correct, saved writeups create independent Level 1 game crawlers,
and deleting a game preserves account writeups. The deleted-game routing fix
from commit `2d10644703c7c1d8b170fc520e29f581e8568c31` returns missing/inaccessible
games to the lobby with a fixed notice; database errors remain separate.

The user reports the inventory milestone passed application checks and all
manual acceptance tests. Potion automation, the sheet/dashboard redesign, and
equipment/DR/Hotlist have since passed user-reported application/manual checks.
Effect templates and unified abilities are complete by user report. Encounter
turn tracking is implemented; GM-controlled level advancement is the current milestone.

The verified inventory foundation adds 46 domain/service cases,
per-game item quantities/notes, equipped locations and slot limits, explicit
consumable quantity use, and one-time potions for newly created spellcasters.
The new potion/UI update adds 32 further cases. Its source harness passes 334
cases with mocked boundary/view checks. Real application checks, migration 006,
and live SQL/browser acceptance remain pending. See `Docs/POTIONS_UI_SETUP.md`.

## Current milestone: GM-controlled level advancement (015)

Rules reviewed directly from the supplied Core Rulebook (printed pp. 128, 135,
169–171) and Crawlers & Customization (pp. 42–44). Level awards and Skill/Spell
rank advancement are separate. The official level cap is 250; each level gained
after Level 1 earns three stat points. Tutorial points wait until Floor 3 or
deeper and a saferoom. Third Floor points can be allocated before race/class
prerequisite checks.

- [x] Add GM-only, version-checked level awards with source/reason and immediate
      level recording; leave pending points separate from current stats.
- [x] Require one-time GM reconciliation for every existing crawler, preserving
      current stats/resources and explicitly recording already applied points.
      Preserve legacy over-cap levels until an explicit reviewed correction.
- [x] Start new crawlers at Level 1 with zero spent points and no reconciliation.
- [x] Add fixed-point saferoom authorization, revocation and automatic closure
      when Floor changes. Additional awards never silently expand authorization.
- [x] Let owners or the GM atomically allocate authorized points to Unenhanced
      stats, derive Enhanced through gear/effects, and preserve current resources.
- [x] Retire the direct Level metadata edit; preserve GM base-stat corrections.
- [x] Record durable owner/GM-visible award, allocation and eligibility history.
- [x] Gate Human level-gain Favor behind explicit GM confirmation of Third Floor
      Human race selection; apply only to future gains, with no retroactive award.
- [x] Add domain, permission-boundary, UI and database assertions, including stale
      writes, overspending, game/writeup isolation and derived-stat rollback.
- [x] Pass `npm run check`: 855 tests across 52 files, ESLint, route/type
      generation, TypeScript, and the Next.js production build.
- [x] Apply 001–015 in isolated PostgreSQL and verify the actual 014→015 upgrade
      preserves existing crawler fields/resources, over-cap levels and writeups,
      changes versions, and marks existing crawlers for reconciliation.
- [x] Pass eight SQL suites: advancement, templates, effects/live, encounters,
      sheet controls, equipment/Hotlist, learned abilities and typed defenses.
- [ ] Apply migration 015 to the hosted database and run its rollback assertions.
- [ ] Verify authenticated two-account desktop/mobile/browser acceptance.

Migration: `supabase/migrations/202611240015_level_advancement.sql`, after 001–014.
Acceptance: `supabase/tests/level_advancement_permissions.sql` and the milestone
015 workflow in `README.md`. No dependencies or account writeups change.
Full race/class selection, automatic grinding/reward dice and retroactive level
corrections remain outside this milestone. Reconciliation is an explicit one-time
baseline review; ordinary GM stat corrections do not alter spent-point balances.

Local SQL verification uses minimal Supabase-compatible auth fixtures and a
stubbed realtime sender. It does not establish hosted Supabase/WebSocket/browser
acceptance. Existing SQL regression checks now read private saved writeups as
their owning player; the sheet regression uses checked level awards after 015.
Lint excludes the temporary `tmp/` directory so historical scratch dependencies
cannot interfere with application checks. Unrelated encounter changes are preserved.

## Previous milestone: encounters and turns (014, corrected in 016)

One GM-managed encounter per campaign tracks official crawlers and named
monsters in a compact list. Standard Mob combat follows declaration, reaction,
resolution, crawler action and Clean up phases without initiative. Optional PvP
records d20 + Dex totals each round, marks ties simultaneously, and requires
fresh rolls after each round. A completed round advances active timed effects
once for participating crawlers in the same transaction. GM-only reads and
version-checked writes preserve per-game permissions. Migration 016 converts
existing encounter rosters from the former numeric order to Mob phases;
monster health, attacks, targeting and damage remain future work. Apply 016
and run the updated SQL assertions and browser checks in `README.md`.

## Previous milestone: effect templates and unified abilities (013)

The user reports completion of reusable GM effect templates, self-effect links
for eligible Spells and consumables, and the unified ability list. See
`Docs/TEMPLATES_ABILITIES_SETUP.md` for its acceptance workflow.

## Previous milestone: tracked effects and automatic updates (011–012)

GM-managed named effects carry sources, visible notes, active stat modifiers,
typed-defense flags and optional manual round countdowns. Existing modifiers
and base defenses are preserved in the migration. Private per-account
invalidation notifications refresh authorized server snapshots, with batching,
reconnect/fallback resync and automatic-refresh edit protection. See
`Docs/EFFECTS_LIVE_SETUP.md` for migration and two-account acceptance.

The user reports the collapsible sections and direct ability-management UI
passed application and manual checks. Their stats button-key and LAN-origin
fixes are preserved by excluding those files from this overlay.

## Previous milestone: typed defenses (010)

GMs manage effective per-type resistance, vulnerability and immunity. Players
see the saved defenses. The Health modal previews the ordered calculation and
Apply uses version-checked server data. Existing neutral defense behavior and
untyped Armor Piercing remain. Source conditions and associated status effects
still require GM adjudication. The user's stats Edit/Confirm key fix remains
untouched. See `Docs/TYPED_DEFENSES_SETUP.md`.

## Previous milestone: sheet controls (009)

Health and Favor modals replace the previous control sections. Version-checked
inline edits enforce per-game roles. Only Unenhanced stats are editable by the
GM; Enhanced scores derive from active signed modifiers and equipped gear.
Existing non-gear adjustments migrate to explicit sources. GM level/floor
metadata persists without automatically granting level-up or class benefits.
See `Docs/SHEET_CONTROLS_SETUP.md` for installation and acceptance.

## Previous milestone: learned abilities (008)

Add per-game learned Skills, Attacks, Damage Effects, and Spells with current
ranks, governing-stat Check references, descriptions and reviewed Mana costs.
Players mark their own eligible abilities; the GM awards abilities, edits
ranks/definitions, and records advancement rolls. Marks clear after success or
failure. Current Spell records supply Hotlist choices and atomic Mana/mark
updates. Protected Tutorial Heal stays rank 1. See
`Docs/LEARNED_ABILITIES_SETUP.md` for installation and acceptance.

The latest submitted lobby/profile controls and removal of the legacy import
flow are preserved. Earlier milestone sections below retain their historical
verification notes. The user's latest report confirms 007 application and
manual checks; 008 live database, build, and browser checks remain pending.

## Roadmap

| Phase | Scope | Outcome | Status |
| --- | --- | --- | --- |
| 1. Foundation | Standalone project, MVC structure, health rules, local saves, checks | Create and track a crawler locally | Complete |
| 2. Lobby, accounts, and shared games | Authentication, Host/Join, codes, per-game roles, ownership, database storage, conflict handling | Host or join games and resume the correct shared crawler from another device | Installed; user reports working |
| 3. Complete crawler sheets | Human Tutorial entry, official stats/health/Mana/Favor/numbering first; remaining sheet sections afterward | Create and play a game-specific crawler using official rules | Human entry user verified; remaining sheet sections incremental |
| 4. Skills and spells | Catalogs, assignments, descriptions, usage rules | Manage crawler abilities during play | Learned abilities and self-effect links implemented; broader execution remains |
| 5. Inventory, equipment, and effects | Item definitions, owned instances, equipment, traits, supported calculations | Award and manage equipment and its effects | Inventory, equipment, tracked effects, and templates implemented |
| 6. Encounters and combat | Monsters, encounter setup, initiative, turns, health, statuses | Run combat from a GM dashboard | Encounter turn foundation implemented; combat actions remain |
| 7. Achievements, rewards, and progression | Awards, loot, history, controlled level-up | Award rewards and apply eligible progression | GM-controlled advancement implemented in 015; wider rewards remain |
| 8. Release readiness | Usability, mobile layout, export/recovery, hosting, broader checks | Use the application reliably for regular sessions | Planned |

Detailed game rules must be settled before implementing each feature's
calculations. The original design establishes the broader scope but does not
settle all mechanics.

## Phase 2 checklist

### Verified foundation

- [x] Separate pure game rules from controllers, views, and adapters.
- [x] Preserve health tracking and local saves.
- [x] Add campaign ownership and post-creation stat permissions.
- [x] Select and configure Supabase authentication.
- [x] Add and verify signup, confirmation, sign-in, sign-out, and session refresh.
- [x] Decide visibility: players see their own crawler; the GM sees all.

### Shared-game implementation

These items describe implemented code, not completed deployment verification.

- [x] Add shared campaign, membership, crawler, and version storage.
- [x] Add row policies and checked write functions.
- [x] Reject stale health/stat updates instead of silently overwriting data.
- [x] Add an explicit browser-save import that preserves the original.
- [x] Add Host / Join lobby branches with New / Existing options.
- [x] Create hosted games and their Game Codes through the signed-in account.
- [x] Join games by code, with duplicate membership handled idempotently.
- [x] List hosted and joined games separately for each account.
- [x] Load the selected game's data and resolve its role independently.
- [x] Route new members to creation and existing crawlers to their sheet.
- [x] Add GM control to pause/open new joins without removing existing access.
- [x] Preserve existing campaigns and assign them codes through migration.
- [x] Supply database assertions and multi-session acceptance checks.

### Prior milestone verification

The user reported that the application checks passed and the database/game flow
worked after the migrations were applied. Continue using the multi-session edge
case checklist in LOBBY_SETUP.md as appropriate; those cases should not be
assumed individually observed from a general success report.

The next update is the Human Tutorial entry below.

## Current milestone: Level 1 Human Tutorial entry

The user selected Level 1 Tutorial entry first and supplied the official sheet,
Core Rulebook, and Rules for Survival. The prototype's original modifier/health
arithmetic differed from the published system. Official records now use a tagged
ruleset; old records remain prototypes until a reviewed conversion.

Implemented in the new update:

- [x] Standard array 2/3/4/5/6 or one saved, server-generated roll in fixed stat order.
- [x] Separate Unenhanced and Enhanced stats and official modifier thresholds.
- [x] Forty-eight Human background categories, stage ranks, and duplicate rejection.
- [x] Starting combat choice, prescribed hand-to-hand effect where applicable, and Heal.
- [x] Ten-slot health, per-hit damage thresholds, direct slot healing, and atomic Heal.
- [x] Mana maximum based on Enhanced Intelligence and bounded spending/recovery.
- [x] Human starting AI Favor, owner spending, GM awards, and GM-only stat corrections.
- [x] Unique per-campaign Crawler Numbers beginning at 500,000 and GM correction.
- [x] Human identity, optional pronouns/story/gear notes, and Level 1/Floor 1 defaults.
- [x] Explicit GM review/conversion, archived prototype rows, and zero-health preservation.
- [x] New application tests, SQL assertions, and installation/acceptance instructions.

Remaining before marking the update verified:

- [ ] Apply only migration 202611090003_tutorial_entry.sql to the existing database.
- [ ] Run tutorial_entry_permissions.sql and confirm the transaction rolls back successfully.
- [ ] Run npm run check; expect 251 tests, lint, typecheck, and production build.
- [ ] Check both stat methods, creation, numbering, health, Heal, Mana, Favor, and roles.
- [ ] Check reviewed prototype conversion, stale updates, and mobile layout.

See TUTORIAL_SETUP.md and TUTORIAL_RULES.md. Starting gear is currently notes;
consumable quantities now have explicit inventory tracking. Attack execution and
automatic potion effects remain future work.
Animal entry, Third Floor creation, race/class catalogs, portraits, rests,
Dying-round countdowns, and broader progression remain future tasks. GM-controlled
level advancement is implemented in 015; tracked effects and typed defenses have
their own later milestones above.

## Architecture

| Layer | Responsibility |
| --- | --- |
| Views | Screen markup, bindings, display conditions |
| Controllers | Named user actions and presentation state |
| Domain | Pure rules, validation, ownership, visibility |
| Services | Application commands, routing decisions, persistence contracts |
| Adapters | Supabase and browser storage implementations |
| Routes/server actions | Resolve verified identity and selected-game boundaries |
| Database | Row visibility, membership checks, constrained and versioned writes |

`@/` resolves to `src`. Keep styles in CSS files and game calculations independent
of React and external services. Browser-provided user IDs, GM flags, and campaign
snapshots are not authorization. Database writes enforce the current account's
actual role even when called directly through the Data API.

## Delivery workflow

1. Define gameplay rules and permissions relevant to the feature.
2. Implement domain/application behavior and meaningful tests.
3. Connect storage, controllers, and presentation.
4. Run the project's automated checks.
5. Run applicable database and manual multi-session checks.
6. Update this plan with actual implementation and verification status.

For each implementation, include installation steps, completed verification,
and checks that still require the user's environment. Edit project files directly.

## Open work and decisions

- Remaining sheet sections and later creation modes, using the supplied books.
- Membership removal, ownership transfer, game archiving, code rotation, and
  crawler deletion behavior.
- Private live refresh is implemented; continue testing reconnect behavior and
  version checks across multiple sessions.
- Hosting provider and deployment configuration. Supabase is selected for auth
  and PostgreSQL storage.
- Detailed skill, spell, effect, inventory, combat, reward, and progression rules.

Game Codes currently act as invitations for signed-in, confirmed accounts while
joining is open; there is no separate approval queue. The GM refreshes the game
view to see new arrivals. Reusable monorepo extraction remains deferred.

## Current inventory milestone

- [x] Keep items on campaign crawler instances, separate from account writeups.
- [x] Track item names, quantities, types, notes, and equipment locations.
- [x] Enforce clothing/holding slots, two-handed conflicts, and accessory limits.
- [x] Allow owners and the campaign GM to manage visible crawler inventories.
- [x] Share row locks and version checks with health/Mana/stat changes.
- [x] Seed five Mana Potions only on new spellcaster insertion.
- [x] Preserve existing gear notes and avoid refilling existing crawlers.
- [x] Apply the inventory update and complete its manual acceptance (user reported).
- [x] Pass the inventory milestone’s local test/lint/typecheck/build chain (user reported).
- [x] Complete the inventory manual acceptance checklist (user reported).
- [ ] Add item catalogs, Hotlist/Spell entries, currencies, and controlled transfers.
- [ ] Automate supported equipment/potion effects and combat timing.

## Current potion and UI milestone

- [x] Spend one identified Standard Mana Potion and restore Mana atomically.
- [x] Reject full Mana, Dying, unsupported items, unauthorized users, and stale saves.
- [x] Keep custom consumables manual and require GM classification of existing effects.
- [x] Preserve quantities and legacy manual items during migration; never refill stacks.
- [x] Add a GM crawler selector and keep player selection within their visible list.
- [x] Reorganize the sheet around official identity, attributes, health, and resource areas.
- [x] Preserve existing tracker, inventory, deletion, and correction controls.
- [ ] Apply migration 006 and pass potion/inventory database assertions.
- [ ] Pass the real local `npm run check` chain for this update.
- [ ] Verify dashboard selection, potion use, and desktop/mobile layouts in the browser.
- [ ] Add equipment bonuses, DR, Buffs, and other supported item effects next.

## Current inventory UX update

The user verified the potion/sheet update, then requested a cleaner two-column
inventory. The new client component uses Tailwind, a fixed equipment panel,
a five-to-eight-column stored-item grid, and one selected inspector. Search,
type filtering, and pagination keep larger inventories manageable. Existing
server actions remain authoritative for saving, equipment, potions, and removal.

- [x] Add the reusable InventorySystem component and requested UI types.
- [x] Adapt existing items while preserving two-handed slots and accessory limits.
- [x] Keep remaining copies of equipped stacks visible without duplicating data.
- [x] Mount only the selected inspector/action form.
- [x] Preserve existing potion, edit, equip, drop, add, and GM classification actions.
- [x] Pass 342 source cases plus stateful mocked UI checks.
- [ ] Install Tailwind/PostCSS and pass the real local check chain.
- [ ] Verify responsive layout, navigation, and all existing action flows in the browser.

See `Docs/INVENTORY_GRID_SETUP.md`. No new database migration is required.

## Current equipment and quick-slot milestone

The user verified the inventory grid and requested equipment calculations and
quick slots together. The new loadout keeps reviewed baseline stats separate
from effective equipped totals. Gear definitions and non-gear DR are GM-only.
A ten-slot Hotlist stores references and supports existing Mana/Heal effects,
atomic held-item swaps, and manual preparation of the known Attack Spell.

- [x] Preserve prior stats/resources and existing definitions during migration.
- [x] Apply equipped flat attributes, DR, and Evade once per entry.
- [x] Keep stored/prepared gear inactive; preserve health and clamp Mana on lower maxima.
- [x] Review old manual baseline values and equipment definitions atomically.
- [x] Provide raw-DR and final-net damage paths without double subtraction.
- [x] Add ten quick slots with assignment, movement, replacement, clearing, and cleanup.
- [x] Reuse atomic potion/Heal actions and ready held gear in one save.
- [x] Preserve inventory grid, role permissions, writeup isolation, and stale-write protection.
- [x] Pass 389 source cases plus mocked boundaries and UI-state checks.
- [ ] Apply migration 007 and pass the supplied equipment/Hotlist SQL assertions.
- [ ] Pass the real local check chain and browser/multi-account acceptance.
- [ ] Add conditional effects, broader spell execution, and a turn/timing engine later.

See `Docs/EQUIPMENT_HOTLIST_SETUP.md` for the reviewed baseline workflow and limits.
