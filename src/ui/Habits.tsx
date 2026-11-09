import { useState } from 'react'
import { dayOf } from '../domain/day'
import { settingsOn } from '../domain/settings'
import type { DayReview, Habit } from '../domain/types'
import { Button, Card } from './components'
import { groupByDirectionAndTier } from './grouping'
import { HabitSheet } from './HabitSheet'
import { useI18n } from '../i18n'
import { directionGroupLabels, habitMeta, TIER_COLOR, tierGroupLabels } from './labels'
import './HabitSheet.css'

interface Props {
  habits: Habit[]
  /** Stored reviews: decide whether a habit's direction can still change. */
  reviews: DayReview[]
  /** New habits become reviewable starting from this day. */
  effectiveFrom: string
}

const today = () => dayOf(new Date())

/** Which habit the sheet shows: a new one or the one being edited. */
type SheetState = { mode: 'create' } | { mode: 'edit'; id: string }

export function Habits({ habits, reviews, effectiveFrom }: Props) {
  const { t } = useI18n()
  const DIRECTION_GROUP_LABEL = directionGroupLabels(t)
  const TIER_GROUP_LABEL = tierGroupLabels(t)
  const [sheet, setSheet] = useState<SheetState>()
  const editing = sheet?.mode === 'edit' ? habits.find((h) => h.id === sheet.id) : undefined

  const renderHabit = (h: Habit) => {
    const cur = settingsOn(h, today())
    return (
      <Card key={h.id} inactive={!h.active}>
        <button type="button" className="habit-card" onClick={() => setSheet({ mode: 'edit', id: h.id })}>
          <span className={h.direction === 'destructive' ? 'habit-card-dot neg' : 'habit-card-dot'} aria-hidden="true" />
          <span className="habit-card-text">
            <strong>{h.name}</strong>
            <span className="habit-card-meta">{habitMeta(t, h.direction, cur)}</span>
          </span>
        </button>
      </Card>
    )
  }

  return (
    <section className="stack">
      <div className="habits-head">
        <h2>{t('tab.habits')}</h2>
        <Button variant="primary" onClick={() => setSheet({ mode: 'create' })}>
          + {t('common.add')}
        </Button>
      </div>

      {habits.length === 0 && (
        <div className="habits-empty">
          <strong>{t('habits.emptyTitle')}</strong>
          <span>{t('habits.emptyText')}</span>
        </div>
      )}

      {groupByDirectionAndTier(habits, (h) => ({
        direction: h.direction,
        tier: settingsOn(h, today()).tier,
      })).map((g) => (
        <section key={g.direction} className="stack">
          <h2>{DIRECTION_GROUP_LABEL[g.direction]}</h2>
          {g.tiers.map((tg) => (
            <div key={tg.tier} className="stack">
              <span className="muted">
                <span style={{ color: TIER_COLOR[tg.tier] }}>●</span> {TIER_GROUP_LABEL[tg.tier]}
              </span>
              {tg.items.map(renderHabit)}
            </div>
          ))}
        </section>
      ))}

      {sheet && (sheet.mode === 'create' || editing) && (
        <HabitSheet
          key={editing?.id ?? 'new'}
          habit={editing}
          habits={habits}
          reviews={reviews}
          effectiveFrom={effectiveFrom}
          onClose={() => setSheet(undefined)}
        />
      )}
    </section>
  )
}
