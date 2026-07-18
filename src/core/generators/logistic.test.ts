import { describe, expect, it } from 'vitest'
import type { CalibrationPoint, SessionType } from '../types'
import { logisticV1 } from './logistic'

/**
 * Reference: direct transliteration of the original TrainingPlan.swift
 * (hardcoded 40 sessions, k = 0.25). The generalized generator must reproduce
 * it exactly for the original 13-weeks × 3-per-week shape.
 */

interface RefSession {
  max: number
  type: SessionType
  sets: { target: number; isMinimum: boolean }[]
}

function swiftReference(
  startMaxIn: number,
  targetMaxIn: number,
  cal?: CalibrationPoint,
): RefSession[] {
  const startMax = Math.max(1, Math.min(startMaxIn, 100))
  const targetMax = Math.max(startMax, Math.min(targetMaxIn, 100))

  const baseline = (n: number): number => {
    if (n <= 3) return startMax
    const midpoint = (4 + 39) / 2
    const progress = 1 / (1 + Math.exp(-0.25 * (n - midpoint)))
    return startMax + (targetMax - startMax) * progress
  }

  const adjustment = (n: number): number => {
    if (!cal || n <= cal.sessionIndex) return 0
    const offset = cal.actual - baseline(cal.sessionIndex)
    return (offset * (39 - n)) / (39 - cal.sessionIndex) // Swift: unclamped
  }

  const multiplier = (max: number): number => {
    if (max <= 10) return 1.25
    if (max >= 100) return 0.75
    return 1.25 + ((0.75 - 1.25) * (max - 10)) / (100 - 10)
  }

  const sessions: RefSession[] = []
  for (let n = 1; n <= 40; n++) {
    const type: SessionType =
      [11, 20, 29, 39].includes(n) ? 'taper'
      : [12, 21, 30, 40].includes(n) ? 'test'
      : [13, 22, 31].includes(n) ? 'recovery'
      : 'normal'
    const max = Math.round(baseline(n) + adjustment(n))

    if (type === 'test') {
      sessions.push({ max, type, sets: [{ target: max, isMinimum: false }] })
      continue
    }
    const reduction = type === 'taper' ? 0.6 : type === 'recovery' ? 0.85 : 1.0
    const base = max * multiplier(max) * reduction
    const weekDay = ((n - 1) % 3) + 1
    const raw =
      weekDay === 1
        ? [Math.floor(0.44 * base), Math.ceil(0.56 * base), Math.ceil(0.5 * base), Math.floor(0.41 * base)]
        : weekDay === 2
          ? [Math.ceil(0.31 * base), Math.floor(0.72 * base), Math.ceil(0.3 * base), Math.floor(0.44 * base)]
          : [Math.floor(0.16 * base), Math.ceil(0.84 * base), Math.floor(0.2 * base), Math.ceil(0.2 * base)]
    sessions.push({
      max,
      type,
      sets: raw.map((t, i) => ({
        target: Math.max(1, t),
        isMinimum: type === 'normal' && i === 3,
      })),
    })
  }
  return sessions
}

const PARAMS_13x3 = { weeks: 13, sessionsPerWeek: 3 }

function expectMatchesReference(startMax: number, targetMax: number, cal?: CalibrationPoint) {
  const ours = logisticV1.generate({ startMax, targetMax, ...PARAMS_13x3 }, cal ? [cal] : [])
  const ref = swiftReference(startMax, targetMax, cal)
  expect(ours).toHaveLength(40)
  // Session 40 is excluded when calibrated: the original's decay underflows
  // below zero there; we clamp at 0 (documented deviation).
  const comparable = cal ? 39 : 40
  for (let i = 0; i < comparable; i++) {
    expect(ours[i].type, `session ${i + 1} type`).toBe(ref[i].type)
    expect(ours[i].sets, `session ${i + 1} sets`).toEqual(ref[i].sets)
  }
}

describe('logistic-v1 vs original Swift implementation (13w × 3/wk)', () => {
  it('matches for the canonical 10 → 100 plan', () => {
    expectMatchesReference(10, 100)
  })

  it('matches for other parameter combinations', () => {
    expectMatchesReference(25, 100)
    expectMatchesReference(5, 40)
    expectMatchesReference(50, 60)
    expectMatchesReference(1, 100)
  })

  it('matches with a calibration point (test came in low)', () => {
    expectMatchesReference(10, 100, { sessionIndex: 12, actual: 15 })
  })

  it('matches with a calibration point (test came in high)', () => {
    expectMatchesReference(25, 80, { sessionIndex: 21, actual: 70 })
  })

  it('clamps calibration decay at zero on the final session', () => {
    const cal = { sessionIndex: 12, actual: 40 } // way above curve
    const ours = logisticV1.generate({ startMax: 10, targetMax: 100, ...PARAMS_13x3 }, [cal])
    const uncalibrated = logisticV1.generate({ startMax: 10, targetMax: 100, ...PARAMS_13x3 }, [])
    // Original would push session 40 slightly BELOW the uncalibrated curve.
    expect(ours[39].sets[0].target).toBeGreaterThanOrEqual(uncalibrated[39].sets[0].target)
  })
})

describe('logistic-v1 frozen values (independent hand computation, 10 → 100)', () => {
  const plan = logisticV1.generate({ startMax: 10, targetMax: 100, ...PARAMS_13x3 }, [])

  it('holds the start max through the lag sessions', () => {
    // max 10 → multiplier 1.25 → base 12.5 → volume day: 5/8/7/5
    // (set 2: 0.56 × 12.5 = 7.000…001 in IEEE doubles → ceil 8, same as Swift)
    expect(plan[0].sets.map((s) => s.target)).toEqual([5, 8, 7, 5])
    expect(plan[0].sets[3].isMinimum).toBe(true)
  })

  it('hits hand-computed theoretical maxes along the curve', () => {
    // baseline(4) ≈ 11.12, baseline(21) ≈ 52.19, test 40 ≈ 99.13
    expect(plan[20].type).toBe('test')
    expect(plan[20].sets[0].target).toBe(52)
    expect(plan[39].sets[0].target).toBe(99)
  })
})

describe('logistic-v1 generalization', () => {
  it('lays out a 6w × 2/wk plan: 13 sessions, final test + taper, no mid tests', () => {
    const plan = logisticV1.generate({ startMax: 5, targetMax: 20, weeks: 6, sessionsPerWeek: 2 }, [])
    expect(plan).toHaveLength(13)
    expect(plan[12].type).toBe('test')
    expect(plan[11].type).toBe('taper')
    expect(plan.filter((s) => s.type === 'test')).toHaveLength(1)
  })

  it('keeps mid tests every 3 weeks while ≥3 weeks remain (10w × 3/wk)', () => {
    const plan = logisticV1.generate({ startMax: 10, targetMax: 50, weeks: 10, sessionsPerWeek: 3 }, [])
    const tests = plan.filter((s) => s.type === 'test').map((s) => s.index)
    // week 4 → session 12, week 7 → session 21; week 10 is final-test territory
    expect(tests).toEqual([12, 21, 31])
  })

  it('never emits a set below 1, even for tiny plans', () => {
    const plan = logisticV1.generate({ startMax: 1, targetMax: 3, weeks: 2, sessionsPerWeek: 1 }, [])
    for (const s of plan) {
      for (const set of s.sets) expect(set.target).toBeGreaterThanOrEqual(1)
    }
  })

  it('theoretical max is monotone non-decreasing without calibration', () => {
    const plan = logisticV1.generate({ startMax: 12, targetMax: 90, ...PARAMS_13x3 }, [])
    const tests = plan.filter((s) => s.type === 'test')
    for (let i = 1; i < tests.length; i++) {
      expect(tests[i].sets[0].target).toBeGreaterThanOrEqual(tests[i - 1].sets[0].target)
    }
  })
})
