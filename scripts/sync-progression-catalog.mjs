// Only prepare a NEW, unapplied 019. Once deployed, catalog updates need a new migration.
import { readFileSync, writeFileSync } from 'node:fs';
const catalog=JSON.parse(readFileSync('src/domain/progression-catalog.json','utf8'));
const source=readFileSync('src/domain/custom-build.ts','utf8');
const menu=source.slice(source.indexOf('const menu:'),source.indexOf('export const BUILD_TRAITS'));
const common=['Bludgeoning','Piercing','Slashing','Fire','Ice','Electric','Acid','Poison'],uncommon=['Force','Psychic','Necrotic','Holy','Sonic'];
const restricted=['cockroach','light-on-your-feet','cat-like-reflexes','cesta-punta','gear-head','scutelliphily'];
catalog.traits=[...menu.matchAll(/\['([^']*)','([^']*)',(-?\d+),'([^']*)','([^']*)',(\d+)\]/g)].map(([,id,name,cost,target,effect,page])=>{
 let targets=[];
 if(target==='none')targets=[''];
 else if(target==='stat')targets=['strength','intelligence','constitution','dexterity','charisma'];
 else if(target==='group')targets=Object.keys(catalog.groups).filter(k=>!['all','spell','passive-spell'].includes(k));
 else if(target==='commonDamage')targets=common;
 else if(target==='uncommonDamage')targets=uncommon;
 else if(target==='damage')targets=[...common,...uncommon];
 else targets=catalog.abilities.filter(a=>a.id!=='heal'&&(target!=='restrictedAbility'||restricted.includes(a.id))&&(target!=='ordinaryAbility'||!restricted.includes(a.id))).map(a=>a.id);
 return{id,name,cost:Number(cost),target,effect,page:Number(page),targets};
});
const path='supabase/migrations/202611250019_progression_rules.sql';
const sql=readFileSync(path,'utf8');
writeFileSync(path,sql.replace(/-- BEGIN PROGRESSION DATA[\s\S]*?-- END PROGRESSION DATA/,`-- BEGIN PROGRESSION DATA\ninsert into dcc_private.progression_catalog values(true,$catalog$${JSON.stringify(catalog)}$catalog$::jsonb);\n-- END PROGRESSION DATA`));
console.log(`Synced ${catalog.options.length} options, ${catalog.abilities.length} abilities, ${catalog.traits.length} traits.`);
