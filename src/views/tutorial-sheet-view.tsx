import type { Crawler } from '@/domain';
import { STAT_KEYS, TUTORIAL_CATALOG, tutorialModifier, tutorialSkills, type TutorialProfile } from '@/domain/tutorial';
import { CampaignForm } from '@/components/campaign-form';
import { TutorialStatsEditor } from '@/components/tutorial-stats-editor';
import styles from '@/styles/campaign.module.css';
import type { InventoryItem } from '@/domain/inventory';
import { InventoryView } from '@/views/inventory-view';

type SheetProps = { crawler: Crawler; profile: TutorialProfile; number: number; version: string; isGm: boolean; inventory: readonly InventoryItem[] };
function SheetControls({ crawler, profile, number, version, isGm }: Pick<SheetProps, 'crawler' | 'profile' | 'number' | 'version' | 'isGm'>) {
  const hidden = <><input type="hidden" name="crawlerId" value={crawler.id} /><input type="hidden" name="version" value={version} /></>;
  return <>
    <details className={styles.sheetControls}><summary>Health, Mana &amp; Favor controls</summary><div className={styles.controlGrid}>
    <CampaignForm campaignId={crawler.campaignId} label="Record damage or healing received">
      {hidden}<label>Action<select name="operation" defaultValue="tutorial-damage"><option value="tutorial-damage">Damage after defenses</option><option value="tutorial-heal-slots">Healing received, in slots</option></select></label>
      <label>Amount<input name="amount" type="number" min={1} step={1} required defaultValue={1} /></label>
      <p>For damage, apply DR, elemental defenses, and other effects first. Each hit loses whole slots; leftover damage is discarded. Healing restores slots directly.</p><button type="submit">Save health change</button>
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
      <CampaignForm campaignId={crawler.campaignId} label="GM stat corrections" key={version}>{hidden}<input type="hidden" name="operation" value="tutorial-stats" /><TutorialStatsEditor initial={profile.stats} /><p>Health slots stay unchanged. Mana is clamped if its maximum falls; increasing stats does not refill it.</p><button type="submit">Save reviewed stats</button></CampaignForm>
      <CampaignForm campaignId={crawler.campaignId} label="GM Crawler Number correction" key={`number-${version}`}>{hidden}<input type="hidden" name="operation" value="tutorial-number" /><label>Crawler Number<input name="crawlerNumber" type="number" min={1} max={2147483647} defaultValue={number} required /></label><button type="submit">Save number</button></CampaignForm>
    </div></details>}
  </>;
}
function IdentityField({ name, value }: { name: string; value: string }) {
  return <div className={styles.identityField}><dt>{name}</dt><dd>{value}</dd></div>;
}
export function TutorialSheetView({ crawler, profile, number, version, isGm, inventory }: SheetProps) {
  const combat = TUTORIAL_CATALOG.combat.find((item) => item.id === profile.combatId);
  const skills = tutorialSkills(profile);
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
        <div className={styles.defenseGrid}><div><span>Evade</span><strong>d20 + {tutorialModifier(profile.stats.dexterity.enhanced)}</strong><small>DEX modifier, before Buffs</small></div><div><span>Damage resistance &amp; Buffs</span><strong>Resolve at the table</strong><small>See equipment notes; bonuses are not automated</small></div></div>
        <SheetControls crawler={crawler} profile={profile} number={number} version={version} isGm={isGm} />
        <section className={styles.sheetSection}><h3>Attacks</h3>
          <div className={styles.tableScroll}><table className={styles.sheetTable}><caption className={styles.sheetHint}>Starting combat Skills · confirm attack and damage rules at the table</caption><thead><tr><th>Name</th><th>Rank</th><th>Stat / effects</th></tr></thead><tbody>
            <tr><td>Unarmed Combat</td><td>3</td><td>Strength</td></tr><tr><td>{combat?.name}</td><td>3</td><td>{combat?.effect ? `${combat.effect} (Rank 3)` : combat?.kind === 'spell' ? 'Attack Spell' : 'See weapon description'}</td></tr>
          </tbody></table></div>
        </section>
        <section className={styles.sheetSection}><h3>Skills &amp; Spells</h3><div className={styles.tableScroll}><table className={styles.sheetTable}><caption className={styles.sheetHint}>Starting ranks · Heal costs 2 Mana to restore 2 health slots</caption><thead><tr><th>Skill</th><th>Rank</th><th>Stat</th></tr></thead><tbody>{skills.map((skill) => <tr key={skill.name}><td>{skill.name}</td><td>{skill.rank}</td><td>{skill.stat ?? 'See rules'}</td></tr>)}</tbody></table></div></section>
      </div>
    </div>
    <div className={styles.sheetFooter}>
      <InventoryView campaignId={crawler.campaignId} crawlerId={crawler.id} version={version} items={inventory} isGm={isGm} mana={profile.mana} maxMana={profile.stats.intelligence.enhanced} healthSlots={crawler.currentSegments} />
      {combat?.kind === 'spell' && <p className={styles.sheetHint}>Starting allowance: five Standard Mana Potions, granted once to new game crawlers. Existing stacks require GM effect identification; this is not a refill.</p>}
      <details className={styles.storyDetails}><summary>Story &amp; starting gear notes</summary><dl className={styles.storyGrid}>{Object.entries(profile.notes).map(([key, value]) => <div key={key}><dt>{key === 'looseEnds' ? 'Loose ends' : key === 'gear' ? 'Original starting gear' : key}</dt><dd className={styles.notes}>{value || 'Not recorded'}</dd></div>)}</dl></details>
    </div>
  </section>;
}
