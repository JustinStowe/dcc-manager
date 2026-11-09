export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export interface AuthenticationGateway {
  signIn(credentials: Credentials): Promise<{ error: boolean }>;
  signUp(credentials: Credentials): Promise<{ error: boolean; hasSession: boolean }>;
  signOut(): Promise<{ error: boolean }>;
}

export interface AuthenticationResult {
  readonly status: 'authenticated' | 'confirmation-required' | 'signed-out' | 'error';
  readonly message: string;
}

function validate(credentials: Credentials, isSignup: boolean): Credentials {
  const email = credentials.email.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RangeError('Enter a valid email address.');
  }
  if (credentials.password.length === 0 || credentials.password.length > 1024) {
    throw new RangeError('Enter a password between 1 and 1024 characters.');
  }
  if (isSignup && credentials.password.length < 8) {
    throw new RangeError('Use at least 8 characters for your new password.');
  }
  // Passwords are never trimmed or normalized.
  return { email, password: credentials.password };
}

export async function authenticate(
  gateway: AuthenticationGateway,
  credentials: Credentials,
  mode: 'signin' | 'signup',
): Promise<AuthenticationResult> {
  let validated: Credentials;
  try { validated = validate(credentials, mode === 'signup'); }
  catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return { status: 'error', message: error.message };
  }
  try {
    if (mode === 'signin') {
      const result = await gateway.signIn(validated);
      return result.error
        ? { status: 'error', message: 'Unable to sign in. Check your email and password, and confirm your email if required.' }
        : { status: 'authenticated', message: '' };
    }
    const result = await gateway.signUp(validated);
    if (result.error) {
      return { status: 'error', message: 'Unable to create an account. Check your details and the project password requirements, or try signing in.' };
    }
    return result.hasSession
      ? { status: 'authenticated', message: '' }
      : { status: 'confirmation-required', message: 'Check your email for a confirmation link. If you already have an account, try signing in.' };
  } catch {
    return { status: 'error', message: 'Unable to reach the sign-in service. Please try again.' };
  }
}

export async function endSession(gateway: AuthenticationGateway): Promise<AuthenticationResult> {
  try {
    const result = await gateway.signOut();
    if (!result.error) return { status: 'signed-out', message: '' };
  } catch {
    // Never claim sign-out succeeded if the provider request failed.
  }
  return { status: 'error', message: 'Could not sign out. Please try again.' };
}
