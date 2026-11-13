import { ProgressBar } from 'life-elo'

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 280 }}>{children}</div>
)

export const Steps = () => (
  <Row>
    <span>11 711 из 11 400</span>
    <ProgressBar value={11711} max={11400} tone="pos" label="Шаги" />
  </Row>
)

export const InProgress = () => (
  <Row>
    <span>40 из 11 400</span>
    <ProgressBar value={40} max={11400} label="Шаги" />
  </Row>
)

export const SmallWarn = () => (
  <Row>
    <span>90 из 150 минут</span>
    <ProgressBar value={90} max={150} tone="warn" size="sm" label="Интенсивные минуты" />
  </Row>
)
