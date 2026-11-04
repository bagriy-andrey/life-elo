import { TextField } from 'life-elo'

export const Default = () => (
  <div style={{ width: 360 }}>
    <TextField label="Email" type="email" placeholder="you@example.com" autoComplete="email" />
  </div>
)

export const WithError = () => (
  <div style={{ width: 360 }}>
    <TextField label="Email" type="email" defaultValue="oops" error="Введите корректный email" />
  </div>
)

export const WithTrailing = () => (
  <div style={{ width: 360 }}>
    <TextField label="Пароль" type="password" defaultValue="secret123" trailing={<button type="button">Показать</button>} />
  </div>
)
