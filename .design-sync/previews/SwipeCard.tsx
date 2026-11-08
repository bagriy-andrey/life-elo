import { QuotaDots, SwipeCard } from 'life-elo'

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: 380, height: 520, display: 'flex', flexDirection: 'column' }}>{children}</div>
)

export const Constructive = () => (
  <Frame>
    <SwipeCard
      typeLabel="Привычка"
      title="Чтение"
      question="Сделали вчера?"
      goodLabel="Сделал"
      badLabel="Не сделал"
      hint="Свайп вправо — сделал, влево — не сделал"
      notApplicableLabel="Не применимо"
      onAnswer={() => {}}
      peek
    />
  </Frame>
)

export const QuotaLimit = () => (
  <Frame>
    <SwipeCard
      typeLabel="Ограничение с лимитом"
      title="Сладкое"
      question="Удержались вчера?"
      goodLabel="Удержался"
      badLabel="Было"
      hint="Свайп вправо — удержался, влево — было"
      notApplicableLabel="Не применимо"
      onAnswer={() => {}}
    >
      <QuotaDots used={2} limit={2} note="Лимит исчерпан: ответ «Было» его превысит" />
    </SwipeCard>
  </Frame>
)
