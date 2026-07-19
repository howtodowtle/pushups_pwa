import { toUTCNoon } from '../core/dates'
import type { ResultSet, SessionType, SetTemplate, Unit } from '../core/types'

/** "Today" / "Tomorrow" / "Yesterday", otherwise a short weekday-and-date. */
export function formatDate(iso: string, today: string): string {
  const noon = toUTCNoon(iso)
  const diff = Math.round((noon - toUTCNoon(today)) / 86400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  const sameYear = iso.slice(0, 4) === today.slice(0, 4)
  return new Date(noon).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

/** Staggered entry-animation delay for list rows, capped so long lists don't crawl. */
export const stagger = (i: number) => ({ '--i': `${Math.min(i, 10) * 25}ms` })

export const unitSuffix = (unit: Unit): string => (unit === 'seconds' ? 's' : '')

/** "12 · 15 · 13 · 10+" — the trailing + marks a minimum ("all you've got") set. */
export function setsSummary(sets: SetTemplate[], unit: Unit): string {
  const sfx = unitSuffix(unit)
  return sets.map((s) => `${s.target}${sfx}${s.isMinimum ? '+' : ''}`).join(' · ')
}

export function actualsSummary(sets: ResultSet[], unit: Unit): string {
  const sfx = unitSuffix(unit)
  return sets.map((s) => `${s.actual}${sfx}`).join(' · ')
}

/** The "max ~N" hint printed on rows and in the chart tooltip. */
export const maxHint = (value: number, unit: Unit): string => `max ~${value}${unitSuffix(unit)}`

const TYPE_LABEL: Record<SessionType, string> = {
  normal: '',
  test: 'Max test',
  taper: 'Taper',
  recovery: 'Recovery',
}

/** The session-type badge plus the "edited" (override) badge, shared by the
 * today card, schedule rows and history rows. Tests get the strong (primary)
 * badge, everything else the muted secondary one. */
export function SessionBadges({ type, overridden }: { type: SessionType; overridden?: boolean }) {
  return (
    <>
      {type !== 'normal' && (
        <span class="badge" data-variant={type === 'test' ? undefined : 'secondary'}>
          {TYPE_LABEL[type]}
        </span>
      )}
      {overridden && (
        <span class="badge" data-variant="outline">
          edited
        </span>
      )}
    </>
  )
}
