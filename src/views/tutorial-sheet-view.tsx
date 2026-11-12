import { HealthManager } from '@/components/health-manager';
import { FavorManager } from '@/components/favor-manager';
import { SheetInlineEdit } from '@/components/sheet-inline-edit';
import { SheetAttributes } from '@/components/sheet-attributes';
import { StatModifiers } from '@/components/stat-modifiers';
import type { SheetMetadata } from '@/domain/sheet';
import type { Crawler } from '@/domain';
import { STAT_KEYS, TUTORIAL_CATALOG, tutorialModifier, type TutorialProfile } from '@/domain/tutorial';
import styles from '@/styles/campaign.module.css';
import type { InventoryItem } from '@/domain/inventory';
import { InventoryView } from '@/views/inventory-view';
import { loadoutTotals, type CrawlerLoadout } from '@/domain/loadout';
import { HotlistView } from '@/views/hotlist-view';
import { AbilitiesView } from '@/views/abilities-view';
import { abilityCheckBonus, type LearnedAbility } from '@/domain/abilities';

type SheetProps = { crawler: Crawler; profile: TutorialProfile; number: number; version: string; isGm: boolean; inventory: readonly InventoryItem[]; loadout?: CrawlerLoadout; learned?: readonly LearnedAbility[]; metadata?: SheetMetadata };
function IdentityField({ name, value }: { name: string; value: string }) {
  return <div className={styles.identityField}><dt>{name}</dt><dd>{value}</dd></div>;
}
export function TutorialSheetView({ crawler, profile, number, version, isGm, inventory, loadout, learned, metadata }: SheetProps) {
  const combat = TUTORIAL_CATALOG.combat.find((item) => item.id === profile.combatId);

  const context={campaignId:crawler.campaignId,crawlerId:crawler.id,version};
  const floor=metadata?.floor??1;
  const baseline = loadout?.baseline ?? profile.stats;
  const totals = loadoutTotals(baseline, inventory, loadout?.defenseBase ?? 0);
  return <section className={styles.sheet} id="crawler-record" aria-label={`${crawler.name} character sheet`}>
    <header className={styles.sheetHeader}>
      <div className={styles.sheetBrand}><span>Dungeon</span><strong>Crawler</strong><b>Record</b></div>
      <div className={styles.identity}>
        <div className={styles.sheetName}><span>Name</span><h2><SheetInlineEdit context={context} field="name" label="Crawler name" value={crawler.name} editable={!isGm} /></h2></div>
        <dl className={styles.identityGrid}>
          <IdentityField name="Race" value="Human" /><IdentityField name="Gender / pronouns" value={profile.pronouns || 'Not specified'} />
          <div className={styles.identityField}><dt>Level</dt><dd><SheetInlineEdit context={context} field="level" label="Level" value={metadata?.level??1} max={1000} editable={isGm} /></dd></div><div className={styles.identityField}><dt>Crawler Number</dt><dd><SheetInlineEdit context={context} field="number" label="Crawler Number" value={number} prefix="#" editable={isGm} /></dd></div>
          <IdentityField name="Class" value="Third Floor selection" /><div className={styles.identityField}><dt>Floor</dt><dd><SheetInlineEdit context={context} field="floor" label="Floor" value={floor} max={18} editable={isGm} /></dd></div>
        </dl>
      </div>
    </header>
    {loadout && <HotlistView campaignId={crawler.campaignId} crawlerId={crawler.id} version={version} hotlist={loadout.hotlist} inventory={inventory} profile={profile} healthSlots={crawler.currentSegments} learned={learned} />}
    <div className={styles.sheetBody}>
      <SheetAttributes context={context} profile={profile} isGm={isGm} />
      <div className={styles.sheetMain}>
        <div className={styles.healthHeading}><div className={styles.healthTitle}><h3>Health</h3><HealthManager context={context} slots={crawler.currentSegments} constitution={profile.stats.constitution.enhanced} dr={totals.dr} /></div><strong>{crawler.currentSegments * 10}% · {crawler.currentSegments}/10 slots{crawler.currentSegments === 0 ? ' · Dying' : ''}</strong></div>
        <div className={styles.healthSlots} role="meter" aria-label="Health" aria-valuemin={0} aria-valuemax={10} aria-valuenow={crawler.currentSegments} aria-valuetext={`${crawler.currentSegments * 10}% health${crawler.currentSegments === 0 ? ', Dying' : ''}`}>
          {Array.from({ length: 10 }, (_, i) => <span key={i} className={`${styles.healthSlot} ${styles[`healthSlot${i + 1}`]}`} data-filled={i < crawler.currentSegments} aria-hidden="true"><b>{i < crawler.currentSegments ? '●' : '×'}</b><small>{(i + 1) * 10}%</small></span>)}
        </div>
        <p className={styles.sheetHint}>Each slot absorbs {tutorialModifier(profile.stats.constitution.enhanced)} net damage. Resolve defenses first; each hit discards leftover damage.</p>
        <dl className={styles.resourceGrid}>
          <div className={styles.manaResource}><dt>Mana · current / max</dt><dd><SheetInlineEdit context={context} field="mana" label="Current Mana" value={profile.mana} min={0} max={profile.stats.intelligence.enhanced} editable /><span> / {profile.stats.intelligence.enhanced}</span></dd></div>
          <div className={styles.favorResource}><dt className={styles.visuallyHidden}>AI Favor</dt><dd><FavorManager context={context} favor={profile.favor} isGm={isGm} /></dd></div><div><dt>Move</dt><dd>20 <small>ft</small></dd></div><div><dt>Step</dt><dd>10 <small>ft</small></dd></div><div><dt>Size</dt><dd>Medium <small>(4)</small></dd></div>
        </dl>
        <div className={styles.defenseGrid}><div><span>Evade</span><strong>d20 + {totals.evade}</strong><small>DEX modifier + {totals.gear.evade} gear; other Buffs manual</small></div><div><span>Damage resistance</span><strong>{totals.dr} DR</strong><small>{loadout?.defenseBase ?? 0} non-gear + {totals.gear.dr} equipped gear</small></div></div>
        <details className={styles.sheetControls}><summary>Stat and defense breakdown</summary><div className={styles.tableScroll}><table className={styles.sheetTable}><thead><tr><th>Stat</th><th>Unenhanced</th><th>Active modifiers</th><th>Gear</th><th>Enhanced</th></tr></thead><tbody>{STAT_KEYS.map((key) => <tr key={key}><td>{key}</td><td>{baseline[key].base}</td><td>{baseline[key].enhanced - baseline[key].base}</td><td>+{totals.gear[key]}</td><td>{profile.stats[key].enhanced}</td></tr>)}</tbody></table></div></details>
        {isGm && metadata && <StatModifiers context={context} effects={metadata.effects} defenseBase={loadout?.defenseBase??0} />}
        <section className={styles.sheetSection}><h3>Attacks</h3><div className={styles.tableScroll}><table className={styles.sheetTable}><caption className={styles.sheetHint}>Current learned attacks · resolve damage and rank upgrades at the table</caption><thead><tr><th>Name</th><th>Rank</th><th>Check</th><th>Base damage (ranks 0–4)</th></tr></thead><tbody>{learned?.filter((ability) => ability.kind === 'attack' || (ability.kind === 'spell' && !ability.passive)).map((ability) => <tr key={ability.id}><td>{ability.name}</td><td>{ability.rank}</td><td>{abilityCheckBonus(ability,profile,floor) === null ? '—' : `d20 + ${abilityCheckBonus(ability,profile,floor)}`}</td><td>{ability.damage || 'See rules'}</td></tr>)}</tbody></table></div></section>
        {learned ? <AbilitiesView campaignId={crawler.campaignId} crawlerId={crawler.id} version={version} abilities={learned} profile={profile} isGm={isGm} floor={floor} hotlist={loadout?.hotlist} healthSlots={crawler.currentSegments} /> : <p role="alert">Learned abilities unavailable. Apply the learned skills migration and refresh.</p>}
      </div>
    </div>
    <div className={styles.sheetFooter}>
      <InventoryView campaignId={crawler.campaignId} crawlerId={crawler.id} version={version} items={inventory} isGm={isGm} mana={profile.mana} maxMana={profile.stats.intelligence.enhanced} healthSlots={crawler.currentSegments} baseline={baseline} />
      {combat?.kind === 'spell' && <p className={styles.sheetHint}>Starting allowance: five Standard Mana Potions, granted once to new game crawlers. Existing stacks require GM effect identification; this is not a refill.</p>}
      <details className={styles.storyDetails}><summary>Story &amp; starting gear notes</summary><dl className={styles.storyGrid}>{Object.entries(profile.notes).map(([key, value]) => <div key={key}><dt>{key === 'looseEnds' ? 'Loose ends' : key === 'gear' ? 'Original starting gear' : key}</dt><dd className={styles.notes}>{value || 'Not recorded'}</dd></div>)}</dl></details>
    </div>
  </section>;
}
