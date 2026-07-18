import type { Generator } from '../types'
import { logisticV1 } from './logistic'

/**
 * Generator registry. To add an algorithm:
 * 1. Create a file exporting a `Generator` (see logistic.ts for the shape —
 *    pure `generate(params, calibrations)`, params described by paramFields
 *    and required to include `sessionsPerWeek`).
 * 2. Add it to the list below. Settings UI and storage pick it up from here;
 *    no other code changes.
 */
const generators: Generator[] = [logisticV1]

export const registry: ReadonlyMap<string, Generator> = new Map(
  generators.map((g) => [g.id, g]),
)

export function getGenerator(id: string): Generator {
  const g = registry.get(id)
  if (!g) throw new Error(`Unknown generator: ${id}`)
  return g
}
