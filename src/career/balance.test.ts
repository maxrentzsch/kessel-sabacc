import { describe, expect, it } from 'vitest'
import { CHARACTERS, DEFAULT_PROFILES } from '../ai/personalities'
import { chooseAction } from '../ai/policy'
import type { AiProfile } from '../ai/policy'
import { applyAction, createGame, Rng } from '../engine'
import { applySpikeAction, createSpikeGame } from '../spike'
import { chooseSpikeAction } from '../spike/ai'
import { applyShiftAction, createShiftGame } from '../shift'
import { chooseShiftAction } from '../shift/ai'
import type { TokenId } from '../engine'
import { STARTING_TOKENS, TABLES } from './tables'
import type { TableDef } from './tables'

/** Share of games a stand-in for the player wins at a table. */
export function winRate(table: TableDef, player: AiProfile, tokens: TokenId[], games: number): number {
  const profiles = [player, ...table.opponents.map((id) => CHARACTERS[id].profile)]
  let wins = 0
  for (let seed = 1; seed <= games; seed++) {
    const rng = new Rng(seed * 104729)
    let { state } = createGame({
      seed,
      startingChips: table.chips,
      rules: table.rules,
      players: [
        { name: 'P', isHuman: false, tokens },
        ...table.opponents.map((id) => ({ name: id, isHuman: false, tokens: CHARACTERS[id].tokens })),
      ],
    })
    while (state.phase !== 'gameOver') state = applyAction(state, chooseAction(state, profiles[state.current], rng)).state
    if (state.winner === 0) wins++
  }
  return wins / games
}

/** Share of games a stand-in for the player wins at a table of Corellian Spike. */
export function spikeWinRate(table: TableDef, player: AiProfile, games: number): number {
  const profiles = [player, ...table.opponents.map((id) => CHARACTERS[id].profile)]
  let wins = 0
  for (let seed = 1; seed <= games; seed++) {
    const rng = new Rng(seed * 7919)
    let { state } = createSpikeGame({
      seed,
      startingChips: table.chips,
      rules: table.spikeRules,
      players: [{ name: 'P', isHuman: false }, ...table.opponents.map((id) => ({ name: id, isHuman: false }))],
    })
    for (let step = 0; state.phase !== 'gameOver' && step < 4000; step++) state = applySpikeAction(state, chooseSpikeAction(state, profiles[state.current], rng)).state
    if (state.winner === 0) wins++
  }
  return wins / games
}

/** Share of games a stand-in for the player wins at a table of Coruscant Shift. */
export function shiftWinRate(table: TableDef, player: AiProfile, games: number): number {
  const profiles = [player, ...table.opponents.map((id) => CHARACTERS[id].profile)]
  let wins = 0
  for (let seed = 1; seed <= games; seed++) {
    const rng = new Rng(seed * 6247)
    let { state } = createShiftGame({
      seed,
      startingChips: table.chips,
      rules: table.shiftRules,
      players: [{ name: 'P', isHuman: false }, ...table.opponents.map((id) => ({ name: id, isHuman: false }))],
    })
    for (let step = 0; state.phase !== 'gameOver' && step < 4000; step++) state = applyShiftAction(state, chooseShiftAction(state, profiles[state.current], rng)).state
    if (state.winner === 0) wins++
  }
  return wins / games
}

describe('career difficulty', () => {
  it('gets harder table by table for a competent player', () => {
    // A stand-in for a good player who still only owns the starting tokens.
    const rates = TABLES.filter((t) => !t.variant).map((table) => winRate(table, DEFAULT_PROFILES.hard, STARTING_TOKENS, 250))
    expect(rates[0]).toBeGreaterThan(0.65)
    expect(rates.at(-1)).toBeLessThan(0.25)
    // allow for the noise of 250 games
    for (let i = 1; i < rates.length; i++) expect(rates[i]).toBeLessThan(rates[i - 1] + 0.06)
  }, 120_000)

  it('gets harder along the trade route, from the canteen to the banquet', () => {
    // The learning tables play easier rules, so the climb is measured from the first real table on.
    const tables = TABLES.filter((t) => t.chapter === 'trade' && !t.id.startsWith('hallis'))
    const rates = tables.map((table) => spikeWinRate(table, DEFAULT_PROFILES.hard, 120))
    expect(spikeWinRate(TABLES.find((t) => t.id === 'hallis1')!, DEFAULT_PROFILES.hard, 120)).toBeGreaterThan(0.45)
    expect(rates.at(-1)).toBeLessThan(0.4)
    for (let i = 1; i < rates.length; i++) expect(rates[i], tables[i].id).toBeLessThan(rates[i - 1] + 0.1)
  }, 240_000)

  it('gets harder in the core, from the gambling hall to the residence', () => {
    const tables = TABLES.filter((t) => t.chapter === 'core' && !t.id.startsWith('level'))
    const rates = tables.map((table) => shiftWinRate(table, DEFAULT_PROFILES.hard, 60))
    expect(shiftWinRate(TABLES.find((t) => t.id === 'level1')!, DEFAULT_PROFILES.hard, 60)).toBeGreaterThan(0.45)
    expect(rates.at(-1)).toBeLessThan(0.4)
    for (let i = 1; i < rates.length; i++) expect(rates[i], tables[i].id).toBeLessThan(rates[i - 1] + 0.15)
  }, 400_000)
})
