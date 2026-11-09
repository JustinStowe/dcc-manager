# Dungeon Crawler Carl Manager

A standalone Next.js application for GMs and players. Authentication opens a
Host / Join lobby. Accounts can host multiple games, join others by Game Code,
and resume the crawler saved for each game.

## Setup

For the current Level 1 Human entry update, follow [TUTORIAL_SETUP.md](TUTORIAL_SETUP.md).
Its migration follows the two lobby migrations.

For the earlier lobby foundation, [LOBBY_SETUP.md](LOBBY_SETUP.md) includes installation, database
migrations for fresh or previously configured projects, database policy tests,
and manual multi-account checks. The lobby replaces the earlier manual GM
bootstrap; do not run `bootstrap_campaign.sql`.

Supabase authentication must already be configured. See [AUTH_SETUP.md](AUTH_SETUP.md)
for the email/password and confirmation setup from the authentication milestone.
Keep the project URL and publishable key in `.env.local`. No service-role key is
used by the application.

## Commands

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

With the existing browser ID tests retained, the expected total after this update
is **251 tests across 13 files**. No Nx command or separate library build is needed.

## Current flows

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
- Historical browser saves can be explicitly imported during creation. The
  original browser save is preserved.

The current creation form supports Level 1 Human crawlers with identity,
standard-array or saved server-rolled stats, eight background Skills, two combat
Skills, Heal, story notes, and starting gear notes. Crawler Numbers are generated
per campaign. The official tracker uses ten slots, Enhanced-stat modifiers,
Mana, AI Favor, and atomic Heal. The GM edits existing stats and awards Favor.

Old prototype crawlers require explicit GM review and conversion. Their original
rows are archived and zero health remains zero. See TUTORIAL_RULES.md for the
rulebook mapping. Animal entry, Third Floor creation, full inventory/combat,
advancement, and the remaining sheet sections are still roadmap work.

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

The user confirmed the authentication/lobby checks and reported that database
setup and hosting worked after applying the migrations. The new Tutorial update
passes the available source harness and mocked framework checks. Its full local
checks, migration, database assertions, and browser acceptance tests remain
pending as described in TUTORIAL_SETUP.md. No database migration has been run by
the assistant against the user's Supabase project.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for scope, milestone status, and next steps.
