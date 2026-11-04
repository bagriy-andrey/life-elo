import { Button, Dialog } from 'life-elo'

export const DeleteConfirm = () => (
  <Dialog open title="Удалить все данные?" onClose={() => {}}>
    <p className="dialog-body">Профиль, привычки, история и рейтинг будут удалены без возможности восстановления.</p>
    <div className="dialog-actions">
      <Button variant="danger">Удалить</Button>
      <Button autoFocus>Отмена</Button>
    </div>
  </Dialog>
)
