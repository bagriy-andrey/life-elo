/** Next local midnight after `now`. Built from calendar parts so DST days (23/25 h) end correctly. */
export function nextMidnight(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
}

/** Time left until the next local midnight; floored to whole minutes, never below 0 h 1 min. */
export function timeLeft(now: Date): { hours: number; minutes: number } {
  const ms = nextMidnight(now).getTime() - now.getTime()
  const total = Math.max(1, Math.floor(ms / 60000))
  return { hours: Math.floor(total / 60), minutes: total % 60 }
}

/** The deadline header appends "rating will drop" only while the rating is positive. */
export function deadlineShowsRating(rating: number): boolean {
  return rating > 0
}
