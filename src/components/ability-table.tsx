'use client';
import { Fragment,useEffect,useId,useRef,useState,type ChangeEvent,type KeyboardEvent,type MouseEvent,type ReactNode } from 'react';
import styles from '@/styles/sheet-sections.module.css';
import sheet from '@/styles/campaign.module.css';

export interface AbilityTableRow {readonly id:string;readonly name:string;readonly kind:string;readonly rank:string;readonly check:string;readonly mana:string;readonly advancement:string;readonly management:ReactNode;readonly searchText?:string}
export function AbilityTable({rows}:{rows:readonly AbilityTableRow[]}){
  const [selectedId,setSelectedId]=useState<string|null>(null),[query,setQuery]=useState(''),instance=useId();
  const panel=useRef<HTMLElement>(null);
  useEffect(()=>{panel.current?.focus({preventScroll:true});},[selectedId]);
  function openRow(event:MouseEvent<HTMLTableRowElement>){const id=event.currentTarget.dataset.abilityId!;setSelectedId(selectedId===id?null:id);}
  function rowKey(event:KeyboardEvent<HTMLTableRowElement>){if(event.key==='Enter'||event.key===' '){event.preventDefault();const id=event.currentTarget.dataset.abilityId!;setSelectedId(selectedId===id?null:id);}}
  function openButton(event:MouseEvent<HTMLButtonElement>){event.stopPropagation();const id=event.currentTarget.dataset.abilityId!;setSelectedId(selectedId===id?null:id);}
  function search(event:ChangeEvent<HTMLInputElement>){setQuery(event.currentTarget.value);setSelectedId(null);}
  function clear(){setQuery('');setSelectedId(null);}
  const normalized=query.trim().toLowerCase(),visible=rows.filter(row=>`${row.name} ${row.kind} ${row.searchText??''}`.toLowerCase().includes(normalized));
  return <><div className={styles.search}><label htmlFor={`${instance}-search`}>Search skills and spells</label><input id={`${instance}-search`} type="search" value={query} onChange={search} placeholder="Find a skill or spell…"/><button type="button" onClick={clear} disabled={!query}>Clear</button><span role="status">{visible.length} of {rows.length} abilities</span></div><div className={`${sheet.tableScroll} ${styles.abilityViewport}`}><table className={`${sheet.sheetTable} ${styles.abilityTable}`}><caption>Choose an ability row to inspect or manage it. Click again to collapse. Keyboard: Tab to its name, then Enter or Space.</caption><thead><tr><th scope="col">Ability</th><th scope="col">Kind</th><th scope="col">Rank / limit</th><th scope="col">Check</th><th scope="col">Mana</th><th scope="col">Advancement</th></tr></thead><tbody>{visible.map((row)=>{
    const selected=selectedId===row.id,panelId=`${instance}-${row.id}-panel`,labelId=`${instance}-${row.id}-name`;
    return <Fragment key={row.id}>
      <tr className={styles.abilityRow} data-ability-id={row.id} data-selected={selected} onClick={openRow} onKeyDown={rowKey}>
        <th scope="row"><button id={labelId} type="button" className={styles.abilityButton} data-ability-id={row.id} onClick={openButton} aria-expanded={selected} aria-controls={selected?panelId:undefined}>{row.name}</button></th><td>{row.kind}</td><td>{row.rank}</td><td>{row.check}</td><td>{row.mana}</td><td>{row.advancement}</td>
      </tr>
      {selected&&<tr className={styles.managementRow}><td colSpan={6}><section ref={panel} id={panelId} aria-labelledby={labelId} tabIndex={-1} className={styles.managementPanel}><div className={styles.managementHeader}><h4>{row.name} management</h4></div>{row.management}</section></td></tr>}
    </Fragment>;
  })}</tbody></table>{visible.length===0&&<p>{rows.length===0?'No learned abilities recorded.':'No skills or spells match your search.'}</p>}</div></>;
}
