import { getCampaignRole } from '@/domain';
import { ABILITY_CATALOG, castLearnedSpell, markAbility, resolveAdvancement, restoreAbilities, restoreAbility, type AdvancementResult, type LearnedAbility } from '@/domain/abilities';
import { requireUuid, type CampaignWorkspace } from './campaign-workspace';

export interface SkillWrite {
  readonly crawlerId: string; readonly version: string;
  readonly operation: 'learn' | 'learn-catalog' | 'edit' | 'remove' | 'mark' | 'advance' | 'cast';
  readonly id: string | null; readonly definition: LearnedAbility | { rank: number } | null; readonly marked: boolean | null;
  readonly confirmed: boolean; readonly window: AdvancementResult['window'] | null; readonly die: number | null; readonly modifier: number;
}
export interface SkillPort { act(input: SkillWrite): Promise<void> }
function text(form: FormData, key: string): string { const raw = form.get(key); if (typeof raw !== 'string' || !raw.trim()) throw new RangeError(`Enter ${key}.`); return raw.trim(); }
function optional(form: FormData, key: string): string { const value = form.get(key); if (value === null) return ''; if (typeof value !== 'string') throw new RangeError('Invalid ability text.'); return value; }
function whole(form: FormData, key: string, min: number, max: number): number { const value = Number(text(form,key)); if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${key} must be a whole number from ${min} to ${max}.`); return value; }
function definition(form: FormData): LearnedAbility {
  const kind = text(form, 'kind');
  return restoreAbility({ id: 'draft', name: text(form, 'name'), kind, rank: whole(form,'rank',1,20), maxRank: whole(form,'maxRank',1,20), stat: form.get('stat') === 'none' ? null : text(form, 'stat'), passive: form.get('passive') === 'yes', advancement: text(form, 'advancement'), marked: false, manaCost: kind === 'spell' ? whole(form,'manaCost',0,10000) : null, description: optional(form,'description'), reference: optional(form,'reference'), damage: optional(form,'damage'), range: optional(form,'range'), automation: 'manual', origin: 'gm' });
}
export async function executeSkillCommand(workspace: CampaignWorkspace, form: FormData, port: SkillPort): Promise<string> {
  const campaign = workspace.campaign;
  if (!campaign) throw new Error('This game is no longer available. Return to the lobby.');
  const crawlerId = requireUuid(text(form,'crawlerId')), version = requireUuid(text(form,'version'));
  const entry = campaign.crawlers.find((candidate) => candidate.crawler.id === crawlerId), role = getCampaignRole(campaign,workspace.userId);
  if (!entry || !role || (role !== 'gm' && entry.ownerUserId !== workspace.userId)) throw new Error('You do not have access to these abilities.');
  const current = workspace.skills?.[crawlerId], profile = workspace.tutorials?.[crawlerId]?.profile;
  if (!current || !profile || entry.crawler.ruleset !== 'tutorial-v1') throw new Error('Learned abilities could not be loaded. Refresh the campaign.');
  if (workspace.versions[crawlerId] !== version) throw new Error('Crawler changed. Refresh before saving abilities.');
  const operation = text(form,'operation') as SkillWrite['operation'];
  if (!['learn','learn-catalog','edit','remove','mark','advance','cast'].includes(operation)) throw new RangeError('Unknown ability action.');
  if (['learn','learn-catalog','edit','remove','advance'].includes(operation) && role !== 'gm') throw new Error('Only the GM can award, edit, remove, or advance abilities.');
  let id: string | null = null, data: SkillWrite['definition'] = null, marked: boolean | null = null;
  let window: AdvancementResult['window'] | null = null, die: number | null = null, modifier = 0, notice = 'Ability saved.';
  let confirmed = form.get('confirmed') === 'yes';
  const target = ['learn','learn-catalog'].includes(operation) ? undefined : current.find((ability) => ability.id === text(form,'skillId'));
  if (operation !== 'learn' && operation !== 'learn-catalog') { if (!target) throw new RangeError('This ability is unavailable.'); id = target.id; }
  if (['learn','learn-catalog','edit','advance'].includes(operation) && form.get('reviewed') !== 'yes') throw new RangeError('Confirm the definition, rank limits, or advancement window with the GM.');
  if (operation === 'learn' || operation === 'edit') {
    if (target?.automation === 'tutorial-heal') throw new RangeError('Tutorial Heal is a protected Rank 1 Spell.');
    const reviewed = definition(form);
    data = reviewed;
    const proposed = restoreAbility({ ...reviewed, id: target?.id ?? 'new-ability', origin: target?.origin ?? 'gm', marked: target?.marked && reviewed.advancement !== 'none' && reviewed.rank < Math.min(15,reviewed.maxRank) ? true : false, ...(target?.lastAdvancement ? { lastAdvancement: target.lastAdvancement } : {}) });
    restoreAbilities(target ? current.map((ability) => ability.id === target.id ? proposed : ability) : [...current,proposed]);
  } else if (operation === 'learn-catalog') {
    id = text(form,'catalogId'); const known = ABILITY_CATALOG.find((ability) => ability.id === id);
    if (!known || known.id === 'heal') throw new RangeError('Choose an available catalog ability.');
    data = { rank: whole(form,'rank',1,20) };
    restoreAbilities([...current,{ ...known, rank: data.rank, marked: false, origin: 'gm' }]);
  } else if (operation === 'remove') {
    if (!confirmed || target!.automation === 'tutorial-heal') throw new RangeError('Confirm removal; Tutorial Heal must remain learned.');
  } else if (operation === 'mark') {
    const raw = text(form,'marked'); if (!['true','false'].includes(raw)) throw new RangeError('Choose mark or clear.');
    marked = raw === 'true'; confirmed = form.get('qualifying') === 'yes'; markAbility(target!,marked,confirmed); notice = marked ? 'Marked for an advancement check; rank is unchanged.' : 'Advancement mark cleared.';
  } else if (operation === 'advance') {
    window = text(form,'window') as AdvancementResult['window']; die = whole(form,'die',1,20); modifier = whole(form,'modifier',-100,100);
    const after = resolveAdvancement(target!,window,die,modifier);
    notice = after.rank > target!.rank ? `Advancement succeeded: Rank ${after.rank}. Mark cleared.` : 'Advancement failed. Rank unchanged; mark cleared.';
  } else if (operation === 'cast') {
    if (!confirmed) throw new RangeError('Confirm casting conditions, final Mana cost, and timing at the table.');
    const prepared = workspace.loadouts?.[crawlerId]?.hotlist.some((slot) => slot?.kind === 'skill' && slot.target === id) ?? false;
    castLearnedSpell(target!,profile,entry.crawler.currentSegments,prepared);
    notice = target!.automation === 'tutorial-heal' ? 'Heal applied: 2 Mana spent and up to 2 health slots restored.' : `${target!.manaCost} Mana spent. Resolve the Spell’s Check and effects at the table; eligible advancement policy applied.`;
  }
  await port.act({ crawlerId,version,operation,id,definition:data,marked,confirmed,window,die,modifier });
  return notice;
}
