import type { ReactNode } from 'react'

const svg = (children: ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

export const MoonIcon = () => svg(<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />)
export const FootprintsIcon = () =>
  svg(
    <>
      <path d="M4 16v-2.4C4 11.5 3 10.5 3 8c0-2.7 1.5-6 4.5-6C9.4 2 10 3.8 10 5.5c0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-4 0z" />
      <path d="M20 20v-2.4c0-2.1 1-3.1 1-5.6 0-2.7-1.5-6-4.5-6C14.6 6 14 7.8 14 9.5c0 3.1 2 5.7 2 8.7V20a2 2 0 1 0 4 0z" />
    </>,
  )
export const BatteryIcon = () =>
  svg(
    <>
      <rect x="2" y="7" width="16" height="10" rx="2" />
      <path d="M22 11v2" />
      <path d="M6 11v2" />
      <path d="M10 11v2" />
    </>,
  )
export const ActivityIcon = () => svg(<path d="M22 12h-4l-3 9L9 3l-3 9H2" />)
export const WatchIcon = () =>
  svg(
    <>
      <circle cx="12" cy="12" r="6" />
      <path d="M12 9v3l1.5 1.5M9 6l.5-3h5l.5 3M9 18l.5 3h5l.5-3" />
    </>,
  )
