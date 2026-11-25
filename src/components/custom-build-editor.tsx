'use client';
import { useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';
import { BUILD_ABILITIES, BUILD_TRAITS, traitTargets, validateCustomBuild, type BuildContext, type BuildLine, type CustomBuild } from '@/domain/custom-build';
import styles from '@/styles/sheet-controls.module.css';
export function CustomBuildEditor({seed,context,isGm,pending,onSave}:{seed?:CustomBuild;context:BuildContext;isGm:boolean;pending:boolean;onSave(build:CustomBuild,form:HTMLFormElement):Promise<void>}){
 const[kind,setKind]=useState<CustomBuild['kind']>(seed?.kind??'class'),[earth,setEarth]=useState(seed?.earth??true),[name,setName]=useState(seed?.name??''),[description,setDescription]=useState(seed?.description??''),[lines,setLines]=useState<readonly BuildLine[]>(seed?.lines??[]),[traitId,setTraitId]=useState('stat'),[target,setTarget]=useState('strength'),[quantity,setQuantity]=useState(1);
 const[bespoke,setBespoke]=useState(seed?.bespoke??[]),[localError,setLocalError]=useState('');
 const trait=BUILD_TRAITS.find(t=>t.id===traitId)!;
 const build:CustomBuild={kind,name,earth,description,lines,...(bespoke.length?{bespoke}: {})};
 let result=null;try{result=validateCustomBuild({...build,name:name||'Untitled draft'},context);}catch{/* Incomplete inputs remain editable. */}
 function changeKind(e:ChangeEvent<HTMLSelectElement>){setKind(e.target.value as CustomBuild['kind']);}
 function changeEarth(e:ChangeEvent<HTMLInputElement>){setEarth(e.target.checked);}
 function changeName(e:ChangeEvent<HTMLInputElement>){setName(e.target.value);}
 function changeDescription(e:ChangeEvent<HTMLTextAreaElement>){setDescription(e.target.value);}
 function changeTrait(e:ChangeEvent<HTMLSelectElement>){const t=BUILD_TRAITS.find(t=>t.id===e.target.value)!;setTraitId(t.id);setTarget(traitTargets(t)[0]??'');setQuantity(1);}
 function changeTarget(e:ChangeEvent<HTMLSelectElement>){setTarget(e.target.value);}
 function changeQuantity(e:ChangeEvent<HTMLInputElement>){setQuantity(Number(e.target.value));}
 function add(){if(!Number.isSafeInteger(quantity)||quantity<1||quantity>50)return;setLines(old=>{const existing=old.find(l=>l.traitId===traitId&&l.target===target);return existing?old.map(l=>l===existing?{...l,quantity:l.quantity+quantity}:l):[...old,{traitId,target,quantity}];});}
 function remove(e:MouseEvent<HTMLButtonElement>){const index=Number(e.currentTarget.dataset.index);setLines(old=>old.filter((_,i)=>i!==index));}
 function removeBespoke(e:MouseEvent<HTMLButtonElement>){const index=Number(e.currentTarget.dataset.index);setBespoke(old=>old.filter((_,i)=>i!==index));}
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setLocalError('');try{await onSave(build,e.currentTarget);}catch(error){setLocalError(error instanceof Error?error.message:'Check the build.');}}
 function addBespoke(e:MouseEvent<HTMLButtonElement>){const form=e.currentTarget.form;if(!form)return;const fields=new FormData(form),name=String(fields.get('bespokeName')??''),description=String(fields.get('bespokeDescription')??''),points=Number(fields.get('bespokePoints'));if(name.trim()&&description.trim()&&Number.isSafeInteger(points)&&points>=-5&&points<=30)setBespoke(old=>[...old,{name,description,points}]);}
 return <details open={!!seed}><summary>Custom Race / Class editor</summary><form onSubmit={save}><fieldset className={styles.fields} disabled={pending}>
  <label>Type<select value={kind} onChange={changeKind}><option value="race">Race · 25 BP</option><option value="class">Class · 30 BP</option></select></label>
  <label>Name<input value={name} onChange={changeName} maxLength={100} required /></label><label>Description<textarea value={description} onChange={changeDescription} maxLength={2000} /></label>
  <label><input type="checkbox" checked={earth} onChange={changeEarth} /> Earth origin {kind==='class'?'(requires an Earth Race)':''}</label>
  <label>Reviewed trait<select value={traitId} onChange={changeTrait}>{BUILD_TRAITS.map(t=><option key={t.id} value={t.id}>{t.name} · {t.cost>0?`${t.cost} BP`:t.cost<0?`refund ${-t.cost} BP`:'paired refund'}</option>)}</select></label>
  <label>Target<select value={target} onChange={changeTarget}>{traitTargets(trait).map(id=><option key={id} value={id}>{BUILD_ABILITIES.find(a=>a.id===id)?.name??(id||'No target')}</option>)}</select></label>
  <label>Quantity<input type="number" min={1} max={50} step={1} value={quantity} onChange={changeQuantity} /></label><button type="button" onClick={add} disabled={lines.length>=60}>Add trait</button>
  <ul>{lines.map((l,i)=><li key={`${l.traitId}:${l.target}`}>{l.quantity} × {BUILD_TRAITS.find(t=>t.id===l.traitId)?.name} {l.target&&`· ${l.target}`} <button type="button" data-index={i} onClick={remove}>Remove</button></li>)}</ul>
  {isGm&&<fieldset className={styles.fields}><legend>GM-priced bespoke benefit</legend><p>Novel effects require your price and ruling. Their effects remain table-adjudicated.</p><label>Name<input name="bespokeName" maxLength={120} /></label><label>BP price (negative = refund)<input name="bespokePoints" type="number" min={-5} max={30} step={1} defaultValue={0} /></label><label>Exact effect / conditions<textarea name="bespokeDescription" maxLength={1000} /></label><button type="button" onClick={addBespoke} disabled={bespoke.length>=10}>Add priced benefit</button></fieldset>}
  <ul>{bespoke.map((b,i)=><li key={i}>{b.name} · {b.points} BP · {b.description}<button type="button" data-index={i} onClick={removeBespoke}>Remove</button></li>)}</ul>
  {result&&<><p>{result.cost.spent} / {result.cost.budget} BP · {result.cost.usableRefund} usable detriment BP · {result.cost.remaining} unspent (lost on selection) · {result.passiveRanks} Passive ranks</p>{result.cost.refunded>5&&<p>Only 5 of the {result.cost.refunded} detriment BP can be used.</p>}<ul>{result.issues.map((i,n)=><li key={`${i.code}:${n}`}>{i.message}</li>)}</ul></>}
  <p>Saving creates a draft. The GM must approve it before offering it; an illegal draft requires explicit GM rulings.</p><button type="submit">Save custom draft for GM review</button>{localError&&<p role="alert">{localError}</p>}
 </fieldset></form></details>;
}
