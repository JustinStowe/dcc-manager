import type {EffectTemplate} from '@/domain/effect-templates';
import {EffectTemplateManager} from '@/components/effect-template-manager';
import {SheetSection} from '@/components/sheet-section';
import {EffectsManager} from '@/components/effects-manager';
import {STAT_KEYS} from '@/domain/tutorial';
import {DEFENSE_TYPES} from '@/domain/typed-defenses';
import type {TrackedEffect} from '@/domain/tracked-effects';
import type {SheetContext} from '@/controllers/use-sheet-mutation';
import styles from '@/styles/effect-dialog.module.css';

export function TrackedEffectsView({context,effects,isGm,templates=[]}:{context:SheetContext;effects:readonly TrackedEffect[];isGm:boolean;templates?:readonly EffectTemplate[]}){
 const active=effects.filter(effect=>effect.active);
 return <SheetSection title={`Effects & Conditions (${active.length} active)`}>
  {isGm&&<><EffectsManager context={context} effects={effects}/><EffectTemplateManager campaignId={context.campaignId} templates={templates}/></>}
  {active.length===0?<p>No active effects recorded.</p>:<ul className={styles.summaryList} aria-label="Active effects">{active.map(effect=><li key={effect.id} className={styles.summary}>
   <header><strong>{effect.name}</strong><span className={styles.kind}>{effect.kind} · {effect.remainingRounds===null?'No countdown':`${effect.remainingRounds} rounds remaining`}</span></header>
   {effect.source&&<p>Source: {effect.source}</p>}{effect.notes&&<p className={styles.notes}>{effect.notes}</p>}
   <p>{STAT_KEYS.filter(key=>effect.modifiers[key]!==0).map(key=>`${key} ${effect.modifiers[key]>=0?'+':''}${effect.modifiers[key]}`).join(' · ')||'No stat changes.'}</p>
   <p>{DEFENSE_TYPES.filter(type=>effect.defenses[type]).map(type=>`${type}: ${(['resistant','vulnerable','immune']as const).filter(flag=>effect.defenses[type]?.[flag]).join(', ')}`).join(' · ')||'No typed-defense flags.'}</p>
  </li>)}</ul>}
 </SheetSection>;
}
