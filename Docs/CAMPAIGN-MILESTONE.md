# Campaign milestone — ownership and permission rules

This update implements the first part of the GM/player milestone: domain rules
for campaign membership, crawler ownership, and GM-controlled stats after
creation. The existing browser preview remains usable with its saved data.

## Apply this update

1. Stop the running Next.js server with Ctrl+C.
2. Extract this update ZIP into a temporary folder.
3. Copy its `src` folder and this document into
   `E:/dev/projects/dcc-manager`, merging folders. Replace only
   `src/domain/index.ts` when prompted. The two campaign files are new.
4. From your existing project folder, run `npm run check`.
   The expected total is **98 tests across 6 test files**.
5. Run `npm run dev` to continue using the current preview.

No package or lockfile changes are required. Keep your existing `node_modules`,
configuration, and other source files. The browser storage key and saved crawler
format are unchanged. This update adds no visible controls yet.

## Implemented rules

| Action | GM | Crawler owner | Other player / outsider |
| --- | --- | --- | --- |
| Add a player to the campaign | Yes | No | No |
| Create a crawler and choose initial stats | For any campaign member | For themselves | Players may create their own; outsiders may not |
| Apply damage or healing to an existing crawler | Yes | Yes | No |
| Change existing base health or Constitution | Yes | No | No |

A campaign has one GM and a player membership list. Each roster entry pairs a
crawler with its owner's user ID. Crawler IDs are unique within a campaign;
adding another crawler does not replace an existing roster entry. Crawler count
per owner is not restricted by this first rules layer.

GM stat edits preserve current health as an absolute value, clamping it to the
new maximum if necessary. Raising maximum health does not heal. Zero health
stays zero. Inputs use the existing crawler stat validation. Stat edits cannot
replace a crawler's ID, campaign, name, or ownership through extra input fields.
All operations return updated objects without mutating the input campaign.

## Code

- `src/domain/campaign.ts`: campaign model, ownership, membership, and commands.
- `src/domain/campaign.spec.ts`: 40 new test cases for allowed and rejected
  actions, stat validation, health preservation, and roster isolation.
- `src/domain/index.ts`: exports the new API alongside the existing rules.

The commands are `createCampaign`, `getCampaignRole`, `addCampaignPlayer`,
`createCampaignCrawler`, `changeCampaignCrawlerHealth`, and
`updateCampaignCrawlerStats`. Permission failures throw `CampaignAccessError`;
invalid data and missing crawlers throw `RangeError`.

## Boundary and remaining work

This is a pure domain layer, not authentication or shared persistence. The
current browser controller still uses its original local preview workflow and
does not call these campaign commands. Its setup screen is not an account role.

When integrating accounts, a server-side application boundary must obtain the
actor ID from a verified session, load authoritative membership and crawler
state, apply these commands, and persist changes atomically. Never accept a GM
ID, membership list, or campaign snapshot from the client as authority. These
functions accept trusted arguments; they do not verify sessions themselves.
The current browser repository is still only a local preview repository.

Next: select/connect authentication and shared storage, implement that server
boundary, then add role-aware controllers and views. Account invitations,
membership removal, ownership transfer, roster visibility, concurrent edits,
and migration of local saves need explicit handling in that integration. No
account, database, or hosting provider is selected or required by this patch.

Player stat changes during level-up remain a future, separate operation with
its own eligibility rules. Do not enable unrestricted stat editing to implement
level-up. Multiple independent gaming groups remain deferred.

## Validation

The user already confirmed all 58 baseline tests, lint, typecheck, production
build, and a manual save/refresh/load check passed before this update.

For this update, the existing local harness executed all **98 test cases**
against the actual source, plus syntax/import checks and controller save/load
checks using substitute React hooks: **693 assertions/checks** passed. This
harness is not Vitest and is not a substitute for the real integration checks.

An offline dependency install failed due to an uncached package. An online
install returned HTTP 403 from the npm registry. Real Vitest, ESLint,
TypeScript checking, and a Next.js build could therefore not be run here for
this update. Run `npm run check` in your installed project before continuing.
