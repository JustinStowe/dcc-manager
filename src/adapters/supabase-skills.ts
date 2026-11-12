import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { campaignDatabaseError } from './supabase-campaign-repository';
import type { SkillPort } from '@/services/skill-commands';
export async function createSkillPort(): Promise<SkillPort> {
  const client = createClient(await cookies());
  return { async act(input) {
    const { error } = await client.rpc('dcc_skill_action', { p_crawler_id: input.crawlerId, p_expected_version: input.version, p_operation: input.operation, p_skill_id: input.id, p_definition: input.definition, p_marked: input.marked, p_confirmed: input.confirmed, p_window: input.window, p_die: input.die, p_modifier: input.modifier });
    if (error) { if (error.code === '22023') throw new Error('Ability change rejected. Check rank limits, marking eligibility, prepared Spells, and Mana, then refresh.'); throw campaignDatabaseError(error); }
  } };
}
