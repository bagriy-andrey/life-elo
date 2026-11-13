import { RangeScale } from 'life-elo'

const Box = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 326 }}>{children}</div>
)

export const BelowNorm = () => (
  <Box>
    <RangeScale min={34} max={82} value={55} corridor={{ low: 56, high: 64 }} tone="neg" lowLabel="34" highLabel="82" corridorLabel="норма 56–64" />
  </Box>
)

export const InNorm = () => (
  <Box>
    <RangeScale min={34} max={82} value={60} corridor={{ low: 56, high: 64 }} tone="pos" lowLabel="34" highLabel="82" corridorLabel="норма 56–64" />
  </Box>
)

export const NoCorridor = () => (
  <Box>
    <RangeScale min={34} max={82} value={55} tone="accent" lowLabel="34" highLabel="82" />
  </Box>
)
