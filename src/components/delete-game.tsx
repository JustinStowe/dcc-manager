'use client';

import { useGameDeletionController } from '@/controllers/use-lobby-form-controller';
import type { GameSummary } from '@/services/game-lobby';
import styles from '@/styles/campaign.module.css';

export function DeleteGame({ game }: { game: GameSummary }) {
  const { model, actions } = useGameDeletionController();
  if (model.notice) return <p role="status">{model.notice}</p>;
  if (!model.confirming) return <button type="button" className={styles.danger} onClick={actions.onBegin} aria-label={`Delete ${game.name}`}>Delete game</button>;
  return (
    <form action={actions.onSubmit} className={styles.form} aria-label={`Confirm deletion of ${game.name}`}>
      <fieldset className={styles.fields} disabled={model.isPending}>
        <legend>Permanently delete {game.name}?</legend>
        <p>All game members, crawlers, and game progress will be removed. This cannot be undone. Saved account profiles are kept.</p>
        <input type="hidden" name="gameId" value={game.id} />
        <input type="hidden" name="confirmed" value="yes" />
        <label>Type {game.name} to confirm<input name="confirmationName" value={model.name} onChange={actions.onNameChange} autoComplete="off" required maxLength={200} /></label>
        <div className={styles.actions}>
          <button type="button" onClick={actions.onCancel}>Cancel</button>
          <button type="submit" className={styles.danger} disabled={model.name !== game.name}>{model.isPending ? 'Deleting…' : 'Permanently delete game'}</button>
        </div>
      </fieldset>
      {model.error && <p role="alert" className={styles.error}>{model.error}</p>}
    </form>
  );
}