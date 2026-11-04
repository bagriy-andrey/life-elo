import { describe, expect, it } from 'vitest'
import { EMAIL_RE, newPwErr, strength, validate } from './validation'

describe('EMAIL_RE', () => {
  it('accepts and rejects', () => {
    expect(EMAIL_RE.test('a@b.co')).toBe(true)
    expect(EMAIL_RE.test('a@b.c')).toBe(false)
    expect(EMAIL_RE.test('a b@c.com')).toBe(false)
    expect(EMAIL_RE.test('abc')).toBe(false)
  })
})

describe('strength', () => {
  it('scores', () => {
    expect(strength('')).toBe(0)
    expect(strength('abc')).toBe(0)
    expect(strength('abcdefgh')).toBe(1)
    expect(strength('abcdefg1')).toBe(2)
    expect(strength('абвгдеж1!')).toBe(3)
    expect(strength('abcdefghijkl')).toBe(2)
    expect(strength('abcdefgh1234')).toBe(3)
  })
})

describe('newPwErr', () => {
  it('messages', () => {
    expect(newPwErr('')).toBe('Введите пароль')
    expect(newPwErr('abc1')).toBe('Минимум 8 символов')
    expect(newPwErr('abcdefgh')).toBe('Добавьте хотя бы одну букву и цифру')
    expect(newPwErr('12345678')).toBe('Добавьте хотя бы одну букву и цифру')
    expect(newPwErr('abcdefg1')).toBe('')
  })
})

describe('validate', () => {
  it('login', () => {
    expect(validate('login', {})).toEqual({ email: 'Введите почту', password: 'Введите пароль' })
    expect(validate('login', { email: 'x', password: 'p' })).toEqual({ email: 'Похоже, в адресе ошибка' })
    expect(validate('login', { email: 'a@b.co', password: 'p' })).toEqual({})
  })
  it('forgot checks only email', () => {
    expect(validate('forgot', { email: '' })).toEqual({ email: 'Введите почту' })
    expect(validate('forgot', { email: 'a@b.co' })).toEqual({})
  })
  it('register', () => {
    expect(validate('register', {})).toEqual({
      email: 'Введите почту',
      name: 'Введите имя',
      password: 'Введите пароль',
      confirm: 'Повторите пароль',
    })
    const ok = { name: 'A', email: 'a@b.co', password: 'abcdefg1', confirm: 'abcdefg1' }
    expect(validate('register', ok)).toEqual({})
    expect(validate('register', { ...ok, confirm: 'zzz' })).toEqual({ confirm: 'Пароли не совпадают' })
    expect(validate('register', { ...ok, password: 'abc' }).password).toBe('Минимум 8 символов')
  })
  it('recovery ignores email, name, current', () => {
    expect(validate('recovery', { password: 'abcdefg1', confirm: 'abcdefg1' })).toEqual({})
    expect(validate('recovery', {})).toEqual({ password: 'Введите пароль', confirm: 'Повторите пароль' })
  })
  it('change', () => {
    const f = { password: 'abcdefg1', confirm: 'abcdefg1', current: 'old' }
    expect(validate('change', f)).toEqual({})
    expect(validate('change', { ...f, current: '' })).toEqual({ current: 'Введите текущий пароль' })
    expect(validate('change', { ...f, current: 'abcdefg1' })).toEqual({
      password: 'Новый пароль совпадает с текущим',
    })
  })
  it('change googleOnly skips current checks', () => {
    expect(validate('change', { password: 'abcdefg1', confirm: 'abcdefg1' }, true)).toEqual({})
    expect(validate('change', { password: 'abcdefg1', confirm: 'abcdefg1', current: 'abcdefg1' }, true)).toEqual({})
  })
})
