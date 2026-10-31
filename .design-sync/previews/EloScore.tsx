import { EloScore } from 'life-elo'

export const Positive = () => (
  <div style={{ width: 360 }}>
    <EloScore rating={42} caption="+6 за пт, 30 октября" streak={5} />
  </div>
)

export const Negative = () => (
  <div style={{ width: 360 }}>
    <EloScore rating={-8} caption="−3 за чт, 29 октября" />
  </div>
)

export const Start = () => (
  <div style={{ width: 360 }}>
    <EloScore rating={0} caption="Старт с нуля — подтвердите первый день" />
  </div>
)
