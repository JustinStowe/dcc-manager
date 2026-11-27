import { describe, expect, it, vi } from 'vitest';
import { executeSafeRoomCommand, executeSaferoomStatusCommand } from './safe-room-commands';
import { progressionFixture, PG_IDS as I } from '@/test/progression-fixture';
import { REWARD_IDS as R } from '@/test/safe-room-fixture';
describe('Safe Room roles and campaign boundaries', () => {
  it.each([{ operation: 'open', boxId: R.box, version: I.version }, { operation: 'claim', boxId: R.box, version: I.version, crawlerVersion: I.version, itemId: null }, { operation: 'read-all', through: '9007199254740995' }])('allows an owner command through the checked port', async command => { const act = vi.fn(); await executeSafeRoomCommand(progressionFixture(I.player), I.crawler, command, { act, snapshot: vi.fn() }); expect(act).toHaveBeenCalledWith(I.crawler, command); });
  it.each([{ operation: 'access', floor: 3, version: null, allowed: true }, { operation: 'unlock', boxId: R.box, version: I.version, confirmed: true }, { operation: 'reconcile-incentive', reviewed: true, note: 'Already fulfilled.' }])('rejects player GM controls before writing', async command => { const act = vi.fn(); await expect(executeSafeRoomCommand(progressionFixture(I.player), I.crawler, command, { act, snapshot: vi.fn() })).rejects.toThrow('Only the GM'); expect(act).not.toHaveBeenCalled(); });
  it('does not accept another player or another campaign crawler', async () => { const act = vi.fn(); for (const [user, crawler] of [[I.other, I.crawler], [I.gm, I.other]]) await expect(executeSafeRoomCommand(progressionFixture(user), crawler, { operation: 'read-all', through: '0' }, { act, snapshot: vi.fn() })).rejects.toThrow('access'); expect(act).not.toHaveBeenCalled(); });
  it('requires review for prototype data', async () => { const w = progressionFixture(); const workspace = { ...w, campaign: { ...w.campaign!, crawlers: w.campaign!.crawlers.map(e => ({ ...e, crawler: { ...e.crawler, ruleset: 'prototype' as const } })) } }; await expect(executeSafeRoomCommand(workspace, I.crawler, { operation: 'read-all', through: '0' }, { act: vi.fn(), snapshot: vi.fn() })).rejects.toThrow('prototype'); });
});
describe('GM saferoom status', () => {
  function status(allowed: string, ...ids: string[]) { const form = new FormData(); form.set('allowed', allowed); for (const id of ids) form.append('crawlerId', id); return form; }
  it('opens or closes the selected crawlers once each', async () => {
    const setSaferoom = vi.fn();
    await executeSaferoomStatusCommand(progressionFixture(I.gm), status('true', I.crawler, I.crawler), { setSaferoom });
    await executeSaferoomStatusCommand(progressionFixture(I.gm), status('false', I.crawler), { setSaferoom });
    expect(setSaferoom.mock.calls).toEqual([[I.game, [I.crawler], true], [I.game, [I.crawler], false]]);
  });
  it('rejects players, empty selections, unknown states and crawlers outside the game', async () => {
    const setSaferoom = vi.fn();
    await expect(executeSaferoomStatusCommand(progressionFixture(I.player), status('true', I.crawler), { setSaferoom })).rejects.toThrow('Only the GM');
    await expect(executeSaferoomStatusCommand(progressionFixture(I.gm), status('true'), { setSaferoom })).rejects.toThrow('Select');
    await expect(executeSaferoomStatusCommand(progressionFixture(I.gm), status('maybe', I.crawler), { setSaferoom })).rejects.toThrow('open or close');
    await expect(executeSaferoomStatusCommand(progressionFixture(I.gm), status('true', I.crawler, I.other), { setSaferoom })).rejects.toThrow('this game');
    expect(setSaferoom).not.toHaveBeenCalled();
  });
});
