import { WeekChart } from 'life-elo'

const wd = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const Box = ({ children }: { children: React.ReactNode }) => <div style={{ width: 326 }}>{children}</div>
const noop = () => {}

export const FullWeek = () => (
  <Box>
    <WeekChart
      stepsGoal={11400}
      goalLabel="11,4к"
      stepsCaption="Шаги · пунктир — цель 11 400"
      sleepCaption="Сон · когда уснул и проснулся"
      onSelect={noop}
      days={[
        { steps: 7200, sleep: { startFrac: 0.15, endFrac: 0.78 } },
        { steps: 9100, sleep: { startFrac: 0.02, endFrac: 0.7 } },
        { steps: 12800, sleep: { startFrac: 0.1, endFrac: 0.72 } },
        { steps: 9800, sleep: { startFrac: 0.1, endFrac: 0.6 } },
        { steps: 11711, sleep: { startFrac: 0.2, endFrac: 0.82 }, stepsText: '11,7к' },
        { steps: 6000, sleep: { startFrac: 0.3, endFrac: 0.9 } },
        { steps: 8000, sleep: { startFrac: 0.2, endFrac: 1.2 } },
      ].map((d, i) => ({
        ...d,
        key: `2026-11-0${3 + i}`,
        weekdayLabel: wd[i],
        dayNum: 3 + i,
        state: i === 4 ? ('selected' as const) : ('past' as const),
        ariaLabel: `${wd[i]} ${3 + i}: ${d.steps} шагов`,
      }))}
    />
  </Box>
)

export const PartialWeek = () => (
  <Box>
    <WeekChart
      stepsGoal={11400}
      goalLabel="11,4к"
      stepsCaption="Шаги · пунктир — цель 11 400"
      sleepCaption="Сон · когда уснул и проснулся"
      onSelect={noop}
      days={[
        { steps: 7200, sleep: { startFrac: 0.15, endFrac: 0.78 }, state: 'past' },
        { state: 'past' },
        { steps: 0, state: 'past' },
        { steps: 9800, state: 'past' },
        { steps: 40, sleep: { startFrac: 0.2, endFrac: 0.82 }, state: 'selected', stepsText: '40' },
        { state: 'future' },
        { state: 'future' },
      ].map((d, i) => ({
        ...d,
        key: `2026-11-1${i}`,
        weekdayLabel: wd[i],
        dayNum: 9 + i,
        ariaLabel: `${wd[i]} ${9 + i}`,
      }))}
    />
  </Box>
)
