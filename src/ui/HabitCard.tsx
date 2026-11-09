import type { KeyboardEvent } from 'react'
import type { Habit } from '../domain/types'
import { useI18n } from '../i18n'
import { Card, Menu } from './components'
import type { MenuItem } from './components/Menu'
import './HabitCard.css'

interface Props {
  habit: Habit
  /** Meta line under the name (see `habitMeta`). */
  meta: string
  onOpen: () => void
  onEdit: () => void
  onTogglePause: () => void
  onDelete: () => void
}

/** Habit list row: the whole card opens the habit page; the ⋮ menu holds the other actions. */
export function HabitCard({ habit, meta, onOpen, onEdit, onTogglePause, onDelete }: Props) {
  const { t } = useI18n()
  const items: MenuItem[] = [
    { id: 'info', label: t('habit.menu.info') },
    { id: 'edit', label: t('habit.menu.edit') },
    { id: 'pause', label: t(habit.active ? 'habit.menu.pause' : 'habit.menu.resume') },
    { id: 'delete', label: t('habit.menu.delete'), tone: 'danger', separatorBefore: true },
  ]
  const actions: Record<string, () => void> = { info: onOpen, edit: onEdit, pause: onTogglePause, delete: onDelete }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <Card className="habit-row" role="button" tabIndex={0} onClick={onOpen} onKeyDown={onKeyDown}>
      <div className={habit.active ? 'habit-row-content' : 'habit-row-content paused'}>
        <span className={habit.direction === 'destructive' ? 'habit-row-dot neg' : 'habit-row-dot'} aria-hidden="true" />
        <span className="habit-row-text">
          <span className="habit-row-name">
            <strong>{habit.name}</strong>
            {!habit.active && <span className="habit-row-badge">{t('habit.badge.paused')}</span>}
          </span>
          <span className="habit-row-meta">{meta}</span>
        </span>
      </div>
      <Menu items={items} triggerLabel={t('habit.menu.aria')} onSelect={(id) => actions[id]?.()} />
    </Card>
  )
}
