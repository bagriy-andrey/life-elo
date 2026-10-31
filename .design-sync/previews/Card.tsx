import { Button, Card } from 'life-elo'

export const HabitRow = () => (
  <Card className="row" style={{ width: 340 }}>
    <div className="stack-sm">
      <strong>Без сладкого</strong>
      <span className="muted">Нежелательная · Средняя</span>
    </div>
    <Button>Пауза</Button>
  </Card>
)

export const Inactive = () => (
  <Card className="row" inactive style={{ width: 340 }}>
    <div className="stack-sm">
      <strong>Пробежка 5 км</strong>
      <span className="muted">Конструктивная · Сильная</span>
    </div>
    <Button>Вернуть</Button>
  </Card>
)

export const Stacked = () => (
  <Card className="stack-sm" style={{ width: 340 }}>
    <strong>Сон до 23:30</strong>
    <span className="muted">Без ответа — «не помню», это не влияет на рейтинг.</span>
  </Card>
)
