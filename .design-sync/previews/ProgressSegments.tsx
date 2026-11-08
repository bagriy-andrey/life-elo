import { ProgressSegments } from 'life-elo'

export const Start = () => <div style={{ width: 360 }}><ProgressSegments total={7} current={0} counterLabel="1 из 7" /></div>
export const Middle = () => <div style={{ width: 360 }}><ProgressSegments total={7} current={3} counterLabel="4 из 7" /></div>
export const LastCard = () => <div style={{ width: 360 }}><ProgressSegments total={7} current={6} counterLabel="7 из 7" /></div>
