import { describe, expect, it } from 'vitest'
import { CHARACTERS, DEFAULT_PROFILES } from '../ai/personalities'
import { chooseAction } from '../ai/policy'
import type { AiProfile } from '../ai/policy'
import { applyAction, createGame, Rng } from '../engine'
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

describe('career difficulty', () => {
  it('gets harder table by table for a competent player', () => {
    // A stand-in for a good player who still only owns the starting tokens.
    const rates = TABLES.map((table) => winRate(table, DEFAULT_PROFILES.hard, STARTING_TOKENS, 250))
    expect(rates[0]).toBeGreaterThan(0.65)
    expect(rates.at(-1)).toBeLessThan(0.25)
    // allow for the noise of 250 games
    for (let i = 1; i < rates.length; i++) expect(rates[i]).toBeLessThan(rates[i - 1] + 0.06)
  }, 120_000)
})
