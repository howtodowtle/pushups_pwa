import type {
  CalibrationPoint,
  Generator,
  SessionTemplate,
  SessionType,
  SetTemplate,
} from '../types'

/**
 * `logistic-v1` — port of the algorithm from the original iOS app
 * ("100 Pushups in 13 Weeks", TrainingPlan.swift), generalized from its fixed
 * 13-weeks × 3-sessions shape to `weeks × sessionsPerWeek` (+1 final test).
 *
 * Shape of a plan:
 * - Theoretical max follows a logistic S-curve from startMax to targetMax,
 *   flat for the first 3 sessions ("initial lag").
 * - Each normal session: 3 fixed sets + a minimum-then-AMRAP 4th set, using a
 *   rotating volume / mixed / intensity day template.
 * - Max-test sessions at the end of every 3rd week (from week 4, while ≥3
 *   weeks remain) and one final test session, each preceded by a taper session
 *   and followed by a recovery session.
 * - After a test, the curve is shifted by (actual − predicted), decaying
 *   linearly to zero by the last pre-test session, so the plan trusts the
 *   measurement short-term but converges back to the target. Only the most
 *   recent test counts.
 *
 * Deliberate deviations from the Swift original:
 * - k is scaled by curve span so the S-shape is identical for any plan length
 *   (k = 0.25 exactly reproduces the original for 13w × 3/wk).
 * - Calibration decay is clamped at 0 (the original briefly inverted the
 *   adjustment sign on the final session).
 */

const LAG_SESSIONS = 3
const SWIFT_K = 0.25
const SWIFT_SPAN = 35 // logistic span (session 4 → 39) the original k was tuned for

type Rounding = 'floor' | 'ceil'

const DAY_TEMPLATES: { fractions: number[]; rounding: Rounding[] }[] = [
  // volume focus
  { fractions: [0.44, 0.56, 0.5, 0.41], rounding: ['floor', 'ceil', 'ceil', 'floor'] },
  // mixed focus
  { fractions: [0.31, 0.72, 0.3, 0.44], rounding: ['ceil', 'floor', 'ceil', 'floor'] },
  // intensity focus
  { fractions: [0.16, 0.84, 0.2, 0.2], rounding: ['floor', 'ceil', 'floor', 'ceil'] },
]

const REDUCTION: Partial<Record<SessionType, number>> = {
  taper: 0.6,
  recovery: 0.85,
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

function baselineMax(
  n: number,
  startMax: number,
  targetMax: number,
  totalSessions: number,
): number {
  if (n <= LAG_SESSIONS) return startMax
  const logStart = LAG_SESSIONS + 1
  const logEnd = totalSessions - 1
  const k = SWIFT_K * (SWIFT_SPAN / (logEnd - logStart))
  const midpoint = (logStart + logEnd) / 2
  const progress = 1 / (1 + Math.exp(-k * (n - midpoint)))
  return startMax + (targetMax - startMax) * progress
}

function calibrationAdjustment(
  n: number,
  cal: CalibrationPoint | undefined,
  startMax: number,
  targetMax: number,
  totalSessions: number,
): number {
  if (!cal || n <= cal.sessionIndex) return 0
  const logEnd = totalSessions - 1
  const span = logEnd - cal.sessionIndex
  if (span <= 0) return 0
  const offset = cal.actual - baselineMax(cal.sessionIndex, startMax, targetMax, totalSessions)
  const decay = clamp((logEnd - n) / span, 0, 1)
  return offset * decay
}

/** More assistance volume at low maxes, less at high ones. */
function difficultyMultiplier(max: number): number {
  const loMax = 10
  const hiMax = 100
  const hiMult = 1.25
  const loMult = 0.75
  if (max <= loMax) return hiMult
  if (max >= hiMax) return loMult
  return hiMult + ((loMult - hiMult) * (max - loMax)) / (hiMax - loMax)
}

function sessionTypes(weeks: number, perWeek: number): SessionType[] {
  const total = weeks * perWeek + 1
  const types: SessionType[] = new Array(total).fill('normal')
  types[total - 1] = 'test'
  if (total >= 2) types[total - 2] = 'taper'
  for (let w = 4; w <= weeks - 3; w += 3) {
    const testIdx = w * perWeek - 1
    types[testIdx] = 'test'
    if (testIdx >= 1 && types[testIdx - 1] === 'normal') types[testIdx - 1] = 'taper'
    if (types[testIdx + 1] === 'normal') types[testIdx + 1] = 'recovery'
  }
  return types
}

function buildSets(max: number, type: SessionType, dayInWeek: number): SetTemplate[] {
  if (type === 'test') return [{ target: max, isMinimum: false }]
  const base = max * difficultyMultiplier(max) * (REDUCTION[type] ?? 1)
  const tpl = DAY_TEMPLATES[(dayInWeek - 1) % DAY_TEMPLATES.length]
  return tpl.fractions.map((fraction, i) => ({
    target: Math.max(1, Math[tpl.rounding[i]](fraction * base)),
    isMinimum: type === 'normal' && i === tpl.fractions.length - 1,
  }))
}

export const logisticV1: Generator = {
  id: 'logistic-v1',
  name: 'Logistic progression',
  description:
    'S-curve from current to target max. Rotating volume/mixed/intensity days, ' +
    'max test every 3 weeks with taper and recovery, self-calibrating after each test.',
  paramFields: [
    { key: 'startMax', label: 'Current max', min: 1, max: 500, step: 1, defaultValue: 10 },
    { key: 'targetMax', label: 'Target max', min: 1, max: 500, step: 1, defaultValue: 100 },
    { key: 'weeks', label: 'Weeks', min: 2, max: 52, step: 1, defaultValue: 13 },
    { key: 'sessionsPerWeek', label: 'Sessions per week', min: 1, max: 7, step: 1, defaultValue: 3 },
  ],
  generate(params, calibrations): SessionTemplate[] {
    const startMax = clamp(Math.round(params.startMax ?? 10), 1, 500)
    const targetMax = clamp(Math.round(params.targetMax ?? startMax), startMax, 500)
    const weeks = clamp(Math.round(params.weeks ?? 13), 2, 52)
    const perWeek = clamp(Math.round(params.sessionsPerWeek ?? 3), 1, 7)
    const total = weeks * perWeek + 1
    const cal = calibrations[calibrations.length - 1]
    const types = sessionTypes(weeks, perWeek)

    return types.map((type, i) => {
      const n = i + 1
      const max = Math.round(
        baselineMax(n, startMax, targetMax, total) +
          calibrationAdjustment(n, cal, startMax, targetMax, total),
      )
      return { index: n, type, sets: buildSets(max, type, (i % perWeek) + 1) }
    })
  },
}
