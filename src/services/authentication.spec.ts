import { describe, expect, it } from 'vitest';
import { authenticate, endSession, type AuthenticationGateway, type Credentials } from './authentication';

const credentials = { email: 'crawler@example.com', password: 'a strong password' };

function makeGateway() {
  const calls: Credentials[] = [];
  const gateway: AuthenticationGateway = {
    async signIn(value) { calls.push(value); return { error: false }; },
    async signUp(value) { calls.push(value); return { error: false, hasSession: false }; },
    async signOut() { return { error: false }; },
  };
  return { gateway, calls };
}

describe('authentication', () => {
  it('signs in with trimmed email and an unchanged password', async () => {
    const { gateway, calls } = makeGateway();
    const result = await authenticate(gateway, { email: ' crawler@example.com ', password: ' secret with spaces ' }, 'signin');
    expect(result.status).toBe('authenticated');
    expect(calls).toEqual([{ email: 'crawler@example.com', password: ' secret with spaces ' }]);
  });

  it.each(['', 'invalid', 'a@', '@example.com', 'a b@example.com', 'a'.repeat(255) + '@example.com'])(
    'rejects invalid email without contacting the provider: %s', async (email) => {
      const { gateway, calls } = makeGateway();
      expect((await authenticate(gateway, { ...credentials, email }, 'signin')).status).toBe('error');
      expect(calls.length).toBe(0);
    },
  );

  it.each(['', 'a'.repeat(1025)])('rejects invalid password length', async (password) => {
    const { gateway, calls } = makeGateway();
    expect((await authenticate(gateway, { ...credentials, password }, 'signin')).status).toBe('error');
    expect(calls.length).toBe(0);
  });

  it('does not apply new-account password length rules during sign-in', async () => {
    const { gateway } = makeGateway();
    expect((await authenticate(gateway, { ...credentials, password: 'short' }, 'signin')).status).toBe('authenticated');
  });

  it('rejects a short new-account password before contacting the provider', async () => {
    const { gateway, calls } = makeGateway();
    expect((await authenticate(gateway, { ...credentials, password: 'short' }, 'signup')).status).toBe('error');
    expect(calls.length).toBe(0);
  });

  it('handles rejected sign-in without claiming authentication succeeded', async () => {
    const { gateway } = makeGateway();
    gateway.signIn = async () => ({ error: true });
    expect((await authenticate(gateway, credentials, 'signin')).status).toBe('error');
  });

  it('handles provider exceptions without exposing their contents', async () => {
    const { gateway } = makeGateway();
    gateway.signIn = async () => { throw new Error('private provider detail'); };
    const result = await authenticate(gateway, credentials, 'signin');
    expect(result).toEqual({ status: 'error', message: 'Unable to reach the sign-in service. Please try again.' });
  });

  it('requires confirmation when signup returns no session', async () => {
    const { gateway } = makeGateway();
    expect((await authenticate(gateway, credentials, 'signup')).status).toBe('confirmation-required');
  });

  it('accepts a signup session when the provider returns one', async () => {
    const { gateway } = makeGateway();
    gateway.signUp = async () => ({ error: false, hasSession: true });
    expect((await authenticate(gateway, credentials, 'signup')).status).toBe('authenticated');
  });

  it('handles rejected signup even if an inconsistent result includes a session', async () => {
    const { gateway } = makeGateway();
    gateway.signUp = async () => ({ error: true, hasSession: true });
    expect((await authenticate(gateway, credentials, 'signup')).status).toBe('error');
  });

  it('handles signup connectivity failures', async () => {
    const { gateway } = makeGateway();
    gateway.signUp = async () => { throw new Error('offline'); };
    expect((await authenticate(gateway, credentials, 'signup')).status).toBe('error');
  });
});

describe('sign-out', () => {
  it('reports success when the provider signs out', async () => {
    expect((await endSession(makeGateway().gateway)).status).toBe('signed-out');
  });
  it('does not report success when the provider rejects sign-out', async () => {
    const { gateway } = makeGateway();
    gateway.signOut = async () => ({ error: true });
    expect((await endSession(gateway)).status).toBe('error');
  });
  it('handles network failure during sign-out', async () => {
    const { gateway } = makeGateway();
    gateway.signOut = async () => { throw new Error('offline'); };
    expect((await endSession(gateway)).status).toBe('error');
  });
});
