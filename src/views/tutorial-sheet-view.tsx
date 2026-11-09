import type { Crawler } from '@/domain';
import { STAT_KEYS, TUTORIAL_CATALOG, tutorialModifier, tutorialSkills, type TutorialProfile } from '@/domain/tutorial';
import { CampaignForm } from '@/components/campaign-form';
import { TutorialStatsEditor } from '@/components/tutorial-stats-editor';
import styles from '@/styles/campaign.module.css';

export function TutorialSheetView({ crawler, profile, number, version, isGm }: { crawler: Crawler; profile: TutorialProfile; number: number; version: string; isGm: boolean }) {
  const hidden = <><input type="hidden" name="crawlerId" value={crawler.id} /><input type="hidden" name="version" value={version} /></>;
  return <section className={styles.panel}>
    <h2>{crawler.name} — Crawler #{number.toLocaleString('en-US')}</h2>
    <p>Human · Level 1 · Floor 1 · Medium (4) · {profile.pronouns || 'Pronouns not specified'}</p>
    <p>Class: available on the Third Floor. Move 20 ft · Step 10 ft · AI Favor {profile.favor}</p>
    <div className={styles.tableScroll}><table className={styles.statsTable}><caption>Core attributes</caption><thead><tr><th>Stat</th><th>Unenhanced</th><th>Enhanced</th><th>Modifier</th></tr></thead><tbody>{STAT_KEYS.map((key) => <tr key={key}><th>{key}</th><td>{profile.stats[key].base}</td><td>{profile.stats[key].enhanced}</td><td>+{tutorialModifier(profile.stats[key].enhanced)}</td></tr>)}</tbody></table></div>
    <p className={styles.health}>Health: {crawler.currentSegments * 10}% — {crawler.currentSegments}/10 slots {crawler.currentSegments === 0 ? '(Dying)' : ''}</p>
    <progress value={crawler.currentSegments} max={10} aria-label="Remaining health slots" />
    <p>Damage threshold: {tutorialModifier(profile.stats.constitution.enhanced)} per slot. Mana: {profile.mana}/{profile.stats.intelligence.enhanced}. Evade: d20 + {tutorialModifier(profile.stats.dexterity.enhanced)} before Buffs.</p>
    <CampaignForm campaignId={crawler.campaignId} label="Record damage or healing received">
      {hidden}<label>Action<select name="operation" defaultValue="tutorial-damage"><option value="tutorial-damage">Damage after defenses</option><option value="tutorial-heal-slots">Healing received, in slots</option></select></label>
      <label>Amount<input name="amount" type="number" min={1} step={1} required defaultValue={1} /></label>
      <p>For damage, apply DR, elemental defenses, and other effects first. Each hit loses whole slots; leftover damage is discarded. Healing restores slots directly.</p><button type="submit">Save health change</button>
    </CampaignForm>
    <CampaignForm campaignId={crawler.campaignId} label="Cast Heal on yourself">
      {hidden}<input type="hidden" name="operation" value="tutorial-cast-heal" />
      <button type="submit" disabled={crawler.currentSegments === 0 || profile.mana < 2}>Spend 2 Mana and heal 2 slots</button>
      <p>A Dying crawler cannot cast. Use healing received when someone else heals you.</p>
    </CampaignForm>
    <CampaignForm campaignId={crawler.campaignId} label="Track Mana">
      {hidden}<label>Action<select name="operation"><option value="tutorial-mana-spend">Spend Mana</option><option value="tutorial-mana-recover">Recover Mana</option></select></label>
      <label>Amount<input name="amount" type="number" min={1} required defaultValue={1} /></label><button type="submit">Save Mana change</button>
    </CampaignForm>
    <CampaignForm campaignId={crawler.campaignId} label="Spend AI Favor">
      {hidden}<input type="hidden" name="operation" value="tutorial-favor-spend" /><button type="submit" disabled={profile.favor < 1}>Spend 1 AI Favor</button>
      <p>Use once per Check for a reroll before the result (never a Natural 1), or once per round for an extra non-Attack Action. Confirm those limits at the table.</p>
    </CampaignForm>
    {isGm && <>
      <CampaignForm campaignId={crawler.campaignId} label="Award AI Favor">{hidden}<input type="hidden" name="operation" value="tutorial-favor-award" /><label>Amount<input name="amount" type="number" min={1} max={2147483647} required defaultValue={1} /></label><button type="submit">Award Favor</button></CampaignForm>
      <CampaignForm campaignId={crawler.campaignId} label="GM stat corrections" key={version}>{hidden}<input type="hidden" name="operation" value="tutorial-stats" /><TutorialStatsEditor initial={profile.stats} /><p>Health slots stay unchanged. Mana is clamped if its maximum falls; increasing stats does not refill it.</p><button type="submit">Save reviewed stats</button></CampaignForm>
      <CampaignForm campaignId={crawler.campaignId} label="GM Crawler Number correction" key={`number-${version}`}>{hidden}<input type="hidden" name="operation" value="tutorial-number" /><label>Crawler Number<input name="crawlerNumber" type="number" min={1} max={2147483647} defaultValue={number} required /></label><button type="submit">Save number</button></CampaignForm>
    </>}
    <h3>Starting Skills and Heal</h3><ul>{tutorialSkills(profile).map((skill) => <li key={skill.name}>{skill.name} — Rank {skill.rank}{skill.stat ? ` (${skill.stat})` : ''}</li>)}</ul>
    {TUTORIAL_CATALOG.combat.find((item) => item.id === profile.combatId)?.kind === 'spell' && <p>Starting spellcaster equipment: 5 Standard Mana Potions. Consumable inventory tracking will be added with inventory management.</p>}
    <h3>Story and starting gear</h3>{Object.entries(profile.notes).map(([key, value]) => <p className={styles.notes} key={key}><strong>{key}: </strong>{value || 'Not recorded'}</p>)}
  </section>;
}
