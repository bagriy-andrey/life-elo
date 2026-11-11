import Dexie, { type DBCore, type DBCoreMutateRequest } from "dexie";
import { db } from "../db/db";

/** Tables that are synced to the server (key = primary key, always a string). */
export const SYNCED_TABLES = [
  "habits",
  "events",
  "reviews",
  "wellbeing",
  "rewards",
  "profile",
] as const;
export type SyncedTable = (typeof SYNCED_TABLES)[number];

/** One pending change. `changedAt` is epoch ms (converted to ISO when pushing). */
export interface OutboxEntry {
  tbl: SyncedTable;
  key: string;
  changedAt: number;
}

export interface SyncState {
  id: "state";
  userId?: string;
  cursor: number;
  lastSyncedAt?: number;
}

const REMOTE_FLAG = "__lifeEloRemote";
const synced = new Set<string>(SYNCED_TABLES);

/**
 * Why DBCore middleware instead of Dexie hooks: hooks may only touch tables that are part of the
 * transaction, and existing code opens transactions without `outbox`. The middleware (a) adds `outbox`
 * to every readwrite transaction's store list and (b) writes outbox rows right after each mutate() of a
 * synced table, inside the same IndexedDB transaction. Transactions flagged by `applyRemote` are skipped.
 */
export function installOutbox(target: Dexie): void {
  target.use({
    stack: "dbcore",
    name: "outbox",
    create(down: DBCore): DBCore {
      return {
        ...down,
        transaction(stores, mode, options) {
          const withOutbox =
            mode === "readwrite" && !stores.includes("outbox")
              ? [...stores, "outbox"]
              : stores;
          return down.transaction(withOutbox, mode, options);
        },
        table(name) {
          const table = down.table(name);
          if (!synced.has(name)) return table;
          return {
            ...table,
            async mutate(req: DBCoreMutateRequest) {
              const trans = req.trans as unknown as Record<string, unknown> & {
                mode: string;
              };
              if (trans[REMOTE_FLAG] || trans.mode !== "readwrite")
                return table.mutate(req);
              let keys: unknown[] = [];
              if (req.type === "deleteRange") {
                // collect keys before they disappear
                const res = await table.query({
                  trans: req.trans,
                  values: false,
                  query: { index: table.schema.primaryKey, range: req.range },
                });
                keys = res.result as unknown[];
              } else if (req.type === "delete") {
                keys = req.keys;
              }
              const res = await table.mutate(req);
              if (req.type === "add" || req.type === "put") {
                const pk = table.schema.primaryKey;
                keys = req.keys ?? req.values.map((v) => pk.extractKey!(v));
                if (res.numFailures && res.failures) {
                  keys = keys.filter((_, i) => !(i in res.failures));
                }
              }
              if (keys.length > 0) {
                const now = Date.now();
                await down.table("outbox").mutate({
                  type: "put",
                  trans: req.trans,
                  values: keys.map((k) => ({
                    tbl: name,
                    key: String(k),
                    changedAt: now,
                  })),
                });
              }
              return res;
            },
          };
        },
      };
    },
  });
}

/**
 * Runs `fn` in a readwrite transaction over the synced tables whose writes are NOT enqueued (pulled data).
 * Top-level only: the flag lives on the IDB transaction, so nesting would hide later local writes.
 */
export function applyRemote<T>(fn: () => Promise<T>): Promise<T> {
  if (Dexie.currentTransaction)
    return Promise.reject(new Error("applyRemote must not run inside another transaction"));
  return db.transaction(
    "rw",
    [
      db.habits,
      db.events,
      db.reviews,
      db.wellbeing,
      db.rewards,
      db.profile,
      db.garmin,
      db.outbox,
      db.syncState,
    ],
    () => {
      const idb = Dexie.currentTransaction?.idbtrans as unknown as
        Record<string, unknown> | undefined;
      if (idb) idb[REMOTE_FLAG] = true;
      return fn();
    },
  );
}

/** Wipes all local data (synced tables, outbox, syncState) without enqueueing anything. */
export function clearLocalData(): Promise<void> {
  return applyRemote(async () => {
    await Promise.all([
      db.habits.clear(),
      db.events.clear(),
      db.reviews.clear(),
      db.wellbeing.clear(),
      db.rewards.clear(),
      db.profile.clear(),
      db.garmin.clear(),
      db.outbox.clear(),
      db.syncState.clear(),
    ]);
  });
}

export async function getSyncState(): Promise<SyncState> {
  return (await db.syncState.get("state")) ?? { id: "state", cursor: 0 };
}

export async function setSyncState(
  patch: Partial<Omit<SyncState, "id">>,
): Promise<SyncState> {
  const next = { ...(await getSyncState()), ...patch, id: "state" as const };
  await db.syncState.put(next);
  return next;
}
