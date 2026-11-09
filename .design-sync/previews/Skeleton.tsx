import { Card, Skeleton } from 'life-elo'

export const Shapes = () => (
  <div className="stack">
    <Skeleton width={140} height={14} />
    <Skeleton width="60%" height={20} />
    <Skeleton height={48} />
    <div className="row" style={{ justifyContent: 'flex-start' }}>
      <Skeleton width={48} height={48} radius="full" />
      <Skeleton width={90} height={24} radius="full" />
    </div>
  </div>
)

export const HabitCardLoading = () => (
  <div className="stack">
    {[0, 1, 2].map((i) => (
      <Card key={i}>
        <div className="row" style={{ justifyContent: 'flex-start', gap: 12 }}>
          <Skeleton width={10} height={10} radius="full" />
          <div className="stack" style={{ flex: 1, gap: 6 }}>
            <Skeleton width="55%" height={16} />
            <Skeleton width="80%" height={12} />
          </div>
        </div>
      </Card>
    ))}
  </div>
)

export const ScoreLoading = () => (
  <Card>
    <div className="stack" style={{ gap: 8 }}>
      <Skeleton width={70} height={14} />
      <Skeleton width={140} height={48} />
      <Skeleton height={120} />
    </div>
  </Card>
)
