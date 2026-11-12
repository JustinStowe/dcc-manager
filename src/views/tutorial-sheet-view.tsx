import type { Crawler } from '@/domain';
import { STAT_KEYS, TUTORIAL_CATALOG, tutorialModifier, type TutorialProfile } from '@/domain/tutorial';
import { CampaignForm } from '@/components/campaign-form';
import { TutorialStatsEditor } from '@/components/tutorial-stats-editor';
import styles from '@/styles/campaign.module.css';
import type { InventoryItem } from '@/domain/inventory';
import { InventoryView } from '@/views/inventory-view';
import { loadoutTotals, type CrawlerLoadout } from '@/domain/loadout';
import { HotlistView } from '@/views/hotlist-view';
import { AbilitiesView } from '@/views/abilities-view';
import { abilityCheckBonus, type LearnedAbility } from '@/domain/abilities';
import { loadoutAction } from '@/app/campaign/loadout-actions';

type SheetProps = { crawler: Crawler; profile: TutorialProfile; number: number; version: string; isGm: boolean; inventory: readonly InventoryItem[]; loadout?: CrawlerLoadout; learned?: readonly LearnedAbility[] };
function SheetControls({ crawler, profile, number, version, isGm, loadout }: Pick<SheetProps, 'crawler' | 'profile' | 'number' | 'version' | 'isGm' | 'loadout'>) {
  const hidden = <><input type="hidden" name="crawlerId" value={crawler.id} /><input type="hidden" name="version" value={version} /></>;
  return <>
    <details className={styles.sheetControls}><summary>Health, Mana &amp; Favor controls</summary><div className={styles.controlGrid}>
    <CampaignForm campaignId={crawler.campaignId} label="Record damage or healing received">
      {hidden}<label>Action<select name="operation" defaultValue="tutorial-damage"><option value="tutorial-damage">Final net damage (DR already applied)</option><option value="tutorial-heal-slots">Healing received, in slots</option></select></label>
      <label>Amount<input name="amount" type="number" min={1} step={1} required defaultValue={1} /></label>
      <p>For damage, apply DR, elemental defenses, and other effects first. Each hit loses whole slots; leftover damage is discarded. Healing restores slots directly.</p><button type="submit">Save health change</button>
    </CampaignForm>
    <CampaignForm campaignId={crawler.campaignId} submitAction={loadoutAction} label="Raw damage with automatic DR">
      {hidden}<input type="hidden" name="operation" value="damage-dr" /><label>Raw damage<input name="amount" type="number" min={1} step={1} required defaultValue={1} /></label>
      <p>Subtracts total DR once, then converts to health slots. Use only when no elemental or other adjustments apply. For those effects, apply DR first at the table, then record final net damage above.</p><button type="submit">Apply raw damage with DR</button>
    </CampaignForm>
    <CampaignForm campaignId={crawler.campaignId} label="Cast Heal on yourself">
      {hidden}<input type="hidden" name="operation" value="tutorial-cast-heal" />
      <button type="submit" disabled={crawler.currentSegments === 0 || profile.mana < 2}>Spend 2 Mana and heal 2 slots</button>
      <p>A Dying crawler cannot cast. Use healing received when someone else heals you.</p>
    </CampaignForm>
    <CampaignForm campaignId={crawler.campaignId} label="Track Mana">
      {hidden}<label>Action<select name="operation"><option value="tutorial-mana-spend">Spend Mana</option><option value="tutorial-mana-recover">Recover Mana</option></select></label>
      <label>Amount<input name="amount" type="number" min={1} required defaultValue={1} /></label><button type="submit">Save Mana change</button>
    </CampaignForm>
    <CampaignForm campaignId={crawler.campaignId} label="Spend AI Favor">
      {hidden}<input type="hidden" name="operation" value="tutorial-favor-spend" /><button type="submit" disabled={profile.favor < 1}>Spend 1 AI Favor</button>
      <p>Use once per Check for a reroll before the result (never a Natural 1), or once per round for an extra non-Attack Action. Confirm those limits at the table.</p>
    </CampaignForm>
    </div></details>
    {isGm && <details className={styles.gmControls}><summary>GM corrections &amp; awards</summary><div className={styles.controlGrid}>

      <CampaignForm campaignId={crawler.campaignId} label="Award AI Favor">{hidden}<input type="hidden" name="operation" value="tutorial-favor-award" /><label>Amount<input name="amount" type="number" min={1} max={2147483647} required defaultValue={1} /></label><button type="submit">Award Favor</button></CampaignForm>
      <CampaignForm campaignId={crawler.campaignId} label="GM stat corrections" key={version}>{hidden}<input type="hidden" name="operation" value="tutorial-stats" /><TutorialStatsEditor initial={loadout?.baseline ?? profile.stats} /><p>Enhanced here means BEFORE equipment. Non-gear adjustment is Enhanced minus Unenhanced. Gear is added separately. Health slots stay unchanged; falling Mana maxima clamp current Mana and increasing maxima never refill it.</p><button type="submit">Save reviewed baseline</button></CampaignForm>
      <CampaignForm campaignId={crawler.campaignId} submitAction={loadoutAction} label="GM non-gear damage resistance" key={`dr-${version}`}>{hidden}<input type="hidden" name="operation" value="defense" /><label>Non-gear DR<input name="amount" type="number" min={0} max={10000} required defaultValue={loadout?.defenseBase ?? 0} /></label><p>Include only reviewed DR from non-equipment sources. Equipped item DR is added automatically.</p><button type="submit">Save non-gear DR</button></CampaignForm>
      <CampaignForm campaignId={crawler.campaignId} label="GM Crawler Number correction" key={`number-${version}`}>{hidden}<input type="hidden" name="operation" value="tutorial-number" /><label>Crawler Number<input name="crawlerNumber" type="number" min={1} max={2147483647} defaultValue={number} required /></label><button type="submit">Save number</button></CampaignForm>
    </div></details>}
  </>;
}
function IdentityField({ name, value }: { name: string; value: string }) {
  return <div className={styles.identityField}><dt>{name}</dt><dd>{value}</dd></div>;
}
export function TutorialSheetView({ crawler, profile, number, version, isGm, inventory, loadout, learned }: SheetProps) {
  const combat = TUTORIAL_CATALOG.combat.find((item) => item.id === profile.combatId);

  const baseline = loadout?.baseline ?? profile.stats;
  const totals = loadoutTotals(baseline, inventory, loadout?.defenseBase ?? 0);
  return <section className={styles.sheet} id="crawler-record" aria-label={`${crawler.name} character sheet`}>
    <header className={styles.sheetHeader}>
      <div className={styles.sheetBrand}><span>Dungeon</span><strong>Crawler</strong><b>Record</b></div>
      <div className={styles.identity}>
        <div className={styles.sheetName}><span>Name</span><h2>{crawler.name}</h2></div>
        <dl className={styles.identityGrid}>
          <IdentityField name="Race" value="Human" /><IdentityField name="Gender / pronouns" value={profile.pronouns || 'Not specified'} />
          <IdentityField name="Level" value="1" /><IdentityField name="Crawler Number" value={`#${number.toLocaleString('en-US')}`} />
          <IdentityField name="Class" value="Third Floor selection" /><IdentityField name="Floor" value="1" />
        </dl>
      </div>
    </header>
    {loadout && <HotlistView campaignId={crawler.campaignId} crawlerId={crawler.id} version={version} hotlist={loadout.hotlist} inventory={inventory} profile={profile} healthSlots={crawler.currentSegments} learned={learned} />}
    <div className={styles.sheetBody}>
      <aside className={styles.attributeColumn} aria-label="Core attributes">
        <dl>{STAT_KEYS.map((key) => <div key={key} className={styles.attributeBox}>
          <dt>{key}</dt><dd className={styles.attributePair}>
            <span><b>{profile.stats[key].enhanced}</b><small>Enhanced</small></span><i aria-hidden="true">/</i><span><b>{profile.stats[key].base}</b><small>Unenhanced</small></span>
          </dd><dd className={styles.attributeModifier}><span>{key.slice(0, 3).toUpperCase()} MOD</span><strong>+{tutorialModifier(profile.stats[key].enhanced)}</strong></dd>
        </div>)}</dl>
      </aside>
      <div className={styles.sheetMain}>
        <div className={styles.healthHeading}><h3>Health</h3><strong>{crawler.currentSegments * 10}% · {crawler.currentSegments}/10 slots{crawler.currentSegments === 0 ? ' · Dying' : ''}</strong></div>
        <div className={styles.healthSlots} role="meter" aria-label="Health" aria-valuemin={0} aria-valuemax={10} aria-valuenow={crawler.currentSegments} aria-valuetext={`${crawler.currentSegments * 10}% health${crawler.currentSegments === 0 ? ', Dying' : ''}`}>
          {Array.from({ length: 10 }, (_, i) => <span key={i} className={`${styles.healthSlot} ${styles[`healthSlot${i + 1}`]}`} data-filled={i < crawler.currentSegments} aria-hidden="true"><b>{i < crawler.currentSegments ? '●' : '×'}</b><small>{(i + 1) * 10}%</small></span>)}
        </div>
        <p className={styles.sheetHint}>Each slot absorbs {tutorialModifier(profile.stats.constitution.enhanced)} net damage. Resolve defenses first; each hit discards leftover damage.</p>
        <dl className={styles.resourceGrid}>
          <div className={styles.manaResource}><dt>Mana · current / max</dt><dd>{profile.mana}<span> / {profile.stats.intelligence.enhanced}</span></dd></div>
          <div><dt>AI Favor</dt><dd>{profile.favor}</dd></div><div><dt>Move</dt><dd>20 <small>ft</small></dd></div><div><dt>Step</dt><dd>10 <small>ft</small></dd></div><div><dt>Size</dt><dd>Medium <small>(4)</small></dd></div>
        </dl>
        <div className={styles.defenseGrid}><div><span>Evade</span><strong>d20 + {totals.evade}</strong><small>DEX modifier + {totals.gear.evade} gear; other Buffs manual</small></div><div><span>Damage resistance</span><strong>{totals.dr} DR</strong><small>{loadout?.defenseBase ?? 0} non-gear + {totals.gear.dr} equipped gear</small></div></div>
        <details className={styles.sheetControls}><summary>Stat and defense breakdown</summary><div className={styles.tableScroll}><table className={styles.sheetTable}><thead><tr><th>Stat</th><th>Unenhanced</th><th>GM / non-gear</th><th>Gear</th><th>Enhanced</th></tr></thead><tbody>{STAT_KEYS.map((key) => <tr key={key}><td>{key}</td><td>{baseline[key].base}</td><td>{baseline[key].enhanced - baseline[key].base}</td><td>+{totals.gear[key]}</td><td>{profile.stats[key].enhanced}</td></tr>)}</tbody></table></div></details>
        <SheetControls crawler={crawler} profile={profile} number={number} version={version} isGm={isGm} loadout={loadout} />
        <section className={styles.sheetSection}><h3>Attacks</h3><div className={styles.tableScroll}><table className={styles.sheetTable}><caption className={styles.sheetHint}>Current learned attacks · resolve damage and rank upgrades at the table</caption><thead><tr><th>Name</th><th>Rank</th><th>Check</th><th>Base damage (ranks 0–4)</th></tr></thead><tbody>{learned?.filter((ability) => ability.kind === 'attack' || (ability.kind === 'spell' && !ability.passive)).map((ability) => <tr key={ability.id}><td>{ability.name}</td><td>{ability.rank}</td><td>{abilityCheckBonus(ability,profile) === null ? '—' : `d20 + ${abilityCheckBonus(ability,profile)}`}</td><td>{ability.damage || 'See rules'}</td></tr>)}</tbody></table></div></section>
        {learned ? <AbilitiesView campaignId={crawler.campaignId} crawlerId={crawler.id} version={version} abilities={learned} profile={profile} isGm={isGm} hotlist={loadout?.hotlist} healthSlots={crawler.currentSegments} /> : <p role="alert">Learned abilities unavailable. Apply the learned skills migration and refresh.</p>}
      </div>
    </div>
    <div className={styles.sheetFooter}>
      <InventoryView campaignId={crawler.campaignId} crawlerId={crawler.id} version={version} items={inventory} isGm={isGm} mana={profile.mana} maxMana={profile.stats.intelligence.enhanced} healthSlots={crawler.currentSegments} baseline={baseline} />
      {combat?.kind === 'spell' && <p className={styles.sheetHint}>Starting allowance: five Standard Mana Potions, granted once to new game crawlers. Existing stacks require GM effect identification; this is not a refill.</p>}
      <details className={styles.storyDetails}><summary>Story &amp; starting gear notes</summary><dl className={styles.storyGrid}>{Object.entries(profile.notes).map(([key, value]) => <div key={key}><dt>{key === 'looseEnds' ? 'Loose ends' : key === 'gear' ? 'Original starting gear' : key}</dt><dd className={styles.notes}>{value || 'Not recorded'}</dd></div>)}</dl></details>
    </div>
  </section>;
}
