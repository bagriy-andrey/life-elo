import { useState } from 'react'
import { PasswordField } from 'life-elo'

export const Hidden = () => (
  <div style={{ width: 360 }}>
    <PasswordField label="Пароль" visible={false} onToggleVisible={() => {}} defaultValue="secret123" />
  </div>
)

export const Interactive = () => {
  const [visible, setVisible] = useState(true)
  return (
    <div style={{ width: 360 }}>
      <PasswordField label="Пароль" visible={visible} onToggleVisible={() => setVisible(v => !v)} defaultValue="secret123" strength={2} />
    </div>
  )
}

export const Weak = () => (
  <div style={{ width: 360 }}>
    <PasswordField label="Пароль" visible={false} onToggleVisible={() => {}} defaultValue="abc" strength={1} />
  </div>
)

export const Strong = () => (
  <div style={{ width: 360 }}>
    <PasswordField label="Пароль" visible={false} onToggleVisible={() => {}} defaultValue="Xk9!mQ2#vLp4" strength={3} />
  </div>
)

export const WithError = () => (
  <div style={{ width: 360 }}>
    <PasswordField label="Повторите пароль" visible={false} onToggleVisible={() => {}} defaultValue="abc" strength={1} error="Пароли не совпадают" />
  </div>
)
