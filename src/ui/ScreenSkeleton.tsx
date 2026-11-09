import { useI18n } from '../i18n'
import { Card, Skeleton } from './components'
import type { Tab } from './route'
import './ScreenSkeleton.css'

/** Placeholder layout of a tab while its data is still loading (first sync after sign-in, Dexie read). */
export function ScreenSkeleton({ tab }: { tab: Tab }) {
  const { t } = useI18n()
  return (
    <section className="stack skeleton-screen" aria-busy="true" aria-label={t('common.loading')}>
      {tab === 'home' && <HomeSkeleton />}
      {tab === 'review' && <ListSkeleton title={180} rows={4} tall />}
      {tab === 'habits' && <ListSkeleton title={110} rows={4} action />}
      {tab === 'profile' && <ProfileSkeleton />}
    </section>
  )
}

function HomeSkeleton() {
  return (
    <>
      <div className="skeleton-row skeleton-home-head">
        <div className="skeleton-col">
          <Skeleton width={70} height={14} />
          <Skeleton width={140} height={48} />
        </div>
        <Skeleton width={90} height={24} radius="full" />
      </div>
      <Card className="skeleton-col">
        <Skeleton width={110} height={20} />
        <Skeleton width={150} height={14} />
        <Skeleton height={180} />
        <div className="skeleton-row">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} width="auto" height={28} radius="full" className="skeleton-flex" />
          ))}
        </div>
      </Card>
      <Card className="skeleton-col">
        <Skeleton width="40%" height={16} />
        <Skeleton width="70%" height={14} />
      </Card>
    </>
  )
}

function ListSkeleton({ title, rows, action, tall }: { title: number; rows: number; action?: boolean; tall?: boolean }) {
  return (
    <>
      <div className="skeleton-row skeleton-head">
        <Skeleton width={title} height={22} />
        <Skeleton width={action ? 112 : 130} height={44} />
      </div>
      <Skeleton width={120} height={14} />
      {Array.from({ length: rows }, (_, i) => (
        <Card key={i} className="skeleton-row">
          <div className="skeleton-col skeleton-grow">
            <Skeleton width={`${70 - i * 8}%`} height={16} />
            <Skeleton width="45%" height={12} />
          </div>
          {tall && <Skeleton width={96} height={36} />}
        </Card>
      ))}
    </>
  )
}

function ProfileSkeleton() {
  return (
    <>
      <div className="skeleton-row skeleton-head">
        <Skeleton width={100} height={22} />
        <Skeleton width={120} height={44} />
      </div>
      <div className="skeleton-col skeleton-center">
        <Skeleton width={88} height={88} radius="full" />
        <Skeleton width={140} height={20} />
        <Skeleton width={100} height={14} />
      </div>
      {[3, 2].map((n, i) => (
        <Card key={i} className="skeleton-col">
          {Array.from({ length: n }, (_, j) => (
            <div key={j} className="skeleton-row">
              <Skeleton width="35%" height={14} />
              <Skeleton width="25%" height={14} />
            </div>
          ))}
        </Card>
      ))}
    </>
  )
}
