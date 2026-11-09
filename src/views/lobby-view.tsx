import Link from 'next/link';
import { LobbyForm } from '@/components/lobby-form';
import { DeleteGame } from '@/components/delete-game';
import type { GameLobby } from '@/services/game-lobby';
import styles from '@/styles/campaign.module.css';

export function LobbyView({ lobby, error, notice }: { lobby: GameLobby; error: string | null; notice?: string | null }) {
  return (
    <main className={styles.page}>
      <h1>Game lobby</h1><p>Host a game as GM, or join a game as a player.</p>
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.lobbyGrid}>
        <section>
          <h2><Link href="/crawlers">Create crawler</Link></h2>
        </section>
        <details className={styles.panel}>
          <summary className={styles.choice}>Host a Game</summary>
          <details className={styles.submenu}>
          <summary className={styles.subchoice}>New Game</summary>
          <LobbyForm operation="host" label="Create game">
            <label>Game name<input name="name" type="text" maxLength={200} required /></label>
            <p>You will be this game&apos;s GM. Share its Game Code with your players.</p>
          </LobbyForm>
          </details>
          <details className={styles.submenu}>
          <summary className={styles.subchoice}>Existing Game</summary>
          {lobby.hosted.length ? <ul className={styles.gameList}>{lobby.hosted.map((game) => <li key={game.id}><Link href={`/games/${game.id}`}>{game.name}</Link><DeleteGame game={game} /></li>)}</ul> : <p>You have not hosted any games yet.</p>}
          </details>
        </details>
        <details className={styles.panel}>
          <summary className={styles.choice}>Join a Game</summary>
          <details className={styles.submenu}>
          <summary className={styles.subchoice}>New Game</summary>
          <LobbyForm operation="join" label="Join game">
            <label>Game Code<input name="code" type="text" maxLength={80} autoComplete="off" spellCheck={false} required /></label>
            <p>Enter the code from your GM to join and create your crawler.</p>
          </LobbyForm>
          </details>
          <details className={styles.submenu}>
          <summary className={styles.subchoice}>Existing Game</summary>
          {lobby.joined.length ? <ul className={styles.gameList}>{lobby.joined.map((game) => <li key={game.id}><Link href={`/games/${game.id}`}>{game.name}</Link></li>)}</ul> : <p>You have not joined any games yet.</p>}
          </details>
        </details>
      </div>
    </main>
  );
}
