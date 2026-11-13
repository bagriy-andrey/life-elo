// Plan 18 screenshots. Usage: (npm run dev &) ; NODE_PATH=.ds-sync/node_modules node scripts/plan18-screens.mjs [baseUrl]
// Fakes a signed-in session in localStorage, stubs all Supabase network, seeds Dexie from src/garmin/fixtures.
// Never touches the real Supabase or Garmin.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')

const BASE = process.argv[2] ?? 'http://localhost:5173'
const OUT = new URL('../docs/plans/18-screens/', import.meta.url).pathname
const REF = 'etlecexumwisxdbgctev'
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const exp = Math.floor(Date.now() / 1000) + 3600 * 24 * 30
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'user-1', exp, role: 'authenticated' })}.sig`
const user = { id: 'user-1', aud: 'authenticated', role: 'authenticated', email: 'anna@example.com', app_metadata: { provider: 'email' }, identities: [{ provider: 'email' }], user_metadata: { name: 'Anna' }, created_at: '2026-01-01T00:00:00Z' }
const session = { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 2592000, expires_at: exp, user }

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) })

async function seed(page, withYesterday) {
  await page.evaluate(async ({ withYesterday }) => {
    const { db } = await import('/src/db/db.ts')
    const { parseGarmin } = await import('/src/garmin/parse.ts')
    const { buildDetail } = await import('/src/garmin/detail.ts')
    const f = async (n) => (await import(`/src/garmin/fixtures/${n}.json`)).default
    const [steps, sleep, activities, summaries, dsleep, hr, hrv, spo2, bb, dact] = await Promise.all(
      ['steps', 'sleep', 'activities', 'detail-summaries', 'detail-sleep', 'detail-hr', 'detail-hrv', 'detail-spo2', 'detail-bodybattery', 'detail-activities'].map(f))
    const days = parseGarmin({ steps, sleepByDate: sleep.responses, activities })
    await db.garmin.clear(); await db.garminDetail.clear()
    // The parse fixtures end at 11-11: add 12-13.11 rows so the review hints have data (night 12→13 dated 13).
    days['2026-11-12'] = { ...days['2026-11-12'], steps: 11840, sleepEnd: '07:34', activities: [{ type: 'running', minutes: 42 }] }
    days['2026-11-13'] = { ...days['2026-11-13'], steps: 40, sleepStart: '23:41', sleepEnd: '07:20', activities: [] }
    for (const [day, d] of Object.entries(days)) await db.garmin.put({ ...d, day })
    for (const day of ['2026-11-12', '2026-11-13']) {
      await db.garminDetail.put({ ...buildDetail({ summaries, sleep: dsleep, heartRate: hr, hrv, spo2, bodyBattery: bb, activities: dact }, day), day })
    }
    const mk = (id, name, direction, tier, rule, source, createdAt) => ({
      id, name, direction, active: true, effectiveFrom: '2026-10-01', createdAt, source,
      versions: [{ from: '2026-10-01', tier, rule }],
    })
    const habits = [
      mk('h-steps', 'Шаги', 'constructive', 'medium', { kind: 'measured', unit: 'steps', better: 'higher', excellent: 10000, ok: 7000 }, { kind: 'garmin', metric: 'steps' }, 1),
      mk('h-bed', 'Лечь до полуночи', 'constructive', 'strong', { kind: 'measured', unit: 'time', better: 'lower', excellent: '23:30', ok: '00:15' }, { kind: 'garmin', metric: 'bedtime' }, 2),
      mk('h-wake', 'Подъём', 'constructive', 'weak', { kind: 'measured', unit: 'time', better: 'lower', excellent: '07:30', ok: '08:30' }, { kind: 'garmin', metric: 'wake' }, 3),
      mk('h-sport', 'Тренировка', 'constructive', 'strong', { kind: 'boolean' }, { kind: 'garmin', metric: 'activity', activityTypes: ['paddelball', 'running', 'strength_training', 'walking', 'cycling', 'hiking'] }, 4),
      mk('h-read', 'Чтение', 'constructive', 'weak', { kind: 'boolean' }, undefined, 5),
      mk('h-sugar', 'Сладкое', 'destructive', 'medium', { kind: 'boolean' }, undefined, 6),
    ]
    await db.habits.clear(); await db.reviews.clear(); await db.profile.clear()
    await db.habits.bulkPut(habits)
    const ds = ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11']
    if (withYesterday) ds.push('2026-11-12')
    const val = (v) => ({ kind: 'value', value: v })
    let i = 0
    for (const day of ds) {
      i++
      await db.reviews.put({ day, confirmedAt: Date.now(), revision: 0, entries: {
        'h-steps': val(6000 + ((i * 1733) % 7000)), 'h-bed': val(i % 3 ? '23:20' : '00:40'), 'h-wake': val('07:50'),
        'h-sport': val(i % 2 === 0), 'h-read': val(i % 4 !== 0), 'h-sugar': val(i % 5 === 0),
      } })
    }
    await db.profile.put({ id: 'me', name: 'Anna', nick: 'anna', email: 'anna@example.com', birth: '1992-04-12', createdAt: new Date('2026-10-01').getTime() })
    await db.syncState.put({ id: 'state', userId: 'user-1', cursor: 0, lastSyncedAt: Date.now() })
  }, { withYesterday })
}

const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
const shots = [
  ['home', '/', false, false],
  ['day', '/garmin/2026-11-12', false, true],
  ['review', '/review', true, false],
  ['profile', '/profile', false, true],
]
for (const theme of ['light', 'dark']) {
  for (const [name, path, noYesterday, full] of shots) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ru-RU', timezoneId: 'Europe/Kyiv' })
    await ctx.addInitScript(([ref, s, theme]) => {
      localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(s))
    }, [REF, session, theme])
    await ctx.route('**/*.supabase.co/**', async (route) => {
      const req = route.request(); const u = new URL(req.url())
      if (req.method() === 'OPTIONS') return json(route, {})
      if (u.pathname.includes('/functions/v1/garmin-connect')) {
        return json(route, { connected: true, keyExpiresAt: '2027-02-10T00:00:00Z', lastPullAt: new Date().toISOString().slice(0, 11) + '13:57:00Z', lastAttemptAt: null, lastError: null })
      }
      if (u.pathname.includes('/functions/v1/garmin-pull')) return json(route, { status: 'ok', lastPullAt: new Date().toISOString().slice(0, 11) + '13:57:00Z', coverage: {} })
      if (u.pathname.includes('/rest/v1/records')) return json(route, [])
      if (u.pathname.includes('/rpc/')) return json(route, 0)
      if (u.pathname.includes('/auth/v1/user')) return json(route, user)
      return json(route, {})
    })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => console.log('pageerror', name, e.message))
    await page.goto(BASE + '/')
    await page.waitForTimeout(1500)
    await seed(page, !noYesterday)
    await page.evaluate((theme) => document.documentElement.setAttribute('data-theme', theme), theme)
    await page.goto(BASE + path)
    await page.evaluate((theme) => document.documentElement.setAttribute('data-theme', theme), theme)
    await page.addStyleTag({ content: '.fullscreen-modal{display:none!important}' + (full ? ' .tabbar,nav[class*=tab]{display:none!important}' : '') })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: `${OUT}${name}-${theme}.png`, fullPage: full })
    await ctx.close()
  }
}
await browser.close()
