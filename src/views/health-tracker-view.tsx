import type {
  HealthTrackerActions,
  HealthTrackerViewModel,
} from '@/models/crawler-presentation';
import styles from '@/styles/crawler.module.css';

interface HealthTrackerViewProps {
  model: HealthTrackerViewModel;
  actions: HealthTrackerActions;
}

export function HealthTrackerView({ model, actions }: HealthTrackerViewProps) {
  return (
    <section className={styles.tracker} aria-labelledby="health-tracker-heading">
      <h3 id="health-tracker-heading">Current health</h3>

      <p className={styles.healthTotal} aria-live="polite">
        <strong>{model.currentSegments}</strong> / {model.maximumSegments} segments
      </p>

      <progress
        className={styles.healthBar}
        aria-label="Current health"
        value={model.currentSegments}
        max={model.maximumSegments}
      />

      <div className={styles.healthControls}>
        <label className={styles.field} htmlFor="health-amount">
          Damage or healing amount
          <input
            id="health-amount"
            className={styles.input}
            type="number"
            min={1}
            step={1}
            value={model.amount}
            disabled={model.isDisabled}
            onChange={actions.onAmountChange}
            aria-invalid={!model.amountIsValid}
            aria-describedby="health-amount-help"
          />
        </label>

        <p id="health-amount-help" className={styles.hint}>
          Enter a positive whole number of segments.
        </p>

        <div className={styles.actions}>
          <button
            className={styles.damageButton}
            type="button"
            disabled={!model.canTakeDamage}
            onClick={actions.onTakeDamage}
          >
            Take damage
          </button>

          <button
            className={styles.healButton}
            type="button"
            disabled={!model.canHeal}
            onClick={actions.onHeal}
          >
            Heal
          </button>
        </div>
      </div>
    </section>
  );
}
