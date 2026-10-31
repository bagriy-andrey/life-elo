import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { db } from './db/db'
import { reviewDay } from './domain/day'
import type { DayReview, Habit } from './domain/types'
import { PLACEHOLDER_RULESET } from './engine/config'
import { replay } from './engine/rating'
import { Habits } from './ui/Habits'
import { Home } from './ui/Home'
import { Review } from './ui/Review'

type Tab = 'home' | 'review' | 'habits'

const NO_HABITS: Habit[] = []
const NO_REVIEWS: DayReview[] = []

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [yesterday, setYesterday] = useState(() => reviewDay(new Date()))
  const [reviewing, setReviewing] = useState(yesterday)

  // The PWA may stay open across midnight: re-evaluate when it comes back.
  useEffect(() => {
    const refresh = () => setYesterday(reviewDay(new Date()))
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])

  const habits = useLiveQuery(() => db.habits.toArray(), []) ?? NO_HABITS
  const reviews = useLiveQuery(() => db.reviews.toArray(), []) ?? NO_REVIEWS

  const result = useMemo(() => replay(habits, reviews, PLACEHOLDER_RULESET), [habits, reviews])
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
            existing={reviews.find((r) => r.day === reviewing)}
            onDayChange={setReviewing}
            onDone={() => setTab('home')}
          />
        )}
        {tab === 'habits' && <Habits habits={sortedHabits} effectiveFrom={yesterday} />}
      </main>
      <nav className="tabbar">
        <button className={tab === 'home' ? 'on' : ''} onClick={() => setTab('home')}>
          Главная
        </button>
        <button className={tab === 'review' ? 'on' : ''} onClick={openReview}>
          Обзор дня{pendingDay && <span className="dot" />}
        </button>
        <button className={tab === 'habits' ? 'on' : ''} onClick={() => setTab('habits')}>
          Привычки
        </button>
      </nav>
    </div>
  )
}
