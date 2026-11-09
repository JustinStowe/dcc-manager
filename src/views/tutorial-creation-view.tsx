import { CampaignForm } from '@/components/campaign-form';
import { STAT_KEYS, STAGES, TUTORIAL_CATALOG } from '@/domain/tutorial';
import type { useTutorialCreationController } from '@/controllers/use-tutorial-creation-controller';
import styles from '@/styles/campaign.module.css';

export interface TutorialCreationProps {
  campaignId: string; owners: readonly { id: string; label: string }[];
  conversion?: { id: string; version: string; name: string; slots: number; oldHealth: string };
}
type Controller = ReturnType<typeof useTutorialCreationController>;
export function TutorialCreationView({ campaignId, owners, conversion, model, actions }: TutorialCreationProps & Controller) {
  const selected = STAGES.flatMap((stage) => [model.values[`${stage}_1`], model.values[`${stage}_2`]]);
  return (
    <section className={styles.panel}>
      <h2>{conversion ? 'Review and convert prototype' : 'Create a Level 1 Human crawler'}</h2>
      <p>Human · Level 1 · Floor 1 · Medium (4) · Move 20 ft · Step 10 ft. Race and Class selection opens on the Third Floor.</p>
      {conversion && <p className={styles.error}>Previous prototype health: {conversion.oldHealth}. Conversion archives the old record and replaces its prototype stats with this reviewed Level 1 build.</p>}
      <CampaignForm campaignId={campaignId} label={conversion ? 'Confirm Tutorial conversion' : 'Save Tutorial crawler'}>
        <input type="hidden" name="operation" value={conversion ? 'tutorial-convert' : 'tutorial-create'} />
        <input type="hidden" name="draft" value={JSON.stringify(model.draft)} />
        <input type="hidden" name="rollId" value={model.rollId} />
        <fieldset className={styles.fields} disabled={model.isRolling}>
          <legend>1. Identity</legend>
          <label>Owner<select name="ownerUserId" value={model.values.ownerUserId} onChange={actions.onChange}>{owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.label}</option>)}</select></label>
          <label>Name<input name="name" value={model.values.name} onChange={actions.onChange} required maxLength={200} /></label>
          <label>Gender / pronouns (optional)<input name="pronouns" value={model.values.pronouns} onChange={actions.onChange} maxLength={80} /></label>
          <p>A unique Crawler Number will be assigned within this game when saved.</p>
          <h3>2. Assign starting stats</h3>
          <p>{model.rollId ? 'Rolled method, locked to the saved results.' : 'Standard array: use 2, 3, 4, 5, and 6 once each. Enhanced and Unenhanced begin equal.'}</p>
          {STAT_KEYS.map((key) => <label key={key}>{key}<input name={key} type="number" min={2} max={6} step={1} required value={model.values[key]} readOnly={Boolean(model.rollId)} onChange={actions.onChange} /></label>)}
          <button type="button" onClick={actions.onRoll} disabled={model.isRolling}>{model.isRolling ? 'Retrieving roll…' : model.rollId ? 'Recover saved roll' : 'Use rolled stats — locks this method'}</button>
          <p>Rolling uses five server-generated d6 results, rerolling 1s. Reopening this form lets you recover the same roll.</p>
          {model.message && <p role="status">{model.message}</p>}
          <h3>3. Background Skills</h3>
          <p>Choose two Skills from each background. All ten background/combat Skills must be different.</p>
          {STAGES.map((stage) => {
            const category = TUTORIAL_CATALOG.backgrounds.find((item) => item.id === model.values[`${stage}_category`]);
            return <fieldset className={styles.fields} key={stage}>
              <legend>{stage} — Rank {stage === 'career' ? 3 : stage === 'hobby' ? 2 : 1}</legend>
              <label>Background<select name={`${stage}_category`} value={model.values[`${stage}_category`]} onChange={actions.onChange} required><option value="">Choose a background</option>{TUTORIAL_CATALOG.backgrounds.filter((item) => item.stage === stage).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              {[1, 2].map((slot) => <label key={slot}>Skill {slot}<select name={`${stage}_${slot}`} value={model.values[`${stage}_${slot}`]} onChange={actions.onChange} disabled={!category} required><option value="">Choose a Skill</option>{category?.skills.map((skill) => <option key={skill.name} value={skill.name} disabled={selected.includes(skill.name) && model.values[`${stage}_${slot}`] !== skill.name}>{skill.name} ({skill.stat ?? 'Passive'})</option>)}</select></label>)}
            </fieldset>;
          })}
          <h3>4. Combat and starting resources</h3>
          <p>Unarmed Combat starts at Rank 3. Choose another combat Skill at Rank 3. Heal starts at Rank 1, costs 2 Mana, and restores 2 health slots to yourself.</p>
          <label>Second combat Skill<select name="combatId" value={model.values.combatId} onChange={actions.onChange}>{TUTORIAL_CATALOG.combat.map((item) => <option key={item.id} value={item.id} disabled={selected.includes(item.name)}>{item.name} ({item.kind})</option>)}</select></label>
          <p>The hand-to-hand choices also include their prescribed Rank 3 Damage Effect: Iron Punch, Smush, Skullcracker, or Toss.</p>
          <p>An attack Spell requires Intelligence of at least 4 and starts with 5 Standard Mana Potions. Record those in starting gear. New Humans start with 10 health slots, full Mana equal to Intelligence, and 1 AI Favor.</p>
          <h3>5. Story and starting gear (optional)</h3>
          {(['trauma', 'looseEnds', 'regret', 'gear'] as const).map((key) => <label key={key}>{key === 'trauma' ? 'Past trauma' : key === 'looseEnds' ? 'Loose ends' : key === 'regret' ? 'Regret' : 'Starting clothing, weapon, useful item, and weird stuff'}<textarea name={key} value={model.values[key]} onChange={actions.onChange} maxLength={key === 'gear' ? 4000 : 2000} rows={3} /></label>)}
          {conversion && <>
            <input type="hidden" name="crawlerId" value={conversion.id} /><input type="hidden" name="version" value={conversion.version} />
            <label>Remaining official health slots<input name="remainingSlots" type="number" min={0} max={10} step={1} defaultValue={conversion.slots} required /></label>
            <p>The suggested slots round the old remaining percentage down. Review it explicitly. Zero health must remain zero.</p>
            <label><input type="checkbox" name="reviewed" value="yes" required /> I reviewed the replacement stats and remaining health.</label>
          </>}
          <button type="submit">{conversion ? 'Convert after GM review' : 'Create crawler and open sheet'}</button>
        </fieldset>
      </CampaignForm>
    </section>
  );
}
