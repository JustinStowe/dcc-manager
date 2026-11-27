'use client';
import { useRef, useState, type FormEvent } from 'react';
import { GEAR_SLOTS, ITEM_EFFECTS, ITEM_KINDS } from '@/domain/inventory';
import { ZERO_BONUSES } from '@/domain/loadout';
import { LOOT_TIERS, safeRoomCommandSchema, tierLabel, type Achievement, type SafeRoomCommand } from '@/domain/safe-room';
import styles from '@/styles/safe-room.module.css';

export function SafeRoomAward({ floor, achievements, selectedAchievement, pending, save }: {
  floor: number; achievements: readonly Achievement[]; selectedAchievement: Achievement | null;
  pending: boolean; save(command: SafeRoomCommand, form?: HTMLFormElement): Promise<boolean>;
}) {
  const [mode, setMode] = useState('both'), [tier, setTier] = useState('bronze'), [category, setCategory] = useState('Adventurer Box');
  const [items, setItems] = useState(['first']), [notice, setNotice] = useState<string | null>(null), [error, setError] = useState<string | null>(null);
  const request = useRef<string | null>(null);
  function changeMode(event: React.ChangeEvent<HTMLSelectElement>) { setMode(event.target.value); }
  function changeTier(event: React.ChangeEvent<HTMLSelectElement>) { setTier(event.target.value); }
  function changeCategory(event: React.ChangeEvent<HTMLInputElement>) { setCategory(event.target.value); }
  function addItem() { if (items.length < 20) setItems(current => [...current, crypto.randomUUID()]); }
  function removeItem(event: React.MouseEvent<HTMLButtonElement>) { const id = event.currentTarget.dataset.item; setItems(current => current.filter(key => key !== id)); }
  async function award(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget, data = new FormData(form), value = (key: string) => String(data.get(key) ?? '');
    request.current ??= crypto.randomUUID();
    const command = safeRoomCommandSchema.safeParse({ operation: 'award', requestId: request.current, reviewed: data.get('reviewed') === 'yes', existing: data.get('existing') === 'yes', source: value('source'),
      achievement: mode === 'box' ? null : { title: value('title'), floor: Number(data.get('floor')), trigger: value('trigger'), description: value('description'), rewardText: value('rewardText') },
      box: mode === 'achievement' ? null : { tier, name: value('boxName'), category, flavor: value('flavor'), aiNote: value('aiNote'), guideNote: value('guideNote'), voteLocked: data.get('voteLocked') === 'yes', sourceAchievementId: mode === 'box' ? value('sourceAchievementId') || null : null,
        items: items.map(id => ({ name: value(`${id}.name`), kind: value(`${id}.kind`), quantity: Number(data.get(`${id}.quantity`)), notes: value(`${id}.notes`), gearSlot: value(`${id}.gearSlot`), effect: value(`${id}.effect`), bonuses: Object.fromEntries(Object.keys(ZERO_BONUSES).map(k => [k, Number(data.get(`${id}.${k}`))])) })) },
    });
    if (!command.success) { setError(command.error.issues[0]?.message ?? 'Check the reward fields.'); return; }
    setError(null); setNotice(null);
    if (await save(command.data, form)) { request.current = null; form.reset(); setItems([crypto.randomUUID()]); setNotice('Reward recorded. New boxes are claimed only through their own queue.'); }
  }
  const choices = selectedAchievement && !achievements.some(a => a.id === selectedAchievement.id) ? [selectedAchievement, ...achievements] : achievements;
  return <details className={styles.gmDesk}><summary>Award a box or achievement · GM</summary><form onSubmit={award}><fieldset disabled={pending} className={styles.fields}>
    <label>Create<select value={mode} onChange={changeMode}><option value="both">Achievement + linked reward box</option><option value="box">Loot box</option><option value="achievement">Achievement / text reward</option></select></label>
    <label>Reward source<select name="source"><option value="manual">Table award</option><option value="earth-incentive">The single Custom Earth Race/Class incentive</option></select></label>
    {mode !== 'box' && <fieldset className={styles.fields}><legend>Achievement card</legend>
      <label>Title<input name="title" required maxLength={120} /></label><label>Floor<input name="floor" type="number" min="1" max="18" step="1" defaultValue={floor} required /></label>
      <label>Trigger<textarea name="trigger" required maxLength={1000} rows={2} /></label><label>System AI description<textarea name="description" required maxLength={2000} rows={3} /></label><label>Text reward / ruling<input name="rewardText" maxLength={1000} /></label>
    </fieldset>}
    {mode !== 'achievement' && <fieldset className={styles.fields}><legend>Loot box</legend>
      <div className={styles.row}><label>Tier<select value={tier} onChange={changeTier}>{LOOT_TIERS.map(t => <option key={t} value={t}>{tierLabel(t)}</option>)}</select></label><label>Box name<input name="boxName" required maxLength={120} /></label></div>
      <label>Category<input value={category} onChange={changeCategory} required maxLength={80} /></label>
      {mode === 'box' && <label>Source achievement<select name="sourceAchievementId"><option value="">None</option>{choices.filter(a => !a.boxId).map(a => <option key={a.id} value={a.id}>{a.title} · Floor {a.floor}</option>)}</select></label>}
      <label>Appearance / unsealing flavor<textarea name="flavor" maxLength={2000} rows={2} /></label>
      <div className={styles.row}><label>System AI note<textarea name="aiNote" maxLength={2000} rows={2} /></label><label>Game Guide note<textarea name="guideNote" maxLength={2000} rows={2} /></label></div>
      <label className={styles.check}><input type="checkbox" name="voteLocked" value="yes" /> Vote locked until the GM reviews the audience result</label>
      <p>Contents are hidden from the owner until opening. Spell learning, Skill ranks, currency spending and unsupported item effects remain GM rulings.</p>
      {items.map((id, index) => <fieldset key={id} className={styles.itemDraft}><legend>Reward item {index + 1}</legend>
        <div className={styles.row}><label>Name<input name={`${id}.name`} required maxLength={120} /></label><label>Quantity<input name={`${id}.quantity`} type="number" min="1" max="999999" step="1" defaultValue="1" required /></label></div>
        <div className={styles.row}><label>Item type<select name={`${id}.kind`} defaultValue="gear">{ITEM_KINDS.map(k => <option key={k}>{k}</option>)}</select></label><label>Equipment slot<select name={`${id}.gearSlot`}>{GEAR_SLOTS.map(k => <option key={k}>{k}</option>)}</select></label></div>
        <label>Item notes<textarea name={`${id}.notes`} maxLength={2000} rows={2} /></label>
        <details><summary>Reviewed equipment bonuses / potion effect</summary><div className={styles.bonusGrid}>{Object.keys(ZERO_BONUSES).map(k => <label key={k}>{k}<input type="number" name={`${id}.${k}`} min="0" max="1000" step="1" defaultValue="0" required /></label>)}</div><label>Consumable effect<select name={`${id}.effect`}>{ITEM_EFFECTS.map(k => <option key={k}>{k}</option>)}</select></label><p>Bonuses require an equipment slot and take effect only after equipping. Use mana-full only for an identified Standard Mana Potion.</p></details>
        {items.length > 1 && <button type="button" data-item={id} onClick={removeItem}>Remove reward item {index + 1}</button>}
      </fieldset>)}
      <button type="button" onClick={addItem} disabled={items.length >= 20}>Add reward item</button>
    </fieldset>}
    <label className={styles.check}><input type="checkbox" name="existing" value="yes" /> Record a past reward already received. Do not add anything to inventory.</label>
    <label className={styles.check}><input type="checkbox" name="reviewed" value="yes" required /> I checked existing rewards and the incentive decision to prevent duplicate grants.</label>
    <button type="submit">{pending ? 'Recording…' : 'Record reward'}</button>
  </fieldset>{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</form></details>;
}
