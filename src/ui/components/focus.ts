export const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Where Tab / Shift+Tab should move focus to keep it inside the modal, or null when the
 * browser's default movement stays inside. `container` is the dialog element itself.
 */
export function nextFocusTarget<T>(items: readonly T[], active: T | null, container: T, shift: boolean): T | null {
  if (items.length === 0) return container
  const first = items[0]
  const last = items[items.length - 1]
  if (shift) return active === first || active === container || !items.includes(active as T) ? last : null
  return active === last || !items.includes(active as T) ? first : null
}

/** Marks sibling content as unreachable while the modal is open. Returns an undo function. */
export function setBackgroundInert(el: HTMLElement | null): () => void {
  if (!el) return () => {}
  el.setAttribute('inert', '')
  el.setAttribute('aria-hidden', 'true')
  return () => {
    el.removeAttribute('inert')
    el.removeAttribute('aria-hidden')
  }
}
