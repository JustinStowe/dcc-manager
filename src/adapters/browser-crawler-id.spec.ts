import { webcrypto } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validate, version } from 'uuid';
import { createBrowserCrawlerId } from './browser-crawler-id';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('browser crawler ID', () => {
  it('uses native randomUUID when available', () => {
    const id = '27dc663a-8560-4f3a-9781-f07d68c73189';
    const randomUUID = vi.fn(() => id);
    vi.stubGlobal('crypto', { randomUUID });

    expect(createBrowserCrawlerId()).toBe(id);
    expect(randomUUID).toHaveBeenCalledOnce();
  });

  it('creates distinct version 4 UUIDs without randomUUID on HTTP origins', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
    });

    const firstId = createBrowserCrawlerId();
    const secondId = createBrowserCrawlerId();

    expect(validate(firstId)).toBe(true);
    expect(version(firstId)).toBe(4);
    expect(validate(secondId)).toBe(true);
    expect(version(secondId)).toBe(4);
    expect(secondId).not.toBe(firstId);
  });
});