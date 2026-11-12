import { CampaignForm } from '@/components/campaign-form';
import { skillAction } from '@/app/campaign/skill-actions';
import { ABILITY_CATALOG, abilityCheckBonus, canMarkAbility, type LearnedAbility } from '@/domain/abilities';
import { STAT_KEYS, type TutorialProfile } from '@/domain/tutorial';
import type { Hotlist } from '@/domain/loadout';
import styles from '@/styles/campaign.module.css';

function DefinitionFields({ ability }: { ability?: LearnedAbility }) {
  return <>
    <label>Name<input name="name" maxLength={120} required defaultValue={ability?.name} /></label>
    <label>Kind<select name="kind" defaultValue={ability?.kind ?? 'skill'}><option value="skill">Skill</option><option value="attack">Attack</option><option value="spell">Spell</option><option value="effect">Damage Effect</option></select></label>
    <label>Current rank<input name="rank" type="number" min={1} max={20} required defaultValue={ability?.rank ?? 1} /></label>
    <label>Reviewed rank limit<input name="maxRank" type="number" min={1} max={20} required defaultValue={ability?.maxRank ?? 15} /></label>
    <label>Governing stat<select name="stat" defaultValue={ability?.stat ?? 'none'}><option value="none">None / passive</option>{STAT_KEYS.map((stat) => <option key={stat} value={stat}>{stat}</option>)}</select></label>
    <label><input type="checkbox" name="passive" value="yes" defaultChecked={ability?.passive} /> Passive (no ordinary Check)</label>
    <label>Advancement policy<select name="advancement" defaultValue={ability?.advancement ?? 'normal'}><option value="normal">Ordinary use marks</option><option value="special">Special condition</option><option value="none">No ordinary marks</option></select></label>
    <label>Final Mana cost (Spells only)<input name="manaCost" type="number" min={0} max={10000} defaultValue={ability?.manaCost ?? 0} /></label>
    <label>Description<textarea name="description" maxLength={2000} defaultValue={ability?.description} /></label>
    <label>Rules reference<input name="reference" maxLength={200} defaultValue={ability?.reference} /></label>
    <label>Base damage reference (ranks 0–4)<input name="damage" maxLength={120} defaultValue={ability?.damage} /></label>
    <label>Range reference<input name="range" maxLength={80} defaultValue={ability?.range} /></label>
    <label><input type="checkbox" name="reviewed" value="yes" required /> GM reviewed the definition, final cost, passive status, and rank limit.</label>
  </>;
}
export function AbilitiesView({ campaignId, crawlerId, version, abilities, profile, isGm, hotlist, healthSlots, floor=1 }: {
  campaignId: string; crawlerId: string; version: string; abilities: readonly LearnedAbility[]; profile: TutorialProfile;
  isGm: boolean; hotlist?: Hotlist; healthSlots: number; floor?: number;
}) {
  const hidden = <><input type="hidden" name="crawlerId" value={crawlerId} /><input type="hidden" name="version" value={version} /></>;
  const catalog = ABILITY_CATALOG.filter((entry) => entry.id !== 'heal' && !abilities.some((ability) => ability.name.toLowerCase() === entry.name.toLowerCase()));
  return <section className={styles.sheetSection}><h3>Learned Skills &amp; Spells</h3>
    <p className={styles.sheetHint}>Mark attempted Checks whether they succeed or fail. Marks do not change rank. The GM resolves marked ranks 1–4 every two hours and ranks 5–14 at floor end. Ordinary advancement stops at rank 15; benefits above 15 remain inactive until Floor 6.</p>
    <p className={styles.sheetHint}>Passive abilities usually receive no marks. Confirm special conditions; mark only one hand-to-hand Skill or Damage Effect per attack. Resolve damage, targets, cooldowns, and special effects at the table.</p>
    <div className={styles.tableScroll}><table className={styles.sheetTable}><thead><tr><th>Ability</th><th>Kind</th><th>Rank / limit</th><th>Check</th><th>Mana</th><th>Advancement</th></tr></thead><tbody>{abilities.map((ability) => {
      const bonus = abilityCheckBonus(ability,profile,floor);
      return <tr key={ability.id}><td>{ability.name}</td><td>{ability.passive ? 'Passive ' : ''}{ability.kind}</td><td>{ability.rank} / {ability.maxRank}{ability.rank > 15 && floor < 6 ? ' (effective 15)' : ''}</td><td>{bonus === null ? '—' : `d20 ${bonus >= 0 ? '+' : '−'} ${Math.abs(bonus)} (${ability.stat})`}</td><td>{ability.manaCost ?? '—'}</td><td>{ability.marked ? '✓ Marked' : canMarkAbility(ability) ? ability.advancement === 'special' ? 'Special condition' : 'Unmarked' : 'Not eligible'}</td></tr>;
    })}</tbody></table></div>
    <details className={styles.sheetControls}><summary>Mark, inspect &amp; manage abilities</summary>
      {abilities.map((ability) => <details key={ability.id} name={`ability-${crawlerId}`} className={styles.sheetControls}><summary>{ability.name} · Rank {ability.rank}{ability.marked ? ' · Marked' : ''}</summary>
        <p>{ability.description || 'No description recorded.'}</p><p className={styles.sheetHint}>{ability.reference}{ability.damage ? ` · Base ranks 0–4 damage: ${ability.damage}; rank upgrades manual.` : ''}{ability.range ? ` · Range: ${ability.range}` : ''}</p>
        {ability.lastAdvancement && <p>Last advancement: d20 {ability.lastAdvancement.die} + ({ability.lastAdvancement.modifier}); Rank {ability.lastAdvancement.fromRank} → {ability.lastAdvancement.toRank}. Mark cleared.</p>}
        <div className={styles.controlGrid}>
        {(ability.marked || canMarkAbility(ability)) && <CampaignForm campaignId={campaignId} submitAction={skillAction} label={`${ability.marked ? 'Clear' : 'Mark'} ${ability.name}`}>
          {hidden}<input type="hidden" name="operation" value="mark" /><input type="hidden" name="skillId" value={ability.id} /><input type="hidden" name="marked" value={ability.marked ? 'false' : 'true'} />
          {!ability.marked && ability.advancement === 'special' && <label><input type="checkbox" name="qualifying" value="yes" required /> Special condition met; no second hand-to-hand Skill / Effect marked for this attack.</label>}
          <p>Rank stays unchanged until the GM records an advancement result.</p><button type="submit">{ability.marked ? 'Clear mark' : 'Mark for advancement'}</button>
        </CampaignForm>}
        {ability.kind === 'spell' && <CampaignForm campaignId={campaignId} submitAction={skillAction} label={`Cast ${ability.name}`}>
          {hidden}<input type="hidden" name="operation" value="cast" /><input type="hidden" name="skillId" value={ability.id} />
          <p>{ability.automation === 'tutorial-heal' ? 'Spend 2 Mana and restore up to 2 health slots.' : `Spend the reviewed ${ability.manaCost} Mana. Apply eligible advancement policy; resolve Check and effects at the table.`}</p>
          <label><input type="checkbox" name="confirmed" value="yes" required /> Casting conditions, final Mana cost, and Action / Interrupt timing confirmed.</label>
          <button type="submit" disabled={healthSlots === 0 || profile.mana < (ability.manaCost ?? 0) || !hotlist?.some((slot) => slot?.kind === 'skill' && slot.target === ability.id)}>Cast prepared Spell</button><p className={styles.sheetHint}>Requires a Hotlist slot and sufficient Mana.</p>
        </CampaignForm>}
        {isGm && ability.marked && <CampaignForm campaignId={campaignId} submitAction={skillAction} label={`Resolve ${ability.name} advancement`}>
          {hidden}<input type="hidden" name="operation" value="advance" /><input type="hidden" name="skillId" value={ability.id} /><input type="hidden" name="window" value={ability.rank <= 4 ? 'two-hour' : 'floor-end'} />
          <p>{ability.rank <= 4 ? 'Two-hour' : 'Floor-end'} advancement: d20 + modifier ≥ rank increases rank by one. Clear mark on either result.</p>
          <label>d20 roll<input name="die" type="number" min={1} max={20} required /></label><label>Reviewed modifier<input name="modifier" type="number" min={-100} max={100} defaultValue={0} required /></label>
          <label><input name="reviewed" value="yes" type="checkbox" required /> Appropriate advancement window reached and roll reviewed by GM.</label><button type="submit">Record advancement result</button>
        </CampaignForm>}
        {isGm && ability.id !== 'heal' && <>
          <details><summary>GM definition / rank correction</summary><CampaignForm campaignId={campaignId} submitAction={skillAction} label={`Edit ${ability.name}`} key={version}>{hidden}<input type="hidden" name="operation" value="edit" /><input type="hidden" name="skillId" value={ability.id} /><DefinitionFields ability={ability} /><button type="submit">Save reviewed ability</button></CampaignForm></details>
          <CampaignForm campaignId={campaignId} submitAction={skillAction} label={`Remove ${ability.name}`}>{hidden}<input type="hidden" name="operation" value="remove" /><input type="hidden" name="skillId" value={ability.id} /><label><input type="checkbox" name="confirmed" value="yes" required /> Remove ability and its Hotlist references.</label><button type="submit">Remove ability</button></CampaignForm>
        </>}
        </div>
      </details>)}
    </details>
    {isGm && <details className={styles.gmControls}><summary>GM: add a learned ability</summary><div className={styles.controlGrid}>
      <CampaignForm campaignId={campaignId} submitAction={skillAction} label="Award catalog ability">{hidden}<input type="hidden" name="operation" value="learn-catalog" /><label>Ability<select name="catalogId" required><option value="">Choose an ability</option>{catalog.map((ability) => <option value={ability.id} key={ability.id}>{ability.name} · {ability.kind}</option>)}</select></label><label>Rank<input type="number" name="rank" min={1} max={15} defaultValue={1} required /></label><p>Catalog costs are reference defaults. Review class surcharges and special conditions; edit the learned definition when needed.</p><label><input type="checkbox" name="reviewed" value="yes" required /> GM reviewed this award and rank limit.</label><button type="submit">Add catalog ability</button></CampaignForm>
      <details><summary>Custom ability</summary><CampaignForm campaignId={campaignId} submitAction={skillAction} label="Award custom ability">{hidden}<input type="hidden" name="operation" value="learn" /><DefinitionFields /><button type="submit">Add reviewed ability</button></CampaignForm></details>
    </div></details>}
  </section>;
}
