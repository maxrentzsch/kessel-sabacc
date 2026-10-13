import { describe, expect, it } from 'vitest'
import { applyAction, cardsPerSuit, createGame, legalActions, Rng, SUITS, TOKEN_IDS } from '../engine'
import type { GameState, TokenId } from '../engine'
import { beatsOne, outcomes, winChance } from './evaluate'
import { DEFAULT_PROFILES } from './personalities'
import { chooseAction } from './policy'
import type { AiProfile } from './policy'
import { NO_MODIFIERS } from '../engine'

function checkInvariants(s: GameState, totalChips: number): void {
  for (const suit of SUITS) {
    const ids = [
      ...s.decks[suit],
      ...s.discards[suit],
      ...s.players.flatMap((p) => (p.hand ? [p.hand[suit]] : [])),
      ...(s.pendingDraw?.card.suit === suit ? [s.pendingDraw.card] : []),
    ].map((c) => c.id)
    expect(ids).toHaveLength(cardsPerSuit(s.rules))
    expect(new Set(ids).size).toBe(cardsPerSuit(s.rules))
  }
  let chips = 0
  for (const p of s.players) {
    expect(p.chips).toBeGreaterThanOrEqual(0)
    expect(p.invested).toBeGreaterThanOrEqual(0)
    chips += p.chips + p.invested
  }
  // Chips only ever leave the table.
  expect(chips).toBeLessThanOrEqual(totalChips)
}

function playGame(seed: number, profiles: AiProfile[], chips: number, check = true): number {
  const rng = new Rng(seed * 7919 + 1)
  const loadout = (): TokenId[] => rng.shuffle([...TOKEN_IDS]).slice(0, 3)
  let { state } = createGame({
    seed,
    startingChips: chips,
    players: profiles.map((_, i) => ({ name: `AI ${i}`, isHuman: false, tokens: loadout() })),
  })
  const total = chips * profiles.length
  for (let step = 0; state.phase !== 'gameOver'; step++) {
    if (step > 20000) throw new Error(`game ${seed} does not terminate`)
    const action = chooseAction(state, profiles[state.current], rng)
    expect(legalActions(state)).toContainEqual(action)
    state = applyAction(state, action).state
    if (check) checkInvariants(state, total)
  }
  expect(state.players.filter((p) => !p.eliminated)).toHaveLength(1)
  expect(state.players[state.winner!].eliminated).toBe(false)
  return state.winner!
}

describe('hand evaluation', () => {
  it('outcome probabilities sum to one', () => {
    const card = (suit: 'sand' | 'blood', kind: 'impostor' | 'number', value = 0) => ({ id: 'x', suit, kind, value })
    for (const hand of [
      { sand: card('sand', 'number', 3), blood: card('blood', 'number', 5) },
      { sand: card('sand', 'impostor'), blood: card('blood', 'number', 5) },
      { sand: card('sand', 'impostor'), blood: card('blood', 'impostor') },
    ]) {
      const total = outcomes(hand, NO_MODIFIERS).reduce((sum, o) => sum + o.p, 0)
      expect(total).toBeCloseTo(1, 9)
    }
  })

  it('rates better hands higher', () => {
    const n = (suit: 'sand' | 'blood', value: number) => ({ id: 'x', suit, kind: 'number' as const, value })
    const chance = (a: number, b: number) => winChance({ sand: n('sand', a), blood: n('blood', b) }, NO_MODIFIERS, 2)
    expect(chance(1, 1)).toBeGreaterThan(chance(6, 6))
    expect(chance(6, 6)).toBeGreaterThan(chance(2, 3))
    expect(chance(2, 3)).toBeGreaterThan(chance(1, 6))
    expect(beatsOne(1000)).toBeGreaterThan(0.99)
    expect(beatsOne(0)).toBe(0)
  })
})

describe('AI simulation', () => {
  it('plays complete, legal games at every table size', () => {
    const { easy, medium, hard } = DEFAULT_PROFILES
    for (let seed = 1; seed <= 120; seed++) {
      const size = 2 + (seed % 3)
      playGame(seed, [easy, medium, hard, medium].slice(0, size), 4 + (seed % 5))
    }
  })

  it('hard opponents beat easy ones more often than not', () => {
    const { easy, hard } = DEFAULT_PROFILES
    let hardWins = 0
    const games = 300
    for (let seed = 1; seed <= games; seed++) {
      // Alternate seats so the opening position evens out.
      const hardSeat = seed % 2
      const profiles = hardSeat === 0 ? [hard, easy] : [easy, hard]
      if (playGame(seed + 1000, profiles, 6, false) === hardSeat) hardWins++
    }
    expect(hardWins / games).toBeGreaterThan(0.55)
  })
})
