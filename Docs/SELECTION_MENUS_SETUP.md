# GM-pushed milestone menus (021)

Apply `supabase/migrations/202611260021_selection_delivery.sql` after 020, then
reload the game. Existing crawler fields, versions, 015 point balances, 018/019
benefits and account writeups are preserved. No menu is pushed by migration.

## Floor 3

1. Set each crawler's current floor through the existing GM controls. Complete
   advancement reconciliation and review any existing Race/Class benefits first.
2. In the game dashboard, expand **Player selection menus · GM desk**. The roster
   shows current floors and review readiness. This desk replaces the permanent
   character-sheet Race/Class section.
3. Optionally select a crawler tab and prepare a curated offer menu using
   **Manage Race & Class** in the desk. Existing 018/019 curated offers remain valid.
   Otherwise a push authorizes the reviewed catalog, subject to all prerequisites.
4. Choose **Floor 3** and **Push menus to all eligible players on this floor**.
   The database locks and updates each eligible crawler; other floors, unreviewed
   advancement/benefits, prototypes and completed selections are skipped. The
   result reports how many were sent and skipped.
5. Each owner receives a private, persistent menu. Existing live refresh waits for
   current edits/dialogs to finish before opening it. Offline players receive it
   when they next open the game. **Choose later** / **Close** preserves the pending
   invitation and a reopen control outside the sheet.
6. The first pushed terminal requests three Race and three Class matches from
   Groq automatically. Matching uses current Unenhanced stats, trained Skills,
   tutorial backgrounds and the full trauma, regret and loose-ends fields. Blank
   fields remain unknown. Catalog summaries are compact to fit provider limits;
   crawler story fields are not truncated. Class suggestions include a compatible
   Race, and all returned IDs, eligibility and distinctness are validated.
7. Players can browse and confirm an eligible catalog choice, or choose from an
   existing curated menu. AI suggestions never waive prerequisites or authorize
   a choice outside a curated menu. Unknown evidence, custom approvals, Earth
   incentive review, explicit numerical minima and existing benefit reconciliation
   continue to use the established workflow. GM waivers require a curated offer.
8. Review optional authorized point spending and benefit choices, then confirm
   once in **Present**. Catalog selection is checked and applied atomically by the
   existing rules engine/RPC; a failed choice leaves no temporary offer behind.
   Neither health nor Mana refills. Completion closes the invitation.

Manual selection remains available if Groq is unavailable. A provider 429 keeps
the form and offers a countdown; opening a menu does not guarantee provider quota.
The GM can withdraw open invitations from the desk. Changing floors closes pending
menus. Re-pushing replaces the invitation ID, so stale forms must be reopened.

## Floors 6, 9 and 12

1. Set the crawler to its actual milestone floor. Its original Class must already
   be recorded, including a reconciled legacy Class where applicable.
2. Select that crawler's tab and expand its specialization preparation control in
   the GM desk. Define one to three names with exact benefits, conditions and a GM
   ruling. Saving revised choices withdraws an older pending menu; push it again.
3. Choose that floor and push all prepared menus. Owners see only their own
   choices and confirm a single permanent choice for that milestone.
4. The specialization name appears in the sheet identity. The original Race,
   Class and all earlier milestone snapshots remain stored.
5. Specialization benefits are GM-authored and **manual**: review which benefits
   already exist, then apply only the remaining changes through existing GM sheet
   controls. Selection does not replay Race/Class grants, spend level points or
   automatically change stats, ranks, resources or gear. A completed milestone
   cannot be republished or selected twice.

## Rules reference and interpretation

Reviewed the supplied Core Rulebook, printed pp. 128 and 142 (including visual
inspection), plus the Crawlers & Customization and GM Toolkit source text. The
Core describes three personalized Race/Class recommendations based on Skills and
background, compatible Race/Class choices, prerequisites, flexible point spending
and Rank limits. The supplied books do not provide a general Floor 6/9/12
specialization catalog, price table or universal automatic grants. The requested
milestone schedule is implemented as GM-controlled campaign workflow, with explicit
GM-authored options rather than invented official mechanics or a reused 30-BP budget.

## Acceptance checks after applying 021

- Sign in as GM and two players in separate sessions. Confirm no permanent
  Race/Class section appears on the character sheet and no player menu opens
  before a push. Review legacy benefits without applying them again.
- Push Floor 3 to two ready crawlers on Floor 3. Check both owners receive menus;
  a crawler on Floor 2 or 4 receives none. Close one invitation and reopen it.
- Confirm six AI matches use that crawler's data, not another player's history.
  Check manual browsing during an AI error/429 and that unknown facts still need
  GM verification. The key remains server-only.
- With no curated offers, complete a legal catalog pair. With curated offers,
  verify an unoffered pair cannot be confirmed. Verify stat/rank previews, point
  spending, once-only grants, unchanged resources, stale versions and reconciliation.
- At each of Floors 6, 9 and 12, prepare, push and choose a specialization. Check
  the original Class and earlier choices persist and no numerical benefit is
  silently applied. Review existing benefits before making manual GM adjustments.
- Withdraw or change floors while a menu is pending; the old choice must fail.
  Re-push and confirm the new menu ID works. Completed milestones stay complete.
- Exercise both Light mode and Dark mode and a phone-sized viewport.

## Recorded local verification

`npm run check`: 1,218 passing tests, four opt-in provider tests skipped, lint,
typecheck and production build. Twelve local SQL suites cover new delivery and
catalog authorization plus prior progression, reconciliation, AI permissions,
advancement, sheet controls, gear, effects, defenses, Skills and encounters.
An actual isolated 020→021 upgrade preserved existing crawler fields/versions
and account writeups exactly. New SQL cases include a two-player push, all four
milestones, withdrawal, floor expiry, forged choices/waivers, atomic failures and
once-only completion. Database tests must run only in an isolated test database.

`npm run test:ai` verifies the three original synthetic provider cases.
`npm run test:ai:selection` separately verifies the combined six recommendations
against the real configured provider, using synthetic story data only; it passed
after compacting catalog context. Run these separately to respect free-tier quotas.

Browser preview verified the GM desk, automatic pushed Floor 3 opening and AI
request, six recommendation cards, catalog choice/allocation/final review,
specialization confirmation and mobile layout. It used real components with
synthetic workspace/AI data and saving disabled. Hosted migration and authenticated
multi-session acceptance remain pending until the GM performs the checks above.
