import { describe, expect, it } from 'vitest';
import { tutorialDraftFixture } from '@/testing/tutorial-fixture';
import { createCrawler, getCrawlerMaximumHealth } from './crawler';
import { restoreCrawler } from './crawler-restoration';
import { changeCampaignCrawlerHealth, updateCampaignCrawlerStats } from './campaign';
import { castTutorialHeal, createTutorialProfile, damageTutorialSlots, healTutorialSlots, restoreTutorialProfile, tutorialModifier, tutorialSkills, TUTORIAL_CATALOG } from './tutorial';

describe('official stat modifiers', () => {
  it.each([[1,1],[2,1],[3,2],[5,2],[6,3],[9,3],[10,4],[19,4],[20,5],[49,5],[50,6],[99,6],[100,7],[149,7],[150,8],[199,8],[200,9],[299,9],[300,10],[10000,10]])(
    'maps %s to +%s', (score, modifier) => { expect(tutorialModifier(score)).toBe(modifier); },
  );
  it.each([0,-1,1.5,NaN,Infinity])('rejects invalid stat %s', (score) => { expect(() => tutorialModifier(score)).toThrow(RangeError); });
});

describe('Human Tutorial creation', () => {
  it('starts with official resources and separate equal stat layers', () => {
    const p = createTutorialProfile(tutorialDraftFixture());
    expect(p.mana).toBe(6); expect(p.favor).toBe(1);
    expect(p.stats.constitution).toEqual({ base: 3, enhanced: 3 });
    expect(p.initialStats.intelligence).toBe(6);
  });
  it('derives eight background Skills, two combat Skills, and Heal', () => {
    const skills = tutorialSkills(createTutorialProfile(tutorialDraftFixture()));
    expect(skills.length).toBe(11);
    expect(skills[0]).toEqual({ name: 'Streetwise', stat: 'Cha', rank: 1 });
    expect(skills[4].rank).toBe(3); expect(skills[6].rank).toBe(2);
    expect(skills[8]).toEqual({ name: 'Unarmed Combat', rank: 3, stat: 'Str' });
    expect(skills[10]).toEqual({ name: 'Heal', rank: 1, stat: null });
  });
  it('includes every Human background category and printed combat option', () => {
    expect(TUTORIAL_CATALOG.backgrounds.length).toBe(48); expect(TUTORIAL_CATALOG.combat.length).toBe(29);
    expect(TUTORIAL_CATALOG.backgrounds[0].name).toBe('Latchkey Kid');
  });
  it('rejects duplicate array values', () => {
    const d = tutorialDraftFixture();
    expect(() => createTutorialProfile({ ...d, scores: { ...d.scores, strength: 3 } })).toThrow(RangeError);
  });
  it('allows repeated values for the rolled method (server ticket checked separately)', () => {
    const d = tutorialDraftFixture();
    expect(createTutorialProfile({ ...d, method: 'rolled', scores: { ...d.scores, strength: 3 } }).initialStats.strength).toBe(3);
  });
  it('rejects an out-of-range rolled value', () => {
    const d = tutorialDraftFixture();
    expect(() => createTutorialProfile({ ...d, method: 'rolled', scores: { ...d.scores, strength: 1 } })).toThrow(RangeError);
  });
  it('requires a Skill to belong to the selected background', () => {
    const d = tutorialDraftFixture();
    expect(() => createTutorialProfile({ ...d, backgrounds: { ...d.backgrounds, childhood: { category: 'childhood-1', skills: ['Fabricate','Tracking'] } } })).toThrow(RangeError);
  });
  it('rejects duplicate Skills within a category', () => {
    const d = tutorialDraftFixture();
    expect(() => createTutorialProfile({ ...d, backgrounds: { ...d.backgrounds, childhood: { category: 'childhood-1', skills: ['Streetwise','Streetwise'] } } })).toThrow(RangeError);
  });
  it('rejects duplicates across background categories', () => {
    const d = tutorialDraftFixture();
    expect(() => createTutorialProfile({ ...d, backgrounds: { ...d.backgrounds, adolescence: { category: 'adolescence-12', skills: ['Streetwise','Intimidate'] } } })).toThrow(RangeError);
  });
  it('rejects duplicating the combat Skill in a background', () => {
    expect(() => createTutorialProfile({ ...tutorialDraftFixture(), combatId: 'dagger' })).toThrow(RangeError);
  });
  it('includes the prescribed Damage Effect for a hand-to-hand choice', () => {
    const skills = tutorialSkills(createTutorialProfile({ ...tutorialDraftFixture(), combatId: 'pugilism' }));
    expect(skills.length).toBe(12);
    expect(skills[10]).toEqual({ name: 'Iron Punch', rank: 3, stat: null });
  });
  it('requires Intelligence 4 for an attack Spell', () => {
    const d = tutorialDraftFixture();
    expect(() => createTutorialProfile({ ...d, combatId: 'fire-fingers', scores: { ...d.scores, intelligence: 2, strength: 6 } })).toThrow(RangeError);
    expect(createTutorialProfile({ ...d, combatId: 'fire-fingers' }).combatId).toBe('fire-fingers');
  });
  it('keeps input objects separate from saved stats', () => {
    const d = tutorialDraftFixture(); const p = createTutorialProfile(d);
    d.scores.constitution = 6; expect(p.initialStats.constitution).toBe(3);
  });
  it('restores GM-changed layers without resetting resources', () => {
    const p = createTutorialProfile(tutorialDraftFixture());
    const restored = restoreTutorialProfile({ ...p, mana: 2, favor: 0, stats: { ...p.stats, intelligence: { base: 6, enhanced: 12 } } });
    expect(restored.mana).toBe(2); expect(restored.favor).toBe(0); expect(restored.stats.intelligence.enhanced).toBe(12);
  });
  it('rejects saved Mana above the enhanced maximum', () => {
    expect(() => restoreTutorialProfile({ ...createTutorialProfile(tutorialDraftFixture()), mana: 7 })).toThrow(RangeError);
  });
  it('rejects negative AI Favor and unknown versions', () => {
    const p = createTutorialProfile(tutorialDraftFixture());
    expect(() => restoreTutorialProfile({ ...p, favor: -1 })).toThrow(RangeError);
    expect(() => restoreTutorialProfile({ ...p, version: 2 })).toThrow(RangeError);
  });
});

describe('ten-slot health and Mana', () => {
  it('matches the book example: 22 damage at threshold 4 removes five slots', () => { expect(damageTutorialSlots(10, 10, 22)).toBe(5); });
  it('discards damage below one slot and does not carry it to later hits', () => {
    const after = damageTutorialSlots(10,10,3); expect(after).toBe(10); expect(damageTutorialSlots(after,10,3)).toBe(10);
  });
  it('uses the Enhanced Con modifier rather than the raw score', () => { expect(damageTutorialSlots(10,3,4)).toBe(8); });
  it('clamps large damage to zero slots', () => { expect(damageTutorialSlots(10,3,Number.MAX_SAFE_INTEGER)).toBe(0); });
  it('heals in slots, including healing received at zero', () => { expect(healTutorialSlots(0,2)).toBe(2); expect(healTutorialSlots(9,2)).toBe(10); });
  it('casts Heal atomically without mutating the original profile', () => {
    const p = createTutorialProfile(tutorialDraftFixture()); const result = castTutorialHeal(9,p);
    expect(result.slots).toBe(10); expect(result.profile.mana).toBe(4); expect(p.mana).toBe(6);
  });
  it('cannot self-cast Heal while Dying', () => { expect(() => castTutorialHeal(0,createTutorialProfile(tutorialDraftFixture()))).toThrow(RangeError); });
  it('cannot self-cast Heal without enough Mana', () => { expect(() => castTutorialHeal(5,{ ...createTutorialProfile(tutorialDraftFixture()), mana: 1 })).toThrow(RangeError); });
  it('restores official envelopes at ten slots regardless of Constitution', () => {
    const crawler = createCrawler({ id:'one',campaignId:'game',name:'Carl',baseSegments:10,constitution:3,ruleset:'tutorial-v1' });
    expect(getCrawlerMaximumHealth(crawler)).toBe(10); expect(restoreCrawler(crawler).currentSegments).toBe(10);
  });
  it('rejects a tutorial envelope with a configurable slot count', () => {
    expect(() => createCrawler({ id:'one',campaignId:'game',name:'Carl',baseSegments:20,constitution:3,ruleset:'tutorial-v1' })).toThrow(RangeError);
  });
  it('blocks the legacy campaign commands from changing official records', () => {
    const crawler = createCrawler({ id:'one',campaignId:'game',name:'Carl',baseSegments:10,constitution:3,ruleset:'tutorial-v1' });
    const campaign = { id:'game',name:'One',gmUserId:'gm',playerUserIds:['owner'],crawlers:[{ownerUserId:'owner',crawler}] };
    expect(() => changeCampaignCrawlerHealth(campaign,'owner','one',-3)).toThrow(RangeError);
    expect(() => updateCampaignCrawlerStats(campaign,'gm','one',{baseSegments:10,constitution:10})).toThrow(RangeError);
  });
});
