import { supabase } from '../auth/supabase'
import type { PushItem, RemoteRecord } from './merge'

export interface SyncRemote {
  push(items: PushItem[]): Promise<number>
  pull(afterRev: number, limit: number): Promise<RemoteRecord[]>
  count(): Promise<number>
  reset(): Promise<void>
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

/** Supabase implementation; RLS scopes every query to the signed-in user. All errors throw. */
export const supabaseRemote: SyncRemote = {
  async push(items) {
    const { data, error } = await client().rpc('push_records', { items })
    if (error) throw new Error(error.message)
    return (data as number) ?? 0
  },
  async pull(afterRev, limit) {
    const { data, error } = await client()
      .from('records')
      .select('*')
      .gt('rev', afterRev)
      .order('rev', { ascending: true })
      .limit(limit)
    if (error) throw new Error(error.message)
    return (data ?? []).map((r) => ({ ...r, rev: Number(r.rev) })) as RemoteRecord[]
  },
  async count() {
    const { count, error } = await client().from('records').select('*', { count: 'exact', head: true })
    if (error) throw new Error(error.message)
    return count ?? 0
  },
  async reset() {
    const { error } = await client().rpc('reset_records')
    if (error) throw new Error(error.message)
  },
}
