import { describe, expect, it } from 'vitest'
import { DEFAULT_PROFILES } from '../ai/personalities'
import type { AiProfile } from '../ai/policy'
import { Rng } from '../engine/rng'
import { chooseSpikeAction } from './ai'
import { applySpikeAction, createSpikeGame } from './index'
import type { SpikeRules } from './index'

/** Play games between AI seats; returns wins per seat and the hands each game took. */
function play(profiles: AiProfile[], games: number, startingChips: number, rules?: Partial<SpikeRules>) {
  const wins = profiles.map(() => 0)
  const hands: number[] = []
  for (let seed = 1; seed <= games; seed++) {
    const rng = new Rng(seed * 104729)
    let { state } = createSpikeGame({ seed, startingChips, rules, players: profiles.map((_, i) => ({ name: `P${i}`, isHuman: false })) })
    for (let step = 0; state.phase !== 'gameOver'; step++) {
      if (step > 50000) throw new Error(`game ${seed} does not end`)
      state = applySpikeAction(state, chooseSpikeAction(state, profiles[state.current], rng)).state
    }
    wins[state.winner!]++
    hands.push(state.handNumber)
  }
  hands.sort((a, b) => a - b)
  return { wins, median: hands[hands.length >> 1], longest: hands[hands.length - 1] }
}

describe('corellian spike between AI players', () => {
  const { easy, medium, hard } = DEFAULT_PROFILES

  it('rewards the stronger player', () => {
    const duel = play([hard, easy], 200, 20)
    expect(duel.wins[0]).toBeGreaterThan(duel.wins[1] * 1.3)
    const table = play([hard, easy, easy, easy], 120, 20)
    expect(table.wins[0] / 120).toBeGreaterThan(0.3)
  }, 120_000)

  it('ends in a reasonable number of hands', () => {
    for (const seats of [2, 3, 4]) {
      const result = play(Array.from({ length: seats }, () => medium), 80, 20)
      expect(result.median, `${seats} players`).toBeLessThanOrEqual(22)
      expect(result.longest, `${seats} players`).toBeLessThan(120)
    }
  }, 120_000)
})
