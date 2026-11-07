// Pure sync rules (no Dexie / Supabase imports).

export interface RemoteRecord {
  tbl: string
  key: string
  data: unknown | null
  deleted: boolean
  schema: number
  client_updated_at: string // ISO
  rev: number
}

export interface PushItem {
  tbl: string
  key: string
  data: unknown | null
  deleted: boolean
  schema: number
  client_updated_at: string // ISO
}

/** Keep the local copy only when a pending local change is strictly newer than the remote one. */
export function applyDecision(
  remote: Pick<RemoteRecord, 'client_updated_at'>,
  outboxEntry: { changedAt: number } | undefined,
): 'apply' | 'keep-local' {
  if (!outboxEntry) return 'apply'
  return outboxEntry.changedAt > Date.parse(remote.client_updated_at) ? 'keep-local' : 'apply'
}

export function schemaGate(remoteSchema: number, localSchema: number): 'ok' | 'migrate' | 'update-app' {
  if (remoteSchema > localSchema) return 'update-app'
  if (remoteSchema < localSchema) return 'migrate'
  return 'ok'
}

export function toPushItem(
  tbl: string,
  key: string,
  row: unknown | undefined,
  changedAt: number,
  schema: number,
): PushItem {
  const deleted = row === undefined
  return {
    tbl,
    key,
    data: deleted ? null : row,
    deleted,
    schema,
    client_updated_at: new Date(changedAt).toISOString(),
  }
}
