import type { Card, Rules, Suit } from './types'
import type { Rng } from './rng'

export const SUITS: readonly Suit[] = ['sand', 'blood']

export const STANDARD_RULES: Rules = { rounds: 3, penaltyBonus: 0, sylops: 1, impostors: 3 }

export function cardsPerSuit(rules: Rules = STANDARD_RULES): number {
  return 18 + rules.impostors + rules.sylops
}

/** Standard: 22 cards – three of each value 1–6, three Impostors, one Sylop. */
export function buildSuit(suit: Suit, rules: Rules = STANDARD_RULES): Card[] {
  const cards: Card[] = []
  for (let value = 1; value <= 6; value++) {
    for (let copy = 0; copy < 3; copy++) {
      cards.push({ id: `${suit}-${value}-${copy}`, suit, kind: 'number', value })
    }
  }
  for (let copy = 0; copy < rules.impostors; copy++) {
    cards.push({ id: `${suit}-imp-${copy}`, suit, kind: 'impostor', value: 0 })
  }
  for (let copy = 0; copy < rules.sylops; copy++) {
    cards.push({ id: copy === 0 ? `${suit}-sylop` : `${suit}-sylop-${copy}`, suit, kind: 'sylop', value: 0 })
  }
  return cards
}

export function buildShuffledSuit(suit: Suit, rng: Rng, rules: Rules = STANDARD_RULES): Card[] {
  return rng.shuffle(buildSuit(suit, rules))
}
