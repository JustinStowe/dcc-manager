'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { rollTutorialStats } from '@/app/campaign/tutorial-actions';
import { rollProfileStats } from '@/app/crawlers/actions';
import type { SavedCrawlerProfile } from '@/services/crawler-profiles';
import { STAT_KEYS, STAGES, type TutorialDraft, type Scores, type BackgroundChoices } from '@/domain/tutorial';

const defaults: Scores = { strength: 2, intelligence: 6, constitution: 3, dexterity: 5, charisma: 4 };
export function useTutorialCreationController(campaignId: string, initialOwner: string, initialName: string, profileSlot?: number, savedProfile?: SavedCrawlerProfile) {
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ownerUserId: initialOwner, name: initialName, pronouns: '', combatId: 'longsword',
    trauma: '', looseEnds: '', regret: '', gear: '',
    ...Object.fromEntries(STAT_KEYS.map((key) => [key, String(defaults[key])])),
    ...Object.fromEntries(STAGES.flatMap((stage) => [[`${stage}_category`, ''], [`${stage}_1`, ''], [`${stage}_2`, '']])),
    ...(savedProfile ? {
      name: savedProfile.name, pronouns: savedProfile.profile.pronouns, combatId: savedProfile.profile.combatId,
      ...savedProfile.profile.notes,
      ...Object.fromEntries(STAT_KEYS.map((key) => [key, String(savedProfile.profile.initialStats[key])])),
      ...Object.fromEntries(STAGES.flatMap((stage) => [[`${stage}_category`, savedProfile.profile.backgrounds[stage].category], [`${stage}_1`, savedProfile.profile.backgrounds[stage].skills[0]], [`${stage}_2`, savedProfile.profile.backgrounds[stage].skills[1]]])),
    } : {}),
  }));
  const [rollId, setRollId] = useState(savedProfile?.rollId ?? '');
  const [isRolling, setIsRolling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const busy = useRef(false);
  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    if (busy.current) return;
    const { name, value } = event.target;
    if (!Object.hasOwn(values, name)) return;
    if (STAT_KEYS.includes(name as typeof STAT_KEYS[number]) && (rollId || savedProfile)) return;
    if (name === 'ownerUserId') {
      setRollId(''); setMessage(null);
      setValues((previous) => ({ ...previous, ownerUserId: value, ...Object.fromEntries(STAT_KEYS.map((key) => [key, String(defaults[key])])) }));
    } else {
      setValues((previous) => {
        const next = { ...previous, [name]: value };
        if (name.endsWith('_category')) { const stage = name.split('_')[0]; next[`${stage}_1`] = ''; next[`${stage}_2`] = ''; }
        return next;
      });
    }
  }
  async function handleRoll() {
    if (busy.current) return;
    busy.current = true; setIsRolling(true); setMessage(null);
    try {
      const result = profileSlot ? await rollProfileStats(profileSlot) : await rollTutorialStats(campaignId, values.ownerUserId);
      if (!result.roll) { setMessage(result.error); return; }
      setRollId(result.roll.id);
      setValues((previous) => ({ ...previous, ...Object.fromEntries(STAT_KEYS.map((key) => [key, String(result.roll!.scores[key])])) }));
      setMessage(profileSlot ? 'Roll saved for this profile slot.' : 'These rolls are saved for this account in this game. They cannot be rerolled or rearranged.');
    } catch { setMessage('Could not retrieve the saved roll. Please try again.'); }
    finally { busy.current = false; setIsRolling(false); }
  }
  function background(stage: typeof STAGES[number]) {
    return { category: values[`${stage}_category`], skills: [values[`${stage}_1`], values[`${stage}_2`]] };
  }
  const backgrounds: BackgroundChoices = { childhood: background('childhood'), adolescence: background('adolescence'), career: background('career'), hobby: background('hobby') };
  const draft: TutorialDraft = {
    pronouns: values.pronouns, method: rollId ? 'rolled' : 'array',
    scores: Object.fromEntries(STAT_KEYS.map((key) => [key, Number(values[key])])) as Scores,
    backgrounds,
    combatId: values.combatId, notes: { trauma: values.trauma, looseEnds: values.looseEnds, regret: values.regret, gear: values.gear },
  };
  return { model: { values, draft, rollId, isRolling, message }, actions: { onChange: handleChange, onRoll: handleRoll } };
}
