'use client';

import { useId, useState, type MouseEvent, type ReactNode } from 'react';

export interface QuickSlotDisplay { readonly number: number; readonly name: string; readonly detail: string; readonly controls: ReactNode }
export function QuickSlots({ slots }: { slots: readonly QuickSlotDisplay[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const panelId = useId();
  const current = slots.find((slot) => slot.number === selected);
  function handleSelect(event: MouseEvent<HTMLButtonElement>) { setSelected(Number(event.currentTarget.dataset.slot)); }
  function handleClose() { setSelected(null); }
  return <section data-inventory-system className="my-4 min-w-0" aria-label="Quick slots: Hotlist">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold uppercase tracking-wider text-[color:var(--text)]">Quick slots · Hotlist</h4><span className="text-xs text-[color:var(--text-muted)]">10 slots · select to use or prepare</span></div>
    <div className="grid grid-cols-5 gap-2 xl:grid-cols-10">
      {slots.map((slot) => <button key={slot.number} type="button" data-slot={slot.number} onClick={handleSelect} aria-pressed={selected === slot.number} aria-controls={current ? panelId : undefined} className={`min-h-20 min-w-0 rounded-lg border px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-[var(--focus)] ${selected === slot.number ? 'border-[color:var(--selection-border)] bg-[var(--surface-selected)]' : 'border-[color:var(--border)] bg-[var(--surface-soft)] hover:border-[color:var(--focus)]'}`}>
        <span className="block text-[10px] font-bold text-[color:var(--text-subtle)]">{slot.number}</span><span className="mt-1 line-clamp-2 block text-xs font-semibold text-[color:var(--text-strong)]">{slot.name}</span><span className="mt-1 block truncate text-[9px] text-[color:var(--text-muted)]">{slot.detail}</span>
      </button>)}
    </div>
    {current && <div id={panelId} className="mt-3 rounded-lg border border-[color:var(--border)] bg-[var(--surface-soft)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-sm">Slot {current.number}: {current.name}</strong><button type="button" onClick={handleClose} className="rounded border border-[color:var(--border-strong)] bg-[var(--surface)] px-3 py-1 text-sm text-[color:var(--text)]" aria-label="Close quick slot">×</button></div>{current.controls}
    </div>}
  </section>;
}
