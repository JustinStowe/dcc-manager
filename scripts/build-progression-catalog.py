"""Build the versioned, reviewed Core catalog from local PDF review material.

Run extract-progression-source.py first. Requires pdfplumber. The application
uses the committed JSON, so Python and the source PDFs are not runtime needs.
"""
import json
import logging
import re
import unicodedata
from pathlib import Path
import pdfplumber

logging.getLogger("pdfminer").setLevel(logging.ERROR)
ROOT = Path(__file__).resolve().parent.parent
KEYS = ['strength', 'intelligence', 'constitution', 'dexterity', 'charisma']
def slug(s):
    s = unicodedata.normalize('NFKD', s.replace('’', '').replace('!', '')).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
def clean(s):
    return re.sub(r'\s+', ' ', s.replace('\u00ad', '').replace('‑', '-')).strip()
def write(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# Extract complete ability entries in column reading order using their printed
# heading font. Keep each source page; subsequent reviewed overrides take priority.
ability_entries = []
current = None
with pdfplumber.open(ROOT/'SourceFiles/carl_rpg_core_rulebook_digital_hi-res_081226.pdf') as pdf:
    for printed in range(177, 215):
        p = pdf.pages[printed+1]
        for left, right in [(45, 305), (305, 570)]:
            col = p.crop((left, 51, right, 741))
            heads = {}
            for c in col.chars:
                if 'TextbookNew-Bold' in c['fontname'] and 11.8 <= c['size'] <= 12.2:
                    heads.setdefault(round(c['top'], 1), []).append(c)
            start = 51
            for top, chars in sorted(heads.items()):
                if current is not None and top-1 > start:
                    current['text'] += '\n' + (p.crop((left, start, right, top-1)).extract_text() or '')
                name = ''.join(c['text'] for c in sorted(chars, key=lambda c:c['x0'])).strip()
                current = dict(name=name.title(), page=printed, text='')
                ability_entries.append(current)
                start=top+15
            if current is not None and start < 741:
                current['text'] += '\n'+(p.crop((left, start, right, 741)).extract_text() or '')

abilities = {}
for e in ability_entries:
    name=e['name'].replace('’S', '’s');t=e['text'].strip();lines=t.splitlines();header=' '.join(lines[:5])
    passive=bool(re.search(r'\bPassive\b',header));kind='spell' if e['page']>=202 else 'attack' if e['page']<=183 else 'skill'
    stat=None
    if not passive:
        for label,key in [('Strength','strength'),('Intelligence','intelligence'),('Constitution','constitution'),('Dexterity','dexterity'),('Charisma','charisma'),('Str','strength'),('Int','intelligence'),('Con','constitution'),('Dex','dexterity'),('Cha','charisma')]:
            if re.search(r'\b'+label+r'\b', ' '.join(lines[:2])):stat=key;break
        if kind=='spell' and stat is None:stat='intelligence'
    mana=re.search(r'Mana Cost:\s*(\d+)',t)
    if kind=='spell' and not mana:continue
    damage=re.search(r'Base Damage:\s*([^\n]+)',t);distance=re.search(r'Range:\s*([^\n]+)',t)
    ident=slug(name.split(' (')[0])
    if ident in ['carl','princess-donut','the-system-ai']:continue
    abilities[ident]=dict(id=ident,name=name.split(' (')[0],kind=kind,stat=stat,passive=passive,advancement='none' if passive else 'normal',maxRank=15,manaCost=int(mana[1]) if mana else None,description=clean(t)[:1900],reference=f'Core Rulebook p. {e["page"]}',damage=clean(damage[1])[:120] if damage else '',range=clean(distance[1])[:80] if distance else '',automation='manual')

# Existing definitions have already had their individual advancement, spell,
# automation and starting-crawler behavior reviewed. Never change those on import.
old=json.loads((ROOT/'src/domain/third-floor-catalog.json').read_text(encoding='utf-8'))
for e in old['abilities']+json.loads((ROOT/'src/domain/ability-catalog.json').read_text(encoding='utf-8')):
    abilities[e['id']]=e
abilities['protective-shell']=dict(id='protective-shell',name='Protective Shell',kind='effect',stat=None,passive=True,advancement='none',maxRank=15,manaCost=None,description='Core p. 155 grants this Spell, but its casting definition is not supplied in the printed Spell list. Rank is recorded; the GM must review its Spell definition and Mana cost before enabling casting. No casting cost or effect is invented.',reference='Core Rulebook p. 155 (definition requires GM review)',damage='',range='',automation='manual')

aliases={'intimidation':'intimidate','creepy-chains-club':'club','smite':'paladins-smite'}
def aid(name):return aliases.get(slug(name),slug(name))
raw=json.loads((ROOT/'tmp/progression-source.json').read_text(encoding='utf-8'))
entries=[]
for e in raw:
    if not e['name'] or e['name'].startswith(('Step ', 'A New ')):continue
    text='\n'.join(c['text'] for c in e['chunks'])
    text=re.split(r'\n(?:THE WORLD DUNGEON ON HARD|ALIEN RACES|CLASSES|BARBARIAN|BARD|CLERIC|DRUID|FIGHTER|MAGE|MONK|PALADIN|ROGUE|THE RACE & CLASS POINT BUILD)\b',text)[0]
    text=clean(text)
    bullets=[clean(b) for b in text.split('•')[1:]]
    name=e['name'];ident=slug(name)
    if name.startswith('Boring Ol’ '):ident=slug(name[11:])
    if ident=='pterolykos':e['page']=140
    option=dict(id=ident,name=name,page=e['page'],kind=e['kind'],earth=e['page']<=138 if e['kind']=='race' else False,earthOnly=e['earthIcon'] if e['kind']=='class' else False,size=4,stats={k:0 for k in KEYS},skills={},dr=0,defenses={},choices=[],requirements=[],rank20=[],rank20Groups=[],statCaps={},skillPenalties={},splitStats=None,notes='\n'.join('• '+b for b in bullets),source='core-081226',version=1)
    size=re.search(r'Size:.*?\((\d)\)',text)
    if size:option['size']=int(size[1])
    for b in bullets:
        match=re.match(r'([+−-])\s*(\d+)\s+(.*)',b)
        if match:
            sign=-1 if match[1] in '−-' else 1;n=int(match[2])*sign;tail=match[3]
            if re.fullmatch(r'(?:to )?all Stats',tail):
                for key in KEYS:option['stats'][key]+=n
            elif re.fullmatch(r'(?:to )?(?:Strength|Intelligence|Constitution|Dexterity|Charisma)(?:(?:,? and |, )(?:Strength|Intelligence|Constitution|Dexterity|Charisma))*',tail):
                for key in KEYS:
                    if key.capitalize() in tail:option['stats'][key]+=n
            elif re.match(r'DR(?: Buff)?$',tail):option['dr']+=n
            elif re.match(r'(?:in )?all (?:Dexterity|Strength) Skills',tail):
                option['skillPenalties'][next(k for k in KEYS if k.capitalize() in tail)]=n
            elif n>0 and not re.match(r'(?:in )?all\b',tail) and not any(s in tail for s in ['your choice','either ',' or ','to your choice','split','during','when']):
                names=re.sub(r'^(?:in |to )','',tail)
                names=re.sub(r' (?:Skills?|Spells?)(?:,.*| with.*)?$','',names)
                names=re.sub(r' \([^)]*\)','',names)
                names=names.replace(', and ', ', ').replace(' and ', ', ')
                names=names.replace('Rise, Dead Minion!', 'Rise Dead Minion')
                for skill in names.split(', '):
                    skillid=aid(skill)
                    if skillid=='creepy-chains':skillid='club'
                    if skillid in abilities:option['skills'][skillid]=option['skills'].get(skillid,0)+n
                    elif not any(k.capitalize() in tail for k in KEYS):print('REVIEW UNRESOLVED',name,repr(skill))
        for typ in ['Bludgeoning','Piercing','Slashing','Fire','Ice','Electric','Acid','Poison','Holy','Necrotic','Psychic','Force','Sonic']:
            if re.match(r'(?:Resistance to|Immunity to|Vulnerable to|Vulnerability:).*\b'+typ+r'\b',b,re.I):
                flags=option['defenses'].setdefault(typ,dict(resistant=False,vulnerable=False,immune=False))
                flags['resistant' if b.lower().startswith('resistance') else 'immune' if b.lower().startswith('immunity') else 'vulnerable']=True
        if 'can be raised to' in b:
            prefix=re.split(r' Skills? can be raised to| Spell can be raised to',b)[0]
            for skill in prefix.replace(' and ', ', ').split(', '):
                if aid(skill) in abilities:option['rank20'].append(aid(skill))
    entries.append(option)

lookup={e['id']:e for e in entries}
def req(ident,*conditions):lookup[ident]['requirements']+=list(conditions)
def fact(key,value=True):return dict(kind='fact',key=key,value=value)
def skill(ident,rank=5):return dict(kind='skill',id=ident,rank=rank)
req('amazonian',dict(kind='physicalSkill',rank=5))
req('cat',fact('originalSpecies','cat'))
req('obsidian-butterfly',dict(kind='groupSkill',group='edged',rank=5))
req('sasquatch',skill('smush'))
req('bune',dict(kind='popularity',minimum=3))
req('grulke',dict(kind='anySkill',ids=['jumping','light-on-your-feet'],rank=5))
req('hobgoblin',skill('explosives-handling'),dict(kind='groupSkill',group='trap',rank=5))
req('feral-cat-berserker',dict(kind='race',ids=['cat','cat-girl-cat-boy','tigran']))
req('shieldmaiden',dict(kind='identity',key='female'))
req('former-child-actor',dict(kind='popularity',minimum=3),fact('achievement:cut'))
req('monster-truck-driver',skill('driving'))
req('prizefighter',skill('pugilism'))
req('bomb-squad-tech',fact('achievement:boom'))
req('compensated-anarchist',dict(kind='popularity',minimum=3),skill('explosives-handling'))
for e in entries:
    if 'Must worship a deity' in e['notes']:e['requirements'].append(fact('deity'))
    if 'Cannot worship a deity' in e['notes']:e['requirements'].append(fact('deity',False))
    if 'Class Type' in next((clean('\n'.join(c['text'] for c in r['chunks'])) for r in raw if r['name']==e['name']), ''):
        src=next('\n'.join(c['text'] for c in r['chunks']) for r in raw if r['name']==e['name'])
        m=re.search(r'Class Types?:\s*([^\n]+)',src)
        e['classTypes']=[s.strip().lower() for s in m[1].split(',')] if m else []
    if e['kind']=='class' and (e['id'] in ['cleric','santero','paladin','sacred-paladin','black-inquisitor-general']):e['requirements'].append(fact('club:desperado',False))
    if 'Cannot choose this Class if you have access to Club Vanquisher' in e['notes']:e['requirements'].append(fact('club:vanquisher',False))
req('poet-laureate',fact('patron'))
lookup['hobgoblin']['statCaps']={'charisma':10}
lookup['pocket-kuma']['statCaps']={'strength':10}
lookup['elf-city']['splitStats']=dict(total=6,keys=['intelligence','dexterity','charisma'])
lookup['professional-roadie']['splitStats']=dict(total=8,keys=['strength','constitution','charisma'])
lookup['primal']['rank20Groups']=['all']
lookup['dwarf-classic']['rank20Groups']=['crafting']
lookup['hobgoblin']['rank20Groups']=['trap','explosive']

# Explicit reviewed groups; labels are not arbitrary AI-supplied lists.
groups={
 'edged':['axe','dagger','longsword','rapier'],
 'bashing':['club','improvised-weapons','warhammer'],
 'reach':['lance','polearm','quarterstaff'],
 'ranged':['bow','crossbow','handgun','shotgun','javelin','shuriken','slingshot'],
 'crafting':['alchemy','arcane','calligraphy','cooking','engineering','fabricate','infusion','repair','smithing','tattoo-artistry'],
 'trap':['find-trap','detect-trap','trap-engineer'],
 'explosive':['explosives-handling','bomb-surgeon','backfire','goblin-explosives','improvised-explosive-device','incendiary-device-handling'],
 'movement':['balance','climbing','jumping','running','swimming'],
}
groups['weapon']=list(dict.fromkeys(groups['edged']+groups['bashing']+groups['reach']+groups['ranged']+['herding-weapons']))
groups['melee']=list(dict.fromkeys(groups['edged']+groups['bashing']+groups['reach']+['herding-weapons']))
groups['spell']=[a['id'] for a in abilities.values() if a['kind']=='spell' and a['id']!='heal']
groups['passive-spell']=[i for i in groups['spell'] if abilities[i]['passive']]
for typ in ['Fire','Force','Sonic']:
    groups[typ.lower()+'-spell']=[i for i in groups['spell'] if re.search(r'\b'+typ+r'\b',abilities[i]['damage']+' '+abilities[i]['description'][:150])]
for stat in KEYS:groups[stat]=[i for i,a in abilities.items() if a['stat']==stat]
groups['all']=[i for i in abilities if i!='heal']
for key in list(groups):groups[key]=[i for i in groups[key] if i in abilities]

def choice(ident,key,label,group,bonus,count=1):
    lookup[ident]['choices'].append(dict(id=key,label=label,ids=groups[group] if isinstance(group,str) else group,bonus=bonus,count=count))
for ident,bonus in [('lajabless',3),('barbarian',3),('gladiator',2),('harii',2),('shieldmaiden',2),('bard',1),('cleric',2),('black-inquisitor-general',3),('santero',2),('paladin',3),('sacred-paladin',2)]:choice(ident,'weapon','Weapon Skill','weapon',bonus)
choice('dwarf-classic','craft','Two crafting Skills','crafting',3,2)
choice('arcanist','craft2','Crafting Skill +2','crafting',2)
choice('arcanist','craft1','Crafting Skill +1','crafting',1)
for ident,bonus,count in [('lajabless',2,2),('obsidian-butterfly',2,1),('bard',2,1),('black-inquisitor-general',2,1),('druid',3,1)]:choice(ident,'spell','Spell choice','spell',bonus,count)
choice('druid','spell2','Second Spell choice','spell',2)
choice('grulke','jump','Jumping or Light on Your Feet',['jumping','light-on-your-feet'],3)
choice('grulke','reach','Reach Weapon','reach',2)
choice('fighter','weapon','Weapon Skill +5','weapon',5)
choice('fighter','support','Two support Skills',['aiming','attack-of-opportunity','catcher','shield-block','zone-of-control'],2,2)
choice('shotgun-messenger','ranged','Ranged Weapon','ranged',5)
choice('sword-and-boarder','edged','Edged Weapon','edged',3)
choice('zulu-warrior','melee','Melee Weapon','melee',3)
for group,bonus,count in [('fire-spell',3,1),('force-spell',2,1),('sonic-spell',2,1),('passive-spell',2,2)]:choice('mage',group,group,group,bonus,count)
choice('paladin','support','Catcher or Shield Block',['catcher','shield-block'],2)
choice('swashbuckler','blade','Rapier or Longsword',['rapier','longsword'],3)
lookup['swashbuckler']['choices'][-1]['cap20']=True
for ident,group,count in [('elf-high','charisma',2),('elf-night','crafting',1),('arcanist','crafting',1),('gladiator','weapon',1),('shieldmaiden','weapon',1),('zulu-warrior','weapon',1)]:
    choice(ident,'rank20','Skills permitted to reach Rank 20',group,0,count)
    lookup[ident]['choices'][-1]['cap20']=True

for ident,group,n in [('tetrakai','edged',1),('skyfowl','charisma',2),('hobgoblin','trap',3),('hobgoblin','explosive',3),('bomb-squad-tech','explosive',2),('shotgun-messenger','movement',1)]:
    for i in groups[group]:lookup[ident]['skills'][i]=lookup[ident]['skills'].get(i,0)+n
for ident in ['monk','street-monk']:
    for i in groups['weapon']:
        if abilities[i]['stat']=='dexterity':lookup[ident]['skills'][i]=lookup[ident]['skills'].get(i,0)+1
for i in groups['spell']:
    if any(t in abilities[i]['damage'] for t in ['Electric','Fire','Ice']):lookup['elemental-monk']['skills'][i]=lookup['elemental-monk']['skills'].get(i,0)+1
    if 'Heal' in abilities[i]['name']:lookup['lifebringer']['skills'][i]=lookup['lifebringer']['skills'].get(i,0)+1

# Preserve all reviewed starter mechanics, while fixing their source page and
# expanding choices to the full reviewed ability list.
for oldentry in old['races']+old['classes']:
    e=lookup[oldentry['id']]
    for key in ['stats','skills','dr','defenses']:e[key]=oldentry[key]
    if e['id']=='fighter':pass

# Retain literal publication oddities rather than inventing corrected stats.
lookup['paladin']['stats']['charisma']=3 # p.155 prints +2 Charisma then +1 Charisma.
lookup['elf-city']['notes']+='\nPublication note: initial split is +6, but the later reassignment sentence says +4. Reassignment requires a GM ruling; it is not automated.'
lookup['primal']['requirements'].append(fact('originalRace'))
lookup['primal']['requirements'].append(fact('originalSize'))
lookup['doppelganger']['requirements'].append(fact('originalSize'))
lookup['primal']['notes']+='\nSelect the original Race in benefit choices; its package is included once before the Primal modifiers.'

write(ROOT/'src/domain/progression-catalog.json',dict(version='core-081226-v1',source='carl_rpg_core_rulebook_digital_hi-res_081226.pdf',options=entries,abilities=list(abilities.values()),groups=groups))
print(f'Wrote {len(entries)} Race/Class options, {len(abilities)} abilities and {len(groups)} reviewed groups.')
