'use client';

import { useId, useState, type ChangeEvent, type MouseEvent, type ReactNode } from 'react';

export type ItemType = 'Gear' | 'Weapon' | 'Armor' | 'Consumable' | 'Quest' | 'Misc';
export type GearSlot = 'Head' | 'Torso' | 'Arms' | 'Legs' | 'Feet' | 'Hands' | 'Main hand' | 'Off hand' | 'Accessory' | 'None';
export interface GameItem {
  id: string;
  name: string;
  quantity: number;
  type: ItemType;
  gearSlot: GearSlot;
  description: string;
  isEquipped: boolean;
}
export interface EquipmentSlot {
  id: string;
  label: string;
  slot: GearSlot;
  itemId?: string;
}
export interface ItemActionPanels {
  equip?: ReactNode;
  use?: ReactNode;
  edit: ReactNode;
  drop: ReactNode;
  extra?: ReactNode;
}
export interface InventorySystemProps {
  initialItems: readonly GameItem[];
  /** Forms/callback components that persist each action. Only one is mounted. */
  itemActions: Readonly<Record<string, ItemActionPanels>>;
  equipmentSlots?: readonly EquipmentSlot[];
  addItemPanel?: ReactNode;
  summary?: string;
}
type InspectorAction = 'equip' | 'use' | 'edit' | 'drop';
const BASIC_SLOTS: readonly GearSlot[] = ['Head', 'Torso', 'Arms', 'Legs', 'Feet', 'Hands', 'Main hand', 'Off hand', 'Accessory'];
const ITEM_TYPES: readonly ItemType[] = ['Gear', 'Weapon', 'Armor', 'Consumable', 'Quest', 'Misc'];
const TYPE_MARKS: Record<ItemType, string> = { Gear: 'G', Weapon: 'W', Armor: 'A', Consumable: 'C', Quest: 'Q', Misc: 'M' };
const PAGE_SIZE = 32;
const ACTION_CLASS = 'min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Reusable Next.js client component. Requires Tailwind CSS.
 * Actions are supplied as React nodes so live server actions stay authoritative;
 * this component never invents item changes or simulates a potion's effect.
 */
export default function InventorySystem({ initialItems, itemActions, equipmentSlots, addItemPanel, summary }: InventorySystemProps) {
  const [items, setItems] = useState<readonly GameItem[]>(initialItems);
  const [previousItems, setPreviousItems] = useState(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<InspectorAction | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ItemType | 'All'>('All');
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const inspectorId = useId();

  // Synchronize a new authoritative server snapshot before rendering children.
  // This preserves selection by ID, and avoids an effect that resets local state
  // on every render. Switching crawlers should key this component by crawler ID.
  if (previousItems !== initialItems) {
    setPreviousItems(initialItems);
    setItems(initialItems);
  }
  const currentItems = previousItems === initialItems ? items : initialItems;
  const selectedItem = currentItems.find((item) => item.id === selectedId) ?? null;
  const selectedActions = selectedItem ? itemActions[selectedItem.id] : undefined;
  const query = search.trim().toLowerCase();
  const stored = currentItems.filter((item) => !item.isEquipped);
  const filtered = stored.filter((item) => (typeFilter === 'All' || item.type === typeFilter) && `${item.name} ${item.description}`.toLowerCase().includes(query));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const visibleItems = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const emptyCells = Math.max(0, 20 - visibleItems.length);
  const slots = equipmentSlots ?? BASIC_SLOTS.map((slot) => ({ id: slot, label: slot, slot, itemId: currentItems.find((item) => item.isEquipped && item.gearSlot === slot)?.id }));

  function handleSelect(event: MouseEvent<HTMLButtonElement>) {
    const id = event.currentTarget.dataset.itemId;
    if (!id) return;
    setSelectedId(id); setActiveAction(null); setAdding(false);
  }
  function handleCloseInspector() { setSelectedId(null); setActiveAction(null); }
  function handleAction(event: MouseEvent<HTMLButtonElement>) {
    const action = event.currentTarget.dataset.action;
    if (action === 'equip' || action === 'use' || action === 'edit' || action === 'drop') setActiveAction(action);
  }
  function handleSearch(event: ChangeEvent<HTMLInputElement>) { setSearch(event.currentTarget.value); setPage(0); }
  function handleFilter(event: ChangeEvent<HTMLSelectElement>) { setTypeFilter(event.currentTarget.value as ItemType | 'All'); setPage(0); }
  function handlePrevious() { setPage(Math.max(0, currentPage - 1)); }
  function handleNext() { setPage(Math.min(pages - 1, currentPage + 1)); }
  function handleAdd() { setAdding(!adding); setSelectedId(null); setActiveAction(null); }

  return <section data-inventory-system className="my-6 min-w-0 text-slate-800" aria-label="Inventory and equipment">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div><h4 className="text-lg font-bold">Inventory &amp; equipment</h4><div className="mt-1 text-xs text-slate-500">{summary ?? `${stored.length} stored entries · select an item to manage it`}</div></div>
      {addItemPanel && <button type="button" className={ACTION_CLASS} onClick={handleAdd} aria-expanded={adding}>{adding ? 'Close add item' : '+ Add item'}</button>}
    </div>
    {adding && <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">{addItemPanel}</div>}
    <div className="grid min-w-0 gap-5 lg:grid-cols-3">
      <aside className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-1" aria-label="Equipment panel">
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-600">Equipment</h4>
        <ul className="grid list-none gap-2 p-0">
          {slots.map((slot) => {
            const equipped = currentItems.find((item) => item.id === slot.itemId && item.isEquipped);
            return <li key={slot.id}>
              {equipped ? <button type="button" data-item-id={equipped.id} onClick={handleSelect} aria-controls={selectedItem ? inspectorId : undefined} aria-pressed={selectedItem?.id === equipped.id} className={`w-full rounded-lg border px-3 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${selectedItem?.id === equipped.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">{slot.label}</span><span className="mt-0.5 block truncate text-sm font-semibold">{equipped.name}</span>
              </button> : <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2.5"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{slot.label}</span><span className="mt-0.5 block text-sm text-slate-400">Empty</span></div>}
            </li>;
          })}
        </ul>
      </aside>
      <div className="min-w-0 lg:col-span-2">
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <label className="text-xs font-semibold text-slate-500 sm:col-span-2">Search inventory<input type="search" value={search} onChange={handleSearch} placeholder="Find an item…" className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600" /></label>
          <label className="text-xs font-semibold text-slate-500">Item type<select value={typeFilter} onChange={handleFilter} className="mt-1 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-800"><option value="All">All types</option>{ITEM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        </div>
        <ul className="grid list-none grid-cols-5 gap-2 p-0 sm:grid-cols-6 xl:grid-cols-8" aria-label="Stored inventory">
          {visibleItems.map((item) => <li key={`item-${item.id}`} className="min-w-0">
            <button type="button" data-item-id={item.id} onClick={handleSelect} aria-controls={selectedItem ? inspectorId : undefined} aria-pressed={selectedItem?.id === item.id} aria-label={`${item.name}, ${item.type}, quantity ${item.quantity}`} title={`${item.name} · ${item.type} · ${item.quantity}`} className={`relative flex aspect-square min-h-11 w-full flex-col items-center justify-center overflow-hidden rounded-lg border p-1 pb-4 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${selectedItem?.id === item.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'}`}>
              <span aria-hidden="true" className="mb-1 flex size-6 items-center justify-center rounded-md bg-slate-100 text-xs font-extrabold text-slate-500">{TYPE_MARKS[item.type]}</span>
              <span className="line-clamp-2 w-full break-words text-[9px] font-semibold leading-tight sm:text-[10px]">{item.name}</span>
              {item.quantity > 1 && <span className="absolute right-1 bottom-1 rounded bg-slate-800 px-1 text-[9px] font-bold text-white">{item.quantity}</span>}
            </button>
          </li>)}
          {Array.from({ length: emptyCells }, (_, i) => <li key={`empty-${i}`} aria-hidden="true" className="aspect-square rounded-lg border border-dashed border-slate-200 bg-slate-50/70" />)}
        </ul>
        {filtered.length === 0 && <div className="mt-3 text-sm text-slate-500">{stored.length === 0 ? 'No stored items. Add an item or select equipped gear on the left.' : 'No items match your search.'}</div>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{filtered.length} matching entries</span>
          {pages > 1 && <div className="flex items-center gap-2"><button type="button" onClick={handlePrevious} disabled={currentPage === 0} className={ACTION_CLASS}>Previous</button><span>{currentPage + 1} / {pages}</span><button type="button" onClick={handleNext} disabled={currentPage === pages - 1} className={ACTION_CLASS}>Next</button></div>}
        </div>
        {selectedItem && <section id={inspectorId} className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label={`Item inspector: ${selectedItem.name}`}>
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="min-w-0"><h4 className="break-words text-base font-bold">{selectedItem.name}</h4><div className="mt-1 text-xs text-slate-500">{selectedItem.type} · Quantity {selectedItem.quantity} · {selectedItem.isEquipped ? `Equipped: ${selectedItem.gearSlot}` : 'Stored'}</div></div>
            <button type="button" onClick={handleCloseInspector} className={ACTION_CLASS} aria-label="Close item inspector">×</button>
          </div>
          <div className="p-4"><div className="mb-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{selectedItem.description || 'No description recorded.'}</div>
            <div className="flex flex-wrap gap-2">
              {selectedActions?.equip && <button type="button" data-action="equip" onClick={handleAction} aria-expanded={activeAction === 'equip'} className={ACTION_CLASS}>{selectedItem.isEquipped ? 'Unequip' : 'Equip'}</button>}
              {selectedItem.type === 'Consumable' && selectedActions?.use && <button type="button" data-action="use" onClick={handleAction} aria-expanded={activeAction === 'use'} className={ACTION_CLASS}>Use Item</button>}
              <button type="button" data-action="edit" onClick={handleAction} disabled={!selectedActions?.edit} aria-expanded={activeAction === 'edit'} className={ACTION_CLASS}>Edit</button>
              <button type="button" data-action="drop" onClick={handleAction} disabled={!selectedActions?.drop} aria-expanded={activeAction === 'drop'} className={`${ACTION_CLASS} text-red-700`}>Drop</button>
            </div>
            {activeAction && selectedActions && <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">{selectedActions[activeAction]}</div>}
            {selectedActions?.extra && <details className="mt-4 border-t border-slate-200 pt-3"><summary className="cursor-pointer text-xs font-semibold text-slate-500">GM item effect</summary>{selectedActions.extra}</details>}
          </div>
        </section>}
      </div>
    </div>
  </section>;
}
