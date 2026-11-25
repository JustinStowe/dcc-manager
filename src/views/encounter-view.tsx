import type { Campaign } from '@/domain/campaign';
import type { Encounter } from '@/domain/encounters';
import { CampaignForm } from '@/components/campaign-form';
import { CreaturePicker } from '@/components/creature-picker';
import { getCreature } from '@/domain/creature-catalog';
import { encounterAction } from '@/app/campaign/encounter-actions';
import styles from '@/styles/campaign.module.css';

const PHASE_LABELS = {
  'mob-declaration': 'Mob action declaration',
  'crawler-reaction': 'Crawler reaction',
  'mob-resolution': 'Mob action resolution',
  'crawler-action': 'Crawler action',
  cleanup: 'Clean up',
} as const;

export function EncounterView({ campaign, encounter }: { campaign: Campaign; encounter: Encounter | null }) {
  const available = campaign.crawlers.filter(({ crawler }) => crawler.ruleset === 'tutorial-v1' && !encounter?.participants.some((entry) => entry.id === crawler.id));
  return <section className={styles.panel} aria-label="Encounter tracker">
    <div className={styles.encounterHeading}>
      <div><h2>Encounter tracker</h2>{encounter?.active && <span className={styles.encounterRound}>Round {encounter.round} · {encounter.mode === 'mob' ? PHASE_LABELS[encounter.phase!] : 'PvP'}</span>}</div>
      {encounter?.active && encounter.participants.length > 0 && <CampaignForm campaignId={campaign.id} label="Advance encounter turn" submitAction={encounterAction}>
        <input type="hidden" name="operation" value="next" /><input type="hidden" name="version" value={encounter.version} />
        <button type="submit">{encounter.mode === 'mob' ? encounter.phase === 'cleanup' ? 'Finish round' : 'Next phase' : encounter.currentParticipantId === null ? 'Start turns' : 'Next turn'}</button>
      </CampaignForm>}
    </div>
    {!encounter?.active ? <>
      <CampaignForm campaignId={campaign.id} label="Start encounter" submitAction={encounterAction}>
        <input type="hidden" name="operation" value="start" />
        <label>Combat flow <select name="mode" defaultValue="mob"><option value="mob">Mob combat · official phases</option><option value="pvp">Optional PvP · initiative</option></select></label>
        <button type="submit">Start encounter</button>
      </CampaignForm>
    </> : <>
      <p className={styles.encounterHint}>{encounter.mode === 'mob' ? 'Mob combat has no initiative. The marker shows which group is acting; crawlers choose their own order. Finish Clean up to advance timed effects.' : 'Each round, enter d20 + Dex totals. Tied crawlers act simultaneously. A sneak attacker rolls the first round with Advantage.'}</p>
      <ul className={styles.encounterList} aria-label="Encounter participants">
        {encounter.participants.map((entry) => {
          const creature = getCreature(entry.catalogId);
          const active = encounter.mode === 'mob'
            ? encounter.phase !== 'cleanup' && (encounter.phase === 'crawler-reaction' || encounter.phase === 'crawler-action' ? entry.kind === 'crawler' : entry.kind === 'monster')
            : encounter.currentParticipantId !== null && entry.initiative !== null && entry.initiative === encounter.participants.find((p) => p.id === encounter.currentParticipantId)?.initiative;
          return <li key={entry.id} className={active ? styles.encounterCurrent : undefined}>
          <span className={styles.encounterName}>{active && <span className={styles.encounterMarker} aria-label={encounter.mode === 'mob' ? 'Acting group' : 'Current turn'}>▶</span>}<strong>{entry.name}</strong> <small>{entry.kind}</small></span>
          <span className={styles.encounterInitiative}>Initiative <strong>{entry.initiative ?? '—'}</strong></span>
          <details className={styles.encounterManage}><summary>Manage</summary>
          {entry.kind === 'monster' && creature && <div className={styles.creatureWriteup}>
            <h3>{creature.name}</h3>
            <p>{creature.classification} · Level {creature.level} · {creature.source === 'core' ? 'Core Rulebook' : creature.source === 'toolkit' ? 'Game Master’s Toolkit' : 'Par for the Course'}, PDF p. {creature.pdfPage}</p>
            <p><strong>Health Bar:</strong> {entry.currentHealthSlots} / {entry.maxHealthSlots} slots ({Math.round(100 * (entry.currentHealthSlots ?? 0) / creature.healthSlots)}%)</p>
            <dl className={styles.creatureStats}><div><dt>Surprise</dt><dd>{creature.surprise}</dd></div><div><dt>Evade</dt><dd>{creature.evade}</dd></div><div><dt>Move</dt><dd>{creature.move}</dd></div><div><dt>DR</dt><dd>{creature.dr}</dd></div></dl>
            <p><strong>Stats:</strong> {creature.stats}</p>
            <h4>Attacks and notes (excerpt)</h4>
            <div className={styles.creatureDetails}>{creature.details}</div>
            <CampaignForm campaignId={campaign.id} label={`Update ${entry.name} health`} submitAction={encounterAction}>
              <input type="hidden" name="operation" value="monster-health" /><input type="hidden" name="version" value={encounter.version} /><input type="hidden" name="participantId" value={entry.id} />
              <label>Remaining Health Bar slots <input name="healthSlots" type="number" min={0} max={entry.maxHealthSlots ?? 0} step={1} defaultValue={entry.currentHealthSlots ?? 0} required /></label>
              <button type="submit">Save health</button>
            </CampaignForm>
          </div>}
          {entry.kind === 'monster' && !creature && <CampaignForm campaignId={campaign.id} label={`Attach official creature write-up to ${entry.name}`} submitAction={encounterAction}>
            <input type="hidden" name="operation" value="assign-creature" /><input type="hidden" name="version" value={encounter.version} /><input type="hidden" name="participantId" value={entry.id} />
            <CreaturePicker label="Attach write-up" /><button type="submit">Attach creature</button>
          </CampaignForm>}
          <div className={styles.encounterRowActions}>
            {encounter.mode === 'pvp' &&
            <CampaignForm campaignId={campaign.id} label={`Change ${entry.name} initiative`} submitAction={encounterAction}>
              <input type="hidden" name="operation" value="initiative" /><input type="hidden" name="version" value={encounter.version} /><input type="hidden" name="participantId" value={entry.id} />
              <label>d20 + Dex total <input name="initiative" type="number" min={1} max={10020} step={1} defaultValue={entry.initiative ?? ''} required /></label>
              <button type="submit">Save initiative</button>
            </CampaignForm>}
            <CampaignForm campaignId={campaign.id} label={`Remove ${entry.name}`} submitAction={encounterAction}>
              <input type="hidden" name="operation" value="remove" /><input type="hidden" name="version" value={encounter.version} /><input type="hidden" name="participantId" value={entry.id} />
              <label><input type="checkbox" name="confirmed" value="yes" required /> Confirm removal</label>
              <button type="submit">Remove</button>
            </CampaignForm>
          </div>
          </details>
        </li>;})}
      </ul>
      {encounter.participants.length === 0 && <p>Add a participant to begin.</p>}
      <details className={styles.encounterAddDetails}><summary>Add participant</summary><div className={styles.encounterAdd}>
        {available.length > 0 && encounter.participants.length < 50 && <CampaignForm campaignId={campaign.id} label="Add crawler to encounter" submitAction={encounterAction}>
          <input type="hidden" name="operation" value="add-crawler" /><input type="hidden" name="version" value={encounter.version} />
          <label>Crawler <select name="participantId" required>{available.map(({ crawler }) => <option key={crawler.id} value={crawler.id}>{crawler.name}</option>)}</select></label>
          <button type="submit">Add crawler</button>
        </CampaignForm>}
        {encounter.mode === 'mob' && encounter.participants.length < 50 && <CampaignForm campaignId={campaign.id} label="Add monster to encounter" submitAction={encounterAction}>
          <input type="hidden" name="operation" value="add-monster" /><input type="hidden" name="version" value={encounter.version} />
          <CreaturePicker />
          <button type="submit">Add monster</button>
        </CampaignForm>}
      </div></details>
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
