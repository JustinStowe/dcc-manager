'use client';
import { useRef,useState,type FormEvent } from 'react';
import { DEFENSE_TYPES,type TypedDefenses } from '@/domain/typed-defenses';
import { SheetModal } from './sheet-modal';
import { useSheetMutation,type SheetContext } from '@/controllers/use-sheet-mutation';
import styles from '@/styles/sheet-controls.module.css';
export function TypedDefensesManager({context,defenses}:{context:SheetContext;defenses:TypedDefenses}){
 const [open,setOpen]=useState(false),[generation,setGeneration]=useState(0);const mutation=useSheetMutation(context),editVersion=useRef(context.version);
 function show(){editVersion.current=context.version;mutation.clearError();setGeneration(generation+1);setOpen(true);}
 function close(){if(!mutation.pending)setOpen(false);}
 async function apply(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);const next=Object.fromEntries(DEFENSE_TYPES.map((type)=>[type,{resistant:form.get(`${type}-resistant`)==='yes',vulnerable:form.get(`${type}-vulnerable`)==='yes',immune:form.get(`${type}-immune`)==='yes'}]));if(await mutation.save('typed-defenses',{defenses:next},editVersion.current))setOpen(false);}
 return <><button type="button" className={styles.statToggle} onClick={show}>Manage typed defenses</button><SheetModal open={open} title="GM typed defenses" pending={mutation.pending} onClose={close}>
 <p>Set persistent base defenses. Active tracked effects add their flags separately. This editor records each effective flag once; source stacking is not calculated. Apply DR, then resistance (half, round down), vulnerability (double), and immunity (zero), in that order.</p><p>Both resistance and vulnerability may apply; immunity overrides damage. Record persistent defenses here; use tracked effects for temporary sources. Review equipment-derived defenses when gear changes. No defense is inferred from an item name or note.</p>
 <form key={generation} onSubmit={apply}><fieldset className={styles.fields} disabled={mutation.pending}><legend>Damage types</legend><div className={styles.tableScroll}><table className={styles.defenseTable}><thead><tr><th>Type</th><th>Resistance ×½</th><th>Vulnerability ×2</th><th>Immunity ×0</th></tr></thead><tbody>{DEFENSE_TYPES.map((type)=><tr key={type}><th scope="row">{type}</th>{(['resistant','vulnerable','immune'] as const).map((flag)=><td key={flag}><input type="checkbox" name={`${type}-${flag}`} aria-label={`${type} ${flag}`} value="yes" defaultChecked={defenses[type]?.[flag]??false} /></td>)}</tr>)}</tbody></table></div>
 <p>Armor Piercing is the existing untyped DR-bypass option, so it has no elemental-defense entry. For typed damage, choose its actual damage type.</p><div className={styles.actions}><button type="submit">Save defenses</button><button type="button" onClick={close}>Cancel</button></div></fieldset></form>{mutation.pending&&<p role="status">Saving…</p>}{mutation.error&&<p role="alert" className={styles.error}>{mutation.error}</p>}
 </SheetModal></>;
}
