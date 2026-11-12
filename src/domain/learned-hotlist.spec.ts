import { describe, expect, it } from 'vitest';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
import { createTutorialProfile } from './tutorial';
import { ABILITY_CATALOG, seedAbilities, type LearnedAbility } from './abilities';
import { hotlistSkills, restoreHotlist } from './loadout';
const profile=createTutorialProfile(tutorialDraftFixture());
const custom: LearnedAbility={...ABILITY_CATALOG.find((entry)=>entry.id==='fire-fingers')!,id:'custom-spark',name:'Custom Spark',rank:2,marked:false,origin:'gm'};
describe('Hotlist learned Spell references',()=>{
  it('uses all current learned Spells and their reviewed costs',()=>{const rows=[...seedAbilities(profile),custom];expect(hotlistSkills(profile,rows).map((entry)=>entry.id)).toEqual(['heal','custom-spark']);expect(hotlistSkills(profile,rows)[1].manaCost).toBe(3);});
  it('accepts learned custom IDs and rejects stale/non-Spell persisted references',()=>{const list=[{kind:'skill',target:'custom-spark'},...Array.from({length:9},()=>null)];expect(restoreHotlist(list,[],profile,[...seedAbilities(profile),custom])[0]?.target).toBe('custom-spark');expect(()=>restoreHotlist(list,[],profile,seedAbilities(profile))).toThrow('unavailable');expect(()=>restoreHotlist([{kind:'skill',target:'longsword'},...Array.from({length:9},()=>null)],[],profile,seedAbilities(profile))).toThrow('unavailable');});
  it('does not restore a removed creation Spell from original choices',()=>{const p=createTutorialProfile({...tutorialDraftFixture(),combatId:'fire-fingers'}),rows=seedAbilities(p).filter((entry)=>entry.id!=='fire-fingers');expect(hotlistSkills(p,rows).map((entry)=>entry.id)).toEqual(['heal']);});
});
