import { Banner } from 'life-elo'

export const PendingReview = () => (
  <div style={{ width: 360 }}>
    <Banner title="Как прошёл вчерашний день?" subtitle="пт, 30 октября ждёт подтверждения →" onClick={() => {}} />
  </div>
)

export const TitleOnly = () => (
  <div style={{ width: 360 }}>
    <Banner title="Добавьте первую привычку" onClick={() => {}} />
  </div>
)
