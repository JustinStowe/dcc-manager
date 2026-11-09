# Dungeon Crawler Carl Manager — Project Plan

Last updated: November 9, 2026

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
  the threshold per slot. Player level-up adjustments come later through
  a separate eligibility-controlled workflow.
- Owners and the GM can apply damage and healing. Stat edits preserve current
  health, clamp it to a lower maximum, and keep zero health at zero.
- Existing browser saves are preserved and can be explicitly imported into a
  selected campaign under the signed-in account.

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
| Standard Mana Potions | Atomic use and explicit effect classification implemented; migration 006 and local acceptance pending |
| Campaign dashboard and sheet UI | Crawler selector and official-sheet-inspired layout implemented; browser acceptance pending |

The user confirmed the earlier authentication and lobby builds passed checks and
reported that the game/database flow worked after migrations were applied.
The official rulebooks and character sheet are now the rules reference.

The user confirmed Tutorial data persists, health tracking works, GM/player
visibility is correct, saved writeups create independent Level 1 game crawlers,
and deleting a game preserves account writeups. The deleted-game routing fix
from commit `2d10644703c7c1d8b170fc520e29f581e8568c31` returns missing/inaccessible
games to the lobby with a fixed notice; database errors remain separate.

The user reports the inventory milestone passed application checks and all
manual acceptance tests. The next development piece is atomic Standard Mana
Potion use and the character sheet/dashboard redesign.

The verified inventory foundation adds 46 domain/service cases,
per-game item quantities/notes, equipped locations and slot limits, explicit
consumable quantity use, and one-time potions for newly created spellcasters.
The new potion/UI update adds 32 further cases. Its source harness passes 334
cases with mocked boundary/view checks. Real application checks, migration 006,
and live SQL/browser acceptance remain pending. See `Docs/POTIONS_UI_SETUP.md`.

## Roadmap

| Phase | Scope | Outcome | Status |
| --- | --- | --- | --- |
| 1. Foundation | Standalone project, MVC structure, health rules, local saves, checks | Create and track a crawler locally | Complete |
| 2. Lobby, accounts, and shared games | Authentication, Host/Join, codes, per-game roles, ownership, database storage, conflict handling | Host or join games and resume the correct shared crawler from another device | Installed; user reports working |
| 3. Complete crawler sheets | Human Tutorial entry, official stats/health/Mana/Favor/numbering first; remaining sheet sections afterward | Create and play a game-specific crawler using official rules | Human entry user verified; remaining sheet sections incremental |
| 4. Skills and spells | Catalogs, assignments, descriptions, usage rules | Manage crawler abilities during play | Planned |
| 5. Inventory, equipment, and effects | Item definitions, owned instances, equipment, traits, supported calculations | Award and manage equipment and its effects | Current; item tracking and equipment occupancy implemented, effects deferred |
| 6. Encounters and combat | Monsters, encounter setup, initiative, turns, health, statuses | Run combat from a GM dashboard | Planned |
| 7. Achievements, rewards, and progression | Awards, loot, history, controlled level-up | Award rewards and apply eligible progression | Planned |
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
Animal entry, Third Floor creation, race/class catalogs, portraits, automated
Buffs/defenses, rests, Dying-round countdowns, and advancement remain future tasks.

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

For each ZIP/patch, include installation steps, expected test count, completed
verification, and checks that still require the user's environment.

## Open work and decisions

- Remaining sheet sections and later creation modes, using the supplied books.
- Membership removal, ownership transfer, game archiving, code rotation, and
  crawler deletion behavior.
- Future realtime updates; current shared pages use explicit refresh and version
  checks to reject stale writes.
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
