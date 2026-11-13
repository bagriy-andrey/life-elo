import { LegendRow, SegmentBar } from 'life-elo'

const Box = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 300 }}>{children}</div>
)

export const SleepPhases = () => (
  <Box>
    <SegmentBar
      segments={[
        { key: 'deep', label: 'Глубокий', value: 85, color: 'tier-weak' },
        { key: 'light', label: 'Лёгкий', value: 262, color: 'tier-medium' },
        { key: 'rem', label: 'REM', value: 150, color: 'tier-strong' },
        { key: 'awake', label: 'Бодрствование', value: 1, color: 'muted' },
      ]}
    />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <LegendRow color="tier-weak" name="Глубокий" value="1 ч 25 мин" percent="17%" />
      <LegendRow color="tier-medium" name="Лёгкий" value="4 ч 22 мин" percent="53%" />
      <LegendRow color="tier-strong" name="REM" value="2 ч 30 мин" percent="30%" />
      <LegendRow color="muted" name="Бодрствование" value="1 мин" percent="0%" />
    </div>
  </Box>
)

export const Stress = () => (
  <Box>
    <SegmentBar
      segments={[
        { key: 'rest', label: 'Покой', value: 553, color: 'tier-weak' },
        { key: 'activity', label: 'Активность', value: 5, color: 'pos' },
        { key: 'low', label: 'Низкий', value: 13, color: 'tier-strong' },
        { key: 'medium', label: 'Средний', value: 2, color: 'warn' },
      ]}
    />
    <LegendRow color="tier-weak" name="Покой" value="9 ч 13 мин" percent="96%" />
    <LegendRow color="warn" name="Средний стресс" value="2 мин" percent="0%" />
  </Box>
)
