'use client';
import type {TrackedEffect} from '@/domain/tracked-effects';
import type {SheetContext} from '@/controllers/use-sheet-mutation';
import {useEffectsDialogController} from '@/controllers/use-effects-dialog-controller';
import {SheetModal} from './sheet-modal';
import {EffectFields} from './effect-fields';
import styles from '@/styles/sheet-controls.module.css';
import layout from '@/styles/effect-dialog.module.css';

export function EffectsManager({context,effects}:{context:SheetContext;effects:readonly TrackedEffect[]}){
 const {model,actions}=useEffectsDialogController(context,effects),selected=model.selected;
 return <><button type="button" className={styles.statToggle} onClick={actions.show} aria-label="Edit effects and conditions">Edit</button>
  <SheetModal open={model.open} title="Edit Effects & Conditions" pending={model.pending} onClose={actions.close}>
   <label className={layout.picker}>Effect<select value={model.selectedId} onChange={actions.choose} disabled={model.pending}><option value="new">Add new effect</option>{effects.map(effect=><option key={effect.id} value={effect.id}>{effect.name} · {effect.active?'Active':effect.remainingRounds===0?'Expired':'Inactive'}</option>)}</select></label>
   <p className={styles.hint}>Choose an existing effect or Add new effect. Changing selection or cancelling discards unsubmitted changes.</p>
   {model.missing?<p role="alert" className={styles.error}>This effect is no longer available. Close the dialog to load current data.</p>:<form className={layout.editor} key={`${model.generation}-${model.selectedId}`} onSubmit={actions.save} aria-label={selected?`Edit ${selected.name}`:'Add effect'} aria-busy={model.pending}>
    <fieldset className={styles.fields} disabled={model.pending}><legend>{selected?selected.name:'New effect'}</legend><EffectFields effect={selected}/><div className={styles.actions}><button type="submit">{selected?'Save effect':'Add effect'}</button><button type="button" onClick={actions.close}>Cancel</button></div></fieldset>
   </form>}
   <p className={styles.hint}>Save effect applies the field edits above. Activation, removal and round advancement use saved effects and close the dialog.</p>
   {selected&&<section className={layout.secondary} aria-label="Selected effect actions"><h3 className={layout.secondaryTitle}>Selected effect</h3><p>{selected.active?'Active':selected.remainingRounds===0?'Expired':'Inactive'} · {selected.remainingRounds===null?'No countdown':`${selected.remainingRounds} rounds remaining`}</p>
    <button type="button" onClick={actions.toggle} disabled={model.pending||(!selected.active&&selected.remainingRounds===0)}>{selected.active?'Deactivate':'Activate'}</button>
    <div className={layout.remove}><label className={layout.checkbox}><input type="checkbox" aria-label="Confirm effect removal" checked={model.confirmRemove} onChange={actions.removeConfirmation} disabled={model.pending}/>Confirm removal of {selected.name}</label><button type="button" onClick={actions.remove} disabled={model.pending||!model.confirmRemove}>Remove effect</button></div>
   </section>}
   <section className={layout.secondary} aria-label="Round countdown"><h3 className={layout.secondaryTitle}>Round countdown</h3><label className={layout.checkbox}><input type="checkbox" aria-label="Confirm round advancement" checked={model.confirmRound} onChange={actions.roundConfirmation} disabled={model.pending||!model.canTick}/>Advance active countdowns on this crawler by one round.</label><button type="button" onClick={actions.tick} disabled={model.pending||!model.canTick||!model.confirmRound}>Advance one round for this crawler</button></section>
   {model.pending&&<p role="status">Saving…</p>}{model.error&&<p role="alert" className={styles.error}>{model.error}</p>}
   <div className={styles.actions}><button type="button" onClick={actions.close} disabled={model.pending}>Close</button></div>
  </SheetModal>
 </>;
}
