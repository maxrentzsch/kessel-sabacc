import { describe, expect, it } from 'vitest'
import { DEFAULT_PROFILES } from '../ai/personalities'
import { Rng } from '../engine/rng'
import { chooseShiftAction } from './ai'
import { applyShiftAction, createShiftGame } from './index'

/** Play a game between two strengths; returns the winner's seat and the number of hands. */
function play(seed: number, strengths: ('easy' | 'medium' | 'hard')[], chips: number) {
  const rng = new Rng(seed * 4099)
  let { state } = createShiftGame({ seed, startingChips: chips, players: strengths.map((s) => ({ name: s, isHuman: false })) })
  for (let step = 0; state.phase !== 'gameOver' && step < 5000; step++) {
    state = applyShiftAction(state, chooseShiftAction(state, DEFAULT_PROFILES[strengths[state.current]], rng)).state
  }
  return { winner: state.winner, hands: state.handNumber }
}

describe('the Coruscant Shift AI', () => {
  it('lets a stronger player beat a weaker one more often than not', () => {
    let hardWins = 0
    const games = 80
    for (let seed = 1; seed <= games; seed++) {
      // swap seats every other game, so the deal does not decide it
      const hardFirst = seed % 2 === 0
      const { winner } = play(seed, hardFirst ? ['hard', 'easy'] : ['easy', 'hard'], 10)
      if (winner === (hardFirst ? 0 : 1)) hardWins++
    }
    expect(hardWins / games).toBeGreaterThan(0.6)
  }, 120_000)

  it('ends a game of ten chips in a sensible number of hands', () => {
    const hands = Array.from({ length: 30 }, (_, i) => play(i + 1, ['medium', 'medium', 'medium'], 10).hands)
    const mean = hands.reduce((a, b) => a + b, 0) / hands.length
    expect(mean).toBeGreaterThan(3)
    expect(mean).toBeLessThan(25)
  }, 120_000)
})
