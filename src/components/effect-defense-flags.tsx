import { DEFENSE_TYPES,type TypedDefenses } from '@/domain/typed-defenses';
import styles from '@/styles/sheet-controls.module.css';

export function EffectDefenseFlags({defenses={}}:{defenses?:TypedDefenses}){
 return <fieldset><legend>Typed-defense flags</legend><div className={styles.tableScroll}><table className={styles.defenseTable}>
  <caption>Flags contributed by this effect while active</caption>
  <thead><tr><th scope="col">Damage type</th><th scope="col">Resistant</th><th scope="col">Vulnerable</th><th scope="col">Immune</th></tr></thead>
  <tbody>{DEFENSE_TYPES.map(type=><tr key={type}><th scope="row">{type}</th>{(['resistant','vulnerable','immune'] as const).map(flag=><td key={flag}><input type="checkbox" name={`${type}-${flag}`} aria-label={`${type} ${flag}`} value="yes" defaultChecked={defenses[type]?.[flag]??false}/></td>)}</tr>)}</tbody>
 </table></div><p className={styles.hint}>These flags add to persistent base defenses only while this effect is active. Armor Piercing remains the separate, untyped DR-bypass option.</p></fieldset>;
}
