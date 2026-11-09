# Dungeon Crawler Carl Manager — Project Plan

Last updated: November 8, 2026

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
- Players choose initial health stats. The GM controls base health and
  Constitution after creation. Player level-up adjustments come later through
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
| Shared storage and owner-only visibility | Implemented; installation and live database verification pending |
| Host / Join lobby and selected-game routing | Implemented; installation and live verification pending |
| Expanded Vitals, Favor, Adventurer Number | Next character-sheet task; field rules still to define |

The user confirmed **120 tests across 8 files**, lint, TypeScript, production
build, and the live authentication flow. The cumulative shared-storage/lobby
update adds 36 campaign cases and 25 lobby cases, for an expected **181 tests
across 11 files** in the user's current project. This includes the user's two
browser ID tests, which are not present in the assistant workspace.

The available source harness and mocked adapter/action/route assertions pass.
Real local integration checks and the PostgreSQL migration/policy tests remain
required. No migration has been executed against the user's Supabase project
by the assistant.

## Roadmap

| Phase | Scope | Outcome | Status |
| --- | --- | --- | --- |
| 1. Foundation | Standalone project, MVC structure, health rules, local saves, checks | Create and track a crawler locally | Complete |
| 2. Lobby, accounts, and shared games | Authentication, Host/Join, codes, per-game roles, ownership, database storage, conflict handling | Host or join games and resume the correct shared crawler from another device | Current milestone; live shared-game verification pending |
| 3. Complete crawler sheets | Expanded Vitals, Favor, Adventurer Number, attributes, mana/stamina, floor, statuses | Use a fuller game-specific character sheet | Next |
| 4. Skills and spells | Catalogs, assignments, descriptions, usage rules | Manage crawler abilities during play | Planned |
| 5. Inventory, equipment, and effects | Item definitions, owned instances, equipment, traits, supported calculations | Award and manage equipment and its effects | Planned |
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

### Remaining verification

- [ ] Apply the cumulative source update.
- [ ] Apply the base database migration if it is not already installed.
- [ ] Apply the lobby migration; do not run the old bootstrap script.
- [ ] Run the database assertions and confirm they finish without error.
- [ ] Run `npm run check`; expect 181 tests plus lint/typecheck/build.
- [ ] Verify both Host branches and both Join branches with separate accounts.
- [ ] Verify one account hosting a game while playing in another.
- [ ] Verify player privacy, GM controls, saved data, and cross-game isolation.
- [ ] Verify stale-version conflicts, refresh, import, and cross-device access.

See [LOBBY_SETUP.md](LOBBY_SETUP.md) for the exact installation and test sequence.
The first usable shared version is complete after these checks pass.

## Character creation scope

The user selected **lobby first**, reusing the current creation form for this
update. That form includes name, base health, Constitution, and current health.

Before expanding creation, define:

- The complete Vitals field list and which fields are required.
- Favor's representation, starting value, and who may change it.
- How Adventurer Number is assigned and whether it is unique within a campaign
  or across games.
- Starting attribute values and resource formulas.
- Which fields the GM controls after creation and how level-up changes work.

The old application's Favor and Adventurer ID displays were placeholders;
this roadmap does not treat them as implemented game rules.

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

- Expanded character-sheet rules listed above.
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
