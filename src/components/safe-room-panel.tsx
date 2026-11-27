'use client';
import { useEffect, useState, type ChangeEvent, type FormEvent, type MouseEvent } from 'react';
import { useSafeRoom } from '@/controllers/use-safe-room';
import { LOOT_TIERS, safeRoomQuerySchema, tierLabel, type SafeRoomQuery } from '@/domain/safe-room';
import { SafeRoomAward } from './safe-room-award';
import styles from '@/styles/safe-room.module.css';

interface SafeRoomProps { campaignId: string; crawlerId: string; crawlerName: string; isGm: boolean; crawlers: readonly { id: string; name: string }[]; onPending(pending: boolean): void; onChanged(): void }
export function SafeRoomPanel(props: SafeRoomProps) {
  const [target, setTarget] = useState(props.crawlerId);
  function selectCrawler(event: ChangeEvent<HTMLSelectElement>) { setTarget(event.target.value); }
  return <>
    {props.isGm && <label className={styles.target}>Crawler<select value={target} onChange={selectCrawler}>{props.crawlers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
    <SafeRoomWorkspace key={target} {...props} crawlerId={target} crawlerName={props.crawlers.find(c => c.id === target)?.name ?? props.crawlerName} />
  </>;
}
export function SafeRoomWorkspace({ campaignId, crawlerId, crawlerName, isGm, onPending, onChanged }: SafeRoomProps) {
  const [query, setQuery] = useState<SafeRoomQuery>(() => safeRoomQuerySchema.parse({}));
  const [tab, setTab] = useState<'boxes' | 'achievements'>('boxes'), [advisor, setAdvisor] = useState<'ai' | 'guide'>('ai');
  const [animating, setAnimating] = useState<string | null>(null), [notice, setNotice] = useState<string | null>(null);
  const state = useSafeRoom(campaignId, crawlerId, query, onPending, onChanged), snapshot = state.snapshot;
  useEffect(() => { if (!animating) return; const timer = window.setTimeout(() => setAnimating(null), 700); return () => window.clearTimeout(timer); }, [animating]);
  const box = query.boxId ? snapshot?.selectedBox?.id === query.boxId ? snapshot.selectedBox : snapshot?.boxes.find(b => b.id === query.boxId) : snapshot?.boxes[0];
  const achievement = query.achievementId ? snapshot?.selectedAchievement?.id === query.achievementId ? snapshot.selectedAchievement : snapshot?.achievements.find(a => a.id === query.achievementId) : snapshot?.achievements[0];
  function showBoxes() { setTab('boxes'); }
  function showAchievements() { setTab('achievements'); }
  function chooseBox(event: MouseEvent<HTMLButtonElement>) { const id = event.currentTarget.dataset.id; setQuery(q => ({ ...q, boxId: id })); }
  async function chooseAchievement(event: MouseEvent<HTMLButtonElement>) { const id = event.currentTarget.dataset.id!; setQuery(q => ({ ...q, achievementId: id })); await state.save({ operation: 'read', achievementId: id }); }
  function filterTier(event: ChangeEvent<HTMLSelectElement>) { const value = event.target.value as SafeRoomQuery['tier']; setQuery(q => ({ ...q, tier: value, boxBefore: undefined, boxId: undefined })); }
  function hideClaimed(event: ChangeEvent<HTMLInputElement>) { const value = event.target.checked; setQuery(q => ({ ...q, hideClaimed: value, boxBefore: undefined, boxId: undefined })); }
  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); setQuery(q => ({ ...q, search: String(data.get('search') ?? ''), floor: String(data.get('floor')) as SafeRoomQuery['floor'], status: String(data.get('status')) as SafeRoomQuery['status'], achievementBefore: undefined, achievementId: undefined })); }
  function olderBoxes() { const before = snapshot?.boxes.at(-1)?.sequence; setQuery(q => ({ ...q, boxBefore: before, boxId: undefined })); }
  function olderAchievements() { const before = snapshot?.achievements.at(-1)?.sequence; setQuery(q => ({ ...q, achievementBefore: before, achievementId: undefined })); }
  function newestBoxes() { setQuery(q => ({ ...q, boxBefore: undefined, boxId: undefined })); }
  function newestAchievements() { setQuery(q => ({ ...q, achievementBefore: undefined, achievementId: undefined })); }
  function jumpBox() { if (achievement?.boxId) { setQuery(q => ({ ...q, boxId: achievement.boxId! })); showBoxes(); } }
  async function jumpAchievement() { if (box?.sourceAchievementId) { const id = box.sourceAchievementId; setQuery(q => ({ ...q, achievementId: id })); showAchievements(); await state.save({ operation: 'read', achievementId: id }); } }
  async function markAll() { if (snapshot) await state.save({ operation: 'read-all', through: snapshot.achievementHead }); }
  async function toggleAccess() { if (snapshot) await state.save({ operation: 'access', floor: snapshot.floor, version: snapshot.access.version, allowed: !snapshot.access.allowed }); }
  async function reconcile(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; if (await state.save({ operation: 'reconcile-incentive', reviewed: true, note: String(new FormData(form).get('note')) }, form)) form.reset(); }
  async function unlock(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (box) await state.save({ operation: 'unlock', boxId: box.id, version: box.version, confirmed: true }, event.currentTarget); }
  async function openBox() {
    if (!box) return;
    if (await state.save({ operation: 'open', boxId: box.id, version: box.version })) {
      setQuery(q => ({ ...q, boxId: box.id }));
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setAnimating(box.id);
      setNotice('Box opened. Review each reward before claiming it.');
    }
  }
  async function claim(itemId: string | null) {
    if (!box || !snapshot) return;
    if (await state.save({ operation: 'claim', boxId: box.id, version: box.version, crawlerVersion: snapshot.crawlerVersion, itemId })) setNotice('Claimed rewards are now in Inventory & equipment.');
  }
  function claimItem(event: MouseEvent<HTMLButtonElement>) { void claim(event.currentTarget.dataset.id!); }
  function claimAll() { void claim(null); }
  function systemCommentary() { setAdvisor('ai'); }
  function guideCommentary() { setAdvisor('guide'); }
  const blocked = !snapshot?.access.allowed || state.pending || !!animating;
  return <section className={styles.terminal} aria-label={`Safe Room for ${crawlerName}`}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>Safe Room terminal</p><h3>{crawlerName}</h3><p>{snapshot ? `Floor ${snapshot.floor} · ${snapshot.access.allowed ? 'GM-confirmed saferoom access' : 'Browse freely · GM saferoom confirmation required to open or claim'}` : 'Connecting to your reward queue…'}</p></div><button type="button" onClick={state.refresh}>Refresh Safe Room</button></header>
    {state.error && <p role="alert" className={styles.error}>{state.error}</p>}{notice && <p role="status">{notice}</p>}
    {snapshot && <>
      <div className={styles.kpis}><p><strong>{snapshot.unopened}</strong>Unopened boxes</p><p><strong>{snapshot.achievementCount}</strong>Achievements · {snapshot.unreadAchievements} unread</p><p><strong>{snapshot.storedEntries}</strong>Stored inventory entries</p></div>
      {isGm && <div className={styles.gmControls}><button type="button" onClick={toggleAccess}>{snapshot.access.allowed ? 'End saferoom access' : `Confirm saferoom access · Floor ${snapshot.floor}`}</button><span>Applies to this crawler on this floor. On Floor 3+ it also lets them spend all pending level-up stat points.</span></div>}
      <div className={styles.tabs} role="group" aria-label="Safe Room sections"><button type="button" aria-pressed={tab === 'boxes'} onClick={showBoxes}>Loot box pedestal</button><button type="button" aria-pressed={tab === 'achievements'} onClick={showAchievements}>Achievements Codex</button></div>
      {tab === 'boxes' ? <>
        <div className={styles.filters}><label>Box tier<select value={query.tier} onChange={filterTier}><option value="all">All tiers</option>{LOOT_TIERS.map(t => <option key={t} value={t}>{tierLabel(t)}</option>)}</select></label><label className={styles.check}><input type="checkbox" checked={query.hideClaimed} onChange={hideClaimed} /> Hide Claimed</label></div>
        <div className={styles.workspace}><aside className={styles.queue} aria-label="Loot box queue">{snapshot.boxes.map(b => <button type="button" key={b.id} data-id={b.id} data-tier={b.tier} aria-pressed={b.id === box?.id} onClick={chooseBox}><span className={styles.tier}>{tierLabel(b.tier)}</span><strong>{b.name}</strong><small>{b.voteLocked ? 'Vote locked' : b.status}{b.existing ? ' · past reward' : ''}</small></button>)}{!snapshot.boxes.length && <p>No boxes match these filters.</p>}<div className={styles.actions}>{query.boxBefore && <button type="button" onClick={newestBoxes}>Newest boxes</button>}{snapshot.boxMore && <button type="button" onClick={olderBoxes}>Older boxes</button>}</div></aside>
          <article className={styles.pedestal} data-tier={box?.tier} aria-label="Unboxing pedestal">{box ? <>
            <span className={styles.tier}>{tierLabel(box.tier)} · {box.category}</span><h3>{box.name}</h3>
            <div className={styles.boxArt} data-unsealing={animating === box.id} aria-hidden="true">◇</div><p className={styles.flavor}>{box.flavor || 'A sealed reward from the System.'}</p>
            {box.sourceAchievementId && <button type="button" onClick={jumpAchievement}>View source achievement</button>}
            {box.existing && <p>Past reward recorded as already received. No inventory items were added.</p>}
            {box.voteLocked ? <><p>Audience vote pending. Only the GM can release this lock after reviewing the result.</p>{isGm && <form onSubmit={unlock}><label className={styles.check}><input type="checkbox" required /> I reviewed the audience result and these contents.</label><button type="submit">Release vote lock</button></form>}</> : !box.openedAt && <button type="button" disabled={blocked} onClick={openBox}>Open box</button>}
            {animating === box.id ? <p role="status">Unsealing…</p> : box.openedAt && <>
              <h4>Revealed rewards</h4><ul className={styles.rewards}>{box.items?.map(reward => <li key={reward.id}><div><strong>{reward.item.name} ×{reward.item.quantity}</strong><p>{reward.item.kind} · {reward.item.notes || 'No additional notes.'}</p>{reward.item.gearSlot !== 'none' && <p><small>Equipment slot: {reward.item.gearSlot}. Bonuses when equipped: {Object.entries(reward.item.bonuses).filter(([, value]) => value !== 0).map(([key, value]) => `${key === 'dr' ? 'DR' : key} +${value}`).join(', ') || 'none'}.</small></p>}{reward.item.effect === 'mana-full' && <p><small>Identified Standard Mana Potion · restores Mana when used through the sheet.</small></p>}</div>{reward.claimedAt ? <span>Claimed</span> : <button type="button" data-id={reward.id} disabled={blocked} onClick={claimItem}>Claim</button>}</li>)}</ul>
              {box.status === 'claimed' ? <p>All rewards claimed. Use the existing sheet to equip or use them.</p> : <button type="button" disabled={blocked} onClick={claimAll}>Claim All</button>}
            </>}
            {isGm && !box.openedAt && <details><summary>GM contents preview · sealed for the player</summary><ul>{box.items?.map(i => <li key={i.id}>{i.item.name} ×{i.item.quantity} · {i.item.notes}</li>)}</ul></details>}
            <details className={styles.commentary}><summary>System AI / Game Guide commentary</summary><div className={styles.actions}><button type="button" aria-pressed={advisor === 'ai'} onClick={systemCommentary}>System AI</button><button type="button" aria-pressed={advisor === 'guide'} onClick={guideCommentary}>Game Guide</button></div><p>{(advisor === 'ai' ? box.aiNote : box.guideNote) || 'No commentary recorded.'}</p></details>
          </> : <p>Select a box, or wait for the GM to award one.</p>}</article>
        </div>
      </> : <>
        <form className={styles.filters} onSubmit={search}><label>Search achievements<input name="search" type="search" maxLength={120} defaultValue={query.search} /></label><label>Floor<select name="floor" defaultValue={query.floor}><option value="all">All floors</option><option value="1">Floor 1</option><option value="2">Floor 2</option><option value="3">Floor 3</option><option value="4+">Floor 4+</option></select></label><label>Status<select name="status" defaultValue={query.status}><option value="all">All</option><option value="unread">Unread</option><option value="with-box">With Box</option></select></label><button type="submit">Search Codex</button><button type="button" disabled={!snapshot.unreadAchievements} onClick={markAll}>Mark All Read</button></form>
        <div className={styles.workspace}><aside className={styles.queue} aria-label="Achievements">{snapshot.achievements.map(a => <button type="button" key={a.id} data-id={a.id} aria-pressed={a.id === achievement?.id} onClick={chooseAchievement}><strong>{a.title}</strong><small>Floor {a.floor}{a.readAt ? '' : ' · Unread'}{a.boxId ? ' · With Box' : ''}</small></button>)}{!snapshot.achievements.length && <p>No achievements match these filters.</p>}<div className={styles.actions}>{query.achievementBefore && <button type="button" onClick={newestAchievements}>Newest achievements</button>}{snapshot.achievementMore && <button type="button" onClick={olderAchievements}>Older achievements</button>}</div></aside>
          <article className={styles.achievementCard} aria-label="System AI achievement card">{achievement ? <><p className={styles.eyebrow}>System AI · Achievement · Floor {achievement.floor}</p><h3>{achievement.title}</h3><p><strong>Trigger:</strong> {achievement.trigger}</p><blockquote>{achievement.description}</blockquote>{achievement.rewardText && <p><strong>Reward / ruling:</strong> {achievement.rewardText}</p>}{achievement.existing && <p>Historical award · already received.</p>}{achievement.boxId && <button type="button" onClick={jumpBox}>Open Reward Box</button>}<p>Text rewards do not automatically change stats, Skills, Favor or equipment.</p></> : <p>Select an achievement to view its System AI card.</p>}</article>
        </div>
      </>}
      {isGm && <>
        <SafeRoomAward floor={snapshot.floor} achievements={snapshot.achievements} selectedAchievement={achievement ?? null} pending={state.pending} save={state.save} />
        <details className={styles.gmDesk}><summary>Existing Custom Earth incentive review · {snapshot.incentive}</summary><p>The earlier Race/Class decision remains recorded. Issue its one reviewed box using the award form, or record that its rewards were already fulfilled manually. Never repeat Potion ranks or boxes.</p>{['issue-once', 'already-received'].includes(snapshot.incentive) && <form onSubmit={reconcile}><label>Existing reward notes<textarea name="note" maxLength={500} required /></label><label className={styles.check}><input type="checkbox" required /> I verified that the single incentive was already fulfilled.</label><button type="submit">Record existing incentive as fulfilled</button></form>}</details>
      </>}
    </>}
  </section>;
}
