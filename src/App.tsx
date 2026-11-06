import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db } from './db/db'
import { addDays, reviewDay, toDayKey } from './domain/day'
import type { DayReview, Habit } from './domain/types'
import { RULESET_V1 } from './engine/config'
import { replay } from './engine/rating'
import { useAuth } from './auth/AuthProvider'
import { useI18n } from './i18n'
import { adoptRemote, keepDevice, prepareFirstSignIn, resolveAutomatic } from './sync/firstSignIn'
import { createSyncEngine, startSync } from './sync/engine'
import { getSyncState } from './sync/outbox'
import { supabaseRemote } from './sync/remote'
import { wipeAccountData } from './sync/wipe'
import { AuthLogo, AuthScreen } from './ui/auth/AuthScreen'
import { NewPassword } from './ui/auth/NewPassword'
import { Account } from './ui/Account'
import { Button, TabBar } from './ui/components'
import { Habits } from './ui/Habits'
import { Home } from './ui/Home'
import { Profile } from './ui/Profile'
import { ProfilePassword } from './ui/ProfilePassword'
import { Review } from './ui/Review'
import { SyncChoice } from './ui/SyncChoice'

type Tab = 'home' | 'review' | 'habits' | 'profile'

const NO_HABITS: Habit[] = []
const NO_REVIEWS: DayReview[] = []

function MainApp() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('home')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [yesterday, setYesterday] = useState(() => reviewDay(new Date()))
  const [today, setToday] = useState(() => toDayKey(new Date()))
  const [reviewing, setReviewing] = useState(yesterday)

  // The PWA may stay open across midnight: re-evaluate when it comes back.
  useEffect(() => {
    const refresh = () => {
      setYesterday(reviewDay(new Date()))
      setToday(toDayKey(new Date()))
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])

  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? NO_HABITS
  const reviews = useLiveQuery(() => db.reviews.toArray(), []) ?? NO_REVIEWS
  const profile = useLiveQuery(async () => (await db.profile.get('me')) ?? null, [])

  const result = useMemo(() => replay(habits, reviews, RULESET_V1, addDays(yesterday, 1)), [habits, reviews, yesterday])
  const sortedHabits = [...habits].sort((a, b) => a.createdAt - b.createdAt)
  const hasYesterdayHabits = habits.some((h) => h.active && h.effectiveFrom <= yesterday)
  const pendingDay =
    hasYesterdayHabits && !reviews.some((r) => r.day === yesterday) ? yesterday : undefined

  const openReview = () => {
    setReviewing(yesterday)
    setTab('review')
  }

  return (
    <div className="app">
      <main>
        {tab === 'home' && (
          <Home result={result} habits={habits} pendingDay={pendingDay} onReview={openReview} />
        )}
        {tab === 'review' && (
          <Review
            key={reviewing}
            day={reviewing}
            maxDay={yesterday}
            habits={sortedHabits}
            reviews={reviews}
            existing={reviews.find((r) => r.day === reviewing)}
            onDayChange={setReviewing}
            onDone={() => setTab('home')}
          />
        )}
        {tab === 'profile' && passwordOpen && <ProfilePassword onBack={() => setPasswordOpen(false)} />}
        {tab === 'profile' && !passwordOpen && profile !== undefined && (
          <Profile
            profile={profile}
            rating={result.rating}
            today={today}
            onClearData={() => wipeAccountData({ engine: syncEngine, remote: supabaseRemote })}
            account={<Account engine={syncEngine} onPassword={() => setPasswordOpen(true)} />}
          />
        )}
        {tab === 'habits' && <Habits habits={sortedHabits} reviews={reviews} effectiveFrom={yesterday} />}
      </main>
      <TabBar
        active={tab}
        onSelect={(id) => {
          setPasswordOpen(false)
          if (id === 'review') openReview()
          else setTab(id)
        }}
        items={[
          { id: 'home', label: t('tab.home') },
          { id: 'review', label: t('tab.review'), badge: !!pendingDay },
          { id: 'habits', label: t('tab.habits') },
          { id: 'profile', label: t('tab.profile') },
        ]}
      />
    </div>
  )
}

const syncEngine = createSyncEngine({ remote: supabaseRemote })

/** Runs background sync while signed in. Stops on sign-out (effect cleanup). */
function useBackgroundSync(userId: string | undefined) {
  const syncedUserId = useLiveQuery(async () => (await getSyncState()).userId, [])
  useEffect(() => {
    if (!userId || syncedUserId !== userId) return
    return startSync(syncEngine)
  }, [userId, syncedUserId])
}

/** Stops any running sync before local data is replaced. */
async function stopSync() {
  syncEngine.disable()
  await syncEngine.settled()
}

type Gate = 'checking' | 'offline' | 'ask' | 'ready'

/** First sign-in on this device: decides upload / pull / ask. Never decides without the remote state. */
function FirstSignInGate({ userId }: { userId: string }) {
  const { t } = useI18n()
  const [gate, setGate] = useState<Gate>('checking')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const mode = await prepareFirstSignIn(userId, supabaseRemote)
        // A previous account's run may still be in flight when the device is re-claimed.
        if (mode !== 'none') await stopSync()
        const done = await resolveAutomatic(mode, userId)
        if (alive) setGate(done ? 'ready' : 'ask')
      } catch {
        if (alive) setGate('offline')
      }
    })()
    return () => {
      alive = false
    }
  }, [userId, attempt])

  if (gate === 'ready') return <MainApp />
  if (gate === 'ask')
    return (
      <SyncChoice
        onChoose={async (kind) => {
          await stopSync()
          if (kind === 'account') await adoptRemote(userId)
          else await keepDevice(userId, supabaseRemote)
          setGate('ready')
        }}
      />
    )
  if (gate === 'offline')
    return (
      <div className="auth">
        <AuthLogo />
        <p className="auth-muted">{t('sync.needInternet')}</p>
        <Button className="auth-submit" onClick={() => {
            setGate('checking')
            setAttempt((n) => n + 1)
          }}>
          {t('sync.retry')}
        </Button>
      </div>
    )
  return (
    <div className="auth auth-splash">
      <AuthLogo />
    </div>
  )
}

export default function App() {
  const { t } = useI18n()
  const { configured, loading, recovery, session } = useAuth()
  const [startForgot, setStartForgot] = useState(false)
  useBackgroundSync(session?.user.id)
  // The forgot hand-off is one-shot: a later sign-out opens login again.
  if (session && startForgot) setStartForgot(false)
  if (!configured)
    return (
      <div className="auth-message">
        {t('sync.notConfigured')}
      </div>
    )
  if (loading)
    return (
      <div className="auth auth-splash">
        <AuthLogo />
      </div>
    )
  // Checked before `session`, because verifyOtp creates a session.
  if (recovery !== null) return <NewPassword onRequestNew={() => setStartForgot(true)} />
  if (!session) return <AuthScreen initialMode={startForgot ? 'forgot' : 'login'} />
  return <FirstSignInGate key={session.user.id} userId={session.user.id} />
}
