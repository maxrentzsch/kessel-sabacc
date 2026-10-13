import { describe, expect, it } from 'vitest'
import { Rng } from '../engine/rng'
import { applySpikeAction, buildSpikeDeck, compareSpike, createSpikeGame, HAND_KINDS, scoreSpikeHand, spikeActions } from './index'
import type { HandKind, SpikeCard, SpikeState } from './index'

/** A hand from its values; staves do not matter for the ranking. */
function hand(...values: number[]): SpikeCard[] {
  return values.map((value, i) => ({ id: `c${i}`, suit: value === 0 ? null : 'circle', value }))
}
const kind = (...values: number[]) => scoreSpikeHand(hand(...values)).kind
const beats = (a: number[], b: number[]) => compareSpike(scoreSpikeHand(hand(...a)), scoreSpikeHand(hand(...b))) < 0

describe('the deck', () => {
  it('has 62 cards that add up to zero', () => {
    const deck = buildSpikeDeck()
    expect(deck).toHaveLength(62)
    expect(new Set(deck.map((c) => c.id)).size).toBe(62)
    expect(deck.reduce((sum, c) => sum + c.value, 0)).toBe(0)
    expect(deck.filter((c) => c.suit === null)).toHaveLength(2)
  })
})

describe('hand ranking', () => {
  const examples: [HandKind, number[]][] = [
    ['pure', [0, 0]],
    ['full', [10, 10, -10, -10, 0]],
    ['fleet', [5, 5, -5, -5, 0]],
    ['yeehaa', [4, -4, 0]],
    ['rhylet', [2, 2, 2, -3, -3]],
    ['squadron', [6, 6, -6, -6]],
    ['geewhiz', [1, 2, 3, 4, -10]],
    ['straight', [7, -8, -9, 10]],
    ['banthas', [4, 4, 4, -3, -9]],
    ['ruleOfTwo', [-9, 9, -4, 4]],
    ['sabacc', [5, -5]],
    ['zero', [1, 2, -3]],
    ['nulrhek', [1, 3]],
  ]

  it('names every hand', () => {
    for (const [expected, values] of examples) expect(kind(...values), values.join()).toBe(expected)
    expect(kind(-1, -2, -3, -4, 10)).toBe('geewhiz')
    expect(kind(-2, -2, -2, 3, 3)).toBe('rhylet')
    expect(kind(3, 3, -6)).toBe('sabacc')
    expect(kind(0, 0, 3, -3)).toBe('sabacc')
    expect(kind(4, 4, -4, -2, -2)).toBe('banthas')
  })

  it('ranks the named hands in order', () => {
    expect(examples.map(([name]) => name)).toEqual([...HAND_KINDS])
    for (let i = 1; i < examples.length; i++) expect(beats(examples[i - 1][1], examples[i][1]), examples[i][0]).toBe(true)
  })

  it('lets the lower card win between two hands of a kind', () => {
    expect(beats([3, 3, -3, -3, 0], [5, 5, -5, -5, 0])).toBe(true)
    expect(beats([2, -2, 0], [4, -4, 0])).toBe(true)
    expect(beats([6, 6, -6, -6], [7, 7, -7, -7])).toBe(true)
    expect(beats([3, -3], [5, -5])).toBe(true)
  })

  it('prefers more cards, then higher positive cards, among plain zeros', () => {
    expect(beats([1, 2, 3, -6], [1, 2, -3])).toBe(true)
    expect(beats([2, 5, -7], [1, 2, -3])).toBe(true)
    expect(beats([1, 6, -7], [3, 4, -7])).toBe(true)
  })

  it('ranks hands that miss zero by distance, sign, cards and height', () => {
    expect(beats([1, 2, -3], [1, -2])).toBe(true)
    expect(beats([5, -4], [5, -3])).toBe(true)
    expect(beats([5, -4], [4, -5])).toBe(true)
    expect(beats([2, 3, -4], [5, -4])).toBe(true)
    expect(beats([8, -7], [5, -4])).toBe(true)
    expect(compareSpike(scoreSpikeHand(hand(5, -4)), scoreSpikeHand(hand(5, -4)))).toBe(0)
  })
})

function chipsInPlay(s: SpikeState): number {
  return s.players.reduce((sum, p) => sum + p.chips, 0) + s.handPot + s.sabaccPot
}

function cardsInPlay(s: SpikeState): string[] {
  const drawn = s.phase === 'showdown' ? (s.result?.placing.flatMap((x) => x.drawn) ?? []) : []
  return [...s.deck, ...s.discard, ...s.players.flatMap((p) => p.hand), ...drawn].map((c) => c.id)
}

describe('a game', () => {
  it('deals two cards each and takes the antes', () => {
    const { state } = createSpikeGame({ seed: 7, startingChips: 20, players: [0, 1, 2].map((i) => ({ name: `P${i}`, isHuman: i === 0 })) })
    expect(state.players.every((p) => p.hand.length === 2 && p.chips === 18)).toBe(true)
    expect(state.handPot).toBe(3)
    expect(state.sabaccPot).toBe(3)
    expect(state.discard).toHaveLength(1)
    expect(state.phase).toBe('card')
    expect(state.current).toBe((state.dealer + 1) % 3)
  })

  it('keeps every card and every chip through random play, and ends', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rng = new Rng(seed * 7919)
      const players = Array.from({ length: 2 + (seed % 3) }, (_, i) => ({ name: `P${i}`, isHuman: false }))
      let { state } = createSpikeGame({ seed, startingChips: 12, players, })
      const total = players.length * 12
      for (let step = 0; state.phase !== 'gameOver'; step++) {
        expect(step, `seed ${seed} does not end`).toBeLessThan(20000)
        const moves = spikeActions(state)
        expect(moves.length).toBeGreaterThan(0)
        state = applySpikeAction(state, rng.pick(moves)).state
        expect(chipsInPlay(state)).toBe(total)
        const cards = cardsInPlay(state)
        expect(cards).toHaveLength(62)
        expect(new Set(cards).size).toBe(62)
        for (const p of state.players) {
          expect(p.chips).toBeGreaterThanOrEqual(0)
          expect(p.hand.length).toBeLessThanOrEqual(5)
        }
      }
      const left = state.players.filter((p) => !p.eliminated)
      expect(left).toHaveLength(1)
      expect(state.winner).toBe(left[0].id)
      expect(left[0].chips).toBe(total)
    }
  })

  /** Put chosen cards into a player's hand, wherever they are right now. */
  function rig(state: SpikeState, playerId: number, ids: string[]): void {
    const piles = [state.deck, state.discard, ...state.players.map((p) => p.hand)]
    const mine = state.players[playerId].hand
    state.deck.push(...mine.splice(0))
    for (const id of ids) {
      for (const pile of piles) {
        const i = pile.findIndex((c) => c.id === id)
        if (i >= 0) mine.push(pile.splice(i, 1)[0])
      }
    }
  }

  /** Play a two-player hand to its end without drawing or betting, with these hands, and no sabacc shift. */
  function quietHand(first: string[], second: string[]): SpikeState {
    let { state } = createSpikeGame({ seed: 3, startingChips: 20, players: [0, 1].map((i) => ({ name: `P${i}`, isHuman: false })) })
    rig(state, 0, first)
    rig(state, 1, second)
    while (state.phase !== 'showdown') {
      const move = spikeActions(state).find((m) => m.type === 'stand' || m.type === 'check' || m.type === 'roll')!
      if (move.type === 'roll') {
        // pick a roll that is not a pair
        for (let rng = 1; ; rng++) {
          const next = applySpikeAction({ ...state, rng }, move).state
          if (next.dice![0] !== next.dice![1]) {
            state = next
            break
          }
        }
      } else state = applySpikeAction(state, move).state
    }
    return state
  }

  it('pays both pots for a hand of zero', () => {
    const shown = quietHand(['circle+5', 'square-5'], ['circle+7', 'square-3'])
    expect(shown.result).toMatchObject({ winners: [0], handPot: 2, sabaccPot: 2, uncontested: false })
    const after = applySpikeAction(shown, { type: 'settle' }).state
    expect(after.players.map((p) => p.chips)).toEqual([22, 18])
    expect(after.sabaccPot).toBe(0)
  })

  it('leaves the sabacc pot on the table when nobody has zero', () => {
    const shown = quietHand(['circle+5', 'square-4'], ['circle+7', 'square-3'])
    expect(shown.result).toMatchObject({ winners: [0], handPot: 2, sabaccPot: 0 })
    const after = applySpikeAction(shown, { type: 'settle' }).state
    expect(after.players.map((p) => p.chips)).toEqual([20, 18])
    expect(after.sabaccPot).toBe(2)
    expect(after.phase).toBe('handEnd')
  })

  it('gives the hand pot to the last player who has not junked, without a showdown', () => {
    let { state } = createSpikeGame({ seed: 5, startingChips: 20, players: [0, 1].map((i) => ({ name: `P${i}`, isHuman: false })) })
    const first = state.current
    state = applySpikeAction(state, { type: 'junk' }).state
    expect(state.phase).toBe('showdown')
    expect(state.result).toMatchObject({ winners: [1 - first], uncontested: true, sabaccPot: 0 })
  })

  it('breaks a dead heat by a blind draw', () => {
    const shown = quietHand(['circle+5', 'square-4'], ['triangle+5', 'triangle-4'])
    expect(shown.result!.placing.every((x) => x.drawn.length >= 1)).toBe(true)
    expect(shown.result!.winners.length).toBeGreaterThanOrEqual(1)
  })

  it('follows the betting: bet, raise, call', () => {
    let { state } = createSpikeGame({ seed: 9, startingChips: 20, players: [0, 1, 2].map((i) => ({ name: `P${i}`, isHuman: false })) })
    for (let i = 0; i < 3; i++) state = applySpikeAction(state, { type: 'stand' }).state
    expect(state.phase).toBe('bet')
    const order = [state.current]
    state = applySpikeAction(state, { type: 'bet' }).state
    order.push(state.current)
    state = applySpikeAction(state, { type: 'raise' }).state
    order.push(state.current)
    state = applySpikeAction(state, { type: 'call' }).state
    // back to the first bettor, who owes the raise
    expect(state.current).toBe(order[0])
    expect(spikeActions(state).map((a) => a.type)).toEqual(['call', 'raise', 'junk'])
    state = applySpikeAction(state, { type: 'call' }).state
    expect(state.phase).toBe('dice')
    expect(state.handPot).toBe(3 + 6)
    expect(state.players.map((p) => p.chips)).toEqual([16, 16, 16])
  })
})
