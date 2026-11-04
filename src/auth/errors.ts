export interface AuthErrorLike {
  code?: string
  status?: number
  name?: string
  message?: string
}

export const AUTH_FALLBACK_TEXT = 'Что-то пошло не так. Попробуйте ещё раз.'
const RATE = 'Слишком часто. Подождите минуту и попробуйте снова.'
const EXPIRED = 'Ссылка устарела или уже использована. Запросите новую.'
const OFFLINE = 'Нет соединения. Проверьте интернет и попробуйте снова.'

export function authErrorText(error: AuthErrorLike | null | undefined): string {
  if (!error) return AUTH_FALLBACK_TEXT
  switch (error.code) {
    case 'invalid_credentials':
      return 'Неверная почта или пароль'
    case 'user_already_exists':
    case 'email_exists':
      return 'Аккаунт с этой почтой уже есть. Войдите или восстановите пароль.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return RATE
    case 'otp_expired':
    case 'bad_jwt':
    case 'flow_state_expired':
    case 'flow_state_not_found':
      return EXPIRED
    case 'weak_password':
      return 'Пароль слишком простой'
    case 'same_password':
      return 'Новый пароль совпадает с текущим'
  }
  if (error.status === 429) return RATE
  if (/invalid.*token|token.*(expired|invalid)/i.test(error.message ?? '')) return EXPIRED
  if (
    error.status === undefined ||
    error.status === 0 ||
    (error.name === 'TypeError' && /fetch/i.test(error.message ?? ''))
  ) {
    // No HTTP status: request never reached the server.
    if (!error.code) return OFFLINE
  }
  return AUTH_FALLBACK_TEXT
}
