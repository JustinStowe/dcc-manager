import { describe, expect, it } from 'vitest';
import { dccDomain } from './dcc-domain';

describe('dccDomain', () => {
  it('should work', () => {
    expect(dccDomain()).toEqual('dcc-domain');
  });
});
