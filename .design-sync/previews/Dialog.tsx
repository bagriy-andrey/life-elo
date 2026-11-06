import { Button, Dialog } from 'life-elo'

// Dialog's overlay is position: fixed; the transformed frame keeps it inside the card.
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: 'relative', width: 390, height: 380, transform: 'translateZ(0)', background: 'var(--bg)' }}>
    {children}
  </div>
)

export const DeleteConfirm = () => (
  <Frame>
    <Dialog open title="Удалить все данные?" onClose={() => {}}>
      <p className="dialog-body">
        Профиль, привычки, история дней и рейтинг будут удалены с устройства. Это действие нельзя отменить.
      </p>
      <div className="dialog-actions">
        <Button variant="danger">Удалить</Button>
        <Button autoFocus>Отмена</Button>
      </div>
    </Dialog>
  </Frame>
)
