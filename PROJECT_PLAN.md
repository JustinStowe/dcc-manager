# Dungeon Crawler Carl Manager — Project Plan

Last updated: November 8, 2026

## Project goal

Build a shared application where the GM manages the campaign and players manage
their crawlers during play. Deliver a usable shared health tracker first, then
expand into complete crawler sheets, skills, spells, inventory, combat,
achievements, rewards, and progression.

The broader features come from the original project design. The sequence below
is the proposed implementation roadmap; detailed gameplay rules must be settled
before implementing each feature's calculations.

## Scope and established decisions

- Build a standalone Dungeon Crawler Carl Manager for the GM and players.
- Preserve MVC-style separation between presentation, controllers, and domain rules.
- Keep the reusable Nx monorepo work paused.
- Support one shared campaign first; multiple independent gaming groups come later.
- Preserve the existing crawler health behavior and browser saves.
- Allow players to choose initial stats when creating their own crawler.
- Restrict changes to base health and Constitution after creation to the GM.
- Add player stat adjustments during level-up through a future controlled workflow.
- Select authentication, database, and hosting providers during integration; none
  has been selected or connected yet.

## Current status

| Area | Status |
| --- | --- |
| Standalone Next.js application | Complete |
| Crawler creation and health tracking | Working |
| Browser save/load | Working; manually confirmed to survive refresh and reload |
| Baseline automated checks | All 58 tests, lint, typecheck, and production build passed in the user's environment |
| Campaign ownership and permission rules | Patch delivered; installation and local verification pending |
| Accounts, shared database, and GM/player screens | Not implemented |

The campaign patch adds 40 permission test cases, bringing the expected total
to **98 tests across 6 test files**. All 98 cases passed in the available local
harness. That harness is not Vitest. Dependency downloads were blocked in the
assistant environment, so the updated project's real Vitest, ESLint, TypeScript,
and Next.js checks still need to run in the installed project.

The patch establishes domain rules. It does not add visible account controls,
authentication, shared storage, or enforcement in the existing browser preview.

## Roadmap

| Phase | Scope | Outcome | Status |
| --- | --- | --- | --- |
| 1. Application foundation | Standalone project, MVC organization, crawler health rules, browser saves, automated checks | Create a crawler, track health, and save it locally | Complete |
| 2. Accounts and shared campaign | Sign-in, membership, ownership, shared storage, role-aware screens, conflicting-save handling | GM and players use the same campaign from different devices | Current milestone |
| 3. Complete crawler sheets | Remaining attributes, mana, stamina, floor, statuses, validated editing | Use a fuller crawler sheet during a session | Planned |
| 4. Skills and spells | Definition catalogs, crawler assignments, descriptions, applicable usage rules | View and manage a crawler's skills and spells during play | Planned |
| 5. Inventory, equipment, and effects | Item definitions, individually owned items, equipment, traits, effect calculations | Award items, manage equipment, and apply supported effects consistently | Planned |
| 6. Encounters and combat | Monster definitions, encounter setup, initiative, turn order, individual monster health, combat statuses | Run encounters from a GM dashboard with relevant player updates | Planned |
| 7. Achievements, rewards, and progression | Achievement awards, loot rewards, award history, controlled level-up workflow | Award achievements and rewards, and allow eligible level-up adjustments | Planned |
| 8. Release readiness and expansion | Usability, mobile layouts, recovery/export tools, deployment, broader testing; multiple groups afterward | Reliably use the app for regular sessions, then expand to separate groups | Planned |

**The first usable shared version is the end of phase 2.** Full character sheets
and combat management are not prerequisites for using the shared health tracker.

## Phase 2 — Accounts and shared campaign

### 2.1 Verify the permission foundation

- [x] Add a campaign model with a GM and player membership.
- [x] Associate each campaign crawler with its owner.
- [x] Allow players to create their own crawler and choose initial stats.
- [x] Allow the GM to create a crawler for a campaign member.
- [x] Allow the owner and GM to apply damage and healing.
- [x] Restrict existing base health and Constitution edits to the GM.
- [x] Preserve current health during GM stat edits, clamping it if the maximum drops.
- [x] Keep zero health at zero when stats change.
- [x] Add tests for allowed and rejected operations and roster isolation.
- [ ] Apply the delivered patch to the local project.
- [ ] Run `npm run check` and confirm all 98 tests and other checks pass.

### 2.2 Select authentication and shared storage

- [ ] Select the authentication and database providers.
- [ ] Define environment configuration and local setup instructions.
- [ ] Define the persistent campaign, membership, ownership, and crawler records.
- [ ] Define how an existing browser save can be explicitly imported into a campaign.

### 2.3 Implement accounts and membership

- [ ] Add sign-in and sign-out.
- [ ] Resolve the current user from a verified session.
- [ ] Establish the first campaign and its GM.
- [ ] Add the player membership workflow.
- [ ] Define invitation, removal, and ownership-transfer behavior before exposing those controls.
- [ ] Define which roster information players may view.

### 2.4 Implement shared persistence and permission enforcement

- [ ] Load authoritative campaign membership and crawler data on the server.
- [ ] Apply the campaign domain rules before saving changes.
- [ ] Store each crawler separately with its ownership and campaign association.
- [ ] Handle simultaneous updates so one user's stale save cannot silently overwrite another's changes.
- [ ] Define how other sessions receive or refresh shared changes.
- [ ] Implement the explicit browser-save import workflow.
- [ ] Test account permissions and shared persistence at the server boundary.

Client-provided user IDs, role selections, or campaign snapshots are not authority.
The domain functions accept trusted arguments; they do not authenticate users.
The existing local browser repository remains a preview until this integration
is complete.

### 2.5 Build GM and player interfaces

- [ ] Add a GM campaign roster and campaign-management controls.
- [ ] Add player access to owned crawlers.
- [ ] Connect damage and healing controls to shared persistence.
- [ ] Add GM controls for existing base health and Constitution.
- [ ] Display loading, save failures, permission failures, and update conflicts clearly.
- [ ] Verify the complete workflow with separate GM and player sessions.

### Phase 2 completion criteria

- The GM and a player can sign in from separate browser sessions or devices.
- Both use the same campaign and persisted crawler data.
- A player can create and track their own crawler.
- The GM can manage membership and edit protected crawler stats.
- Players cannot edit another player's crawler or change protected stats after creation.
- Shared updates become visible in other sessions through the chosen synchronization workflow.
- Simultaneous updates receive defined conflict handling.
- Data survives refresh and sign-out/sign-in.
- Automated checks and the manual multi-session checks pass.

## Editing and ownership rules

| Action | Player | GM |
| --- | --- | --- |
| Choose initial stats during crawler creation | Own crawler | Any campaign crawler |
| Change base health or Constitution after creation | Locked | Allowed |
| Apply damage or healing | Own crawler | Any campaign crawler |
| Add campaign members | Unavailable | Allowed |
| Adjust stats during level-up | Future controlled workflow | Oversight to be defined with that workflow |

Player level-up adjustments must be a separate operation with eligibility rules,
rather than unrestricted access to existing stat-editing commands.

## Architecture

| Layer | Responsibility |
| --- | --- |
| Views | Markup, bindings, and display conditions |
| Controllers | Coordinate user actions and presentation state |
| Domain | Game rules, validation, ownership, and campaign permissions |
| Services | Application operations and persistence contracts |
| Adapters | Browser storage and future external-service implementations |
| Next.js routes and server boundary | Compose the application, resolve sessions, and enforce access for shared operations |

Keep game calculations independent of React and external services. Keep styles
in CSS files and event behavior in named controller handlers. Shared operations
must use server-verified identity and authoritative state.

## Delivery and validation workflow

For each feature:

1. Establish the relevant gameplay rules and permission decisions.
2. Implement domain behavior and meaningful tests.
3. Connect application services, storage, and controllers as needed.
4. Build the interface for that behavior.
5. Run `npm run check`.
6. Perform the relevant manual browser or multi-session checks.
7. Update this plan with the actual implementation and verification status.

When delivering a ZIP or patch, include installation instructions, the expected
test count, verification performed, and any checks still required locally.

## Decisions still open

- Authentication, database, and hosting providers.
- Player visibility of other crawlers and GM-only information.
- Account invitations, membership removal, and ownership-transfer behavior.
- Synchronization and concurrent-update behavior.
- Exact rules for expanded stats, skills, spells, equipment effects, and combat.
- Level-up eligibility, permitted changes, and GM oversight.

Resolve these decisions when their implementation phase begins. Multiple gaming
groups and reusable monorepo extraction remain deferred.
