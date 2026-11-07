import { useI18n } from '../../i18n'

/** Translated label props for `PasswordField` (the component itself holds no text). */
export function usePasswordLabels() {
  const { t } = useI18n()
  return {
    showLabel: t('password.show'),
    hideLabel: t('password.hide'),
    strengthLabels: [t('password.weak'), t('password.fair'), t('password.strong')] as const,
  }
}
