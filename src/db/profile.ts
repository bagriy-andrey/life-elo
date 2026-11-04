import { normalizeNick, type Profile, type ProfileInput } from '../domain/profile'
import { db } from './db'

/** Form input plus photo: `undefined` keeps the stored photo, `null` removes it. */
export type SaveProfileInput = ProfileInput & { photo?: string | null }

const clean = (v: string | undefined) => {
  const t = v?.trim()
  return t ? t : undefined
}

/** Pure core of `saveProfile`: keeps `createdAt` of an existing profile, drops empty optionals. */
export function buildProfile(
  existing: Profile | undefined,
  input: SaveProfileInput,
  now: Date,
): Profile {
  const photo = input.photo === undefined ? existing?.photo : (input.photo ?? undefined)
  const nick = clean(normalizeNick(input.nick ?? ''))
  const profile: Profile = {
    id: 'me',
    name: input.name.trim(),
    createdAt: existing?.createdAt ?? now.getTime(),
  }
  if (nick) profile.nick = nick
  const email = clean(input.email)
  if (email) profile.email = email
  const birth = clean(input.birth)
  if (birth) profile.birth = birth
  if (photo) profile.photo = photo
  return profile
}

export async function saveProfile(input: SaveProfileInput, now: Date): Promise<void> {
  await db.transaction('rw', db.profile, async () => {
    await db.profile.put(buildProfile(await db.profile.get('me'), input, now))
  })
}

/** Wipes every table in one transaction. Prefs (localStorage) are cleared by the caller. */
export async function clearAllData(): Promise<void> {
  const tables = db.tables
  await db.transaction('rw', tables, async () => {
    await Promise.all(tables.map((t) => t.clear()))
  })
}
