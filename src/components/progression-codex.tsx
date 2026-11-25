'use client';
import { useState, type ChangeEvent, type MouseEvent } from 'react';
import { PROGRESSION_ABILITIES, type EligibilityIssue, type ProgressionOption } from '@/domain/progression';
import { STAT_KEYS } from '@/domain/tutorial';
import styles from '@/styles/floor-three-terminal.module.css';

export const STAT_LABELS = { strength: 'Strength', intelligence: 'Intelligence', constitution: 'Constitution', dexterity: 'Dexterity', charisma: 'Charisma' };
export function signed(value: number) { return value > 0 ? `+${value}` : String(value); }
export function sourceLabel(option: ProgressionOption) { return option.id.startsWith('custom-') ? 'GM-approved custom definition' : `Core p. ${option.page}`; }

interface Props {
  kind: 'race' | 'class'; options: readonly ProgressionOption[]; selected: ProgressionOption;
  offered: readonly string[]; recommended: readonly string[]; pending: boolean;
  issuesFor(option: ProgressionOption): readonly EligibilityIssue[];
  onChoose(id: string): void; onContinue(): void;
}
export function ProgressionCodex({ kind, options, selected, offered, recommended, pending, issuesFor, onChoose, onContinue }: Props) {
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('all');
  const label = kind === 'race' ? 'Race' : 'Class', plural = kind === 'race' ? 'races' : 'classes';
  const rows = options.filter(o => o.kind === kind);
  const matches = rows.filter(o => `${o.name} ${o.notes}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (filter === 'all' || filter === 'earth' && (kind === 'race' ? o.earth : o.earthOnly) || filter === 'offered' && offered.includes(o.id) || filter === 'recommended' && recommended.includes(o.id)))
    .sort((a, b) => a.name.localeCompare(b.name));
  const issues = issuesFor(selected);
  function changeSearch(e: ChangeEvent<HTMLInputElement>) { setSearch(e.target.value); }
  function changeFilter(e: ChangeEvent<HTMLSelectElement>) { setFilter(e.target.value); }
  function choose(e: MouseEvent<HTMLButtonElement>) { onChoose(e.currentTarget.dataset.id!); }
  return <div className={styles.codex}>
    <section className={styles.panel} aria-label={`${label} catalog`}>
      <div className={styles.eyebrow}>Alphabetical {label} codex</div>
      <label className={styles.search}>Search {plural}<input type="search" value={search} onChange={changeSearch} placeholder={`Search ${rows.length} ${plural}…`} /></label>
      <label className={styles.search}>Show<select value={filter} onChange={changeFilter}><option value="all">All {plural}</option><option value="earth">{kind === 'race' ? 'Earth Races' : 'Earth-only Classes'}</option><option value="offered">In the GM menu</option><option value="recommended">System AI recommendations</option></select></label>
      <p className={styles.muted}>{matches.length} of {rows.length} entries · browsing does not apply benefits</p>
      <div className={styles.catalogList}>
        {matches.map(o => <button type="button" key={o.id} data-id={o.id} aria-pressed={selected.id === o.id} onClick={choose} disabled={pending} className={styles.catalogCard}>
          <span><strong>{o.name}</strong><small>{sourceLabel(o)}</small></span>
          <span className={styles.tags}>{(kind === 'race' ? o.earth : o.earthOnly) && <span className={styles.badge}>Earth</span>}{offered.includes(o.id) && <span className={styles.badge}>GM</span>}{recommended.includes(o.id) && <span className={styles.aiBadge}>AI</span>}</span>
        </button>)}
        {matches.length === 0 && <p role="status">No entries match. Try another search or filter.</p>}
      </div>
    </section>
    <section className={`${styles.panel} ${styles.inspector}`} aria-label={`${label} details`}>
      <div className={styles.eyebrow}>Inspect {label} · {sourceLabel(selected)}</div>
      <h3>{selected.name}</h3>
      <p className={styles.muted}>{kind === 'race' ? `${selected.earth ? 'Earth Race · Earth Classes available' : 'Alien Race · standard Class pool'} · Size ${selected.size}` : selected.earthOnly ? 'Earth-only Class · requires an Earth Race' : 'Class · Earth or compatible Alien Races'}</p>
      <div className={styles.statPills}>{STAT_KEYS.map(k => <div key={k} data-sign={Math.sign(selected.stats[k])}><abbr title={STAT_LABELS[k]}>{STAT_LABELS[k].slice(0, 3).toUpperCase()}</abbr><strong>{signed(selected.stats[k])}</strong></div>)}</div>
      <h4>Benefits &amp; conditions</h4>
      {Object.entries(selected.skills).length > 0 && <ul>{Object.entries(selected.skills).map(([id, n]) => <li key={id}>{PROGRESSION_ABILITIES.find(a => a.id === id)?.name ?? id} {signed(n)}</li>)}</ul>}
      {selected.dr !== 0 && <p>Non-gear DR {signed(selected.dr)}</p>}
      {selected.notes.split('\n').filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
      <div className={styles.notice}><strong>Eligibility with the browsed pair</strong>{issues.length ? <ul>{issues.map(i => <li key={i.code}>{i.status === 'unknown' ? 'GM verification needed: ' : ''}{i.message}</li>)}</ul> : <p>No outstanding prerequisite checks for this pair.</p>}</div>
      <p className={styles.muted}>Conditional effects are resolved at the table unless supported by a sheet control. The GM controls the final menu.</p>
      <button type="button" className={styles.primary} onClick={onContinue} disabled={pending}>{kind === 'race' ? 'Continue to Class →' : 'Review stats & benefits →'}</button>
    </section>
  </div>;
}
