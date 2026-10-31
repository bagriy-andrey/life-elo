import { Button } from 'life-elo'

export const Primary = () => <Button variant="primary">Подтвердить день</Button>

export const Default = () => <Button>Пауза</Button>

export const Disabled = () => (
  <Button variant="primary" disabled>
    Добавить
  </Button>
)

export const Pair = () => (
  <div className="stack-sm" style={{ width: 280 }}>
    <Button variant="primary">Сохранить исправление</Button>
    <Button>Вернуть</Button>
  </div>
)
