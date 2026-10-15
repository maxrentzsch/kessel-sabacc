import { describe, expect, it } from 'vitest'
import { Rng } from '../engine/rng'
import { applyShiftAction, bestSelection, compareShift, createShiftGame, replayShift, scoreSelection, shiftActions, TARGET_FACES } from './index'
import type { ShiftAction, ShiftCard, ShiftState, ShiftTarget } from './index'

const card = (value: number, suit: ShiftCard['suit'] = 'circle', i = 0): ShiftCard => ({ id: `c${value}${suit}${i}`, suit, value })
const cards = (...values: number[]) => values.map((v, i) => card(v, v === 0 ? null : 'circle', i))

describe('scoring against the dice', () => {
  const target: ShiftTarget = { value: 5, suit: 'triangle' }

  it('measures the distance to the target', () => {
    expect(scoreSelection(cards(3, 2), target)).toMatchObject({ total: 5, distance: 0 })
    expect(scoreSelection(cards(10, -2), target)).toMatchObject({ total: 8, distance: 3 })
    expect(scoreSelection(cards(-4), { value: -5, suit: 'square' })).toMatchObject({ distance: 1 })
  })

  it('breaks a tie by cards of the target suit, a sylop counting for every suit', () => {
    const a = scoreSelection([card(5, 'triangle')], target)
    const b = scoreSelection([card(5, 'circle')], target)
    const c = scoreSelection([card(5, 'triangle'), card(0, null)], target)
    expect(compareShift(a, b)).toBeLessThan(0)
    // the sylop is a second triangle
    expect(compareShift(c, a)).toBeLessThan(0)
    expect(compareShift(scoreSelection([card(5, 'circle'), card(0, null)], target), a)).toBe(0)
    expect(compareShift(a, scoreSelection([card(4, 'triangle'), card(1, 'circle')], target))).toBe(0)
  })

  it('finds the best selection among five cards', () => {
    const hand = [card(9, 'circle'), card(-4, 'triangle'), card(2, 'square'), card(7, 'triangle'), card(-1, 'circle')]
    const best = bestSelection(hand, target)
    expect(scoreSelection(best, target).distance).toBe(0)
    // 9 − 4 and 7 − 2 … both reach 5; the one with more triangles wins
    expect(scoreSelection(best, target).suited).toBeGreaterThanOrEqual(1)
  })

  it('rolls only the faces of the gold die', () => {
    for (let seed = 1; seed < 50; seed++) {
      const { state } = createShiftGame({ seed, startingChips: 10, players: [0, 1].map((i) => ({ name: `P${i}`, isHuman: false })) })
      expect(TARGET_FACES).toContain(state.target.value)
    }
  })
})

function cardsInPlay(s: ShiftState): string[] {
  return [...s.deck, ...s.discard, ...s.players.flatMap((p) => [...p.hand, ...p.selection])].map((c) => c.id)
}

/** A random move that also tries real selections, not just the representative ones. */
function randomMove(state: ShiftState, rng: Rng): ShiftAction {
  const p = state.players[state.current]
  if (state.phase === 'select' && rng.chance(0.7)) {
    const pick = p.hand.filter(() => rng.chance(0.5))
    return { type: 'select', cards: (pick.length ? pick : [p.hand[0]]).map((c) => c.id) }
  }
  if (state.phase === 'improve' && rng.chance(0.7)) return { type: 'improve', cards: p.fresh.filter(() => rng.chance(0.5)) }
  return rng.pick(shiftActions(state))
}

describe('a game', () => {
  it('deals five cards each, rolls the dice and takes the antes', () => {
    const { state } = createShiftGame({ seed: 3, startingChips: 10, players: [0, 1, 2].map((i) => ({ name: `P${i}`, isHuman: false })) })
    expect(state.players.every((p) => p.hand.length === 5 && p.chips === 9)).toBe(true)
    expect(state.pot).toBe(3)
    expect(state.phase).toBe('select')
  })

  it('keeps every card and every chip through random play, and ends', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rng = new Rng(seed * 6271)
      const players = Array.from({ length: 2 + (seed % 3) }, (_, i) => ({ name: `P${i}`, isHuman: false }))
      let { state } = createShiftGame({ seed, startingChips: 8, players })
      const total = players.length * 8
      for (let step = 0; state.phase !== 'gameOver'; step++) {
        expect(step, `seed ${seed} does not end`).toBeLessThan(20000)
        state = applyShiftAction(state, randomMove(state, rng)).state
        expect(state.players.reduce((sum, p) => sum + p.chips, 0) + state.pot).toBe(total)
        const ids = cardsInPlay(state)
        expect(ids).toHaveLength(62)
        expect(new Set(ids).size).toBe(62)
        for (const p of state.players) expect(p.hand.length + p.selection.length).toBeLessThanOrEqual(5)
      }
      expect(state.players.filter((p) => !p.eliminated)).toHaveLength(1)
    }
  })

  it('fills the hand up to five in the shift and lets only new cards join the selection', () => {
    let { state } = createShiftGame({ seed: 8, startingChips: 10, players: [0, 1].map((i) => ({ name: `P${i}`, isHuman: false })) })
    const first = state.current
    const kept = state.players[first].hand.slice(0, 2).map((c) => c.id)
    state = applyShiftAction(state, { type: 'select', cards: kept }).state
    state = applyShiftAction(state, { type: 'select', cards: [state.players[state.current].hand[0].id] }).state
    expect(state.phase).toBe('bet')
    state = applyShiftAction(state, { type: 'check' }).state
    state = applyShiftAction(state, { type: 'check' }).state
    expect(state.phase).toBe('improve')
    const p = state.players[first]
    expect(p.selection.map((c) => c.id)).toEqual(kept)
    expect(p.hand).toHaveLength(3)
    expect(p.fresh).toEqual(p.hand.map((c) => c.id))
    // a card from the old selection is not fresh
    expect(() => applyShiftAction(state, { type: 'improve', cards: [kept[0]] })).toThrow()
    state = applyShiftAction(state, { type: 'improve', cards: [p.fresh[0]] }).state
    expect(state.players[first].selection).toHaveLength(3)
    expect(state.players[first].hand).toHaveLength(0)
  })

  it('wants at least one card in a selection', () => {
    const { state } = createShiftGame({ seed: 9, startingChips: 10, players: [0, 1].map((i) => ({ name: `P${i}`, isHuman: false })) })
    expect(() => applyShiftAction(state, { type: 'select', cards: [] })).toThrow()
  })

  it('gives the pot to the last player in when everybody else folds', () => {
    let { state } = createShiftGame({ seed: 5, startingChips: 10, players: [0, 1].map((i) => ({ name: `P${i}`, isHuman: false })) })
    const first = state.current
    state = applyShiftAction(state, { type: 'fold' }).state
    expect(state.phase).toBe('showdown')
    expect(state.result).toMatchObject({ winners: [1 - first], uncontested: true, pot: 2 })
  })

  it('plays back the same game from its record', () => {
    const rng = new Rng(77)
    const config = { seed: 21, startingChips: 6, players: [0, 1, 2].map((i) => ({ name: `P${i}`, isHuman: false })) }
    let { state } = createShiftGame(config)
    const actions: ShiftAction[] = []
    for (let i = 0; i < 200 && state.phase !== 'gameOver'; i++) {
      const move = randomMove(state, rng)
      actions.push(move)
      state = applyShiftAction(state, move).state
    }
    expect(replayShift({ config, actions })).toEqual(state)
  })
})

describe('the learning tables and the sleeve', () => {
  const two = [0, 1].map((i) => ({ name: `P${i}`, isHuman: false }))

  it('play without betting: selection, shift, improvement, reveal', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = new Rng(seed)
      let { state } = createShiftGame({ seed, startingChips: 6, players: two, rules: { betting: false } })
      for (let step = 0; state.phase !== 'gameOver'; step++) {
        expect(step).toBeLessThan(5000)
        expect(state.phase).not.toBe('bet')
        state = applyShiftAction(state, randomMove(state, rng)).state
      }
    }
  })

  it('share a tie on the number when suits do not count', () => {
    const tied = { distance: 0, total: 5, suited: 2 }
    const plain = { distance: 0, total: 5, suited: 0 }
    expect(compareShift(tied, plain)).toBeLessThan(0)
    expect(compareShift(tied, plain, false)).toBe(0)
  })

  it('swaps a card for a sylop, and the card comes back with the next deal', () => {
    let { state } = createShiftGame({ seed: 14, startingChips: 10, players: two })
    const p = state.current
    const given = state.players[p].hand[2]
    state = applyShiftAction(state, { type: 'sleeve', give: given.id }).state
    expect(state.current).toBe(p)
    expect(state.players[p].hand.some((c) => c.id.startsWith('sleeve'))).toBe(true)
    const rng = new Rng(4)
    while (state.phase !== 'handEnd' && state.phase !== 'gameOver') state = applyShiftAction(state, randomMove(state, rng)).state
    if (state.phase === 'gameOver') return
    state = applyShiftAction(state, { type: 'nextHand' }).state
    const ids = cardsInPlay(state)
    expect(ids).toHaveLength(62)
    expect(new Set(ids).size).toBe(62)
    expect(ids).toContain(given.id)
  })

  it('puts a fine into the pot, never the last chip', () => {
    let { state } = createShiftGame({ seed: 15, startingChips: 3, players: two })
    const p = state.current
    const pot = state.pot
    state = applyShiftAction(state, { type: 'caught', fine: 3 }).state
    expect(state.players[p].chips).toBe(1)
    expect(state.pot).toBe(pot + 1)
  })
})
