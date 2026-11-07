/** Reads `?type=recovery&token_hash=…` from a query string; null if not a recovery link. */
export function parseRecoveryUrl(search: string): { tokenHash: string } | null {
  const params = new URLSearchParams(search)
  const tokenHash = params.get('token_hash')
  if (params.get('type') !== 'recovery' || !tokenHash) return null
  return { tokenHash }
}

/** Removes recovery params from a URL string, keeping other params and the hash. */
export function stripRecoveryParams(href: string): string {
  const url = new URL(href)
  url.searchParams.delete('type')
  url.searchParams.delete('token_hash')
  return url.pathname + url.search + url.hash
}

/** Removes recovery params from the address bar without reloading. */
export function clearRecoveryFromLocation(): void {
  history.replaceState(history.state, '', stripRecoveryParams(location.href))
}
