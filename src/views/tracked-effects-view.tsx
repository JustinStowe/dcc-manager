import {CampaignForm} from '@/components/campaign-form';
import {SheetSection} from '@/components/sheet-section';
import {effectAction} from '@/app/campaign/effect-actions';
import {STAT_KEYS} from '@/domain/tutorial';
import {DEFENSE_TYPES} from '@/domain/typed-defenses';
import type {TrackedEffect} from '@/domain/tracked-effects';
import type {SheetContext} from '@/controllers/use-sheet-mutation';
import styles from '@/styles/campaign.module.css';
function EffectFields({effect}:{effect?:TrackedEffect}){return <>
 <label>Name<input name="name" required maxLength={120} defaultValue={effect?.name}/></label><label>Kind<select name="kind" defaultValue={effect?.kind??'buff'}><option value="buff">Buff</option><option value="debuff">Debuff</option><option value="condition">Condition</option></select></label>
 <label>Source<input name="source" maxLength={200} defaultValue={effect?.source}/></label><label>Notes (visible to player)<textarea name="notes" maxLength={2000} defaultValue={effect?.notes}/></label>
 <label>Remaining rounds (blank = no countdown)<input name="rounds" type="number" min={0} max={10000} step={1} defaultValue={effect?.remainingRounds??''}/></label><label><input name="active" type="checkbox" value="yes" defaultChecked={effect?.active??true}/>Active</label>
 <details><summary>Stat changes</summary>{STAT_KEYS.map(key=><label key={key}>{key}<input name={key} type="number" min={-10000} max={10000} step={1} required defaultValue={effect?.modifiers[key]??0}/></label>)}</details>
 <details><summary>Typed-defense flags contributed while active</summary>{DEFENSE_TYPES.map(type=><fieldset key={type}><legend>{type}</legend>{(['resistant','vulnerable','immune']as const).map(flag=><label key={flag}><input name={`${type}-${flag}`} type="checkbox" value="yes" defaultChecked={effect?.defenses[type]?.[flag]??false}/>{flag}</label>)}</fieldset>)}</details>
 <p>At zero rounds the effect must be inactive. Conditions with notes only are references; special actions and status restrictions remain table decisions.</p>
 </>;}
export function TrackedEffectsView({context,effects,isGm}:{context:SheetContext;effects:readonly TrackedEffect[];isGm:boolean}){
 const hidden=<><input type="hidden" name="crawlerId" value={context.crawlerId}/><input type="hidden" name="version" value={context.version}/></>;
 const shown=isGm?effects:effects.filter(e=>e.active);
 return <SheetSection title={`Effects & Conditions (${effects.filter(e=>e.active).length} active)`}><p>Only active effects contribute stats and typed defenses. Rounds advance manually for this crawler. Paused effects keep their remaining rounds.</p>
 {shown.length===0&&<p>No active effects recorded.</p>}
 {shown.map(effect=><details key={effect.id} name={`effect-${context.crawlerId}`} className={styles.sheetControls}><summary>{effect.name} · {effect.kind} · {effect.active?'Active':effect.remainingRounds===0?'Expired':'Inactive'}{effect.remainingRounds===null?'':` · ${effect.remainingRounds} rounds`}</summary><p>Source: {effect.source||'Not recorded'}</p><p className={styles.notes}>{effect.notes||'No notes.'}</p><p>{STAT_KEYS.filter(k=>effect.modifiers[k]!==0).map(k=>`${k} ${effect.modifiers[k]>=0?'+':''}${effect.modifiers[k]}`).join(' · ')||'No stat changes.'}</p><p>{DEFENSE_TYPES.filter(t=>effect.defenses[t]).map(t=>`${t}: ${(['resistant','vulnerable','immune']as const).filter(f=>effect.defenses[t]?.[f]).join(', ')}`).join(' · ')||'No typed-defense flags.'}</p>
 {isGm&&<div className={styles.controlGrid}>
 <CampaignForm campaignId={context.campaignId} submitAction={effectAction} label={`${effect.active?'Deactivate':'Activate'} ${effect.name}`}>{hidden}<input type="hidden" name="effectId" value={effect.id}/><input type="hidden" name="operation" value="toggle"/><input type="hidden" name="active" value={String(!effect.active)}/><button type="submit" disabled={!effect.active&&effect.remainingRounds===0}>{effect.active?'Deactivate':'Activate'}</button></CampaignForm>
 <details><summary>Edit effect</summary><CampaignForm key={context.version} campaignId={context.campaignId} submitAction={effectAction} label={`Edit ${effect.name}`}>{hidden}<input type="hidden" name="effectId" value={effect.id}/><input type="hidden" name="operation" value="edit"/><EffectFields effect={effect}/><button type="submit">Save effect</button></CampaignForm></details>
 <CampaignForm campaignId={context.campaignId} submitAction={effectAction} label={`Remove ${effect.name}`}>{hidden}<input type="hidden" name="effectId" value={effect.id}/><input type="hidden" name="operation" value="remove"/><label><input name="confirmed" value="yes" type="checkbox" required/>Remove this effect and its contributions.</label><button type="submit">Remove effect</button></CampaignForm>
 </div>}</details>)}
 {isGm&&<><details className={styles.gmControls}><summary>Add a tracked effect</summary><CampaignForm campaignId={context.campaignId} submitAction={effectAction} label="Add tracked effect">{hidden}<input type="hidden" name="operation" value="add"/><EffectFields/><button type="submit">Add effect</button></CampaignForm></details>
 <CampaignForm campaignId={context.campaignId} submitAction={effectAction} label="Advance this crawler one round">{hidden}<input type="hidden" name="operation" value="tick"/><label><input name="confirmed" value="yes" type="checkbox" required/>Advance active countdowns on this crawler by one round.</label><button type="submit" disabled={!effects.some(e=>e.active&&e.remainingRounds!==null)}>Advance one round for this crawler</button></CampaignForm></>}
 </SheetSection>;
}
