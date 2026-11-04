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

export const Danger = () => <Button variant="danger">Удалить</Button>

export const Quiet = () => (
  <div className="stack-sm" style={{ width: 280 }}>
    <Button variant="quiet">Добавить фото</Button>
    <Button variant="quiet" className="neg">
      Очистить все данные
    </Button>
  </div>
)
