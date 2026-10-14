import { describe, expect, it } from 'vitest'
import { DEFAULT_PROFILES } from '../ai/personalities'
import { chooseAction } from '../ai/policy'
import { chooseSpikeAction } from '../spike/ai'
import { applySpikeAction, createSpikeGame, replaySpike } from '../spike'
import type { SpikeRecord } from '../spike'
import { applyAction, createGame, replay, Rng, TOKEN_IDS } from './index'
import type { GameRecord } from './index'

const { easy, medium, hard } = DEFAULT_PROFILES

describe('a recorded game plays out the same again', () => {
  it('in Kessel Sabacc, including a player caught peeking', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rng = new Rng(seed * 31)
      const profiles = [medium, hard, easy]
      const record: GameRecord = {
        config: {
          seed,
          startingChips: 6,
          players: profiles.map((_, i) => ({ name: `P${i}`, isHuman: i === 0, tokens: rng.shuffle([...TOKEN_IDS]).slice(0, 3) })),
        },
        actions: [],
      }
      let { state } = createGame(record.config)
      let caught = false
      for (let step = 0; state.phase !== 'gameOver'; step++) {
        if (step > 20000) throw new Error(`game ${seed} does not end`)
        // Once per game the first seat is caught peeking, the way the table reacts to it.
        const action =
          !caught && state.phase === 'turn' && state.current === 0 && state.players[0].chips > 2
            ? ((caught = true), { type: 'caught' as const, fine: 2 })
            : chooseAction(state, profiles[state.current], rng)
        record.actions.push(action)
        state = applyAction(state, action).state
      }
      expect(replay(record)).toEqual(state)
    }
  })

  it('in Corellian Spike', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const rng = new Rng(seed * 104729)
      const profiles = [medium, hard, easy]
      const record: SpikeRecord = {
        config: { seed, startingChips: 12, players: profiles.map((_, i) => ({ name: `P${i}`, isHuman: i === 0 })) },
        actions: [],
      }
      let { state } = createSpikeGame(record.config)
      for (let step = 0; state.phase !== 'gameOver'; step++) {
        if (step > 50000) throw new Error(`game ${seed} does not end`)
        const action = chooseSpikeAction(state, profiles[state.current], rng)
        record.actions.push(action)
        state = applySpikeAction(state, action).state
      }
      expect(replaySpike(record)).toEqual(state)
    }
  })
})
