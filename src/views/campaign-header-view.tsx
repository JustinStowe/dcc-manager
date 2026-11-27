import Link from 'next/link';
import { CampaignLive } from '@/components/campaign-live';
import { CampaignMenu, type CampaignMenuProps } from '@/components/campaign-menu';
import styles from '@/styles/campaign-header.module.css';

export interface CampaignAccount { email: string; liveUserId: string; signOutFailed?: boolean; onSignOut: () => Promise<void> }

export function CampaignHeaderView({ account, title, badge, menu }: {
  account: CampaignAccount; title: string; badge: string; menu: CampaignMenuProps | null;
}) {
  return <header className={styles.bar}>
    <div className={styles.start}>
      <Link href="/" className={styles.back}>← Back to game lobby</Link>
      {menu && <CampaignMenu {...menu} />}
    </div>
    <div className={styles.identity}>
      <div><p className={styles.eyebrow}>Dungeon Crawler Carl • Campaign</p><h1 className={styles.title}>{title}</h1></div>
      <p className={styles.badge}>{badge}</p>
    </div>
    <div className={styles.account}>
      <p>Signed in as <strong>{account.email}</strong></p>
      <form action={account.onSignOut}><button type="submit" className={styles.signOut}>Sign out</button></form>
      {account.signOutFailed && <p className={styles.error} role="alert">Could not sign out. Please try again.</p>}
      <CampaignLive userId={account.liveUserId} />
    </div>
  </header>;
}
