import { QuotaDots } from 'life-elo'

export const Unused = () => <div style={{ width: 360 }}><QuotaDots used={0} limit={3} note="Использовано 0 из 3" /></div>
export const PartlyUsed = () => <div style={{ width: 360 }}><QuotaDots used={1} limit={2} note="Использовано 1 из 2" /></div>
export const Exhausted = () => <div style={{ width: 360 }}><QuotaDots used={2} limit={2} note="Лимит исчерпан: ответ «Было» его превысит" /></div>
