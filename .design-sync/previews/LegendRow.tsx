import { LegendRow } from 'life-elo'

const List = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 300 }}>{children}</div>
)

export const SleepStages = () => (
  <List>
    <LegendRow color="tier-weak" name="Глубокий" value="1 ч 25 мин" percent="17%" />
    <LegendRow color="tier-medium" name="Лёгкий" value="4 ч 22 мин" percent="53%" />
    <LegendRow color="tier-strong" name="REM" value="2 ч 30 мин" percent="30%" />
    <LegendRow color="muted" name="Бодрствование" value="1 мин" percent="0%" />
  </List>
)

export const StressLevels = () => (
  <List>
    <LegendRow color="tier-weak" name="Покой" value="9 ч 13 мин" percent="96%" />
    <LegendRow color="pos" name="Активность" value="5 мин" percent="1%" />
    <LegendRow color="warn" name="Средний стресс" value="2 мин" percent="0%" />
    <LegendRow color="neg" name="Высокий стресс" value="14 мин" percent="1%" />
  </List>
)
