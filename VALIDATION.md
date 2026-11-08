# Conversion validation

## Completed

- Safely extracted the supplied repository ZIP into a separate working directory.
- Preserved the original health and crawler implementations and tests, changing
  only line endings and local import suffixes in those four files.
- Successfully regenerated/pruned the standalone package lock with npm using
  `npm install --package-lock-only --offline --ignore-scripts --no-audit --no-fund`.
- Confirmed the resulting lockfile has no Nx packages or workspace links and that
  direct dependency versions match the new package.json.
- Parsed/transpiled every source TypeScript/TSX file and checked local imports.
- Executed all 58 test cases against the actual converted source with a minimal
  assertion runner. This executed the tests' assertions but was not a Vitest run.
- Checked controller start/damage/save/load/reset and zero-health round trips,
  plus overlapping-save protection, using substitute React state/ref hooks.
- Checked JSX for inline styles and inline event functions.

The local harness completed 634 assertions and syntax/import/lockfile checks,
including the checks above. It used the actual uploaded domain implementations,
not substitute game-rule fixtures.

## Still required in your environment

Registry access returned HTTP 403 here. An offline installation also failed because
required dependency archives were absent from the cache. As a result, a real
Vitest run, ESLint run, TypeScript typecheck, Next.js production build, and browser
rendering could not be performed here. Syntax checks and a substitute-hook harness
do not establish that those integration checks pass.

Run `npm ci`, then `npm run check`, then `npm run dev` and the manual sequence in
the README. The combined check performs the actual test, lint, typecheck, and
build steps in your installed environment.
