import { HAND_KINDS } from './types'
import type { HandKind, SpikeCard, SpikeScore } from './types'

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

/** How often each face value (ignoring the sign) appears among the cards that are not sylops. */
function countsByFace(values: number[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const v of values) if (v !== 0) counts.set(Math.abs(v), (counts.get(Math.abs(v)) ?? 0) + 1)
  return counts
}

/**
 * Which named hand a set of cards is, and what breaks a tie within it.
 * Returns `[kind, …tie-breakers]`, lower tie-breakers being better.
 */
function classify(values: number[]): [HandKind, ...number[]] {
  const n = values.length
  const total = sum(values)
  const positives = values.filter((v) => v > 0)
  const plain = values.filter((v) => v !== 0)
  const sylops = n - plain.length
  // most cards, then the highest positive sum, then the highest single positive card
  const rest = [-n, -sum(positives), -Math.max(0, ...positives)]

  if (total !== 0) return ['nulrhek', Math.abs(total), total > 0 ? 0 : 1, ...rest]

  const faces = countsByFace(values)
  const sorted = [...plain].sort((a, b) => a - b)
  const has = (count: number) => [...faces.entries()].filter(([, c]) => c >= count).map(([face]) => face)

  if (n === 2 && sylops === 2) return ['pure']
  // two of each sign of one face value, with or without a sylop
  const balanced = plain.length === 4 && faces.size === 1 && sorted[1] < 0 && sorted[2] > 0
  if (balanced && sylops === 1) return sorted[3] === 10 ? ['full'] : ['fleet', sorted[3]]
  if (n === 3 && sylops === 1 && sorted[0] === -sorted[1]) return ['yeehaa', sorted[1]]
  if (n === 5 && sylops === 0 && faces.size === 2) {
    // three of one value and two of another, each set of one sign
    const [three] = has(3)
    const signs = new Set(plain.filter((v) => Math.abs(v) === three).map(Math.sign))
    if (three !== undefined && [...faces.values()].includes(2) && signs.size === 1) return ['rhylet', three]
  }
  if (balanced && sylops === 0) return ['squadron', sorted[3]]
  if (n === 5 && sylops === 0) {
    const faceList = sorted.map(Math.abs).sort((a, b) => a - b)
    const low = plain.filter((v) => Math.abs(v) <= 4)
    if (faceList.join() === '1,2,3,4,10' && new Set(low.map(Math.sign)).size === 1) return ['geewhiz', sorted[4] === 10 ? 1 : 0]
  }
  if (n === 4 && sylops === 0) {
    const faceList = sorted.map(Math.abs).sort((a, b) => a - b)
    if (faceList.every((face, i) => i === 0 || face === faceList[i - 1] + 1)) return ['straight', faceList[0]]
  }
  const threes = has(3)
  if (threes.length > 0) return ['banthas', Math.min(...threes), ...rest]
  const pairs = has(2)
  if (pairs.length >= 2) return ['ruleOfTwo', Math.min(...pairs), ...rest]
  if (pairs.length === 1) return ['sabacc', pairs[0], ...rest]
  return ['zero', ...rest]
}

/** `named` off: every hand that adds up to zero is as good as any other of the same size and spread. */
/** Only the distance from zero counts, then the same tie-breakers as ever. */
function plain(values: number[]): [HandKind, ...number[]] {
  const total = sum(values)
  const positives = values.filter((v) => v > 0)
  const rest = [-values.length, -sum(positives), -Math.max(0, ...positives)]
  return total === 0 ? ['zero', ...rest] : ['nulrhek', Math.abs(total), total > 0 ? 0 : 1, ...rest]
}

export function scoreSpikeHand(hand: SpikeCard[], named = true): SpikeScore {
  const values = hand.map((c) => c.value)
  const [kind, ...ties] = named ? classify(values) : plain(values)
  return { kind, total: sum(values), key: [HAND_KINDS.indexOf(kind), ...ties] }
}

/** Negative if `a` is the better hand, positive if `b` is, 0 for a dead heat. */
export function compareSpike(a: SpikeScore, b: SpikeScore): number {
  for (let i = 0; i < Math.max(a.key.length, b.key.length); i++) {
    const diff = (a.key[i] ?? 0) - (b.key[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/** A hand that adds up to zero wins the sabacc pot along with the hand. */
export function isSabacc(score: SpikeScore): boolean {
  return score.total === 0
}
