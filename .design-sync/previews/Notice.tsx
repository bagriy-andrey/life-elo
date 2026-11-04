import { Notice } from 'life-elo'

export const Success = () => (
  <div style={{ width: 360 }}>
    <Notice tone="success">Письмо отправлено. Проверьте почту.</Notice>
  </div>
)

export const Error = () => (
  <div style={{ width: 360 }}>
    <Notice tone="error">Неверный email или пароль.</Notice>
  </div>
)
