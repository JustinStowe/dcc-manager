# Dungeon Crawler Carl Manager

A standalone Next.js application for the Dungeon Crawler Carl management project.
This conversion preserves the current crawler health tracker and browser saves.
Player accounts, GM permissions, campaigns, and shared storage are the next milestone;
they are not implemented in this package.

## Start here on Windows

Extract the ZIP into `E:/dev/projects`. It contains a `dcc-manager` folder.
Keep your existing `tabletop-forge` folder as a backup; do not merge the two projects.
Open the new folder in VS Code. Stop the old development server before starting this one.

From Git Bash:

```bash
cd /e/dev/projects/dcc-manager
npm ci
npm run check
npm run dev
```

Open http://localhost:3000. Your existing Node 26 installation satisfies the declared
Node requirement. Node 24 is also supported by the package versions retained here.

`npm run check` runs tests, lint, route/type generation, TypeScript checking, and a
production build. It stops when a check fails. The expected test count is **58**.
If any command fails, share its output before moving on to the next milestone.

## Everyday commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start development on port 3000 |
| `npm test` | Run the tests once |
| `npm run test:watch` | Rerun tests while editing |
| `npm run lint` | Check code style and React rules |
| `npm run typecheck` | Generate Next route types, then check TypeScript |
| `npm run build` | Build the production application |
| `npm start` | Serve a previously built production application on port 3000 |
| `npm run check` | Run all checks in sequence |

No Nx commands, global Nx installation, or separate library build are needed.

## Where the code lives

| Folder | Responsibility |
| --- | --- |
| `src/app` | Next.js route, layout, and global stylesheet |
| `src/domain` | Pure crawler models, game rules, validation, and tests |
| `src/controllers` | React state and named event handlers |
| `src/models` | The data and action interfaces supplied to views |
| `src/views` | Markup, bindings, and display conditions |
| `src/components` | Composition of a health controller and its view |
| `src/styles` | CSS modules |
| `src/services` | The save/load repository contract |
| `src/adapters` | Browser storage implementation and its tests |
| `public` | Static assets |

For example, `src/app/page.tsx` selects the repository, asks the crawler controller
for its model/actions, and passes them to the view. The view binds a button to a
named action. The controller calls a domain rule and updates state. The storage
adapter handles serialization; the domain validates restored data.

This preserves the MVC-style separation we have been using. JSX has no inline
styles or event function bodies. ESLint now checks these two conventions. React
uses controller hooks here, while the domain remains independent of React.

Imports beginning with `@/` refer to `src/`. The domain is ordinary source inside
this application, rather than a separate workspace package. Local domain imports
now omit `.js` because the application uses bundler module resolution.

## Check the behavior

1. Create Carl with base health 10 and Constitution 10. Start tracking.
2. Take 3 damage. Expect 7 segments. Click **Save crawler**.
3. Refresh and click **Load saved crawler**. Expect Carl at 7 segments.
4. Take 2 more damage without saving. Return to setup and load. Expect 7 again.
5. Reduce health to zero, save, refresh, and load. Expect zero, not full health.
6. Check that setup fields are locked while tracking and that invalid values
   prevent starting a crawler.

Browser saves remain explicit and local. One snapshot is kept for the temporary
`local-preview` campaign. The old storage key is retained deliberately. Existing
saves can be read when the application runs in the same browser profile at the
same origin: protocol, host, and port must match. For example, `localhost:3000`
and `127.0.0.1:3000` do not share their browser storage. Do not clear site data if
you need your saved crawler.

This is not yet a shared multiplayer database. Different browsers and devices
will not synchronize.

## What changed from your ZIP

- Flattened the workspace into one standalone Next.js package.
- Moved the existing domain source and tests into `src/domain`.
- Moved controllers, views, styles, models, and storage out of the route folder.
- Removed Nx tooling, workspace links, project references, generated build output,
  the unused example API route, and unused starter page stylesheet.
- Replaced workspace package imports with application source imports.
- Added ordinary npm scripts and standalone Next.js, TypeScript, ESLint, and
  Vitest configuration.
- Preserved the exact installed versions from your uploaded lockfile. npm pruned
  the old lockfile for the standalone dependency graph; no framework upgrade was
  mixed into this conversion.
- Repaired an incomplete Save/Load update: your ZIP imported `restoreCrawler`,
  but its implementation, export, and tests were missing. They are now included.
- Preserved all 28 existing tests and added 18 restoration tests and 12 browser
  storage tests, for 58 total.
- Updated the page title and metadata to Dungeon Crawler Carl Manager.

The simple generated `dccDomain` helper and its existing smoke test are retained
with the original tests; they do not require Nx.

## Next milestone: GM and players

After the standalone checks pass, the next feature is one shared campaign with
accounts and membership. We will define the GM's controls and the player's editable
fields, add shared persistence, then implement those access rules. Multiple
independent gaming groups remain deferred. We have not selected or connected a
hosting, authentication, or database provider during this conversion.

See [VALIDATION.md](VALIDATION.md) for the checks performed and their limits.

## Configuration references

- [Next.js setup and npm commands](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js type generation](https://nextjs.org/docs/app/api-reference/cli/next)
- [Next.js ESLint configuration](https://nextjs.org/docs/app/api-reference/config/eslint)
- [Vitest configuration](https://vitest.dev/config/)
