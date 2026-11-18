import type {EffectTemplate,EffectLinks} from '@/domain/effect-templates';
import {LinkedEffectView} from './linked-effect-view';
import {AbilityDefinitionFields} from '@/components/ability-definition-fields';
import {AbilityDefinitionEditor} from '@/components/ability-definition-editor';
import { AbilityTable } from '@/components/ability-table';
import { SheetSection } from '@/components/sheet-section';
import { CampaignForm } from '@/components/campaign-form';
import { skillAction } from '@/app/campaign/skill-actions';
import { ABILITY_CATALOG, abilityCheckBonus, canMarkAbility, type LearnedAbility } from '@/domain/abilities';
import { type TutorialProfile } from '@/domain/tutorial';
import type { Hotlist } from '@/domain/loadout';
import styles from '@/styles/campaign.module.css';

export function AbilitiesView({ campaignId, crawlerId, version, abilities, profile, isGm, hotlist, healthSlots, floor=1, templates, links }: {
  campaignId: string; crawlerId: string; version: string; abilities: readonly LearnedAbility[]; profile: TutorialProfile;
  isGm: boolean; hotlist?: Hotlist; healthSlots: number; floor?: number; templates?:readonly EffectTemplate[];links?:EffectLinks;
}) {
  const hidden = <><input type="hidden" name="crawlerId" value={crawlerId} /><input type="hidden" name="version" value={version} /></>;
  const catalog = ABILITY_CATALOG.filter((entry) => entry.id !== 'heal' && !abilities.some((ability) => ability.name.toLowerCase() === entry.name.toLowerCase()));
  const rows=abilities.map((ability)=>{
    const bonus=abilityCheckBonus(ability,profile,floor);
    const management=<>
        <p>{ability.description || 'No description recorded.'}</p><p className={styles.sheetHint}>{ability.reference}{ability.damage ? ` · Base ranks 0–4 damage: ${ability.damage}; rank upgrades manual.` : ''}{ability.range ? ` · Range: ${ability.range}` : ''}</p>
        {ability.lastAdvancement && <p>Last advancement: d20 {ability.lastAdvancement.die} + ({ability.lastAdvancement.modifier}); Rank {ability.lastAdvancement.fromRank} → {ability.lastAdvancement.toRank}. Mark cleared.</p>}
        <div className={styles.controlGrid}>
        {ability.kind==='spell'&&ability.automation==='manual'&&<LinkedEffectView context={{campaignId,crawlerId,version}} kind="spell" target={ability.id} templates={templates} links={links} isGm={isGm}/>}
        {(ability.marked || canMarkAbility(ability)) && <CampaignForm campaignId={campaignId} submitAction={skillAction} label={`${ability.marked ? 'Clear' : 'Mark'} ${ability.name}`}>
          {hidden}<input type="hidden" name="operation" value="mark" /><input type="hidden" name="skillId" value={ability.id} /><input type="hidden" name="marked" value={ability.marked ? 'false' : 'true'} />
          {!ability.marked && ability.advancement === 'special' && <label><input type="checkbox" name="qualifying" value="yes" required /> Special condition met; no second hand-to-hand Skill / Effect marked for this attack.</label>}
          <p>Rank stays unchanged until the GM records an advancement result.</p><button type="submit">{ability.marked ? 'Clear mark' : 'Mark for advancement'}</button>
        </CampaignForm>}
        {ability.kind === 'spell' && <CampaignForm campaignId={campaignId} submitAction={skillAction} label={`Cast ${ability.name}`}>
          {hidden}<input type="hidden" name="operation" value="cast" /><input type="hidden" name="skillId" value={ability.id} />
          <p>{ability.automation === 'tutorial-heal' ? 'Spend 2 Mana and restore up to 2 health slots.' : `Spend the reviewed ${ability.manaCost} Mana. ${links?.[`spell:${ability.id}`]?'Applies its linked self effect in the same save.':'Apply eligible advancement policy; resolve Check and effects at the table.'}`}</p>
          <label><input type="checkbox" name="confirmed" value="yes" required /> Casting conditions, eligible self-effect / successful Check if required, final Mana cost, and Action / Interrupt timing confirmed.</label>
          <button type="submit" disabled={healthSlots === 0 || profile.mana < (ability.manaCost ?? 0) || !hotlist?.some((slot) => slot?.kind === 'skill' && slot.target === ability.id)}>Cast prepared Spell</button><p className={styles.sheetHint}>Requires a Hotlist slot and sufficient Mana.</p>
        </CampaignForm>}
        {isGm && ability.marked && <CampaignForm campaignId={campaignId} submitAction={skillAction} label={`Resolve ${ability.name} advancement`}>
          {hidden}<input type="hidden" name="operation" value="advance" /><input type="hidden" name="skillId" value={ability.id} /><input type="hidden" name="window" value={ability.rank <= 4 ? 'two-hour' : 'floor-end'} />
          <p>{ability.rank <= 4 ? 'Two-hour' : 'Floor-end'} advancement: d20 + modifier ≥ rank increases rank by one. Clear mark on either result.</p>
          <label>d20 roll<input name="die" type="number" min={1} max={20} required /></label><label>Reviewed modifier<input name="modifier" type="number" min={-100} max={100} defaultValue={0} required /></label>
          <label><input name="reviewed" value="yes" type="checkbox" required /> Appropriate advancement window reached and roll reviewed by GM.</label><button type="submit">Record advancement result</button>
        </CampaignForm>}
        {isGm && ability.id !== 'heal' && <>
          <AbilityDefinitionEditor context={{campaignId,crawlerId,version}} ability={ability}/>
          <CampaignForm campaignId={campaignId} submitAction={skillAction} label={`Remove ${ability.name}`}>{hidden}<input type="hidden" name="operation" value="remove" /><input type="hidden" name="skillId" value={ability.id} /><label><input type="checkbox" name="confirmed" value="yes" required /> Remove ability and its Hotlist references.</label><button type="submit">Remove ability</button></CampaignForm>
        </>}
        </div>
    </>;
    return {id:ability.id,name:ability.name,kind:`${ability.passive?'Passive ':''}${ability.kind}`,rank:`${ability.rank} / ${ability.maxRank}${ability.rank>15&&floor<6?' (effective 15)':''}`,check:bonus===null?'—':`d20 ${bonus>=0?'+':'−'} ${Math.abs(bonus)} (${ability.stat})`,mana:ability.manaCost===null?'—':String(ability.manaCost),advancement:ability.marked?'✓ Marked':canMarkAbility(ability)?ability.advancement==='special'?'Special condition':'Unmarked':'Not eligible',searchText:`${ability.description} ${ability.reference}`,management};
  });
  return <SheetSection title="Learned Skills & Spells">
    <p className={styles.sheetHint}>Mark attempted Checks whether they succeed or fail. Marks do not change rank. The GM resolves marked ranks 1–4 every two hours and ranks 5–14 at floor end. Ordinary advancement stops at rank 15; benefits above 15 remain inactive until Floor 6.</p>
    <p className={styles.sheetHint}>Passive abilities usually receive no marks. Confirm special conditions; mark only one hand-to-hand Skill or Damage Effect per attack. Resolve damage, targets, cooldowns, and special effects at the table.</p>
    <AbilityTable rows={rows} />
    {isGm && <details className={styles.gmControls}><summary>GM: add a learned ability</summary><div className={styles.controlGrid}>
      <CampaignForm campaignId={campaignId} submitAction={skillAction} label="Award catalog ability">{hidden}<input type="hidden" name="operation" value="learn-catalog" /><label>Ability<select name="catalogId" required><option value="">Choose an ability</option>{catalog.map((ability) => <option value={ability.id} key={ability.id}>{ability.name} · {ability.kind}</option>)}</select></label><label>Rank<input type="number" name="rank" min={1} max={15} defaultValue={1} required /></label><p>Catalog costs are reference defaults. Review class surcharges and special conditions; edit the learned definition when needed.</p><label><input type="checkbox" name="reviewed" value="yes" required /> GM reviewed this award and rank limit.</label><button type="submit">Add catalog ability</button></CampaignForm>
      <details><summary>Custom ability</summary><CampaignForm campaignId={campaignId} submitAction={skillAction} label="Award custom ability">{hidden}<input type="hidden" name="operation" value="learn" /><AbilityDefinitionFields /><button type="submit">Add reviewed ability</button></CampaignForm></details>
    </div></details>}
  </SheetSection>;
}
