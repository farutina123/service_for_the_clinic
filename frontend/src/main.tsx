import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './index.css'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (typeof sentryDsn === 'string' && sentryDsn.length > 0) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.PROD ? 'production' : 'development',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Произошла ошибка. Попробуйте обновить страницу.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
