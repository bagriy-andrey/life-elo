import { liveQuery } from 'dexie'
import { useSyncExternalStore } from 'react'
import { db } from '../db/db'
import { migrateHabit, migrateReview, type LegacyHabit, type LegacyReview } from '../db/migrate'
import { applyDecision, schemaGate, toPushItem, type PushItem, type RemoteRecord } from './merge'
import { applyRemote, getSyncState, setSyncState, SYNCED_TABLES, type OutboxEntry, type SyncedTable } from './outbox'
import type { SyncRemote } from './remote'

export type SyncStatusKind = 'idle' | 'syncing' | 'offline' | 'error' | 'update-required'
export interface SyncStatus {
  kind: SyncStatusKind
  lastSyncedAt?: number
}

export interface SyncStatusStore {
  get(): SyncStatus
  set(patch: Partial<SyncStatus>): void
  subscribe(fn: () => void): () => void
}

export function createStatusStore(): SyncStatusStore {
  let status: SyncStatus = { kind: 'idle' }
  const subs = new Set<() => void>()
  return {
    get: () => status,
    set(patch) {
      status = { ...status, ...patch }
      subs.forEach((f) => f())
    },
    subscribe(fn) {
      subs.add(fn)
      return () => subs.delete(fn)
    },
  }
}

/** Store used by the app and `useSyncStatus()`. */
export const syncStatusStore = createStatusStore()

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(syncStatusStore.subscribe, syncStatusStore.get, syncStatusStore.get)
}

const PUSH_BATCH = 200
const PULL_PAGE = 500
const DEBOUNCE_MS = 2000
const synced = new Set<string>(SYNCED_TABLES)

function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = e instanceof Error ? e.message : String(e)
  return e instanceof TypeError || /failed to fetch|load failed|networkerror/i.test(msg)
}

class Cancelled extends Error {}

export interface SyncEngine {
  run(): Promise<void>
  /** Cursor = 0, then a full (idempotent) pull. */
  resync(): Promise<void>
  /** Aborts the in-flight run (no further local writes); a later run() starts fresh. */
  cancel(): void
  /** run()/resync() become no-ops (and the in-flight run is cancelled) until enable(). */
  disable(): void
  enable(): void
  /** Resolves when no run is in flight. */
  settled(): Promise<void>
  status: SyncStatusStore
}

export function createSyncEngine(opts: {
  remote: SyncRemote
  now?: () => number
  status?: SyncStatusStore
}): SyncEngine {
  const { remote } = opts
  const now = opts.now ?? Date.now
  const status = opts.status ?? syncStatusStore

  let gen = 0
  let resetCursor = false
  let disabled = false

  async function push(g: number) {
    // One read transaction so every row is consistent with its outbox entry.
    const pairs = await db.transaction('r', [...SYNCED_TABLES.map((t) => db.table(t)), db.outbox], async () => {
      const out: { entry: OutboxEntry; item: PushItem }[] = []
      for (const entry of await db.outbox.toArray()) {
        if (!synced.has(entry.tbl)) continue
        const row = await db.table(entry.tbl).get(entry.key)
        out.push({ entry, item: toPushItem(entry.tbl, entry.key, row, entry.changedAt, db.verno) })
      }
      return out
    })
    for (let i = 0; i < pairs.length; i += PUSH_BATCH) {
      const batch = pairs.slice(i, i + PUSH_BATCH)
      await remote.push(batch.map((p) => p.item))
      if (g !== gen) throw new Cancelled()
      await db.transaction('rw', db.outbox, async () => {
        if (g !== gen) throw new Cancelled()
        for (const { entry: e } of batch) {
          const cur = await db.outbox.get([e.tbl, e.key] as never)
          if (cur && cur.changedAt === e.changedAt) await db.outbox.delete([e.tbl, e.key] as never)
        }
      })
    }
  }

  function migrated(rec: RemoteRecord): unknown {
    if (rec.tbl === 'habits') return migrateHabit(rec.data as LegacyHabit)
    if (rec.tbl === 'reviews') return migrateReview(rec.data as LegacyReview)
    return rec.data
  }

  /** Returns false when the app is too old for the page (cursor untouched). */
  async function applyPage(page: RemoteRecord[], g: number): Promise<boolean> {
    if (page.some((r) => schemaGate(r.schema, db.verno) === 'update-app')) return false
    const maxRev = Math.max(...page.map((r) => r.rev))
    if (g !== gen) throw new Cancelled()
    await applyRemote(async () => {
      if (g !== gen) throw new Cancelled()
      for (const rec of page) {
        if (!synced.has(rec.tbl)) continue
        const entry = await db.outbox.get([rec.tbl, rec.key] as never)
        if (applyDecision(rec, entry) === 'keep-local') continue
        const table = db.table(rec.tbl as SyncedTable)
        if (rec.deleted || rec.data == null) await table.delete(rec.key)
        else await table.put(schemaGate(rec.schema, db.verno) === 'migrate' ? migrated(rec) : rec.data)
      }
      await setSyncState({ cursor: maxRev, lastSyncedAt: now() })
    })
    return true
  }

  async function pull(g: number): Promise<boolean> {
    let cursor = (await getSyncState()).cursor
    for (;;) {
      const page = await remote.pull(cursor, PULL_PAGE)
      if (page.length === 0) return true
      if (!(await applyPage(page, g))) return false
      cursor = Math.max(...page.map((r) => r.rev))
      if (page.length < PULL_PAGE) return true
    }
  }

  async function once() {
    const g = gen
    status.set({ kind: 'syncing' })
    try {
      if (resetCursor) {
        resetCursor = false
        await setSyncState({ cursor: 0 })
      }
      await push(g)
      if (!(await pull(g))) {
        if (g === gen) status.set({ kind: 'update-required' })
        return
      }
      if (g !== gen) return
      const t = now()
      await setSyncState({ lastSyncedAt: t })
      if (g !== gen) return
      status.set({ kind: 'idle', lastSyncedAt: t })
    } catch (e) {
      if (e instanceof Cancelled || g !== gen) return
      status.set({ kind: isNetworkError(e) ? 'offline' : 'error' })
    }
  }

  let running: Promise<void> | null = null
  let again = false
  function run(): Promise<void> {
    if (disabled) return Promise.resolve()
    if (running) {
      again = true
      return running
    }
    running = (async () => {
      do {
        again = false
        await once()
      } while (again)
    })().finally(() => {
      running = null
    })
    return running
  }

  return {
    run,
    status,
    async resync() {
      if (disabled) return
      resetCursor = true
      await run()
    },
    cancel() {
      gen++
      again = false
    },
    disable() {
      disabled = true
      gen++
      again = false
    },
    enable() {
      disabled = false
    },
    settled: () => running ?? Promise.resolve(),
  }
}

/** Triggers: now, `online`, tab becomes visible, 2 s after local writes. Returns a stop function that cancels the in-flight run and resets status to idle;
 * await `engine.settled()` afterwards before clearing local data. */
export function startSync(engine: SyncEngine): () => void {
  engine.enable()
  const run = () => void engine.run()
  let timer: ReturnType<typeof setTimeout> | undefined
  let first = true
  const sub = liveQuery(async () => (await db.outbox.toArray()).reduce((n, e) => Math.max(n, e.changedAt), 0)).subscribe({
    next(latest) {
      if (first) {
        first = false
        return
      }
      // Local write -> debounce; our own post-push deletions leave count 0 and need no run.
      if (latest > 0) {
        clearTimeout(timer)
        timer = setTimeout(run, DEBOUNCE_MS)
      }
    },
    error() {},
  })
  const onVisible = () => {
    if (document.visibilityState === 'visible') run()
  }
  window.addEventListener('online', run)
  document.addEventListener('visibilitychange', onVisible)
  run()
  return () => {
    sub.unsubscribe()
    clearTimeout(timer)
    window.removeEventListener('online', run)
    document.removeEventListener('visibilitychange', onVisible)
    engine.cancel()
    engine.status.set({ kind: 'idle' })
  }
}
