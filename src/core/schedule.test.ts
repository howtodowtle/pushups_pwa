import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, todayISO } from './dates'
import { baseDates, shiftedDates } from './schedule'

describe('dates', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-07-30', 3)).toBe('2026-08-02')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-07-18', -1)).toBe('2026-07-17')
  })

  it('computes day differences', () => {
    expect(daysBetween('2026-07-18', '2026-07-21')).toBe(3)
    expect(daysBetween('2026-07-21', '2026-07-18')).toBe(-3)
  })

  it('formats today as yyyy-mm-dd', () => {
    expect(todayISO(new Date(2026, 6, 18, 23, 59))).toBe('2026-07-18')
    expect(todayISO(new Date(2026, 0, 2, 0, 1))).toBe('2026-01-02')
  })
})

describe('baseDates', () => {
  it('spreads 3/week as Mon/Wed/Fri-style offsets 0,2,4', () => {
    expect(baseDates('2026-07-20', 7, 3)).toEqual([
      '2026-07-20', '2026-07-22', '2026-07-24',
      '2026-07-27', '2026-07-29', '2026-07-31',
      '2026-08-03',
    ])
  })

  it('spreads 2/week as offsets 0,3', () => {
    expect(baseDates('2026-07-20', 4, 2)).toEqual([
      '2026-07-20', '2026-07-23', '2026-07-27', '2026-07-30',
    ])
  })

  it('handles the final +1 test session landing in its own week', () => {
    const dates = baseDates('2026-07-20', 2 * 3 + 1, 3)
    expect(dates[6]).toBe(addDays('2026-07-20', 14))
  })
})

describe('shiftedDates (shift-forward on missed days)', () => {
  const base = ['2026-07-20', '2026-07-22', '2026-07-24', '2026-07-27']

  it('does not shift when on schedule', () => {
    expect(shiftedDates(base, 1, '2026-07-21')).toEqual(base)
    expect(shiftedDates(base, 1, '2026-07-22')).toEqual(base)
  })

  it('shifts all remaining sessions by the overdue gap', () => {
    // First incomplete was due 07-22; it is now 07-25 → everything slides 3 days.
    expect(shiftedDates(base, 1, '2026-07-25')).toEqual([
      '2026-07-20', '2026-07-25', '2026-07-27', '2026-07-30',
    ])
  })

  it('leaves completed sessions untouched', () => {
    const shifted = shiftedDates(base, 2, '2026-08-01')
    expect(shifted.slice(0, 2)).toEqual(base.slice(0, 2))
    expect(shifted[2]).toBe('2026-08-01')
  })

  it('is a no-op when the plan is fully complete', () => {
    expect(shiftedDates(base, 4, '2026-09-01')).toEqual(base)
  })
})
