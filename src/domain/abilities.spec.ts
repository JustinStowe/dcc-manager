import { describe, expect, it } from 'vitest';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
import { createTutorialProfile, TUTORIAL_CATALOG, tutorialModifier } from './tutorial';
import { ABILITY_CATALOG, abilityCheckBonus, canMarkAbility, castLearnedSpell, markAbility, resolveAdvancement, restoreAbilities, restoreAbility, seedAbilities, type LearnedAbility } from './abilities';
const profile = createTutorialProfile(tutorialDraftFixture());
function ability(id='longsword', overrides: Partial<LearnedAbility> = {}): LearnedAbility {
  const known = ABILITY_CATALOG.find((entry) => entry.id === id)!;
  return restoreAbility({ ...known, rank: 3, marked: false, origin: 'gm', ...overrides });
}
describe('learned ability records', () => {
  it('seeds separate current records without mutating creation choices', () => {
    const rows = seedAbilities(profile); expect(rows.length).toBe(11);
    expect(rows[0].rank).toBe(1); expect(rows[4].rank).toBe(3); expect(rows[6].rank).toBe(2);
    expect(rows.find((row) => row.id === 'heal')?.rank).toBe(1);
    const marked = markAbility(rows[0],true,false); expect(marked.rank).toBe(rows[0].rank); expect(marked.marked).toBe(true); expect(rows[0].marked).toBe(false);
  });
  it.each(TUTORIAL_CATALOG.combat.filter((entry) => entry.id !== 'dagger'))('seeds catalog combat metadata %s', (entry) => {
    const rows = seedAbilities(createTutorialProfile({ ...tutorialDraftFixture(), combatId: entry.id }));
    expect(rows.find((row) => row.id === entry.id)?.rank).toBe(3);
    expect(rows.length).toBe(entry.effect ? 12 : 11);
  });
  it.each(ABILITY_CATALOG)('validates catalog definition %s', (entry) => {
    expect(restoreAbility({ ...entry, rank: 1, marked: false, origin: 'gm' }).id).toBe(entry.id);
  });
  it('protects Tutorial Heal against rank changes, marks and impersonation', () => {
    for (const patch of [{rank:2},{marked:true},{manaCost:1},{automation:'manual'},{id:'fake-heal'}]) expect(() => ability('heal',{rank:1,...patch} as Partial<LearnedAbility>)).toThrow();
    expect(() => restoreAbilities([ability()])).toThrow('Heal');
  });
  it('rejects duplicate names and identifiers', () => {
    const rows=seedAbilities(profile); expect(() => restoreAbilities([...rows,{...rows[0],id:'another'}])).toThrow('already');
    expect(() => restoreAbilities([...rows,{...rows[0],name:'Different'}])).toThrow('already');
  });
  it.each([{rank:0},{rank:1.5},{rank:16,maxRank:15},{maxRank:21},{id:'BAD ID'},{passive:true},{manaCost:2},{marked:true,advancement:'none'}])('rejects invalid definition %s', (patch) => { expect(() => ability('longsword',patch as Partial<LearnedAbility>)).toThrow(); });
  it('uses effective stats for Checks and limits rank benefits to 15 on the current floor', () => {
    const gearProfile={...profile,stats:{...profile.stats,strength:{base:2,enhanced:20}}};
    expect(abilityCheckBonus(ability(),gearProfile)).toBe(3+tutorialModifier(20));
    expect(abilityCheckBonus(ability('longsword',{rank:20,maxRank:20}),profile)).toBe(15+tutorialModifier(2));
    expect(abilityCheckBonus(ability('heal',{rank:1}),profile)).toBe(null);
  });
});
describe('advancement marks and resolution', () => {
  it('records successful and failed Checks without changing rank', () => { const marked=markAbility(ability(),true,false); expect(marked.rank).toBe(3);expect(marked.marked).toBe(true);expect(markAbility(marked,false,false).marked).toBe(false); });
  it('requires confirmation for special passive exceptions', () => { const aiming=ability('aiming');expect(() => markAbility(aiming,true,false)).toThrow('special');expect(markAbility(aiming,true,true).marked).toBe(true); });
  it.each(['catcher','determine-value','heal'])('does not mark passive %s', (id) => {const a=ability(id,{rank:1});expect(canMarkAbility(a)).toBe(false);expect(() => markAbility(a,true,true)).toThrow();});
  it('marks Damage Effects independently of previously marked skills', () => { const rows=seedAbilities(createTutorialProfile({...tutorialDraftFixture(),combatId:'pugilism'}));const punch=rows.find((row)=>row.id==='iron-punch')!;expect(markAbility(punch,true,true).marked).toBe(true);expect(rows.find((row)=>row.id==='pugilism')?.marked).toBe(false); });
  it('increments once on success and clears marks after success or failure', () => {
    const a=markAbility(ability(),true,false), success=resolveAdvancement(a,'two-hour',3,0), failure=resolveAdvancement(a,'two-hour',1,0);
    expect(success.rank).toBe(4);expect(success.marked).toBe(false);expect(failure.rank).toBe(3);expect(failure.marked).toBe(false);expect(failure.lastAdvancement?.die).toBe(1);
  });
  it('applies reviewed modifiers and appropriate rank windows', () => {
    const a=markAbility(ability('longsword',{rank:5}),true,false);
    expect(() => resolveAdvancement(a,'two-hour',20,0)).toThrow('window');expect(resolveAdvancement(a,'floor-end',3,2).rank).toBe(6);
    expect(() => resolveAdvancement(ability(),'two-hour',20,0)).toThrow('mark');
  });
  it('stops ordinary advancement at 15 and respects lower reviewed caps', () => {
    expect(resolveAdvancement(markAbility(ability('longsword',{rank:14}),true,false),'floor-end',14,0).rank).toBe(15);
    expect(canMarkAbility(ability('longsword',{rank:15}))).toBe(false);expect(canMarkAbility(ability('longsword',{rank:3,maxRank:3}))).toBe(false);
  });
  it.each([[0,0],[21,0],[1,101],[1,0.5]])('rejects invalid die/modifier %s %s',(die,modifier)=>{expect(()=>resolveAdvancement(markAbility(ability(),true,false),'two-hour',die,modifier)).toThrow();});
});
describe('prepared learned Spells', () => {
  it('spends reviewed Mana and marks an ordinary Spell without applying target effects', () => {
    const a=ability('fire-fingers'),result=castLearnedSpell(a,profile,8,true);
    expect(result.profile.mana).toBe(3);expect(result.slots).toBe(8);expect(result.ability.marked).toBe(true);expect(a.marked).toBe(false);
  });
  it('keeps Heal at rank one and restores two slots for two Mana', () => { const result=castLearnedSpell(ability('heal',{rank:1}),profile,7,true);expect(result.slots).toBe(9);expect(result.profile.mana).toBe(4);expect(result.ability.marked).toBe(false); });
  it('does not mark passive or capped custom Spells', () => {
    expect(castLearnedSpell(ability('fire-fingers',{passive:true,stat:null,advancement:'none'}),profile,8,true).ability.marked).toBe(false);
    expect(castLearnedSpell(ability('fire-fingers',{rank:15}),profile,8,true).ability.marked).toBe(false);
  });
  it('rejects unprepared, Dying, insufficient-Mana and non-Spell actions', () => {
    const a=ability('fire-fingers');expect(()=>castLearnedSpell(a,profile,8,false)).toThrow('Prepare');expect(()=>castLearnedSpell(a,profile,0,true)).toThrow('Dying');expect(()=>castLearnedSpell(a,{...profile,mana:2},8,true)).toThrow('Mana');expect(()=>castLearnedSpell(ability(),profile,8,true)).toThrow('Spell');
  });
});
