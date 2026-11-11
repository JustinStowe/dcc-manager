import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createTutorialProfile } from '@/domain/tutorial';
import type { SavedCrawlerProfile } from '@/services/crawler-profiles';
import { tutorialDraftFixture } from '@/test/tutorial-fixture';
import { LobbyView } from './lobby-view';

vi.mock('@/app/crawlers/actions', () => ({ crawlerProfileAction: vi.fn() }));
vi.mock('@/app/campaign/actions', () => ({ campaignAction: vi.fn() }));
vi.mock('@/app/lobby/actions', () => ({ lobbyAction: vi.fn(), deleteGameAction: vi.fn() }));

const profile: SavedCrawlerProfile = {
  slot: 2, name: 'Carl', profile: createTutorialProfile(tutorialDraftFixture()),
  rollId: null, version: '22222222-2222-2222-2222-222222222222',
};

function render(profiles: readonly SavedCrawlerProfile[] = [], profileError: string | null = null) {
  return renderToStaticMarkup(createElement(LobbyView, {
    lobby: { hosted: [], joined: [] }, error: null, profiles, profileError,
  }));
}

describe('lobby crawler slots', () => {
  it('uses the same dropdown style for all three lobby choices', () => {
    const markup = render();
    const choices = [...markup.matchAll(/<summary class="([^"]+)">(Create Crawler|Host a Game|Join a Game)<\/summary>/g)];
    expect(choices.map((match) => match[2])).toEqual(['Create Crawler', 'Host a Game', 'Join a Game']);
    expect(new Set(choices.map((match) => match[1])).size).toBe(1);
    expect(markup).not.toContain('Find saved preview crawler');
  });

  it('offers creation in exactly three empty slots', () => {
    const markup = render();
    expect(markup).toContain('Saved crawlers: 0/3');
    for (const slot of [1, 2, 3]) {
      expect(markup).toContain(`Slot ${slot}: Empty`);
      expect(markup).toContain(`href="/crawlers?slot=${slot}"`);
    }
    expect(markup.match(/>Create crawler<\/a>/g)).toHaveLength(3);
    expect(markup).not.toContain('Delete crawler');
  });

  it('offers review and versioned, confirmed deletion for an occupied slot', () => {
    const markup = render([profile]);
    expect(markup).toContain('Saved crawlers: 1/3');
    expect(markup).toContain('Slot 2: Carl');
    expect(markup).toMatch(/href="\/crawlers\?slot=2"[^>]*>Review crawler<\/a>/);
    expect(markup.match(/>Create crawler<\/a>/g)).toHaveLength(2);
    expect(markup).toContain('name="operation" value="delete-profile"');
    expect(markup).toContain('name="slot" value="2"');
    expect(markup).toContain(`name="version" value="${profile.version}"`);
    expect(markup).toMatch(/<input (?=[^>]*name="confirmed")(?=[^>]*required="")(?=[^>]*value="yes")[^>]*\/>/);
    expect(markup).toContain('Existing game crawlers will not change.');
  });

  it('offers only review and deletion when all three slots are occupied', () => {
    const markup = render([1, 2, 3].map((slot) => ({ ...profile, slot, name: `Crawler ${slot}` })));
    expect(markup).toContain('Saved crawlers: 3/3');
    expect(markup.match(/>Review crawler<\/a>/g)).toHaveLength(3);
    expect(markup.match(/>Delete crawler<\/button>/g)).toHaveLength(3);
    expect(markup).not.toContain('>Create crawler</a>');
  });

  it('does not present unavailable profile data as empty slots', () => {
    const markup = render([], 'Profile storage unavailable');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Profile storage unavailable');
    expect(markup).not.toContain('/crawlers?slot=');
    expect(markup).toContain('Host a Game');
    expect(markup).toContain('Join a Game');
  });
});
