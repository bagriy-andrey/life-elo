import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db } from './db/db'
import { addDays, reviewDay, toDayKey } from './domain/day'
import type { DayReview, Habit } from './domain/types'
import { RULESET_V1 } from './engine/config'
import { replay } from './engine/rating'
import { useAuth } from './auth/context'
import { useI18n } from './i18n'
import { claimDevice, isClaimedBy } from './sync/firstSignIn'
import { createSyncEngine, startSync } from './sync/engine'
import { getSyncState } from './sync/outbox'
import { supabaseRemote } from './sync/remote'
import { wipeAccountData } from './sync/wipe'
import { AuthLogo, AuthScreen } from './ui/auth/AuthScreen'
import { NewPassword } from './ui/auth/NewPassword'
import { Account } from './ui/Account'
import { TabBar } from './ui/components'
import { Habits } from './ui/Habits'
import { Home } from './ui/Home'
import { Profile } from './ui/Profile'
import { ProfilePassword } from './ui/ProfilePassword'
import { Review } from './ui/Review'

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

/**
 * Sign-in on this device: the server is the source of truth, so anything not cached for this user
 * is dropped and pulled again by background sync. Works offline (the app opens empty and fills in
 * once the network is back).
 */
function FirstSignInGate({ userId }: { userId: string }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // A previous account's run may still be in flight when the device is re-claimed.
        if (!(await isClaimedBy(userId))) await stopSync()
        await claimDevice(userId)
      } finally {
        if (alive) setReady(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [userId])

  if (ready) return <MainApp />
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
