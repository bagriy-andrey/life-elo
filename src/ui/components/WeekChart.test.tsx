import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WeekChart, type WeekChartDay } from './WeekChart'
import {
  colCenter, gutterLabelX, PLOT_PCT, sleepStrip, SLEEP_BOTTOM, SLEEP_TOP, STEPS_BASE, stepsBar, stepsScale, VB_W,
} from './weekChartMath'

const states: WeekChartDay['state'][] = ['past', 'past', 'past', 'today', 'selected', 'future', 'future']
const days: WeekChartDay[] = states.map((state, i) => ({
  key: `d${i}`,
  weekdayLabel: 'пн',
  dayNum: i + 1,
  steps: state === 'future' ? undefined : 5000 * (i + 1),
  sleep: state === 'future' ? undefined : { startFrac: 0.1, endFrac: 0.7 },
  state,
  ariaLabel: `day ${i}: words`,
  stepsText: '40',
}))
const render = (d = days, goal: number | null = 11400) =>
  renderToString(<WeekChart days={d} stepsGoal={goal ?? undefined} goalLabel="11,4к" stepsCaption="s" sleepCaption="z" onSelect={() => {}} />)

describe('WeekChart', () => {
  it('selected day is styled and marked; future buttons are disabled', () => {
    const html = render()
    expect(html).toContain('wchart-day-selected')
    expect(html).toContain('wchart-bar-selected')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-current="true"')
    expect(html).toContain('aria-current="date"')
    expect((html.match(/<button[^>]*disabled/g) ?? []).length).toBe(2)
    expect((html.match(/<button/g) ?? []).length).toBe(7)
    expect(html).toContain('aria-label="day 0: words"')
  })
  it('svgs are aria-hidden and scale with the container', () => {
    const html = render()
    expect((html.match(/<svg[^>]*aria-hidden="true"/g) ?? []).length).toBe(2)
    expect(html).not.toMatch(/<svg[^>]*\swidth=/)
    expect(html).toContain(`width:${PLOT_PCT}%`)
  })
  it('all text and shapes stay inside the viewBox', () => {
    const html = render()
    const xs = [...html.matchAll(/<text[^>]*\sx="([\d.]+)"/g)].map((m) => Number(m[1]))
    expect(xs.length).toBeGreaterThan(5)
    for (const x of xs) expect(x).toBeGreaterThanOrEqual(0)
    // start-anchored labels must also have room for their text (~6 units per char)
    for (const t of ['22:00', '00:00', '06:00', '10:00', '11,4к']) expect(gutterLabelX(t) + t.length * 6).toBeLessThanOrEqual(VB_W)
    expect(gutterLabelX('very long label')).toBe(VB_W - 15 * 6)
    expect(gutterLabelX('x'.repeat(80))).toBe(0)
    for (const m of html.matchAll(/<rect[^>]*\sx="([\d.]+)"[^>]*width="([\d.]+)"/g)) {
      expect(Number(m[1])).toBeGreaterThanOrEqual(0)
      expect(Number(m[1]) + Number(m[2])).toBeLessThanOrEqual(VB_W)
    }
    expect(colCenter(0)).toBeGreaterThan(10)
  })
  it('zero/missing steps draw no bar and never NaN', () => {
    const empty = days.map((d) => ({ ...d, steps: d.key === 'd1' ? 0 : undefined, sleep: undefined }))
    const html = render(empty, null)
    expect(html).not.toContain('NaN')
    expect(html).not.toContain('Infinity')
    expect(html).not.toContain('wchart-goal')
    expect(html).not.toContain('<rect')
    expect(stepsBar(0, 1)).toBeNull()
    expect(stepsBar(NaN, 1)).toBeNull()
    expect(stepsScale([], undefined)).toBe(1)
    const tiny = stepsBar(40, 11400)
    expect(tiny?.height).toBe(3)
    expect((tiny?.y ?? 0) + (tiny?.height ?? 0)).toBe(STEPS_BASE)
  })
  it('sleep strips are clamped to the 22:00-10:00 axis', () => {
    const s = sleepStrip({ startFrac: -0.4, endFrac: 1.6 })
    expect(s).toEqual({ y: SLEEP_TOP, height: SLEEP_BOTTOM - SLEEP_TOP })
    expect(sleepStrip({ startFrac: 0.5, endFrac: 0.5 })).toBeNull()
    expect(sleepStrip({ startFrac: NaN, endFrac: 0.5 })).toBeNull()
    expect(sleepStrip(undefined)).toBeNull()
  })
})
