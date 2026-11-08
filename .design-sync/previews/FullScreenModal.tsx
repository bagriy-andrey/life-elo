import { Button, FullScreenModal, ProgressSegments } from 'life-elo'

// FullScreenModal is position: fixed; the transformed frame keeps it inside the card.
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: 'relative', width: 390, height: 400, transform: 'translateZ(0)', background: 'var(--bg)' }}>
    {children}
  </div>
)

export const YesterdayReviewShell = () => (
  <Frame>
    <FullScreenModal label="Отметьте вчерашний день">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
        <span className="muted">Вчера, суббота, 7 ноября</span>
        <h2 style={{ margin: 0 }}>Отметьте вчерашний день</h2>
        <p style={{ margin: 0 }}>Осталось 9 ч 12 мин. Потом день закроется: серии прервутся, рейтинг снизится.</p>
        <ProgressSegments total={6} current={2} counterLabel="3 из 6" />
        <Button variant="primary">Продолжить</Button>
      </div>
    </FullScreenModal>
  </Frame>
)
