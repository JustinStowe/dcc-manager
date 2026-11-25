# Floor 3 selection and System AI: discovery and proposed integration

Date: November 25, 2026. Status: discovery approved; implementation and
verification are tracked in `PROJECT_PLAN.md` and setup is in `README.md`.

This expands the existing milestone 018 workflow. It does not replace the
campaign, character sheet, advancement, permissions, or reconciliation systems.
No application code, dependencies, migrations, or environment values were changed
during discovery. No crawler information was sent to Groq.

## 1. Existing architecture

The working directory is `E:\dev\projects\dcc-manager`. All nine PDFs in
`SourceFiles` are readable. `AGENTS.md`, `PROJECT_PLAN.md`, and the installed
Next.js Route Handler and Server Action documentation were reviewed. Git was
clean at the end of the read-only audit, before this planning document.

| Concern | Existing implementation | Integration consequence |
| --- | --- | --- |
| Framework | Next.js 16.4.6 App Router, React 19, strict TypeScript, Tailwind 4 | Follow installed Next.js guidance; add no alternate application framework. |
| Data | Supabase PostgreSQL migrations 001–018; no Prisma | Add migrations after 018; never rewrite an applied migration. |
| Crawler | `dcc_crawlers`: tutorial profile, baseline stats, learned skills, inventory, effects, defenses, advancement, Third Floor JSON, optimistic version | Extend existing projections and checked writes. |
| Authorization | Verified Supabase account, per-campaign membership and GM role, owner-scoped reads, RLS, checked SQL RPCs | Recheck actual roles and row versions in SQL; client GM flags cannot authorize overrides. |
| Rules | `src/domain/tutorial.ts`, `abilities.ts`, `advancement.ts`, `third-floor.ts`, equipment/effect/defense domains | Keep new rules pure and reusable by selection and AI validation. |
| Application layer | `src/services/third-floor-commands.ts`, authenticated `src/app/campaign/third-floor-actions.ts`, Supabase adapter | Extend the same command boundary and atomic save path. |
| UI/state | `ThirdFloorManager`, `SheetModal`, sheet CSS modules, named handlers, `useDialogAction`; Tailwind inventory | Reuse existing dialogs, pending/error behavior, version conflicts, and refresh guards. No new global state library. |
| Current selection | Five Races, four Classes, up to three GM-offered pairs, owner/GM selection, previews, one-time grants and legacy reconciliation | Expand the catalog and requirements rather than add a competing character workflow. |
| AI | No AI service, `groq-sdk`, or direct `zod` dependency | Add a server-only provider adapter, reusable orchestration, and purpose-specific schemas/prompts. |
| Narrative/evidence | Creation backgrounds and notes exist; structured achievements, Popularity, deity/club membership and original-animal facts do not | Add explicit verified evidence; never infer an earned achievement from model commentary. |

The current stat model separates Unenhanced/base stats from Enhanced/equipment
and effect totals. Advancement already tracks earned, spent, and GM-authorized
points. Selection already preserves resources and existing benefits. These
balances must remain authoritative.

## 2. Official rules and important differences from the request

Primary source: `SourceFiles/carl_rpg_core_rulebook_digital_hi-res_081226.pdf`.
All page numbers below are printed page numbers; PDF viewer pages are two higher.
The Core chapter was used for the complete build menu, rather than treating a
starter handout as the complete rules. Pages 159 and 161 were also checked visually.

| Rule | Verified result | Core page |
| --- | --- | --- |
| Attributes | Strength, Intelligence, Constitution, Dexterity, Charisma | 109 |
| Starting values | Assign 2, 3, 4, 5, 6 once each, or roll 1d6 rerolling 1 for each stat in fixed order. No universal starting score of 10. Enhanced initially equals Unenhanced. | 109 |
| Level points | Three points for each level gained after Level 1: `(level - 1) * 3`. They increase Unenhanced stats. Level cap 250; level gains do not raise Skill ranks. | 128, 169 |
| Initial availability | Tutorial level points become available on Floor 3; subsequent distribution uses a saferoom. Preserve the existing GM authorization workflow. | 128, 169 |
| Suggested choices | System recommends three Race/Class options informed by Skills and background. | 128 |
| Selection order | Fictionally Race then Class; the tabletop rules explicitly allow choosing together in either order if compatible. Level points may be distributed before OR after selection. | 128 |
| Automatic minimum allocation | No mandatory automatic deduction procedure or universal numerical minimum table was found in the selection/build sections. It would be a convenience feature, not an official required sequence. | 128–162 |
| Selection Skill grants | Learn a new Skill at the granted rank; add to an existing rank only up to 10. Excess is lost. Preserve pre-existing ranks above 10. | 128 |
| Later Skill caps | Normally 15; specified Race/Class benefits can permit 20. Rank 16+ benefits are inactive before Floor 6. | 128 |
| Compatibility | Earth Classes require an Earth Race. Some choices require existing Skills, Popularity, achievements, or other conditions. | 128–158 |
| Identity restrictions | Sex/gender/species limits are explicitly optional group decisions. | 128 |
| Animal transition | An animal becoming a non-animal keeps animal Skills but cannot use them while non-animal. | 128 |
| Custom budgets | Race 25 BP and Class 30 BP; separate pools. Unspent points are lost. Up to 5 extra BP from detriments in each pool. | 158–161 |
| Repeated benefits | Repeat only where meaningful; duplicate Resistance to the same damage type does not stack. | 159 |
| Linked groups | Need an actual thematic connection. All Passive Skills, all Spells, and all Racial Skills are not valid linked groups by themselves. | 159 |

The app's existing numeric storage bound of 10,000 is an implementation bound,
not an official general stat cap. Do not introduce invented STR 13/INT 10
prerequisites: the generic selection discussion mentions stat requirements, but
the explicit premade prerequisite entries reviewed below do not supply such a
universal numerical minimum system.

### Premade index

These are source entries to ingest with page references and individual benefits.
The existing five-Race/four-Class JSON is a reviewed subset, not the complete
catalog. The index and explicit prerequisite scan are complete; each newly
supported entry still needs its full benefit/choice data reviewed during ingestion,
including Earth symbols, conditional effects, and cross-page continuations.

| Page | Races |
| --- | --- |
| 129 | Amazonian; Arachnid |
| 130 | Cat; Cat Girl/Cat Boy; Changbi Demon; Changeling |
| 131 | Crocodilian; Doppelgänger (continues 132) |
| 132 | Dwarf, Classic; Dwarf, Fathom |
| 133 | Elf, High; Elf, City |
| 134 | Elf, Night; Frost Maiden |
| 135 | Human; Igneous |
| 136 | Lajabless; Obsidian Butterfly |
| 137 | Primal; Rat Hooligan; Sasquatch |
| 138 | Tetrakai; Tigran |
| 139 | Bune; Caprid; Grulke |
| 140 | Hobgoblin; Pocket Kuma; Pterolykos |
| 141 | Skyfowl |

| Page | Classes |
| --- | --- |
| 142 | Boring Ol’ Arcanist; Alchemist; Douchy Wizard School Wand-Maker |
| 143 | Infernocrafter; Prison Tattoo Artist |
| 144–145 | Boring Ol’ Barbarian; Gladiator; Harii; Feral Cat Berserker; Shieldmaiden |
| 145–147 | Boring Ol’ Bard; Artist Alley Mogul; Former Child Actor; NecroBard; Poet Laureate; Professional Roadie; Spellbinder |
| 148 | Boring Ol’ Cleric; Black Inquisitor General; Santero |
| 148–150 | Boring Ol’ Druid; Herbalist; Lifebringer; PHysicker; Shepherd |
| 150–152 | Boring Ol’ Fighter; Pit Fighter; Shotgun Messenger; Straight-to-DVD Action Hero; Sword and Boarder; Monster Truck Driver; Zulu Warrior |
| 152–154 | Boring Ol’ Mage; Blizzardmancer; Crisper; Fire Spiritualist; Forsaken Aerialist; Necromancer |
| 154–155 | Boring Ol’ Monk; Elemental Monk; Prizefighter; Spirit Healer; Street Monk |
| 155–156 | Boring Ol’ Paladin; Cavalier; Sacred Paladin |
| 156–158 | Boring Ol’ Rogue; Bomb Squad Tech; Compensated Anarchist; High Rise Grifter; Identity Thief; Swashbuckler |

### Explicit selection prerequisites and compatibility

| Choice | Requirement | Page |
| --- | --- | --- |
| Amazonian | At least one existing Strength- or Dexterity-based Skill at Rank 5+ | 129 |
| Cat | Already a Cat | 130 |
| Obsidian Butterfly | Any Edged Weapon Skill at Rank 5+ | 136 |
| Sasquatch | Smush at Rank 5+ | 138 |
| Bune | Popularity 3+ | 139 |
| Grulke | Jumping OR Light on Your Feet at Rank 5+ | 139 |
| Hobgoblin | Explosives Handling at Rank 5+ AND any Trap-based Skill at Rank 5+ | 140 |
| Earth Class | Earth Race, identified by the source's Earth symbol | 142 |
| Feral Cat Berserker | Cat-based Race, with examples Cat, Cat Girl, Tigran | 144 |
| Shieldmaiden | Female crawler; identity restrictions are optional under the group's p. 128 policy | 145 |
| Former Child Actor | Popularity 3+ and the Cut! achievement wording; record verified evidence rather than let AI invent it | 146 |
| Monster Truck Driver | Driving at Rank 5+ | 152 |
| Prizefighter | Pugilism at Rank 5+ | 154 |
| Bomb Squad Tech | Boom! achievement | 157 |
| Compensated Anarchist | Popularity 3+ AND Explosives Handling at Rank 5+ | 157 |

Club and worship restrictions are also real requirements, not flavor text:
Cleric-type selection conflicts with Desperado access (p. 148); relevant Paladin
entries repeat that restriction (pp. 155–156). Relevant Rogue entries prohibit
Vanquisher access (pp. 156–158). Deity and Patron choices must be captured where
specified, including Poet Laureate's GM-provided Patron choices (p. 146). A grant of
club access is different from a prerequisite of existing membership. Encode
restrictions per entry and check the pair's combined effects before committing.

### Custom point-buy benefit menu

The following is a paraphrased transcription of the published menu, preserving
costs, numeric limits, and qualifications. It is guidance with examples, not an
exhaustive formula for pricing every imaginable ability. Premade entries with
unique benefits must not be rejected because they cannot be repriced from it.

| Tier / cost | Benefits (each separately priced unless stated) | Page |
| --- | --- | --- |
| Minor / 1 BP | +1 Stat; one Desperado/Vanquisher membership; +1 end-of-floor advancement check for one Skill; permit one Skill to reach 20; apply its Stat Mod twice to a specific noncombat Skill in a common circumstance; a conditional benefit such as Advantage against stone creatures; darkvision or natural light; double resting/mending Mana regeneration in a particular environment; double normal vision distance; tier-1 crafting table once personal space exists; free saferoom room; shop discount/sales bonus/interest, +1 BP for each category; narrowly conditional noncombat benefit once per session | 159 |
| Moderate / 2 BP | +1 Skill/Spell rank, including Passive; heal 1 Health Bar slot on a specified Skill/Spell's damage/kill, maximum 5 per combat; second application of Stat Mod to attacks in a common circumstance; Advantage on one Skill's advancement checks; +1 end-of-floor advancement checks for a linked Skill group; choose a different damage type at combat start for that combat; +1 DR Buff, maximum +3; access any guild of a particular type; unrestricted double resting/mending Mana regeneration; all professional/social clubs; Dungeon Book of the Floor Club; linked Skill group can reach 20; specified attack kills grant Floor-number gold; gain Popularity through specified actions/attacks; Patron benefit; uncommon-type Resistance; environmental-damage Resistance; replace the governing Stat of an ability; add another ability's Stat Mod to specified Skills; apply weapon-specific Skills to another weapon type; healing Spell restores an extra Health Bar slot; cross specified terrain without checks; burrow; breathe underwater | 159 |
| Moderate / 2 BP, continued | +1 all Skills for at most one hour; natural attack whose rank equals Floor, dealing 1d6 + chosen Stat Mod of a chosen type, adding a d6 at ranks 5/10/15 and advancing only by Floor; reassign Race/Class Stat bonuses once per Floor during a Long Rest | 160 |
| Major / 3 BP | Manager-level help; Pet/Mount; a benefit worth up to 4 BP shared by all one's Pets/Mounts; dramatic encounter change once/day; negate one attack's damage once/day; partial Buff once/day such as DR regeneration; limited flight; no breathing plus inhaled-toxin immunity; Rage adds 1 melee damage per lost Health Bar slot; Small size 2 or less; +5 feet Move; +5 feet Step; +1d4 Evade or checks for one Stat; Floor-ranked natural attack as above but d8s; Advantage on one noncombat Skill/Spell; situational damage multiplier up to ×2 for one round; replace Constitution for Health Bar calculation; Climb Move over most surfaces/ceilings | 160 |
| Extreme / 4 BP | +1 rank normally unavailable Skill such as Cockroach/Light on Your Feet; +1 to a thematic group of 3–5 Skills; Advantage on all checks of one Stat; a thematic group of up to six Skills can reach 20; Poison immunity; common-type Resistance; double duration of Spells at Rank 5 or lower; Advantage on all Skills in a limited noncombat setting; extra functional arm; Doppelgänger shapechanging | 160 |
| Epic / 6 BP | +1 to a broad thematic Skill group; all Skills may reach 20; major defense such as common-type immunity or halving the first nine attacks/day; limb regeneration; Advantage on all Skills in broad circumstances; Poison and all-disease immunity; +1 to six or more thematically linked Skills; significant defense such as Advantage on Evade/common-type immunity; flexible form with Stat/Skill changes; Changeling shapeshifting; Advantage on all Skill checks governed by one Stat; unlimited flight | 160 |

The Epic list includes overlapping examples; they are not instructions to award
the same benefit twice. Skill-group membership and common/uncommon damage
classification need reviewed definitions, not labels invented by an AI response.
Cosmetic alterations without mechanical effects cost no BP (p. 158).

### Detriments / refunds

| Refund | Detriment or formula | Page |
| --- | --- | --- |
| +1 BP per 2 Stat penalty points | Aggregate penalties across Stats: −1 Intelligence and −3 Dexterity refunds 2 BP. Do not refund each partial pair separately or round up. | 161 |
| +1 BP per 2 Skill penalty ranks | Aggregate penalties on currently held Skills only. Cannot penalize an unlearned Skill or exceed its existing rank. | 161 |
| +1 BP per −1 | Penalty to all Skills governed by one Stat | 161 |
| Minor / +1 BP | Selection incompatible with a particular club; +1 Mana for non-favored Spells; conditional Disadvantage on a linked Skill group; required worship; forbidden worship; −1 advancement check for one Race/Class Skill at Rank 5+; uncommon-type Vulnerability; halve a broad damage/effect category outside the build's focus; weakness requiring two conditions; postpone a benefit until after Level 50 or Floor 6 | 161 |
| Moderate / +2 BP | Broad weakness with one condition; Skill ranks increase only on Floor descent; limited weapon choices; no Stat Mod for a Race/Class Weapon Skill; +3 Mana for a provided Spell category; Disadvantage on a linked Skill group; prohibited broad useful item/weapon category or Passive Spells | 161 |
| Major / +3 BP | One Stat capped at 10 including gear/potions; common-type Vulnerability | 161 |

Cap the extra usable budget at 5 BP per Race and separately 5 per Class. Keep
earned refunds, usable refunds, spending, and discarded remainder visible. Do
not silently make an over-budget selection legal by discarding an unpaid benefit.

### Ambiguities and recommended interpretations

1. **Order:** the requested fixed sequence differs from p. 128. Recommended:
   Race then Class as the guided screen order, with access to authorized Stat
   distribution before or after choosing. Offer a previewed minimum-allocation
   assistant only when an entry actually defines numerical minima. It spends
   existing authorized points, never creates new points. A compulsory fixed
   order would be an explicit campaign policy rather than the published rule.
2. **Passive cap:** p. 159 says five “points” of Passive Skills per custom Class;
   the worked example on p. 162 explicitly purchases five Passive ranks for
   10 BP and calls that the cap. Recommended: enforce five purchased Passive
   ranks in a custom Class, using the worked example as the interpretation.
3. **Arbitrary ability pricing:** p. 162 shows the GM negotiating prices for
   bespoke effects. Recommended: AI can assemble reviewed, fixed-cost trait IDs;
   novel effects require a GM-priced definition and an auditable ruling.
4. **Eligibility facts:** a missing achievement/Popularity/original species is
   unknown, not zero and not fulfilled. Add GM confirmation for unavailable
   historical facts. Preserve the p. 128 group policy for identity restrictions.
5. **Stat minima:** no universal numerical minimum table was found. Future
   custom minimum definitions must explicitly specify the relevant stat layer
   and whether Race bonuses count; do not assume enhanced gear qualifies.
6. **Custom Earth incentive wording:** p. 158 mentions an Earth Race's Silver
   Earth Box; p. 142 ties the incentive to Earth Classes. Preserve explicit
   source references and require one GM-reviewed reward decision so this does
   not automatically generate duplicate boxes or extra Skill Potion ranks.

## 3. Proposed domain and persistence changes

### Domain

Keep `third-floor.ts` as the selection entry point. Add small pure modules for
versioned definitions, prerequisite expressions, custom builds, and allocation
planning. Use a discriminated trait union, source page, reviewed parameters,
quantity, stacking rule, and automation capability for every effect. Conditional
table-play benefits stay visible as reminders unless their existing subsystem
can enforce them correctly.

Pure helpers should cover `calculateBuildCost`, `calculateDetrimentRefunds`,
`validateCustomBuild`, `evaluateRequirements`, `planMinimumAllocation`, and
`previewSelection`. Results include structured violations and warnings for UI
and AI repair. Race BP, Class BP, and earned level-up Stat points are independent
currencies. Preview and final application use the same rules and versioned data.

Check prerequisites against the correct pre-grant state unless the entry
explicitly allows the selected Race to satisfy a Class condition. A Class must
not award itself the Skill rank required to enter it. Enforce grant caps,
non-stacking defenses, current-Skill-only detriments, group membership, delayed
benefits, and once-only application. Keep health/Mana preservation and existing
equipment/effect projections.

Standard validation applies to players and GMs by default. A separate GM Override
requires the real campaign GM, a reason, and explicit waivers identifying the
failed constraints. Record actor, definition/rules version, and before/after
values. Overrides may waive game constraints; they cannot bypass authorization,
ownership, payload shape, version checks, or once-only persistence safeguards.

### Additive migration boundaries

Exact column names can follow existing SQL conventions during implementation.
Use the next available migration numbers after 018:

| Addition | Purpose and access |
| --- | --- |
| Versioned progression definitions | Official catalog versions plus campaign-scoped custom Race/Class definitions, reviewed trait parameters, source references and GM approval. Owner can draft; GM approves offerable custom content. |
| Selection metadata/drafts | Extend existing Third Floor JSON with definition revisions, selected choices, provisional allocation and application provenance. Only bounded, validated drafts are accepted. Preserve existing selected identity and review flags. |
| Verified progression evidence | Explicit Popularity, achievements, original/current animal identity, clubs/deity/Patron facts and GM provenance. Reuse future achievement tracking rather than create AI-only facts. |
| Audited overrides and benefit review | Extend existing progression history with waivers and reviewed benefit application. Support partially applied legacy grants without replaying the complete package. |
| AI generation/usage records | Purpose/model/rules version, input fingerprint, validated draft, status, bounded usage counters and cooldowns. Scope readable results to the relevant owner/GM. Keep provider credentials server-only. |

Expand checked RPCs and matching SQL validation with catalog/rule parity tests.
The browser and AI must never submit authoritative costs, trusted GM flags, or
arbitrary stat grants. Lock the crawler and check its expected version before
atomically spending authorized points, applying benefits and saving identity.
Revalidate eligibility when offers are accepted, not just when generated.

### Existing crawlers

Preserve all 015 advancement balances and all 018 selections, offers, resources,
and benefit-review states. Existing selected crawlers must not become selectable
again because a new catalog version ships. Keep an immutable legacy definition
snapshot rather than recalculating old benefits against updated definitions.

For manually or partially applied benefits, the GM records which benefits are
already present. Preview only reviewed missing differences and require an
explicit correction to apply them. Identity-only reconciliation remains available
without a grant replay. Track provenance per applied benefit where needed;
never infer prior spending or refill health, Mana, inventory or Favor on migration.

## 4. Modular Groq service

Proposed files (new application code will use the established `src` layout):

| Module | Responsibility |
| --- | --- |
| `src/lib/ai/systemAi.ts` | Server-only orchestration parameterized by a purpose descriptor: prompt builder, response schema, domain validator and request limits. |
| `src/adapters/groq-client.ts` | Official `groq-sdk` client, model configuration, response-format capability, timeout and normalized provider errors. |
| `src/lib/ai/prompts/` | Compact shared System voice plus separate class-suggestion and custom-build builders. Future loot/sponsor/achievement purposes add descriptors. |
| `src/lib/ai/schemas/` | Strict Zod schemas with bounded strings/lists and reviewed catalog IDs. Convert to compatible JSON Schema, then parse and validate responses again. |
| `src/services/system-ai-commands.ts` | Load authorized crawler/evidence, prefilter candidates, minimize context, enforce durable usage limits and deduplicate requests. |
| `src/app/api/system-ai/.../route.ts` | Thin authenticated POST Route Handlers, same-origin protection, bounded input, owner/GM scope, and typed HTTP error responses. |
| Existing selection actions | The only path that applies a chosen build to the crawler; AI endpoints create suggestions/drafts. |

Install `groq-sdk` and `zod` as direct dependencies. `GROQ_API_KEY` is already
configured locally (presence checked without exposing its value). Keep it outside
client bundles, logs and serialized errors. A missing key disables generation
gracefully while manual selection remains available.

Groq currently lists `openai/gpt-oss-20b` as supporting strict JSON-schema output;
the suggested Llama models use JSON-object mode rather than that guarantee.
Recommended: a configurable strict-capable model, initially GPT-OSS 20B if the
account permits it, plus Zod and domain validation in every case. Strict schemas
require closed objects and required fields; nullable values represent optional
data. Source: [Groq structured outputs](https://console.groq.com/docs/structured-outputs).

The current model catalog labels the suggested Llama models Enterprise, so do
not promise their free-tier availability. Account availability and actual limits
remain deployment checks, with no silent model switch or paid-tier fallback.
Source: [Groq model catalog](https://console.groq.com/docs/models).

Keep prompts short: approved candidate IDs, relevant stats/Skills, bounded
background text and verified facts. Do not send whole sourcebooks. Treat crawler
notes as untrusted data. Separate snarky commentary from mechanical selections;
commentary cannot introduce rules, earned rewards or verified achievements.

### Suggestions and generation

- Class suggestions: compute compatible, eligible candidates locally first.
  AI returns up to three candidate IDs, reasons and System commentary. GM reviews
  and publishes the actual three offers through the existing workflow. Unknown
  history cannot be used to satisfy prerequisites.
- Custom Race/Class: AI returns trait IDs, allowed parameters and quantities.
  The pure engine computes BP/refunds and validates all constraints. Allow at most
  one bounded repair attempt for a structurally valid but mechanically illegal
  draft. Invalid/unknown traits do not become GM overrides automatically.
- Owners may request a legal custom draft; it becomes offerable after GM approval.
  Generation never directly changes the crawler's stats or applied identity.

### Rate limits and errors

Use bounded output tokens, timeouts, per-user/campaign cooldowns, an organization
budget, and request deduplication backed by durable storage. On provider 429,
propagate a safe retry delay from `Retry-After`; preserve the user's draft and
show a retry countdown. Do not automatically loop requests from the browser.
Source: [Groq rate limits](https://console.groq.com/docs/rate-limits).

Set an explicit SDK retry policy so the SDK's default retries do not multiply
our own repair/retry behavior. Normalize timeout, missing key, model unavailable,
invalid output, exhausted budget and provider failures into actionable UI errors.
Source: [official Groq TypeScript SDK](https://github.com/groq/groq-typescript).

## 5. Delivery and verification

1. Settle the operation-order interpretation below; retain a source/ruling record.
2. Add the typed rule data, prerequisite evaluator and custom-build engine;
   verify published examples before connecting AI.
3. Add migration/RPC changes and legacy reconciliation coverage; expand the
   selection dialog with Race/Class stages, optional allocation, custom draft
   editor, GM evidence/override review and a final change preview.
4. Add the reusable Groq service and the two generation purposes. Keep manual
   selection usable independently of model availability.
5. Run meaningful domain/service/UI tests and `npm run check`. Cover separate
   budgets, lost leftovers, refund caps, passive ranks, illegal linked groups,
   duplicate Resistance, Skill penalties, 10/15/20 caps, Floor 6 activation,
   unmet/unknown prerequisites and allocation conservation.
6. Run migration upgrade and SQL permission suites: preserve 015/018 data,
   prevent double grants, reject stale saves and forged overrides, and verify
   owner/GM/campaign isolation. Test mocked AI malformed JSON, unknown IDs,
   illegal builds, 429, timeout, missing key and unavailable models without
   requiring paid API calls in the test suite.
7. Verify GM/player sessions, existing crawler review, responsive dialogs and
   one opt-in live Groq request in the actual app. Record unperformed environment
   checks honestly in `PROJECT_PLAN.md`.

Discovery-only verification: readable project/PDF access, clean starting Git
state, code/data flow inspection, source text extraction and targeted visual
checks. Application tests were not rerun because application code did not change.

**Approved decision:** the user accepted the official flexible allocation order
with a Race→Class guided UI and an optional previewed minimum-allocation assistant,
along with all five other recommended interpretations above. Subsequent full
ingestion corrected cross-page assignments (Sasquatch and Poet Laureate), checked
all Class Earth symbols, and found that the Dungeon Dad example's itemized prices
exceed its budget by four BP. The printed cost table remains authoritative unless
the GM records a pricing/budget ruling. See the implementation record for details.
