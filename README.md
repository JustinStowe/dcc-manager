# Dungeon Crawler Carl Manager

A standalone Next.js application for GMs and players. Authentication opens a
Host / Join lobby. Accounts can host multiple games, join others by Game Code,
and resume the crawler saved for each game.

## Setup

### Full Floor 3 selection and modular System AI (019–020)

Install the updated dependencies with `npm ci`. After migrations 001–018, apply
`supabase/migrations/202611250019_progression_rules.sql`, then
`supabase/migrations/202611250020_system_ai.sql`, once each. Refresh open games.
Do not replace existing migrations or rerun their data updates.

For System AI, set `GROQ_API_KEY` in `.env.local` or the hosting provider's server
environment. `GROQ_MODEL` is optional and defaults to `openai/gpt-oss-20b`.
The configured model must support strict JSON-schema responses. There is no
silent model or paid-tier fallback. The existing local environment file was not
changed. `.env.example` contains names and empty placeholders, not credentials.
Manual selection works independently of Groq availability.
The standard development/start commands and opt-in provider test use Node's
system certificate store so the verified Windows connection works without
disabling TLS certificate checks.

The full Core catalog contains 30 Races and 52 Classes. It retains source pages,
fixed benefits, bounded choices, prerequisites, individual/group Rank-20
permissions, split bonus points, and conditional rule reminders. Earth-only
Classes follow the printed symbols, including Santero and Herbalist even though
their individual entries omit a box bullet. Existing 018 selections and offers
remain readable and cannot be replayed. Outstanding 018 offers retain their
compatibility controls until selected or revoked.

Open **Third Floor Race & Class → Manage Race & Class**:

1. Finish the existing advancement and Race/Class benefit reviews. The guided
   view browses Race then Class, while authorized level points remain available
   through **Go to level-point distribution** before or after selection.
2. The GM verifies missing Popularity, achievements, original species/size/Race,
   deity/Patron and club facts. Missing evidence stays unknown. The group can
   enable optional identity restrictions. Every evidence change is audited.
3. Record one Earth incentive decision before offering a custom Earth Race or
   Earth Class. It covers the whole crawler's selection, not each component.
   It never auto-adds boxes or Potion ranks; issue any reviewed reward manually.
4. The GM curates up to three pairs. Standard validation applies by default.
   Explicit GM waivers require a reason and are saved with the offer and history.
   A separate rank waiver can permit granted Skills up to 20; Rank 16+ benefits
   still wait until Floor 6. Ownership, permissions, versions and once-only
   application cannot be waived.
5. The owner or GM completes benefit choices and sees actual Stat, Skill, DR,
   size and movement changes. Race/Class split bonuses are separate pools.
   Existing grants normally stop at Rank 10 without reducing higher saved ranks.
   Selected Stat caps include equipment/effects; later level spending above an
   Unenhanced cap is rejected rather than silently consuming points.
6. For a partially applied legacy package, the GM chooses **Prepare partial reconciliation** in
   the 018 benefit review, then checks individual **Already applied** benefits in
   the new preview. Only the GM completes that final selection; the older Human
   Favor flag stays unchanged until that atomic save. Only missing supported changes are applied. For a
   fully applied package, use identity-only reconciliation instead. A crawler
   already selected under 018 never becomes selectable again on upgrade.

Custom Race/Class drafts have separate 25/30 BP budgets, at most 5 usable
detriment BP each, discarded leftover points, reviewed thematic groups,
non-stacking defenses and a five-purchased-Passive-rank Class limit. The editor
shows costs and rule violations. Owners can draft; the GM approves definitions
and any explicit waivers before they become offerable. Bespoke effects require
a GM-entered BP price and ruling and remain table-adjudicated. AI-generated
custom builds use reviewed trait IDs only and always pass the same pure engine
before being shown as legal.

**Ask the System AI** ranks locally eligible candidates or generates a legal
custom draft. Loading an AI draft into the editor is an explicit action;
generation never changes crawler mechanics. Server-only `groq-sdk` orchestration
uses purpose-specific prompts/Zod schemas, one shared repair attempt for generated
JSON/schema or mechanical failures (at most two provider calls per generation),
compact context, request/token limits and durable cooldown/deduplication records.
429 responses keep drafts on screen and show a retry countdown. Missing keys,
model errors, timeouts and invalid drafts leave manual selection available.

Source cautions found during full ingestion:

- The Dungeon Dad example (Core p. 162) adds up to 36 BP under the printed cost
  table against a 32 BP budget. The engine flags that excess; reproducing the
  exact example needs an explicit GM budget/pricing ruling. Its five Passive
  ranks still confirm the approved cap interpretation.
- Boring Ol' Paladin prints +2 Charisma and then +1 Charisma; the catalog records
  +3 Charisma without inventing a different Stat. Its Protective Shell grant is
  recorded at Rank 3 as a manual effect because no casting definition is supplied
  in the printed Spell list. The GM must review its definition/cost before casting.
- City Elf starts with a +6 split while its later reassignment sentence says +4.
  Initial selection uses +6; later reassignment remains a GM ruling.

This selection milestone does not automate every combat/passive benefit:
conditional Stats, alternative Health Bar Stats, Skill-specific Move/Evade
effects, animal-to-non-animal Skill restrictions, Favored/class-specific casting
adjustments, summons, flight, shapeshifting, cooldowns and manual rewards still
require the table/GM controls. Their source reminders persist on the selected
definitions. No later respec or new Animal creation mode is introduced.

Verification and acceptance are recorded in `PROJECT_PLAN.md`. Run the normal
`npm run check` chain. With administrative `psql`, run these rollback suites:
`supabase/tests/progression_permissions.sql`, `progression_rules.sql`, and
`system_ai_permissions.sql`; keep `progression_fixture.sql` beside them because
the suites include it. Existing regression suites still apply. The separate
upgrade-before/after files and `scripts/test-database-bootstrap.sql` are for an
isolated local PostgreSQL test database only, never an existing hosted project.
For a running isolated local server with `psql` available, the reproducible
fresh-install/018-upgrade/12-suite runner creates a new database and refuses to
overwrite an existing one:

```powershell
./scripts/check-database.ps1 -TestDatabase dcc_test_floor3 -Port 55439
```

The provider smoke tests cover recommendations and custom Race/Class drafts.
They are opt-in and use synthetic data only:

```text
npm run test:ai
```

After hosted migration, use separate GM/player sessions to verify unknown facts,
standard/overridden offers, custom approval, previewed reconciliation, selection
before/after level-point spending, one reward decision, stale/repeated writes,
429 draft retention, reload/history, and desktop/mobile keyboard behavior.

### Third Floor Race & Class selection (018)

This subsection records the original foundation; 019–020 above expand it.

After migrations 001–017, apply only
`supabase/migrations/202611250018_third_floor_selection.sql` once, then refresh
open sheets. Run the complete `supabase/tests/third_floor_permissions.sql` as
administrator; expect its final PASS with no preceding error and fixture
rollback. No dependencies or environment settings change.

Open **Third Floor Race & Class → Manage Race & Class** on the crawler's sheet.

1. Finish level-advancement reconciliation first. Existing crawlers then need a
   one-time GM benefit review. Choose **No benefits applied**, or record the
   existing Race/Class after confirming its bonuses already appear in the sheet.
   The second option changes identity only; it adds no stats, Skills, defenses,
   loot or past Favor. If benefits were partially applied, use the existing GM
   correction tools to finish/correct them before confirming this review. Other
   existing Races/Classes can be recorded with manual names, size and movement.
2. On Floor 3 or deeper, the GM offers up to three eligible Race/Class pairs.
   Clear and save the list to revoke. Changing Floor also closes unselected
   offers. Authorized level-up points can be allocated before or after selection;
   spend points first if needed to avoid stat penalties below the supported minimum.
3. The owner or GM chooses a pair, completes any Class choices, reviews the actual
   stat/rank changes and confirms. All supported grants and saved identity commit
   together once. Existing Skill definitions/IDs are preserved; new rank bonuses
   stop at 10 and do not reduce previously earned higher ranks. Health does not
   refill, Mana only clamps if its maximum falls, and advancement spending stays
   unchanged. Notes and the advancement history record the review and selection.
4. Human level-gain Favor now follows the saved Human selection. The old toggle
   is retired. Previously confirmed Human Favor remains active until benefit
   reconciliation, which never awards past Favor or repeats Human stat bonuses.

The reviewed starter catalog includes Human, Amazonian, Crocodilian, Igneous and
Pterolykos; Boring Ol’ Fighter, Pit Fighter, Blizzardmancer and Monster Truck Driver.
Amazonian and Driver prerequisites use existing learned ranks before new grants.
Pterolykos cannot take the Earth-only Pit Fighter or Monster Truck Driver Classes.
Optional identity restrictions, achievements and other table requirements are
confirmed by the GM. The selected identity, size, Move and Step appear on the sheet.

Supported grants are permanent stat changes, listed learned Skills/Spells,
Fighter's reviewed Weapon/support choices, non-gear DR and listed typed defenses.
The UI records source references and reminders for passive Skill effects (such
as Dodge's Evade Buff), special marking eligibility, damage, cooldowns, flight,
special Actions, coupons, loot and other conditional benefits; those remain manual.
This milestone does not implement every published Race/Class, later respecs,
Animal entry or new Third Floor starting-character creation.

Rules reviewed: Core Rulebook printed pp. 128–129, 131, 135, 140–142, 150, 152–153,
and the referenced granted-ability entries. Earth icons were visually checked.

Validation: `npm run check` passed (897 tests across 56 files, lint, typecheck,
production build). Nine SQL suites and the actual 017→018 upgrade passed in
isolated PostgreSQL, including exact preservation of existing benefits/resources
and legacy Human confirmation. Auth fixtures and realtime sending were simulated;
hosted migration, WebSocket delivery and authenticated browser acceptance remain.

For browser acceptance use separate GM/player sessions: review an existing build
without repeating bonuses; reject early/unoffered/ineligible choices; offer and
select a Fighter with distinct choices; verify Rank 10 bonus capping and saved
identity; test Igneous/Blizzardmancer defenses and negative stats; confirm future
Human Favor; verify repeat/stale saves are rejected and drafts survive errors;
revoke offers and change Floor; reload to check persistence, history, current
resources and isolation from other games/writeups. Check keyboard, Escape/Close
and desktop/mobile layouts, plus spells, templates, equipment and encounter use.

### GM-controlled level advancement (015)

After migrations 001–014, apply only
`supabase/migrations/202611240015_level_advancement.sql` once. Then run
`supabase/tests/level_advancement_permissions.sql` as administrator; expect its
final PASS with no preceding error and a fixture rollback. Refresh open sheets.
No new dependencies or environment settings are required.

Open **Level advancement → Manage advancement** on a crawler's sheet:

- **Existing crawlers:** the GM reviews the current level and records how many
  level-up stat points are already included in saved stats. This one-time review
  preserves stats/resources and banks only the remaining entitlement. Exclude
  race, class, potion, gear and ordinary GM corrections from previously spent
  level-up points. Legacy levels above 250 remain readable and require an
  explicit reviewed value; migration never clamps them. If the old records are
  uncertain, settle the ledger with the player before confirming.
- **New crawlers:** start reconciled at Level 1 with zero spent points. Saved
  account writeups and crawlers in other games remain independent.
- **Awards:** the GM records the final level count, source and reason. Levels
  apply immediately, capped at 250, and earn three pending points per level.
  The starting level grants none. Resolve reward dice, quest/Boss adjustments
  and productive grinding hours at the table; this feature has no XP counter
  or play-time scheduler. Awards target one crawler at a time.
- **Spending:** points remain banked on Floors 1–2. On Floor 3 or deeper the GM
  confirms a saferoom and authorizes a fixed number of pending points. The owner
  or GM can distribute some or all of those points among the five Unenhanced
  stats. Later awards require additional authorization. Enter 0 to revoke when
  leaving a saferoom; changing Floor closes authorization automatically.
- **Benefits:** Enhanced stats recalculate through existing effects and gear.
  Health and current Mana do not refill; ranks/marks stay separate. After 018,
  selected Human identity controls +1 Favor per future level gained on Floor 3+;
  Tutorial Human identity alone does not enable it. The selection workflow above
  replaces 015's manual Human confirmation. Allocate points before prerequisite
  checks when needed.
- **Corrections/history:** the old direct Level editor is retired. General GM
  base-stat corrections still work and do not spend/refund advancement points.
  Reconciliation is one-time; review it carefully. Awards, reconciliation,
  allocations, authorization changes and Human-benefit changes are recorded in
  an owner/GM-visible history. Failed/stale writes do not change the ledger.

Rules: Core Rulebook printed pp. 128, 135, 169–171; Crawlers & Customization
pp. 42–44. Floor 3 means that floor or deeper (higher Floor numbers).

Run `npm run check`. In separate GM/player browser sessions, verify legacy
reconciliation without changing stats/resources; Tutorial awards with locked
spending; Floor 3 saferoom authorization; partial allocation and persistence;
new awards staying unauthorized; revocation/Floor change; selected Human Favor;
stale dialog rejection with drafts retained; owner-only history; and unchanged
writeups/other games. Check desktop/mobile layout, keyboard access, Cancel/Escape,
and existing equipment, spells, templates and encounter turns.

Local verification for 015 passed: `npm run check` (855 tests across 52 files,
lint, typecheck and production build); the actual 014→015 upgrade with existing
crawlers, including an over-cap legacy level; and eight SQL suites covering
advancement, templates, effects/live, encounters, sheet controls, equipment,
learned abilities and typed defenses. PostgreSQL used minimal compatible auth
fixtures and a stubbed realtime sender. Hosted migration, real WebSocket
delivery and authenticated browser acceptance remain pending. Earlier SQL
writeup-isolation assertions now run as the owning player rather than the GM.

### Official encounter flow (016)

Apply `supabase/migrations/202611240016_encounter_rules.sql` once after 014
and 015. Run the updated `supabase/tests/encounter_permissions.sql` as
administrator in the SQL Editor; its fixtures roll back and it should print
a final PASS. Then run `npm run check` and `npm run dev`. Existing encounter
rosters and round numbers are preserved, but their old numeric order is
cleared and they resume using the official Mob combat phases.

For regular Mob combat, the compact list shows crawlers and monsters with an
active-group marker. The five phases are Mob declaration, crawler reaction,
Mob resolution, crawler action and Clean up. The GM advances phases with one
button. Crawlers act in any order within their phase; numeric initiative is
unused. Finishing Clean up starts the next round and advances participating
crawlers' timed effects atomically. Adjudicate surprise before normal phases.
Rules reference: Core Rulebook, printed pp. 80–86; Rules for Survival, pp. 32–34.

Optional PvP uses a list of crawlers only. Enter each crawler's d20 + Dex
total at the start of every round; a sneak attacker has Advantage on the first
round's roll. Higher totals act first and ties act simultaneously. The next
turn button skips the rest of a tied group, then clears totals when the round
ends so the GM can enter fresh rolls. The UI tracks order, not action costs.
Rules reference: Core Rulebook, printed p. 87.

Check both flows in GM and player sessions, stale saves in a second GM tab,
effect expiry at round end, mobile layout, and the current marker. The GM can
still advance effects manually, so avoid doing that for a round already
advanced in the encounter tracker. Automated attacks, targeting and damage
remain later combat work.

### Encounter popup and official creature catalog (017)

Apply `supabase/migrations/202611250017_creature_catalog.sql` once after 016,
then run `supabase/tests/encounter_permissions.sql` as administrator. Its
fixtures roll back and it prints PASS. Run `npm run check` afterward. The GM
opens the encounter tracker as a popup from the game dashboard. In Mob combat,
search the supplied official creature stat blocks when adding a monster. The
monster's Manage area shows its defenses, stats, attack and note excerpts, source PDF
page, and remaining Health Bar slots. The GM sets remaining slots from zero to
the creature's maximum; this does not calculate damage or DR automatically.
Monsters saved before 017 can gain a catalog write-up through Manage. Attaching
one replaces their encounter name with the official creature name and starts
them at full Health Bar slots.

The GM can also choose **Open separate window** on the dashboard or inside the
popup. The tracker then runs at `/games/{campaignId}/encounter` in a movable,
resizable browser window, leaving the dashboard usable on the main monitor.
Opening it again focuses the same window. The separate window uses the same
GM-only permissions and live updates as the dashboard. If the browser blocks
the popup, use the offered new-tab link and move that tab to another window.


### Tracked effects and automatic updates (011–012)

Follow [EFFECTS_LIVE_SETUP.md](Docs/EFFECTS_LIVE_SETUP.md). After 001–010, apply
`202611140011_tracked_effects.sql`, then `202611140012_live_updates.sql`; run the
new SQL assertions, npm check, and the two-account browser checklist. GM effects
supply active stats/defenses with manual round expiration. Private per-user
notifications trigger authorized server refreshes, with edit protection and
automatic fallback/resync. No package or environment changes are required.
Full local/database/browser acceptance for this update remains pending.


### Typed defenses (010)

Follow [TYPED_DEFENSES_SETUP.md](Docs/TYPED_DEFENSES_SETUP.md). After verified
migrations 001–009, apply only `202611120010_typed_defenses.sql`, run its SQL
assertions and the preceding regression scripts, then `npm run check` and the
manual checklist. GMs manage per-type Resistance, Vulnerability and Immunity;
players see read-only summaries. The Health modal previews and applies stored
defenses after DR. The stats Edit/Confirm component is not replaced.
Full local/database/browser acceptance for milestone 010 remains pending.


### Character sheet controls (009)

Follow [SHEET_CONTROLS_SETUP.md](Docs/SHEET_CONTROLS_SETUP.md). After migrations
001–008, apply only `202611120009_sheet_controls.sql`, run the new sheet SQL
assertions and updated equipment regressions, then `npm run check` and the
manual checklist. Health/Favor use modals; inline edits follow Player/GM roles;
Enhanced stats derive from base stats, active modifier sources, and gear.
Existing non-gear adjustments are preserved as imported modifier sources.
Database execution and full application/browser acceptance remain pending.


### Learned Skills, Spells, and advancement

Follow [LEARNED_ABILITIES_SETUP.md](Docs/LEARNED_ABILITIES_SETUP.md). After your
verified 001–007 setup, apply only `202611110008_learned_skills.sql`, run the
included database assertions, then `npm run check` and the manual checklist.
Players mark eligible skills on their own crawlers. GMs award abilities, review
ranks/costs, and resolve advancement rolls. Current learned records drive Check
references and prepared Spells without changing creation history or writeups.
No dependencies are added. Database execution and full application/browser
acceptance for this new milestone remain pending.


### Equipment bonuses, damage resistance, and quick slots

Follow [EQUIPMENT_HOTLIST_SETUP.md](Docs/EQUIPMENT_HOTLIST_SETUP.md). Apply only
`202611100007_equipment_hotlist.sql` after your verified migrations 001–006, run
its database assertions, then `npm run check`. No dependency is added.

The sheet now has ten quick slots for item-stack/Spell references and supported
prepared actions. GM-reviewed equipped gear contributes flat attribute, DR, and
Evade bonuses, with a separate baseline to prevent repeated accumulation. Mana
limits recalculate without refilling resources. Raw-damage and final-net paths
are explicit. Existing items gain no inferred bonuses; review them as GM.
The user reports milestone 007 application checks and manual acceptance passed.
Its SQL assertions are retained for regression testing.

### Two-column inventory grid

Follow [INVENTORY_GRID_SETUP.md](Docs/INVENTORY_GRID_SETUP.md). Install Tailwind
and PostCSS with `npm install -D tailwindcss @tailwindcss/postcss postcss`, then
run `npm run check`. This UI update requires no database migration. It replaces
the long inventory list with equipment slots, a responsive grid, and one item
inspector using the existing server actions. The full reusable client component
is `src/components/inventory-system.tsx`. Potion automation and permissions are
unchanged; browser and full application verification remain pending.

### Potion automation and character sheet UI

Follow [POTIONS_UI_SETUP.md](Docs/POTIONS_UI_SETUP.md). After the verified
inventory migration 005, apply only `202611090006_potion_automation.sql`, run its
potion assertions and the updated inventory assertions, then `npm run check`.
Identified Standard Mana Potions now spend one item and restore all Mana in a
single save. Existing stacks stay manual until the GM identifies their effect.
Custom consumables remain manual. New spellcasters get five identified potions.

The campaign dashboard now selects one crawler sheet at a time. Both roles use
a sheet inspired by the official form, with identity fields, boxed attributes,
ten health slots, and resource/skill sections. Health and GM correction controls
are expandable. Offline GM and player layout previews are included in `Docs`.
The deleted-game redirect, inventory ownership, and saved writeups are preserved.
This update adds 32 cases; full local and live database checks are pending.

### Inventory and equipment

Follow [INVENTORY_SETUP.md](Docs/INVENTORY_SETUP.md) for the new per-game item
quantities, equipment slots, and consumable quantity tracking. Apply only
`202611090005_inventory.sql` after the already installed migrations 001–004, then
run its database assertions and `npm run check`. This adds 46 test cases; full
local application and live database verification are pending. Existing game
inventory starts empty while gear notes are preserved. New spellcasters receive
five starting Mana Potions once per game crawler. Supported potion effects are
now described in the potion update above; equipment bonuses remain manual.

### Crawler profiles and game deletion

After migrations 1 through 3 are applied, back up existing game data and run the
complete [migration 4](supabase/migrations/202611090004_crawler_profiles_and_game_deletion.sql)
once in the Supabase SQL Editor for the project configured in `.env.local`.
It includes its own transaction and API schema-cache notification. Do not rerun
already applied migrations. This update has not been applied to your hosted database.

The lobby now includes **Create crawler**. Each account has three saved profile
slots, separate from game characters. Profiles can be edited or removed; their
saved starting stats remain fixed. Server rolls are saved per slot and cannot
be rerolled by reopening the editor. When joining a game, use a saved profile or
create a fresh crawler. A fresh crawler can optionally be saved to an empty
account slot in the same transaction. An occupied slot is never silently replaced.
Using a profile creates a separate game crawler with full starting resources;
game progress does not change the reusable profile. Existing server rolls in a
game remain authoritative: a different saved build cannot replace them.

Only a game's GM can delete it. Click **Delete game**, type the exact game name,
then click **Permanently delete game**. Cancel makes no changes. Deletion removes
the game, membership, game crawlers, saved game rolls, and legacy archives in one
transaction. Account profiles are preserved. Successful deletion returns to the lobby.

Run the [profile and deletion database assertions](supabase/tests/crawler_profiles_and_deletion_permissions.sql)
in a development or staging SQL Editor after applying the migration. The tests
create fixtures inside a transaction and roll them back. A successful result
starts with `PASS:`. Also verify the UI with two signed-in accounts: a player
must not see game deletion controls or another account's saved profiles.

For the current Level 1 Human entry update, follow [TUTORIAL_SETUP.md](Docs/TUTORIAL_SETUP.md).
Its migration follows the two lobby migrations.

For the earlier lobby foundation, [LOBBY_SETUP.md](Docs/LOBBY_SETUP.md) includes installation, database
migrations for fresh or previously configured projects, database policy tests,
and manual multi-account checks. The lobby replaces the earlier manual GM
bootstrap; do not run `bootstrap_campaign.sql`.

Supabase authentication must already be configured. See [AUTH_SETUP.md](Docs/AUTH_SETUP.md)
for the email/password and confirmation setup from the authentication milestone.
Keep the project URL and publishable key in `.env.local`. No service-role key is
used by the application.

## Commands

Next.js uses the `security` agent-upgrade policy for security update reminders
during development and builds. Updates are not installed automatically.

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the dependencies recorded in your lockfile |
| `npm run dev` | Start development on port 3000 |
| `npm test` | Run tests once |
| `npm run test:watch` | Rerun tests while editing |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate route types and check TypeScript |
| `npm run build` | Build for production |
| `npm start` | Serve the production build |
| `npm run check` | Run tests, lint, typecheck, and build |

Before the deleted-game routing and inventory updates, the suite contained **268 tests across 14 files**. Deleted-game routing adds nine cases; inventory adds 46. Run `npm run check` to verify the current total and all application checks. No Nx command or separate
library build is needed.

## Current flows

- Create Crawler expands the three account save slots in the lobby. Empty slots
  offer creation; occupied slots offer writeup review/editing and confirmed
  deletion. Deleting a saved crawler does not change existing game crawlers.
- Host → New Game creates a campaign, assigns its creator as GM, and generates
  a unique Game Code.
- Host → Existing Game lists that account's hosted games.
- Join → New Game validates a code and adds the account to that campaign.
- A newly joined player creates their crawler; an existing crawler opens without
  being reset. Incomplete creation resumes when the game is reopened.
- Join → Existing Game lists joined games and restores their saved sheets.
- One account can be GM in one game and a player in another. Roles are per game.
- Players see only their own crawler; the GM sees all crawlers in that game.
- Players choose initial health stats. Only the GM can edit existing base health
  and Constitution. Owners and the GM can apply damage and healing.
- Version checks reject stale changes. Refresh campaign loads other sessions'
  updates; realtime subscriptions are deferred.
- Importing historical browser saves is no longer supported. Existing game
  crawlers and original browser saves are unchanged.

The current creation form supports Level 1 Human crawlers with identity,
standard-array or saved server-rolled stats, eight background Skills, two combat
Skills, Heal, story notes, and starting gear notes. Crawler Numbers are generated
per campaign. The official tracker uses ten slots, Enhanced-stat modifiers,
Mana, AI Favor, and atomic Heal. The GM edits existing stats and awards Favor.

Old prototype crawlers require explicit GM review and conversion. Their original
rows are archived and zero health remains zero. See TUTORIAL_RULES.md for the
rulebook mapping. Animal entry, Third Floor creation, full inventory/combat,
broader progression, and the remaining sheet sections are still roadmap work.

## Architecture

| Folder | Responsibility |
| --- | --- |
| `src/app` | Routes and server action boundaries |
| `src/domain` | Pure crawler rules, campaign permissions, and visibility |
| `src/services` | Application operations and persistence contracts |
| `src/adapters` | Supabase and browser storage implementations |
| `src/controllers` | React state and named handlers |
| `src/models` | Presentation contracts |
| `src/views` | Screen markup and display conditions |
| `src/components` | Reusable form and controller/view composition |
| `src/utils/supabase` | Browser, server, and session-refresh helpers |
| `src/styles` | CSS modules |
| `supabase/migrations` | Ordered database schema changes |
| `supabase/tests` | Database permission assertions |

`@/` points to `src`. Views use CSS files and named actions. Server operations
resolve identity from the verified session and load the selected campaign;
client-provided role claims are not authority. Database policies filter reads,
and checked RPC functions enforce writes and optimistic concurrency.

## Verification status

The profile/deletion update passes unit tests, TypeScript, ESLint, and a Next.js
production build. All four migrations, the new profile/deletion assertions, and
the existing Tutorial assertions passed against an isolated PostgreSQL 18 instance
with minimal Supabase-compatible auth fixtures. This is not a full hosted Supabase
test. Authenticated browser acceptance checks remain pending because the available
browser session is signed out.

The user confirmed the authentication/lobby checks and reported that database
setup and hosting worked after applying the migrations. The new Tutorial update
passes the available source harness and mocked framework checks. Its full local
checks, migration, database assertions, and browser acceptance tests remain
pending as described in TUTORIAL_SETUP.md. No database migration has been run by
the assistant against the user's Supabase project.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for scope, milestone status, and next steps.

## Appearance

Use **Appearance → Light mode / Dark mode** at the top of any page or inside
an open sheet/encounter dialog. Light mode is the default; Dark mode applies the dark cyan/amber style across the entire app, including Race
& Class. Switching preserves open forms. The choice is saved for a year in this
browser/site and synchronizes other open windows on the same origin. It is a
browser preference, not an account setting shared across devices. Printing uses
the light palette in either theme. No database migration is required.
