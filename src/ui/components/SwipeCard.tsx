import { useCallback, useEffect, useRef, type PointerEvent, type ReactNode } from 'react'
import { Button } from './Button'
import { swipeDecision, type SwipeDirection } from './swipe'
import './SwipeCard.css'

export type SwipeAnswer = SwipeDirection | 'not_applicable'

interface Props {
  /** Small uppercase caption on the card, e.g. "Привычка". */
  typeLabel: string;
  /** Big card title (habit name). */
  title: string;
  /** Question under the title, e.g. "Сделали вчера?". */
  question: string;
  /** Right / ✓ answer text, e.g. "Сделал" (the component has no built-in language). */
  goodLabel: string;
  /** Left / ✕ answer text, e.g. "Не сделал". */
  badLabel: string;
  /** Muted line at the card bottom, e.g. "Свайп вправо — сделал, влево — не сделал". */
  hint: string;
  /** Text of the quiet "not applicable" button; the button is hidden when omitted. */
  notApplicableLabel?: string;
  /** Called once per card with the chosen answer (after the fly-off animation). */
  onAnswer: (answer: SwipeAnswer) => void;
  /** Extra card content under the title (e.g. a QuotaDots block). */
  children?: ReactNode;
  /** Shows a card-shaped peek behind, for "next card exists". */
  peek?: boolean;
}

const FLY_DISTANCE = 640
const FLY_MS = 220

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Yes/no card: drag (or ←/→, or the buttons) answers. Remount with a new `key` per card. */
export function SwipeCard({
  typeLabel, title, question, goodLabel, badLabel, hint, notApplicableLabel, onAnswer, children, peek,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const goodRef = useRef<HTMLSpanElement>(null)
  const badRef = useRef<HTMLSpanElement>(null)
  const drag = useRef<{ id: number; x0: number; t: number; lastX: number; lastT: number; v: number } | null>(null)
  const done = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const answerRef = useRef(onAnswer)
  useEffect(() => { answerRef.current = onAnswer })

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const paint = useCallback((dx: number) => {
    const card = cardRef.current
    if (card) card.style.transform = dx === 0 ? '' : `translateX(${dx}px) rotate(${dx / 22}deg)`
    const o = Math.min(1, Math.abs(dx) / 90)
    if (goodRef.current) goodRef.current.style.opacity = String(dx > 0 ? o : 0)
    if (badRef.current) badRef.current.style.opacity = String(dx < 0 ? o : 0)
  }, [])

  const commit = useCallback((answer: SwipeAnswer, animateDir?: SwipeDirection) => {
    if (done.current) return
    done.current = true
    const card = cardRef.current
    if (animateDir && card && !reducedMotion()) {
      const sign = animateDir === 'good' ? 1 : -1
      card.style.transition = `transform ${FLY_MS}ms ease-out`
      paint(sign * FLY_DISTANCE)
      timer.current = window.setTimeout(() => answerRef.current(answer), FLY_MS)
    } else {
      answerRef.current(answer)
    }
  }, [paint])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.key === 'ArrowRight') { e.preventDefault(); commit('good', 'good') }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); commit('bad', 'bad') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commit])

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (done.current || (e.pointerType === 'mouse' && e.button !== 0)) return
    // Interactive children keep their own clicks.
    if ((e.target as HTMLElement).closest('button, input, a, select, textarea')) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { id: e.pointerId, x0: e.clientX, t: e.timeStamp, lastX: e.clientX, lastT: e.timeStamp, v: 0 }
    if (cardRef.current) cardRef.current.style.transition = 'none'
  }
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.v = (e.clientX - d.lastX) / dt
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    paint(e.clientX - d.x0)
  }
  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const dx = e.clientX - d.x0
    const stale = e.timeStamp - d.lastT > 100
    const decision = e.type === 'pointercancel'
      ? null
      : swipeDecision(dx, stale ? 0 : d.v, cardRef.current?.offsetWidth ?? 360)
    if (decision) {
      commit(decision, decision)
    } else if (cardRef.current) {
      cardRef.current.style.transition = reducedMotion() ? 'none' : 'transform .2s ease-out'
      paint(0)
    }
  }

  return (
    <div className="swipe">
      <div className="swipe-stage">
        {peek && <div className="swipe-peek" aria-hidden="true" />}
        <div
          ref={cardRef}
          className="swipe-card"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span className="swipe-type">{typeLabel}</span>
          <span ref={goodRef} className="swipe-stamp swipe-stamp-good" aria-hidden="true">{goodLabel}</span>
          <span ref={badRef} className="swipe-stamp swipe-stamp-bad" aria-hidden="true">{badLabel}</span>
          <div className="swipe-body">
            <strong className="swipe-title">{title}</strong>
            <span className="swipe-question">{question}</span>
          </div>
          {children}
          <span className="swipe-hint">{hint}</span>
        </div>
      </div>
      <div className="swipe-actions">
        <button type="button" className="swipe-btn swipe-btn-bad" aria-keyshortcuts="ArrowLeft" onClick={() => commit('bad', 'bad')}>
          <span className="swipe-mark" aria-hidden="true">✕</span>
          <span>{badLabel}</span>
        </button>
        <button type="button" className="swipe-btn swipe-btn-good" aria-keyshortcuts="ArrowRight" onClick={() => commit('good', 'good')}>
          <span className="swipe-mark" aria-hidden="true">✓</span>
          <span>{goodLabel}</span>
        </button>
      </div>
      {notApplicableLabel && (
        <div className="swipe-na">
          <Button variant="quiet" onClick={() => commit('not_applicable')}>{notApplicableLabel}</Button>
        </div>
      )}
    </div>
  )
}
