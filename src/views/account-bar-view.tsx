import styles from '@/styles/auth.module.css';

export function AccountBarView({ email, signOutFailed, onSignOut }: {
  email: string;
  signOutFailed: boolean;
  onSignOut: () => Promise<void>;
}) {
  return (
    <header className={styles.accountBar}>
      <div>
        <p>Signed in as <strong>{email}</strong></p>
        <p className={styles.hint}>Players see their own crawler. The campaign GM can see everyone.</p>
        {signOutFailed && <p className={styles.error} role="alert">Could not sign out. Please try again.</p>}
      </div>
      <form action={onSignOut}><button type="submit">Sign out</button></form>
    </header>
  );
}
