import type { ReviewOutcome } from '../domain/reviewOutcome'
import type { Habit } from '../domain/types'
import { useI18n } from '../i18n'
import { Button } from './components'
import { formatSigned } from './labels'

interface Props {
  outcome: ReviewOutcome
  habits: Habit[]
  onContinue: () => void
}

const round = (n: number) => Number(n.toFixed(2))

/** Last screen of the yesterday review: Elo delta, day vs usual day, changed streaks. */
export function YesterdayDone({ outcome, habits, onContinue }: Props) {
  const { t } = useI18n()
  const name = (id: string) => habits.find((h) => h.id === id)?.name ?? ''
  const hasStreaks = outcome.streaksGrew.length > 0 || outcome.streaksBroke.length > 0
  const tone = outcome.delta > 0 ? 'pos' : outcome.delta < 0 ? 'neg' : 'zero'
  return (
    <div className="yr-done">
      <div className="yr-done-card">
        <h2 className="yr-done-title">{t('yr.done.title')}</h2>
        <p className={`yr-done-delta yr-tone-${tone}`}>
          {t('yr.done.delta', { delta: formatSigned(outcome.delta, 1), rating: formatSigned(outcome.ratingAfter, 1) })}
        </p>
        <p className="yr-done-score">
          {t('yr.done.score', { score: round(outcome.dayScore), expected: round(outcome.expected) })}
        </p>
        {hasStreaks && (
          <div className="yr-done-streaks">
            <h3 className="yr-done-streaks-title">{t('yr.done.streaksTitle')}</h3>
            <ul>
              {outcome.streaksGrew.map((s) => (
                <li key={`g${s.habitId}`} className="yr-tone-pos">
                  {t('yr.done.streakGrew', { name: name(s.habitId), count: s.pos })}
                </li>
              ))}
              {outcome.streaksBroke.map((s) => (
                <li key={`b${s.habitId}`} className="yr-tone-neg">
                  {t('yr.done.streakBroke', { name: name(s.habitId), count: s.was })}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="yr-done-subtitle">{t('yr.done.subtitle')}</p>
      </div>
      <Button variant="primary" className="yr-confirm" onClick={onContinue} autoFocus>
        {t('yr.done.continue')}
      </Button>
    </div>
  )
}
