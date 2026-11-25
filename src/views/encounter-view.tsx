import type { Campaign } from '@/domain/campaign';
import type { Encounter } from '@/domain/encounters';
import { CampaignForm } from '@/components/campaign-form';
import { encounterAction } from '@/app/campaign/encounter-actions';
import styles from '@/styles/campaign.module.css';

export function EncounterView({ campaign, encounter }: { campaign: Campaign; encounter: Encounter | null }) {
  const available = campaign.crawlers.filter(({ crawler }) => crawler.ruleset === 'tutorial-v1' && !encounter?.participants.some((entry) => entry.id === crawler.id));
  return <section className={styles.panel} aria-label="Encounter tracker">
    <div className={styles.encounterHeading}>
      <div><h2>Encounter tracker</h2><p>Set initiative at the table. The GM controls turns and rounds for this game.</p></div>
      {encounter?.active && <strong>Round {encounter.round}</strong>}
    </div>
    {!encounter?.active ? <>
      {encounter && <p>Previous encounter ended at round {encounter.round}.</p>}
      <CampaignForm campaignId={campaign.id} label="Start encounter" submitAction={encounterAction}>
        <input type="hidden" name="operation" value="start" />
        <button type="submit">Start encounter</button>
      </CampaignForm>
    </> : <>
      <p>Add participants and set initiative, then start turns. Advancing past the last participant starts the next round and advances timed effects on participating crawlers. Keep using each crawler’s sheet for health and actions.</p>
      <ol className={styles.encounterList}>
        {encounter.participants.map((entry) => <li key={entry.id} className={entry.id === encounter.currentParticipantId ? styles.encounterCurrent : undefined}>
          <div><strong>{entry.name}</strong> <span>({entry.kind})</span>{entry.id === encounter.currentParticipantId && <b> · Current turn</b>}</div>
          <div>Initiative {entry.initiative}</div>
          <div className={styles.encounterRowActions}>
            <CampaignForm campaignId={campaign.id} label={`Change ${entry.name} initiative`} submitAction={encounterAction}>
              <input type="hidden" name="operation" value="initiative" /><input type="hidden" name="version" value={encounter.version} /><input type="hidden" name="participantId" value={entry.id} />
              <label>Initiative <input name="initiative" type="number" min={-1000} max={1000} step={1} defaultValue={entry.initiative} required /></label>
              <button type="submit">Save initiative</button>
            </CampaignForm>
            <CampaignForm campaignId={campaign.id} label={`Remove ${entry.name}`} submitAction={encounterAction}>
              <input type="hidden" name="operation" value="remove" /><input type="hidden" name="version" value={encounter.version} /><input type="hidden" name="participantId" value={entry.id} />
              <label><input type="checkbox" name="confirmed" value="yes" required /> Confirm removal</label>
              <button type="submit">Remove</button>
            </CampaignForm>
          </div>
        </li>)}
      </ol>
      {encounter.participants.length === 0 && <p>Add a crawler or monster to set the first turn.</p>}
      {encounter.participants.length > 0 && <CampaignForm campaignId={campaign.id} label="Advance encounter turn" submitAction={encounterAction}>
        <input type="hidden" name="operation" value="next" /><input type="hidden" name="version" value={encounter.version} />
        <button type="submit">{encounter.currentParticipantId === null ? 'Start turns' : 'Next turn'}</button>
      </CampaignForm>}
      <div className={styles.encounterAdd}>
        {available.length > 0 && encounter.participants.length < 50 && <CampaignForm campaignId={campaign.id} label="Add crawler to encounter" submitAction={encounterAction}>
          <input type="hidden" name="operation" value="add-crawler" /><input type="hidden" name="version" value={encounter.version} />
          <label>Crawler <select name="participantId" required>{available.map(({ crawler }) => <option key={crawler.id} value={crawler.id}>{crawler.name}</option>)}</select></label>
          <label>Initiative <input name="initiative" type="number" min={-1000} max={1000} step={1} defaultValue={0} required /></label>
          <button type="submit">Add crawler</button>
        </CampaignForm>}
        {encounter.participants.length < 50 && <CampaignForm campaignId={campaign.id} label="Add monster to encounter" submitAction={encounterAction}>
          <input type="hidden" name="operation" value="add-monster" /><input type="hidden" name="version" value={encounter.version} />
          <label>Monster name <input name="name" maxLength={100} required /></label>
          <label>Initiative <input name="initiative" type="number" min={-1000} max={1000} step={1} defaultValue={0} required /></label>
          <button type="submit">Add monster</button>
        </CampaignForm>}
      </div>
      <details className={styles.dangerZone}><summary>End encounter</summary>
        <CampaignForm campaignId={campaign.id} label="End encounter" submitAction={encounterAction}>
          <input type="hidden" name="operation" value="end" /><input type="hidden" name="version" value={encounter.version} />
          <label><input type="checkbox" name="confirmed" value="yes" required /> Confirm ending this encounter</label>
          <button type="submit">End encounter</button>
        </CampaignForm>
      </details>
    </>}
  </section>;
}
