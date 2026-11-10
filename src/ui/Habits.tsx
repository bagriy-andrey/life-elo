import { useState } from 'react'
import { dayOf } from '../domain/day'
import { settingsOn } from '../domain/settings'
import type { DayReview, Habit } from '../domain/types'
import { Button, StatTile } from './components'
import { countByDirectionAndTier, groupByDirectionAndTier } from './grouping'
import { HabitSheet } from './HabitSheet'
import { useI18n } from '../i18n'
import { directionGroupLabels, habitMeta, TIER_COLOR, tierGroupLabels } from './labels'
import { HabitCard } from './HabitCard'
import { HabitDeleteDialog } from './HabitDeleteDialog'
import { togglePause } from './habitActions'
import { TierBars } from './components/TierBars'
import './HabitSheet.css'

interface Props {
  habits: Habit[]
  /** Stored reviews: decide whether a habit's direction can still change. */
  reviews: DayReview[]
  /** New habits become reviewable starting from this day. */
  effectiveFrom: string
  /** Opens the habit page; wired in App. */
  onOpenHabit?: (id: string) => void
}

const TIER_LEVEL = { strong: 3, medium: 2, weak: 1 } as const

const today = () => dayOf(new Date())

/** Which habit the sheet shows: a new one or the one being edited. */
type SheetState = { mode: 'create' } | { mode: 'edit'; id: string }

export function Habits({ habits, reviews, effectiveFrom, onOpenHabit = () => {} }: Props) {
  const { t } = useI18n()
  const DIRECTION_GROUP_LABEL = directionGroupLabels(t)
  const TIER_GROUP_LABEL = tierGroupLabels(t)
  const [sheet, setSheet] = useState<SheetState>()
  const [deleting, setDeleting] = useState<Habit>()
  const editing = sheet?.mode === 'edit' ? habits.find((h) => h.id === sheet.id) : undefined

  const counts = countByDirectionAndTier(habits, (h) => ({
    direction: h.direction,
    tier: settingsOn(h, today()).tier,
  }))
  const summaryRows = (c: (typeof counts)['constructive']) => [
    { label: TIER_GROUP_LABEL.strong, value: c.strong, level: 3 as const },
    { label: TIER_GROUP_LABEL.medium, value: c.medium, level: 2 as const },
    { label: TIER_GROUP_LABEL.weak, value: c.weak, level: 1 as const },
  ]

  const renderHabit = (h: Habit) => (
    <HabitCard
      key={h.id}
      habit={h}
      meta={habitMeta(t, h.direction, settingsOn(h, today()))}
      onOpen={() => onOpenHabit(h.id)}
      onEdit={() => setSheet({ mode: 'edit', id: h.id })}
      onTogglePause={() => void togglePause(h)}
      onDelete={() => setDeleting(h)}
    />
  )

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

      {habits.length > 0 && (
        <section className="habits-summary" aria-label={t('habits.summary.aria')}>
          <StatTile
            title={t('habits.summary.constructive')}
            total={counts.constructive.total}
            tone="pos"
            rows={summaryRows(counts.constructive)}
          />
          <StatTile
            title={t('habits.summary.destructive')}
            total={counts.destructive.total}
            tone="neg"
            rows={summaryRows(counts.destructive)}
          />
        </section>
      )}

      {groupByDirectionAndTier(habits, (h) => ({
        direction: h.direction,
        tier: settingsOn(h, today()).tier,
      })).map((g) => (
        <section key={g.direction} className="stack">
          <h2>{DIRECTION_GROUP_LABEL[g.direction]}</h2>
          {g.tiers.map((tg) => (
            <div key={tg.tier} className="stack">
              <span className="habit-row-tier" style={{ color: TIER_COLOR[tg.tier] }}>
                <TierBars level={TIER_LEVEL[tg.tier]} size="sm" />
                <span className="muted">{TIER_GROUP_LABEL[tg.tier]}</span>
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
      <HabitDeleteDialog habit={deleting} onClose={() => setDeleting(undefined)} onDeleted={() => setDeleting(undefined)} />
    </section>
  )
}
