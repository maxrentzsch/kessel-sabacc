import { applySpikeAction, createSpikeGame } from './reducer'
import type { SpikeAction, SpikeConfig, SpikeState } from './types'

/** A Corellian Spike game as it can be told again: its setup and every move made in it, in order. */
export interface SpikeRecord {
  config: SpikeConfig
  actions: SpikeAction[]
}

/** Play a recorded game through again; the engine is pure, so the result is the game exactly as it was. */
export function replaySpike(record: SpikeRecord): SpikeState {
  let { state } = createSpikeGame(record.config)
  for (const action of record.actions) state = applySpikeAction(state, action).state
  return state
}
