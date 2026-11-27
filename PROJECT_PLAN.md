# Dungeon Crawler Carl Manager — Project Plan

Last updated: November 27, 2026

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
| GM-controlled level advancement | Complete; user confirmed migration 015, checks, and working in-app advancement on November 25, 2026 |
| Third Floor Race/Class selection | GM-pushed Floor 3 terminal in 021, reviewed/curated catalog, six personalized AI matches and preserved reconciliation; apply 021 and complete hosted acceptance |
| Modular System AI (Groq) | Implemented in 020 with strict schemas, legal drafts, suggestions and durable request limits; synthetic live provider test passed; hosted/browser acceptance pending |
| App-wide Light mode / Dark mode themes | Implemented November 26, 2026; persistent browser preference, synchronized windows, themed dialogs and full local checks |
| GM-pushed Class specialization menus | Implemented in 021 for Floors 6, 9 and 12 with private per-crawler choices and immutable history; GM-authored benefits are applied manually; hosted acceptance pending |
| HUD Phase 1: notifications, banners and floor timers | Complete; user confirmed migration 022 applied and tests check out on November 27, 2026 |
| Safe Room loot and Achievements Codex | Phase 2 implemented in 023; private queue, atomic existing-inventory claims, Codex and prior-reward reconciliation; local checks passed; apply 023 and complete hosted acceptance |
| Crawler Menus and Haptic Link | Approved Phase 3; implementation pending |
| Exploration Radar | Approved Phase 4; implementation pending |

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
Effect templates and unified abilities are complete by user report. GM-controlled
level advancement is complete: on November 25, 2026, the user confirmed migration
015 and its checks passed and advancement works in the app. Encounter popup and
creature catalog work remains tracked separately in milestone 017. Third Floor
Race/Class selection began in milestone 018 and is expanded in 019–020 below;
hosted migration and GM/player browser acceptance remain pending.

The verified inventory foundation adds 46 domain/service cases,
per-game item quantities/notes, equipped locations and slot limits, explicit
consumable quantity use, and one-time potions for newly created spellcasters.
The new potion/UI update adds 32 further cases. Its source harness passes 334
cases with mocked boundary/view checks. Real application checks, migration 006,
and live SQL/browser acceptance remain pending. See `Docs/POTIONS_UI_SETUP.md`.

## Safe Room Phase 2 (023, November 27, 2026)

Phase 1 is complete by user confirmation: migration 022 is applied and its tests
check out. The next approved phase adds the Safe Room terminal through the HUD,
keeping the existing character sheet and its single inventory as the main workspace.

- Added six named/color-coded box tiers, tier filters, Hide Claimed, a short
  reduced-motion-aware unsealing animation, individual Claim and atomic Claim All.
  The HUD badge counts the owner's unopened boxes (all visible game boxes for GM).
- Added a compact GM award form for achievements, boxes or a linked pair, with
  reviewed item quantities/equipment bonuses/potion effects, flavor/commentary,
  an optional existing source achievement and GM-released audience vote locks.
  Tier/category defaults survive repeat awards; completed submissions clear content.
- GM confirms saferoom access per crawler/current floor, independently of level-up
  point authorization. Opening and claiming both require access; floor changes
  revoke it, including leaving and returning to the same floor. Sealed contents
  are hidden by database policies and the checked snapshot, not just by the UI.
- Claims append stored entries to the existing inventory using permanent receipt
  IDs. Existing stacks are not merged or replayed. Retry, concurrent/stale request,
  consumed/deleted-item and capacity cases cannot duplicate loot. Full Claim All
  failures change nothing. Claiming never equips gear, refills resources or awards
  stats, ranks, levels or Favor; unsupported mechanics remain explicit GM rulings.
- Added searchable/paginated achievement history with Floor 1/2/3/4+ and Unread/
  With Box filters, per-account read state, watermark-safe Mark All Read and linked
  box/card jumps that also work outside the current queue filters. Real awards
  integrate with Phase 1 notifications; historical imports avoid a new gold banner.
- Added Record Past Reward without inventory changes. The existing 019 Earth
  incentive decision stays intact; a separate once-only fulfillment review blocks
  duplicate boxes and records previously fulfilled manual rewards. Skill Potion
  ranks remain GM-applied through the existing controls after checking old benefits.
- Added migration 023 and isolated privacy, query/capacity and upgrade fixtures.
  No old crawler/profile data or Phase 1 timers/logs are rewritten, no rewards are
  auto-imported and no AI calls or dependencies were added. Story/party/chat and
  Exploration Radar remain the approved later phases.

Verification: `npm run check` passes 1,271 cases (four opt-in provider cases skipped),
lint, typecheck and production build. Fifteen isolated SQL suites passed, including
all thirteen Phase 1 regressions and the two new Safe Room suites. An actual
022→023 upgrade preserved complete crawler/profile rows, versions, existing timers,
notifications and recipient read states. Browser preview used real components and
synthetic storage to verify access, reveal/claim, existing inventory integration,
player vote locks, GM linked awards, Codex search/read/deep links, both themes and
390px phone layout. Hosted migration and authenticated GM/player acceptance remain
pending. Apply 023 after 022; see `Docs/SAFE_ROOM_SETUP.md`.

## HUD Phase 1 (022, November 27, 2026)

The approved HUD/Safe Room roadmap keeps the character sheet as the primary
workspace. Phase 1 adds a sticky, themed game HUD, private notifications and GM
floor timers. Loot/achievements follow in Phase 2; the roster/story drawer and
Haptic Link in Phase 3; abstract exploration maps in Phase 4. Future HUD buttons
are visibly unavailable until their corresponding phase is implemented.

- Wrapped the existing game view without replacing its sheet, encounter,
  inventory, advancement or pushed Race/Class/specialization controls.
- Added GM broadcasts to All Crawlers or one crawler, with System AI,
  Achievement, Floor Alert and Loot categories. All Crawlers means current crawler
  owners plus the GM; targeted alerts are visible only to that owner and the GM.
- Persisted a private, cursor-paginated alert history with account-specific read
  state, unread badges, individual acknowledgement and watermark-safe Mark All Read.
  Repeating a broadcast request does not duplicate it; GM broadcasts are limited
  to 20 per minute per game. Text is rendered as text, not HTML.
- Added short, dismissible live banners and gold Achievement announcements.
  Initial/reconnected history is restored silently. Alerts are notifications only;
  achievement records and reward grants are intentionally Phase 2 work.
- Added automatic private owner/GM alerts for changed positive saferoom stat-point
  authorizations, successfully resolved marked-Skill advancement attempts (including
  held ranks), and an official crawler crossing from at least 30% to below 30% Health.
  Repeated low-health saves or simply unmarking a Skill do not create alerts.
- Added per-floor timers (1–18), initially unset, with GM edit/start/pause/resume/
  clear and stale-version protection. Shared server deadlines survive navigation,
  refresh and disconnected clients. Expiry clamps at zero and leaves collapse to
  the GM; no crawler state is changed by a timer.
- Reused private 012 invalidation signals. The HUD has an independent read queue
  and 15-second recovery polling, so badges/banners can update without refreshing
  or replacing an unfinished sheet form. Modern browsers show nonmodal banners
  above sheet dialogs; fixed banners remain the fallback. Existing sheet refresh
  guards stay in place. No AI provider calls or dependencies were added.

Verification: 1,243 source tests passed (four optional provider tests skipped),
plus lint, typecheck and production build. Thirteen isolated SQL suites passed,
including HUD permissions, automatic events, pagination/rate limits, existing
inventory/effects/advancement/selection/encounter behavior and private helper ACLs.
An isolated 021→022 upgrade preserved complete crawler/profile rows and versions,
and created no unsolicited alerts or timers. Browser preview with real components
and synthetic storage verified GM broadcasts, unread/read controls, timer actions,
player read-only controls, draft preservation and both themes at desktop/mobile
sizes. The user subsequently confirmed migration 022 applied and tests check out
on November 27, 2026, and accepted moving to Phase 2.

Apply migration 022 after 021. See `Docs/HUD_NOTIFICATIONS_SETUP.md` for setup and
the GM/player acceptance checklist. Existing crawler data needs no reconciliation.

## GM-pushed milestone menus (021, November 26, 2026)

- Removed the permanent Race/Class section from the character sheet. GM preparation
  and push/withdraw controls live in the collapsed game-level selection desk.
- GM pushes private, persistent menus to ready crawlers on Floor 3, 6, 9 or 12.
  No automatic floor movement or unsolicited migration delivery occurs. Current
  edits are protected by existing private live-refresh guards; offline players
  receive pending menus when they return.
- Floor 3 pushes preserve curated 018/019 offers, or authorize the reviewed catalog
  when no curated offers exist. Atomic catalog confirmation uses the existing
  checked benefit engine, retains prerequisite/reward/GM-override rules, and cannot
  leave temporary offers behind after failure. Completed grants never repeat.
- Pushed player terminals automatically request three distinct Race and three
  distinct Class matches. Stats, trained Skills, backgrounds and complete trauma,
  regret and loose-ends fields inform matching. Missing facts stay unknown. The
  server validates compatible IDs and previews legal benefits before recommending;
  catalog context is compacted for Groq's free-tier request limits without dropping
  crawler story fields. Provider failures preserve manual selection.
- Later specialization menus contain one to three GM-authored names/benefit rulings.
  Choosing records immutable per-floor history and displays the latest specialization
  in the sheet identity. Apply these benefits with existing GM controls after review;
  no universal specialization budget/grants were found in the supplied books, so
  Race/Class grants, resources and point balances are never silently reapplied.
- Added migration 021, private per-crawler delivery state, owner/GM checked RPCs,
  stale-version guards, withdrawal/floor expiry and existing-data upgrade fixtures.

Verification: `npm run check` passed 1,218 tests, lint, typecheck and production
build (four opt-in live cases skipped). Twelve isolated SQL suites passed, and
an actual 020→021 upgrade preserved existing crawler fields/versions and writeups.
The three original live Groq synthetic cases passed; the separate
`npm run test:ai:selection` passed the new combined six-match schema. An initial
oversized full-catalog request was fixed by compacting catalog summaries; a later
provider rate limit was respected before retrying. Desktop/mobile browser preview
verified real components with synthetic data/AI and saving disabled. Apply 021 and
run authenticated GM/player acceptance before marking this milestone complete.
See `Docs/SELECTION_MENUS_SETUP.md` for workflow, rulings and acceptance checks.

## App-wide themes (November 26, 2026)

- Light mode is the default and follows the original main-app light/printed-sheet
  appearance. Dark mode extends the Floor 3 dark, cyan/amber appearance
  throughout the app. Race & Class now follows the same global choice.
- Added Appearance controls to the root layout, sheet dialogs and encounter
  dialog. Both choices are keyboard accessible and expose their selected state.
  Switching does not navigate, save crawler data or reset open forms/drafts.
- A validated `dcc-theme` cookie saves the preference for one year on this
  browser/site. The async root layout reads it before rendering to avoid a
  wrong-theme first paint. Preferences do not require a login or database change.
  Open tabs/encounter windows on the same origin synchronize via BroadcastChannel;
  unsupported browsers can still switch locally and restore on page load.
- Shared semantic CSS variables cover auth, lobby, creation, sheets, inventory,
  Hotlist, effect/ability controls, encounter dialogs/popups and Floor 3. Tailwind
  inventory/Hotlist colors use the same variables. Health indicators retain their
  meaningful red-to-green colors; printing uses a light palette in either theme.
- Reused existing components and server actions. No crawler records, progression
  grants, credentials, migrations or unrelated behavior are changed.

Verification: `npm run check` passed 1,191 tests (three opt-in live AI tests
skipped), lint, typecheck and production build. Theme preference tests cover
unknown/missing values, the two supported choices and HTTP/HTTPS cookie settings.
Browser checks verified live login/signup switching, refresh/navigation persistence,
cross-tab updates, and preserved inventory search/selection allocation drafts.
A local fixture rendered the real sheet, inventory, Hotlist, Floor 3 and encounter
components with synthetic data and all saving disabled; desktop/mobile appearance
checks do not constitute authenticated game-save acceptance.

## Completed milestone: GM-controlled level advancement (015)

Completed November 25, 2026, based on the user's confirmation that migration 015
and the checks passed and advancement works in the app. The earlier automated
verification results below remain the implementation's recorded evidence.

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
- [x] Apply migration 015 and pass its database checks (user reported).
- [x] Verify advancement works in the app and accept the milestone (user reported).

Migration: `supabase/migrations/202611240015_level_advancement.sql`, after 001–014.
Acceptance: `supabase/tests/level_advancement_permissions.sql` and the milestone
015 workflow in `README.md`. No dependencies or account writeups change.
Full race/class selection, automatic grinding/reward dice and retroactive level
corrections remain outside this milestone. Reconciliation is an explicit one-time
baseline review; ordinary GM stat corrections do not alter spent-point balances.

Local SQL verification used minimal Supabase-compatible auth fixtures and a
stubbed realtime sender; hosted migration/checks and working in-app advancement
were subsequently confirmed by the user. This completion record does not claim
that every individual two-account, mobile, or WebSocket scenario was separately
observed. Existing SQL regression checks now read private saved writeups as their
owning player; the sheet regression uses checked level awards after 015.
Lint excludes the temporary `tmp/` directory so historical scratch dependencies
cannot interfere with application checks. Unrelated encounter changes are preserved.

## Foundation milestone: Third Floor Race/Class selection (018)

Reviewed the official Core Rulebook directly: printed pp. 128–129 (selection,
prerequisites and Rank 10 selection bonus cap), 131, 135, 140–142, 150, 152–153
(supported Races/Classes and Earth-only restrictions), and each granted ability's
entry. Printed Earth icons on pp. 150 and 152 were visually checked. Rank 16+
benefits remain subject to the existing Sixth Floor rule; this starter catalog
does not grant Rank-20 exceptions. Encounter/catalog work remains separate.

- [x] Add five reviewed Races: Human, Amazonian, Crocodilian, Igneous and Pterolykos.
- [x] Add four reviewed Classes: Boring Ol’ Fighter, Pit Fighter, Blizzardmancer
      and Monster Truck Driver. Fighter includes bounded Weapon/support choices.
- [x] Let the GM offer up to three eligible pairs on Floor 3 or deeper and revoke
      offers. Floor changes close unselected offers. The owner or GM selects an
      offered pair, with prerequisites and compatibility rechecked before grants.
- [x] Preview actual stat/rank changes and apply supported stat, learned-ability,
      DR and typed-defense benefits once, atomically and with version checks.
      Cap new rank bonuses at 10 without reducing already-earned higher ranks.
- [x] Persist Race/Class identity, size and movement. Show source references and
      explicit reminders for conditional/passive benefits requiring table play.
- [x] Require GM benefit reconciliation for every existing crawler. Confirm no
      prior grants, or record an already-applied identity without reapplying any
      bonuses. Other manually established identities/movement can be recorded.
- [x] Preserve existing Human Favor confirmation until review, then derive future
      level-gain Favor from selected Human identity. Retire the independent toggle.
- [x] Preserve health, clamp Mana only when its maximum falls, and preserve spent
      advancement points, valid equipment/links, account writeups and other games.
- [x] Add owner/GM-visible selection history and domain/service/UI/SQL assertions.
- [x] Pass application checks: 897 tests across 56 files, lint, route/type
      generation, TypeScript and production build.
- [x] Apply 001–018 in isolated PostgreSQL and verify an actual 017→018 upgrade
      preserves existing stats, resources, Human confirmation and saved writeups,
      while marking existing crawlers for review and invalidating stale versions.
- [x] Pass nine SQL suites: selection, advancement, templates, effects/live,
      encounters, sheet controls, equipment/Hotlist, abilities and typed defenses.
- [ ] Apply migration 018 to the hosted database and run its rollback assertions.
- [ ] Verify authenticated GM/player desktop/mobile acceptance from `README.md`.

Migration: `supabase/migrations/202611250018_third_floor_selection.sql`, after
001–017. Assertions: `supabase/tests/third_floor_permissions.sql`. Local SQL tests
use minimal compatible auth fixtures and a stubbed realtime sender; hosted
Supabase/WebSocket and real browser acceptance are not claimed.

This implements the proposed starter catalog, not every published Race/Class.
Passive Skill effects (including Dodge Evade bonuses), special marking conditions,
damage, flight, cooldowns, special Actions, loot, coupons and other conditional
benefits remain table-adjudicated and are identified in the selection UI. Prior
partially applied benefits must be completed/corrected with GM tools before
recording them as already applied. Selection/review is one-time; later respecs and
expanded catalogs are future work. No dependencies were added.

## Current milestone: complete Floor 3 rules and modular System AI (019–020)

Discovery completed November 25, 2026. See `FLOOR3_SYSTEM_AI_PLAN.md` for the
codebase audit, official source references, premade index, custom point-buy costs
and detriments, reconciliation design, additive schema plan and Groq architecture.
The user approved all six recommended interpretations and the integration on
November 25, 2026. Implementation expands milestone 018; hosted acceptance has
not yet been reported. Setup and manual acceptance steps are in `README.md`.

- [x] Audit existing Supabase, domain, Server Action, state and UI conventions.
- [x] Verify Core selection/build rules and document rules/model ambiguities.
- [x] Propose an integration that preserves existing advancement and benefits.
- [x] Adopt Core p. 128's flexible order with a guided Race → Class UI; keep
      authorized level spending before/after selection. The optional minimum
      assistant appears only for explicitly defined numerical Unenhanced minima.
- [x] Ingest all 30 Races and 52 Classes, fixed grants, choices, explicit
      prerequisites, Earth symbols, split points and Rank-20 permissions.
- [x] Add pure typed custom-build costs/refunds, separate 25/30 budgets, maximum
      five usable detriment BP each, discarded leftovers and five Passive ranks.
- [x] Keep unknown evidence distinct from unmet requirements; add GM verification,
      optional identity policy, explicit budget/prerequisite/rank waivers and reasons.
- [x] Add a single GM-reviewed Earth incentive decision; never auto-issue rewards.
- [x] Preserve 015/018 balances, records and selections; support identity-only
      reconciliation and individual already-applied benefits without replay.
- [x] Add checked, atomic SQL persistence, immutable selected definitions,
      equipment-inclusive Stat caps, inherited Primal benefits and history.
- [x] Add server-only Groq orchestration, purpose-specific schemas/prompts, Zod,
      semantic validation/one repair, durable budgets and a 429 countdown UI.
- [x] Pass a real strict-schema connection test and the complete Zod custom-build
      smoke test with the configured Groq account, using synthetic data only.
- [x] Complete the final application and fresh-database verification below.
- [x] Apply migrations 019 then 020 to the hosted database (user confirmed).
- [ ] Complete authenticated GM/player, responsive UI and live refresh acceptance.

Final verification on November 25, 2026:

- `npm run check` passed: 1,130 tests across 61 files, ESLint, Next.js route/type
  generation, TypeScript and the production build. The opt-in provider test is
  the single skipped test/file in this normal offline chain.
- `npm run test:ai` passed the real strict-schema custom-build test with the
  configured Groq account and synthetic data only. The returned build also passed
  the point-buy engine; no real crawler history was sent during verification.
- The clean local database runner applied 001–020, exercised the actual 018→020
  upgrade with selected/unreviewed crawlers, and preserved complete pre-existing
  rows/versions, advancement balances, resources and account writeups.
- All 12 applicable SQL suites passed: progression rules, progression permissions,
  AI usage permissions, Third Floor selection, advancement, templates, effects/live,
  encounters, sheet controls, equipment/Hotlist, learned abilities and defenses.
- Tests include partial legacy Human Favor preservation, zero-rank detriments,
  combined allocation rollback, separate split pools, explicit GM rank waivers,
  custom/bespoke persistence, inherited Primal benefits, equipment-inclusive caps,
  unknown evidence, cooldowns, stale/repeated writes and game/owner isolation.
- `git diff --check` and whitespace inspection of new files passed. The isolated
  PostgreSQL server was stopped after verification. Local auth/realtime fixtures
  were simulated; hosted migrations, WebSocket delivery and authenticated browser
  acceptance were not performed during implementation. The user subsequently
  confirmed migrations 019 and 020 are applied; browser acceptance remains pending.

Migration 019 extends the existing crawler JSON aggregate for evidence, approved
definitions, offers, reward review and immutable selection provenance; it keeps
the 018 identity/Favor projection. Migration 020 adds the RLS-protected generation
and durable usage records. This preserves the existing character data layer.

Acceptance fix: System AI request origins

The user encountered "Open System AI from your game" when generating a custom
Class. The API compared the browser's public origin with Next.js's potentially
rewritten internal URL, rejecting valid LAN/proxy requests before Groq ran.
The shared validator now uses the public Host/forwarding headers and protocol,
while rejecting foreign origins, malformed authorities, missing origins and
cross-site browser fetch metadata. Authentication and crawler permissions remain
required. No database migration or provider configuration change is needed.

Verification: `npm run check` passed 1,162 tests across 63 files, lint, typecheck
and production build; the optional provider smoke test remains skipped in this
offline chain. The 32 new tests cover the origin validator and actual API boundary,
including custom Class requests from both configured LAN hosts, HTTPS forwarding,
cross-site rejection, sign-in requirements and preserved 429 responses. An HTTP
probe against the running local app passed the LAN origin check and reached the
expected signed-out 401; a foreign origin received 403. Authenticated browser
generation still needs the user's acceptance retry.

Acceptance fix: Groq generated-output validation

The user's Groq dashboard identified `json_validate_failed`: a recommendation's
commentary contained 570 characters against the 500-character cap. The adapter
had incorrectly treated every HTTP 400 as an unavailable/unsupported model.
Generated-output validation now has its own error classification and one bounded
repair attempt, shared with local JSON/Zod and mechanical validation. Genuine
credential/model errors and rate limits remain separate and are not auto-retried.
The 500-character commentary and 400-character reason schema caps are unchanged;
prompts target 300 and 240 characters respectively to leave headroom. The prompt
cache revision was advanced. Provider diagnostics log only numeric status and
known error codes, never raw messages, failed generations, notes or API keys.

Verification: `npm run check` passed 1,177 tests across 64 files, lint, typecheck
and production build. The three opt-in live tests are skipped in that offline
chain; `npm run test:ai` separately passed all three with synthetic data: custom
Race, custom Class and class recommendations with the original length caps.
Regression cases cover the exact 570-character failure, safe SDK error parsing,
one shared retry budget, unchanged strict provider schemas, and preserved 429
handling. No model/environment change or database migration is required. The
authenticated acceptance retry remains pending.

Floor 3 selection terminal redesign (November 25, 2026)

The supplied `dungeon_crawler_world_floor_3_race_class_selection_terminal.html`
is the visual reference for the selection screen. Its sample crawlers, simulated
bonuses and mandatory automatic stat allocation are not rules sources. The app
continues to use the verified Core catalog and approved flexible p. 128 ruling.

- Added a wide, dark terminal with cyan/amber accents, responsive panels and a
  guided Race → Class → Stats → Present flow. Other sheet dialogs keep their
  existing appearance.
- Replaced catalog dropdowns with searchable, alphabetized lists, Earth/GM-menu/
  real AI recommendation filters, source pages, stat pills and benefit inspectors.
  All 30 premade Races and 52 Classes, plus approved custom entries, remain available.
- Added the crawler's actual name/level and a persistent desktop summary of the
  browsed identity, selected GM offer, Unenhanced preview and authorized points.
  Browsing an unoffered pair clears the selected offer; it cannot authorize a build.
- Added manual authorized-point allocation to the Stats stage using the existing
  atomic selection operation. Zero allocation is omitted. Whole-number/budget
  limits, optional numerical-minimum assistant, GM-only per-benefit reconciliation,
  immutable selections and opening-version checks remain enforced.
- Kept custom drafts, GM menu/overrides, evidence, incentive decisions and System AI
  within the terminal. Custom generator fields appear only for custom-build requests;
  generated builds open the appropriate Race/Class editor stage for review.
- Added an explicit final presentation of choices, point spending, skipped benefits
  and GM waivers before the once-only confirmation. No schema/migration is needed.

Verification: `npm run check` passed 1,188 tests (three opt-in live AI tests skipped),
lint, typecheck and production build. Eleven new interaction regressions cover
final-step gating, offer authorization, allocation persistence/reset/validation,
zero-point omission, GM reconciliation visibility and saved identities. Browser
preview checks used synthetic crawler data with saving disabled: catalog search,
unoffered-pair protection, stat allocation/final preview, over-budget blocking,
and desktop/390px phone layouts. Signed-in GM/player saves against the hosted game
still need user acceptance. The earlier reported missing runtime Groq configuration
remains a separate open acceptance issue; this UI change does not verify credentials.

Dependencies: `groq-sdk`, `zod`, and `server-only`. The existing `.env.local` and
credentials are untouched. The default model is `openai/gpt-oss-20b`, configurable
with `GROQ_MODEL`; unsupported models do not silently fall back to another tier.
Standard app launchers and the opt-in provider runner use the OS certificate
store with TLS verification enabled; this was necessary for the local connection.

Full ingestion corrected the discovery's cross-page assignments: Smush 5 belongs
to Sasquatch and the mandatory Patron choice to Poet Laureate. Santero and
Herbalist have Earth symbols despite no individual box bullet. The printed
Dungeon Dad purchases total 36 BP against a 32 BP budget; the engine enforces
the printed costs and requires an explicit GM ruling for that exact build.
Paladin's repeated Charisma bonus, its undefined Protective Shell casting entry,
and City Elf's conflicting reassignment amount are preserved/documented without
inventing rules. Conditional/passive combat effects and rewards remain manual;
see `README.md` for the precise automation limits and acceptance checklist.

## Current milestone: encounter popup and creature catalog (017)

The GM encounter tracker opens in a popup. A searchable catalog contains 304
stat blocks from the supplied Core Rulebook, Game Master's Toolkit, and Par for
the Course PDFs. Newly added monsters retain a catalog reference and
encounter-specific remaining Health Bar slots. Their Manage area shows the
stat block excerpt and source page, with a bounded health editor. Existing
free-text monsters can attach an official entry. Migration 017 validates
catalog selections and health changes in the database. Apply it after 016 and
run the encounter SQL assertions. Automated damage and attacks remain future
combat work.

## Previous milestone: encounters and turns (014, corrected in 016)

One GM-managed encounter per campaign tracks official crawlers and named
monsters in a compact list. Standard Mob combat follows declaration, reaction,
resolution, crawler action and Clean up phases without initiative. Optional PvP
records d20 + Dex totals each round, marks ties simultaneously, and requires
fresh rolls after each round. A completed round advances active timed effects
once for participating crawlers in the same transaction. GM-only reads and
version-checked writes preserve per-game permissions. Migration 016 converts
existing encounter rosters from the former numeric order to Mob phases;
monster attacks, targeting and damage remain future work. Apply 016
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
| 3. Complete crawler sheets | Human Tutorial entry, official stats/health/Mana/Favor/numbering first; remaining sheet sections afterward | Create and play a game-specific crawler using official rules | Human entry verified; full Core Race/Class selection and custom builds implemented in 019; broader starting-creation modes remain |
| 4. Skills and spells | Catalogs, assignments, descriptions, usage rules | Manage crawler abilities during play | Learned abilities and self-effect links implemented; broader execution remains |
| 5. Inventory, equipment, and effects | Item definitions, owned instances, equipment, traits, supported calculations | Award and manage equipment and its effects | Inventory, equipment, tracked effects, and templates implemented |
| 6. Encounters and combat | Monsters, encounter setup, initiative, turns, health, statuses | Run combat from a GM dashboard | Encounter turn foundation implemented; combat actions remain |
| 7. Achievements, rewards, and progression | Awards, loot, history, controlled level-up | Award rewards and apply eligible progression | Advancement complete in 015; selection, verified evidence and modular System AI implemented in 019–020 pending hosted/browser acceptance; wider rewards remain |
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
Animal entry, Third Floor starting creation, catalogs from additional books, portraits, rests,
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
