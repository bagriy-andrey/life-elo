import { BottomSheet, Button } from 'life-elo'

// BottomSheet is position: fixed; the transformed frame keeps it inside the card.
const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: 'relative', width: 390, height: 480, transform: 'translateZ(0)', background: 'var(--bg)' }}>
    {children}
  </div>
)

export const WithFooter = () => (
  <Frame>
    <BottomSheet
      open
      title="Новая привычка"
      closeLabel="Закрыть"
      onClose={() => {}}
      footer={<Button variant="primary">Сохранить</Button>}
    >
      <p style={{ margin: 0 }}>Содержимое формы прокручивается, а кнопка внизу остаётся на месте.</p>
    </BottomSheet>
  </Frame>
)
