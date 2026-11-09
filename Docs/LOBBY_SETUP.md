# Host / Join lobby — installation and acceptance checks

This update implements the post-login flow you specified. It replaces the
previous single-campaign dashboard and manual GM bootstrap with a lobby.

## Flow

| Lobby action | Result |
| --- | --- |
| Host a Game → New Game | Enter a name; create a campaign owned by the signed-in user; display its Game Code on the GM dashboard |
| Host a Game → Existing Game | List only campaigns owned by this account; open the selected GM dashboard |
| Join a Game → New Game | Validate the GM's Game Code, add the signed-in user as a player, and open creation for that game |
| Join a Game → Existing Game | List joined campaigns; open the saved crawler and game data |

An account can host some campaigns and join others. GM privileges are specific
to the selected game. Players see only their own crawler in that game; its GM
sees everyone. One crawler per account **per campaign** is supported.

If a player joined previously but never finished creation, reopening the game
resumes creation. A player who already has a crawler bypasses creation. Joining
again does not replace or reset a crawler.

Per your selected scope, this update reuses the existing name, base health,
Constitution, and health tracker. Favor, Adventurer Number, and expanded Vitals
remain the next character-sheet task; no starting values or numbering rules
have been invented for them.

## 1. Apply this package

1. Stop Next.js with Ctrl+C.
2. Extract the ZIP into a temporary folder.
3. Merge its `src` folder into your project's `src`, replacing matching files.
4. Merge its `supabase` folder into the project root.
5. Copy `LOBBY_SETUP.md`, `PROJECT_PLAN.md`, `README.md`, and the replacement
   `SHARED_CAMPAIGN_SETUP.md` to the project root.

This package includes the preceding shared-storage source as well as the lobby
changes. It works whether you have applied only the verified authentication
update or have also applied the previous shared-campaign source patch.

It preserves your auth helpers/actions, `.env.local`, package.json, lockfile,
crawler controller, browser ID adapter, and browser repository. No new npm
package is required. Old preview components remain in the codebase, but login
now lands in the lobby.

**Do not run the previous `bootstrap_campaign.sql`.** Hosting through the lobby
now assigns the GM and creates the game. An old copy of that file may remain
on disk, but it is not part of this installation flow.

## 2. Apply the database migrations in order

Use the SQL Editor in your existing Supabase project.

### If you have not applied shared storage yet

Run these entire files, in order:

1. `supabase/migrations/202611090001_shared_campaign.sql`
2. `supabase/migrations/202611090002_game_lobby.sql`

### If the previous shared-storage migration is already applied

Run **only**:

```text
supabase/migrations/202611090002_game_lobby.sql
```

Do not rerun a migration that already succeeded. If uncertain, the presence of
`public.dcc_campaigns` indicates that the base migration has been applied; the
`accepting_players` column indicates the lobby migration has been applied.
Check the Table Editor before running scripts rather than recreating tables.

Both files run in transactions. If a script fails, run `ROLLBACK;` and share the
error before continuing. No database operations have been run against your
project by the assistant.

### Existing data

The second migration removes the old singleton restriction and adds Game Codes
to existing campaigns. It keeps campaign IDs, GM ownership, memberships,
crawler IDs, stats, current health, and version tokens. A previously provisioned
GM finds that campaign under Host a Game → Existing Game.

The `dcc_private` schema must remain outside the Data API's Exposed schemas.
Public RPC functions are security-invoker wrappers; private implementations
check the current authenticated account and use an empty search path. The app
uses your existing publishable key and session; no service-role key is needed.

## 3. Run the database permission tests

After both migrations, run the entire file:

```text
supabase/tests/game_lobby_permissions.sql
```

Run as the SQL Editor's postgres/administrator role. It creates fixture users
and games inside a transaction, exercises real database reads/writes, then
rolls the fixtures back. Existing games are not deleted or replaced. Fixture
users are not created through signup and no confirmation emails are sent.

The final result should read:

```text
PASS: lobby database assertions completed; fixtures rolled back.
```

All preceding statements must also complete without error. If any fails, run
`ROLLBACK;`, stop, and share that error. The included older
`shared_campaign_permissions.sql` test remains usable on an empty/test project;
it refuses to run after a real campaign has been created.

The lobby SQL test covers existing-code backfill, multiple hosted games,
owner assignment, join-code validation, membership isolation, idempotent joins,
saved crawler preservation, mixed GM/player roles, private code visibility,
paused joining, attempt limits and cooldown, owner-only reads, GM stat control,
stale versions, health clamping, zero health, and unconfirmed-account rejection.

## 4. Run application checks

```bash
npm run check
```

Expected total: **181 tests across 11 files**, followed by lint, TypeScript, and
production build. This includes your two existing browser ID tests.

- Starting from the verified authentication build: 120 + 36 shared-campaign
  cases + 25 lobby cases = 181.
- Starting from the previous shared-campaign patch: 156 + 25 = 181.

Expected dynamic routes include `/`, `/games/[campaignId]`,
`/games/[campaignId]/create`, `/login`, `/signup`, and `/auth/confirm`, plus the
Proxy entry. The Proxy matcher includes the game routes for session refresh.

Then start the app:

```bash
npm run dev
```

## 5. Verify the lobby with separate accounts

Use separate browser profiles/private windows so each account has its own
session. Use `http://localhost:3000` consistently for local browser saves.

### Host flow

- [ ] Sign in and see Game lobby with Host a Game and Join a Game.
- [ ] Expand Host a Game → New Game and create a named game.
- [ ] Land on its GM dashboard and see a selectable Game Code.
- [ ] Return to the lobby; the game appears under Host → Existing Game.
- [ ] Create a second hosted game; both appear separately.
- [ ] Reopen each game and confirm its roster and crawler data stay separate.

### Player flow

- [ ] Sign in as another account and choose Join a Game → New Game.
- [ ] An incorrect code shows an error and grants no access.
- [ ] A valid code opens creation for that specific campaign.
- [ ] Create a crawler; it saves and routes to that game's sheet.
- [ ] Change health, return to the lobby, and choose Join → Existing Game.
- [ ] The saved crawler opens directly with its current health preserved.
- [ ] Re-entering the same code does not reset or duplicate the crawler.
- [ ] Join a second game and create a different crawler; switching games loads
      the correct one each time.
- [ ] If creation is interrupted after joining, Existing Game resumes it.

### Roles and privacy

- [ ] Player A and Player B see only their own crawler in the shared game.
- [ ] The GM refreshes and sees both players and both crawlers.
- [ ] A player hosts another game; they remain a player in the original game.
- [ ] A player cannot read or change another game's records by changing a URL.
- [ ] The GM can edit existing stats; players cannot.
- [ ] Pausing new joins blocks code entry but existing members can reopen their
      games from Existing Game. Reopening joins accepts valid codes again.
- [ ] Two sessions editing the same old version produce a conflict rather
      than silently overwriting data.
- [ ] Sign-out protects the lobby and all game routes.

## Browser-save import

Creation offers Find saved preview crawler if your account has no crawler in
that campaign. Import only your own historical save. It is assigned to the
signed-in account and selected campaign, with its current health preserved and
a new database ID. The original local save is kept.

Historical browser saves have no account ownership and are available to users
of the browser profile. They are not automatically uploaded. Shared records are
protected by campaign membership and ownership in the database.

## Behavior details

- Game Codes are generated by the database, unique, and displayed in grouped
  form. Case, spaces, and separator hyphens are normalized when joining.
- Codes are bearer invitations: a signed-in, confirmed account with the code
  can join while the GM has joining open. No separate approval queue is added.
- Only a game's GM can retrieve its code through the settings API or pause
  joining. New code attempts are limited to 20 per minute per account.
- New joiners appear when the GM uses Refresh campaign. Live subscriptions and
  notifications are not part of this update.
- Closing joins does not archive a game or remove existing memberships.
- Membership removal, code rotation, ownership transfer, and crawler deletion
  are not included here.
- Existing post-creation stat controls remain GM-only. Level-up changes will
  be implemented through a separate controlled workflow.

## Verification and limits

The available workspace harness passes **179 test cases**; your two browser ID
tests are absent here and account for the expected local total of 181.
Additional mocked adapter/action/route checks cover authentication, selected
campaign loading, role-specific redirects, private host settings, creation
completion, and cache invalidation. These are not live database or browser tests.

Dependency downloads remain blocked in the assistant environment, and no local
PostgreSQL runtime is available. Full Vitest, ESLint, TypeScript, Next.js build,
the migration, and SQL policy tests must run in your environment. The database
scripts have not been executed against your Supabase project.

## References

- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database functions and privileges](https://supabase.com/docs/guides/database/functions)
- [Next.js dynamic route segments](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes)
