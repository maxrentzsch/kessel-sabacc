import { describe, expect, it } from 'vitest'
import { applySpikeAction, createSpikeGame, spikeActions } from '../spike'
import { chooseSpikeAction, spikeWinChance } from '../spike/ai'
import type { SpikeState } from '../spike'
import { Rng } from '../engine/rng'
import { CHARACTERS } from './personalities'
import { showsTell, strengthOf, TELLS } from './tells'

/**
 * Corellian Spike between a stand-in for the player and three characters.
 * The stand-in may read the opponents' gestures perfectly: whenever one of
 * them has given away a strong hand and its own is poor, it folds instead of
 * calling.
 */
function play(reads: boolean, games: number): number {
  const seats = ['zula', 'tevin', 'dray'].map((id) => CHARACTERS[id])
  const me = CHARACTERS.mira.profile
  let wins = 0
  for (let seed = 1; seed <= games; seed++) {
    const rng = new Rng(seed * 7717)
    let { state } = createSpikeGame({ seed, startingChips: 20, players: [{ name: 'me', isHuman: false }, ...seats.map((c) => ({ name: c.id, isHuman: false }))] })
    let strong = new Set<number>()
    let hand = state.handNumber
    for (let step = 0; state.phase !== 'gameOver'; step++) {
      if (step > 50000) throw new Error('does not end')
      if (state.handNumber !== hand) {
        hand = state.handNumber
        strong = new Set()
      }
      const actor = state.current
      // Opponents make their gesture as they do at the table.
      if (actor !== 0 && (state.phase === 'card' || state.phase === 'bet')) {
        const c = seats[actor - 1]
        const tell = TELLS[c.id]
        const others = state.players.filter((p) => !p.eliminated && !p.folded && p.id !== actor).length
        const strength = strengthOf(spikeWinChance(state.players[actor].hand, others))
        if (showsTell(tell, strength, c.profile.difficulty, () => rng.next()) && tell.meaning === 'strong') strong.add(actor)
      }
      const action = actor === 0 ? mine(state, reads && strong.size > 0) : chooseSpikeAction(state, seats[actor - 1].profile, rng)
      state = applySpikeAction(state, action).state
    }
    if (state.winner === 0) wins++
  }
  return wins / games

  function mine(state: SpikeState, warned: boolean) {
    const legal = spikeActions(state)
    if (warned && state.phase === 'bet' && legal.some((a) => a.type === 'junk')) {
      const others = state.players.filter((p) => !p.eliminated && !p.folded && p.id !== 0).length
      if (spikeWinChance(state.players[0].hand, others) < 0.35) return { type: 'junk' } as const
    }
    return chooseSpikeAction(state, me, new Rng(state.handNumber * 31 + state.round))
  }
}

describe('reading tells', () => {
  it('never gives more than a fair edge, even read perfectly', () => {
    const games = 150
    const plain = play(false, games)
    const reading = play(true, games)
    // Folding on a gesture alone throws antes away about as often as it saves a pot;
    // what matters is that perfect reading cannot decide the game.
    expect(reading - plain).toBeLessThan(0.12)
  }, 300_000)
})
