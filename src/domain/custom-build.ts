import catalog from './progression-catalog.json';
import { STAT_KEYS, type Scores } from './tutorial';
import type { LearnedAbility } from './abilities';

export type TraitTarget = 'none' | 'stat' | 'ability' | 'ordinaryAbility' | 'restrictedAbility' | 'group' | 'uncommonDamage' | 'commonDamage' | 'damage';
export interface BuildTrait { readonly id: string; readonly name: string; readonly cost: number; readonly target: TraitTarget; readonly effect: string; readonly page: number }
export interface BuildLine { readonly traitId: string; readonly target: string; readonly quantity: number }
export interface BespokeBenefit { readonly name:string;readonly points:number;readonly description:string }
export interface CustomBuild { readonly kind: 'race' | 'class'; readonly name: string; readonly earth: boolean; readonly description: string; readonly lines: readonly BuildLine[];readonly bespoke?:readonly BespokeBenefit[] }
export interface BuildIssue { readonly code: string; readonly message: string }
export const COMMON_DAMAGE = ['Bludgeoning','Piercing','Slashing','Fire','Ice','Electric','Acid','Poison'] as const;
export const UNCOMMON_DAMAGE = ['Force','Psychic','Necrotic','Holy','Sonic'] as const;
export const RESTRICTED_ABILITIES = ['cockroach','light-on-your-feet','cat-like-reflexes','cesta-punta','gear-head','scutelliphily'] as const;
export const BUILD_GROUPS: Readonly<Record<string, readonly string[]>> = catalog.groups;
export const BUILD_ABILITIES = catalog.abilities;
// IDs and costs are reviewed source data. Models never assign authoritative costs.
const menu: readonly [string, string, number, TraitTarget, string, number][] = [
  ['stat','+1 Stat',1,'stat','stat',159],
  ['desperado','Club Desperado',1,'none','manual',159], ['vanquisher','Club Vanquisher',1,'none','manual',159],
  ['advance-skill','+1 floor-end advancement: one Skill',1,'ability','manual',159],
  ['rank20-skill','One Skill may reach Rank 20',1,'ability','rank20',159],
  ['double-noncombat-mod','Second Stat Mod on a conditional noncombat Skill',1,'ability','manual',159],
  ['conditional-benefit','Conditional benefit (GM reviews trigger)',1,'none','manual',159],
  ['darkvision','Darkvision or natural light',1,'none','manual',159],
  ['conditional-mana','Double resting Mana in a specific environment',1,'none','manual',159],
  ['vision','Twice normal vision distance',1,'none','manual',159],
  ['craft-table','Tier-1 crafting table once personal space exists',1,'none','manual',159],
  ['saferoom','Free saferoom room',1,'none','manual',159],
  ['discount','Shop discount category',1,'none','manual',159], ['sales','Sales bonus category',1,'none','manual',159], ['interest','Interest category',1,'none','manual',159],
  ['session-benefit','Specific noncombat benefit once per session',1,'none','manual',159],
  ['skill','+1 Skill/Spell rank',2,'ordinaryAbility','skill',159],
  ['kill-heal','Specified attack heals 1 slot, maximum 5 per combat',2,'ability','manual',159],
  ['double-attack-mod','Second attack Stat Mod in a common circumstance',2,'ability','manual',159],
  ['advance-advantage','Advantage on one Skill advancement check',2,'ability','manual',159],
  ['advance-group','+1 floor-end advancement: linked group',2,'group','manual',159],
  ['damage-switch','Choose damage type at combat start',2,'damage','manual',159],
  ['dr','+1 DR Buff (maximum +3)',2,'none','dr',159],
  ['guild','All guilds of one type',2,'none','manual',159],
  ['mana','Double resting/mending Mana',2,'none','manual',159],
  ['clubs','All professional/social clubs',2,'none','manual',159],
  ['book-club','Dungeon Book of the Floor Club',2,'none','manual',159],
  ['rank20-group','Linked Skills may reach Rank 20',2,'group','rank20Group',159],
  ['kill-gold','Specified attack kills grant Floor-number gold',2,'ability','manual',159],
  ['popularity','Popularity from specified actions',2,'none','manual',159],
  ['patron','Patron benefit',2,'none','manual',159],
  ['resist-uncommon','Resistance: uncommon damage',2,'uncommonDamage','resistant',159],
  ['resist-environment','Environmental damage Resistance',2,'none','manual',159],
  ['replace-stat','Replace governing Stat (GM specifies mapping)',2,'ability','manual',159],
  ['extra-mod','Additional Stat Mod (GM specifies mapping)',2,'ability','manual',159],
  ['weapon-transfer','Use weapon Skills with a different weapon type',2,'ability','manual',159],
  ['healing','Healing Spells restore +1 slot',2,'none','manual',159],
  ['terrain','Traverse specified terrain without checks',2,'none','manual',159],
  ['burrow','Burrow',2,'none','manual',159], ['underwater','Breathe underwater',2,'none','manual',159],
  ['hour-buff','+1 all Skills for at most an hour',2,'none','manual',160],
  ['natural-d6','Floor-ranked natural attack: d6, upgrades at 5/10/15',2,'damage','manual',160],
  ['reassign-stats','Reassign Race/Class bonuses once per Floor Long Rest',2,'none','manual',160],
  ['manager','Manager-level assistance',3,'none','manual',160], ['pet','Pet or Mount',3,'none','manual',160],
  ['pet-benefit','Up to 4 BP of benefits shared by Pets/Mounts',3,'none','manual',160],
  ['encounter','Encounter-changing benefit once/day',3,'none','manual',160],
  ['negate-attack','Negate one attack damage once/day',3,'none','manual',160],
  ['daily-buff','Partial Buff once/day',3,'none','manual',160], ['limited-flight','Limited flight',3,'none','manual',160],
  ['no-breath','No breathing; inhaled toxin immunity',3,'none','manual',160],
  ['rage','+1 melee damage per lost Health Bar slot',3,'none','manual',160],
  ['small','Small size (2)',3,'none','size',160], ['move','+5 feet Move',3,'none','move',160], ['step','+5 feet Step',3,'none','step',160],
  ['evade-die','+1d4 Evade or checks for a specified Stat',3,'stat','manual',160],
  ['natural-d8','Floor-ranked natural attack: d8, upgrades at 5/10/15',3,'damage','manual',160],
  ['noncombat-advantage','Advantage on a specific noncombat Skill/Spell',3,'ability','manual',160],
  ['damage-multiplier','Situational damage up to ×2 for one round',3,'none','manual',160],
  ['health-stat','Replace Constitution for Health Bar (GM reviews)',3,'stat','manual',160], ['climb','Climb Move on most surfaces/ceilings',3,'none','manual',160],
  ['restricted-skill','+1 normally unavailable Skill rank',4,'restrictedAbility','skill',160],
  ['small-group','+1 linked group of 3–5 Skills',4,'group','skillGroupSmall',160],
  ['stat-advantage','Advantage on checks for one Stat',4,'stat','manual',160],
  ['rank20-six','Up to six linked Skills may reach 20',4,'group','rank20Six',160],
  ['poison-immunity','Poison immunity',4,'none','poisonImmune',160],
  ['resist-common','Resistance: common damage',4,'commonDamage','resistant',160],
  ['duration','Double duration for Spells of Rank 5 or lower',4,'none','manual',160],
  ['limited-advantage','Advantage on all Skills in a limited noncombat setting',4,'none','manual',160],
  ['arm','Extra functional arm',4,'none','manual',160], ['doppelganger','Doppelgänger shapechanging',4,'none','manual',160],
  ['broad-group','+1 broad thematic Skill group',6,'group','skillGroup',160],
  ['rank20-all','All Skills may reach Rank 20',6,'none','rank20All',160],
  ['epic-defense','Strong defense (GM reviews exact effect)',6,'none','manual',160],
  ['regrow-limb','Limb regeneration',6,'none','manual',160],
  ['broad-advantage','Advantage on all Skills in broad circumstances',6,'none','manual',160],
  ['poison-disease','Poison and all-disease immunity',6,'none','poisonImmune',160],
  ['large-group','+1 linked group of six or more Skills',6,'group','skillGroupLarge',160],
  ['significant-defense','Significant defense such as Evade Advantage',6,'none','manual',160],
  ['flexible-form','Flexible form with Stat/Skill changes',6,'none','manual',160],
  ['changeling','Changeling shapeshifting',6,'none','manual',160],
  ['stat-skills-advantage','Advantage on Skill Checks governed by one Stat',6,'stat','manual',160],
  ['flight','Unlimited flight',6,'none','manual',160],
  ['stat-penalty','−1 Stat (refund per pair across Stats)',0,'stat','statPenalty',161],
  ['skill-penalty','−1 existing Skill rank (refund per pair)',0,'ability','skillPenalty',161],
  ['group-penalty','−1 all Skills of one Stat',-1,'stat','groupPenalty',161],
  ['club-conflict','Conflicting club membership',-1,'none','manual',161],
  ['mana-unfavored','+1 Mana for non-favored Spells',-1,'none','manual',161],
  ['conditional-disadvantage','Conditional Disadvantage on a linked group',-1,'group','manual',161],
  ['worship','Must worship',-1,'none','manual',161], ['no-worship','Cannot worship',-1,'none','manual',161],
  ['advance-penalty','−1 advancement for a Race/Class Skill at Rank 5+',-1,'ability','advancePenalty',161],
  ['vulnerable-uncommon','Uncommon damage Vulnerability',-1,'uncommonDamage','vulnerable',161],
  ['halve-unfocused','Halve a broad damage/effect category outside the focus',-1,'none','manual',161],
  ['two-condition-weakness','Weakness requiring two conditions',-1,'none','manual',161],
  ['delay','Delay a benefit until after Level 50 or Floor 6',-1,'none','manual',161],
  ['broad-weakness','Broad weakness with one condition',-2,'none','manual',161],
  ['floor-only','A Skill advances only on Floor descent',-2,'ability','manual',161],
  ['limited-weapons','Limited weapon choices',-2,'none','manual',161],
  ['no-weapon-mod','No Stat Mod on provided Weapon Skill',-2,'ability','manual',161],
  ['mana-category','+3 Mana for provided Spell category',-2,'none','manual',161],
  ['group-disadvantage','Disadvantage on a linked group',-2,'group','manual',161],
  ['prohibited-category','Cannot use a broad useful item/weapon category or Passive Spells',-2,'none','manual',161],
  ['stat-cap','One Stat capped at 10 including gear/potions',-3,'stat','statCap',161],
  ['vulnerable-common','Common damage Vulnerability',-3,'commonDamage','vulnerable',161],
];
export const BUILD_TRAITS: readonly BuildTrait[] = menu.map(([id,name,cost,target,effect,page]) => ({id,name,cost,target,effect,page}));
export function traitTargets(trait: BuildTrait): readonly string[] {
  if (trait.target === 'none') return [''];
  if (trait.target === 'stat') return STAT_KEYS;
  if (trait.target === 'group') return Object.keys(BUILD_GROUPS).filter(id => id !== 'all' && id !== 'spell' && id !== 'passive-spell');
  if (trait.target === 'commonDamage') return COMMON_DAMAGE;
  if (trait.target === 'uncommonDamage') return UNCOMMON_DAMAGE;
  if (trait.target === 'damage') return [...COMMON_DAMAGE,...UNCOMMON_DAMAGE];
  return BUILD_ABILITIES.filter(a => a.id !== 'heal' && (trait.target !== 'restrictedAbility' || RESTRICTED_ABILITIES.some(id => id === a.id)) && (trait.target !== 'ordinaryAbility' || !RESTRICTED_ABILITIES.some(id => id === a.id))).map(a => a.id);
}
export function parseCustomBuild(value: unknown): CustomBuild {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RangeError('Enter a custom build.');
  const b = value as Record<string,unknown>;
  if (!['race','class'].includes(b.kind as string) || typeof b.earth !== 'boolean' || typeof b.name !== 'string' || !b.name.trim() || b.name.length > 100 || typeof b.description !== 'string' || b.description.length > 2000 || !Array.isArray(b.lines) || b.lines.length > 60) throw new RangeError('Check the custom build name, type and traits.');
  const lines = b.lines.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new RangeError('Invalid build trait.');
    const l = value as Record<string, unknown>, trait = BUILD_TRAITS.find(t => t.id === l.traitId);
    if (!trait || typeof l.target !== 'string' || !traitTargets(trait).includes(l.target) || typeof l.quantity !== 'number' || !Number.isSafeInteger(l.quantity) || l.quantity < 1 || l.quantity > 50) throw new RangeError('Choose reviewed traits, targets and whole quantities from 1 to 50.');
    return {traitId:trait.id,target:l.target,quantity:l.quantity};
  });
  if (new Set(lines.map(l => `${l.traitId}|${l.target}`)).size !== lines.length) throw new RangeError('Combine duplicate traits into one quantity.');
  const bespoke=b.bespoke??[];
  if(!Array.isArray(bespoke)||bespoke.length>10)throw new RangeError('At most ten GM-priced bespoke benefits.');
  const priced=bespoke.map((v:unknown)=>{if(!v||typeof v!=='object')throw new RangeError('Invalid bespoke benefit.');const x=v as Record<string,unknown>;if(typeof x.name!=='string'||!x.name.trim()||x.name.length>120||typeof x.description!=='string'||!x.description.trim()||x.description.length>1000||typeof x.points!=='number'||!Number.isInteger(x.points)||x.points< -5||x.points>30)throw new RangeError('Bespoke benefits need a name, ruling and whole BP price from −5 to 30.');return{name:x.name.trim(),description:x.description.trim(),points:x.points};});
  return {kind:b.kind as CustomBuild['kind'],name:b.name.trim(),earth:b.earth,description:b.description.trim(),lines,...(priced.length?{bespoke:priced}:{})};
}
export interface BuildContext { readonly stats: Scores; readonly skills: readonly LearnedAbility[] }
export function calculateBuildCost(build: CustomBuild) {
  let spent=0,refunded=0,statPenalty=0,skillPenalty=0;
  for (const line of build.lines) {
    const t=BUILD_TRAITS.find(t => t.id===line.traitId)!;
    spent+=Math.max(0,t.cost)*line.quantity;refunded+=Math.max(0,-t.cost)*line.quantity;
    if(t.effect==='statPenalty')statPenalty+=line.quantity;
    if(t.effect==='skillPenalty')skillPenalty+=line.quantity;
  }
  for(const benefit of build.bespoke??[]){spent+=Math.max(0,benefit.points);refunded+=Math.max(0,-benefit.points);}
  refunded+=Math.floor(statPenalty/2)+Math.floor(skillPenalty/2);
  const usableRefund=Math.min(5,refunded),base=build.kind==='race'?25:30;
  return {base,spent,refunded,usableRefund,budget:base+usableRefund,remaining:base+usableRefund-spent};
}
export function validateCustomBuild(input: CustomBuild, context: BuildContext) {
  const build=parseCustomBuild(input),cost=calculateBuildCost(build),issues:BuildIssue[]=[];
  const add=(code:string,message:string)=>issues.push({code,message});
  if(cost.remaining<0)add('budget',`${build.kind} exceeds its separate budget by ${-cost.remaining} BP.`);
  const bought:Record<string,number>={},penalties:Record<string,number>={};let passive=0;
  for(const line of build.lines){
    const t=BUILD_TRAITS.find(t=>t.id===line.traitId)!;
    const ids=t.effect.startsWith('skillGroup')?BUILD_GROUPS[line.target]:t.effect==='skill'?[line.target]:[];
    for(const id of ids){bought[id]=(bought[id]??0)+line.quantity;if(BUILD_ABILITIES.find(a=>a.id===id)?.passive)passive+=line.quantity;}
    if(t.effect==='skillGroupSmall'&&(ids.length<3||ids.length>5))add('group','This benefit requires a reviewed group of 3–5 Skills.');
    if(t.effect==='skillGroupLarge'&&ids.length<6)add('group','This benefit requires at least six linked Skills.');
    if(t.effect==='rank20Six'&&BUILD_GROUPS[line.target].length>6)add('group','This benefit permits at most six linked Skills.');
    if(t.effect==='skillPenalty')penalties[line.target]=(penalties[line.target]??0)+line.quantity;
    if(t.effect==='advancePenalty'&&(context.skills.find(s=>s.id===line.target)?.rank??0)<5)add('advance-penalty','The penalized advancement Skill must already have Rank 5+.');
    if(t.effect==='dr'&&line.quantity>3)add('dr','A custom build permits at most +3 DR from this benefit.');
    if(['resistant','vulnerable','poisonImmune','rank20','rank20Group','rank20All','rank20Six','statCap','size'].includes(t.effect)&&line.quantity!==1)add('stacking',`${t.name} cannot be purchased repeatedly for the same target.`);
    if(t.effect==='groupPenalty'){const held=context.skills.filter(s=>s.stat===line.target);if(!held.length)add('skill-penalty','Cannot refund a penalty that affects no currently learned Skills.');for(const s of held)penalties[s.id]=(penalties[s.id]??0)+line.quantity;}
  }
  if(build.kind==='class'&&passive>5)add('passive-cap','Custom Classes permit at most five purchased Passive ranks (Core p. 162).');
  for(const [id,penalty] of Object.entries(penalties))if(penalty>(context.skills.find(s=>s.id===id)?.rank??0))add('skill-penalty',`Cannot penalize unlearned ranks of ${id}.`);
  for(const stat of STAT_KEYS){const n=build.lines.filter(l=>l.traitId==='stat-penalty'&&l.target===stat).reduce((n,l)=>n+l.quantity,0);if(context.stats[stat]-n<1)add('stat-floor',`${stat} cannot fall below 1.`);}
  for(const [id,ranks]of Object.entries(bought))if(ranks>10)add('selection-cap',`${id} purchases exceed the Rank 10 selection cap.`);
  return {build,cost,issues,legal:issues.length===0,passiveRanks:passive};
}
