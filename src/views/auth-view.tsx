import Link from 'next/link';
import type { AuthActions, AuthViewModel } from '@/models/auth-presentation';
import styles from '@/styles/auth.module.css';

export function AuthView({ model, actions }: { model: AuthViewModel; actions: AuthActions }) {
  const isSignup = model.mode === 'signup';
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="auth-heading">
        <p className={styles.eyebrow}>Dungeon Crawler Carl Manager</p>
        <h1 id="auth-heading">{isSignup ? 'Create your account' : 'Welcome back, crawler'}</h1>
        <p>Sign in to begin. Campaign access will be assigned separately.</p>
        <form action={actions.onSubmit} className={styles.form}>
          <fieldset disabled={model.isPending} className={styles.fields}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={isSignup ? 8 : 1} maxLength={1024} required />
            {isSignup && <p className={styles.hint}>Use at least 8 characters. Your project may require a stronger password.</p>}
            <button type="submit">{model.isPending ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}</button>
          </fieldset>
          {model.error && <p className={styles.error} role="alert">{model.error}</p>}
          {model.notice && <p className={styles.notice} role="status">{model.notice}</p>}
        </form>
        <p>{isSignup ? 'Already have an account? ' : 'New here? '}<Link href={isSignup ? '/login' : '/signup'}>{isSignup ? 'Sign in' : 'Create an account'}</Link></p>
      </section>
    </main>
  );
}
