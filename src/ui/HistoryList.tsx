import type { Result, Unit } from '../core/types'
import { actualsSummary, formatDate, maxHint, SessionBadges, stagger } from './format'

/** Past sessions, newest first — across all plans of the exercise. */
export function HistoryList({
  results,
  unit,
  today,
  predictedMax,
}: {
  results: Result[]
  unit: Unit
  today: string
  /** Predicted max per "planId:sessionIndex", for plans whose generator models one. */
  predictedMax?: ReadonlyMap<string, number>
}) {
  if (results.length === 0) return null
  const sorted = [...results].sort(
    (a, b) => b.date.localeCompare(a.date) || b.sessionIndex - a.sessionIndex,
  )

  return (
    <>
      <h2>History</h2>
      <div class="card" data-size="sm" style={{ paddingBlock: 4 }}>
        <section>
          {sorted.map((r, i) => {
            const pm = predictedMax?.get(`${r.planId}:${r.sessionIndex}`)
            return (
              <div key={r.id} class="session-row done" style={stagger(i)}>
                <span class="date">{formatDate(r.date, today)}</span>
                <span class="sets-line" style={{ flex: 1 }}>
                  {actualsSummary(r.sets, unit)}
                </span>
                <SessionBadges type={r.sessionType} />
                {pm != null && <span class="max-hint">{maxHint(pm, unit)}</span>}
              </div>
            )
          })}
        </section>
      </div>
    </>
  )
}
