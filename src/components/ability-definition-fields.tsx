import {STAT_KEYS} from '@/domain/tutorial';
import type {LearnedAbility} from '@/domain/abilities';
export function AbilityDefinitionFields({ ability }: { ability?: LearnedAbility }) {
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
