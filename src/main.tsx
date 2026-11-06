import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './auth/AuthProvider.tsx'
import App from './App.tsx'
import { I18nProvider } from './i18n'
import { loadPrefs } from './i18n/prefs'
import { applyTheme } from './ui/prefs'

applyTheme(loadPrefs().theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
)
