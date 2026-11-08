import { HealthTracker } from '@/components/health-tracker';
import type {
  CrawlerActions,
  CrawlerViewModel,
} from '@/models/crawler-presentation';
import styles from '@/styles/crawler.module.css';

interface CrawlerViewProps {
  model: CrawlerViewModel;
  actions: CrawlerActions;
}

export function CrawlerView({ model, actions }: CrawlerViewProps) {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Dungeon Crawler Carl Manager</h1>
      <p>Build your crawler’s health profile.</p>

      <fieldset className={styles.setup} disabled={model.isTracking || model.isBusy}>
        <legend>Crawler details</legend>

        <label className={styles.field} htmlFor="crawler-name">
          Crawler name
          <input
            id="crawler-name"
            className={styles.input}
            type="text"
            maxLength={200}
            value={model.name}
            onChange={actions.onNameChange}
            aria-describedby="health-result"
          />
        </label>

        <label className={styles.field} htmlFor="base-segments">
          Base health segments
          <input
            id="base-segments"
            className={styles.input}
            type="number"
            min={1}
            max={10000}
            step={1}
            value={model.baseSegments}
            onChange={actions.onBaseSegmentsChange}
            aria-describedby="health-result"
          />
        </label>

        <label className={styles.field} htmlFor="constitution">
          Constitution
          <input
            id="constitution"
            className={styles.input}
            type="number"
            min={0}
            max={10000}
            step={1}
            value={model.constitution}
            onChange={actions.onConstitutionChange}
            aria-describedby="health-result"
          />
        </label>
      </fieldset>

      <section className={styles.results}>
        <h2>{model.displayName}</h2>

        <div id="health-result" aria-live="polite">
          {model.maximumSegments === null ? (
            <p>{model.validationMessage}</p>
          ) : (
            <p>
              Maximum health: <strong>{model.maximumSegments}</strong> segments
            </p>
          )}
        </div>

        {model.activeCrawler !== null ? (
          <>
            <HealthTracker
              crawler={model.activeCrawler}
              onHealthChange={actions.onHealthChange}
              disabled={model.isBusy}
            />

            <p className={styles.hint}>
              Returning to setup discards unsaved changes. Your last saved
              crawler remains available to load. Starting again creates a new
              crawler at full health.
            </p>

            <button
              className={styles.secondaryButton}
              type="button"
              onClick={actions.onResetTracking}
              disabled={model.isBusy}
            >
              Reset tracking and edit
            </button>
          </>
        ) : (
          <button
            className={styles.primaryButton}
            type="button"
            disabled={!model.canStartTracking}
            onClick={actions.onStartTracking}
          >
            Start tracking
          </button>
        )}
      </section>

      <section className={styles.results} aria-labelledby="storage-heading" aria-busy={model.isBusy}>
        <h2 id="storage-heading">Browser save</h2>
        <p className={styles.hint}>
          One saved crawler is kept for this preview. Saving replaces the previous
          save. Return to setup to load it, or load it after refreshing the page.
        </p>
        <div className={styles.actions}>
          <button className={styles.primaryButton} type="button" disabled={!model.canSave} onClick={actions.onSave}>
            Save crawler
          </button>
          <button className={styles.secondaryButton} type="button" disabled={!model.canLoad} onClick={actions.onLoad}>
            Load saved crawler
          </button>
        </div>
        <p role="status">{model.persistenceMessage}</p>
      </section>

      <p className={styles.footnote}>
        Saves stay in this browser at this site address. They are not shared with
        players or other devices. Clearing site data removes them.
      </p>
    </main>
  );
}
