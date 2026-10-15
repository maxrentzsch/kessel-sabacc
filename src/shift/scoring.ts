import type { ShiftCard, ShiftScore, ShiftTarget } from './types'

/** How a selection stands against the dice: its sum, how far that is from the target, and its cards of the target suit. */
export function scoreSelection(cards: ShiftCard[], target: ShiftTarget): ShiftScore {
  const total = cards.reduce((sum, c) => sum + c.value, 0)
  // a sylop is wild: it counts for every suit
  const suited = cards.filter((c) => c.suit === null || c.suit === target.suit).length
  return { total, distance: Math.abs(total - target.value), suited }
}

/** Negative if `a` is the better selection, positive if `b` is, 0 for a dead heat. */
export function compareShift(a: ShiftScore, b: ShiftScore): number {
  return a.distance - b.distance || b.suited - a.suited
}

/**
 * The best selection a set of cards allows: nearest to the target, then the
 * most cards of the target suit. Five cards make 31 non-empty choices.
 */
export function bestSelection(cards: ShiftCard[], target: ShiftTarget, minimum = 1): ShiftCard[] {
  let best: ShiftCard[] = []
  let bestScore: ShiftScore | null = null
  for (let mask = 1; mask < 1 << cards.length; mask++) {
    const pick = cards.filter((_, i) => mask & (1 << i))
    if (pick.length < minimum) continue
    const score = scoreSelection(pick, target)
    if (!bestScore || compareShift(score, bestScore) < 0) {
      best = pick
      bestScore = score
    }
  }
  return best
}
