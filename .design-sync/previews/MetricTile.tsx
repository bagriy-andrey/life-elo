import { MetricTile, ProgressBar } from 'life-elo'

const svg = (d: string) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const Grid = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, width: 326 }}>{children}</div>
)
const Dot = ({ color }: { color: string }) => (
  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: `var(--${color})`, marginRight: 6 }} />
)

export const Sleep = () => (
  <Grid>
    <MetricTile
      href="#sleep"
      icon={svg('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z')}
      title="Сон"
      value="8 ч 16 мин"
      sub="00:30 → 08:48"
      footer={<><Dot color="pos" /><strong>93</strong> <span style={{ color: 'var(--pos)' }}>Отлично</span></>}
    />
  </Grid>
)

export const Steps = () => (
  <Grid>
    <MetricTile
      href="#activity"
      icon={svg('M4 16v-2.4C4 11.5 3 10.5 3 8c0-2.7 1.5-6 4.5-6C9.4 2 10 3.8 10 5.5c0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-4 0z')}
      title="Шаги"
      value="40"
      sub="из 11 400"
      footer={<><ProgressBar value={40} max={11400} label="Шаги" size="sm" /><span style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>день идёт</span></>}
    />
  </Grid>
)

export const Recovery = () => (
  <Grid>
    <MetricTile
      href="#recovery"
      icon={svg('M22 11v2')}
      title="Восстановление"
      value="98"
      unit="/ 100"
      sub="Body Battery · пульс покоя 46"
      footer={<><Dot color="neg" />HRV 55 <span style={{ color: 'var(--neg)' }}>ниже нормы</span></>}
    />
  </Grid>
)

export const Empty = () => (
  <Grid>
    <MetricTile href="#stress" icon={svg('M22 12h-4l-3 9L9 3l-3 9H2')} title="Тренировки и стресс" value="—" footer={<span style={{ color: 'var(--muted)' }}>Тренировок пока нет</span>} />
    <MetricTile href="#sleep" icon={svg('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z')} title="Сон" value="" loading loadingLabel="Загрузка…" />
  </Grid>
)
