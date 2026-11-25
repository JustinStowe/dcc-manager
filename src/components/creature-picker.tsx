'use client';

import { useState, type ChangeEvent } from 'react';
import { creatures } from '@/domain/creature-catalog';

export function CreaturePicker({ label = 'Official creature' }: { label?: string }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(creatures[0]?.id ?? '');
  const filtered = creatures.filter((creature) => `${creature.name} ${creature.classification} ${creature.source}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const value = filtered.some((creature) => creature.id === selected) ? selected : filtered[0]?.id ?? '';
  function changeQuery(event: ChangeEvent<HTMLInputElement>) { setQuery(event.target.value); }
  function changeCreature(event: ChangeEvent<HTMLSelectElement>) { setSelected(event.target.value); }
  return <>
    <label>Find creature <input type="search" value={query} onChange={changeQuery} placeholder="Search by name or type" /></label>
    <label>{label}<select name="catalogId" value={value} onChange={changeCreature} required>
      {filtered.length === 0 ? <option value="">No creatures found</option> : filtered.map((creature) =>
        <option key={creature.id} value={creature.id}>{creature.name} · {creature.classification} · Level {creature.level} · {creature.source} p. {creature.pdfPage}</option>)}
    </select></label>
  </>;
}
