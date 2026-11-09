import { Button, Spinner } from 'life-elo'

export const Sizes = () => (
  <div className="row" style={{ justifyContent: 'flex-start', gap: 24 }}>
    <Spinner size={14} />
    <Spinner />
    <Spinner size={28} />
    <Spinner size={40} label="Загрузка" />
  </div>
)

export const Colored = () => (
  <div className="row" style={{ justifyContent: 'flex-start', gap: 24 }}>
    <span style={{ color: 'var(--accent)' }}><Spinner size={24} /></span>
    <span style={{ color: 'var(--pos)' }}><Spinner size={24} /></span>
    <span style={{ color: 'var(--muted)' }}><Spinner size={24} /></span>
  </div>
)

export const InlineStatus = () => (
  <div className="row" style={{ justifyContent: 'flex-start', gap: 8 }}>
    <Spinner size={16} label="Синхронизация" />
    <span className="muted">Синхронизация…</span>
  </div>
)

export const InButton = () => (
  <Button variant="primary" loading>
    Сохранить
  </Button>
)
