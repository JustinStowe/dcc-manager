import { DEFENSE_TYPES,type TypedDefenses } from '@/domain/typed-defenses';
import { TypedDefensesManager } from '@/components/typed-defenses-manager';
import type { SheetContext } from '@/controllers/use-sheet-mutation';
import styles from '@/styles/campaign.module.css';
export function TypedDefensesView({context,defenses,isGm}:{context:SheetContext;defenses:TypedDefenses;isGm:boolean}){
 const configured=DEFENSE_TYPES.filter((type)=>{const d=defenses[type];return d&&(d.resistant||d.vulnerable||d.immune);});
 return <section className={styles.sheetSection} aria-label="Typed defenses"><h3>Typed defenses</h3>{configured.length?<div className={styles.tableScroll}><table className={styles.sheetTable}><thead><tr><th>Damage type</th><th>Resistance</th><th>Vulnerability</th><th>Immunity</th></tr></thead><tbody>{configured.map((type)=><tr key={type}><th scope="row">{type}</th><td>{defenses[type]?.resistant?'Half (round down)':'—'}</td><td>{defenses[type]?.vulnerable?'Double':'—'}</td><td>{defenses[type]?.immune?'Zero damage':'—'}</td></tr>)}</tbody></table></div>:<p className={styles.sheetHint}>No typed defenses recorded. General DR still applies.</p>}{isGm&&<TypedDefensesManager context={context} defenses={defenses} />}</section>;
}
