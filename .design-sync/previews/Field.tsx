import { Field } from 'life-elo'

const box = { width: 320 }

export const Default = () => (
  <div style={box}>
    <Field label="Почта">
      <input type="email" placeholder="you@example.com" />
    </Field>
  </div>
)

export const RequiredWithPrefixAndHint = () => (
  <div className="stack" style={box}>
    <Field label="Имя" required>
      <input defaultValue="Андрей" />
    </Field>
    <Field label="Ник" prefix="@" hint="Латиница, цифры и _">
      <input placeholder="nick" />
    </Field>
  </div>
)

export const WithError = () => (
  <div style={box}>
    <Field label="Имя" required error="Введите имя">
      <input />
    </Field>
  </div>
)
