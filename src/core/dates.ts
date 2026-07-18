/**
 * All stored dates are local-calendar `yyyy-mm-dd` strings. Arithmetic runs on
 * UTC noon so DST transitions can never shift a date.
 */

export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toUTCNoon(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d, 12)
}

export function addDays(iso: string, days: number): string {
  return new Date(toUTCNoon(iso) + days * 86400_000).toISOString().slice(0, 10)
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((toUTCNoon(toISO) - toUTCNoon(fromISO)) / 86400_000)
}

export function formatDate(iso: string, today: string): string {
  const diff = daysBetween(today, iso)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  const date = new Date(toUTCNoon(iso))
  const sameYear = iso.slice(0, 4) === today.slice(0, 4)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}
