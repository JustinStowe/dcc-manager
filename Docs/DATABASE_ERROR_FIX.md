# Diagnose the lobby's database setup error

The reported UI error comes from shared database reads and/or the host-game RPC.
The existing `campaignDatabaseError` helper discarded the original error code.
This patch preserves a fixed-format PostgreSQL/PostgREST support code in the
message and logs that code to the Next.js terminal. It does not log database
details, row contents, session tokens, or keys.

`npm run check` validates the application code but does not run the SQL migrations
or establish that the live database exposes the expected tables and functions.

## First: inspect the configured database

1. Open the Supabase project whose URL matches `.env.local`'s
   `NEXT_PUBLIC_SUPABASE_URL`. Check the match locally; do not share your env file.
2. Open SQL Editor and run the included `DATABASE_DIAGNOSTICS.sql`.
3. Share the result. All three tables and all three functions should be present,
   and `has_lobby_column` should be true. Empty database tables are fine; missing
   schema objects are different from having no games yet.

| Result | Next step |
| --- | --- |
| All three tables are NULL | Apply the base migration, then the lobby migration, using LOBBY_SETUP.md |
| Tables exist; lobby functions are NULL and lobby column is false | Apply the lobby migration |
| A mixture of base tables is missing | Share the output before rerunning scripts; do not drop/recreate tables |
| Objects are present but the app still fails | Apply this diagnostic patch and share the support code |

The migration files from the lobby package are:

1. `supabase/migrations/202611090001_shared_campaign.sql`
2. `supabase/migrations/202611090002_game_lobby.sql`

Apply each only once. Follow LOBBY_SETUP.md's SQL permission-test steps after
migration. If a migration produces an error, run `ROLLBACK;` and share that error
before continuing. Do not run the old manual bootstrap script.

## Apply the code diagnostic patch

1. Stop Next.js.
2. Merge this ZIP's `src` folder into your project's `src`.
3. Run `npm run check` (the expected total remains 181 tests across 11 files).
4. Run `npm run dev`, reload, and retry creating a game.

The patch replaces only the campaign repository adapter and root layout. Your
other source files, auth configuration, and database data are unchanged.

| Support code | Meaning |
| --- | --- |
| `PGRST205` / `42P01` | Table unavailable through the API or absent from the database |
| `PGRST202` / `42883` | Function/signature unavailable through the API or absent from the database |
| `PGRST204` / `42703` | Required column unavailable |
| Other code | Share it for the next diagnosis; no database cause is assumed |

If the diagnostic query confirms the required objects exist in the correct
project and the code is `PGRST202` or `PGRST205`, reload the API schema cache in
the SQL Editor, then retry:

```sql
NOTIFY pgrst, 'reload schema';
```

If it still fails, share the support code. Cache reload does not install missing
migrations or fix missing privileges. Keep RLS and the current role restrictions
in place while diagnosing.

## Separate browser warnings

- The hydration diff shows `data-new-gr-c-s-check-loaded` and
  `data-gr-ext-installed` on the body. These point to a Grammarly/browser
  extension modifying the page. Test in a normal browser with the extension
  disabled for localhost, or an extension-free profile. This warning is separate
  from the Supabase database failure.
- The smooth-scroll warning is fixed by this patch's addition of
  `data-scroll-behavior="smooth"` to the root html element. It is also separate
  from game creation.

## Verification limits

The existing workspace source and adapter/action/route harness checks were run
after the patch. These do not replace the local Vitest/lint/typecheck/build run
or a live Supabase request. No query or migration has been executed against the
user's Supabase project here; the underlying live failure still requires the
diagnostic result or support code.

## References

- https://docs.postgrest.org/en/stable/references/errors.html
- https://docs.postgrest.org/en/stable/references/schema_cache.html
- https://nextjs.org/docs/messages/react-hydration-error
- https://nextjs.org/docs/messages/missing-data-scroll-behavior
