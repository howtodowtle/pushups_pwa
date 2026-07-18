import { formatDate } from '../core/dates'
import type { Result, Unit } from '../core/types'
import { actualsSummary, TYPE_LABEL } from './format'

/** Past sessions, newest first — across all plans of the exercise. */
export function HistoryList({ results, unit, today }: { results: Result[]; unit: Unit; today: string }) {
  if (results.length === 0) return null
  const sorted = [...results].sort(
    (a, b) => b.date.localeCompare(a.date) || b.sessionIndex - a.sessionIndex,
  )

  return (
    <>
      <h2>History</h2>
      <div class="card" style={{ padding: '4px 16px' }}>
        {sorted.map((r) => (
          <div key={r.id} class="session-row done">
            <span class="date">{formatDate(r.date, today)}</span>
            <span class="sets-line" style={{ flex: 1 }}>
              {actualsSummary(r.sets, unit)}
            </span>
            {r.sessionType !== 'normal' && (
              <span class={`badge ${r.sessionType}`}>{TYPE_LABEL[r.sessionType]}</span>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
