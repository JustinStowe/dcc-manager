import { describe, expect, it, vi } from 'vitest';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
import { executeProfileCommand, requireProfileSlot, type CrawlerProfilePort } from './crawler-profiles';

const USER = '11111111-1111-1111-1111-111111111111';
const VERSION = '22222222-2222-2222-2222-222222222222';
function fixture() {
  const port: CrawlerProfilePort = { save: vi.fn(), remove: vi.fn(), use: vi.fn() };
  const form = new FormData();
  form.set('operation', 'save-profile'); form.set('slot', '1'); form.set('name', ' Carl ');
  form.set('draft', JSON.stringify(tutorialDraftFixture()));
  return { port, form };
}
describe('saved crawler profiles', () => {
  it.each(['0', '4', '1.5', '', '01'])('rejects invalid slot %s', (value) => {
    expect(() => requireProfileSlot(value)).toThrow();
  });
  it('saves a validated starting profile with a trimmed name', async () => {
    const { port, form } = fixture();
    await executeProfileCommand(USER, form, port);
    expect(port.save).toHaveBeenCalledWith(expect.objectContaining({ slot: 1, name: 'Carl', version: null, profile: expect.objectContaining({ mana: 6, favor: 1 }) }));
  });
  it('does not save forged rolled stats without a roll ID', async () => {
    const { port, form } = fixture();
    form.set('draft', JSON.stringify({ ...tutorialDraftFixture(), method: 'rolled' }));
    await expect(executeProfileCommand(USER, form, port)).rejects.toThrow('Recover');
    expect(port.save).not.toHaveBeenCalled();
  });
  it('requires confirmation before deleting a profile', async () => {
    const { port, form } = fixture(); form.set('operation', 'delete-profile'); form.set('version', VERSION);
    await expect(executeProfileCommand(USER, form, port)).rejects.toThrow('Confirm');
    expect(port.remove).not.toHaveBeenCalled();
    form.set('confirmed', 'yes'); await executeProfileCommand(USER, form, port);
    expect(port.remove).toHaveBeenCalledWith(1, VERSION);
  });
  it('uses the saved slot rather than accepting a client-provided profile', async () => {
    const { port, form } = fixture(); form.set('operation', 'use-profile'); form.set('version', VERSION); form.set('campaignId', USER);
    await executeProfileCommand(USER, form, port);
    expect(port.use).toHaveBeenCalledWith(USER, 1, VERSION);
  });
  it('propagates slot conflicts without claiming success', async () => {
    const { port, form } = fixture(); vi.mocked(port.save).mockRejectedValue(new Error('Slot changed'));
    await expect(executeProfileCommand(USER, form, port)).rejects.toThrow('Slot changed');
  });
});