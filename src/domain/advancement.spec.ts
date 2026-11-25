import { describe, expect, it } from 'vitest';
import { allocatePoints, authorizePoints, awardLevels, earnedPoints, INITIAL_ADVANCEMENT, pendingPoints, reconcileAdvancement, restoreAdvancement, setHumanBenefit } from './advancement';
const legacy = { ...INITIAL_ADVANCEMENT, reconciled: false };
const bases = { strength: 2, intelligence: 6, constitution: 3, dexterity: 5, charisma: 4 };
const allocation = { strength: 2, intelligence: 1, constitution: 0, dexterity: 0, charisma: 0 };
describe('level advancement rules', () => {
  it('banks three points per gained level, excluding Level 1', () => {
    expect(earnedPoints(1)).toBe(0); expect(earnedPoints(9)).toBe(24); expect(earnedPoints(250)).toBe(747);
    expect(pendingPoints(9, { ...INITIAL_ADVANCEMENT, spent: 7 })).toBe(17);
  });
  it('preserves legacy over-cap levels for review without assuming entitlement', () => {
    expect(restoreAdvancement(legacy, 1000)).toEqual(legacy);
    expect(() => pendingPoints(1000, legacy)).toThrow('reconcile');
    expect(() => restoreAdvancement(INITIAL_ADVANCEMENT, 251)).toThrow();
  });
  it('requires a one-time confirmed review; previously spent points are never applied again', () => {
    const reviewed = reconcileAdvancement(legacy, 9, 12, true);
    expect(reviewed).toEqual({ reconciled: true, spent: 12, authorized: 0, humanFavor: false });
    expect(pendingPoints(9, reviewed)).toBe(12);
    expect(() => reconcileAdvancement(reviewed, 9, 0, true)).toThrow('already');
    expect(() => reconcileAdvancement(legacy, 9, 0, false)).toThrow('Confirm');
    expect(() => reconcileAdvancement(legacy, 9, 25, true)).toThrow();
  });
  it.each([-1, 0, 1.5, 250, NaN])('refuses invalid or over-cap awards: %s', amount => {
    expect(() => awardLevels(2, INITIAL_ADVANCEMENT, amount, 1)).toThrow();
  });
  it('records levels on Tutorial Floors without spending or granting Favor', () => {
    expect(awardLevels(1, INITIAL_ADVANCEMENT, 8, 1)).toEqual({ level: 9, points: 24, favor: 0 });
    expect(() => awardLevels(1, legacy, 1, 1)).toThrow('reconcile');
    expect(awardLevels(249, INITIAL_ADVANCEMENT, 1, 5).level).toBe(250);
    expect(() => awardLevels(250, INITIAL_ADVANCEMENT, 1, 5)).toThrow();
  });
  it('requires Floor 3 and saferoom confirmation, allows revocation, and bounds authorization', () => {
    expect(() => authorizePoints(9, INITIAL_ADVANCEMENT, 2, 24, true)).toThrow('saferoom');
    expect(() => authorizePoints(9, INITIAL_ADVANCEMENT, 3, 24, false)).toThrow('saferoom');
    expect(() => authorizePoints(9, INITIAL_ADVANCEMENT, 3, 25, true)).toThrow();
    const authorized = authorizePoints(9, INITIAL_ADVANCEMENT, 3, 12, true);
    expect(authorized.authorized).toBe(12);
    expect(authorizePoints(9, authorized, 3, 0, false).authorized).toBe(0);
  });
  it('partially spends only authorized points on base stats without mutating snapshots', () => {
    const state = { ...INITIAL_ADVANCEMENT, spent: 6, authorized: 12 };
    const result = allocatePoints(9, state, 3, allocation, bases);
    expect(result.bases).toEqual({ ...bases, strength: 4, intelligence: 7 });
    expect(result.state).toEqual({ ...state, spent: 9, authorized: 9 });
    expect(result.points).toBe(3); expect(state.spent).toBe(6); expect(bases.strength).toBe(2);
    expect(awardLevels(9, state, 2, 3).points).toBe(6); expect(state.authorized).toBe(12);
  });
  it.each([
    { ...allocation, strength: -1 }, { ...allocation, strength: 0.5 }, { ...allocation, strength: '1' },
    { ...allocation, strength: 4 }, { strength: 1 }, { ...allocation, enhanced: 1 },
    { strength: 0, intelligence: 0, constitution: 0, dexterity: 0, charisma: 0 },
  ])('rejects malformed, empty, or overspent allocations %j', value => {
    expect(() => allocatePoints(2, { ...INITIAL_ADVANCEMENT, authorized: 3 }, 3, value, bases)).toThrow();
  });
  it('refuses allocation before eligibility and rejects stat overflow', () => {
    const state = { ...INITIAL_ADVANCEMENT, authorized: 3 };
    expect(() => allocatePoints(2, state, 2, allocation, bases)).toThrow('saferoom');
    expect(() => allocatePoints(2, INITIAL_ADVANCEMENT, 3, allocation, bases)).toThrow('authorize');
    expect(() => allocatePoints(2, state, 3, allocation, { ...bases, strength: 9999 })).toThrow();
  });
  it('only grants Human Favor after explicit selected-race confirmation and on future gains', () => {
    expect(() => setHumanBenefit(INITIAL_ADVANCEMENT, 2, true, true)).toThrow();
    expect(() => setHumanBenefit(INITIAL_ADVANCEMENT, 3, true, false)).toThrow();
    const selected = setHumanBenefit(INITIAL_ADVANCEMENT, 3, true, true);
    expect(awardLevels(10, selected, 2, 3).favor).toBe(2);
    expect(awardLevels(10, selected, 2, 2).favor).toBe(0);
    expect(awardLevels(10, setHumanBenefit(selected, 3, false, true), 2, 3).favor).toBe(0);
  });
  it.each([null, {}, { ...legacy, spent: 1 }, { ...legacy, humanFavor: true }, { ...INITIAL_ADVANCEMENT, spent: 4 }, { ...INITIAL_ADVANCEMENT, spent: 1, authorized: 3 }])('rejects invalid saved point balances %j', value => {
    expect(() => restoreAdvancement(value, 2)).toThrow();
  });
});
