import { useState } from 'react'
import type { Habit } from '../domain/types'
import { useI18n } from '../i18n'
import { Button, Dialog } from './components'
import { removeHabit } from './habitActions'

interface Props {
  /** Habit to delete; `undefined` keeps the dialog closed. */
  habit: Habit | undefined
  onClose: () => void
  onDeleted: () => void
}

export function HabitDeleteDialog({ habit, onClose, onDeleted }: Props) {
  const { t } = useI18n()
  const [blockedBy, setBlockedBy] = useState<string>()

  const close = () => {
    setBlockedBy(undefined)
    onClose()
  }

  const confirm = async () => {
    if (!habit) return
    const res = await removeHabit(habit)
    if (res.ok) {
      setBlockedBy(undefined)
      onDeleted()
    } else {
      setBlockedBy(res.names)
    }
  }

  return (
    <Dialog open={!!habit} title={habit ? t('habit.delete.title', { name: habit.name }) : ''} onClose={close}>
      <p className="dialog-body">{t('habit.delete.text')}</p>
      {blockedBy && <p className="field-error">{t('habitError.deleteInUse', { names: blockedBy })}</p>}
      <div className="dialog-actions dialog-actions--row">
        <Button autoFocus onClick={close}>
          {t('common.cancel')}
        </Button>
        <Button variant="danger" onClick={confirm}>
          {t('habit.delete.confirm')}
        </Button>
      </div>
    </Dialog>
  )
}
