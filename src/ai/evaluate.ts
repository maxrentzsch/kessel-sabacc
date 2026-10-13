import { buildSuit, NO_MODIFIERS, penaltyFor, Rng, scoreHand } from '../engine'
import type { Card, Hand, HandScore, Modifiers, Suit } from '../engine'

/** One possible final value of a hand once its Impostor dice are rolled. */
export interface Outcome {
  p: number
  score: HandScore
}

const outcomeCache = new Map<string, Outcome[]>()

function cardKey(card: Card): string {
  return card.kind === 'number' ? String(card.value) : card.kind[0]
}

function modsKey(m: Modifiers): string {
  return `${+m.sylopZero}${+m.impostorSix}${+m.cookTheBooks}${m.primeValue ?? 0}`
}

/**
 * Distribution of final scores for a hand, assuming every pending Impostor
 * roll is resolved with the better of its two dice.
 */
export function outcomes(
  hand: Hand,
  mods: Modifiers,
  known: Partial<Record<Suit, number>> = {},
): Outcome[] {
  const key = `${cardKey(hand.sand)}|${cardKey(hand.blood)}|${modsKey(mods)}|${known.sand ?? 0}|${known.blood ?? 0}`
  const cached = outcomeCache.get(key)
  if (cached) return cached

  const open = (['sand', 'blood'] as const).filter(
    (suit) => hand[suit].kind === 'impostor' && !mods.impostorSix && known[suit] === undefined,
  )
  const byPower = new Map<number, Outcome>()
  const add = (score: HandScore, p: number) => {
    const entry = byPower.get(score.power)
    if (entry) entry.p += p
    else byPower.set(score.power, { p, score })
  }
  const best = (options: Partial<Record<Suit, number>>[]): HandScore =>
    options
      .map((o) => scoreHand(hand, mods, { ...known, ...o }))
      .reduce((a, b) => (b.power > a.power ? b : a))

  if (open.length === 0) {
    add(scoreHand(hand, mods, known), 1)
  } else if (open.length === 1) {
    const suit = open[0]
    for (let a = 1; a <= 6; a++) {
      for (let b = 1; b <= 6; b++) add(best([{ [suit]: a }, { [suit]: b }]), 1 / 36)
    }
  } else {
    for (let a = 1; a <= 6; a++) {
      for (let b = a; b <= 6; b++) {
        for (let c = 1; c <= 6; c++) {
          for (let d = c; d <= 6; d++) {
            const weight = (a === b ? 1 : 2) * (c === d ? 1 : 2)
            const options = [
              { sand: a, blood: c },
              { sand: a, blood: d },
              { sand: b, blood: c },
              { sand: b, blood: d },
            ]
            add(best(options), weight / 1296)
          }
        }
      }
    }
  }

  const result = [...byPower.values()]
  outcomeCache.set(key, result)
  return result
}

export function expectedPower(hand: Hand, mods: Modifiers, known: Partial<Record<Suit, number>> = {}): number {
  return outcomes(hand, mods, known).reduce((sum, o) => sum + o.p * o.score.power, 0)
}

// ── What a typical opponent ends up with ─────────────────────────────────────

let opponentPowers: number[] | null = null

/**
 * Sorted sample of final hand powers of a plausible opponent: a random deal
 * followed by three rounds of greedy improvement.
 */
function opponentSample(): number[] {
  if (opponentPowers) return opponentPowers
  const rng = new Rng(20241)
  const suits = { sand: buildSuit('sand'), blood: buildSuit('blood') }
  const powers: number[] = []
  for (let i = 0; i < 3000; i++) {
    const hand: Hand = { sand: rng.pick(suits.sand), blood: rng.pick(suits.blood) }
    for (let round = 0; round < 3; round++) {
      const current = expectedPower(hand, NO_MODIFIERS)
      if (current >= 740) break // already a decent Sabacc
      const suit: Suit = rng.chance(0.5) ? 'sand' : 'blood'
      const drawn = rng.pick(suits[suit])
      const candidate = { ...hand, [suit]: drawn }
      if (expectedPower(candidate, NO_MODIFIERS) > current) hand[suit] = drawn
    }
    const final = outcomes(hand, NO_MODIFIERS)
    let roll = rng.next()
    let score = final[final.length - 1].score
    for (const o of final) {
      roll -= o.p
      if (roll <= 0) {
        score = o.score
        break
      }
    }
    powers.push(score.power)
  }
  opponentPowers = powers.sort((a, b) => a - b)
  return opponentPowers
}

/** Chance that a hand of this power beats one typical opponent (ties count half). */
export function beatsOne(power: number): number {
  const sample = opponentSample()
  let lo = 0
  let hi = sample.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sample[mid] < power) lo = mid + 1
    else hi = mid
  }
  let equal = 0
  while (lo + equal < sample.length && sample[lo + equal] === power) equal++
  return (lo + equal / 2) / sample.length
}

export function winChance(hand: Hand, mods: Modifiers, opponents: number, known: Partial<Record<Suit, number>> = {}): number {
  return outcomes(hand, mods, known).reduce(
    (sum, o) => sum + o.p * Math.pow(beatsOne(o.score.power), opponents),
    0,
  )
}

/** Being knocked out hurts more than the chips alone suggest. */
const ELIMINATION_COST = 3

function chipUtility(chips: number): number {
  return chips <= 0 ? -ELIMINATION_COST : chips
}

/**
 * Expected utility of going to the reveal with this hand: win → invested chips
 * come back, lose → they are gone and the penalty comes out of the stock.
 */
export function handUtility(
  hand: Hand,
  mods: Modifiers,
  opponents: number,
  stock: number,
  invested: number,
  known: Partial<Record<Suit, number>> = {},
): number {
  let total = 0
  for (const o of outcomes(hand, mods, known)) {
    const pWin = Math.pow(beatsOne(o.score.power), opponents)
    const lose = chipUtility(Math.max(0, stock - penaltyFor(o.score)))
    total += o.p * (pWin * chipUtility(stock + invested) + (1 - pWin) * lose)
  }
  return total
}
