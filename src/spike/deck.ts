import type { Rng } from '../engine/rng'
import type { SpikeCard, SpikeRules, SpikeSuit } from './types'

export const SPIKE_SUITS: SpikeSuit[] = ['circle', 'triangle', 'square']

export const SPIKE_RULES: SpikeRules = { ante: 1, bets: [1, 1, 2], maxRaises: 2, handLimit: 5, anteEvery: 4, betting: true, dice: true, simple: false }

/** 62 cards: three staves of +1 … +10 and −1 … −10, and two sylops. */
export function buildSpikeDeck(): SpikeCard[] {
  const cards: SpikeCard[] = []
  for (const suit of SPIKE_SUITS) {
    for (let n = 1; n <= 10; n++) {
      cards.push({ id: `${suit}+${n}`, suit, value: n })
      cards.push({ id: `${suit}-${n}`, suit, value: -n })
    }
  }
  cards.push({ id: 'sylop-a', suit: null, value: 0 }, { id: 'sylop-b', suit: null, value: 0 })
  return cards
}

export function shuffledSpikeDeck(rng: Rng): SpikeCard[] {
  return rng.shuffle(buildSpikeDeck())
}
