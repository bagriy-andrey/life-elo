import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from './db/db'
import { addDays, reviewDay, toDayKey } from './domain/day'
import { nextMidnight } from './domain/reviewDeadline'
import { decideModal } from './domain/reviewFlow'
import type { DayReview, Habit } from './domain/types'
import { RULESET_V2 } from './engine/config'
import { replay } from './engine/rating'
import { useAuth } from './auth/context'
import { useGarminAutoPull } from './garmin/useGarminAutoPull'
import { useI18n } from './i18n'
import { claimDevice, isClaimedBy } from './sync/firstSignIn'
import { createSyncEngine, startSync, useSyncStatus } from './sync/engine'
import { getSyncState } from './sync/outbox'
import { supabaseRemote } from './sync/remote'
import { wipeAccountData } from './sync/wipe'
import { AuthLogo, AuthScreen } from './ui/auth/AuthScreen'
import { NewPassword } from './ui/auth/NewPassword'
import { AccountActions, AccountSection } from './ui/Account'
import { Spinner, TabBar } from './ui/components'
import { tabIcons } from './ui/tabIcons'
import { setBackgroundInert } from './ui/components/focus'
import { HabitPage } from './ui/HabitPage'
import { GarminDayPage } from './ui/GarminDayPage'
import { Habits } from './ui/Habits'
import { Home } from './ui/Home'
import { Profile } from './ui/Profile'
import { ProfilePassword } from './ui/ProfilePassword'
import { Review } from './ui/Review'
import { ScreenSkeleton } from './ui/ScreenSkeleton'
import { YesterdayReview } from './ui/YesterdayReview'
import { useRoute, type Tab } from './ui/route'

const NO_HABITS: Habit[] = []
const NO_REVIEWS: DayReview[] = []

function MainApp() {
  const { t } = useI18n()
  useGarminAutoPull(true)
  const [route, navigate] = useRoute()
  const tab = route.tab
  const passwordOpen = route.tab === 'profile' && !!route.password
  const garminDay = route.tab === 'profile' ? route.garminDay : undefined
  const [now, setNow] = useState(() => new Date())
  const yesterday = reviewDay(now)
  const today = toDayKey(now)
  // Only yesterday or earlier can be reviewed; a future/stale day in the URL falls back to yesterday.
  const reviewing = route.tab === 'review' && route.day && route.day < yesterday ? route.day : yesterday

  // The PWA may stay open across midnight: re-read the clock when it comes back and at midnight.
  useEffect(() => {
    const refresh = () => setNow(new Date())
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = setTimeout(refresh, Math.max(1000, nextMidnight(new Date()).getTime() - Date.now() + 500))
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearTimeout(timer)
    }
  }, [now])

  const habitsRows = useLiveQuery(() => db.habits.toArray(), [])
  const reviewsRows = useLiveQuery(() => db.reviews.toArray(), [])
  const habits = habitsRows ?? NO_HABITS
  const reviews = reviewsRows ?? NO_REVIEWS
  const profile = useLiveQuery(async () => (await db.profile.get('me')) ?? null, [])
  const syncState = useLiveQuery(getSyncState, [])
  const lastSyncedAt = syncState?.lastSyncedAt
  const dataReady = useDataReady(
    habitsRows !== undefined && reviewsRows !== undefined && profile !== undefined && syncState !== undefined,
    !!lastSyncedAt,
  )

  const result = useMemo(() => replay(habits, reviews, RULESET_V2, addDays(yesterday, 1)), [habits, reviews, yesterday])
  const sortedHabits = [...habits].sort((a, b) => a.createdAt - b.createdAt)
  const hasYesterdayHabits = habits.some((h) => h.active && h.effectiveFrom <= yesterday)
  const pendingDay =
    hasYesterdayHabits && !reviews.some((r) => r.day === yesterday) ? yesterday : undefined

  // Mandatory yesterday review. `reviewDay` is fixed while the modal is open; once opened it stays
  // mounted until onClose (saving flips the show condition, the done screen must not vanish).
  const [modalDay, setModalDay] = useState<string | null>(null)
  const savedHere = useRef(false)
  const lastSavedDay = useRef<string | null>(null)
  const closeModal = () => {
    savedHere.current = false
    setModalDay(null)
    // A locked/stale day must not re-open forever: re-read the clock.
    setNow(new Date())
  }
  useEffect(() => {
    const d = decideModal({
      modalDay,
      savedHere: savedHere.current,
      lastSavedDay: lastSavedDay.current,
      habits,
      reviews,
      now,
      lastSyncedAt,
    })
    if (d.action === 'open') setModalDay(d.day)
    else if (d.action === 'close') closeModal()
  }, [modalDay, habits, reviews, now, lastSyncedAt])

  const mainRef = useRef<HTMLElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const modalOpen = modalDay !== null
  useEffect(() => {
    if (!modalOpen) return
    const undo = [setBackgroundInert(mainRef.current), setBackgroundInert(tabsRef.current)]
    return () => undo.forEach((u) => u())
  }, [modalOpen])

  const openReview = () => navigate({ tab: 'review' })
  const setTab = (next: Exclude<Tab, 'review'>) => navigate({ tab: next })
  const habitId = route.tab === 'habits' ? route.id : undefined
  const openedHabit = habitId ? habits.find((h) => h.id === habitId) : undefined

  // An unknown habit id (deleted, stale link) falls back to the list.
  useEffect(() => {
    if (dataReady && habitId && !openedHabit) navigate({ tab: 'habits' }, { replace: true })
  }, [dataReady, habitId, openedHabit, navigate])

  return (
    <div className="app">
      <main ref={mainRef}>
        {!dataReady && <ScreenSkeleton tab={tab} />}
        {dataReady && tab === 'home' && (
          <Home result={result} habits={habits} pendingDay={pendingDay} onReview={openReview} />
        )}
        {dataReady && tab === 'review' && (
          <Review
            key={reviewing}
            day={reviewing}
            maxDay={yesterday}
            habits={sortedHabits}
            reviews={reviews}
            existing={reviews.find((r) => r.day === reviewing)}
            onDayChange={(day) => navigate({ tab: 'review', day: day < yesterday ? day : undefined }, { replace: true })}
            onDone={() => setTab('home')}
          />
        )}
        {dataReady && tab === 'profile' && garminDay && (
          <GarminDayPage
            key={garminDay}
            day={garminDay}
            onBack={() => (history.length > 1 ? history.back() : navigate({ tab: 'profile' }, { replace: true }))}
          />
        )}
        {dataReady && tab === 'profile' && passwordOpen && <ProfilePassword onBack={() => navigate({ tab: 'profile' })} />}
        {dataReady && tab === 'profile' && !garminDay && !passwordOpen && profile !== undefined && (
          <Profile
            profile={profile}
            rating={result.rating}
            today={today}
            onOpenGarminDay={(day) => navigate({ tab: 'profile', garminDay: day })}
            onClearData={() => wipeAccountData({ engine: syncEngine, remote: supabaseRemote })}
            accountSection={<AccountSection engine={syncEngine} />}
            accountActions={<AccountActions engine={syncEngine} onPassword={() => navigate({ tab: 'profile', password: true })} />}
          />
        )}
        {dataReady && tab === 'habits' && !habitId && (
          <Habits
            habits={sortedHabits}
            reviews={reviews}
            effectiveFrom={yesterday}
            onOpenHabit={(id) => navigate({ tab: 'habits', id })}
          />
        )}
        {dataReady && tab === 'habits' && openedHabit && (
          <HabitPage
            habit={openedHabit}
            habits={sortedHabits}
            reviews={reviews}
            effectiveFrom={yesterday}
            today={today}
            onBack={() => navigate({ tab: 'habits' })}
          />
        )}
      </main>
      <div ref={tabsRef}>
      <TabBar
        active={tab}
        onSelect={(id) => {
          if (id === 'review') openReview()
          else if (id === 'habits') {
            // The tab always returns to the list, scrolled to the top.
            navigate({ tab: 'habits' })
            window.scrollTo(0, 0)
          } else setTab(id)
        }}
        items={[
          { id: 'home', label: t('tab.home'), icon: tabIcons.home },
          { id: 'review', label: t('tab.review'), icon: tabIcons.review, badge: !!pendingDay },
          { id: 'habits', label: t('tab.habits'), icon: tabIcons.habits },
          { id: 'profile', label: t('tab.profile'), icon: tabIcons.profile },
        ]}
      />
      </div>
      {modalDay !== null && (
        <YesterdayReview
          day={modalDay}
          habits={habits}
          reviews={reviews}
          rating={result.rating}
          onClose={closeModal}
          onSaving={(active) => {
            savedHere.current = active
            // `false` only follows a failed save: the day may open again.
            lastSavedDay.current = active ? modalDay : null
          }}
        />
      )}
    </div>
  )
}

const syncEngine = createSyncEngine({ remote: supabaseRemote })

/** Longest wait for the first pull before showing (possibly empty) local data anyway. */
const FIRST_PULL_TIMEOUT_MS = 10_000

/**
 * True once local data can be shown without flashing empty states: Dexie reads are done and,
 * right after sign-in on this device, the first pull has finished (or failed/offline/timed out).
 */
function useDataReady(localRead: boolean, everSynced: boolean): boolean {
  const status = useSyncStatus()
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setTimedOut(true), FIRST_PULL_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [])
  const pulling = !everSynced && (status.kind === 'idle' || status.kind === 'syncing')
  return localRead && (!pulling || timedOut)
}

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
  const { t } = useI18n()
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
      <Spinner className="auth-splash-spinner" label={t('common.loading')} />
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
