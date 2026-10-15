/**
 * The garrison of Coruscant is no syndicate but the law. Being caught at a
 * table of the core, or smuggling for somebody, draws its attention; past a
 * point there are checks at the jump points: pay a fine, or a quick hand
 * against the customs officer.
 */
export const HEAT_MAX = 100
/** From here on, every jump in the core meets a check. */
export const HEAT_CHECK = 50
/** What getting caught at a table of the core adds. */
export const HEAT_CAUGHT = 15
/** How much it cools with every game played quietly in the core. */
export const HEAT_COOLING = 10

export const clampHeat = (heat: number) => Math.max(0, Math.min(HEAT_MAX, Math.round(heat)))

/** The fine at a check: the hotter, the dearer. */
export function customsFine(heat: number): number {
  return Math.round(heat * 20)
}

/** The quick hand against the customs officer: a duel with only a few chips. */
export const CUSTOMS_CHIPS = 4
