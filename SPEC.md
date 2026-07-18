# Training PWA — Design Spec

Personal single-user PWA for progressive calisthenics training (push-ups, pull-ups, anything
rep- or seconds-based). Installable via Safari "Add to Home Screen", offline-first, all data in
`localStorage`, no backend. This is a **generalized plan engine + logging UI** — exercise types
and plan algorithms are data/config, not code paths.

## Core principle: derive, don't mutate

- **Past = facts.** Completing a session writes an immutable `Result` snapshot (targets as they
  were that day + actual reps). History, stats and the chart read only Results.
- **Future = pure function.** The displayed schedule for incomplete sessions is derived on
  every render:

  ```
  sessions = overrides ⊕ generator.generate(plan.params, plan.calibrations)
  dates    = shiftForward(baseDates(plan.startDate, sessionsPerWeek), results, today)
  ```

- Storage holds only inputs (params, calibrations, overrides, results). Changing plan params
  re-derives the future and never touches the past. Test results append a calibration point and
  the curve bends automatically. Manual day edits are overrides that survive both.

## Data model (`src/core/types.ts`)

| Entity | Role |
|---|---|
| `Exercise` | name + emoji + unit (`reps` \| `seconds`), user-defined |
| `Plan` | generatorId + params + startDate + status (`active`/`archived`) + calibrations + overrides |
| `Result` | immutable completion snapshot per session |
| `AppData` | versioned envelope of everything, one localStorage key |

Invariant: at most one active plan per exercise. Stop archives (history keeps counting toward
stats); delete erases the plan and its results.

## Generator interface (`src/core/generators/`)

```ts
interface Generator {
  id: string
  name: string
  description: string
  paramFields: ParamField[]   // declarative → the settings form renders itself
  generate(params, calibrations): SessionTemplate[]  // pure, idempotent
}
```

Convention: `params` must include `sessionsPerWeek` (the core scheduler reads it).

**To add an algorithm:** create a file exporting a `Generator`, add it to the list in
`generators/index.ts`. That's the whole change — plan creation UI, storage and derivation pick
it up from the registry.

### `logistic-v1` (the ported example)

Port of the algorithm from the original iOS app ("100 Pushups in 13 Weeks"), generalized:

- Theoretical max: flat for 3 lag sessions, then a logistic S-curve start→target. Curve
  steepness scales with plan length (k = 0.25 at the original 13w×3 shape).
- Sessions: 3 fixed sets + a minimum-then-AMRAP 4th set; rotating volume/mixed/intensity
  day templates; difficulty multiplier 1.25@max≤10 → 0.75@max≥100.
- Max tests at the end of every 3rd week (from week 4, while ≥3 weeks remain) + final test;
  taper before, recovery after.
- Calibration: after a test, future maxes shift by (actual − predicted), decaying linearly to
  zero by the last session. Only the latest test counts. (Deviation from Swift: decay clamps
  at 0 instead of briefly going negative on the final session.)

Golden-tested against a direct transliteration of the Swift original in
`logistic.test.ts` — bit-identical output for the 13w×3 shape.

## Scheduling (`src/core/schedule.ts`)

Sessions spread evenly per week from the start date (3/wk → offsets 0,2,4). A session is
**due** when it's the first incomplete one and its date ≤ today. If it's overdue, the whole
remaining schedule shifts forward by the gap — computed at render, nothing stored. This
function is the single place a smarter rescheduler would plug in.

## UI (`src/ui/`)

Tab per exercise + Settings tab. Exercise tab: Today card (one-tap Done; tests and minimum
sets prompt for actuals) → stats (streak/total/sessions, across archived plans too) → progress
chart (planned volume line, actual dots, test diamonds) → schedule (tap a day to override) →
history. Settings: exercise CRUD, plan create/edit-params/stop/delete with self-rendering
param forms, JSON export/import backup.

## Verification

`npm test` — generator parity vs Swift transliteration, scheduler shift, derivation.
Manual: create plan → log → skip days → shift; test with actual ≠ predicted → future bends,
overridden day survives; edit params → past untouched; export → wipe → import → identical.
