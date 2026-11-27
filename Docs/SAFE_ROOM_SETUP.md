# Safe Room loot and Achievements Codex (023)

Apply `supabase/migrations/202611270023_safe_room_rewards.sql` after **022**,
then reload the game. No new packages, environment variables or Groq setup are
required. No existing crawlers, inventories, point balances, Race/Class benefits,
saved writeups, timers or notification read states are rewritten. The migration
creates no rewards and grants no saferoom permission.

## GM and player workflow

1. Open **Safe Room / Loot** from the HUD. Players see their own crawler only;
   the GM can switch the target crawler inside the terminal. The badge counts
   unopened boxes for the owner, or all visible game boxes for the GM.
2. Expand **Award a box or achievement · GM**. Create an achievement, a box, or
   both together. Enter its title/trigger/System description and/or tier, category,
   flavor and contents. The form supports 1–20 item entries, existing equipment
   slots/bonuses and the supported Standard Mana Potion effect. Other mechanics
   belong in notes for GM resolution. A box-only award can link an achievement
   without a box; the selected Codex achievement is available even beyond the
   most recent page. Repeated submissions of the same request are idempotent.
3. Review existing awards and confirm the anti-duplication checkbox. For a reward
   already issued manually, also choose **Record a past reward already received**.
   That records an opened/claimed historical box, adds no inventory items and does
   not replay a new gold achievement banner. It can document a reward whose items
   have since been consumed or removed; no matching inventory entry is required.
4. Confirm saferoom access for the current crawler/floor, or open it for several
   crawlers at once from **Saferoom status** in the Players & saferoom panel (migration 024).
   It works on tutorial Floors 1–2 as well as later floors; on Floor 3+ an open
   saferoom also lets the owner spend every pending level-up stat point without a
   separate authorization. Owners can browse their queue/Codex outside a saferoom but cannot open
   or claim. Changing floors clears access permanently until the GM confirms it
   again, even if the crawler returns to the previous floor.
5. A player selects an unlocked box and clicks **Open box**. Its short unsealing
   animation reveals the GM's fixed contents; opening alone grants nothing. A vote
   lock needs explicit GM review/release. No wall-clock vote auto-release occurs.
6. **Claim** transfers that complete item stack, or **Claim All** transfers all
   remaining entries to the crawler's existing Inventory & equipment. All entries
   start stored. Claiming never equips, refills Health/Mana or applies item text as
   a mechanical grant. Existing gear/consumable controls remain authoritative.
7. The Codex has search, Floor 1/2/3/4+ and Unread/With Box filters, older pages,
   individual read acknowledgement on selection and Mark All Read. Its card links
   to the reward box even when tier/claimed filters hide that box from the list.
   Read state is per account, independent of the Phase 1 notification read state.

The System AI / Game Guide commentary panel is optional and collapsible. Both
themes and small screens use the same stored data. New actual awards publish
private owner/GM notifications through the Phase 1 channel. The original Phase 1
Achievement-tagged broadcasts are not automatically imported as Codex records.

## Existing rewards and the Custom Earth incentive

The original 019 `rewardDecision` is preserved. It describes the selection-time
decision, not whether a manually issued reward has since been fulfilled.

- If it is `issue-once` and is still unfulfilled, choose the single Earth incentive
  as the award source. Review all prior benefits and record its box once. The
  fulfillment ledger prevents another such box through this workflow.
- If those rewards were already issued, use the existing-incentive review to
  record fulfillment with notes, or record a historical Earth-incentive box using
  Record Past Reward. Neither path adds inventory or Potion ranks again.
- `already-received` permits historical documentation only; `declined` or an
  unreviewed selection decision cannot issue a new Earth-incentive box.
- Skill Potion ranks, any additional reward components and bespoke mechanics
  remain manual GM controls. Review what is already included before applying
  anything. This does not reopen or alter the original Race/Class selection.

## Claim integrity and limits

Each reward item has a permanent receipt ID, used as its new inventory ID. The
server locks crawler then box and checks the current box/crawler versions and
saferoom permission. A successful claim and its receipt commit in one transaction.
Claimed items cannot be regranted by retry, refresh, consuming or deleting them.
Stale partial claims fail safely and must be refreshed. Fully repeated claims are
no-ops. No name-based merging can accidentally modify a different stack.

The existing inventory limit remains 200 entries, with quantities up to 999,999.
If Claim All exceeds capacity, nothing is granted or marked claimed. Organize the
existing inventory or claim individual items into available entries. Unsupported
percentage/conditional bonuses, spell learning, Skill ranks, currency spending and
Favor changes are explicit GM rulings; descriptive text grants none automatically.

Sealed contents are protected by database policies on item rows and by the
authorized snapshot. Another player cannot read the box, items, Codex or review
ledger, including through direct database/API queries. GM previews remain visible
to the GM before opening. Private helpers and direct table writes stay restricted.

## Sourcebook grounding

Reviewed the official Core Rulebook, printed pp. **21–23**, **216–219** and **280**
(PDF pages 23–25, 218–221 and 282), including visual inspection of p. 21. The rules
describe achievement rewards, six box tiers, GM-chosen contents opened in a
saferoom, and audience voting for Fan Boxes. The terminal implements the approved
GM-controlled tabletop adaptation: the GM defines final contents and releases
vote locks. It does not infer video-game loot statistics, execute the HTML demo's
sample item powers, automatically grant Popularity, or make audience decisions.
That reference HTML supplied visual direction, not additional application rules.

## Hosted acceptance after applying 023

Use GM, owner A and owner B in separate sessions in the same game:

- Award A an achievement plus a box. Confirm one Codex entry, one linked box,
  correct unopened badge and private owner/GM alerts. B must see none of A's data.
  Reload before/after opening and verify sealed contents stay hidden until opened.
- Outside confirmed saferoom access, inspect both tabs but verify Open/Claim are
  blocked. Confirm access as GM, then open and claim. Check the exact quantities
  in the existing inventory, stored rather than equipped, and unchanged resources,
  stat points, ranks, levels, existing equipment and Hotlist entries.
- Exercise one-item claims and Claim All, rapid retries and stale second sessions.
  Use/consume/remove a claimed item and verify it cannot be reclaimed from the box.
  Near inventory capacity, Claim All must fail atomically; individual claims may
  use the remaining slots without marking other items claimed.
- Test all six tier filters, Hide Claimed and linked box/card jumps outside those
  filters. Test Codex search against older pages, floor/status filters, personal
  read acknowledgement and Mark All Read with another award arriving concurrently.
- Award a vote-locked box and verify only the GM can release it after review.
  Confirm an unsupported item description does not execute a new automatic effect.
- Record a previously issued reward as historical. Check it is already claimed
  and that inventory/resources did not change. Reconcile a previously fulfilled
  Earth incentive and verify a second incentive grant is rejected.
- Change floors, then return. Saferoom access must stay closed until reconfirmed.
  After 024, an open saferoom on Floor 3+ lets the owner spend pending stat points;
  closing it or changing floors stops that spending.
- Test both themes, keyboard navigation, reduced-motion preference and phone
  width. Send live updates during an unfinished GM award draft; preserve its data.

## Recorded local checks

`npm run check`: **1,271 passed**, four optional provider tests skipped, lint,
typecheck and production build passed. Fifteen isolated SQL suites passed: two new
Safe Room suites plus all thirteen 022 regressions. Coverage includes unopened
content privacy, direct API permissions, idempotent awards, permanent receipts,
stale versions, atomic capacity failures, historical/incentive reconciliation,
full-history filters/pagination and per-user read watermarks.

An isolated 022→023 upgrade preserved complete crawler/profile rows and versions,
Phase 1 timers, notifications and read states, and created no unsolicited rewards
or access. Browser preview verified real components with synthetic storage: GM
access/awards, opening/claiming into the existing inventory, player vote locks,
Codex search/read/deep links, both themes and 390px layout without horizontal
overflow. Hosted migration and authenticated multi-account acceptance remain pending.

Run fixture SQL only against an isolated test database, never the hosted game.
Migration 023 is the only SQL file from this milestone to apply to the live project.
